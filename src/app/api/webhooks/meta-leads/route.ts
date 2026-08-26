import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  logWebhookRequest, 
  logGraphApiCall, 
  triggerAlert, 
  markTokenNeedsReconnect, 
  enqueueRetry 
} from '@/lib/meta-observability';
import { forceWakeQueue } from '@/lib/baileys-serverless';
import { getNextDistributedLeadOwner } from '@/lib/lead-distribution';
import { syncLeadToGoogleContacts } from '@/lib/google-contacts';

// ── GET: Meta Webhook Subscription Verification ──────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const configuredToken = 
    process.env.META_VERIFY_TOKEN || 
    process.env.FACEBOOK_VERIFY_TOKEN || 
    'fw_verify_token_2026';

  if (mode === 'subscribe' && (
    token === configuredToken || 
    token === 'fw_verify_token_2026' || 
    token === 'bhamstra_meta_verify_token_2026' ||
    token === 'sahil_fw_verify_token_2026'
  )) {
    console.log('[Meta Webhook Verification] Successfully verified challenge.');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[Meta Webhook Verification] Token mismatch or invalid mode:', { mode, token });
  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

export type SignatureVerifyResult = 
  | { status: 'VALID' }
  | { status: 'MISSING_SECRET'; message: string }
  | { status: 'MISSING_HEADER'; message: string }
  | { status: 'INVALID_SIGNATURE'; message: string };

/**
 * Strict Fail-Closed HMAC SHA-256 Webhook Signature Verification
 */
export function verifyMetaHubSignatureStrict(rawBody: string, signatureHeader: string | null): SignatureVerifyResult {
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  // 1. FAIL CLOSED: Missing or Misconfigured FACEBOOK_APP_SECRET
  if (!appSecret || appSecret === 'your_facebook_app_secret_here') {
    return {
      status: 'MISSING_SECRET',
      message: 'Server configuration error: FACEBOOK_APP_SECRET is not configured.',
    };
  }

  // 2. FAIL CLOSED: Missing or Malformed X-Hub-Signature-256 Header
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return {
      status: 'MISSING_HEADER',
      message: 'Missing or malformed X-Hub-Signature-256 header.',
    };
  }

  // 3. HMAC-SHA256 Checksum Calculation & timingSafeEqual Comparison
  try {
    const expectedSignature = signatureHeader.split('sha256=')[1];
    const hmac = crypto.createHmac('sha256', appSecret);
    const calculatedSignature = hmac.update(rawBody).digest('hex');

    if (calculatedSignature.length !== expectedSignature.length) {
      return {
        status: 'INVALID_SIGNATURE',
        message: 'Invalid HMAC X-Hub-Signature-256 signature length.',
      };
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      return {
        status: 'INVALID_SIGNATURE',
        message: 'Invalid HMAC X-Hub-Signature-256 signature checksum mismatch.',
      };
    }

    return { status: 'VALID' };
  } catch (e: any) {
    return {
      status: 'INVALID_SIGNATURE',
      message: `Signature verification exception: ${e.message}`,
    };
  }
}

// ── POST: Production-Grade Observability Meta Leadgen Ingestion Engine ──────
export async function POST(req: NextRequest) {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '127.0.0.1';

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    // ── Strict Fail-Closed HMAC Signature Verification ────────────────────
    const verifyResult = verifyMetaHubSignatureStrict(rawBody, signatureHeader);

    if (verifyResult.status === 'MISSING_SECRET') {
      console.error(`[CRITICAL CONFIG ERROR] ${verifyResult.message}`);
      await triggerAlert({
        alert_type: 'WEBHOOK_FAILURE',
        severity: 'CRITICAL',
        title: 'FACEBOOK_APP_SECRET Misconfigured',
        message: verifyResult.message,
        resolution_hint: 'Add FACEBOOK_APP_SECRET to .env.local and server environment variables.',
      });
      return NextResponse.json({ error: verifyResult.message }, { status: 500 });
    }

    if (verifyResult.status === 'MISSING_HEADER') {
      console.warn(`[SECURITY WARN] ${verifyResult.message}`);
      await triggerAlert({
        alert_type: 'WEBHOOK_FAILURE',
        severity: 'WARNING',
        title: 'Missing Webhook Signature Header',
        message: verifyResult.message,
        resolution_hint: 'Ensure request originated from Meta Lead Ads webhook engine with SHA-256 enabled.',
      });
      return NextResponse.json({ error: 'Forbidden: Missing X-Hub-Signature-256 header' }, { status: 403 });
    }

    if (verifyResult.status === 'INVALID_SIGNATURE') {
      console.error(`[SECURITY ERROR] ${verifyResult.message}`);
      await triggerAlert({
        alert_type: 'WEBHOOK_FAILURE',
        severity: 'CRITICAL',
        title: 'Invalid Webhook HMAC Signature',
        message: verifyResult.message,
        resolution_hint: 'Verify FACEBOOK_APP_SECRET matches the App Secret in Meta App Dashboard.',
      });
      return NextResponse.json({ error: 'Forbidden: Invalid HMAC X-Hub-Signature-256 signature' }, { status: 403 });
    }

    console.log(`[SECURITY SUCCESS] HMAC X-Hub-Signature-256 verified successfully for Req: ${requestId}`);

    const payload = JSON.parse(rawBody || '{}');
    const entries = payload.entry || [];
    const insertedLeads: any[] = [];
    const skippedDuplicates: any[] = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'leadgen' && change.value) {
          const { leadgen_id, form_id, page_id, created_time } = change.value;

          if (!leadgen_id || !page_id) {
            await logWebhookRequest({
              request_id: requestId,
              event_type: 'leadgen_payload_invalid',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: performance.now() - startTime,
              status: 'SKIPPED',
              error_message: 'Missing leadgen_id or page_id in change payload',
              raw_payload: payload,
            });
            continue;
          }

          // ── 1. PAGE MAPPING & WORKSPACE OWNERSHIP VALIDATION ────────────
          const { data: pageConfigs, error: pageConfigErr } = await supabaseAdmin
            .from('fb_page_configs')
            .select('workspace_id, page_access_token, page_name, is_active, updated_at')
            .eq('page_id', page_id)
            .order('updated_at', { ascending: false });

          if (pageConfigErr || !pageConfigs || pageConfigs.length === 0) {
            const errReason = `Unmapped Page ID ${page_id}. No fb_page_configs record found for any workspace.`;
            
            await triggerAlert({
              alert_type: 'INVALID_PAGE_MAPPING',
              severity: 'CRITICAL',
              title: 'Unmapped Facebook Page Webhook Received',
              message: errReason,
              resolution_hint: 'Verify the Facebook Page is connected in StudioCore Meta Integration.',
              metadata: { page_id, leadgen_id, form_id },
            });

            await logWebhookRequest({
              request_id: requestId,
              page_id,
              form_id,
              leadgen_id,
              event_type: 'leadgen_config_error',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: performance.now() - startTime,
              status: 'CONFIG_ERROR',
              error_message: errReason,
              raw_payload: payload,
            });

            continue; // REJECT LEAD - DO NOT GUESS
          }

          // Pick the most recently updated active workspace configuration for this page
          const activeConfigs = pageConfigs.filter((c: any) => c.is_active !== false && !!c.workspace_id);
          const pageConfig = activeConfigs[0] || pageConfigs[0];

          if (pageConfig.is_active === false) {
            await logWebhookRequest({
              request_id: requestId,
              workspace_id: pageConfig.workspace_id,
              page_id,
              form_id,
              leadgen_id,
              event_type: 'leadgen_page_inactive',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: performance.now() - startTime,
              status: 'SKIPPED',
              error_message: `Page "${pageConfig.page_name}" is turned OFF by user.`,
            });
            continue;
          }

          const targetWorkspaceId = pageConfig.workspace_id;
          const pageAccessToken = pageConfig.page_access_token || '';
          const pageName = pageConfig.page_name || 'Facebook Page';

          // ── 2. FORM TOGGLE CHECK (checks both fb_lead_forms.is_enabled and fb_form_mappings.is_active) ──
          let contactGroupId: string | null = null;
          let resolvedFormName: string | null = null;
          let assignedLeadOwner: string | null = null;

          if (form_id) {
            // Primary check: fb_lead_forms.is_enabled (the new UI toggle)
            const { data: formEnabled } = await supabaseAdmin
              .from('fb_lead_forms')
              .select('is_enabled, form_name')
              .eq('workspace_id', targetWorkspaceId)
              .eq('form_id', form_id)
              .maybeSingle();

            // Also check fb_form_mappings for contact_group_id and status
            const { data: formSetting } = await supabaseAdmin
              .from('fb_form_mappings')
              .select('id, is_active, form_name, contact_group_id, mapping_config')
              .eq('workspace_id', targetWorkspaceId)
              .eq('form_id', form_id)
              .maybeSingle();

            if (formSetting) {
              contactGroupId = formSetting.contact_group_id || null;
            }

            try {
              const autoOwner = await getNextDistributedLeadOwner(targetWorkspaceId, form_id);
              if (autoOwner) {
                assignedLeadOwner = autoOwner;
                console.log(`[Meta-Leads Webhook Round-Robin] Assigned lead to owner: ${assignedLeadOwner}`);
              }
            } catch (distErr: any) {
              console.error('[Meta-Leads Webhook Distribution Error]:', distErr?.message);
            }

            resolvedFormName = formEnabled?.form_name || formSetting?.form_name || null;

            const isFormDisabled =
              (formEnabled && formEnabled.is_enabled === false) ||
              (formSetting && formSetting.is_active === false);

            if (isFormDisabled) {
              const disabledFormName = formEnabled?.form_name || formSetting?.form_name || form_id;
              await logWebhookRequest({
                request_id: requestId,
                workspace_id: targetWorkspaceId,
                page_id,
                form_id,
                leadgen_id,
                event_type: 'leadgen_form_disabled',
                http_method: 'POST',
                client_ip: clientIp,
                duration_ms: performance.now() - startTime,
                status: 'SKIPPED',
                error_message: `Lead Form "${disabledFormName}" is turned OFF by user toggle.`,
              });
              skippedDuplicates.push({ leadgen_id, form_id, reason: 'Form sync turned OFF by user toggle' });
              continue;
            }
          }

          // ── 3. DUPLICATE LEAD DETECTION ──────────────────────────────────
          const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id, name, phone')
            .eq('workspace_id', targetWorkspaceId)
            .or(`phone.eq.${leadgen_id},id.eq.${leadgen_id}`)
            .maybeSingle();

          if (existingLead) {
            await logWebhookRequest({
              request_id: requestId,
              workspace_id: targetWorkspaceId,
              page_id,
              form_id,
              leadgen_id,
              event_type: 'leadgen_duplicate_skipped',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: performance.now() - startTime,
              status: 'SKIPPED',
              error_message: `Duplicate lead detected. Existing Lead ID: ${existingLead.id}`,
            });
            skippedDuplicates.push({ leadgen_id, form_id, reason: 'Duplicate leadgen_id' });
            continue;
          }

          // ── 4. GRAPH API FETCH & TOKEN MONITORING ────────────────────────
          let leadFields: Record<string, string> = {
            full_name: 'Meta Instant Lead',
            phone_number: `+91 ${Date.now().toString().slice(-10)}`,
            email: `lead_${leadgen_id}@meta-admanager.com`,
          };

          let campaignName = 'Facebook Lead Campaign';
          let adsetName = 'Target Audience Adset';
          let adName = 'Instant Lead Form Ad';
          let graphApiSuccess = false;

          if (pageAccessToken && !pageAccessToken.startsWith('mock_') && !pageAccessToken.startsWith('test_')) {
            const graphStart = performance.now();
            const graphUrl = `https://graph.facebook.com/v20.0/${leadgen_id}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${pageAccessToken}`;

            try {
              const graphRes = await fetch(graphUrl);
              const graphDuration = performance.now() - graphStart;

              let graphData: any = null;
              if (graphRes.ok) {
                graphData = await graphRes.json();
              } else {
                const errData = await graphRes.json().catch(() => ({}));
                // Check if we can fallback to workspace user token from integration_credentials
                const { data: altCreds } = await supabaseAdmin
                  .from('integration_credentials')
                  .select('access_token')
                  .eq('user_id', targetWorkspaceId)
                  .eq('provider', 'meta')
                  .maybeSingle();

                if (altCreds?.access_token && altCreds.access_token !== pageAccessToken) {
                  const retryUrl = `https://graph.facebook.com/v20.0/${leadgen_id}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${altCreds.access_token}`;
                  const retryRes = await fetch(retryUrl);
                  if (retryRes.ok) {
                    graphData = await retryRes.json();
                  }
                }

                if (!graphData) {
                  const errCode = errData?.error?.code;
                  const errSubcode = errData?.error?.error_subcode;
                  const errMessage = errData?.error?.message || `HTTP ${graphRes.status}`;

                  await logGraphApiCall({
                    request_id: requestId,
                    leadgen_id,
                    endpoint: `/${leadgen_id}`,
                    http_status: graphRes.status,
                    duration_ms: graphDuration,
                    error_code: errCode,
                    error_message: errMessage,
                  });

                  if (errCode === 190 || errCode === 102 || errCode === 10 || errSubcode === 463) {
                    await markTokenNeedsReconnect(targetWorkspaceId, page_id, errMessage);
                  }

                  await enqueueRetry({
                    workspace_id: targetWorkspaceId,
                    page_id,
                    form_id,
                    leadgen_id,
                    payload: change.value,
                    error_reason: `Graph API Error ${errCode}: ${errMessage}`,
                  });
                }
              }

              if (graphData) {
                if (graphData.campaign_name) campaignName = graphData.campaign_name;
                if (graphData.adset_name) adsetName = graphData.adset_name;
                if (graphData.ad_name) adName = graphData.ad_name;

                if (graphData.field_data) {
                  graphData.field_data.forEach((field: { name: string; values: string[] }) => {
                    const origKey = field.name || '';
                    const keyLower = origKey.toLowerCase();
                    const val = field.values ? field.values[0] || '' : '';

                    if (keyLower.includes('name') || keyLower === 'full_name') {
                      if (!leadFields.full_name || leadFields.full_name === 'Meta Instant Lead') {
                        leadFields.full_name = val;
                      }
                    }
                    if (keyLower.includes('phone') || keyLower.includes('mobile')) {
                      leadFields.phone_number = val;
                    }
                    if (keyLower.includes('email')) {
                      leadFields.email = val;
                    }

                    // Save EVERY custom question key into leadFields (merged into raw_payload)
                    if (origKey) {
                      leadFields[origKey] = val;
                    }
                  });
                }

                graphApiSuccess = true;
                await logGraphApiCall({
                  request_id: requestId,
                  leadgen_id,
                  endpoint: `/${leadgen_id}`,
                  http_status: 200,
                  duration_ms: graphDuration,
                });
              }
            } catch (err: any) {
              await logGraphApiCall({
                request_id: requestId,
                leadgen_id,
                endpoint: `/${leadgen_id}`,
                http_status: 500,
                duration_ms: performance.now() - graphStart,
                error_message: err.message,
              });

              await enqueueRetry({
                workspace_id: targetWorkspaceId,
                page_id,
                form_id,
                leadgen_id,
                payload: change.value,
                error_reason: `Graph API Fetch Exception: ${err.message}`,
              });
            }
          }

          // ── 5. DATABASE LEAD INSERT & MONITORING ─────────────────────────
          const newLeadRecord = {
            workspace_id: targetWorkspaceId,
            tenant_id: targetWorkspaceId,
            name: leadFields.full_name || 'Facebook Instant Lead',
            phone: leadFields.phone_number || `+91 ${Date.now().toString().slice(-10)}`,
            email: leadFields.email || `lead_${leadgen_id}@meta-admanager.com`,
            source: 'Facebook Lead Ads',
            status: 'new',
            whatsapp_group_id: contactGroupId,
            created_at: new Date(created_time ? created_time * 1000 : Date.now()).toISOString(),
            raw_payload: {
              leadgen_id,
              form_id,
              form_name: resolvedFormName || (form_id ? `Form ${form_id}` : 'Meta Lead Form'),
              page_id,
              page_name: pageName,
              campaign_name: campaignName,
              adset_name: adsetName,
              ad_name: adName,
              ...leadFields,
              lead_owner: assignedLeadOwner || leadFields.lead_owner || 'Unassigned',
            },
          };

          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from('leads')
            .upsert(newLeadRecord, {
              onConflict: 'workspace_id,meta_lead_id',
              ignoreDuplicates: false,
            })
            .select('*')
            .single();

          const totalDuration = performance.now() - startTime;

          if (insertErr) {
            await triggerAlert({
              workspace_id: targetWorkspaceId,
              alert_type: 'DB_FAILURE',
              severity: 'CRITICAL',
              title: 'Database Insert Failed for Lead',
              message: `Supabase insert failed for leadgen_id ${leadgen_id}: ${insertErr.message}`,
              resolution_hint: 'Verify Supabase schema columns and table permissions.',
            });

            await enqueueRetry({
              workspace_id: targetWorkspaceId,
              page_id,
              form_id,
              leadgen_id,
              payload: change.value,
              error_reason: `DB Insert Error: ${insertErr.message}`,
            });

            await logWebhookRequest({
              request_id: requestId,
              workspace_id: targetWorkspaceId,
              page_id,
              form_id,
              leadgen_id,
              event_type: 'leadgen_db_insert_failed',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: totalDuration,
              status: 'FAILED',
              error_message: insertErr.message,
              raw_payload: payload,
            });
          } else if (inserted) {
            if (totalDuration > 5000) {
              await triggerAlert({
                workspace_id: targetWorkspaceId,
                alert_type: 'HIGH_LATENCY',
                severity: 'WARNING',
                title: 'High Processing Latency Detected',
                message: `Webhook processing took ${totalDuration.toFixed(0)}ms (>5s target limit).`,
              });
            }

            await logWebhookRequest({
              request_id: requestId,
              workspace_id: targetWorkspaceId,
              page_id,
              form_id,
              leadgen_id,
              event_type: 'leadgen_ingestion_success',
              http_method: 'POST',
              client_ip: clientIp,
              duration_ms: totalDuration,
              status: 'SUCCESS',
              raw_payload: payload,
            });

            insertedLeads.push(inserted);

            // Trigger Google Contacts Auto-Sync in background (Multi-tenant isolated)
            syncLeadToGoogleContacts(targetWorkspaceId, inserted).catch(err =>
              console.error('[Meta Webhook Auto Google Contacts Sync Error]:', err)
            );

            if (newLeadRecord.whatsapp_group_id) {
              console.log(`[Meta Webhook] Triggering queue wake for workspace: ${targetWorkspaceId} due to group: ${newLeadRecord.whatsapp_group_id}`);
              forceWakeQueue(supabaseAdmin, targetWorkspaceId).catch(err =>
                console.error('[Meta Webhook] forceWakeQueue error:', err)
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      processing_duration_ms: Math.round(performance.now() - startTime),
      inserted_count: insertedLeads.length,
      skipped_count: skippedDuplicates.length,
      leads: insertedLeads,
    });
  } catch (err: any) {
    const totalDuration = performance.now() - startTime;

    await logWebhookRequest({
      request_id: requestId,
      event_type: 'webhook_exception',
      http_method: 'POST',
      client_ip: clientIp,
      duration_ms: totalDuration,
      status: 'FAILED',
      error_message: err.message,
    });

    return NextResponse.json({ error: err.message, request_id: requestId }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

// ── POST: Real-Time Meta Leadgen Webhook Event Ingestion ──────
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[Meta Webhook Ingestion] Received webhook payload:', JSON.stringify(payload, null, 2));

    const entries = payload.entry || [];
    const insertedLeads: any[] = [];
    const skippedDuplicates: any[] = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'leadgen' && change.value) {
          const { leadgen_id, form_id, page_id, created_time } = change.value;

          if (!leadgen_id || !page_id) {
            console.warn('[Meta Webhook] Missing leadgen_id or page_id in payload. Skipping.');
            continue;
          }

          // 1. STRICT RESOLUTION: Query fb_page_configs using incoming page_id
          const { data: pageConfig, error: pageConfigErr } = await supabaseAdmin
            .from('fb_page_configs')
            .select('workspace_id, page_access_token, page_name, is_active')
            .eq('page_id', page_id)
            .maybeSingle();

          if (pageConfigErr || !pageConfig || !pageConfig.workspace_id) {
            console.error(`[Meta Webhook CONFIG ERROR] No fb_page_configs row found for Page ID "${page_id}". Rejecting lead ${leadgen_id}.`);
            await supabaseAdmin.from('live_logs').insert({
              event_type: 'meta_webhook_config_error',
              message: `[Meta Webhook ERROR] Unmapped Page ID: ${page_id}. No fb_page_configs workspace mapping found.`,
              metadata: { page_id, leadgen_id, form_id }
            });
            continue;
          }

          if (pageConfig.is_active === false) {
            console.warn(`[Meta Webhook] Page "${pageConfig.page_name}" (${page_id}) is marked inactive. Skipping lead.`);
            continue;
          }

          const targetWorkspaceId = pageConfig.workspace_id;
          const pageAccessToken = pageConfig.page_access_token || '';
          const pageName = pageConfig.page_name || 'Facebook Page';

          // 2. Check Form Active Status in fb_form_mappings
          if (form_id) {
            const { data: formSetting } = await supabaseAdmin
              .from('fb_form_mappings')
              .select('is_active, form_name')
              .eq('workspace_id', targetWorkspaceId)
              .eq('form_id', form_id)
              .maybeSingle();

            if (formSetting && formSetting.is_active === false) {
              console.log(`[Meta Webhook] Form "${formSetting.form_name || form_id}" is turned OFF by user toggle. Skipping.`);
              skippedDuplicates.push({ leadgen_id, form_id, reason: 'Form sync turned OFF by user toggle' });
              continue;
            }
          }

          // 3. Duplicate Lead Check
          const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id, name, phone')
            .eq('workspace_id', targetWorkspaceId)
            .or(`phone.eq.${leadgen_id},id.eq.${leadgen_id}`)
            .maybeSingle();

          if (existingLead) {
            console.log(`[Meta Webhook] Duplicate lead detected for leadgen_id: ${leadgen_id}. Skipping.`);
            skippedDuplicates.push({ leadgen_id, form_id, reason: 'Duplicate leadgen_id' });
            continue;
          }

          // 4. Fetch Live Lead Field Details via Page Access Token
          let leadFields: Record<string, string> = {
            full_name: 'Meta Instant Lead',
            phone_number: `+91 ${Date.now().toString().slice(-10)}`,
            email: `lead_${leadgen_id}@meta-admanager.com`,
          };

          let campaignName = 'Facebook Lead Campaign';
          let adsetName = 'Target Audience Adset';
          let adName = 'Instant Lead Form Ad';

          if (pageAccessToken && !pageAccessToken.startsWith('mock_') && !pageAccessToken.startsWith('test_')) {
            try {
              const graphUrl = `https://graph.facebook.com/v20.0/${leadgen_id}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${pageAccessToken}`;
              const graphRes = await fetch(graphUrl);
              if (graphRes.ok) {
                const graphData = await graphRes.json();
                if (graphData.campaign_name) campaignName = graphData.campaign_name;
                if (graphData.adset_name) adsetName = graphData.adset_name;
                if (graphData.ad_name) adName = graphData.ad_name;

                if (graphData.field_data) {
                  graphData.field_data.forEach((field: { name: string; values: string[] }) => {
                    const key = (field.name || '').toLowerCase();
                    const val = field.values ? field.values[0] || '' : '';
                    if (key.includes('name')) leadFields.full_name = val;
                    if (key.includes('phone')) leadFields.phone_number = val;
                    if (key.includes('email')) leadFields.email = val;
                  });
                }
              } else {
                const errData = await graphRes.json().catch(() => ({}));
                console.error(`[Meta Webhook Graph API Error]: ${graphRes.status}`, errData);
              }
            } catch (err) {
              console.warn('[Meta Webhook] Graph API exception:', err);
            }
          }

          // 5. Insert into CRM leads table strictly for targetWorkspaceId
          const newLeadRecord = {
            workspace_id: targetWorkspaceId,
            tenant_id: targetWorkspaceId,
            name: leadFields.full_name || 'Facebook Instant Lead',
            phone: leadFields.phone_number || `+91 ${Date.now().toString().slice(-10)}`,
            email: leadFields.email || `lead_${leadgen_id}@meta-admanager.com`,
            source: 'Facebook Lead Ads',
            status: 'new',
            created_at: new Date(created_time ? created_time * 1000 : Date.now()).toISOString(),
            raw_payload: {
              leadgen_id,
              form_id,
              page_id,
              page_name: pageName,
              campaign_name: campaignName,
              adset_name: adsetName,
              ad_name: adName,
            },
          };

          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from('leads')
            .insert(newLeadRecord)
            .select('*')
            .single();

          if (insertErr) {
            console.error('[Meta Webhook Insert Error]:', insertErr.message);
          } else if (inserted) {
            console.log(`[Meta Webhook Insert Success] Inserted Lead ID: ${inserted.id} into Workspace: ${targetWorkspaceId}`);
            insertedLeads.push(inserted);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted_count: insertedLeads.length,
      skipped_count: skippedDuplicates.length,
      leads: insertedLeads,
    });
  } catch (err: any) {
    console.error('[Meta Webhook Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

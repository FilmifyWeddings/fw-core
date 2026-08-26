import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getNextDistributedLeadOwner } from '@/lib/lead-distribution';
import { forceWakeQueue } from '@/lib/baileys-serverless';
import { syncLeadToGoogleContacts } from '@/lib/google-contacts';
import { extractLeadFields } from '@/lib/meta-lead-normalizer';

/**
 * GET /api/webhooks/meta
 * Webhook Verification Challenge Handler for Meta App Dashboard
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const validTokens = [
    process.env.META_VERIFY_TOKEN,
    process.env.FACEBOOK_VERIFY_TOKEN,
    'sahil_fw_verify_token_2026',
    'fw_verify_token_2026',
    'bhamstra_meta_verify_token_2026',
  ].filter(Boolean);

  if (mode === 'subscribe' && challenge && validTokens.includes(token)) {
    console.log('[Meta Webhook] GET Subscription Verified Successfully ✓');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Meta Webhook] Verification token mismatch or invalid mode:', { mode, token });
  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * Background lead ingestion function executed asynchronously
 */
async function processLeadgenEvent(pageId: string, leadgenId: string, formId?: string) {
  try {
    console.log(`[Meta Webhook Engine] Processing leadgen_id: ${leadgenId} for page_id: ${pageId}...`);

    // 1. Look up workspace permanent access token for this page_id
    const { data: pageConfig } = await supabaseAdmin
      .from('fb_page_configs')
      .select('workspace_id, page_access_token, page_name, is_active')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .not('page_access_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let workspaceId = pageConfig?.workspace_id;
    let pageToken = pageConfig?.page_access_token;
    let pageName = pageConfig?.page_name || 'Facebook Page';

    // Fallback: check facebook_pages table
    if (!pageToken) {
      const { data: fbPage } = await supabaseAdmin
        .from('facebook_pages')
        .select('workspace_id, access_token, page_name')
        .eq('page_id', pageId)
        .maybeSingle();
      if (fbPage?.access_token) {
        pageToken = fbPage.access_token;
        workspaceId = workspaceId || fbPage.workspace_id;
        pageName = fbPage.page_name || pageName;
      }
    }

    // Fallback: check integration_credentials if workspace is known
    if (!pageToken && workspaceId) {
      const { data: creds } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('user_id', workspaceId)
        .eq('provider', 'meta')
        .maybeSingle();
      if (creds?.access_token) {
        pageToken = creds.access_token;
      }
    }

    if (!workspaceId || !pageToken) {
      console.error(`[Meta Webhook Error] Could not find active credentials for page_id: ${pageId}`);
      return;
    }

    // 2. Fetch Form Name & Settings (Strictly Skip if Form Toggle is OFF)
    let formName = 'Instant Lead Form';
    let contactGroupId: string | null = null;

    if (formId) {
      const { data: formObj } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('form_name, is_enabled')
        .eq('workspace_id', workspaceId)
        .eq('form_id', formId)
        .maybeSingle();

      if (formObj && formObj.is_enabled === false) {
        console.log(`[Meta Webhook Notice] Form ${formId} toggle is OFF. Skipping real-time lead ingestion.`);
        return;
      }
      if (formObj?.form_name) formName = formObj.form_name;

      const { data: mapping } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('contact_group_id, is_active')
        .eq('workspace_id', workspaceId)
        .eq('form_id', formId)
        .maybeSingle();

      if (mapping && mapping.is_active === false && formObj?.is_enabled === false) {
        console.log(`[Meta Webhook Notice] Form mapping ${formId} is inactive. Skipping lead.`);
        return;
      }
      if (mapping?.contact_group_id) contactGroupId = mapping.contact_group_id;
    }

    // 3. Deduplication Check
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`meta_lead_id.eq.${leadgenId},raw_payload->>leadgen_id.eq.${leadgenId}`)
      .maybeSingle();

    if (existing) {
      console.log(`[Meta Webhook Notice] Lead ${leadgenId} already ingested in DB (Lead ID: ${existing.id}). Skipping.`);
      return;
    }

    // 4. Query Meta Graph API for Lead Details
    const graphUrl = `https://graph.facebook.com/v20.0/${leadgenId}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${pageToken}`;
    const graphRes = await fetch(graphUrl);

    if (!graphRes.ok) {
      const err = await graphRes.json().catch(() => ({}));
      console.error(`[Meta Webhook Graph API Error] Fetching lead ${leadgenId}:`, err);
      return;
    }

    const leadData = await graphRes.json();
    const extracted = extractLeadFields(leadData.field_data || []);

    let assignedOwner: string | null = null;
    try {
      if (formId) {
        assignedOwner = await getNextDistributedLeadOwner(workspaceId, formId);
      }
    } catch (_) {}

    // 5. Insert New Lead into Supabase
    const newLeadRecord: Record<string, any> = {
      workspace_id: workspaceId,
      tenant_id: workspaceId,
      name: extracted.fullName,
      full_name: extracted.fullName,
      phone: extracted.phone || null,
      phone_number: extracted.phone || null,
      email: extracted.email || null,
      source: `Facebook Ads / ${formName}`,
      status: 'new',
      form_id: formId || leadData.form_id,
      source_form_id: formId || leadData.form_id,
      form_tag: formName,
      meta_lead_id: leadgenId,
      whatsapp_group_id: contactGroupId,
      event_date: extracted.eventDate || null,
      location: extracted.location || null,
      city: extracted.location || null,
      budget: extracted.budget || null,
      raw_field_data: extracted.rawFieldMap,
      created_at: leadData.created_time || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw_payload: {
        leadgen_id: leadgenId,
        meta_lead_id: leadgenId,
        form_id: formId || leadData.form_id,
        form_name: formName,
        page_id: pageId,
        page_name: pageName,
        campaign_name: leadData.campaign_name || '',
        adset_name: leadData.adset_name || '',
        ad_name: leadData.ad_name || '',
        field_data: leadData.field_data || [],
        lead_owner: assignedOwner || 'Unassigned',
        synced_via: 'realtime_webhook',
        ...extracted.rawFieldMap,
      },
    };

    let insertedLead: any = null;
    let payloadToInsert = { ...newLeadRecord };

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data: ins, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert(payloadToInsert)
        .select('*')
        .maybeSingle();

      if (!insertErr && ins) {
        insertedLead = ins;
        break;
      }

      if (insertErr) {
        const errMsg = insertErr.message || '';
        const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
        if (match && match[1]) {
          delete payloadToInsert[match[1]];
        } else {
          console.error('[Meta Webhook Insert Error]:', errMsg);
          break;
        }
      }
    }

    if (insertedLead) {
      console.log(`[Meta Webhook SUCCESS] Ingested new lead "${fullName}" (${phone}) into workspace ${workspaceId}!`);

      // Auto update form lead count
      if (formId) {
        const { data: curForm } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('leads_count')
          .eq('workspace_id', workspaceId)
          .eq('form_id', formId)
          .maybeSingle();

        const newCount = (curForm?.leads_count || 0) + 1;
        await supabaseAdmin
          .from('fb_lead_forms')
          .update({ leads_count: newCount, updated_at: new Date().toISOString() })
          .eq('workspace_id', workspaceId)
          .eq('form_id', formId);
      }

      // 6. Trigger Instant Google Contacts Sync & WhatsApp Automations asynchronously
      syncLeadToGoogleContacts(workspaceId, insertedLead).catch(e =>
        console.error('[Meta Webhook Google Contacts Error]:', e)
      );

      forceWakeQueue().catch(() => {});
    }
  } catch (err: any) {
    console.error('[Meta Webhook Execution Error]:', err.message);
  }
}

/**
 * POST /api/webhooks/meta
 * High-Speed Zero-Limit Webhook Ingestion Engine
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody || '{}');
    const entries = payload.entry || [];

    // Process all entries asynchronously so response returns under 1s
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'leadgen' && change.value) {
          const { leadgen_id, page_id, form_id } = change.value;
          if (leadgen_id && page_id) {
            // Asynchronous background execution
            processLeadgenEvent(page_id, leadgen_id, form_id).catch(e =>
              console.error('[Meta Webhook Background Exception]:', e)
            );
          }
        }
      }
    }

    // Always immediately return HTTP 200 OK within 1 second to Meta servers
    return NextResponse.json({ success: true, received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Meta Webhook POST Exception]:', err.message);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

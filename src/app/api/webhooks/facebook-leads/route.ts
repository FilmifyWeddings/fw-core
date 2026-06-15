import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { classifyLead } from '@/lib/classification';
import { queueDripsForLead } from '@/lib/queue';
import { syncLeadToGoogleContacts } from '@/lib/google-contacts';
import { Lead, LeadStatus } from '@/types';

// ─────────────────────────────────────────────────────────────
// Fuzzy auto-mapper: Meta field key se system field guess karo
// ─────────────────────────────────────────────────────────────
function fuzzyMapField(key: string): string | null {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (k.includes('name') || k === 'full_name') return 'name';
  if (k.includes('email'))                       return 'email';
  if (k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('number')) return 'phone';
  if (k.includes('budget') || k.includes('price') || k.includes('amount'))  return 'budget';
  if (k.includes('venue') || k.includes('location') || k.includes('place')) return 'venue';
  if (k.includes('date') || k.includes('event_date'))                        return 'event_date';
  if (k.includes('function') || k.includes('event') || k.includes('day'))   return 'functions';
  return null;
}

// ─────────────────────────────────────────────────────────────
// GET — Meta Webhook Hub Verification
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const workspaceId = searchParams.get('workspace_id');

  if (mode && token) {
    if (mode === 'subscribe') {
      let expectedToken = process.env.FACEBOOK_VERIFY_TOKEN;

      if (workspaceId) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('meta_verify_token')
          .eq('id', workspaceId)
          .single();
        if (profile?.meta_verify_token) {
          expectedToken = profile.meta_verify_token;
        }
      }

      if (token === expectedToken) {
        console.log('[FB Webhook] Verified successfully. workspace_id:', workspaceId);
        return new Response(challenge, { status: 200 });
      }
    }
    return new Response('Forbidden', { status: 403 });
  }
  return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────
// POST — Meta Lead Ads Ingestion (Full Engine)
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log('[FB Webhook] Incoming payload:', JSON.stringify(body, null, 2));

    // ── Parsed lead data container ──────────────────────────
    let leadData: {
      name: string;
      email: string;
      phone: string;
      raw_payload: Record<string, any>;
      raw_meta_payload: Record<string, any>;
      meta_lead_id: string | null;
      source_form_id: string | null;
      form_tag: string | null;
    } = {
      name: '',
      email: '',
      phone: '',
      raw_payload: {},
      raw_meta_payload: {},
      meta_lead_id: null,
      source_form_id: null,
      form_tag: null,
    };

    // ── 1. Real Meta Webhook payload ─────────────────────────
    if (body.object === 'page' && body.entry?.[0]?.changes?.[0]?.value?.leadgen_id) {
      const entry    = body.entry[0];
      const change   = entry.changes[0];
      const leadgenId = change.value.leadgen_id as string;
      const formId    = (change.value.form_id as string) || null;
      const pageId    = (change.value.page_id as string) || null;

      leadData.meta_lead_id   = leadgenId;
      leadData.source_form_id = formId;

      // ── 1a. Deduplication check ──────────────────────────
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('meta_lead_id', leadgenId)
        .maybeSingle();

      if (existingLead) {
        console.log('[FB Webhook] Duplicate lead detected. meta_lead_id:', leadgenId, '— Skipping.');
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: 'Duplicate lead ignored (deduplication active).',
        });
      }

      // ── 1b. Fetch Page Access Token ──────────────────────
      let pageAccessToken: string | null = null;
      if (pageId) {
        const { data: pageConfig } = await supabaseAdmin
          .from('fb_page_configs')
          .select('page_access_token')
          .eq('workspace_id', workspaceId)
          .eq('page_id', pageId)
          .maybeSingle();
        pageAccessToken = pageConfig?.page_access_token || null;
      }

      // Fallback to profile's meta_access_token
      if (!pageAccessToken) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('meta_access_token')
          .eq('id', workspaceId)
          .single();
        pageAccessToken = profile?.meta_access_token || null;
      }

      if (!pageAccessToken) {
        throw new Error(`No access token found for workspace: ${workspaceId}`);
      }

      // ── 1c. Fetch lead values from Meta Graph API ────────
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${leadgenId}?fields=id,created_time,form_id,field_data&access_token=${pageAccessToken}`
      );

      if (!metaRes.ok) {
        const errText = await metaRes.text();
        throw new Error(`Meta Graph API error: ${metaRes.status} — ${errText}`);
      }

      const metaLead = await metaRes.json();
      console.log('[FB Webhook] Meta lead data:', JSON.stringify(metaLead, null, 2));

      // Use formId from lead data if not in change payload
      if (!formId && metaLead.form_id) {
        leadData.source_form_id = metaLead.form_id;
      }

      // ── 1d. Load Form Mapping Config from DB ────────────
      let mappingConfig: Record<string, string> = {};
      let isTaggingEnabled = false;
      let formName: string | null = null;

      const resolvedFormId = leadData.source_form_id;
      if (resolvedFormId) {
        const { data: formMapping } = await supabaseAdmin
          .from('fb_form_mappings')
          .select('mapping_config, is_tagging_enabled, form_name, is_active')
          .eq('workspace_id', workspaceId)
          .eq('form_id', resolvedFormId)
          .maybeSingle();

        if (formMapping) {
          // If form is explicitly set to inactive, skip ingestion
          if (formMapping.is_active === false) {
            console.log('[FB Webhook] Form is inactive. Skipping lead:', resolvedFormId);
            return NextResponse.json({ success: true, skipped: true, message: 'Form is set to inactive.' });
          }
          mappingConfig    = (formMapping.mapping_config as Record<string, string>) || {};
          isTaggingEnabled = formMapping.is_tagging_enabled ?? false;
          formName         = formMapping.form_name || null;
        }
      }

      // ── 1e. Parse Meta field_data into leadData ──────────
      const rawPayload: Record<string, any>      = {};
      const fullRawMeta: Record<string, any>     = {};

      (metaLead.field_data || []).forEach((field: { name: string; values: string[] }) => {
        const key = field.name;
        const val = field.values?.[0] || '';

        // Full raw backup
        fullRawMeta[key] = val;

        // Try explicit custom mapping first
        const explicitMapping = mappingConfig[key];
        if (explicitMapping) {
          if (explicitMapping === 'name')  leadData.name  = leadData.name  || val;
          if (explicitMapping === 'email') leadData.email = leadData.email || val;
          if (explicitMapping === 'phone') leadData.phone = leadData.phone || val;
          rawPayload[explicitMapping !== 'custom' ? key : key] = val;
        } else {
          // Intelligent fuzzy auto-mapping
          const autoMapped = fuzzyMapField(key);
          if (autoMapped === 'name'  && !leadData.name)  leadData.name  = val;
          if (autoMapped === 'email' && !leadData.email) leadData.email = val;
          if (autoMapped === 'phone' && !leadData.phone) leadData.phone = val;
          rawPayload[key] = val;
        }
      });

      leadData.raw_payload      = rawPayload;
      leadData.raw_meta_payload = fullRawMeta;

      // ── 1f. Form Tagging ─────────────────────────────────
      if (isTaggingEnabled && formName) {
        leadData.form_tag = formName;
      }

    } else {
      // ── 2. Direct simulation / manual POST mode ──────────
      leadData.name  = body.name  || '';
      leadData.email = body.email || '';
      leadData.phone = body.phone || '';

      const excludeKeys = ['name', 'email', 'phone', 'workspace_id'];
      const customPayload: Record<string, any> = {};
      Object.keys(body).forEach(k => {
        if (!excludeKeys.includes(k)) customPayload[k] = body[k];
      });

      leadData.raw_payload      = customPayload;
      leadData.raw_meta_payload = {};
      leadData.meta_lead_id     = body.meta_lead_id || null;
      leadData.source_form_id   = body.source_form_id || null;
      leadData.form_tag         = body.form_tag || null;
    }

    // ── 3. Validate phone ──────────────────────────────────
    if (!leadData.phone) {
      throw new Error('Lead ingestion failed: Phone number is required.');
    }

    // ── 4. AI Scoring & Classification ────────────────────
    const scoringResult = classifyLead(leadData.raw_payload);

    // ── 5. Save Lead to Supabase ───────────────────────────
    const { data: savedLead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert({
        workspace_id:      workspaceId,
        name:              leadData.name  || null,
        email:             leadData.email || null,
        phone:             leadData.phone,
        source:            'facebook',
        status:            'new' as LeadStatus,
        score:             scoringResult.score,
        score_reason:      scoringResult.reason,
        raw_payload:       leadData.raw_payload,
        raw_meta_payload:  leadData.raw_meta_payload,
        meta_lead_id:      leadData.meta_lead_id,
        source_form_id:    leadData.source_form_id,
        form_tag:          leadData.form_tag,
      })
      .select()
      .single();

    if (insertErr || !savedLead) {
      // Unique constraint violation = duplicate
      if (insertErr?.code === '23505') {
        console.log('[FB Webhook] Duplicate (DB constraint). meta_lead_id:', leadData.meta_lead_id);
        return NextResponse.json({ success: true, duplicate: true, message: 'Duplicate lead (constraint).' });
      }
      throw new Error(`Failed to save lead: ${insertErr?.message}`);
    }

    // ── 6. Log Ingestion Event ─────────────────────────────
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id:      savedLead.id,
      event_type:   'webhook_ingested',
      message:      `FB Lead ingested: "${savedLead.name || savedLead.phone}". Score: ${savedLead.score}.${leadData.form_tag ? ` Tag: ${leadData.form_tag}` : ''}`,
      metadata: {
        meta_lead_id:   leadData.meta_lead_id,
        source_form_id: leadData.source_form_id,
        form_tag:       leadData.form_tag,
        raw:            leadData.raw_payload,
      },
    });

    const typedLead = savedLead as Lead;

    // ── 7. Queue WhatsApp Drips (Async) ────────────────────
    queueDripsForLead(workspaceId, typedLead).catch(err =>
      console.error('[FB Webhook] Async Drip Queueing error:', err)
    );

    // ── 8. Sync to Google Contacts (Async) ─────────────────
    syncLeadToGoogleContacts(workspaceId, typedLead).catch(err =>
      console.error('[FB Webhook] Async Google Sync error:', err)
    );

    return NextResponse.json({
      success:   true,
      leadId:    typedLead.id,
      score:     typedLead.score,
      reason:    typedLead.score_reason,
      form_tag:  leadData.form_tag,
      duplicate: false,
    });
  } catch (err: any) {
    console.error('[FB Webhook POST Error]', err);

    try {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type:   'webhook_error',
        message:      `FB Webhook Error: ${err.message || err}`,
        metadata:     { error: String(err) },
      });
    } catch (_) {
      // Non-critical — ignore log write errors
    }

    return NextResponse.json({ error: err.message || 'Ingestion failed' }, { status: 500 });
  }
}

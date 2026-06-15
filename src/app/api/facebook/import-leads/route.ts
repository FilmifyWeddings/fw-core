import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { classifyLead } from '@/lib/classification';
import { LeadStatus } from '@/types';

// Fuzzy auto-mapper: Meta field key se system field guess karo
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

/**
 * POST /api/facebook/import-leads
 * Body: { workspace_id, page_id, form_id }
 *
 * Pulls historical leads from Meta Graph API for a specific form,
 * maps them to our schema, and imports them into Supabase leads table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, page_id, form_id } = body;

    if (!workspace_id || !page_id || !form_id) {
      return NextResponse.json({ error: 'workspace_id, page_id, form_id required' }, { status: 400 });
    }

    // 1. Fetch Page Access Token from fb_page_configs
    const { data: pageConfig } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_access_token, page_name')
      .eq('workspace_id', workspace_id)
      .eq('page_id', page_id)
      .maybeSingle();

    if (!pageConfig?.page_access_token) {
      return NextResponse.json({ success: false, error: 'Page config not found or token missing.' }, { status: 404 });
    }

    // 2. Fetch Form Mapping Config
    const { data: formMapping } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('mapping_config, is_tagging_enabled, form_name')
      .eq('workspace_id', workspace_id)
      .eq('form_id', form_id)
      .maybeSingle();

    const mappingConfig = (formMapping?.mapping_config as Record<string, string>) || {};
    const isTaggingEnabled = formMapping?.is_tagging_enabled ?? false;
    const formName = formMapping?.form_name || null;

    let metaLeadsData: any[] = [];

    // Check for mock token/mode bypass
    if (pageConfig.page_access_token.startsWith('mock_token_') || page_id.startsWith('mock_page_')) {
      // Generate some mock historical leads
      metaLeadsData = [
        {
          id: `mock_hist_lead_${form_id}_1`,
          created_time: new Date(Date.now() - 1000 * 3600 * 24 * 3).toISOString(),
          field_data: [
            { name: 'full_name', values: ['Sushant Nawale'] },
            { name: 'phone_number', values: ['+919876543201'] },
            { name: 'email', values: ['sushant@example.com'] },
            { name: 'budget', values: ['1.8 Lakhs'] },
            { name: 'venue', values: ['Taj Jaipur'] }
          ]
        },
        {
          id: `mock_hist_lead_${form_id}_2`,
          created_time: new Date(Date.now() - 1000 * 3600 * 24 * 5).toISOString(),
          field_data: [
            { name: 'full_name', values: ['Neha Mehta'] },
            { name: 'phone_number', values: ['+919876543202'] },
            { name: 'email', values: ['neha@example.com'] },
            { name: 'budget', values: ['90k'] },
            { name: 'venue', values: ['Local Hotel'] }
          ]
        }
      ];
    } else {
      // Fetch real leads from Meta Graph API
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${form_id}/leads?fields=id,created_time,field_data&limit=100&access_token=${pageConfig.page_access_token}`
      );

      if (!metaRes.ok) {
        const errBody = await metaRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Meta API error: ${metaRes.status}`);
      }

      const responseData = await metaRes.json();
      metaLeadsData = responseData.data || [];
    }

    let importedCount = 0;
    let duplicateCount = 0;

    for (const lead of metaLeadsData) {
      const leadgenId = lead.id;

      // Deduplication check: check if already exists in DB
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('meta_lead_id', leadgenId)
        .maybeSingle();

      if (existingLead) {
        duplicateCount++;
        continue;
      }

      // Parse lead values
      let leadName = '';
      let leadEmail = '';
      let leadPhone = '';
      const rawPayload: Record<string, any> = {};
      const rawMetaPayload: Record<string, any> = {};

      (lead.field_data || []).forEach((field: { name: string; values: string[] }) => {
        const key = field.name;
        const val = field.values?.[0] || '';

        rawMetaPayload[key] = val;

        const explicitMapping = mappingConfig[key];
        if (explicitMapping) {
          if (explicitMapping === 'name')  leadName  = leadName  || val;
          if (explicitMapping === 'email') leadEmail = leadEmail || val;
          if (explicitMapping === 'phone') leadPhone = leadPhone || val;
          rawPayload[explicitMapping] = val;
        } else {
          const autoMapped = fuzzyMapField(key);
          if (autoMapped === 'name'  && !leadName)  leadName  = val;
          if (autoMapped === 'email' && !leadEmail) leadEmail = val;
          if (autoMapped === 'phone' && !leadPhone) leadPhone = val;
          rawPayload[key] = val;
        }
      });

      // Skip leads with no phone number
      if (!leadPhone) {
        continue;
      }

      // Score and classify lead
      const scoringResult = classifyLead(rawPayload);

      // Save Lead to Supabase
      const { error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert({
          workspace_id:      workspace_id,
          name:              leadName  || null,
          email:             leadEmail || null,
          phone:             leadPhone,
          source:            'facebook',
          status:            'new' as LeadStatus,
          score:             scoringResult.score,
          score_reason:      scoringResult.reason,
          raw_payload:       rawPayload,
          raw_meta_payload:  rawMetaPayload,
          meta_lead_id:      leadgenId,
          source_form_id:    form_id,
          form_tag:          isTaggingEnabled && formName ? formName : null,
          created_at:        lead.created_time || new Date().toISOString(),
          updated_at:        new Date().toISOString(),
        });

      if (!insertErr) {
        importedCount++;
      } else {
        console.error('[FB Import Leads] DB Insert Error:', insertErr.message);
      }
    }

    // Log the import event
    if (importedCount > 0) {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id,
        event_type: 'leads_imported',
        message: `Imported ${importedCount} historical leads for form: "${formName || form_id}". Duplicates skipped: ${duplicateCount}.`,
      });
    }

    return NextResponse.json({
      success: true,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      total_found: metaLeadsData.length,
    });

  } catch (err: any) {
    console.error('[FB Import Leads Error]', err);
    return NextResponse.json({ success: false, error: err.message || 'Import failed' }, { status: 500 });
  }
}

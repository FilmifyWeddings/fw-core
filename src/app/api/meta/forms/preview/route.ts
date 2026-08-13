import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

// CRM field auto-mapping logic
const CRM_FIELD_MAP: Record<string, { crm_field: string; label: string }> = {
  FULL_NAME: { crm_field: 'full_name', label: 'Full Name' },
  FIRST_NAME: { crm_field: 'first_name', label: 'First Name' },
  LAST_NAME: { crm_field: 'last_name', label: 'Last Name' },
  EMAIL: { crm_field: 'email', label: 'Email Address' },
  PHONE: { crm_field: 'phone', label: 'Phone Number' },
  PHONE_NUMBER: { crm_field: 'phone', label: 'Phone Number' },
  CITY: { crm_field: 'city', label: 'City' },
  STATE: { crm_field: 'state', label: 'State' },
  COUNTRY: { crm_field: 'country', label: 'Country' },
  ZIP: { crm_field: 'zip_code', label: 'ZIP Code' },
  JOB_TITLE: { crm_field: 'job_title', label: 'Job Title' },
  COMPANY_NAME: { crm_field: 'company', label: 'Company Name' },
  GENDER: { crm_field: 'gender', label: 'Gender' },
  DATE_TIME: { crm_field: 'date_time', label: 'Date/Time' },
  WORK_EMAIL: { crm_field: 'work_email', label: 'Work Email' },
};

function mapToCrmField(type: string, key: string, label: string): { crm_field: string; is_custom: boolean; label: string } {
  const known = CRM_FIELD_MAP[type.toUpperCase()];
  if (known) return { ...known, is_custom: false };

  // Custom question – derive field name from key
  const customKey = key
    .replace(/[^a-z0-9_]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 64);

  return {
    crm_field: customKey || 'custom_field',
    label: label || key,
    is_custom: true,
  };
}

/**
 * GET /api/meta/forms/preview?form_id=XXX
 * Fetches real form definition from Meta Graph API using stored page access token.
 * Returns complete questions with CRM field mappings.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('form_id');
    const requestedWorkspaceId = searchParams.get('workspace_id');

    if (!formId) {
      return NextResponse.json({ success: false, error: 'form_id is required' }, { status: 400 });
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;

    // 1. Get form row from fb_lead_forms (try matching workspace_id first, fallback to form_id)
    let { data: formRow } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId)
      .maybeSingle();

    if (!formRow) {
      const { data: fallbackRow } = await supabaseAdmin
        .from('fb_lead_forms')
        .select('*')
        .eq('form_id', formId)
        .maybeSingle();
      if (fallbackRow) formRow = fallbackRow;
    }

    // 2. Resolve access token & page info
    let pageToken = '';
    let pageName = 'Facebook Page';
    let pageId = formRow?.page_id || '';

    if (pageId) {
      const { data: pageRow } = await supabaseAdmin
        .from('fb_page_configs')
        .select('page_name, page_access_token')
        .eq('page_id', pageId)
        .maybeSingle();

      if (pageRow?.page_access_token) {
        pageToken = pageRow.page_access_token;
        pageName = pageRow.page_name || 'Facebook Page';
      }
    }

    if (!pageToken) {
      const { data: conn } = await supabaseAdmin
        .from('integration_credentials')
        .select('access_token')
        .eq('provider', 'meta')
        .eq('status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conn?.access_token) {
        pageToken = conn.access_token;
      }
    }

    let rawQuestions: any[] = formRow?.questions || [];
    let formName = formRow?.form_name || 'Instant Lead Form';
    let formStatus = (formRow?.status || 'ACTIVE').toUpperCase();
    let leadsCount = formRow?.leads_count || 0;
    let createdTime = formRow?.created_time || new Date().toISOString();

    // 3. Try fetching live form definition from Meta Graph API if pageToken is available
    if (pageToken) {
      try {
        const graphUrl = `https://graph.facebook.com/v20.0/${formId}?fields=id,name,status,questions,leads_count,created_time&access_token=${pageToken}`;
        const graphRes = await fetch(graphUrl);
        const graphData = await graphRes.json().catch(() => ({}));

        if (!graphData.error && graphData.id) {
          if (graphData.questions && graphData.questions.length > 0) {
            rawQuestions = graphData.questions;
          }
          if (graphData.name) formName = graphData.name;
          if (graphData.status) formStatus = graphData.status.toUpperCase();
          if (graphData.leads_count !== undefined) leadsCount = graphData.leads_count;
          if (graphData.created_time) createdTime = graphData.created_time;
        }
      } catch (err: any) {
        console.warn('[Forms Preview API Graph Query Warning]:', err.message);
      }
    }

    // 4. Map questions to CRM fields
    const questions = rawQuestions.map((q: any, idx: number) => {
      const mapping = mapToCrmField(q.type || 'CUSTOM', q.key || '', q.label || '');
      return {
        index: idx + 1,
        question_id: q.id || `q_${idx}`,
        key: q.key || `key_${idx}`,
        label: q.label || q.key || `Question ${idx + 1}`,
        type: q.type || 'CUSTOM',
        options: q.options || [],
        crm_field: mapping.crm_field,
        crm_label: mapping.label,
        is_custom: mapping.is_custom,
      };
    });

    return NextResponse.json({
      success: true,
      form: {
        form_id: formId,
        form_name: formName,
        status: formStatus,
        page_id: pageId,
        page_name: pageName,
        leads_count: leadsCount,
        created_time: createdTime,
        is_enabled: formRow?.is_enabled ?? true,
        questions,
        questions_count: questions.length,
      },
    });

  } catch (err: any) {
    console.error('[Forms Preview API Exception]:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch form preview' },
      { status: 500 }
    );
  }
}

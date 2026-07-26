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

    // Get form + page access token from DB
    const { data: formRow, error: formErr } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('form_id, form_name, page_id, status, leads_count, created_time, is_enabled')
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId)
      .single();

    if (formErr || !formRow) {
      return NextResponse.json({ success: false, error: 'Form not found in database' }, { status: 404 });
    }

    const { data: pageRow } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_name, page_access_token')
      .eq('workspace_id', workspaceId)
      .eq('page_id', formRow.page_id)
      .single();

    const pageToken = pageRow?.page_access_token;
    const pageName = pageRow?.page_name || 'Facebook Page';

    if (!pageToken) {
      return NextResponse.json({ success: false, error: 'Page access token not found. Please re-authenticate.' }, { status: 403 });
    }

    // Fetch real form definition from Meta Graph API
    const graphUrl = `https://graph.facebook.com/v20.0/${formId}?fields=id,name,status,questions,leads_count,created_time&access_token=${pageToken}`;
    const graphRes = await fetch(graphUrl);
    const graphData = await graphRes.json();

    if (graphData.error) {
      console.error('[Forms Preview API] Graph API Error:', JSON.stringify(graphData.error, null, 2));
      return NextResponse.json({
        success: false,
        error: `Meta Graph API Error: ${graphData.error.message}`,
        graph_error: graphData.error,
      }, { status: 502 });
    }

    // Map questions to CRM fields
    const questions = (graphData.questions || []).map((q: any, idx: number) => {
      const mapping = mapToCrmField(q.type || 'CUSTOM', q.key || '', q.label || '');
      return {
        index: idx + 1,
        question_id: q.id,
        key: q.key,
        label: q.label,
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
        form_id: graphData.id || formRow.form_id,
        form_name: graphData.name || formRow.form_name,
        status: (graphData.status || formRow.status || 'ACTIVE').toUpperCase(),
        page_id: formRow.page_id,
        page_name: pageName,
        leads_count: graphData.leads_count || formRow.leads_count || 0,
        created_time: graphData.created_time || formRow.created_time,
        is_enabled: formRow.is_enabled ?? true,
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

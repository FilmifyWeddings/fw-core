import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * GET /api/facebook/forms?page_id=YYY
 *
 * Fetches Lead Forms for a specific Facebook Page belonging to the authenticated workspace.
 * Meta Graph API: GET /{page-id}/leadgen_forms
 * Merges with existing DB mappings.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');
  const pageId = searchParams.get('page_id');

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized && authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const workspaceId = authResult.workspaceId;

  if (!pageId) {
    return NextResponse.json({ error: 'page_id required' }, { status: 400 });
  }

  try {
    // Page Access Token fetch strictly for authenticated workspace and page_id
    const { data: pageConfig } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_access_token, page_name')
      .eq('workspace_id', workspaceId)
      .eq('page_id', pageId)
      .maybeSingle();

    if (!pageConfig?.page_access_token) {
      return NextResponse.json({
        success: false,
        error: 'Page not connected to your workspace. Please connect this page first.',
        forms: [],
      }, { status: 404 });
    }

    // Mock bypass check for forms
    if (pageConfig.page_access_token.startsWith('mock_token_') || pageId.startsWith('mock_page_')) {
      const mockForms = pageId === 'mock_page_101' ? [
        {
          id: 'mock_form_wedding',
          name: 'Wedding Photography Leads 2026',
          status: 'ACTIVE',
          leads_count: 42,
          created_time: '2026-06-12T10:00:00Z',
          questions: [
            { key: 'full_name', name: 'full_name', type: 'TEXT' },
            { key: 'phone_number', name: 'phone_number', type: 'PHONE' },
            { key: 'email', name: 'email', type: 'EMAIL' },
            { key: 'event_date', name: 'event_date', type: 'TEXT' },
            { key: 'venue', name: 'venue', type: 'TEXT' }
          ]
        }
      ] : [
        {
          id: 'mock_form_portrait',
          name: 'Studio Portrait Sessions',
          status: 'ACTIVE',
          leads_count: 12,
          created_time: '2026-06-10T12:00:00Z',
          questions: [
            { key: 'full_name', name: 'full_name', type: 'TEXT' },
            { key: 'email', name: 'email', type: 'EMAIL' },
            { key: 'phone_number', name: 'phone_number', type: 'PHONE' }
          ]
        }
      ];

      const { data: savedMappings } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('page_id', pageId);

      const savedMap = new Map((savedMappings || []).map((m: any) => [m.form_id, m]));

      const enrichedForms = mockForms.map((form: any) => {
        const saved = savedMap.get(form.id);
        return {
          form_id: form.id,
          form_name: form.name,
          status: form.status,
          leads_count: form.leads_count || 0,
          created_time: form.created_time,
          questions: form.questions || [],
          is_active: saved?.is_active ?? false,
          is_tagging_enabled: saved?.is_tagging_enabled ?? false,
          mapping_config: saved?.mapping_config ?? {},
          contact_group_id: saved?.contact_group_id ?? null,
          is_saved: !!saved,
        };
      });

      return NextResponse.json({ success: true, forms: enrichedForms });
    }

    // Meta Graph API — /{page_id}/leadgen_forms
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${pageConfig.page_access_token}`
    );

    if (!metaRes.ok) {
      const errBody = await metaRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errBody?.error?.message || `Meta API error: ${metaRes.status}`,
        forms: [],
      });
    }

    const metaData = await metaRes.json();
    const metaForms = metaData.data || [];

    // Auto-save fetched Meta forms strictly with authenticated workspace_id
    for (const form of metaForms) {
      await supabaseAdmin.from('fb_lead_forms').upsert({
        workspace_id: workspaceId,
        page_id: pageId,
        form_id: form.id,
        form_name: form.name,
        status: form.status || 'ACTIVE',
        leads_count: form.leads_count || 0,
        created_time: form.created_time || new Date().toISOString(),
        is_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,form_id' });

      await supabaseAdmin.from('fb_form_mappings').upsert({
        workspace_id: workspaceId,
        page_id: pageId,
        form_id: form.id,
        form_name: form.name,
        is_active: true,
        is_tagging_enabled: true,
        mapping_config: { questions: form.questions || [] },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,form_id' });
    }

    // Existing form mappings strictly from DB for this workspace
    const { data: savedMappings } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('page_id', pageId);

    const savedMap = new Map((savedMappings || []).map((m: any) => [m.form_id, m]));

    // Merge Meta forms with saved DB mappings
    const enrichedForms = metaForms.map((form: any) => {
      const saved = savedMap.get(form.id);
      return {
        form_id: form.id,
        form_name: form.name,
        status: form.status,
        leads_count: form.leads_count || 0,
        created_time: form.created_time,
        questions: form.questions || [],
        is_active: saved?.is_active ?? false,
        is_tagging_enabled: saved?.is_tagging_enabled ?? false,
        mapping_config: saved?.mapping_config ?? {},
        distribution_config: saved?.mapping_config?.distribution_config || saved?.distribution_config || {
          enabled: false,
          strategy: 'round_robin',
          owners: [],
          last_assigned_index: -1
        },
        contact_group_id: saved?.contact_group_id ?? null,
        is_saved: !!saved,
      };
    });

    return NextResponse.json({ success: true, forms: enrichedForms });
  } catch (err: any) {
    console.error('[FB Forms API Error]', err);
    return NextResponse.json({ success: false, error: err.message, forms: [] }, { status: 500 });
  }
}

/**
 * POST /api/facebook/forms
 * Body: { page_id, form_id, form_name, is_active, is_tagging_enabled, mapping_config, distribution_config }
 *
 * Saves form mapping strictly for the authenticated workspace.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authResult = await verifyMetaAuth(req, body.workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const workspaceId = authResult.workspaceId;
    const {
      page_id, form_id, form_name,
      is_active, is_tagging_enabled, mapping_config,
      distribution_config, contact_group_id,
    } = body;

    if (!page_id || !form_id) {
      return NextResponse.json({ error: 'page_id and form_id required' }, { status: 400 });
    }

    // Verify page_id actually belongs to this workspace
    const { data: pageRecord } = await supabaseAdmin
      .from('fb_page_configs')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('page_id', page_id)
      .maybeSingle();

    if (!pageRecord) {
      return NextResponse.json({ error: 'Page not found in your workspace' }, { status: 403 });
    }

    const mergedMappingConfig = {
      ...(mapping_config || {}),
      ...(distribution_config ? { distribution_config } : {})
    };

    const { data, error } = await supabaseAdmin
      .from('fb_form_mappings')
      .upsert({
        workspace_id: workspaceId,
        page_id,
        form_id,
        form_name: form_name || null,
        is_active: is_active ?? true,
        is_tagging_enabled: is_tagging_enabled ?? false,
        mapping_config: mergedMappingConfig,
        contact_group_id: contact_group_id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,form_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, mapping: data });
  } catch (err: any) {
    console.error('[FB Save Form Mapping Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


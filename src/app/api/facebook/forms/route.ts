import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/facebook/forms?workspace_id=XXX&page_id=YYY
 *
 * Ek specific Facebook Page ke saare Lead Forms fetch karta hai.
 * Meta Graph API: GET /{page-id}/leadgen_forms
 * DB se existing mappings bhi merge karta hai.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const pageId = searchParams.get('page_id');

  if (!workspaceId || !pageId) {
    return NextResponse.json({ error: 'workspace_id and page_id required' }, { status: 400 });
  }

  try {
    // Page Access Token fetch karo from fb_page_configs
    const { data: pageConfig } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_access_token, page_name')
      .eq('workspace_id', workspaceId)
      .eq('page_id', pageId)
      .maybeSingle();

    if (!pageConfig?.page_access_token) {
      return NextResponse.json({
        success: false,
        error: 'Page not connected. Pehle page save karo.',
        forms: [],
      });
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

    // Existing form mappings from DB
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
        // From DB
        is_active: saved?.is_active ?? false,
        is_tagging_enabled: saved?.is_tagging_enabled ?? false,
        mapping_config: saved?.mapping_config ?? {},
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
 * Body: { workspace_id, page_id, form_id, form_name, is_active, is_tagging_enabled, mapping_config }
 *
 * Form mapping config ko Supabase mein upsert karta hai.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspace_id, page_id, form_id, form_name,
      is_active, is_tagging_enabled, mapping_config,
    } = body;

    if (!workspace_id || !page_id || !form_id) {
      return NextResponse.json({ error: 'workspace_id, page_id, form_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('fb_form_mappings')
      .upsert({
        workspace_id,
        page_id,
        form_id,
        form_name: form_name || null,
        is_active: is_active ?? true,
        is_tagging_enabled: is_tagging_enabled ?? false,
        mapping_config: mapping_config || {},
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

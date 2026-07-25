import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function getValidWorkspaceId(requestedId?: string | null): Promise<string> {
  if (requestedId && requestedId !== '00000000-0000-0000-0000-000000000000') {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', requestedId).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: firstProfile } = await supabaseAdmin.from('profiles').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (firstProfile?.id) return firstProfile.id;
  return '37c63a54-d4f1-4b99-b546-3d965cd23a37';
}

/**
 * GET /api/meta/forms?workspace_id=XXX
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');
  const workspaceId = await getValidWorkspaceId(requestedWorkspaceId);

  try {
    let { data: dbForms } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (!dbForms || dbForms.length === 0) {
      const { data: globalForms } = await supabaseAdmin.from('fb_form_mappings').select('*');
      dbForms = globalForms || [];
    }

    const forms = (dbForms || []).map((f: any) => ({
      form_id: f.form_id,
      page_id: f.page_id,
      form_name: f.form_name || 'Instant Lead Form',
      status: 'ACTIVE',
      questions_count: 5,
      sync_count: f.sync_count || 0,
      is_active: f.is_active ?? true,
      created_time: f.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, forms });

  } catch (err: any) {
    console.error('[Meta Forms GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message, forms: [] }, { status: 500 });
  }
}

/**
 * POST /api/meta/forms
 * Toggle Form ON/OFF Status. Body: { workspace_id, form_id, is_active }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, form_id, is_active } = body;

    const targetWorkspaceId = await getValidWorkspaceId(workspace_id);

    if (!form_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'form_id and is_active (boolean) required' }, { status: 400 });
    }

    console.log(`[Supabase DB Write] Updating form_id "${form_id}" is_active to ${is_active}...`);

    const { data: updatedForm, error } = await supabaseAdmin
      .from('fb_form_mappings')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('form_id', form_id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[Meta Forms Toggle Error]:', error.message);
    }

    return NextResponse.json({
      success: true,
      form_id,
      is_active,
      message: `Lead Form "${updatedForm?.form_name || form_id}" sync turned ${is_active ? 'ON ✅' : 'OFF ⏸️'}`,
    });

  } catch (err: any) {
    console.error('[Meta Forms Toggle Exception]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/meta/forms?workspace_id=XXX
 * Refresh/Re-sync all Lead Forms directly from Meta Graph API.
 */
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');
  const workspaceId = await getValidWorkspaceId(requestedWorkspaceId);

  try {
    let { data: pages } = await supabaseAdmin
      .from('fb_page_configs')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (!pages || pages.length === 0) {
      const { data: globalPages } = await supabaseAdmin.from('fb_page_configs').select('*');
      pages = globalPages || [];
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No connected Facebook Pages found to sync forms from.',
        synced_count: 0,
      });
    }

    let syncedFormsCount = 0;
    const syncedFormsList: any[] = [];

    for (const page of pages) {
      console.log(`[Meta Graph API Query] Fetching leadgen_forms for Page ID: ${page.page_id}...`);
      const res = await fetch(`https://graph.facebook.com/v20.0/${page.page_id}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${page.page_access_token}`);
      if (res.ok) {
        const data = await res.json();
        const forms = data.data || [];
        for (const f of forms) {
          const formRecord = {
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: f.id,
            form_name: f.name || 'Instant Lead Form',
            is_active: true,
            is_tagging_enabled: true,
            updated_at: new Date().toISOString(),
          };

          const { error: fErr } = await supabaseAdmin
            .from('fb_form_mappings')
            .upsert(formRecord, { onConflict: 'workspace_id,form_id' });

          if (!fErr) {
            syncedFormsList.push({
              form_id: f.id,
              page_id: page.page_id,
              form_name: f.name || 'Instant Lead Form',
              status: f.status || 'ACTIVE',
              questions_count: f.questions ? f.questions.length : 0,
              sync_count: f.leads_count || 0,
              is_active: true,
            });
            syncedFormsCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced_count: syncedFormsCount,
      forms: syncedFormsList,
      message: `Successfully refreshed ${syncedFormsCount} Lead Form(s) across ${pages.length} Page(s).`,
    });

  } catch (err: any) {
    console.error('[Meta Forms Refresh Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

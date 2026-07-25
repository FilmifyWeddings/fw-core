import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * GET /api/meta/forms?workspace_id=XXX
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedWorkspaceId = searchParams.get('workspace_id');

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized && authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const workspaceId = authResult.workspaceId;

  try {
    const { data: dbForms } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('*')
      .eq('workspace_id', workspaceId);

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

    const authResult = await verifyMetaAuth(req, workspace_id);
    if (!authResult.authorized && authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const targetWorkspaceId = authResult.workspaceId;

    if (!form_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'form_id and is_active (boolean) required' }, { status: 400 });
    }

    console.log(`[Supabase DB Write] Updating form_id "${form_id}" for workspace "${targetWorkspaceId}" is_active to ${is_active}...`);

    const { data: updatedForm, error } = await supabaseAdmin
      .from('fb_form_mappings')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('workspace_id', targetWorkspaceId)
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

  const authResult = await verifyMetaAuth(req, requestedWorkspaceId);
  if (!authResult.authorized && authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const workspaceId = authResult.workspaceId;

  try {
    const { data: pages } = await supabaseAdmin
      .from('fb_page_configs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (!pages || pages.length === 0) {
      return NextResponse.json({ success: true, synced_count: 0, message: 'No connected Facebook pages found.' });
    }

    let syncedCount = 0;

    for (const page of pages) {
      if (!page.page_access_token || page.page_access_token.startsWith('mock_')) continue;

      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${page.page_id}/leadgen_forms?fields=id,name,status,leads_count&access_token=${page.page_access_token}`);
        if (res.ok) {
          const data = await res.json();
          const forms = data.data || [];
          syncedCount += forms.length;

          for (const form of forms) {
            await supabaseAdmin
              .from('fb_form_mappings')
              .upsert({
                workspace_id: workspaceId,
                tenant_id: workspaceId,
                page_id: page.page_id,
                form_id: form.id,
                form_name: form.name,
                is_active: true,
                is_tagging_enabled: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'form_id' });
          }
        }
      } catch (e) {
        console.warn(`[Meta Forms PUT] Failed to sync for page ${page.page_id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      synced_count: syncedCount,
      message: `Successfully synced ${syncedCount} Lead Form(s) from Meta Graph API.`,
    });

  } catch (err: any) {
    console.error('[Meta Forms PUT Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

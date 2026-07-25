import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/meta/forms?workspace_id=XXX
 * Returns list of all Lead Forms across connected Facebook Pages.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  try {
    const { data: dbForms } = await supabaseAdmin
      .from('meta_lead_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (dbForms && dbForms.length > 0) {
      return NextResponse.json({ success: true, forms: dbForms });
    }

    // Fallback: If DB forms empty, attempt to fetch directly via Meta Graph API using stored Page tokens
    const { data: pages } = await supabaseAdmin
      .from('meta_pages')
      .select('*')
      .eq('workspace_id', workspaceId);

    const targetPages = pages || [];
    const discoveredForms: any[] = [];

    for (const page of targetPages) {
      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${page.page_id}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions&access_token=${page.page_access_token}`);
        if (res.ok) {
          const data = await res.json();
          const forms = (data.data || []).map((f: any) => ({
            workspace_id: workspaceId,
            page_id: page.page_id,
            form_id: f.id,
            form_name: f.name || 'Instant Lead Form',
            status: f.status || 'ACTIVE',
            questions_count: f.questions ? f.questions.length : 0,
            sync_count: f.leads_count || 0,
            is_active: true,
            created_time: f.created_time || new Date().toISOString(),
          }));

          for (const form of forms) {
            await supabaseAdmin.from('meta_lead_forms').upsert(form, { onConflict: 'workspace_id,form_id' });
            discoveredForms.push(form);
          }
        }
      } catch (err) {
        console.error(`[Meta Forms GET] Error fetching forms for page ${page.page_id}:`, err);
      }
    }

    return NextResponse.json({ success: true, forms: discoveredForms });

  } catch (err: any) {
    console.error('[Meta Forms API Error]:', err);
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

    if (!workspace_id || !form_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'workspace_id, form_id, and is_active (boolean) required' }, { status: 400 });
    }

    // Update in meta_lead_forms
    const { data: updatedForm, error } = await supabaseAdmin
      .from('meta_lead_forms')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .eq('form_id', form_id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[Meta Forms Toggle Error]:', error);
    }

    // Legacy fallback update
    await supabaseAdmin
      .from('fb_form_mappings')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .eq('form_id', form_id);

    // If ON, ensure page webhook is subscribed
    if (is_active && updatedForm?.page_id) {
      const { data: page } = await supabaseAdmin
        .from('meta_pages')
        .select('page_access_token')
        .eq('page_id', updatedForm.page_id)
        .maybeSingle();

      if (page?.page_access_token) {
        fetch(`https://graph.facebook.com/v20.0/${updatedForm.page_id}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            subscribed_fields: 'leadgen',
            access_token: page.page_access_token,
          }).toString(),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      form_id,
      is_active,
      message: `Lead Form "${updatedForm?.form_name || form_id}" sync turned ${is_active ? 'ON ✅' : 'OFF ⏸️'}`,
    });

  } catch (err: any) {
    console.error('[Meta Forms Toggle Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/meta/forms?workspace_id=XXX
 * Refresh/Re-sync all Lead Forms directly from Meta Graph API.
 */
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || '00000000-0000-0000-0000-000000000000';

  try {
    const { data: pages } = await supabaseAdmin
      .from('meta_pages')
      .select('*')
      .eq('workspace_id', workspaceId);

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
            status: f.status || 'ACTIVE',
            questions_count: f.questions ? f.questions.length : 0,
            sync_count: f.leads_count || 0,
            is_active: true,
            created_time: f.created_time || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await supabaseAdmin
            .from('meta_lead_forms')
            .upsert(formRecord, { onConflict: 'workspace_id,form_id' });

          syncedFormsList.push(formRecord);
          syncedFormsCount++;
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
    console.error('[Meta Forms Refresh Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

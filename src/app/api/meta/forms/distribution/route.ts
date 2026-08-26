import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';

/**
 * GET /api/meta/forms/distribution?workspace_id=XXX
 * Returns per-form Lead Auto-Distribution config for all forms in the workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 401 });
    }

    const distributions: Record<string, { enabled: boolean; owners: string[] }> = {};

    // 1. Fetch from lead_distribution_settings table
    try {
      const { data: dbDists } = await supabaseAdmin
        .from('lead_distribution_settings')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (Array.isArray(dbDists)) {
        dbDists.forEach((d: any) => {
          distributions[d.form_id] = {
            enabled: d.is_enabled === true,
            owners: Array.isArray(d.owners) ? d.owners : [],
          };
        });
      }
    } catch (_) {}

    // 2. Fetch from fb_form_mappings
    try {
      const { data: mappings } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('form_id, mapping_config')
        .eq('workspace_id', workspaceId);

      if (Array.isArray(mappings)) {
        mappings.forEach(m => {
          const cfg = (m.mapping_config as any)?.distribution_config;
          if (cfg && Array.isArray(cfg.owners) && !distributions[m.form_id]) {
            distributions[m.form_id] = {
              enabled: cfg.enabled !== false,
              owners: cfg.owners,
            };
          }
        });
      }
    } catch (_) {}

    // 3. Fallback to Supabase auth user_metadata
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      const metaDists = u?.user?.user_metadata?.form_distributions || {};
      Object.keys(metaDists).forEach(fId => {
        if (!distributions[fId]) {
          distributions[fId] = metaDists[fId];
        }
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      distributions,
    });
  } catch (err: any) {
    console.error('[Forms Distribution GET Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch form distributions' }, { status: 500 });
  }
}

/**
 * POST /api/meta/forms/distribution
 * Body: { workspace_id?: string, form_id: string, enabled: boolean, owners: string[] }
 * Saves Lead Owner Auto-Distribution settings for a specific Meta Form.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { form_id, enabled, owners, workspace_id: requestedWorkspaceId } = body;

    if (!form_id || !Array.isArray(owners)) {
      return NextResponse.json(
        { success: false, error: 'form_id and owners array are required' },
        { status: 400 }
      );
    }

    const authResult = await verifyMetaAuth(req, requestedWorkspaceId || null);
    let workspaceId = authResult.workspaceId || requestedWorkspaceId || '';

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspace_id is required' }, { status: 401 });
    }

    const distConfig = {
      enabled: enabled !== false,
      owners,
      last_assigned_index: -1,
      updated_at: new Date().toISOString(),
    };

    let updatedSuccess = false;

    // 1. Update/Upsert into fb_form_mappings
    try {
      const { data: existing } = await supabaseAdmin
        .from('fb_form_mappings')
        .select('id, page_id, form_name, mapping_config')
        .eq('workspace_id', workspaceId)
        .eq('form_id', form_id)
        .maybeSingle();

      let pageId = existing?.page_id || '';
      let formName = existing?.form_name || '';

      if (!pageId) {
        const { data: lf } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('page_id, form_name')
          .eq('workspace_id', workspaceId)
          .eq('form_id', form_id)
          .maybeSingle();
        pageId = lf?.page_id || '';
        formName = lf?.form_name || '';
      }

      if (!pageId) {
        const { data: pageConfig } = await supabaseAdmin
          .from('fb_page_configs')
          .select('page_id')
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        pageId = pageConfig?.page_id || '0';
      }

      const currentMapping = (existing?.mapping_config as Record<string, any>) || {};
      const updatedMappingConfig = {
        ...currentMapping,
        distribution_config: distConfig,
      };

      const { error: upsertErr } = await supabaseAdmin
        .from('fb_form_mappings')
        .upsert({
          workspace_id: workspaceId,
          page_id: pageId,
          form_id,
          form_name: formName || 'Instant Lead Form',
          mapping_config: updatedMappingConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,form_id' });

      if (!upsertErr) updatedSuccess = true;
    } catch (_) {}

    // 2. Also save to lead_distribution_settings table
    try {
      await supabaseAdmin
        .from('lead_distribution_settings')
        .upsert({
          workspace_id: workspaceId,
          form_id,
          is_enabled: distConfig.enabled,
          owners: distConfig.owners,
          strategy: 'round_robin',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,form_id' });
      updatedSuccess = true;
    } catch (_) {}

    // 3. Also save to Supabase Auth user_metadata (Built-in failproof persistence)
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      const existingMeta = userData?.user?.user_metadata || {};
      const existingDists = existingMeta.form_distributions || {};

      const updatedDists = {
        ...existingDists,
        [form_id]: distConfig,
      };

      await supabaseAdmin.auth.admin.updateUserById(workspaceId, {
        user_metadata: {
          ...existingMeta,
          form_distributions: updatedDists,
        },
      });

      updatedSuccess = true;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      form_id,
      distribution: distConfig,
      db_persisted: updatedSuccess,
    });
  } catch (err: any) {
    console.error('[Forms Distribution POST Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Failed to save form distribution' }, { status: 500 });
  }
}

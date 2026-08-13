import { supabaseAdmin } from '@/lib/supabase';

export interface FormDistributionConfig {
  enabled: boolean;
  owners: string[];
  last_assigned_index?: number;
  updated_at?: string;
}

/**
 * Resolves the next Lead Owner according to Round-Robin Auto-Distribution rules for a given form.
 * Automatically advances and persists the last_assigned_index in both fb_form_mappings and user_metadata.
 */
export async function getNextDistributedLeadOwner(
  workspaceId: string,
  formId: string
): Promise<string | null> {
  if (!workspaceId || !formId) return null;

  let distConfig: FormDistributionConfig | null = null;
  let formMappingId: string | null = null;
  let existingMappingConfig: Record<string, any> = {};

  // 1. Fetch from fb_form_mappings
  try {
    const { data: formMapping } = await supabaseAdmin
      .from('fb_form_mappings')
      .select('id, mapping_config')
      .eq('workspace_id', workspaceId)
      .eq('form_id', formId)
      .maybeSingle();

    if (formMapping) {
      formMappingId = formMapping.id;
      existingMappingConfig = (formMapping.mapping_config as Record<string, any>) || {};
      const cfg = existingMappingConfig.distribution_config;
      if (cfg && Array.isArray(cfg.owners)) {
        distConfig = cfg;
      }
    }
  } catch (_) {}

  // 2. Fallback to user_metadata in Supabase Auth
  if (!distConfig) {
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      const metaDists = u?.user?.user_metadata?.form_distributions || {};
      if (metaDists[formId] && Array.isArray(metaDists[formId].owners)) {
        distConfig = metaDists[formId];
      }
    } catch (_) {}
  }

  // 3. Fallback to global lead_owners in workspace settings if form distribution is not explicitly set
  if (!distConfig) {
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
      const metaSettings = u?.user?.user_metadata?.page_settings || {};
      if (metaSettings.lead_auto_assign_enabled && Array.isArray(metaSettings.lead_owners) && metaSettings.lead_owners.length > 0) {
        const owners = metaSettings.lead_owners
          .map((o: any) => typeof o === 'string' ? o : o.name)
          .filter((n: string) => n && n !== 'Unassigned');
        if (owners.length > 0) {
          distConfig = {
            enabled: true,
            owners,
            last_assigned_index: typeof metaSettings.lead_auto_assign_last_idx === 'number' ? metaSettings.lead_auto_assign_last_idx : -1
          };
        }
      }
    } catch (_) {}
  }

  if (!distConfig || distConfig.enabled === false || !Array.isArray(distConfig.owners) || distConfig.owners.length === 0) {
    return null;
  }

  const validOwners = distConfig.owners.filter(Boolean);
  if (validOwners.length === 0) return null;

  const lastIdx = typeof distConfig.last_assigned_index === 'number' ? distConfig.last_assigned_index : -1;
  const nextIdx = (lastIdx + 1) % validOwners.length;
  const assignedOwner = validOwners[nextIdx];

  const updatedDistConfig: FormDistributionConfig = {
    ...distConfig,
    owners: validOwners,
    last_assigned_index: nextIdx,
    updated_at: new Date().toISOString()
  };

  // 4. Persist updated index back to fb_form_mappings
  try {
    const updatedMapping = {
      ...existingMappingConfig,
      distribution_config: updatedDistConfig
    };

    if (formMappingId) {
      await supabaseAdmin
        .from('fb_form_mappings')
        .update({
          mapping_config: updatedMapping,
          updated_at: new Date().toISOString()
        })
        .eq('id', formMappingId);
    } else {
      let pageId = '';
      let formName = '';
      try {
        const { data: lf } = await supabaseAdmin
          .from('fb_lead_forms')
          .select('page_id, form_name')
          .eq('workspace_id', workspaceId)
          .eq('form_id', formId)
          .maybeSingle();
        pageId = lf?.page_id || '';
        formName = lf?.form_name || '';
      } catch (_) {}

      if (!pageId) {
        try {
          const { data: pc } = await supabaseAdmin
            .from('fb_page_configs')
            .select('page_id')
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          pageId = pc?.page_id || '0';
        } catch (_) {}
      }

      await supabaseAdmin
        .from('fb_form_mappings')
        .upsert({
          workspace_id: workspaceId,
          page_id: pageId || '0',
          form_id: formId,
          form_name: formName || 'Instant Lead Form',
          mapping_config: updatedMapping,
          updated_at: new Date().toISOString()
        }, { onConflict: 'workspace_id,form_id' });
    }
  } catch (err: any) {
    console.error('[LeadDistribution] Failed to update fb_form_mappings:', err?.message);
  }

  // 5. Also persist to user_metadata
  try {
    const { data: uData } = await supabaseAdmin.auth.admin.getUserById(workspaceId);
    const existingMeta = uData?.user?.user_metadata || {};
    const existingDists = existingMeta.form_distributions || {};
    await supabaseAdmin.auth.admin.updateUserById(workspaceId, {
      user_metadata: {
        ...existingMeta,
        form_distributions: {
          ...existingDists,
          [formId]: updatedDistConfig
        }
      }
    });
  } catch (err: any) {
    console.error('[LeadDistribution] Failed to update user_metadata:', err?.message);
  }

  return assignedOwner;
}

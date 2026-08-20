import { supabaseAdmin } from './supabase';
import { getNextDistributedLeadOwner } from './lead-distribution';

/**
 * Automatically syncs all historical and new leads from Meta Graph API for all forms of a workspace.
 * Deduplicates by leadgen_id so no duplicates are ever created.
 */
export async function autoSyncAllMetaForms(workspaceId: string, pageTokenOverride?: string) {
  try {
    // 1. Fetch all pages & tokens for workspace
    const { data: pageConfigs } = await supabaseAdmin
      .from('fb_page_configs')
      .select('page_id, page_name, page_access_token')
      .eq('workspace_id', workspaceId)
      .not('page_access_token', 'is', null);

    const { data: creds } = await supabaseAdmin
      .from('integration_credentials')
      .select('access_token')
      .eq('user_id', workspaceId)
      .eq('provider', 'meta')
      .maybeSingle();

    const fallbackToken = pageTokenOverride || creds?.access_token || pageConfigs?.[0]?.page_access_token;
    if (!fallbackToken) return { success: false, error: 'No Meta token available' };

    // 2. Fetch all lead forms
    const { data: forms } = await supabaseAdmin
      .from('fb_lead_forms')
      .select('form_id, form_name, page_id, leads_count')
      .eq('workspace_id', workspaceId);

    if (!forms || forms.length === 0) return { success: true, imported: 0 };

    let totalImported = 0;

    for (const form of forms) {
      const pageConfig = (pageConfigs || []).find(p => p.page_id === form.page_id);
      const token = pageConfig?.page_access_token || fallbackToken;

      try {
        let nextCursor: string | null = null;
        let pageNum = 0;

        do {
          pageNum++;
          let url = `https://graph.facebook.com/v20.0/${form.form_id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&limit=100&access_token=${token}`;
          if (nextCursor) url += `&after=${nextCursor}`;

          const res = await fetch(url);
          const json = await res.json().catch(() => ({}));

          if (json.error) {
            console.warn(`[AutoSyncMeta] Error for form ${form.form_id}:`, json.error.message);
            break;
          }

          const batch = json.data || [];
          if (batch.length === 0) break;

          for (const lead of batch) {
            const leadgen_id = lead.id;

            // Check if already in DB
            const { data: existing } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('workspace_id', workspaceId)
              .contains('raw_payload', { leadgen_id })
              .maybeSingle();

            if (existing) continue;

            const fieldData: Record<string, string> = {};
            if (lead.field_data && Array.isArray(lead.field_data)) {
              lead.field_data.forEach((field: { name: string; values: string[] }) => {
                const key = (field.name || '').toLowerCase();
                fieldData[key] = field.values?.[0] || '';
              });
            }

            const fullName =
              fieldData['full_name'] ||
              fieldData['name'] ||
              [fieldData['first_name'], fieldData['last_name']].filter(Boolean).join(' ') ||
              'Facebook Lead';

            const phone =
              fieldData['phone_number'] ||
              fieldData['phone'] ||
              fieldData['mobile'] ||
              '';

            const email =
              fieldData['email'] ||
              fieldData['email_address'] ||
              fieldData['work_email'] ||
              '';

            let assignedLeadOwner: string | null = null;
            try {
              assignedLeadOwner = await getNextDistributedLeadOwner(workspaceId, form.form_id);
            } catch (_) {}

            const { data: formMapping } = await supabaseAdmin
              .from('fb_form_mappings')
              .select('contact_group_id')
              .eq('workspace_id', workspaceId)
              .eq('form_id', form.form_id)
              .maybeSingle();

            const contactGroupId = formMapping?.contact_group_id || null;

            const { error: insertErr } = await supabaseAdmin
              .from('leads')
              .insert({
                workspace_id: workspaceId,
                tenant_id: workspaceId,
                name: fullName,
                phone,
                email,
                source: 'Facebook Lead Ads',
                status: 'new',
                source_form_id: form.form_id,
                form_tag: form.form_name,
                whatsapp_group_id: contactGroupId,
                created_at: lead.created_time
                  ? new Date(lead.created_time).toISOString()
                  : new Date().toISOString(),
                raw_payload: {
                  leadgen_id,
                  form_id: form.form_id,
                  form_name: form.form_name,
                  page_id: form.page_id,
                  page_name: pageConfig?.page_name || 'Facebook Page',
                  campaign_name: lead.campaign_name || '',
                  adset_name: lead.adset_name || '',
                  ad_name: lead.ad_name || '',
                  field_data: lead.field_data || [],
                  lead_owner: assignedLeadOwner || 'Unassigned',
                  synced_automatically: true,
                  ...fieldData,
                },
              });

            if (!insertErr) {
              totalImported++;
            }
          }

          nextCursor = json.paging?.cursors?.after || null;
          if (!json.paging?.next) nextCursor = null;

        } while (nextCursor && pageNum < 50);

      } catch (fErr: any) {
        console.error(`[AutoSyncMeta Form Exception ${form.form_id}]:`, fErr.message);
      }
    }

    return { success: true, imported: totalImported };
  } catch (err: any) {
    console.error('[AutoSyncMeta Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

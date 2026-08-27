import { supabaseAdmin } from './supabase';

export interface ActivityLogEntry {
  workspace_id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  module: 'LEADS' | 'TEAM_MANAGER' | 'QUOTATIONS' | 'FINANCE' | 'TEAM' | 'SETTINGS' | 'ATTENDANCE';
  action: string;
  description: string;
  details?: Record<string, any>;
  created_at?: string;
}

/**
 * Log a workspace activity with full audit metadata (Timestamp, Member, Action, Details).
 * Resilient multi-tier persistence (SQL Table + Settings Fallback).
 */
export async function logWorkspaceActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    const timestamp = entry.created_at || new Date().toISOString();
    const payload = {
      workspace_id: entry.workspace_id,
      user_id: entry.user_id || null,
      user_name: entry.user_name || 'Studio Member',
      user_email: entry.user_email || '',
      user_role: entry.user_role || 'MEMBER',
      module: entry.module,
      action: entry.action,
      description: entry.description,
      details: entry.details || {},
      created_at: timestamp,
    };

    // Tier 1: Try inserting into workspace_activity_logs table
    try {
      const { error: logErr } = await supabaseAdmin
        .from('workspace_activity_logs')
        .insert([payload]);

      if (!logErr) return;
    } catch (_) {}

    // Tier 2: Graceful Fallback into workspace_settings recent_activity array
    try {
      const { data: wsSetting } = await supabaseAdmin
        .from('workspace_settings')
        .select('config')
        .eq('workspace_id', entry.workspace_id)
        .maybeSingle();

      const currentConfig = wsSetting?.config || {};
      const recentLogs = Array.isArray(currentConfig.recent_activity_logs) 
        ? currentConfig.recent_activity_logs 
        : [];

      const updatedLogs = [
        { ...payload, id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(7) },
        ...recentLogs
      ].slice(0, 100); // Keep latest 100 audit entries

      await supabaseAdmin
        .from('workspace_settings')
        .upsert({
          workspace_id: entry.workspace_id,
          config: {
            ...currentConfig,
            recent_activity_logs: updatedLogs,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
    } catch (fallbackErr) {
      console.warn('[logWorkspaceActivity Fallback Notice]:', fallbackErr);
    }
  } catch (err) {
    console.error('[logWorkspaceActivity Error]:', err);
  }
}

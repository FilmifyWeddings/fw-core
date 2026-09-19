'use client';

import { supabase } from '@/lib/supabase';

export interface PostProductionPresetItem {
  id?: string;
  title: string;
  specs?: string;
  count?: string;
}

export type PostProductionPreset = string | PostProductionPresetItem;

export interface PostProductionCategorySetting {
  id: string;
  name: string;
  presets: PostProductionPreset[];
}

export interface PostProductionStatusSetting {
  id: string;
  name: string;
  color: string;
}

export interface PostProductionSettingsData {
  categories: PostProductionCategorySetting[];
  statuses: PostProductionStatusSetting[];
}

export function normalizePreset(preset: PostProductionPreset): { id?: string; title: string; specs: string } {
  if (typeof preset === 'string') {
    return { title: preset.trim(), specs: '' };
  }
  return {
    id: preset.id,
    title: (preset.title || '').trim(),
    specs: (preset.specs || preset.count || '').toString().trim(),
  };
}

export const DEFAULT_POST_PRODUCTION_CATEGORIES: PostProductionCategorySetting[] = [
  {
    id: 'cat_photos',
    name: 'Photos',
    presets: [
      { title: 'Edited Photos', specs: '500 Photos' },
      { title: 'Save the Date Photo', specs: '5 Photos' },
      { title: 'Instagram Posts', specs: '15 Photos' },
      { title: 'Teaser Stills', specs: '20 Photos' },
      { title: 'Raw Photos', specs: '1500+ Photos' },
    ],
  },
  {
    id: 'cat_videos',
    name: 'Videos',
    presets: [
      { title: 'Cinematic Teaser', specs: '1-2 Mins' },
      { title: 'Full Wedding Film', specs: '25-30 Mins' },
      { title: 'Traditional Video', specs: '2-3 Hours' },
      { title: 'Instagram Reels', specs: '5 Reels' },
      { title: 'Raw Footage', specs: 'All Cameras' },
    ],
  },
  {
    id: 'cat_albums',
    name: 'Albums',
    presets: [
      { title: 'Canvas Bound Album', specs: '40 Pages' },
      { title: 'Mini Photo Book', specs: '20 Pages' },
      { title: 'Parent Album', specs: '30 Pages' },
      { title: 'Flush Mount Album', specs: '50 Pages' },
    ],
  },
];

export const DEFAULT_POST_PRODUCTION_STATUSES: PostProductionStatusSetting[] = [
  { id: 'st_upcoming', name: 'Upcoming', color: '#f59e0b' },
  { id: 'st_progress', name: 'In Progress', color: '#0ea5e9' },
  { id: 'st_review', name: 'Under Review', color: '#a855f7' },
  { id: 'st_done', name: 'Done', color: '#10b981' },
];

export const DEFAULT_POST_PRODUCTION_SETTINGS: PostProductionSettingsData = {
  categories: DEFAULT_POST_PRODUCTION_CATEGORIES,
  statuses: DEFAULT_POST_PRODUCTION_STATUSES,
};

const STORAGE_KEY = 'fw_post_production_settings';

/**
 * Fetch Post-Production Settings from Supabase with Strict Multi-Tenant Isolation.
 * Strictly queries the requested workspace_id. Never leaks other studios' presets or statuses.
 */
export async function fetchPostProductionSettings(workspaceId?: string): Promise<PostProductionSettingsData> {
  let targetWsId: string = workspaceId || '';

  // If no workspaceId provided, resolve from URL studio param, localStorage or active session
  if (!targetWsId && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      targetWsId = urlParams.get('studio') || urlParams.get('workspace_id') || localStorage.getItem('active_workspace_id') || '';
    } catch (_) {}
  }

  if (!targetWsId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) targetWsId = session.user.id;
    } catch (_) {}
  }

  const finalWsId = targetWsId || 'ws_demo';

  // 1. Check workspace-specific LocalStorage cache for instant UI response
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEY}_${finalWsId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories && parsed.statuses) {
          syncFromSupabase(finalWsId).catch(() => {});
          return parsed;
        }
      }
    } catch (_) {}
  }

  // 2. Fetch directly from Supabase for this workspace
  return await syncFromSupabase(finalWsId);
}

async function syncFromSupabase(workspaceId: string): Promise<PostProductionSettingsData> {
  if (!workspaceId) {
    return DEFAULT_POST_PRODUCTION_SETTINGS;
  }

  try {
    // Strictly match exact workspace_id for tenant isolation
    const res = await supabase
      .from('post_production_settings')
      .select('categories, statuses')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!res.error && res.data && res.data.categories && res.data.statuses) {
      const result: PostProductionSettingsData = {
        categories: Array.isArray(res.data.categories) && res.data.categories.length > 0 
          ? res.data.categories 
          : DEFAULT_POST_PRODUCTION_CATEGORIES,
        statuses: Array.isArray(res.data.statuses) && res.data.statuses.length > 0 
          ? res.data.statuses 
          : DEFAULT_POST_PRODUCTION_STATUSES,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${workspaceId}`, JSON.stringify(result));
      }
      return result;
    }
  } catch (err) {
    console.warn('Could not read post_production_settings from Supabase for workspace:', workspaceId, err);
  }

  // Return default settings for this workspace if no custom row exists yet
  return DEFAULT_POST_PRODUCTION_SETTINGS;
}

/**
 * Save Post-Production Settings to Supabase and LocalStorage with Strict Multi-Tenant Isolation
 */
export async function savePostProductionSettings(
  workspaceId: string,
  settings: PostProductionSettingsData
): Promise<boolean> {
  let targetWsId: string = workspaceId || '';
  if (!targetWsId && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      targetWsId = urlParams.get('studio') || urlParams.get('workspace_id') || localStorage.getItem('active_workspace_id') || '';
    } catch (_) {}
  }
  if (!targetWsId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) targetWsId = session.user.id;
    } catch (_) {}
  }

  const finalWsId = targetWsId || 'ws_demo';

  // 1. Update LocalStorage immediately for THIS workspace only
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${finalWsId}`, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('post_production_settings_updated', { 
        detail: { workspaceId: finalWsId, settings } 
      }));
    } catch (_) {}
  }

  // 2. Persist to Supabase post_production_settings table strictly scoped to workspace_id
  try {
    const { error } = await supabase
      .from('post_production_settings')
      .upsert({
        workspace_id: finalWsId,
        categories: settings.categories,
        statuses: settings.statuses,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (error) {
      console.warn('Note: post_production_settings upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to upsert to post_production_settings:', err);
    return false;
  }
}

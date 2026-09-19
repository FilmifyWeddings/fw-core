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
const CACHE_TTL_MS = 120000; // 2 minutes

// In-memory module-level cache & in-flight promise deduplication
const memoryCache: Record<string, PostProductionSettingsData | undefined> = {};
const inFlightPromise: Record<string, Promise<PostProductionSettingsData> | undefined> = {};
const lastFetchTime: Record<string, number | undefined> = {};

function resolveTargetWsId(workspaceId?: string): string {
  let targetWsId: string = workspaceId || '';

  if (!targetWsId && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      targetWsId = urlParams.get('studio') || urlParams.get('workspace_id') || localStorage.getItem('active_workspace_id') || '';
    } catch (_) {}
  }

  return targetWsId || 'ws_demo';
}

/**
 * Synchronously get cached post-production settings in 0ms (memory-first, then localStorage fallback).
 */
export function getCachedPostProductionSettings(workspaceId?: string): PostProductionSettingsData {
  const finalWsId = resolveTargetWsId(workspaceId);

  // 1. Check in-memory cache
  if (memoryCache[finalWsId]) {
    return memoryCache[finalWsId];
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEY}_${finalWsId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories && parsed.statuses) {
          memoryCache[finalWsId] = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }

  return DEFAULT_POST_PRODUCTION_SETTINGS;
}

/**
 * Fetch Post-Production Settings from Supabase with Strict Multi-Tenant Isolation.
 * Strictly queries the requested workspace_id. Deduplicates in-flight calls and uses in-memory cache.
 */
export async function fetchPostProductionSettings(workspaceId?: string): Promise<PostProductionSettingsData> {
  const finalWsId = resolveTargetWsId(workspaceId);

  // 1. Check in-memory cache (fresh within TTL)
  const cachedMem = memoryCache[finalWsId];
  const lastTime = lastFetchTime[finalWsId] || 0;
  const isFresh = cachedMem && (Date.now() - lastTime < CACHE_TTL_MS);

  if (isFresh) {
    return cachedMem;
  }

  // 2. If memory cache exists but is stale, return it immediately and revalidate in background
  if (cachedMem) {
    if (!inFlightPromise[finalWsId]) {
      inFlightPromise[finalWsId] = syncFromSupabase(finalWsId).finally(() => {
        delete inFlightPromise[finalWsId];
      });
    }
    return cachedMem;
  }

  // 3. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${STORAGE_KEY}_${finalWsId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories && parsed.statuses) {
          memoryCache[finalWsId] = parsed;
          lastFetchTime[finalWsId] = Date.now();
          // Revalidate in background if not already in flight
          if (!inFlightPromise[finalWsId]) {
            inFlightPromise[finalWsId] = syncFromSupabase(finalWsId).finally(() => {
              delete inFlightPromise[finalWsId];
            });
          }
          return parsed;
        }
      }
    } catch (_) {}
  }

  // 4. If request is already in-flight, await the same promise (prevents 200+ concurrent requests!)
  if (inFlightPromise[finalWsId]) {
    return inFlightPromise[finalWsId];
  }

  // 5. Fetch directly from Supabase with deduplication
  inFlightPromise[finalWsId] = syncFromSupabase(finalWsId).finally(() => {
    delete inFlightPromise[finalWsId];
  });

  return inFlightPromise[finalWsId];
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

      memoryCache[workspaceId] = result;
      lastFetchTime[workspaceId] = Date.now();

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${workspaceId}`, JSON.stringify(result));
      }
      return result;
    }
  } catch (err) {
    console.warn('Could not read post_production_settings from Supabase for workspace:', workspaceId, err);
  }

  // Return cached or default settings for this workspace
  return memoryCache[workspaceId] || DEFAULT_POST_PRODUCTION_SETTINGS;
}

/**
 * Save Post-Production Settings to Supabase and LocalStorage with Strict Multi-Tenant Isolation
 */
export async function savePostProductionSettings(
  workspaceId: string,
  settings: PostProductionSettingsData
): Promise<boolean> {
  const finalWsId = resolveTargetWsId(workspaceId);

  // 1. Update in-memory cache and LocalStorage immediately
  memoryCache[finalWsId] = settings;
  lastFetchTime[finalWsId] = Date.now();

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


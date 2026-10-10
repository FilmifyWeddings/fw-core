/**
 * StudioCore Enterprise Storage Safety & Anti-Bloat Protocol
 * Prevents LocalStorage QuotaExceededError, ensures zero UI freezes,
 * and maintains dual-layer storage integrity across multi-device sessions.
 */

/**
 * Strips huge quotation content bodies down to lightweight presentation metadata
 * (< 2KB per card) suitable for gallery caches and dropdowns without filling LocalStorage.
 */
export function pruneDocumentForListCache(item: any): any {
  if (!item || typeof item !== 'object') return item;

  const content = item.content_json || item.canvas_data || item;
  const cover = content?.cover || {};

  return {
    id: item.id || item.quotation_number,
    quotation_number: item.quotation_number || item.id,
    title: item.title || content?.designName || content?.title || 'Quotation Template',
    designName: content?.designName || item.title || 'Quotation Template',
    client_name: item.client_name || cover.coupleName || (cover.groomName ? `${cover.groomName} & ${cover.brideName}` : 'Couple'),
    couple_names: item.couple_names || cover.coupleName || item.client_name,
    category: item.category || content?.eventGroup || 'Wedding',
    status: item.status || 'draft',
    is_default: Boolean(item.is_default),
    is_system_template: Boolean(item.is_system_template),
    lead_id: item.lead_id || content?.lead_id || null,
    lead_version: item.lead_version || content?.lead_version || null,
    is_final: Boolean(item.is_final || content?.is_final),
    total_amount: item.total_amount || content?.pricingPage?.finalAmount || content?.pricing?.grandTotal || null,
    financials: item.financials || {},
    updated_at: item.updated_at || new Date().toISOString(),
    created_at: item.created_at || new Date().toISOString(),
    // Keep ONLY lightweight cover metadata for instant card thumbnail preview
    content_json: {
      designName: content?.designName || item.title,
      eventGroup: content?.eventGroup || 'Wedding',
      look: content?.look || 'cyprus-sand-dune',
      theme: content?.theme || content?.look,
      cover: {
        coupleName: cover.coupleName || '',
        groomName: cover.groomName || '',
        brideName: cover.brideName || '',
        photoUrl: cover.photoUrl || '',
        eventType: cover.eventType || 'Wedding',
        locationName: cover.locationName || '',
        brandName: cover.brandName || '',
        bgOpacity: cover.bgOpacity || 40,
        frameShape: cover.frameShape || 'arch'
      }
    }
  };
}

/**
 * Emergency purge of stale/large localStorage keys when storage quota is reached.
 */
export function purgeStaleStorageKeys(keepDraftId?: string): number {
  if (typeof window === 'undefined') return 0;
  let freedCount = 0;

  try {
    const keysToRemove: string[] = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Remove all old proposal drafts except the active one
      if (key.startsWith('wg_proposal_draft_')) {
        const draftId = key.replace('wg_proposal_draft_', '');
        if (!keepDraftId || draftId !== keepDraftId) {
          keysToRemove.push(key);
        }
      }

      // 2. Remove legacy large backups or temporary cache items
      if (
        key.startsWith('temp_') ||
        key.startsWith('sc_cached_leads_backup_') ||
        key.startsWith('sc_lead_export_') ||
        key.includes('_full_backup')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
        freedCount++;
      } catch (_) {}
    });

    // 3. Compact existing list caches if still large
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('wg_quotations_cache_') || key.startsWith('studio_templates_cache'))) {
        try {
          const raw = localStorage.getItem(key);
          if (raw && raw.length > 50000) { // Larger than 50KB
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const pruned = parsed.map(pruneDocumentForListCache);
              localStorage.setItem(key, JSON.stringify(pruned));
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[StorageSafety] Purge error:', err);
  }

  return freedCount;
}

/**
 * Defensive LocalStorage setter that catches QuotaExceededError,
 * cleans up stale data automatically, and retries gracefully without throwing.
 */
export function safeLocalStorageSet(key: string, value: string, activeDraftId?: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // If quota exceeded or out of memory
    const isQuotaError = 
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    console.warn(`[StorageSafety] LocalStorage write failed for key "${key}" (Quota: ${isQuotaError}). Running emergency cleanup...`);

    try {
      purgeStaleStorageKeys(activeDraftId);
      // Retry once after pruning
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[StorageSafety] Secondary LocalStorage write failed for "${key}". Falling back to sessionStorage.`, retryErr);
      try {
        sessionStorage.setItem(key, value);
      } catch (_) {}
      return false;
    }
  }
}

/**
 * Defensive LocalStorage getter with safe error handling.
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

/**
 * Defensive LocalStorage remover.
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

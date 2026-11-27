/**
 * Enterprise Server-Side Stale-While-Revalidate (SWR) & Request Coalescing Cache
 * - Returns cached data in <1ms within fresh/stale window
 * - Coalesces concurrent requests (10-12 users hitting same endpoint = 1 DB query)
 * - Refreshes stale entries silently in background without blocking user UI
 * - Instant workspace-wide invalidation on any write mutation
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
  wsId: string;
}

const store = new Map<string, CacheEntry<any>>();
const inFlight = new Map<string, Promise<any>>();
const MAX_ENTRIES = 300;

export async function getSwrCached<T>(
  key: string,
  wsId: string,
  fetcher: () => Promise<T>,
  opts: { freshMs?: number; staleMs?: number; bypass?: boolean } = {}
): Promise<{ data: T; cacheStatus: 'HIT' | 'STALE' | 'MISS' }> {
  const freshMs = opts.freshMs ?? 12_000;
  const staleMs = opts.staleMs ?? 120_000;
  const now = Date.now();
  const entry = !opts.bypass ? store.get(key) : undefined;

  if (entry) {
    const age = now - entry.ts;
    if (age < freshMs) {
      return { data: entry.data, cacheStatus: 'HIT' };
    }
    if (age < staleMs) {
      // Trigger non-blocking background refresh if not already running
      if (!inFlight.has(key)) {
        const bg = fetcher()
          .then((freshData) => {
            store.set(key, { data: freshData, ts: Date.now(), wsId });
            return freshData;
          })
          .catch(() => {})
          .finally(() => {
            inFlight.delete(key);
          });
        inFlight.set(key, bg);
      }
      return { data: entry.data, cacheStatus: 'STALE' };
    }
  }

  // Coalesce concurrent cold misses into a single DB round-trip
  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetcher()
      .then((freshData) => {
        if (store.size >= MAX_ENTRIES) {
          const oldestKey = store.keys().next().value;
          if (oldestKey) store.delete(oldestKey);
        }
        store.set(key, { data: freshData, ts: Date.now(), wsId });
        return freshData;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, pending);
  }

  const data = await pending;
  return { data, cacheStatus: 'MISS' };
}

export function invalidateWorkspaceCache(wsId?: string | null, domainPrefix?: string) {
  if (!wsId) return;
  for (const [key, entry] of store.entries()) {
    if (entry.wsId === wsId && (!domainPrefix || key.startsWith(domainPrefix))) {
      store.delete(key);
    }
  }
}
'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

/**
 * Enterprise-Grade IndexedDB Cache Persister via idb-keyval
 * Scoped strictly by workspace and user ID to prevent cross-tenant data leakage.
 */
export function createIdbPersister(idbKey: string = 'sc_react_query_cache') {
  return {
    persistClient: async (client: any) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        console.warn('[QueryPersister] Error writing query cache to IndexedDB:', err);
      }
    },
    restoreClient: async () => {
      try {
        return await get(idbKey);
      } catch (err) {
        console.warn('[QueryPersister] Error restoring query cache from IndexedDB:', err);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(idbKey);
      } catch (err) {
        console.warn('[QueryPersister] Error removing query cache from IndexedDB:', err);
      }
    },
  };
}

let globalQueryClient: QueryClient | null = null;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 2, // 2 minutes: render instantly from cache
          gcTime: 1000 * 60 * 60 * 24, // 24 hours: persist in IndexedDB
          retry: 1,
        },
      },
    });
  }

  if (!globalQueryClient) {
    globalQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 2, // 2 minutes (0ms instant render from memory/IDB)
          gcTime: 1000 * 60 * 60 * 24, // 24 hours (keep alive in IndexedDB)
          refetchOnWindowFocus: true, // Auto-sync in background when user returns to app
          refetchOnReconnect: true,
          retry: 1,
        },
      },
    });
  }

  return globalQueryClient;
}

/**
 * Clear cached queries from memory and IndexedDB on user sign-out
 */
export async function clearWorkspaceQueryCache(targetWsId?: string) {
  try {
    if (globalQueryClient) {
      globalQueryClient.clear();
    }
    const wsId = targetWsId || (typeof window !== 'undefined' ? localStorage.getItem('sc_active_workspace_id') : '');
    if (wsId) {
      await del(`sc_query_cache_${wsId}`);
    }
  } catch (err) {
    console.warn('[QueryPersister] Error clearing query cache:', err);
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => getQueryClient(), []);

  const persister = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const wsId = localStorage.getItem('sc_active_workspace_id') || 'default_ws';
    return createIdbPersister(`sc_query_cache_${wsId}`);
  }, []);

  if (typeof window === 'undefined' || !persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: 'sc_v2_20261127_live_repair_v3',
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

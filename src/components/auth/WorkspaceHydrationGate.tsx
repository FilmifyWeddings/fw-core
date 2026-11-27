'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

/**
 * WorkspaceHydrationGate
 * ======================
 * Prevents mobile empty-data race conditions by ensuring Supabase auth sessions
 * and active workspace context are fully resolved before children attempt to fire
 * unauthenticated queries.
 *
 * If cached workspace exists (repeat visit / returning from background), children
 * render instantly in 0ms while session revalidates silently in the background.
 */
export function WorkspaceHydrationGate({ children }: { children: React.ReactNode }) {
  const { isReady, loading, activeWorkspace } = useWorkspace();
  const [hasCachedContext, setHasCachedContext] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('sc_cached_workspaces') || localStorage.getItem('sc_active_workspace_id'));
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasStored = Boolean(localStorage.getItem('sc_cached_workspaces') || localStorage.getItem('sc_active_workspace_id'));
      if (hasStored) setHasCachedContext(true);
    }
  }, []);

  // If user has cached workspace or is already ready, render immediately
  if (isReady || hasCachedContext || activeWorkspace) {
    return <>{children}</>;
  }

  // Only show loader on true cold boot when no cache exists
  if (loading) {
    return <StudioCoreLiquidLoader label="Connecting to studio workspace..." />;
  }

  return <>{children}</>;
}

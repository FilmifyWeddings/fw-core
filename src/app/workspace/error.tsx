'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[Workspace Error Caught by Boundary]:', error);
  }, [error]);

  const handleHardReset = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        // Clear any corrupted workspace view caches without clearing auth tokens
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sc_cache_') || key.startsWith('wg_') || key.includes('temp_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    } catch (_) {}
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Workspace Module Notice</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Could not complete loading this workspace module. You can reload the module, clear temporary cache, or return to the workspace dashboard.
          </p>
        </div>

        {/* Diagnostic Collapsible Box */}
        {error?.message && (
          <div className="text-left bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              <span>Diagnostic Details</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDetails && (
              <div className="mt-2.5 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5 text-[11px] font-mono text-rose-600 dark:text-rose-400 break-all select-all">
                <p><span className="font-bold text-zinc-500 dark:text-zinc-400">Error:</span> {error.message}</p>
                {error.digest && (
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Digest: {error.digest}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Module</span>
          </button>

          <button
            onClick={handleHardReset}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            title="Clears temporary caches and reloads the page"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reset Cache</span>
          </button>

          <Link
            href="/workspace"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-500" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

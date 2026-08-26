'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Workspace Error Caught by Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-md text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-zinc-900">Workspace Module Notice</h2>
          <p className="text-xs text-zinc-500 font-medium">
            Could not complete loading this workspace module. You can reload or return to dashboard.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Module</span>
          </button>

          <Link
            href="/workspace"
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Root App Error Caught by Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Something went wrong</h2>
          <p className="text-xs text-zinc-500 font-medium">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-zinc-400 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 truncate">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/workspace"
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

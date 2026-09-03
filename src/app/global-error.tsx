'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global App Error Caught]:', error);
    // If it's a chunk loading or version mismatch error, auto-reload once to fetch fresh assets in production
    if (process.env.NODE_ENV === 'production') {
      const isChunkError =
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && typeof window !== 'undefined') {
        const lastReload = sessionStorage.getItem('last_global_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('last_global_chunk_reload', now.toString());
          window.location.reload();
        }
      }
    }
  }, [error]);

  // 1. Disable in Development Mode: strictly runs ONLY in production
  if (process.env.NODE_ENV !== 'production') {
    return null; // completely disable in local dev
  }

  // 2. Full unregister, storage clear, and hard reload
  const handleReload = async () => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_version');
        localStorage.removeItem('studiocore_build_hash');
        sessionStorage.removeItem('last_global_chunk_reload');
        sessionStorage.removeItem('sc_chunk_reload');
      }
    } catch (e) {
      console.error(e);
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF9F5] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200/80 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚡
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              App Update Detected
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              A new version of StudioCore has been deployed. Please reload the page to load the latest updates.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReload}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Reload StudioCore
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

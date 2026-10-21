'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.message?.includes('ChunkLoadError') ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch') ||
    error?.name === 'ChunkLoadError';

  useEffect(() => {
    console.error('[Global App Error Caught]:', error);
    if (process.env.NODE_ENV === 'production' && isChunkError) {
      if (typeof window !== 'undefined') {
        const lastReload = sessionStorage.getItem('last_sc_hard_reload');
        const now = Date.now();
        // Automatically attempt 1 hard cache-bust reload if not already tried in the last 20 seconds
        if (!lastReload || now - parseInt(lastReload, 10) > 20000) {
          sessionStorage.setItem('last_sc_hard_reload', now.toString());
          if (typeof window !== 'undefined' && (window as any).forceHardReload) {
            (window as any).forceHardReload();
          } else {
            window.location.replace(window.location.pathname + '?fresh=' + now);
          }
        }
      }
    }
  }, [error, isChunkError]);

  // Disable in Development Mode: strictly runs ONLY in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <html lang="en">
      <head>
        <title>{isChunkError ? 'App Update Detected | StudioCore' : 'Application Recovered | StudioCore'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function forceHardReload(target) {
                try {
                  if (window.caches) {
                    caches.keys().then(function(keys) {
                      for (var i = 0; i < keys.length; i++) caches.delete(keys[i]);
                    });
                  }
                  if (navigator.serviceWorker) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      for (var i = 0; i < regs.length; i++) regs[i].unregister();
                    });
                  }
                  sessionStorage.clear();
                  localStorage.removeItem('app_version');
                  localStorage.removeItem('studiocore_build_hash');
                } catch (_) {}
                var dest = target || window.location.pathname || '/';
                var sep = dest.indexOf('?') === -1 ? '?' : '&';
                window.location.replace(dest + sep + 'fresh=' + Date.now());
              }
              window.forceHardReload = forceHardReload;
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#FAF9F5] text-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200/80 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            {isChunkError ? '⚡' : '⚠️'}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {isChunkError ? 'App Update Detected' : 'Application Recovered'}
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {isChunkError
                ? 'A new version of StudioCore has been deployed. Please reload the page to load the latest updates.'
                : (error?.message || 'A temporary interface issue occurred. Click below to continue.')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).forceHardReload) {
                  (window as any).forceHardReload();
                } else {
                  reset();
                }
              }}
              // Native DOM onclick executes even if React hydration was interrupted
              // @ts-ignore
              onclick="forceHardReload(); return false;"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Reload & Update
            </button>

            <a
              href="/workspace"
              // @ts-ignore
              onclick="forceHardReload('/workspace'); return false;"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer text-center inline-block"
            >
              Go to Workspace
            </a>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <a
              href="/workspace/review"
              // @ts-ignore
              onclick="forceHardReload('/workspace/review'); return false;"
              className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold underline underline-offset-4"
            >
              Open StudioCore Review (Video Review Platform) &rarr;
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

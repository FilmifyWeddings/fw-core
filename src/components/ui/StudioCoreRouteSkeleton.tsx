import React from 'react';

export function StudioCoreRouteSkeleton({ title = 'Loading...' }: { title?: string }) {
  return (
    <div className="w-full min-h-[80vh] px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse select-none">
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-64 bg-zinc-100 dark:bg-zinc-850 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-9 w-32 bg-amber-500/20 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-amber-500/10" />
            </div>
            <div className="h-7 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-850 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Area Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-850 rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 w-full bg-zinc-50 dark:bg-zinc-850/60 rounded-xl flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-md hidden sm:block" />
              <div className="h-6 w-20 bg-amber-500/15 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudioCoreRouteSkeleton;

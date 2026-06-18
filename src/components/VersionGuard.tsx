'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  
  const currentVersionRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Fetch active version on mount
    const fetchActiveVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_versions')
          .select('version_number, release_notes')
          .eq('is_active', true)
          .maybeSingle();

        if (data) {
          setCurrentVersion(data.version_number);
          currentVersionRef.current = data.version_number;
        }
      } catch (err) {
        console.error('Error fetching active version:', err);
      }
    };

    fetchActiveVersion();

    // 2. Subscribe to app_versions realtime updates
    const channel = supabase
      .channel('realtime-version-guard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_versions' },
        (payload) => {
          const record = payload.new as any;
          if (record && record.is_active) {
            const versionNumber = record.version_number;
            // Trigger update toast if the active version number has changed from initial load version
            if (currentVersionRef.current && versionNumber !== currentVersionRef.current) {
              setUpdateAvailable(versionNumber);
              setReleaseNotes(record.release_notes || '');
            } else {
              // Update local version reference if it's the first time
              setCurrentVersion(versionNumber);
              currentVersionRef.current = versionNumber;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSync = () => {
    // Force reload bypassing browser cache to fetch fresh bundle
    window.location.reload();
  };

  return (
    <>
      {children}

      {/* Global OTA Update Alert Modal */}
      <AnimatePresence>
        {updateAvailable && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="max-w-md w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <ArrowUpCircle className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    System Update Deployed <span className="text-orange-500 font-mono text-xs">({updateAvailable})</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                    A new version of BHAMSTRA OS has been published by the Super Admin. Please sync your application cache to load updates.
                  </p>
                </div>
              </div>

              {releaseNotes && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-850 space-y-1">
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-500" /> Release Notes
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono whitespace-pre-line">
                    {releaseNotes}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSync}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-orange-500/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  Sync Application Cache
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

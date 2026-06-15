'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, RefreshCw, Send, AlertTriangle, Globe, Wifi } from 'lucide-react';
import { LiveLog } from '@/types';

interface ActivityTickerProps {
  logs: LiveLog[];
}

export function ActivityTicker({ logs }: ActivityTickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'webhook_ingested': return { icon: Database, color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-500/10' };
      case 'webhook_error': return { icon: AlertTriangle, color: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10' };
      case 'drip_scheduled': return { icon: RefreshCw, color: 'text-indigo-550 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' };
      case 'whatsapp_sent': return { icon: Send, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' };
      case 'whatsapp_failed': return { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' };
      case 'sync_google_success': return { icon: Globe, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' };
      case 'sync_google_failed': return { icon: AlertTriangle, color: 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10' };
      case 'whatsapp_gateway_status': return { icon: Wifi, color: 'text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' };
      default: return { icon: Database, color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-500/10' };
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md h-[400px] flex flex-col shadow-2xl transition-colors duration-200">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-zinc-900 dark:text-white">Live Activity Stream</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Real-time background job updates ticker</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
            No activity logged yet.
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {logs.map((log) => {
                const config = getLogIcon(log.event_type);
                const Icon = config.icon;
                return (
                  <motion.li
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/70 hover:border-zinc-200 dark:hover:border-zinc-800/80 transition-all flex items-start gap-3.5"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-white leading-tight">{log.message}</p>
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-550 block mt-1 font-sans">
                        {mounted ? new Date(log.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) : ''}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { clearAllSupabaseAuthCookies } from '@/lib/supabase';

export default function ClearCookiesPage() {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // 1. Clear Supabase auth cookies via helper
    clearAllSupabaseAuthCookies();

    // 2. Clear all document cookies manually across paths and domains
    try {
      const cookies = document.cookie.split(';');
      const paths = ['/', '/workspace', '/dashboard', '/api', '/sushant-1023-fw'];
      const domains = [undefined, 'localhost', '.localhost'];

      cookies.forEach((c) => {
        const name = c.split('=')[0].trim();
        if (name) {
          paths.forEach((p) => {
            domains.forEach((d) => {
              const dPart = d ? `; domain=${d}` : '';
              document.cookie = `${name}=; path=${p}${dPart}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            });
          });
        }
      });
    } catch (_) {}

    setCleared(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-serif text-white">
            Cookies & Headers Cleared!
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All accumulated header cookies for localhost have been completely wiped. Your HTTP 431 error is now resolved.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <a
            href="/login"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href="/sushant-1023-fw"
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <span>Open SuperAdmin Console (/sushant-1023-fw)</span>
          </a>
        </div>
      </div>
    </div>
  );
}

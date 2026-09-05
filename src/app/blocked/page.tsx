'use client';

import React from 'react';
import { ShieldAlert, MessageSquare, Mail, LogOut, ArrowRight } from 'lucide-react';
import { clearAllSupabaseAuthCookies, supabase } from '@/lib/supabase';

export default function AccountBlockedPage() {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    clearAllSupabaseAuthCookies();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-rose-900/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 bg-zinc-950/80 border border-rose-500/20 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.08)] text-center space-y-6">
        
        {/* Glowing Shield Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span>Platform Access Suspended</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-serif">
            Workspace Suspended
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Your studio account access has been temporarily restricted by StudioCore platform administration. This may be due to account verification, billing status, or an administrative review.
          </p>
        </div>

        {/* Info card */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Status</span>
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Administrative Hold
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Support Priority</span>
            <span className="text-zinc-200 font-medium">Urgent Resolution</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <a
            href="https://wa.me/918767980838?text=Hello%20StudioCore%20Support%2C%20my%20studio%20workspace%20shows%20suspended.%20Please%20help%20me%20resolve%20this."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all group"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Support on WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="mailto:support@studiocore.in?subject=Studio%20Account%20Suspension%20Inquiry"
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Mail className="w-4 h-4 text-zinc-400" />
            <span>Email Administration</span>
          </a>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1.5 pt-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>

        <div className="text-[10px] text-zinc-600 font-mono">
          REF: SC-SEC-LOCK // StudioCore Governance
        </div>
      </div>
    </div>
  );
}

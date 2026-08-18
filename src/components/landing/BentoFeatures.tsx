'use client';

import React from 'react';
import { 
  User, 
  Workflow, 
  FileText, 
  Users, 
  MessageSquare, 
  CheckCircle2
} from 'lucide-react';

export function BentoFeatures() {
  return (
    <section id="features" className="py-20 md:py-32 bg-[#FAF7F2] dark:bg-[#0C0B0A] relative selection:bg-[#F36F21] selection:text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* ── SECTION HEADER ── */}
        <div className="mb-14 sm:mb-20 space-y-3">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-zinc-900 dark:text-white leading-[1.15]">
            Everything You Need.{' '}
            <span className="font-serif italic font-normal text-[#bf7304] dark:text-[#d97706] block sm:inline">
              In One Place.
            </span>
          </h2>
          <p className="text-xs sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-medium">
            Purpose-built studio management suite for photography teams, cinematographers, and luxury wedding studios.
          </p>
        </div>

        {/* ── 4 CARDS CONTAINER: STICKY STACKING ON MOBILE + 2x2 GRID ON DESKTOP ── */}
        <div className="relative text-left space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 max-w-5xl mx-auto">
          
          {/* ═══════════════════════════════════════════════════════════════
              CARD 1: SMART CRM (Sticky top-20 on mobile)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-20 lg:static z-10 bg-white/95 dark:bg-[#161514] rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-amber-200/70 dark:border-zinc-800 shadow-xl shadow-amber-950/5 flex flex-col justify-between transition-transform duration-300">
            <div>
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-500 shrink-0">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-zinc-900 dark:text-white">
                  Smart CRM
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-5">
                Manage leads, conversations &amp; follow-ups in one place.
              </p>

              {/* Status List Rows */}
              <div className="space-y-2">
                
                {/* 1. New Lead */}
                <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    New Lead
                  </span>
                </div>

                {/* 2. Contacted */}
                <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Contacted
                  </span>
                </div>

                {/* 3. Quotation Sent */}
                <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Quotation Sent
                  </span>
                </div>

                {/* 4. Follow-up */}
                <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Follow-up
                  </span>
                </div>

                {/* 5. Booked */}
                <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Booked
                  </span>
                </div>

              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════
              CARD 2: AUTOMATION (Sticky top-24 on mobile)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-24 lg:static z-20 bg-white/95 dark:bg-[#161514] rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-amber-200/70 dark:border-zinc-800 shadow-xl shadow-amber-950/5 flex flex-col justify-between transition-transform duration-300">
            <div>
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
                  <Workflow className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-zinc-900 dark:text-white">
                  Automation
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-5">
                Automated follow-ups, reminders &amp; notifications.
              </p>

              {/* Flowchart Diagram */}
              <div className="space-y-1.5 flex flex-col items-center">
                
                {/* Node 1: New Lead */}
                <div className="w-full bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl py-2 px-3 text-center">
                  <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    New Lead
                  </span>
                </div>

                {/* Down Arrow */}
                <span className="text-xs font-bold text-zinc-400 select-none">↓</span>

                {/* Node 2: Send WhatsApp */}
                <div className="w-full bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-700/60 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs sm:text-sm font-bold">
                    Send WhatsApp
                  </span>
                </div>

                {/* Down Arrow */}
                <span className="text-xs font-bold text-zinc-400 select-none">↓</span>

                {/* Node 3: Wait 1 Day */}
                <div className="w-full bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl py-2 px-3 text-center">
                  <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Wait 1 Day
                  </span>
                </div>

                {/* Down Arrow */}
                <span className="text-xs font-bold text-zinc-400 select-none">↓</span>

                {/* Node 4: Send Follow-up */}
                <div className="w-full bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-700/60 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs sm:text-sm font-bold">
                    Send Follow-up
                  </span>
                </div>

              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════
              CARD 3: QUOTATIONS (Sticky top-28 on mobile)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-28 lg:static z-30 bg-white/95 dark:bg-[#161514] rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-amber-200/70 dark:border-zinc-800 shadow-xl shadow-amber-950/5 flex flex-col justify-between transition-transform duration-300">
            <div>
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-zinc-900 dark:text-white">
                  Quotations
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-5">
                Create beautiful quotations in just a few clicks.
              </p>

              {/* Quotation Item Cards */}
              <div className="space-y-3">
                
                {/* Quote 1: Rahul & Neha */}
                <div className="p-3.5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 tracking-wider">
                      #INV-1023
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                      Rahul &amp; Neha
                    </h4>
                    <p className="text-xs sm:text-sm font-black text-[#bf7304] dark:text-amber-400">
                      ₹1,80,000
                    </p>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      20 Dec 2024
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-14 rounded-xl bg-amber-100 border border-amber-200 overflow-hidden relative shrink-0 shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1519741497674-611481863552?w=120&auto=format&fit=crop&q=80"
                      alt="Wedding"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Quote 2: Aarav & Diya */}
                <div className="p-3.5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 tracking-wider">
                      #INV-1024
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                      Aarav &amp; Diya
                    </h4>
                    <p className="text-xs sm:text-sm font-black text-[#bf7304] dark:text-amber-400">
                      ₹2,40,000
                    </p>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      15 Jan 2025
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-14 rounded-xl bg-purple-100 border border-purple-200 overflow-hidden relative shrink-0 shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                      alt="Couple"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════
              CARD 4: CLIENTS (Sticky top-32 on mobile)
              ═══════════════════════════════════════════════════════════════ */}
          <div className="sticky top-32 lg:static z-40 bg-white/95 dark:bg-[#161514] rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border border-amber-200/70 dark:border-zinc-800 shadow-xl shadow-amber-950/5 flex flex-col justify-between transition-transform duration-300">
            <div>
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-zinc-900 dark:text-white">
                  Clients
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-5">
                Everything about your client in one workspace.
              </p>

              {/* Client Status Cards */}
              <div className="space-y-3">
                
                {/* Client 1: Rohan & Priya */}
                <div className="p-4 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                      alt="Client"
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                        Rohan &amp; Priya
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Udaipur · ₹1.8L
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full w-3/4 rounded-full" />
                  </div>

                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    3/4 Payments Done
                  </p>
                </div>

                {/* Client 2: Kabir & Simran */}
                <div className="p-4 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80"
                      alt="Client"
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                        Kabir &amp; Simran
                      </h4>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Goa · ₹3.2L
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full w-full rounded-full" />
                  </div>

                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All Payments Completed
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

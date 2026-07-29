'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Play, CheckCircle2, MessageSquare, 
  Database, Calendar, CheckSquare, FileText, Send, Zap, 
  TrendingUp, Users, Globe, HardDrive, RefreshCw
} from 'lucide-react';
import { Instagram } from './SocialIcons';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF8F5] to-[#F5EFE6]">
      
      {/* BACKGROUND DECORATIVE GLOW & GRID */}
      <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.15] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#D4AF37]/15 via-[#F4EFE6]/40 to-[#C5A059]/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* HERO BADGE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-[#1E1C1A]/80 border border-[#D4AF37]/30 shadow-[0_2px_10px_rgba(212,175,55,0.12)] backdrop-blur-md mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#D4AF37] animate-ping" />
          <Sparkles className="w-3.5 h-3.5 text-[#B89047]" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#B89047] dark:text-[#E6C665]">
            Built for Modern Wedding Studios
          </span>
        </motion.div>

        {/* HERO HEADLINE */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5] max-w-5xl mx-auto leading-[1.1] text-balance"
        >
          Run Your Entire Photography Business <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#1A1917] via-[#B89047] to-[#D4AF37] bg-clip-text text-transparent">
            From One Beautiful Workspace.
          </span>
        </motion.h1>

        {/* HERO SUB-TITLE / DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-[#5A554E] dark:text-[#C5C0B8] max-w-3xl mx-auto font-sans font-medium leading-relaxed"
        >
          StudioCore helps photographers manage leads, automate WhatsApp, integrate Meta Lead Ads, organize shoot teams, track post production, create luxury quotations and grow their revenue from one platform.
        </motion.p>

        {/* HERO ACTION BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
            className="w-full sm:w-auto px-8 py-4 text-sm font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-full transition-all shadow-[0_8px_30px_rgba(212,175,55,0.35)] hover:scale-105 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('book-demo') : window.location.href = '/book-demo'}
            className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-[#1A1917] dark:text-white bg-white/90 dark:bg-[#1E1C1A]/90 border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37] rounded-full transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-full bg-[#FAF8F5] dark:bg-[#2A2724] flex items-center justify-center text-[#B89047]">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <span>Book Live Demo</span>
          </button>
        </motion.div>

        {/* TRUST MICRO BADGES */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7A756E] font-medium"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            14-day full access
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#B89047]" />
            5-minute instant setup
          </span>
        </motion.div>

        {/* REALISTIC ANIMATED HERO DASHBOARD SHOWCASE */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 relative max-w-6xl mx-auto rounded-3xl p-3 bg-gradient-to-b from-[#EAE3D2]/80 via-white/40 to-[#D4AF37]/20 border border-[#EAE3D2] shadow-[0_30px_90px_rgba(212,175,55,0.12)] backdrop-blur-2xl"
        >
          {/* TOP BROWSER HEADER */}
          <div className="bg-[#FAF8F5] dark:bg-[#181614] rounded-t-2xl px-4 py-3 border-b border-[#EAE3D2] dark:border-[#2C2926] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="px-4 py-1 rounded-full bg-white dark:bg-[#25221F] border border-[#EAE3D2] dark:border-[#2C2926] text-[11px] font-semibold text-[#7A756E] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              studiocore.in/dashboard
            </div>
            <div className="flex items-center gap-2 text-xs text-[#B89047] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Live Studio OS
            </div>
          </div>

          {/* DASHBOARD INNER INTERFACE MOCKUP */}
          <div className="bg-white dark:bg-[#121110] rounded-b-2xl p-4 sm:p-6 text-left relative overflow-hidden">
            
            {/* GRID LAYOUT FOR DASHBOARD METRICS & CRM */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* LEFT STATS SUMMARY */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* LIVE REVENUE CARD */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-[#F4EFE6] dark:from-[#1C1A18] dark:to-[#221F1C] border border-[#EAE3D2] dark:border-[#2C2926] relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A756E]">Monthly Retainers</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black">+34% vs last month</span>
                  </div>
                  <div className="text-3xl font-black text-[#1A1917] dark:text-white mt-2 font-serif">
                    ₹18,50,000
                  </div>
                  <p className="text-[11px] text-[#7A756E] mt-1 font-medium">12 Destination Weddings Confirmed</p>
                </div>

                {/* WHATSAPP AUTOMATION NOTIFICATION */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 relative">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Baileys WhatsApp Automation — Active</span>
                  </div>
                  <div className="bg-white dark:bg-[#1A1816] p-3 rounded-xl border border-emerald-500/10 shadow-xs">
                    <div className="text-xs font-bold text-[#1A1917] dark:text-white">Sneha & Rahul Wedding</div>
                    <div className="text-[11px] text-[#7A756E] mt-0.5">Automated Brochure PDF & Rate Card sent ✓</div>
                    <div className="text-[9px] text-emerald-600 font-bold mt-1">Status: Client Opened PDF</div>
                  </div>
                </div>

                {/* META LEAD ADS LIVE FEED */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFFDF9] to-[#FAF8F5] border border-[#EAE3D2] dark:border-[#2C2926]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1A1917] dark:text-white mb-3">
                    <span className="flex items-center gap-1.5 text-[#B89047]">
                      <Instagram className="w-4 h-4" />
                      Meta Lead Form Webhook
                    </span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Realtime</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A18] border border-[#EAE3D2] text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold block text-[#1A1917] dark:text-white">Ananya & Vikram</span>
                        <span className="text-[10px] text-[#7A756E]">Udaipur • Budget ₹4.5L</span>
                      </div>
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-lg">New Lead</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* CENTER & RIGHT: REAL CRM TABLE PREVIEW */}
              <div className="lg:col-span-8 bg-[#FAF8F5]/80 dark:bg-[#181614]/80 rounded-2xl p-4 border border-[#EAE3D2] dark:border-[#2C2926] flex flex-col justify-between">
                
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2] dark:border-[#2C2926]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#1A1917] dark:text-white font-serif">Leads & Shoots Master Matrix</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#D4AF37]/10 text-[#B89047] rounded-md">14 Active Leads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-white border border-[#EAE3D2] rounded-lg text-[#5A554E]">Filter: All Stages</span>
                    </div>
                  </div>

                  {/* TABLE HEADER */}
                  <div className="grid grid-cols-12 text-[10px] font-extrabold uppercase tracking-wider text-[#7A756E] py-2.5 border-b border-[#EAE3D2] dark:border-[#2C2926]">
                    <div className="col-span-4">Client & Couple</div>
                    <div className="col-span-3">Event Date & City</div>
                    <div className="col-span-3">Stages</div>
                    <div className="col-span-2 text-right">Budget</div>
                  </div>

                  {/* MOCK ROWS */}
                  <div className="divide-y divide-[#EAE3D2]/60 dark:divide-[#2C2926]">
                    {[
                      { couple: 'Priya & Siddharth', city: 'Goa Destination', stage: 'Retainer Paid ✓', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', budget: '₹5,50,000' },
                      { couple: 'Meera & Rohan', city: 'Jaipur Palace', stage: 'Quotation Sent', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', budget: '₹4,00,000' },
                      { couple: 'Kavya & Arjun', city: 'Mumbai Reception', stage: 'Meeting Scheduled', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', budget: '₹3,20,000' },
                      { couple: 'Rhea & Varun', city: 'Mussoorie Hills', stage: 'Album Editing In Progress', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', budget: '₹6,00,000' },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-12 items-center text-xs py-3 hover:bg-white/60 dark:hover:bg-[#201D1A] transition-colors rounded-xl px-1">
                        <div className="col-span-4 font-bold text-[#1A1917] dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#B89047] flex items-center justify-center font-bold text-[10px]">
                            {row.couple[0]}
                          </div>
                          {row.couple}
                        </div>
                        <div className="col-span-3 text-[#5A554E] dark:text-[#C5C0B8] text-[11px]">{row.city}</div>
                        <div className="col-span-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.color}`}>
                            {row.stage}
                          </span>
                        </div>
                        <div className="col-span-2 text-right font-bold text-[#1A1917] dark:text-white">{row.budget}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM TASK & TEAM ASSIGNMENT MATRIX */}
                <div className="mt-4 pt-3 border-t border-[#EAE3D2] dark:border-[#2C2926] flex flex-wrap items-center justify-between text-xs text-[#7A756E]">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-[#B89047]" />
                    <span>Post-Production Task: <strong className="text-[#1A1917] dark:text-white">Color Grading - 80% Completed</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[#1A1917] dark:text-white">Team Allocated: 4 Shooters</span>
                  </div>
                </div>

              </div>

            </div>

            {/* FLOATING BADGES OVERLAY */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute top-8 right-8 hidden md:flex items-center gap-3 p-3 rounded-2xl bg-white/90 dark:bg-[#1A1816]/90 border border-[#D4AF37]/40 shadow-2xl backdrop-blur-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-[#1A1917] dark:text-white">3D PDF Quotation Generated</div>
                <div className="text-[10px] text-[#B89047] font-bold">Client Accepted Retainer — ₹1,00,000</div>
              </div>
            </motion.div>

          </div>

        </motion.div>

      </div>
    </section>
  );
}

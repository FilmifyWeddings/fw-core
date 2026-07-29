'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Play, Star, ChevronDown, Search, 
  Bell, CheckSquare, Calendar as CalendarIcon, Users, 
  TrendingUp, Clock, Check, ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import { 
  InstagramLogo, FacebookLogo, MetaLogo, WhatsAppLogo, 
  GoogleDriveLogo, GoogleSheetsLogo, GoogleCalendarLogo, 
  GmailLogo, AdobeLogo, DropboxLogo, GoogleLogo 
} from './BrandSvgs';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  const [waNotifyVisible, setWaNotifyVisible] = useState(true);
  const [payNotifyVisible, setPayNotifyVisible] = useState(true);

  // WhatsApp notification slide loop
  useEffect(() => {
    const timer = setInterval(() => {
      setWaNotifyVisible(prev => !prev);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Payment notification bounce loop
  useEffect(() => {
    const timer = setInterval(() => {
      setPayNotifyVisible(prev => !prev);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const floatingIcons = [
    { component: InstagramLogo, yOffset: -12, delay: 0 },
    { component: FacebookLogo, yOffset: 8, delay: 0.2 },
    { component: MetaLogo, yOffset: -15, delay: 0.4 },
    { component: WhatsAppLogo, yOffset: 10, delay: 0.1 },
    { component: GoogleDriveLogo, yOffset: -8, delay: 0.3 },
    { component: GoogleSheetsLogo, yOffset: 12, delay: 0.5 },
    { component: GoogleCalendarLogo, yOffset: -10, delay: 0.2 },
    { component: GmailLogo, yOffset: 6, delay: 0.4 },
  ];

  return (
    <section className="relative pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden bg-[#FAF8F5] dark:bg-[#0C0B0A] text-[#1A1917] dark:text-[#FAF8F5]">
      
      {/* SOFT WARM GOLDEN RADIAL BACKGROUND GLOW */}
      <div className="absolute top-1/3 right-1/4 w-[750px] h-[550px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/20 via-[#F4EFE6]/30 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FAF8F5] via-[#EAE3D2]/20 to-transparent blur-[100px] pointer-events-none rounded-full" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/85 dark:bg-[#0C0B0A]/85 backdrop-blur-xl border-b border-[#EAE3D2]/60 dark:border-[#2C2926] py-4 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* StudioCore LOGO */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate && onNavigate('home')}>
            <span className="text-2xl font-serif font-black tracking-tight text-[#1A1917] dark:text-white">
              Studio<span className="text-[#1A1917] dark:text-white">Core</span>
            </span>
          </div>

          {/* NAV LINKS */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#5A554E] dark:text-[#C5C0B8]">
            <button onClick={() => onNavigate && onNavigate('features')} className="hover:text-[#1A1917] dark:hover:text-white flex items-center gap-1 transition-colors">
              Features <ChevronDown className="w-3 h-3 text-[#7A756E]" />
            </button>
            <button onClick={() => onNavigate && onNavigate('integrations')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Integrations
            </button>
            <button onClick={() => onNavigate && onNavigate('pricing')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => onNavigate && onNavigate('documentation')} className="hover:text-[#1A1917] dark:hover:text-white flex items-center gap-1 transition-colors">
              Resources <ChevronDown className="w-3 h-3 text-[#7A756E]" />
            </button>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="text-xs font-bold text-[#5A554E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white transition-colors"
            >
              Login
            </button>
            <button 
              onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-full shadow-[0_4px_16px_rgba(212,175,55,0.3)] hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </nav>

      {/* MAIN CONTAINER (LEFT CONTENT + FLOATING ICONS + RIGHT DASHBOARD) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* ========================================================= */}
          {/* LEFT CONTENT COLUMN */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 text-left z-20 space-y-6">
            
            {/* BADGE */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#181614] border border-[#D4AF37]/40 shadow-[0_2px_8px_rgba(212,175,55,0.12)] text-[#B89047] text-[11px] font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B89047]" />
              <span>Built for Modern Wedding Studios</span>
            </motion.div>

            {/* HEADLINE */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[56px] font-serif font-black tracking-tight text-[#1A1917] dark:text-white leading-[1.08]"
            >
              Run Your Entire <br />
              Photography Business <br />
              From One Beautiful <br />
              <span className="text-[#C5A059]">Workspace.</span>
            </motion.h1>

            {/* DESCRIPTION */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs sm:text-sm text-[#5A554E] dark:text-[#C5C0B8] font-medium leading-relaxed max-w-md"
            >
              Manage leads, automate WhatsApp, integrate Meta Ads, assign teams, create quotations, track post production and grow your photography business — all from one intelligent platform.
            </motion.p>

            {/* BUTTONS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <button 
                onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
                className="px-6 py-3.5 text-xs font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-2xl shadow-[0_8px_25px_rgba(212,175,55,0.35)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button 
                onClick={() => onNavigate ? onNavigate('book-demo') : window.location.href = '/book-demo'}
                className="px-6 py-3.5 text-xs font-bold text-[#1A1917] dark:text-white bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37] rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded-full bg-[#1A1917] text-white flex items-center justify-center">
                  <Play className="w-2 h-2 fill-current ml-0.5" />
                </div>
                <span>Book Live Demo</span>
              </button>
            </motion.div>

            {/* CUSTOMERS & RATING */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-3 pt-4 border-t border-[#EAE3D2]/60 dark:border-[#2C2926]"
            >
              {/* Avatar Stack */}
              <div className="flex -space-x-2">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80',
                ].map((img, idx) => (
                  <img key={idx} src={img} alt="Studio Owner" className="w-7 h-7 rounded-full border-2 border-white dark:border-[#0C0B0A] object-cover" />
                ))}
              </div>

              <div>
                <div className="flex items-center gap-1 text-[#D4AF37] text-xs">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                  <span className="font-extrabold text-[#1A1917] dark:text-white text-[11px] ml-1">5.0</span>
                </div>
                <div className="text-[10px] text-[#7A756E] font-medium">
                  Trusted by modern wedding studios across India.
                </div>
              </div>
            </motion.div>

          </div>

          {/* ========================================================= */}
          {/* CENTER ARCH OF FLOATING INTEGRATION ICONS & SVG LINES */}
          {/* ========================================================= */}
          <div className="hidden lg:block lg:col-span-1 relative h-full min-h-[500px]">
            
            {/* GOLDEN SVG CONNECTING LINES ARC */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 100 500">
              <defs>
                <linearGradient id="goldStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#C5A059" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              
              {/* Curved bezier lines connecting from left icons column to central convergence point on right */}
              {[40, 95, 150, 205, 260, 315, 370, 425].map((y, i) => (
                <path
                  key={i}
                  d={`M 10 ${y} C 50 ${y}, 70 250, 95 250`}
                  fill="none"
                  stroke="url(#goldStrokeGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
              ))}
            </svg>

            {/* FLOATING ICON CARDS */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 z-20">
              {floatingIcons.map((item, idx) => {
                const IconComponent = item.component;
                return (
                  <motion.div
                    key={idx}
                    animate={{ y: [0, item.yOffset, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5 + idx * 0.3, ease: 'easeInOut', delay: item.delay }}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.div>
                );
              })}
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT OVERLAPPING DASHBOARD PREVIEW (REAL UI COMPONENTS) */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 relative z-10">
            
            {/* MAIN BACKDROP APP DASHBOARD WINDOW */}
            <div className="bg-white dark:bg-[#141210] rounded-3xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-[0_25px_70px_rgba(212,175,55,0.12)] p-4 sm:p-5 text-left relative overflow-hidden">
              
              <div className="flex gap-4">
                
                {/* INNER APP SIDEBAR */}
                <div className="w-36 shrink-0 hidden sm:flex flex-col justify-between border-r border-[#EAE3D2]/70 dark:border-[#2C2926] pr-3 py-1">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 px-2">
                      <div className="w-5 h-5 rounded-md bg-[#1A1917] text-white flex items-center justify-center font-serif font-black text-[10px]">S</div>
                      <span className="text-xs font-serif font-black text-[#1A1917] dark:text-white">StudioCore</span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { name: 'Dashboard', active: true },
                        { name: 'Leads', active: false },
                        { name: 'Projects', active: false },
                        { name: 'Tasks', active: false },
                        { name: 'Calendar', active: false },
                        { name: 'Clients', active: false },
                        { name: 'Finance', active: false },
                        { name: 'Reports', active: false },
                        { name: 'Settings', active: false },
                      ].map((m, i) => (
                        <div 
                          key={i} 
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 cursor-pointer ${
                            m.active 
                              ? 'bg-[#F4EFE6] text-[#B89047] font-extrabold' 
                              : 'text-[#7A756E] hover:text-[#1A1917]'
                          }`}
                        >
                          {m.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 space-y-4">
                  
                  {/* APP HEADER BAR */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D2]/70">
                    <h2 className="text-sm font-serif font-black text-[#1A1917] dark:text-white">Dashboard</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-24 h-6 rounded-lg bg-[#FAF8F5] border border-[#EAE3D2] px-2 flex items-center gap-1 text-[9px] text-[#7A756E]">
                        <Search className="w-2.5 h-2.5" />
                        <span>Search...</span>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#EAE3D2] flex items-center justify-center text-[#7A756E]">
                        <Bell className="w-3 h-3" />
                      </div>
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" className="w-6 h-6 rounded-full object-cover" />
                    </div>
                  </div>

                  {/* TOP THREE METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Revenue Overview */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926]">
                      <span className="text-[10px] font-bold text-[#7A756E] block">Revenue Overview</span>
                      <div className="text-base font-serif font-black text-[#1A1917] dark:text-white mt-0.5">
                        ₹18,75,000
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">+23.8% from last month</span>
                      
                      {/* Mini Line Chart SVG */}
                      <svg className="w-full h-6 mt-1" viewBox="0 0 100 30">
                        <path d="M0 25 Q 20 10, 40 20 T 80 5 T 100 15" fill="none" stroke="#D4AF37" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Leads Metric */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926]">
                      <span className="text-[10px] font-bold text-[#7A756E] block">Leads</span>
                      <div className="text-base font-serif font-black text-[#1A1917] dark:text-white mt-0.5">
                        215
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">+18.2% from last week</span>

                      {/* Mini Bar Chart */}
                      <div className="flex items-end gap-1 h-6 mt-1">
                        {[40, 65, 30, 85, 60, 95, 75].map((h, i) => (
                          <div key={i} className="flex-1 bg-[#D4AF37]/60 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>

                    {/* Upcoming Events */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] space-y-1">
                      <span className="text-[10px] font-bold text-[#7A756E] block">Upcoming Events</span>
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white truncate">
                        Rohit & Priya Wedding
                      </div>
                      <div className="text-[9px] text-[#7A756E]">May 24, 2025</div>
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white truncate pt-1 border-t border-[#EAE3D2]">
                        Ankit & Sneha Reception
                      </div>
                      <div className="text-[9px] text-[#7A756E]">May 26, 2025</div>
                    </div>

                  </div>

                  {/* BOTTOM TWO COLUMNS (TASKS & REVENUE ANALYTICS) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    
                    {/* Tasks Checklist */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#1A1917] dark:text-white">
                        <span>Tasks</span>
                      </div>
                      <div className="space-y-1.5 text-[9px]">
                        {[
                          { title: 'Pre-Wedding Shoot', couple: 'Rohit & Priya', status: 'In Progress', color: 'bg-amber-100 text-amber-700' },
                          { title: 'Album Design', couple: 'Ankit & Sneha', status: 'In Progress', color: 'bg-amber-100 text-amber-700' },
                          { title: 'Video Editing', couple: 'Rahul & Neha', status: 'Review', color: 'bg-blue-100 text-blue-700' },
                          { title: 'Client Meeting', couple: 'Vikram & Isha', status: 'Pending', color: 'bg-slate-100 text-slate-700' },
                        ].map((t, i) => (
                          <div key={i} className="flex items-center justify-between p-1 rounded-md bg-white dark:bg-[#201D1A]">
                            <div className="flex items-center gap-1.5">
                              <CheckSquare className="w-2.5 h-2.5 text-[#B89047]" />
                              <div>
                                <span className="font-bold block text-[#1A1917] dark:text-white">{t.title}</span>
                                <span className="text-[#7A756E]">{t.couple}</span>
                              </div>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${t.color}`}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Revenue Analytics Pie */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white">Revenue Analytics</div>
                      
                      <div className="flex items-center justify-between my-2">
                        <div>
                          <span className="text-[9px] text-[#7A756E] block">Total Revenue</span>
                          <span className="text-xs font-serif font-black text-[#1A1917] dark:text-white">₹18,75,000</span>
                          <span className="text-[8px] text-emerald-600 block">+23.8% from last month</span>
                        </div>

                        {/* Donut Chart SVG */}
                        <svg className="w-12 h-12" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EAE3D2" strokeWidth="4" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#D4AF37" strokeWidth="4" strokeDasharray="75, 100" />
                        </svg>
                      </div>

                      {/* Team Overview inline */}
                      <div className="pt-2 border-t border-[#EAE3D2] flex items-center justify-between text-[9px]">
                        <span className="font-bold text-[#7A756E]">Team Overview</span>
                        <div className="flex items-center gap-1 font-bold text-[#1A1917] dark:text-white">
                          <span>24 Members</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* ========================================================= */}
            {/* OVERLAPPING MIDDLE LAYER — LEAD PIPELINE CARD */}
            {/* ========================================================= */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute top-1/3 left-4 sm:-left-6 right-8 sm:right-auto sm:w-[480px] z-30 bg-white dark:bg-[#1A1816] rounded-2xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3 sm:p-4 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D2]">
                <span className="text-xs font-serif font-black text-[#1A1917] dark:text-white">Lead Pipeline</span>
                <span className="text-[10px] text-[#B89047] font-bold cursor-pointer">View All →</span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-3 text-center">
                {[
                  { stage: 'New Lead', count: '45' },
                  { stage: 'Contacted', count: '32' },
                  { stage: 'Meeting', count: '18' },
                  { stage: 'Proposal', count: '09' },
                  { stage: 'Closed', count: '52' },
                ].map((s, i) => (
                  <div key={i} className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE3D2] space-y-1">
                    <span className="text-[8px] font-bold text-[#7A756E] block truncate">{s.stage}</span>
                    <span className="text-xs font-serif font-black text-[#1A1917] dark:text-white block">{s.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ========================================================= */}
            {/* OVERLAPPING RIGHT LAYER — CALENDAR WIDGET */}
            {/* ========================================================= */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -top-4 -right-4 hidden lg:block w-56 z-30 bg-white dark:bg-[#1A1816] rounded-2xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-3 text-left space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-serif font-black text-[#1A1917] dark:text-white">
                <span>Calendar</span>
                <span className="text-[9px] font-sans font-bold text-[#7A756E] flex items-center gap-1">
                  ‹ May 2025 ›
                </span>
              </div>

              {/* DATES GRID */}
              <div className="grid grid-cols-7 gap-1 text-[8px] text-center font-bold text-[#7A756E] py-1 border-y border-[#EAE3D2]">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                {[...Array(31)].map((_, d) => (
                  <span 
                    key={d} 
                    className={`py-0.5 rounded-full ${d + 1 === 24 ? 'bg-[#D4AF37] text-white font-extrabold shadow-xs' : 'text-[#1A1917] dark:text-white'}`}
                  >
                    {d + 1}
                  </span>
                ))}
              </div>

              {/* AGENDA ITEMS */}
              <div className="space-y-1 pt-1 text-[8px]">
                <div className="p-1.5 rounded-md bg-[#FAF8F5] border-l-2 border-[#D4AF37]">
                  <span className="font-bold text-[#7A756E] block">7:00 AM Pre-Wedding Shoot</span>
                  <span className="font-bold text-[#1A1917] dark:text-white">Rohit & Priya</span>
                </div>
                <div className="p-1.5 rounded-md bg-[#FAF8F5] border-l-2 border-blue-500">
                  <span className="font-bold text-[#7A756E] block">11:00 AM Client Meeting</span>
                  <span className="font-bold text-[#1A1917] dark:text-white">Vikram & Isha</span>
                </div>
              </div>
            </motion.div>

            {/* ========================================================= */}
            {/* TOP RIGHT FLOATING WHATSAPP NOTIFICATION CARD */}
            {/* ========================================================= */}
            <AnimatePresence>
              {waNotifyVisible && (
                <motion.div
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="absolute -top-10 right-10 z-40 bg-white/95 dark:bg-[#1A1816]/95 border border-[#EAE3D2] dark:border-[#2C2926] shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xl max-w-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <WhatsAppLogo className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[11px] font-black text-[#1A1917] dark:text-white">New Lead Received</div>
                    <div className="text-[10px] text-[#5A554E] dark:text-[#C5C0B8] truncate">Rahul Sharma from Instagram</div>
                    <div className="text-[8px] text-[#7A756E] font-bold">2 min ago</div>
                  </div>
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" className="w-7 h-7 rounded-full object-cover shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* BOTTOM RIGHT FLOATING PAYMENT NOTIFICATION CARD */}
            {/* ========================================================= */}
            <AnimatePresence>
              {payNotifyVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.4 }}
                  className="absolute -bottom-6 right-6 z-40 bg-white/95 dark:bg-[#1A1816]/95 border border-[#D4AF37]/50 shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xl max-w-xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white flex items-center justify-center shrink-0 shadow-md font-serif font-black text-sm">
                    ₹
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[11px] font-black text-[#1A1917] dark:text-white">Payment Received</div>
                    <div className="text-[11px] font-black text-[#B89047]">₹1,25,000 <span className="text-[9px] font-normal text-[#7A756E]">from Rohit & Priya</span></div>
                    <div className="text-[8px] text-[#7A756E] font-bold">5 min ago</div>
                  </div>
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" className="w-7 h-7 rounded-full object-cover shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* ========================================================= */}
        {/* BOTTOM MARQUEE TRUST BAR */}
        {/* ========================================================= */}
        <div className="mt-16 pt-8 border-t border-[#EAE3D2] dark:border-[#2C2926]">
          <div className="bg-white/80 dark:bg-[#181614]/80 rounded-2xl border border-[#EAE3D2] dark:border-[#2C2926] p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="text-xs font-serif font-black text-[#1A1917] dark:text-white text-center md:text-left shrink-0">
              Trusted by <br className="hidden md:inline" />
              <span className="text-[#B89047]">Professional Wedding Studios</span>
            </div>

            <div className="flex-1 flex items-center justify-around gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <MetaLogo className="w-5 h-5" />
                <span>Meta</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <GoogleLogo className="w-5 h-5" />
                <span>Google</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <WhatsAppLogo className="w-5 h-5" />
                <span>WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <InstagramLogo className="w-5 h-5" />
                <span>Instagram</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <AdobeLogo className="w-5 h-5" />
                <span>Adobe</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#1A1917] dark:text-white">
                <DropboxLogo className="w-5 h-5" />
                <span>Dropbox</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

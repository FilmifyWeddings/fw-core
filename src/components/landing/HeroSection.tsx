'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Play, Star, ChevronDown, Search, 
  Bell, CheckSquare, Calendar as CalendarIcon, Users, 
  TrendingUp, Clock, Check, ChevronLeft, ChevronRight, Plus, MessageSquare
} from 'lucide-react';
import { 
  InstagramLogo, FacebookLogo, MetaLogo, WhatsAppLogo, 
  GoogleDriveLogo, GoogleSheetsLogo, GoogleCalendarLogo, 
  GmailLogo 
} from './BrandSvgs';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  const [scrolled, setScrolled] = useState(false);
  const [waNotifyVisible, setWaNotifyVisible] = useState(true);
  const [payNotifyVisible, setPayNotifyVisible] = useState(true);

  // Scroll handler for navbar size transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    { component: InstagramLogo, yOffset: -10, rotate: 2, delay: 0 },
    { component: FacebookLogo, yOffset: 10, rotate: -2, delay: 0.2 },
    { component: MetaLogo, yOffset: -12, rotate: 2, delay: 0.4 },
    { component: WhatsAppLogo, yOffset: 8, rotate: -2, delay: 0.1 },
    { component: GoogleDriveLogo, yOffset: -8, rotate: 2, delay: 0.3 },
    { component: GoogleSheetsLogo, yOffset: 12, rotate: -2, delay: 0.5 },
    { component: GoogleCalendarLogo, yOffset: -10, rotate: 2, delay: 0.2 },
    { component: GmailLogo, yOffset: 6, rotate: -2, delay: 0.4 },
  ];

  return (
    <section className="relative pt-32 pb-24 md:pt-36 md:pb-28 overflow-hidden bg-[#FAF8F5] dark:bg-[#0C0B0A] text-[#1A1917] dark:text-[#FAF8F5]">
      
      {/* SOFT WARM GOLDEN RADIAL BACKGROUND GLOW & NOISE */}
      <div className="absolute top-1/4 right-1/4 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/18 via-[#F4EFE6]/35 to-transparent blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[350px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FAF8F5] via-[#EAE3D2]/30 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* ========================================================= */}
      {/* FLOATING GLASSMORPHISM NAVBAR (TOP CENTER PILL) */}
      {/* ========================================================= */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-full max-w-5xl px-4">
        <div 
          className={`mx-auto rounded-full bg-white/75 dark:bg-[#121110]/75 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[0_10px_30px_rgba(212,175,55,0.08)] flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'py-2 px-6 shadow-xl scale-[0.98]' : 'py-3 px-8'
          }`}
        >
          {/* TEXT-ONLY BRAND LOGO (NO ICON) */}
          <div 
            className="flex items-baseline gap-0.5 cursor-pointer select-none" 
            onClick={() => onNavigate ? onNavigate('home') : window.location.href = '/'}
          >
            <span className="text-xl font-black tracking-tight text-[#1A1917] dark:text-white">Studio</span>
            <span className="text-xl font-serif font-light text-[#C5A059] tracking-normal">Core</span>
          </div>

          {/* NAV LINKS */}
          <div className="hidden md:flex items-center gap-7 text-xs font-bold text-[#5A554E] dark:text-[#C5C0B8]">
            <button onClick={() => onNavigate && onNavigate('features')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Features
            </button>
            <button onClick={() => onNavigate && onNavigate('features')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Solutions
            </button>
            <button onClick={() => onNavigate && onNavigate('integrations')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Integrations
            </button>
            <button onClick={() => onNavigate && onNavigate('pricing')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={() => onNavigate && onNavigate('documentation')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Resources
            </button>
            <button onClick={() => onNavigate && onNavigate('blog')} className="hover:text-[#1A1917] dark:hover:text-white transition-colors">
              Blog
            </button>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate ? onNavigate('book-demo') : window.location.href = '/book-demo'}
              className="text-xs font-bold text-[#5A554E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white transition-colors hidden sm:block"
            >
              Book Demo
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        
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

            {/* HEADLINE (ANIMATED FADE UP + BLUR REVEAL) */}
            <div className="space-y-1">
              <motion.h1 
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-[52px] font-serif font-black tracking-tight text-[#1A1917] dark:text-white leading-[1.08]"
              >
                Everything Your Photography
              </motion.h1>
              <motion.h1 
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-[52px] font-serif font-black tracking-tight text-[#1A1917] dark:text-white leading-[1.08]"
              >
                Business Needs.
              </motion.h1>
              <motion.h1 
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-4xl sm:text-5xl lg:text-[52px] font-serif font-light text-[#C5A059] leading-[1.08]"
              >
                One Beautiful Platform.
              </motion.h1>
            </div>

            {/* DESCRIPTION (LINEAR-STYLE TYPOGRAPHY) */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xs sm:text-sm text-[#5A554E] dark:text-[#C5C0B8] font-medium leading-relaxed max-w-md"
            >
              Streamline leads, automate WhatsApp communication, manage shoots, track post-production edits, and scale your studio revenue from one intelligent operating system.
            </motion.p>

            {/* BUTTONS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {/* PRIMARY GOLD BUTTON WITH MAGNETIC HOVER & GLOW */}
              <button 
                onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
                className="px-6 py-3.5 text-xs font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-2xl shadow-[0_8px_25px_rgba(212,175,55,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* SECONDARY WHITE GLASS BUTTON */}
              <button 
                onClick={() => onNavigate ? onNavigate('book-demo') : window.location.href = '/book-demo'}
                className="px-6 py-3.5 text-xs font-bold text-[#1A1917] dark:text-white bg-white/90 dark:bg-[#181614]/90 border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37] rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2"
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
              transition={{ duration: 0.6, delay: 0.6 }}
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
            
            {/* GOLDEN SVG CONNECTING LINES ARC WITH ANIMATED STROKE */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 100 500">
              <defs>
                <linearGradient id="goldStrokeGradRef" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#C5A059" stopOpacity="0.25" />
                </linearGradient>
              </defs>
              
              {/* Curved bezier lines connecting from left icons column to central convergence point on right */}
              {[40, 95, 150, 205, 260, 315, 370, 425].map((y, i) => (
                <path
                  key={i}
                  d={`M 10 ${y} C 50 ${y}, 70 250, 95 250`}
                  fill="none"
                  stroke="url(#goldStrokeGradRef)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
              ))}
            </svg>

            {/* FLOATING ICON CARDS (OFFICIAL BRAND ASSETS) */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 z-20">
              {floatingIcons.map((item, idx) => {
                const IconComponent = item.component;
                return (
                  <motion.div
                    key={idx}
                    animate={{ y: [0, item.yOffset, 0], rotate: [0, item.rotate, 0] }}
                    transition={{ repeat: Infinity, duration: 3.8 + idx * 0.25, ease: 'easeInOut', delay: item.delay }}
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
            
            {/* MAIN DASHBOARD CONTAINER MATCHING REFERENCE 2 */}
            <div className="bg-white dark:bg-[#141210] rounded-3xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-[0_25px_70px_rgba(212,175,55,0.12)] p-4 sm:p-5 text-left relative overflow-hidden">
              
              <div className="flex gap-4">
                
                {/* INNER APP SIDEBAR */}
                <div className="w-32 shrink-0 hidden sm:flex flex-col justify-between border-r border-[#EAE3D2]/70 dark:border-[#2C2926] pr-2 py-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 px-2">
                      <div className="w-5 h-5 rounded-md bg-[#1A1917] text-white flex items-center justify-center font-serif font-black text-[10px]">S</div>
                      <span className="text-xs font-serif font-black text-[#1A1917] dark:text-white">StudioCore</span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { name: 'CRM Pipeline', active: true },
                        { name: 'Meta Integration', active: false },
                        { name: 'Quotation Builder', active: false },
                        { name: 'Task Manager', active: false },
                        { name: 'Team Overview', active: false },
                        { name: 'Calendar', active: false },
                      ].map((m, i) => (
                        <div 
                          key={i} 
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-between cursor-pointer ${
                            m.active 
                              ? 'bg-[#F4EFE6] text-[#B89047] font-extrabold' 
                              : 'text-[#7A756E] hover:text-[#1A1917]'
                          }`}
                        >
                          <span>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MAIN CONTENT GRID AREA */}
                <div className="flex-1 space-y-3">
                  
                  {/* TOP ROW: CRM PIPELINE & LEAD MANAGEMENT & WHATSAPP AUTOMATION */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* CRM PIPELINE CARD */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#1A1917] dark:text-white">
                        <span>CRM Pipeline</span>
                      </div>
                      <div className="space-y-1 text-[8px]">
                        <div className="p-1 rounded bg-amber-100 text-amber-800 font-bold flex justify-between">
                          <span>Client Pipeline</span>
                          <span>Score: 98/100</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-[#EAE3D2] flex justify-between text-[#7A756E]">
                          <span>Pre-Wedding</span>
                          <span>Sneha & Rahul</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-[#EAE3D2] flex justify-between text-[#7A756E]">
                          <span>Destination</span>
                          <span>Siddharth</span>
                        </div>
                      </div>
                    </div>

                    {/* LEAD MANAGEMENT CARD */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#1A1917] dark:text-white">
                        <span>Lead Management</span>
                      </div>
                      <div className="space-y-1 text-[8px]">
                        <div className="flex justify-between items-center p-1 rounded bg-white border border-[#EAE3D2]">
                          <span>Pipeline</span>
                          <span className="px-1 bg-emerald-100 text-emerald-700 font-bold rounded">Unassigned</span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded bg-white border border-[#EAE3D2]">
                          <span>Geo-location</span>
                          <span className="px-1 bg-amber-100 text-amber-700 font-bold rounded">Fast Action</span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded bg-white border border-[#EAE3D2]">
                          <span>Meta Ads</span>
                          <span className="px-1 bg-blue-100 text-blue-700 font-bold rounded">Syncing...</span>
                        </div>
                      </div>
                    </div>

                    {/* WHATSAPP AUTOMATION CARD */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <WhatsAppLogo className="w-3 h-3" />
                        <span>WhatsApp Automation</span>
                      </div>
                      <div className="p-1.5 rounded-md bg-white border border-emerald-500/15 text-[8px] space-y-0.5">
                        <div className="font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Message Sent Successfully
                        </div>
                        <div className="text-[#7A756E]">"Brochure PDF & Rate Card sent to client."</div>
                      </div>
                    </div>

                  </div>

                  {/* MIDDLE ROW: META INTEGRATION & TEAM MANAGEMENT & TASK MANAGER */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* META INTEGRATION CARD */}
                    <div className="p-3 rounded-xl bg-[#FFFDF9] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-2">
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white flex items-center justify-between">
                        <span>Meta Integration</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 py-1">
                        <MetaLogo className="w-6 h-6" />
                        <span className="text-xs font-bold text-[#B89047]">⇄</span>
                        <div className="w-6 h-6 rounded-md bg-[#1A1917] text-white flex items-center justify-center font-bold text-[9px]">S</div>
                      </div>
                    </div>

                    {/* TEAM MANAGEMENT CARD */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white">Team Management</div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-1.5">
                          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" className="w-5 h-5 rounded-full object-cover border border-white" />
                          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" className="w-5 h-5 rounded-full object-cover border border-white" />
                          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" className="w-5 h-5 rounded-full object-cover border border-white" />
                          <div className="w-5 h-5 rounded-full bg-[#EAE3D2] text-[8px] font-bold flex items-center justify-center">+12</div>
                        </div>
                        <span className="text-[9px] font-bold text-[#7A756E]">Task Manager</span>
                      </div>
                    </div>

                    {/* TASK MANAGER CHECKLIST */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white">Task Manager</div>
                      <div className="space-y-1 text-[8px]">
                        <div className="flex items-center justify-between">
                          <span>Task progress</span>
                          <span className="font-bold text-amber-600">80%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#D4AF37] h-full w-4/5" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* BOTTOM ROW: QUOTATION BUILDER & REVENUE ANALYTICS & CALENDAR */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* QUOTATION BUILDER */}
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                      <div className="text-[10px] font-bold text-[#B89047]">Quotation Builder</div>
                      <div className="text-[9px] text-[#5A554E]">3D Proposal PDF Generated</div>
                      <div className="p-1 rounded bg-emerald-100 text-emerald-700 font-bold text-[8px] flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        ₹1,25,000 Payment Received
                      </div>
                    </div>

                    {/* REVENUE ANALYTICS WAVE */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-1">
                      <div className="text-[10px] font-bold text-[#1A1917] dark:text-white">Revenue Analytics</div>
                      <div className="text-xs font-serif font-black text-[#1A1917] dark:text-white">₹18,75,000</div>
                      <svg className="w-full h-5 mt-1" viewBox="0 0 100 25">
                        <path d="M0 20 Q 25 5, 50 15 T 100 5" fill="none" stroke="#D4AF37" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* CALENDAR MINI WIDGET */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1A18] border border-[#EAE3D2] space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-[#1A1917] dark:text-white">
                        <span>Calendar</span>
                        <span className="text-[8px] text-[#7A756E]">‹ May 2025 ›</span>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 text-[7px] text-center font-bold text-[#7A756E]">
                        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                        {[...Array(14)].map((_, d) => (
                          <span key={d} className={`py-0.5 rounded ${d === 6 ? 'bg-[#D4AF37] text-white font-extrabold' : ''}`}>{d + 15}</span>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

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
                  className="absolute -top-8 right-8 z-40 bg-white/95 dark:bg-[#1A1816]/95 border border-[#EAE3D2] dark:border-[#2C2926] shadow-2xl rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xl max-w-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white flex items-center justify-center shrink-0 shadow-md font-serif font-black text-xs">
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

      </div>
    </section>
  );
}

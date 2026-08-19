'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Users, FileText, Calendar, Users2, Film, IndianRupee, 
  Clock, Layers, BarChart3, Settings, Headphones, ArrowRight, 
  Sparkles, Plus, CheckCircle2, ChevronDown, LayoutGrid, List,
  Shield, Zap, FolderCheck, HeartHandshake, Eye, TrendingUp,
  CreditCard, UserPlus, FilePlus, CalendarPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  CrmDecoration, ClientsDecoration, QuotationsDecoration, 
  BookingsDecoration, TeamDecoration, PostProdDecoration, 
  FinanceDecoration, AttendanceDecoration, IntegrationsDecoration, 
  ReportsDecoration, SettingsDecoration, SupportDecoration 
} from '@/components/workspace/ModuleDecorations';

interface WorkspaceModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  badgeBg: string;
  badgeText: string;
  decoration: React.FC<{ className?: string }>;
}

const MODULES_LIST: WorkspaceModule[] = [
  {
    id: 'leads',
    title: 'Leads & CRM',
    description: 'Capture, qualify and manage leads from Meta Ads, WhatsApp, Website & more.',
    href: '/leads',
    icon: Target,
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    decoration: CrmDecoration,
  },
  {
    id: 'clients',
    title: 'Clients Directory',
    description: 'Centralized client roster with contact info, package details and billing records.',
    href: '/workspace/clients',
    icon: Users,
    badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    decoration: ClientsDecoration,
  },
  {
    id: 'quotations',
    title: 'Quotations',
    description: 'Create stunning quotations and convert leads faster with smart follow-ups.',
    href: '/quotations',
    icon: FileText,
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    badgeText: 'text-amber-800 dark:text-amber-300',
    decoration: QuotationsDecoration,
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'Manage bookings, events, calendars and schedules. Never miss a booking.',
    href: '/team-manager',
    icon: Calendar,
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    decoration: BookingsDecoration,
  },
  {
    id: 'team-manager',
    title: 'Team Manager',
    description: 'Assign tasks, manage your team and track performance with ease.',
    href: '/team-manager',
    icon: Users2,
    badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    decoration: TeamDecoration,
  },
  {
    id: 'post-production',
    title: 'Post-Production',
    description: 'Track projects, deliverables, edits, approvals and client feedback.',
    href: '/workspace/post-production',
    icon: Film,
    badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    decoration: PostProdDecoration,
  },
  {
    id: 'finance',
    title: 'Finance & Payments',
    description: 'Invoices, payments, expenses, payouts, profit & loss and tax summary.',
    href: '/workspace/finance',
    icon: IndianRupee,
    badgeBg: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
    badgeText: 'text-amber-900 dark:text-amber-200',
    decoration: FinanceDecoration,
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'GPS based attendance, leaves, overtime, shifts and team productivity.',
    href: '/workspace/attendance',
    icon: Clock,
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    decoration: AttendanceDecoration,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect WhatsApp, Email, Google Calendar, Drive and 50+ tools.',
    href: '/workspace/integrations',
    icon: Layers,
    badgeBg: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    decoration: IntegrationsDecoration,
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Powerful insights and reports to grow your photography business.',
    href: '/workspace/finance',
    icon: BarChart3,
    badgeBg: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    decoration: ReportsDecoration,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Manage studio profile, roles, permissions, preferences and configurations.',
    href: '/workspace/settings',
    icon: Settings,
    badgeBg: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
    badgeText: 'text-zinc-700 dark:text-zinc-300',
    decoration: SettingsDecoration,
  },
  {
    id: 'support',
    title: 'Help & Support',
    description: 'Get help, watch tutorials and connect with our support team.',
    href: '/support',
    icon: Headphones,
    badgeBg: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-300',
    decoration: SupportDecoration,
  }
];

export default function WorkspaceHubPage() {
  const [userName, setUserName] = useState<string>('Sushant');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    leadsCount: 128,
    bookingsCount: 42,
    revenue: '₹48,60,000',
    pendingPayments: '₹6,45,000'
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, workspace_name')
            .eq('id', session.user.id)
            .maybeSingle();

          const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          if (name) {
            setUserName(name.split(' ')[0]);
          }

          // Fetch real counts from DB
          const { count: realLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true });

          const { data: quotes } = await supabase
            .from('quotations')
            .select('total_amount, status');

          if (realLeads && realLeads > 0) {
            setStats(prev => ({
              ...prev,
              leadsCount: realLeads,
              bookingsCount: Math.max(1, Math.round(realLeads * 0.35))
            }));
          }

          if (quotes && quotes.length > 0) {
            const tot = quotes.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
            if (tot > 0) {
              setStats(prev => ({
                ...prev,
                revenue: `₹${tot.toLocaleString('en-IN')}`
              }));
            }
          }
        }
      } catch (e) {
        console.error('Error fetching dashboard statistics:', e);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-zinc-900 font-sans selection:bg-amber-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1440px] mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO WELCOME SECTION WITH 3D CHARACTER & STATS
      ───────────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-gradient-to-br from-[#FAF8F5] via-[#F6F2EC] to-[#EFE8DC] border border-[#E8E2D6] rounded-[28px] p-6 sm:p-8 lg:p-10 shadow-xs overflow-visible"
      >
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-orange-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Column: Welcome & Value Proposition */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-amber-200/60 shadow-2xs text-xs font-bold text-zinc-800">
              <span>Welcome back, {userName}!</span>
              <span className="text-sm">👋</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-zinc-900 leading-[1.12]">
              Focus on Your Craft, <br />
              <span className="text-[#B88746] font-serif italic font-normal text-4xl sm:text-5xl lg:text-[52px]">
                We Manage the Rest.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md font-medium">
              Manage leads, clients, bookings, payments, teams and post-production — all from one beautiful dashboard.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCreateMenuOpen(prev => !prev)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9822B] to-[#C2721C] hover:brightness-105 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Create New</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${createMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Create Dropdown Menu */}
                <AnimatePresence>
                  {createMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-200/80 p-1.5 z-50 space-y-0.5"
                    >
                      <Link
                        href="/leads"
                        onClick={() => setCreateMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-amber-50 hover:text-amber-900 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>New Lead</span>
                      </Link>
                      <Link
                        href="/quotations"
                        onClick={() => setCreateMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-amber-50 hover:text-amber-900 transition"
                      >
                        <FilePlus className="w-3.5 h-3.5 text-amber-600" />
                        <span>New Quotation</span>
                      </Link>
                      <Link
                        href="/workspace/clients"
                        onClick={() => setCreateMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-amber-50 hover:text-amber-900 transition"
                      >
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>New Client</span>
                      </Link>
                      <Link
                        href="/team-manager"
                        onClick={() => setCreateMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-amber-50 hover:text-amber-900 transition"
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                        <span>New Booking</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/team-manager"
                className="px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white text-zinc-800 font-extrabold text-xs border border-zinc-200/80 shadow-2xs hover:shadow-xs active:scale-98 transition flex items-center gap-2"
              >
                <span>View My Tasks</span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-black">
                  8
                </span>
              </Link>
            </div>
          </div>

          {/* Center Column: 3D Photographer Character (Integrated & Naturally Overlapping) */}
          <div className="lg:col-span-3 flex items-center justify-center relative min-h-[260px] lg:min-h-[300px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative w-full max-w-[280px] lg:max-w-[320px] flex items-center justify-center"
            >
              <img
                src="/assets/characters/photographer-hero.png"
                alt="StudioCore Master Photographer"
                className="w-full h-auto max-h-[340px] lg:max-h-[380px] object-contain drop-shadow-2xl z-20 transition-transform duration-500 hover:scale-105"
              />
            </motion.div>
          </div>

          {/* Right Column: Floating Statistics Panel */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <div className="bg-white/90 backdrop-blur-md rounded-[24px] p-5 sm:p-6 border border-white shadow-xl shadow-zinc-900/5 w-full max-w-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* 1. New Leads */}
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-zinc-200/60 space-y-1.5 group hover:border-emerald-500/30 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500">New Leads</span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                    {stats.leadsCount}
                  </div>
                  <div className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>18% this week</span>
                  </div>
                </div>

                {/* 2. Bookings */}
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-zinc-200/60 space-y-1.5 group hover:border-purple-500/30 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500">Bookings</span>
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                    {stats.bookingsCount}
                  </div>
                  <div className="text-[10px] font-extrabold text-purple-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>12% this week</span>
                  </div>
                </div>

                {/* 3. Revenue */}
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-zinc-200/60 space-y-1.5 group hover:border-amber-500/30 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500">Revenue</span>
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <IndianRupee className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight truncate">
                    {stats.revenue}
                  </div>
                  <div className="text-[10px] font-extrabold text-amber-700 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>22% this month</span>
                  </div>
                </div>

                {/* 4. Pending Payments */}
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-zinc-200/60 space-y-1.5 group hover:border-rose-500/30 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500">Pending</span>
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight truncate">
                    {stats.pendingPayments}
                  </div>
                  <Link 
                    href="/workspace/finance"
                    className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>

              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. "ALL MODULES" SECTION (GRID & LIST VIEW)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
            All Modules
          </h2>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-200/70 border border-zinc-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* Module Cards Grid */}
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
            : "grid grid-cols-1 gap-3"
        }>
          {MODULES_LIST.map((mod, idx) => {
            const Icon = mod.icon;
            const Decoration = mod.decoration;

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
              >
                <Link
                  href={mod.href}
                  className="group block relative bg-gradient-to-br from-white via-white/95 to-[#FAF8F5] border border-zinc-200/80 hover:border-amber-500/40 rounded-[22px] p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full"
                >
                  {/* Subtle Vector Decoration in Bottom-Right Corner */}
                  <div className="absolute -bottom-4 -right-4 pointer-events-none opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500">
                    <Decoration className="w-28 h-28" />
                  </div>

                  <div className="relative z-10 space-y-3">
                    {/* Top Icon Badge */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform ${mod.badgeBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 group-hover:text-amber-800 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1 line-clamp-2">
                        {mod.description}
                      </p>
                    </div>

                    {/* Action Arrow */}
                    <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-zinc-700 group-hover:text-amber-600 transition-colors">
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. "TAKE YOUR STUDIO TO THE NEXT LEVEL" BOTTOM LUXURY BANNER
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative bg-gradient-to-r from-[#0C101A] via-[#101524] to-[#171D30] rounded-[28px] p-6 sm:p-8 lg:p-10 text-white shadow-2xl overflow-hidden border border-zinc-800"
      >
        {/* Subtle Ambient Glows */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left: Headline & Explore Button */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
              Take Your Studio to the Next Level
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Powerful tools. Smart automation. Real growth.
            </p>
            <Link
              href="/workspace/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9822B] to-[#C2721C] hover:brightness-105 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-98 transition"
            >
              <span>Explore Features</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Center: 4 Value Highlights */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                <Clock className="w-4 h-4" />
                <span>Save Time</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Automate repetitive tasks</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-blue-400 font-black text-xs">
                <FolderCheck className="w-4 h-4" />
                <span>Stay Organized</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Everything in one place</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                <Zap className="w-4 h-4" />
                <span>Grow Faster</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Focus on what you love</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs">
                <HeartHandshake className="w-4 h-4" />
                <span>Be Stress-Free</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">We handle the rest</p>
            </div>
          </div>

          {/* Right: Photographer Character Holding Camera */}
          <div className="lg:col-span-3 flex justify-center lg:justify-end">
            <img
              src="/assets/characters/photographer-banner.png"
              alt="StudioCore Pro"
              className="w-44 sm:w-52 h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>

        </div>
      </motion.div>

    </div>
  );
}

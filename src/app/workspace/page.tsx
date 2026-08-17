'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Database, Users, FileText, Calendar, Film, DollarSign, 
  Clock, Plug, Settings, HelpCircle, ArrowRight, Sparkles, 
  CheckCircle2, Layers, ShieldCheck
} from 'lucide-react';

const WORKSPACE_MODULES = [
  {
    id: 'leads',
    title: 'Leads & CRM Automation',
    subtitle: 'Meta Ads & WhatsApp Ingestion',
    description: 'Capture, qualify, and score incoming bridal leads with instant WhatsApp welcome messages and stage pipeline management.',
    href: '/leads',
    icon: Database,
    accentGradient: 'from-emerald-500 to-teal-600',
    badge: 'CRM Pipeline',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shadowGlow: 'hover:shadow-emerald-500/15',
  },
  {
    id: 'clients',
    title: 'Clients Directory',
    subtitle: 'Booked Wedding Couples',
    description: 'Centralized client roster with event dates, contact information, package details, deliverables, and billing records.',
    href: '/workspace/clients',
    icon: Users,
    accentGradient: 'from-indigo-500 to-purple-600',
    badge: 'Directory',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    shadowGlow: 'hover:shadow-indigo-500/15',
  },
  {
    id: 'quotations',
    title: 'Quotations & Proposals',
    subtitle: 'Interactive Canva-style Canvas',
    description: 'Generate luxury magazine-style wedding quotation PDFs and interactive web links with real-time pricing breakdown.',
    href: '/quotations',
    icon: FileText,
    accentGradient: 'from-amber-400 to-yellow-600',
    badge: 'Proposals',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    shadowGlow: 'hover:shadow-amber-500/15',
  },
  {
    id: 'team-manager',
    title: 'Team Manager & Crew',
    subtitle: 'Roster & Event Assignments',
    description: 'Assign photographers, cinematographers, drone operators, and editors to upcoming wedding functions and events.',
    href: '/team-manager',
    icon: Calendar,
    accentGradient: 'from-violet-500 to-purple-700',
    badge: 'Operations',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    shadowGlow: 'hover:shadow-violet-500/15',
  },
  {
    id: 'post-production',
    title: 'Post-Production Tracking',
    subtitle: 'Deliverables Engine & Editing',
    description: 'Track photos, cinematic teasers, traditional full films, and luxury print albums with deadline countdowns and Google Drive links.',
    href: '/workspace/post-production',
    icon: Film,
    accentGradient: 'from-pink-500 to-rose-600',
    badge: 'Deliverables',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    shadowGlow: 'hover:shadow-rose-500/15',
  },
  {
    id: 'finance',
    title: 'Finance & Payments',
    subtitle: 'Milestones, Invoicing & P&L',
    description: 'Quotation-synced payment milestones, client receipts, team payouts, operational expenses, and profit margin analysis.',
    href: '/workspace/finance',
    icon: DollarSign,
    accentGradient: 'from-amber-500 to-yellow-600',
    badge: 'Accounting',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    shadowGlow: 'hover:shadow-amber-500/15',
  },
  {
    id: 'attendance',
    title: 'Workforce Attendance',
    subtitle: 'Mobile Selfie & GPS Geofencing',
    description: 'Live selfie clock-in, studio and venue GPS geofence boundaries, break tracking, automatic overtime calculation, and leave management.',
    href: '/workspace/attendance',
    icon: Clock,
    accentGradient: 'from-emerald-500 to-teal-600',
    badge: 'Workforce',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shadowGlow: 'hover:shadow-emerald-500/15',
  },
  {
    id: 'integrations',
    title: 'Integrations & Automations',
    subtitle: 'Meta Ads, WhatsApp & Webhooks',
    description: 'Connect WhatsApp Cloud API, Facebook Lead Ads, Google Contacts, Google Sheets, and webhook triggers with automated syncing.',
    href: '/workspace/integrations',
    icon: Plug,
    accentGradient: 'from-blue-500 to-cyan-600',
    badge: 'Connectivity',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    shadowGlow: 'hover:shadow-blue-500/15',
  },
  {
    id: 'settings',
    title: 'Studio Settings & Branding',
    subtitle: 'Profile, Rates & Watermarks',
    description: 'Manage studio profile, primary branding, default tax rates, terms of service, custom domain, and billing subscriptions.',
    href: '/workspace/settings',
    icon: Settings,
    accentGradient: 'from-slate-600 to-zinc-800',
    badge: 'Configuration',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    shadowGlow: 'hover:shadow-slate-500/15',
  },
  {
    id: 'support',
    title: 'Help Center & Onboarding',
    subtitle: 'Tutorials & VIP WhatsApp Support',
    description: 'Master StudioCore workflows with step-by-step video guides, documentation, FAQs, and direct 24/7 VIP engineer assistance.',
    href: '/support',
    icon: HelpCircle,
    accentGradient: 'from-rose-500 to-orange-500',
    badge: 'Assistance',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    shadowGlow: 'hover:shadow-rose-500/15',
  }
];

export default function WorkspaceHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 p-4 sm:p-6 lg:p-10 font-sans selection:bg-amber-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ─────────────────────────────────────────────────────────────
            HERO HEADER WITH BRAND IDENTITY
        ───────────────────────────────────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                StudioCore Production Suite
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                10 Integrated Modules
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Studio Operations Command Center
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              Manage your entire photography business — from Meta ad lead generation to bespoke quotations, crew assignments, post-production deliverables, milestone billing, and workforce attendance.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/40 p-2 shadow-lg shadow-black/10 flex items-center justify-center">
              <img
                src="/StudioCorelogo1.png"
                alt="StudioCore"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
            10-MODULE GRID IN EXACT REQUESTED SEQUENCE
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WORKSPACE_MODULES.map((mod, index) => {
            const Icon = mod.icon;

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
              >
                <Link
                  href={mod.href}
                  className="block h-full group focus:outline-none"
                >
                  <div
                    className={`h-full bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/80 hover:shadow-xl ${mod.shadowGlow} flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-4">
                      {/* Top Header with 3D Gradient Icon & Badge */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.accentGradient} flex items-center justify-center text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform duration-300`}
                        >
                          <Icon className="w-6 h-6 stroke-[2.2]" />
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${mod.badgeColor}`}>
                          {mod.badge}
                        </span>
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1">
                          {mod.title}
                        </h3>
                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">
                          {mod.subtitle}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    {/* Bottom CTA Arrow */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-700 group-hover:text-amber-800 transition-colors">
                      <span>Open Application</span>
                      <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-amber-100 flex items-center justify-center text-slate-400 group-hover:text-amber-900 transition-colors">
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

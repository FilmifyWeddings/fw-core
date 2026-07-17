'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, FileText, Database, Sparkles } from 'lucide-react';
import { SUITE_REGISTRY, type SuiteAppConfig } from '@/types';

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  FileText,
  Database,
};

const SUITE_ACCENT_MAP: Record<string, { bg: string; border: string; text: string; glow: string; iconBg: string }> = {
  'team-manager': {
    bg: 'bg-white',
    border: 'border-zinc-200',
    text: 'text-zinc-900',
    glow: 'hover:shadow-[0_20px_40px_rgba(139,92,246,0.08)]',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
  },
  'quotations': {
    bg: 'bg-white',
    border: 'border-zinc-200',
    text: 'text-zinc-900',
    glow: 'hover:shadow-[0_20px_40px_rgba(212,175,55,0.08)]',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
  },
  'leads': {
    bg: 'bg-white',
    border: 'border-zinc-200',
    text: 'text-zinc-900',
    glow: 'hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)]',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
  },
};

function SuiteCard({ app, index }: { app: SuiteAppConfig; index: number }) {
  const Icon = ICON_MAP[app.icon] || FileText;
  const styles = SUITE_ACCENT_MAP[app.slug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={app.href} className="block group">
        <div
          className={`relative bg-white border ${styles.border} rounded-[24px] p-6 transition-all duration-500 ease-out hover:border-zinc-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(108,92,231,0.04),0_1px_3px_rgba(108,92,231,0.02)] cursor-pointer overflow-hidden`}
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}
        >
          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-start gap-4">
            {/* 3D Glassmorphism Icon */}
            <div
              className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center shadow-lg shadow-black/5 group-hover:scale-105 transition-transform duration-300`}
            >
              <Icon className="w-5.5 h-5.5 text-white" strokeWidth={1.8} />
            </div>

            {/* Content */}
            <div className="w-full">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-[#0B111E] tracking-tight">
                  {app.title}
                </h3>
              </div>
              <p className="text-[11px] text-[#4F5E74] leading-relaxed">
                {app.description}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LaunchpadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-zinc-900">
      {/* Top navigation bar */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-orange-500/15">
              FW
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#0B111E]">FW Studio Suite</span>
              <span className="text-[10px] text-zinc-400 font-medium ml-2 hidden sm:inline">studio.fwstudioflow.in</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Main launchpad content */}
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Application Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0B111E] mb-2">
            Welcome to your studio workspace
          </h1>
          <p className="text-sm text-zinc-500 max-w-lg leading-relaxed">
            Select a product application to begin. Each tool is an independent module with its own context, navigation, and workspace.
          </p>
        </motion.div>

        {/* Suite App Launcher Grid - 3-column side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUITE_REGISTRY.apps.map((app, index) => (
            <SuiteCard key={app.slug} app={app} index={index} />
          ))}
        </div>

        {/* Footer hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-[11px] text-zinc-400 font-medium">
            3 applications available &middot; Click any tile to enter the workspace
          </p>
        </motion.div>
      </main>
    </div>
  );
}

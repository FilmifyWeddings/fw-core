'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Flame, Send, CheckCircle2 } from 'lucide-react';
import { DashboardStats } from '@/types';

interface AnalyticsCardsProps {
  stats: DashboardStats;
}

export function AnalyticsCards({ stats }: AnalyticsCardsProps) {
  const cardData = [
    {
      title: 'Total Ingested Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'from-zinc-500/10 to-slate-500/5 border-zinc-200 dark:border-zinc-800/60',
      glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_0_20px_-3px_rgba(120,120,120,0.15)]',
      desc: 'All Meta Ads & direct entries',
      iconColor: 'text-zinc-650 dark:text-zinc-300',
    },
    {
      title: 'High-Value Leads',
      value: stats.highValueLeads,
      icon: Flame,
      color: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 dark:border-orange-500/20',
      glow: 'shadow-[0_4px_20px_rgba(249,115,22,0.06)] dark:shadow-[0_0_25px_-5px_rgba(249,115,22,0.2)]',
      desc: 'Budget > 1.5 Lakhs or Premium Venue',
      iconColor: 'text-amber-500 dark:text-orange-400',
    },
    {
      title: 'WhatsApp Delivery Rate',
      value: `${stats.deliveryRate}%`,
      icon: CheckCircle2,
      color: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 dark:border-emerald-500/20',
      glow: 'shadow-[0_4px_20px_rgba(16,185,129,0.06)] dark:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]',
      desc: `${stats.totalMessagesSent} sent / ${stats.totalMessagesFailed} failed`,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      title: 'Pending Queue Drips',
      value: stats.totalMessagesPending,
      icon: Send,
      color: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 dark:border-blue-500/20',
      glow: 'shadow-[0_4px_20px_rgba(59,130,246,0.06)] dark:shadow-[0_0_25px_-5px_rgba(59,130,246,0.15)]',
      desc: 'Scheduled (Timestamp-matched)',
      iconColor: 'text-blue-500 dark:text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cardData.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className={`relative p-5 rounded-2xl border bg-white dark:bg-zinc-950/40 bg-gradient-to-br ${card.color} ${card.glow} backdrop-blur-md overflow-hidden transition-all duration-200`}
          >
            {/* Soft Ambient Glow inside card */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-zinc-200/10 dark:bg-white/2 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{card.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/85 ${card.iconColor}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400/80 mt-4 flex items-center gap-1.5 font-sans font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-450 dark:bg-zinc-500 animate-pulse" />
              {card.desc}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

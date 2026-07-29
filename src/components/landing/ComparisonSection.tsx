'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export function ComparisonSection() {
  const comparisons = [
    {
      feature: 'App Subscriptions & Workflow',
      without: 'Uses 10+ disconnected apps (Excel, WhatsApp Web, Drive, Gmail, Docs)',
      with: '100% All-in-one studio operating system on single dashboard'
    },
    {
      feature: 'Meta & Instagram Lead Sync',
      without: 'Manual lead export from Facebook Lead Center; 4-hour delay',
      with: 'Instant 1-second webhook sync directly into CRM matrix'
    },
    {
      feature: 'Client Communication & Drips',
      without: 'Manual copy-pasting WhatsApp messages & PDF rate cards',
      with: 'Automated WhatsApp welcome drips & proposal tracking'
    },
    {
      feature: 'Quotation & Retainer Billing',
      without: 'Scattered Google Docs/PDFs with zero payment reminders',
      with: 'Luxury 3D proposals with instant retainer payment logging'
    },
    {
      feature: 'Post-Production & Edits',
      without: 'Editors work without timeline tracking; delayed album deliveries',
      with: 'Live post-production pipeline (Selection → Grading → Album → Gallery)'
    },
    {
      feature: 'Team & Shooter Dispatch',
      without: 'WhatsApp group confusion for photographer & editor assignments',
      with: 'Centralized team allocations, owner tagging, and schedule matrix'
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] border-y border-[#EAE3D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          The Studio Upgrade Matrix
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Why Premier Studios Switch to <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            StudioCore.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          See how StudioCore replaces messy manual work with an automated high-margin photography workspace.
        </p>

        {/* COMPARISON TABLE */}
        <div className="mt-16 max-w-5xl mx-auto rounded-3xl overflow-hidden border border-[#EAE3D2] dark:border-[#2C2926] shadow-xl bg-white dark:bg-[#141210] text-left">
          
          {/* TABLE HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-12 bg-[#FAF8F5] dark:bg-[#1C1A18] border-b border-[#EAE3D2] p-6 text-sm font-extrabold uppercase tracking-wider">
            <div className="md:col-span-4 text-[#7A756E]">Workflow Feature</div>
            <div className="md:col-span-4 text-rose-600 flex items-center gap-2 mt-2 md:mt-0">
              <XCircle className="w-4 h-4" />
              Without StudioCore
            </div>
            <div className="md:col-span-4 text-[#B89047] flex items-center gap-2 mt-2 md:mt-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              With StudioCore OS
            </div>
          </div>

          {/* TABLE ROWS */}
          <div className="divide-y divide-[#EAE3D2]/70 dark:divide-[#2C2926]">
            {comparisons.map((row, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="grid grid-cols-1 md:grid-cols-12 p-6 items-center hover:bg-[#FAF8F5]/50 transition-colors"
              >
                <div className="md:col-span-4 font-bold text-[#1A1917] dark:text-white text-sm font-serif mb-2 md:mb-0">
                  {row.feature}
                </div>

                <div className="md:col-span-4 text-xs text-[#5A554E] dark:text-[#C5C0B8] flex items-start gap-2 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 mb-2 md:mb-0">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{row.without}</span>
                </div>

                <div className="md:col-span-4 text-xs text-[#1A1917] dark:text-white font-semibold flex items-start gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{row.with}</span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}

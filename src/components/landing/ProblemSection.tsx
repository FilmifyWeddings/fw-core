'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, HardDrive, 
  FileSpreadsheet, Mail, Phone, AlertTriangle, XCircle, Clock
} from 'lucide-react';
import { Instagram, Facebook } from './SocialIcons';

export function ProblemSection() {
  const apps = [
    { name: 'Instagram DM', icon: Instagram, color: 'text-pink-500 bg-pink-50 border-pink-200' },
    { name: 'Facebook Ads', icon: Facebook, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { name: 'Meta Lead Ads', icon: Facebook, color: 'text-[#B89047] bg-amber-50 border-amber-200' },
    { name: 'WhatsApp Web', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { name: 'Google Drive', icon: HardDrive, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { name: 'Excel Sheets', icon: FileSpreadsheet, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { name: 'Gmail Inbox', icon: Mail, color: 'text-red-500 bg-red-50 border-red-200' },
    { name: 'Phone Calls', icon: Phone, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#FFFDF9] dark:bg-[#0C0B0A] relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-black uppercase tracking-widest mb-6">
          <AlertTriangle className="w-3.5 h-3.5" />
          The Disconnected Workflow Problem
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Too Many Apps. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-rose-500 via-amber-600 to-rose-700 bg-clip-text text-transparent">
            Too Much Chaos.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          Wedding photography studios waste 20+ hours a week juggling disconnected tools, losing high-budget leads, and missing shoot deadlines.
        </p>

        {/* DISCONNECTED APPS CHAOS VISUAL */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto relative">
          
          {/* BACKGROUND WARNING RED LINES */}
          <div className="absolute inset-0 border border-dashed border-rose-300/40 rounded-3xl pointer-events-none" />

          {apps.map((app, idx) => {
            const IconComponent = app.icon;
            return (
              <motion.div
                key={idx}
                animate={{ y: [0, idx % 2 === 0 ? -6 : 6, 0] }}
                transition={{ repeat: Infinity, duration: 3 + (idx % 3), ease: 'easeInOut' }}
                className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#181614] ${app.color} transition-all hover:scale-105`}
              >
                <div className="p-3 rounded-xl bg-white dark:bg-[#201D1A] shadow-xs">
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="text-xs font-extrabold text-[#1A1917] dark:text-white">
                  {app.name}
                </span>
                <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Disconnected
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* CHAOS WARNING STATS */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          
          <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
              <Clock className="w-4 h-4" />
              Delayed Response Time
            </div>
            <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] mt-2 leading-relaxed">
              Leads take 4+ hours to answer because Instagram & WhatsApp DMs are scattered across devices.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              Scattered Quotations
            </div>
            <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] mt-2 leading-relaxed">
              Quotations created manually on Google Docs or PDFs with zero tracking on client opens or payment status.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
              <XCircle className="w-4 h-4" />
              No Post-Production Tracking
            </div>
            <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] mt-2 leading-relaxed">
              Editors and album designers work without automated timelines, leading to client complaints.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}

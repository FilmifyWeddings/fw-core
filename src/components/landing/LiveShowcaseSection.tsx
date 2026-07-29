'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, MessageSquare, Layers, Users, TrendingUp, 
  CheckSquare, FileText, Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';

export function LiveShowcaseSection() {
  const [activeTab, setActiveTab] = useState('crm');

  const tabs = [
    { id: 'crm', label: 'CRM Matrix', icon: Database },
    { id: 'whatsapp', label: 'WhatsApp Drips', icon: MessageSquare },
    { id: 'meta', label: 'Meta Webhooks', icon: Layers },
    { id: 'team', label: 'Team Allocations', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue Matrix', icon: TrendingUp },
    { id: 'task', label: 'Task Board', icon: CheckSquare },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'crm':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Lead Flow Master Database</h3>
                <p className="text-xs text-[#7A756E]">Interactive custom columns, standard filtering & Lead Insider drawer</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-bold text-xs">Live Sync</span>
            </div>
            <div className="bg-[#FAF8F5] dark:bg-[#181614] rounded-2xl p-4 border border-[#EAE3D2] space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-[#1A1917] dark:text-white border-b border-[#EAE3D2] pb-2">
                <span>Couple Name</span>
                <span>Location</span>
                <span>Stage</span>
                <span>Budget</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#EAE3D2]/50">
                <span className="font-semibold text-[#1A1917] dark:text-white">Pooja & Rahul</span>
                <span className="text-[#5A554E]">Udaipur Palace</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[10px]">Retainer Paid</span>
                <span className="font-bold">₹5,00,000</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-[#1A1917] dark:text-white">Neha & Kabir</span>
                <span className="text-[#5A554E]">Goa Beach Resort</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold text-[10px]">Quotation Sent</span>
                <span className="font-bold">₹3,80,000</span>
              </div>
            </div>
          </div>
        );
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Baileys WhatsApp Automation Engine</h3>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-3">
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Auto Welcome & Brochure Drip</span>
                <span>Delivered ✓</span>
              </div>
              <p className="text-[#5A554E]">"Hello Siddharth! Thank you for contacting StudioCore Weddings. Here is our 2026 Rate Card PDF."</p>
              <div className="text-[10px] text-emerald-600 font-bold bg-white p-2 rounded-lg border border-emerald-500/10">
                Triggered automatically 2 seconds after Instagram lead form submission.
              </div>
            </div>
          </div>
        );
      case 'meta':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Meta Lead Form Webhook Collector</h3>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-xs space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span>Facebook Lead Ads Campaign</span>
                <span className="text-emerald-600 font-bold">Connected Realtime</span>
              </div>
              <p className="text-[#7A756E]">Zero-delay webhook ingestion with auto-mapping for Bride Name, Groom Name, Event Date & City.</p>
            </div>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Team Allocations & Lead Owners</h3>
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#EAE3D2] text-xs space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span>Lead Owner Assigned</span>
                <span className="text-[#B89047]">Chad Thunderclock (Lead Manager)</span>
              </div>
              <div className="text-[#5A554E]">Shooters Allocated: 2 Photographers, 1 Cinematographer, 1 Drone Pilot.</div>
            </div>
          </div>
        );
      case 'analytics':
      case 'revenue':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Revenue & Conversion Matrix</h3>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-[#F4EFE6] border border-[#EAE3D2] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#1A1917]">Total Monthly Retainer Revenue</span>
                <span className="text-2xl font-serif font-black text-[#B89047]">₹24,80,000</span>
              </div>
              <div className="text-[11px] text-[#7A756E]">Lead Conversion Rate: 34.2% (+8.4% this month)</div>
            </div>
          </div>
        );
      case 'task':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917] dark:text-white font-serif">Post-Production Edit Task Board</h3>
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span>Selection & Color Grading</span>
                <span className="text-amber-600 font-bold">80% In Progress</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-[#D4AF37] h-full w-4/5" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="py-24 md:py-32 bg-[#FFFDF9] dark:bg-[#0C0B0A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive Product Showcase
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Experience the Studio OS <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            In Realtime.
          </span>
        </h2>

        {/* INTERACTIVE TABS BAR */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {tabs.map((t) => {
            const IconComp = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-[#181614] text-[#5A554E] dark:text-[#C5C0B8] border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37]'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* SHOWCASE DISPLAY CONTAINER */}
        <div className="mt-10 max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] dark:from-[#141210] dark:to-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] shadow-2xl text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

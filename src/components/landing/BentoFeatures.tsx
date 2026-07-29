'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Layers, MessageSquare, Camera, CheckSquare, 
  Users, FileText, TrendingUp, Sparkles, ArrowRight, CheckCircle2, Shield
} from 'lucide-react';

export function BentoFeatures() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      id: 'crm',
      title: 'Intelligent CRM & Lead Management',
      badge: 'Core Engine',
      desc: 'Capture, categorize, score, and track wedding leads across all pipeline stages with standard and custom metadata columns.',
      icon: Database,
      span: 'lg:col-span-8',
      preview: (
        <div className="bg-[#FAF8F5] dark:bg-[#1C1A18] rounded-xl p-4 border border-[#EAE3D2] dark:border-[#2C2926] text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D2]">
            <span className="font-bold text-[#1A1917] dark:text-white">Active Lead: Priyanka & Kabir</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Retainer Paid ₹1,50,000</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-[#5A554E]">
            <div><strong>Location:</strong> Udaipur</div>
            <div><strong>Event Date:</strong> 12 Dec 2026</div>
            <div><strong>Lead Score:</strong> 98/100 (Hot)</div>
          </div>
        </div>
      )
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Drip & Baileys Automation',
      badge: 'Automation',
      desc: 'Send instant PDF brochures, payment receipts, and automated followup drips directly from your official WhatsApp number.',
      icon: MessageSquare,
      span: 'lg:col-span-4',
      preview: (
        <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 text-xs">
          <div className="font-bold text-emerald-700 dark:text-emerald-400">Automated WhatsApp Message</div>
          <p className="text-[11px] text-[#5A554E] mt-1">"Hi Ananya! Thanks for inquiring. Here is our 2026 Wedding Portfolio & Rate Card."</p>
        </div>
      )
    },
    {
      id: 'meta',
      title: 'Meta Lead Ads & Webhook Sync',
      badge: 'Realtime Sync',
      desc: 'Direct integration with Facebook Lead Forms & Instagram Ads. Zero lead drop with 1-second instant CRM entry.',
      icon: Layers,
      span: 'lg:col-span-4',
      preview: (
        <div className="bg-[#FFFDF9] dark:bg-[#1A1816] p-3 rounded-xl border border-[#EAE3D2] text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#B89047]">Meta Webhook Connected</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Active</span>
          </div>
          <p className="text-[10px] text-[#7A756E] mt-1">Synced 420+ leads from IG Story Lead Forms</p>
        </div>
      )
    },
    {
      id: 'postprod',
      title: 'Post-Production & Edit Tracker',
      badge: 'Workflow OS',
      desc: 'Track photo selections, RAW backups, Lightroom color grading, teaser cuts, and physical album printing deadlines.',
      icon: Camera,
      span: 'lg:col-span-4',
      preview: (
        <div className="bg-[#FAF8F5] dark:bg-[#1A1816] p-3 rounded-xl border border-[#EAE3D2] text-xs space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span>RAW Backup & Selection</span>
            <span className="text-emerald-600 font-bold">Done ✓</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#D4AF37] w-4/5" />
          </div>
        </div>
      )
    },
    {
      id: 'quotations',
      title: 'Luxury 3D PDF Proposal & Quotation Builder',
      badge: 'Revenue Builder',
      desc: 'Generate interactive PDF proposals with breakdown of photography, cinematography, drone footage, and retainer payment schedules.',
      icon: FileText,
      span: 'lg:col-span-4',
      preview: (
        <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 text-xs">
          <div className="font-bold text-[#B89047]">Quotation #QT-8890</div>
          <div className="text-[11px] text-[#5A554E] mt-0.5">3-Day Destination Package — ₹6,50,000</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Status: Approved by Couple</div>
        </div>
      )
    },
    {
      id: 'tasks',
      title: 'Task Management & Shoot Allocation',
      badge: 'Team Dispatch',
      desc: 'Assign lead photographers, drone operators, sound engineers, and video editors with automated schedule reminders.',
      icon: CheckSquare,
      span: 'lg:col-span-6',
      preview: (
        <div className="bg-[#FAF8F5] dark:bg-[#1A1816] p-3 rounded-xl border border-[#EAE3D2] text-xs flex items-center justify-between">
          <div>
            <div className="font-bold text-[#1A1917] dark:text-white">Udaipur Sangeet & Wedding</div>
            <div className="text-[10px] text-[#7A756E]">4 Shooters Assigned • Gear Checklist Approved</div>
          </div>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 font-bold text-[10px] rounded-md">Assigned</span>
        </div>
      )
    },
    {
      id: 'revenue',
      title: 'Financial Matrix & Retainer Analytics',
      badge: 'Analytics',
      desc: 'Track monthly recurring revenue, pending retainers, shooter payouts, and profit margins with live dynamic charts.',
      icon: TrendingUp,
      span: 'lg:col-span-6',
      preview: (
        <div className="bg-[#FFFDF9] dark:bg-[#1A1816] p-3 rounded-xl border border-[#EAE3D2] text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#1A1917] dark:text-white">Total Revenue YTD</span>
            <span className="text-emerald-600 font-bold">₹1,24,50,000</span>
          </div>
          <div className="text-[10px] text-[#7A756E] mt-1">Average Deal Value: ₹4,20,000</div>
        </div>
      )
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#FFFDF9] dark:bg-[#0C0B0A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Complete Studio Feature Architecture
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Everything Your Studio Needs. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            Built Into One OS.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          Purpose-built tools designed around the real operational workflow of wedding photographers, cinematographers, and luxury studios.
        </p>

        {/* BENTO GRID */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {features.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={`${item.span} p-8 rounded-3xl bg-gradient-to-br from-[#FAF8F5] via-[#FFFDF9] to-[#F5EFE6] dark:from-[#141210] dark:to-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] shadow-xs hover:border-[#D4AF37] transition-all hover:shadow-xl flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A059] to-[#9A7B32] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white dark:bg-[#25221F] border border-[#EAE3D2] text-[11px] font-bold text-[#B89047] uppercase tracking-wider">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1917] dark:text-white font-serif mb-2">
                    {item.title}
                  </h3>

                  <p className="text-sm text-[#5A554E] dark:text-[#C5C0B8] font-medium leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>

                {/* MINI PREVIEW WIDGET */}
                <div className="mt-auto pt-4 border-t border-[#EAE3D2]/60 dark:border-[#2C2926]">
                  {item.preview}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Database, ArrowRight, CheckCircle2, Zap, MessageSquare, 
  Layers, Users, FileText, Camera, TrendingUp, Send
} from 'lucide-react';

export function SolutionSection() {
  const steps = [
    { title: 'Meta Lead Ingestion', desc: 'FB & IG Ads sync instantly', icon: Layers },
    { title: 'CRM Auto-Entry', desc: 'Lead tagged & score calculated', icon: Database },
    { title: 'WhatsApp Drip', desc: 'Brochure PDF sent automatically', icon: MessageSquare },
    { title: 'Task Assignment', desc: 'Lead owner & shooter allocated', icon: Users },
    { title: 'Quotation Builder', desc: 'Luxury PDF proposal generated', icon: FileText },
    { title: 'Post Production', desc: 'Selection, grading & album edit', icon: Camera },
    { title: 'Retainer Revenue', desc: 'Payment tracked in realtime', icon: TrendingUp },
    { title: 'Final Delivery', desc: 'Drive & gallery link delivered', icon: Send },
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] relative overflow-hidden border-y border-[#EAE3D2]">
      
      {/* GLOW DECORATION */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#D4AF37]/20 to-[#C5A059]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Zap className="w-3.5 h-3.5" />
          The StudioCore Solution
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          StudioCore Appears. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            Everything Connects.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          One unified operating system that turns incoming wedding leads into confirmed bookings, automated followups, and smooth gallery deliveries.
        </p>

        {/* CONNECTED PIPELINE ANIMATION */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm hover:border-[#D4AF37] transition-all hover:scale-105 text-left relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white flex items-center justify-center shadow-md">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-[#B89047] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md">
                    Step 0{idx + 1}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#1A1917] dark:text-white font-serif">
                  {step.title}
                </h3>

                <p className="text-xs text-[#7A756E] dark:text-[#A09A90] mt-1 font-medium">
                  {step.desc}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Automated Pipeline Sync
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Database, MessageSquare, Users, FileText, 
  Clock, Camera, Send, CheckCircle2, ArrowDown
} from 'lucide-react';

export function AutomationSection() {
  const steps = [
    { title: '1. Lead Arrives', desc: 'Meta Lead Form or Instagram DM inquiry', icon: Zap, time: 'Instant' },
    { title: '2. Auto CRM Entry', desc: 'Tagged with Event Date, City & Lead Score', icon: Database, time: '+1 Sec' },
    { title: '3. Auto WhatsApp Drip', desc: 'Welcome Brochure PDF & Rate Card sent', icon: MessageSquare, time: '+2 Sec' },
    { title: '4. Task & Owner Assigned', desc: 'Studio Manager & Lead Shooter allocated', icon: Users, time: '+1 Min' },
    { title: '5. 3D Quotation Sent', desc: 'Custom package proposal link sent to client', icon: FileText, time: '+5 Min' },
    { title: '6. Payment Reminder', desc: 'Automated deposit alert & retainer receipt', icon: Clock, time: '+24 Hrs' },
    { title: '7. Project & Edit Tracking', desc: 'Selection, grading, teaser & album cut', icon: Camera, time: 'Post Shoot' },
    { title: '8. Final Delivery', desc: 'High-res gallery link delivered on WhatsApp', icon: Send, time: 'Complete' },
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] border-y border-[#EAE3D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Zap className="w-3.5 h-3.5" />
          End-to-End Automation Blueprint
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Your Studio on Autopilot <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            From Lead to Delivery.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          Zero manual data entry. Zero missed inquiries. StudioCore runs your client pipeline 24 hours a day.
        </p>

        {/* STEP TIMELINE GRID */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left max-w-6xl mx-auto">
          {steps.map((step, idx) => {
            const IconComp = step.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm relative group hover:border-[#D4AF37] transition-all hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#B89047] flex items-center justify-center font-bold">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                    {step.time}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#1A1917] dark:text-white font-serif mb-1">
                  {step.title}
                </h3>

                <p className="text-xs text-[#7A756E] dark:text-[#A09A90] font-medium leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Camera, MessageSquare, TrendingUp, Users } from 'lucide-react';

export function StatsSection() {
  const stats = [
    { value: '50,000+', label: 'Projects Managed', icon: Camera, desc: 'Destination & Luxury Weddings' },
    { value: '2.5M+', label: 'Messages Automated', icon: MessageSquare, desc: 'WhatsApp & Email Drips' },
    { value: '₹150Cr+', label: 'Revenue Tracked', icon: TrendingUp, desc: 'Retainer & Package Billing' },
    { value: '1,200+', label: 'Luxury Studios', icon: Award, desc: 'Pan-India & International' },
  ];

  return (
    <section className="py-20 bg-[#FAF8F5] dark:bg-[#100F0E] border-y border-[#EAE3D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((st, i) => {
            const IconComponent = st.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#B89047] flex items-center justify-center mx-auto mb-3">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-serif font-black text-[#1A1917] dark:text-white bg-gradient-to-r from-[#1A1917] via-[#B89047] to-[#D4AF37] bg-clip-text text-transparent">
                  {st.value}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#B89047] mt-1">
                  {st.label}
                </div>
                <div className="text-[10px] text-[#7A756E] mt-0.5">
                  {st.desc}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

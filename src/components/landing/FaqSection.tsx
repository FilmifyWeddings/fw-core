'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Meta Lead Ads integration work with StudioCore?',
      a: 'StudioCore connects directly to Facebook & Instagram Lead Forms via official webhook APIs. When a potential bride or groom submits a form on Instagram, the lead is captured into StudioCore CRM in under 1 second without any manual CSV exports.'
    },
    {
      q: 'Can I send automated WhatsApp messages from my studio number?',
      a: 'Yes! StudioCore includes built-in WhatsApp automation powered by Baileys protocol. You can configure automated welcome brochures, package rate cards, shoot reminders, and payment receipts directly from your official studio mobile number.'
    },
    {
      q: 'Can I add custom metadata columns like Groom Name, Bride Name, Event Venue & Budget?',
      a: 'Absolutely. StudioCore features a dynamic Columns Engine that lets you add, toggle, or uncheck standard and custom fields (Groom Name, Bride Name, Event Date, Location, Budget, Venue Details) with full state persistence.'
    },
    {
      q: 'How does team assignment and post-production tracking work?',
      a: 'You can assign lead owners, photographers, cinematographers, and editors to any shoot project. The system tracks post-production milestones (RAW Backup, Selection, Color Grading, Album Design, Video Rendering) with real-time status badges.'
    },
    {
      q: 'Is my studio data and client contact details safe?',
      a: 'StudioCore uses enterprise-grade Supabase infrastructure with SSL encryption and Row-Level Security (RLS). Your leads and financial data are strictly private and never shared.'
    },
    {
      q: 'Can I test StudioCore before committing to a plan?',
      a: 'Yes! We offer a 14-day full access free trial with zero credit card required. You can set up your studio workspace and test all features in under 5 minutes.'
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-[#FFFDF9] dark:bg-[#0C0B0A] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <HelpCircle className="w-3.5 h-3.5" />
          Frequently Asked Questions
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-5xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Got Questions? <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            We've Got Answers.
          </span>
        </h2>

        {/* ACCORDION */}
        <div className="mt-16 space-y-4 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#FAF8F5] dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left font-serif font-bold text-base text-[#1A1917] dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#B89047] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-6 text-sm text-[#5A554E] dark:text-[#C5C0B8] font-sans leading-relaxed border-t border-[#EAE3D2]/50 dark:border-[#2C2926] pt-4"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

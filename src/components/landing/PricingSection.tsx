'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface PricingSectionProps {
  onNavigate?: (page: string) => void;
}

export function PricingSection({ onNavigate }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: 'Starter',
      desc: 'Ideal for solo wedding photographers & boutique creators.',
      priceMonthly: '₹1,999',
      priceYearly: '₹1,499',
      period: '/month',
      highlight: false,
      features: [
        'Up to 150 Active Leads / Month',
        'Meta Lead Ads Webhook Sync',
        'Baileys WhatsApp Automation (1 Number)',
        'Basic Lead Flow CRM & Filtering',
        'PDF Quotation Generator',
        'Single User Access',
      ]
    },
    {
      name: 'Professional',
      desc: 'Designed for growing wedding studios & multi-shooter teams.',
      priceMonthly: '₹4,499',
      priceYearly: '₹3,499',
      period: '/month',
      highlight: true,
      badge: 'MOST POPULAR FOR STUDIOS',
      features: [
        'Unlimited Active Leads & Contacts',
        'Realtime Meta & IG Lead Form Ingestion',
        'WhatsApp Welcome Drips & Payment Reminders',
        'Lead Insider Drawer & Kundali Details',
        'Custom Metadata Columns & Layout Engine',
        'Post-Production & Album Edit Tracker',
        'Up to 5 Team Members & Shooter Allocations',
        'Revenue Analytics & Retainer Tracker',
        'Priority 24/7 WhatsApp Support',
      ]
    },
    {
      name: 'Enterprise',
      desc: 'For multi-city luxury studios, agencies & large production chains.',
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      period: '',
      highlight: false,
      features: [
        'Everything in Professional Plan',
        'Unlimited Team Members & Role Access',
        'Multi-Office & Multi-Brand Support',
        'Custom Webhooks & API Integration',
        'Dedicated Studio Account Manager',
        'Custom Contract & SLA Guarantees',
      ]
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] relative border-y border-[#EAE3D2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Transparent Investment Plans
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Simple, Fair Pricing. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            Built to Scale Your Studio.
          </span>
        </h2>

        <p className="mt-6 text-lg text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto font-medium">
          Start with a 14-day free trial. No credit card required. Upgrade as your studio grows.
        </p>

        {/* MONTHLY / YEARLY TOGGLE */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className={`text-xs font-bold ${!isYearly ? 'text-[#1A1917] dark:text-white' : 'text-[#7A756E]'}`}>
            Monthly Billing
          </span>

          <button
            onClick={() => setIsYearly(!isYearly)}
            className="w-14 h-8 rounded-full bg-[#EAE3D2] dark:bg-[#2C2926] p-1 relative transition-colors cursor-pointer"
          >
            <motion.div
              animate={{ x: isYearly ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-6 h-6 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C5A059] shadow-md"
            />
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isYearly ? 'text-[#1A1917] dark:text-white' : 'text-[#7A756E]'}`}>
              Yearly Billing
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
              Save 20%
            </span>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {plans.map((p, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`rounded-3xl p-8 transition-all relative flex flex-col justify-between ${
                p.highlight
                  ? 'bg-gradient-to-b from-[#FFFDF9] via-[#FAF8F5] to-[#F5EFE6] dark:from-[#1A1816] dark:to-[#141210] border-2 border-[#D4AF37] shadow-[0_20px_60px_rgba(212,175,55,0.2)] scale-105 z-10'
                  : 'bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm hover:border-[#D4AF37]'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-white text-[10px] font-black uppercase tracking-widest shadow-md">
                  {p.badge}
                </div>
              )}

              <div>
                <h3 className="text-2xl font-serif font-black text-[#1A1917] dark:text-white">{p.name}</h3>
                <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] mt-1 font-medium min-h-[36px]">{p.desc}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-black text-[#1A1917] dark:text-white">
                    {isYearly ? p.priceYearly : p.priceMonthly}
                  </span>
                  <span className="text-xs text-[#7A756E] font-bold">{p.period}</span>
                </div>

                <div className="mt-8 space-y-3">
                  {p.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-[#3A3630] dark:text-[#E5DFD5]">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => onNavigate ? onNavigate('free-trial') : window.location.href = '/free-trial'}
                  className={`w-full py-4 text-xs font-black rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    p.highlight
                      ? 'bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] text-white shadow-lg hover:scale-105'
                      : 'bg-[#FAF8F5] dark:bg-[#25221F] text-[#1A1917] dark:text-white border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37]'
                  }`}
                >
                  <span>{p.name === 'Enterprise' ? 'Contact Sales' : 'Start 14-Day Free Trial'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { X, Check, Clock, Sparkles } from 'lucide-react';

export function QuotationComparison() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.2 });

  const oldWayItems = [
    'Design in Photoshop / Canva',
    'Add event & package details',
    'Write & send on WhatsApp (text)',
    'Adjust formatting & pricing',
    'Make it look professional'
  ];

  const studioCoreItems = [
    'Add client & event details',
    'Let AI design it for you',
    'Edit if needed',
    'Download or share instantly'
  ];

  return (
    <section className="relative py-12 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px] bg-gradient-to-r from-[#FDE8BA]/20 via-[#FAF6ED]/40 to-[#FDE8BA]/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto">
        
        {/* Main Comparison Container Card (3D Rounded Cream/White Container) */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-[2.5rem] border border-[#EAE3D2] shadow-[0_20px_60px_-15px_rgba(41,35,31,0.06)] p-6 sm:p-10 lg:p-14 overflow-hidden"
        >
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">

            {/* =========================================================
                LEFT SIDE: THE OLD WAY (Grayscale / Frustration)
            ========================================================= */}
            <div className="lg:col-span-5 flex flex-col md:flex-row items-center gap-6 text-left">
              
              {/* Copy & ✕ Checklist */}
              <div className="w-full md:w-1/2 space-y-4">
                
                {/* Red Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-bold tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>THE OLD WAY</span>
                </div>

                {/* Heading */}
                <h2 className="text-2xl sm:text-3xl font-black text-[#29231F] font-serif leading-tight">
                  Still Spending <br />
                  <span className="text-[#B45309] font-serif">30–40 Minutes</span> <br />
                  on Each Quotation?
                </h2>

                {/* ✕ List */}
                <ul className="space-y-2.5 pt-2">
                  {oldWayItems.map((item, idx) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                      transition={{ delay: 0.2 + idx * 0.08 }}
                      className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#5A524A]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 font-bold text-[10px]">
                        ✕
                      </span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Stressed Character Visual + Floating App Icons */}
              <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center">
                
                {/* 30-40 Minutes Badge Floating on Top */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="mb-2 z-20"
                >
                  <Image
                    src="/assets/quotation/badge_30_40_minutes.png"
                    alt="30-40 Minutes Badge"
                    width={220}
                    height={60}
                    className="w-36 sm:w-44 h-auto object-contain drop-shadow-sm"
                  />
                </motion.div>

                {/* Stressed Photographer Character in Grayscale */}
                <div className="relative w-48 sm:w-56 h-auto">
                  <Image
                    src="/assets/quotation/stressed_photographer.png"
                    alt="Stressed Photographer"
                    width={400}
                    height={500}
                    className="w-full h-auto object-contain filter grayscale contrast-110 drop-shadow-md"
                  />

                  {/* Floating Photoshop Icon */}
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [-2, 3, -2] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    className="absolute -top-3 -left-3 w-10 h-10 sm:w-12 sm:h-12 z-20 drop-shadow-lg"
                  >
                    <Image
                      src="/assets/quotation/photoshop_icon.png"
                      alt="Photoshop"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>

                  {/* Floating Canva Icon */}
                  <motion.div
                    animate={{ y: [0, 8, 0], rotate: [2, -3, 2] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.4 }}
                    className="absolute -top-4 right-1/4 w-10 h-10 sm:w-12 sm:h-12 z-20 drop-shadow-lg"
                  >
                    <Image
                      src="/assets/quotation/canva_icon.png"
                      alt="Canva"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>

                  {/* Floating WhatsApp Icon */}
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [-3, 2, -3] }}
                    transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut', delay: 0.8 }}
                    className="absolute top-4 -right-2 w-10 h-10 sm:w-12 sm:h-12 z-20 drop-shadow-lg"
                  >
                    <Image
                      src="/assets/quotation/whatsapp_icon.png"
                      alt="WhatsApp"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>
                </div>

              </div>

            </div>

            {/* =========================================================
                CENTER: GOLD TRANSITION ARROW (Transformation)
            ========================================================= */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center my-4 lg:my-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative flex items-center justify-center"
              >
                {/* Pulsing Sweep Arrow */}
                <motion.div
                  animate={{ x: [0, 8, 0], scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="w-24 sm:w-32 lg:w-40 filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)]"
                >
                  <Image
                    src="/assets/quotation/gold_transition_arrow.png"
                    alt="Transition to AI"
                    width={300}
                    height={120}
                    className="w-full h-auto object-contain"
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* =========================================================
                RIGHT SIDE: THE STUDIOCORE WAY (Vibrant / Success)
            ========================================================= */}
            <div className="lg:col-span-5 flex flex-col-reverse md:flex-row items-center gap-6 text-left">
              
              {/* Happy Photographer Visual + Quotation Preview with Green Checkmark */}
              <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center">
                
                {/* 1 Minute Badge Floating on Top */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.3 }}
                  className="mb-2 z-20"
                >
                  <Image
                    src="/assets/quotation/badge_1_minute.png"
                    alt="1 Minute Badge"
                    width={180}
                    height={60}
                    className="w-32 sm:w-36 h-auto object-contain drop-shadow-sm"
                  />
                </motion.div>

                {/* Happy Photographer with Quotation Card Preview */}
                <div className="relative w-48 sm:w-56 h-auto">
                  
                  {/* Floating Quotation Card behind happy photographer */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
                    className="absolute -top-6 -right-6 w-28 sm:w-32 z-10 rounded-xl overflow-hidden shadow-xl border border-[#FDE68A]"
                  >
                    <Image
                      src="/assets/quotation/hero_floral_quotation.png"
                      alt="Completed Quotation"
                      width={200}
                      height={280}
                      className="w-full h-auto object-cover"
                    />

                    {/* Green Success Checkmark Badge */}
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 z-30 drop-shadow-md">
                      <Image
                        src="/assets/quotation/green_success_check.png"
                        alt="Success"
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </motion.div>

                  {/* Happy Photographer Character in Full Vibrant Color */}
                  <Image
                    src="/assets/quotation/happy_photographer.png"
                    alt="Happy AI Powered Photographer"
                    width={400}
                    height={500}
                    className="w-full h-auto object-contain filter drop-shadow-lg relative z-20"
                  />
                </div>

              </div>

              {/* Copy & ✓ Checklist */}
              <div className="w-full md:w-1/2 space-y-4">
                
                {/* Green Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] text-[#059669] text-xs font-bold tracking-wider">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>THE STUDIOCORE WAY</span>
                </div>

                {/* Heading */}
                <h2 className="text-2xl sm:text-3xl font-black text-[#29231F] font-serif leading-tight">
                  Get a Premium <br />
                  Quotation in Just <br />
                  <span className="italic font-serif bg-gradient-to-r from-[#C58B27] via-[#D97706] to-[#B45309] bg-clip-text text-transparent">
                    1 Minute!
                  </span>
                </h2>

                {/* ✓ List */}
                <ul className="space-y-2.5 pt-2">
                  {studioCoreItems.map((item, idx) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                      transition={{ delay: 0.3 + idx * 0.08 }}
                      className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#29231F]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 font-bold text-[10px]">
                        ✓
                      </span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

            </div>

          </div>

        </motion.div>

      </div>
    </section>
  );
}

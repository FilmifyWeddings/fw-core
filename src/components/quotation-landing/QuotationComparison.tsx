'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { Clock, Check } from 'lucide-react';

export function QuotationComparison() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.15 });

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
    <section className="relative pt-4 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* Main Comparison Container Card (3D Rounded White Box matching exact reference screenshot) */}
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 35 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 35 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-[2.5rem] border border-[#EAE3D2] shadow-[0_20px_50px_-15px_rgba(41,35,31,0.08)] p-6 sm:p-10 lg:p-12 overflow-hidden"
        >
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">

            {/* =========================================================
                LEFT SIDE: THE OLD WAY (Frustration & Manual Work)
            ========================================================= */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-left">
              
              {/* Copy & ✕ Checklist */}
              <div className="w-full sm:w-1/2 space-y-3.5">
                
                {/* Red Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-[11px] font-bold tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>THE OLD WAY</span>
                </div>

                {/* Heading */}
                <h2 className="text-2xl sm:text-[27px] font-black text-[#29231F] font-serif leading-[1.15]">
                  Still Spending <br />
                  <span className="italic font-serif font-normal text-[#C58B27]">30–40 Minutes</span> <br />
                  on Each Quotation?
                </h2>

                {/* ✕ List */}
                <ul className="space-y-2 pt-1">
                  {oldWayItems.map((item, idx) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                      transition={{ delay: 0.15 + idx * 0.06 }}
                      className="flex items-center gap-2.5 text-xs font-semibold text-[#5A524A]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 font-bold text-[9px]">
                        ✕
                      </span>
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Stressed Character Visual + Floating Badges & Icons */}
              <div className="w-full sm:w-1/2 relative flex flex-col items-center justify-center pt-2">
                
                {/* 30-40 Minutes Floating Badge */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
                  className="mb-1 z-20"
                >
                  <Image
                    src="/assets/quotation/badge_30_40_minutes.png"
                    alt="30-40 Minutes Badge"
                    width={220}
                    height={65}
                    className="w-36 sm:w-40 h-auto object-contain filter drop-shadow-xs"
                    priority
                  />
                </motion.div>

                {/* Stressed Photographer Mascot + Floating Apps */}
                <div className="relative w-44 sm:w-52 h-auto">
                  
                  {/* Stressed Character */}
                  <Image
                    src="/assets/quotation/stressed_photographer.png"
                    alt="Stressed Photographer Old Workflow"
                    width={481}
                    height={345}
                    className="w-full h-auto object-contain filter drop-shadow-md relative z-10"
                    priority
                  />

                  {/* Floating Photoshop Icon */}
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
                    className="absolute -top-4 -left-3 w-9 h-9 sm:w-11 sm:h-11 z-20 filter drop-shadow-md"
                  >
                    <Image
                      src="/assets/quotation/photoshop_icon.png"
                      alt="Photoshop Icon"
                      width={144}
                      height={148}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>

                  {/* Floating Canva Icon */}
                  <motion.div
                    animate={{ y: [0, 6, 0], rotate: [2, -2, 2] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.3 }}
                    className="absolute -top-5 left-1/3 w-9 h-9 sm:w-11 sm:h-11 z-20 filter drop-shadow-md"
                  >
                    <Image
                      src="/assets/quotation/canva_icon.png"
                      alt="Canva Icon"
                      width={180}
                      height={162}
                      className="w-full h-full object-contain"
                    />
                  </motion.div>

                  {/* Floating WhatsApp Message Card */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.6 }}
                    className="absolute -top-3 -right-6 sm:-right-8 w-24 sm:w-28 z-20 filter drop-shadow-md"
                  >
                    <Image
                      src="/assets/quotation/quotation_whatsapp_message.png"
                      alt="WhatsApp Quotation Message"
                      width={405}
                      height={153}
                      className="w-full h-auto object-contain"
                    />
                  </motion.div>

                </div>

              </div>

            </div>

            {/* =========================================================
                CENTER: GOLD TRANSITION ARROW (Transformation Arc)
            ========================================================= */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center my-3 lg:my-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative flex items-center justify-center"
              >
                <motion.div
                  animate={{ x: [0, 6, 0], scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                  className="w-20 sm:w-28 lg:w-32 filter drop-shadow-[0_6px_14px_rgba(245,158,11,0.3)]"
                >
                  <Image
                    src="/assets/quotation/gold_transition_arrow.png"
                    alt="Gold Transformation Arrow"
                    width={335}
                    height={205}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* =========================================================
                RIGHT SIDE: THE STUDIOCORE WAY (Happy & 1 Minute)
            ========================================================= */}
            <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row items-center sm:items-start gap-6 text-left">
              
              {/* Happy Photographer Visual + Quotation Card + Green Checkmark */}
              <div className="w-full sm:w-1/2 relative flex flex-col items-center justify-center pt-2">
                
                {/* 1 Minute Floating Badge */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut', delay: 0.2 }}
                  className="mb-1 z-20"
                >
                  <Image
                    src="/assets/quotation/badge_1_minute.png"
                    alt="1 Minute Badge"
                    width={180}
                    height={60}
                    className="w-28 sm:w-32 h-auto object-contain filter drop-shadow-xs"
                    priority
                  />
                </motion.div>

                {/* Happy Photographer Character in Full Color */}
                <div className="relative w-44 sm:w-52 h-auto">
                  
                  {/* Character Illustration with Quotation Card and Success Check */}
                  <Image
                    src="/assets/quotation/happy_photographer.png"
                    alt="Happy Photographer StudioCore Workflow"
                    width={415}
                    height={360}
                    className="w-full h-auto object-contain filter drop-shadow-md relative z-10"
                    priority
                  />

                </div>

              </div>

              {/* Copy & ✓ Checklist */}
              <div className="w-full sm:w-1/2 space-y-3.5">
                
                {/* Green Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F9F0] border border-[#A7F3D0] text-[#059669] text-[11px] font-bold tracking-wider">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>THE STUDIOCORE WAY</span>
                </div>

                {/* Heading */}
                <h2 className="text-2xl sm:text-[27px] font-black text-[#29231F] font-serif leading-[1.15]">
                  Get a Premium <br />
                  Quotation in Just <br />
                  <span className="italic font-serif font-normal text-[#C58B27]">1 Minute!</span>
                </h2>

                {/* ✓ List */}
                <ul className="space-y-2 pt-1">
                  {studioCoreItems.map((item, idx) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                      transition={{ delay: 0.2 + idx * 0.06 }}
                      className="flex items-center gap-2.5 text-xs font-semibold text-[#29231F]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#E6F9F0] text-[#059669] flex items-center justify-center shrink-0 font-bold text-[9px]">
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

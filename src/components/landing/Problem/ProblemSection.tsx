'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle,
  PhoneCall,
  UserPlus,
  FileText,
  Users,
  Clapperboard,
  FolderKanban,
} from 'lucide-react';
import { ProblemCharacter } from './ProblemCharacter';
import { ProblemNotificationCard } from './ProblemNotificationCard';
import { ProblemPaymentCard } from './ProblemPaymentCard';
import { ProblemFollowupCard } from './ProblemFollowupCard';
import { ProblemDecorations } from './ProblemDecorations';
import { ProblemMobileStage } from './ProblemMobileStage';
import { ProblemSummary } from './ProblemSummary';
import { animateProblemSection } from './ProblemAnimations';

export const ProblemSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const decorationsRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // References for all floating cards to animate them with GSAP
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Subtle mouse parallax state
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (window.innerWidth < 1024) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    setMouseOffset({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const ctx = animateProblemSection({
      sectionRef: sectionRef.current,
      headlineRef: headlineRef.current,
      characterRef: characterRef.current,
      cardsRef: cardRefs.current,
      decorationsRef: decorationsRef.current,
      summaryRef: summaryRef.current,
    });

    return () => {
      ctx?.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="problem"
      className="problem-section relative w-full min-h-screen bg-[#FFFDF8] pt-6 sm:pt-12 lg:pt-20 pb-12 lg:pb-24 overflow-x-clip overflow-y-visible border-t border-[#F2ECE2]/80 select-none"
    >
      {/* Background paper texture & ambient glow */}
      <div className="absolute inset-0 pointer-events-none -z-20 bg-[#FFFDF8]">
        <div className="absolute inset-0 opacity-[0.35] subtle-paper-texture" aria-hidden="true" />
        <div
          className="absolute top-[25%] left-[50%] -translate-x-1/2 w-[850px] h-[600px] rounded-full bg-gradient-to-br from-[#F7EEDA]/50 via-[#FAF4EB]/30 to-transparent blur-3xl -z-10 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* MAIN CONTENT STAGE CONTAINER */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16">
        {/* DESKTOP VIEW (>= 1024px) */}
        <div className="hidden lg:block relative min-h-[700px] xl:min-h-[760px] mb-8">
          {/* Left Column: Headline and subtext */}
          <div
            ref={headlineRef}
            className="absolute left-0 top-[35px] max-w-[430px] xl:max-w-[460px] z-20"
          >
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6F0] border border-[#EBE2D3] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#C89435] animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#8C6D33]">
                The Reality
              </span>
            </div>

            {/* Main Headline */}
            <h2 className="font-serif text-[48px] xl:text-[58px] font-normal leading-[1.02] tracking-[-0.015em] text-[#211B17] mb-6">
              <span>Your Photography </span>
              <span>Business Was Never </span>
              <span>Supposed To Be </span>
              <span className="text-[#C89435] italic font-normal drop-shadow-[0_2px_10px_rgba(200,148,53,0.15)]">
                This Complicated.
              </span>
            </h2>

            {/* Subtext */}
            <p className="text-[16px] xl:text-[17px] text-[#746E67] font-normal leading-[1.65]">
              Too many tools. Too many follow-ups.<br />
              Too many tasks. And not enough time.
            </p>
          </div>

          {/* Floating UI Layer & Handwritten Decorations Behind/Around Character */}
          <div ref={decorationsRef}>
            <ProblemDecorations />
          </div>

          {/* 1. Card: New Lead (Upper Left of Head) */}
          <div
            ref={(el) => { cardRefs.current[0] = el; }}
            className="absolute left-[34%] xl:left-[35%] top-[14%] z-10 animate-float-fast"
            style={{
              transform: `translate3d(${mouseOffset.x * 5}px, ${mouseOffset.y * 3}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<UserPlus className="w-4 h-4" />}
              iconBg="bg-[#E3F2FD] text-[#1976D2]"
              title="New Lead"
              subtitle="Rahul & Priya"
              tag="Wedding"
              time="2m ago"
              rotation={1}
              className="w-[195px] xl:w-[215px]"
            />
          </div>

          {/* 2. Card: WhatsApp (Left of Head) */}
          <div
            ref={(el) => { cardRefs.current[1] = el; }}
            className="absolute left-[28%] xl:left-[29%] top-[26%] z-10 animate-float-slow"
            style={{
              transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<MessageCircle className="w-4 h-4" />}
              iconBg="bg-[#E8F5E9] text-[#2E7D32]"
              title="WhatsApp"
              subtitle="Can you share your packages?"
              time="3m ago"
              rotation={-2}
              className="w-[205px] xl:w-[225px]"
            />
          </div>

          {/* 3. Card: Missed Call (Below WhatsApp) */}
          <div
            ref={(el) => { cardRefs.current[2] = el; }}
            className="absolute left-[26%] xl:left-[27%] top-[40%] z-10 animate-float-delayed"
            style={{
              transform: `translate3d(${mouseOffset.x * -6}px, ${mouseOffset.y * -4}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<PhoneCall className="w-4 h-4" />}
              iconBg="bg-[#F3E5F5] text-[#7B1FA2]"
              title="Missed Call"
              subtitle="Akshay & Sneha"
              time="5m ago"
              rotation={1}
              className="w-[195px] xl:w-[215px]"
            />
          </div>

          {/* 4. Card: Quotation Request (Upper Center of Head) */}
          <div
            ref={(el) => { cardRefs.current[3] = el; }}
            className="absolute left-[54%] xl:left-[55%] top-[10%] z-10 animate-float-slow"
            style={{
              transform: `translate3d(${mouseOffset.x * -3}px, ${mouseOffset.y * -2}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<FileText className="w-4 h-4" />}
              iconBg="bg-[#EDE7F6] text-[#5E35B1]"
              title="Quotation Request"
              subtitle="Please share the quotation."
              time="6m ago"
              rotation={-1}
              className="w-[205px] xl:w-[225px]"
            />
          </div>

          {/* 5. Card: Payment Tracking Spreadsheet (Upper Right) */}
          <div
            ref={(el) => { cardRefs.current[4] = el; }}
            className="absolute right-[6%] xl:right-[8%] top-[10%] z-10 animate-float-delayed"
            style={{
              transform: `translate3d(${mouseOffset.x * 6}px, ${mouseOffset.y * 4}px, 0px)`,
            }}
          >
            <ProblemPaymentCard rotation={2} />
          </div>

          {/* 6. Card: Team Group (Mid Right) */}
          <div
            ref={(el) => { cardRefs.current[5] = el; }}
            className="absolute right-[21%] xl:right-[23%] top-[27%] z-10 animate-float-fast"
            style={{
              transform: `translate3d(${mouseOffset.x * -5}px, ${mouseOffset.y * -3}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<Users className="w-4 h-4" />}
              iconBg="bg-[#FFF3E0] text-[#E65100]"
              title="Team Group"
              subtitle="Who is available on 12th May?"
              time="8m ago"
              badge={12}
              rotation={-1.5}
              className="w-[215px] xl:w-[235px]"
            />
          </div>

          {/* 7. Center Stressed Photographer Character (Floating in Front & Overlapping) */}
          <div className="absolute left-[47%] xl:left-[49%] -translate-x-1/2 bottom-0 z-25">
            <ProblemCharacter
              ref={characterRef}
              parallaxOffset={{
                x: mouseOffset.x * 5,
                y: mouseOffset.y * 3,
              }}
            />
          </div>

          {/* 8. Card: Follow-up Reminder (Foreground widget overlapping character right) */}
          <div
            ref={(el) => { cardRefs.current[6] = el; }}
            className="absolute left-[58%] xl:left-[60%] top-[39%] z-35 animate-float-slow"
            style={{
              transform: `translate3d(${mouseOffset.x * 4}px, ${mouseOffset.y * 3}px, 0px)`,
            }}
          >
            <ProblemFollowupCard rotation={0} />
          </div>

          {/* 9. Card: Editing In Progress */}
          <div
            ref={(el) => { cardRefs.current[7] = el; }}
            className="absolute right-[9%] xl:right-[11%] top-[32%] z-10 animate-float-delayed"
            style={{
              transform: `translate3d(${mouseOffset.x * 5}px, ${mouseOffset.y * 3}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<Clapperboard className="w-4 h-4" />}
              iconBg="bg-[#EDE7F6] text-[#5E35B1]"
              title="Editing In Progress"
              subtitle="3 Projects"
              tag="Pending Review"
              time="2h ago"
              rotation={1.5}
              className="w-[195px] xl:w-[215px]"
            />
          </div>

          {/* 10. Card: Album Design */}
          <div
            ref={(el) => { cardRefs.current[8] = el; }}
            className="absolute right-[11%] xl:right-[13%] top-[44%] z-10 animate-float-fast"
            style={{
              transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px)`,
            }}
          >
            <ProblemNotificationCard
              icon={<FolderKanban className="w-4 h-4" />}
              iconBg="bg-[#FFF3E0] text-[#E65100]"
              title="Album Design"
              subtitle="Client Waiting"
              time="1h ago"
              rotation={-1}
              className="w-[185px] xl:w-[205px]"
            />
          </div>
        </div>

        {/* MOBILE & TABLET UNIFIED COMPOSITION VIEW (< 1024px) */}
        {/* Exact same artwork with Stressed Photographer & Floating Chaos stickers together below headline */}
        <div className="flex lg:hidden flex-col items-center gap-6 mb-12">
          {/* Header */}
          <div ref={headlineRef} className="w-full max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6F0] border border-[#EBE2D3] mb-4">
              <span className="w-2 h-2 rounded-full bg-[#C89435] animate-pulse" />
              <span className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[#8C6D33]">
                The Reality
              </span>
            </div>
            <h2 className="font-serif text-[38px] sm:text-[46px] font-normal leading-[1.05] tracking-tight text-[#211B17] mb-3">
              Your Photography Business Was Never Supposed To Be{' '}
              <span className="text-[#C89435] italic">This Complicated.</span>
            </h2>
            <p className="text-[14px] sm:text-[15.5px] text-[#746E67] leading-relaxed max-w-md mx-auto">
              Too many tools. Too many follow-ups. Too many tasks. And not enough time.
            </p>
          </div>

          {/* UNIFIED CHAOS STAGE (Stressed Photographer + Floating Stickers Together) */}
          <ProblemMobileStage />
        </div>

        {/* BOTTOM PROBLEM SUMMARY PANEL (7 Columns) */}
        <ProblemSummary ref={summaryRef} />
      </div>
    </section>
  );
};

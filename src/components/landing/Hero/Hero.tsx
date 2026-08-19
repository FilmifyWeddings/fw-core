'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HeroNavbar } from './HeroNavbar';
import { HeroBackground } from './HeroBackground';
import { HeroTopBanner } from './HeroTopBanner';
import { HeroContent } from './HeroContent';
import { HeroDashboard } from './HeroDashboard';
import { HeroCharacter } from './HeroCharacter';
import { HeroNotifications } from './HeroNotifications';
import { HeroMobileStage } from './HeroMobileStage';
import { HeroBottom } from './HeroBottom';
import { animateHeroEntrance } from '../../../animations/heroAnimations';

export const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parallax mouse movement states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle subtle 3D mouse parallax on desktop
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (window.innerWidth < 1024) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Trigger entrance animations
  useEffect(() => {
    const ctx = animateHeroEntrance({
      navbarRef: navbarRef.current,
      headlineRef: headlineRef.current,
      descriptionRef: descriptionRef.current,
      buttonsRef: buttonsRef.current,
      trustRef: trustRef.current,
      dashboardRef: dashboardRef.current,
      characterRef: characterRef.current,
      notificationsRef: notificationsRef.current,
      bottomRef: bottomRef.current,
    });

    return () => {
      ctx.kill();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero relative w-full min-h-screen bg-[#FFFDF8] pt-[100px] sm:pt-[110px] lg:pt-[115px] flex flex-col justify-between overflow-x-clip overflow-y-visible"
    >
      {/* Background layer */}
      <HeroBackground />

      {/* Navigation */}
      <HeroNavbar ref={navbarRef} />

      {/* Main Hero Viewport Area */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16 flex-1 flex flex-col justify-center">
        {/* Centered Top Tagline Banner: #1 CRM & Automation + Made with Love in India */}
        <HeroTopBanner />

        {/* DESKTOP VIEW (>= 1024px) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 xl:gap-6 items-center min-h-[600px] xl:min-h-[660px] relative pb-4">
          {/* Left Column: Editorial Headline, Text, CTA, Trust */}
          <div className="lg:col-span-5 xl:col-span-5 z-20">
            <HeroContent
              headlineRef={headlineRef}
              descriptionRef={descriptionRef}
              buttonsRef={buttonsRef}
              trustRef={trustRef}
            />
          </div>

          {/* Center & Right Visual Stage: Dashboard + Shifted Foreground Character + Floating Notifications */}
          <div className="lg:col-span-7 xl:col-span-7 relative h-[580px] xl:h-[640px] flex items-center justify-end">
            {/* 1. SaaS Dashboard (Layer Behind Character) */}
            <div
              className="absolute right-[160px] xl:right-[190px] top-[15px] z-10"
              style={{
                transform: `translate3d(${mousePos.x * -4}px, ${mousePos.y * -3}px, 0px)`,
                transition: 'transform 0.25s ease-out',
                willChange: 'transform',
              }}
            >
              <HeroDashboard ref={dashboardRef} />
            </div>

            {/* 2. 3D Photographer Character (Left side of dashboard in foreground with smooth bottom fade) */}
            <div
              className="hero-character absolute left-[-45px] xl:left-[-25px] bottom-[-40px] xl:bottom-[-55px] z-30 pointer-events-none"
            >
              <HeroCharacter
                ref={characterRef}
                parallaxOffset={{
                  x: mousePos.x * 8,
                  y: mousePos.y * 4,
                  rotateY: mousePos.x * 2,
                }}
              />
            </div>

            {/* 3. Floating Notification Cards (Layer on Far Right) */}
            <div
              className="hero-notifications absolute -right-2 xl:right-2 top-[10px] z-35"
              style={{
                transform: `translate3d(${mousePos.x * 5}px, ${mousePos.y * 4}px, 0px)`,
                transition: 'transform 0.2s ease-out',
                willChange: 'transform',
              }}
            >
              <HeroNotifications ref={notificationsRef} />
            </div>
          </div>
        </div>

        {/* MOBILE & TABLET UNIFIED COMPOSITION VIEW (< 1024px) */}
        <div className="flex lg:hidden flex-col items-center gap-6 py-2 w-full">
          {/* Content (Headline, CTA, Trust) */}
          <div className="w-full max-w-xl mx-auto text-center flex flex-col items-center">
            <HeroContent
              headlineRef={headlineRef}
              descriptionRef={descriptionRef}
              buttonsRef={buttonsRef}
              trustRef={trustRef}
            />
          </div>

          {/* UNIFIED VISUAL STAGE (Compact Proportional Dashboard + Character + Notifications) */}
          <HeroMobileStage characterRef={characterRef} />
        </div>
      </div>

      {/* Bottom Editorial Statement & Scroll Indicator */}
      <HeroBottom ref={bottomRef} />
    </section>
  );
};

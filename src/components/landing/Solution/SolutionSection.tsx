'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChaosScene } from './ChaosScene';
import { SolutionContent } from './SolutionContent';
import { SolutionCharacter } from './SolutionCharacter';
import { SolutionDashboard } from './SolutionDashboard';
import { SolutionMobileStage } from './SolutionMobileStage';
import { animateSolutionSection } from './SolutionAnimations';

export const SolutionSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const chaosSceneRef = useRef<HTMLDivElement>(null);
  const solutionContentRef = useRef<HTMLDivElement>(null);
  const solutionCharacterRef = useRef<HTMLDivElement>(null);
  const solutionDashboardRef = useRef<HTMLDivElement>(null);
  const driftingPaper1Ref = useRef<HTMLDivElement>(null);
  const driftingPaper2Ref = useRef<HTMLDivElement>(null);

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
    const ctx = animateSolutionSection({
      sectionRef: sectionRef.current,
      chaosSceneRef: chaosSceneRef.current,
      solutionContentRef: solutionContentRef.current,
      solutionCharacterRef: solutionCharacterRef.current,
      solutionDashboardRef: solutionDashboardRef.current,
      driftingPaper1Ref: driftingPaper1Ref.current,
      driftingPaper2Ref: driftingPaper2Ref.current,
    });

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="solution"
      className="solution-section relative w-full bg-[#FFFDF8] pt-10 sm:pt-14 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 overflow-x-clip overflow-y-visible border-t border-[#F2ECE2]/80"
    >
      {/* ========================================================= */}
      {/* FULL-WIDTH BACKGROUND TEXTURE & AMBIENT VINTAGE WARMTH */}
      {/* ========================================================= */}
      <div className="absolute inset-0 pointer-events-none -z-20 bg-[#FFFDF8] w-full">
        {/* Subtle paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.35] subtle-paper-texture" aria-hidden="true" />
        
        {/* Top full-width warm parchment vignette background for chaos area */}
        <div
          className="absolute top-0 left-0 right-0 w-full h-[520px] bg-gradient-to-b from-[#EFE5D6]/90 via-[#F7EFE4]/70 to-transparent blur-md -z-10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Top subtle vignette dark corners */}
        <div
          className="absolute top-0 left-0 w-[400px] h-[350px] bg-gradient-to-br from-[#DECAB2]/40 to-transparent blur-2xl -z-10 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 right-0 w-[400px] h-[350px] bg-gradient-to-bl from-[#DECAB2]/40 to-transparent blur-2xl -z-10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Bottom Right Soft Luxury Roses Floral Watermark (Edge to Edge) */}
        <div
          className="absolute right-0 bottom-0 w-[380px] sm:w-[480px] lg:w-[560px] 2xl:w-[640px] h-[500px] pointer-events-none select-none -z-10 opacity-80"
          aria-hidden="true"
        >
          <img
            src="/assets/backgrounds/solution-floral.webp"
            alt=""
            className="w-full h-full object-contain object-bottom-right"
          />
        </div>
      </div>

      {/* Main Unified Blueprint Canvas (1800px Max Width to fill widescreen display) */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-16 2xl:px-20 flex flex-col gap-2 sm:gap-4">
        {/* ========================================================= */}
        {/* TOP ZONE: CHAOS (Photographer Overwhelmed with Disconnected Tools) */}
        {/* ========================================================= */}
        <ChaosScene ref={chaosSceneRef} mouseOffset={mouseOffset} />

        {/* Real 3D Vintage Flying Paper Sheet 1 (Interactive Scroll Flutter animation - Upper Transition Zone) */}
        <div className="relative w-full h-2 -my-2 pointer-events-none z-20">
          <div
            ref={driftingPaper1Ref}
            className="absolute -top-12 left-[6%] sm:left-[18%] lg:left-[26%] 2xl:left-[28%] pointer-events-none will-change-transform select-none"
            aria-hidden="true"
          >
            <img
              src="/assets/decorations/flying-paper-top.webp"
              alt=""
              className="w-[75px] sm:w-[100px] lg:w-[140px] h-auto object-contain drop-shadow-[0_12px_24px_rgba(33,27,23,0.15)] transform -rotate-12"
            />
          </div>
        </div>

        {/* Real 3D Vintage Flying Paper Sheet 2 (Interactive Scroll Flutter animation - Right Open Space) */}
        <div className="relative w-full h-2 pointer-events-none z-20">
          <div
            ref={driftingPaper2Ref}
            className="absolute -top-6 right-[4%] sm:right-[10%] lg:right-[38%] pointer-events-none will-change-transform select-none z-25"
            aria-hidden="true"
          >
            <img
              src="/assets/decorations/flying-paper-bottom.webp"
              alt=""
              className="w-[80px] sm:w-[110px] lg:w-[150px] h-auto object-contain drop-shadow-[0_14px_28px_rgba(33,27,23,0.15)] transform rotate-14"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ZONE: THE SOLUTION (One System, Calm & Organized) */}
        {/* ========================================================= */}
        {/* Desktop Layout (>= 1024px) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 xl:gap-8 items-center min-h-[480px] xl:min-h-[520px] relative pb-2 pt-2">
          {/* Left Column: Solution Headline & CTA */}
          <div className="lg:col-span-4 xl:col-span-4 z-20 relative">
            <SolutionContent ref={solutionContentRef} />
          </div>

          {/* Right & Center Stage: Dashboard + Foreground Confident Photographer */}
          <div className="lg:col-span-8 xl:col-span-8 relative h-[480px] xl:h-[520px] flex items-center justify-end">
            {/* StudioCore Solution Dashboard (Layer Behind) */}
            <div
              className="absolute right-0 top-[10px] z-10 w-[660px] xl:w-[720px] 2xl:w-[760px]"
              style={{
                transform: `translate3d(${mouseOffset.x * -4}px, ${mouseOffset.y * -3}px, 0px)`,
                transition: 'transform 0.25s ease-out',
                willChange: 'transform',
              }}
            >
              <SolutionDashboard ref={solutionDashboardRef} />
            </div>

            {/* Confident Photographer (Foreground Layer Overlapping Dashboard) */}
            <div
              className="absolute left-[15px] xl:left-[45px] 2xl:left-[60px] bottom-[-20px] xl:bottom-[-30px] z-30 pointer-events-none"
            >
              <SolutionCharacter
                ref={solutionCharacterRef}
                parallaxOffset={{
                  x: mouseOffset.x * 6,
                  y: mouseOffset.y * 3,
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Unified Composition View (< 1024px) */}
        {/* Content on top, then Unified Dashboard + Confident Character together */}
        <div className="flex lg:hidden flex-col items-center gap-6 pt-2 pb-6 w-full">
          {/* Content (Headline, Subtitle, CTA) */}
          <div className="w-full max-w-xl mx-auto text-center flex flex-col items-center">
            <SolutionContent ref={solutionContentRef} />
          </div>

          {/* Unified Solution Stage (Compact Full-featured Dashboard + Confident Character) */}
          <SolutionMobileStage />
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FeaturesHeading } from './FeaturesHeading';
import { FeatureCardsRow } from './FeatureCardsRow';
import { TransformationPanel } from './TransformationPanel';
import { animateFeaturesSection } from './FeaturesAnimations';

export const FeaturesSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
    const ctx = animateFeaturesSection({
      sectionRef: sectionRef.current,
      headingRef: headingRef.current,
      cardsRowRef: cardsRowRef.current,
      panelRef: panelRef.current,
    });

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="features-section relative w-full bg-[#FFFDF8] pt-14 sm:pt-18 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 overflow-x-clip overflow-y-visible border-t border-[#F2ECE2]/80 select-none"
    >
      {/* ========================================================= */}
      {/* BACKGROUND TEXTURE & AMBIENT WARMTH */}
      {/* ========================================================= */}
      <div className="absolute inset-0 pointer-events-none -z-20 bg-[#FFFDF8] w-full">
        {/* Subtle paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.35] subtle-paper-texture" aria-hidden="true" />
        
        {/* Ambient subtle glow in center */}
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-br from-[#F7EEDA]/40 via-[#FAF4EB]/25 to-transparent blur-3xl -z-10 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Main Section Container (1480px-1600px) */}
      <div className="w-full max-w-[1520px] 2xl:max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col">
        {/* PART A: Header */}
        <FeaturesHeading ref={headingRef} />

        {/* PART A: 7 Feature Cards Row */}
        <FeatureCardsRow ref={cardsRowRef} />

        {/* PART B: Before → After Transformation Container */}
        <TransformationPanel ref={panelRef} mouseOffset={mouseOffset} />
      </div>
    </section>
  );
};

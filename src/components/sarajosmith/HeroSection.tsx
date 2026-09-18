'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface HeroSectionProps {
  onNavigate: (sectionId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const { config, isAdmin, isEditModeActive, activeDeviceView } = useSaraJoSmith();
  const isMobileSim = activeDeviceView === 'mobile';
  const { autoplayIntervalMs } = config.hero;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slides = config.hero.slides;

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || (isAdmin && isEditModeActive)) return;
    const timer = setInterval(() => {
      nextSlide();
    }, config.hero.autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, config.hero.autoplayIntervalMs, isAdmin, isEditModeActive]);

  return (
    <section
      id="hero"
      className="relative w-full bg-[#EFECE3] px-3 pt-3 pb-6 md:px-5 md:pt-4 md:pb-8 flex flex-col items-center justify-center overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Outer Inset Photo Frame Container */}
      <div className="relative w-full max-w-[1240px] h-[580px] sm:h-[650px] md:h-[780px] lg:h-[834px] overflow-hidden rounded-xs border border-[#292421]/15 shadow-sm">
        {/* Slideshow Images with Smooth Cross-fade */}
        {slides.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <EditableImage
                path={`hero.slides.${index}.url`}
                fallbackSrc={slide.url}
                alt={slide.alt}
                label={`Hero Slide ${index + 1}`}
                fill
                className="object-cover"
                style={{ objectPosition: slide.position || 'center center' }}
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 1200px"
              />
              {/* Subtle film grain & cinematic vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 pointer-events-none" />
            </div>
          );
        })}

        {/* Floating Top In-Hero Navigation on Desktop */}
        <div className={`absolute top-0 left-0 right-0 z-20 pt-6 px-8 items-center justify-between pointer-events-auto ${isMobileSim ? 'hidden' : 'hidden lg:flex'}`}>
          {/* Left Nav */}
          <div className="flex items-center space-x-12 pl-6">
            <button
              onClick={() => onNavigate('hero')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/95 hover:text-white drop-shadow-md transition-colors cursor-pointer"
            >
              home
            </button>
            <button
              onClick={() => onNavigate('collections')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/95 hover:text-white drop-shadow-md transition-colors cursor-pointer"
            >
              collections
            </button>
          </div>

          {/* Center Monogram Logo */}
          <div className="relative w-28 h-14 drop-shadow-lg">
            <Image
              src={config.assets.monogramHeader}
              alt="Sara Jo Smith Monogram"
              fill
              className="object-contain filter brightness-0 invert"
              sizes="112px"
              priority
            />
          </div>

          {/* Right Nav */}
          <div className="flex items-center space-x-12 pr-28">
            <button
              onClick={() => onNavigate('portfolio')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/95 hover:text-white drop-shadow-md transition-colors cursor-pointer"
            >
              portfolio
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/95 hover:text-white drop-shadow-md transition-colors cursor-pointer"
            >
              contact
            </button>
          </div>
        </div>

        {/* Mobile Top Logo Center */}
        <div className={`absolute top-4 left-0 right-0 z-20 justify-center ${isMobileSim ? 'flex' : 'flex lg:hidden'}`}>
          <div className="relative w-20 h-10 drop-shadow-md">
            <Image
              src={config.assets.monogramHeader}
              alt="Sara Jo Smith Monogram"
              fill
              className="object-contain filter brightness-0 invert"
              sizes="80px"
              priority
            />
          </div>
        </div>

        {/* Center Editorial Headline Typography Artwork */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-4">
          <div className="relative w-[290px] h-[115px] sm:w-[460px] sm:h-[180px] md:w-[650px] md:h-[260px] lg:w-[765px] lg:h-[320px] drop-shadow-2xl">
            <Image
              src={config.assets.headlineBanner}
              alt={config.hero.headlineAlt}
              fill
              className="object-contain filter brightness-0 invert drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              priority
              sizes="(max-width: 768px) 320px, 765px"
            />
          </div>

          {/* Editorial Tagline Subheading (Editable) */}
          <div className="pointer-events-auto mt-2 md:mt-4 text-center max-w-xl">
            <EditableText
              path="meta.tagline"
              elementKey="hero-tagline"
              fallbackText="destination wedding & elopement photographer based in georgia"
              as="p"
              className="font-sjs-body uppercase tracking-[0.25em] text-white/95 drop-shadow-md text-center"
              defaultSizePx={13}
            />
          </div>
        </div>

        {/* Bottom Slide Indicators & Controls */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center space-x-3 pointer-events-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlideIndex(i)}
              className={`transition-all duration-500 rounded-full h-1.5 focus:outline-none cursor-pointer ${
                i === currentSlideIndex
                  ? 'w-8 bg-white shadow-sm'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

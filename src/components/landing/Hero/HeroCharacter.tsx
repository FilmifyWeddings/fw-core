'use client';

import { forwardRef } from 'react';

export interface HeroCharacterProps {
  parallaxOffset?: { x: number; y: number; rotateY: number };
  className?: string;
}

export const HeroCharacter = forwardRef<HTMLDivElement, HeroCharacterProps>(
  ({ parallaxOffset = { x: 0, y: 0, rotateY: 0 }, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative z-30 pointer-events-none select-none overflow-visible flex items-end justify-center ${className}`}
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0px) rotateY(${parallaxOffset.rotateY}deg)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Subtle ground contact shadow underneath character */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-8 bg-black/10 blur-xl rounded-full pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Character breathing / idle container with smooth bottom fade mask */}
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 78%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/main-photographer/photographer-hero.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/main-photographer/photographer-hero.png"
              alt="StudioCore 3D Professional Photographer"
              className="w-auto h-[440px] sm:h-[520px] md:h-[580px] lg:h-[640px] xl:h-[690px] max-w-none object-contain drop-shadow-[0_20px_35px_rgba(33,27,23,0.16)]"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>

        {/* Soft bottom edge gradient merge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FFFDF8] via-[#FFFDF8]/50 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      </div>
    );
  }
);

HeroCharacter.displayName = 'HeroCharacter';

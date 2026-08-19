'use client';

import { forwardRef } from 'react';

export interface ChaosCharacterProps {
  parallaxOffset?: { x: number; y: number };
  className?: string;
}

export const ChaosCharacter = forwardRef<HTMLDivElement, ChaosCharacterProps>(
  ({ parallaxOffset = { x: 0, y: 0 }, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`chaos-character relative pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0px)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Soft ground shadow underneath character */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/10 blur-xl rounded-full pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Character Image with smooth bottom fade mask */}
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/solution/chaos-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/solution/chaos-photographer.png"
              alt="Stressed Photographer overwhelmed with spreadsheets and tools"
              className="w-auto h-[420px] sm:h-[460px] md:h-[490px] lg:h-[510px] xl:h-[530px] max-w-none object-contain drop-shadow-[0_20px_40px_rgba(33,27,23,0.16)]"
              loading="eager"
              decoding="async"
            />
          </picture>
        </div>

        {/* Soft bottom ambient background color merge overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#FAF6F0] via-[#FAF6F0]/60 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      </div>
    );
  }
);

ChaosCharacter.displayName = 'ChaosCharacter';

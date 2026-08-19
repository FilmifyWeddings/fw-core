'use client';

import { forwardRef } from 'react';

export interface SolutionCharacterProps {
  parallaxOffset?: { x: number; y: number };
  className?: string;
}

export const SolutionCharacter = forwardRef<HTMLDivElement, SolutionCharacterProps>(
  ({ parallaxOffset = { x: 0, y: 0 }, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`solution-character relative pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0px)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Soft shadow */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/12 blur-xl rounded-full pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Confident Character with subtle bottom fade */}
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/solution/confident-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/solution/confident-photographer.png"
              alt="Confident StudioCore Photographer"
              className="w-auto h-[440px] sm:h-[480px] md:h-[510px] lg:h-[530px] xl:h-[560px] max-w-none object-contain drop-shadow-[0_20px_35px_rgba(33,27,23,0.16)]"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>

        {/* Soft bottom edge gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      </div>
    );
  }
);

SolutionCharacter.displayName = 'SolutionCharacter';

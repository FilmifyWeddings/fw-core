'use client';

import { forwardRef } from 'react';

export interface ProblemCharacterProps {
  parallaxOffset?: { x: number; y: number };
  className?: string;
}

export const ProblemCharacter = forwardRef<HTMLDivElement, ProblemCharacterProps>(
  ({ parallaxOffset = { x: 0, y: 0 }, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`problem-character relative pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0px)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Soft realistic ground/desk shadow */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-black/10 blur-xl rounded-full pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Character Image with smooth bottom fade mask */}
        <div
          className="relative overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/problem/problem-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/problem/problem-photographer.png"
              alt="Stressed Photographer overwhelmed by disconnected tools"
              className="w-auto h-[440px] sm:h-[500px] md:h-[540px] lg:h-[580px] xl:h-[630px] max-w-none object-contain drop-shadow-[0_15px_30px_rgba(33,27,23,0.12)]"
              loading="eager"
              decoding="async"
            />
          </picture>
        </div>

        {/* Soft bottom edge gradient merge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#FFFDF8] via-[#FFFDF8]/40 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      </div>
    );
  }
);

ProblemCharacter.displayName = 'ProblemCharacter';

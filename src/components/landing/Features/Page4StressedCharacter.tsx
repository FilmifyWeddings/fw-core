'use client';

import { forwardRef } from 'react';

export interface Page4StressedCharacterProps {
  parallaxOffset?: { x: number; y: number };
  className?: string;
}

export const Page4StressedCharacter = forwardRef<HTMLDivElement, Page4StressedCharacterProps>(
  ({ parallaxOffset = { x: 0, y: 0 }, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`page4-stressed-character relative pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0px)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Ground shadow */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-6 bg-black/10 blur-lg rounded-full pointer-events-none -z-10"
          aria-hidden="true"
        />

        {/* Character Image with smooth bottom fade mask */}
        <div
          className="relative animate-character-idle overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 75%, transparent 100%)',
          }}
        >
          <picture>
            <source
              srcSet="/assets/characters/page4/stressed-photographer.webp"
              type="image/webp"
            />
            <img
              src="/assets/characters/page4/stressed-photographer.png"
              alt="Stressed Photographer overwhelmed with too many tools"
              className="w-auto h-[320px] sm:h-[350px] lg:h-[380px] xl:h-[405px] max-w-none object-contain drop-shadow-[0_16px_30px_rgba(33,27,23,0.15)]"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>

        {/* Ambient bottom merge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#FCF6EC] via-[#FCF6EC]/50 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Page4StressedCharacter.displayName = 'Page4StressedCharacter';

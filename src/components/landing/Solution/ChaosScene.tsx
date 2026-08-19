'use client';

import { forwardRef } from 'react';
import { ChaosCharacter } from './ChaosCharacter';
import { ChaosCards } from './ChaosCards';
import { ChaosDecorations } from './ChaosDecorations';
import { ChaosMobileScene } from './ChaosMobileScene';

export interface ChaosSceneProps {
  mouseOffset?: { x: number; y: number };
}

export const ChaosScene = forwardRef<HTMLDivElement, ChaosSceneProps>(
  ({ mouseOffset = { x: 0, y: 0 } }, ref) => {
    return (
      <div ref={ref} className="w-full">
        {/* DESKTOP VIEW (>= 1024px) */}
        <div className="hidden lg:flex chaos-scene relative w-full min-h-[480px] xl:min-h-[520px] items-center justify-center overflow-visible">
          {/* Background Paperwork Decorations */}
          <ChaosDecorations />

          {/* 1. Left Editorial Serif Statement */}
          <div className="absolute left-[2%] xl:left-[4%] top-[80px] max-w-[280px] xl:max-w-[320px] z-10 select-none">
            <h3 className="font-serif text-[36px] sm:text-[42px] xl:text-[48px] font-normal leading-[1.04] text-[#211B17] tracking-tight">
              You didnâ€™t start<br />
              photography to<br />
              manage spreadsheets.
            </h3>
          </div>

          {/* 2. Center Stressed Photographer */}
          <div className="absolute left-[48%] xl:left-[49%] -translate-x-1/2 bottom-0 z-15">
            <ChaosCharacter
              parallaxOffset={{
                x: mouseOffset.x * 4,
                y: mouseOffset.y * 2,
              }}
            />
          </div>

          {/* 3. Floating Chaos UI Cards (Spread out widely) */}
          <ChaosCards mouseOffset={mouseOffset} />

          {/* 4. Right Editorial Serif Statement */}
          <div className="absolute right-[2%] xl:right-[4%] top-[100px] max-w-[260px] xl:max-w-[300px] z-10 select-none text-left">
            <h3 className="font-serif text-[34px] sm:text-[38px] xl:text-[44px] font-normal leading-[1.06] text-[#211B17] tracking-tight">
              You started to<br />
              create memories.
            </h3>
          </div>
        </div>

        {/* MOBILE & TABLET VIEW (< 1024px) */}
        {/* Character in center, floating stickers & cards gracefully on sides with animations */}
        <div className="block lg:hidden w-full">
          <ChaosMobileScene />
        </div>
      </div>
    );
  }
);

ChaosScene.displayName = 'ChaosScene';

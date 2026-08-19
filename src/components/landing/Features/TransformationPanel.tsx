'use client';

import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { BeforeSide } from './BeforeSide';
import { AfterSide } from './AfterSide';
import { Page4StressedCharacter } from './Page4StressedCharacter';
import { Page4ConfidentCharacter } from './Page4ConfidentCharacter';

export interface TransformationPanelProps {
  mouseOffset?: { x: number; y: number };
}

export const TransformationPanel = forwardRef<HTMLDivElement, TransformationPanelProps>(
  ({ mouseOffset = { x: 0, y: 0 } }, ref) => {
    return (
      <div
        ref={ref}
        className="transformation-panel relative w-full bg-[#FCF6EC] border border-[#E9DCCA] rounded-[24px] lg:rounded-[28px] p-6 sm:p-8 lg:p-9 shadow-[0_12px_32px_rgba(33,27,23,0.04)] overflow-visible min-h-[380px] lg:min-h-[400px] flex items-center justify-between"
      >
        {/* ========================================================= */}
        {/* DESKTOP 2-COLUMN WITH CENTER OVERFLOWING CHARACTERS */}
        {/* ========================================================= */}
        <div className="hidden lg:flex w-full items-center justify-between relative z-10">
          {/* Left: BEFORE Side (Pinned to the far left) */}
          <div className="w-[310px] xl:w-[335px] z-15 flex-shrink-0">
            <BeforeSide />
          </div>

          {/* Stressed Photographer Character (Center-Left, completely clear of Before cards) */}
          <div className="absolute left-[38%] xl:left-[39%] -translate-x-1/2 bottom-[-25px] xl:bottom-[-30px] z-30 pointer-events-none">
            <Page4StressedCharacter
              parallaxOffset={{
                x: mouseOffset.x * 4,
                y: mouseOffset.y * 2,
              }}
            />
          </div>

          {/* Center Transformation Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/90 border border-[#E9DCCA] shadow-xs flex items-center justify-center text-[#211B17]">
              <ArrowRight className="w-3.5 h-3.5 text-[#211B17]" />
            </div>
          </div>

          {/* Confident Photographer Character (Center-Right, completely clear of After cards) */}
          <div className="absolute left-[62%] xl:left-[61%] -translate-x-1/2 bottom-[-25px] xl:bottom-[-30px] z-30 pointer-events-none">
            <Page4ConfidentCharacter
              parallaxOffset={{
                x: mouseOffset.x * -4,
                y: mouseOffset.y * -2,
              }}
            />
          </div>

          {/* Right: AFTER Side (Pinned to the far right) */}
          <div className="w-[310px] xl:w-[335px] z-15 flex-shrink-0 flex justify-end">
            <AfterSide />
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE / TABLET VERTICAL STORYTELLING VIEW */}
        {/* ========================================================= */}
        <div className="flex lg:hidden flex-col gap-8 w-full items-center">
          {/* BEFORE Section */}
          <div className="w-full flex flex-col items-center">
            <BeforeSide />
            <div className="mt-3 z-20">
              <Page4StressedCharacter />
            </div>
          </div>

          {/* Arrow */}
          <div className="w-9 h-9 rounded-full bg-white border border-[#E9DCCA] flex items-center justify-center shadow-xs">
            <ArrowRight className="w-4 h-4 text-[#211B17] transform rotate-90" />
          </div>

          {/* AFTER Section */}
          <div className="w-full flex flex-col items-center">
            <AfterSide />
            <div className="mt-3 z-20">
              <Page4ConfidentCharacter />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TransformationPanel.displayName = 'TransformationPanel';

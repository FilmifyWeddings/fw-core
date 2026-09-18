'use client';

import React from 'react';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';

interface DeviceSimulatorFrameProps {
  children: React.ReactNode;
}

export const DeviceSimulatorFrame: React.FC<DeviceSimulatorFrameProps> = ({ children }) => {
  const { activeDeviceView, setActiveDeviceView } = useSaraJoSmith();

  // Desktop / All: Render full-width canvas
  if (activeDeviceView === 'desktop' || activeDeviceView === 'all') {
    return (
      <div className="w-full transition-all duration-300">
        {children}
      </div>
    );
  }

  // Tablet: Simulated 768px Frame
  if (activeDeviceView === 'tablet') {
    return (
      <div className="w-full min-h-screen bg-zinc-950/80 py-10 px-4 flex flex-col items-center">
        {/* Device Label Bar */}
        <div className="mb-4 flex items-center justify-between w-[768px] max-w-full px-3 text-xs text-zinc-400 font-sjs-body">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-white">Tablet Simulator (768px)</span>
          </div>
          <button
            onClick={() => setActiveDeviceView('all')}
            className="text-[11px] underline hover:text-white cursor-pointer"
          >
            Switch to Full Width
          </button>
        </div>

        {/* Tablet Bezel Container */}
        <div className="relative w-[768px] max-w-full min-h-[900px] bg-[#EFECE3] rounded-2xl border-[12px] border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300">
          <div className="w-full h-full overflow-y-auto sjs-scrollbar">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Simulated 375px iPhone Frame
  return (
    <div className="w-full min-h-screen bg-zinc-950/85 py-8 px-4 flex flex-col items-center">
      {/* Device Label Bar */}
      <div className="mb-3 flex items-center justify-between w-[375px] max-w-full px-2 text-xs text-zinc-400 font-sjs-body">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-white">Mobile Simulator (375px)</span>
        </div>
        <button
          onClick={() => setActiveDeviceView('all')}
          className="text-[11px] underline hover:text-white cursor-pointer"
        >
          Exit to Full Width
        </button>
      </div>

      {/* iPhone Phone Bezel Container */}
      <div className="relative w-[375px] max-w-full h-[812px] bg-[#EFECE3] rounded-[44px] border-[10px] border-zinc-900 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 flex flex-col">
        {/* Dynamic Island / Speaker Notch at Top */}
        <div className="w-full h-8 bg-[#EFECE3] relative z-30 shrink-0 flex items-center justify-center pt-1">
          <div className="w-28 h-4 bg-black rounded-full flex items-center justify-end pr-2">
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
          </div>
        </div>

        {/* Scrollable Mobile Screen Content */}
        <div className="flex-1 w-full overflow-y-auto sjs-scrollbar">
          {children}
        </div>

        {/* Home Indicator Bar at Bottom */}
        <div className="w-full h-5 bg-[#EFECE3] relative z-30 shrink-0 flex items-center justify-center pb-1 pointer-events-none">
          <div className="w-32 h-1 bg-black/60 rounded-full" />
        </div>
      </div>
    </div>
  );
};

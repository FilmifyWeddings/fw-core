'use client';

import React from 'react';

interface LoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export default function StudioCoreLiquidLoader({ 
  label = "Loading StudioCore...", 
  fullscreen = true 
}: LoaderProps) {
  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-[9999]' : 'w-full py-16'} flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-md`}>
      {/* 3D Liquid Monogram Container */}
      <div className="relative w-20 h-20 rounded-2xl bg-white/90 p-2 shadow-[0_20px_50px_rgba(245,158,11,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-amber-100 flex items-center justify-center overflow-hidden">
        {/* Amber Liquid Wave Animation */}
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 opacity-90 animate-liquid-rise">
            <div className="absolute -top-2.5 inset-x-0 h-3.5 bg-amber-400 opacity-75 rounded-[40%] animate-wave-churn" />
          </div>
        </div>

        {/* 3D "SC" Monogram */}
        <div className="relative z-10 flex items-center justify-center select-none">
          <span className="text-2xl font-black tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
            SC
          </span>
        </div>

        {/* Gloss highlight */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-2xl pointer-events-none" />
      </div>

      {/* Dynamic Module Label */}
      <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-slate-500 animate-pulse">
        {label}
      </p>
    </div>
  );
}

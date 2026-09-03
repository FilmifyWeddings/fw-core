'use client';

import React from 'react';

export default function StudioCoreLiquidLoader({ label = "Loading StudioCore..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-md">
      {/* 3D Container with soft lighting & depth shadow */}
      <div className="relative w-24 h-24 rounded-3xl bg-white/90 p-2 shadow-[0_20px_50px_rgba(245,158,11,0.2),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-amber-100 flex items-center justify-center overflow-hidden">
        
        {/* Ambient 3D Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        {/* Liquid Fill Canvas */}
        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
          {/* Animated Liquid Wave */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 opacity-90 animate-liquid-rise">
            <div className="absolute -top-3 inset-x-0 h-4 bg-amber-400 opacity-70 rounded-[40%] animate-wave-churn" />
          </div>
        </div>

        {/* Cutout "SC" StudioCore Logo Monogram */}
        <div className="relative z-10 flex items-center justify-center select-none">
          <span className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            SC
          </span>
        </div>

        {/* Glass reflection highlight overlay */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-3xl pointer-events-none" />
      </div>

      {/* Subtle pulse label */}
      <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
        {label}
      </p>
    </div>
  );
}

'use client';

import React from 'react';

export const HeroBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20 bg-[#FFFDF8]">
      {/* Subtle Paper Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.45] subtle-paper-texture"
        aria-hidden="true"
      />

      {/* Warm Ambient Glow behind Dashboard and Character */}
      <div
        className="absolute top-[15%] left-[40%] -translate-x-1/2 w-[750px] h-[550px] rounded-full bg-gradient-to-tr from-[#F8EEDA]/60 via-[#FAF4EA]/40 to-transparent blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Left Botanical Accent */}
      <div
        className="absolute -top-16 -left-16 w-[340px] h-[340px] opacity-[0.14] rotate-180 select-none pointer-events-none"
        aria-hidden="true"
      >
        <img
          src="/assets/backgrounds/hero-botanical.svg"
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      {/* Bottom Right Botanical Accent */}
      <div
        className="absolute -bottom-12 -right-12 sm:-bottom-8 sm:-right-8 w-[420px] sm:w-[500px] h-[420px] sm:h-[500px] opacity-[0.18] select-none pointer-events-none"
        aria-hidden="true"
      >
        <img
          src="/assets/backgrounds/hero-botanical.svg"
          alt=""
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

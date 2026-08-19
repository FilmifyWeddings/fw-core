'use client';

import React from 'react';

export const SolutionTransition: React.FC = () => {
  return (
    <div className="relative w-full h-16 flex items-center justify-center pointer-events-none -my-6 z-10">
      {/* Soft divider line & glow */}
      <div className="w-[85%] max-w-[1200px] h-px bg-gradient-to-r from-transparent via-[#E9DFD2] to-transparent opacity-80" />
    </div>
  );
};

'use client';

import React from 'react';

/**
 * 1. TORN PAPER EDGE (From User Photo 1)
 * Renders an organic ragged torn paper rip effect separating the hero photo from content.
 */
export function TornPaperEdge({
  color = '#FFFFFF',
  className = '',
  isAnimated = true,
}: {
  color?: string;
  className?: string;
  isAnimated?: boolean;
}) {
  return (
    <div className={`w-full overflow-hidden leading-none select-none pointer-events-none relative ${className}`}>
      <style>{`
        @keyframes paperTearWiggle {
          0% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-4px) scaleY(1.06) skewX(-0.3deg); }
          100% { transform: translateY(0px) scaleY(1); }
        }
      `}</style>

      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="w-full h-12 sm:h-20 md:h-28 block filter drop-shadow-[0_-12px_20px_rgba(0,0,0,0.35)]"
        style={isAnimated ? { animation: 'paperTearWiggle 8s ease-in-out infinite' } : undefined}
      >
        <defs>
          <linearGradient id="tornPaperEdgeShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="40%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>

        {/* 1. Underlying Deep Rip Shadow */}
        <path
          d="M0,38 L30,46 L65,28 L105,42 L145,24 L190,44 L235,27 L285,46 L335,26 L385,44 L435,25 L485,45 L540,26 L595,47 L650,28 L705,48 L765,27 L825,46 L880,26 L935,47 L995,28 L1055,48 L1115,26 L1175,47 L1235,27 L1295,48 L1350,28 L1400,45 L1440,32 L1440,80 L0,80 Z"
          fill="rgba(0, 0, 0, 0.25)"
        />

        {/* 2. Main Deckle-Edged Torn Paper Body */}
        <path
          d="M0,30 L28,40 L62,22 L102,36 L142,18 L188,38 L232,20 L282,40 L332,19 L382,38 L432,18 L482,39 L538,20 L592,41 L648,21 L702,42 L762,21 L822,40 L878,19 L932,41 L992,21 L1052,42 L1112,19 L1172,41 L1232,20 L1292,42 L1348,21 L1398,39 L1440,25 L1440,80 L0,80 Z"
          fill={color}
        />

        {/* 3. Raw Fibrous Edge Stroke (Simulates hand-torn paper grain) */}
        <path
          d="M0,30 L28,40 L62,22 L102,36 L142,18 L188,38 L232,20 L282,40 L332,19 L382,38 L432,18 L482,39 L538,20 L592,41 L648,21 L702,42 L762,21 L822,40 L878,19 L932,41 L992,21 L1052,42 L1112,19 L1172,41 L1232,20 L1292,42 L1348,21 L1398,39 L1440,25"
          fill="none"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1.6"
          strokeDasharray="2,3,1,2.5,4"
        />
      </svg>
    </div>
  );
}

/**
 * 2. 3D FLOWING SILK VEIL (User Concept 3)
 * Renders multi-layered undulating white silk bridal veil fabric floating gracefully in the wind along the footer.
 */
export function FlowingSilkVeil({
  className = '',
  baseBgColor = '#FAF9F5',
}: {
  className?: string;
  baseBgColor?: string;
}) {
  return (
    <div className={`w-full overflow-hidden leading-none select-none pointer-events-none relative ${className}`}>
      <style>{`
        @keyframes silkWaveBack {
          0% { transform: translateX(0%) scaleY(1); }
          50% { transform: translateX(-4%) scaleY(1.14) skewY(-0.7deg); }
          100% { transform: translateX(0%) scaleY(1); }
        }
        @keyframes silkWaveMid {
          0% { transform: translateX(0%) scaleY(1); }
          50% { transform: translateX(4%) scaleY(1.18) skewY(1deg); }
          100% { transform: translateX(0%) scaleY(1); }
        }
        @keyframes silkWaveFore {
          0% { transform: translateX(0%) scaleY(1); }
          50% { transform: translateX(-2%) scaleY(1.1) skewY(-0.4deg); }
          100% { transform: translateX(0%) scaleY(1); }
        }
        @keyframes floatGossamerParticle {
          0% { transform: translateY(0px) scale(0.9); opacity: 0.4; }
          50% { transform: translateY(-24px) scale(1.1) rotate(6deg); opacity: 0.85; }
          100% { transform: translateY(0px) scale(0.9); opacity: 0.4; }
        }
      `}</style>

      {/* Floating gossamer translucent veil particles */}
      <div className="absolute inset-x-0 bottom-12 h-24 overflow-hidden pointer-events-none flex justify-around">
        <div
          className="w-20 h-10 rounded-full bg-white/20 blur-md"
          style={{ animation: 'floatGossamerParticle 7s ease-in-out infinite' }}
        />
        <div
          className="w-32 h-12 rounded-full bg-white/25 blur-lg"
          style={{ animation: 'floatGossamerParticle 9.5s ease-in-out infinite 2s' }}
        />
        <div
          className="w-24 h-10 rounded-full bg-white/18 blur-md"
          style={{ animation: 'floatGossamerParticle 8.2s ease-in-out infinite 4s' }}
        />
      </div>

      <svg
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        className="w-full h-24 sm:h-36 md:h-44 block relative z-10"
      >
        <defs>
          <linearGradient id="silkSheerGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.0)" />
            <stop offset="40%" stopColor="rgba(255, 255, 255, 0.35)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.75)" />
          </linearGradient>

          <linearGradient id="silkSheerGradMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.0)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.55)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.92)" />
          </linearGradient>

          <linearGradient id="silkSheerGradFore" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.0)" />
            <stop offset="25%" stopColor="rgba(255, 255, 255, 0.85)" />
            <stop offset="65%" stopColor="rgba(255, 255, 255, 0.98)" />
            <stop offset="100%" stopColor={baseBgColor} />
          </linearGradient>
        </defs>

        {/* Layer 1: Translucent Back Silk Wave */}
        <path
          d="M0,90 C220,140 440,40 720,80 C1000,120 1220,50 1440,90 L1440,180 L0,180 Z"
          fill="url(#silkSheerGradBack)"
          style={{ animation: 'silkWaveBack 10s ease-in-out infinite' }}
        />

        {/* Layer 2: Billowing Mid Silk Folds */}
        <path
          d="M0,110 C240,60 480,140 760,100 C1040,60 1260,130 1440,105 L1440,180 L0,180 Z"
          fill="url(#silkSheerGradMid)"
          style={{ animation: 'silkWaveMid 7.5s ease-in-out infinite' }}
        />

        {/* Layer 3: Foreground Luminous Silk Crest */}
        <path
          d="M0,135 C260,100 520,155 780,125 C1040,95 1280,145 1440,128 L1440,180 L0,180 Z"
          fill="url(#silkSheerGradFore)"
          style={{ animation: 'silkWaveFore 5.8s ease-in-out infinite' }}
        />

        {/* Specular Silk Glisten Line */}
        <path
          d="M0,135 C260,100 520,155 780,125 C1040,95 1280,145 1440,128"
          fill="none"
          stroke="rgba(255, 255, 255, 0.95)"
          strokeWidth="2.5"
          filter="drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))"
        />
      </svg>
    </div>
  );
}

/**
 * 3. MONOCHROME PORTAL ACCENTS (From User Photo 2)
 * Helper decorative sparkle star badge and orbiting celestial elements.
 */
export function SparkleStar({ className = 'w-3.5 h-3.5 text-amber-300' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

/**
 * 4. WASHI TAPE (From User Photo 1: Vintage Scrapbook)
 * Realistic semi-transparent frosted adhesive masking tape with torn edges.
 */
export function WashiTape({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-6 sm:h-7 w-24 sm:w-32 bg-amber-50/75 backdrop-blur-[2px] border-y border-amber-200/40 shadow-xs pointer-events-none select-none ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)',
        clipPath: 'polygon(0% 4%, 3% 0%, 97% 0%, 100% 4%, 99% 96%, 96% 100%, 4% 100%, 0% 96%)',
      }}
    />
  );
}

/**
 * 5. HAND-DRAWN OVAL DATE STAMP (From User Photo 1: Vintage Scrapbook)
 * Authentic hand-sketched looping double oval surrounding the event date.
 */
export function HandDrawnOval({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-3 ${className}`}>
      <svg
        viewBox="0 0 280 70"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      >
        <path
          d="M 16,35 C 16,12 264,10 264,35 C 264,60 12,62 12,35 C 12,16 250,14 270,32"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-10 whitespace-nowrap leading-none flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * 6. FACE AI FOCUS ICON (From User Photo 4)
 * Precision SVG camera autofocus bracket icon with outlined smiling face.
 * Uses currentColor to dynamically inherit palette theme colors.
 */
export function FaceAiFocusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 4 Camera Autofocus Viewfinder Corners */}
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />

      {/* Head / Face Outline with Hair Curve */}
      <path d="M7 11c-.3-3.8 2-6.8 5-6.8s5.2 2.8 5.2 6.5c.5.8.5 2-.1 3.2C16 16 14.2 19.5 12 19.5s-4-3.5-5.1-5.7c-.5-.9-.5-2.1.1-2.8Z" />

      {/* Forehead Hair Fringe */}
      <path d="M14.5 7.5C13.8 9.2 11.8 10.8 7.5 11" />

      {/* Smiling Eyes */}
      <path d="M8.5 13.2c.3-.9 1.7-.9 2 0" />
      <path d="M13.5 13.2c.3-.9 1.7-.9 2 0" />

      {/* Open Friendly Smile */}
      <path d="M10 15.8h4c0 1.8-1.2 2-2 2s-2-.2-2-2Z" />
    </svg>
  );
}


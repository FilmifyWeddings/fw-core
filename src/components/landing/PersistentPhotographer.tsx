'use client';

import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export function PersistentPhotographer() {
  const { scrollYProgress } = useScroll();

  // Smooth physics spring for buttery 60fps movement across viewports
  const smoothY = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.8 });

  // SECTION 1 (Hero -> Scroll start 0 to 0.15):
  // Photographer starts at bottom-left corner of screen, slightly overlapping Hero for depth.
  // x: '4vw' → '72vw' (Travels horizontally across screen to Section 2 right side)
  // y: '62vh' → '78vh' (Translates downwards into Section 2 viewport smoothly)
  // scale: 1 → 0.9 (Consistent perspective)
  // rotate: 0deg → 4deg → -2deg → 0deg (Natural walking/sliding motion feel)

  const x = useTransform(smoothY, [0, 0.22, 0.45], ['4vw', '76vw', '76vw']);
  const y = useTransform(smoothY, [0, 0.22, 0.45], ['54vh', '70vh', '70vh']);
  const scale = useTransform(smoothY, [0, 0.22, 0.45], [1, 0.88, 0.88]);
  const rotate = useTransform(smoothY, [0, 0.05, 0.15, 0.22], [0, 4, -3, 0]);

  // Subtle floating idle motion (2-4px movement) when stationary
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x,
        y,
        scale,
        rotate,
        zIndex: 45,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
      }}
      className="w-44 sm:w-56 md:w-72 lg:w-[320px] select-none"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          repeat: Infinity,
          duration: 3.2,
          ease: 'easeInOut',
        }}
        className="relative drop-shadow-[0_15px_30px_rgba(0,0,0,0.18)]"
      >
        <img
          src="/photographer-character.png"
          alt="StudioCore Photographer Character"
          className="w-full h-auto object-contain pointer-events-none"
        />
      </motion.div>
    </motion.div>
  );
}

'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { PortfolioItem } from '@/data/saraJoSmithConfig';

interface LightboxModalProps {
  item: PortfolioItem | null;
  items: PortfolioItem[];
  onClose: () => void;
  onNavigate: (item: PortfolioItem) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  item,
  items,
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        const currentIndex = items.findIndex((i) => i.id === item.id);
        const nextIndex = (currentIndex + 1) % items.length;
        onNavigate(items[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = items.findIndex((i) => i.id === item.id);
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        onNavigate(items[prevIndex]);
      }
    };

    if (item) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, items, onClose, onNavigate]);

  if (!item) return null;

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const nextItem = items[(currentIndex + 1) % items.length];
  const prevItem = items[(currentIndex - 1 + items.length) % items.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Close Button Top Right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-8 z-50 text-white/80 hover:text-white p-2 focus:outline-none"
        aria-label="Close lightbox"
      >
        <span className="font-sjs-heading text-3xl uppercase tracking-widest leading-none">✕</span>
      </button>

      {/* Prev Arrow */}
      <button
        onClick={() => onNavigate(prevItem)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none"
        aria-label="Previous photograph"
      >
        ←
      </button>

      {/* Next Arrow */}
      <button
        onClick={() => onNavigate(nextItem)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none"
        aria-label="Next photograph"
      >
        →
      </button>

      {/* Main Photograph & Caption */}
      <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
        <div className="relative w-[85vw] max-w-[700px] h-[65vh] max-h-[650px] shadow-2xl">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 85vw, 700px"
            priority
          />
        </div>

        {/* Caption */}
        <div className="text-center text-white mt-4 max-w-lg">
          <span className="font-sjs-body text-[10px] uppercase tracking-[0.25em] text-[#C6B495]">
            {item.location || item.category}
          </span>
          <h3 className="font-sjs-heading text-xl sm:text-2xl uppercase tracking-wider text-white mt-0.5">
            {item.title}
          </h3>
          {item.caption && (
            <p className="font-sjs-body text-xs text-white/70 italic mt-1">
              {item.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

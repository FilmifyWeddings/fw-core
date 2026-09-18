'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { config } = useSaraJoSmith();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-[#292421]/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-in drawer container */}
      <div
        className="relative w-full max-w-[420px] h-full bg-[#EFECE3] shadow-2xl flex flex-col justify-between p-8 md:p-12 z-10 border-l border-[#292421]/15 overflow-y-auto animate-in slide-in-from-right duration-400"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header inside drawer: Monogram & Close Button */}
        <div className="flex items-start justify-between">
          <div className="relative w-20 h-24">
            <Image
              src={config.assets.drawerMonogram}
              alt="Sara Jo Smith Monogram"
              fill
              className="object-contain"
              sizes="96px"
            />
          </div>

          <button
            onClick={onClose}
            className="group flex flex-col items-center justify-center p-2 focus:outline-none cursor-pointer"
            aria-label="Close menu"
          >
            <span className="font-sjs-heading text-xl md:text-2xl text-[#292421] uppercase tracking-[0.05em] group-hover:opacity-70 transition-opacity">
              close
            </span>
            <span className="font-sjs-heading text-sm md:text-base text-[#292421] uppercase tracking-[0.05em] -mt-1 group-hover:opacity-70 transition-opacity">
              menu
            </span>
          </button>
        </div>

        {/* Central Navigation Links (Large Editorial Serif) */}
        <nav className="my-auto py-8 space-y-6 md:space-y-8 text-center md:text-left">
          {config.navigation.main.map((item) => (
            <div key={item.label} className="overflow-hidden">
              <button
                onClick={() => {
                  onNavigate(item.label);
                  onClose();
                }}
                className="group block w-full text-left font-sjs-heading text-3xl md:text-4xl lg:text-5xl uppercase tracking-[0.03em] text-[#292421] hover:text-[#5B5835] transition-colors py-1 cursor-pointer"
              >
                <span className="relative inline-block">
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#292421] group-hover:w-full transition-all duration-300" />
                </span>
              </button>
            </div>
          ))}
        </nav>

        {/* Bottom Social Links & Brand Stamp Detail */}
        <div className="pt-6 border-t border-[#292421]/15 flex items-center justify-between">
          {/* Social Icons / Links */}
          <div className="flex items-center space-x-5">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#292421] hover:opacity-70 transition-opacity"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/sarajosmithphotography"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#292421] hover:opacity-70 transition-opacity"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:sarajosmithphotography@gmail.com"
              className="text-[#292421] hover:opacity-70 transition-opacity"
              aria-label="Email"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>
          </div>

          {/* Location note */}
          <span className="font-sjs-body text-[11px] uppercase tracking-[0.1em] text-[#292421]/60">
            {config.meta.location}
          </span>
        </div>
      </div>
    </div>
  );
};

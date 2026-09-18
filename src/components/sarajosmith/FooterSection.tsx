'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';

interface FooterSectionProps {
  onNavigate: (sectionId: string) => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({ onNavigate }) => {
  const { config } = useSaraJoSmith();
  const { meta } = config;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#292421] text-[#EFECE3] pt-14 pb-12 px-6 sm:px-10 md:px-16 border-t border-white/10">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Main 3-Column Footer Body (Matching Screenshot 3) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-between pb-12">
          {/* Left: Navigation Menu Items */}
          <nav className="flex flex-col items-center md:items-start space-y-2.5 text-center md:text-left">
            <button
              onClick={() => onNavigate('hero')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              HOME
            </button>
            <button
              onClick={() => onNavigate('collections')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              COLLECTIONS
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              PORTFOLIO
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="font-sjs-body text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              CONTACT
            </button>
          </nav>

          {/* Center: Botanical White Line-Art Flower Emblem */}
          <div className="flex flex-col items-center justify-center cursor-pointer" onClick={scrollToTop} title="Back to top">
            <div className="relative w-14 h-20 sm:w-16 sm:h-24 opacity-95 transition-transform duration-300 hover:scale-105">
              <Image
                src="https://static.showit.co/1200/VWytsJHE7pF8YE5yDVanxQ/298575/sjsp_brand_element_3.png"
                alt="Sara Jo Smith Flower Emblem"
                fill
                className="object-contain filter brightness-0 invert"
                sizes="64px"
              />
            </div>
          </div>

          {/* Right: Specialty Narrative Statement */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right max-w-sm ml-auto">
            <EditableText
              path="meta.description"
              elementKey="footer-bio-desc-dark"
              fallbackText="SARA JO SMITH SPECIALIZES IN WEDDING AND ELOPEMENT PHOTOGRAPHY, BASED IN GEORGIA, AND TRAVELS FOR LOVE."
              as="p"
              multiline
              className="font-sjs-body text-[11px] sm:text-xs uppercase tracking-[0.16em] text-white/80 leading-relaxed"
              defaultSizePx={11}
            />
          </div>
        </div>

        {/* Back to top link */}
        <button
          onClick={scrollToTop}
          className="my-4 flex items-center space-x-2 font-sjs-body text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <span>↑</span>
          <span>BACK TO TOP</span>
        </button>

        {/* Bottom Copyright & Credits */}
        <div className="w-full pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-[10px] font-sjs-body text-white/50 tracking-wider">
          <EditableText
            path="meta.copyright"
            elementKey="footer-copyright-text"
            fallbackText="ALL CONTENT COPYRIGHT © 2025 SARA JO SMITH PHOTOGRAPHY"
            as="p"
            defaultSizePx={10}
          />
          <a
            href={meta.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            {meta.credit.text}
          </a>
        </div>
      </div>
    </footer>
  );
};

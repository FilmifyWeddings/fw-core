'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { soundCtrl } from './SoundController';
import { useCurrency, CurrencyCode } from './CurrencyContext';
import { 
  Globe, ArrowUpRight, Crown, Sparkles, Send, 
  MapPin, Phone, Mail, Check
} from 'lucide-react';

interface FooterSectionProps {
  onOpenBooking: () => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({ onOpenBooking }) => {
  const { currency, setCurrency } = useCurrency();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    soundCtrl.playChime(660);
    setNewsletterSubscribed(true);
  };

  return (
    <footer className="relative w-full bg-[#FAF6F0] border-t border-[#EADCC9] text-[#2A2723] pt-20 pb-12 select-none overflow-hidden">
      
      {/* Top Banner: Brand Statement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 border-b border-[#EADCC9]">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-serif tracking-[0.3em] uppercase text-[#D4AF37]">
                बी क्वीन कर्टेल • राजसी विरासत
              </span>
            </div>
            <h2
              className="text-4xl sm:text-6xl font-serif tracking-[0.14em] uppercase text-[#2A2723]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              BEE QUEEN CURTAIL
            </h2>
            <p className="mt-2 text-sm sm:text-base font-serif italic text-[#2A2723]/70 max-w-lg">
              The Royal Silhouette of Timeless Couture. Woven by master ancestral artisans for sovereign brides of the world.
            </p>
          </div>

          {/* Quick VIP Action */}
          <button
            onClick={() => {
              soundCtrl.playClick();
              onOpenBooking();
            }}
            className="px-8 py-3.5 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans font-semibold tracking-[0.2em] uppercase border border-[#D4AF37] hover:bg-[#FAF5EC] hover:text-[#2A2723] transition-all shadow-md"
          >
            Inquire Bespoke Commission
          </button>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12 border-b border-[#EADCC9]">
        
        {/* Col 1: Flagship Salons */}
        <div>
          <span className="text-[11px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold block mb-4">
            Atelier Flagships
          </span>
          <ul className="space-y-4 text-xs font-sans text-[#2A2723]/80">
            <li>
              <strong className="text-[#2A2723] block font-serif text-sm">The Imperial Pavilion</strong>
              <span>Chanakyapuri, New Delhi 110021</span>
            </li>
            <li>
              <strong className="text-[#2A2723] block font-serif text-sm">Mayfair Haute Salon</strong>
              <span>14 Old Bond Street, London W1S 4PP</span>
            </li>
            <li>
              <strong className="text-[#2A2723] block font-serif text-sm">Fifth Avenue Suite</strong>
              <span>740 Fifth Avenue, Manhattan, NY 10019</span>
            </li>
          </ul>
        </div>

        {/* Col 2: Navigation Anchors */}
        <div>
          <span className="text-[11px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold block mb-4">
            The Collections
          </span>
          <ul className="space-y-2.5 text-xs font-sans text-[#2A2723]/80">
            {['Runway 3D Showcase', 'The Atelier & Archives', 'Virtual Dressing Room', 'Imperial Heritage Story', 'Worldwide VIP Services'].map((item, idx) => {
              const hrefs = ['#runway', '#atelier', '#virtual-fitting', '#heritage', '#vip-services'];
              return (
                <li key={item}>
                  <a
                    href={hrefs[idx]}
                    onClick={() => soundCtrl.playClick()}
                    className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 group"
                  >
                    <span>{item}</span>
                    <ArrowUpRight className="w-3 h-3 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Col 3: Currency & Global Regions */}
        <div>
          <span className="text-[11px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold block mb-4">
            Currency & Region
          </span>
          <p className="text-xs font-sans text-[#2A2723]/70 mb-3">
            Prices adapt dynamically across international sovereign financial jurisdictions.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['INR', 'USD', 'EUR', 'GBP', 'AED'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  soundCtrl.playClick();
                  setCurrency(c);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans uppercase font-medium border transition-all ${
                  currency === c
                    ? 'bg-[#2A2723] text-[#FAF8F3] border-[#2A2723]'
                    : 'bg-[#FBF8F3] text-[#2A2723]/75 border-[#EADCC9] hover:border-[#D4AF37]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4 text-[11px] font-sans text-[#2A2723]/60 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Worldwide Insured White-Glove Transit</span>
          </div>
        </div>

        {/* Col 4: Atelier VIP Gazette Newsletter */}
        <div>
          <span className="text-[11px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold block mb-4">
            The Royal Gazette
          </span>
          <p className="text-xs font-sans text-[#2A2723]/70 mb-4">
            Receive private preview invitations to sovereign bridal unveilings and private trunk shows.
          </p>

          {!newsletterSubscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#FBF8F3] border border-[#EADCC9] text-xs font-sans text-[#2A2723] focus:border-[#D4AF37] focus:outline-none pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#2A2723] text-[#FAF8F3] hover:bg-[#D4AF37] transition-colors"
                  aria-label="Subscribe"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#D4AF37]/50 flex items-center gap-2 text-xs font-sans text-[#2A2723]">
              <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>You are inscribed in the Royal Archive register.</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4 text-[#2A2723]/70">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#D4AF37] transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <span className="text-xs font-serif italic text-[#2A2723]/60">
              #BeeQueenCurtail • #RoyalBridalCouture
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Craft Preservation Note */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-sans text-[#2A2723]/60 gap-4">
        <div>
          © 2026 Bee Queen Curtail (बी क्वीन कर्टेल). All Rights Reserved. Master Heritage Guild Member.
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-[#D4AF37] cursor-pointer">Heritage Craft Foundation</span>
          <span className="hover:text-[#D4AF37] cursor-pointer">Privacy Accord</span>
          <span className="hover:text-[#D4AF37] cursor-pointer">Terms of Salon</span>
        </div>
      </div>
    </footer>
  );
};

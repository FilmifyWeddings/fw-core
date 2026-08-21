'use client';

import React, { useState } from 'react';
import { Send, Heart } from 'lucide-react';

// Social SVG Icons
const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const PinterestIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="9" x2="12" y2="21" />
    <path d="M8 12a4 4 0 1 1 8 0c0 3-2 5.5-4.5 5.5S8 15 8 12z" />
  </svg>
);

const WhatsAppSocialIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const FooterSection: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert('Thank you for subscribing to StudioCore updates!');
      setEmail('');
    }
  };

  return (
    <footer className="w-full bg-[#FFFDF8] border-t border-[#E9E0D4] pt-16 pb-10 select-none">
      <div className="w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-14">
        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-14 border-b border-[#F0E8DC]">
          {/* Brand Info (Left) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[26px] sm:text-[28px] font-extrabold tracking-[-0.035em] leading-none text-[#211B17] flex items-center">
                Studio<span className="text-[#C89435] font-extrabold ml-0.5">Core</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C89435] ml-1 mb-1 animate-pulse" />
              </span>
            </div>
            <div className="text-[8.5px] sm:text-[9px] uppercase tracking-[0.16em] font-semibold text-[#8C6D33] mb-4">
              FOCUS ON ART, WE MANAGE
            </div>
            <p className="text-[13px] text-[#746E67] leading-relaxed max-w-sm mb-6">
              Built for wedding photographers and cinematographers who want to streamline operations, save 10+ hours a week, and scale their business.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a
                href="#instagram"
                className="w-8 h-8 rounded-full bg-[#FAF7F1] border border-[#E9E0D4] text-[#746E67] hover:text-[#C89435] hover:border-[#C89435] flex items-center justify-center transition-all duration-200"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="#facebook"
                className="w-8 h-8 rounded-full bg-[#FAF7F1] border border-[#E9E0D4] text-[#746E67] hover:text-[#C89435] hover:border-[#C89435] flex items-center justify-center transition-all duration-200"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a
                href="#youtube"
                className="w-8 h-8 rounded-full bg-[#FAF7F1] border border-[#E9E0D4] text-[#746E67] hover:text-[#C89435] hover:border-[#C89435] flex items-center justify-center transition-all duration-200"
                aria-label="YouTube"
              >
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a
                href="#pinterest"
                className="w-8 h-8 rounded-full bg-[#FAF7F1] border border-[#E9E0D4] text-[#746E67] hover:text-[#C89435] hover:border-[#C89435] flex items-center justify-center transition-all duration-200"
                aria-label="Pinterest"
              >
                <PinterestIcon className="w-4 h-4" />
              </a>
              <a
                href="#whatsapp"
                className="w-8 h-8 rounded-full bg-[#FAF7F1] border border-[#E9E0D4] text-[#746E67] hover:text-[#C89435] hover:border-[#C89435] flex items-center justify-center transition-all duration-200"
                aria-label="WhatsApp"
              >
                <WhatsAppSocialIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-[13.5px] font-bold text-[#211B17] mb-4 tracking-wide">Product</h4>
            <ul className="space-y-2.5 text-[12.5px] text-[#746E67]">
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Features</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">CRM</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Automation</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Quotations</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Team Management</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Payments</a></li>
              <li><a href="#features" className="hover:text-[#C89435] transition-colors">Post-production</a></li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="text-[13.5px] font-bold text-[#211B17] mb-4 tracking-wide">Company</h4>
            <ul className="space-y-2.5 text-[12.5px] text-[#746E67]">
              <li><a href="#about" className="hover:text-[#C89435] transition-colors">About Us</a></li>
              <li><a href="#careers" className="hover:text-[#C89435] transition-colors">Careers</a></li>
              <li><a href="#contact" className="hover:text-[#C89435] transition-colors">Contact Us</a></li>
              <li><a href="#blog" className="hover:text-[#C89435] transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Column 3: Resources & Legal */}
          <div>
            <h4 className="text-[13.5px] font-bold text-[#211B17] mb-4 tracking-wide">Resources</h4>
            <ul className="space-y-2.5 text-[12.5px] text-[#746E67] mb-6">
              <li><a href="#help" className="hover:text-[#C89435] transition-colors">Help Center</a></li>
              <li><a href="#guides" className="hover:text-[#C89435] transition-colors">Guides</a></li>
              <li><a href="#templates" className="hover:text-[#C89435] transition-colors">Templates</a></li>
              <li><a href="#webinars" className="hover:text-[#C89435] transition-colors">Webinars</a></li>
            </ul>

            <h4 className="text-[13.5px] font-bold text-[#211B17] mb-3 tracking-wide">Legal</h4>
            <ul className="space-y-2 text-[12px] text-[#99928A]">
              <li><a href="/privacy-policy" className="hover:text-[#C89435] transition-colors">Privacy Policy</a></li>
              <li><a href="/data-deletion" className="hover:text-[#C89435] transition-colors">User Data Deletion</a></li>
              <li><a href="/terms-of-service" className="hover:text-[#C89435] transition-colors">Terms of Service</a></li>
              <li><a href="/support" className="hover:text-[#C89435] transition-colors">Refund & Support Policy</a></li>
            </ul>
          </div>

          {/* Column 4: Stay Updated */}
          <div>
            <h4 className="text-[13.5px] font-bold text-[#211B17] mb-2 tracking-wide">Stay Updated</h4>
            <p className="text-[12px] text-[#746E67] leading-relaxed mb-4">
              Get tips, updates and resources for your photography business.
            </p>

            <form onSubmit={handleSubmit} className="flex items-center gap-1 bg-[#FAF7F1] p-1 rounded-full border border-[#E9E0D4] focus-within:border-[#C89435]">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-transparent text-[12px] text-[#211B17] focus:outline-none placeholder-[#99928A]"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-[#C89435] hover:bg-[#B3832D] text-white flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
                aria-label="Subscribe"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Copyright & Centered "Made with Love in India" */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px] text-[#99928A]">
          <div>
            © {new Date().getFullYear()} StudioCore. All rights reserved.
          </div>

          {/* Centered Made with Love in India */}
          <div className="flex items-center justify-center gap-1.5 font-medium text-[#746E67] bg-[#FAF7F1] px-4 py-1 rounded-full border border-[#E9E0D4]">
            <span>Made with Love</span>
            <Heart className="w-3.5 h-3.5 fill-[#E53935] text-[#E53935] inline-block animate-pulse" />
            <span className="font-semibold text-[#211B17]">in India</span>
            <span>🇮🇳</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="/privacy-policy" className="hover:text-[#C89435] transition-colors">Privacy</a>
            <a href="/terms-of-service" className="hover:text-[#C89435] transition-colors">Terms</a>
            <a href="/support" className="hover:text-[#C89435] transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

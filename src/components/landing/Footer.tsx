'use client';

import React from 'react';
import Link from 'next/link';
import { Database, Heart, ArrowUpRight } from 'lucide-react';
import { Instagram, Facebook, Linkedin, Youtube, Github } from './SocialIcons';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const handleNavClick = (pageSlug: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate(pageSlug);
    } else {
      window.location.href = pageSlug === 'home' ? '/' : `/${pageSlug}`;
    }
  };

  return (
    <footer className="bg-[#FAF8F5] dark:bg-[#0C0B0A] border-t border-[#EAE3D2] dark:border-[#2C2926] pt-16 pb-12 relative">
      
      {/* GOLD SHIMMER TOP BORDER */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-16 border-b border-[#EAE3D2] dark:border-[#2C2926]">
          
          {/* BRAND COLUMN */}
          <div className="md:col-span-4 space-y-4">
            <Link 
              href="/" 
              onClick={(e) => handleNavClick('home', e)}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#C5A059] to-[#9A7B32] p-[1px] shadow-sm">
                <div className="w-full h-full bg-[#FAF8F5] dark:bg-[#141210] rounded-[11px] flex items-center justify-center">
                  <Database className="w-5 h-5 text-[#B89047]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5] font-serif">
                  Studio<span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">Core</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#B89047]">
                  Wedding Studio OS
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] font-medium max-w-sm leading-relaxed">
              The premier all-in-one CRM, WhatsApp automation & post-production platform built exclusively for wedding photographers, cinematographers, and luxury studios.
            </p>

            {/* SOCIAL ICONS */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: Instagram, href: 'https://instagram.com' },
                { icon: Facebook, href: 'https://facebook.com' },
                { icon: Linkedin, href: 'https://linkedin.com' },
                { icon: Youtube, href: 'https://youtube.com' },
                { icon: Github, href: 'https://github.com' },
              ].map((s, idx) => {
                const IconComp = s.icon;
                return (
                  <a
                    key={idx}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] text-[#7A756E] hover:text-[#B89047] hover:border-[#D4AF37] flex items-center justify-center transition-all shadow-xs"
                  >
                    <IconComp className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: FEATURES */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#1A1917] dark:text-white font-serif">Product</div>
            <ul className="space-y-2 text-xs font-medium text-[#5A554E] dark:text-[#C5C0B8]">
              <li><button onClick={(e) => handleNavClick('features', e)} className="hover:text-[#B89047] transition-colors">CRM Matrix</button></li>
              <li><button onClick={(e) => handleNavClick('features', e)} className="hover:text-[#B89047] transition-colors">WhatsApp Automation</button></li>
              <li><button onClick={(e) => handleNavClick('integrations', e)} className="hover:text-[#B89047] transition-colors">Meta Webhooks</button></li>
              <li><button onClick={(e) => handleNavClick('features', e)} className="hover:text-[#B89047] transition-colors">Quotation Builder</button></li>
              <li><button onClick={(e) => handleNavClick('features', e)} className="hover:text-[#B89047] transition-colors">Post-Production</button></li>
              <li><button onClick={(e) => handleNavClick('pricing', e)} className="hover:text-[#B89047] transition-colors">Pricing Plans</button></li>
            </ul>
          </div>

          {/* COLUMN 3: RESOURCES */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#1A1917] dark:text-white font-serif">Resources</div>
            <ul className="space-y-2 text-xs font-medium text-[#5A554E] dark:text-[#C5C0B8]">
              <li><button onClick={(e) => handleNavClick('documentation', e)} className="hover:text-[#B89047] transition-colors">Documentation</button></li>
              <li><button onClick={(e) => handleNavClick('documentation', e)} className="hover:text-[#B89047] transition-colors">API Reference</button></li>
              <li><button onClick={(e) => handleNavClick('changelog', e)} className="hover:text-[#B89047] transition-colors">Changelog</button></li>
              <li><button onClick={(e) => handleNavClick('blog', e)} className="hover:text-[#B89047] transition-colors">Studio Blog</button></li>
              <li><button onClick={(e) => handleNavClick('customers', e)} className="hover:text-[#B89047] transition-colors">Customer Stories</button></li>
            </ul>
          </div>

          {/* COLUMN 4: COMPANY */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#1A1917] dark:text-white font-serif">Company</div>
            <ul className="space-y-2 text-xs font-medium text-[#5A554E] dark:text-[#C5C0B8]">
              <li><button onClick={(e) => handleNavClick('about', e)} className="hover:text-[#B89047] transition-colors">About StudioCore</button></li>
              <li><button onClick={(e) => handleNavClick('careers', e)} className="hover:text-[#B89047] transition-colors">Careers</button></li>
              <li><button onClick={(e) => handleNavClick('contact', e)} className="hover:text-[#B89047] transition-colors">Contact Us</button></li>
              <li><Link href="/workspace" className="hover:text-[#B89047] transition-colors flex items-center gap-1">Studio App <ArrowUpRight className="w-3 h-3 text-[#B89047]" /></Link></li>
            </ul>
          </div>

          {/* COLUMN 5: LEGAL */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#1A1917] dark:text-white font-serif">Legal</div>
            <ul className="space-y-2 text-xs font-medium text-[#5A554E] dark:text-[#C5C0B8]">
              <li><button onClick={(e) => handleNavClick('privacy-policy', e)} className="hover:text-[#B89047] transition-colors">Privacy Policy</button></li>
              <li><button onClick={(e) => handleNavClick('terms', e)} className="hover:text-[#B89047] transition-colors">Terms of Service</button></li>
              <li><button onClick={(e) => handleNavClick('privacy-policy', e)} className="hover:text-[#B89047] transition-colors">Security & Data</button></li>
            </ul>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT ROW */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A756E]">
          <div>
            © {new Date().getFullYear()} StudioCore Inc. All rights reserved. Built for Wedding Studios worldwide.
          </div>
          <div className="flex items-center gap-1">
            <span>Crafted with luxury for Wedding Photographers</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current ml-1" />
          </div>
        </div>

      </div>
    </footer>
  );
}

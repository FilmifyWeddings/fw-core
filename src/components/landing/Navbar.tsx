'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Menu, X, ChevronDown, Database, 
  Layers, Zap, CheckCircle2, Shield, Calendar, Award, PhoneCall
} from 'lucide-react';
import { StudioCoreLogo } from './BrandSvgs';

interface NavbarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export function Navbar({ activePage = 'home', onNavigate }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsDropdown, setSolutionsDropdown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (pageSlug: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setSolutionsDropdown(false);
    if (onNavigate) {
      onNavigate(pageSlug);
    } else {
      window.location.href = pageSlug === 'home' ? '/' : `/${pageSlug}`;
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled 
          ? 'bg-[#FFFDF9]/90 dark:bg-[#0C0B0A]/90 backdrop-blur-xl border-b border-[#EAE3D2]/70 dark:border-[#2C2926] shadow-[0_10px_30px_rgba(212,175,55,0.05)] py-3' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* BRAND LOGO WITH UPLOADED SC MONOGRAM VECTOR */}
        <Link 
          href="/" 
          onClick={(e) => handleNavClick('home', e)}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1A1917] p-1 shadow-[0_4px_16px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform duration-300 flex items-center justify-center border border-[#D4AF37]/40">
            <StudioCoreLogo className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5] font-serif flex items-center gap-1">
              Studio<span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">Core</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#B89047] dark:text-[#E6C665] -mt-1 font-sans">
              Wedding Studio OS
            </span>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#FAF8F5]/80 dark:bg-[#181614]/80 border border-[#EAE3D2]/80 dark:border-[#2C2926] p-1.5 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md">
          
          <button
            onClick={(e) => handleNavClick('features', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'features' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Features
          </button>

          {/* Solutions Dropdown Trigger */}
          <div className="relative" onMouseEnter={() => setSolutionsDropdown(true)} onMouseLeave={() => setSolutionsDropdown(false)}>
            <button
              className="px-4 py-2 text-xs font-semibold rounded-full text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50 transition-all flex items-center gap-1"
            >
              Solutions
              <ChevronDown className="w-3 h-3 text-[#B89047]" />
            </button>

            <AnimatePresence>
              {solutionsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-[#FFFDF9] dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-2xl"
                >
                  <button 
                    onClick={(e) => handleNavClick('features', e)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-[#25221F] transition-colors flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#B89047]">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1917] dark:text-[#FAF8F5]">WhatsApp Automation</div>
                      <div className="text-[10px] text-[#7A756E]">Instant Drips & Reminders</div>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => handleNavClick('integrations', e)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-[#25221F] transition-colors flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#B89047]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1917] dark:text-[#FAF8F5]">Meta Lead Ingestion</div>
                      <div className="text-[10px] text-[#7A756E]">FB & Instagram Ad Sync</div>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => handleNavClick('features', e)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-[#25221F] transition-colors flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#B89047]">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A1917] dark:text-[#FAF8F5]">Quotation Builder</div>
                      <div className="text-[10px] text-[#7A756E]">Luxury 3D Proposals</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={(e) => handleNavClick('integrations', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'integrations' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Integrations
          </button>

          <button
            onClick={(e) => handleNavClick('pricing', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'pricing' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Pricing
          </button>

          <button
            onClick={(e) => handleNavClick('customers', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'customers' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Testimonials
          </button>

          <button
            onClick={(e) => handleNavClick('blog', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'blog' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Blog
          </button>

          <button
            onClick={(e) => handleNavClick('documentation', e)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
              activePage === 'documentation' 
                ? 'bg-white dark:bg-[#25221F] text-[#B89047] shadow-sm font-bold' 
                : 'text-[#4A453E] dark:text-[#C5C0B8] hover:text-[#1A1917] dark:hover:text-white hover:bg-white/50'
            }`}
          >
            Docs
          </button>

        </nav>

        {/* RIGHT ACTIONS BUTTONS */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/workspace"
            className="px-4 py-2 text-xs font-bold text-[#4A453E] hover:text-[#1A1917] dark:text-[#C5C0B8] dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            Studio App Workspace
          </Link>

          <button
            onClick={(e) => handleNavClick('book-demo', e)}
            className="px-4 py-2.5 text-xs font-bold text-[#1A1917] dark:text-[#FAF8F5] bg-white dark:bg-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] hover:border-[#D4AF37] rounded-full transition-all shadow-xs hover:shadow-md"
          >
            Book Demo
          </button>

          <button
            onClick={(e) => handleNavClick('free-trial', e)}
            className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] hover:opacity-95 rounded-full transition-all shadow-[0_4px_16px_rgba(212,175,55,0.3)] hover:scale-105 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* MOBILE MENU TRIGGER */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={(e) => handleNavClick('free-trial', e)}
            className="px-3.5 py-1.5 text-[11px] font-extrabold text-white bg-gradient-to-r from-[#D4AF37] to-[#C5A059] rounded-full shadow-xs"
          >
            Try Free
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#1A1917] dark:text-white rounded-xl border border-[#EAE3D2] dark:border-[#2C2926] bg-[#FAF8F5] dark:bg-[#181614]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* MOBILE DROPDOWN MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#FFFDF9] dark:bg-[#141210] border-b border-[#EAE3D2] dark:border-[#2C2926] px-6 py-6 shadow-2xl space-y-4"
          >
            <div className="flex flex-col space-y-2">
              {[
                { name: 'Home', slug: 'home' },
                { name: 'Features', slug: 'features' },
                { name: 'Integrations', slug: 'integrations' },
                { name: 'Pricing', slug: 'pricing' },
                { name: 'Testimonials', slug: 'customers' },
                { name: 'About StudioCore', slug: 'about' },
                { name: 'Blog', slug: 'blog' },
                { name: 'Docs & API', slug: 'documentation' },
                { name: 'Contact Sales', slug: 'contact' },
              ].map((item) => (
                <button
                  key={item.slug}
                  onClick={(e) => handleNavClick(item.slug, e)}
                  className="text-left py-2 text-sm font-bold text-[#1A1917] dark:text-[#FAF8F5] hover:text-[#B89047] border-b border-[#FAF8F5] dark:border-[#1E1C1A]"
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                href="/workspace"
                className="w-full text-center py-3 text-xs font-bold text-[#1A1917] bg-[#FAF8F5] border border-[#EAE3D2] rounded-xl"
              >
                Launch Studio App Workspace
              </Link>
              <button
                onClick={(e) => handleNavClick('free-trial', e)}
                className="w-full py-3 text-xs font-black text-white bg-gradient-to-r from-[#D4AF37] to-[#C5A059] rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

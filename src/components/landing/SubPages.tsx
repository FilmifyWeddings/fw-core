'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Database, CheckCircle2, Send, Sparkles, 
  Shield, Layers, MessageSquare, Camera, FileText, 
  HelpCircle, Mail, Phone, MapPin, Award, User, Lock, Globe, Clock, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface SubPageViewerProps {
  pageSlug: string;
  onNavigate: (slug: string) => void;
}

export function SubPageViewer({ pageSlug, onNavigate }: SubPageViewerProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', studioName: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const renderContent = () => {
    switch (pageSlug) {
      case 'features':
        return (
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#B89047] text-xs font-black uppercase tracking-widest">
                Comprehensive Platform Features
              </span>
              <h1 className="text-4xl sm:text-6xl font-serif font-black text-[#1A1917] dark:text-white">
                Built For Every Phase of Your Wedding Studio
              </h1>
              <p className="text-base text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto">
                Explore our full suite of CRM, WhatsApp automation, Meta lead sync, 3D quotations, and post-production tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: 'Intelligent Lead Flow CRM', desc: 'Standard & custom columns (Groom Name, Bride Name, Event Date, City, Budget) with drag-and-drop status stages.', icon: Database },
                { title: 'Baileys WhatsApp Automation', desc: 'Auto-send brochure PDFs, rate cards, and retainer receipts directly from your official WhatsApp number.', icon: MessageSquare },
                { title: 'Meta Lead Webhook Collector', desc: 'Instant 1-second sync from Facebook Lead Forms & Instagram Ads directly into your studio matrix.', icon: Layers },
                { title: 'Luxury 3D Quotation Builder', desc: 'Generate interactive proposals with breakdown of photography, cinematography, drone footage & retainers.', icon: FileText },
                { title: 'Post-Production Workflow OS', desc: 'Track RAW backups, selection, color grading, album design, teaser cuts, and final gallery deliveries.', icon: Camera },
                { title: 'Team Allocation Matrix', desc: 'Assign lead owners, photographers, drone pilots, and editors with schedule reminders.', icon: Award },
              ].map((f, i) => {
                const IconComponent = f.icon;
                return (
                  <div key={i} className="p-8 rounded-3xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#B89047] flex items-center justify-center font-bold">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold font-serif text-[#1A1917] dark:text-white">{f.title}</h3>
                    <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8] leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#B89047] text-xs font-black uppercase tracking-widest">
                Seamless Ecosystem Sync
              </span>
              <h1 className="text-4xl sm:text-6xl font-serif font-black text-[#1A1917] dark:text-white">
                Connects With All Your Favorite Tools
              </h1>
              <p className="text-base text-[#5A554E] dark:text-[#C5C0B8] max-w-2xl mx-auto">
                StudioCore connects natively with Meta, WhatsApp, Google Workspace, Instagram, and cloud storage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Meta Lead Ads & Instagram', desc: 'Direct webhook integration for Facebook Lead Forms and IG Ads.', status: 'Connected Natively' },
                { title: 'WhatsApp Business API', desc: 'Automated brochure drips & instant client chat notifications.', status: 'Baileys Active' },
                { title: 'Google Drive & Cloud', desc: 'Direct gallery & RAW file link sharing with couples.', status: 'Supported' },
                { title: 'Google Contacts & Sheets', desc: 'Two-way contact sync with mobile phonebook.', status: 'Supported' },
                { title: 'Payment Gateways', desc: 'UPI, Razorpay & Bank transfer receipt logging.', status: 'Active' },
                { title: 'Lightroom & Post-Prod', desc: 'Track album edits & color grading timelines.', status: 'Integrated' },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm space-y-3">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-bold text-[10px] uppercase">
                    {item.status}
                  </span>
                  <h3 className="text-lg font-bold font-serif text-[#1A1917] dark:text-white">{item.title}</h3>
                  <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'book-demo':
      case 'free-trial':
        return (
          <div className="max-w-xl mx-auto bg-white dark:bg-[#181614] p-8 rounded-3xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#C5A059] text-white flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif font-black text-[#1A1917] dark:text-white">
                {pageSlug === 'book-demo' ? 'Schedule a 1-on-1 Studio Demo' : 'Start Your 14-Day Free Trial'}
              </h2>
              <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8]">
                {pageSlug === 'book-demo' 
                  ? 'See how StudioCore automates leads & quotations for premier wedding studios.'
                  : 'Instant setup in 5 minutes. No credit card required.'}
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                <h3 className="font-bold text-lg font-serif">Request Submitted Successfully!</h3>
                <p className="text-xs">Our studio onboarding specialist will reach out on WhatsApp within 15 minutes.</p>
                <Link href="/workspace" className="inline-block mt-4 px-6 py-2.5 bg-[#D4AF37] text-white rounded-full font-bold text-xs">
                  Go to Studio Workspace
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-[#1A1917] dark:text-white block mb-1">Your Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Roy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#EAE3D2] dark:border-[#2C2926] bg-[#FAF8F5] dark:bg-[#201D1A] text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1917] dark:text-white block mb-1">WhatsApp Mobile Number</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#EAE3D2] dark:border-[#2C2926] bg-[#FAF8F5] dark:bg-[#201D1A] text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1917] dark:text-white block mb-1">Studio / Brand Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Royal Wedding Stories"
                    value={formData.studioName}
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#EAE3D2] dark:border-[#2C2926] bg-[#FAF8F5] dark:bg-[#201D1A] text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 text-xs font-black text-white bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#9A7B32] rounded-xl shadow-lg hover:opacity-95 transition-all"
                >
                  {pageSlug === 'book-demo' ? 'Confirm Demo Schedule' : 'Start 14-Day Free Access'}
                </button>
              </form>
            )}
          </div>
        );

      case 'about':
        return (
          <div className="space-y-8 max-w-4xl mx-auto text-left">
            <h1 className="text-4xl font-serif font-black text-[#1A1917] dark:text-white">About StudioCore</h1>
            <p className="text-base text-[#5A554E] dark:text-[#C5C0B8] leading-relaxed">
              StudioCore was created by wedding photography industry veterans and software engineers who experienced firsthand the operational chaos of managing high-volume wedding leads, delayed WhatsApp responses, lost quotations, and scattered post-production timelines.
            </p>
            <p className="text-base text-[#5A554E] dark:text-[#C5C0B8] leading-relaxed">
              Today, StudioCore powers over 1,200+ luxury wedding studios across India, Dubai, Singapore, and Europe, managing ₹150Cr+ in annual photography retainers.
            </p>
          </div>
        );

      case 'contact':
        return (
          <div className="max-w-xl mx-auto bg-white dark:bg-[#181614] p-8 rounded-3xl border border-[#EAE3D2] dark:border-[#2C2926] shadow-xl space-y-6 text-left">
            <h2 className="text-2xl font-serif font-black text-[#1A1917] dark:text-white">Contact StudioCore Team</h2>
            <p className="text-xs text-[#5A554E] dark:text-[#C5C0B8]">We are here to assist your studio 24/7 via WhatsApp or Email.</p>

            <div className="space-y-3 text-xs font-semibold text-[#1A1917] dark:text-white">
              <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE3D2]">
                <Mail className="w-4 h-4 text-[#B89047]" />
                <span>support@studiocore.in</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE3D2]">
                <Phone className="w-4 h-4 text-[#B89047]" />
                <span>+91 918169159 (WhatsApp Priority Support)</span>
              </div>
            </div>
          </div>
        );

      case 'documentation':
        return (
          <div className="space-y-8 max-w-4xl mx-auto text-left">
            <h1 className="text-4xl font-serif font-black text-[#1A1917] dark:text-white">Documentation & API Reference</h1>
            <p className="text-sm text-[#5A554E] dark:text-[#C5C0B8]">
              Comprehensive guides for setting up Meta Webhooks, Baileys WhatsApp Connections, Custom Metadata Columns, and Supabase RLS.
            </p>

            <div className="space-y-4">
              {[
                { title: '1. Meta Lead Ads Webhook Setup', desc: 'Configure Facebook App ID & App Secret for instant lead form ingestion.' },
                { title: '2. Baileys WhatsApp QR Code Sync', desc: 'Connect your studio mobile number via QR scan for automated drips.' },
                { title: '3. Columns Engine & Metadata Rules', desc: 'Create normalized snake_case fields for Groom Name, Bride Name & Venue.' },
              ].map((doc, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white dark:bg-[#181614] border border-[#EAE3D2] shadow-sm">
                  <h3 className="font-bold font-serif text-base text-[#1A1917] dark:text-white">{doc.title}</h3>
                  <p className="text-xs text-[#5A554E] mt-1">{doc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6 max-w-3xl mx-auto text-left">
            <h1 className="text-4xl font-serif font-black text-[#1A1917] dark:text-white capitalize">
              {pageSlug.replace(/-/g, ' ')}
            </h1>
            <p className="text-sm text-[#5A554E] dark:text-[#C5C0B8] leading-relaxed">
              Official {pageSlug.replace(/-/g, ' ')} for StudioCore Photography Studio Operating System.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-[#FFFDF9] dark:bg-[#0C0B0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BACK TO HOME LINK */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#181614] border border-[#EAE3D2] text-xs font-bold text-[#5A554E] hover:text-[#B89047] mb-12 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home Landing Page</span>
        </button>

        {/* DYNAMIC PAGE CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>

      </div>
    </div>
  );
}

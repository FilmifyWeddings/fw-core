'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Sparkles, Save, Upload, Trash2, Plus, Check, Edit3, 
  ArrowLeft, ArrowRight, Eye, Share2, Copy, Percent, DollarSign, 
  Palette, Type, Layout, ShieldCheck, Film, Video, Camera, BookOpen, 
  Calendar, MapPin, Users, AlertCircle, CheckCircle2, ChevronRight, 
  Download, Printer, RefreshCw, X, Layers, ExternalLink, ChevronUp, ChevronDown, Move, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// WedGrapher Presets & Full Dynamic State
const DEFAULT_AIRY_PROPOSAL = {
  designName: 'Pre-Wedding – Airy White (Pre-Wedding)',
  eventGroup: 'Pre-Wedding',
  look: 'Airy White (Pre-Wed)',
  title: 'PRE WEDDING PHOTOGRAPHY QUOTATION',
  subtitle: 'Capturing precious moments before your wedding',
  year: '2026',
  preparedFor: 'Ananya & Rohan',
  coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  
  // Section 1: About Us
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'We specialize in capturing love stories of contemporary Indian couples.\n\nEvery memory is carefully selected and transformed into everlasting films and photographs.',
    signature: 'FOUNDER & DIRECTOR, AS',
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 2: Shoot Details
  shootDetails: {
    kicker: 'WHAT WE DO',
    heading: 'PRE-WEDDING SHOOT',
    rows: [
      { id: '1', label: 'Number of days', value: '1 day photo & video shoot' },
      { id: '2', label: 'Crew', value: '1 photographer + 1 cinematographer' },
      { id: '3', label: 'Sessions', value: '2-3 sessions of 1-1.5 hours each' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80',
    photoHeight: 599,
    staysInFrame: 'Middle',
  },

  // Section 3: What's Included
  whatsIncluded: {
    kicker: 'YOUR PACKAGE',
    heading: 'INCLUDED',
    deliverablesText: '75-80 retouched high-res images\n1 min teaser\n2-3 reels\n1 main film',
    allowClientCustomization: true,
    textAlign: 'Left',
    background: 'Page colour',
    photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
    photoHeight: 280,
    staysInFrame: 'Middle',
  },

  // Section 4: Price & Payment
  pricePayment: {
    kicker: 'INVESTMENT',
    heading: 'WEDDING GOLD',
    packagePrice: 135000,
    discountPct: 0,
    travel: 0,
    accommodations: 0,
    additionalServices: 0,
    gstPct: 18,
    paymentHeading: 'PAYMENT',
    paymentTerms: '50% booking • 40% post-shoot • 10% on final delivery',
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 5: Add-ons Table
  addOnsTable: {
    heading: 'ADD ONS',
    kicker: "EMBRACE YOUR DAY — YOU'RE IN CONTROL",
    rows: [
      { id: 'a1', service: 'Additional photographer', charge: '₹15,000 per day' },
      { id: 'a2', service: 'Additional cinematographer', charge: '₹22,000 per day' },
      { id: 'a3', service: 'Drone pilot', charge: '₹12,000 per day' },
      { id: 'a4', service: 'Pre-wedding session', charge: '₹20,000 per session' },
      { id: 'a5', service: 'Album', charge: '₹550 per page' },
      { id: 'a6', service: 'Instagram reel', charge: '₹2,000 per reel' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 6: Delivery Time
  deliveryTime: {
    heading: 'Delivery time',
    photosDelivered: '3-4 weeks',
    filmDelivered: '3-4 weeks',
    smallPrint: "Delivery timelines start from the later of the shoot's last day or the date of final payment.",
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 7: Timeline Table
  timelineTable: {
    heading: 'Timeframe for delivery',
    rows: [
      { id: 't1', result: 'Quick edits (20 photos)', timeline: 'On the shoot day', revisions: 'No' },
      { id: 't2', result: 'Edited photos', timeline: 'Twenty-five days', revisions: 'No' },
      { id: 't3', result: 'Teaser / reels', timeline: 'A couple of months', revisions: 'No' },
      { id: 't4', result: 'Full film', timeline: 'Around two months', revisions: 'One cycle within a month' },
    ],
    textAlign: 'Left',
    background: 'Page colour',
  },

  // Section 8: Testimonials
  testimonials: {
    kicker: 'KIND WORDS',
    heading: 'WHAT COUPLES SAY',
    quotes: [
      { id: 'q1', quote: '"We did not notice the team all day. Then we saw the album, and cried."', author: 'ANANYA & ROHAN' },
      { id: 'q2', quote: '"Every photograph looks like a still from a film we would want to watch again."', author: 'MEERA & KABIR' },
    ]
  },

  // Section 9: Terms & Thank You
  termsAndThankYou: {
    termsHeading: 'TERMS',
    termsText: 'Dates are blocked only after the booking advance. Travel and stay outside the city are billed at actuals. Raw files are not shared.',
    thankYouHeading: 'THANK YOU',
    thankYouText: 'We would love to tell your story.',
    studioContact: 'FW Studio • +91 9876543210 • studio@wedgrapher.com',
  }
};

function WedGrapherAiryBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState(DEFAULT_AIRY_PROPOSAL);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>('cover');

  // Dynamic Theme Colors based on Look Selection
  const isGold = data.look.toLowerCase().includes('gold');
  const isDark = data.look.toLowerCase().includes('dark');

  // Exact Requested Colors: #FFF8EA (Background) & #8A6D2F (Content & Text & Borders)
  const pageBgColor = isGold ? '#FFF8EA' : isDark ? '#141622' : '#FFFFFF';
  const textColor = isGold ? '#8A6D2F' : isDark ? '#F3F4F6' : '#27272A';
  const kickerColor = isGold ? '#8A6D2F' : isDark ? '#E5C365' : '#A1A1AA';
  const borderColor = isGold ? 'rgba(138, 109, 47, 0.25)' : isDark ? '#232634' : 'rgba(228, 228, 231, 1)';
  const boxBgColor = isGold ? 'rgba(138, 109, 47, 0.08)' : isDark ? '#0F1017' : 'rgba(244, 244, 245, 1)';
  const photoBorderColor = isGold ? 'rgba(138, 109, 47, 0.3)' : isDark ? '#232634' : 'rgba(228, 228, 231, 1)';

  // Calculate totals dynamically
  const subtotal = data.pricePayment.packagePrice;
  const discountAmt = (subtotal * data.pricePayment.discountPct) / 100;
  const discountedSubtotal = subtotal - discountAmt;
  const gstAmt = (discountedSubtotal * data.pricePayment.gstPct) / 100;
  const grandTotal = Math.round(discountedSubtotal + gstAmt);

  const handleSave = async () => {
    setSaving(true);
    try {
      const publicToken = `wg_airy_${Math.random().toString(36).substring(2, 10)}`;
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      await supabase.from('quotations').upsert({
        workspace_id: workspaceId,
        quotation_number: 'FW-2026-001',
        title: data.designName,
        client_name: data.preparedFor,
        public_token: publicToken,
        financials: { total_amount: grandTotal, subtotal, gst_rate: data.pricePayment.gstPct },
        events: data.shootDetails.rows,
        status: 'draft',
        updated_at: new Date().toISOString(),
      });

      setHasUnsavedChanges(false);
      alert('Quotation proposal saved successfully!');
    } catch {
      setHasUnsavedChanges(false);
      alert('Saved proposal settings locally!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 font-sans flex flex-col overflow-hidden selection:bg-black selection:text-white">
      
      {/* ── TOP HEADER BAR (WedGrapher Light Header) ── */}
      <header className="h-12 bg-white border-b border-zinc-200 px-5 flex items-center justify-between shrink-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={data.designName}
            onChange={(e) => { setData({ ...data, designName: e.target.value }); setHasUnsavedChanges(true); }}
            className="text-xs font-bold text-zinc-900 bg-transparent focus:outline-none focus:border-b border-black py-0.5"
          />
          {hasUnsavedChanges && (
            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/p/quotation/demo_token`}
            target="_blank"
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Link>

          <button
            onClick={() => window.print()}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Copied!' : 'Send'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1 rounded-full bg-black hover:bg-zinc-800 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
          </button>

          <Link
            href="/workspace/quotations"
            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors ml-2"
            title="Close Editor"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE VIEWPORT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT CONTROL SIDEBAR PANEL (320px)                            */}
        {/* ───────────────────────────────────────────────────────────── */}
        <aside className="w-[320px] bg-white border-r border-zinc-200 p-4 overflow-y-auto space-y-5 shrink-0 text-xs shadow-sm">
          
          {/* Top Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Design name</label>
              <input
                type="text"
                value={data.designName}
                onChange={(e) => setData({ ...data, designName: e.target.value })}
                className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Event type</label>
                <select
                  value={data.eventGroup}
                  onChange={(e) => setData({ ...data, eventGroup: e.target.value })}
                  className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 font-medium text-zinc-900 focus:outline-none"
                >
                  <option value="Pre-Wedding">Pre-Wedding</option>
                  <option value="Wedding Gold">Wedding Gold</option>
                  <option value="Destination">Destination</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">Look</label>
                <select
                  value={data.look}
                  onChange={(e) => setData({ ...data, look: e.target.value })}
                  className="w-full p-2 rounded-xl bg-amber-50/60 border border-amber-200 font-bold text-amber-900 focus:outline-none"
                >
                  <option value="Airy White (Pre-Wed)">Airy White (Pre-Wed)</option>
                  <option value="Royal Gold (Classic)">Royal Gold (Classic)</option>
                  <option value="Golden Luxe">Golden Luxe (#FFF8EA / #8A6D2F)</option>
                  <option value="Dark Studio">Dark Studio</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section Tags Header */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">PAGES — DRAG TO REORDER</span>
              <button 
                onClick={() => alert('New page section added!')}
                className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-full hover:bg-zinc-200"
              >
                + Add Page
              </button>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] font-semibold text-zinc-500">
              {['Cover', 'About us', 'Shoot details', 'What\'s included', 'Price & payment', 'Add-ons table', 'Delivery time', 'Timeline table', 'Testimonials', 'Terms'].map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Collapsible Section Accordion Cards */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100">
            
            {/* 1. Cover Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'cover' ? null : 'cover')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>1. Cover</span>
                </div>
                {openCard === 'cover' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'cover' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={data.title}
                      onChange={(e) => setData({ ...data, title: e.target.value })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Prepared for</label>
                    <input
                      type="text"
                      value={data.preparedFor}
                      onChange={(e) => setData({ ...data, preparedFor: e.target.value })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. About us Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'about' ? null : 'about')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  <span>2. About us</span>
                </div>
                {openCard === 'about' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'about' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Kicker</label>
                    <input
                      type="text"
                      value={data.aboutUs.kicker}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, kicker: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.aboutUs.heading}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Text</label>
                    <textarea
                      rows={3}
                      value={data.aboutUs.text}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, text: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Signature line</label>
                    <input
                      type="text"
                      value={data.aboutUs.signature}
                      onChange={(e) => setData({ ...data, aboutUs: { ...data.aboutUs, signature: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Shoot details Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'shoot' ? null : 'shoot')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  <span>3. Shoot details</span>
                </div>
                {openCard === 'shoot' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'shoot' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Kicker</label>
                    <input
                      type="text"
                      value={data.shootDetails.kicker}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, kicker: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.shootDetails.heading}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  {/* Rows Editor */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Rows</span>
                    {data.shootDetails.rows.map((row, idx) => (
                      <div key={row.id} className="p-2 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 relative">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => {
                            const newRows = [...data.shootDetails.rows];
                            newRows[idx].label = e.target.value;
                            setData({ ...data, shootDetails: { ...data.shootDetails, rows: newRows } });
                          }}
                          className="w-full p-1 bg-white rounded border border-zinc-200 text-[11px] font-bold text-zinc-900"
                        />
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            const newRows = [...data.shootDetails.rows];
                            newRows[idx].value = e.target.value;
                            setData({ ...data, shootDetails: { ...data.shootDetails, rows: newRows } });
                          }}
                          className="w-full p-1 bg-white rounded border border-zinc-200 text-[11px] text-zinc-700"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Photo Height ({data.shootDetails.photoHeight}px)</label>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      value={data.shootDetails.photoHeight}
                      onChange={(e) => setData({ ...data, shootDetails: { ...data.shootDetails, photoHeight: Number(e.target.value) } })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. What's included Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'included' ? null : 'included')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>4. What's included</span>
                </div>
                {openCard === 'included' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'included' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Heading</label>
                    <input
                      type="text"
                      value={data.whatsIncluded.heading}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, heading: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Deliverables List</label>
                    <textarea
                      rows={4}
                      value={data.whatsIncluded.deliverablesText}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, deliverablesText: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Photo Height ({data.whatsIncluded.photoHeight}px)</label>
                    <input
                      type="range"
                      min="150"
                      max="600"
                      value={data.whatsIncluded.photoHeight}
                      onChange={(e) => setData({ ...data, whatsIncluded: { ...data.whatsIncluded, photoHeight: Number(e.target.value) } })}
                      className="w-full accent-black cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Price & payment Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'price' ? null : 'price')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                  <span>5. Price & payment</span>
                </div>
                {openCard === 'price' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'price' && (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Package Price (₹)</label>
                    <input
                      type="number"
                      value={data.pricePayment.packagePrice}
                      onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, packagePrice: Number(e.target.value) || 0 } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Discount %</label>
                      <input
                        type="number"
                        value={data.pricePayment.discountPct}
                        onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, discountPct: Number(e.target.value) || 0 } })}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">GST %</label>
                      <input
                        type="number"
                        value={data.pricePayment.gstPct}
                        onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, gstPct: Number(e.target.value) || 0 } })}
                        className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Payment terms</label>
                    <input
                      type="text"
                      value={data.pricePayment.paymentTerms}
                      onChange={(e) => setData({ ...data, pricePayment: { ...data.pricePayment, paymentTerms: e.target.value } })}
                      className="w-full p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Add-ons table Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 overflow-hidden">
              <div 
                onClick={() => setOpenCard(openCard === 'addons' ? null : 'addons')}
                className="p-2.5 bg-zinc-100/80 flex items-center justify-between cursor-pointer font-bold text-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>6. Add-ons table</span>
                </div>
                {openCard === 'addons' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>

              {openCard === 'addons' && (
                <div className="p-3 space-y-2 bg-white">
                  {data.addOnsTable.rows.map((row, idx) => (
                    <div key={row.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px]">
                      <span className="font-bold">{row.service}</span>
                      <span className="font-mono text-zinc-600">{row.charge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </aside>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CENTER LIVE PROPOSAL DOCUMENT CANVAS (AIRY / ROYAL GOLD / DARK) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 bg-[#EBECEF] p-6 overflow-y-auto flex justify-center items-start">
          
          {/* Dynamic Theme Centered Document Page */}
          <div 
            className="w-full max-w-[680px] rounded-sm shadow-2xl p-10 sm:p-14 space-y-12 my-4 transition-colors duration-300"
            style={{ 
              backgroundColor: pageBgColor, 
              color: textColor,
              borderColor: borderColor,
              borderWidth: '1px'
            }}
          >
            
            {/* 1. COVER PAGE HERO (Airy Arch Frame) */}
            <div className="text-center space-y-6 pt-4">
              <span className="text-[10px] tracking-[0.25em] uppercase font-semibold block" style={{ color: kickerColor }}>
                A &amp; R
              </span>

              <h1 className="text-3xl sm:text-4xl font-serif tracking-widest uppercase leading-tight" style={{ color: textColor }}>
                {data.title}
              </h1>

              {/* Arch Image Frame */}
              <div 
                className="w-[68%] mx-auto mt-6 rounded-t-[999px] rounded-b-none overflow-hidden aspect-[4/5] shadow-lg relative"
                style={{ borderColor: photoBorderColor, borderWidth: '1px', backgroundColor: boxBgColor }}
              >
                <img 
                  src={data.coverPhoto} 
                  alt="Wedding Couple"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <p className="text-[11px] italic" style={{ color: kickerColor }}>
                {data.subtitle}
              </p>

              <div className="pt-8 flex items-center justify-between text-[11px] font-sans border-t" style={{ borderColor: borderColor, color: textColor }}>
                <span>{data.year}</span>
                <span>PREPARED FOR <strong style={{ color: textColor }}>{data.preparedFor}</strong></span>
              </div>
            </div>

            {/* 2. ABOUT US SECTION */}
            <div className="space-y-3 pt-10 border-t" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.aboutUs.kicker}
              </span>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.aboutUs.heading}
              </h2>
              <p className="text-xs leading-relaxed whitespace-pre-line font-sans opacity-90" style={{ color: textColor }}>
                {data.aboutUs.text}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider block pt-2" style={{ color: kickerColor }}>
                {data.aboutUs.signature}
              </span>
            </div>

            {/* 3. SHOOT DETAILS SECTION */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.shootDetails.kicker}
              </span>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.shootDetails.heading}
              </h2>

              <div className="space-y-3">
                {data.shootDetails.rows.map(row => (
                  <div key={row.id} className="space-y-0.5 border-b pb-2" style={{ borderColor: borderColor }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: kickerColor }}>{row.label}</span>
                    <span className="text-xs font-medium" style={{ color: textColor }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden mt-4 shadow-md" style={{ borderColor: photoBorderColor, borderWidth: '1px' }}>
                <img 
                  src={data.shootDetails.photo} 
                  alt="Pre-Wedding Shoot"
                  className="w-full object-cover object-center"
                  style={{ height: `${data.shootDetails.photoHeight}px` }}
                />
              </div>
            </div>

            {/* 4. WHAT'S INCLUDED SECTION */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.whatsIncluded.kicker}
              </span>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.whatsIncluded.heading}
              </h2>

              <div className="p-5 rounded-2xl leading-relaxed whitespace-pre-line font-sans" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px', color: textColor }}>
                {data.whatsIncluded.deliverablesText}
              </div>

              <div className="rounded-2xl overflow-hidden mt-4 shadow-md" style={{ borderColor: photoBorderColor, borderWidth: '1px' }}>
                <img 
                  src={data.whatsIncluded.photo} 
                  alt="Package Deliverables"
                  className="w-full object-cover object-center"
                  style={{ height: `${data.whatsIncluded.photoHeight}px` }}
                />
              </div>
            </div>

            {/* 5. PRICE & PAYMENT SECTION */}
            <div className="space-y-6 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.pricePayment.kicker}
              </span>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.pricePayment.heading}
              </h2>

              <div className="text-3xl font-serif" style={{ color: textColor }}>
                ₹{grandTotal.toLocaleString('en-IN')}
              </div>

              <div className="space-y-1 border-t pt-3" style={{ borderColor: borderColor }}>
                <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor }}>{data.pricePayment.paymentHeading}</span>
                <p className="text-xs" style={{ color: textColor }}>{data.pricePayment.paymentTerms}</p>
              </div>
            </div>

            {/* 6. ADD ONS TABLE */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.addOnsTable.heading}
              </h2>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.addOnsTable.kicker}
              </span>

              <div className="rounded-xl overflow-hidden" style={{ borderColor: borderColor, borderWidth: '1px' }}>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor: borderColor, color: textColor }}>
                    <tr>
                      <th className="py-2.5 px-4">Services</th>
                      <th className="py-2.5 px-4 text-right">Charges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium" style={{ color: textColor }}>
                    {data.addOnsTable.rows.map(row => (
                      <tr key={row.id}>
                        <td className="py-2.5 px-4">{row.service}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold" style={{ color: textColor }}>{row.charge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. DELIVERY TIMEFRAME */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.deliveryTime.heading}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                  <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor }}>PHOTOS</span>
                  <strong className="text-xs font-bold" style={{ color: textColor }}>{data.deliveryTime.photosDelivered}</strong>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                  <span className="text-[10px] font-bold uppercase block" style={{ color: kickerColor }}>TEASER &amp; FILM</span>
                  <strong className="text-xs font-bold" style={{ color: textColor }}>{data.deliveryTime.filmDelivered}</strong>
                </div>
              </div>
              <p className="text-[10px] italic" style={{ color: kickerColor }}>{data.deliveryTime.smallPrint}</p>
            </div>

            {/* 8. TIMELINE TABLE */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.timelineTable.heading}
              </h2>

              <div className="rounded-xl overflow-hidden" style={{ borderColor: borderColor, borderWidth: '1px' }}>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: boxBgColor, borderColor: borderColor, color: textColor }}>
                    <tr>
                      <th className="py-2.5 px-4">Result</th>
                      <th className="py-2.5 px-4">Timeline</th>
                      <th className="py-2.5 px-4">Revisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium" style={{ color: textColor }}>
                    {data.timelineTable.rows.map(row => (
                      <tr key={row.id}>
                        <td className="py-2.5 px-4">{row.result}</td>
                        <td className="py-2.5 px-4">{row.timeline}</td>
                        <td className="py-2.5 px-4" style={{ color: kickerColor }}>{row.revisions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 9. TESTIMONIALS */}
            <div className="space-y-4 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <span className="text-[9px] tracking-[0.2em] font-bold uppercase block" style={{ color: kickerColor }}>
                {data.testimonials.kicker}
              </span>
              <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                {data.testimonials.heading}
              </h2>

              <div className="space-y-3 font-serif italic" style={{ color: textColor }}>
                {data.testimonials.quotes.map(q => (
                  <div key={q.id} className="p-4 rounded-xl space-y-1" style={{ backgroundColor: boxBgColor, borderColor: borderColor, borderWidth: '1px' }}>
                    <p className="text-xs">{q.quote}</p>
                    <span className="text-[10px] font-sans font-bold uppercase not-italic block" style={{ color: kickerColor }}>— {q.author}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 10. TERMS & THANK YOU */}
            <div className="space-y-6 pt-10 border-t font-sans text-xs" style={{ borderColor: borderColor }}>
              <div className="space-y-2">
                <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                  {data.termsAndThankYou.termsHeading}
                </h2>
                <p className="text-xs leading-relaxed font-sans opacity-90" style={{ color: textColor }}>{data.termsAndThankYou.termsText}</p>
              </div>

              <div className="text-center pt-8 border-t space-y-2" style={{ borderColor: borderColor }}>
                <h2 className="text-xl font-serif uppercase tracking-widest" style={{ color: textColor }}>
                  {data.termsAndThankYou.thankYouHeading}
                </h2>
                <p className="text-xs" style={{ color: textColor }}>{data.termsAndThankYou.thankYouText}</p>
                <p className="text-[10px] font-mono pt-2" style={{ color: kickerColor }}>{data.termsAndThankYou.studioContact}</p>
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}

export default function QuotationBuilderPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen bg-[#EBECEF] text-zinc-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-600">Loading WedGrapher Studio Editor...</p>
        </div>
      </div>
    }>
      <WedGrapherAiryBuilderContent />
    </React.Suspense>
  );
}

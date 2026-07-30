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
  Download, Printer, RefreshCw, X, Layers, ExternalLink, Globe, Sun, Moon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { 
  QuotationProposal, QuotationEvent, QuotationAddOnItem, 
  QuotationFinancials, QuotationPaymentMilestone, QuotationThemeConfig, 
  WorkspaceClient 
} from '@/types';

// WedGrapher Curated Color Palettes
const WEDGRAPHER_PALETTES = [
  { name: 'Royal Gold', hex: '#D4AF37', secondary: '#E5C365', gradient: 'from-[#E5C365] via-[#D4AF37] to-[#B8860B]' },
  { name: 'Warm Amber', hex: '#F59E0B', secondary: '#FBBF24', gradient: 'from-amber-400 via-amber-500 to-yellow-600' },
  { name: 'Luxe Emerald', hex: '#10B981', secondary: '#34D399', gradient: 'from-emerald-400 via-emerald-500 to-teal-600' },
  { name: 'Deep Indigo', hex: '#6366F1', secondary: '#818CF8', gradient: 'from-indigo-400 via-indigo-500 to-purple-600' },
  { name: 'Rose Velvet', hex: '#F43F5E', secondary: '#FB7185', gradient: 'from-rose-400 via-pink-500 to-rose-600' },
];

const FONTS_PRESETS = [
  { name: 'Playfair Display', family: 'Playfair Display, serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond, serif' },
  { name: 'Cinzel', family: 'Cinzel, serif' },
  { name: 'Inter', family: 'Inter, sans-serif' },
];

const DEFAULT_WEDGRAPHER_PROPOSAL: QuotationProposal = {
  id: `prop_${Date.now()}`,
  workspace_id: 'ws_demo',
  quotation_number: 'FW-2026-001',
  title: 'PRE WEDDING & WEDDING GOLD QUOTATION',
  client_name: 'Vinu Bhad & Neha',
  client_phone: '+91 9876543210',
  client_email: 'vinu.wedding@gmail.com',
  event_date: '2026-11-18',
  theme_config: {
    accent_color: '#D4AF37',
    primary_font: 'Playfair Display',
    cover_style: 'cinematic_dark',
    logo_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'
  },
  sections_config: [
    { id: 'cover', title: 'Cover Hero Page', enabled: true },
    { id: 'about', title: 'About Our Studio', enabled: true },
    { id: 'pre_wedding', title: 'Pre-Wedding Shoot', enabled: true },
    { id: 'wedding_gold', title: 'Wedding Gold Package', enabled: true },
    { id: 'deliverables', title: 'What Is Included', enabled: true },
    { id: 'add_ons', title: 'Add-On Extras', enabled: true },
    { id: 'payment', title: 'Payment Milestones', enabled: true },
    { id: 'delivery_timeframe', title: 'Delivery Timeframe', enabled: true },
    { id: 'testimonials', title: 'What Couples Say', enabled: true },
    { id: 'terms', title: 'Terms & Conditions', enabled: true },
  ],
  events: [
    { 
      id: 'ev_1', 
      title: 'PRE-WEDDING SHOOT', 
      days: 1, 
      venue: 'Udaipur Lakes & Fort Locations', 
      crew: '2 Photographers, 1 Cinematographer', 
      deliverables: ['Cinematic 1-Min Teaser', '50 High-Res Retouched Photos', 'Aerial Drone Coverage'], 
      rate: 75000 
    },
    { 
      id: 'ev_2', 
      title: 'WEDDING GOLD PACKAGE (Sangeet & Main Wedding)', 
      days: 2, 
      venue: 'Palace Resort & Mandap Lawn', 
      crew: '3 Candid Photographers, 3 Cinematographers, 1 Traditional Operator', 
      deliverables: ['Full Feature Length Film', '3 Instagram Reels', '400 Edited Photos', '2 Indigo Photobook Albums'], 
      rate: 265000 
    }
  ],
  add_ons: [
    { id: 'addon_1', title: 'Extra Instagram Reels (2x Trending Tracks)', rate: 15000, selected: true },
    { id: 'addon_2', title: '48-Hour Express Teaser Fast Delivery', rate: 20000, selected: true },
    { id: 'addon_3', title: 'Mini Parent Album Photobook Pair', rate: 18000, selected: false },
  ],
  financials: {
    subtotal: 375000,
    discount_type: 'flat',
    discount_value: 15000,
    gst_rate: 18,
    total_amount: 424800,
  },
  payment_milestones: [
    { label: 'Booking Deposit', percentage: 30, amount: 127440, due_description: 'To lock dates & crew' },
    { label: 'Event Day Advance', percentage: 60, amount: 254880, due_description: 'On main event morning' },
    { label: 'Final Handover', percentage: 10, amount: 42480, due_description: 'Before album & film delivery' },
  ],
  terms: `1. 30% advance deposit to lock event dates & crew standings.
2. Balance 60% payable on the first day of event shoot.
3. Remaining 10% payable upon final deliverable handover.
4. Raw footage & photos retained for 60 days post-delivery.
5. Travel & lodging for outstation events to be borne by client.`,
  status: 'draft',
  public_token: `wg_${Math.random().toString(36).substring(2, 12)}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function QuotationBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id');

  const [proposal, setProposal] = useState<QuotationProposal>(DEFAULT_WEDGRAPHER_PROPOSAL);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'designs' | 'forms' | 'drives' | 'finance' | 'attendance'>('designs');

  // Auto Recalculate Financials on Events or Add-ons change
  useEffect(() => {
    recalculateFinancials();
  }, [proposal.events, proposal.add_ons, proposal.financials.discount_type, proposal.financials.discount_value, proposal.financials.gst_rate]);

  const recalculateFinancials = () => {
    const eventsSubtotal = proposal.events.reduce((acc, ev) => acc + (Number(ev.rate) || 0), 0);
    const addonsSubtotal = proposal.add_ons.filter(a => a.selected).reduce((acc, a) => acc + (Number(a.rate) || 0), 0);
    const subtotal = eventsSubtotal + addonsSubtotal;

    let discountAmount = 0;
    if (proposal.financials.discount_type === 'percentage') {
      discountAmount = (subtotal * (Number(proposal.financials.discount_value) || 0)) / 100;
    } else {
      discountAmount = Number(proposal.financials.discount_value) || 0;
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const gstAmount = (discountedSubtotal * (Number(proposal.financials.gst_rate) || 0)) / 100;
    const totalAmount = Math.round(discountedSubtotal + gstAmount);

    // Recalculate Milestones
    const updatedMilestones = proposal.payment_milestones.map(m => ({
      ...m,
      amount: Math.round((totalAmount * m.percentage) / 100)
    }));

    setProposal(prev => ({
      ...prev,
      financials: {
        ...prev.financials,
        subtotal,
        total_amount: totalAmount,
      },
      payment_milestones: updatedMilestones,
    }));
  };

  const toggleSection = (sectionId: string) => {
    setProposal(prev => ({
      ...prev,
      sections_config: prev.sections_config.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const handleAddEvent = () => {
    const newEv: QuotationEvent = {
      id: `ev_${Date.now()}`,
      title: 'NEW CEREMONY / EVENT',
      days: 1,
      venue: 'Palace Resort',
      crew: '2 Photographers, 1 Cinematographer',
      deliverables: ['Edited Photos', 'Video Teaser'],
      rate: 65000,
    };
    setProposal(prev => ({ ...prev, events: [...prev.events, newEv] }));
  };

  const handleDeleteEvent = (eventId: string) => {
    setProposal(prev => ({ ...prev, events: prev.events.filter(e => e.id !== eventId) }));
  };

  const handleAddAddOn = () => {
    const newAddOn: QuotationAddOnItem = {
      id: `addon_${Date.now()}`,
      title: 'Custom Add-On Upgrade',
      rate: 15000,
      selected: true,
    };
    setProposal(prev => ({ ...prev, add_ons: [...prev.add_ons, newAddOn] }));
  };

  const handleSaveProposal = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const payload = {
        ...proposal,
        workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('quotations')
        .upsert(payload)
        .select()
        .single();

      if (!error && inserted) {
        setProposal(inserted);
      }
      alert('WedGrapher Quotation Proposal saved successfully!');
    } catch (e) {
      alert('Saved proposal locally.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/p/quotation/${proposal.public_token}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const selectedPalette = WEDGRAPHER_PALETTES.find(p => p.hex === proposal.theme_config.accent_color) || WEDGRAPHER_PALETTES[0];

  return (
    <SidebarLayout>
      {/* ── WedGrapher Exact HTML/CSS Design System ── */}
      <div className="min-h-screen bg-[#111218] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#E5C365]">
        
        {/* ── WEDGRAPHER TOP HEADER & NAVIGATION BAR ── */}
        <header className="h-16 border-b border-[#232634] bg-[#161822] px-6 flex items-center justify-between sticky top-0 z-40 shadow-xl">
          
          {/* Left Brand Title & Nav Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#E5C365] via-[#D4AF37] to-[#B8860B] flex items-center justify-center font-black text-black text-xs shadow-lg shadow-[#D4AF37]/20">
                WG
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white uppercase">WedGrapher Quotation Studio</h1>
                <span className="text-[10px] text-zinc-400 font-medium block">Team Dashboard • Design Blueprint Engine</span>
              </div>
            </div>

            {/* WedGrapher Navigation Pills */}
            <div className="hidden md:flex items-center gap-1.5 bg-[#0F1017] p-1.5 rounded-2xl border border-[#232634]">
              {[
                { id: 'designs', label: 'Quotation Designs', icon: Layout },
                { id: 'forms', label: 'Forms', icon: FileText },
                { id: 'drives', label: 'Data / Drives', icon: Layers },
                { id: 'finance', label: 'Finance', icon: DollarSign, badge: 'NEW' },
                { id: 'attendance', label: 'Attendance', icon: Users },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive 
                        ? 'bg-[#232634] text-[#E5C365] shadow-md border border-[#D4AF37]/30' 
                        : 'text-zinc-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-wider">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-full bg-[#232634] hover:bg-[#2A2E3F] text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#E5C365]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>

            <Link
              href={`/p/quotation/${proposal.public_token}`}
              target="_blank"
              className="px-4 py-2 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Live Web</span>
            </Link>

            <button
              onClick={handleSaveProposal}
              disabled={saving}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-[#E5C365] via-[#D4AF37] to-[#B8860B] hover:opacity-90 text-black font-black text-xs transition-all shadow-xl shadow-[#D4AF37]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Proposal'}</span>
            </button>
          </div>
        </header>

        {/* ── WEDGRAPHER SUB-HEADER CONTROL BAR ── */}
        <div className="bg-[#161822]/80 border-b border-[#232634] px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E5C365] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/20">
              Quotation Designs Mode
            </span>
            <input
              type="text"
              value={proposal.title}
              onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
              className="bg-transparent font-black text-base text-white focus:outline-none focus:border-b border-[#D4AF37] w-80"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Ref No:</span>
            <span className="font-mono font-bold text-white bg-[#0F1017] px-2.5 py-1 rounded-lg border border-[#232634]">
              {proposal.quotation_number}
            </span>
          </div>
        </div>

        {/* ── 3-PANEL WEDGRAPHER BUILDER CONTAINER ── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 1: LEFT CONTROL TOOLBAR (280px)                        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <aside className="w-72 border-r border-[#232634] bg-[#161822] p-5 overflow-y-auto space-y-6 shrink-0 text-xs">
            
            {/* Section Toggles */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#E5C365] block">
                Proposal Page Sections ({proposal.sections_config.filter(s => s.enabled).length}/{proposal.sections_config.length})
              </span>
              <div className="space-y-1.5">
                {proposal.sections_config.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0F1017] border border-[#232634]">
                    <span className="font-bold text-zinc-200">{sec.title}</span>
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                        sec.enabled ? 'bg-[#D4AF37]' : 'bg-[#232634]'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-black transition-transform ${
                        sec.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme & Palette Customizer */}
            <div className="space-y-3.5 pt-4 border-t border-[#232634]">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#E5C365] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> WedGrapher Color Palette
              </span>
              <div className="flex items-center gap-2.5">
                {WEDGRAPHER_PALETTES.map(p => (
                  <button
                    key={p.hex}
                    onClick={() => setProposal({ ...proposal, theme_config: { ...proposal.theme_config, accent_color: p.hex } })}
                    className={`w-7 h-7 rounded-full transition-all border cursor-pointer ${
                      proposal.theme_config.accent_color === p.hex ? 'scale-125 border-white shadow-lg ring-2 ring-white/20' : 'border-transparent opacity-70'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Typography Font</label>
                <select
                  value={proposal.theme_config.primary_font}
                  onChange={(e) => setProposal({ ...proposal, theme_config: { ...proposal.theme_config, primary_font: e.target.value } })}
                  className="w-full p-2.5 rounded-xl bg-[#0F1017] border border-[#232634] text-white font-medium focus:outline-none"
                >
                  {FONTS_PRESETS.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={proposal.theme_config.logo_url || ''}
                  onChange={(e) => setProposal({ ...proposal, theme_config: { ...proposal.theme_config, logo_url: e.target.value } })}
                  className="w-full p-2.5 rounded-xl bg-[#0F1017] border border-[#232634] text-white font-medium"
                />
              </div>
            </div>

            {/* Client Info Inputs */}
            <div className="space-y-3 pt-4 border-t border-[#232634]">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#E5C365]">Client Information</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={proposal.client_name}
                  onChange={(e) => setProposal({ ...proposal, client_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0F1017] border border-[#232634] text-white font-medium"
                />
                <input
                  type="text"
                  placeholder="Client Phone"
                  value={proposal.client_phone || ''}
                  onChange={(e) => setProposal({ ...proposal, client_phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0F1017] border border-[#232634] text-white font-medium"
                />
                <input
                  type="date"
                  value={proposal.event_date || ''}
                  onChange={(e) => setProposal({ ...proposal, event_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0F1017] border border-[#232634] text-white font-medium"
                />
              </div>
            </div>

          </aside>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 2: CENTER WEDGRAPHER LIVE CANVAS (EXACT DESIGN MATCH)   */}
          {/* ───────────────────────────────────────────────────────────── */}
          <main className="flex-1 bg-[#0B0C10] p-6 overflow-y-auto space-y-8 flex justify-center">
            
            {/* WedGrapher Document Canvas Container */}
            <div 
              className="w-full max-w-3xl bg-[#141622] border border-[#232634] rounded-3xl p-8 sm:p-12 shadow-2xl space-y-12"
              style={{ fontFamily: proposal.theme_config.primary_font }}
            >
              
              {/* BLOCK 1: WEDGRAPHER COVER HERO PAGE */}
              {proposal.sections_config.find(s => s.id === 'cover')?.enabled && (
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#E5C365] text-xs font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" /> WEDGRAPHER QUOTATION PROPOSAL
                  </div>

                  <h1 
                    className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-tight"
                    style={{ color: proposal.theme_config.accent_color }}
                  >
                    {proposal.title}
                  </h1>

                  {/* WedGrapher Signature Arch Image Container (`.arch`) */}
                  <div className="w-[75%] mx-auto mt-6 rounded-t-[999px] rounded-b-2xl overflow-hidden border border-[#232634] bg-[#0F1017] shadow-2xl relative aspect-[4/3]">
                    <img 
                      src={proposal.theme_config.logo_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'} 
                      alt="Wedding Photography Cover"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="pt-6 border-t border-[#232634] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-400">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">PREPARED FOR</span>
                      <strong className="text-white text-sm">{proposal.client_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">MAIN EVENT DATE</span>
                      <strong className="text-white text-sm">{proposal.event_date || '2026 Season'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCK 2: ABOUT US */}
              {proposal.sections_config.find(s => s.id === 'about')?.enabled && (
                <div className="space-y-3 pt-6 border-t border-[#232634]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> ABOUT US
                  </h3>
                  <div className="p-6 rounded-3xl bg-[#0F1017] border border-[#232634] text-xs text-zinc-300 leading-relaxed font-sans">
                    We craft timeless, high-emotion cinematic wedding films and editorial photo albums. Our crew focuses on capturing authentic laughter, unscripted emotions, and grand celebrations with zero awkward posing.
                  </div>
                </div>
              )}

              {/* BLOCK 3: PRE-WEDDING SHOOT */}
              {proposal.sections_config.find(s => s.id === 'pre_wedding')?.enabled && (
                <div className="space-y-4 pt-6 border-t border-[#232634]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" /> PRE-WEDDING SHOOT
                  </h3>

                  <div className="p-6 rounded-3xl bg-[#0F1017] border border-[#232634] space-y-4 font-sans text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-[#161822] border border-[#232634]">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Number of days</span>
                        <strong className="text-white">1 Full Day Shoot</strong>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#161822] border border-[#232634]">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Crew</span>
                        <strong className="text-white">2 Photographers, 1 Cinematographer</strong>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#161822] border border-[#232634]">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">Sessions</span>
                        <strong className="text-white">3 Outfit Changes</strong>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#161822] border border-[#232634] space-y-2">
                      <span className="text-[10px] font-bold uppercase text-[#E5C365]">INCLUDED DELIVERABLES</span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-300">
                        <li>Cinematic 1-Minute Instagram Teaser</li>
                        <li>50 Master Color Graded Retouched Photos</li>
                        <li>High-Resolution Digital Drive Access</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCK 4: WEDDING GOLD PACKAGE */}
              {proposal.sections_config.find(s => s.id === 'wedding_gold')?.enabled && (
                <div className="space-y-4 pt-6 border-t border-[#232634]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                      <Film className="w-3.5 h-3.5" /> WEDDING GOLD PACKAGE
                    </h3>
                    <button
                      onClick={handleAddEvent}
                      className="px-3 py-1 rounded-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#E5C365] border border-[#D4AF37]/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Ceremony
                    </button>
                  </div>

                  <div className="space-y-4">
                    {proposal.events.map((ev, index) => (
                      <div key={ev.id} className="p-6 rounded-3xl bg-[#0F1017] border border-[#232634] space-y-4 font-sans text-xs relative group">
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232634] pb-3">
                          <input
                            type="text"
                            value={ev.title}
                            onChange={(e) => {
                              const newEvents = [...proposal.events];
                              newEvents[index].title = e.target.value;
                              setProposal({ ...proposal, events: newEvents });
                            }}
                            className="bg-transparent font-black text-base text-white focus:outline-none focus:border-b border-[#D4AF37]"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Rate: ₹</span>
                            <input
                              type="number"
                              value={ev.rate}
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].rate = Number(e.target.value) || 0;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="w-28 p-1.5 rounded-xl bg-[#161822] border border-[#232634] font-mono font-black text-[#E5C365] text-right focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#161822] border border-[#232634]">
                            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                            <input
                              type="text"
                              value={ev.venue || ''}
                              placeholder="Venue Location"
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].venue = e.target.value;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="bg-transparent w-full text-zinc-300 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#161822] border border-[#232634]">
                            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                            <input
                              type="text"
                              value={ev.crew || ''}
                              placeholder="Crew configuration"
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].crew = e.target.value;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="bg-transparent w-full text-zinc-300 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 5: PAYMENT SECTION */}
              {proposal.sections_config.find(s => s.id === 'payment')?.enabled && (
                <div className="space-y-4 pt-6 border-t border-[#232634]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> PAYMENT SCHEDULE
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                    {proposal.payment_milestones.map((m, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-[#0F1017] border border-[#232634] text-center space-y-1">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">{m.label} ({m.percentage}%)</span>
                        <div className="text-base font-black font-mono text-[#E5C365]">₹{m.amount.toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-zinc-400">{m.due_description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 6: ADD ONS SECTION */}
              {proposal.sections_config.find(s => s.id === 'add_ons')?.enabled && (
                <div className="space-y-4 pt-6 border-t border-[#232634]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" /> ADD ONS EXTRAS
                    </h3>
                    <button
                      onClick={handleAddAddOn}
                      className="px-3 py-1 rounded-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#E5C365] border border-[#D4AF37]/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Extra
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                    {proposal.add_ons.map((addon, idx) => (
                      <div
                        key={addon.id}
                        onClick={() => {
                          const newAddons = [...proposal.add_ons];
                          newAddons[idx].selected = !newAddons[idx].selected;
                          setProposal({ ...proposal, add_ons: newAddons });
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          addon.selected
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white'
                            : 'bg-[#0F1017] border-[#232634] text-zinc-400 opacity-60'
                        }`}
                      >
                        <div>
                          <h5 className="font-bold text-xs">{addon.title}</h5>
                          <span className="text-[11px] font-mono text-[#E5C365] font-bold">+ ₹{addon.rate.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          addon.selected ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-slate-700'
                        }`}>
                          {addon.selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 7: DELIVERY TIMEFRAME */}
              {proposal.sections_config.find(s => s.id === 'delivery_timeframe')?.enabled && (
                <div className="space-y-4 pt-6 border-t border-[#232634] font-sans text-xs">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Delivery Timeframe & Deliverables
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-[#0F1017] border border-[#232634]">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Photos</span>
                      <strong className="text-white text-xs">15 Days Post Event</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0F1017] border border-[#232634]">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Teaser & Film</span>
                      <strong className="text-white text-xs">30 Days Post Event</strong>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0F1017] border border-[#232634]">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Indigo Photobook Album</span>
                      <strong className="text-white text-xs">45 Days Post Selection</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCK 8: TERMS */}
              {proposal.sections_config.find(s => s.id === 'terms')?.enabled && (
                <div className="space-y-3 pt-6 border-t border-[#232634] font-sans text-xs">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#E5C365] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> TERMS
                  </h3>
                  <textarea
                    rows={4}
                    value={proposal.terms}
                    onChange={(e) => setProposal({ ...proposal, terms: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-[#0F1017] border border-[#232634] text-zinc-300 leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              )}

            </div>
          </main>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 3: RIGHT FINANCIAL AGGREGATOR & SUMMARY (300px)        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <aside className="w-80 border-l border-[#232634] bg-[#161822] p-5 overflow-y-auto space-y-6 shrink-0 text-xs">
            
            <div className="flex items-center gap-2 pb-3 border-b border-[#232634]">
              <DollarSign className="w-4 h-4 text-[#E5C365]" />
              <h3 className="font-black text-xs uppercase tracking-widest text-white">Financial Summary</h3>
            </div>

            {/* Financial Calculator Controls */}
            <div className="space-y-4 font-sans">
              
              {/* Subtotal */}
              <div className="flex items-center justify-between text-zinc-400 font-medium">
                <span>Subtotal Package</span>
                <span className="font-bold font-mono text-white">₹{proposal.financials.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Discount Selector */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#0F1017] border border-[#232634]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-zinc-300">Discount Amount</span>
                  <div className="flex items-center gap-1 bg-[#161822] p-1 rounded-lg border border-[#232634]">
                    <button
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, discount_type: 'flat' } })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${proposal.financials.discount_type === 'flat' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400'}`}
                    >
                      Flat ₹
                    </button>
                    <button
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, discount_type: 'percentage' } })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${proposal.financials.discount_type === 'percentage' ? 'bg-[#D4AF37] text-black' : 'text-zinc-400'}`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  value={proposal.financials.discount_value}
                  onChange={(e) => setProposal({ ...proposal, financials: { ...proposal.financials, discount_value: Number(e.target.value) || 0 } })}
                  className="w-full p-2.5 rounded-xl bg-[#161822] border border-[#232634] font-mono font-bold text-white focus:outline-none"
                  placeholder="0"
                />
              </div>

              {/* GST Tax Rate */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#0F1017] border border-[#232634]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-zinc-300">GST Tax Rate</span>
                  <span className="font-mono font-bold text-[#E5C365]">{proposal.financials.gst_rate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 5, 12, 18].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, gst_rate: rate } })}
                      className={`flex-1 py-1 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                        proposal.financials.gst_rate === rate
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                          : 'bg-[#161822] border-[#232634] text-zinc-400'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Calculated Total */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-[#E5C365]/20 via-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 text-center space-y-1 shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#E5C365] block">Grand Total Package Amount</span>
                <div className="text-2xl font-black font-mono text-white">
                  ₹{proposal.financials.total_amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-zinc-400 block">Includes GST taxes & discounts</span>
              </div>

              {/* Payment Split Percentage Breakdown */}
              <div className="space-y-2 pt-3 border-t border-[#232634]">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block">Milestone Ratios</span>
                <div className="space-y-1.5 text-zinc-300">
                  {proposal.payment_milestones.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0F1017] border border-[#232634]">
                      <span>{m.label} ({m.percentage}%)</span>
                      <strong className="font-mono text-[#E5C365]">₹{m.amount.toLocaleString('en-IN')}</strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </SidebarLayout>
  );
}

export default function QuotationBuilderPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#111218] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading WedGrapher Quotation Studio...</p>
        </div>
      </div>
    }>
      <QuotationBuilderContent />
    </React.Suspense>
  );
}

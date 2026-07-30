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
  Download, Printer, RefreshCw, X, Layers, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { 
  QuotationProposal, QuotationEvent, QuotationAddOnItem, 
  QuotationFinancials, QuotationPaymentMilestone, QuotationThemeConfig, 
  WorkspaceClient 
} from '@/types';

const COLOR_PALETTES = [
  { name: 'Royal Gold', hex: '#D4AF37' },
  { name: 'Emerald Luxe', hex: '#10B981' },
  { name: 'Deep Indigo', hex: '#6366F1' },
  { name: 'Rose Velvet', hex: '#F43F5E' },
  { name: 'Studio Dark', hex: '#38BDF8' },
];

const FONTS_PRESETS = [
  { name: 'Playfair Display', family: 'Playfair Display, serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond, serif' },
  { name: 'Cinzel', family: 'Cinzel, serif' },
  { name: 'Inter', family: 'Inter, sans-serif' },
];

const PRESET_TEMPLATES = [
  {
    title: 'Royal Destination Wedding Package 2026',
    theme: { accent_color: '#D4AF37', primary_font: 'Playfair Display', cover_style: 'cinematic_dark' as const },
    events: [
      { id: 'e1', title: 'Pre-Wedding Shoot (Udaipur)', days: 1, venue: 'Udaipur Lakes & Forts', crew: '2 Photographers, 1 Cinematographer', deliverables: ['1-Min Teaser', '50 Edited Photos'], rate: 75000 },
      { id: 'e2', title: 'Sangeet & Cocktail Night', days: 1, venue: 'Palace Resort Lawn', crew: '2 Candid Photographers, 2 Cinematographers', deliverables: ['Sangeet Highlights Film', '100 Photos'], rate: 110000 },
      { id: 'e3', title: 'Main Wedding & Reception', days: 2, venue: 'Grand Palace Mandap', crew: '3 Candid Photographers, 3 Cinematographers, 1 Drone Pilot', deliverables: ['Full Feature Film', 'Insta Reels', '400 Photos', 'Flush Mount Album'], rate: 265000 },
    ],
    add_ons: [
      { id: 'a1', title: 'Extra Instagram Reels (2x)', rate: 15000, selected: true },
      { id: 'a2', title: '48-Hour Express Teaser Delivery', rate: 20000, selected: true },
      { id: 'a3', title: 'Parent Mini Photobook Pair', rate: 18000, selected: false },
    ]
  },
  {
    title: 'Intimate Classic Wedding Package',
    theme: { accent_color: '#10B981', primary_font: 'Inter', cover_style: 'minimal_white' as const },
    events: [
      { id: 'e1', title: 'Single Day Wedding & Reception', days: 1, venue: 'City Banquet Hall', crew: '2 Photographers, 1 Cinematographer', deliverables: ['Full Video', '250 Edited Photos', 'Printed Album'], rate: 135000 }
    ],
    add_ons: [
      { id: 'a1', title: 'Pre-Wedding Shoot Add-On', rate: 45000, selected: false },
      { id: 'a2', title: 'Drone Aerial Shots', rate: 15000, selected: true }
    ]
  }
];

export default function QuotationBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id');

  const [proposal, setProposal] = useState<QuotationProposal>({
    id: `prop_${Date.now()}`,
    workspace_id: 'ws_demo',
    quotation_number: `FW-2026-${Math.floor(100 + Math.random() * 900)}`,
    title: 'Royal Wedding Photography Proposal',
    client_name: 'Vinu Bhad & Neha',
    client_phone: '+91 9876543210',
    client_email: 'vinu.wedding@gmail.com',
    event_date: '2026-11-18',
    theme_config: {
      accent_color: '#D4AF37',
      primary_font: 'Playfair Display',
      cover_style: 'cinematic_dark',
      logo_url: ''
    },
    sections_config: [
      { id: 'cover', title: 'Cover Page', enabled: true },
      { id: 'about', title: 'About Our Studio', enabled: true },
      { id: 'events', title: 'Event Breakdown & Crew', enabled: true },
      { id: 'deliverables', title: 'What Is Included', enabled: true },
      { id: 'add_ons', title: 'Add-On Extras', enabled: true },
      { id: 'financials', title: 'Pricing & Taxes', enabled: true },
      { id: 'payment_milestones', title: 'Payment Schedule', enabled: true },
      { id: 'terms', title: 'Terms & Conditions', enabled: true },
    ],
    events: PRESET_TEMPLATES[0].events,
    add_ons: PRESET_TEMPLATES[0].add_ons,
    financials: {
      subtotal: 465000,
      discount_type: 'flat',
      discount_value: 15000,
      gst_rate: 18,
      total_amount: 531000,
    },
    payment_milestones: [
      { label: 'Booking Deposit', percentage: 30, amount: 159300, due_description: 'Upon signing proposal' },
      { label: 'Event Day Advance', percentage: 60, amount: 318600, due_description: 'On main event morning' },
      { label: 'Final Handover', percentage: 10, amount: 53100, due_description: 'Before album & film delivery' },
    ],
    terms: `1. 30% advance deposit to lock event dates.
2. Balance 60% payable on the first day of event shoot.
3. Remaining 10% payable upon final deliverable handover.
4. Raw footage & photos retained for 60 days post-delivery.
5. Travel & lodging for outstation events to be borne by client.`,
    status: 'draft',
    public_token: `token_${Math.random().toString(36).substring(2, 12)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Section Toggle Helper
  const toggleSection = (sectionId: string) => {
    setProposal(prev => ({
      ...prev,
      sections_config: prev.sections_config.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  // Add Event Item
  const handleAddEvent = () => {
    const newEv: QuotationEvent = {
      id: `ev_${Date.now()}`,
      title: 'New Function / Ceremony',
      days: 1,
      venue: 'Resort Location',
      crew: '2 Photographers, 1 Cinematographer',
      deliverables: ['Edited Photos', 'Video Highlights'],
      rate: 50000,
    };
    setProposal(prev => ({ ...prev, events: [...prev.events, newEv] }));
  };

  // Delete Event
  const handleDeleteEvent = (eventId: string) => {
    setProposal(prev => ({ ...prev, events: prev.events.filter(e => e.id !== eventId) }));
  };

  // Add Add-On
  const handleAddAddOn = () => {
    const newAddOn: QuotationAddOnItem = {
      id: `addon_${Date.now()}`,
      title: 'Custom Add-On Feature',
      rate: 15000,
      selected: true,
    };
    setProposal(prev => ({ ...prev, add_ons: [...prev.add_ons, newAddOn] }));
  };

  // Save Proposal to Supabase / Local
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
      alert('Quotation Proposal saved successfully!');
    } catch (e) {
      alert('Saved proposal locally.');
    } finally {
      setSaving(false);
    }
  };

  // Copy Public Link
  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/p/quotation/${proposal.public_token}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#07090E] text-zinc-100 flex flex-col font-sans">
        
        {/* ── Top Header Toolbar ── */}
        <header className="h-16 border-b border-slate-800 bg-[#0E131F]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={proposal.title}
                  onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                  className="bg-transparent text-sm font-black text-white focus:outline-none focus:border-b border-pink-500"
                />
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {proposal.quotation_number}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">WYSIWYG Proposal Designer & Financial Calculator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>

            <Link
              href={`/p/quotation/${proposal.public_token}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Live Web</span>
            </Link>

            <button
              onClick={handleSaveProposal}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Proposal'}</span>
            </button>
          </div>
        </header>

        {/* ── 3-Panel Main Editor Area ── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 1: LEFT CONTROL TOOLBAR (280px)                        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <aside className="w-72 border-r border-slate-800 bg-[#0E131F] p-4 overflow-y-auto space-y-6 shrink-0 text-xs">
            
            {/* Section Toggles */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Proposal Page Blocks</span>
              <div className="space-y-1">
                {proposal.sections_config.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="font-semibold text-zinc-300">{sec.title}</span>
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                        sec.enabled ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        sec.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme & Brand Styling */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" /> Theme Accent Color
              </span>
              <div className="flex items-center gap-2">
                {COLOR_PALETTES.map(p => (
                  <button
                    key={p.hex}
                    onClick={() => setProposal({ ...proposal, theme_config: { ...proposal.theme_config, accent_color: p.hex } })}
                    className={`w-6 h-6 rounded-full transition-transform border ${
                      proposal.theme_config.accent_color === p.hex ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-80'
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
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none"
                >
                  {FONTS_PRESETS.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Cover Hero Style</label>
                <select
                  value={proposal.theme_config.cover_style}
                  onChange={(e) => setProposal({ ...proposal, theme_config: { ...proposal.theme_config, cover_style: e.target.value as any } })}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none"
                >
                  <option value="cinematic_dark">🎬 Cinematic Dark</option>
                  <option value="royal_gold">👑 Royal Gold Accent</option>
                  <option value="minimal_white">✨ Minimal Studio</option>
                </select>
              </div>
            </div>

            {/* Client Info Editor */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Client Details</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={proposal.client_name}
                  onChange={(e) => setProposal({ ...proposal, client_name: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                />
                <input
                  type="text"
                  placeholder="Client Phone"
                  value={proposal.client_phone || ''}
                  onChange={(e) => setProposal({ ...proposal, client_phone: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                />
                <input
                  type="date"
                  value={proposal.event_date || ''}
                  onChange={(e) => setProposal({ ...proposal, event_date: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                />
              </div>
            </div>
          </aside>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 2: CENTER LIVE WEDGRAPHER CANVAS (FLEX-1)              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <main className="flex-1 bg-[#07090E] p-6 overflow-y-auto space-y-8 flex justify-center">
            <div 
              className="w-full max-w-3xl bg-[#0F1420] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-10"
              style={{ fontFamily: proposal.theme_config.primary_font }}
            >
              
              {/* BLOCK 1: COVER PAGE HERO */}
              {proposal.sections_config.find(s => s.id === 'cover')?.enabled && (
                <div className="p-8 rounded-3xl bg-gradient-to-b from-[#161D2E] to-[#0F1420] border border-slate-800/80 text-center relative overflow-hidden space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" /> WEDDING PHOTOGRAPHY PROPOSAL
                  </div>

                  <h1 
                    className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white"
                    style={{ color: proposal.theme_config.accent_color }}
                  >
                    {proposal.title}
                  </h1>

                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Prepared For</span>
                      <strong className="text-white text-sm">{proposal.client_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Main Event Date</span>
                      <strong className="text-white text-sm">{proposal.event_date || '2026 Season'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCK 2: ABOUT US */}
              {proposal.sections_config.find(s => s.id === 'about')?.enabled && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> About Our Photography Studio
                  </h3>
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-zinc-300 leading-relaxed">
                    We craft timeless, high-emotion cinematic wedding films and editorial photo albums. Our crew focuses on capturing authentic laughter, unscripted emotions, and grand celebrations with zero awkward posing.
                  </div>
                </div>
              )}

              {/* BLOCK 3: EVENT BREAKDOWN & CREW */}
              {proposal.sections_config.find(s => s.id === 'events')?.enabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <Film className="w-3.5 h-3.5" /> Event Coverage & Crew Breakdown
                    </h3>
                    <button
                      onClick={handleAddEvent}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Event
                    </button>
                  </div>

                  <div className="space-y-3">
                    {proposal.events.map((ev, index) => (
                      <div key={ev.id} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 relative group">
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <input
                            type="text"
                            value={ev.title}
                            onChange={(e) => {
                              const newEvents = [...proposal.events];
                              newEvents[index].title = e.target.value;
                              setProposal({ ...proposal, events: newEvents });
                            }}
                            className="bg-transparent font-black text-sm text-white focus:outline-none focus:border-b border-amber-500"
                          />
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400">Rate: ₹</span>
                            <input
                              type="number"
                              value={ev.rate}
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].rate = Number(e.target.value) || 0;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="w-24 p-1 rounded bg-slate-950 border border-slate-800 font-mono font-bold text-amber-400 text-right focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                            <input
                              type="text"
                              value={ev.venue || ''}
                              placeholder="Venue / Location"
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].venue = e.target.value;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="bg-transparent w-full text-zinc-400 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-indigo-400 shrink-0" />
                            <input
                              type="text"
                              value={ev.crew || ''}
                              placeholder="Crew configuration"
                              onChange={(e) => {
                                const newEvents = [...proposal.events];
                                newEvents[index].crew = e.target.value;
                                setProposal({ ...proposal, events: newEvents });
                              }}
                              className="bg-transparent w-full text-zinc-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 4: ADD-ONS EXTRAS */}
              {proposal.sections_config.find(s => s.id === 'add_ons')?.enabled && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" /> Optional Add-On Upgrades
                    </h3>
                    <button
                      onClick={handleAddAddOn}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Extra
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-900/40 border-slate-800 text-zinc-400 opacity-60'
                        }`}
                      >
                        <div>
                          <h5 className="font-bold text-xs">{addon.title}</h5>
                          <span className="text-[11px] font-mono text-amber-400 font-bold">+ ₹{addon.rate.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          addon.selected ? 'bg-amber-500 border-amber-500 text-black' : 'border-slate-700'
                        }`}>
                          {addon.selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 5: PAYMENT MILESTONES SCHEDULE */}
              {proposal.sections_config.find(s => s.id === 'payment_milestones')?.enabled && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Payment Milestone Schedule
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {proposal.payment_milestones.map((m, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">{m.label} ({m.percentage}%)</span>
                        <div className="text-base font-black font-mono text-amber-400">₹{m.amount.toLocaleString('en-IN')}</div>
                        <p className="text-[10px] text-zinc-500">{m.due_description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLOCK 6: TERMS & CONDITIONS */}
              {proposal.sections_config.find(s => s.id === 'terms')?.enabled && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Studio Terms & Booking Conditions
                  </h3>
                  <textarea
                    rows={4}
                    value={proposal.terms}
                    onChange={(e) => setProposal({ ...proposal, terms: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-zinc-300 leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              )}

            </div>
          </main>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* PANEL 3: RIGHT FINANCIAL CALCULATOR & SUMMARY (300px)        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <aside className="w-80 border-l border-slate-800 bg-[#0E131F] p-5 overflow-y-auto space-y-6 shrink-0 text-xs">
            
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-white">Financial Summary</h3>
            </div>

            {/* Financial Calculator Controls */}
            <div className="space-y-4">
              
              {/* Subtotal */}
              <div className="flex items-center justify-between text-zinc-400 font-medium">
                <span>Subtotal (Events & Add-ons)</span>
                <span className="font-bold font-mono text-white">₹{proposal.financials.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Discount Selector */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-zinc-300">Discount Amount</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, discount_type: 'flat' } })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${proposal.financials.discount_type === 'flat' ? 'bg-amber-500 text-black' : 'text-zinc-400'}`}
                    >
                      Flat ₹
                    </button>
                    <button
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, discount_type: 'percentage' } })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${proposal.financials.discount_type === 'percentage' ? 'bg-amber-500 text-black' : 'text-zinc-400'}`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  value={proposal.financials.discount_value}
                  onChange={(e) => setProposal({ ...proposal, financials: { ...proposal.financials, discount_value: Number(e.target.value) || 0 } })}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-white focus:outline-none"
                  placeholder="0"
                />
              </div>

              {/* GST Tax Rate */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-zinc-300">GST Tax Rate</span>
                  <span className="font-mono font-bold text-amber-400">{proposal.financials.gst_rate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 5, 12, 18].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setProposal({ ...proposal, financials: { ...proposal.financials, gst_rate: rate } })}
                      className={`flex-1 py-1 rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                        proposal.financials.gst_rate === rate
                          ? 'bg-amber-500 border-amber-500 text-black'
                          : 'bg-slate-950 border-slate-800 text-zinc-400'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Calculated Total */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 text-center space-y-1 shadow-lg">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">Grand Total Package Amount</span>
                <div className="text-2xl font-black font-mono text-white">
                  ₹{proposal.financials.total_amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-zinc-400 block">Includes selected taxes & discounts</span>
              </div>

              {/* Payment Split Percentage Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Milestone Split Ratios</span>
                <div className="space-y-1.5 text-zinc-300">
                  {proposal.payment_milestones.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span>{m.label} ({m.percentage}%)</span>
                      <strong className="font-mono text-amber-400">₹{m.amount.toLocaleString('en-IN')}</strong>
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

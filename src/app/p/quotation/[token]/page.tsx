'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Sparkles, Film, Video, Camera, BookOpen, Calendar, 
  MapPin, Users, Download, Printer, Check, MessageSquare, AlertTriangle, 
  Phone, Mail, X, ShieldCheck, DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { QuotationProposal } from '@/types';

export default function PublicProposalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [proposal, setProposal] = useState<QuotationProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);

  // Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    fetchPublicProposal();
  }, [token]);

  const fetchPublicProposal = async () => {
    setLoading(true);
    try {
      if (token) {
        const { data, error } = await supabase
          .from('quotations')
          .select('*')
          .eq('public_token', token)
          .maybeSingle();

        if (!error && data) {
          setProposal(data);
          if (data.status === 'accepted') setAccepted(true);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching public proposal:', e);
    }

    // Demo fallback proposal if token is local/demo
    const demoProposal: QuotationProposal = {
      id: 'prop_demo',
      workspace_id: 'ws_demo',
      quotation_number: 'FW-2026-001',
      title: 'Royal Wedding Photography & Film Proposal',
      client_name: 'Vinu Bhad & Neha',
      client_phone: '+91 9876543210',
      client_email: 'vinu.wedding@gmail.com',
      event_date: '2026-11-18',
      theme_config: {
        accent_color: '#D4AF37',
        primary_font: 'Playfair Display',
        cover_style: 'cinematic_dark',
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
      events: [
        { id: 'e1', title: 'Pre-Wedding Shoot (Udaipur)', days: 1, venue: 'Udaipur Lakes & Forts', crew: '2 Photographers, 1 Cinematographer', deliverables: ['1-Min Teaser', '50 Edited Photos'], rate: 75000 },
        { id: 'e2', title: 'Sangeet & Cocktail Night', days: 1, venue: 'Palace Resort Lawn', crew: '2 Candid Photographers, 2 Cinematographers', deliverables: ['Sangeet Highlights Film', '100 Photos'], rate: 110000 },
        { id: 'e3', title: 'Main Wedding & Reception', days: 2, venue: 'Grand Palace Mandap', crew: '3 Candid Photographers, 3 Cinematographers, 1 Drone Pilot', deliverables: ['Full Feature Film', 'Insta Reels', '400 Photos', 'Flush Mount Album'], rate: 265000 },
      ],
      add_ons: [
        { id: 'a1', title: 'Extra Instagram Reels (2x)', rate: 15000, selected: true },
        { id: 'a2', title: '48-Hour Express Teaser Delivery', rate: 20000, selected: true },
      ],
      financials: {
        subtotal: 485000,
        discount_type: 'flat',
        discount_value: 15000,
        gst_rate: 18,
        total_amount: 554600,
      },
      payment_milestones: [
        { label: 'Booking Deposit', percentage: 30, amount: 166380, due_description: 'Upon signing proposal' },
        { label: 'Event Day Advance', percentage: 60, amount: 332760, due_description: 'On main event morning' },
        { label: 'Final Handover', percentage: 10, amount: 55460, due_description: 'Before album & film delivery' },
      ],
      terms: `1. 30% advance deposit to lock event dates.
2. Balance 60% payable on the first day of event shoot.
3. Remaining 10% payable upon final deliverable handover.
4. Raw footage & photos retained for 60 days post-delivery.
5. Travel & lodging for outstation events to be borne by client.`,
      status: 'draft',
      public_token: token || 'demo_token',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProposal(demoProposal);
    setLoading(false);
  };

  const handleAcceptProposal = async () => {
    if (!proposal) return;
    setAccepted(true);

    try {
      await supabase
        .from('quotations')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', proposal.id);
    } catch (e) {
      console.error('Error updating proposal status:', e);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !proposal) return;

    try {
      await supabase
        .from('quotations')
        .update({ client_notes: feedbackText, updated_at: new Date().toISOString() })
        .eq('id', proposal.id);
    } catch (e) {
      /* ignore */
    }

    setFeedbackSubmitted(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackSubmitted(false);
      setFeedbackText('');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading Wedding Proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Proposal Not Found</h2>
          <p className="text-xs text-zinc-400">This quotation proposal link may have expired or been moved.</p>
        </div>
      </div>
    );
  }

  const accentColor = proposal.theme_config.accent_color || '#D4AF37';

  return (
    <div className="min-h-screen bg-[#07090E] text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-300">
      
      {/* ── Top Floating Action Bar for Client ── */}
      <header className="print:hidden sticky top-0 z-40 bg-[#0E131F]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center font-black text-black text-xs shadow-md">
            FW
          </div>
          <div>
            <h1 className="text-xs font-bold text-white">{proposal.title}</h1>
            <p className="text-[10px] text-zinc-400">Quotation No: {proposal.quotation_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>Request Changes</span>
          </button>

          {accepted ? (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Proposal Accepted ✓</span>
            </div>
          ) : (
            <button
              onClick={handleAcceptProposal}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Accept Proposal</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main WedGrapher Proposal Document View ── */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-10 my-6">
        
        {/* HERO COVER BLOCK */}
        <div 
          className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#161D2E] to-[#0F1420] border border-slate-800 text-center relative overflow-hidden space-y-6 shadow-2xl"
          style={{ fontFamily: proposal.theme_config.primary_font }}
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> OFFICIAL WEDDING QUOTATION PROPOSAL
          </div>

          <h1 
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-tight"
            style={{ color: accentColor }}
          >
            {proposal.title}
          </h1>

          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-400">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">PREPARED FOR</span>
              <strong className="text-white text-sm">{proposal.client_name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">MAIN EVENT DATE</span>
              <strong className="text-white text-sm">{proposal.event_date || '2026 Wedding Season'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">PROPOSAL REF</span>
              <strong className="text-amber-400 text-sm font-mono">{proposal.quotation_number}</strong>
            </div>
          </div>
        </div>

        {/* ABOUT OUR STUDIO */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800 space-y-3 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> About Our Photography Approach
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            We specialize in high-end candid wedding photography, drone cinematography, and hand-crafted heirloom photobooks. Our team brings an artistic, non-obstructive approach so you can focus on celebrating while we capture true, unscripted moments.
          </p>
        </div>

        {/* EVENT BREAKDOWN & CREW */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <Film className="w-3.5 h-3.5" /> Event Coverage & Crew Breakdown
          </h3>

          <div className="space-y-4">
            {proposal.events.map((ev) => (
              <div key={ev.id} className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-black text-white">{ev.title}</h4>
                    <span className="text-[11px] text-zinc-400 font-medium">Duration: {ev.days} Day(s)</span>
                  </div>
                  <div className="text-base font-black font-mono text-amber-400">
                    ₹{ev.rate.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                  {ev.venue && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Venue / Location</span>
                        <span className="font-semibold text-white">{ev.venue}</span>
                      </div>
                    </div>
                  )}

                  {ev.crew && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Assigned Crew</span>
                        <span className="font-semibold text-white">{ev.crew}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WHAT IS INCLUDED (DELIVERABLES) */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> What Is Included In Your Package
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All Ultra FHD Raw Photos Delivered</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Master Color Graded HD Edited Photos</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cinematic Wedding Highlight Film</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instagram Teaser & Reels</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Flush Mount Photobook Albums</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1 Year Cloud Drive Access</span>
            </div>
          </div>
        </div>

        {/* ADD-ONS EXTRAS */}
        {proposal.add_ons && proposal.add_ons.length > 0 && (
          <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Selected Add-On Extras
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {proposal.add_ons.filter(a => a.selected).map(addon => (
                <div key={addon.id} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-white flex items-center justify-between">
                  <span className="font-bold">{addon.title}</span>
                  <span className="font-mono font-bold text-amber-400">+ ₹{addon.rate.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINANCIALS & PAYMENT SCHEDULE */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#161D2E] to-[#0F1420] border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Investment Summary</h3>
              <p className="text-xs text-zinc-400">Complete pricing inclusive of taxes and discounts</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Total Investment</span>
              <div className="text-3xl font-black font-mono text-white">
                ₹{proposal.financials.total_amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment Milestone Ratios</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {proposal.payment_milestones.map((m, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">{m.label} ({m.percentage}%)</span>
                  <div className="text-base font-black font-mono text-amber-400">₹{m.amount.toLocaleString('en-IN')}</div>
                  <p className="text-[10px] text-zinc-500">{m.due_description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TERMS & CONDITIONS */}
        <div className="p-6 rounded-3xl bg-[#0F1420] border border-slate-800 space-y-3 shadow-xl text-xs">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Studio Booking Terms & Policies
          </h3>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-zinc-300 leading-relaxed whitespace-pre-line font-mono">
            {proposal.terms}
          </div>
        </div>

      </main>

      {/* ── Request Changes Modal ── */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121824] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black">Request Changes to Proposal</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {feedbackSubmitted ? (
                <div className="py-8 text-center text-emerald-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto" />
                  <p className="font-bold text-sm">Feedback Sent To Studio!</p>
                  <p className="text-xs text-zinc-400">The studio manager will update your proposal shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                  <p className="text-zinc-400">Specify any custom deliverable, date, or pricing modifications you would like to request:</p>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Please add 2 extra photobooks and confirm crew travel..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                    >
                      Send Request
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

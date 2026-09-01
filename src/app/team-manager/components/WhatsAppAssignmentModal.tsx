'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Copy, MessageCircle, Send, Calendar, Clock, MapPin, 
  User, CheckCheck, Sparkles, Phone, ExternalLink, IndianRupee,
  CreditCard, CheckCircle2, ShieldCheck, Tag, FileText, ArrowRight
} from 'lucide-react';
import { FWTeamMember, FWProject, FWSubEvent } from '@/types';
import { assignCrewMemberWithCommercials, fetchWorkspaceMemberRate } from '@/lib/team-finance-sync';

export interface WhatsAppAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember | null;
  role: string;
  project: FWProject | null;
  subEvent: FWSubEvent | null;
  workspaceId?: string;
  studioName?: string;
  projectManagerName?: string;
  onCommercialsSaved?: () => void;
}

export default function WhatsAppAssignmentModal({
  isOpen,
  onClose,
  member,
  role,
  project,
  subEvent,
  workspaceId = '',
  studioName = 'Filmify Weddings',
  projectManagerName = 'Studio Manager',
  onCommercialsSaved,
}: WhatsAppAssignmentModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'commercials' | 'whatsapp'>('commercials');
  
  // Commercials State
  const [agreedAmount, setAgreedAmount] = useState<string>('0');
  const [advancePaid, setAdvancePaid] = useState<string>('0');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'completed'>('pending');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI/Bank Transfer' | 'Cash' | 'Cheque'>('UPI/Bank Transfer');
  const [notes, setNotes] = useState<string>('');
  const [isSavingCommercials, setIsSavingCommercials] = useState(false);
  const [commercialsSaved, setCommercialsSaved] = useState(false);

  // Initialize or reset on open (Preserve custom negotiated fee if already saved)
  useEffect(() => {
    if (isOpen && member) {
      (async () => {
        const effectiveWsId = workspaceId || (member as any).workspace_id || '';
        let existingAgreed: number | null = null;
        let existingAdvance: number | null = null;
        let existingStatus: 'pending' | 'partial' | 'completed' = 'pending';
        let existingMethod = 'UPI/Bank Transfer';
        let existingDate = new Date().toISOString().split('T')[0];
        let existingNotes = '';

        // 1. Check if an existing assignment for this sub-event & role already has a saved custom rate
        if (subEvent?.id) {
          try {
            const { data: assignRow } = await supabase
              .from('fw_assignments')
              .select('agreed_amount, advance_amount, payment_status, payment_method, payment_date, notes')
              .eq('sub_event_id', subEvent.id)
              .eq('required_role', role)
              .maybeSingle();

            if (assignRow && Number(assignRow.agreed_amount) > 0) {
              existingAgreed = Number(assignRow.agreed_amount);
              existingAdvance = Number(assignRow.advance_amount) || 0;
              existingStatus = (assignRow.payment_status as any) || 'pending';
              if (assignRow.payment_method) existingMethod = assignRow.payment_method;
              if (assignRow.payment_date) existingDate = assignRow.payment_date;
              if (assignRow.notes) existingNotes = assignRow.notes;
            }
          } catch (_) {}
        }

        // 2. If no custom agreed rate exists for this shoot, fall back to member's default daily rate
        if (existingAgreed == null) {
          let rate = member.default_daily_rate ?? member.daily_rate;
          if ((rate == null || rate === 0) && effectiveWsId) {
            const wsRate = await fetchWorkspaceMemberRate(effectiveWsId, member.id);
            if (wsRate != null && wsRate > 0) rate = wsRate;
          }
          existingAgreed = rate != null ? rate : 0;
        }

        setAgreedAmount(String(existingAgreed));
        setAdvancePaid(String(existingAdvance || 0));
        setPaymentStatus(existingStatus);
        setPaymentDate(existingDate);
        setPaymentMethod(existingMethod as any);
        setNotes(existingNotes);
      })();
      setCommercialsSaved(false);
      setCopied(false);
    }
  }, [isOpen, member, subEvent?.id, role, workspaceId]);

  // Handle Advance change and auto update status
  const handleAdvanceChange = (val: string) => {
    setAdvancePaid(val);
    const adv = Number(val) || 0;
    const agr = Number(agreedAmount) || 0;
    if (agr > 0 && adv >= agr) {
      setPaymentStatus('completed');
    } else if (adv > 0) {
      setPaymentStatus('partial');
    } else {
      setPaymentStatus('pending');
    }
  };

  // Handle Agreed amount change
  const handleAgreedChange = (val: string) => {
    setAgreedAmount(val);
    const agr = Number(val) || 0;
    const adv = Number(advancePaid) || 0;
    if (agr > 0 && adv >= agr) {
      setPaymentStatus('completed');
    } else if (adv > 0) {
      setPaymentStatus('partial');
    } else {
      setPaymentStatus('pending');
    }
  };

  if (!isOpen || !member) return null;

  const cleanMemberName = member.name ? member.name.replace(/\.\.\./g, '').trim() : 'Team Member';
  const clientName = project?.client_name || 'Wedding Shoot';
  const eventTitle = subEvent?.event_title || 'Wedding Event';
  
  // Format Date & Time
  let dateText = 'Date: TBD';
  if (subEvent?.event_date) {
    const d = new Date(subEvent.event_date);
    if (!isNaN(d.getTime())) {
      dateText = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  const isOvernight = Boolean(subEvent?.roll_call_time && subEvent?.dismissal_estimate_time && (
    subEvent.dismissal_estimate_time < subEvent.roll_call_time
  ));

  let timeText = 'Time: Flexible';
  if (subEvent?.roll_call_time) {
    const startFormatted = subEvent.roll_call_time;
    const endFormatted = subEvent.dismissal_estimate_time || 'Wrap';
    timeText = `${startFormatted} → ${endFormatted} ${isOvernight ? '(🌙 Overnight)' : ''}`;
  }

  const venueText = subEvent?.venue_name ? `${subEvent.venue_name}${subEvent.venue_map_link ? ` (${subEvent.venue_map_link})` : ''}` : 'Location will be shared soon';

  // Calculations
  const numericAgreed = Number(agreedAmount) || 0;
  const numericAdvance = Number(advancePaid) || 0;
  const balanceDue = Math.max(0, numericAgreed - numericAdvance);
  const statusLabel = paymentStatus === 'completed' ? '🟢 Completed' : paymentStatus === 'partial' ? '🟡 Partial' : '🔴 Pending';

  // Construct the exact WhatsApp message with Commercial Terms
  const whatsappMessage = `👋 Hello *${cleanMemberName}*,
You have been booked for an upcoming shoot!

🎬 *Project:* ${clientName}
🎪 *Event:* ${eventTitle}
📅 *Date:* ${dateText}
⏰ *Timing:* ${timeText}
📍 *Venue:* ${venueText}
💼 *Role:* ${role}
💰 *Agreed Fee:* ₹${numericAgreed.toLocaleString('en-IN')}
💵 *Advance Paid:* ₹${numericAdvance.toLocaleString('en-IN')}
⏳ *Balance Due:* ₹${balanceDue.toLocaleString('en-IN')}
📌 *Payment Status:* ${statusLabel}

Please confirm your slot.
— *${studioName}*`;

  // WhatsApp click to chat URL
  const rawPhone = member.phone_number || member.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(whatsappMessage);
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`}?text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Save Commercials to Database & Finance Sync
  const handleSaveCommercials = () => {
    // 1. INSTANT OPTIMISTIC CLOSE (0ms delay)
    onClose();

    // 2. TRIGGER BACKGROUND SILENT ASYNC PERSISTENCE
    const effectiveWsId = workspaceId || (member as any).workspace_id || '';
    assignCrewMemberWithCommercials({
      workspaceId: effectiveWsId,
      eventId: project?.id || '',
      subEventId: subEvent?.id || '',
      teamMemberId: member.id,
      teamMemberName: cleanMemberName,
      teamMemberPhone: member.phone_number || member.phone || '',
      roleName: role,
      finalAgreedAmount: numericAgreed,
      advancePaidAmount: numericAdvance,
      paymentStatus: paymentStatus,
      paymentDate: paymentDate,
      paymentMethod: paymentMethod,
      notes: notes || `Assigned via Team Manager for ${clientName} (${eventTitle})`,
      clientName: clientName,
      eventName: eventTitle
    }).then(() => {
      if (onCommercialsSaved) onCommercialsSaved();
    }).catch(err => {
      console.error('[WhatsAppAssignmentModal] Background save error:', err);
    });
  };

  const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const configuredDefaultRate = member.default_daily_rate ?? member.daily_rate ?? 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-4xl flex flex-col my-auto max-h-[92vh]"
        >
          {/* Top Modal Navigation Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Crew Assignment &amp; Commercials</h3>
                <p className="text-[10px] text-slate-400">Set commercial terms, sync to finance, and dispatch WhatsApp confirmation</p>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden items-center bg-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab('commercials')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'commercials' ? 'bg-amber-500 text-white' : 'text-slate-400'
                }`}
              >
                Commercials
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                WhatsApp
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Column Desktop Grid / Tabbed Mobile View */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-y-auto">
            
            {/* ── LEFT COLUMN: COMMERCIALS & PAYMENT TERMS ──────────────── */}
            <div className={`p-5 sm:p-6 space-y-4 bg-stone-50/50 ${
              activeTab === 'commercials' ? 'block' : 'hidden md:block'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-amber-600" />
                    <span>Crew Payment Terms</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {clientName} • {eventTitle}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                  {role}
                </span>
              </div>

              {/* Input Fields Grid */}
              <div className="space-y-3 pt-1">
                {/* Agreed Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Agreed Final Amount (₹)</span>
                    <span className="text-[10px] text-amber-700 font-medium">Default: ₹{configuredDefaultRate.toLocaleString('en-IN')}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={agreedAmount}
                      onChange={e => handleAgreedChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono shadow-2xs"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Advance Paid */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Advance Paid (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={advancePaid}
                      onChange={e => handleAdvanceChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono shadow-2xs"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Balance Due Display */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Balance Due</span>
                    <span className={`text-sm font-black font-mono ${
                      balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      ₹{balanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                    paymentStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : paymentStatus === 'partial'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Payment Status Dropdown & Payment Date */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={e => setPaymentStatus(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="pending">🔴 Pending</option>
                      <option value="partial">🟡 Partial</option>
                      <option value="completed">🟢 Completed</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Payment Date</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="UPI/Bank Transfer">UPI / GPay / Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Balance payable on shoot delivery"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Save & Confirm Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingCommercials}
                  onClick={handleSaveCommercials}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    commercialsSaved
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                  }`}
                >
                  {isSavingCommercials ? (
                    <span>Saving to Database...</span>
                  ) : commercialsSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Saved &amp; Confirmed!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save &amp; Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: WHATSAPP LIGHT PREVIEW ──────────────────── */}
            <div className={`flex flex-col justify-between bg-[#EFEAE2] ${
              activeTab === 'whatsapp' ? 'block' : 'hidden md:block'
            }`}>
              
              {/* WhatsApp Top Header Bar */}
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-300/30 overflow-hidden flex items-center justify-center font-bold text-xs border border-white/20">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={cleanMemberName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{cleanMemberName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{cleanMemberName}</h4>
                    <p className="text-[10px] text-emerald-200">
                      {rawPhone ? rawPhone : 'online'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded-full text-emerald-100 font-medium">
                  <MessageCircle className="w-3 h-3 text-emerald-300" />
                  <span>Official Roster</span>
                </div>
              </div>

              {/* Chat Canvas (Doodle Style) */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] max-w-md mx-auto w-full space-y-2.5 text-slate-800 text-xs border border-emerald-100/50"
                >
                  <p className="font-semibold leading-relaxed">
                    👋 Hello <span className="font-bold text-emerald-950">{cleanMemberName}</span>,<br />
                    You have been assigned as <strong className="text-amber-700">*{role}*</strong> for an upcoming shoot!
                  </p>

                  <div className="space-y-1 bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/80 font-mono text-[11px]">
                    <p>🎬 <strong>Project:</strong> {clientName}</p>
                    <p>🎪 <strong>Event:</strong> {eventTitle}</p>
                    <p>📅 <strong>Date:</strong> {dateText}</p>
                    <p>⏰ <strong>Timing:</strong> {timeText}</p>
                    <p>📍 <strong>Venue:</strong> {venueText}</p>
                    <div className="pt-1.5 mt-1.5 border-t border-dashed border-stone-200 space-y-0.5">
                      <p>💰 <strong>Agreed Fee:</strong> ₹{numericAgreed.toLocaleString('en-IN')}</p>
                      <p>💵 <strong>Advance Paid:</strong> ₹{numericAdvance.toLocaleString('en-IN')}</p>
                      <p>⏳ <strong>Balance Due:</strong> ₹{balanceDue.toLocaleString('en-IN')}</p>
                      <p>📌 <strong>Payment Status:</strong> {statusLabel}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Please confirm your availability.<br />
                    — <strong>{studioName}</strong>
                  </p>

                  {/* Timestamp & double checkmark */}
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                    <span>{currentTimeStr}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                </motion.div>
              </div>

              {/* Bottom WhatsApp Actions */}
              <div className="p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer w-full ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-slate-800'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy WhatsApp Text</span>
                    </>
                  )}
                </button>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer w-full"
                >
                  <Send className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

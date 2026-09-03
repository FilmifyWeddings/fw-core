'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Pencil,
  FileText,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Plus,
  CheckCircle2,
  Trash2,
  UserCheck,
  Check,
  X,
  CreditCard
} from 'lucide-react';
import MilestoneStepDropdown from '@/components/finance/MilestoneStepDropdown';
import type { ClientFinanceRecord, FinanceMilestoneItem } from '@/types';

interface ClientFinanceCardProps {
  record: ClientFinanceRecord;
  isExpanded: boolean;
  onToggle: () => void;
  todayStr: string;
  teamMembersList: string[];
  paymentMilestoneTemplates: string[];
  onAssignTeamMember: (clientId: string, memberName: string) => void;
  onAddNewTeamMember: (clientId: string, memberName: string) => void;
  onOpenPricingEditModal: (record: ClientFinanceRecord) => void;
  onOpenRecordPayment: (record: ClientFinanceRecord) => void;
  onOpenInvoiceModal: (record: ClientFinanceRecord) => void;
  onOpenCompletePaymentModal: (record: ClientFinanceRecord, milestone: FinanceMilestoneItem) => void;
  onOpenEditMilestone: (recordId: string, milestone: FinanceMilestoneItem) => void;
  onDeleteMilestone: (recordId: string, milestoneId: string) => void;
  onMilestoneChange: (recordId: string, milestoneId: string, field: string, value: any) => void;
  onAddMilestoneStep: (recordId: string) => void;
  onSaveNewTemplate?: (name: string) => void;
}

export function ClientFinanceCard({
  record,
  isExpanded,
  onToggle,
  todayStr,
  teamMembersList,
  paymentMilestoneTemplates,
  onAssignTeamMember,
  onAddNewTeamMember,
  onOpenPricingEditModal,
  onOpenRecordPayment,
  onOpenInvoiceModal,
  onOpenCompletePaymentModal,
  onOpenEditMilestone,
  onDeleteMilestone,
  onMilestoneChange,
  onAddMilestoneStep,
  onSaveNewTemplate,
}: ClientFinanceCardProps) {
  const [openMenu, setOpenMenu] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const milestoneMenuRef = useRef<HTMLDivElement>(null);

  // 🛡️ TRUE CLICK-OUTSIDE DISMISSAL FOR THREE-DOTS & ACTION MENUS
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
      if (milestoneMenuRef.current && !milestoneMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    }

    if (openMenu || openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenu, openActionMenuId]);

  const client = record.client;
  const milestones = record.milestones || [];
  const finalTotal = Number(record.final_total_amount) || 0;
  const recAmt = Number(record.received_amount) || 0;
  const pendAmt = Number(record.pending_amount) || Math.max(0, finalTotal - recAmt);

  const handledBy = (client as any)?.assigned_team_member || client?.handled_by || 'Unassigned';

  const handleSaveMember = () => {
    if (newMemberName.trim()) {
      onAddNewTeamMember(record.client_id, newMemberName.trim());
      setAddingMember(false);
      setNewMemberName('');
    }
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all overflow-visible"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. COLLAPSED MINIMALIST HEADER ROW (APP-GRADE MOBILE & DESKTOP)
             Left: Avatar | Client Name | Event Date/Type
             Right: Net Pending Due | 3-Dots Menu | Chevron
      ───────────────────────────────────────────────────────────── */}
      <div 
        onClick={onToggle}
        className="p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition"
      >
        {/* Left: Avatar + Client Name + Subtitle (Type & Date) */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Avatar / Initials Bubble */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-50 text-amber-800 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 border border-amber-200/80">
            {client?.name ? client.name.slice(0, 2).toUpperCase() : <Users className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate max-w-[180px] sm:max-w-[280px]">
                {client?.name || 'Unnamed Client'}
              </h3>

              {/* Status Badge */}
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                record.payment_status === 'paid' || (finalTotal > 0 && pendAmt === 0)
                  ? 'bg-emerald-50 text-emerald-700'
                  : recAmt > 0
                  ? 'bg-orange-50 text-orange-700'
                  : 'bg-rose-50 text-rose-700'
              }`}>
                {record.payment_status === 'paid' || (finalTotal > 0 && pendAmt === 0) ? 'Paid Full' : recAmt > 0 ? 'Partially Paid' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate font-medium">
              <span className="truncate">
                {client?.event_type || 'Wedding Photography'}
              </span>
              <span>•</span>
              <span className="shrink-0">
                {client?.event_date 
                  ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Date TBD'}
              </span>
              {client?.city && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline text-slate-400 truncate">{client.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Net Pending Amount + 3-Dots Action Menu + Chevron Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Net Pending Amount (Prominent Red / Emerald) */}
          <div className="text-right">
            {pendAmt > 0 ? (
              <div>
                <span className="text-xs sm:text-sm font-mono font-black text-rose-600 block leading-tight">
                  ₹{pendAmt.toLocaleString('en-IN')} Due
                </span>
                <span className="text-[10px] text-slate-400 font-mono block hidden sm:block">
                  of ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-600 block leading-tight">
                  ✓ Paid Full
                </span>
                <span className="text-[10px] text-slate-400 font-mono block hidden sm:block">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Dual Progress Bar (Hidden on Mobile/Tablet) */}
          <div className="hidden xl:block w-28 text-right">
            <div className="w-full h-1.5 rounded-full bg-slate-100 flex overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-l-full"
                style={{ width: `${finalTotal > 0 ? (recAmt / finalTotal) * 100 : 0}%` }}
              />
              <div 
                className="h-full bg-rose-300 rounded-r-full"
                style={{ width: `${finalTotal > 0 ? (pendAmt / finalTotal) * 100 : 100}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
              {finalTotal > 0 ? Math.round((recAmt / finalTotal) * 100) : 0}% Collected
            </span>
          </div>

          {/* 3-Dots Context Menu with Outside Click Dismissal */}
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenMenu(!openMenu)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Card Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {openMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 mt-1 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-40 space-y-0.5 text-xs font-bold font-sans"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      onOpenRecordPayment(record);
                    }}
                    className="w-full px-3 py-2 text-left text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-black"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Record Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      onOpenInvoiceModal(record);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View / Send Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      onOpenPricingEditModal(record);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Pricing Breakdown</span>
                  </button>

                  {record.client_id && (
                    <a
                      href={`/workspace/clients/${record.client_id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpenMenu(false)}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Client Profile</span>
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chevron Toggle Button */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXPANDED CARD BODY: PRICING + MILESTONE SCHEDULE
             Responsive: Stacks on mobile/tablet (< xl), 2-col on desktop (>= xl)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100 p-3 sm:p-5 lg:p-6 bg-white space-y-5"
          >
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
              
              {/* ══════════════════════════════════════════════════════
                  LEFT COLUMN: PRICING BREAKDOWN + INTEGRATED HANDLED-BY
              ══════════════════════════════════════════════════════ */}
              <div className="xl:col-span-5 space-y-3 border-r-0 xl:border-r border-slate-100 xl:pr-6">
                
                {/* Header with Subtitle "Handled By" & Edit Button */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-black tracking-wider uppercase text-slate-700">
                      Pricing Breakdown
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
                      <span className="text-[10px] font-medium text-slate-400">Handled by:</span>
                      {addingMember ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Name..."
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMember()}
                            className="px-1.5 py-0.5 text-[11px] border border-slate-300 rounded bg-white font-bold text-slate-800 w-20 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={handleSaveMember} className="p-0.5 bg-amber-600 text-white rounded hover:bg-amber-700">
                            <Check className="w-2.5 h-2.5" />
                          </button>
                          <button onClick={() => setAddingMember(false)} className="p-0.5 text-slate-400 hover:text-slate-600">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={handledBy}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__add_new__') {
                              setAddingMember(true);
                              setNewMemberName('');
                            } else {
                              onAssignTeamMember(record.client_id, val);
                            }
                          }}
                          className="bg-transparent text-[11px] font-bold text-purple-700 hover:text-purple-900 border-none outline-none p-0 cursor-pointer max-w-[160px] truncate"
                        >
                          <option value="__add_new__">✨ + Add Member</option>
                          <option value="Unassigned">Unassigned</option>
                          {teamMembersList.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenPricingEditModal(record)}
                    className="h-7 px-2.5 text-xs font-bold text-slate-800 rounded-md border border-amber-300 bg-amber-50 shrink-0 cursor-pointer hover:bg-amber-100 transition flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3 text-amber-700" /> Edit Pricing
                  </button>
                </div>

                {/* Pricing Line Items */}
                <div 
                  onClick={() => onOpenPricingEditModal(record)}
                  className="space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Base Package Price</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(Number(record.base_package_price) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-rose-500 font-bold">Discount (Complimentary)</span>
                    <span className="font-mono font-bold text-rose-500">
                      - ₹{(Number(record.discount_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Accommodation Charges</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(Number(record.accommodation_charges) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Travel Charges</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(Number(record.travel_charges) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Additional Charges</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{(Number(record.additional_charges) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-700 font-black">Subtotal (Gross Total)</span>
                    <span className="font-mono font-black text-slate-900">
                      ₹{(Number(record.subtotal_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500">
                    <span>GST ({Number(record.gst_rate) || 0}%)</span>
                    <span className="font-mono font-bold">
                      ₹{(Number(record.gst_amount) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-orange-50/80 rounded-xl border border-orange-200 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-orange-800 block">Final Net Investment</span>
                      <span className="text-[9px] text-orange-600">Inclusive of all taxes & fees</span>
                    </div>
                    <span className="text-sm font-mono font-black text-orange-950">
                      ₹{finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

              </div>

              {/* ══════════════════════════════════════════════════════
                  RIGHT COLUMN: PAYMENT TERMS & SCHEDULE
              ══════════════════════════════════════════════════════ */}
              <div className="xl:col-span-7 space-y-3">
                
                {/* Header with Add Step */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Payment Terms & Schedule
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">Installment milestones and completion records</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddMilestoneStep(record.id)}
                    className="h-7 px-2.5 text-xs font-bold text-slate-800 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 rounded-md flex items-center gap-1 cursor-pointer transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" /> Add Step
                  </button>
                </div>

                {/* Milestone Schedule List */}
                {milestones.length === 0 ? (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-bold text-slate-600">No installments scheduled yet.</p>
                    <p className="text-[11px]">Click "+ Add Step" to schedule installment milestones.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    
                    {/* Tablet & Desktop Column Headers (>= sm) */}
                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 px-2.5">
                      <span className="w-32 sm:w-36 shrink-0">Date</span>
                      <span className="flex-1 min-w-[120px]">Step Title</span>
                      <span className="w-24 sm:w-28 text-right shrink-0">Amount (₹)</span>
                      <span className="w-24 sm:w-28 text-center shrink-0">Status</span>
                      <span className="w-6 text-right shrink-0"></span>
                    </div>

                    {/* Milestone Rows */}
                    {milestones.map((ms) => {
                      const isPaid = ms.status === 'completed' || ms.status === 'paid' || (ms.status as string) === 'Completed';
                      const isOverdue = !isPaid && ms.due_date && ms.due_date < todayStr;
                      const overdueDays = isOverdue 
                        ? Math.max(1, Math.floor((new Date(todayStr).getTime() - new Date(ms.due_date!).getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;

                      return (
                        <div key={ms.id}>
                          
                          {/* 💻 Tablet & Desktop Row (>= sm) */}
                          <div
                            className={`hidden sm:flex items-center gap-2 p-1.5 sm:p-2 rounded-xl transition border text-xs ${
                              isPaid
                                ? 'bg-emerald-50/30 border-emerald-100'
                                : isOverdue
                                ? 'bg-rose-50/30 border-rose-200'
                                : 'hover:bg-slate-50/80 border-slate-100'
                            }`}
                          >
                            {/* Date Picker */}
                            <div className="w-32 sm:w-36 shrink-0">
                              <input
                                type="date"
                                value={ms.due_date || ''}
                                onChange={(e) => onMilestoneChange(record.id, ms.id, 'due_date', e.target.value)}
                                className="w-full h-7 sm:h-7.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Milestone Dropdown */}
                            <div className="flex-1 min-w-[120px]">
                              <MilestoneStepDropdown
                                value={ms.step_name || ms.title || ''}
                                onChange={(newVal) => onMilestoneChange(record.id, ms.id, 'step_name', newVal)}
                                templates={paymentMilestoneTemplates}
                                onAddTemplate={onSaveNewTemplate}
                                placeholder="Select Milestone"
                              />
                            </div>

                            {/* Rupee Amount */}
                            <div className="w-24 sm:w-28 shrink-0 relative">
                              <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                              <input
                                type="number"
                                value={ms.amount || 0}
                                onChange={(e) => onMilestoneChange(record.id, ms.id, 'amount', Number(e.target.value))}
                                className="w-full h-7 sm:h-7.5 pl-4.5 pr-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Status Button */}
                            <div className="w-24 sm:w-28 shrink-0 flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenCompletePaymentModal(record, ms)}
                                className={`w-full h-7 sm:h-7.5 px-2 text-[10px] font-extrabold uppercase rounded-md border transition cursor-pointer flex items-center justify-center truncate ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : isOverdue
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {isPaid ? '✓ Paid' : isOverdue ? `${overdueDays}d Late` : 'Pending'}
                              </button>
                            </div>

                            {/* Actions Menu */}
                            <div className="w-6 shrink-0 flex items-center justify-end relative" ref={openActionMenuId === ms.id ? milestoneMenuRef : undefined}>
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(openActionMenuId === ms.id ? null : ms.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openActionMenuId === ms.id && (
                                <div className="absolute right-0 top-7 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-40 z-30 space-y-0.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      onOpenCompletePaymentModal(record, ms);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete Payment
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      onOpenEditMilestone(record.id, ms);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit Step
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      onDeleteMilestone(record.id, ms.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 font-bold text-rose-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 📱 Mobile Sleek 2-Line Milestone Card (< sm) */}
                          <div className="block sm:hidden p-2 mb-1.5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-1.5">
                            {/* Row 1: Step Dropdown & Delete Action */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <MilestoneStepDropdown
                                  value={ms.step_name || ms.title || ''}
                                  onChange={(newVal) => onMilestoneChange(record.id, ms.id, 'step_name', newVal)}
                                  templates={paymentMilestoneTemplates}
                                  onAddTemplate={onSaveNewTemplate}
                                  placeholder="Select Milestone"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteMilestone(record.id, ms.id)}
                                className="text-slate-300 hover:text-rose-500 p-1 shrink-0 transition cursor-pointer"
                                title="Delete Milestone"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Row 2: Date, Amount, Status (Compact & Balanced 12-col Grid) */}
                            <div className="grid grid-cols-12 gap-1.5 items-center pt-1 border-t border-slate-100">
                              {/* Clean Date without cutoff (col-span-5) */}
                              <div className="col-span-5">
                                <input
                                  type="date"
                                  value={ms.due_date || ''}
                                  onChange={(e) => onMilestoneChange(record.id, ms.id, 'due_date', e.target.value)}
                                  className="w-full h-6 px-1 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-amber-500"
                                />
                              </div>

                              {/* Compact Amount (col-span-4) */}
                              <div className="col-span-4 relative">
                                <span className="absolute left-1.5 top-0.5 text-[10px] text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={ms.amount || ''}
                                  onChange={(e) => onMilestoneChange(record.id, ms.id, 'amount', Number(e.target.value))}
                                  className="w-full h-6 pl-4 pr-1 text-[11px] font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-md outline-none text-right focus:bg-white focus:border-amber-500"
                                />
                              </div>

                              {/* Status Badge / Button (col-span-3) */}
                              <div className="col-span-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => onOpenCompletePaymentModal(record, ms)}
                                  className={`w-full h-6 text-[10px] font-extrabold uppercase px-1 py-0.5 rounded-md border transition flex items-center justify-center truncate cursor-pointer ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : isOverdue
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  {isPaid ? '✓ Paid' : isOverdue ? `${overdueDays}d Late` : 'Pending'}
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom 3 Summary Metric Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
                  <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Fixed</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 mt-0.5 block truncate">
                      ₹{finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Received</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700 mt-0.5 block truncate">
                      ₹{recAmt.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-200/80 text-center">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Pending</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-rose-600 mt-0.5 block truncate">
                      ₹{pendAmt.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ClientFinanceCard;

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
  UserCheck,
  Check,
  X,
  CreditCard
} from 'lucide-react';
import { MilestoneSchedule } from './MilestoneSchedule';
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
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // 🛡️ TRUE CLICK-OUTSIDE DISMISSAL FOR THREE-DOTS CONTEXT MENU
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenu]);

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
                    <div className="flex items-center gap-1.5 mt-0.5 max-w-full text-xs font-semibold font-sans [font-variant-numeric:normal]">
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
                          className="bg-transparent text-xs font-semibold font-sans [font-variant-numeric:normal] text-purple-700 hover:text-purple-900 border-none outline-none p-0 cursor-pointer max-w-full truncate"
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
                <MilestoneSchedule
                  record={record}
                  todayStr={todayStr}
                  paymentMilestoneTemplates={paymentMilestoneTemplates}
                  onAddMilestoneStep={onAddMilestoneStep}
                  onMilestoneChange={onMilestoneChange}
                  onOpenCompletePaymentModal={onOpenCompletePaymentModal}
                  onOpenEditMilestone={onOpenEditMilestone}
                  onDeleteMilestone={onDeleteMilestone}
                  onSaveNewTemplate={onSaveNewTemplate}
                />

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

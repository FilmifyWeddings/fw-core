'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserCheck, IndianRupee, Calendar, Check, Zap, 
  CreditCard, Sparkles, User, AlertCircle 
} from 'lucide-react';
import { PostProductionDeliverable } from './DeliverableCategorySection';

interface AssignCommercialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverable: PostProductionDeliverable | null;
  clientName: string;
  teamMembers: Array<{ 
    id: string; 
    name: string; 
    role?: string; 
    default_daily_rate?: number; 
    daily_rate?: number;
    email?: string;
  }>;
  onSaveAssignment: (data: {
    memberId: string;
    memberName: string;
    memberEmail?: string;
    agreedAmount: number;
    paidAmount: number;
    balanceAmount: number;
    dueDate: string;
    payMode?: 'UPI' | 'Bank Transfer' | 'Cash';
    payRef?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export default function AssignCommercialsModal({
  isOpen,
  onClose,
  deliverable,
  clientName,
  teamMembers,
  onSaveAssignment,
}: AssignCommercialsModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [agreedAmount, setAgreedAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('');
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && deliverable) {
      const initialId = deliverable.assigned_member_id || '';
      setSelectedMemberId(initialId);

      // Default agreed amount is strictly 0 unless already set on the deliverable
      if (deliverable.agreed_amount !== undefined && deliverable.agreed_amount !== null && !isNaN(Number(deliverable.agreed_amount))) {
        setAgreedAmount(String(deliverable.agreed_amount));
      } else {
        setAgreedAmount('0');
      }
      setPaidAmount(deliverable.paid_amount !== undefined && deliverable.paid_amount !== null ? String(deliverable.paid_amount) : '0');
      
      const due = deliverable.due_date || deliverable.deadline || '';
      if (due) {
        try {
          const d = new Date(due);
          if (!isNaN(d.getTime())) {
            setDueDate(d.toISOString().split('T')[0]);
          } else {
            setDueDate(due);
          }
        } catch (_) {
          setDueDate(due);
        }
      } else {
        setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }

      setNotes(deliverable.notes || '');
    }
  }, [isOpen, deliverable, teamMembers]);

  if (!isOpen || !deliverable) return null;

  const agreedNum = Math.max(0, Number(agreedAmount) || 0);
  const paidNum = Math.max(0, Number(paidAmount) || 0);
  const balanceNum = Math.max(0, agreedNum - paidNum);
  const isFullPaid = agreedNum > 0 && balanceNum === 0;

  const handleFullPaidShortcut = () => {
    setPaidAmount(String(agreedNum));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || selectedMemberId === 'unassigned') {
      alert('Please select a team member or editor to assign.');
      return;
    }

    const member = teamMembers.find(m => m.id === selectedMemberId);
    if (!member) {
      alert('Selected member not found.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveAssignment({
        memberId: member.id,
        memberName: member.name,
        memberEmail: member.email,
        agreedAmount: agreedNum,
        paidAmount: paidNum,
        balanceAmount: balanceNum,
        dueDate,
        payMode,
        payRef: payRef.trim(),
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-2xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl shadow-2xl border-2 border-amber-300 flex flex-col z-10 overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-2xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <span>Assign Specialist &amp; Set Commercials</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium truncate max-w-[280px] sm:max-w-md">
                  {deliverable.title} {deliverable.specs ? `(${deliverable.specs})` : ''} • {clientName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto max-h-[75vh] space-y-4">
            {/* 1. Specialist Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>Assign Editor / Specialist *</span>
              </label>

              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                }}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="">-- Choose Team Member / Freelancer --</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.role ? `(${m.role})` : ''} {m.daily_rate ? `• ₹${m.daily_rate}/day` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Commercials & Balance Card */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-amber-700" />
                  <span>Commercial Fee &amp; Payment Ledger</span>
                </span>

                <button
                  type="button"
                  onClick={handleFullPaidShortcut}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 text-[10px] font-black flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Mark full agreed amount as paid"
                >
                  <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                  <span>⚡ Full Paid</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 block mb-1">
                    Agreed Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-black text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 block mb-1">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-black text-emerald-700 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Calculated Balance Banner */}
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between shadow-2xs">
                <span className="text-[11px] font-extrabold text-stone-600">Pending Due Balance:</span>
                <span className={`text-sm font-mono font-black ${balanceNum > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  ₹{balanceNum.toLocaleString('en-IN')} {isFullPaid ? '✓ (Settled)' : ''}
                </span>
              </div>
            </div>

            {/* 3. Due Date & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-600 flex items-center gap-1 block mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Deliverable Due Date</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 flex items-center gap-1 block mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                  <span>Payment Mode</span>
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="UPI">UPI / GooglePay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            {/* Payment Reference if paid upfront */}
            {paidNum > 0 && (
              <div>
                <label className="text-[10px] font-bold text-stone-500 block mb-1">
                  Payment Reference / UTR / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref 429381..."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            )}

            {/* Instructions / Notes */}
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">
                Assignment Notes &amp; Specifications
              </label>
              <textarea
                rows={2}
                placeholder="Specific edit requirements, cut duration, aspect ratio, or deliverables notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedMemberId}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? 'Saving & Syncing...' : 'Save & Sync Assignment'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

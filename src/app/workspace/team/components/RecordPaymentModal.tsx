'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, IndianRupee, Calendar, CheckCircle2, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export interface PaymentTarget {
  id: string | number;
  title?: string;
  clientName?: string;
  type: 'EVENT' | 'ALBUM' | 'SALARY' | string;
  balanceAmount: number;
  totalAmount?: number;
  paidAmount?: number;
  role?: string;
  projectId?: string;
  subEventId?: string;
  assignmentId?: string;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentTarget: PaymentTarget | null;
  member: {
    id: string;
    name: string;
    primary_type?: string;
    [key: string]: any;
  } | null;
  workspaceId?: string;
  onSubmitPayment: (paymentData: {
    agreedAmount: number;
    paidAmount: number;
    balanceAmount: number;
    amount?: number; // backwards compatibility
    paymentDate: string;
    paymentMode: string;
    paymentRef: string;
    paymentNotes: string;
    autoSyncFinance: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  paymentTarget,
  member,
  workspaceId,
  onSubmitPayment,
  isSubmitting = false,
}: RecordPaymentModalProps) {
  const [agreedInput, setAgreedInput] = useState<string>('0');
  const [paidInput, setPaidInput] = useState<string>('0');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [autoSyncFinance, setAutoSyncFinance] = useState<boolean>(true);

  // Sync state whenever paymentTarget changes or opens
  useEffect(() => {
    if (paymentTarget) {
      const initialAgreed = paymentTarget.totalAmount !== undefined && paymentTarget.totalAmount !== null 
        ? paymentTarget.totalAmount 
        : 0;
      const initialPaid = paymentTarget.paidAmount !== undefined && paymentTarget.paidAmount !== null 
        ? paymentTarget.paidAmount 
        : 0;

      setAgreedInput(String(initialAgreed));
      setPaidInput(String(initialPaid));
      setPaymentDate(paymentTarget.paymentDate || new Date().toISOString().split('T')[0]);
      setPaymentMode(paymentTarget.paymentMethod || 'UPI');
      setPaymentRef('');
      setPaymentNotes(paymentTarget.notes || '');
      setAutoSyncFinance(true);
    }
  }, [paymentTarget]);

  const numAgreed = Math.max(0, Number(agreedInput) || 0);
  const numPaid = Math.max(0, Number(paidInput) || 0);
  const calculatedBalance = Math.max(0, numAgreed - numPaid);

  const isZeroRate = numAgreed === 0 && numPaid === 0;
  const isFullySettled = numAgreed > 0 && calculatedBalance === 0;
  const isPartiallyPaid = numPaid > 0 && calculatedBalance > 0;
  const isPendingDue = numPaid === 0 && numAgreed > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAgreed) || numAgreed < 0 || isNaN(numPaid) || numPaid < 0) {
      return;
    }

    await onSubmitPayment({
      agreedAmount: numAgreed,
      paidAmount: numPaid,
      balanceAmount: calculatedBalance,
      amount: numPaid, // backwards compatibility
      paymentDate,
      paymentMode,
      paymentRef,
      paymentNotes,
      autoSyncFinance,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && paymentTarget && (
        <div
          key="record-payment-modal-backdrop"
          className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
        >
          <motion.div
            key="record-payment-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl max-w-md w-full p-5 border border-stone-200 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Shoot Commercials &amp; Payment</span>
                </h3>
                <p className="text-[10px] text-stone-500 font-medium">
                  {paymentTarget.title || 'Assignment'} • <strong className="text-amber-700">{paymentTarget.clientName || member?.name || 'Client'}</strong>
                  {paymentTarget.role && ` (${paymentTarget.role})`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Reactive Commercials Preview Strip */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 bg-white rounded-xl border border-stone-200/60 shadow-2xs">
                  <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider font-sans">Agreed Fee</span>
                  <span className="text-xs font-black text-stone-800">
                    ₹{numAgreed.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-200/60 shadow-2xs">
                  <span className="text-[9px] font-black uppercase text-emerald-600 block tracking-wider font-sans">Total Paid</span>
                  <span className="text-xs font-black text-emerald-700">
                    ₹{numPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={`p-2 bg-white rounded-xl border shadow-2xs ${calculatedBalance > 0 ? 'border-rose-300 bg-rose-50/40' : 'border-stone-200/60'}`}>
                  <span className={`text-[9px] font-black uppercase block tracking-wider font-sans ${calculatedBalance > 0 ? 'text-rose-600' : 'text-stone-400'}`}>Remaining Due</span>
                  <span className={`text-xs font-black ${calculatedBalance > 0 ? 'text-rose-600' : 'text-stone-800'}`}>
                    ₹{calculatedBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center justify-between px-2.5 py-1 bg-white rounded-xl border border-stone-200/70 text-[10px] font-bold">
                <span className="text-stone-500 font-medium">Status Preview:</span>
                {isZeroRate ? (
                  <span className="text-stone-600 flex items-center gap-1 font-extrabold">
                    ⚪ ₹0 RATE (COMPLIMENTARY / VOLUNTARY)
                  </span>
                ) : isFullySettled ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                    🟢 FULLY SETTLED / PAID
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="text-amber-700 flex items-center gap-1 font-extrabold">
                    🟡 PARTIALLY PAID (₹{calculatedBalance.toLocaleString('en-IN')} DUE)
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1 font-extrabold">
                    🔴 PAYMENT DUE (₹{calculatedBalance.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Dual Editable Inputs: Agreed Amount & Paid Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Agreed / Assigned Fee */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                      Agreed Fee (₹) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAgreedInput('0');
                        setPaidInput('0');
                      }}
                      className="text-[9.5px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                    >
                      Set ₹0 Rate
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={agreedInput}
                      onChange={(e) => setAgreedInput(e.target.value)}
                      placeholder="0"
                      className="w-full h-9 pl-7 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-900 focus:outline-none focus:border-amber-500 font-mono transition"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 block">Total assigned remuneration</span>
                </div>

                {/* 2. Paid Amount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-stone-600 tracking-wider">
                      Paid Amount (₹) *
                    </label>
                    {numAgreed > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaidInput(String(numAgreed))}
                        className="text-[9.5px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        Full Paid
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-700">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                      placeholder="0"
                      className="w-full h-9 pl-7 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-emerald-900 focus:outline-none focus:border-amber-500 font-mono transition"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 block">Disbursed to crew member</span>
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / IMPS</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* UTR / Ref No */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  Ref / UTR No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI849202 or IMPS823102"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Settled shoot balance / updated fee"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              {/* Sync to Expenses */}
              {numPaid > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={autoSyncFinance}
                    onChange={(e) => setAutoSyncFinance(e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-stone-700">
                    Record in Studio Expenses &amp; Ledger
                  </span>
                </label>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-100" />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Sync Commercials'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

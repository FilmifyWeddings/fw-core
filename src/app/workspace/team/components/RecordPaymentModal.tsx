'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, IndianRupee, Calendar, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface PaymentTarget {
  id: string | number;
  title?: string;
  clientName?: string;
  type: 'EVENT' | 'ALBUM' | string;
  balanceAmount: number;
  totalAmount?: number;
  role?: string;
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
    amount: number;
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
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [autoSyncFinance, setAutoSyncFinance] = useState<boolean>(true);

  // Sync state whenever paymentTarget changes
  useEffect(() => {
    if (paymentTarget) {
      setPaymentAmount(paymentTarget.balanceAmount !== undefined ? String(paymentTarget.balanceAmount) : '0');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('UPI');
      setPaymentRef('');
      setPaymentNotes('');
      setAutoSyncFinance(true);
    }
  }, [paymentTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount === '' || isNaN(Number(paymentAmount)) || Number(paymentAmount) < 0) {
      return;
    }

    await onSubmitPayment({
      amount: Number(paymentAmount),
      paymentDate,
      paymentMode,
      paymentRef,
      paymentNotes,
      autoSyncFinance,
    });
  };

  const isZeroSettle = Number(paymentAmount) === 0;

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
                <span>Record Settlement Payment</span>
              </h3>
              <p className="text-[10px] text-stone-400 font-medium">
                {paymentTarget.title || 'Assignment'} • {paymentTarget.clientName || member?.name || 'Studio'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Amount Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                  Payment Amount (₹) *
                </label>
                {paymentTarget.balanceAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(paymentTarget.balanceAmount))}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                  >
                    Set Full Balance (₹{paymentTarget.balanceAmount.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono transition"
              />
              {isZeroSettle && (
                <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  ₹0 settlement will mark this assignment as completed without outstanding balance.
                </p>
              )}
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
                  className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500"
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
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* UTR / Ref No */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                Ref / UTR No.
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
                placeholder="e.g. Settled shoot balance"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            {/* Sync to Expenses */}
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
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
                <span>{isSubmitting ? 'Saving...' : 'Confirm Payment'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

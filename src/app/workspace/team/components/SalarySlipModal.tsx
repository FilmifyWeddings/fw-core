'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, IndianRupee, Calendar, CheckCircle2, SlidersHorizontal, Sparkles } from 'lucide-react';

export interface SalarySlipData {
  id?: string;
  user_id?: string;
  member_id: string;
  member_name?: string;
  month_year: string;
  payout_date?: string;
  paid_date?: string;
  base_salary: number;
  incentive_amount: number;
  deduction_amount?: number;
  deductions?: number;
  net_paid?: number;
  net_payable?: number;
  paid_amount?: number;
  payment_mode?: string;
  reference_no?: string;
  notes?: string;
  status?: string;
  payment_status?: string;
  [key: string]: any;
}

export interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    primary_role?: string;
    default_daily_rate?: number;
    [key: string]: any;
  } | null;
  workspaceId: string;
  slipToEdit?: SalarySlipData | null;
  onSave: (slip: SalarySlipData, autoSyncExpense: boolean) => Promise<void> | void;
  isSaving?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function generateMonthOptions() {
  const options: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (const month of MONTH_NAMES) {
      options.push(`${month} ${year}`);
    }
  }
  return options;
}

export default function SalarySlipModal({
  isOpen,
  onClose,
  member,
  workspaceId,
  slipToEdit,
  onSave,
  isSaving = false,
}: SalarySlipModalProps) {
  const isEditMode = Boolean(slipToEdit && slipToEdit.id);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const getCurrentDefaultMonth = () => {
    const d = new Date();
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  };

  const [monthYear, setMonthYear] = useState<string>(getCurrentDefaultMonth());
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [baseSalary, setBaseSalary] = useState<string>('0');
  const [incentiveAmount, setIncentiveAmount] = useState<string>('0');
  const [deductionAmount, setDeductionAmount] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoSyncExpense, setAutoSyncExpense] = useState<boolean>(true);

  // Sync state when opening or when slipToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (slipToEdit) {
        // Prepopulate in Edit mode
        setMonthYear(slipToEdit.month_year || getCurrentDefaultMonth());
        const dateVal = slipToEdit.payout_date || slipToEdit.paid_date || new Date().toISOString().split('T')[0];
        setPayoutDate(dateVal);
        setBaseSalary(String(slipToEdit.base_salary ?? 0));
        setIncentiveAmount(String(slipToEdit.incentive_amount ?? 0));
        const ded = slipToEdit.deduction_amount ?? slipToEdit.deductions ?? 0;
        setDeductionAmount(String(ded));
        setPaymentMode(slipToEdit.payment_mode || 'UPI');
        setReferenceNo(slipToEdit.reference_no || '');
        setNotes(slipToEdit.notes || '');
        setAutoSyncExpense(false); // Edit mode: usually already synced
      } else {
        // Create mode: prefill sensible defaults
        setMonthYear(getCurrentDefaultMonth());
        setPayoutDate(new Date().toISOString().split('T')[0]);
        const defaultRate = member?.default_daily_rate ? String(member.default_daily_rate) : '0';
        setBaseSalary(defaultRate);
        setIncentiveAmount('0');
        setDeductionAmount('0');
        setPaymentMode('UPI');
        setReferenceNo('');
        setNotes('');
        setAutoSyncExpense(true);
      }
    }
  }, [isOpen, slipToEdit, member]);

  // Real-time calculation: Net Paid = Base + Incentive - Deduction
  const baseNum = Number(baseSalary) || 0;
  const incNum = Number(incentiveAmount) || 0;
  const dedNum = Number(deductionAmount) || 0;
  const netPaid = Math.max(0, baseNum + incNum - dedNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slipPayload: SalarySlipData = {
      ...(slipToEdit || {}),
      id: slipToEdit?.id,
      member_id: member?.id || '',
      member_name: member?.name || '',
      month_year: monthYear,
      payout_date: payoutDate,
      paid_date: payoutDate,
      base_salary: baseNum,
      incentive_amount: incNum,
      deduction_amount: dedNum,
      deductions: dedNum,
      net_paid: netPaid,
      net_payable: netPaid,
      paid_amount: netPaid,
      payment_mode: paymentMode,
      reference_no: referenceNo.trim(),
      notes: notes.trim(),
      status: 'Paid',
      payment_status: 'PAID',
      updated_at: new Date().toISOString(),
    };

    await onSave(slipPayload, autoSyncExpense);
  };

  return (
    <AnimatePresence>
      {isOpen && member && (
        <div
          key="salary-slip-modal-backdrop"
          className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
        >
          <motion.div
            key="salary-slip-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl max-w-lg w-full p-5 border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  {isEditMode ? 'Edit Salary Slip' : 'Create Salary Slip & Payout'}
                </h3>
                <p className="text-[10px] text-stone-500 font-medium">
                  {member.name} • {member.primary_role || 'Team Member'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Cycle & Payout Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  Salary Month / Period *
                </label>
                <select
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  Payout Date *
                </label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Financial Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Base Salary */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-600 tracking-wider block">
                  Base Salary (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="20000"
                  className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Incentives */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                  + Incentive (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Deductions */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-rose-600 tracking-wider block">
                  - Deduction (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-8.5 px-2.5 bg-rose-50/50 border border-rose-300 rounded-xl text-xs font-bold text-rose-950 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  UTR / Reference No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI849202"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Regular monthly retainer payout"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-8.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            {/* Live Net Calculation Strip */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/90 flex items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                  Net Amount Calculated
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  ₹{baseNum.toLocaleString('en-IN')} + ₹{incNum.toLocaleString('en-IN')} - ₹{dedNum.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-700 font-mono">
                  ₹{netPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Auto Sync Checkbox */}
            {!isEditMode && (
              <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={autoSyncExpense}
                  onChange={(e) => setAutoSyncExpense(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-stone-700">
                  Automatically record in Studio Expenses &amp; Ledger
                </span>
              </label>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-100" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : isEditMode
                    ? 'Update Salary Slip'
                    : 'Add Salary Slip & Record Payment'}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

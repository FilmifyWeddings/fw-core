'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Receipt, Building2, CheckCircle2 } from 'lucide-react';

export interface SalarySlipPdfTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  slip: {
    id?: string;
    month_year: string;
    payout_date?: string;
    paid_date?: string;
    base_salary: number;
    incentive_amount?: number;
    deduction_amount?: number;
    deductions?: number;
    net_paid?: number;
    net_payable?: number;
    paid_amount?: number;
    payment_mode?: string;
    reference_no?: string;
    notes?: string;
    status?: string;
    created_at?: string;
    [key: string]: any;
  } | null;
  member: {
    id: string;
    name: string;
    primary_role?: string;
    primary_type?: string;
    phone?: string;
    email?: string;
    [key: string]: any;
  } | null;
  studioName?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return dateStr;
  }
}

export default function SalarySlipPdfTemplate({
  isOpen,
  onClose,
  slip,
  member,
  studioName = 'Filmify Weddings',
}: SalarySlipPdfTemplateProps) {
  const base = Number(slip?.base_salary) || 0;
  const incentive = Number(slip?.incentive_amount) || 0;
  const deduction = Number(slip?.deduction_amount ?? slip?.deductions) || 0;
  const netPaid = Number(slip?.net_paid ?? slip?.paid_amount ?? slip?.net_payable ?? (base + incentive - deduction));

  const payoutDate = slip?.payout_date || slip?.paid_date || new Date().toISOString().split('T')[0];
  const issueDate = slip?.created_at ? formatDate(slip.created_at) : formatDate(payoutDate);
  const slipRefId = slip?.id 
    ? (slip.id.length > 12 ? `SLIP-${slip.id.slice(0, 8).toUpperCase()}` : slip.id)
    : `SLIP-${Date.now().toString().slice(-6)}`;

  const roleText = member?.primary_role || 'Senior Crew Member';
  const typeText = member?.primary_type?.toUpperCase() === 'IN_HOUSE' || member?.primary_type?.toUpperCase() === 'STAFF'
    ? 'In-House Staff'
    : 'Retainer Specialist';

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && slip && member && (
        <div
          key="salary-slip-pdf-backdrop"
          className="fixed inset-0 z-[100020] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm font-sans overflow-y-auto print:p-0 print:bg-white print:fixed-none"
        >
          {/* Printable Voucher Modal Container */}
          <motion.div
            key="salary-slip-pdf-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none"
          >
          {/* Modal Action Bar (Hidden during print) */}
          <div className="p-3.5 px-6 bg-stone-900 text-white flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black tracking-wide uppercase">
                Official Salary Voucher Preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Print Voucher / PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              OFFICIAL PRINTABLE A4 VOUCHER CHASSIS
             ══════════════════════════════════════════════════════════════ */}
          <div id="salary-slip-printable" className="p-8 sm:p-10 space-y-7 bg-white text-stone-900 print:p-8">
            {/* 1. Header & Studio Branding */}
            <div className="flex items-start justify-between border-b-2 border-stone-900 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs text-sm">
                    {studioName.charAt(0).toUpperCase()}
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-stone-900 uppercase">
                    {studioName}
                  </h1>
                </div>
                <p className="text-[11px] font-black text-amber-700 tracking-widest uppercase pl-0.5">
                  Official Salary Voucher &amp; Remuneration Slip
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                  ✓ Paid &amp; Settled
                </span>
                <p className="text-[10px] text-stone-500 font-mono">
                  Ref ID: <strong className="text-stone-900 font-bold">{slipRefId}</strong>
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  Issue Date: {issueDate}
                </p>
              </div>
            </div>

            {/* 2. Employee & Payout Details Section */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/90 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">
                  Employee / Payee Details
                </span>
                <div className="text-sm font-black text-stone-900">
                  {member.name}
                </div>
                <div className="text-stone-600 font-medium text-[11px]">
                  {roleText} ({typeText})
                </div>
                {member.phone && (
                  <div className="text-[10px] text-stone-400 font-mono">
                    Phone: {member.phone}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">
                  Payroll Cycle &amp; Transaction
                </span>
                <div className="text-sm font-black text-stone-900">
                  {slip.month_year}
                </div>
                <div className="text-stone-600 font-medium text-[11px]">
                  Paid on {formatDate(payoutDate)} via <strong className="text-stone-900">{slip.payment_mode || 'UPI'}</strong>
                </div>
                {slip.reference_no && (
                  <div className="text-[10px] text-stone-500 font-mono">
                    UTR / Ref: <strong className="text-stone-800">{slip.reference_no}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Itemized Remuneration Breakdown Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                Remuneration &amp; Earnings Breakdown
              </span>

              <div className="rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100/90 border-b border-stone-200 text-[10px] font-black uppercase text-stone-600 tracking-wider">
                      <th className="p-3 pl-4">Description</th>
                      <th className="p-3 text-center">Category</th>
                      <th className="p-3 pr-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 font-mono">
                    <tr>
                      <td className="p-3 pl-4 font-bold text-stone-900">Base Salary / Retainer</td>
                      <td className="p-3 text-center text-stone-500 font-sans text-[11px]">Fixed Compensation</td>
                      <td className="p-3 pr-4 text-right font-black text-stone-900">
                        ₹{base.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-4 font-bold text-emerald-800">Performance Incentives &amp; Bonus</td>
                      <td className="p-3 text-center text-emerald-600 font-sans text-[11px]">Addition (+)</td>
                      <td className="p-3 pr-4 text-right font-black text-emerald-700">
                        +₹{incentive.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-4 font-bold text-rose-800">Deductions / Advance Cut</td>
                      <td className="p-3 text-center text-rose-600 font-sans text-[11px]">Deduction (-)</td>
                      <td className="p-3 pr-4 text-right font-black text-rose-600">
                        -₹{deduction.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-900 text-white font-mono">
                      <td colSpan={2} className="p-3.5 pl-4 font-black uppercase tracking-wider text-xs font-sans">
                        Net Amount Remitted
                      </td>
                      <td className="p-3.5 pr-4 text-right text-base font-black text-amber-400">
                        ₹{netPaid.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Remarks & Notes */}
            {slip.notes && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
                <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider block mb-0.5">
                  Studio Owner Remarks
                </span>
                <p className="text-stone-700 font-medium italic">
                  "{slip.notes}"
                </p>
              </div>
            )}

            {/* 5. Footer & Signatory Audit */}
            <div className="pt-6 border-t border-stone-200 flex items-end justify-between text-xs">
              <div className="space-y-1 max-w-xs">
                <p className="text-[10px] text-stone-500 leading-tight">
                  This is an official, computer-generated salary slip generated via{' '}
                  <strong className="text-stone-800">StudioCore OS</strong>.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Digitally verified &amp; recorded in studio accounts</span>
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <div className="w-40 border-b border-stone-400 pb-1">
                  <span className="font-serif italic text-stone-700 text-sm block">
                    {studioName}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
          {/* Embedded Print Styling */}
            <style dangerouslySetInnerHTML={{
              __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #salary-slip-printable, #salary-slip-printable * {
                  visibility: visible !important;
                }
                #salary-slip-printable {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 32px !important;
                  box-shadow: none !important;
                  border: none !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

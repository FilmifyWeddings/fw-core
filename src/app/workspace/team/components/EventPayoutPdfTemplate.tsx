'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Receipt, Building2, Calendar, MapPin, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface EventPayoutPdfTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  payout: {
    id?: string;
    event_name?: string;
    client_name?: string;
    event_date?: string;
    start_time?: string;
    end_time?: string;
    venue?: string;
    role?: string;
    agreed_amount?: number;
    paid_amount?: number;
    balance_amount?: number;
    status?: string;
    payment_method?: string;
    payment_date?: string;
    notes?: string;
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
  if (!dateStr || dateStr === 'TBD') return 'Date TBA';
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

export default function EventPayoutPdfTemplate({
  isOpen,
  onClose,
  payout,
  member,
  studioName = 'StudioCore Partner Studio',
}: EventPayoutPdfTemplateProps) {
  if (!isOpen || !payout || !member) return null;

  const agreed = Number(payout.agreed_amount) || 0;
  const paid = Number(payout.paid_amount) || 0;
  const balance = Math.max(0, Number(payout.balance_amount ?? (agreed - paid)));
  const isPaid = (agreed > 0 && balance === 0) || payout.status === 'PAID' || payout.status === 'completed';

  const voucherRef = payout.id
    ? (payout.id.length > 12 ? `VCH-${payout.id.slice(0, 8).toUpperCase()}` : payout.id)
    : `VCH-${Date.now().toString().slice(-6)}`;

  const issueDate = payout.payment_date ? formatDate(payout.payment_date) : formatDate(payout.created_at || new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div
        key="event-payout-pdf-backdrop"
        className="fixed inset-0 z-[100020] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm font-sans overflow-y-auto print:p-0 print:bg-white print:fixed-none"
      >
        <motion.div
          key="event-payout-pdf-card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none"
        >
          {/* Modal Top Bar */}
          <div className="p-3.5 px-6 bg-stone-900 text-white flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black tracking-wide uppercase">
                Official Event Commercial Voucher
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

          {/* Printable Voucher Chassis */}
          <div id="event-voucher-printable" className="p-8 sm:p-10 space-y-7 bg-white text-stone-900 print:p-8">
            {/* Header & Studio Branding */}
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
                  Official Shoot Commercial &amp; Payout Voucher
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isPaid 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : paid > 0 
                      ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                      : 'bg-stone-100 text-stone-800 border border-stone-300'
                }`}>
                  {isPaid ? '✓ Paid & Settled' : paid > 0 ? 'Partial Advance Paid' : 'Payment Due'}
                </span>
                <p className="text-[10px] font-mono text-stone-400">Ref: {voucherRef}</p>
              </div>
            </div>

            {/* Member & Event Details Grid */}
            <div className="grid grid-cols-2 gap-6 bg-stone-50 p-5 rounded-2xl border border-stone-200">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Assigned Member</span>
                <p className="text-sm font-black text-stone-900">{member.name}</p>
                <p className="text-xs text-stone-600 font-semibold">{payout.role || member.primary_role || 'Crew Specialist'}</p>
                {member.phone && <p className="text-[11px] text-stone-500 font-mono">📱 {member.phone}</p>}
                {member.email && <p className="text-[11px] text-stone-500 font-mono">✉️ {member.email}</p>}
              </div>

              <div className="space-y-1.5 text-right sm:text-left">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Event / Assignment</span>
                <p className="text-sm font-black text-stone-900">{payout.event_name || 'Wedding Shoot'}</p>
                <p className="text-xs text-stone-600 font-semibold">Client: {payout.client_name || 'Private Client'}</p>
                <p className="text-[11px] text-stone-500">📅 Date: {formatDate(payout.event_date)}</p>
                {payout.venue && <p className="text-[11px] text-stone-500 truncate">📍 Venue: {payout.venue}</p>}
              </div>
            </div>

            {/* Financial Ledger Table */}
            <div className="space-y-3">
              <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider block">
                Commercials &amp; Remuneration Breakdown
              </span>

              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 font-black uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="p-3.5">Particulars</th>
                      <th className="p-3.5 text-center">Payment Mode</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    <tr>
                      <td className="p-3.5 font-bold text-stone-800">
                        {payout.event_name || 'Shoot Assignment'} ({payout.role || 'Crew'})
                      </td>
                      <td className="p-3.5 text-center text-stone-500 font-mono text-[11px]">
                        {payout.payment_method || 'Studio Payout'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          Agreed Commercial
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-stone-900">
                        ₹{agreed.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3.5 font-bold text-emerald-800">
                        Advance / Paid to Crew
                      </td>
                      <td className="p-3.5 text-center text-stone-500 font-mono text-[11px]">
                        {payout.payment_method || 'UPI / Bank'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-emerald-700">
                        ₹{paid.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr className="bg-stone-50/80 font-black">
                      <td colSpan={3} className="p-3.5 text-stone-900 uppercase tracking-wide text-xs">
                        Remaining Balance Payable
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-amber-700 text-sm">
                        ₹{balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes if any */}
            {payout.notes && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-950">
                <span className="font-bold">Notes / Instructions:</span> {payout.notes}
              </div>
            )}

            {/* Footer Sign-off */}
            <div className="pt-6 border-t border-stone-200 flex items-end justify-between text-xs text-stone-500">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified StudioCore Production Record</span>
                </div>
                <p className="text-[10px] text-stone-400">
                  Voucher generated on {issueDate}. Synchronized with studio operational ledger.
                </p>
              </div>

              <div className="text-right space-y-8">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-stone-400">
                  Authorized Signatory
                </span>
                <p className="font-bold text-stone-900 font-serif border-t border-stone-300 pt-1 min-w-[120px]">
                  {studioName}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

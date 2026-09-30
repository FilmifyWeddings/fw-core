'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  X, 
  Calendar, 
  Phone, 
  FileText, 
  Layers, 
  Users, 
  Film, 
  CreditCard, 
  ArrowRight,
  Info,
  ShieldAlert,
  Loader2,
  Sparkles
} from 'lucide-react';
import type { Lead } from '@/types';

/* -------------------------------------------------------------
   1. LEAD BOOKING CONFIRMATION MODAL (3D Cream UI)
------------------------------------------------------------- */
export interface LeadBookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lead: Lead | null;
  hasFinalQuotation?: boolean;
  quotationTitle?: string;
  packageAmount?: number;
  isSubmitting?: boolean;
}

export const LeadBookingConfirmationModal: React.FC<LeadBookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lead,
  hasFinalQuotation: explicitHasFinal,
  quotationTitle,
  packageAmount: explicitPackageAmount,
  isSubmitting = false
}) => {
  if (!isOpen || !lead) return null;

  const raw = lead.raw_payload || {};
  const coupleName = raw.couple_name || (lead as any).couple_names || lead.client_name || lead.name || 'Valued Client';
  const hasFinalQuotation = explicitHasFinal !== undefined 
    ? explicitHasFinal 
    : Boolean(lead.final_quotation_id || raw.final_quotation_id);
  const eventDate = lead.event_date || raw.event_date || null;
  const eventType = lead.event_type || raw.event_type || 'Wedding';
  const budgetAmount = explicitPackageAmount !== undefined && explicitPackageAmount > 0
    ? explicitPackageAmount
    : (raw.package_amount || raw.budget || raw.amount || null);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4 relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Confirm Client Booking
                </h3>
                <p className="text-xs text-emerald-800 font-bold">
                  Move to Booked & Onboard to Workspace
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lead Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#EAE5DA] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 truncate max-w-[220px]">
                {coupleName}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                {eventType}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
              {lead.phone && (
                <span className="flex items-center gap-1 truncate">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {lead.phone}
                </span>
              )}
              {eventDate && (
                <span className="flex items-center gap-1 truncate">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {eventDate}
                </span>
              )}
            </div>
          </div>

          {/* Quotation Status Card */}
          {hasFinalQuotation ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-black">
                  Final Quotation Attached {budgetAmount ? `(₹${budgetAmount})` : ''}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                Quotation deliverables, dates, and payment milestones will synchronize across Client Directory, Events, Post Production, and Finance.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-black">
                  No Final Quotation Attached
                </span>
              </div>
              <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                Empty placeholder cards will be created across all workspace modules with <strong>₹0 amounts</strong>:
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-bold text-amber-800">
                <span className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded-lg border border-amber-200">
                  <Users className="w-3 h-3 text-amber-600" /> Client Directory (Empty)
                </span>
                <span className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded-lg border border-amber-200">
                  <Calendar className="w-3 h-3 text-amber-600" /> Bookings & Events (Empty)
                </span>
                <span className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded-lg border border-amber-200">
                  <Film className="w-3 h-3 text-amber-600" /> Post Production (Empty)
                </span>
                <span className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded-lg border border-amber-200">
                  <CreditCard className="w-3 h-3 text-amber-600" /> Finance (₹0 Ledger)
                </span>
              </div>
              <p className="text-[10px] text-amber-700/90 italic pt-1">
                You can edit each module manually or finalize a quotation later to auto-sync deliverables and payment terms.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#EAE5DA] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Onboarding...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Book Client</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------
   2. LEAD UNBOOKING WARNING & TRASH CONFIRMATION MODAL (3D Cream UI)
------------------------------------------------------------- */
export interface LeadUnbookingTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (moveToTrash: boolean) => void;
  lead: Lead | null;
  targetStageName?: string;
  leadName?: string;
  isSubmitting?: boolean;
}

export const LeadUnbookingTrashModal: React.FC<LeadUnbookingTrashModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  lead,
  targetStageName = 'another stage',
  leadName,
  isSubmitting = false
}) => {
  const [removeCardsToTrash, setRemoveCardsToTrash] = React.useState(true);

  if (!isOpen || !lead) return null;

  const raw = lead.raw_payload || {};
  const coupleName = leadName || raw.couple_name || (lead as any).couple_names || lead.client_name || lead.name || 'Valued Client';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4 relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Confirm Stage Change
                </h3>
                <p className="text-xs text-rose-700 font-bold">
                  Moving out of Booked stage to "{targetStageName}"
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Client Pill */}
          <div className="p-3 rounded-2xl bg-white border border-[#EAE5DA] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-black text-slate-900 truncate max-w-[220px]">
                {coupleName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              Unbooking
            </span>
          </div>

          {/* Interactive Checkbox Card (Requested by User) */}
          <div 
            onClick={() => setRemoveCardsToTrash(!removeCardsToTrash)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer select-none flex items-start gap-3 shadow-2xs ${
              removeCardsToTrash 
                ? 'bg-rose-50/80 border-rose-300 text-rose-950' 
                : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            }`}
          >
            <input
              type="checkbox"
              id="unbooking-trash-checkbox"
              checked={removeCardsToTrash}
              onChange={(e) => setRemoveCardsToTrash(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
            />
            <div className="space-y-1">
              <label htmlFor="unbooking-trash-checkbox" className="text-xs font-black cursor-pointer block leading-snug">
                Remove linked workspace cards and move them to Trash
              </label>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {removeCardsToTrash 
                  ? 'Client Directory, Bookings & Events, Post Production, and Finance cards will be safely moved to Trash (can be restored later).'
                  : 'Cards will remain active in your workspace modules (only lead status will change).'}
              </p>
            </div>
          </div>

          {/* List of Affected Modules (when checkbox is checked) */}
          {removeCardsToTrash ? (
            <div className="space-y-1.5 pt-0.5 text-[11px] font-bold text-slate-700">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-rose-100 shadow-2xs">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Client Directory</span>
                <span className="ml-auto text-[10px] text-rose-600 font-black flex items-center gap-1"><ArrowRight className="w-3 h-3 text-rose-500" /> Client Trash</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-rose-100 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Bookings & Events</span>
                <span className="ml-auto text-[10px] text-rose-600 font-black flex items-center gap-1"><ArrowRight className="w-3 h-3 text-rose-500" /> Events Trash</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-rose-100 shadow-2xs">
                <Film className="w-3.5 h-3.5 text-amber-600" />
                <span>Post Production</span>
                <span className="ml-auto text-[10px] text-rose-600 font-black flex items-center gap-1"><ArrowRight className="w-3 h-3 text-rose-500" /> Post-Prod Trash</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-rose-100 shadow-2xs">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>Finance & Payments</span>
                <span className="ml-auto text-[10px] text-rose-600 font-black flex items-center gap-1"><ArrowRight className="w-3 h-3 text-rose-500" /> Finance Trash</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
              <Info className="w-3.5 h-3.5 text-slate-500 inline mr-1" /> Existing cards in Client Directory, Bookings, Post Production, and Finance will <strong>stay intact</strong>.
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#EAE5DA] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
            >
              Keep in Booked
            </button>

            <button
              type="button"
              onClick={() => onConfirm(removeCardsToTrash)}
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                removeCardsToTrash 
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700' 
                  : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  {removeCardsToTrash ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{removeCardsToTrash ? 'Confirm & Move to Trash' : 'Confirm & Keep Cards'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

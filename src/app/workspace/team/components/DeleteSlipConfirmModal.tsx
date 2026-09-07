'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface DeleteSlipConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  monthYear: string;
  netPaid: number | string;
  isDeleting?: boolean;
}

export default function DeleteSlipConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  monthYear,
  netPaid,
  isDeleting = false,
}: DeleteSlipConfirmModalProps) {
  const formattedNetPaid = typeof netPaid === 'number' 
    ? `₹${netPaid.toLocaleString('en-IN')}` 
    : netPaid.startsWith('₹') 
      ? netPaid 
      : `₹${netPaid}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="delete-slip-modal-container" className="fixed inset-0 z-[100020] flex items-center justify-center p-4 font-sans">
          {/* Soft Dark Backdrop */}
          <motion.div
            key="delete-slip-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isDeleting ? undefined : onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

        {/* Luxury Alert Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_25px_70px_rgba(225,29,72,0.22)] border border-rose-200/80 overflow-hidden"
        >
          {/* Top Red Glow Gradient Strip */}
          <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-red-600 to-amber-500" />

          {/* Close button */}
          {!isDeleting && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="p-6 sm:p-7 space-y-5 text-center">
            {/* Warning Icon */}
            <div className="relative mx-auto w-14 h-14 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/15">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Delete Salary Slip?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the salary slip for{' '}
                <strong className="font-extrabold text-slate-900">{monthYear}</strong> ({formattedNetPaid})? This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-md shadow-rose-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Slip</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

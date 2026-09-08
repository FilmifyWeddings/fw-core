'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface PostProductionConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PostProductionConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onClose,
}: PostProductionConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 font-sans select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          {/* 3D Luxury Alert Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-[#1A1816] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.3)] border border-stone-200/80 dark:border-stone-800 overflow-hidden"
          >
            {/* Top Accent Strip */}
            <div
              className={`h-2 w-full ${
                isDanger
                  ? 'bg-gradient-to-r from-rose-500 via-red-600 to-amber-500'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
              }`}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-stone-200 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-7 space-y-5 text-center">
              {/* Icon */}
              <div
                className={`relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  isDanger
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 shadow-rose-500/15'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 shadow-amber-500/15'
                }`}
              >
                {isDanger ? (
                  <Trash2 className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              {/* Title & Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-stone-100 tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-stone-300 leading-relaxed max-w-sm mx-auto">
                  {message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-slate-700 dark:text-stone-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  {cancelText}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDanger
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25'
                  }`}
                >
                  {isDanger && <Trash2 className="w-3.5 h-3.5" />}
                  <span>{confirmText}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

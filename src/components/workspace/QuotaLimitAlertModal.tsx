'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FileText, Image as ImageIcon, Trash2, X, Sparkles, ArrowRight } from 'lucide-react';

interface QuotaLimitAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quotation' | 'image';
  currentCount: number;
  maxLimit?: number;
  onManageAction?: () => void;
}

export function QuotaLimitAlertModal({
  isOpen,
  onClose,
  type,
  currentCount,
  maxLimit = 10,
  onManageAction
}: QuotaLimitAlertModalProps) {
  if (!isOpen) return null;

  const isQuotation = type === 'quotation';
  const percentage = Math.min(100, Math.round((currentCount / maxLimit) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden text-center space-y-5"
        >
          {/* Subtle Top Ambient Gradient */}
          <div 
            className={`absolute top-0 left-0 right-0 h-28 pointer-events-none opacity-40 blur-2xl ${
              isQuotation 
                ? 'bg-gradient-to-b from-amber-400 to-indigo-500' 
                : 'bg-gradient-to-b from-pink-400 to-rose-500'
            }`} 
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
            <div 
              className={`w-full h-full rounded-2xl flex items-center justify-center text-white ${
                isQuotation 
                  ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-600 shadow-amber-500/20' 
                  : 'bg-gradient-to-br from-pink-500 via-rose-600 to-purple-600 shadow-pink-500/20'
              }`}
            >
              {isQuotation ? (
                <FileText className="w-8 h-8 stroke-[2.2]" />
              ) : (
                <ImageIcon className="w-8 h-8 stroke-[2.2]" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-zinc-900 rounded-full shadow-md">
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {isQuotation ? 'Quotation Limit Reached' : 'Image Upload Limit Reached'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xs mx-auto">
              {isQuotation
                ? `You have reached the maximum quota of ${maxLimit} quotation designs for your workspace.`
                : `You have reached the maximum quota of ${maxLimit} gallery images for your workspace.`}
            </p>
          </div>

          {/* Meter Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-zinc-400">
                {isQuotation ? 'Quotations Used' : 'Images Stored'}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                currentCount >= maxLimit 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' 
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}>
                {currentCount} / {maxLimit} Limit ({percentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  isQuotation
                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600'
                }`}
              />
            </div>
          </div>

          {/* Explanation Text */}
          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 p-3 text-left flex items-start gap-2.5 relative z-10">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-normal">
              {isQuotation
                ? 'Naya quotation create ya duplicate karne ke liye, kripya purana ya unused quotation delete karein.'
                : 'Nayi image upload karne ke liye, kripya gallery se purani image delete karein.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1 relative z-10">
            {onManageAction && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageAction();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  isQuotation
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                    : 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isQuotation ? 'Manage & Delete Quotations' : 'Open Gallery to Delete Images'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Got It / Theek Hai
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

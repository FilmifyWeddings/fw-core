'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export interface FeatureLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName: string;
  requiredPlan: 'Pro' | 'Studio' | 'Gallery';
  description?: string;
}

export default function FeatureLockModal({
  isOpen,
  onClose,
  onUpgrade,
  featureName,
  requiredPlan,
  description,
}: FeatureLockModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100020] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-5 text-center relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Lock Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Lock className="w-7 h-7 stroke-[2.5]" />
          </div>

          {/* Title & Badge */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Available on {requiredPlan} Plan
            </div>
            <h3 className="text-xl font-black text-stone-900">
              Unlock {featureName}
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              {description ||
                `${featureName} is part of the StudioCore ${requiredPlan} plan. Upgrade now to empower your workflow with advanced automation and tools.`}
            </p>
          </div>

          {/* Feature highlights */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Instant Unlocking — Zero downtime</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>14-Day Money-Back Guarantee</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="flex-2 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>View Plans & Upgrade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

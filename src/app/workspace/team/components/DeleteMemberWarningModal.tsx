'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, ShieldAlert, CalendarX2, UserX, Loader2 } from 'lucide-react';

export interface DeleteMemberWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  member: {
    id: string;
    name: string;
    primary_role?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    primary_type?: string;
  } | null;
  isDeleting?: boolean;
}

export default function DeleteMemberWarningModal({
  isOpen,
  onClose,
  onConfirm,
  member,
  isDeleting = false,
}: DeleteMemberWarningModalProps) {
  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4">
        {/* Soft Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isDeleting ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Luxury Red Alert Modal Chassis */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-[0_25px_70px_rgba(225,29,72,0.25)] border border-rose-200/80 overflow-hidden"
        >
          {/* Top Red Glow Gradient Accent */}
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
            {/* Pulsing Warning Icon */}
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/15">
              <div className="absolute inset-0 rounded-2xl bg-rose-500/20 animate-ping opacity-30" />
              <AlertTriangle className="w-8 h-8 text-rose-600 relative z-10" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Remove Team Member / Partner?
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Are you sure you want to delete <span className="font-extrabold text-slate-900">&quot;{member.name}&quot;</span> from your workspace?
              </p>
            </div>

            {/* Member Profile Badge Preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              {member.avatar_url ? (
                // eslint-disable-next-next/no-img-element
                <img
                  src={member.avatar_url}
                  alt={member.name}
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-rose-200 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-slate-900 truncate">{member.name}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[9.5px] font-black uppercase tracking-wider border border-rose-200 shrink-0">
                    {member.primary_role || 'Crew'}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                  {member.email || member.phone || 'Studio Member'}
                </p>
              </div>
            </div>

            {/* Detailed Warnings Box */}
            <div className="rounded-2xl bg-rose-50/70 border border-rose-200/90 p-3.5 space-y-2 text-left">
              <div className="flex items-start gap-2 text-rose-900 text-xs font-bold">
                <CalendarX2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-black text-rose-700">Shoot Unassignment:</strong> Unassigned from all assigned upcoming and past event slots automatically.
                </span>
              </div>
              <div className="flex items-start gap-2 text-rose-900 text-xs font-bold">
                <UserX className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-black text-rose-700">Access Revoked:</strong> Workspace portal login, permissions, and attendance links will be disabled.
                </span>
              </div>
              <div className="flex items-start gap-2 text-rose-900 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-black text-rose-700">Permanent Action:</strong> This record cannot be recovered once removed.
                </span>
              </div>
            </div>

            {/* Actions: Cancel vs Confirm Delete */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel (सुरक्षित रखें)
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Yes, Delete (हटाएं)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

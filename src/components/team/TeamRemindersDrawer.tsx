'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, Calendar, CheckCircle2, X, AlertCircle, Check, Loader2 } from 'lucide-react';

export interface StudioReminder {
  id: string;
  workspace_id?: string;
  deliverable_id: string;
  project_id?: string;
  recipient_id?: string;
  recipient_name?: string;
  title?: string;
  reminder_text?: string;
  reminder_at: string;
  status: string;
  created_at?: string;
}

interface TeamRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onCountChange?: (count: number) => void;
}

export default function TeamRemindersDrawer({
  isOpen,
  onClose,
  workspaceId,
  onCountChange
}: TeamRemindersDrawerProps) {
  const [reminders, setReminders] = useState<StudioReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<StudioReminder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const url = workspaceId ? `/api/team/reminders?workspaceId=${workspaceId}` : '/api/team/reminders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.reminders)) {
        setReminders(data.reminders);
        onCountChange?.(data.reminders.length);
      }
    } catch (err) {
      console.warn('[TeamRemindersDrawer] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, onCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen, fetchReminders]);

  // Listen for real-time reminder created events
  useEffect(() => {
    const handleNewReminder = () => {
      fetchReminders();
    };
    window.addEventListener('studio_reminder_created', handleNewReminder);
    return () => {
      window.removeEventListener('studio_reminder_created', handleNewReminder);
    };
  }, [fetchReminders]);

  const handleMarkDone = async (reminder: StudioReminder) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/team/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id, status: 'completed' })
      });
      const data = await res.json();
      if (data.success) {
        setReminders(prev => {
          const updated = prev.filter(r => r.id !== reminder.id);
          onCountChange?.(updated.length);
          return updated;
        });
        setConfirmTarget(null);
      }
    } catch (err) {
      console.warn('Failed to mark reminder done:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatReminderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return dateStr;
    }
  };

  const isOverdue = (dateStr: string) => {
    try {
      return new Date(dateStr).getTime() < Date.now();
    } catch (_) {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex justify-end bg-black/50 backdrop-blur-2xs">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl border-l border-amber-200/80 flex flex-col text-stone-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900">
                <Bell className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
                  <span>Team &amp; Shoot Reminders</span>
                  {reminders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-2xs">
                      {reminders.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Follow-ups and task alerts scheduled for shoots &amp; team
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-bold">Loading reminders...</span>
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-stone-800">All Reminders Cleared!</h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  You have no pending reminders or follow-ups. Schedule alerts from the notes drawer inside any shoot or deliverable card.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const overdue = isOverdue(rem.reminder_at);
                const titleText = rem.reminder_text || rem.title || 'Shoot Task Follow-up';

                return (
                  <motion.div
                    key={rem.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 font-mono ${
                          overdue
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{overdue ? '⚠️ Overdue' : '⏰ Scheduled'}</span>
                        </span>

                        <span className="text-[11px] font-mono text-stone-500 font-bold">
                          {formatReminderDate(rem.reminder_at)}
                        </span>
                      </div>

                      {/* Done Button */}
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(rem)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        title="Mark reminder as completed"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span>Done</span>
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-stone-800 leading-relaxed">
                      {titleText}
                    </p>

                    {rem.recipient_name && (
                      <div className="text-[11px] text-stone-500 font-medium">
                        Assignee: <span className="font-bold text-stone-700">{rem.recipient_name}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-white border-t border-stone-200 text-center">
            <span className="text-[11px] text-stone-400 font-medium">
              Reminders stay synced across all team &amp; partner assignments
            </span>
          </div>
        </motion.div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmTarget && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-sm w-full space-y-3.5 text-stone-900"
              >
                <div className="flex items-center gap-2.5 text-amber-900">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">Mark Reminder as Done?</h4>
                    <p className="text-xs text-stone-500 font-medium">
                      This reminder will be marked complete and removed from active alerts.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800">
                  {confirmTarget.reminder_text || confirmTarget.title}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmTarget(null)}
                    className="px-3.5 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleMarkDone(confirmTarget)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Confirm &amp; Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

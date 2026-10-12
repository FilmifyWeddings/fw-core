'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Phone,
  User,
  Users,
  Check,
  Hourglass,
  XCircle,
} from 'lucide-react';
import { Lead } from '@/types';

interface SequenceStep {
  step_number: number;
  step_index: number;
  template_name: string;
  template_id: string;
  delay_value: number;
  delay_unit: string;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed' | 'unsent' | string;
  sent_at: string | null;
  sent_at_formatted: string;
  error_message: string | null;
}

interface LeadWelcomeSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  workspaceId?: string;
  onStatusUpdated?: (leadId: string, status: string) => void;
}

export function LeadWelcomeSequenceModal({
  isOpen,
  onClose,
  lead,
  workspaceId,
  onStatusUpdated,
}: LeadWelcomeSequenceModalProps) {
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadMeta, setLeadMeta] = useState<any>(null);

  // Interval config for re-send sequence
  const [gapValue, setGapValue] = useState<number>(5);
  const [gapUnit, setGapUnit] = useState<'seconds' | 'minutes' | 'days'>('seconds');
  const [resendingSeq, setResendingSeq] = useState(false);

  // Individual step dispatch tracking
  const [dispatchingStepIdx, setDispatchingStepIdx] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSequence = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch(`/api/workflows/welcome-sequence?lead_id=${lead.id}&workspace_id=${activeWs}`);
      const data = await res.json();
      if (data.success) {
        setSteps(data.steps || []);
        setLeadMeta(data.lead || null);
      }
    } catch (err) {
      console.error('[LeadWelcomeSequenceModal] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [lead?.id, workspaceId]);

  useEffect(() => {
    if (isOpen && lead?.id) {
      fetchSequence();
    }
  }, [isOpen, lead?.id, fetchSequence]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Re-send entire sequence with custom gap
  const handleResendSequence = async () => {
    if (!lead?.id || resendingSeq) return;
    setResendingSeq(true);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/welcome-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_sequence',
          leadId: lead.id,
          gapValue,
          gapUnit,
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Sequence dispatched! Gap: ${gapValue} ${gapUnit}`);
        fetchSequence();
        if (onStatusUpdated) onStatusUpdated(lead.id, 'sent');
      } else {
        showToast(`❌ Error: ${data.error || 'Failed to dispatch'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setResendingSeq(false);
    }
  };

  // Send single step immediately
  const handleSendSingleStep = async (step: SequenceStep) => {
    if (!lead?.id || dispatchingStepIdx !== null) return;
    setDispatchingStepIdx(step.step_index);
    try {
      const activeWs = workspaceId || (lead as any).workspace_id || '';
      const res = await fetch('/api/workflows/welcome-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_single_step',
          leadId: lead.id,
          stepIndex: step.step_index,
          templateName: step.template_name,
          templateId: step.template_id,
          workspaceId: activeWs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Step ${step.step_number} (${step.template_name}) sent!`);
        fetchSequence();
        if (onStatusUpdated) onStatusUpdated(lead.id, 'sent');
      } else {
        showToast(`❌ Error: ${data.error || 'Failed to send'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setDispatchingStepIdx(null);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
        />

        {/* Modal Container: Light Creamy Minimal Theme */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative z-10 w-full max-w-xl bg-[#FFFDF7] dark:bg-[#1E1D19] border border-amber-200/80 dark:border-amber-900/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Subtle Warm Amber Top Accent */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-stone-100 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg border border-amber-400/30 animate-in fade-in slide-in-from-top-2">
              {toastMessage}
            </div>
          )}

          {/* Header */}
          <div className="p-5 border-b border-amber-100 dark:border-stone-800/80 bg-[#FAF7F0]/60 dark:bg-[#23221E] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                    WhatsApp Welcome Message
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                    Automated welcome workflow sequence
                  </p>
                </div>
              </div>

              {/* Lead Info Pill Row */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone-600 dark:text-stone-300 mt-2.5 font-medium">
                <span className="flex items-center gap-1 font-bold text-stone-900 dark:text-white">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  {lead.name || 'Lead'}
                </span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-stone-600 dark:text-stone-300">
                  <Phone className="w-3 h-3 text-stone-400" />
                  {lead.phone}
                </span>
                {leadMeta?.group_name && (
                  <>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-900/60">
                      <Users className="w-2.5 h-2.5" />
                      {leadMeta.group_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sequence Controls Bar: Configurable Step Gap & Re-send Sequence */}
          <div className="p-4 bg-[#F8F5EE] dark:bg-[#252420] border-b border-amber-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Step Interval Gap:
              </span>
              <input
                type="number"
                min={1}
                max={999}
                value={gapValue}
                onChange={e => setGapValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 px-2 py-1 bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700 rounded-lg text-xs font-bold text-center text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <select
                value={gapUnit}
                onChange={e => setGapUnit(e.target.value as any)}
                className="px-2 py-1 bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700 rounded-lg text-xs font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="days">Days</option>
              </select>
            </div>

            <button
              onClick={handleResendSequence}
              disabled={resendingSeq || steps.length === 0}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {resendingSeq ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Re-send Sequence
            </button>
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {loading ? (
              <div className="py-16 text-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                <p className="text-xs font-medium">Loading sequence steps...</p>
              </div>
            ) : steps.length === 0 ? (
              <div className="py-12 text-center text-stone-400 border border-dashed border-amber-200 dark:border-stone-800 rounded-2xl">
                <MessageSquare className="w-7 h-7 mx-auto mb-2 text-amber-300 dark:text-stone-600" />
                <p className="text-xs font-bold">No welcome steps defined</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Please check workspace workflow automation settings.</p>
              </div>
            ) : (
              steps.map((step) => {
                const isSent = ['sent', 'delivered', 'read'].includes(step.status);
                const isPending = step.status === 'pending';
                const isFailed = step.status === 'failed';
                const isDispatching = dispatchingStepIdx === step.step_index;

                return (
                  <div
                    key={step.step_index}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSent
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : isFailed
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40'
                          : isPending
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                            : 'bg-white dark:bg-stone-900/60 border-amber-100 dark:border-stone-800 hover:border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Step Number Badge + Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isSent
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isFailed
                                ? 'bg-red-500 text-white'
                                : isPending
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {step.step_number}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {step.template_name}
                            </span>
                            
                            {/* Status Badge */}
                            {isSent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                <Check className="w-2.5 h-2.5" /> Sent
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                                <Hourglass className="w-2.5 h-2.5 animate-spin" /> Scheduled
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400">
                                <XCircle className="w-2.5 h-2.5" /> Failed
                              </span>
                            )}
                            {!isSent && !isPending && !isFailed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-stone-200/60 dark:bg-stone-800 text-stone-500">
                                Unsent
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                            <span className="font-mono text-[10px]">ID: {step.template_id}</span>
                            {step.sent_at_formatted && step.sent_at_formatted !== '—' && (
                              <>
                                <span className="text-stone-300 dark:text-stone-700">·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-400" />
                                  {step.sent_at_formatted}
                                </span>
                              </>
                            )}
                          </div>

                          {step.error_message && (
                            <div className="mt-1.5 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-1.5 font-mono">
                              {step.error_message}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Individual Send Button */}
                      <button
                        onClick={() => handleSendSingleStep(step)}
                        disabled={isDispatching}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        title="Send only this specific message now"
                      >
                        {isDispatching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-100 dark:border-stone-800 bg-[#FAF7F0]/60 dark:bg-[#23221E] flex items-center justify-between">
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              {steps.length} total sequence steps · Baileys engine ready
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

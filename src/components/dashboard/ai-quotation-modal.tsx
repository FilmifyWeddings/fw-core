'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Check, AlertTriangle, ArrowRight, Loader2, 
  FileText, Calendar, MapPin, Users, DollarSign, Camera, Video, MessageSquare
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';

interface AiQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  quotationId?: string | null;
  onApplied?: (updatedDoc: any, targetQuotationId: string) => void;
}

export function AiQuotationModal({
  isOpen,
  onClose,
  lead,
  quotationId,
  onApplied
}: AiQuotationModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted Result State
  const [extractedDoc, setExtractedDoc] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  if (!isOpen || !lead) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: lead.id,
          quotationId: quotationId || null,
          additionalNotes: additionalNotes.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI could not generate quotation.');
      }

      setExtractedDoc(json.extractedDocument);
      setSummary(json.summary);
      setMissingInfo(json.missingInformation || []);
      setConflicts(json.conflicts || []);
      setStep('preview');
    } catch (err: any) {
      console.error('[AI Modal Generation Error]:', err);
      setErrorMsg(err.message || "AI couldn't generate the quotation. Your existing quotation has not been changed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!extractedDoc) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // If no quotationId exists, first create one for lead
      let targetQId = quotationId;
      if (!targetQId) {
        const createRes = await fetch('/api/quotations/create-for-lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            leadId: lead.id,
            clientName: lead.name
          })
        });
        const createJson = await createRes.json();
        if (!createRes.ok || !createJson.success) {
          throw new Error(createJson.error || 'Failed to initialize quotation draft for lead');
        }
        targetQId = createJson.quotationId || createJson.templateId;
      }

      // Apply extracted document directly to current draft without version bump
      const applyRes = await fetch('/api/quotations/ai-apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quotationId: targetQId,
          document: extractedDoc
        })
      });

      const applyJson = await applyRes.json();
      if (!applyRes.ok || !applyJson.success) {
        throw new Error(applyJson.error || 'Failed to apply AI data to quotation');
      }

      if (onApplied && targetQId) {
        onApplied(extractedDoc, targetQId);
      }
      onClose();
    } catch (err: any) {
      console.error('[AI Apply Error]:', err);
      setErrorMsg(err.message || 'Failed to apply quotation changes.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-white dark:bg-[#1A1816] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 dark:border-amber-500/10 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                  ✨ Create Quotation with AI
                </h3>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {step === 'input' ? "AI will use this lead's information to prepare your quotation." : "Review AI generated proposal before applying."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 'input' ? (
              <div className="space-y-4">
                {/* Lead Summary Overview */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 dark:bg-zinc-900/60 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Lead Information
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Ready for Extraction
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>{lead.name || 'Valued Client'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Client details</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Event & date info</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lead notes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{quotationId ? 'Current quotation draft' : 'Default template schema'}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Additional Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Add anything else for AI (Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Paste WhatsApp messages, client requirements, additional notes, pricing, functions, or deliverables..."
                    className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    StudioCore automatically includes all existing lead details. You don&apos;t have to re-paste saved data.
                  </p>
                </div>
              </div>
            ) : (
              /* PREVIEW STEP */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Quotation Summary
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Couple Name</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.coupleName || 'Rahul & Neha'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Wedding Date</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.weddingDate || 'TBD'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Location / Venue</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.location || 'MUMBAI'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Investment</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
                        {summary?.totalInvestment || '₹1,50,000'}
                      </span>
                    </div>
                  </div>

                  {/* Functions List */}
                  {summary?.functionsList && summary.functionsList.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">Functions Identified ({summary.functionsCount})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.functionsList.map((fn: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            ✓ {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conflicts Alert */}
                {conflicts.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Data Conflict Detected</span>
                    </div>
                    {conflicts.map((conf: any, idx: number) => (
                      <div key={idx} className="text-xs text-amber-900 dark:text-amber-200 pl-6">
                        • {conf.message || `${conf.field}: ${conf.values?.join(' vs ')}`}
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing Details Warning */}
                {missingInfo.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>⚠ {missingInfo.length} detail{missingInfo.length > 1 ? 's' : ''} need your attention</span>
                    </div>
                    <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4 list-disc">
                      {missingInfo.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            {step === 'input' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={generating}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Context...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Quotation</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  disabled={applying}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to Input
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Applying Data...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{missingInfo.length > 0 ? 'Apply Anyway' : 'Apply to Quotation'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Plus, ExternalLink, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';

interface QuotationVersionItem {
  id?: string;
  template_id: string;
  lead_id: string;
  version: number;
  version_label: string;
  title: string;
  updated_at: string;
  created_at: string;
  content_json?: any;
}

interface LeadQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function LeadQuotationModal({ isOpen, onClose, lead }: LeadQuotationModalProps) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lead?.id) {
      loadQuotations();
    } else {
      setQuotations([]);
      setErrorMsg(null);
    }
  }, [isOpen, lead?.id]);

  const loadQuotations = async () => {
    if (!lead?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/leads/${lead.id}/quotations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.quotations)) {
        setQuotations(json.quotations);
      } else {
        setQuotations([]);
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Fetch error:', err);
      setErrorMsg('Failed to load quotation history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewQuotation = async () => {
    if (!lead?.id || creating) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/create-for-lead', {
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

      const json = await res.json();
      if (json.success && (json.quotationId || json.templateId)) {
        const qId = json.quotationId || json.templateId;
        await loadQuotations();
        router.push(`/workspace/quotations/builder/templet/${qId}`);
        onClose();
      } else {
        setErrorMsg(json.error || 'Failed to create new quotation for lead.');
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Create error:', err);
      setErrorMsg('Network error while creating quotation.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenQuotation = (templateId: string) => {
    router.push(`/workspace/quotations/builder/templet/${templateId}`);
    onClose();
  };

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white dark:bg-[#1C1A18] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-b border-amber-500/20 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                  QUOTATIONS
                </h3>
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate max-w-[200px]">
                  {lead.name}
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

          {/* Quotations List Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-semibold">Loading quotations...</span>
              </div>
            ) : quotations.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                <FileText className="w-8 h-8 opacity-30 text-amber-500" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No quotations created yet.</p>
                <p className="text-[10px] text-zinc-400">Click below to create the first version for {lead.name}.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {quotations.map((q) => {
                  const formatDateTime = (dateStr?: string) => {
                    if (!dateStr) return 'Recent';
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return 'Recent';
                    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    return `${datePart} • ${timePart}`;
                  };

                  const updatedDateStr = formatDateTime(q.updated_at || q.created_at);

                  return (
                    <div
                      key={q.template_id}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-xs shrink-0 shadow-xs">
                          {q.version_label || `V${q.version}`}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {q.title || 'Wedding Quotation'}
                          </h4>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            <span>{updatedDateStr}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenQuotation(q.template_id)}
                        className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3.5 bg-zinc-50 dark:bg-[#161412] border-t border-zinc-200/80 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={handleCreateNewQuotation}
              disabled={creating}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Quotation...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Create New Quotation</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

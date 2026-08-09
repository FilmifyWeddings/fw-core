'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Plus, ExternalLink, Calendar, RefreshCw, AlertCircle, 
  Send, Download, CheckCircle2, DollarSign, Copy, Check
} from 'lucide-react';
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
  public_token?: string;
  responseBadge?: {
    type: 'accepted' | 'budget_discussion';
    label: string;
    budgetAmount?: number;
  };
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

  // Share Link Modal state
  const [activeShareModal, setActiveShareModal] = useState<{ quotationId: string; url: string } | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && lead?.id) {
      loadQuotations();
    } else {
      setQuotations([]);
      setErrorMsg(null);
      setActiveShareModal(null);
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

  const handleSendLink = async (q: QuotationVersionItem) => {
    setGeneratingLink(q.template_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/send-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quotationId: q.template_id })
      });

      const json = await res.json();
      if (json.success && json.publicUrl) {
        setActiveShareModal({ quotationId: q.template_id, url: json.publicUrl });
      } else {
        setErrorMsg('Failed to generate preview link.');
      }
    } catch (err) {
      console.error('Error generating send link:', err);
      setErrorMsg('Network error generating preview link.');
    } finally {
      setGeneratingLink(null);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const handleDownloadPDF = async (q: QuotationVersionItem) => {
    const templateId = q.template_id;
    if (downloadingPdf === templateId) return;

    setDownloadingPdf(templateId);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/quotations/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId,
          filename: `${q.title || 'Quotation'}-${q.version_label || `V${q.version}`}.pdf`,
          content_json: q.content_json
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to export PDF (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${q.title || 'Quotation'}-${q.version_label || `V${q.version}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('[Download PDF Error]:', err);
      setErrorMsg(err.message || 'Network error while exporting PDF.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleCopyLink = () => {
    if (!activeShareModal?.url) return;
    navigator.clipboard.writeText(activeShareModal.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <div className="space-y-3">
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
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
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

                        {/* Status Badge */}
                        {q.responseBadge && (
                          <div className="shrink-0">
                            {q.responseBadge.type === 'accepted' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>✓ Accepted</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-amber-500" />
                                <span>
                                  {q.responseBadge.budgetAmount
                                    ? `Budget: ₹${q.responseBadge.budgetAmount.toLocaleString('en-IN')}`
                                    : 'Budget Discussion'}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: SEND | DOWNLOAD PDF | OPEN */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => handleSendLink(q)}
                          disabled={generatingLink === q.template_id}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {generatingLink === q.template_id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3 text-amber-500" />
                          )}
                          <span>SEND</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(q)}
                          disabled={downloadingPdf === q.template_id}
                          className="px-3 py-1.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {downloadingPdf === q.template_id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />
                              <span>Generating PDF...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3 text-cyan-500" />
                              <span>DOWNLOAD PDF</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenQuotation(q.template_id)}
                          className="px-3 py-1.5 rounded-xl bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
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

        {/* ── SHARE LINK POPUP MODAL ── */}
        <AnimatePresence>
          {activeShareModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white dark:bg-[#1C1A18] rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                      Client Preview Link
                    </h4>
                  </div>
                  <button onClick={() => setActiveShareModal(null)} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Share this secure preview link with {lead.name} to allow them to view, accept, or discuss budget for this quotation version.
                </p>

                <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeShareModal.url}
                    className="bg-transparent text-xs font-mono text-amber-600 dark:text-amber-400 truncate w-full outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveShareModal(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold"
                  >
                    Close
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

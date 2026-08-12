'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Plus, ExternalLink, Calendar, RefreshCw, AlertCircle, 
  Send, Download, CheckCircle2, DollarSign, Copy, Check, Sparkles, Loader2, ArrowRight, ChevronDown, LayoutTemplate
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import { AiQuotationModal } from './ai-quotation-modal';

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

interface StudioTemplateItem {
  id: string;
  title: string;
  category?: string;
  is_default?: boolean;
  is_system_template?: boolean;
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
  const [openingQuotation, setOpeningQuotation] = useState<{ id: string; title: string; step: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template Picker state
  const [availableTemplates, setAvailableTemplates] = useState<StudioTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // AI Quotation Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetQuotationId, setAiTargetQuotationId] = useState<string | null>(null);

  // Share Link Modal state
  const [activeShareModal, setActiveShareModal] = useState<{ quotationId: string; url: string } | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && lead?.id) {
      loadQuotations();
      loadAvailableTemplates();
    } else {
      setQuotations([]);
      setErrorMsg(null);
      setActiveShareModal(null);
      setOpeningQuotation(null);
      setShowTemplateMenu(false);
    }
  }, [isOpen, lead?.id]);

  const loadAvailableTemplates = async () => {
    try {
      const res = await fetch('/api/quotation-templates');
      const json = await res.json();
      if (json.success && Array.isArray(json.templates)) {
        setAvailableTemplates(json.templates);
        // Find default template
        const def = json.templates.find((t: StudioTemplateItem) => t.is_default) || json.templates[0];
        if (def) setSelectedTemplateId(def.id);
      }
    } catch (e) {
      console.warn('[LeadQuotationModal] Templates fetch warning:', e);
    }
  };

  const loadQuotations = async () => {
    if (!lead?.id) return;
    setErrorMsg(null);

    // 1. INSTANT SESSION SWR CACHE HYDRATION (<1ms)
    const cacheKey = `lead_quotes_cache_${lead.id}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuotations(parsed);
          setLoading(false);
        }
      } catch (e) {}
    } else {
      setLoading(true);
    }

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
        sessionStorage.setItem(cacheKey, JSON.stringify(json.quotations));

        // Pre-warm Next.js route bundle for sub-second opening
        json.quotations.forEach((q: QuotationVersionItem) => {
          if (q.template_id) router.prefetch(`/workspace/quotations/builder/templet/${q.template_id}`);
        });
      } else {
        setQuotations([]);
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Fetch error:', err);
      if (!cachedData) setErrorMsg('Failed to load quotation history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewQuotation = async () => {
    if (!lead?.id || creating) return;
    setCreating(true);
    setErrorMsg(null);
    setShowTemplateMenu(false);
    setOpeningQuotation({ id: 'NEW', title: 'Creating New Quotation Version...', step: 'Resolving Selected Studio Template...' });

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
          clientName: lead.name,
          explicitTemplateId: selectedTemplateId || undefined
        })
      });

      const json = await res.json();
      if (json.success && (json.quotationId || json.templateId)) {
        const qId = json.quotationId || json.templateId;
        setOpeningQuotation({ id: qId, title: `Quotation V${json.version || ''}`, step: 'Hydrating Builder Canvas...' });

        if (json.document) {
          try {
            const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
            cacheDocumentLocal(qId, json.document, json.version || 1);
          } catch (e) {}
        }

        router.push(`/workspace/quotations/builder/templet/${qId}`);
        setTimeout(() => onClose(), 600);
      } else {
        setErrorMsg(json.error || 'Failed to create new quotation for lead.');
        setOpeningQuotation(null);
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Create error:', err);
      setErrorMsg('Network error while creating quotation.');
      setOpeningQuotation(null);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenQuotation = (templateId: string, versionTitle?: string) => {
    setOpeningQuotation({
      id: templateId,
      title: versionTitle || 'Quotation Document',
      step: 'Loading Design Tokens & Page Sequence...'
    });

    router.prefetch(`/workspace/quotations/builder/templet/${templateId}`);
    fetch(`/api/templates/${templateId}`).catch(() => {});

    setTimeout(() => {
      router.push(`/workspace/quotations/builder/templet/${templateId}`);
      setTimeout(() => onClose(), 600);
    }, 150);
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');

  const handleDownloadPDF = async (q: QuotationVersionItem) => {
    const templateId = q.template_id;
    if (downloadingPdf === templateId) return;

    setDownloadingPdf(templateId);
    setIsExportingPdf(true);
    setExportProgress(15);
    setExportStatusText('Fetching document snapshot...');
    setErrorMsg(null);

    const progressTimer = setInterval(() => {
      setExportProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const { downloadServerChromiumPdf } = await import('@/lib/pdf-export-engine');
      setExportStatusText('Rendering HD Chromium PDF Pages...');

      const blobUrl = await downloadServerChromiumPdf({
        templateId,
        filename: `${q.title || 'Quotation'}_V${q.version}.pdf`,
      });

      setExportProgress(100);
      setExportStatusText('Download Complete!');
      clearInterval(progressTimer);

      if (typeof blobUrl === 'string') {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${q.title || 'Quotation'}_V${q.version}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 15000);
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('[Download PDF Error]:', err);
      setErrorMsg(err.message || 'Network error while exporting PDF.');
    } finally {
      setTimeout(() => {
        setIsExportingPdf(false);
        setExportProgress(0);
        setDownloadingPdf(null);
      }, 1500);
    }
  };

  const handleCopyLink = () => {
    if (!activeShareModal?.url) return;
    navigator.clipboard.writeText(activeShareModal.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !lead) return null;

  const currentSelectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId) || availableTemplates[0] || {
    id: 'DEFAULT',
    title: 'Studio Default Template',
    is_default: true
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-[#1C1A18] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh]"
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

          {/* Opening Quotation Screen Overlay Skeleton */}
          {openingQuotation && (
            <div className="absolute inset-0 z-50 bg-white/95 dark:bg-[#1C1A18]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 animate-in fade-in duration-150">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-amber-500/20 animate-ping" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xl z-10">
                  <Sparkles className="w-7 h-7 animate-pulse text-amber-100" />
                </div>
              </div>

              {/* Skeleton Canvas Preview Card */}
              <div className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-4 rounded-md bg-amber-500/30" />
                  <div className="w-12 h-3 rounded-md bg-zinc-300 dark:bg-zinc-700" />
                </div>
                <div className="w-48 h-5 rounded-md bg-zinc-300 dark:bg-zinc-700" />
                <div className="w-32 h-3 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {openingQuotation.title}
                </h4>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{openingQuotation.step}</span>
                </p>
              </div>
            </div>
          )}

          {/* Quotations List Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SKELETON LOADING STATE FOR VERSIONS LIST */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800 animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-7 rounded-lg bg-amber-500/20" />
                        <div className="space-y-1.5">
                          <div className="w-36 h-3.5 rounded-md bg-zinc-300 dark:bg-zinc-700" />
                          <div className="w-24 h-2.5 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                      </div>
                      <div className="w-16 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="w-28 h-7 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                        <div className="w-7 h-7 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    </div>
                  </div>
                ))}
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
                      onMouseEnter={() => {
                        router.prefetch(`/workspace/quotations/builder/templet/${q.template_id}`);
                        fetch(`/api/templates/${q.template_id}`).catch(() => {});
                      }}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black shrink-0">
                            V{q.version}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate">
                              {q.title || `Quotation V${q.version}`}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>{updatedDateStr}</span>
                            </div>
                          </div>
                        </div>

                        {/* Client Response Badges */}
                        {q.responseBadge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              q.responseBadge.type === 'accepted'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {q.responseBadge.label}
                          </span>
                        )}
                      </div>

                      {/* Version Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60">
                        <button
                          type="button"
                          onClick={() => handleOpenQuotation(q.template_id, q.title || `Quotation V${q.version}`)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open Builder</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSendLink(q)}
                            disabled={generatingLink === q.template_id}
                            title="Generate Shareable Link"
                            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                          >
                            {generatingLink === q.template_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(q)}
                            disabled={downloadingPdf === q.template_id}
                            title="Download PDF"
                            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                          >
                            {downloadingPdf === q.template_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TEMPLATE PICKER DROPDOWN BAR */}
          {availableTemplates.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800/80 bg-amber-500/5 relative">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <LayoutTemplate className="w-3.5 h-3.5" /> Template to Use:
                </span>
                <button
                  type="button"
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-amber-500 text-zinc-900 dark:text-white flex items-center gap-1.5 transition-all text-xs"
                >
                  <span className="truncate max-w-[170px] font-bold">
                    {currentSelectedTemplate.title} {currentSelectedTemplate.is_default ? '(Default)' : ''}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              {/* Template Selection Dropdown Menu */}
              {showTemplateMenu && (
                <div className="absolute left-4 right-4 bottom-full mb-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 max-h-48 overflow-y-auto">
                  <span className="text-[9px] uppercase font-black text-zinc-400 block px-2 mb-1">
                    Select Studio Template to Fork:
                  </span>
                  {availableTemplates.map((tmpl) => {
                    const isSel = tmpl.id === selectedTemplateId;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tmpl.id);
                          setShowTemplateMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                          isSel
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black border border-amber-500/30'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{tmpl.title}</span>
                        </div>
                        {tmpl.is_default && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Create with AI</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewQuotation}
              disabled={creating}
              className="px-4 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Version</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Quotation Creator Modal */}
      <AiQuotationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        lead={lead}
        quotationId={aiTargetQuotationId}
      />

      {/* Share Link Drawer Modal */}
      {activeShareModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1A18] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              Shareable Link Ready
            </h4>
            <input
              type="text"
              readOnly
              value={activeShareModal.url}
              className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveShareModal(null)}
                className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

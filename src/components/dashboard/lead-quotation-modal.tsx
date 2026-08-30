'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Plus, ExternalLink, Calendar, RefreshCw, AlertCircle, 
  Send, Download, CheckCircle2, DollarSign, Copy, Check, Sparkles, Loader2, 
  ArrowRight, ChevronDown, LayoutTemplate, Eye, Pencil, Crown
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
  is_final?: boolean;
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
  onFinalSet?: (quotation: QuotationVersionItem) => void;
}

function safeSessionSet(key: string, data: any) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('lead_quotes_cache_') || k.startsWith('studio_templates_cache_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  }
}

function safeSessionGet(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function LeadQuotationModal({ isOpen, onClose, lead, onFinalSet }: LeadQuotationModalProps) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingQuotation, setOpeningQuotation] = useState<{ id: string; title: string; step: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [settingFinalId, setSettingFinalId] = useState<string | null>(null);
  const [confirmingFinalQuotation, setConfirmingFinalQuotation] = useState<QuotationVersionItem | null>(null);
  const [unmarkingFinalQuotation, setUnmarkingFinalQuotation] = useState<QuotationVersionItem | null>(null);

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

  // PDF Export state
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');

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
      setSettingFinalId(null);
    }
  }, [isOpen, lead?.id]);

  const loadAvailableTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || '';
      const token = session?.access_token || '';

      const cacheKey = currentUserId ? `studio_templates_cache_${currentUserId}` : 'studio_templates_cache';
      const cached = safeSessionGet(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setAvailableTemplates(cached);
        const activeDefault = cached.find((t: StudioTemplateItem) => t.is_default) || cached[0];
        if (activeDefault) setSelectedTemplateId(activeDefault.id);
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (session?.user?.email) headers['x-user-email'] = session.user.email;

      const res = await fetch(`/api/quotation-templates?workspace_id=${currentUserId}`, { headers });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_) {
        json = {};
      }

      if (json.success && Array.isArray(json.templates) && json.templates.length > 0) {
        setAvailableTemplates(json.templates);
        safeSessionSet(cacheKey, json.templates);

        const activeDefault = json.templates.find((t: StudioTemplateItem) => t.is_default) || json.templates[0];
        if (activeDefault) {
          setSelectedTemplateId(activeDefault.id);
        }
      } else if (availableTemplates.length === 0) {
        const defaultTemplates: StudioTemplateItem[] = [
          { id: 'FW-2WT85Y0', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
        ];
        setAvailableTemplates(defaultTemplates);
        setSelectedTemplateId(defaultTemplates[0].id);
      }
    } catch (e) {
      console.warn('[LeadQuotationModal] Templates fetch warning:', e);
      if (availableTemplates.length === 0) {
        const defaultTemplates: StudioTemplateItem[] = [
          { id: 'FW-2WT85Y0', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
        ];
        setAvailableTemplates(defaultTemplates);
        setSelectedTemplateId(defaultTemplates[0].id);
      }
    }
  };

  const loadQuotations = async () => {
    if (!lead?.id) return;
    setErrorMsg(null);

    const cacheKey = `lead_quotes_cache_${lead.id}`;
    const cachedData = safeSessionGet(cacheKey);
    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      setQuotations(cachedData);
      setLoading(false);
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

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_) {
        json = {};
      }

      if (json.success && Array.isArray(json.quotations)) {
        setQuotations(json.quotations);
        safeSessionSet(cacheKey, json.quotations);

        json.quotations.forEach((q: QuotationVersionItem) => {
          if (q.template_id) router.prefetch(`/workspace/quotations/builder/templet/${q.template_id}`);
        });
      } else {
        setQuotations([]);
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Fetch error:', err);
      if (!cachedData) setErrorMsg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFinalQuotation = async (q: QuotationVersionItem, unmark: boolean = false) => {
    if (!lead?.id || settingFinalId) return;
    setSettingFinalId(q.template_id);
    setErrorMsg(null);
    setConfirmingFinalQuotation(null);
    setUnmarkingFinalQuotation(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/set-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quotationId: q.template_id,
          leadId: lead.id,
          unmark
        })
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_) {
        json = {};
      }

      if (res.ok && json.success) {
        setQuotations(prev => {
          const updated = prev.map(item => ({
            ...item,
            is_final: unmark ? false : item.template_id === q.template_id
          }));
          const cacheKey = `lead_quotes_cache_${lead.id}`;
          safeSessionSet(cacheKey, updated);
          return updated;
        });
        if (onFinalSet && !unmark) {
          onFinalSet(q);
        }
      } else {
        setErrorMsg(json.error || 'Failed to update final quotation status.');
      }
    } catch (e: any) {
      console.error('Error setting final quotation:', e);
      setErrorMsg('Failed to update final quotation.');
    } finally {
      setSettingFinalId(null);
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

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_) {
        json = {};
      }

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

  const handleDownloadPDF = async (q: QuotationVersionItem) => {
    const templateId = q.template_id;
    if (downloadingPdf === templateId) return;

    setDownloadingPdf(templateId);
    setIsExportingPdf(true);
    setExportProgress(20);
    setExportStatusText('Fetching document snapshot...');
    setErrorMsg(null);

    const progressTimer = setInterval(() => {
      setExportProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 250);

    try {
      const { downloadServerChromiumPdf } = await import('@/lib/pdf-export-engine');
      setExportStatusText('Rendering Vector PDF Pages...');

      await downloadServerChromiumPdf({
        templateId,
        filename: `${q.title || 'Quotation'}_V${q.version}.pdf`,
        content_json: q.content_json
      });

      setExportProgress(100);
      setExportStatusText('Download Complete!');
      clearInterval(progressTimer);
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('[Download PDF Error]:', err);
      window.open(`/api/quotations/${templateId}/render-html?print=true`, '_blank');
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

  const fallbackTemplates: StudioTemplateItem[] = [
    { id: 'GLOBAL_DEFAULT', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
  ];
  const effectiveTemplateList = availableTemplates.length > 0 ? availableTemplates : fallbackTemplates;
  const currentSelectedTemplate = effectiveTemplateList.find(t => t.id === selectedTemplateId) || effectiveTemplateList[0];

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && lead && (
          <motion.div
            key="lead-quotation-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
          >
            <motion.div
              key="lead-quotation-modal-dialog"
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
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
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
                    {quotations.map((q, idx) => {
                      const formatDateTime = (dateStr?: string) => {
                        if (!dateStr) return 'Recent';
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return 'Recent';
                        const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        return `${datePart} • ${timePart}`;
                      };

                      const updatedDateStr = formatDateTime(q.updated_at || q.created_at);
                      const itemKey = q.template_id || q.id || `quote_ver_${q.version || idx}_${idx}`;

                      return (
                        <div
                          key={itemKey}
                          onMouseEnter={() => {
                            if (q.template_id) {
                              router.prefetch(`/workspace/quotations/builder/templet/${q.template_id}`);
                              fetch(`/api/templates/${q.template_id}`).catch(() => {});
                            }
                          }}
                          className={`p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border transition-all space-y-2.5 group ${
                            q.is_final
                              ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs'
                              : 'border-zinc-200/80 dark:border-zinc-800 hover:border-amber-300'
                          }`}
                        >
                          {(() => {
                            const displayTitle = (() => {
                              if (q.title && q.title.includes(' - ') && !q.title.includes('Design 1')) {
                                return q.title;
                              }
                              const content = q.content_json || {};
                              const cover = content.cover || {};
                              const coupleName = cover.coupleName 
                                || (cover.groomName && cover.brideName ? `${cover.groomName} & ${cover.brideName}` : (cover.groomName || cover.brideName || ''))
                                || q.title
                                || lead?.name 
                                || 'Couple';
                              const eventType = (cover.eventType || content.eventGroup || 'Wedding').replace(/quotation/i, '').trim();
                              return `${coupleName} - ${eventType} Quotation`;
                            })();

                            return (
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                                    q.is_final 
                                      ? 'bg-amber-500 text-white shadow-2xs' 
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  }`}>
                                    V{q.version}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate" title={displayTitle}>
                                      {displayTitle}
                                    </h4>
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                                      <Calendar className="w-3 h-3" />
                                      <span>{updatedDateStr}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Top Right: Final Quotation Toggle / Badge */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {q.is_final ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setUnmarkingFinalQuotation(q);
                                      }}
                                      disabled={settingFinalId === q.template_id}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-[#F36F21] text-white shadow-sm border border-amber-400 hover:brightness-110 transition cursor-pointer shrink-0"
                                      title="Click to Unlock / Unmark Final Quotation"
                                    >
                                      <Crown className="w-3 h-3 text-amber-100" />
                                      <span>Final Quotation (Locked)</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingFinalQuotation(q);
                                      }}
                                      disabled={settingFinalId === q.template_id}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-400 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all cursor-pointer shrink-0 group/btn"
                                      title="Mark this version as Final (Syncs to Finance & Payments)"
                                    >
                                      {settingFinalId === q.template_id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                                      ) : (
                                        <CheckCircle2 className="w-3 h-3 text-zinc-400 group-hover/btn:text-amber-600" />
                                      )}
                                      <span>Mark as Final</span>
                                    </button>
                                  )}

                                  {/* Client Response Badge if present */}
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
                              </div>
                            );
                          })()}

                          {/* Version Action Buttons (Icon-only with hover tooltips) */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5">
                              {/* Review Client View Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const clientUrl = q.public_token 
                                    ? `/p/quotation/${q.public_token}` 
                                    : `/workspace/quotations/builder/templet/${q.template_id}?preview=public`;
                                  window.open(clientUrl, '_blank');
                                }}
                                className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-center hover:scale-105"
                                title="Review Client Preview"
                              >
                                <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              </button>

                              {/* Edit Builder Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenQuotation(q.template_id, q.title || `Quotation V${q.version}`)}
                                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center hover:scale-105"
                                title="Edit in Builder"
                              >
                                <Pencil className="w-4 h-4 text-white" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Download PDF Button */}
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(q)}
                                disabled={downloadingPdf === q.template_id}
                                className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center hover:scale-105 disabled:opacity-50"
                                title="Download PDF Copy"
                              >
                                {downloadingPdf === q.template_id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                  <Download className="w-4 h-4 text-white" />
                                )}
                              </button>

                              {/* Shareable Link Button */}
                              <button
                                type="button"
                                onClick={() => handleSendLink(q)}
                                disabled={generatingLink === q.template_id}
                                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center hover:scale-105 disabled:opacity-50"
                                title="Share Quotation Link"
                              >
                                {generatingLink === q.template_id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                                ) : (
                                  <Send className="w-4 h-4" />
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
              <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800/80 bg-amber-500/5 relative">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <LayoutTemplate className="w-3.5 h-3.5" /> Template to Use:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-amber-500 text-zinc-900 dark:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer"
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
                    {effectiveTemplateList.map((tmpl, idx) => {
                      const isSel = tmpl.id === selectedTemplateId || (!selectedTemplateId && tmpl.is_default);
                      const tmplKey = tmpl.id || `tmpl_item_${idx}`;
                      return (
                        <button
                          key={tmplKey}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tmpl.id);
                            setShowTemplateMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Quotation Creator Modal */}
      <AiQuotationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        lead={lead}
        quotationId={aiTargetQuotationId}
        selectedTemplateId={selectedTemplateId}
        onApplied={(updatedDoc, targetQId) => {
          setAiModalOpen(false);
          setOpeningQuotation({
            id: targetQId,
            title: `Quotation Document`,
            step: 'Opening AI Generated Quotation in Builder...'
          });
          router.push(`/workspace/quotations/builder/templet/${targetQId}`);
          setTimeout(() => onClose(), 600);
        }}
      />


      {/* ─── 3D CONFIRMATION MODAL: MARK AS FINAL QUOTATION ─── */}
      {confirmingFinalQuotation && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="bg-[#FEFDF8] border-2 border-amber-300 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 text-white flex items-center justify-center mx-auto shadow-lg">
              <Crown className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-amber-950">Confirm Final Quotation</h3>
              <p className="text-xs font-semibold text-zinc-600 mt-1.5 leading-relaxed">
                Are you sure you want to lock <span className="font-bold text-amber-900">Version {confirmingFinalQuotation.version}</span> as the Final Quotation for <span className="font-bold text-zinc-900">{lead?.name || 'this client'}</span>?
              </p>
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-[11px] font-bold text-amber-900 mt-3 text-left">
                ✨ This will automatically synchronize all sub-events, deliverables, and payment milestones directly into <span className="underline">Bookings & Finance Records</span>.
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingFinalQuotation(null)}
                className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(settingFinalId)}
                onClick={() => handleSetFinalQuotation(confirmingFinalQuotation, false)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition active:translate-y-0.5"
              >
                {settingFinalId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Locking...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-amber-100" />
                    <span>Confirm & Lock</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── 3D UNMARK MODAL: UNLOCK FINAL QUOTATION ─── */}
      {unmarkingFinalQuotation && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="bg-[#FEFDF8] border-2 border-amber-300 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-7 h-7 text-amber-600" />
            </div>

            <div>
              <h3 className="text-lg font-black text-amber-950">Unmark Final Quotation?</h3>
              <p className="text-xs font-semibold text-zinc-600 mt-1.5 leading-relaxed">
                Do you want to unlock this quotation? The linked booking cards will remain in draft status.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUnmarkingFinalQuotation(null)}
                className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer transition"
              >
                Keep Final
              </button>
              <button
                type="button"
                disabled={Boolean(settingFinalId)}
                onClick={() => handleSetFinalQuotation(unmarkingFinalQuotation, true)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs shadow-md shadow-amber-600/30 flex items-center gap-2 cursor-pointer transition active:translate-y-0.5"
              >
                {settingFinalId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <span>Unmark & Unlock</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                onClick={() => window.open(activeShareModal.url, '_blank')}
                className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                <span>Open View</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveShareModal(null)}
              className="w-full py-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

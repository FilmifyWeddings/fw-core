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
  initialQuotations?: QuotationVersionItem[];
  onFinalSet?: (quotation: QuotationVersionItem) => void;
  onQuotationChange?: (leadId: string, updatedVersions: QuotationVersionItem[]) => void;
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

export function LeadQuotationModal({ 
  isOpen, 
  onClose, 
  lead, 
  initialQuotations = [],
  onFinalSet,
  onQuotationChange 
}: LeadQuotationModalProps) {
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
      const cacheKey = `lead_quotes_cache_${lead.id}`;

      let targetFinalId = lead.final_quotation_id || (lead as any).raw_payload?.final_quotation_id;
      let summaryFinalVersion: number | undefined = undefined;

      if (typeof window !== 'undefined') {
        try {
          const summaryMapStr = localStorage.getItem('sc_quotation_summary_map');
          if (summaryMapStr) {
            const summaryMap = JSON.parse(summaryMapStr);
            if (summaryMap[lead.id]?.hasFinal) {
              summaryFinalVersion = summaryMap[lead.id]?.finalVersion;
              if (!targetFinalId && summaryMap[lead.id]?.versions?.length > 0) {
                const fv = summaryMap[lead.id].versions.find((v: any) => v.is_final);
                if (fv?.template_id) targetFinalId = fv.template_id;
              }
            }
          }
        } catch (_) {}

        if (!targetFinalId) {
          try {
            const cachedLeadsStr = localStorage.getItem('sc_cached_leads');
            if (cachedLeadsStr) {
              const cachedLeads = JSON.parse(cachedLeadsStr);
              const found = Array.isArray(cachedLeads) ? cachedLeads.find((l: any) => l.id === lead.id) : null;
              if (found?.final_quotation_id) targetFinalId = found.final_quotation_id;
            }
          } catch (_) {}
        }
      }

      // Gather all potential sources of cached versions for instant 0ms render
      let localSummaryVersions: any[] = [];
      try {
        const smStr = localStorage.getItem('sc_quotation_summary_map');
        if (smStr) {
          const parsedSm = JSON.parse(smStr);
          if (parsedSm[lead.id]?.versions && Array.isArray(parsedSm[lead.id].versions)) {
            localSummaryVersions = parsedSm[lead.id].versions;
          }
        }
      } catch (_) {}

      let localQuotesCache: any[] = [];
      try {
        const lqcStr = localStorage.getItem(cacheKey);
        if (lqcStr) {
          const parsedLqc = JSON.parse(lqcStr);
          if (Array.isArray(parsedLqc)) localQuotesCache = parsedLqc;
        }
      } catch (_) {}

      const sessionCache = safeSessionGet(cacheKey);
      const sessionHasFinal = Array.isArray(sessionCache) && sessionCache.some((item: any) => item.is_final);

      // Best candidate for instant display
      const candidateVersions = 
        sessionHasFinal ? sessionCache :
        (Array.isArray(sessionCache) && sessionCache.length > 0) ? sessionCache :
        (Array.isArray(localQuotesCache) && localQuotesCache.length > 0) ? localQuotesCache :
        (Array.isArray(initialQuotations) && initialQuotations.length > 0) ? initialQuotations :
        (Array.isArray(localSummaryVersions) && localSummaryVersions.length > 0) ? localSummaryVersions :
        [];

      if (candidateVersions.length > 0) {
        const reconciled = candidateVersions.map((item: any) => ({
          ...item,
          template_id: item.template_id || item.id,
          id: item.id || item.template_id,
          version: item.version || 1,
          version_label: item.version_label || `V${item.version || 1}`,
          title: item.title || `${item.couple_name || lead.name || 'Quotation'} - Quotation V${item.version || 1}`,
          is_final: Boolean(
            (targetFinalId && (
              item.template_id === targetFinalId || 
              item.id === targetFinalId || 
              (item.template_id && (targetFinalId.includes(item.template_id) || item.template_id.includes(targetFinalId)))
            )) ||
            (summaryFinalVersion !== undefined && item.version === summaryFinalVersion) ||
            item.is_final
          )
        }));
        setQuotations(reconciled);
        setLoading(false);
      } else {
        setQuotations([]);
        setLoading(true);
      }

      // Silent background refresh to fetch public tokens and update badges
      loadQuotations(candidateVersions.length > 0);
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
        if (activeDefault) {
          setSelectedTemplateId(prev => prev || activeDefault.id);
        }
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

        setSelectedTemplateId(prev => {
          if (prev && json.templates.some((t: StudioTemplateItem) => t.id === prev)) {
            return prev; // Strictly preserve current user selection!
          }
          const activeDefault = json.templates.find((t: StudioTemplateItem) => t.is_default) || json.templates[0];
          return activeDefault ? activeDefault.id : prev;
        });
      } else if (availableTemplates.length === 0) {
        const defaultTemplates: StudioTemplateItem[] = [
          { id: 'FW-2WT85Y0', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
        ];
        setAvailableTemplates(defaultTemplates);
        setSelectedTemplateId(prev => prev || defaultTemplates[0].id);
      }
    } catch (e) {
      console.warn('[LeadQuotationModal] Templates fetch warning:', e);
      if (availableTemplates.length === 0) {
        const defaultTemplates: StudioTemplateItem[] = [
          { id: 'FW-2WT85Y0', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
        ];
        setAvailableTemplates(defaultTemplates);
        setSelectedTemplateId(prev => prev || defaultTemplates[0].id);
      }
    }
  };

  const loadQuotations = async (silent: boolean = false) => {
    if (!lead?.id) return;
    setErrorMsg(null);

    const cacheKey = `lead_quotes_cache_${lead.id}`;
    let targetFinalId = lead.final_quotation_id || (lead as any).raw_payload?.final_quotation_id;
    let summaryFinalVersion: number | undefined = undefined;

    if (typeof window !== 'undefined') {
      try {
        const summaryMapStr = localStorage.getItem('sc_quotation_summary_map');
        if (summaryMapStr) {
          const summaryMap = JSON.parse(summaryMapStr);
          if (summaryMap[lead.id]?.hasFinal) {
            summaryFinalVersion = summaryMap[lead.id]?.finalVersion;
            if (!targetFinalId && summaryMap[lead.id]?.versions?.length > 0) {
              const fv = summaryMap[lead.id].versions.find((v: any) => v.is_final);
              if (fv?.template_id) targetFinalId = fv.template_id;
            }
          }
        }
      } catch (_) {}

      if (!targetFinalId) {
        try {
          const cachedLeadsStr = localStorage.getItem('sc_cached_leads');
          if (cachedLeadsStr) {
            const cachedLeads = JSON.parse(cachedLeadsStr);
            const found = Array.isArray(cachedLeads) ? cachedLeads.find((l: any) => l.id === lead.id) : null;
            if (found?.final_quotation_id) targetFinalId = found.final_quotation_id;
          }
        } catch (_) {}
      }
    }

    if (!silent) {
      const cachedData = safeSessionGet(cacheKey);
      if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
        const reconciled = cachedData.map((item: QuotationVersionItem) => ({
          ...item,
          is_final: Boolean(
            (targetFinalId && (
              item.template_id === targetFinalId || 
              item.id === targetFinalId || 
              (item.template_id && (targetFinalId.includes(item.template_id) || item.template_id.includes(targetFinalId)))
            )) ||
            (summaryFinalVersion !== undefined && item.version === summaryFinalVersion) ||
            item.is_final
          )
        }));
        setQuotations(reconciled);
        setLoading(false);
      } else {
        setLoading(true);
      }
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
        const finalizedList = json.quotations.map((item: QuotationVersionItem) => ({
          ...item,
          is_final: Boolean(
            (targetFinalId && (
              item.template_id === targetFinalId || 
              item.id === targetFinalId || 
              (item.template_id && (targetFinalId.includes(item.template_id) || item.template_id.includes(targetFinalId)))
            )) ||
            (summaryFinalVersion !== undefined && item.version === summaryFinalVersion) ||
            item.is_final
          )
        }));
        setQuotations(finalizedList);
        safeSessionSet(cacheKey, finalizedList);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(finalizedList));
        } catch (_) {}
        if (onQuotationChange) {
          queueMicrotask(() => {
            onQuotationChange(lead.id, finalizedList);
          });
        }

        json.quotations.forEach((q: QuotationVersionItem) => {
          if (q.template_id) router.prefetch(`/workspace/quotations/builder/templet/${q.template_id}`);
        });
      } else if (!silent) {
        setQuotations([]);
      }
    } catch (err: any) {
      console.error('[LeadQuotationModal] Fetch error:', err);
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

    // ⚡ INSTANT 0ms OPTIMISTIC UPDATE
    const previousQuotations = [...quotations];
    const isTargetItem = (item: QuotationVersionItem) => {
      if (q.template_id && item.template_id && item.template_id === q.template_id) return true;
      if (q.id && item.id && item.id === q.id) return true;
      if (q.version !== undefined && item.version !== undefined && item.version === q.version) return true;
      return false;
    };

    const updated = quotations.map(item => ({
      ...item,
      is_final: unmark ? false : isTargetItem(item)
    }));
    setQuotations(updated);
    const cacheKey = `lead_quotes_cache_${lead.id}`;
    safeSessionSet(cacheKey, updated);
    if (onQuotationChange) {
      onQuotationChange(lead.id, updated);
    }
    if (onFinalSet && !unmark) {
      onFinalSet({ ...q, is_final: true });
    }

    // ⚡ Update sc_quotation_summary_map & sc_cached_leads immediately so the table row turns green in 0ms and stays green on refresh!
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sc_quotation_summary_map');
        const map = stored ? JSON.parse(stored) : {};
        map[lead.id] = {
          count: updated.length,
          hasFinal: !unmark,
          finalVersion: unmark ? undefined : q.version,
          versions: updated
        };
        localStorage.setItem('sc_quotation_summary_map', JSON.stringify(map));

        const cachedLeadsStr = localStorage.getItem('sc_cached_leads');
        if (cachedLeadsStr) {
          const cachedLeads = JSON.parse(cachedLeadsStr);
          if (Array.isArray(cachedLeads)) {
            const updatedLeads = cachedLeads.map((l: any) => {
              if (l.id === lead.id) {
                return {
                  ...l,
                  status: unmark ? 'in_progress' : 'booked',
                  stage: unmark ? 'in_progress' : 'booked',
                  final_quotation_id: unmark ? null : q.template_id,
                  raw_payload: {
                    ...(l.raw_payload || {}),
                    final_quotation_id: unmark ? null : q.template_id
                  }
                };
              }
              return l;
            });
            localStorage.setItem('sc_cached_leads', JSON.stringify(updatedLeads));
          }
        }
      } catch (_) {}
    }
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
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('sc_cached_finance_records');
            localStorage.removeItem('sc_cached_finance_clients');
            localStorage.removeItem('sc_cached_clients');
            localStorage.setItem('post_production_updated', Date.now().toString());
          } catch (_) {}
          window.dispatchEvent(new CustomEvent('quotation_finalized', { 
            detail: { leadId: lead.id, quotationId: q.template_id || q.id, unmark } 
          }));
          window.dispatchEvent(new CustomEvent('finance_updated', {
            detail: { leadId: lead.id, quotationId: q.template_id || q.id }
          }));
          window.dispatchEvent(new CustomEvent('client_created', {
            detail: { leadId: lead.id }
          }));
        }
      } else {
        // Rollback on server error
        setQuotations(previousQuotations);
        safeSessionSet(cacheKey, previousQuotations);
        if (onQuotationChange) {
          onQuotationChange(lead.id, previousQuotations);
        }
        setErrorMsg(json.error || 'Failed to update final quotation status.');
      }
    } catch (e: any) {
      console.error('Error setting final quotation:', e);
      setQuotations(previousQuotations);
      safeSessionSet(cacheKey, previousQuotations);
      if (onQuotationChange) {
        onQuotationChange(lead.id, previousQuotations);
      }
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
      const chosenTemplateId = selectedTemplateId || (availableTemplates.length > 0 ? availableTemplates[0]?.id : 'FW-2WT85Y0');

      const res = await fetch('/api/quotations/create-for-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: lead.id,
          clientName: lead.name,
          explicitTemplateId: chosenTemplateId
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
        const openingCouple = json.document?.cover?.coupleName || lead.raw_payload?.couple_name || lead.client_name || lead.name || 'Quotation';
        setOpeningQuotation({ id: qId, title: `${openingCouple} - Quotation V${json.version || ''}`, step: 'Hydrating Builder Canvas...' });

        if (json.document) {
          try {
            sessionStorage.setItem(`current_quotation_doc_${qId}`, JSON.stringify(json.document));
            sessionStorage.setItem('current_active_quotation_doc', JSON.stringify({ id: qId, document: json.document }));
            const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
            await cacheDocumentLocal(qId, json.document, json.version || 1);
          } catch (e) {}
        }

        // ⚡ Update sc_quotation_summary_map and lead_quotes_cache immediately so the CRM table icon turns orange in 0ms!
        if (typeof window !== 'undefined') {
          try {
            const newVer = {
              id: qId,
              template_id: qId,
              version: json.version || 1,
              version_label: `V${json.version || 1}`,
              title: `${openingCouple} - Quotation V${json.version || 1}`,
              couple_name: openingCouple,
              is_final: false,
              created_at: new Date().toISOString()
            };

            // Update lead_quotes_cache in both sessionStorage & localStorage
            let existingCache: any[] = [];
            try {
              const scRaw = sessionStorage.getItem(`lead_quotes_cache_${lead.id}`) || localStorage.getItem(`lead_quotes_cache_${lead.id}`);
              if (scRaw) existingCache = JSON.parse(scRaw);
            } catch (_) {}
            const updatedCache = [newVer, ...existingCache.filter((v: any) => v.id !== qId && v.template_id !== qId)];
            sessionStorage.setItem(`lead_quotes_cache_${lead.id}`, JSON.stringify(updatedCache));
            localStorage.setItem(`lead_quotes_cache_${lead.id}`, JSON.stringify(updatedCache));

            const stored = localStorage.getItem('sc_quotation_summary_map');
            const map = stored ? JSON.parse(stored) : {};
            const prev = map[lead.id] || { count: 0, hasFinal: false, versions: [] };
            map[lead.id] = {
              count: (prev.count || 0) + 1,
              hasFinal: prev.hasFinal || false,
              finalVersion: prev.finalVersion,
              versions: [newVer, ...(prev.versions || [])]
            };
            localStorage.setItem('sc_quotation_summary_map', JSON.stringify(map));
            window.dispatchEvent(new CustomEvent('quotation_created', { detail: { leadId: lead.id, quotationId: qId } }));
          } catch (_) {}
        }

        router.push(`/workspace/quotations/builder/templet/${qId}`);
        // Keep opening overlay active until Next.js unmounts page - no flash of CRM table!
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
      // Keep opening overlay active until Next.js unmounts page - no flash of CRM table!
    }, 150);
  };

  const getQuotationClientUrl = (q: QuotationVersionItem): string => {
    const origin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://studiocore.in';
    const targetToken = q.public_token || q.template_id || q.id;
    if (q.public_token) {
      return `${origin}/p/quotation/${q.public_token}`;
    }
    return `${origin}/workspace/quotations/builder/templet/${q.template_id || q.id}?preview=public&token=${targetToken}`;
  };

  const handleSendLink = async (q: QuotationVersionItem) => {
    setGeneratingLink(q.template_id);
    try {
      const previewUrl = getQuotationClientUrl(q);
      setActiveShareModal({ quotationId: q.template_id, url: previewUrl });
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
    { id: 'FW-2WT85Y0', title: 'Wedding - Design 1', is_default: true, category: 'Wedding' }
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
                      {lead.raw_payload?.couple_name || lead.raw_payload?.couple_names || (lead as any).couple_names || lead.client_name || lead.name}
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
                <div className="fixed inset-0 z-[100003] bg-white/95 dark:bg-[#1C1A18]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 animate-in fade-in duration-150">
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
                              ? 'border-emerald-400 dark:border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs'
                              : 'border-zinc-200/80 dark:border-zinc-800 hover:border-amber-300'
                          }`}
                        >
                          {(() => {
                            const displayTitle = (() => {
                              // 1. If q.title is already well-formed and not a placeholder/ID, use it directly to prevent flicker!
                              if (q.title && !q.title.startsWith('FW-') && q.title !== 'Wedding - Design 1') {
                                if (q.is_final) {
                                  if (q.title.includes('Final Quotation')) return q.title;
                                  return q.title.replace(/quotation/i, 'Final Quotation');
                                }
                                return q.title;
                              }

                              const content = q.content_json || {};
                              const cover = content.cover || {};
                              const coupleFromCover = cover.coupleName 
                                || (cover.groomName && cover.brideName ? `${cover.groomName} & ${cover.brideName}` : (cover.groomName || cover.brideName || ''));

                              const isPlaceholder = !coupleFromCover || [
                                'yash & twinkle', 'yash and twinkle', 'twinkle & yash',
                                'rahul & neha', 'rahul and neha', 'neha & rahul',
                                'valued client', 'wedding client', 'couple', 'demo', 'sample'
                              ].includes(coupleFromCover.toLowerCase().trim());

                              const leadCouple = 
                                (q as any).couple_name ||
                                (q as any).couple_names ||
                                (!isPlaceholder && coupleFromCover ? coupleFromCover : null) ||
                                lead?.raw_payload?.couple_name ||
                                lead?.raw_payload?.couple_names ||
                                (lead as any)?.couple_names ||
                                (lead?.name && !['client', 'valued client', 'lead'].includes(lead.name.toLowerCase().trim()) ? lead.name : '') ||
                                (lead?.client_name && !['client', 'valued client', 'lead'].includes(lead.client_name.toLowerCase().trim()) ? lead.client_name : '');

                              const coupleName = (!isPlaceholder && coupleFromCover)
                                ? coupleFromCover
                                : (leadCouple || 'Couple');

                              const cleanEventType = (cover.eventType || (q as any).event_type || content.eventGroup || (lead as any)?.event_type || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';

                              if (q.is_final) {
                                return `${coupleName} - Final Quotation`;
                              }

                              return `${coupleName} - ${cleanEventType} Quotation`;
                            })();

                            return (
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                                    q.is_final 
                                      ? 'bg-emerald-600 text-white shadow-2xs' 
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
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm border border-emerald-400 hover:brightness-110 transition cursor-pointer shrink-0"
                                      title="Click to Unlock / Unmark Final Quotation"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-100" />
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
                                  const clientUrl = getQuotationClientUrl(q);
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
        selectedTemplateId={selectedTemplateId || currentSelectedTemplate?.id}
        availableTemplates={effectiveTemplateList}
        onApplied={(updatedDoc, targetQId) => {
          setAiModalOpen(false);
          const openingCouple = updatedDoc?.cover?.coupleName || lead?.raw_payload?.couple_name || lead?.client_name || lead?.name || 'Quotation';
          setOpeningQuotation({
            id: targetQId,
            title: `${openingCouple} - Quotation Document`,
            step: 'Opening AI Generated Quotation in Builder...'
          });
          if (updatedDoc) {
            try {
              sessionStorage.setItem(`current_quotation_doc_${targetQId}`, JSON.stringify(updatedDoc));
              sessionStorage.setItem('current_active_quotation_doc', JSON.stringify({ id: targetQId, document: updatedDoc }));
            } catch (_) {}
          }
          router.push(`/workspace/quotations/builder/templet/${targetQId}`);
          // Keep opening overlay active until Next.js unmounts page - no flash of CRM table!
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

            {/* Direct WhatsApp Share Button */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Hi! Here is your personalized quotation & service proposal:\n${activeShareModal.url}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Share on WhatsApp</span>
            </a>
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

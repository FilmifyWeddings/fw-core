'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Plus, ExternalLink, Share2, Download, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, Copy, Check, Calendar, ArrowUpRight
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';

export interface QuotationVersionItem {
  id: string;
  template_id: string;
  lead_id: string;
  version: number;
  version_label?: string;
  title: string;
  is_final?: boolean;
  public_token?: string | null;
  updated_at?: string;
  created_at?: string;
  responseBadge?: {
    type: string;
    label: string;
    clientName?: string;
    clientNotes?: string;
    created_at?: string;
  } | null;
}

interface LeadDrawerQuotationsTabProps {
  lead: Lead;
  initialQuotations?: QuotationVersionItem[];
  onQuotationChange?: (leadId: string, updatedVersions: QuotationVersionItem[]) => void;
  onLeadUpdate?: (leadId: string, updatedFields: Partial<Lead>) => void;
  onCloseDrawer?: () => void;
}

const safeSessionGet = (key: string): any => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const safeSessionSet = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
};

export function LeadDrawerQuotationsTab({
  lead,
  initialQuotations = [],
  onQuotationChange,
  onLeadUpdate,
  onCloseDrawer
}: LeadDrawerQuotationsTabProps) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [settingFinalId, setSettingFinalId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Share link modal state
  const [shareModal, setShareModal] = useState<{ quotationId: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Instant 0ms hydration from props or session cache
  useEffect(() => {
    if (!lead?.id) return;
    const cacheKey = `lead_quotes_cache_${lead.id}`;
    const cached = (initialQuotations && initialQuotations.length > 0)
      ? initialQuotations
      : safeSessionGet(cacheKey);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      setQuotations(cached);
      setLoading(false);
    } else {
      setQuotations([]);
      setLoading(true);
    }

    loadQuotations(Boolean(cached && cached.length > 0));
  }, [lead?.id]);

  const loadQuotations = async (silent: boolean = false) => {
    if (!lead?.id) return;
    setErrorMsg(null);
    const cacheKey = `lead_quotes_cache_${lead.id}`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/leads/${lead.id}/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));

      if (json.success && Array.isArray(json.quotations)) {
        setQuotations(json.quotations);
        safeSessionSet(cacheKey, json.quotations);

        if (onQuotationChange) {
          queueMicrotask(() => {
            onQuotationChange(lead.id, json.quotations);
          });
        }
      } else if (!silent) {
        setQuotations([]);
      }
    } catch (err: any) {
      console.warn('[LeadDrawerQuotationsTab] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetFinalQuotation = async (q: QuotationVersionItem, unmark: boolean = false) => {
    if (!lead?.id || settingFinalId) return;
    setSettingFinalId(q.template_id);
    setErrorMsg(null);

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

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        const updated = quotations.map(item => ({
          ...item,
          is_final: unmark ? false : item.template_id === q.template_id
        }));

        setQuotations(updated);
        safeSessionSet(`lead_quotes_cache_${lead.id}`, updated);

        if (onQuotationChange) {
          queueMicrotask(() => {
            onQuotationChange(lead.id, updated);
          });
        }

        if (onLeadUpdate) {
          onLeadUpdate(lead.id, {
            final_quotation_id: unmark ? undefined : q.template_id,
            raw_payload: {
              ...(lead.raw_payload || {}),
              final_quotation_id: unmark ? undefined : q.template_id
            }
          });
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quotation_finalized', {
            detail: { leadId: lead.id, quotationId: q.template_id, unmark }
          }));
        }
      } else {
        setErrorMsg(json.error || 'Failed to update final quotation status.');
      }
    } catch (err: any) {
      console.error('[LeadDrawerQuotationsTab] Set final error:', err);
      setErrorMsg('Failed to update final quotation.');
    } finally {
      setSettingFinalId(null);
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

      const json = await res.json().catch(() => ({}));

      if (json.success && (json.quotationId || json.templateId)) {
        const qId = json.quotationId || json.templateId;
        if (json.document) {
          try {
            const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
            cacheDocumentLocal(qId, json.document, json.version || 1);
          } catch (_) {}
        }

        if (onCloseDrawer) onCloseDrawer();
        router.push(`/workspace/quotations/builder/templet/${qId}`);
      } else {
        setErrorMsg(json.error || 'Failed to create new quotation version.');
      }
    } catch (err: any) {
      console.error('[LeadDrawerQuotationsTab] Create error:', err);
      setErrorMsg('Network error while creating quotation.');
    } finally {
      setCreating(false);
    }
  };

  const handleShareLink = (q: QuotationVersionItem) => {
    const origin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://studiocore.in';

    let shareUrl = `${origin}/workspace/quotations/builder/templet/${q.template_id}?preview=public&token=${q.template_id}`;
    if (q.public_token) {
      shareUrl = `${origin}/p/quotation/${q.public_token}`;
    }
    setShareModal({ quotationId: q.template_id, url: shareUrl });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recent';
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} • ${timePart}`;
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Quotation Versions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            {quotations.length} {quotations.length === 1 ? 'Version' : 'Versions'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCreateNewQuotation}
          disabled={creating}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>{creating ? 'Creating...' : '+ New Version'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#141312] border border-[#E8E5DF] dark:border-zinc-800 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-7 rounded-lg bg-amber-500/20" />
                  <div className="space-y-1.5">
                    <div className="w-36 h-3.5 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="w-24 h-2.5 rounded-md bg-zinc-100 dark:bg-zinc-850" />
                  </div>
                </div>
                <div className="w-16 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : quotations.length === 0 ? (
        /* Empty State */
        <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5 bg-white dark:bg-[#141312] border border-dashed border-[#E8E5DF] dark:border-zinc-800 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">No Quotations Created Yet</h4>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 max-w-xs">
              Create the first proposal quotation version for {lead.name || 'this client'} with instant pre-filled details.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateNewQuotation}
            disabled={creating}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Create First Quotation</span>
          </button>
        </div>
      ) : (
        /* Real Quotation Version Cards */
        <div className="space-y-3">
          {quotations.map((q) => {
            const isTargetSetting = settingFinalId === q.template_id;
            const updatedDateStr = formatDateTime(q.updated_at || q.created_at);

            return (
              <div
                key={q.template_id || q.id}
                className={`p-4 rounded-2xl bg-white dark:bg-[#141312] border transition-all shadow-xs ${
                  q.is_final
                    ? 'border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-400/30'
                    : 'border-[#E8E5DF] dark:border-zinc-800/80 hover:border-amber-300'
                }`}
              >
                {/* Top Row: Version Badge, Title, Final Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className={`px-2 py-1 rounded-lg text-xs font-black tracking-tight shrink-0 ${
                      q.is_final
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {q.version_label || `V${q.version}`}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {q.title || `${(q as any).couple_name || lead.raw_payload?.couple_name || lead.raw_payload?.couple_names || (lead as any).couple_names || lead.client_name || lead.name || 'Client'} - Quotation V${q.version}`}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                        {updatedDateStr}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {q.is_final && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>FINAL</span>
                      </span>
                    )}

                    {q.responseBadge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        <span>{q.responseBadge.label}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/70">
                  {/* Left: Open in Builder */}
                  <a
                    href={`/workspace/quotations/builder/templet/${q.template_id}`}
                    onClick={() => {
                      if (onCloseDrawer) onCloseDrawer();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Edit in Builder</span>
                    <ArrowUpRight className="w-3 h-3 text-amber-500" />
                  </a>

                  {/* Right Action Icons & Set Final Toggle */}
                  <div className="flex items-center gap-1.5">
                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShareLink(q)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Share Public Link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* PDF Download Button */}
                    <a
                      href={`/api/quotations/pdf?id=${q.template_id}&lead_id=${lead.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Final Toggle Button */}
                    {q.is_final ? (
                      <button
                        type="button"
                        onClick={() => handleSetFinalQuotation(q, true)}
                        disabled={isTargetSetting}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Unmark as final quotation"
                      >
                        {isTargetSetting ? 'Updating...' : 'Unmark Final'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetFinalQuotation(q, false)}
                        disabled={isTargetSetting}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Set this version as the client final quotation"
                      >
                        {isTargetSetting ? 'Setting...' : 'Set as Final'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal Dialog */}
      {shareModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-zinc-800 p-5 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Public Quotation Link</h4>
              </div>
              <button
                type="button"
                onClick={() => setShareModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Share this live client proposal link with {lead.name || 'the client'}. They can review the interactive pages, accept or discuss budget terms.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2.5 rounded-2xl">
              <input
                type="text"
                readOnly
                value={shareModal.url}
                className="flex-1 bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-mono focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareModal.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

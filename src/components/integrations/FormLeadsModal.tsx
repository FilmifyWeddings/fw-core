'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Search,
  Loader2,
  Calendar,
  Phone,
  Mail,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Tag,
  Clock,
} from 'lucide-react';

interface Question {
  key: string;
  label: string;
  type: string;
  options?: any[];
}

interface FormLeadsModalProps {
  formId: string;
  formName: string;
  pageName?: string;
  workspaceId: string;
  onClose: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export function FormLeadsModal({
  formId,
  formName,
  pageName,
  workspaceId,
  onClose,
  getAuthHeaders,
}: FormLeadsModalProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadFormLeadsAndQuestions() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();

        // 1. Fetch form questions preview in parallel with leads
        const [previewRes, leadsRes] = await Promise.all([
          fetch(`/api/meta/forms/preview?form_id=${formId}`, { headers }),
          fetch(`/api/meta/forms/leads?form_id=${formId}&workspace_id=${workspaceId}`, { headers }),
        ]);

        const previewData = await previewRes.json().catch(() => ({}));
        const leadsData = await leadsRes.json().catch(() => ({}));

        if (cancelled) return;

        if (previewData.success && previewData.form?.questions) {
          setQuestions(previewData.form.questions);
        }

        if (leadsData.success && Array.isArray(leadsData.leads)) {
          setLeads(leadsData.leads);
        } else if (leadsData.error) {
          setError(leadsData.error);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading form leads:', err);
          setError(err.message || 'Failed to load form leads');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFormLeadsAndQuestions();

    return () => {
      cancelled = true;
    };
  }, [formId, workspaceId, getAuthHeaders]);

  // Helper to extract answer for a specific question key from lead
  const getAnswerForQuestion = (lead: any, q: Question): string => {
    const raw = lead.raw_payload || {};
    const fieldData = Array.isArray(raw.field_data)
      ? raw.field_data
      : Array.isArray(lead.raw_field_data?.field_data)
      ? lead.raw_field_data.field_data
      : [];

    const normKey = q.key.toLowerCase().trim();
    const normLabel = q.label.toLowerCase().trim();

    // 1. Check field_data array
    for (const item of fieldData) {
      if (!item || !item.name) continue;
      const itemName = item.name.toLowerCase().trim();
      if (itemName === normKey || itemName === normLabel || normKey.includes(itemName) || itemName.includes(normKey)) {
        const val = Array.isArray(item.values) ? item.values[0] : item.value;
        if (val) return String(val).trim();
      }
    }

    // 2. Direct property matches on lead or raw_payload
    if (raw[q.key]) return String(raw[q.key]).trim();
    if (raw[normKey]) return String(raw[normKey]).trim();

    // Specific common key fallbacks
    if (normKey.includes('date') || normLabel.includes('date')) return lead.event_date || raw.event_date || raw.eventDate || '—';
    if (normKey.includes('city') || normLabel.includes('city') || normLabel.includes('venue') || normLabel.includes('location')) {
      return lead.city || raw.city || raw.location || '—';
    }
    if (normKey.includes('budget') || normLabel.includes('budget') || normLabel.includes('investment') || normLabel.includes('package')) {
      return lead.budget || raw.budget || '—';
    }

    return '—';
  };

  // Filter leads based on search query
  const filteredLeads = leads.filter(l => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = (l.name || '').toLowerCase().includes(query);
    const phoneMatch = String(l.phone || '').includes(query);
    const cityMatch = (l.city || '').toLowerCase().includes(query);
    const rawMatch = JSON.stringify(l.raw_payload || {}).toLowerCase().includes(query);
    return nameMatch || phoneMatch || cityMatch || rawMatch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#121110] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Brand Accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#0866FF] via-blue-500 to-indigo-600" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0866FF] border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {formName || 'Instant Lead Form'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-[#0866FF] dark:text-blue-400 border border-blue-500/20">
                    {leads.length} Leads Synced
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 truncate">
                  <span className="font-mono">ID: {formId}</span>
                  {pageName && (
                    <>
                      <span>•</span>
                      <span>Page: {pageName}</span>
                    </>
                  )}
                  {questions.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{questions.length} Form Questions</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search / Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#151413] flex items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads by name, phone, or answer text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400 shrink-0">
              Showing {filteredLeads.length} of {leads.length}
            </span>
          </div>

          {/* Modal Body: Leads List */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 scroller-thin bg-slate-50/50 dark:bg-zinc-950/40">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0866FF]" />
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Fetching leads and form questions from database…
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-slate-300 dark:text-zinc-700" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                  {leads.length === 0 ? 'No leads received for this form yet' : 'No leads match your search'}
                </h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
                  {leads.length === 0
                    ? 'Use the "Sync All Old Leads" button to import historical leads, or wait for live Meta webhook submissions.'
                    : 'Try clearing your search query to see all synced leads.'}
                </p>
              </div>
            ) : (
              filteredLeads.map((lead, idx) => {
                const cleanPhone = String(lead.phone || '').replace(/[^0-9]/g, '');
                const createdDate = lead.created_at
                  ? new Date(lead.created_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '—';

                return (
                  <div
                    key={lead.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1A1816] border border-slate-200 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all space-y-3.5"
                  >
                    {/* Lead Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#0866FF] dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                          {(lead.name || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {lead.name || 'Unnamed Facebook Lead'}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                              #{idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Phone className="w-3 h-3" />
                              +{cleanPhone}
                            </span>
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3" />
                              {createdDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick WhatsApp Link */}
                      {cleanPhone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Form Questions & Answers Grid */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Form Questions &amp; Submitted Answers:
                      </p>

                      {questions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {questions.map((q) => {
                            const answer = getAnswerForQuestion(lead, q);
                            return (
                              <div
                                key={q.key}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 space-y-0.5"
                              >
                                <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 line-clamp-1">
                                  {q.label || q.key}
                                </p>
                                <p className="text-xs font-semibold text-[#0866FF] dark:text-blue-400 break-words">
                                  {answer}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Fallback to raw field_data if questions couldn't be loaded */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Array.isArray(lead.raw_payload?.field_data) &&
                          lead.raw_payload.field_data.length > 0 ? (
                            lead.raw_payload.field_data.map((field: any, fIdx: number) => (
                              <div
                                key={fIdx}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 space-y-0.5"
                              >
                                <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                  {field.name}
                                </p>
                                <p className="text-xs font-semibold text-[#0866FF] dark:text-blue-400">
                                  {Array.isArray(field.values) ? field.values.join(', ') : field.value || '—'}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 text-xs text-slate-400 italic">
                              Standard Lead: {lead.city || 'No City'}, Budget: {lead.budget || 'N/A'}, Date: {lead.event_date || 'N/A'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              Total {leads.length} leads in database
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

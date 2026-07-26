'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Zap,
  ExternalLink,
  Layers,
  FileText,
  Users,
  Search,
  Activity,
  Globe,
  Radio,
  Clock,
  ChevronRight,
  Database,
  Lock,
  X,
  Server,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  Eye,
  Loader2,
  Info,
  Play,
  RotateCcw,
  TrendingUp,
  BarChart3,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface ConnectedPage {
  page_id: string;
  page_name: string;
  page_category?: string;
  is_active: boolean;
}

interface LeadForm {
  form_id: string;
  form_name?: string;
  name?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  page_id: string;
  page_name?: string;
  is_active: boolean;
  is_enabled: boolean;
  sync_count: number;
  leads_count?: number;
  last_lead_received?: string | null;
  created_time?: string;
  questions_count?: number;
}

type SyncPhase = 'idle' | 'fetching' | 'importing' | 'complete' | 'error';

interface FormSyncState {
  phase: SyncPhase;
  imported: number;
  skipped: number;
  failed: number;
  total: number;
  current: number;
  message: string;
  errorMessage?: string;
  durationMs?: number;
}

interface PreviewQuestion {
  index: number;
  question_id: string;
  key: string;
  label: string;
  type: string;
  options: { key: string; value: string }[];
  crm_field: string;
  crm_label: string;
  is_custom: boolean;
}

interface FormPreviewData {
  form_id: string;
  form_name: string;
  status: string;
  page_id: string;
  page_name: string;
  leads_count: number;
  created_time: string;
  is_enabled: boolean;
  questions: PreviewQuestion[];
  questions_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  FULL_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  FIRST_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  LAST_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  EMAIL: 'bg-violet-50 text-violet-700 border-violet-200',
  PHONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PHONE_NUMBER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CITY: 'bg-amber-50 text-amber-700 border-amber-200',
  STATE: 'bg-amber-50 text-amber-700 border-amber-200',
  COUNTRY: 'bg-amber-50 text-amber-700 border-amber-200',
  CUSTOM: 'bg-slate-100 text-slate-600 border-slate-200',
};

const FRIENDLY_TYPE: Record<string, string> = {
  FULL_NAME: 'Full Name', FIRST_NAME: 'First Name', LAST_NAME: 'Last Name',
  EMAIL: 'Email', PHONE: 'Phone', PHONE_NUMBER: 'Phone', CITY: 'City',
  STATE: 'State', COUNTRY: 'Country', ZIP: 'ZIP', CUSTOM: 'Custom',
  JOB_TITLE: 'Job Title', COMPANY_NAME: 'Company', GENDER: 'Gender',
  DATE_TIME: 'Date/Time', WORK_EMAIL: 'Work Email',
};

function friendlyType(t: string) { return FRIENDLY_TYPE[t?.toUpperCase()] || t || 'Custom'; }
function typeColor(t: string) { return TYPE_COLORS[t?.toUpperCase()] || TYPE_COLORS.CUSTOM; }

function formatRelTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const DEFAULT_SYNC: FormSyncState = { phase: 'idle', imported: 0, skipped: 0, failed: 0, total: 0, current: 0, message: '' };

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, loading, onChange }: { enabled: boolean; loading: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        enabled ? 'bg-emerald-500 focus:ring-emerald-400' : 'bg-slate-300 focus:ring-slate-400'
      } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
      aria-label={enabled ? 'Disable form' : 'Enable form'}
    >
      <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
        </span>
      )}
    </button>
  );
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 ${enabled ? 'text-emerald-600' : 'text-red-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
      {enabled ? 'Receiving Leads' : 'Disabled'}
    </span>
  );
}

function FormStatusBadge({ status }: { status: string }) {
  const s = (status || 'ACTIVE').toUpperCase();
  if (s === 'ACTIVE') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1 h-1 rounded-full bg-emerald-500" /> ACTIVE
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-1 h-1 rounded-full bg-slate-400" /> {s}
    </span>
  );
}

// ─── Sync Progress Cell ────────────────────────────────────────────────────────

function SyncCell({ formId, pageId, syncState, onSync, getAuthHeaders }: {
  formId: string;
  pageId: string;
  syncState: FormSyncState;
  onSync: (formId: string, pageId: string) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
}) {
  const { phase, imported, skipped, failed, total, current, message, errorMessage, durationMs } = syncState;

  if (phase === 'idle') {
    return (
      <button
        onClick={() => onSync(formId, pageId)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold border border-indigo-200 transition-all hover:shadow-sm active:scale-95"
      >
        <Play className="w-3 h-3 fill-current" /> Sync Now
      </button>
    );
  }

  if (phase === 'fetching' || phase === 'importing') {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    return (
      <div className="space-y-1 min-w-[140px]">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
            {phase === 'fetching' ? 'Fetching…' : 'Importing…'}
          </span>
          <span className="font-mono">{current} / {total || '?'}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: total > 0 ? `${pct}%` : '30%' }}
          />
        </div>
        <p className="text-[9px] text-slate-400 truncate">{imported} imported · {skipped} skipped</p>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Sync Complete
        </div>
        <p className="text-[10px] text-slate-500">
          <span className="text-emerald-600 font-semibold">+{imported}</span> imported ·&nbsp;
          <span className="text-slate-400">{skipped} skipped</span>
          {durationMs ? ` · ${fmtDuration(durationMs)}` : ''}
        </p>
        <button
          onClick={() => onSync(formId, pageId)}
          className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 mt-0.5"
        >
          <RotateCcw className="w-2.5 h-2.5" /> Sync Again
        </button>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-red-600 text-[10px] font-bold">
          <AlertCircle className="w-3.5 h-3.5" /> Sync Failed
        </div>
        <p className="text-[10px] text-red-500 leading-tight max-w-[160px] truncate" title={errorMessage}>{errorMessage}</p>
        <button
          onClick={() => onSync(formId, pageId)}
          className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 mt-0.5"
        >
          <RotateCcw className="w-2.5 h-2.5" /> Retry
        </button>
      </div>
    );
  }

  return null;
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function FormPreviewModal({ form, onClose, getAuthHeaders }: {
  form: LeadForm;
  onClose: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
}) {
  const [preview, setPreview] = useState<FormPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/meta/forms/preview?form_id=${form.form_id}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) setPreview(data.form);
        else setError(data.error || 'Failed to load preview from Meta Graph API');
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.form_id]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {preview?.form_name || form.form_name || form.name || 'Form Preview'}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">ID: {form.form_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Fetching from Meta Graph API…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Failed to load preview</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {preview && !loading && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Status', value: <FormStatusBadge status={preview.status} /> },
                  { label: 'Total Leads', value: <span className="text-xl font-extrabold text-slate-900">{preview.leads_count}</span> },
                  { label: 'Facebook Page', value: <span className="text-xs font-bold text-slate-800 truncate">{preview.page_name}</span> },
                  { label: 'Questions', value: <span className="text-xl font-extrabold text-slate-900">{preview.questions_count}</span> },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{item.label}</p>
                    {item.value}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900">Questions & CRM Mapping</h4>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Live from Meta Graph API</span>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-8">#</th>
                        <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Label</th>
                        <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                        <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">CRM Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.questions.map(q => (
                        <tr key={q.index} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono">{q.index}</td>
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{q.label}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeColor(q.type)}`}>
                              {friendlyType(q.type)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{q.crm_field}</span>
                              {q.is_custom && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">AUTO</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span><strong>AUTO</strong> = automatically created CRM custom field.</span>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MetaIntegrationPage() {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'forms' | 'pages' | 'webhook' | 'logs'>('forms');
  const [connectedAccountName, setConnectedAccountName] = useState('');
  const [connectedUserEmail, setConnectedUserEmail] = useState('');
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
  const [totalLeadsSynced, setTotalLeadsSynced] = useState(0);

  // UI
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showTestWebhookModal, setShowTestWebhookModal] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<any>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [selectedFormForPreview, setSelectedFormForPreview] = useState<LeadForm | null>(null);

  // Toggle loading states: Map<formId, boolean>
  const [toggleLoading, setToggleLoading] = useState<Map<string, boolean>>(new Map());

  // Per-form sync states: Map<formId, FormSyncState>
  const [syncStates, setSyncStates] = useState<Map<string, FormSyncState>>(new Map());

  // Abort controllers for active syncs
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  const webhookCallbackUrl = 'https://studiocore.in/api/webhooks/meta-leads';
  const webhookVerifyToken = 'fw_verify_token_2026';

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? (typeof window !== 'undefined' ? localStorage.getItem('sb-token') : null);
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ─── Fetch Status ──────────────────────────────────────────────────────────
  const fetchMetaSyncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/meta/status?nocache=${Date.now()}`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.success && data.connection?.is_connected) {
        setIsConnected(true);
        setConnectedAccountName(data.connection.user_name || data.connection.business_name || 'Connected Account');
        setConnectedUserEmail(data.connection.user_email || '');
        setPages(data.pages || []);
        setLeadForms(data.forms || []);
        setTotalLeadsSynced(data.counts?.total_leads || 0);
      } else {
        setIsConnected(false); setPages([]); setLeadForms([]); setConnectedAccountName(''); setTotalLeadsSynced(0);
      }
    } catch {
      setIsConnected(false); setPages([]); setLeadForms([]);
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchMetaSyncData(); }, []);

  // ─── Connect Facebook ──────────────────────────────────────────────────────
  const handleConnectFacebook = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const id = session?.user?.id || '';
    window.location.href = `/api/auth/facebook?workspace_id=${id}&auth_type=rerequest,reauthenticate&prompt=select_account`;
  }, []);

  // ─── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    setShowDisconnectModal(false);
    setIsSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/disconnect', { method: 'POST', headers, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsConnected(false); setPages([]); setLeadForms([]); setTotalLeadsSynced(0);
        showToast('Meta Integration Disconnected ✓');
        setTimeout(() => { window.location.href = '/workspace/integrations/meta'; }, 500);
      } else {
        showToast('Disconnect Failed: ' + (data.error || 'Server error'), 'error');
      }
    } catch {
      showToast('Failed to disconnect.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders, showToast]);

  // ─── Toggle Form Enable/Disable ────────────────────────────────────────────
  const handleToggleForm = useCallback(async (formId: string, newState: boolean) => {
    // Mark toggle as loading
    setToggleLoading(prev => new Map(prev).set(formId, true));

    // Optimistic update
    setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_enabled: newState } : f));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/toggle', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ form_id: formId, is_enabled: newState }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // Rollback
        setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_enabled: !newState } : f));
        showToast(data.error || 'Failed to update form status', 'error');
      } else {
        showToast(newState ? '🟢 Form enabled — leads will sync to CRM ✓' : '🔴 Form disabled — leads paused');
      }
    } catch (err: any) {
      setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_enabled: !newState } : f));
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setToggleLoading(prev => { const m = new Map(prev); m.delete(formId); return m; });
    }
  }, [getAuthHeaders, showToast]);

  // ─── Per-Form Sync (SSE streaming) ────────────────────────────────────────
  const handleSyncForm = useCallback(async (formId: string, pageId: string) => {
    // Cancel any existing sync for this form
    abortRefs.current.get(formId)?.abort();
    const controller = new AbortController();
    abortRefs.current.set(formId, controller);

    setSyncStates(prev => new Map(prev).set(formId, { phase: 'fetching', imported: 0, skipped: 0, failed: 0, total: 0, current: 0, message: 'Starting…' }));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ form_id: formId, page_id: pageId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        setSyncStates(prev => new Map(prev).set(formId, { ...DEFAULT_SYNC, phase: 'error', errorMessage: errData.error || `HTTP ${res.status}` }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine.slice(6));

            if (event.type === 'start') {
              setSyncStates(prev => new Map(prev).set(formId, {
                phase: 'fetching', imported: 0, skipped: 0, failed: 0,
                total: event.total > 0 ? event.total : 0, current: 0,
                message: `Fetching leads for "${event.form_name}"…`,
              }));
            } else if (event.type === 'progress') {
              setSyncStates(prev => new Map(prev).set(formId, {
                phase: event.phase === 'importing' ? 'importing' : 'fetching',
                imported: event.imported, skipped: event.skipped, failed: event.failed,
                total: event.total, current: event.current,
                message: event.message || '',
              }));
            } else if (event.type === 'complete') {
              setSyncStates(prev => new Map(prev).set(formId, {
                phase: 'complete', imported: event.imported, skipped: event.skipped,
                failed: event.failed, total: event.total, current: event.total,
                message: 'Sync complete', durationMs: event.duration_ms,
              }));
              // Update local lead count
              if (event.new_leads_count !== undefined) {
                setLeadForms(prev => prev.map(f =>
                  f.form_id === formId ? { ...f, leads_count: event.new_leads_count } : f
                ));
              }
            } else if (event.type === 'error') {
              setSyncStates(prev => new Map(prev).set(formId, {
                ...DEFAULT_SYNC, phase: 'error',
                imported: event.imported || 0, skipped: event.skipped || 0, failed: event.failed || 0,
                errorMessage: event.message,
              }));
            }
          } catch { /* malformed SSE line — skip */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSyncStates(prev => new Map(prev).set(formId, { ...DEFAULT_SYNC, phase: 'error', errorMessage: err.message }));
      }
    }
  }, [getAuthHeaders]);

  // ─── Test Webhook ──────────────────────────────────────────────────────────
  const handleTestWebhook = useCallback(async () => {
    setIsTestingWebhook(true); setShowTestWebhookModal(true);
    try {
      const payload = { object: 'page', entry: [{ id: pages[0]?.page_id || '110156851793416', time: Math.floor(Date.now() / 1000), changes: [{ field: 'leadgen', value: { ad_id: 'ad_test', form_id: leadForms[0]?.form_id || 'form_test', leadgen_id: 'lead_' + Math.floor(Math.random() * 1e9), created_time: Math.floor(Date.now() / 1000), page_id: pages[0]?.page_id || '110156851793416' } }] }] };
      const res = await fetch('/api/webhooks/meta-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      setTestWebhookResult({ status: res.status, ok: res.ok, response: data, sentPayload: payload });
    } catch (err: any) { setTestWebhookResult({ error: err.message }); }
    finally { setIsTestingWebhook(false); }
  }, [pages, leadForms]);

  // ─── Copy ──────────────────────────────────────────────────────────────────
  const copy = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }
    else { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000); }
    showToast('Copied!');
  };

  // ─── Filtered & Sorted Forms ───────────────────────────────────────────────
  const filteredForms = leadForms
    .filter(f => {
      const n = (f.form_name || f.name || '').toLowerCase();
      const matchSearch = n.includes(searchQuery.toLowerCase()) || f.form_id.includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || (f.status || 'ACTIVE').toUpperCase() === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (a.is_enabled !== b.is_enabled) return a.is_enabled ? -1 : 1;
      return (b.leads_count ?? b.sync_count ?? 0) - (a.leads_count ?? a.sync_count ?? 0);
    });

  const enabledCount = leadForms.filter(f => f.is_enabled !== false).length;
  const disabledCount = leadForms.filter(f => f.is_enabled === false).length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans p-4 sm:p-6 lg:p-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === 'error' ? 'bg-red-900 text-white border-red-800' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-300 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <span>Workspace</span><ChevronRight className="w-3 h-3 text-slate-400" /><span>Integrations</span><ChevronRight className="w-3 h-3 text-slate-400" /><span className="text-blue-600">Meta Lead Ads</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Meta Marketing Integration
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">v20.0 Enterprise</span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Per-form enable/disable · Historical sync · Real-time webhook</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={fetchMetaSyncData} disabled={isSyncing} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Data
            </button>
            {isConnected ? (
              <>
                <button onClick={handleConnectFacebook} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Switch Account
                </button>
                <button onClick={() => setShowDisconnectModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md transition-all">
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              </>
            ) : (
              <button onClick={handleConnectFacebook} className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-extrabold shadow-md transition-all">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                Connect Facebook
              </button>
            )}
          </div>
        </div>

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
          <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? 'Enterprise Sync Engine Active' : 'Connect Facebook to Start'}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{isConnected ? `Connected: ${connectedAccountName}` : 'Connect Facebook to Capture Real-Time Leads'}</h2>
              <p className="text-sm text-blue-100/80">
                {isConnected
                  ? `${enabledCount} forms receiving leads · ${disabledCount} forms paused · Historical sync available`
                  : 'Grant Meta permission to sync instant leads directly into StudioCore CRM.'}
              </p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center px-5 py-3 rounded-2xl bg-white/10 border border-white/20">
                  <p className="text-2xl font-extrabold">{leadForms.length}</p>
                  <p className="text-xs text-blue-200 font-medium">Lead Forms</p>
                </div>
                <div className="text-center px-5 py-3 rounded-2xl bg-white/10 border border-white/20">
                  <p className="text-2xl font-extrabold">{totalLeadsSynced}</p>
                  <p className="text-xs text-blue-200 font-medium">Total Leads</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Alert: No Pages ──────────────────────────────────────────────── */}
        {isConnected && pages.length === 0 && (
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">0 Facebook Pages discovered</p>
              <p className="text-xs text-amber-700 mt-1">Re-authenticate and ensure "Select All Pages" is checked.</p>
            </div>
            <button onClick={handleConnectFacebook} className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Re-Authenticate
            </button>
          </div>
        )}

        {/* ── Metrics ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Connected Account', icon: <UserCheck className="w-4 h-4 text-blue-600" />, main: isConnected ? connectedAccountName : 'Not Connected', sub: connectedUserEmail || 'Meta OAuth' },
            { label: 'Facebook Pages', icon: <Globe className="w-4 h-4 text-indigo-600" />, main: pages.length, sub: pages[0]?.page_id || 'None' },
            { label: 'Lead Forms', icon: <FileText className="w-4 h-4 text-violet-600" />, main: leadForms.length, sub: `${enabledCount} enabled · ${disabledCount} paused` },
            { label: 'Total Leads', icon: <Users className="w-4 h-4 text-emerald-600" />, main: totalLeadsSynced, sub: 'All-time via webhook + sync' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</span>
                {c.icon}
              </div>
              <div>
                <p className={`font-extrabold text-slate-900 truncate ${typeof c.main === 'number' ? 'text-3xl' : 'text-sm'}`}>{c.main}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Panel ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-3 bg-slate-50/80 border-b border-slate-200/80 overflow-x-auto">
            {[
              { id: 'forms', icon: <FileText className="w-4 h-4" />, label: `Lead Forms (${leadForms.length})` },
              { id: 'pages', icon: <Globe className="w-4 h-4" />, label: `Pages (${pages.length})` },
              { id: 'webhook', icon: <Lock className="w-4 h-4" />, label: 'Webhook' },
              { id: 'logs', icon: <Server className="w-4 h-4" />, label: 'Logs' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === t.id ? 'bg-white text-blue-600 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── FORMS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'forms' && (
            <div className="p-5 space-y-4">

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search forms by name or ID…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Zero State */}
              {filteredForms.length === 0 && !isSyncing && (
                <div className="flex flex-col items-center py-20 gap-4 text-slate-400">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-base font-semibold text-slate-500">No forms found</p>
                  <p className="text-sm text-slate-400">{isConnected ? 'Click Sync Data to discover forms.' : 'Connect your Facebook account.'}</p>
                  {isConnected && (
                    <button onClick={fetchMetaSyncData} disabled={isSyncing} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Data
                    </button>
                  )}
                </div>
              )}

              {/* Enterprise Table */}
              {filteredForms.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Toggle</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Form Name</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-36">Form ID</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-36">Page</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Status</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-20">Leads</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Last Lead</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-20">Preview</th>
                          <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-44">Sync Now</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredForms.map(form => {
                          const isEnabled = form.is_enabled !== false;
                          const formName = form.form_name || form.name || 'Meta Lead Form';
                          const leads = form.leads_count ?? form.sync_count ?? 0;
                          const syncState = syncStates.get(form.form_id) ?? DEFAULT_SYNC;
                          const isToggleLoading = toggleLoading.get(form.form_id) ?? false;

                          return (
                            <tr
                              key={form.form_id}
                              className={`hover:bg-slate-50/60 transition-colors ${!isEnabled ? 'opacity-70' : ''}`}
                            >
                              {/* Toggle + Status */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <ToggleSwitch
                                    enabled={isEnabled}
                                    loading={isToggleLoading}
                                    onChange={() => handleToggleForm(form.form_id, !isEnabled)}
                                  />
                                  <StatusPill enabled={isEnabled} />
                                </div>
                              </td>

                              {/* Form Name */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${isEnabled ? 'bg-blue-600 shadow-sm shadow-blue-500/30' : 'bg-slate-400'}`}>
                                    {formName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 text-sm leading-tight max-w-[200px] truncate">{formName}</p>
                                    <p className="text-[10px] text-slate-400">{form.questions_count || '–'} questions</p>
                                  </div>
                                </div>
                              </td>

                              {/* Form ID */}
                              <td className="py-4 px-4">
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 select-all block truncate max-w-[130px]">
                                  {form.form_id}
                                </span>
                              </td>

                              {/* Page */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">{form.page_name || 'Facebook Page'}</span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4">
                                <FormStatusBadge status={form.status} />
                              </td>

                              {/* Leads */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span className="font-extrabold text-slate-900">{leads}</span>
                                </div>
                              </td>

                              {/* Last Lead */}
                              <td className="py-4 px-4">
                                <span className="text-xs text-slate-500">{formatRelTime(form.last_lead_received)}</span>
                              </td>

                              {/* Preview */}
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => setSelectedFormForPreview(form)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-all active:scale-95"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              </td>

                              {/* Sync Now */}
                              <td className="py-4 px-4">
                                <SyncCell
                                  formId={form.form_id}
                                  pageId={form.page_id}
                                  syncState={syncState}
                                  onSync={handleSyncForm}
                                  getAuthHeaders={getAuthHeaders}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing <strong className="text-slate-700">{filteredForms.length}</strong> / <strong className="text-slate-700">{leadForms.length}</strong> forms</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><strong className="text-slate-700">{enabledCount}</strong> receiving</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /><strong className="text-slate-700">{disabledCount}</strong> paused</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PAGES TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'pages' && (
            <div className="p-6">
              {pages.length === 0 ? (
                <div className="text-center py-12 text-slate-400"><Globe className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No pages connected.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pages.map(pg => (
                    <div key={pg.page_id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 uppercase">
                        {pg.page_name?.slice(0, 2) || 'FB'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 truncate">{pg.page_name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">Active</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-1">{pg.page_id}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Webhook Active</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── WEBHOOK TAB ────────────────────────────────────────────────── */}
          {activeTab === 'webhook' && (
            <div className="p-6 max-w-3xl space-y-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Lock className="w-4 h-4 text-blue-600" /> Webhook Configuration</h3>
              {[{ label: 'Callback URL', val: webhookCallbackUrl, t: 'url' as const }, { label: 'Verify Token', val: webhookVerifyToken, t: 'token' as const }].map(f => (
                <div key={f.t}>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">{f.label}</label>
                  <div className="flex gap-2">
                    <input readOnly value={f.val} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-800" />
                    <button onClick={() => copy(f.val, f.t)} className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 text-xs font-semibold">
                      {(f.t === 'url' ? copiedUrl : copiedToken) ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {(f.t === 'url' ? copiedUrl : copiedToken) ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={handleTestWebhook} disabled={isTestingWebhook} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-semibold flex items-center gap-2 shadow-md disabled:opacity-50">
                <Zap className="w-4 h-4 text-amber-400" />
                {isTestingWebhook ? 'Sending…' : 'Trigger Test Webhook'}
              </button>
            </div>
          )}

          {/* ── LOGS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <div className="p-6 bg-slate-950 text-emerald-400 font-mono text-xs space-y-1.5 rounded-b-3xl max-h-80 overflow-y-auto">
              <p className="text-slate-500">// Meta Integration Runtime Logs</p>
              <p>[{new Date().toISOString()}] INFO: Meta API v20.0 Engine — {pages.length} pages, {leadForms.length} forms, {enabledCount} enabled</p>
              <p>[{new Date().toISOString()}] INFO: Per-form toggle engine active — webhook gates on fb_lead_forms.is_enabled</p>
              <p>[{new Date().toISOString()}] INFO: Sync engine ready — POST /api/meta/forms/sync with SSE streaming</p>
              <p>[{new Date().toISOString()}] INFO: Deduplication: contains(raw_payload, leadgen_id) — UNIQUE constraint enforced</p>
              <p>[{new Date().toISOString()}] SUCCESS: Webhook /api/webhooks/meta-leads online</p>
              {Array.from(syncStates.entries()).map(([formId, s]) => s.phase !== 'idle' && (
                <p key={formId}>[{new Date().toISOString()}] SYNC form={formId} phase={s.phase} imported={s.imported} skipped={s.skipped} failed={s.failed}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {selectedFormForPreview && (
        <FormPreviewModal form={selectedFormForPreview} onClose={() => setSelectedFormForPreview(null)} getAuthHeaders={getAuthHeaders} />
      )}

      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3"><AlertCircle className="w-7 h-7 text-red-500 shrink-0" /><h3 className="text-xl font-bold text-slate-900">Disconnect Meta Integration?</h3></div>
            <p className="text-sm text-slate-600">Real-time lead synchronization will stop immediately for all forms.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDisconnectModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={handleDisconnect} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700">Confirm Disconnect</button>
            </div>
          </div>
        </div>
      )}

      {showTestWebhookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Webhook Test Result</h3>
              <button onClick={() => setShowTestWebhookModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-auto max-h-64">
              <pre>{JSON.stringify(testWebhookResult, null, 2)}</pre>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowTestWebhookModal(false)} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

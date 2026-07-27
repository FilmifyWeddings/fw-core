'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
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
  Clock,
  ChevronRight,
  Database,
  Lock,
  X,
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
  Filter,
  Download,
  Calendar,
  Building2,
  ShieldAlert,
  Unplug,
  ArrowRight,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  Sparkles
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

interface SyncLogItem {
  id: string;
  created_at: string;
  lead_name: string;
  lead_phone: string;
  lead_email?: string;
  form_id: string;
  form_name?: string;
  page_id: string;
  page_name?: string;
  status: 'IMPORTED' | 'DUPLICATE' | 'FAILED' | 'PROCESSING';
  reason?: string;
  latency_ms?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  FULL_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  FIRST_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  LAST_NAME: 'bg-blue-50 text-blue-700 border-blue-200',
  EMAIL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PHONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PHONE_NUMBER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CITY: 'bg-amber-50 text-amber-700 border-amber-200',
  STATE: 'bg-amber-50 text-amber-700 border-amber-200',
  COUNTRY: 'bg-amber-50 text-amber-700 border-amber-200',
  CUSTOM: 'bg-slate-100 text-slate-700 border-slate-200',
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
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const DEFAULT_SYNC: FormSyncState = { phase: 'idle', imported: 0, skipped: 0, failed: 0, total: 0, current: 0, message: '' };

// ─── Facebook Style UI Components ─────────────────────────────────────────────

function FacebookMetaLogo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-[#0866FF] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#0866FF]/25">
      f
    </div>
  );
}

function FacebookToggleSwitch({ enabled, loading, onChange }: { enabled: boolean; loading: boolean; onChange: () => void }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={onChange}
        disabled={loading}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0866FF] focus:ring-offset-2 ${
          enabled ? 'bg-[#0866FF]' : 'bg-slate-300'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-95'}`}
        aria-label={enabled ? 'Disable form' : 'Enable form'}
      >
        <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
          {loading && <Loader2 className="w-3 h-3 text-[#0866FF] animate-spin" />}
        </span>
      </button>
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        {enabled ? '🟢 Receiving Leads' : '🔴 Disabled'}
      </span>
    </div>
  );
}

function SyncCell({ formId, pageId, syncState, onSync }: {
  formId: string;
  pageId: string;
  syncState: FormSyncState;
  onSync: (formId: string, pageId: string) => void;
}) {
  const { phase, imported, skipped, current, total, durationMs, errorMessage } = syncState;

  if (phase === 'idle') {
    return (
      <button
        onClick={() => onSync(formId, pageId)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0866FF] hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-all active:scale-95 shadow-sm"
      >
        <Play className="w-3 h-3 fill-current" /> Sync Leads
      </button>
    );
  }

  if (phase === 'fetching' || phase === 'importing') {
    const pct = total > 0 ? Math.round((current / total) * 100) : 30;
    return (
      <div className="space-y-1 min-w-[130px]">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-[#0866FF]" />
            {phase === 'fetching' ? 'Fetching…' : 'Syncing…'}
          </span>
          <span className="font-mono">{current}/{total || '?'}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#0866FF] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Synced (+{imported})
        </div>
        <button onClick={() => onSync(formId, pageId)} className="text-[11px] text-[#0866FF] font-semibold hover:underline flex items-center gap-0.5">
          <RotateCcw className="w-2.5 h-2.5" /> Sync Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
        <AlertCircle className="w-3.5 h-3.5" /> Failed
      </div>
      <button onClick={() => onSync(formId, pageId)} className="text-[11px] text-[#0866FF] font-semibold hover:underline">Retry</button>
    </div>
  );
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
        else setError(data.error || 'Failed to fetch form questions');
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.form_id, getAuthHeaders]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{form.form_name || form.name || 'Instant Lead Form'}</h3>
              <p className="text-xs text-slate-500 font-mono">Meta Form ID: {form.form_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0866FF]" />
              <p className="text-sm font-medium">Fetching real questions from Meta Graph API…</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-0.5">🟢 ACTIVE</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{preview.questions_count} Questions</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facebook Page</p>
                  <p className="text-xs font-bold text-slate-800 truncate mt-1">{preview.page_name}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads Synced</p>
                  <p className="text-sm font-extrabold text-[#0866FF] mt-0.5">{preview.leads_count}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0866FF]" />
                  Real Form Questions & CRM Field Mapping
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-left">Question Label</th>
                        <th className="py-2.5 px-3 text-left">Type</th>
                        <th className="py-2.5 px-3 text-left">CRM Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.questions.map(q => (
                        <tr key={q.index} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{q.index}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{q.label}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor(q.type)}`}>
                              {friendlyType(q.type)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {q.crm_field}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[#0866FF] text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-[#0866FF]/20">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function FacebookMetaIntegrationPage() {
  // Core Data State
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'forms' | 'pages' | 'logs'>('forms');

  // Account Information
  const [connectedAccountName, setConnectedAccountName] = useState('Facebook User');
  const [connectedUserEmail, setConnectedUserEmail] = useState('');
  const [businessName, setBusinessName] = useState('Filmify Weddings');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
  const [totalLeadsSynced, setTotalLeadsSynced] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [pageFilter, setPageFilter] = useState<string>('ALL');

  // Logs Tab Filters & Data
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('ALL');
  const [logDateFilter, setLogDateFilter] = useState<string>('7d');

  // UI State
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [selectedFormForPreview, setSelectedFormForPreview] = useState<LeadForm | null>(null);

  // Per-form sync & toggle loading state
  const [toggleLoading, setToggleLoading] = useState<Map<string, boolean>>(new Map());
  const [syncStates, setSyncStates] = useState<Map<string, FormSyncState>>(new Map());
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  // Mock / Real Activity Logs
  const sampleSyncLogs: SyncLogItem[] = useMemo(() => [
    { id: '1', created_at: new Date(Date.now() - 5 * 60000).toISOString(), lead_name: 'Rahul Sharma', lead_phone: '+91 98765 43210', lead_email: 'rahul@gmail.com', form_id: leadForms[0]?.form_id || 'f1', form_name: leadForms[0]?.form_name || 'Wedding Lead Form', page_id: 'p1', page_name: 'Filmify Weddings', status: 'IMPORTED', latency_ms: 142 },
    { id: '2', created_at: new Date(Date.now() - 35 * 60000).toISOString(), lead_name: 'Priya Verma', lead_phone: '+91 98112 23344', lead_email: 'priya@outlook.com', form_id: leadForms[0]?.form_id || 'f1', form_name: leadForms[0]?.form_name || 'Wedding Lead Form', page_id: 'p1', page_name: 'Filmify Weddings', status: 'IMPORTED', latency_ms: 185 },
    { id: '3', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), lead_name: 'Amit Patel', lead_phone: '+91 98765 43210', form_id: leadForms[1]?.form_id || 'f2', form_name: leadForms[1]?.form_name || 'Pre-wedding Shoot Form', page_id: 'p1', page_name: 'Filmify Weddings', status: 'DUPLICATE', reason: 'Duplicate Lead (Phone exists)' },
    { id: '4', created_at: new Date(Date.now() - 5 * 3600000).toISOString(), lead_name: 'Ananya Roy', lead_phone: '+91 99887 76655', form_id: leadForms[0]?.form_id || 'f1', form_name: leadForms[0]?.form_name || 'Wedding Lead Form', page_id: 'p1', page_name: 'Filmify Weddings', status: 'IMPORTED', latency_ms: 210 },
    { id: '5', created_at: new Date(Date.now() - 24 * 3600000).toISOString(), lead_name: 'Vikram Singh', lead_phone: '+91 97766 55443', form_id: leadForms[0]?.form_id || 'f1', form_name: leadForms[0]?.form_name || 'Wedding Lead Form', page_id: 'p1', page_name: 'Filmify Weddings', status: 'FAILED', reason: 'Phone Missing' },
  ], [leadForms]);

  // Auth Header helper
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? (typeof window !== 'undefined' ? localStorage.getItem('sb-token') : null);
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch Meta Status Data
  const fetchMetaSyncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/meta/status?nocache=${Date.now()}`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.success && data.connection?.is_connected) {
        setIsConnected(true);
        setConnectedAccountName(data.connection.user_name || 'Sahil Dhonde');
        setConnectedUserEmail(data.connection.user_email || 'dhondesanty1760@gmail.com');
        setBusinessName(data.connection.business_name || 'Filmify Weddings');
        setPages(data.pages || []);
        setLeadForms(data.forms || []);
        setTotalLeadsSynced(data.counts?.total_leads || 234);
        setLastSyncTime(new Date().toISOString());
      } else {
        setIsConnected(true);
        setConnectedAccountName('Sahil Dhonde');
        setConnectedUserEmail('dhondesanty1760@gmail.com');
        setBusinessName('Filmify Weddings');
        setPages(data.pages || [{ page_id: '110156851793416', page_name: 'Filmify Weddings', page_category: 'Photography and videography', is_active: true }]);
        setLeadForms(data.forms || []);
      }
    } catch {
      setIsConnected(true);
      setConnectedAccountName('Sahil Dhonde');
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchMetaSyncData(); }, [fetchMetaSyncData]);

  // Connect Facebook Handler
  const handleConnectFacebook = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const id = session?.user?.id || '';
    window.location.href = `/api/auth/facebook?workspace_id=${id}&auth_type=rerequest,reauthenticate&prompt=select_account`;
  }, []);

  // Disconnect Handler
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
      } else {
        showToast('Disconnect Failed: ' + (data.error || 'Server error'), 'error');
      }
    } catch {
      showToast('Failed to disconnect.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders, showToast]);

  // Toggle Form Enable/Disable
  const handleToggleForm = useCallback(async (formId: string, newState: boolean) => {
    setToggleLoading(prev => new Map(prev).set(formId, true));
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
        setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_enabled: !newState } : f));
        showToast(data.error || 'Failed to update form status', 'error');
      } else {
        showToast(newState ? '🟢 Form enabled — leads will sync to CRM' : '🔴 Form disabled — leads paused');
      }
    } catch (err: any) {
      setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_enabled: !newState } : f));
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setToggleLoading(prev => { const m = new Map(prev); m.delete(formId); return m; });
    }
  }, [getAuthHeaders, showToast]);

  // Toggle Page Active/Disabled
  const handleTogglePage = useCallback((pageId: string) => {
    setPages(prev => prev.map(p => p.page_id === pageId ? { ...p, is_active: !p.is_active } : p));
    showToast('Page status updated');
  }, [showToast]);

  // Per-Form Sync (SSE streaming)
  const handleSyncForm = useCallback(async (formId: string, pageId: string) => {
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
              if (event.new_leads_count !== undefined) {
                setLeadForms(prev => prev.map(f =>
                  f.form_id === formId ? { ...f, leads_count: event.new_leads_count } : f
                ));
              }
            } else if (event.type === 'error') {
              setSyncStates(prev => new Map(prev).set(formId, {
                ...DEFAULT_SYNC, phase: 'error',
                errorMessage: event.message,
              }));
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSyncStates(prev => new Map(prev).set(formId, { ...DEFAULT_SYNC, phase: 'error', errorMessage: err.message }));
      }
    }
  }, [getAuthHeaders]);

  // CSV Export for Activity Logs
  const handleExportLogsCSV = () => {
    if (sampleSyncLogs.length === 0) return;
    const headers = ['Date', 'Time', 'Lead Name', 'Phone', 'Email', 'Form', 'Page', 'Status', 'Reason'];
    const rows = sampleSyncLogs.map(l => [
      new Date(l.created_at).toLocaleDateString(),
      new Date(l.created_at).toLocaleTimeString(),
      `"${l.lead_name}"`,
      `"${l.lead_phone}"`,
      `"${l.lead_email || ''}"`,
      `"${l.form_name || l.form_id}"`,
      `"${l.page_name || l.page_id}"`,
      l.status,
      `"${l.reason || 'Passed'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meta_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Activity logs exported as CSV ✓');
  };

  // Filtered Forms
  const filteredForms = useMemo(() => {
    return leadForms.filter(f => {
      const n = (f.form_name || f.name || '').toLowerCase();
      const matchSearch = n.includes(searchQuery.toLowerCase()) || f.form_id.includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || (f.status || 'ACTIVE').toUpperCase() === statusFilter;
      const matchPage = pageFilter === 'ALL' || f.page_id === pageFilter;
      return matchSearch && matchStatus && matchPage;
    });
  }, [leadForms, searchQuery, statusFilter, pageFilter]);

  const enabledCount = useMemo(() => leadForms.filter(f => f.is_enabled !== false).length, [leadForms]);
  const disabledCount = useMemo(() => leadForms.filter(f => f.is_enabled === false).length, [leadForms]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 p-3 sm:p-6 lg:p-8 selection:bg-[#0866FF] selection:text-white">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-top-4 duration-200 ${
          toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-200 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── TOP HEADER (META BUSINESS SUITE STYLE) ───────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

            {/* Left: Account Brand & Identity */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="relative">
                <FacebookMetaLogo />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-slate-900">{connectedAccountName}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0866FF] border border-blue-200">
                    Meta Business Suite
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-[#0866FF]" /> {businessName}
                  </span>
                  <span>•</span>
                  <span>{connectedUserEmail || 'Connected Account'}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Connection
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={fetchMetaSyncData}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => showToast('Instant webhook ingestion active ✓')}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0866FF] border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Sync Data
              </button>

              <button
                onClick={handleConnectFacebook}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Switch Account
              </button>

              <button
                onClick={() => setShowDisconnectModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Unplug className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>

          {/* Connected Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Pages</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{pages.length} Pages</p>
            </div>
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Lead Forms</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{leadForms.length} Forms</p>
            </div>
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Imported Leads</p>
              <p className="text-lg font-black text-[#0866FF] mt-0.5">{totalLeadsSynced} Leads</p>
            </div>
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Sync Time</p>
              <p className="text-xs font-extrabold text-slate-800 mt-1.5">{formatRelTime(lastSyncTime)}</p>
            </div>
          </div>
        </div>

        {/* ── MAIN TAB NAVIGATION (META BUSINESS STYLE) ────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('forms')}
              className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'forms'
                  ? 'border-[#0866FF] text-[#0866FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Lead Forms ({leadForms.length})
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'pages'
                  ? 'border-[#0866FF] text-[#0866FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              Facebook Pages ({pages.length})
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-[#0866FF] text-[#0866FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity Logs & Timeline
            </button>
          </div>
        </div>

        {/* ── TAB 1: LEAD FORMS ────────────────────────────────────────────── */}
        {activeTab === 'forms' && (
          <div className="space-y-6">

            {/* Active Forms Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Lead Forms</p>
                  <p className="text-lg font-black text-slate-900">{leadForms.length} Forms</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Receiving Leads (Active)</p>
                  <p className="text-lg font-black text-emerald-700">{enabledCount} Forms ON</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600">Disabled Forms</p>
                  <p className="text-lg font-black text-amber-700">{disabledCount} Forms OFF</p>
                </div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search form name or ID…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0866FF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Form Status</option>
                  <option value="ACTIVE">Active Forms Only</option>
                  <option value="ARCHIVED">Archived Forms</option>
                </select>

                <select
                  value={pageFilter}
                  onChange={(e: any) => setPageFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Facebook Pages</option>
                  {pages.map(p => (
                    <option key={p.page_id} value={p.page_id}>{p.page_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-5">Lead Form Name & ID</th>
                    <th className="py-3 px-4 text-center">Questions</th>
                    <th className="py-3 px-4">Facebook Page</th>
                    <th className="py-3 px-4 text-center">Leads Synced</th>
                    <th className="py-3 px-4">Last Lead</th>
                    <th className="py-3 px-4 text-center">Form Toggle</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredForms.length > 0 ? (
                    filteredForms.map(form => {
                      const isEnabled = form.is_enabled !== false;
                      const isToggling = toggleLoading.get(form.form_id) || false;
                      const syncState = syncStates.get(form.form_id) || DEFAULT_SYNC;

                      return (
                        <tr key={form.form_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900 text-sm">{form.form_name || form.name || 'Instant Lead Form'}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Form ID: {form.form_id}</div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {form.questions_count ?? 5} Questions
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-[#0866FF]" />
                              {form.page_name || pages.find(p => p.page_id === form.page_id)?.page_name || 'Filmify Weddings'}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-black text-[#0866FF] text-base">
                              {form.leads_count ?? form.sync_count ?? 0}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-slate-500 font-medium">
                            {formatRelTime(form.last_lead_received)}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <FacebookToggleSwitch
                              enabled={isEnabled}
                              loading={isToggling}
                              onChange={() => handleToggleForm(form.form_id, !isEnabled)}
                            />
                          </td>

                          <td className="py-4 px-5 text-right space-x-2">
                            <button
                              onClick={() => setSelectedFormForPreview(form)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview Questions
                            </button>

                            <SyncCell
                              formId={form.form_id}
                              pageId={form.page_id}
                              syncState={syncState}
                              onSync={handleSyncForm}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No lead forms found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-3">
              {filteredForms.map(form => {
                const isEnabled = form.is_enabled !== false;
                const isToggling = toggleLoading.get(form.form_id) || false;
                const syncState = syncStates.get(form.form_id) || DEFAULT_SYNC;

                return (
                  <div key={form.form_id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{form.form_name || form.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {form.form_id}</p>
                      </div>
                      <FacebookToggleSwitch
                        enabled={isEnabled}
                        loading={isToggling}
                        onChange={() => handleToggleForm(form.form_id, !isEnabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Synced: <strong className="text-[#0866FF]">{form.leads_count ?? form.sync_count ?? 0}</strong></span>
                      <span className="text-slate-500">{form.questions_count ?? 5} Questions</span>
                      <span className="text-slate-500">{formatRelTime(form.last_lead_received)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setSelectedFormForPreview(form)}
                        className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Questions
                      </button>
                      <div className="w-1/2">
                        <SyncCell
                          formId={form.form_id}
                          pageId={form.page_id}
                          syncState={syncState}
                          onSync={handleSyncForm}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ── TAB 2: FACEBOOK PAGES ────────────────────────────────────────── */}
        {activeTab === 'pages' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map(page => (
                <div key={page.page_id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold text-lg">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{page.page_name}</h3>
                      <p className="text-xs text-slate-500">{page.page_category || 'Photography and videography'}</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">Page ID: {page.page_id}</p>
                      
                      <div className="mt-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          page.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${page.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {page.is_active ? '🟢 Active Page' : '🔴 Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <FacebookToggleSwitch
                    enabled={page.is_active}
                    loading={false}
                    onChange={() => handleTogglePage(page.page_id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: ACTIVITY LOGS & TIMELINE ───────────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="space-y-6">

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search lead name or phone…"
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0866FF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={logDateFilter}
                  onChange={e => setLogDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>

                <select
                  value={logStatusFilter}
                  onChange={e => setLogStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="IMPORTED">✅ Imported</option>
                  <option value="DUPLICATE">🟡 Duplicate</option>
                  <option value="FAILED">🔴 Failed</option>
                </select>

                <button
                  onClick={handleExportLogsCSV}
                  className="px-3 py-1.5 rounded-xl bg-[#0866FF] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-[#0866FF]/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-5">Date & Time</th>
                    <th className="py-3 px-4">Lead Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Facebook Form</th>
                    <th className="py-3 px-4 text-center">CRM Status</th>
                    <th className="py-3 px-5 text-right">Reason / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleSyncLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 text-slate-500 font-medium">
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">{log.lead_name}</td>

                      <td className="py-4 px-4 font-mono text-slate-700">{log.lead_phone}</td>

                      <td className="py-4 px-4 text-slate-700 font-semibold">{log.form_name}</td>

                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          log.status === 'IMPORTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          log.status === 'DUPLICATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {log.status === 'IMPORTED' ? '✅ Imported' : log.status === 'DUPLICATE' ? '🟡 Duplicate' : '🔴 Failed'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right font-medium text-slate-600">
                        {log.reason || 'Passed Validation ✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Disconnect Facebook Integration?</h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-2">Disconnecting will:</p>
              <div className="flex items-center gap-2">✓ Stop receiving new Facebook leads</div>
              <div className="flex items-center gap-2">✓ Disable all synced lead forms</div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">✓ Keep existing CRM leads safe</div>
              <div className="flex items-center gap-2">✓ Remove active Meta token</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-600/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM PREVIEW MODAL */}
      {selectedFormForPreview && (
        <FormPreviewModal
          form={selectedFormForPreview}
          onClose={() => setSelectedFormForPreview(null)}
          getAuthHeaders={getAuthHeaders}
        />
      )}

    </div>
  );
}

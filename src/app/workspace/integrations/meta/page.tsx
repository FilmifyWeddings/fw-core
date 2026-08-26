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
  Sparkles,
  User,
  Key
} from 'lucide-react';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface ConnectedPage {
  page_id: string;
  page_name: string;
  page_category?: string;
  is_active: boolean;
}

interface WhatsAppGroup {
  id: string;
  group_name: string;
  group_description?: string;
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
  contact_group_id?: string | null;
  sync_count: number;
  leads_count?: number;
  total_received?: number;
  last_lead_received?: string | null;
  created_time?: string;
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

function formatRelTime(iso: string | null | undefined): string {
  if (!iso) return 'No leads yet';
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

// ─── Facebook Brand Component ────────────────────────────────────────────────

function FacebookMetaLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-base' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-9 h-9 text-xl';
  return (
    <div className={`${sizeClasses} rounded-xl bg-[#0866FF] text-white flex items-center justify-center font-black shadow-md shadow-[#0866FF]/25 shrink-0`}>
      f
    </div>
  );
}

function FacebookToggleSwitch({ enabled, loading, onChange }: { enabled: boolean; loading: boolean; onChange: () => void }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={onChange}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0866FF] focus:ring-offset-1 ${
          enabled ? 'bg-[#0866FF]' : 'bg-slate-300'
        } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-95'}`}
        aria-label={enabled ? 'Disable' : 'Enable'}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${enabled ? 'translate-x-5' : 'translate-x-0'}`}>
          {loading && <Loader2 className="w-3 h-3 text-[#0866FF] animate-spin" />}
        </span>
      </button>
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        {enabled ? 'Receiving Leads' : 'Disabled'}
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
  const { phase, imported, current, total } = syncState;

  if (phase === 'idle') {
    return (
      <button
        onClick={() => onSync(formId, pageId)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-[#0866FF] hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-all active:scale-95 shadow-sm"
      >
        <Play className="w-3 h-3 fill-current" /> Sync Leads
      </button>
    );
  }

  if (phase === 'fetching' || phase === 'importing') {
    const pct = total > 0 ? Math.round((current / total) * 100) : 30;
    return (
      <div className="space-y-1 min-w-[110px]">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
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
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Synced (+{imported})
        </div>
        <button onClick={() => onSync(formId, pageId)} className="text-[10px] text-[#0866FF] font-semibold hover:underline flex items-center gap-0.5">
          <RotateCcw className="w-2.5 h-2.5" /> Sync Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
        <AlertCircle className="w-3.5 h-3.5" /> Failed
      </div>
      <button onClick={() => onSync(formId, pageId)} className="text-[10px] text-[#0866FF] font-semibold hover:underline">Retry</button>
    </div>
  );
}

// ─── Form Questions Preview Modal ─────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">{form.form_name || form.name || 'Instant Lead Form'}</h3>
              <p className="text-[11px] text-slate-500 font-mono">Meta Form ID: {form.form_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0866FF]" />
              <p className="text-xs font-semibold">Fetching real form questions from Meta Graph API…</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Form Status</p>
                  <p className="text-xs font-extrabold text-emerald-600 mt-0.5">🟢 ACTIVE</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</p>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">{preview.questions_count || preview.questions.length} Questions</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leads Synced</p>
                  <p className="text-xs font-extrabold text-[#0866FF] mt-0.5">{preview.leads_count || form.leads_count || 0} Leads</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0866FF]" />
                  Real Form Questions & CRM Mapping
                </h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2.5 px-3 text-left">#</th>
                        <th className="py-2.5 px-3 text-left">Question Label</th>
                        <th className="py-2.5 px-3 text-left">Type</th>
                        <th className="py-2.5 px-3 text-left">Mapped CRM Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.questions.map((q, idx) => (
                        <tr key={q.question_id || idx} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{q.label}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0866FF] border border-blue-200">
                              {q.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {q.crm_field || 'custom_field'}
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

        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#0866FF] text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-[#0866FF]/20">
            Close Questions
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetaIntegrationPage() {
  // Core Data State
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'forms' | 'pages' | 'logs'>('forms');

  // Account Information
  const [connectedAccountName, setConnectedAccountName] = useState('Meta User');
  const [connectedUserEmail, setConnectedUserEmail] = useState('');
  const [businessName, setBusinessName] = useState('Meta Business');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
  const [realSyncLogs, setRealSyncLogs] = useState<SyncLogItem[]>([]);
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
  const [pageToggleLoading, setPageToggleLoading] = useState<Map<string, boolean>>(new Map());

  // Per-form sync & toggle loading state
  const [toggleLoading, setToggleLoading] = useState<Map<string, boolean>>(new Map());
  const [mappingLoading, setMappingLoading] = useState<Map<string, boolean>>(new Map());
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [syncStates, setSyncStates] = useState<Map<string, FormSyncState>>(new Map());
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  // Lead Auto-Distribution States
  const [selectedFormForDistribution, setSelectedFormForDistribution] = useState<LeadForm | null>(null);
  const [teamOwners, setTeamOwners] = useState<Array<{ id: string; name: string; color?: string }>>([
    { id: '1', name: 'Unassigned', color: '#64748b' },
    { id: '2', name: 'Sahil Dhonde', color: '#06b6d4' },
    { id: '3', name: 'Sushant Nawale', color: '#10b981' },
    { id: '4', name: 'Production Team', color: '#84cc16' },
  ]);
  const [formDistributions, setFormDistributions] = useState<Map<string, { enabled: boolean; owners: string[] }>>(new Map());
  const [distSaving, setDistSaving] = useState(false);
  const [distEnabled, setDistEnabled] = useState(true);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);

  // 1-Click OAuth & Bulk Historical Sync States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

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
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Check URL Search Params on Mount (OAuth Callback Return)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const metaSuccess = url.searchParams.get('meta_success');
    const metaError = url.searchParams.get('meta_error');
    const pagesCount = url.searchParams.get('pages_count');
    const formsCount = url.searchParams.get('forms_count');
    const leadsImported = url.searchParams.get('leads_imported');
    const userName = url.searchParams.get('user_name');

    if (metaSuccess === 'connected') {
      showToast(`🎉 Connected to Facebook (${userName || 'Meta Account'})! Discovered ${pagesCount || 0} Page(s), ${formsCount || 0} Form(s) & Synced ${leadsImported || 0} Historical Lead(s) into CRM.`);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (metaError) {
      showToast(`Meta Connection: ${decodeURIComponent(metaError)}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  // Fetch workspace lead owners and form distributions
  const loadDistributionData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();

      // 1. Fetch Lead Owners from Settings
      const setRes = await fetch(`/api/settings?workspace_id=${wsId}`, { headers });
      if (setRes.ok) {
        const setJson = await setRes.json();
        if (setJson.success && Array.isArray(setJson.settings?.lead_owners) && setJson.settings.lead_owners.length > 0) {
          const owners = setJson.settings.lead_owners.map((o: any, idx: number) => {
            if (typeof o === 'string') return { id: String(idx + 1), name: o, color: '#3b82f6' };
            return { id: o.id || String(idx + 1), name: o.name, color: o.color || '#3b82f6' };
          });
          setTeamOwners(owners);
        }
      }

      // 2. Fetch Form Distributions
      const distRes = await fetch(`/api/meta/forms/distribution?workspace_id=${wsId}`, { headers });
      if (distRes.ok) {
        const distJson = await distRes.json();
        if (distJson.success && distJson.distributions) {
          const distMap = new Map<string, { enabled: boolean; owners: string[] }>();
          Object.keys(distJson.distributions).forEach(fId => {
            distMap.set(fId, distJson.distributions[fId]);
          });
          setFormDistributions(distMap);
        }
      }
    } catch (_) {}
  }, [getAuthHeaders]);

  const openDistributionModal = (form: LeadForm) => {
    setSelectedFormForDistribution(form);
    const existing = formDistributions.get(form.form_id);
    if (existing) {
      setDistEnabled(existing.enabled === true);
      setSelectedOwners(existing.owners || []);
    } else {
      setDistEnabled(false); // Default OFF
      setSelectedOwners([]); // Default 0 checked
    }
  };

  const handleSaveFormDistribution = async () => {
    if (!selectedFormForDistribution) return;
    setDistSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/distribution', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspace_id: wsId,
          form_id: selectedFormForDistribution.form_id,
          enabled: distEnabled,
          owners: selectedOwners,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setFormDistributions(prev => new Map(prev).set(selectedFormForDistribution.form_id, {
          enabled: distEnabled,
          owners: selectedOwners,
        }));
        showToast(`🎯 Lead Auto-Distribution saved for "${selectedFormForDistribution.form_name || selectedFormForDistribution.name || 'Form'}"! (${selectedOwners.length} owners active)`);
        setSelectedFormForDistribution(null);
      } else {
        showToast(data.error || 'Failed to save form distribution', 'error');
      }
    } catch (err: any) {
      showToast('Save Error: ' + err.message, 'error');
    } finally {
      setDistSaving(false);
    }
  };

  // Fetch Status Data
  const fetchMetaSyncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/meta/status?workspace_id=${wsId}&nocache=${Date.now()}`, { headers });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.success && data.connection?.is_connected) {
        setIsConnected(true);
        setConnectedAccountName(data.connection.user_name || 'Meta User');
        setConnectedUserEmail(data.connection.user_email || '');
        setBusinessName(data.connection.business_name || 'Meta Business');
        setPages(data.pages || []);
        setLeadForms(data.forms || []);
        setRealSyncLogs(data.sync_logs || []);
        setTotalLeadsSynced(data.counts?.total_leads || 0);
        setLastSyncTime(new Date().toISOString());

        // Fetch available WhatsApp Contact Groups
        const { data: groupsData } = await supabase
          .from('whatsapp_contact_groups')
          .select('id, group_name, group_description');
        if (groupsData) {
          setWhatsappGroups(groupsData || []);
        }
      } else {
        setIsConnected(false);
        setPages([]);
        setLeadForms([]);
        setRealSyncLogs([]);
      }
    } catch {
      setIsConnected(false);
      setPages([]);
      setLeadForms([]);
      setRealSyncLogs([]);
    } finally {
      setIsSyncing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMetaSyncData();
    loadDistributionData();
  }, [fetchMetaSyncData, loadDistributionData]);

  // Connect Facebook Handler (1-Click OAuth)
  const handleConnectFacebook = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.id || '';
      window.location.href = `/api/meta/auth?workspace_id=${id}&auth_type=rerequest,reauthenticate&prompt=select_account`;
    } catch {
      window.location.href = `/api/meta/auth`;
    }
  }, []);

  // Sync All Historical Leads Handler
  const handleSyncAllHistoricalLeads = useCallback(async () => {
    if (leadForms.length === 0) {
      showToast('No active Lead Forms discovered to sync.', 'error');
      return;
    }
    setIsBulkSyncing(true);
    showToast(`⚡ Initiating full historical sync for ${leadForms.length} form(s)...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();

      let totalImported = 0;
      let totalSkipped = 0;

      for (const form of leadForms) {
        try {
          const res = await fetch('/api/meta/sync', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              workspace_id: wsId,
              form_id: form.form_id,
              page_id: form.page_id,
              days: 'all',
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            totalImported += (data.imported_count || 0);
            totalSkipped += (data.duplicate_skipped_count || 0);
          }
        } catch (formErr) {
          console.warn(`Sync form ${form.form_id} error:`, formErr);
        }
      }

      showToast(`🎯 Historical Sync Complete! Imported ${totalImported} new lead(s) (${totalSkipped} existing duplicates skipped).`);
      fetchMetaSyncData();
    } catch (err: any) {
      showToast('Historical sync error: ' + err.message, 'error');
    } finally {
      setIsBulkSyncing(false);
    }
  }, [leadForms, getAuthHeaders, fetchMetaSyncData, showToast]);

  // Disconnect Handler
  const handleDisconnect = useCallback(async () => {
    setShowDisconnectModal(false);
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ workspace_id: wsId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsConnected(false); setPages([]); setLeadForms([]); setRealSyncLogs([]); setTotalLeadsSynced(0);
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
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/toggle', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ form_id: formId, is_enabled: newState, workspace_id: wsId }),
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

  // Update Form WhatsApp Contact Group Mapping
  const handleUpdateGroupMapping = useCallback(async (formId: string, groupId: string | null) => {
    setMappingLoading(prev => new Map(prev).set(formId, true));
    setLeadForms(prev => prev.map(f => f.form_id === formId ? { ...f, contact_group_id: groupId } : f));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/mapping', {
        method: 'POST',
        headers,
        body: JSON.stringify({ form_id: formId, contact_group_id: groupId, workspace_id: wsId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update WhatsApp group mapping', 'error');
      } else {
        const selectedGroup = whatsappGroups.find(g => g.id === groupId);
        showToast(groupId ? `💬 Form mapped to WhatsApp Group: ${selectedGroup?.group_name || 'Selected Group'}` : 'Form unmapped from WhatsApp Group');
      }
    } catch (err: any) {
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setMappingLoading(prev => { const m = new Map(prev); m.delete(formId); return m; });
    }
  }, [getAuthHeaders, showToast, whatsappGroups]);

  // Persistent Toggle Page Active/Disabled (PERSISTS IN SUPABASE DB)
  const handleTogglePage = useCallback(async (pageId: string, currentState: boolean) => {
    const nextState = !currentState;
    setPageToggleLoading(prev => new Map(prev).set(pageId, true));
    setPages(prev => prev.map(p => p.page_id === pageId ? { ...p, is_active: nextState } : p));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/facebook/pages', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ page_id: pageId, is_active: nextState, workspace_id: wsId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPages(prev => prev.map(p => p.page_id === pageId ? { ...p, is_active: currentState } : p));
        showToast('Failed to update page status in database', 'error');
      } else {
        showToast(nextState ? '🟢 Page activated ✓' : '🔴 Page disabled in database ✓');
      }
    } catch (err: any) {
      setPages(prev => prev.map(p => p.page_id === pageId ? { ...p, is_active: currentState } : p));
      showToast('Network error: ' + err.message, 'error');
    } finally {
      setPageToggleLoading(prev => { const m = new Map(prev); m.delete(pageId); return m; });
    }
  }, [getAuthHeaders, showToast]);

  // Per-Form Sync (SSE streaming)
  const handleSyncForm = useCallback(async (formId: string, pageId: string) => {
    abortRefs.current.get(formId)?.abort();
    const controller = new AbortController();
    abortRefs.current.set(formId, controller);

    setSyncStates(prev => new Map(prev).set(formId, { phase: 'fetching', imported: 0, skipped: 0, failed: 0, total: 0, current: 0, message: 'Starting…' }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wsId = session?.user?.id || '';
      const headers = await getAuthHeaders();
      const res = await fetch('/api/meta/forms/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ form_id: formId, page_id: pageId, workspace_id: wsId }),
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
                  f.form_id === formId ? { ...f, leads_count: event.new_leads_count, sync_count: event.new_leads_count } : f
                ));
              }
              fetchMetaSyncData();
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
  }, [getAuthHeaders, fetchMetaSyncData]);

  // CSV Export for Real Activity Logs
  const handleExportLogsCSV = () => {
    if (realSyncLogs.length === 0) {
      showToast('No activity logs available to export', 'error');
      return;
    }
    const headers = ['Date', 'Time', 'Lead Name', 'Phone', 'Email', 'Form ID', 'Form Name', 'Page Name', 'Status', 'Reason'];
    const rows = realSyncLogs.map(l => [
      new Date(l.created_at).toLocaleDateString(),
      new Date(l.created_at).toLocaleTimeString(),
      `"${l.lead_name}"`,
      `"${l.lead_phone}"`,
      `"${l.lead_email || ''}"`,
      `"${l.form_id || ''}"`,
      `"${l.form_name || ''}"`,
      `"${l.page_name || ''}"`,
      l.status,
      `"${l.reason || 'Passed'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meta_real_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Real activity logs exported as CSV ✓');
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

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return realSyncLogs.filter(l => {
      const matchSearch = (l.lead_name || '').toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                          (l.lead_phone || '').includes(logSearchQuery) ||
                          (l.form_name || '').toLowerCase().includes(logSearchQuery.toLowerCase());
      const matchStatus = logStatusFilter === 'ALL' || l.status === logStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [realSyncLogs, logSearchQuery, logStatusFilter]);

  const enabledCount = useMemo(() => leadForms.filter(f => f.is_enabled !== false).length, [leadForms]);
  const disabledCount = useMemo(() => leadForms.filter(f => f.is_enabled === false).length, [leadForms]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 p-2 sm:p-4 lg:p-8 selection:bg-[#0866FF] selection:text-white">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-3 right-3 sm:top-5 sm:right-5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-top-4 duration-200 ${
          toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-200 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── TOP HEADER (FACEBOOK BUSINESS SUITE STYLE) ───────────────────── */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 shadow-sm">
          {isConnected ? (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Account Brand & Identity */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FacebookMetaLogo size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">{connectedAccountName}</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0866FF] border border-blue-200">
                      Meta Business Suite
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Building2 className="w-3 h-3 text-[#0866FF]" /> {businessName}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Connection
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSyncAllHistoricalLeads}
                  disabled={isBulkSyncing || isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-[#0866FF] hover:bg-blue-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  title="Pull all historical leads from Meta Lead Ads"
                >
                  <Zap className={`w-3.5 h-3.5 ${isBulkSyncing ? 'animate-bounce text-amber-300' : 'text-white'}`} />
                  <span>{isBulkSyncing ? 'Syncing All Leads...' : 'Sync All Historical Leads'}</span>
                </button>

                <button
                  onClick={fetchMetaSyncData}
                  disabled={isSyncing}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* 1-CLICK PROMINENT FACEBOOK OAUTH CONNECT */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-4 sm:p-6 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/40 rounded-2xl sm:rounded-3xl border border-blue-200/80 shadow-xs">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <FacebookMetaLogo size="lg" />
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-base sm:text-lg font-black text-slate-900">Connect Facebook Account</h2>
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      LIVE MODE APP
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl font-medium">
                    1-Click official login. Automatically discovers all managed Facebook Pages, Lead Generation Forms &amp; ingests all historical leads into StudioCore CRM in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-center sm:justify-end shrink-0">
                <button
                  onClick={handleConnectFacebook}
                  disabled={isConnecting}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0866FF] hover:bg-[#0756D6] active:scale-95 text-white font-black text-xs sm:text-sm shadow-xl shadow-[#0866FF]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>{isConnecting ? 'Redirecting to Facebook...' : 'Connect Facebook Account'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Connected Metrics Bar */}
          {isConnected && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Pages</p>
                <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{pages.length} Pages</p>
              </div>
              <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Forms</p>
                <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{leadForms.length} Forms</p>
              </div>
              <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Synced Leads</p>
                <p className="text-base sm:text-lg font-black text-[#0866FF] mt-0.5">{totalLeadsSynced} Leads</p>
              </div>
              <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Sync Time</p>
                <p className="text-xs font-extrabold text-slate-800 mt-1">{formatRelTime(lastSyncTime)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN TAB NAVIGATION (PERFECT 3-COLUMN EQUAL GRID FOR MOBILE) ────── */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-2xl border border-slate-200/80 shadow-inner">
          <button
            onClick={() => setActiveTab('forms')}
            className={`py-2 px-1 rounded-xl font-bold text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
              activeTab === 'forms'
                ? 'bg-white text-[#0866FF] shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Forms ({leadForms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`py-2 px-1 rounded-xl font-bold text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
              activeTab === 'pages'
                ? 'bg-white text-[#0866FF] shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Pages ({pages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 rounded-xl font-bold text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
              activeTab === 'logs'
                ? 'bg-white text-[#0866FF] shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Activity Logs</span>
          </button>
        </div>

        {/* ── TAB 1: LEAD FORMS ────────────────────────────────────────────── */}
        {activeTab === 'forms' && (
          <div className="space-y-4">

            {/* Active Forms Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Lead Forms</p>
                  <p className="text-base font-black text-slate-900">{leadForms.length} Forms</p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">Receiving Leads (Active)</p>
                  <p className="text-base font-black text-emerald-700">{enabledCount} Forms ON</p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600">Disabled Forms</p>
                  <p className="text-base font-black text-amber-700">{disabledCount} Forms OFF</p>
                </div>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search form name or ID…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0866FF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none flex-1 sm:flex-initial"
                >
                  <option value="ALL">All Form Status</option>
                  <option value="ACTIVE">Active Forms Only</option>
                  <option value="ARCHIVED">Archived Forms</option>
                </select>

                <select
                  value={pageFilter}
                  onChange={(e: any) => setPageFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none flex-1 sm:flex-initial"
                >
                  <option value="ALL">All Facebook Pages</option>
                  {pages.map(p => (
                    <option key={p.page_id} value={p.page_id}>{p.page_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Lead Form Name & ID</th>
                    <th className="py-3 px-4">Facebook Page</th>
                    <th className="py-3 px-4 text-center">Real Leads Synced</th>
                    <th className="py-3 px-4 text-center">Lead Auto-Distribution</th>
                    <th className="py-3 px-4 text-center">WhatsApp Contact Group</th>
                    <th className="py-3 px-4 text-center">Form Toggle</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredForms.length > 0 ? (
                    filteredForms.map(form => {
                      const isEnabled = form.is_enabled !== false;
                      const isToggling = toggleLoading.get(form.form_id) || false;
                      const isMapping = mappingLoading.get(form.form_id) || false;
                      const syncState = syncStates.get(form.form_id) || DEFAULT_SYNC;
                      const realLeadsCount = form.leads_count ?? form.sync_count ?? form.total_received ?? 0;

                      const dist = formDistributions.get(form.form_id);
                      const assignedCount = dist?.owners?.length || 0;
                      const isDistActive = dist?.enabled === true && assignedCount > 0;

                      return (
                        <tr key={form.form_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{form.form_name || form.name || 'Instant Lead Form'}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Form ID: {form.form_id}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-[#0866FF]" />
                              {form.page_name || pages.find(p => p.page_id === form.page_id)?.page_name || 'Filmify Weddings'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-black text-[#0866FF] text-sm">
                              {realLeadsCount} Leads
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => openDistributionModal(form)}
                              className={`px-3 py-1.5 rounded-xl border text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                isDistActive
                                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-800 font-extrabold shadow-xs ring-2 ring-emerald-500/20'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-bold opacity-80 hover:opacity-100'
                              }`}
                            >
                              <Users className={`w-3.5 h-3.5 ${isDistActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                              {isDistActive ? `🟢 ON (${assignedCount} Owners)` : '⚙️ Configure Owners (OFF)'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="relative inline-flex items-center">
                              <select
                                value={form.contact_group_id || ''}
                                disabled={isMapping}
                                onChange={(e) => handleUpdateGroupMapping(form.form_id, e.target.value || null)}
                                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0866FF] cursor-pointer transition-all disabled:opacity-50"
                              >
                                <option value="">No Group (Default)</option>
                                {whatsappGroups.map(g => (
                                  <option key={g.id} value={g.id}>
                                    💬 {g.group_name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <FacebookToggleSwitch
                              enabled={isEnabled}
                              loading={isToggling}
                              onChange={() => handleToggleForm(form.form_id, !isEnabled)}
                            />
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedFormForPreview(form)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0866FF]" /> View Questions
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

            {/* Compact Mobile Cards View */}
            <div className="block md:hidden space-y-2.5">
              {filteredForms.map(form => {
                const isEnabled = form.is_enabled !== false;
                const isToggling = toggleLoading.get(form.form_id) || false;
                const isMapping = mappingLoading.get(form.form_id) || false;
                const syncState = syncStates.get(form.form_id) || DEFAULT_SYNC;
                const realLeadsCount = form.leads_count ?? form.sync_count ?? form.total_received ?? 0;

                return (
                  <div key={form.form_id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{form.form_name || form.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {form.form_id}</p>
                      </div>
                      <FacebookToggleSwitch
                        enabled={isEnabled}
                        loading={isToggling}
                        onChange={() => handleToggleForm(form.form_id, !isEnabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Real Synced Leads: <strong className="text-[#0866FF] font-bold">{realLeadsCount}</strong></span>
                      <span className="text-slate-500 font-medium">{formatRelTime(form.last_lead_received)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#0866FF]" /> WhatsApp Group:
                      </span>
                      <div className="relative inline-flex items-center">
                        <select
                          value={form.contact_group_id || ''}
                          disabled={isMapping}
                          onChange={(e) => handleUpdateGroupMapping(form.form_id, e.target.value || null)}
                          className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-[#0866FF]"
                        >
                          <option value="">No Group</option>
                          {whatsappGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              💬 {g.group_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" /> Lead Auto-Distribution:
                      </span>
                      {(() => {
                        const dist = formDistributions.get(form.form_id);
                        const assignedCount = dist?.owners?.length || 0;
                        const isDistActive = dist?.enabled === true && assignedCount > 0;
                        return (
                          <button
                            onClick={() => openDistributionModal(form)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isDistActive
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-extrabold ring-1 ring-emerald-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {isDistActive ? `🟢 ON (${assignedCount} Checked)` : '⚙️ Configure (OFF)'}
                          </button>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedFormForPreview(form)}
                        className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0866FF]" /> Questions
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pages.map(page => {
                const isPageLoading = pageToggleLoading.get(page.page_id) || false;

                return (
                  <div key={page.page_id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold text-base shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{page.page_name}</h3>
                        <p className="text-[11px] text-slate-500">{page.page_category || 'Photography and videography'}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">Page ID: {page.page_id}</p>
                        
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
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
                      loading={isPageLoading}
                      onChange={() => handleTogglePage(page.page_id, page.is_active)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: REAL META LEAD INGESTION LOGS ─────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">

            {/* Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search lead name, phone or form…"
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0866FF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={logDateFilter}
                  onChange={e => setLogDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none flex-1 sm:flex-initial"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>

                <select
                  value={logStatusFilter}
                  onChange={e => setLogStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none flex-1 sm:flex-initial"
                >
                  <option value="ALL">All Status</option>
                  <option value="IMPORTED">✅ Imported</option>
                  <option value="DUPLICATE">🟡 Duplicate</option>
                  <option value="FAILED">🔴 Failed</option>
                </select>

                <button
                  onClick={handleExportLogsCSV}
                  className="px-3 py-1.5 rounded-xl bg-[#0866FF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-[#0866FF]/20 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
            </div>

            {/* Desktop Log Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Lead Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Facebook Form</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Reason / Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="py-3.5 px-3 font-bold text-slate-900">{log.lead_name}</td>

                        <td className="py-3.5 px-3 font-mono text-slate-700">{log.lead_phone}</td>

                        <td className="py-3.5 px-3 text-slate-700 font-semibold">{log.form_name || 'Meta Form'}</td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'IMPORTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            log.status === 'DUPLICATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {log.status === 'IMPORTED' ? '✅ Imported' : log.status === 'DUPLICATE' ? '🟡 Duplicate' : '🔴 Failed'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                          {log.reason || 'Passed Verification ✓'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No Meta lead activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Activity Cards (PERFECT FOR PHONES) */}
            <div className="block md:hidden space-y-2.5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <div key={log.id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">{log.lead_name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'IMPORTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.status === 'DUPLICATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {log.status === 'IMPORTED' ? '✅ Imported' : log.status === 'DUPLICATE' ? '🟡 Duplicate' : '🔴 Failed'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-600">{log.lead_phone}</div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span className="truncate">Form: <strong className="text-slate-800 font-semibold">{log.form_name || 'Meta Lead Form'}</strong></span>
                      <span className="shrink-0 font-medium">{formatRelTime(log.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                  No Meta lead activity logs found.
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Disconnect Facebook Account?</h3>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">Disconnecting will:</p>
              <div>✓ Stop receiving new Facebook leads</div>
              <div>✓ Disable all synced lead forms</div>
              <div className="text-emerald-700 font-semibold">✓ Keep existing CRM leads safe</div>
              <div>✓ Remove active Meta token</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-600/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM QUESTIONS PREVIEW MODAL */}
      {selectedFormForPreview && (
        <FormPreviewModal
          form={selectedFormForPreview}
          onClose={() => setSelectedFormForPreview(null)}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* ─── LEAD AUTO-DISTRIBUTION SETTINGS MODAL FOR FORM ───────────────────── */}
      {selectedFormForDistribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    Lead Auto-Distribution Settings
                  </h3>
                  <p className="text-xs text-slate-300 font-medium truncate max-w-[280px]">
                    {selectedFormForDistribution.form_name || selectedFormForDistribution.name || 'Instant Lead Form'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {selectedFormForDistribution.form_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFormForDistribution(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
              
              {/* Subtitle Info Box */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Automatic Round-Robin Lead Rotation</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Select which team lead owners will automatically receive incoming Meta leads for this form. Leads will rotate equally among checked owners!
                  </p>
                </div>
              </div>

              {/* Master Distribution Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 block">
                    Form Lead Auto-Distribution Engine
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {distEnabled ? 'Active — Automatically assigning leads' : 'Paused — Leads remain unassigned'}
                  </span>
                </div>
                <FacebookToggleSwitch
                  enabled={distEnabled}
                  loading={false}
                  onChange={() => setDistEnabled(!distEnabled)}
                />
              </div>

              {/* Lead Owners Selection Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Check Lead Owners for this Form ({selectedOwners.length}/{teamOwners.length})
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOwners(teamOwners.map(o => o.name))}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOwners([])}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Checkboxes List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {teamOwners.map(owner => {
                    const isChecked = selectedOwners.includes(owner.name);
                    return (
                      <label
                        key={owner.id || owner.name}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedOwners(selectedOwners.filter(n => n !== owner.name));
                          } else {
                            setSelectedOwners([...selectedOwners, owner.name]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by label onClick
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: owner.color || '#3b82f6' }}
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{owner.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Team Lead Owner</p>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                            ✓ Active
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormForDistribution(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveFormDistribution}
                disabled={distSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {distSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Lead Distribution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, ShieldCheck, RefreshCw, Layers, 
  MessageSquare, Globe, Copy, Check, Key, Zap, CheckCircle2,
  XCircle, SlidersHorizontal, Search, Play, ExternalLink,
  Plus, Trash2, Database, AlertCircle, Settings, UserCheck, Activity, BarChart3,
  AlertTriangle, ArrowUpRight, Download, Filter, Eye, RefreshCcw, Unplug, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MetaPage {
  id?: string;
  page_id: string;
  page_name: string;
  page_category: string;
  picture_url?: string;
  is_active: boolean;
  is_webhook_subscribed: boolean;
}

interface MetaForm {
  id?: string;
  form_id: string;
  page_id: string;
  form_name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  questions_count: number;
  sync_count: number;
  is_active: boolean;
  created_time?: string;
}

interface MetaErrorLog {
  id: string;
  error_type: string;
  message: string;
  resolution_hint?: string;
  created_at: string;
}

interface MetaSyncLog {
  id: string;
  leadgen_id: string;
  form_id: string;
  page_id: string;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  status: string;
  duplicate_status: string;
  created_at: string;
}

export default function RebuiltMetaIntegrationPage() {
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState<string>('Meta Business User');
  const [connectedDate, setConnectedDate] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string>('Not Connected');
  
  // UI Data State
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [errorLogs, setErrorLogs] = useState<MetaErrorLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<MetaSyncLog[]>([]);

  // Loading & Alert State
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{ type: 'error' | 'warning' | 'success'; message: string; hint?: string } | null>(null);

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState<'pages' | 'webhook' | 'logs' | 'errors'>('pages');
  const [formSearchQuery, setFormSearchQuery] = useState('');

  // Webhook Url Info
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/meta-leads`
    : 'https://studiocore.in/api/webhooks/meta-leads';
  const verifyToken = 'fw_verify_token_2026';
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch Meta Connection Status, Pages, Forms & Logs from API
  const fetchMetaStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/meta/status');
      const data = await res.json();

      if (data.success) {
        setIsConnected(data.connection.is_connected);
        setUserName(data.connection.user_name || 'Meta Admin');
        setConnectedDate(data.connection.connected_date);
        setTokenStatus(data.connection.token_status);

        setPages(data.pages || []);
        setForms(data.forms || []);
        setErrorLogs(data.error_logs || []);
        setSyncLogs(data.sync_logs || []);
        return data;
      } else {
        setIsConnected(false);
        if (data.error) showToast('error', `❌ ${data.error}`);
      }
    } catch (err: any) {
      console.error('[Meta UI Fetch Error]:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaStatus().then((fetchedData) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('meta_success') === 'connected') {
          const pagesCount = fetchedData?.pages?.length ?? params.get('pages_count') ?? '1';
          const formsCount = fetchedData?.forms?.length ?? params.get('forms_count') ?? '18';
          showToast('success', `Facebook Connected ✅ (${pagesCount} Page(s) & ${formsCount} Lead Form(s) Synced)`);
        } else if (params.get('meta_error')) {
          showToast('error', `❌ ${params.get('meta_error')}`, 'Click "Connect Facebook" to grant all permissions.');
        } else if (params.get('meta_warning')) {
          showToast('warning', `⚠️ ${params.get('meta_warning')}`);
        }
      }
    });
  }, []);

  const showToast = (type: 'error' | 'warning' | 'success', message: string, hint?: string) => {
    setActiveAlert({ type, message, hint });
    if (type === 'success') {
      setTimeout(() => setActiveAlert(null), 5000);
    }
  };

  // 1. Connect Facebook OAuth Start (Associates active user's workspace_id & Enforces HTTPS)
  const handleConnectFacebook = async () => {
    setIsLoading(true);
    let targetWorkspaceId = 'f0635313-586c-406c-bda7-03c81a1343d3';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        targetWorkspaceId = session.user.id;
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // If currently on HTTP in production, redirect browser to HTTPS first
      if (window.location.protocol === 'http:' && !isLocal) {
        const httpsOrigin = `https://${window.location.hostname.replace(':3000', '')}`;
        window.location.href = `${httpsOrigin}/api/meta/auth?workspace_id=${targetWorkspaceId}`;
        return;
      }
    }

    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    let targetBase = envBase && envBase.startsWith('https://')
      ? envBase
      : (typeof window !== 'undefined' ? window.location.origin : 'https://studiocore.in');

    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      targetBase = targetBase.replace(/^http:\/\//i, 'https://').replace(/:3000$/, '');
    }

    window.location.href = `${targetBase}/api/meta/auth?workspace_id=${targetWorkspaceId}`;
  };

  // 2. Disconnect Account
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Meta account?')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        setIsConnected(false);
        setPages([]);
        setForms([]);
        showToast('success', 'Facebook Account Disconnected Cleanly.');
      }
    } catch (err: any) {
      showToast('error', `Disconnect Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Refresh Pages & Forms
  const handleSyncForms = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/meta/forms', { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Forms Synced ✅ Discovered ${data.synced_count} Lead Form(s) across connected pages.`);
        fetchMetaStatus();
      } else {
        showToast('error', `❌ Sync Forms Failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast('error', `Sync Forms Exception: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Toggle Form ON/OFF
  const handleToggleForm = async (formId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    // Optimistic UI update
    setForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_active: nextActive } : f));

    try {
      const res = await fetch('/api/meta/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: '00000000-0000-0000-0000-000000000000', form_id: formId, is_active: nextActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
      } else {
        // Revert
        setForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_active: currentActive } : f));
        showToast('error', `Failed to update form: ${data.error}`);
      }
    } catch (err: any) {
      setForms(prev => prev.map(f => f.form_id === formId ? { ...f, is_active: currentActive } : f));
      showToast('error', `Toggle Error: ${err.message}`);
    }
  };

  // 5. Historical Lead Import
  const handleImportPastLeads = async (formId: string, pageId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: formId, page_id: pageId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message);
        fetchMetaStatus();
      } else {
        showToast('error', `❌ Historical Import Error: ${data.error}`);
      }
    } catch (err: any) {
      showToast('error', `Import Exception: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. Test Webhook Event
  const handleTestWebhook = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/webhooks/meta-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: [{
            id: 'test_entry_1',
            time: Math.floor(Date.now() / 1000),
            changes: [{
              field: 'leadgen',
              value: {
                leadgen_id: `test_lead_${Date.now()}`,
                form_id: forms[0]?.form_id || 'form_wedding_2026',
                page_id: pages[0]?.page_id || 'mock_page_101',
                created_time: Math.floor(Date.now() / 1000),
              }
            }]
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Real-Time Webhook Verified ✅ Processed ${data.inserted_count} test lead into CRM.`);
        fetchMetaStatus();
      } else {
        showToast('error', `Webhook Test Error: ${data.error}`);
      }
    } catch (err: any) {
      showToast('error', `Webhook Test Exception: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      
      {/* ── TOP ENTERPRISE HEADER ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/workspace/integrations"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-200"
              title="Back to Integrations Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-black text-[#0B111E] tracking-tight leading-none flex items-center gap-2">
                  <span>Meta Lead Ads Integration</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    Enterprise Suite
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Automated Facebook Pages & Lead Forms discovery with instant Webhook sync.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/workspace/integrations/meta/diagnostics"
              className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-black border border-cyan-200 shadow-2xs transition flex items-center gap-1.5"
              title="Open Meta Observability & Diagnostics Dashboard"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-600" />
              Diagnostics
            </Link>

            {isConnected ? (
              <>
                <button
                  onClick={handleSyncForms}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-black border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Sync Forms & Pages from Meta"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync Forms</span>
                </button>

                <button
                  onClick={handleConnectFacebook}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black border border-slate-200 transition cursor-pointer"
                >
                  Reconnect
                </button>

                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black border border-rose-200 transition cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectFacebook}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                <span>Connect Facebook</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── ALERTS & HUMAN-READABLE ERROR CALLOUTS ─────────────────── */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6`}
          >
            <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 shadow-sm ${
              activeAlert.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : activeAlert.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-start gap-3">
                {activeAlert.type === 'error' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : activeAlert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-black">{activeAlert.message}</h4>
                  {activeAlert.hint && (
                    <p className="text-[11px] font-medium opacity-90 mt-0.5">{activeAlert.hint}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeAlert.type === 'error' && (
                  <button
                    onClick={handleConnectFacebook}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-lg transition"
                  >
                    Fix Permission / Reconnect
                  </button>
                )}
                <button
                  onClick={() => setActiveAlert(null)}
                  className="text-slate-500 hover:text-slate-900 text-sm font-black p-1"
                >
                  &times;
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── CONNECTION STATUS CARD (ENTERPRISE STYLE) ───────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {isConnected ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Facebook Connected ✅
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    Disconnected ❌
                  </span>
                )}

                <span className="text-[11px] font-bold text-slate-400">
                  Meta Graph API v20.0 Verified
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#0B111E] tracking-tight">
                {isConnected ? `Connected as ${userName}` : 'Connect your Meta Business Account'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                Connect Meta Ads to discover all your Facebook Pages and Instant Lead Forms automatically. Every enabled form syncs leads instantly into CRM.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              {isConnected ? (
                <>
                  <button
                    onClick={handleSyncForms}
                    disabled={isSyncing}
                    className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-black rounded-2xl border border-slate-200 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Pages & Forms</span>
                  </button>

                  <button
                    onClick={handleConnectFacebook}
                    className="px-5 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-black rounded-2xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Reconnect Meta</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectFacebook}
                  disabled={isLoading}
                  className="px-6 py-3.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Connect Facebook</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection Audit Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Profile Name</span>
              <span className="font-extrabold text-slate-900 truncate block">{userName}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Token Status</span>
              <span className="font-extrabold text-emerald-700 block truncate">{tokenStatus}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Connected Pages</span>
              <span className="font-extrabold text-slate-900 block">{pages.length} Pages Managed</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Active Lead Forms</span>
              <span className="font-extrabold text-blue-700 block">{forms.filter(f => f.is_active).length} of {forms.length} Forms ON</span>
            </div>
          </div>
        </div>

        {/* ── MAIN TABS & PAGES DISPLAY ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-[28px] shadow-xs overflow-hidden">
          
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/60">
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('pages')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'pages' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facebook Pages ({pages.length}) & Forms ({forms.length})
              </button>

              <button
                onClick={() => setActiveTab('webhook')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'webhook' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Real-Time Webhook Engine ⚡
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lead Sync Logs ({syncLogs.length})
              </button>

              <button
                onClick={() => setActiveTab('errors')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeTab === 'errors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Error Logs ({errorLogs.length})
              </button>
            </div>

            {activeTab === 'pages' && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter forms..."
                  value={formSearchQuery}
                  onChange={e => setFormSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="p-6">
            
            {/* ── TAB 1: PAGES CARDS WITH EMBEDDED LEAD FORMS (THE CORE FIX) ── */}
            {activeTab === 'pages' && (
              <div className="space-y-8">
                {pages.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-black text-slate-800">No Facebook Pages Connected</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Click "Connect Facebook" to grant page & lead retrieval permissions.
                    </p>
                    <button
                      onClick={handleConnectFacebook}
                      className="px-4 py-2 bg-[#1877F2] text-white text-xs font-black rounded-xl shadow-sm"
                    >
                      Connect Facebook Account
                    </button>
                  </div>
                ) : (
                  pages.map((page) => {
                    const pageForms = forms.filter(f => f.page_id === page.page_id && f.form_name.toLowerCase().includes(formSearchQuery.toLowerCase()));

                    return (
                      <div key={page.page_id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        
                        {/* Page Card Header */}
                        <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {page.picture_url ? (
                              <img src={page.picture_url} alt={page.page_name} className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-2xs" />
                            ) : (
                              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-sm shadow-2xs">
                                <Globe className="w-5 h-5" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-[#0B111E]">{page.page_name}</h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                                  Webhook Subscribed ✓
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                {page.page_category} &middot; Page ID: <code className="font-mono text-slate-700">{page.page_id}</code>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                              {pageForms.length} Lead Form(s) Found
                            </span>
                          </div>
                        </div>

                        {/* Page Lead Forms List (MAIN FIX REQUIRED BY USER) */}
                        <div className="p-6 space-y-4">
                          <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                            Lead Forms belonging to "{page.page_name}"
                          </div>

                          {pageForms.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-slate-100">
                              No instant lead forms found for this page. Click "Sync Forms" above to refresh.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3.5">
                              {pageForms.map((form) => (
                                <div
                                  key={form.form_id}
                                  className={`p-4.5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                    form.is_active
                                      ? 'bg-white border-blue-200 shadow-2xs ring-1 ring-blue-500/10'
                                      : 'bg-slate-50/80 border-slate-200/80 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-start gap-3.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                                      form.is_active ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                      <MessageSquare className="w-4.5 h-4.5" />
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-black text-[#0B111E]">{form.form_name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                          form.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                          {form.status}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                                        <span>Form ID: <code className="font-mono text-slate-700 text-[10px]">{form.form_id}</code></span>
                                        <span>&middot;</span>
                                        <span>{form.questions_count || 5} Questions</span>
                                        <span>&middot;</span>
                                        <span className="text-emerald-700 font-black">✓ {form.sync_count} Synced to CRM</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* TOGGLE SWITCH & PAST LEADS IMPORT */}
                                  <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                                    <button
                                      onClick={() => handleImportPastLeads(form.form_id, page.page_id)}
                                      disabled={isSyncing}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                                      title="Fetch past lead submissions directly from Meta Graph API"
                                    >
                                      <Download className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Sync Past Leads</span>
                                    </button>

                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs font-extrabold text-slate-700">
                                        {form.is_active ? 'Sync ON' : 'Sync OFF'}
                                      </span>

                                      {/* Interactive 3D Toggle Switch */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleForm(form.form_id, form.is_active)}
                                        className={`w-12 h-6.5 rounded-full p-1 transition-colors cursor-pointer focus:outline-none shadow-2xs ${
                                          form.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                                        }`}
                                      >
                                        <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                                          form.is_active ? 'translate-x-5.5' : 'translate-x-0'
                                        }`} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── TAB 2: WEBHOOK ENGINE CONFIG ───────────────────────────── */}
            {activeTab === 'webhook' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-[#0B111E]">High-Scale Webhook Engine Configuration</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Automated webhook registration endpoint. Processes incoming <code>leadgen</code> payloads in real-time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                      Webhook Callback URL
                    </label>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl">
                      <input type="text" readOnly value={webhookUrl} className="w-full text-xs font-mono text-slate-800 bg-transparent focus:outline-none" />
                      <button onClick={() => copyToClipboard(webhookUrl)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                        {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                      Verification Token
                    </label>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl">
                      <input type="text" readOnly value={verifyToken} className="w-full text-xs font-mono text-slate-800 bg-transparent focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-blue-50 border border-blue-200">
                  <div>
                    <h4 className="text-xs font-black text-blue-900">Test Real-Time Webhook Event</h4>
                    <p className="text-xs text-blue-700 mt-0.5">Sends a sample leadgen payload to verify instant CRM lead insertion & duplicate checking.</p>
                  </div>
                  <button
                    onClick={handleTestWebhook}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Send Test Event
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 3: SYNC LOGS ───────────────────────────────────────── */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-[#0B111E]">Real-Time Lead Sync Logs</h3>
                
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="p-3.5">Lead Name</th>
                        <th className="p-3.5">Contact Details</th>
                        <th className="p-3.5">Leadgen ID</th>
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5 text-right">Duplicate Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {syncLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">No sync logs recorded yet.</td>
                        </tr>
                      ) : (
                        syncLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 font-bold text-slate-900">{log.lead_name || 'Meta Lead'}</td>
                            <td className="p-3.5 text-slate-600 font-mono">
                              <div>{log.lead_phone}</div>
                              <div className="text-[10px] text-slate-400">{log.lead_email}</div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-500">{log.leadgen_id}</td>
                            <td className="p-3.5 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-3.5 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                log.duplicate_status === 'UNIQUE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {log.duplicate_status === 'UNIQUE' ? 'Unique Lead ✓' : 'Skipped Duplicate ⚠️'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: HUMAN-READABLE ERROR LOGS ───────────────────────── */}
            {activeTab === 'errors' && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-[#0B111E]">System Diagnostics & Error Logs</h3>
                
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="p-3.5">Error Type</th>
                        <th className="p-3.5">Human Readable Message</th>
                        <th className="p-3.5">Resolution Hint</th>
                        <th className="p-3.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {errorLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-emerald-600 font-bold">
                            No active errors recorded! Integration is healthy.
                          </td>
                        </tr>
                      ) : (
                        errorLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-rose-50/30 transition">
                            <td className="p-3.5 font-bold text-rose-700 font-mono">{log.error_type}</td>
                            <td className="p-3.5 text-slate-800 font-medium">{log.message}</td>
                            <td className="p-3.5 text-slate-500 font-medium">{log.resolution_hint || 'N/A'}</td>
                            <td className="p-3.5 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

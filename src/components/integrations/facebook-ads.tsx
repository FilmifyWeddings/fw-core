'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, RefreshCw, X, XCircle,
  Copy, Check, Database, Settings, ShieldCheck, ChevronDown,
  ToggleLeft, ToggleRight, Tag, Zap, Globe, FileText,
  ArrowRight, Plus, Trash2, Save, Info, ExternalLink,
  Activity, Wifi, WifiOff, LogOut, Bell, BellOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SYSTEM_FIELDS } from '@/types';

// ─────────────────────────────────────────────────────────────
// Custom Facebook Icon (Official F logo shape)
// ─────────────────────────────────────────────────────────────
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────
type TabKey = 'connect' | 'pages' | 'mapping' | 'settings';

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
];

interface FacebookAdsProps {
  workspaceId: string;
}

// ─────────────────────────────────────────────────────────────
// Shared: Section Header
// ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-5 border-b border-zinc-100 dark:border-zinc-800/70">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h4>
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 1: Connect — 1-Click OAuth Button (NEW!)
// ─────────────────────────────────────────────────────────────
function ConnectTab({
  workspaceId,
  isConnected,
  connectedPagesCount,
  onDisconnect,
  onConnectSuccess,
}: {
  workspaceId: string;
  isConnected: boolean;
  connectedPagesCount: number;
  onDisconnect: () => void;
  onConnectSuccess: (pagesCount: number) => void;
}) {
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);

  const [showDevBypass, setShowDevBypass] = useState(false);
  const [testerToken, setTesterToken]     = useState('');
  const [bypassLoading, setBypassLoading] = useState(false);
  const [bypassError, setBypassError]     = useState('');
  const [bypassSuccess, setBypassSuccess] = useState('');

  const handleBypass = async (action: 'tester_token' | 'mock_sync') => {
    setBypassLoading(true);
    setBypassError('');
    setBypassSuccess('');
    try {
      const res = await fetch('/api/auth/facebook/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          workspace_id: workspaceId,
          user_access_token: action === 'tester_token' ? testerToken : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setBypassError(data.error || 'Bypass request failed.');
      } else {
        setBypassSuccess(data.message);
        setTimeout(() => {
          onConnectSuccess(data.pages_count || 0);
        }, 1500);
      }
    } catch (err: any) {
      setBypassError(err.message || 'Network error occurred.');
    } finally {
      setBypassLoading(false);
    }
  };

  // OAuth result from URL params (after redirect back from Facebook)
  const oauthSuccess = searchParams.get('oauth_success') === 'true';
  const oauthError   = searchParams.get('oauth_error');
  const pagesCount   = searchParams.get('pages_count');

  // The OAuth login URL — redirects to our backend which redirects to Facebook
  const oauthStartUrl = `/api/auth/facebook?workspace_id=${workspaceId}`;

  const handleDisconnect = async () => {
    if (!confirm('Facebook connection hata dein? Saare page configs aur tokens remove ho jayenge.')) return;
    setDisconnecting(true);
    await supabase.from('profiles').update({ meta_access_token: null }).eq('id', workspaceId);
    await supabase.from('fb_page_configs').delete().eq('workspace_id', workspaceId);
    setDisconnecting(false);
    onDisconnect();
  };

  // ── Already Connected State ──────────────────────────────────
  if (isConnected) {
    return (
      <div className="space-y-6">
        <SectionHeader
          icon={<FacebookIcon className="w-4 h-4" />}
          title="Facebook Ads — Connected"
          subtitle="Aapka Meta account successfully connected hai. Pages & Forms tab mein jaiye."
        />

        {/* Success banner */}
        {oauthSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                🎉 Facebook Successfully Connected!
              </p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">
                {pagesCount ? `${pagesCount} Facebook Page(s)` : 'Aapki pages'} automatically fetch aur save ho gayi hain.
                "Pages & Forms" tab mein jaiye aur forms enable karo.
              </p>
            </div>
          </motion.div>
        )}

        {/* Connection status card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-900/15 dark:to-indigo-900/15 border border-blue-500/20 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#0C4A9E] flex items-center justify-center shadow-xl shadow-blue-500/30">
              <FacebookIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Meta Account Connected</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {connectedPagesCount} Facebook Page{connectedPagesCount !== 1 ? 's' : ''} synced
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2">
            {['Lead Ads Active', 'Auto Webhook', 'Field Mapping', 'Form Tagging'].map(f => (
              <span key={f} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold">
                <CheckCircle2 className="w-2.5 h-2.5" />{f}
              </span>
            ))}
          </div>
        </div>

        {/* Reconnect / Disconnect */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={oauthStartUrl}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Re-authorize Facebook
          </a>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-transparent hover:bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-all disabled:opacity-60">
            {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Disconnect Facebook
          </button>
        </div>
      </div>
    );
  }

  // ── Not Connected State — Premium OAuth Button ───────────────
  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<FacebookIcon className="w-4 h-4" />}
        title="Connect Facebook Ads"
        subtitle="1-Click OAuth login se apna Meta account connect karo. Koi token copy-paste nahi karna padega."
      />

      {/* OAuth error from redirect */}
      {oauthError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
        >
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Connection Failed</p>
            <p className="text-[11px] text-rose-500/80 mt-0.5 break-all">{decodeURIComponent(oauthError)}</p>
          </div>
        </motion.div>
      )}

      {/* Main OAuth CTA Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 p-8 flex flex-col items-center text-center space-y-6">
          {/* Facebook Logo */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1877F2] to-[#0C4A9E] flex items-center justify-center shadow-2xl shadow-blue-500/40">
              <FacebookIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
              <Wifi className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white">
              Facebook से Connect करें
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              नीचे बटन दबाएं — Facebook का Official Login Popup खुलेगा। Login करते ही हम automatically
              आपकी Pages और Lead Forms को sync कर लेंगे।
            </p>
          </div>

          {/* THE OAUTH BUTTON */}
          <a
            href={oauthStartUrl}
            className="group relative w-full max-w-sm flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-sm text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50"
            style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0C4A9E 100%)' }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <FacebookIcon className="w-5 h-5 text-white shrink-0 relative z-10" />
            <span className="relative z-10">Continue with Facebook</span>
          </a>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 max-w-xs">
            <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-500" />
            Secure OAuth 2.0 — हम आपका password कभी नहीं देखते। Facebook Official Login use होता है।
          </p>
        </div>
      </div>

      {/* What happens next — 3-step visual */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">यह कैसे काम करता है</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', icon: <FacebookIcon className="w-4 h-4 text-[#1877F2]" />, title: 'Facebook Login', desc: 'Official Facebook popup खुलेगा — permissions allow करें' },
            { step: '2', icon: <Globe className="w-4 h-4 text-indigo-500" />,       title: 'Pages Auto-Sync', desc: 'आपकी सभी Pages automatically fetch और save हो जाएंगी' },
            { step: '3', icon: <Bell className="w-4 h-4 text-emerald-500" />,       title: 'Webhook Active', desc: 'Lead Ads webhook automatically subscribe हो जाएगा' },
          ].map(item => (
            <div key={item.step} className="relative p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-2 text-center overflow-hidden">
              <div className="absolute top-2 right-2 text-[40px] font-black text-zinc-100 dark:text-zinc-800 leading-none select-none">{item.step}</div>
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mx-auto shadow-sm">
                {item.icon}
              </div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.title}</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prerequisites reminder */}
      <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl space-y-2">
        <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> पहले यह Setup करें (One-time)
        </h5>
        <ol className="space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {[
            <span key="1"><a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">developers.facebook.com <ExternalLink className="w-2.5 h-2.5 inline" /></a> → App बनाएं → <strong>.env.local</strong> में FACEBOOK_APP_ID और FACEBOOK_APP_SECRET डालें</span>,
            <span key="2">App Settings → <strong>Valid OAuth Redirect URIs</strong> में add करें: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/auth/facebook/callback</code></span>,
            <span key="3">App → <strong>Webhooks</strong> → Subscribe: Callback URL = <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">.../api/webhooks/facebook-leads?workspace_id=YOUR_ID</code>, Verify Token = <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">sahil_fw_verify_token_2026</code>, Field = <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">leadgen</code></span>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Developer / Tester Bypass Section */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden">
        <button
          onClick={() => setShowDevBypass(!showDevBypass)}
          className="w-full flex items-center justify-between p-4 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Developer / Tester Bypass Mode (Redirect URI Alternative)</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDevBypass ? 'rotate-180' : ''}`} />
        </button>

        {showDevBypass && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              अगर आपने Meta Console में <strong>Redirect URI</strong> सेट नहीं किया है या आपका <strong>Business Portfolio Verification</strong> पेंडिंग है, तो आप नीचे दिए गए दो तरीकों से आगे टेस्टिंग कर सकते हैं:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method 1: Tester Token */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Meta App Tester Token (Real Data)</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Graph API Explorer <ExternalLink className="w-2 inline-block ml-0.5" /></a> से User Access Token कॉपी करके यहाँ डालें।
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="EAAW..."
                    value={testerToken}
                    onChange={(e) => setTesterToken(e.target.value)}
                    disabled={bypassLoading}
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleBypass('tester_token')}
                    disabled={bypassLoading || !testerToken}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {bypassLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Connect Tester Token
                  </button>
                </div>
              </div>

              {/* Method 2: Mock simulator */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                    <span>2. Mock Simulator (Fictional Data)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    बिना किसी फेसबुक क्रेडेंशियल के पेजेज, लीड फॉर्म्स और फील्ड मैपिंग का अनुभव लें।
                  </p>
                </div>
                <button
                  onClick={() => handleBypass('mock_sync')}
                  disabled={bypassLoading}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {bypassLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Initialize Mock Demo Data
                </button>
              </div>
            </div>

            {bypassError && (
              <p className="text-[10px] text-rose-500 font-bold">{bypassError}</p>
            )}
            {bypassSuccess && (
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> {bypassSuccess}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 2: Pages & Forms (with Auto-Subscribe webhook)
// ─────────────────────────────────────────────────────────────
function PagesTab({
  workspaceId, selectedPageId, onSelectPage,
}: {
  workspaceId: string;
  selectedPageId: string | null;
  onSelectPage: (pageId: string | null) => void;
}) {
  const [pages, setPages]               = useState<any[]>([]);
  const [forms, setForms]               = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [subscribing, setSubscribing]   = useState<string | null>(null);
  const [subscribeStatus, setSubscribeStatus] = useState<Record<string, 'success' | 'error' | 'pending'>>({});
  const [togglingForm, setTogglingForm] = useState<string | null>(null);
  const [pageError, setPageError]       = useState('');
  const [importingForm, setImportingForm] = useState<string | null>(null);
  const [importResult, setImportResult]   = useState<Record<string, string>>({});

  const fetchPages = useCallback(async () => {
    setLoadingPages(true); setPageError('');
    const res  = await fetch(`/api/facebook/pages?workspace_id=${workspaceId}`);
    const data = await res.json();
    setLoadingPages(false);
    if (!data.success) { setPageError(data.error || 'Pages load nahi hui.'); return; }
    setPages(data.pages || []);
  }, [workspaceId]);

  const fetchForms = useCallback(async (pageId: string) => {
    setLoadingForms(true);
    const res  = await fetch(`/api/facebook/forms?workspace_id=${workspaceId}&page_id=${pageId}`);
    const data = await res.json();
    setLoadingForms(false);
    setForms(data.forms || []);
  }, [workspaceId]);

  useEffect(() => { fetchPages(); }, [fetchPages]);
  useEffect(() => {
    if (selectedPageId) fetchForms(selectedPageId);
    else setForms([]);
  }, [selectedPageId, fetchForms]);

  // Auto-subscribe webhook when page is selected
  const subscribeWebhook = async (pageId: string) => {
    setSubscribing(pageId);
    setSubscribeStatus(prev => ({ ...prev, [pageId]: 'pending' }));
    try {
      const res  = await fetch('/api/facebook/subscribe-webhook', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ workspace_id: workspaceId, page_id: pageId }),
      });
      const data = await res.json();
      setSubscribeStatus(prev => ({ ...prev, [pageId]: data.success ? 'success' : 'error' }));
    } catch {
      setSubscribeStatus(prev => ({ ...prev, [pageId]: 'error' }));
    } finally {
      setSubscribing(null);
    }
  };

  const handlePageSelect = async (page: any) => {
    onSelectPage(page.page_id);
    // Auto-subscribe when selecting a connected page
    if (page.is_saved && !subscribeStatus[page.page_id]) {
      await subscribeWebhook(page.page_id);
    }
  };

  const toggleForm = async (form: any) => {
    if (!selectedPageId) return;
    setTogglingForm(form.form_id);
    await fetch('/api/facebook/forms', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id:       workspaceId,
        page_id:            selectedPageId,
        form_id:            form.form_id,
        form_name:          form.form_name,
        is_active:          !form.is_active,
        is_tagging_enabled: form.is_tagging_enabled,
        mapping_config:     form.mapping_config,
      }),
    });
    setTogglingForm(null);
    fetchForms(selectedPageId);
  };

  const handleImportLeads = async (form: any) => {
    if (!selectedPageId) return;
    setImportingForm(form.form_id);
    setImportResult(prev => ({ ...prev, [form.form_id]: '' }));
    try {
      const res = await fetch('/api/facebook/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          page_id: selectedPageId,
          form_id: form.form_id,
        })
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(prev => ({
          ...prev,
          [form.form_id]: `Imported ${data.imported_count} leads! (Skipped ${data.duplicate_count} duplicates)`
        }));
        fetchForms(selectedPageId);
      } else {
        setImportResult(prev => ({
          ...prev,
          [form.form_id]: `Error: ${data.error || 'Import failed.'}`
        }));
      }
    } catch (err: any) {
      setImportResult(prev => ({
        ...prev,
        [form.form_id]: `Error: ${err.message || 'Network error.'}`
      }));
    } finally {
      setImportingForm(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Globe className="w-4 h-4" />}
        title="Facebook Pages & Lead Forms"
        subtitle="OAuth से sync हुई pages दिखेंगी। Page select करें — webhook auto-subscribe हो जाएगा।"
      />

      {/* Pages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your Facebook Pages</span>
          <button onClick={fetchPages} disabled={loadingPages}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-all">
            <RefreshCw className={`w-3 h-3 ${loadingPages ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {pageError && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Pages load नहीं हुईं</p>
              <p className="text-[10px] mt-0.5 opacity-70">{pageError}</p>
            </div>
          </div>
        )}

        {loadingPages ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" />)}
          </div>
        ) : pages.length === 0 && !pageError ? (
          <div className="text-center py-10 text-zinc-400 text-xs space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p>कोई page नहीं मिला — पहले "Connect" tab से Facebook login करें।</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => {
              const isSelected    = selectedPageId === page.page_id;
              const subStatus     = subscribeStatus[page.page_id];
              const isSubscribing = subscribing === page.page_id;

              return (
                <div key={page.page_id}
                  onClick={() => page.is_saved ? handlePageSelect(page) : undefined}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/30'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isSelected ? 'bg-gradient-to-br from-[#1877F2] to-[#0C4A9E]' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <FacebookIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#1877F2]'}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">{page.page_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-zinc-400">{page.page_category || 'Page'}</p>
                        {/* Webhook subscribe status badge */}
                        {page.is_saved && (
                          isSubscribing ? (
                            <span className="flex items-center gap-0.5 text-[9px] text-amber-500">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Subscribing...
                            </span>
                          ) : subStatus === 'success' ? (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-500">
                              <Bell className="w-2.5 h-2.5" /> Webhook Active
                            </span>
                          ) : subStatus === 'error' ? (
                            <span className="flex items-center gap-0.5 text-[9px] text-rose-500">
                              <BellOff className="w-2.5 h-2.5" /> Subscribe Failed
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {page.is_saved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">OAuth Synced</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 font-medium">Not saved</span>
                    )}
                    {isSelected && <ChevronDown className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead Forms for selected page */}
      <AnimatePresence>
        {selectedPageId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Lead Forms — {pages.find(p => p.page_id === selectedPageId)?.page_name}
              </span>
              <button
                onClick={() => subscribeWebhook(selectedPageId)}
                disabled={subscribing === selectedPageId}
                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-all font-semibold">
                {subscribing === selectedPageId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                Re-subscribe Webhook
              </button>
            </div>

            {loadingForms ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" />)}</div>
            ) : forms.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-xs">
                <FileText className="w-7 h-7 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                इस page पर कोई Lead Form नहीं है।
              </div>
            ) : (
              <div className="space-y-2">
                {forms.map((form, idx) => (
                  <div key={form.form_id}
                    className={`flex flex-col p-3.5 rounded-xl border transition-all ${
                      form.is_active ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${form.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">{form.form_name}</p>
                          <p className="text-[10px] text-zinc-400">
                            {form.leads_count ?? 0} leads · {form.status}
                            {form.is_tagging_enabled && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${TAG_COLORS[idx % TAG_COLORS.length]}`}>Tagging ON</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Import Leads Button */}
                        <button
                          onClick={() => handleImportLeads(form)}
                          disabled={importingForm === form.form_id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {importingForm === form.form_id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" /> Sync History
                            </>
                          )}
                        </button>
                        <button onClick={() => toggleForm(form)} disabled={togglingForm === form.form_id} className="transition-all disabled:opacity-50">
                          {togglingForm === form.form_id
                            ? <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                            : form.is_active ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-zinc-400" />
                          }
                        </button>
                      </div>
                    </div>
                    {/* Status/Success Message */}
                    {importResult[form.form_id] && (
                      <div className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2.5 py-1.5 rounded-lg border border-blue-500/10 flex items-center justify-between">
                        <span>{importResult[form.form_id]}</span>
                        <button onClick={() => setImportResult(prev => ({ ...prev, [form.form_id]: '' }))} className="text-zinc-400 hover:text-zinc-650 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 3: Field Mapping
// ─────────────────────────────────────────────────────────────
function MappingTab({ workspaceId, selectedPageId }: { workspaceId: string; selectedPageId: string | null }) {
  const [forms, setForms]               = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [mappingConfig, setMappingConfig]   = useState<Record<string, string>>({});
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    if (!selectedPageId) return;
    setLoading(true);
    fetch(`/api/facebook/forms?workspace_id=${workspaceId}&page_id=${selectedPageId}`)
      .then(r => r.json()).then(data => { setForms(data.forms || []); setLoading(false); });
  }, [workspaceId, selectedPageId]);

  useEffect(() => {
    if (!selectedFormId) return;
    const form = forms.find(f => f.form_id === selectedFormId);
    if (form) setMappingConfig(form.mapping_config || {});
  }, [selectedFormId, forms]);

  const autoDetect = () => {
    const form = forms.find(f => f.form_id === selectedFormId);
    if (!form) return;
    const auto: Record<string, string> = {};
    (form.questions || []).forEach((q: any) => {
      const k = (q.key || q.label || '').toLowerCase();
      if      (k.includes('name'))                                 auto[q.key] = 'name';
      else if (k.includes('email'))                                auto[q.key] = 'email';
      else if (k.includes('phone') || k.includes('mobile'))        auto[q.key] = 'phone';
      else if (k.includes('budget') || k.includes('amount'))       auto[q.key] = 'budget';
      else if (k.includes('venue') || k.includes('location'))      auto[q.key] = 'venue';
      else if (k.includes('date'))                                 auto[q.key] = 'event_date';
      else if (k.includes('function') || k.includes('event'))      auto[q.key] = 'functions';
      else                                                          auto[q.key] = 'custom';
    });
    setMappingConfig(auto);
  };

  const saveMappings = async () => {
    if (!selectedPageId || !selectedFormId) return;
    setSaving(true);
    const form = forms.find(f => f.form_id === selectedFormId);
    await fetch('/api/facebook/forms', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId, page_id: selectedPageId,
        form_id: selectedFormId, form_name: form?.form_name || '',
        is_active: form?.is_active ?? true,
        is_tagging_enabled: form?.is_tagging_enabled ?? false,
        mapping_config: mappingConfig,
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedForm = forms.find(f => f.form_id === selectedFormId);

  if (!selectedPageId) {
    return (
      <div className="text-center py-16 text-zinc-400 text-xs space-y-2">
        <Settings className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
        <p>पहले "Pages & Forms" tab में एक page select करें।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Settings className="w-4 h-4" />}
        title="Field Mapping Engine"
        subtitle="Meta form fields को FW Core system fields से map करें। Auto-Detect intelligent mapping करता है।"
      />

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Lead Form चुनें</label>
        {loading ? <div className="h-10 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" /> : (
          <select value={selectedFormId || ''} onChange={e => setSelectedFormId(e.target.value || null)}
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-all">
            <option value="">-- Form select करें --</option>
            {forms.map(f => <option key={f.form_id} value={f.form_id}>{f.form_name}</option>)}
          </select>
        )}
      </div>

      <AnimatePresence>
        {selectedFormId && selectedForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Field Mappings</span>
              <button onClick={autoDetect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-all">
                <Zap className="w-3 h-3" /> Auto-Detect Fields
              </button>
            </div>

            {(selectedForm.questions || []).length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-xs">
                <Info className="w-6 h-6 mx-auto mb-1 text-zinc-300 dark:text-zinc-700" />
                Form questions load नहीं हुए। Webhook पर fuzzy auto-mapping apply होगी।
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Meta Form Field</span><span></span><span>FW Core Field</span>
                </div>
                {(selectedForm.questions || []).map((q: any, idx: number) => {
                  const qKey = q.key || q.name || `field_${idx}`;
                  return (
                    <div key={qKey} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">{qKey}</p>
                        {q.label && <p className="text-[10px] text-zinc-400 truncate">{q.label}</p>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                      <select value={mappingConfig[qKey] || ''} onChange={e => setMappingConfig(prev => ({ ...prev, [qKey]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none">
                        <option value="">-- Select --</option>
                        {SYSTEM_FIELDS.map(sf => <option key={sf.key} value={sf.key}>{sf.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={saveMappings} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 active:scale-95 transition-all disabled:opacity-60">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : saved ? 'Mappings Saved!' : 'Save Mappings'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB 4: Settings & Test
// ─────────────────────────────────────────────────────────────
function SettingsTab({ workspaceId, selectedPageId }: { workspaceId: string; selectedPageId: string | null }) {
  const [forms, setForms]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [togglingTag, setTogglingTag] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simLog, setSimLog]         = useState<string[]>([]);

  useEffect(() => {
    if (!selectedPageId) return;
    setLoading(true);
    fetch(`/api/facebook/forms?workspace_id=${workspaceId}&page_id=${selectedPageId}`)
      .then(r => r.json()).then(data => { setForms(data.forms || []); setLoading(false); });
  }, [workspaceId, selectedPageId]);

  const toggleTagging = async (form: any) => {
    if (!selectedPageId) return;
    setTogglingTag(form.form_id);
    await fetch('/api/facebook/forms', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id:       workspaceId,
        page_id:            selectedPageId,
        form_id:            form.form_id,
        form_name:          form.form_name,
        is_active:          form.is_active,
        is_tagging_enabled: !form.is_tagging_enabled,
        mapping_config:     form.mapping_config,
      }),
    });
    setTogglingTag(null);
    setForms(prev => prev.map(f => f.form_id === form.form_id ? { ...f, is_tagging_enabled: !f.is_tagging_enabled } : f));
  };

  const simulateLead = async (formId: string, formName: string, taggingOn: boolean) => {
    setSimulating(true);
    const names  = ['Priya Sharma', 'Amit Patel', 'Rohit Verma', 'Ananya Iyer'];
    const n      = names[Math.floor(Math.random() * names.length)];
    const phone  = `+919${Math.floor(100000000 + Math.random() * 900000000)}`;
    const budget = ['₹1,50,000', '₹2,50,000', '₹3,00,000', '₹80,000'][Math.floor(Math.random() * 4)];
    try {
      const { error } = await supabase.from('leads').insert({
        workspace_id: workspaceId, name: n,
        email: `${n.split(' ')[0].toLowerCase()}@example.com`, phone,
        source: 'facebook', status: 'new',
        score: budget.includes('3,00') || budget.includes('2,50') ? 'High-Value 🔥' : 'Warm 👍',
        score_reason: `FB Lead test. Form: ${formName}. Budget: ${budget}.`,
        raw_payload: { budget, form_name: formName },
        source_form_id: formId,
        form_tag: taggingOn ? formName : null,
      });
      if (error) throw error;
      setSimLog(prev => [`✅ ${n} | ${phone} | ${budget} | Tag: ${taggingOn ? formName : '—'}`, ...prev].slice(0, 12));
    } catch (err: any) {
      setSimLog(prev => [`❌ Error: ${err.message}`, ...prev].slice(0, 12));
    } finally { setSimulating(false); }
  };

  if (!selectedPageId) {
    return (
      <div className="text-center py-16 text-zinc-400 text-xs space-y-2">
        <Tag className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
        <p>पहले "Pages & Forms" tab में एक page select करें।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Tag className="w-4 h-4" />}
        title="Form Tagging & Lead Simulator"
        subtitle="Tagging ON होने पर lead के साथ form name का badge attach होगा Leads table में।"
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lead Tagging per Form</span>
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" />)}</div>
        ) : forms.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">इस page पर कोई form नहीं है।</p>
        ) : (
          <div className="space-y-2">
            {forms.map((form, idx) => (
              <div key={form.form_id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{form.form_name}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Lead tag:
                      {form.is_tagging_enabled ? (
                        <span className={`ml-2 px-2 py-0.5 rounded-full border text-[9px] font-bold ${TAG_COLORS[idx % TAG_COLORS.length]}`}>{form.form_name}</span>
                      ) : <span className="ml-2 text-zinc-400 italic">कोई tag नहीं</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">{form.is_tagging_enabled ? 'ON' : 'OFF'}</span>
                    <button onClick={() => toggleTagging(form)} disabled={togglingTag === form.form_id} className="transition-all disabled:opacity-50">
                      {togglingTag === form.form_id ? <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" /> : form.is_tagging_enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-400" />}
                    </button>
                  </div>
                </div>
                <button onClick={() => simulateLead(form.form_id, form.form_name, form.is_tagging_enabled)} disabled={simulating}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all">
                  {simulating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3 text-blue-500" />}
                  Inject Test Lead from "{form.form_name}"
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {simLog.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-500" /> Live Log
            </span>
            <button onClick={() => setSimLog([])} className="text-[10px] text-zinc-400 hover:text-rose-500 transition-all flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/60 font-mono space-y-1.5 max-h-48 overflow-y-auto">
            {simLog.map((log, i) => <p key={i} className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-all">{log}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main FacebookAds Component
// ─────────────────────────────────────────────────────────────
export function FacebookAds({ workspaceId }: FacebookAdsProps) {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab]         = useState<TabKey>('connect');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isConnected, setIsConnected]     = useState(false);
  const [connectedPagesCount, setConnectedPagesCount] = useState(0);
  const [checkingAuth, setCheckingAuth]   = useState(true);

  // Check OAuth status on mount
  useEffect(() => {
    const checkConnection = async () => {
      setCheckingAuth(true);
      const { data } = await supabase
        .from('profiles')
        .select('meta_access_token')
        .eq('id', workspaceId)
        .maybeSingle();

      if (data?.meta_access_token) {
        setIsConnected(true);
        // Count saved pages
        const { count } = await supabase
          .from('fb_page_configs')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        setConnectedPagesCount(count || 0);
      }
      setCheckingAuth(false);
    };
    checkConnection();
  }, [workspaceId]);

  // Auto-navigate based on OAuth callback params
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success') === 'true';
    if (oauthSuccess) {
      setIsConnected(true);
      setActiveTab('connect'); // Show success state on connect tab first
    }
    const integration = searchParams.get('integration');
    const tab         = searchParams.get('tab') as TabKey | null;
    if (integration === 'facebook' && tab && ['connect', 'pages', 'mapping', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'connect',  label: 'Connect',      icon: <FacebookIcon className="w-3.5 h-3.5" /> },
    { key: 'pages',    label: 'Pages & Forms', icon: <Globe className="w-3.5 h-3.5" /> },
    { key: 'mapping',  label: 'Field Mapping', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'settings', label: 'Settings',      icon: <Tag className="w-3.5 h-3.5" /> },
  ];

  if (checkingAuth) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 p-12 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/70"
        style={{ background: 'linear-gradient(to right, rgba(24,119,242,0.05), rgba(12,74,158,0.05))' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1877F2, #0C4A9E)' }}>
            <FacebookIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Meta Facebook Ads</h3>
            <p className="text-[10px] text-zinc-500">Lead Ingestion Engine · OAuth 2.0 Secured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {isConnected ? `Connected · ${connectedPagesCount} Page${connectedPagesCount !== 1 ? 's' : ''}` : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800/70 px-6 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 py-3.5 pr-5 text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.key ? 'text-[#1877F2]' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}>
            {tab.icon}{tab.label}
            {activeTab === tab.key && (
              <motion.div layoutId="fb-tab-ul" className="absolute bottom-0 left-0 right-5 h-0.5" style={{ background: '#1877F2' }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {activeTab === 'connect' && (
              <ConnectTab
                workspaceId={workspaceId}
                isConnected={isConnected}
                connectedPagesCount={connectedPagesCount}
                onDisconnect={() => { setIsConnected(false); setConnectedPagesCount(0); setSelectedPageId(null); }}
                onConnectSuccess={(count) => { setIsConnected(true); setConnectedPagesCount(count); }}
              />
            )}
            {activeTab === 'pages' && (
              <PagesTab workspaceId={workspaceId} selectedPageId={selectedPageId} onSelectPage={setSelectedPageId} />
            )}
            {activeTab === 'mapping' && (
              <MappingTab workspaceId={workspaceId} selectedPageId={selectedPageId} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab workspaceId={workspaceId} selectedPageId={selectedPageId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

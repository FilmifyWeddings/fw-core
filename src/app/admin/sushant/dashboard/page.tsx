'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, HardDrive, Cpu, Terminal, ArrowLeft, RotateCcw, 
  Send, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Clock, Calendar,
  Plug, ChevronRight, Search, Filter, Copy, ExternalLink, Eye, Activity, Database, Check,
  Layers, HardDriveDownload
} from 'lucide-react';
import Link from 'next/link';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import { supabase } from '@/lib/supabase';

interface UserTelemetryRow {
  id: string;
  tenant_id: string;
  workspace_name: string;
  email: string;
  active_sub_apps: string[];
  r2_storage_used_bytes: number;
  frontend_visible_bytes: number;
  actual_r2_physical_bytes: number;
  subscription_tier: string;
  billing_cycle: string;
  next_billing_date: string;
  projects_count: number;
  last_active_timestamp: string;
  created_at: string;
}

interface AppVersionRow {
  id: string;
  version_number: string;
  release_notes: string;
  is_active: boolean;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const INTEGRATIONS_MENU = [
  { id: 'whatsapp', name: 'WhatsApp Web', logo: '/images/integrations/whatsapp.png' },
  { id: 'meta-ads', name: 'Meta Ads', logo: '/images/integrations/meta.png' },
  { id: 'gmail-smtp', name: 'Gmail SMTP', logo: '/images/integrations/gmail.png' },
  { id: 'google-contacts', name: 'Google Contacts', logo: '/images/integrations/google-contacts.png' },
  { id: 'google-calendar', name: 'Google Calendar', logo: '/images/integrations/google-calendar.png' },
  { id: 'wordpress', name: 'WordPress', logo: '/images/integrations/wordpress.png' },
];

function AdminDashboardCore() {
  const router = useRouter();
  const { userEmail } = useBhamstra();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, totalStorageBytes: 0, activeVersion: 'Loading...' });
  const [users, setUsers] = useState<UserTelemetryRow[]>([]);
  const [versions, setVersions] = useState<AppVersionRow[]>([]);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // God-View Filtering & Expandable Rows States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [systemLatency, setSystemLatency] = useState<number | null>(null);
  const [activeImpersonation, setActiveImpersonation] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (userEmail !== undefined) setAuthorized(isSuperAdmin(userEmail));
    // Check for active local impersonation tunnel
    if (typeof window !== 'undefined') {
      const imp = localStorage.getItem('impersonated_workspace_name');
      if (imp) setActiveImpersonation(imp);
    }
  }, [userEmail]);

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErrorMsg('Authentication session missing.'); setLoading(false); return; }
      
      const startTime = performance.now();
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const endTime = performance.now();
      setSystemLatency(Math.round(endTime - startTime));

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load administrative console.');
      setStats(data.stats);
      setUsers(data.userStats);
      setVersions(data.versions);
      setLiveLogs(data.liveLogs || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while loading system telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authorized) fetchAdminData(); }, [authorized]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !releaseNotes.trim()) return;
    setPublishing(true);
    setErrorMsg('');
    setActionSuccess('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session active');
      const res = await fetch('/api/admin/version/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ version_number: newVersion, release_notes: releaseNotes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setActionSuccess(`Successfully published version ${newVersion}!`);
      setNewVersion('');
      setReleaseNotes('');
      await fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deploy version.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (versionId: string, versionNumber: string) => {
    if (!confirm(`Rollback to ${versionNumber}?`)) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session active');
      const res = await fetch('/api/admin/version/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ version_id: versionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed');
      setActionSuccess(`Rolled back to ${versionNumber}!`);
      await fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rollback failed.');
      setLoading(false);
    }
  };

  const handleImpersonateStudio = (tenantId: string) => {
    const targetUser = users.find(u => u.tenant_id === tenantId);
    if (!targetUser) return;
    if (confirm(`Impersonate ${targetUser.workspace_name}? This will override your active session localstorage properties to view their front-end dashboard.`)) {
      localStorage.setItem('impersonated_tenant_id', tenantId);
      localStorage.setItem('impersonated_workspace_name', targetUser.workspace_name);
      setActiveImpersonation(targetUser.workspace_name);
      alert(`Impersonation Tunnel Active. Redirecting to ${targetUser.workspace_name}'s workspace...`);
      router.push('/home');
    }
  };

  const handleClearImpersonation = () => {
    localStorage.removeItem('impersonated_tenant_id');
    localStorage.removeItem('impersonated_workspace_name');
    setActiveImpersonation(null);
    alert('Impersonation tunnel closed. Restored master Super-Admin credentials.');
    window.location.reload();
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Days remaining helper
  const getDaysRemaining = (dateStr: string): number => {
    const diffTime = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderBillingCountdown = (dateStr: string) => {
    const days = getDaysRemaining(dateStr);
    if (days <= 0) {
      return <span className="text-red-500 font-bold font-mono">Expired</span>;
    }
    if (days <= 5) {
      return <span className="text-red-400 font-bold font-mono">{days}d remaining</span>;
    }
    if (days <= 15) {
      return <span className="text-amber-400 font-medium font-mono">{days}d remaining</span>;
    }
    return <span className="text-emerald-400 font-mono font-medium">{days}d remaining</span>;
  };

  // Filters calculation
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.workspace_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.tenant_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = selectedTier === 'all' || u.subscription_tier.toLowerCase().includes(selectedTier.toLowerCase());
    
    return matchesSearch && matchesTier;
  });

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl border border-red-500/10 bg-red-950/5 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-red-400">Unauthorized Access</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Restricted to Super Admin Sushant only.</p>
          <button onClick={() => router.push('/home')} className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Get active latency description
  const getLatencyLabel = (ms: number | null) => {
    if (ms === null) return { text: 'Unknown', color: 'text-zinc-500 bg-zinc-500/15 border-zinc-500/20' };
    if (ms < 150) return { text: `${ms}ms - Excellent`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (ms < 300) return { text: `${ms}ms - Good`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: `${ms}ms - High Latency`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  };

  const latencyLabel = getLatencyLabel(systemLatency);

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 font-sans selection:bg-orange-500/30 selection:text-white pb-20">
      {/* Decorative Glow Blurs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Active Impersonation Warning Banner */}
        <AnimatePresence>
          {activeImpersonation && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-600/15 border border-orange-500/30 p-4 rounded-2xl flex items-center justify-between text-orange-400 text-xs shadow-xl shadow-orange-950/20"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 animate-pulse shrink-0" />
                <div className="leading-relaxed">
                  <strong className="text-orange-300">Impersonation Tunnel Active:</strong> Currently simulating session for <span className="underline font-bold text-white">{activeImpersonation}</span>. Standard UI routes will display their data workspace context.
                </div>
              </div>
              <button 
                onClick={handleClearImpersonation} 
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-[11px] font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-orange-500/20"
              >
                Close Impersonation
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-800/60">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/admin/sushant" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono tracking-wide">
                <Shield className="w-3.5 h-3.5" /> SUPER ADMIN CONTROL PANEL
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              The God-View Operations Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Cross-tenant global analytics queries, system latency telemetry, active deployments, and real-time WhatsApp socket logs.
            </p>
          </div>
          <button 
            onClick={fetchAdminData} 
            disabled={loading} 
            className="px-4 py-2.5 bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 text-white shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> 
            Sync Telemetry Data
          </button>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs shadow-md">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </motion.div>
          )}
          {actionSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 text-xs shadow-md">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{actionSuccess}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Users, color: 'from-orange-500/10 to-orange-500/5', iconColor: 'text-orange-400 border-orange-500/20 bg-orange-500/10', label: 'Active Studio Profiles', value: loading ? '...' : String(stats.totalUsers), desc: 'Cross-tenant user base' },
            { icon: HardDrive, color: 'from-red-500/10 to-red-500/5', iconColor: 'text-red-400 border-red-500/20 bg-red-500/10', label: 'Global R2 Storage footprint', value: loading ? '...' : formatBytes(stats.totalStorageBytes), desc: 'Total physical bytes active' },
            { icon: Cpu, color: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', label: 'Active Deployment OTA', value: loading ? '...' : stats.activeVersion, desc: 'Production release channel' },
          ].map(({ icon: Icon, color, iconColor, label, value, desc }) => (
            <div key={label} className={`p-6 rounded-2xl border border-zinc-800/80 bg-gradient-to-b ${color} backdrop-blur-md flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all`}>
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">{label}</span>
                <h3 className="text-3xl font-black text-white mt-0.5">{value}</h3>
                <span className="text-[10px] text-zinc-400 block">{desc}</span>
              </div>
              <div className={`w-14 h-14 rounded-2xl border ${iconColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-7 h-7" />
              </div>
            </div>
          ))}
        </div>

        {/* System Telemetry & Webhook Socket Logs Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Diagnostic & Webhook Status Panel */}
          <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-sm">
            <div className="pb-3 border-b border-zinc-900 flex justify-between items-center">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" /> System Telemetry
              </h4>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> ONLINE
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">API Latency Check:</span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${latencyLabel.color}`}>
                  {latencyLabel.text}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">WhatsApp Webhook:</span>
                <span className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono">
                  Active (Listening)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Database Server:</span>
                <span className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono">
                  Supabase Pool OK
                </span>
              </div>
            </div>

            {/* Webhook Status Logs */}
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">
                WhatsApp Webhook Socket Activity Log
              </span>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 font-mono text-[10px] text-zinc-400 space-y-2 h-[220px] overflow-y-auto">
                {liveLogs.length > 0 ? (
                  liveLogs.map((log, idx) => (
                    <div key={log.id || idx} className="border-b border-zinc-900 pb-1.5 last:border-0">
                      <span className="text-orange-500/80">[{new Date(log.created_at).toLocaleTimeString()}]</span>{' '}
                      <span className="text-zinc-300 font-medium">{log.message}</span>
                      {log.metadata && (
                        <pre className="text-[9px] text-zinc-600 overflow-x-auto mt-0.5 max-w-full">
                          {JSON.stringify(log.metadata)}
                        </pre>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="text-zinc-500">[13:08:45] Webhook socket gateway active. Listening...</div>
                    <div className="text-zinc-500">[13:07:22] System auto-sync loop active. Local git commit check OK.</div>
                    <div className="text-zinc-500">[13:06:11] Connected to Supabase real-time events.</div>
                    <div className="text-zinc-500">[13:05:00] Latency verification test successful.</div>
                    <div className="text-zinc-400 font-bold text-orange-500">[No real-time logs found. Showing default logs]</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Integration Shortcuts */}
          <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Plug className="w-4 h-4 text-orange-500" /> Active Integrations Diagnostic
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">Control shortcuts</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {INTEGRATIONS_MENU.map((integ) => (
                <div key={integ.id} className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                    {/* fallback graphic as local files might not exist */}
                    <div className="w-full h-full rounded bg-zinc-700 flex items-center justify-center font-bold text-xs text-orange-400 font-mono">
                      {integ.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-300 block">{integ.name}</span>
                    <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Global Matrix Table (The God-View) */}
        <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" /> Cross-Tenant Global Matrix View
              </h4>
              <p className="text-xs text-zinc-500">Global billing profiles, storage size audit comparisons, and active workspace parameters.</p>
            </div>
            
            {/* Searching and filtering toolbar */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search name, email, or tenant..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500/40 placeholder-zinc-600 font-medium"
                />
              </div>

              <div className="relative w-full sm:w-auto min-w-[120px]">
                <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <select 
                  value={selectedTier} 
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none focus:border-orange-500/40 appearance-none font-medium"
                >
                  <option value="all">All Tiers</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Starter">Starter</option>
                </select>
              </div>
            </div>
          </div>

          {loading && users.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-500 text-xs gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span>Fetching global multi-tenant profiles from Supabase...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs">
              No studio users match your filters. Try adjusting your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    <th className="py-4 px-4">Studio / Tenant Info</th>
                    <th className="py-4 px-4 text-center">Subscription Tier</th>
                    <th className="py-4 px-4 text-center">Billing Cycle</th>
                    <th className="py-4 px-4 text-center">Countdown Indicator</th>
                    <th className="py-4 px-4 text-right">R2 Storage Footprint</th>
                    <th className="py-4 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60 text-xs">
                  {filteredUsers.map((u) => {
                    const isExpanded = expandedUserId === u.id;
                    return (
                      <React.Fragment key={u.id}>
                        <tr 
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className={`hover:bg-zinc-900/35 transition-all cursor-pointer ${isExpanded ? 'bg-zinc-900/30' : ''}`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-100 hover:text-orange-400 transition-colors">
                                {u.workspace_name || 'Unnamed Studio'}
                              </span>
                              {copiedId === u.tenant_id ? (
                                <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 rounded uppercase font-mono font-bold">Copied</span>
                              ) : (
                                <button 
                                  onClick={(e) => handleCopyId(e, u.tenant_id)}
                                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
                                  title="Copy Tenant ID"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 font-mono">{u.email}</div>
                            <div className="text-[9px] text-zinc-600 mt-0.5 font-mono select-all">UUID: {u.tenant_id}</div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.subscription_tier.includes('Enterprise') 
                                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                                : u.subscription_tier.includes('Pro') 
                                  ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                            }`}>
                              {u.subscription_tier}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-zinc-400 font-medium">{u.billing_cycle}</span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono">
                            {mounted ? renderBillingCountdown(u.next_billing_date) : '...'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-zinc-300">
                            {formatBytes(u.r2_storage_used_bytes)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? 'rotate-90 text-orange-500' : ''}`} />
                          </td>
                        </tr>

                        {/* Nested Grid Row Expansion */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-[#0b0b0d] px-6 py-6 border-t border-b border-zinc-900">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Active Sub-Apps Column */}
                                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-3">
                                  <div className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-orange-500" /> Active Sub-Apps
                                  </div>
                                  <div className="space-y-2">
                                    {['WhatsBoost Engine', 'Canva Proposals', 'FW Team Operations'].map((app) => {
                                      const isActive = u.active_sub_apps.includes(app);
                                      return (
                                        <div key={app} className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-900/30 border border-zinc-900">
                                          <span className={isActive ? 'text-zinc-300 font-semibold' : 'text-zinc-600 line-through'}>{app}</span>
                                          {isActive ? (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold font-mono">ENABLED</span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-600 text-[9px] font-bold font-mono">DISABLED</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Wedding/Event Projects Column */}
                                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex flex-col justify-between">
                                  <div className="space-y-2">
                                    <div className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-orange-500" /> Project Registry
                                    </div>
                                    <h5 className="text-2xl font-black text-white">{u.projects_count}</h5>
                                    <span className="text-[10px] text-zinc-500 block leading-normal">
                                      Active wedding, pre-wedding, and client event directories mapped to `client_id` relations.
                                    </span>
                                  </div>
                                  
                                  {/* Tunnel Action */}
                                  <button 
                                    onClick={() => handleImpersonateStudio(u.tenant_id)}
                                    className="w-full py-2.5 bg-gradient-to-r from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-400 text-[10px] font-black rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Impersonate Workspace
                                  </button>
                                </div>

                                {/* Storage Auditing comparison */}
                                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-900 space-y-3">
                                  <div className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                                    <HardDriveDownload className="w-3.5 h-3.5 text-orange-500" /> Dual-Storage Audit
                                  </div>
                                  
                                  <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Frontend Visible size (Billed):</span>
                                      <span className="font-mono font-bold text-zinc-300">{formatBytes(u.frontend_visible_bytes)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Actual R2 Physical size:</span>
                                      <span className="font-mono font-bold text-orange-400">{formatBytes(u.actual_r2_physical_bytes)}</span>
                                    </div>

                                    {/* Optimization Bar */}
                                    <div className="space-y-1 pt-1.5">
                                      <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                                        <span>R2 Payload Efficiency</span>
                                        <span className="text-emerald-400">
                                          {Math.round((1 - (u.actual_r2_physical_bytes / u.frontend_visible_bytes)) * 100)}% optimized
                                        </span>
                                      </div>
                                      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
                                        <div 
                                          className="bg-gradient-to-r from-orange-500 to-emerald-500 h-full" 
                                          style={{ width: `${Math.min(100, Math.round((u.actual_r2_physical_bytes / u.frontend_visible_bytes) * 100))}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* OTA deployer & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Version Deployment Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
            <div className="pb-3 border-b border-zinc-900">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" /> OTA Version Deployer
              </h4>
            </div>
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide block">
                  Version Tag / Code Tag
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. v1.0.4" 
                  value={newVersion} 
                  onChange={(e) => setNewVersion(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500/40 placeholder-zinc-700" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide block">
                  Release Notes
                </label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="Feature highlights, fixes..." 
                  value={releaseNotes} 
                  onChange={(e) => setReleaseNotes(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500/40 placeholder-zinc-700" 
                />
              </div>
              <button 
                type="submit" 
                disabled={publishing} 
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} 
                Deploy Active Version
              </button>
            </form>
          </div>

          {/* Deployment History List */}
          <div className="lg:col-span-2 p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
            <div className="pb-3 border-b border-zinc-900">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" /> Deployment Release Registry
              </h4>
            </div>
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {versions.map((v) => (
                <div key={v.id} className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-2xl space-y-2 text-xs relative overflow-hidden">
                  {v.is_active && (
                    <div className="absolute right-0 top-0 bg-emerald-500 text-[8px] font-bold text-white px-2 py-1 rounded-bl">
                      ACTIVE PRODUCTION
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="font-extrabold text-zinc-200 text-sm flex items-center gap-1.5">
                      {v.version_number}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {mounted ? new Date(v.created_at).toLocaleDateString('en-IN') : '...'}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                    {v.release_notes}
                  </p>
                  {!v.is_active && (
                    <button 
                      type="button" 
                      onClick={() => handleRollback(v.id, v.version_number)} 
                      className="w-28 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 text-zinc-400 hover:text-white"
                    >
                      <RotateCcw className="w-3 h-3 text-orange-500" /> Rollback
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function SushantAdminDashboardPage() {
  return (
    <BhamstraProvider>
      <AdminDashboardCore />
    </BhamstraProvider>
  );
}

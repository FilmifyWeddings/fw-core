'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, HardDrive, Cpu, Terminal, ArrowLeft, RotateCcw, 
  Send, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Clock, Calendar,
  Plug, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import { supabase } from '@/lib/supabase';

interface UserTelemetryRow {
  id: string;
  workspace_name: string;
  email: string;
  active_sub_apps: string[];
  r2_storage_used_bytes: number;
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
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (userEmail !== undefined) setAuthorized(isSuperAdmin(userEmail));
  }, [userEmail]);

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErrorMsg('Authentication session missing.'); setLoading(false); return; }
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load administrative console.');
      setStats(data.stats);
      setUsers(data.userStats);
      setVersions(data.versions);
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

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl border border-red-500/10 bg-red-950/5 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-red-400">Unauthorized Access</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">Restricted to Super Admin of BHAMSTRA only.</p>
          <button onClick={() => router.push('/home')} className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100">
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/admin/sushant" className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all">
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
              </Link>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono tracking-wide">
                <Shield className="w-3.5 h-3.5" /> SUPER ADMIN COMMAND ENGINE
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">Central Operations Console</h1>
            <p className="text-sm text-zinc-400">OTA version deployments, user telemetry, and integration health.</p>
          </div>
          <button onClick={fetchAdminData} disabled={loading} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Telemetry
          </button>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><div>{errorMsg}</div>
            </motion.div>
          )}
          {actionSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><div>{actionSuccess}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Users, color: 'orange', label: 'Total User Profiles', value: loading ? '...' : String(stats.totalUsers) },
            { icon: HardDrive, color: 'red', label: 'Global R2 Footprint', value: loading ? '...' : formatBytes(stats.totalStorageBytes) },
            { icon: Cpu, color: 'emerald', label: 'Active System OTA', value: loading ? '...' : stats.activeVersion },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md flex items-center gap-4 shadow-sm">
              <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 text-${color}-400 flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{label}</span>
                <h3 className="text-2xl font-black text-white mt-0.5">{value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Integration Shortcuts */}
        <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2"><Plug className="w-4 h-4 text-orange-500" /> Integration Logs Center</h4>
            <Link href="/admin/sushant/integrations" className="text-[10px] text-orange-400 font-mono hover:underline">View All ?</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {INTEGRATIONS_MENU.map((integ) => (
              <Link key={integ.id} href={`/admin/sushant/integrations/${integ.id}`} className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                  <img src={integ.logo} alt={integ.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 text-center leading-tight transition-colors">{integ.name}</span>
                <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-orange-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Telemetry + OTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-orange-500" /> System Tenant Telemetry</h4>
                <span className="text-[10px] text-zinc-500 font-mono">Bypasses RLS Boundaries</span>
              </div>
              {loading && users.length === 0 ? (
                <div className="py-20 flex items-center justify-center text-zinc-500 text-xs gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Fetching multi-tenant stats...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase font-mono">
                      <th className="py-3 px-2">Workspace / Email</th>
                      <th className="py-3 px-2">Sub-Apps</th>
                      <th className="py-3 px-2">R2 Storage</th>
                      <th className="py-3 px-2">Last Active</th>
                    </tr></thead>
                    <tbody className="divide-y divide-zinc-900/60 text-xs">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-900/20 transition-all">
                          <td className="py-3.5 px-2"><div className="font-bold text-zinc-200">{u.workspace_name}</div><div className="text-[10px] text-zinc-500 mt-0.5">{u.email}</div></td>
                          <td className="py-3.5 px-2"><div className="flex flex-wrap gap-1">{u.active_sub_apps.map((app) => <span key={app} className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[9px] font-semibold text-zinc-400">{app}</span>)}</div></td>
                          <td className="py-3.5 px-2 font-mono font-bold text-zinc-300">{formatBytes(u.r2_storage_used_bytes)}</td>
                          <td className="py-3.5 px-2 text-[10px] text-zinc-500 font-mono"><div className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{new Date(u.last_active_timestamp).toLocaleDateString('en-IN')}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
              <div className="pb-3 border-b border-zinc-900"><h4 className="text-sm font-extrabold text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-orange-500" /> OTA Deployer</h4></div>
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Version Tag</label>
                  <input type="text" required placeholder="e.g. v1.0.4" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Release Notes</label>
                  <textarea required rows={3} placeholder="Feature highlights..." value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-orange-500/40" />
                </div>
                <button type="submit" disabled={publishing} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Deploy Active Version
                </button>
              </form>
            </div>

            <div className="p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-4 shadow-sm">
              <div className="pb-3 border-b border-zinc-900"><h4 className="text-sm font-extrabold text-white flex items-center gap-1.5"><Clock className="w-4 h-4 text-orange-500" /> Deployment History</h4></div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {versions.map((v) => (
                  <div key={v.id} className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-2 text-xs relative overflow-hidden">
                    {v.is_active && <div className="absolute right-0 top-0 bg-emerald-500 text-[8px] font-bold text-white px-2 py-0.5 rounded-bl">ACTIVE</div>}
                    <div className="flex justify-between items-center">
                      <div className="font-extrabold text-zinc-200">{v.version_number}</div>
                      <div className="text-[9px] text-zinc-500 flex items-center gap-1 font-mono"><Calendar className="w-3 h-3" />{new Date(v.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2">{v.release_notes}</p>
                    {!v.is_active && (
                      <button type="button" onClick={() => handleRollback(v.id, v.version_number)} className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                        <RotateCcw className="w-3 h-3 text-orange-500" /> Rollback to this
                      </button>
                    )}
                  </div>
                ))}
              </div>
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

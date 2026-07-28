'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import { Wifi, WifiOff, RefreshCw, Smartphone, Clock, AlertTriangle, Loader2, Search, Filter } from 'lucide-react';

function formatTime(ts: string | null) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

function StatusPill({ state }: { state: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    connected: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'CONNECTED' },
    open: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'CONNECTED' },
    connecting: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'CONNECTING' },
    disconnected: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'DISCONNECTED' },
    expired: { cls: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40', label: 'EXPIRED' },
  };
  const c = map[state] || { cls: 'bg-zinc-800 text-zinc-500 border-zinc-700', label: state.toUpperCase() };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${state === 'open' || state === 'connected' ? 'bg-emerald-400 animate-pulse' : state === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
      {c.label}
    </span>
  );
}

interface InstanceRow {
  workspace_id: string;
  phone_number: string | null;
  conn_state: string;
  last_connected: string | null;
  qr_string: string | null;
  updated_at: string | null;
  error_info: string | null;
  reconnect_count: number;
}

export default function WhatsAppAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || '';
      setUserEmail(email);
      setAuthorized(isSuperAdmin(email));
      if (isSuperAdmin(email)) fetchInstances();
    };
    check();
  }, []);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/whatsapp/instances', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) setInstances(json.instances);
    } catch (err) {
      console.error('Failed to fetch instances:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authorized === null) return <div className="min-h-screen flex items-center justify-center bg-black text-zinc-500 text-xs">Checking authorization...</div>;
  if (!authorized) return <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-sm font-bold">Unauthorized — Super Admin only.</div>;

  const filtered = instances.filter(inst => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (inst.phone_number || '').includes(q) || inst.workspace_id.includes(q);
    return matchSearch && (statusFilter === 'all' || inst.conn_state === statusFilter);
  });

  const connected = instances.filter(i => i.conn_state === 'open' || i.conn_state === 'connected').length;
  const connecting = instances.filter(i => i.conn_state === 'connecting').length;
  const disconnected = instances.filter(i => i.conn_state === 'disconnected' || i.conn_state === 'expired').length;

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">WhatsApp Instance Monitor</h1>
            <p className="text-xs text-zinc-500 mt-1">Real-time status of all Baileys WA instances across workspaces</p>
          </div>
          <button onClick={fetchInstances} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Connected', count: connected, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
            { label: 'Connecting', count: connecting, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
            { label: 'Disconnected', count: disconnected, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border ${s.bg} p-5`}>
              <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text" placeholder="Search phone or workspace ID..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/30"
              />
            </div>
            <select
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="open">Connected</option>
              <option value="connecting">Connecting</option>
              <option value="disconnected">Disconnected</option>
              <option value="expired">Expired</option>
            </select>
            <span className="text-[10px] text-zinc-600 font-mono">{filtered.length} instances</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900/60 border-b border-zinc-800/60 text-zinc-500 uppercase text-[9px] font-black tracking-widest">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Workspace ID</th>
                  <th className="py-3 px-4">Last Connected</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4">Reconnects</th>
                  <th className="py-3 px-4">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center text-zinc-600"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-zinc-600"><Smartphone className="w-8 h-8 mx-auto mb-2 text-zinc-800" />No instances found</td></tr>
                ) : filtered.map(inst => (
                  <tr key={inst.workspace_id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4"><StatusPill state={inst.conn_state} /></td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{inst.phone_number || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[9px] text-zinc-500">{inst.workspace_id.slice(0, 18)}...</td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{formatTime(inst.last_connected)}</td>
                    <td className="py-3 px-4 font-mono text-zinc-500">{formatTime(inst.updated_at)}</td>
                    <td className="py-3 px-4 text-zinc-400">{inst.reconnect_count ?? 0}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-red-400/70 font-mono text-[9px]">{inst.error_info || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

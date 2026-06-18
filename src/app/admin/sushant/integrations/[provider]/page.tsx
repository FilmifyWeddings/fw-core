'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Shield, Smartphone, MessageSquare,
  AlertTriangle, CheckCircle2, XCircle, Clock, Users,
  FileText, Wifi, WifiOff, Activity, BarChart3, ChevronDown, ChevronUp
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { isSuperAdmin } from '@/lib/auth/admin-guard';
import { supabase } from '@/lib/supabase';

// ── Provider metadata config ───────────────────────────────────────────────────
const PROVIDER_META: Record<string, { name: string; logo: string; accent: string }> = {
  'whatsapp': { name: 'WhatsApp Web', logo: '/images/integrations/whatsapp.png', accent: 'emerald' },
  'meta-ads': { name: 'Meta Ads Manager', logo: '/images/integrations/meta.png', accent: 'blue' },
  'gmail-smtp': { name: 'Gmail SMTP Server', logo: '/images/integrations/gmail.png', accent: 'red' },
  'google-contacts': { name: 'Google Contacts', logo: '/images/integrations/google-contacts.png', accent: 'green' },
  'google-calendar': { name: 'Google Calendar', logo: '/images/integrations/google-calendar.png', accent: 'blue' },
  'wordpress': { name: 'WordPress Webhook', logo: '/images/integrations/wordpress.png', accent: 'purple' },
};

function formatTime(ts: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } 
  catch { return ts; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    disconnected: 'bg-zinc-800 text-zinc-500 border-zinc-700',
    sent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/15 text-red-400 border-red-500/30',
    error: 'bg-red-500/15 text-red-400 border-red-500/30',
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = map[status?.toLowerCase()] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wide ${cls}`}>{status || 'unknown'}</span>;
}

// ── Collapsible Section ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, count, children, defaultOpen = true }: {
  title: string; icon: any; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-6 text-left"
        onClick={() => setOpen(!open)}
      >
        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-orange-500" />
          {title}
          {count !== undefined && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[9px] font-bold">{count}</span>
          )}
        </h4>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function ProviderLogsCore({ provider }: { provider: string }) {
  const { userEmail } = useBhamstra();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const meta = PROVIDER_META[provider] || { name: provider, logo: '', accent: 'orange' };

  useEffect(() => {
    if (userEmail !== undefined) setAuthorized(isSuperAdmin(userEmail));
  }, [userEmail]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session.');
      const res = await fetch(`/api/admin/integrations/${provider}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch integration data.');
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authorized) fetchData(); }, [authorized]);

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-red-400 font-bold">Super Admin access required.</p>
          <Link href="/home" className="text-xs text-zinc-400 hover:text-white">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/4 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/admin/sushant/integrations" className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all">
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2">
                {meta.logo ? <img src={meta.logo} alt={meta.name} className="w-full h-full object-contain" /> : <Activity className="w-5 h-5 text-orange-400" />}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono tracking-wide">
                ADMIN · INTEGRATION LOGS
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              {meta.name}
            </h1>
            <p className="text-sm text-zinc-400">
              Full telemetry across all workspaces — devices, messages, failures, templates.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><div>{error}</div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="py-32 flex items-center justify-center text-zinc-500 text-xs gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> Loading integration telemetry...
          </div>
        )}

        {data && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Connected Workspaces', value: data.summary.totalConnected, icon: Users, color: 'emerald' },
                { label: 'Active Devices', value: data.summary.totalDevices, icon: Smartphone, color: 'blue' },
                { label: 'Messages Sent', value: data.summary.totalMessagesSent, icon: MessageSquare, color: 'green' },
                { label: 'Failed Messages', value: data.summary.totalMessagesFailed, icon: XCircle, color: 'red' },
                { label: 'Total Templates', value: data.summary.totalTemplates, icon: FileText, color: 'purple' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md space-y-1">
                  <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 text-${color}-400 flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-white">{value ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 font-semibold leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Connected Workspaces */}
            <Section title="Connected Workspaces" icon={Users} count={data.connectedUsers?.length}>
              {data.connectedUsers?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">No workspaces connected to this integration.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase font-mono">
                        <th className="py-3 px-2">Workspace</th>
                        <th className="py-3 px-2">Email</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2">Connected At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 text-xs">
                      {data.connectedUsers.map((u: any) => (
                        <tr key={u.user_id} className="hover:bg-zinc-900/20 transition-all">
                          <td className="py-3 px-2 font-bold text-zinc-200">{u.workspace_name}</td>
                          <td className="py-3 px-2 text-zinc-400 font-mono">{u.email}</td>
                          <td className="py-3 px-2"><StatusBadge status={u.status} /></td>
                          <td className="py-3 px-2 text-zinc-500 text-[10px] font-mono">{formatTime(u.connected_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* WhatsApp Device Sessions */}
            {provider === 'whatsapp' && (
              <>
                <Section title="Connected Devices" icon={Smartphone} count={data.deviceSessions?.length}>
                  {data.deviceSessions?.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4">No WhatsApp devices registered yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.deviceSessions.map((dev: any) => (
                        <div key={dev.id} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${dev.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                              <div>
                                <div className="text-sm font-bold text-zinc-100">{dev.workspace_name}</div>
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{dev.email}</div>
                              </div>
                            </div>
                            <StatusBadge status={dev.status} />
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-zinc-900 rounded-xl p-3 space-y-0.5">
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">Phone JID</div>
                              <div className="text-zinc-300 font-mono text-[11px] truncate">{dev.phone_number || dev.jid || '—'}</div>
                            </div>
                            <div className="bg-zinc-900 rounded-xl p-3 space-y-0.5">
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">Messages Sent</div>
                              <div className="text-emerald-400 font-black text-lg">{dev.message_count ?? 0}</div>
                            </div>
                            <div className="bg-zinc-900 rounded-xl p-3 space-y-0.5">
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">Failed</div>
                              <div className="text-red-400 font-black text-lg">{dev.failed_count ?? 0}</div>
                            </div>
                            <div className="bg-zinc-900 rounded-xl p-3 space-y-0.5">
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">Last Active</div>
                              <div className="text-zinc-400 text-[11px] font-mono">{formatTime(dev.last_active || dev.updated_at || dev.created_at)}</div>
                            </div>
                          </div>

                          {dev.device_name && (
                            <div className="text-[10px] text-zinc-600 font-mono">Device: {dev.device_name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Message Logs */}
                <Section title="Recent Message Logs" icon={MessageSquare} count={data.messageLogs?.length} defaultOpen={false}>
                  {data.messageLogs?.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4">No message logs available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase font-mono">
                            <th className="py-3 px-2">Workspace</th>
                            <th className="py-3 px-2">To (JID)</th>
                            <th className="py-3 px-2">Type</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Time</th>
                            <th className="py-3 px-2">Preview</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 text-xs">
                          {data.messageLogs.map((log: any, i: number) => (
                            <tr key={log.id || i} className="hover:bg-zinc-900/20 transition-all">
                              <td className="py-2.5 px-2 font-bold text-zinc-300 text-[10px]">
                                {log.workspace_name || log.user_id?.slice(0, 8) || '—'}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-zinc-500 text-[10px] truncate max-w-[100px]">{log.to || log.jid || '—'}</td>
                              <td className="py-2.5 px-2 text-zinc-400">{log.message_type || log.type || 'text'}</td>
                              <td className="py-2.5 px-2"><StatusBadge status={log.status} /></td>
                              <td className="py-2.5 px-2 text-zinc-500 text-[10px] font-mono whitespace-nowrap">{formatTime(log.created_at)}</td>
                              <td className="py-2.5 px-2 text-zinc-500 text-[10px] max-w-[150px] truncate">{log.message_preview || log.text?.slice(0, 40) || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>

                {/* Failed Messages */}
                <Section title="Failed Message Deliveries" icon={XCircle} count={data.failedMessages?.length} defaultOpen={true}>
                  {data.failedMessages?.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs py-4">
                      <CheckCircle2 className="w-4 h-4" /> No failed messages. All deliveries successful!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.failedMessages.map((log: any, i: number) => (
                        <div key={log.id || i} className="p-3 rounded-xl border border-red-500/15 bg-red-950/5 flex items-start gap-3 text-xs">
                          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-300">{log.workspace_name || log.user_id?.slice(0, 8)}</span>
                              <span className="text-zinc-600">→</span>
                              <span className="font-mono text-zinc-500 text-[10px]">{log.to || log.jid}</span>
                              <StatusBadge status={log.status} />
                            </div>
                            {log.error_message && (
                              <div className="text-[10px] text-red-400/70 font-mono">{log.error_message}</div>
                            )}
                            <div className="text-[10px] text-zinc-600">{formatTime(log.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Templates */}
                <Section title="Message Templates" icon={FileText} count={data.templateStats?.length} defaultOpen={false}>
                  {data.templateStats?.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4">No templates configured.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase font-mono">
                            <th className="py-3 px-2">Template Name</th>
                            <th className="py-3 px-2">Category</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 text-xs">
                          {data.templateStats.map((t: any) => (
                            <tr key={t.id} className="hover:bg-zinc-900/20 transition-all">
                              <td className="py-3 px-2 font-bold text-zinc-200">{t.name}</td>
                              <td className="py-3 px-2 text-zinc-500">{t.category || '—'}</td>
                              <td className="py-3 px-2"><StatusBadge status={t.status || 'active'} /></td>
                              <td className="py-3 px-2 text-zinc-500 text-[10px] font-mono">{formatTime(t.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Page Export ────────────────────────────────────────────────────────────────
export default function AdminIntegrationProviderPage({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = use(params);
  return (
    <BhamstraProvider>
      <ProviderLogsCore provider={provider} />
    </BhamstraProvider>
  );
}

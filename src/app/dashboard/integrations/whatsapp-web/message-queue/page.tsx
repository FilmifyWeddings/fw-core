'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import {
  Search, RefreshCw, Send, Clock, CheckCircle2, AlertCircle,
  XCircle, Filter, Loader2, Ban, ChevronDown, Shield,
} from 'lucide-react';
import { AntiBanConfigModal } from '@/components/anti-ban-config-modal';

interface QueueMessage {
  id: string;
  wa_message_id: string | null;
  chat_jid: string;
  message_text: string | null;
  status: string;
  created_at: string;
  sent_at: string;
  error_message: string | null;
  media_type: string | null;
}

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    queued: { cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400', label: 'Pending' },
    sent: { cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400', label: 'Sent' },
    delivered: { cls: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400', label: 'Delivered' },
    read: { cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Read' },
    failed: { cls: 'bg-red-500/15 border-red-500/30 text-red-400', label: 'Failed' },
  };
  const c = map[status] || { cls: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${c.cls}`}>
      {status === 'read' || status === 'delivered' || status === 'sent'
        ? <span className="w-1.5 h-1.5 rounded-full bg-current" />
        : status === 'queued' ? <Clock className="w-2.5 h-2.5" />
        : status === 'failed' ? <XCircle className="w-2.5 h-2.5" /> : null}
      {c.label}
    </span>
  );
}

function formatTime(ts: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

export default function MessageQueuePage() {
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [antiBanOpen, setAntiBanOpen] = useState(false);

  const fetchMessages = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      let query = supabase
        .from('baileys_messages')
        .select('*')
        .eq('workspace_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => { fetchMessages(); }, [tenantId]);

  const handleSendNow = async (messageId: string) => {
    setSendingId(messageId);
    try {
      const res = await fetch('/api/integrations/baileys/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, workspaceId: tenantId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages(true);
      } else {
        alert('Failed to re-queue: ' + (data.error || 'Unknown'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleBulkResend = async (config: any) => {
    setAntiBanOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch('/api/integrations/baileys/bulk-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: tenantId, selectedIds: ids, ...config }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.count} messages re-queued with ${config.delayBetweenMs}ms delay`);
        setSelectedIds(new Set());
        fetchMessages(true);
      } else {
        alert('Bulk resend failed: ' + (data.error || 'Unknown'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const filtered = messages.filter(m => {
    const q = searchQuery.toLowerCase();
    return m.chat_jid.includes(q) || (m.message_text || '').toLowerCase().includes(q);
  });

  const pendingCount = messages.filter(m => m.status === 'queued' || m.status === 'failed').length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-zinc-900 dark:text-zinc-100 min-h-screen">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 via-green-400 to-teal-500 bg-clip-text text-transparent">Message Queue</h1>
          <p className="text-[11px] text-zinc-500 mt-1">View, filter, and resend queued or failed messages</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setAntiBanOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Bulk Resend ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => fetchMessages(true)}
            disabled={refreshing}
            className="p-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', count: messages.length, color: 'text-blue-400' },
          { label: 'Pending/Failed', count: pendingCount, color: 'text-amber-400' },
          { label: 'Sent', count: messages.filter(m => m.status === 'sent').length, color: 'text-blue-400' },
          { label: 'Delivered/Read', count: messages.filter(m => m.status === 'delivered' || m.status === 'read').length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text" placeholder="Search JID or text..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/30"
            />
          </div>
          <Filter className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="queued">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
          <span className="text-[10px] text-zinc-500 font-mono">{filtered.length} messages</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 uppercase text-[9px] font-black tracking-widest">
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-zinc-600 text-amber-500 focus:ring-amber-500/30"
                  />
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">JID / Phone</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Media</th>
                <th className="py-3 px-4">Sent At</th>
                <th className="py-3 px-4">Error</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/40">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500/50" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-zinc-500">
                  <Ban className="w-7 h-7 mx-auto mb-2 text-zinc-400 dark:text-zinc-700" />
                  No messages found
                </td></tr>
              ) : filtered.map(msg => (
                <tr key={msg.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors group">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(msg.id)}
                      onChange={() => toggleSelect(msg.id)}
                      className="w-3.5 h-3.5 rounded border-zinc-600 text-amber-500 focus:ring-amber-500/30"
                    />
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={msg.status} /></td>
                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[140px] truncate">{msg.chat_jid}</td>
                  <td className="py-3 px-4 max-w-[200px] truncate text-zinc-700 dark:text-zinc-300">{msg.message_text || '—'}</td>
                  <td className="py-3 px-4 text-zinc-500">{msg.media_type || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[9px] text-zinc-500">{formatTime(msg.sent_at)}</td>
                  <td className="py-3 px-4 max-w-[120px] truncate text-red-400/70 font-mono text-[9px]">{msg.error_message || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    {(msg.status === 'queued' || msg.status === 'failed') && (
                      <button
                        onClick={() => handleSendNow(msg.id)}
                        disabled={sendingId === msg.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[9px] rounded-lg transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
                      >
                        {sendingId === msg.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Send className="w-3 h-3" />}
                        Send Now
                      </button>
                    )}
                    {(msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') && (
                      <span className="text-zinc-500 text-[9px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AntiBanConfigModal
        open={antiBanOpen}
        onClose={() => setAntiBanOpen(false)}
        onConfirm={handleBulkResend}
      />
    </div>
  );
}

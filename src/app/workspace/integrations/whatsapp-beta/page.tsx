'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Zap, QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone, 
  ArrowRight, ShieldCheck, LogOut, MessageSquare, ExternalLink, Globe,
  Activity, Radio, Check, Lock, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WhatsAppBetaConnectModal } from '@/components/integrations/whatsapp-beta-connect-modal';

export default function WhatsAppBetaIntegrationPage() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [instanceData, setInstanceData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [recentMessagesCount, setRecentMessagesCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);

  // 1. Authenticate & load workspace
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const wsId = session.user.id;
      setWorkspaceId(wsId);
      await fetchInstanceData(wsId);
      await fetchCounts(wsId);
    };
    init();
  }, []);

  const fetchCounts = async (wsId: string) => {
    try {
      // 1. Fetch chats to get accurate total count including CRM leads
      const chatsRes = await fetch(`/api/whatsapp-beta/chats?workspace_id=${wsId}`);
      const chatsData = await chatsRes.json();

      const { count: msgCount } = await supabase
        .from('evolution_messages')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsId);

      const { count: contCount } = await supabase
        .from('evolution_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsId);

      const totalContacts = Math.max(contCount || 0, chatsData?.total || 0);
      setContactsCount(totalContacts);
      setRecentMessagesCount(msgCount || 0);
    } catch (_) {}
  };

  const fetchInstanceData = async (wsId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp-beta/instance?workspace_id=${wsId}`);
      const data = await res.json();
      if (data.success) {
        setInstanceData(data.instance);
        setConnectionStatus(data.connection_status || 'DISCONNECTED');
      }
    } catch (err) {
      console.error('[Fetch Instance Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!workspaceId) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/whatsapp-beta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus('DISCONNECTED');
        fetchInstanceData(workspaceId);
      }
    } catch (err) {
      console.error('[Disconnect Error]:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = connectionStatus === 'CONNECTED';

  return (
    <div className="min-h-screen bg-white dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 p-6 md:p-10 space-y-8">
      {/* Top Breadcrumb Header */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
          <Link href="/dashboard/integrations" className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            Integrations Center
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-800 dark:text-zinc-200">WhatsApp Web (Beta)</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono tracking-wide">
              <Zap className="w-3.5 h-3.5" /> EVOLUTION ENGINE (BETA)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white">
              WhatsApp Web & Realtime Web Inbox
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              High-speed 2-way real-time messaging gateway powered by isolated Evolution API instances.
            </p>
          </div>

          {/* Top CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/workspace/chat-beta"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Open Web Inbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connection Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-3 shadow-sm">
                  <img src="/images/integrations/whatsapp.png" alt="WhatsApp" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    Evolution Instance Gateway
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Instance: <span className="font-mono text-zinc-700 dark:text-zinc-300">{instanceData?.instance_name || `ws_${workspaceId.slice(0, 8)}`}</span>
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-xs font-bold capitalize text-zinc-700 dark:text-zinc-300">
                  {connectionStatus}
                </span>
              </div>
            </div>

            {/* Status overview */}
            {isConnected ? (
              <div className="p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Live Web Socket Active
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Connected Device: <b>{instanceData?.phone_number ? `+${instanceData.phone_number}` : 'WhatsApp Account'}</b>. All incoming and outgoing messages are synchronizing in real-time.
                </p>
              </div>
            ) : (
              <div className="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4" /> Device Not Connected
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Scan the QR code from your phone's WhatsApp Linked Devices to link this workspace instance.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {isConnected ? (
                <>
                  <Link
                    href="/workspace/chat-beta"
                    className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <MessageSquare className="w-4 h-4" /> Launch Web Inbox
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                >
                  <QrCode className="w-4 h-4" /> Connect with QR Code
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Total Synced Contacts</span>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{contactsCount}</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Total Messages Synced</span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{recentMessagesCount}</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Architecture / Engine Highlights */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Multi-Tenant Isolation
            </h4>
            <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Dedicated isolated instance per workspace.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Runs independently side-by-side with Baileys.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><b>Zero DB Blob Rule:</b> Media streams on-demand without storage bloat.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Supabase Realtime Webhook integration for instant push.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connect QR Modal */}
      {workspaceId && (
        <WhatsAppBetaConnectModal
          isOpen={modalOpen}
          onClose={() => { 
            setModalOpen(false); 
            fetchInstanceData(workspaceId); 
            fetchCounts(workspaceId);
          }}
          workspaceId={workspaceId}
          onConnectionChange={(status) => {
            setConnectionStatus(status);
            fetchInstanceData(workspaceId);
            fetchCounts(workspaceId);
          }}
        />
      )}
    </div>
  );
}

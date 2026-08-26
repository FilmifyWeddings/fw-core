'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  X, RefreshCw, CheckCircle2, Smartphone, 
  ArrowRight, ShieldCheck, Zap, LogOut, MessageSquare, ExternalLink, QrCode
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WhatsAppBetaConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onConnectionChange?: (status: 'CONNECTED' | 'DISCONNECTED') => void;
}

export function WhatsAppBetaConnectModal({
  isOpen,
  onClose,
  workspaceId,
  onConnectionChange,
}: WhatsAppBetaConnectModalProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(25);
  const [instanceData, setInstanceData] = useState<any>(null);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const qrStringRef = useRef<string | null>(null);

  // 1. Stop all listeners
  const stopAll = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // 2. Poll fallback for status
  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/integrations/baileys/qr-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.isConnected && data.phone_number) {
        setConnectionStatus('CONNECTED');
        setPhoneNumber(data.phone_number);
        setQrString(null);
        qrStringRef.current = null;
        onConnectionChange?.('CONNECTED');
        stopAll();
      } else if (data.qr_string) {
        setConnectionStatus('CONNECTING');
        if (data.qr_string !== qrStringRef.current) {
          qrStringRef.current = data.qr_string;
          setQrString(data.qr_string);
          setCountdown(25);
        }
      }
    } catch (_) {}
  }, [onConnectionChange, stopAll]);

  // 3. Connect live SSE socket stream for real-time QR generation
  const startLiveStream = useCallback(async () => {
    stopAll();
    setLoading(true);
    setQrString(null);
    qrStringRef.current = null;
    setCountdown(25);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      // Check existing connection first
      const statusRes = await fetch('/api/integrations/baileys/qr-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (statusRes.ok) {
        const d = await statusRes.json();
        if (d.isConnected && d.phone_number) {
          setConnectionStatus('CONNECTED');
          setPhoneNumber(d.phone_number);
          setLoading(false);
          onConnectionChange?.('CONNECTED');
          return;
        }
      }

      // Open Live SSE stream to generate active WebSocket QR code
      const sse = new EventSource(`/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`);
      sseRef.current = sse;

      sse.addEventListener('qr', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.qr) {
            qrStringRef.current = d.qr;
            setQrString(d.qr);
            setConnectionStatus('CONNECTING');
            setLoading(false);
            setRefreshing(false);
            setCountdown(25);
          }
        } catch (_) {}
      });

      sse.addEventListener('connected', (e) => {
        try {
          const d = JSON.parse(e.data);
          setConnectionStatus('CONNECTED');
          setPhoneNumber(d.phone || null);
          setQrString(null);
          qrStringRef.current = null;
          setLoading(false);
          setRefreshing(false);
          onConnectionChange?.('CONNECTED');
          stopAll();
        } catch (_) {}
      });

      sse.addEventListener('baileys-error', () => {
        setLoading(false);
        setRefreshing(false);
      });

      sse.onerror = () => {
        // Fallback to polling if SSE drops
        if (!pollRef.current) {
          pollRef.current = setInterval(checkStatus, 3000);
        }
      };

      // Periodic status polling alongside SSE
      pollRef.current = setInterval(checkStatus, 3000);

      // Countdown timer for automatic fresh QR generation
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // QR expired -> auto-request fresh live QR
            startLiveStream();
            return 25;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error('[WhatsApp Connect Error]:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkStatus, onConnectionChange, stopAll]);

  // 4. Lifecycle: Mount / Unmount
  useEffect(() => {
    if (isOpen) {
      startLiveStream();
    } else {
      stopAll();
    }
    return () => {
      stopAll();
    };
  }, [isOpen, startLiveStream, stopAll]);

  // 5. Force Refresh QR Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        // Hard reset stale session
        await fetch('/api/integrations/baileys/force-reset', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (_) {}
    startLiveStream();
  };

  // 6. Disconnect handler
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        await fetch('/api/integrations/baileys/force-reset', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setConnectionStatus('DISCONNECTED');
      setPhoneNumber(null);
      setQrString(null);
      qrStringRef.current = null;
      onConnectionChange?.('DISCONNECTED');
      startLiveStream();
    } catch (err) {
      console.error('[Disconnect Error]:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isOpen) return null;

  const qrImageUrl = qrString 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrString)}&bgcolor=ffffff&color=111b21&qzone=2&format=png`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">WhatsApp Web (Beta)</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Multi-Tenant 2-Way Realtime Web Inbox</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading && !qrImageUrl && connectionStatus !== 'CONNECTED' ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-semibold text-zinc-500">Generating fresh WhatsApp QR code...</p>
            </div>
          ) : connectionStatus === 'CONNECTED' ? (
            /* Connected State */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">WhatsApp Web Connected</h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {phoneNumber ? `+${phoneNumber}` : 'Active Session'} (Ready for 2-way sync)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Engine:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">WhatsApp Web Cloud Gateway</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Sync Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">2-Way Live Ingress Active ✓</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/workspace/chat-beta"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> Launch Live Web Inbox <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            /* QR Pairing State */
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="relative p-3 rounded-2xl bg-white border border-zinc-200 shadow-md flex flex-col items-center justify-center w-64 h-64 shrink-0 overflow-hidden">
                  {qrImageUrl ? (
                    <img 
                      key={qrString}
                      src={qrImageUrl} 
                      alt="WhatsApp QR Code" 
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 space-y-3 p-2 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                      <span className="text-[11px] font-medium text-zinc-500">Connecting to WhatsApp...</span>
                    </div>
                  )}

                  {/* Auto-refresh timer pill */}
                  {qrImageUrl && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-900/90 text-white text-[9px] font-mono shadow backdrop-blur-sm">
                      {countdown}s
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-xs flex-1">
                  <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" /> How to connect:
                  </h4>
                  <ol className="space-y-2.5 text-zinc-500 dark:text-zinc-400 list-decimal list-inside leading-relaxed">
                    <li>Open <b>WhatsApp</b> on your phone</li>
                    <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> & select <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point your camera at this QR code</li>
                  </ol>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    ⚡ Live QR refreshes automatically every {countdown}s to ensure instant handshake.
                  </div>
                </div>
              </div>

              {/* Refresh Action & Direct Link */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Generate New QR Code'}
                </button>

                <Link
                  href="/workspace/chat-beta"
                  onClick={onClose}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                >
                  Open Inbox Preview <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Multi-Tenant WhatsApp Web Gateway • End-to-End Encrypted Session</span>
        </div>
      </motion.div>
    </div>
  );
}

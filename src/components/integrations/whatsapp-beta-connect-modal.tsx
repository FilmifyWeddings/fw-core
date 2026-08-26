'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone, 
  ArrowRight, ShieldCheck, Zap, LogOut, MessageSquare, ExternalLink
} from 'lucide-react';

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
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instanceData, setInstanceData] = useState<any>(null);
  const [countdown, setCountdown] = useState(25);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch live connection & QR state
  const fetchStatusAndQr = useCallback(async () => {
    if (!workspaceId) return;
    try {
      // First check instance state
      const instRes = await fetch(`/api/whatsapp-beta/instance?workspace_id=${workspaceId}`);
      const instData = await instRes.json();

      if (instData.success) {
        setInstanceData(instData.instance);
        const status = instData.connection_status || 'DISCONNECTED';
        setConnectionStatus(status);

        if (status === 'CONNECTED') {
          setQrCode(null);
          onConnectionChange?.('CONNECTED');
          return;
        }
      }

      // Fetch QR from /api/whatsapp-beta/qr
      const qrRes = await fetch(`/api/whatsapp-beta/qr?workspace_id=${workspaceId}`);
      const qrData = await qrRes.json();

      if (qrData.success) {
        if (qrData.is_connected || qrData.state === 'open' || qrData.state === 'CONNECTED' || qrData.connection_status === 'CONNECTED') {
          setConnectionStatus('CONNECTED');
          setQrCode(null);
          onConnectionChange?.('CONNECTED');
        } else {
          const rawQr = qrData.qrcode || qrData.base64 || qrData.raw?.qrcode?.base64 || qrData.raw?.base64 || null;
          const formattedQr = rawQr?.startsWith('data:') ? rawQr : rawQr ? `data:image/png;base64,${rawQr}` : null;
          setQrCode(formattedQr);
          setPairingCode(qrData.pairingCode || qrData.pairing_code || qrData.raw?.pairingCode || null);
          setCountdown(25);
        }
      }
    } catch (err) {
      console.error('[WhatsApp Beta Connect Modal Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, onConnectionChange]);

  // 2. Poll for connection when modal is open and not connected
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchStatusAndQr();

      // Poll connection status every 3s
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/whatsapp-beta/qr?workspace_id=${workspaceId}`);
          const data = await res.json();
          if (data.success && (data.is_connected || data.state === 'open' || data.connection_status === 'CONNECTED')) {
            setConnectionStatus('CONNECTED');
            setQrCode(null);
            onConnectionChange?.('CONNECTED');
          } else if (data.qrcode && !qrCode) {
            const rawQr = data.qrcode || data.base64;
            const formattedQr = rawQr?.startsWith('data:') ? rawQr : rawQr ? `data:image/png;base64,${rawQr}` : null;
            setQrCode(formattedQr);
          }
        } catch (_) {}
      }, 3000);

      // Countdown ticker for QR refresh
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchStatusAndQr();
            return 25;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        clearInterval(countdownInterval);
      };
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isOpen, workspaceId, fetchStatusAndQr, onConnectionChange, qrCode]);

  // 3. Disconnect handler
  const handleDisconnect = async () => {
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
        onConnectionChange?.('DISCONNECTED');
        fetchStatusAndQr();
      }
    } catch (err) {
      console.error('[Disconnect Error]:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isOpen) return null;

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
                  Evolution API
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Multi-Tenant 2-Way Realtime Web Sync</p>
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
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-semibold text-zinc-500">Initializing Evolution Engine & Instance...</p>
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
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">WhatsApp Web Live Connected</h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {instanceData?.phone_number ? `+${instanceData.phone_number}` : 'Active Session'} 
                    {instanceData?.profile_name ? ` (${instanceData.profile_name})` : ''}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Engine:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Evolution API v2</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Instance ID:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{instanceData?.instance_name || `ws_${workspaceId.slice(0, 8)}`}</span>
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
                <div className="relative p-3 rounded-2xl bg-white border border-zinc-200 shadow-md flex items-center justify-center w-60 h-60 shrink-0">
                  {qrCode ? (
                    <img 
                      src={qrCode} 
                      alt="Scan QR" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 space-y-2">
                      <QrCode className="w-10 h-10 animate-pulse text-emerald-500" />
                      <span className="text-[11px] font-medium text-zinc-500">Generating QR...</span>
                    </div>
                  )}

                  {/* Auto-refresh timer ring */}
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[9px] font-mono shadow">
                    {countdown}s
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-xs flex-1">
                  <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" /> How to connect:
                  </h4>
                  <ol className="space-y-2 text-zinc-500 dark:text-zinc-400 list-decimal list-inside leading-relaxed">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> & select <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point your camera at this QR code</li>
                  </ol>
                  
                  {pairingCode && (
                    <div className="pt-2">
                      <span className="text-[10px] text-zinc-400">Pairing Code:</span>
                      <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 inline-block ml-1.5">
                        {pairingCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Refresh Action & Direct Link */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => { setRefreshing(true); fetchStatusAndQr(); }}
                  disabled={refreshing}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh QR Code
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
          <span>Independent Evolution Gateway • Runs parallel without affecting Baileys engine.</span>
        </div>
      </motion.div>
    </div>
  );
}

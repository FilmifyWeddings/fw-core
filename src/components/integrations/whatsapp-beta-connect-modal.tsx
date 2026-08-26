'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone, 
  ArrowRight, ShieldCheck, Zap, LogOut, MessageSquare, ExternalLink,
  Settings, Save, Check, Copy
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Server config editor states
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current server config
  const fetchConfig = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/whatsapp-beta/config?workspace_id=${workspaceId}`);
      const data = await res.json();
      if (data.success && data.server_url) {
        setServerUrl(data.server_url);
      }
    } catch (_) {}
  }, [workspaceId]);

  // 2. Fetch live connection & QR state
  const fetchStatusAndQr = useCallback(async () => {
    if (!workspaceId) return;
    setErrorMessage(null);
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
          const formattedQr = rawQr?.startsWith('data:') || rawQr?.startsWith('http') ? rawQr : rawQr ? `data:image/png;base64,${rawQr}` : null;
          
          if (formattedQr) {
            setQrCode(formattedQr);
            setErrorMessage(null);
          } else if (qrData.rawCode) {
            setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData.rawCode)}&bgcolor=ffffff&color=111b21&qzone=2&format=png`);
          }

          setPairingCode(qrData.pairingCode || qrData.pairing_code || qrData.raw?.pairingCode || null);
          setCountdown(25);
        }
      } else {
        if (qrData.error) {
          setErrorMessage(qrData.error);
        }
      }
    } catch (err: any) {
      console.error('[WhatsApp Beta Connect Modal Error]:', err);
      setErrorMessage(err?.message || 'Failed to connect to Evolution Engine');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, onConnectionChange]);

  // 3. Save Custom Server Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || savingConfig) return;
    setSavingConfig(true);
    setConfigSuccess(false);

    try {
      const res = await fetch('/api/whatsapp-beta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          server_url: serverUrl,
          api_key: apiKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfigSuccess(true);
        setTimeout(() => setShowConfig(false), 800);
        fetchStatusAndQr();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // 4. Poll for connection when modal is open and not connected
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchConfig();
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
            setQrCode(data.qrcode);
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
  }, [isOpen, workspaceId, fetchConfig, fetchStatusAndQr, onConnectionChange, qrCode]);

  // 5. Disconnect handler
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
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowConfig(!showConfig)}
              title="Evolution Server Settings"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                showConfig ? 'bg-emerald-500/20 text-emerald-500' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Config Drawer */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 p-5 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-emerald-500" /> Evolution Server Settings
                </h4>
                {configSuccess && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Evolution Base URL</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8085 or https://evolution.yourdomain.com"
                    className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Global API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="studiocore_evo_secret_2026"
                    className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="px-3 py-1.5 text-xs text-zinc-500 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> {savingConfig ? 'Saving...' : 'Save & Connect'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-semibold text-zinc-500">Connecting to Evolution Engine...</p>
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
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{instanceData?.instance_name || `ws_${workspaceId.replace(/[^a-zA-Z0-9]/g, '_')}`}</span>
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
              {/* Error banner if unreachable */}
              {errorMessage && !qrCode && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold text-xs">Evolution API Server Not Connected</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        VPS microservice is currently offline. You can connect using the built-in <b>Direct WhatsApp Engine</b> (Zero Setup) or configure your VPS Server URL.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/10">
                    <Link
                      href="/dashboard/integrations/whatsapp-web"
                      onClick={onClose}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow transition-all"
                    >
                      ⚡ Connect Direct Engine (Zero VPS Setup) →
                    </Link>
                    <button
                      onClick={() => setShowConfig(true)}
                      className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 transition-all"
                    >
                      ⚙️ VPS Settings
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="relative p-3 rounded-2xl bg-white border border-zinc-200 shadow-md flex flex-col items-center justify-center w-64 h-64 shrink-0 overflow-hidden">
                  {qrCode ? (
                    <img 
                      src={qrCode} 
                      alt="WhatsApp QR" 
                      className="w-full h-full object-contain bg-white p-1 rounded-xl shadow-inner"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 space-y-3 p-2 text-center">
                      <QrCode className="w-10 h-10 animate-pulse text-emerald-500" />
                      <span className="text-[11px] font-medium text-zinc-500">Connecting to Engine...</span>
                      <button
                        onClick={() => { setRefreshing(true); fetchStatusAndQr(); }}
                        disabled={refreshing}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-all shadow"
                      >
                        {refreshing ? 'Generating...' : '⚡ Retry Generate QR'}
                      </button>
                    </div>
                  )}

                  {/* Auto-refresh timer ring */}
                  {qrCode && (
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
                  <ol className="space-y-2 text-zinc-500 dark:text-zinc-400 list-decimal list-inside leading-relaxed">
                    <li>Open WhatsApp on your phone</li>
                    <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> & select <b>Linked Devices</b></li>
                    <li>Tap <b>Link a Device</b> and point your camera at this QR code</li>
                  </ol>
                  
                  {pairingCode && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Or Link with Pairing Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 tracking-wider">
                          {pairingCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(pairingCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
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

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-semibold"
                  >
                    Server Settings
                  </button>
                  <Link
                    href="/workspace/chat-beta"
                    onClick={onClose}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                  >
                    Open Inbox <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
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

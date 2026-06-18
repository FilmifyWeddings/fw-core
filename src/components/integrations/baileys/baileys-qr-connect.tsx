'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Wifi, WifiOff, RefreshCw, Smartphone,
  Shield, Zap, Clock, AlertCircle, Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnState = 'disconnected' | 'connecting' | 'open' | 'error';

// ─── QR Code Renderer (via free API — no external dep needed in browser) ──────
function QrCodeImage({ qrString, animated }: { qrString: string; animated?: boolean }) {
  const encoded = encodeURIComponent(qrString);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encoded}&bgcolor=111111&color=e5e7eb&qzone=2&format=png`;

  return (
    <div className="relative inline-block">
      {/* Animated scanner line */}
      {animated && (
        <motion.div
          className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-10 rounded-full"
          animate={{ y: [0, 252, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          style={{ top: 4 }}
        />
      )}

      <div className="p-3 bg-[#111111] rounded-2xl border border-zinc-700/60 shadow-[0_0_40px_rgba(16,185,129,0.12)]">
        <img
          src={qrUrl}
          alt="WhatsApp QR Code — Scan with your phone"
          width={260}
          height={260}
          className="rounded-xl block"
          draggable={false}
        />
      </div>

      {/* Corner accent decorations */}
      {[
        'top-2 left-2 border-t border-l',
        'top-2 right-2 border-t border-r',
        'bottom-2 left-2 border-b border-l',
        'bottom-2 right-2 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-5 h-5 ${cls} border-emerald-400 rounded-sm pointer-events-none`}
        />
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ state }: { state: ConnState }) {
  const configs: Record<ConnState, { label: string; color: string; dot: string }> = {
    disconnected: { label: 'Disconnected', color: 'text-zinc-500 bg-zinc-800/60 border-zinc-700', dot: 'bg-zinc-600' },
    connecting:   { label: 'Connecting...', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400 animate-pulse' },
    open:         { label: 'Connected ✅', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
    error:        { label: 'Connection Failed', color: 'text-red-400 bg-red-500/10 border-red-500/30', dot: 'bg-red-400' },
  };
  const c = configs[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BaileysQrConnectProps {
  workspaceId: string;
}

export function BaileysQrConnect({ workspaceId }: BaileysQrConnectProps) {
  const [connState, setConnState] = useState<ConnState>('disconnected');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [lastConnected, setLastConnected] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Poll fallback: fetch QR status from DB every 2s ──────────────────────
  const startPolling = useCallback((runImmediately = false) => {
    if (pollRef.current) clearInterval(pollRef.current);
    
    // Set start time of this polling cycle
    pollStartRef.current = Date.now();

    const fetchStatus = async () => {
      try {
        // Enforce the 45 seconds polling window
        if (Date.now() - pollStartRef.current > 45000) {
          console.log('[polling] 45s connection window exceeded. Stopping...');
          stopPolling();
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
          setConnState('disconnected');
          setStatusMsg('Connection window timed out. Please try again.');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/integrations/baileys/qr-status', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (data.conn_state === 'open') {
          setConnState('open');
          setPhoneNumber(data.phone_number);
          setLastConnected(data.last_connected);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (data.qr_string) {
          if (data.qr_expired) {
            setQrString(null);
            setStatusMsg('QR expired. Please reconnect.');
          } else {
            setQrString(data.qr_string);
            setConnState('connecting');
          }
        } else if (data.conn_state === 'disconnected') {
          setQrString(null);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (runImmediately) {
      fetchStatus();
    }

    pollRef.current = setInterval(fetchStatus, 2000);
  }, [stopPolling]);

  // ── Connect via SSE ───────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    setConnState('connecting');
    setQrString(null);
    setStatusMsg('Initializing WhatsApp connection...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setIsStarting(false); return; }

      // Close existing SSE
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

      // Open SSE stream to qr-init endpoint
      const sse = new EventSource(
        `/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`
      );
      sseRef.current = sse;

      sse.addEventListener('status', (e) => {
        const d = JSON.parse(e.data);
        setStatusMsg(d.message ?? '');
      });

      sse.addEventListener('qr', (e) => {
        const d = JSON.parse(e.data);
        setQrString(d.qr);
        setConnState('connecting');
        setStatusMsg('Scan the QR code with WhatsApp');
        setIsStarting(false);
      });

      sse.addEventListener('connected', (e) => {
        const d = JSON.parse(e.data);
        setConnState('open');
        setPhoneNumber(d.phone);
        setLastConnected(new Date().toISOString());
        setQrString(null);
        setStatusMsg('');
        sse.close();
        stopPolling();
      });

      sse.addEventListener('baileys-error', (e) => {
        const d = JSON.parse((e as MessageEvent).data ?? '{}');
        setConnState('error');
        setStatusMsg(d.message ?? 'Gateway connection error');
        setIsStarting(false);
        sse.close();
        stopPolling();
      });

      sse.addEventListener('done', () => {
        sse.close();
      });

      sse.onerror = () => {
        // SSE error (network issue) — fallback to polling
        setStatusMsg('SSE connection lost — falling back to polling...');
        startPolling(true);
        setIsStarting(false);
      };

      // Also start polling as redundancy fallback
      startPolling();
    } catch (err) {
      console.error('QR init error:', err);
      setConnState('error');
      setStatusMsg('Failed to start QR session. Please try again.');
      setIsStarting(false);
    }
  }, [isStarting, startPolling, stopPolling]);

  // Load existing status on mount
  useEffect(() => {
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/integrations/baileys/qr-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data.conn_state === 'open') {
        setConnState('open');
        setPhoneNumber(data.phone_number);
        setLastConnected(data.last_connected);
      } else if (data.qr_string && !data.qr_expired) {
        setQrString(data.qr_string);
        setConnState('connecting');
        startPolling();
      }
    };
    checkExisting();
    return () => { sseRef.current?.close(); stopPolling(); };
  }, [startPolling, stopPolling]);

  const handleDisconnect = async () => {
    sseRef.current?.close();
    stopPolling();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch('/api/integrations/baileys/qr-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    setConnState('disconnected');
    setQrString(null);
    setPhoneNumber(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[520px] flex flex-col items-center justify-center p-8">
      <AnimatePresence mode="wait">

        {/* ── CONNECTED ── */}
        {connState === 'open' && (
          <motion.div
            key="connected"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            {/* Animated success ring */}
            <div className="relative">
              <motion.div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-[0_0_70px_rgba(16,185,129,0.45)]"
                animate={{
                  boxShadow: [
                    '0 0 40px rgba(16,185,129,0.3)',
                    '0 0 90px rgba(16,185,129,0.7)',
                    '0 0 40px rgba(16,185,129,0.3)',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <CheckCircle className="w-16 h-16 text-white" strokeWidth={1.5} />
              </motion.div>
              {[0.7, 1.4, 2.1].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-emerald-400/30"
                  animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay }}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold text-white">WhatsApp Connected!</h3>
              {phoneNumber && (
                <p className="text-emerald-400 font-mono text-sm bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-block">
                  +{phoneNumber}
                </p>
              )}
              {lastConnected && (
                <p className="text-[11px] text-zinc-500 flex items-center gap-1 justify-center mt-1">
                  <Clock className="w-3 h-3" />
                  Connected at {new Date(lastConnected).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { icon: Zap, label: 'Direct Gateway' },
                { icon: Shield, label: 'End-to-End Encrypted' },
                { icon: Wifi, label: 'Session Active' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  <Icon className="w-3 h-3" /> {label}
                </span>
              ))}
            </div>

            <button
              onClick={handleDisconnect}
              className="text-xs text-zinc-600 hover:text-red-400 underline underline-offset-2 transition-colors"
            >
              Disconnect & Reset Session
            </button>
          </motion.div>
        )}

        {/* ── CONNECTING + QR ── */}
        {(connState === 'connecting') && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col items-center gap-5"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">
                  {qrString ? 'Scan QR Code' : 'Generating QR...'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {qrString
                  ? 'Open WhatsApp → ⋮ Menu → Linked Devices → Link a Device'
                  : statusMsg || 'Please wait...'}
              </p>
            </div>

            {/* QR or spinner */}
            {qrString ? (
              <QrCodeImage qrString={qrString} animated />
            ) : (
              <div className="w-72 h-72 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-4 bg-zinc-900/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-8 h-8 text-emerald-400/60" />
                </motion.div>
                <span className="text-xs text-zinc-600">
                  {statusMsg || 'Starting socket...'}
                </span>
              </div>
            )}

            {/* SSE indicator */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-600 bg-zinc-900/40 border border-zinc-800 px-3 py-1.5 rounded-full">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              Live SSE stream active — session will auto-connect on scan
            </div>
          </motion.div>
        )}

        {/* ── DISCONNECTED / ERROR ── */}
        {(connState === 'disconnected' || connState === 'error') && (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-7 max-w-md text-center"
          >
            {/* Icon */}
            <div className="relative">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl border ${
                connState === 'error'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-zinc-900 border-zinc-700'
              }`}>
                <Smartphone className={`w-12 h-12 ${connState === 'error' ? 'text-red-400' : 'text-zinc-500'}`} />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-2 border-[#070708] flex items-center justify-center">
                <WifiOff className="w-3 h-3 text-white" />
              </div>
            </div>

            {connState === 'error' && statusMsg && (
              <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-left w-full max-w-sm">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{statusMsg}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                {connState === 'error' ? 'Connection Failed' : 'WhatsApp Gateway — Not Connected'}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {connState === 'error'
                  ? 'Dobara try karo. Agar problem continue kare toh session reset karo.'
                  : 'Connect your WhatsApp using the direct connection gateway. No API fees, no external worker needed! 🚀'}
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {['Direct Connection', 'SSE Real-time QR', 'Auto Session Persist', 'Blue Tick Tracking', 'Group Dispatch (WGL)'].map(f => (
                <span key={f} className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700 text-zinc-400 font-medium">
                  {f}
                </span>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              onClick={handleConnect}
              disabled={isStarting}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-black font-bold text-sm shadow-[0_8px_30px_rgba(16,185,129,0.35)] disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative flex items-center gap-2">
                {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                {isStarting ? 'Starting SSE stream...' : connState === 'error' ? 'Retry Connection' : 'Connect WhatsApp'}
              </span>
            </motion.button>

            {/* Info note */}
            <div className="flex items-start gap-2 text-left bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 max-w-sm w-full">
              <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Direct Connection:</span>{' '}
                Koi third-party server chahiye nahi! App directly secure connection generate karegi aur settings Supabase mein save karegi.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status badge — always visible */}
      <div className="mt-6">
        <StatusBadge state={connState} />
      </div>
    </div>
  );
}

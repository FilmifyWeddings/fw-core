'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Wifi, WifiOff, RefreshCw, Smartphone,
  ShieldCheck, Zap, Clock, AlertCircle, Radio, Eye, EyeOff,
  Laptop, ExternalLink, Lock, ArrowRight, HelpCircle, CheckSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnState = 'disconnected' | 'connecting' | 'open' | 'error';

// ─── Official WhatsApp Brand Mark Icon ────────────────────────────────────────
function WhatsAppWebLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className={`${sizeClasses} rounded-full bg-[#00A884] text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-[#00A884]/25`}>
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
      </svg>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ state }: { state: ConnState }) {
  const configs: Record<ConnState, { label: string; color: string; dot: string }> = {
    disconnected: { label: 'Disconnected', color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
    connecting:   { label: 'Connecting to Gateway...', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500 animate-pulse' },
    open:         { label: 'Connected & Active 🟢', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
    error:        { label: 'Connection Failed', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  };
  const c = configs[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${c.color}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── QR Code Image Component (with Blur / Reveal Feature) ────────────────────
function ProtectedQrImage({
  qrString,
  isRevealed,
  onToggleReveal
}: {
  qrString: string;
  isRevealed: boolean;
  onToggleReveal: () => void;
}) {
  const encoded = encodeURIComponent(qrString);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}&bgcolor=ffffff&color=111827&qzone=2&format=png`;

  return (
    <div className="relative inline-block group">
      {/* Outer QR Card Container */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-md relative overflow-hidden">

        {/* QR Image with conditional blur */}
        <div className={`relative transition-all duration-500 ${isRevealed ? 'filter-none scale-100' : 'blur-xl scale-105 opacity-40 select-none pointer-events-none'}`}>
          <img
            src={qrUrl}
            alt="WhatsApp QR Code"
            width={260}
            height={260}
            className="rounded-2xl block border border-slate-100"
            draggable={false}
          />

          {/* Centered WhatsApp Brand Badge inside QR */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center">
              <WhatsAppWebLogo size="sm" />
            </div>
          </div>

          {/* Animated Laser Scan Beam (Only when revealed) */}
          {isRevealed && (
            <motion.div
              className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-[#00A884] to-transparent z-20 rounded-full shadow-[0_0_15px_#00A884]"
              animate={{ y: [0, 240, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ top: 8 }}
            />
          )}
        </div>

        {/* BLUR OVERLAY BUTTON (When QR is Hidden / Protected) */}
        {!isRevealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm z-30 transition-all">
            <motion.button
              onClick={onToggleReveal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-2xl bg-[#00A884] hover:bg-[#008f70] text-white font-black text-xs shadow-xl shadow-[#00A884]/30 flex items-center gap-2.5 transition-all"
            >
              <Eye className="w-4 h-4" />
              Click to Show QR Code
            </motion.button>
            <p className="text-[11px] font-semibold text-slate-700 bg-white/90 px-3 py-1 rounded-full border border-slate-200 shadow-sm mt-3">
              🔒 Click button to unblur & scan
            </p>
          </div>
        )}

        {/* Hide QR Re-blur Floating Action */}
        {isRevealed && (
          <button
            onClick={onToggleReveal}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm transition-all shadow-md"
            title="Blur QR Code for privacy"
          >
            <EyeOff className="w-3.5 h-3.5" /> Hide QR
          </button>
        )}

      </div>
    </div>
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
  const [isQrRevealed, setIsQrRevealed] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll fallback
  const startPolling = useCallback((runImmediately = false) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollStartRef.current = Date.now();

    const fetchStatus = async () => {
      try {
        if (Date.now() - pollStartRef.current > 45000) {
          stopPolling();
          if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
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
          stopPolling();
        } else if (data.qr_string) {
          if (data.qr_expired) {
            setQrString(null);
            setStatusMsg('QR expired. Click to refresh.');
          } else {
            setQrString(data.qr_string);
            setConnState('connecting');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (runImmediately) fetchStatus();
    pollRef.current = setInterval(fetchStatus, 2000);
  }, [stopPolling]);

  // Connect via SSE
  const handleConnect = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    setConnState('connecting');
    setQrString(null);
    setStatusMsg('Initializing WhatsApp session...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setIsStarting(false); return; }

      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

      const sse = new EventSource(`/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`);
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

      sse.onerror = () => {
        startPolling(true);
        setIsStarting(false);
      };

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

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-slate-900 p-3 sm:p-6 lg:p-10 flex flex-col items-center justify-center">

      <div className="max-w-4xl w-full space-y-6">

        {/* ── TOP ANNOUNCEMENT CARD (WHATSAPP WEB STYLE) ───────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00A884] flex items-center justify-center shrink-0 border border-emerald-100">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">WhatsApp Gateway for StudioCore CRM</h2>
              <p className="text-xs text-slate-500 mt-0.5">Send automated client messages, lead responses, proposal updates & bulk broadcasts.</p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connState === 'open'}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white font-extrabold text-xs shadow-md shadow-[#00A884]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            <span>{connState === 'open' ? 'Session Active ✓' : 'Pair WhatsApp'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── CONNECTED STATE ──────────────────────────────────────────────── */}
        {connState === 'open' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-md text-center space-y-6"
          >
            <div className="inline-flex p-4 rounded-full bg-emerald-50 text-[#00A884] border border-emerald-100">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">WhatsApp Device Linked!</h2>
              <p className="text-xs text-slate-500 mt-1">Your phone is active and linked to StudioCore CRM.</p>
              {phoneNumber && (
                <div className="mt-3 inline-block font-mono text-sm font-bold text-[#00A884] bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                  +{phoneNumber}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-bold uppercase text-slate-400">Gateway Status</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5">🟢 LIVE SOCKET</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[9px] font-bold uppercase text-slate-400">Security</p>
                <p className="text-xs font-black text-slate-800 mt-0.5">🔒 END-TO-END ENCRYPTED</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <p className="text-[9px] font-bold uppercase text-slate-400">Automations</p>
                <p className="text-xs font-black text-[#00A884] mt-0.5">READY FOR DISPATCH</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
              <button
                onClick={handleDisconnect}
                className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all"
              >
                Disconnect & Unlink Device
              </button>
            </div>
          </motion.div>
        )}

        {/* ── MAIN "SCAN TO LOG IN" PAIRING CARD (MATCHES OFFICIAL WHATSAPP WEB UI) ── */}
        {connState !== 'open' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

              {/* Left Column: Numbered Instructions */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Scan to log in
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">Use WhatsApp on your phone to link this device.</p>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      1
                    </span>
                    <span>Open <strong>WhatsApp</strong> on your phone</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      2
                    </span>
                    <span>Tap <strong>Menu (⋮)</strong> or <strong>Settings (⚙️)</strong> and select <strong>Linked Devices</strong></span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      3
                    </span>
                    <span>Tap <strong>Link a Device</strong> and point your phone at this screen</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-[#00A884] font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <a href="#" className="hover:underline">Need help? ↗</a>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={e => setStayLoggedIn(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00A884] focus:ring-[#00A884]"
                    />
                    <span>Stay logged in on this workspace</span>
                  </label>

                  <button
                    onClick={handleConnect}
                    disabled={isStarting}
                    className="text-[#00A884] font-extrabold hover:underline flex items-center gap-1"
                  >
                    {isStarting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Log in with phone number &gt;</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Protected QR Code with Blur Overlay */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                {qrString ? (
                  <ProtectedQrImage
                    qrString={qrString}
                    isRevealed={isQrRevealed}
                    onToggleReveal={() => setIsQrRevealed(r => !r)}
                  />
                ) : (
                  <div className="w-64 h-64 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 bg-slate-50/70 p-6 text-center">
                    <WhatsAppWebLogo size="lg" />
                    <button
                      onClick={handleConnect}
                      disabled={isStarting}
                      className="px-4 py-2.5 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white text-xs font-extrabold shadow-md shadow-[#00A884]/20 transition-all flex items-center gap-2 disabled:opacity-60"
                    >
                      {isStarting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                      <span>{isStarting ? 'Starting Gateway…' : 'Generate QR Code'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium">Click to request live Baileys pairing code</p>
                  </div>
                )}

                <div className="mt-4">
                  <StatusBadge state={connState} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── FOOTER INFORMATION (MATCHES OFFICIAL WHATSAPP FOOTER) ────────── */}
        <div className="text-center space-y-2 text-xs text-slate-500 pt-2">
          <p>
            Don't have a WhatsApp account?{' '}
            <a href="https://www.whatsapp.com" target="_blank" rel="noreferrer" className="text-[#00A884] font-bold hover:underline">
              Get started ↗
            </a>
          </p>
          <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <Lock className="w-3 h-3 text-[#00A884]" />
            Your messages are end-to-end encrypted
          </p>
          <p className="text-[10px] text-slate-400">StudioCore CRM • Terms & Privacy Policy</p>
        </div>

      </div>

    </div>
  );
}

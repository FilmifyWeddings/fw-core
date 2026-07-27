'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, RefreshCw, Smartphone, ShieldCheck,
  Zap, Clock, AlertCircle, Eye, EyeOff, Laptop,
  Lock, ArrowRight, Check, HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnState = 'disconnected' | 'connecting' | 'open' | 'error';

// ─── Official WhatsApp Brand Mark ─────────────────────────────────────────────
function WhatsAppWebLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
        </svg>
      </div>
      <span className="text-xl font-bold text-[#00a884] tracking-tight">WhatsApp</span>
    </div>
  );
}

// ─── Real Baileys QR Code Renderer ────────────────────────────────────────────
function QrCodeBox({
  qrString,
  isRevealed,
  onToggleReveal
}: {
  qrString: string | null;
  isRevealed: boolean;
  onToggleReveal: () => void;
}) {
  const qrUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrString)}&bgcolor=ffffff&color=111b21&qzone=1&format=png`
    : null;

  return (
    <div className="relative inline-block">
      <div className="p-3 bg-white rounded-2xl border border-[#e9edef] shadow-sm relative overflow-hidden">
        {qrUrl ? (
          <div className={`relative transition-all duration-500 ${isRevealed ? 'filter-none scale-100' : 'blur-xl scale-105 opacity-30 select-none pointer-events-none'}`}>
            <img
              src={qrUrl}
              alt="WhatsApp Baileys QR Code"
              width={260}
              height={260}
              className="rounded-xl block"
              draggable={false}
            />

            {/* Center WhatsApp Icon Badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 fill-[#00a884]" viewBox="0 0 24 24">
                  <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
                </svg>
              </div>
            </div>

            {/* Laser scanning beam */}
            {isRevealed && (
              <motion.div
                className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-[#00a884] to-transparent z-20 rounded-full shadow-[0_0_12px_#00a884]"
                animate={{ y: [0, 240, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ top: 8 }}
              />
            )}
          </div>
        ) : (
          /* Loading Baileys QR Loader */
          <div className="w-[260px] h-[260px] rounded-xl flex flex-col items-center justify-center gap-3 bg-slate-50 border border-slate-100">
            <RefreshCw className="w-8 h-8 text-[#00a884] animate-spin" />
            <span className="text-xs text-[#667781] font-medium">Generating QR code…</span>
          </div>
        )}

        {/* BLUR OVERLAY BUTTON (Click to Reveal) */}
        {!isRevealed && qrUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm z-30">
            <button
              onClick={onToggleReveal}
              className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-xs shadow-lg shadow-[#00a884]/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Show QR Code
            </button>
          </div>
        )}

        {/* Hide QR Button */}
        {isRevealed && qrUrl && (
          <button
            onClick={onToggleReveal}
            className="absolute top-2 right-2 z-30 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm shadow"
          >
            <EyeOff className="w-3 h-3" /> Hide
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
  const [connState, setConnState] = useState<ConnState>('connecting');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
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

  const startPolling = useCallback((runImmediately = false) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollStartRef.current = Date.now();

    const fetchStatus = async () => {
      try {
        if (Date.now() - pollStartRef.current > 45000) {
          stopPolling();
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
          stopPolling();
        } else if (data.qr_string && !data.qr_expired) {
          setQrString(data.qr_string);
          setConnState('connecting');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (runImmediately) fetchStatus();
    pollRef.current = setInterval(fetchStatus, 2000);
  }, [stopPolling]);

  // Connect via SSE automatically on mount
  const handleConnect = useCallback(async () => {
    setConnState('connecting');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

      const sse = new EventSource(`/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`);
      sseRef.current = sse;

      sse.addEventListener('qr', (e) => {
        const d = JSON.parse(e.data);
        setQrString(d.qr);
        setConnState('connecting');
      });

      sse.addEventListener('connected', (e) => {
        const d = JSON.parse(e.data);
        setConnState('open');
        setPhoneNumber(d.phone);
        setQrString(null);
        sse.close();
        stopPolling();
      });

      sse.onerror = () => {
        startPolling(true);
      };

      startPolling();
    } catch (err) {
      console.error('QR init error:', err);
    }
  }, [startPolling, stopPolling]);

  // Auto-connect on mount
  useEffect(() => {
    handleConnect();
    return () => { sseRef.current?.close(); stopPolling(); };
  }, [handleConnect, stopPolling]);

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
    <div className="min-h-screen bg-[#FAF8F5] font-sans text-[#111b21] p-4 sm:p-8 lg:p-12 flex flex-col items-center justify-start space-y-8">

      {/* ── TOP BRAND HEADER ────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <WhatsAppWebLogo />
      </div>

      <div className="w-full max-w-4xl space-y-6">

        {/* ── TOP DOWNLOAD BANNER (MATCHES WHATSAPP WEB IMAGE) ──────────────── */}
        <div className="bg-white rounded-2xl border border-[#e9edef] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#111b21]">Download WhatsApp for Windows</h2>
              <p className="text-xs text-[#667781] mt-0.5">Get extra features like voice and video calling, screen sharing and more.</p>
            </div>
          </div>

          <button className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-xs shadow-sm transition-all shrink-0">
            Download ↓
          </button>
        </div>

        {/* ── CONNECTED DASHBOARD ──────────────────────────────────────────── */}
        {connState === 'open' ? (
          <div className="bg-white rounded-3xl border border-[#e9edef] p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#00a884] flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#111b21]">WhatsApp Connected!</h2>
              {phoneNumber && (
                <p className="mt-2 text-sm font-mono font-bold text-[#00a884] bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 inline-block">
                  +{phoneNumber}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button
                onClick={handleDisconnect}
                className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all"
              >
                Disconnect Device
              </button>
            </div>
          </div>
        ) : (
          /* ── MAIN "SCAN TO LOG IN" CARD (EXACT WHATSAPP WEB UI MATCH) ────── */
          <div className="bg-white rounded-3xl border border-[#e9edef] p-8 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

              {/* Left Column: 3 Steps */}
              <div className="lg:col-span-7 space-y-6">
                <h1 className="text-3xl font-normal text-[#111b21] tracking-tight">
                  Scan to log in
                </h1>

                <ol className="space-y-4 text-xs sm:text-sm text-[#111b21] leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Scan the QR code with your phone's camera</span>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span className="flex items-center gap-1 flex-wrap">
                      Tap the link to open <strong>WhatsApp</strong>
                      <span className="w-4 h-4 rounded-full bg-[#00a884] text-white inline-flex items-center justify-center p-0.5">
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
                        </svg>
                      </span>
                    </span>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Scan the QR code again to link to your account</span>
                  </li>
                </ol>

                <div className="pt-1">
                  <a href="#" className="text-[#00a884] text-xs font-semibold hover:underline inline-flex items-center gap-0.5">
                    Need help? ↗
                  </a>
                </div>

                <div className="pt-6 border-t border-[#e9edef] flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[#111b21] select-none">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={e => setStayLoggedIn(e.target.checked)}
                      className="w-4 h-4 rounded border-[#8696a0] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <span>Stay logged in on this browser ⓘ</span>
                  </label>

                  <a href="#" className="text-[#00a884] font-semibold hover:underline">
                    Log in with phone number &gt;
                  </a>
                </div>
              </div>

              {/* Right Column: Baileys QR Code Container */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <QrCodeBox
                  qrString={qrString}
                  isRevealed={isQrRevealed}
                  onToggleReveal={() => setIsQrRevealed(r => !r)}
                />
              </div>

            </div>
          </div>
        )}

        {/* ── FOOTER (EXACT WHATSAPP WEB FOOTER) ──────────────────────────── */}
        <div className="text-center space-y-2 text-xs text-[#667781] pt-4">
          <p>
            Don't have a WhatsApp account?{' '}
            <a href="https://www.whatsapp.com" target="_blank" rel="noreferrer" className="text-[#00a884] font-semibold hover:underline">
              Get started ↗
            </a>
          </p>

          <p className="flex items-center justify-center gap-1 text-xs text-[#667781]">
            <Lock className="w-3.5 h-3.5 text-[#667781]" />
            Your personal messages are end-to-end encrypted
          </p>

          <p className="text-[10px] text-[#8696a0]">Terms & Privacy Policy</p>
        </div>

      </div>

    </div>
  );
}

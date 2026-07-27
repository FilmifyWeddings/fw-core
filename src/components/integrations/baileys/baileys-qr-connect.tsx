'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, RefreshCw, Eye, EyeOff, Laptop, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ConnState = 'disconnected' | 'connecting' | 'open' | 'error';

// ─── WhatsApp SVG Icon ─────────────────────────────────────────────────────────
const WA_SVG = (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
  </svg>
);

// ─── QR Code Panel ─────────────────────────────────────────────────────────────
function QrPanel({ qrString, isLoading, isRevealed, onReveal }: {
  qrString: string | null;
  isLoading: boolean;
  isRevealed: boolean;
  onReveal: () => void;
}) {
  const qrUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=264x264&data=${encodeURIComponent(qrString)}&bgcolor=ffffff&color=111b21&qzone=1&format=png`
    : null;

  return (
    <div className="flex flex-col items-center">
      {/* QR Container */}
      <div className="relative w-[288px] h-[288px] rounded-2xl border border-[#e9edef] bg-white shadow-sm overflow-hidden flex items-center justify-center">
        {isLoading && !qrString ? (
          /* Generating spinner */
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center">
              {WA_SVG}
            </div>
            <RefreshCw className="w-6 h-6 text-[#00a884] animate-spin" />
            <span className="text-xs text-[#667781]">Generating QR code…</span>
          </div>
        ) : qrUrl ? (
          <>
            {/* QR Image — blurred until user clicks */}
            <img
              src={qrUrl}
              alt="Scan to log in"
              width={264}
              height={264}
              draggable={false}
              className={`block rounded-xl transition-all duration-500 ${isRevealed ? 'blur-0' : 'blur-xl opacity-40 scale-105'}`}
            />
            {/* Center WA badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center text-[#00a884]">
                {WA_SVG}
              </div>
            </div>
            {/* Scanning beam (only when revealed) */}
            {isRevealed && (
              <motion.div
                className="absolute left-3 right-3 h-1 bg-gradient-to-r from-transparent via-[#00a884] to-transparent rounded-full"
                animate={{ y: [0, 248, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ top: 10 }}
              />
            )}
            {/* Blur overlay → Show QR button */}
            {!isRevealed && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
                <button
                  onClick={onReveal}
                  className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Show QR Code
                </button>
              </div>
            )}
            {/* Hide button (when revealed) */}
            {isRevealed && (
              <button
                onClick={onReveal}
                className="absolute top-2 right-2 z-10 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1"
              >
                <EyeOff className="w-3 h-3" /> Hide
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
interface BaileysQrConnectProps { workspaceId: string; }

export function BaileysQrConnect({ workspaceId }: BaileysQrConnectProps) {
  const [connState, setConnState] = useState<ConnState>('connecting');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [isQrRevealed, setIsQrRevealed] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const t0 = Date.now();

    const tick = async () => {
      if (Date.now() - t0 > 55_000) { stopPolling(); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch('/api/integrations/baileys/qr-status', {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        });
        if (!res.ok) return;
        const d = await res.json();
        if (d.conn_state === 'open' && d.phone_number) {
          setConnState('open'); setPhoneNumber(d.phone_number); setQrString(null); stopPolling();
        } else if (d.qr_string) {
          setQrString(d.qr_string); setIsQrLoading(false); setConnState('connecting');
        }
      } catch { /* ignore */ }
    };

    tick();
    pollRef.current = setInterval(tick, 2500);
  }, [stopPolling]);

  const initSSE = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { startPolling(); return; }

      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

      const sse = new EventSource(`/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`);
      sseRef.current = sse;

      sse.addEventListener('qr', (e) => {
        const d = JSON.parse(e.data);
        if (d.qr) { setQrString(d.qr); setIsQrLoading(false); setConnState('connecting'); }
      });

      sse.addEventListener('connected', (e) => {
        const d = JSON.parse(e.data);
        setConnState('open'); setPhoneNumber(d.phone); setQrString(null);
        sse.close(); stopPolling();
      });

      sse.onerror = () => { startPolling(); };

      // Simultaneously poll as backup
      startPolling();
    } catch { startPolling(); }
  }, [startPolling, stopPolling]);

  // On mount — check existing session first, then start SSE
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch('/api/integrations/baileys/qr-status', {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
          });
          if (res.ok) {
            const d = await res.json();
            if (d.conn_state === 'open' && d.phone_number) {
              setConnState('open'); setPhoneNumber(d.phone_number); return;
            }
            if (d.qr_string) {
              setQrString(d.qr_string); setIsQrLoading(false); setConnState('connecting');
            }
          }
        }
      } catch { /* ignore */ }
      initSSE();
    };
    init();
    return () => { sseRef.current?.close(); stopPolling(); };
  }, [initSSE, stopPolling]);

  const handleDisconnect = async () => {
    sseRef.current?.close(); stopPolling();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch('/api/integrations/baileys/qr-status', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    setConnState('disconnected'); setQrString(null); setPhoneNumber(null);
    startedRef.current = false;
  };

  const handleReconnect = () => {
    startedRef.current = false;
    setConnState('connecting'); setQrString(null); setIsQrLoading(true); setIsQrRevealed(false);
    initSSE();
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="font-sans text-[#111b21] flex flex-col items-center justify-start gap-8 px-4 py-8 sm:px-8 lg:px-16"
      style={{ background: '#FAF8F5', minHeight: '100%' }}
    >
      {/* WhatsApp logo header */}
      <div className="w-full max-w-4xl flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-sm shrink-0">
          {WA_SVG}
        </div>
        <span className="text-xl font-bold text-[#00a884] tracking-tight">WhatsApp</span>
      </div>

      <div className="w-full max-w-4xl space-y-5">

        {/* Download Banner */}
        <div className="bg-white rounded-2xl border border-[#e9edef] px-5 py-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111b21]">Download WhatsApp for Windows</p>
              <p className="text-[11px] text-[#667781] mt-0.5">Get extra features like voice and video calling, screen sharing and more.</p>
            </div>
          </div>
          <button className="px-5 py-2 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-xs shadow-sm transition-all shrink-0">
            Download ↓
          </button>
        </div>

        {/* Connected State */}
        {connState === 'open' && (
          <div className="bg-white rounded-2xl border border-[#e9edef] p-8 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border border-emerald-100 text-[#00a884]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111b21]">WhatsApp Connected!</h2>
              {phoneNumber && (
                <p className="mt-2 text-sm font-mono font-bold text-[#00a884] bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 inline-block">+{phoneNumber}</p>
              )}
            </div>
            <button onClick={handleDisconnect} className="px-5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all">
              Disconnect Device
            </button>
          </div>
        )}

        {/* Disconnected State */}
        {connState === 'disconnected' && (
          <div className="bg-white rounded-2xl border border-[#e9edef] p-8 shadow-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-[#111b21]">WhatsApp Disconnected</h2>
            <p className="text-xs text-[#667781]">Your session was reset. Click below to re-link your device.</p>
            <button onClick={handleReconnect} className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-sm transition-all">
              Link a Device
            </button>
          </div>
        )}

        {/* Main Scan Card */}
        {(connState === 'connecting' || connState === 'error') && (
          <div className="bg-white rounded-2xl border border-[#e9edef] px-8 py-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

              {/* Left: Instructions */}
              <div className="lg:col-span-7 space-y-5">
                <h1 className="text-[28px] font-[400] leading-tight text-[#111b21]">Scan to log in</h1>

                <ol className="space-y-4 text-sm text-[#111b21]">
                  {[
                    "Scan the QR code with your phone's camera",
                    <span key="2">Tap the link to open <strong>WhatsApp</strong> <span className="inline-flex w-4 h-4 rounded-full bg-[#00a884] text-white items-center justify-center" style={{verticalAlign:'middle'}}><svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z"/></svg></span></span>,
                    "Scan the QR code again to link to your account",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>

                <a href="#" className="text-[#00a884] text-xs font-semibold hover:underline flex items-center gap-0.5">
                  Need help? ↗
                </a>

                <div className="pt-5 border-t border-[#e9edef] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[#111b21] select-none">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={e => setStayLoggedIn(e.target.checked)}
                      className="w-4 h-4 rounded border-[#8696a0] text-[#00a884] focus:ring-[#00a884]"
                    />
                    Stay logged in on this browser ⓘ
                  </label>
                  <a href="#" className="text-[#00a884] font-semibold hover:underline whitespace-nowrap">
                    Log in with phone number &gt;
                  </a>
                </div>
              </div>

              {/* Right: QR Code */}
              <div className="lg:col-span-5 flex items-center justify-center">
                <QrPanel
                  qrString={qrString}
                  isLoading={isQrLoading}
                  isRevealed={isQrRevealed}
                  onReveal={() => setIsQrRevealed(r => !r)}
                />
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-1.5 pt-2">
          <p className="text-xs text-[#667781]">
            Don't have a WhatsApp account?{' '}
            <a href="https://www.whatsapp.com" target="_blank" rel="noreferrer" className="text-[#00a884] font-semibold underline underline-offset-2">
              Get started ↗
            </a>
          </p>
          <p className="flex items-center justify-center gap-1 text-xs text-[#667781]">
            <Lock className="w-3.5 h-3.5" />
            Your personal messages are end-to-end encrypted
          </p>
          <p className="text-[10px] text-[#8696a0]">Terms &amp; Privacy Policy</p>
        </div>

      </div>
    </div>
  );
}

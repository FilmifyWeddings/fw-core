'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { CheckCircle2, RefreshCw, Zap, Users, Send, LayoutTemplate, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ConnState = 'loading' | 'disconnected' | 'connecting' | 'open' | 'error';

const WA_SVG = (
  <svg className="fill-current" viewBox="0 0 24 24" width="100%" height="100%">
    <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
  </svg>
);

// ─── 3D Tilt Card wrapper ─────────────────────────────────────────────────────
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => scale.set(1.02)}
      onMouseLeave={() => { x.set(0); y.set(0); scale.set(1); }}
      style={{ rotateX, rotateY, scale, transformPerspective: 800 }}
      className={`cursor-default ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature pill for the horizontal row ──────────────────────────────────────
const FEATURES = [
  { icon: <MessageCircle className="w-5 h-5" />, bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Instant Welcome', sub: 'Send personalized welcome messages.' },
  { icon: <Zap className="w-5 h-5" />,           bg: 'bg-amber-100',   color: 'text-amber-600',   label: 'Instant Follow-ups', sub: 'Automate follow-ups and never miss out.' },
  { icon: <Users className="w-5 h-5" />,          bg: 'bg-violet-100',  color: 'text-violet-600',  label: 'Group Auto Messages', sub: 'Send updates to groups automatically.' },
  { icon: <Send className="w-5 h-5" />,           bg: 'bg-sky-100',     color: 'text-sky-600',     label: 'Bulk Message Send', sub: 'Broadcast to many leads in one click.' },
  { icon: <LayoutTemplate className="w-5 h-5" />, bg: 'bg-rose-100',    color: 'text-rose-500',    label: 'Message Templates', sub: 'Create & use templates for fast replies.' },
];

// ─── QR Panel ─────────────────────────────────────────────────────────────────
function QrPanel({ qrString, isResetting }: { qrString: string | null; isResetting?: boolean }) {
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    if (!qrString) return;
    setCountdown(45);
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [qrString]);

  const qrUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrString)}&bgcolor=ffffff&color=111b21&qzone=2&format=png`
    : null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR box with subtle glow */}
      <div
        className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-2xl bg-white flex items-center justify-center overflow-hidden"
        style={{ boxShadow: qrUrl ? '0 0 0 4px rgba(0,168,132,0.12), 0 8px 32px rgba(0,168,132,0.10)' : '0 2px 16px rgba(0,0,0,0.06)' }}
      >
        {!qrUrl ? (
          <div className="flex flex-col items-center gap-3 p-4">
            <div className="w-12 h-12 rounded-full bg-[#00a884] text-white p-3 flex items-center justify-center">
              {WA_SVG}
            </div>
            <RefreshCw className="w-5 h-5 text-[#00a884] animate-spin" />
            <span className="text-xs text-[#667781] text-center">
              {isResetting ? 'Clearing stale session and fetching fresh QR…' : 'Generating QR code…'}
            </span>
          </div>
        ) : (
          <img key={qrString} src={qrUrl} alt="Scan with WhatsApp" width={260} height={260} draggable={false} className="block rounded-xl" />
        )}
      </div>

      {/* Countdown */}
      {qrUrl && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#667781]">
          <RefreshCw className="w-3 h-3 text-[#00a884]" />
          <span>
            QR refreshes in{' '}
            <span className="font-bold text-[#00a884]">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BaileysQrConnectProps { workspaceId: string; }

export function BaileysQrConnect({ workspaceId }: BaileysQrConnectProps) {
  const [connState, setConnState] = useState<ConnState>('loading');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [qrPanelKey, setQrPanelKey] = useState(0);

  const qrStringRef = useRef<string | null>(null);
  const lastQrUpdateRef = useRef<number>(0);

  const updateQrDebounced = useCallback((newQr: string) => {
    const now = Date.now();
    if (!qrStringRef.current || (newQr !== qrStringRef.current && now - lastQrUpdateRef.current > 15_000)) {
      qrStringRef.current = newQr;
      lastQrUpdateRef.current = now;
      setQrString(newQr);
    }
  }, []);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (checkRef.current) { clearInterval(checkRef.current); checkRef.current = null; }
  }, []);

  const tick = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/integrations/baileys/qr-status', {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (!res.ok) return;
      const d = await res.json();
      if (d.isConnected && d.phone_number) {
        setConnState('open'); setPhoneNumber(d.phone_number); setQrString(null); qrStringRef.current = null; setIsResetting(false); stopPolling();
      } else if (d.qr_string) {
        setConnState('connecting');
        updateQrDebounced(d.qr_string);
        setIsResetting(false);
      } else if (d.conn_state === 'connecting') {
        setConnState('connecting');
        setIsResetting(false);
      } else if (d.conn_state === 'disconnected') {
        setConnState('disconnected');
        setPhoneNumber(null);
      }
    } catch { /* ignore */ }
  }, [stopPolling, updateQrDebounced]);

  const startPolling = useCallback((fast = true) => {
    if (pollRef.current) clearInterval(pollRef.current);
    tick();
    pollRef.current = setInterval(tick, fast ? 2000 : 3000);
  }, [tick]);

  const initSSE = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { startPolling(true); return; }
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
      const sse = new EventSource(`/api/integrations/baileys/qr-init?token=${encodeURIComponent(token)}`);
      sseRef.current = sse;
      sse.addEventListener('qr', (e) => {
        const d = JSON.parse(e.data);
        if (d.qr) { updateQrDebounced(d.qr); setConnState('connecting'); }
      });
      sse.addEventListener('connected', (e) => {
        const d = JSON.parse(e.data);
        setConnState('open'); setPhoneNumber(d.phone ?? null); setQrString(null); setIsResetting(false);
        sse.close(); stopPolling();
      });
      sse.onerror = () => { startPolling(true); };
      startPolling(true);
    } catch { startPolling(true); }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    let isMounted = true;

    const checkStatusAndStart = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch('/api/integrations/baileys/qr-status', {
            headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
          });
          if (res.ok) {
            const d = await res.json();
            if (d.isConnected && d.phone_number) {
              if (isMounted) {
                setConnState('open'); setPhoneNumber(d.phone_number); setQrString(null); setIsResetting(false);
              }
              return;
            }
            if (d.qr_string && isMounted) {
              setConnState('connecting'); setQrString(d.qr_string); qrStringRef.current = d.qr_string; setIsResetting(false);
            }
          }
        }
      } catch { if (isMounted) setConnState('connecting'); }
      if (isMounted) {
        initSSE();
        startPolling(true);
      }
    };

    checkStatusAndStart();

    // Supabase Realtime Subscription for instant <50ms UI update on Postgres status change
    const channel = supabase
      .channel(`baileys-qr-realtime-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baileys_sessions' },
        (payload) => {
          const payloadWsId = (payload.new as any)?.workspace_id || (payload.new as any)?.user_id;
          const newState = (payload.new as any)?.conn_state;
          const phone = (payload.new as any)?.phone_number;
          const qr = (payload.new as any)?.qr_string;
          if (newState === 'open' && isMounted) {
            setConnState('open'); setPhoneNumber(phone ?? null); setQrString(null); qrStringRef.current = null; setIsResetting(false); stopPolling();
          } else if (qr && isMounted && newState !== 'open') {
            setConnState('connecting'); setQrString(qr); qrStringRef.current = qr; setIsResetting(false);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      sseRef.current?.close();
      stopPolling();
    };
  }, [initSSE, startPolling, stopPolling, workspaceId]);

  const handleDisconnect = async () => {
    sseRef.current?.close(); stopPolling();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch('/api/integrations/baileys/qr-status', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    setConnState('disconnected'); setQrString(null); qrStringRef.current = null; lastQrUpdateRef.current = 0; setPhoneNumber(null);
    startedRef.current = false;
  };

  const handleReconnect = async () => {
    startedRef.current = false;
    setIsResetting(false);
    setConnState('connecting'); setQrString(null); qrStringRef.current = null; lastQrUpdateRef.current = 0;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/integrations/baileys/qr-status', {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {}
    initSSE();
  };

  const handleForceReset = async () => {
    if (!window.confirm('This will completely reset your WhatsApp session. You will need to re-scan the QR code. Continue?')) return;
    // ── IMMEDIATE FRONTEND STATE WIPEOUT ──
    sseRef.current?.close(); stopPolling();
    setIsResetting(true);
    setConnState('connecting'); setQrString(null); qrStringRef.current = null; lastQrUpdateRef.current = 0; setPhoneNumber(null);
    setQrPanelKey(k => k + 1);
    startedRef.current = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/integrations/baileys/force-reset', {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {}

    // Initialize real-time SSE stream immediately to generate and receive fresh QR code
    initSSE();
  };

  return (
    <div
      className="font-sans text-[#111b21] flex flex-col items-center justify-start gap-6 px-4 py-8 sm:px-6 lg:px-10"
      style={{
        background: 'linear-gradient(135deg, #f0fdf8 0%, #f8fffe 40%, #f0f9f6 100%)',
        minHeight: '100%',
      }}
    >
      {/* WA Logo header */}
      <div className="w-full max-w-5xl flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white p-1.5 flex items-center justify-center shadow-md shadow-emerald-200">
          {WA_SVG}
        </div>
        <span className="text-xl font-bold text-[#00a884] tracking-tight">WhatsApp</span>
      </div>

      <div className="w-full max-w-5xl space-y-5">

        {/* ─── LOADING ─── */}
        {connState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-[#00a884] animate-spin" />
          </div>
        )}

        {/* ─── CONNECTED ─── */}
        {connState === 'open' && (
          <TiltCard>
            <div className="bg-white rounded-3xl border border-emerald-100 p-8 shadow-md text-center space-y-5">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border-2 border-emerald-200 text-[#00a884]"
              >
                <CheckCircle2 className="w-9 h-9" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-[#111b21]">WhatsApp Connected!</h2>
                  {phoneNumber ? (
                    <p className="mt-2 text-sm font-mono font-bold text-[#00a884] bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 inline-block">
                      +{phoneNumber}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[#667781] font-mono">
                      Device linked
                    </p>
                  )}
                <p className="text-xs text-[#667781] mt-2">All automations are now active and running.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDisconnect} className="px-5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 font-bold text-xs transition-all">
                  Disconnect Device
                </button>
                <button onClick={handleForceReset} className="px-5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-bold text-[10px] transition-all active:scale-95 cursor-pointer flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />
                  Reset &amp; Re-link
                </button>
              </div>
            </div>
          </TiltCard>
        )}

        {/* ─── SCAN CARD (ALWAYS DISPLAYED FOR UNCONNECTED USERS) ─── */}
        {connState !== 'open' && connState !== 'loading' && (
          <TiltCard>
            <div className="bg-white rounded-3xl border border-[#e9edef] px-6 sm:px-10 py-8 shadow-lg shadow-emerald-50/60">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Left: Steps */}
                <div className="lg:col-span-7 space-y-6">
                  <h1 className="text-2xl sm:text-[28px] font-semibold leading-tight text-[#111b21]">Scan to log in</h1>
                  <ol className="space-y-5 text-sm text-[#111b21] leading-relaxed">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-bold flex items-center justify-center shrink-0 bg-slate-50">1</span>
                      <span>Open <strong>WhatsApp</strong> on your phone.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-bold flex items-center justify-center shrink-0 bg-slate-50">2</span>
                      <span>
                        On <strong>Android</strong>, tap the three dots menu and select <strong>Linked Devices</strong>.<br />
                        On <strong>iPhone</strong>, go to <strong>Settings</strong> and select <strong>Linked Devices</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-bold flex items-center justify-center shrink-0 bg-slate-50">3</span>
                      <span>Tap <strong>Link a Device</strong> and point your phone's camera at the QR code.</span>
                    </li>
                  </ol>
                </div>

                {/* Right: QR */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3">
                  <QrPanel key={qrPanelKey} qrString={qrString} isResetting={isResetting} />
                  <button
                    onClick={handleForceReset}
                    className="px-5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[10px] transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset &amp; Get Fresh QR
                  </button>
                </div>
              </div>
            </div>
          </TiltCard>
        )}

        {/* ─── FEATURES SECTION ─── */}
        <div className="space-y-4">
          {/* Section divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#e9edef]" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#e9edef] shadow-sm">
              <div className="w-4 h-4 rounded-full bg-[#00a884] text-white p-0.5 flex items-center justify-center">
                {WA_SVG}
              </div>
              <span className="text-[11px] font-bold text-[#667781] whitespace-nowrap">What you can do after connecting</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#e9edef]" />
          </div>

          {/* 5 Feature Pills — horizontal scroll on mobile, flex wrap on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible">
            {FEATURES.map((f) => (
              <motion.div
                key={f.label}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,168,132,0.12)' }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-[#e9edef] p-4 flex flex-col items-center text-center gap-2.5 min-w-[140px] sm:min-w-0 cursor-default"
              >
                <div className={`w-11 h-11 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center`}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#111b21] leading-snug">{f.label}</p>
                  <p className="text-[10px] text-[#667781] mt-0.5 leading-relaxed">{f.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Banner */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(90deg, #00a884 0%, #00c897 50%, #00a884 100%)' }}
          >
            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative flex flex-col sm:flex-row items-center justify-between px-6 py-5 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white p-2 flex items-center justify-center shrink-0">
                  {WA_SVG}
                </div>
                <div>
                  <p className="text-white font-extrabold text-sm sm:text-base leading-snug">
                    Connected once. Automate everything.
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    Let your WhatsApp do more with StudioCore CRM.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-2 text-white text-xs font-bold whitespace-nowrap shrink-0">
                <Zap className="w-3.5 h-3.5" />
                Powered by StudioCore Gateway
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

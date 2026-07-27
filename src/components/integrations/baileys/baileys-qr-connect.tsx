'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Zap, Users, Send, LayoutTemplate, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ConnState = 'disconnected' | 'connecting' | 'open' | 'error';

const WA_SVG = (
  <svg className="fill-current" viewBox="0 0 24 24" width="20" height="20">
    <path d="M12.031 2c-5.456 0-9.88 4.424-9.88 9.88 0 2.14.68 4.12 1.83 5.75L2 22l4.49-1.93c1.57 1.01 3.44 1.59 5.54 1.59 5.46 0 9.88-4.42 9.88-9.88 0-5.46-4.42-9.88-9.88-9.88zm5.77 14.15c-.24.68-1.2 1.25-1.95 1.34-.51.06-1.18.1-3.43-.84-2.88-1.2-4.74-4.14-4.88-4.33-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.24-.26.54-.33.72-.33.18 0 .36.01.51.01.17 0 .41-.06.64.49.24.57.82 2.01.89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.74-.86.94-1.15.2-.29.4-.24.67-.14.27.1.1.71 2.37 1.77.27.14.45.21.52.33.07.12.07.68-.17 1.36z" />
  </svg>
);

// ─── Features Data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'bg-emerald-50 text-[#00a884] border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Instant Welcome',
    desc: 'Auto-send a personalised welcome message the moment a new lead comes in from Facebook, your website, or any source.',
    tag: 'Auto-trigger',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Instant Follow-ups',
    desc: 'Schedule smart follow-up sequences — 1 hour, 1 day, 3 days — so no client ever falls through the cracks.',
    tag: 'Time-based',
  },
  {
    icon: <Users className="w-5 h-5" />,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    badge: 'bg-violet-100 text-violet-700',
    label: 'Group Auto Message',
    desc: 'Automatically add new clients to WhatsApp groups or send targeted messages to your existing contact groups.',
    tag: 'Group broadcast',
  },
  {
    icon: <Send className="w-5 h-5" />,
    color: 'bg-sky-50 text-sky-600 border-sky-100',
    badge: 'bg-sky-100 text-sky-700',
    label: 'Bulk Message Send',
    desc: 'Send campaign messages to hundreds of clients at once — promotions, seasonal offers, event reminders — all from your CRM.',
    tag: 'Bulk campaigns',
  },
  {
    icon: <LayoutTemplate className="w-5 h-5" />,
    color: 'bg-rose-50 text-rose-500 border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Message Templates',
    desc: 'Create and save reusable message templates with smart tokens like {name}, {phone}, {event_date} for every workflow.',
    tag: 'Reusable',
  },
];

// ─── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, color, badge, label, desc, tag }: typeof FEATURES[0]) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9edef] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge}`}>{tag}</span>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#111b21] leading-snug">{label}</h3>
        <p className="text-xs text-[#667781] mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── QR Panel ─────────────────────────────────────────────────────────────────
function QrPanel({ qrString }: { qrString: string | null }) {
  const qrUrl = qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrString)}&bgcolor=ffffff&color=111b21&qzone=2&format=png`
    : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-xl border border-[#e9edef] bg-white shadow-sm flex items-center justify-center overflow-hidden">
        {!qrUrl ? (
          <div className="flex flex-col items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center">
              {WA_SVG}
            </div>
            <RefreshCw className="w-5 h-5 text-[#00a884] animate-spin" />
            <span className="text-xs text-[#667781] text-center">Generating QR code…<br />Please wait</span>
          </div>
        ) : (
          <img
            src={qrUrl}
            alt="Scan with WhatsApp"
            width={280}
            height={280}
            draggable={false}
            className="block"
          />
        )}
      </div>
      {qrUrl && (
        <p className="text-[10px] text-[#667781] text-center">QR refreshes automatically · Keep this window open</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BaileysQrConnectProps { workspaceId: string; }

export function BaileysQrConnect({ workspaceId }: BaileysQrConnectProps) {
  const [connState, setConnState] = useState<ConnState>('connecting');
  const [qrString, setQrString] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

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
        } else if (d.qr_string && !d.qr_expired) {
          setQrString(d.qr_string); setConnState('connecting');
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
        if (d.qr) { setQrString(d.qr); setConnState('connecting'); }
      });
      sse.addEventListener('connected', (e) => {
        const d = JSON.parse(e.data);
        setConnState('open'); setPhoneNumber(d.phone); setQrString(null);
        sse.close(); stopPolling();
      });
      sse.onerror = () => { startPolling(); };
      startPolling();
    } catch { startPolling(); }
  }, [startPolling, stopPolling]);

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
            if (d.qr_string && !d.qr_expired) {
              setQrString(d.qr_string); setConnState('connecting');
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
    setConnState('connecting'); setQrString(null);
    initSSE();
  };

  return (
    <div
      className="font-sans text-[#111b21] flex flex-col items-center justify-start gap-6 px-4 py-6 sm:px-6 lg:px-12"
      style={{ background: '#FAF8F5', minHeight: '100%' }}
    >
      {/* WhatsApp logo header */}
      <div className="w-full max-w-5xl flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-sm shrink-0">
          {WA_SVG}
        </div>
        <span className="text-xl font-bold text-[#00a884] tracking-tight">WhatsApp</span>
      </div>

      <div className="w-full max-w-5xl space-y-5">

        {/* ── CONNECTED ── */}
        {connState === 'open' && (
          <div className="bg-white rounded-2xl border border-[#e9edef] p-8 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border border-emerald-100 text-[#00a884]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111b21]">WhatsApp Connected!</h2>
              {phoneNumber && (
                <p className="mt-2 text-sm font-mono font-bold text-[#00a884] bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 inline-block">
                  +{phoneNumber}
                </p>
              )}
              <p className="text-xs text-[#667781] mt-2">Your device is linked. All automations are now active.</p>
            </div>
            <button onClick={handleDisconnect} className="px-5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all">
              Disconnect Device
            </button>
          </div>
        )}

        {/* ── DISCONNECTED ── */}
        {connState === 'disconnected' && (
          <div className="bg-white rounded-2xl border border-[#e9edef] p-8 shadow-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-[#111b21]">WhatsApp Disconnected</h2>
            <p className="text-xs text-[#667781]">Your session was reset. Click below to re-link your device.</p>
            <button onClick={handleReconnect} className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-sm transition-all">
              Link a Device
            </button>
          </div>
        )}

        {/* ── SCAN CARD ── */}
        {(connState === 'connecting' || connState === 'error') && (
          <div className="bg-white rounded-2xl border border-[#e9edef] px-6 sm:px-8 py-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Steps */}
              <div className="lg:col-span-7 space-y-6">
                <h1 className="text-2xl sm:text-[28px] font-[400] leading-tight text-[#111b21]">Scan to log in</h1>
                <ol className="space-y-5 text-sm text-[#111b21] leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-semibold flex items-center justify-center shrink-0">1</span>
                    <span>Open <strong>WhatsApp</strong> on your phone.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-semibold flex items-center justify-center shrink-0">2</span>
                    <span>
                      On <strong>Android</strong>, tap the three dots menu and select <strong>Linked Devices</strong>.<br />
                      On <strong>iPhone</strong>, go to <strong>Settings</strong> and select <strong>Linked Devices</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full border border-[#8696a0] text-[#667781] text-[11px] font-semibold flex items-center justify-center shrink-0">3</span>
                    <span>Tap <strong>Link a Device</strong> and point your phone's camera at the QR code.</span>
                  </li>
                </ol>
              </div>

              {/* QR — only real Baileys QR, spinner until it arrives */}
              <div className="lg:col-span-5 flex items-start justify-center">
                <QrPanel qrString={qrString} />
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURES SHOWCASE ── */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-[#e9edef]" />
            <div className="flex items-center gap-2 text-xs font-bold text-[#667781] whitespace-nowrap">
              <div className="w-5 h-5 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0">
                {WA_SVG}
              </div>
              What you can do after connecting
            </div>
            <div className="h-px flex-1 bg-[#e9edef]" />
          </div>

          {/* 5 Feature Cards — 2-col on tablet, single col on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.label} {...f} />
            ))}

            {/* CTA card */}
            <div className="bg-[#00a884] rounded-2xl p-5 flex flex-col justify-between gap-4 text-white sm:col-span-2 xl:col-span-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">StudioCore CRM</p>
                <h3 className="text-base font-extrabold mt-1 leading-snug">
                  Connect once.<br />Automate everything.
                </h3>
                <p className="text-xs opacity-80 mt-2 leading-relaxed">
                  Link your WhatsApp device and let StudioCore handle client messaging automatically — so you focus on shooting, not follow-ups.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center">
                  {WA_SVG}
                </div>
                <span className="opacity-90">Powered by Baileys Gateway</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

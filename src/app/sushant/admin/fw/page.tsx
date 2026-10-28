'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminHeader, { DateFilterPreset } from './components/SuperAdminHeader';
import HeroKpiGrid from './components/HeroKpiGrid';
import StudiosMasterTable, { StudioItem } from './components/StudiosMasterTable';
import Pm2HeartbeatWidget from './components/Pm2HeartbeatWidget';
import WhatsAppTelemetryView from './components/WhatsAppTelemetryView';
import StudioKundaliModal from './components/StudioKundaliModal';
import { 
  Building2, Activity, MessageSquare, 
  Server, Shield, RefreshCw, AlertCircle, Sparkles,
  Lock, KeyRound, Mail, Eye, EyeOff, AlertTriangle, ArrowRight
} from 'lucide-react';

type MainTab = 'studios' | 'infra' | 'whatsapp';

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('fw_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Inlined Triple-Lock Gatekeeper Form
 * Guarantees zero stale chunk caching or browser autofill conflicts
 */
function TripleLockGatekeeper({ onSuccess }: { onSuccess: (email: string, token?: string) => void }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [secretCode, setSecretCode] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSec, setLockoutSec] = useState<number | null>(null);

  // Auto-detect native GET form submission parameters from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const qEmail = params.get('superadmin_vault_email') || '';
      const qPin = params.get('superadmin_vault_pin') || '';
      const qCode = params.get('superadmin_vault_code') || '';
      const qError = params.get('error');

      if (qError) {
        setErrorMsg(decodeURIComponent(qError));
      }

      if (qEmail && qPin && qCode) {
        setEmail(qEmail);
        setPin(qPin);
        setSecretCode(qCode);

        // Immediate verification with query parameters
        (async () => {
          try {
            setIsLoading(true);
            const res = await fetch('/api/sushant/admin/fw/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: qEmail.trim(), pin: qPin.trim(), secretCode: qCode.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              window.history.replaceState({}, '', '/sushant/admin/fw');
              onSuccess(data.email || qEmail.trim(), data.token);
            } else {
              setErrorMsg(data.error || 'Triple-lock authentication failed.');
            }
          } catch (_) {
            setErrorMsg('Connection error during verification.');
          } finally {
            setIsLoading(false);
          }
        })();
      }
    } catch (_) {}
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !pin.trim() || !secretCode.trim()) {
      setErrorMsg('All 3 authentication keys (Master Email, Master PIN, and Authorization Secret Code) are required.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await fetch('/api/sushant/admin/fw/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          pin: pin.trim(), 
          secretCode: secretCode.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.locked && data.remainingSec) {
          setLockoutSec(data.remainingSec);
        }
        throw new Error(data.error || 'Triple-lock authentication failed.');
      }

      onSuccess(data.email || email.trim(), data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle luxury ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-amber-200/40 via-orange-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-[#EAE5DA] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-8 sm:p-10 relative z-10 space-y-6">
        
        {/* Branding & Shield Emblem */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-white">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-900 text-[10px] font-black tracking-wider uppercase mb-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Triple-Lock Zero-Trust Vault</span>
            </div>
            <h1 className="text-2xl font-black text-[#1E2229] tracking-tight">
              StudioCore Super Admin
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              High-security executive portal. 3-tier credentials required.
            </p>
          </div>
        </div>

        {/* Error / Lockout Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p>{errorMsg}</p>
              {lockoutSec && (
                <p className="text-[10px] text-rose-600 mt-0.5">
                  Security lockout: {Math.ceil(lockoutSec / 60)} minutes remaining.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Triple-Lock Challenge Form with Native POST Fallback */}
        <form action="/api/sushant/admin/fw/form-login" method="POST" onSubmit={handleSubmit} className="space-y-4">
          
          {/* Key 1: Master Executive Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Master Executive Email</span>
            </label>
            <div className="relative">
              <input
                type="email"
                name="superadmin_vault_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Master Executive Email..."
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
            </div>
          </div>

          {/* Key 2: Master Security PIN */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Master Security PIN</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                name="superadmin_vault_pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter Master PIN..."
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle PIN visibility"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key 3: Authorization Secret Code */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Authorization Secret Code</span>
            </label>
            <div className="relative">
              <input
                type={showSecretCode ? 'text' : 'password'}
                name="superadmin_vault_code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Enter Authorization Secret Code..."
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#FAF8F5] border border-[#EAE5DA] text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition placeholder:text-slate-400 placeholder:font-normal"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretCode(!showSecretCode)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle Secret Code visibility"
              >
                {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (lockoutSec !== null && lockoutSec > 0)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black tracking-wide shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Triple-Lock Security...</span>
              </span>
            ) : (
              <>
                <span>Unlock Super Admin Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>3-Tier Authorization · IP Monitored</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/60 text-[10px]">
            v2.0 Triple-Lock
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminFwPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');

  // Date Filter states
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dashboard Data
  const [studios, setStudios] = useState<StudioItem[]>([]);
  const [kpis, setKpis] = useState<any>({
    totalStudios: 0,
    activePaid: 0,
    trialStudios: 0,
    activeToday: 0,
    activeThisWeek: 0,
    suspendedCount: 0,
    totalStorageGB: 0,
    totalGrossRevenue: 0,
    totalAdvanceReceived: 0,
    totalLeads: 0,
    totalQuotations: 0,
    totalBookings: 0,
    totalTeamMembers: 0,
    totalGalleries: 0,
    totalPhotos: 0,
    whatsAppConnectedCount: 0,
    whatsAppTotalMessages: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('studios');

  // Kundali Modal
  const [inspectedStudio, setInspectedStudio] = useState<StudioItem | null>(null);

  // Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const headers = getAuthHeaders();
        const res = await fetch('/api/sushant/admin/fw/auth', { headers });
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true);
          if (data.email) setAdminEmail(data.email);
        } else {
          setIsAuthenticated(false);
        }
      } catch (_) {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  // Fetch Dashboard Telemetry Data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const url = `/api/sushant/admin/fw?${params.toString()}`;
      const headers = getAuthHeaders();
      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error(data.error || 'Failed to load telemetry data');
      }

      setStudios(data.studios || []);
      setKpis(data.kpis || {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with Super Admin gateway');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: DateFilterPreset) => {
    setDatePreset(preset);
    const now = new Date();
    const toIsoDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      const todayStr = toIsoDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toIsoDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setStartDate(toIsoDate(past));
      setEndDate(toIsoDate(now));
    } else if (preset === '30d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setStartDate(toIsoDate(past));
      setEndDate(toIsoDate(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/sushant/admin/fw/auth', { method: 'DELETE' });
    } catch (_) {}
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fw_admin_token');
    }
    setIsAuthenticated(false);
  };

  // Not authenticated -> Show Luxury Master Challenge Gatekeeper
  if (!isAuthenticated) {
    return (
      <TripleLockGatekeeper
        onSuccess={(email, token) => {
          if (typeof window !== 'undefined' && token) {
            sessionStorage.setItem('fw_admin_token', token);
          }
          setAdminEmail(email);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 font-sans flex flex-col">
      
      {/* ── STICKY TOP BAR ── */}
      <SuperAdminHeader
        adminEmail={adminEmail}
        selectedPreset={datePreset}
        onSelectPreset={handleSelectPreset}
        startDate={startDate}
        endDate={endDate}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onRefresh={() => loadDashboardData(true)}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
        onlineWorkersCount={kpis.whatsAppConnectedCount > 0 ? 3 : 2}
        totalWorkersCount={3}
      />

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        
        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button 
              onClick={() => loadDashboardData()}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 3D HERO KPI GRID ── */}
        <HeroKpiGrid kpis={kpis} isLoading={isLoading} />

        {/* ── SECTION NAVIGATION TABS ── */}
        <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-2 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('studios')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'studios'
                  ? 'bg-white text-slate-900 shadow-sm border border-[#EAE5DA]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Studios Directory ({studios.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('whatsapp')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'whatsapp'
                  ? 'bg-white text-slate-900 shadow-sm border border-[#EAE5DA]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp & Integrations</span>
            </button>

            <button
              onClick={() => setActiveMainTab('infra')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'infra'
                  ? 'bg-white text-slate-900 shadow-sm border border-[#EAE5DA]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Server className="w-4 h-4 text-sky-600" />
              <span>PM2 Daemons & VPS Health</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Telemetry Live Stream Active</span>
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        {activeMainTab === 'studios' && (
          <StudiosMasterTable 
            studios={studios} 
            isLoading={isLoading} 
            onInspectStudio={(s) => setInspectedStudio(s)}
          />
        )}

        {activeMainTab === 'whatsapp' && (
          <WhatsAppTelemetryView studios={studios} />
        )}

        {activeMainTab === 'infra' && (
          <div className="space-y-6">
            <Pm2HeartbeatWidget />
          </div>
        )}

      </main>

      {/* ── INSPECT STUDIO KUNDALI DRAWER / MODAL ── */}
      {inspectedStudio && (
        <StudioKundaliModal
          studio={inspectedStudio}
          onClose={() => setInspectedStudio(null)}
          onStudioUpdated={() => loadDashboardData(true)}
        />
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#EAE5DA] bg-white py-4 px-6 text-center text-xs text-slate-400 font-medium">
        StudioCore Autonomous Operations & Telemetry Platform · Strictly Confidential Super Admin Vault
      </footer>

    </div>
  );
}

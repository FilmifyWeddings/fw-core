'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MasterGatekeeperLogin from './components/MasterGatekeeperLogin';
import SuperAdminHeader, { DateFilterPreset } from './components/SuperAdminHeader';
import HeroKpiGrid from './components/HeroKpiGrid';
import StudiosMasterTable, { StudioItem } from './components/StudiosMasterTable';
import Pm2HeartbeatWidget from './components/Pm2HeartbeatWidget';
import WhatsAppTelemetryView from './components/WhatsAppTelemetryView';
import StudioKundaliModal from './components/StudioKundaliModal';
import { 
  Building2, Activity, MessageSquare, 
  Server, Shield, RefreshCw, AlertCircle, Sparkles 
} from 'lucide-react';

type MainTab = 'studios' | 'infra' | 'whatsapp';

export default function SuperAdminFwPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
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
        const res = await fetch('/api/sushant/admin/fw/auth');
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
      const res = await fetch(url);
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
    setIsAuthenticated(false);
  };

  // Still checking session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center animate-pulse shadow-md">
          <Shield className="w-6 h-6" />
        </div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
          Authenticating Vault Access...
        </p>
      </div>
    );
  }

  // Not authenticated -> Show Luxury Master Challenge Gatekeeper
  if (!isAuthenticated) {
    return (
      <MasterGatekeeperLogin
        onSuccess={(email) => {
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

        {/* ── HERO KPI GRID (3D Glassmorphic Cards) ── */}
        <HeroKpiGrid kpis={kpis} />

        {/* ── MAIN SECTION TABS ── */}
        <div className="flex items-center gap-2 border-b border-[#EAE5DA] pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMainTab('studios')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'studios'
                ? 'bg-white text-slate-900 shadow-xs border border-[#EAE5DA] font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Studios Master Directory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px]">
              {studios.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('infra')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'infra'
                ? 'bg-white text-slate-900 shadow-xs border border-[#EAE5DA] font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Infra & PM2 Heartbeat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('whatsapp')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'whatsapp'
                ? 'bg-white text-slate-900 shadow-xs border border-[#EAE5DA] font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp & Integrations Matrix</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[10px]">
              {kpis.whatsAppConnectedCount} Online
            </span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        {isLoading && !isRefreshing ? (
          <div className="p-16 bg-white border border-[#EAE5DA] rounded-3xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-amber-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Aggregating Multi-Tenant Profiles & Real CRM Telemetry...
            </p>
          </div>
        ) : (
          <>
            {activeMainTab === 'studios' && (
              <StudiosMasterTable
                studios={studios}
                onInspectStudio={(s) => setInspectedStudio(s)}
                onRefresh={() => loadDashboardData(true)}
              />
            )}

            {activeMainTab === 'infra' && (
              <Pm2HeartbeatWidget />
            )}

            {activeMainTab === 'whatsapp' && (
              <WhatsAppTelemetryView
                studios={studios}
                onInspectStudio={(s) => setInspectedStudio(s)}
              />
            )}
          </>
        )}

      </main>

      {/* ── STUDIO KUNDALI DEEP-DIVE MODAL ── */}
      {inspectedStudio && (
        <StudioKundaliModal
          studio={inspectedStudio}
          isOpen={Boolean(inspectedStudio)}
          onClose={() => setInspectedStudio(null)}
          onRefreshData={() => {
            loadDashboardData(true);
            // Refresh inspected studio data in place
            const updated = studios.find(s => s.id === inspectedStudio.id);
            if (updated) setInspectedStudio(updated);
          }}
        />
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-auto py-4 px-6 border-t border-[#EAE5DA] text-center text-xs text-slate-400">
        StudioCore Enterprise Platform • Restricted Super Admin Vault (`/sushant/admin/fw`)
      </footer>

    </div>
  );
}

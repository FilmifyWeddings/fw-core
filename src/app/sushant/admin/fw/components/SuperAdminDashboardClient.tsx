'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminHeader, { DateFilterPreset } from './SuperAdminHeader';
import HeroKpiGrid from './HeroKpiGrid';
import StudiosMasterTable, { StudioItem } from './StudiosMasterTable';
import Pm2HeartbeatWidget from './Pm2HeartbeatWidget';
import WhatsAppTelemetryView from './WhatsAppTelemetryView';
import StudioKundaliModal from './StudioKundaliModal';
import { 
  Building2, Activity, MessageSquare, 
  Server, AlertCircle 
} from 'lucide-react';

type MainTab = 'studios' | 'infra' | 'whatsapp';

interface SuperAdminDashboardClientProps {
  adminEmail: string;
  token: string;
}

function getAuthHeaders(explicitToken?: string): HeadersInit {
  const headers: Record<string, string> = {};
  let token = explicitToken;
  if (!token && typeof window !== 'undefined') {
    token = sessionStorage.getItem('fw_admin_token') || undefined;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export default function SuperAdminDashboardClient({ adminEmail, token }: SuperAdminDashboardClientProps) {
  // Store token in sessionStorage for API calls
  useEffect(() => {
    if (typeof window !== 'undefined' && token) {
      try {
        sessionStorage.setItem('fw_admin_token', token);
      } catch (_) {}
    }
  }, [token]);

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
      const headers = getAuthHeaders(token);
      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          window.location.href = '/sushant/admin/fw';
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
  }, [startDate, endDate, token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
      try {
        sessionStorage.removeItem('fw_admin_token');
      } catch (_) {}
      window.location.href = '/sushant/admin/fw';
    }
  };

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
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold cursor-pointer"
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

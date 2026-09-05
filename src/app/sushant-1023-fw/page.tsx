'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Lock,
  ArrowUpDown,
  Building2,
  User,
  Phone,
  Mail,
  Crown,
  Sparkles,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  X,
  Radio,
} from 'lucide-react';
import MasterSecurityPinModal, {
  checkIsSecurityUnlocked,
  clearSecurityUnlocked,
  getSessionRemainingSeconds,
} from './components/MasterSecurityPinModal';
import PlatformKpis, { PlatformKpisData } from './components/PlatformKpis';
import TenantKundaliDrawer, { StudioTenant } from './components/TenantKundaliDrawer';

type FilterTab = 'all' | 'paid' | 'trial' | 'blocked';
type SortOption = 'active' | 'name' | 'plan' | 'created';

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return 'Never';
  const diffSec = Math.floor((Date.now() - time) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SuperAdminGodModePage() {
  const router = useRouter();

  // Layer 2 Security Gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Data fetching state
  const [studios, setStudios] = useState<StudioTenant[]>([]);
  const [kpis, setKpis] = useState<PlatformKpisData>({
    totalStudios: 0,
    activePaid: 0,
    trialStudios: 0,
    activeToday: 0,
    suspendedCount: 0,
    totalStorageBytes: 0,
    totalBookings: 0,
    totalTeamMembers: 0,
    totalQuotations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('active');

  // Kundali Drawer & Modals
  const [selectedKundaliStudio, setSelectedKundaliStudio] = useState<StudioTenant | null>(null);
  const [isKundaliOpen, setIsKundaliOpen] = useState(false);

  // Plan Management Modal
  const [planModalStudio, setPlanModalStudio] = useState<StudioTenant | null>(null);
  const [planModalTier, setPlanModalTier] = useState<string>('trial');
  const [planModalExpiry, setPlanModalExpiry] = useState<string>('');
  const [planModalLoading, setPlanModalLoading] = useState(false);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Check Layer 2 PIN session on mount
  useEffect(() => {
    const unlocked = checkIsSecurityUnlocked();
    setIsUnlocked(unlocked);
    if (unlocked) {
      setRemainingSeconds(getSessionRemainingSeconds());
    }
  }, []);

  // Countdown timer for 30-min auto timeout
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      const remaining = getSessionRemainingSeconds();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsUnlocked(false);
        clearSecurityUnlocked();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isUnlocked]);

  // Load Data
  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/sushant-1023-fw');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to load platform data');
      }
      if (json.studios) setStudios(json.studios);
      if (json.kpis) setKpis(json.kpis);
    } catch (err: any) {
      setFetchError(err.message || 'Error fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchData();
    }
  }, [isUnlocked]);

  const handleLockConsole = () => {
    clearSecurityUnlocked();
    setIsUnlocked(false);
    showToast('Console Locked Successfully', 'success');
  };

  // Quick Action: Block/Unblock
  const handleToggleBlock = async (studio: StudioTenant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !studio.is_platform_blocked;
    const promptText = nextState
      ? `CONFIRM: Block "${studio.studio_name}" from workspace access?`
      : `CONFIRM: Unblock "${studio.studio_name}" and restore workspace access?`;

    if (!confirm(promptText)) return;

    try {
      const res = await fetch('/api/sushant-1023-fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_block',
          targetUserId: studio.id,
          payload: { is_platform_blocked: nextState },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to toggle block');
      showToast(data.message || 'Updated status successfully.');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  // Open Plan Modal
  const openPlanModal = (studio: StudioTenant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlanModalStudio(studio);
    setPlanModalTier(studio.subscription_plan || 'trial');
    setPlanModalExpiry(
      studio.subscription_expires_at
        ? new Date(studio.subscription_expires_at).toISOString().split('T')[0]
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
  };

  const savePlanModal = async () => {
    if (!planModalStudio) return;
    setPlanModalLoading(true);
    try {
      const res = await fetch('/api/sushant-1023-fw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan',
          targetUserId: planModalStudio.id,
          payload: {
            subscription_plan: planModalTier,
            subscription_expires_at: new Date(planModalExpiry).toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update plan');
      showToast(data.message || 'Plan updated.');
      setPlanModalStudio(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setPlanModalLoading(false);
    }
  };

  const addDaysToPlanModal = (days: number) => {
    const base = planModalExpiry ? new Date(planModalExpiry).getTime() : Date.now();
    const newDate = new Date(base + days * 24 * 60 * 60 * 1000);
    setPlanModalExpiry(newDate.toISOString().split('T')[0]);
  };

  // Open Kundali
  const openKundali = (studio: StudioTenant) => {
    setSelectedKundaliStudio(studio);
    setIsKundaliOpen(true);
  };

  // Filter & Search computation
  const filteredStudios = useMemo(() => {
    let list = [...studios];

    // Filter by tab
    if (activeTab === 'paid') {
      list = list.filter((s) => ['pro', 'business', 'enterprise'].includes(s.subscription_plan));
    } else if (activeTab === 'trial') {
      list = list.filter((s) => s.subscription_plan === 'trial');
    } else if (activeTab === 'blocked') {
      list = list.filter((s) => s.is_platform_blocked);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.studio_name.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.studio_name.localeCompare(b.studio_name);
      } else if (sortBy === 'plan') {
        return a.subscription_plan.localeCompare(b.subscription_plan);
      } else if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        // active (default)
        return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
      }
    });

    return list;
  }, [studios, activeTab, searchQuery, sortBy]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: studios.length,
      paid: studios.filter((s) => ['pro', 'business', 'enterprise'].includes(s.subscription_plan)).length,
      trial: studios.filter((s) => s.subscription_plan === 'trial').length,
      blocked: studios.filter((s) => s.is_platform_blocked).length,
    };
  }, [studios]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200 relative overflow-x-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-rose-950/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-amber-950/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-emerald-950/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Layer 2 Security PIN Gate */}
      <MasterSecurityPinModal
        isOpen={!isUnlocked}
        onSuccess={() => {
          setIsUnlocked(true);
          setRemainingSeconds(getSessionRemainingSeconds());
        }}
        onLock={handleLockConsole}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toastMsg.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top God-Mode Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-850/80 bg-zinc-950/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          
          {/* Logo & Node Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white font-serif">
                  StudioCore God-Mode
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[9px] font-bold uppercase tracking-wider">
                  MASTER CONSOLE
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2">
                <span>AUTH: Sushant Nawale</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Cluster
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls: Session Timer, Lock, Refresh, Workspace Link */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Session countdown badge */}
            {isUnlocked && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>Session: {formatTimer(remainingSeconds)}</span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Refresh Platform Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            </button>

            {/* Lock Console Button */}
            <button
              type="button"
              onClick={handleLockConsole}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
              title="Lock Console"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Lock Gate</span>
            </button>

            {/* Workspace Link */}
            <button
              type="button"
              onClick={() => router.push('/workspace')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all flex items-center gap-1.5"
            >
              <span>Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        
        {/* SECTION 1: PLATFORM KPIS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-400">
              Platform Health & Multi-Tenant Telemetry
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              TOTAL SUBSCRIBERS: {kpis.totalStudios}
            </span>
          </div>

          <PlatformKpis kpis={kpis} isLoading={isLoading} />
        </section>

        {/* SECTION 2: STUDIO DIRECTORY TABLE */}
        <section className="space-y-4">
          
          {/* Controls Bar: Search, Filter Tabs, Sort */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850/80 backdrop-blur-xl">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { id: 'all', label: 'All Studios', count: tabCounts.all },
                  { id: 'paid', label: 'Paid Subscribers', count: tabCounts.paid },
                  { id: 'trial', label: 'Trial Studios', count: tabCounts.trial },
                  { id: 'blocked', label: 'Blocked / Suspended', count: tabCounts.blocked },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-zinc-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="flex items-center gap-2.5 flex-1 md:max-w-md ml-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search studio, owner, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/70 focus:shadow-[0_0_15px_rgba(244,63,94,0.15)] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/70 font-medium cursor-pointer"
                >
                  <option value="active">Sort: Last Active</option>
                  <option value="name">Sort: Studio Name</option>
                  <option value="plan">Sort: Plan Tier</option>
                  <option value="created">Sort: Date Joined</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="rounded-3xl border border-zinc-850 bg-zinc-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-900/40 text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                    <th className="py-3.5 px-4 font-medium">Studio & Owner</th>
                    <th className="py-3.5 px-4 font-medium">Plan & Expiry</th>
                    <th className="py-3.5 px-4 font-medium">Health / Status</th>
                    <th className="py-3.5 px-4 font-medium">Last Active</th>
                    <th className="py-3.5 px-4 font-medium text-right">God-Mode Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/60 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500" />
                        <div>Loading StudioCore platform registry...</div>
                      </td>
                    </tr>
                  ) : filteredStudios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500">
                        No studios match your filter or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredStudios.map((studio) => {
                      // Days remaining
                      const expiryTime = studio.subscription_expires_at
                        ? new Date(studio.subscription_expires_at).getTime()
                        : 0;
                      const daysRemaining = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));

                      const cleanPhone = studio.phone.replace(/\D/g, '');

                      return (
                        <tr
                          key={studio.id}
                          onClick={() => openKundali(studio)}
                          className="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                        >
                          {/* Col 1: Studio & Owner Details */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0 relative overflow-hidden">
                                {studio.logo_url || studio.avatar_url ? (
                                  <img
                                    src={studio.logo_url || studio.avatar_url}
                                    alt={studio.studio_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{studio.studio_name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="space-y-0.5 max-w-[220px]">
                                <div className="font-bold text-white text-sm group-hover:text-rose-400 transition-colors truncate">
                                  {studio.studio_name}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                                  <span>{studio.owner_name}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-2">
                                  <span>{studio.email}</span>
                                  {studio.phone && (
                                    <>
                                      <span>•</span>
                                      <span>{studio.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Plan Badge */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                    studio.subscription_plan === 'enterprise'
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                      : studio.subscription_plan === 'business'
                                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                      : studio.subscription_plan === 'pro'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                  }`}
                                >
                                  {studio.subscription_plan}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {daysRemaining > 0 ? (
                                  <span className={daysRemaining <= 3 ? 'text-rose-400 font-semibold' : 'text-zinc-400'}>
                                    {daysRemaining} days left
                                  </span>
                                ) : (
                                  <span className="text-rose-400 font-semibold">Expired</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Col 3: Status Indicator */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {studio.is_platform_blocked ? (
                                <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                  <span>Blocked</span>
                                </div>
                              ) : studio.is_active_today ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                                  <span>Active Now</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-400/80 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-amber-500/70" />
                                  <span>Idle</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Col 4: Activity Tracker */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <div className="text-zinc-300 font-medium">
                                {formatRelativeTime(studio.last_active_at)}
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                Joined {new Date(studio.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </td>

                          {/* Col 5: Quick Actions */}
                          <td className="py-4 px-4 text-right">
                            <div
                              className="inline-flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* WhatsApp Button */}
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Manage Plan Button */}
                              <button
                                type="button"
                                onClick={(e) => openPlanModal(studio, e)}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-[11px] transition-colors"
                              >
                                Plan
                              </button>

                              {/* Block / Unblock Toggle */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleBlock(studio, e)}
                                className={`px-2.5 py-1.5 rounded-xl border font-semibold text-[11px] transition-colors ${
                                  studio.is_platform_blocked
                                    ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-950/40 hover:bg-rose-950/60 border-rose-500/30 text-rose-300'
                                }`}
                              >
                                {studio.is_platform_blocked ? 'Unblock' : 'Block'}
                              </button>

                              {/* Studio Kundali Button */}
                              <button
                                type="button"
                                onClick={() => openKundali(studio)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all"
                              >
                                <span>Kundali</span>
                                <ChevronRight className="w-3 h-3 opacity-70" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-out Deep Kundali Drawer */}
      <TenantKundaliDrawer
        studio={selectedKundaliStudio}
        isOpen={isKundaliOpen}
        onClose={() => setIsKundaliOpen(false)}
        onRefresh={fetchData}
        onOpenPlanModal={(studio) => openPlanModal(studio)}
      />

      {/* Manage Plan Modal */}
      {planModalStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  Manage Subscription Plan
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {planModalStudio.studio_name} ({planModalStudio.owner_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalStudio(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan Tier Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Select Plan Tier</label>
              <div className="grid grid-cols-2 gap-2">
                {(['trial', 'pro', 'business', 'enterprise'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlanModalTier(tier)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      planModalTier === tier
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-950/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tier} Plan
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Expiry Date */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Subscription Expiration Date</label>
              <input
                type="date"
                value={planModalExpiry}
                onChange={(e) => setPlanModalExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Quick Extension Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-zinc-500">Quick Extension Shortcuts:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addDaysToPlanModal(7)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-300"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => addDaysToPlanModal(30)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-300"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => addDaysToPlanModal(90)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-300"
                >
                  +90 Days
                </button>
                <button
                  type="button"
                  onClick={() => addDaysToPlanModal(365)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-300"
                >
                  +1 Year
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setPlanModalStudio(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={planModalLoading}
                onClick={savePlanModal}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                {planModalLoading ? 'Saving...' : 'Apply Plan Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

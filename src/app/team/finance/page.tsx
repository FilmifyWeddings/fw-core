'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import {
  IndianRupee,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Eye,
  Download,
  Filter,
  Sparkles,
  Receipt,
  User,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
  List,
  CalendarDays,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import ShootDetailsModal from '@/components/team/ShootDetailsModal';
import TeamPortalLineGraph from '@/components/team/TeamPortalLineGraph';
import TeamMemberFinanceDrawer from '@/app/workspace/team/components/TeamMemberFinanceDrawer';

interface ShootFinancial {
  assignment_id: string;
  sub_event_id: string;
  project_id: string;
  workspace_id: string;
  studio_name: string;
  studio_logo?: string;
  client_name: string;
  couple_name: string;
  event_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_location: string;
  role_name: string;
  agreed_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  shoot_status?: string;
  notes?: string;
}

export default function TeamFinancePage() {
  const router = useRouter();
  const { workspaceName, activeWorkspace, userRole } = useWorkspace();
  const [shoots, setShoots] = useState<ShootFinancial[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [activeTab, setActiveTab] = useState<'shoots' | 'deliverables' | 'salaries'>('shoots');

  // Requirement: Default view is LIST, then Cards, then Month-Wise
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'month'>('list');

  // Secure Token & Copy State
  const [attendanceToken, setAttendanceToken] = useState<string | null>(null);
  const [attendanceDirectUrl, setAttendanceDirectUrl] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Shoot Details Modal
  const [selectedShoot, setSelectedShoot] = useState<ShootFinancial | null>(null);
  const [isShootModalOpen, setIsShootModalOpen] = useState(false);

  // Financial Drawer
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<any | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [financeInitialTab, setFinanceInitialTab] = useState<'bookings' | 'payroll' | 'analytics' | 'deliverables'>('bookings');
  const [currentMemberProfile, setCurrentMemberProfile] = useState<any | null>(null);

  // Load crew data, deliverables, and salaries
  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      const activeUser = session?.user || user;

      if (!activeUser) {
        router.push('/team/login');
        return;
      }

      const token = session?.access_token;
      const targetWs = activeWorkspace?.workspaceId || activeWorkspace?.studioSlug;
      const url = targetWs && targetWs !== 'all'
        ? `/api/team/portal-data?workspace_id=${encodeURIComponent(targetWs)}`
        : '/api/team/portal-data';

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      let loadedShoots = [];
      let slipRows = [];
      let fetchedDelivs = [];
      let profile = null;

      if (json.success) {
        loadedShoots = Array.isArray(json.shoots) ? json.shoots : [];
        slipRows = Array.isArray(json.salaries) ? json.salaries : [];
        fetchedDelivs = Array.isArray(json.deliverables) ? json.deliverables : [];
        profile = json.memberProfile || null;
        if (json.attendanceToken) setAttendanceToken(json.attendanceToken);
        if (json.attendanceDirectUrl) setAttendanceDirectUrl(json.attendanceDirectUrl);
      }

      setShoots(loadedShoots);
      setSalaries(slipRows);
      setDeliverables(fetchedDelivs);

      const rawName = profile?.name || activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'Team Member';
      const cleanRate = Number(profile?.default_daily_rate || 0);
      const cleanFreq = profile?.payout_frequency || 'daily';

      setCurrentMemberProfile({
        id: profile?.id || activeUser.id,
        name: rawName,
        email: profile?.email || activeUser.email || '',
        phone: profile?.phone || activeUser.phone || activeUser.user_metadata?.phone || '',
        primary_role: profile?.primary_role || userRole || 'Crew',
        primary_type: profile?.primary_type || 'IN_HOUSE',
        default_daily_rate: cleanRate,
        daily_rate: cleanRate,
        payout_frequency: cleanFreq,
        workspace_id: targetWs || '',
        assignments: loadedShoots,
      });
    } catch (err) {
      console.error('[Team Finance Page] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [router, activeWorkspace?.workspaceId]);

  const uniqueStudios = Array.from(new Set(shoots.map(s => s.studio_name).filter(Boolean)));

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const filteredShoots = useMemo(() => {
    return shoots.filter((s) => {
      const matchesStudio = selectedStudio === 'all' || s.studio_name === selectedStudio;
      if (!matchesStudio) return false;

      const isPaid = (Number(s.balance_amount) <= 0 && Number(s.agreed_amount) > 0) || (s.payment_status || '').toUpperCase() === 'PAID';
      if (statusFilter === 'paid' && !isPaid) return false;
      if (statusFilter === 'pending' && isPaid) return false;

      return true;
    }).sort((a, b) => {
      if (a.event_date === 'TBD') return 1;
      if (b.event_date === 'TBD') return -1;
      return a.event_date.localeCompare(b.event_date);
    });
  }, [shoots, selectedStudio, statusFilter]);

  // Group Shoots by Month for Month-Wise View
  const shootsByMonth = useMemo(() => {
    const groups: { [key: string]: { label: string; shoots: ShootFinancial[] } } = {};

    filteredShoots.forEach((s) => {
      let key = 'TBD';
      let label = 'Upcoming (Dates TBD)';

      if (s.event_date && s.event_date !== 'TBD') {
        try {
          const d = new Date(s.event_date);
          if (!isNaN(d.getTime())) {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
        } catch (_) {}
      }

      if (!groups[key]) {
        groups[key] = { label, shoots: [] };
      }
      groups[key].shoots.push(s);
    });

    return Object.keys(groups)
      .sort()
      .map((key) => groups[key]);
  }, [filteredShoots]);

  // Monthly Financial Line Graph Data
  const financeGraphData = useMemo(() => {
    const monthMap = new Map<string, { totalAmount: number; receivedAmount: number; balanceAmount: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = d.toLocaleDateString('en-US', { month: 'short' });
      monthMap.set(mKey, { totalAmount: 0, receivedAmount: 0, balanceAmount: 0 });
    }

    filteredShoots.forEach((s) => {
      if (s.event_date && s.event_date !== 'TBD') {
        try {
          const d = new Date(s.event_date);
          if (!isNaN(d.getTime())) {
            const mKey = d.toLocaleDateString('en-US', { month: 'short' });
            if (!monthMap.has(mKey)) {
              monthMap.set(mKey, { totalAmount: 0, receivedAmount: 0, balanceAmount: 0 });
            }
            const rec = monthMap.get(mKey)!;
            const agreed = Number(s.agreed_amount) || 0;
            const paid = Number(s.paid_amount ?? s.advance_amount) || 0;
            rec.totalAmount += agreed;
            rec.receivedAmount += paid;
            rec.balanceAmount += Math.max(0, agreed - paid);
          }
        } catch (_) {}
      }
    });

    deliverables.forEach((deliv) => {
      const dt = deliv.due_date;
      if (dt && dt !== 'TBD') {
        try {
          const d = new Date(dt);
          if (!isNaN(d.getTime())) {
            const mKey = d.toLocaleDateString('en-US', { month: 'short' });
            if (!monthMap.has(mKey)) {
              monthMap.set(mKey, { totalAmount: 0, receivedAmount: 0, balanceAmount: 0 });
            }
            const rec = monthMap.get(mKey)!;
            const agreed = Number(deliv.agreed_amount) || 0;
            const paid = Number(deliv.paid_amount) || 0;
            rec.totalAmount += agreed;
            rec.receivedAmount += paid;
            rec.balanceAmount += Math.max(0, agreed - paid);
          }
        } catch (_) {}
      }
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      totalAmount: data.totalAmount,
      receivedAmount: data.receivedAmount,
      balanceAmount: data.balanceAmount,
    }));
  }, [filteredShoots, deliverables]);

  // Combined Totals (Shoots + Deliverables + Salaries)
  const totalShootAgreed = filteredShoots.reduce((acc, s) => acc + (Number(s.agreed_amount) || 0), 0);
  const totalShootPaid = filteredShoots.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0);
  const totalShootBalance = filteredShoots.reduce((acc, s) => acc + (Number(s.balance_amount) || 0), 0);

  const totalDelivAgreed = deliverables.reduce((acc, d) => acc + (Number(d.agreed_amount) || 0), 0);
  const totalDelivPaid = deliverables.reduce((acc, d) => acc + (Number(d.paid_amount) || 0), 0);
  const totalDelivBalance = deliverables.reduce((acc, d) => acc + (Number(d.balance_amount) || 0), 0);

  const totalSalaryNet = salaries.reduce((acc, s) => acc + (Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0), 0);
  const totalSalaryPaid = salaries.reduce((acc, s) => acc + (Number(s.net_paid ?? s.paid_amount ?? s.net_payable) || 0), 0);
  const totalSalaryBalance = Math.max(0, totalSalaryNet - totalSalaryPaid);

  const grandAgreed = totalShootAgreed + totalDelivAgreed + totalSalaryNet;
  const grandPaid = totalShootPaid + totalDelivPaid + totalSalaryPaid;
  const grandBalance = totalShootBalance + totalDelivBalance + totalSalaryBalance;
  const payoutPercentage = grandAgreed > 0 ? Math.min(100, Math.round((grandPaid / grandAgreed) * 100)) : 100;

  const handleCopyToken = () => {
    if (!attendanceToken) return;
    navigator.clipboard.writeText(attendanceToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2500);
  };

  if (loading) {
    return <StudioCoreLiquidLoader label="Synchronizing Studio Financials..." />;
  }

  return (
    <div className="w-full font-josefin">
      <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6">
        
        {/* 1. Header Banner (Renamed to "My Finance") */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#166534] border border-emerald-200 font-black flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live Studio Synchronized (Read-Only)
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-500">{currentMemberProfile?.primary_role || userRole || 'Team Member'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-josefin">
              My Finance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium font-josefin">
              View your total amount contracted, received payouts, pending balance, and official salary vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadFinanceData}
              className="p-2 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 transition shadow-2xs cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <WorkspaceSwitcher />
          </div>
        </div>

        {/* ── SECURE TOKEN DISPLAY BANNER ── */}
        {attendanceToken && (
          <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block font-josefin">
                  Team Member Attendance Secure Token
                </span>
                <code className="text-xs sm:text-sm font-mono font-bold text-stone-100 tracking-wider">
                  {attendanceToken}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-josefin">
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{tokenCopied ? 'Copied!' : 'Copy Token'}</span>
              </button>
              {attendanceDirectUrl && (
                <a
                  href={attendanceDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Direct Punch Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 2. Top Financial KPI Cards (Clean Light UI, Renamed per instructions) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Amount */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-zinc-400">Total Amount</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-900 font-roboto tracking-tight">
                ₹{grandAgreed.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium font-josefin">
                Total contracted amount across all assignments &amp; slips
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-josefin">
              <span>Assignments:</span>
              <span className="font-bold text-zinc-700">
                <span className="font-roboto">{filteredShoots.length}</span> Shoots • <span className="font-roboto">{deliverables.length}</span> Deliverables
              </span>
            </div>
          </div>

          {/* Card 2: Received */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-zinc-400">Received</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-600 font-roboto tracking-tight">
                ₹{grandPaid.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium font-josefin">
                Total amount disbursed by studio owner(s)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-josefin">
              <span>Payout Cleared:</span>
              <span className="font-bold text-emerald-700 font-roboto">{payoutPercentage}% Completed</span>
            </div>
          </div>

          {/* Card 3: Pending Balance */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-amber-50/40 border border-amber-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span className="tracking-wider uppercase text-[11px] font-black text-amber-800">Pending Balance</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300/80">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-600 font-roboto tracking-tight">
                ₹{grandBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-amber-900/80 mt-1 font-medium font-josefin">
                {grandBalance > 0 ? 'Pending payout from studio owner' : 'All accounts fully settled 🎉'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-josefin">
              <span>Status:</span>
              <span className="font-black text-amber-800">
                {grandBalance > 0 ? 'Pending Collection' : 'Zero Due'}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3D LINE GRAPH UI FOR FINANCIALS ── */}
        <TeamPortalLineGraph
          type="finance"
          data={financeGraphData}
          title="Monthly Financial Overview"
          subtitle="Interactive line graph of total contracted amount, received disbursements, and pending balance"
        />

        {/* 3. Studio & Status Filter Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#EBE7DF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-josefin">
          {/* Main Tabs: Shoots vs Deliverables vs Salaries */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('shoots')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'shoots' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Assigned Shoots ({filteredShoots.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deliverables')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'deliverables' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Post-Production ({deliverables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('salaries')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'salaries' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Salary Slips ({salaries.length})</span>
            </button>
          </div>

          {/* Right Filters & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher: LIST FIRST (DEFAULT), THEN CARDS, THEN MONTH-WISE */}
            {activeTab === 'shoots' && (
              <div className="flex items-center p-1 bg-zinc-100/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'grid' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'month' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                  title="Month-Wise View"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Month-Wise</span>
                </button>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center p-1 bg-zinc-100/80 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Due' },
                { id: 'paid', label: 'Settled' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                    statusFilter === tab.id ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Tab 1: Assigned Shoots List */}
        {activeTab === 'shoots' && (
          <div className="space-y-3 font-josefin">
            {filteredShoots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Calendar className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Shoots Matching Filter</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Either no shoots have been assigned to your profile yet, or none match the selected status filter.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              /* ── 1. COMPACT LIST VIEW (DEFAULT) ── */
              <div className="bg-white rounded-2xl border border-[#EBE7DF] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-josefin">
                    <thead className="bg-zinc-50 text-zinc-500 font-black uppercase text-[10px] border-b border-zinc-200">
                      <tr>
                        <th className="p-3.5">Couple &amp; Event</th>
                        <th className="p-3.5">Shoot Date</th>
                        <th className="p-3.5">Call Timing</th>
                        <th className="p-3.5">Venue Location</th>
                        <th className="p-3.5">Assigned Role</th>
                        <th className="p-3.5">Total Fee</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-roboto">
                      {filteredShoots.map((shoot) => {
                        const agreed = Number(shoot.agreed_amount) || 0;
                        const isCompleted = shoot.shoot_status === 'COMPLETED' || (shoot.event_date < today && shoot.event_date !== 'TBD');
                        const isPaid = (shoot.payment_status || '').toUpperCase() === 'PAID';

                        return (
                          <tr
                            key={shoot.assignment_id}
                            onClick={() => {
                              setSelectedShoot(shoot);
                              setIsShootModalOpen(true);
                            }}
                            className="hover:bg-zinc-50/70 transition cursor-pointer"
                          >
                            <td className="p-3.5">
                              <span className="font-bold text-zinc-900 block font-josefin">{shoot.couple_name}</span>
                              <span className="text-[11px] text-amber-700 font-medium font-josefin">{shoot.event_name}</span>
                            </td>
                            <td className="p-3.5 font-bold text-zinc-800">{shoot.event_date}</td>
                            <td className="p-3.5 text-zinc-600">{shoot.start_time || 'TBD'}</td>
                            <td className="p-3.5 text-zinc-600 max-w-[180px] truncate">{shoot.venue_location || 'Venue TBD'}</td>
                            <td className="p-3.5 font-josefin">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                {shoot.role_name}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-zinc-900">₹{agreed.toLocaleString('en-IN')}</td>
                            <td className="p-3.5 font-josefin">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {isCompleted ? '✓ COMPLETED' : 'UPCOMING'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-josefin">
                              <button
                                type="button"
                                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── 2. CARDS VIEW ── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredShoots.map((shoot, idx) => {
                  const agreed = Number(shoot.agreed_amount) || 0;
                  const paid = Number(shoot.paid_amount) || 0;
                  const balance = Number(shoot.balance_amount) || 0;
                  const isSettled = balance <= 0 && agreed > 0;

                  return (
                    <div
                      key={shoot.assignment_id}
                      onClick={() => {
                        setSelectedShoot(shoot);
                        setIsShootModalOpen(true);
                      }}
                      className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between gap-4 cursor-pointer"
                    >
                      <div>
                        {/* Status & Studio Tag */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {shoot.studio_name}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isSettled ? '✓ Fully Paid' : `Pending ₹${balance.toLocaleString('en-IN')}`}
                          </span>
                        </div>

                        {/* Couple Name */}
                        <h4 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug">
                          {shoot.couple_name || shoot.client_name || 'Client Shoot'}
                        </h4>

                        {/* Sub-event Name */}
                        <p className="text-xs font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                          <span>{shoot.event_name || 'Shoot Function'}</span>
                        </p>

                        {/* Details Grid: Date, Location, Timing, Assigned Role */}
                        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-bold font-roboto">{shoot.event_date || 'Date TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-roboto">{shoot.start_time || 'Full Day'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{shoot.venue_location || 'Venue Details via Studio'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 text-amber-900 font-bold bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60">
                            <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Assigned Role: {shoot.role_name || 'Crew Member'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Commercials Summary Bar */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between font-roboto">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Agreed</span>
                            <span className="font-black text-zinc-900 text-sm">₹{agreed.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-zinc-200">|</div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Paid</span>
                            <span className="font-black text-emerald-600 text-sm">₹{paid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-zinc-200">|</div>
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Balance</span>
                            <span className="font-black text-amber-600 text-sm">₹{balance.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md font-josefin ${
                          isSettled ? 'text-emerald-700 bg-emerald-50' : 'text-amber-800 bg-amber-50'
                        }`}>
                          {isSettled ? 'Settled' : 'Due'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── 3. MONTH-WISE VIEW ── */
              <div className="space-y-6">
                {shootsByMonth.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-700" />
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        {group.label} (<span className="font-roboto">{group.shoots.length}</span>)
                      </h3>
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.shoots.map((shoot) => {
                        const agreed = Number(shoot.agreed_amount) || 0;
                        const isCompleted = shoot.shoot_status === 'COMPLETED' || (shoot.event_date < today && shoot.event_date !== 'TBD');

                        return (
                          <div
                            key={shoot.assignment_id}
                            onClick={() => {
                              setSelectedShoot(shoot);
                              setIsShootModalOpen(true);
                            }}
                            className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between group cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                                  {shoot.studio_name}
                                </span>
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  {shoot.role_name}
                                </span>
                              </div>

                              <h4 className="text-base font-black text-zinc-900 group-hover:text-amber-800 transition line-clamp-1">
                                {shoot.couple_name}
                              </h4>
                              <p className="text-xs font-bold text-amber-700 mt-0.5">{shoot.event_name}</p>

                              <div className="mt-3.5 space-y-1.5 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="font-bold text-zinc-900 font-roboto">{shoot.event_date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="font-roboto">{shoot.start_time || 'TBD'} {shoot.end_time ? `– ${shoot.end_time}` : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="truncate">{shoot.venue_location || 'Venue TBD'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between font-roboto">
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Total Fee</span>
                                <span className="text-sm font-black text-zinc-900">
                                  ₹{agreed.toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 font-josefin">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCompleted 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-amber-50 text-[#92400e] border border-amber-200'
                                }`}>
                                  {isCompleted ? '✓ COMPLETED' : 'UPCOMING'}
                                </span>
                                <span className="text-xs font-bold text-amber-700 flex items-center gap-0.5">
                                  <span>View</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Tab 2: Post-Production & Edits Deliverables */}
        {activeTab === 'deliverables' && (
          <div className="space-y-3 font-josefin">
            {deliverables.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Sparkles className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Post-Production Deliverables Assigned</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When your studio owner assigns video editing, photo retouching, or album deliverables to your profile, they will appear here with contracted fees and payment status.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deliverables
                  .filter(deliv => {
                    const isSettled = deliv.balance_amount <= 0 && deliv.agreed_amount > 0;
                    if (statusFilter === 'paid' && !isSettled) return false;
                    if (statusFilter === 'pending' && isSettled) return false;
                    return true;
                  })
                  .map((deliv) => {
                    const agreed = Number(deliv.agreed_amount) || 0;
                    const paid = Number(deliv.paid_amount) || 0;
                    const balance = Number(deliv.balance_amount) || 0;
                    const isSettled = balance <= 0 && agreed > 0;

                    return (
                      <div
                        key={deliv.id}
                        className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between gap-4"
                      >
                        <div>
                          {/* Segment Tag & Payment Status */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-zinc-100 text-zinc-700 border border-zinc-200">
                              {deliv.segment || 'Wedding'} • {deliv.category || 'Deliverable'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                              isSettled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : agreed === 0
                                ? 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isSettled ? '✓ Fully Paid' : agreed === 0 ? 'Rate TBD' : `Pending ₹${balance.toLocaleString('en-IN')}`}
                            </span>
                          </div>

                          {/* Client Name */}
                          <h4 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug">
                            {deliv.client_name || 'Client Project'}
                          </h4>

                          {/* Deliverable Title */}
                          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{deliv.title}</span>
                          </p>

                          {/* Details Grid */}
                          <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="font-bold font-roboto">Due: {deliv.due_date || 'TBD'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-bold text-zinc-800">Status: {deliv.status}</span>
                            </div>
                            {deliv.specs && (
                              <div className="flex items-center gap-1.5 col-span-2 text-zinc-600">
                                <span className="font-bold text-stone-500">Specs:</span>
                                <span className="font-medium text-stone-800">{deliv.specs}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Commercials Summary Bar */}
                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between font-roboto">
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Agreed</span>
                              <span className="font-black text-zinc-900 text-sm">₹{agreed.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-zinc-200">|</div>
                            <div>
                              <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Paid</span>
                              <span className="font-black text-emerald-600 text-sm">₹{paid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-zinc-200">|</div>
                            <div>
                              <span className="text-[10px] text-zinc-400 uppercase font-black block font-josefin">Balance</span>
                              <span className="font-black text-amber-600 text-sm">₹{balance.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md font-josefin ${
                            isSettled ? 'text-emerald-700 bg-emerald-50' : agreed === 0 ? 'text-zinc-600 bg-zinc-100' : 'text-amber-800 bg-amber-50'
                          }`}>
                            {isSettled ? 'Settled' : agreed === 0 ? 'Rate TBD' : 'Due'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 6. Tab 3: Salary Slips List */}
        {activeTab === 'salaries' && (
          <div className="space-y-3 font-josefin">
            {salaries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Salary Slips Generated Yet</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When your studio owner generates a monthly salary slip or payout voucher, it will automatically appear here with a 1-click download button.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#EBE7DF] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-josefin">
                    <thead className="bg-zinc-50 text-zinc-500 font-black uppercase text-[10px] border-b border-zinc-200">
                      <tr>
                        <th className="p-3.5">Month / Year</th>
                        <th className="p-3.5">Base Salary</th>
                        <th className="p-3.5">Incentives</th>
                        <th className="p-3.5">Deductions</th>
                        <th className="p-3.5">Net Paid</th>
                        <th className="p-3.5">Payment Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-roboto">
                      {salaries.map((s, idx) => {
                        const netPayable = Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0;
                        const isPaid = (s.status || s.payment_status || '').toUpperCase() === 'PAID';

                        return (
                          <tr key={s.id || idx} className="hover:bg-zinc-50/70 transition">
                            <td className="p-3.5 font-black text-zinc-900 font-josefin">
                              {s.month_year || 'Current Month'}
                            </td>
                            <td className="p-3.5 text-zinc-700 font-bold">
                              ₹{(Number(s.base_salary) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-emerald-600 font-bold">
                              +₹{(Number(s.incentive_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-rose-500 font-bold">
                              -₹{(Number(s.deductions ?? s.deduction_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-900 font-black text-sm">
                              ₹{netPayable.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-500">
                              {s.paid_date || s.payout_date || 'Processing'}
                            </td>
                            <td className="p-3.5 font-josefin">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {isPaid ? 'PAID' : 'PENDING'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-josefin">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentMemberProfile) {
                                    setSelectedFinanceMember(currentMemberProfile);
                                    setFinanceInitialTab('payroll');
                                    setIsFinanceDrawerOpen(true);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-amber-700" />
                                <span>Download Slip</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SHOOT DETAILS MODAL ── */}
        <ShootDetailsModal
          isOpen={isShootModalOpen}
          onClose={() => {
            setIsShootModalOpen(false);
            setSelectedShoot(null);
          }}
          shoot={selectedShoot}
        />

        {/* ── FINANCIAL LEDGER & SALARY SLIPS DRAWER ── */}
        {isFinanceDrawerOpen && selectedFinanceMember && (
          <TeamMemberFinanceDrawer
            isOpen={isFinanceDrawerOpen}
            onClose={() => setIsFinanceDrawerOpen(false)}
            member={selectedFinanceMember}
            workspaceId={selectedFinanceMember.workspace_id || ''}
            initialTab={financeInitialTab}
            isReadOnly={true}
          />
        )}
      </div>
    </div>
  );
}

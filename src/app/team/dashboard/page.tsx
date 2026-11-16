'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import {
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle2,
  Building2,
  Sparkles,
  User,
  ChevronRight,
  Filter,
  Check,
  FileText,
  AlertCircle,
  Briefcase,
  Eye,
  ExternalLink,
  Receipt,
  Download,
  Film,
  FolderOpen,
  LayoutGrid,
  List,
  CalendarDays,
  Camera,
  LogIn,
  LogOut,
  Maximize2
} from 'lucide-react';
import ShootDetailsModal from '@/components/team/ShootDetailsModal';
import TeamMemberFinanceDrawer from '@/app/workspace/team/components/TeamMemberFinanceDrawer';

interface AssignedShoot {
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
  notes?: string;
}

interface TodayAttendance {
  id?: string;
  date: string;
  punch_in_time?: string | null;
  punch_out_time?: string | null;
  status?: string;
  punch_in_photo?: string | null;
  punch_out_photo?: string | null;
  duration_minutes?: number | null;
  location_address?: string | null;
  punch_in_lat?: number | null;
  punch_in_lng?: number | null;
}

export default function TeamDashboardPage() {
  const router = useRouter();
  const { workspaceName, isOwner, userRole, activeWorkspace } = useWorkspace();
  const [shoots, setShoots] = useState<AssignedShoot[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [attendanceDirectUrl, setAttendanceDirectUrl] = useState<string | null>(null);
  const [attendanceToken, setAttendanceToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'shoots' | 'deliverables' | 'salaries'>('shoots');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'month'>('grid');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');

  // Shoot Details Modal
  const [selectedShoot, setSelectedShoot] = useState<AssignedShoot | null>(null);
  const [isShootModalOpen, setIsShootModalOpen] = useState(false);

  // Full Financial Drawer
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<any | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [financeInitialTab, setFinanceInitialTab] = useState<'bookings' | 'payroll' | 'analytics' | 'deliverables'>('bookings');
  const [currentMemberProfile, setCurrentMemberProfile] = useState<any | null>(null);

  // Status updating indicator
  const [updatingDelivId, setUpdatingDelivId] = useState<string | null>(null);

  // Live timer for punched-in work duration
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // 0ms Optimistic SWR Hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetWs = urlParams.get('studio') || activeWorkspace?.workspaceId || activeWorkspace?.studioSlug || 'all';
      const cacheKey = `sc_team_portal_cache_${targetWs}`;
      const cached = localStorage.getItem(cacheKey) || localStorage.getItem('sc_team_portal_cache_all');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          if (Array.isArray(parsed.shoots)) setShoots(parsed.shoots);
          if (Array.isArray(parsed.deliverables)) setDeliverables(parsed.deliverables);
          if (Array.isArray(parsed.salaries)) setSalaries(parsed.salaries);
          if (parsed.profile) setCurrentMemberProfile(parsed.profile);
          if (parsed.todayAttendance) setTodayAttendance(parsed.todayAttendance);
          if (parsed.attendanceDirectUrl) setAttendanceDirectUrl(parsed.attendanceDirectUrl);
          if (parsed.attendanceToken) setAttendanceToken(parsed.attendanceToken);
        }
      }
    } catch (_) {}
  }, [activeWorkspace?.workspaceId, activeWorkspace?.studioSlug]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCrewData() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetWs = urlParams.get('studio') || activeWorkspace?.workspaceId || activeWorkspace?.studioSlug;
        const cacheKey = `sc_team_portal_cache_${targetWs || 'all'}`;

        if (shoots.length === 0 && deliverables.length === 0) {
          setLoading(true);
        } else {
          setIsSyncing(true);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        const activeUser = session?.user || user;

        if (!activeUser) {
          router.push('/team/login');
          return;
        }

        const token = session?.access_token;
        const url = targetWs && targetWs !== 'all'
          ? `/api/team/portal-data?workspace_id=${encodeURIComponent(targetWs)}`
          : '/api/team/portal-data';

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();

        if (isCancelled) return;

        let loadedShoots = [];
        let loadedDelivs = [];
        let loadedSalaries = [];
        let profile = null;
        let todayAtt = null;
        let attUrl = null;
        let attToken = null;

        if (json.success) {
          loadedShoots = Array.isArray(json.shoots) ? json.shoots : [];
          loadedDelivs = Array.isArray(json.deliverables) ? json.deliverables : [];
          loadedSalaries = Array.isArray(json.salaries) ? json.salaries : [];
          profile = json.memberProfile || null;
          todayAtt = json.todayAttendance || null;
          attUrl = json.attendanceDirectUrl || null;
          attToken = json.attendanceToken || null;
        }

        setShoots(loadedShoots);
        setDeliverables(loadedDelivs);
        setSalaries(loadedSalaries);
        setTodayAttendance(todayAtt);
        setAttendanceDirectUrl(attUrl);
        setAttendanceToken(attToken);

        const rawName = profile?.name || activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'Team Member';
        const cleanRate = Number(profile?.default_daily_rate || 0);
        const cleanFreq = profile?.payout_frequency || 'daily';

        const memberObj = {
          id: profile?.id || activeUser.id,
          name: rawName,
          email: profile?.email || activeUser.email || '',
          phone: profile?.phone || activeUser.phone || activeUser.user_metadata?.phone || '',
          primary_role: profile?.primary_role || userRole || 'Crew',
          primary_type: profile?.primary_type || 'IN_HOUSE',
          default_daily_rate: cleanRate,
          daily_rate: cleanRate,
          payout_frequency: cleanFreq,
          workspace_id: activeWorkspace?.workspaceId || loadedShoots[0]?.workspace_id || '',
          assignments: loadedShoots,
          salaries: loadedSalaries,
          deliverables: loadedDelivs,
        };

        setCurrentMemberProfile(memberObj);

        // Cache for 0ms instant load
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              shoots: loadedShoots,
              deliverables: loadedDelivs,
              salaries: loadedSalaries,
              profile: memberObj,
              todayAttendance: todayAtt,
              attendanceDirectUrl: attUrl,
              attendanceToken: attToken,
            }));
          } catch (_) {}
        }
      } catch (err) {
        console.error('Error loading team portal data:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    }

    loadCrewData();

    return () => {
      isCancelled = true;
    };
  }, [router, activeWorkspace?.workspaceId, activeWorkspace?.studioSlug]);

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const uniqueStudios = Array.from(new Set(shoots.map(s => s.studio_name).filter(Boolean)));

  // Filtered & Sorted Shoots
  const filteredShoots = useMemo(() => {
    return shoots
      .filter((s) => {
        const matchesStudio = selectedStudio === 'all' || s.studio_name === selectedStudio;
        if (!matchesStudio) return false;

        if (activeTab === 'upcoming') {
          return s.event_date >= today || s.event_date === 'TBD';
        }
        if (activeTab === 'completed') {
          return s.event_date < today && s.event_date !== 'TBD';
        }
        return true;
      })
      .sort((a, b) => {
        if (a.event_date === 'TBD') return 1;
        if (b.event_date === 'TBD') return -1;
        return a.event_date.localeCompare(b.event_date);
      });
  }, [shoots, selectedStudio, activeTab, today]);

  // Group Shoots by Month for Month-Wise View
  const shootsByMonth = useMemo(() => {
    const groups: { [key: string]: { label: string; shoots: AssignedShoot[] } } = {};

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

  // Group Post-Production Deliverables by Client (Requirement: One Card per Client)
  const deliverablesByClient = useMemo(() => {
    const map = new Map<string, {
      clientName: string;
      projectId: string;
      workspaceId: string;
      items: any[];
      totalAgreed: number;
      totalPaid: number;
      totalBalance: number;
    }>();

    deliverables.forEach((d) => {
      const rawClient = (d.client_name || '').trim();
      const clientName = rawClient && rawClient !== 'Client Project' && rawClient !== 'Wedding Project'
        ? rawClient
        : 'Wedding Project';

      const key = clientName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          clientName: clientName,
          projectId: d.project_id || '',
          workspaceId: d.workspace_id || '',
          items: [],
          totalAgreed: 0,
          totalPaid: 0,
          totalBalance: 0,
        });
      }

      const grp = map.get(key)!;
      grp.items.push(d);
      grp.totalAgreed += Number(d.agreed_amount) || 0;
      grp.totalPaid += Number(d.paid_amount) || 0;
      grp.totalBalance += Number(d.balance_amount) || 0;
    });

    return Array.from(map.values());
  }, [deliverables]);

  // Handle in-place deliverable status change
  async function handleStatusChange(deliverableId: string, projectId: string, newStatus: string) {
    setUpdatingDelivId(deliverableId);

    // Optimistic Update
    setDeliverables((prev) =>
      prev.map((d) => (d.id === deliverableId || d.deliverable_id === deliverableId ? { ...d, status: newStatus } : d))
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch('/api/team/deliverable-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deliverable_id: deliverableId,
          project_id: projectId,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.error('Failed to update deliverable status:', err);
    } finally {
      setUpdatingDelivId(null);
    }
  }

  // Combined Financial Metrics
  const totalShootAgreed = filteredShoots.reduce((acc, s) => acc + (Number(s.agreed_amount) || 0), 0);
  const totalShootPaid = filteredShoots.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0);
  const totalShootBalance = filteredShoots.reduce((acc, s) => acc + (Number(s.balance_amount) || 0), 0);

  const totalDelivAgreed = deliverables.reduce((acc, d) => acc + (Number(d.agreed_amount) || 0), 0);
  const totalDelivPaid = deliverables.reduce((acc, d) => acc + (Number(d.paid_amount) || 0), 0);
  const totalDelivBalance = deliverables.reduce((acc, d) => acc + (Number(d.balance_amount) || 0), 0);

  const totalSalaryAgreed = salaries.reduce((acc, s) => acc + (Number(s.base_salary) || 0), 0);
  const totalSalaryPaid = salaries.reduce((acc, s) => acc + (Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0), 0);

  const grandAgreed = totalShootAgreed + totalDelivAgreed + totalSalaryAgreed;
  const grandPaid = totalShootPaid + totalDelivPaid + totalSalaryPaid;
  const grandBalance = totalShootBalance + totalDelivBalance;

  const studioCode = activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || '';
  const attendanceHubUrl = studioCode ? `/team/attendance?studio=${encodeURIComponent(studioCode)}` : '/team/attendance';

  // Attendance live duration calculations
  const isPunchedIn = Boolean(todayAttendance?.punch_in_time);
  const isPunchedOut = Boolean(todayAttendance?.punch_out_time);
  const isCurrentlyWorking = isPunchedIn && !isPunchedOut;

  const liveWorkDurationMinutes = useMemo(() => {
    if (!todayAttendance?.punch_in_time) return 0;
    if (todayAttendance?.punch_out_time) {
      return todayAttendance.duration_minutes || 0;
    }
    const inMs = new Date(todayAttendance.punch_in_time).getTime();
    if (isNaN(inMs)) return 0;
    return Math.max(0, Math.floor((nowTick - inMs) / 60000));
  }, [todayAttendance, nowTick]);

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    return `${h}h ${m}m`;
  }

  function formatTime(isoStr?: string | null) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (_) {
      return isoStr;
    }
  }

  return (
    <div className="w-full">
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── TOP HEADER (CLEANED: No deliverables/finance/ledger buttons) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-[#92400e] border border-amber-200 font-black">
                Crew &amp; Freelancer Portal
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-600">{userRole || 'Crew Member'}</span>
              {isSyncing && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 font-bold animate-pulse">
                  Syncing live...
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 tracking-tight">
              My Assigned Work &amp; Schedule
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
              Real-time schedule, call times, post-production edits, and daily shift attendance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* ── DAILY ATTENDANCE & PUNCH-IN BANNER (PROMINENT AT TOP) ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-start sm:items-center gap-3.5">
              {/* Photo or Status Avatar */}
              <div className="relative shrink-0">
                {todayAttendance?.punch_in_photo ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xs bg-stone-100">
                    <img
                      src={todayAttendance.punch_in_photo}
                      alt="Today Punch-in Selfie"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${
                    isCurrentlyWorking
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : isPunchedOut
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {isCurrentlyWorking ? (
                      <Clock className="w-6 h-6 animate-spin-slow" />
                    ) : isPunchedOut ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                )}
                {isCurrentlyWorking && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                )}
              </div>

              {/* Attendance Details */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-zinc-900">
                    {isCurrentlyWorking
                      ? 'Shift Active (Working Live)'
                      : isPunchedOut
                      ? 'Shift Completed Today'
                      : 'Daily Shift Attendance'}
                  </h3>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isCurrentlyWorking
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isPunchedOut
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isCurrentlyWorking
                      ? '● PUNCHE-IN'
                      : isPunchedOut
                      ? '✓ COMPLETED'
                      : 'NOT PUNCHED IN'}
                  </span>
                </div>

                {/* Punch Timings & Duration */}
                {isPunchedIn ? (
                  <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium pt-0.5 flex-wrap">
                    <span>
                      In: <strong className="text-zinc-900 font-mono">{formatTime(todayAttendance?.punch_in_time)}</strong>
                    </span>
                    {isPunchedOut && (
                      <>
                        <span className="text-zinc-300">•</span>
                        <span>
                          Out: <strong className="text-zinc-900 font-mono">{formatTime(todayAttendance?.punch_out_time)}</strong>
                        </span>
                      </>
                    )}
                    <span className="text-zinc-300">•</span>
                    <span className="text-emerald-700 font-bold">
                      Duration: {formatMinutes(liveWorkDurationMinutes)}
                    </span>
                    {todayAttendance?.location_address && (
                      <>
                        <span className="text-zinc-300 hidden sm:inline">•</span>
                        <span className="text-zinc-500 text-[11px] truncate max-w-[200px] hidden sm:inline">
                          {todayAttendance.location_address}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 pt-0.5">
                    Mark your daily selfie punch-in to record shift timings, location verification, and daily work hours.
                  </p>
                )}
              </div>
            </div>

            {/* Attendance Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!isPunchedIn ? (
                <Link
                  href={attendanceDirectUrl || attendanceHubUrl}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Punch In Today</span>
                </Link>
              ) : isCurrentlyWorking ? (
                <Link
                  href={attendanceDirectUrl || attendanceHubUrl}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-amber-400" />
                  <span>Punch Out / Finish Shift</span>
                </Link>
              ) : null}

              <Link
                href={attendanceHubUrl}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-1"
                title="View monthly calendar attendance and shift logs"
              >
                <span>Attendance Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 3 CLEAN METRIC CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL ASSIGNED WORK</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-zinc-900 font-serif">
              {shoots.length + deliverables.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              {shoots.length} Shoots • {deliverables.length} Deliverables • {salaries.length} Salary Slips
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TOTAL AGREED COMMERCIALS</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600 font-serif">₹{grandAgreed.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600/80 mt-1 font-bold">₹{grandPaid.toLocaleString('en-IN')} Received</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>PENDING BALANCE (AANA BAKI)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[#b45309] font-serif">₹{grandBalance.toLocaleString('en-IN')}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              {grandBalance > 0 ? 'Pending disbursement from studio' : 'All payouts fully cleared'}
            </p>
          </div>
        </div>

        {/* ── PRIMARY SECTION TABS ── */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#EBE7DF] rounded-xl overflow-x-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setDashboardTab('shoots')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'shoots' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Assigned Shoots ({shoots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('deliverables')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'deliverables' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Post-Production &amp; Edits ({deliverables.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('salaries')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              dashboardTab === 'salaries' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Salary Slips ({salaries.length})</span>
          </button>
        </div>

        {/* ── TAB 1: ASSIGNED SHOOTS ── */}
        {dashboardTab === 'shoots' && (
          <div className="space-y-4">
            
            {/* Filter & View Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Requirement: ALL first, then UPCOMING, then COMPLETED */}
              <div className="flex p-1 bg-white border border-[#EBE7DF] rounded-xl text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  All ({shoots.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'upcoming'
                      ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Upcoming ({shoots.filter(s => s.event_date >= today || s.event_date === 'TBD').length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-[#FDF6EC] text-[#92400E] border border-[#F5E6CC] shadow-2xs font-black'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Completed ({shoots.filter(s => s.event_date < today && s.event_date !== 'TBD').length})
                </button>
              </div>

              {/* View Switcher: Card View | List View | Month-Wise View */}
              <div className="flex items-center gap-2 flex-wrap">
                {uniqueStudios.length > 1 && (
                  <select
                    value={selectedStudio}
                    onChange={(e) => setSelectedStudio(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#EBE7DF] rounded-xl text-xs font-bold text-zinc-700 shadow-2xs focus:outline-none"
                  >
                    <option value="all">All Studios</option>
                    {uniqueStudios.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}

                <div className="flex items-center p-1 bg-white border border-[#EBE7DF] rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'grid' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Card Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Compact List View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'month' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title="Chronological Month-Wise Sequence View"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Month-Wise</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Display based on View Mode */}
            {loading && shoots.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-[#EBE7DF] animate-pulse space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-zinc-200 rounded w-1/3" />
                      <div className="h-5 bg-amber-100 rounded-full w-16" />
                    </div>
                    <div className="h-6 bg-zinc-200 rounded w-3/4" />
                    <div className="h-4 bg-zinc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredShoots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Briefcase className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Shoots Found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {activeTab === 'upcoming' 
                    ? 'You have no upcoming shoots scheduled at this moment.' 
                    : 'No shoots found under the selected filter.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── 1. CARD VIEW (CLEAN, MINIMAL, FAST) ── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShoots.map((shoot) => {
                  const agreed = Number(shoot.agreed_amount) || 0;
                  const isPaid = (shoot.payment_status || '').toUpperCase() === 'PAID';

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
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {shoot.studio_name}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {shoot.role_name}
                          </span>
                        </div>

                        <h3 className="text-base font-serif font-black text-zinc-900 group-hover:text-amber-800 transition line-clamp-1">
                          {shoot.couple_name || shoot.client_name || 'Wedding Event'}
                        </h3>
                        <p className="text-xs font-bold text-amber-700 mt-0.5">{shoot.event_name}</p>

                        <div className="mt-4 space-y-2 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-bold">{shoot.event_date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{shoot.start_time || 'TBD'} {shoot.end_time ? `– ${shoot.end_time}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{shoot.venue_location || 'Venue TBD'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-black block">Agreed Fee</span>
                          <span className="text-sm font-black text-zinc-900 font-mono">
                            ₹{agreed.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-[#92400e] border border-amber-200'
                          }`}>
                            {shoot.payment_status?.toUpperCase() || (isPaid ? 'PAID' : 'PENDING')}
                          </span>

                          <span className="text-xs font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-0.5">
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === 'list' ? (
              /* ── 2. COMPACT LIST VIEW ── */
              <div className="bg-white rounded-2xl border border-[#EBE7DF] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 font-black uppercase text-[10px] border-b border-zinc-200">
                      <tr>
                        <th className="p-3.5">Couple &amp; Event</th>
                        <th className="p-3.5">Shoot Date</th>
                        <th className="p-3.5">Call Timing</th>
                        <th className="p-3.5">Venue Location</th>
                        <th className="p-3.5">Assigned Role</th>
                        <th className="p-3.5">Agreed Fee</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredShoots.map((shoot) => {
                        const agreed = Number(shoot.agreed_amount) || 0;
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
                              <span className="font-bold text-zinc-900 block">{shoot.couple_name}</span>
                              <span className="text-[11px] text-amber-700 font-medium">{shoot.event_name}</span>
                            </td>
                            <td className="p-3.5 font-bold text-zinc-800">{shoot.event_date}</td>
                            <td className="p-3.5 text-zinc-600">{shoot.start_time || 'TBD'}</td>
                            <td className="p-3.5 text-zinc-600 max-w-[180px] truncate">{shoot.venue_location || 'Venue TBD'}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {shoot.role_name}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-zinc-900">₹{agreed.toLocaleString('en-IN')}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {shoot.payment_status?.toUpperCase() || (isPaid ? 'PAID' : 'PENDING')}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-[11px] font-bold transition"
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
            ) : (
              /* ── 3. CHRONOLOGICAL MONTH-WISE VIEW ── */
              <div className="space-y-6">
                {shootsByMonth.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-700" />
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        {group.label} ({group.shoots.length})
                      </h3>
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.shoots.map((shoot) => {
                        const agreed = Number(shoot.agreed_amount) || 0;
                        const isPaid = (shoot.payment_status || '').toUpperCase() === 'PAID';

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
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  {shoot.role_name}
                                </span>
                              </div>

                              <h4 className="text-base font-serif font-black text-zinc-900 group-hover:text-amber-800 transition line-clamp-1">
                                {shoot.couple_name}
                              </h4>
                              <p className="text-xs font-bold text-amber-700 mt-0.5">{shoot.event_name}</p>

                              <div className="mt-3.5 space-y-1.5 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="font-bold text-zinc-900">{shoot.event_date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>{shoot.start_time || 'TBD'} {shoot.end_time ? `– ${shoot.end_time}` : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span className="truncate">{shoot.venue_location || 'Venue TBD'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-black block">Agreed Fee</span>
                                <span className="text-sm font-black text-zinc-900 font-mono">
                                  ₹{agreed.toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isPaid 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-amber-50 text-[#92400e] border border-amber-200'
                                }`}>
                                  {shoot.payment_status?.toUpperCase() || (isPaid ? 'PAID' : 'PENDING')}
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

        {/* ── TAB 2: POST-PRODUCTION DELIVERABLES (GROUPED BY CLIENT) ── */}
        {dashboardTab === 'deliverables' && (
          <div className="space-y-4">
            {deliverables.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <Sparkles className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Post-Production Projects Assigned</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When projects or editing deliverables (teaser, full wedding film, photos, albums) are assigned to you by the studio owner, they will appear here grouped by client.
                </p>
                <Link
                  href="/workspace/post-production"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs mt-2"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Open Post-Production Suite</span>
                </Link>
              </div>
            ) : (
              /* Requirement: Group multiple deliverables under ONE CARD per client */
              <div className="space-y-4">
                {deliverablesByClient.map((clientGroup) => {
                  return (
                    <div
                      key={clientGroup.clientName}
                      className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs space-y-4"
                    >
                      {/* Client Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Client Project
                            </span>
                            <span className="text-xs text-zinc-400">•</span>
                            <span className="text-xs font-bold text-zinc-500">
                              {clientGroup.items.length} {clientGroup.items.length === 1 ? 'Deliverable' : 'Deliverables'}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-serif font-black text-zinc-900">
                            {clientGroup.clientName}
                          </h3>
                        </div>

                        {/* Client Commercial Summary */}
                        <div className="flex items-center gap-4 text-xs bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 self-start sm:self-auto">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block">Total Agreed</span>
                            <span className="font-black text-zinc-900 font-mono">
                              ₹{clientGroup.totalAgreed.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-zinc-200">|</div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-emerald-600 block">Paid</span>
                            <span className="font-black text-emerald-600 font-mono">
                              ₹{clientGroup.totalPaid.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-zinc-200">|</div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-amber-700 block">Balance</span>
                            <span className="font-black text-amber-800 font-mono">
                              ₹{clientGroup.totalBalance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items List Inside Client Card */}
                      <div className="space-y-3">
                        {clientGroup.items.map((deliv) => {
                          const agreed = Number(deliv.agreed_amount) || 0;
                          const paid = Number(deliv.paid_amount) || 0;
                          const bal = Number(deliv.balance_amount) || 0;
                          const isSettled = bal <= 0 && agreed > 0;
                          const isUpdating = updatingDelivId === deliv.id;

                          return (
                            <div
                              key={deliv.id}
                              className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{deliv.title}</span>
                                  </h4>

                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/60 text-zinc-700">
                                    {deliv.segment || 'Wedding'} • {deliv.category || 'Deliverable'}
                                  </span>

                                  {deliv.specs && (
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                      Specs: {deliv.specs}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                                  <span>
                                    Due Date: <strong className="text-zinc-800 font-bold">{deliv.due_date || 'TBD'}</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Agreed: <strong className="text-zinc-800 font-mono font-bold">₹{agreed.toLocaleString('en-IN')}</strong>
                                  </span>
                                  <span>•</span>
                                  <span className={isSettled ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                                    {isSettled ? '✓ Paid' : `Bal: ₹${bal.toLocaleString('en-IN')}`}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Status Changer Dropdown */}
                              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase font-bold text-zinc-400">Status:</span>
                                  <select
                                    disabled={isUpdating}
                                    value={deliv.status || 'Upcoming'}
                                    onChange={(e) => handleStatusChange(deliv.id, clientGroup.projectId, e.target.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none ${
                                      deliv.status === 'Completed'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : deliv.status === 'Review Ready'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : deliv.status === 'In Progress'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : deliv.status === 'Revision'
                                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                                        : 'bg-white text-zinc-700 border-zinc-300'
                                    }`}
                                  >
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Review Ready">Review Ready</option>
                                    <option value="Revision">Revision</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                </div>

                                <Link
                                  href="/workspace/post-production"
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition"
                                  title="Open in Post-Production Suite"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SALARY SLIPS ── */}
        {dashboardTab === 'salaries' && (
          <div className="space-y-4">
            {salaries.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EBE7DF] space-y-3">
                <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
                <h3 className="text-base font-black text-zinc-700">No Salary Slips Generated Yet</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  When your studio owner generates a monthly salary slip or payout voucher, it will automatically appear here with full transparency.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#EBE7DF] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
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
                    <tbody className="divide-y divide-zinc-100">
                      {salaries.map((s, idx) => {
                        const netPayable = Number(s.net_paid ?? s.net_payable ?? s.base_salary) || 0;
                        const isPaid = (s.status || s.payment_status || '').toUpperCase() === 'PAID';

                        return (
                          <tr key={s.id || idx} className="hover:bg-zinc-50/70 transition">
                            <td className="p-3.5 font-black text-zinc-900 font-mono">
                              {s.month_year || 'Current Month'}
                            </td>
                            <td className="p-3.5 text-zinc-700 font-mono font-bold">
                              ₹{(Number(s.base_salary) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-emerald-600 font-mono font-bold">
                              +₹{(Number(s.incentive_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-rose-500 font-mono font-bold">
                              -₹{(Number(s.deductions ?? s.deduction_amount) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-900 font-mono font-black text-sm">
                              ₹{netPayable.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3.5 text-zinc-500">
                              {s.paid_date || s.payout_date || 'Processing'}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {isPaid ? 'PAID' : 'PENDING'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
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
        {isFinanceDrawerOpen && (
          <TeamMemberFinanceDrawer
            isOpen={isFinanceDrawerOpen}
            initialTab={financeInitialTab}
            onClose={() => {
              setIsFinanceDrawerOpen(false);
              setSelectedFinanceMember(null);
            }}
            workspaceId={selectedFinanceMember?.workspace_id || ''}
            workspaceName={selectedFinanceMember?.studio_name || workspaceName || 'Partner Studio'}
            member={selectedFinanceMember || currentMemberProfile}
            isReadOnly={true}
          />
        )}

      </div>
    </div>
  );
}

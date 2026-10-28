'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarLayout } from '@/components/sidebar-layout';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { supabase } from '@/lib/supabase';
import { 
  Clock, Calendar, MapPin, Camera, CheckCircle2, AlertCircle, 
  Smartphone, Share2, Copy, Check, ExternalLink, RefreshCw, 
  ShieldCheck, AlertTriangle, LogIn, LogOut, Coffee, Sparkles,
  Award, TrendingUp, DollarSign, ChevronRight, UserX, X, Maximize2
} from 'lucide-react';
import { analyzeAttendanceRecordTiming } from '@/lib/attendance/time-calculations';
import SelfiePunchModal from '@/app/workspace/attendance/components/SelfiePunchModal';
import StaffDetailsModal, { formatTime12h, formatMinutesToHours, getLocalDateString } from '@/app/workspace/attendance/components/StaffDetailsModal';
import { useWorkspace } from '@/lib/context/BhamstraContext';

type DatePreset = 'today' | 'week' | 'month' | '3months' | 'custom';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function TeamAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studioParam = searchParams?.get('studio') || activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || workspaceId;

  // Link & Profile
  const [secureToken, setSecureToken] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [member, setMember] = useState<any>(null);

  // Attendance Session Data
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [companyHolidays, setCompanyHolidays] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);

  // Date Range Presets & Custom Filters (Synced with Studio Owner StaffDetailsModal)
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return getLocalDateString(new Date());
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'half_day' | 'absent' | 'holiday' | 'week_off'>('all');

  // Modals & Popups
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchActionType, setPunchActionType] = useState<'check_in' | 'check_out'>('check_in');
  const [showFullStaffModal, setShowFullStaffModal] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Live Timer & Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentTime(n);
      setNowTick(n.getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Resolve User and Token via /api/team/attendance/me
  useEffect(() => {
    async function loadAttendanceProfile() {
      try {
        setLoading(true);
        setError(null);

        const targetWs = studioParam;
        const url = targetWs && targetWs !== 'all' 
          ? `/api/team/attendance/me?workspace_id=${encodeURIComponent(targetWs)}` 
          : '/api/team/attendance/me';

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load your attendance profile.');
        }

        setMember(data.member);
        setSecureToken(data.secureToken);
        setDirectUrl(data.directUrl);

        // Fetch complete session using secureToken
        if (data.secureToken) {
          const sessionRes = await fetch(`/api/public/attendance/session?token=${encodeURIComponent(data.secureToken)}`);
          const sessionData = await sessionRes.json();

          if (sessionRes.ok) {
            setTodayRecord(sessionData.todayRecord || null);
            setShifts(sessionData.shifts || []);
            setLocations(sessionData.locations || []);
            setMonthlyHistory(sessionData.monthlyHistory || []);
            setCompanyHolidays(sessionData.companyHolidays || []);
            setRecentLeaves(sessionData.recentLeaves || []);
          }
        }
      } catch (err: any) {
        console.error('[Team Attendance] Error:', err);
        setError(err.message || 'Unable to connect to attendance service.');
      } finally {
        setLoading(false);
      }
    }

    loadAttendanceProfile();
  }, [studioParam, workspaceId, activeWorkspace?.workspaceId]);

  const reloadSession = useCallback(async (tokenToUse?: string) => {
    const token = tokenToUse || secureToken;
    if (!token) return;
    try {
      const sessionRes = await fetch(`/api/public/attendance/session?token=${encodeURIComponent(token)}`);
      const sessionData = await sessionRes.json();
      if (sessionRes.ok) {
        setTodayRecord(sessionData.todayRecord || null);
        setShifts(sessionData.shifts || []);
        setLocations(sessionData.locations || []);
        setMonthlyHistory(sessionData.monthlyHistory || []);
        setCompanyHolidays(sessionData.companyHolidays || []);
        setRecentLeaves(sessionData.recentLeaves || []);
      }
    } catch (e) {
      console.warn('Session refresh error:', e);
    }
  }, [secureToken]);

  // Handle Preset Selection
  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = getLocalDateString(today);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setStartDate(getLocalDateString(past));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(getLocalDateString(firstDay));
      setEndDate(todayStr);
    } else if (preset === '3months') {
      const past = new Date(today);
      past.setDate(past.getDate() - 90);
      setStartDate(getLocalDateString(past));
      setEndDate(todayStr);
    }
  };

  // Active check-in state to drive live continuous work hours
  const activeTodayRecord = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return monthlyHistory.find(r => {
      const inTime = r.punch_in_time || r.check_in_time;
      const outTime = r.punch_out_time || r.check_out_time;
      return r.date === todayStr && inTime && !outTime;
    }) || (todayRecord?.check_in_time && !todayRecord?.check_out_time ? todayRecord : null);
  }, [monthlyHistory, todayRecord]);

  // Live elapsed work duration in seconds
  const liveElapsedSec = useMemo(() => {
    if (!activeTodayRecord) return 0;
    const inTimeStr = activeTodayRecord.punch_in_time || activeTodayRecord.check_in_time;
    if (!inTimeStr) return 0;
    const inMs = new Date(inTimeStr).getTime();
    if (isNaN(inMs)) return 0;
    const diff = Math.max(0, Math.floor((nowTick - inMs) / 1000));
    return diff;
  }, [activeTodayRecord, nowTick]);

  // Filtered Records based on Start & End Date
  const dateRangeRecords = useMemo(() => {
    if (!monthlyHistory || monthlyHistory.length === 0) return [];
    return monthlyHistory.filter(r => {
      if (!r.date) return false;
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [monthlyHistory, startDate, endDate]);

  // Aggregate Metrics (Identical Calculation Formula to StaffDetailsModal)
  const stats = useMemo(() => {
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let overtimeDays = 0;
    let earlyCheckoutDays = 0;
    let totalWorkMinutes = 0;
    let totalLateMinutes = 0;
    let totalEarlyCheckoutMinutes = 0;
    let totalOvertimeMinutes = 0;

    dateRangeRecords.forEach(r => {
      const inTime = r.punch_in_time || r.check_in_time;
      const outTime = r.punch_out_time || r.check_out_time;
      const isPresent = Boolean(inTime || r.status === 'present' || r.status === 'late' || r.status === 'half_day');

      if (isPresent) {
        presentDays++;
        if (r.status === 'half_day') halfDays++;

        const timing = analyzeAttendanceRecordTiming(r, member, shifts[0]?.start_time || '10:00', shifts[0]?.end_time || '19:00');
        if (timing.isLate) {
          lateDays++;
          totalLateMinutes += timing.lateMinutes;
        }
        if (timing.isEarlyCheckout) {
          earlyCheckoutDays++;
          totalEarlyCheckoutMinutes += timing.earlyCheckoutMinutes;
        }
        if (timing.isOvertime) {
          overtimeDays++;
          totalOvertimeMinutes += timing.overtimeMinutes;
        }

        let work = 0;
        if (inTime && outTime) {
          const inMs = new Date(inTime).getTime();
          const outMs = new Date(outTime).getTime();
          const net = Math.max(0, Math.floor((outMs - inMs) / 60000));
          const breakMins = Number(r.total_break_minutes || r.break_duration_minutes) || 0;
          work = Math.max(0, net - breakMins);
        } else if (inTime && !outTime) {
          work = 0;
        } else {
          work = r.total_work_minutes || r.work_duration_minutes || 0;
        }
        totalWorkMinutes += work;
      }
    });

    let approvedLeaveDays = 0;
    let explicitAbsentDays = 0;

    const todayStr = getLocalDateString(new Date());
    const effectiveEnd = endDate < todayStr ? endDate : todayStr;

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = effectiveEnd.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd, 12, 0, 0);
    const eDate = new Date(ey, em - 1, ed, 12, 0, 0);

    const custom = (member?.custom_data as any) || {};
    const rawOffs = member?.weekly_offs || custom.weekly_offs || ['Sunday'];
    const offDayNames: string[] = [];
    if (Array.isArray(rawOffs)) {
      rawOffs.forEach((d: string) => {
        offDayNames.push(String(d).toLowerCase());
      });
    }

    let scheduledDays = 0;
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && sDate <= eDate) {
      const cur = new Date(sDate);
      while (cur <= eDate) {
        const dayLong = cur.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayShort = cur.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        const dateIso = getLocalDateString(cur);

        const isWeeklyOff = offDayNames.some(o => o === dayLong || o === dayShort || dayLong.includes(o));
        const isHoliday = (companyHolidays || []).some(h => h.holiday_date === dateIso) || dateRangeRecords.find(r => r.date === dateIso)?.status === 'holiday';
        const isLeave = (recentLeaves || []).some(l => dateIso >= l.start_date && dateIso <= l.end_date && l.status !== 'rejected');

        if (!isWeeklyOff && !isHoliday) {
          scheduledDays++;
        }

        const rec = dateRangeRecords.find(r => r.date === dateIso);
        if (rec) {
          if (rec.status === 'leave' || rec.status === 'approved_leave' || isLeave) {
            approvedLeaveDays++;
          } else if (rec.status === 'absent') {
            explicitAbsentDays++;
          }
        } else if (isLeave) {
          approvedLeaveDays++;
        }

        cur.setDate(cur.getDate() + 1);
      }
    }

    const calculatedAbsents = Math.max(0, scheduledDays - presentDays - approvedLeaveDays);
    const absentDays = Math.max(explicitAbsentDays, calculatedAbsents);

    const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
    const avgHoursPerDay = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 10) / 10 : 0;
    const punctualityScore = presentDays > 0 ? Math.max(0, Math.round(((presentDays - lateDays) / presentDays) * 100)) : 100;

    return {
      presentDays,
      lateDays,
      halfDays,
      overtimeDays,
      earlyCheckoutDays,
      absentDays,
      totalWorkMinutes,
      totalWorkHours,
      totalLateMinutes,
      totalEarlyCheckoutMinutes,
      totalOvertimeMinutes,
      avgHoursPerDay,
      punctualityScore
    };
  }, [dateRangeRecords, member, shifts, startDate, endDate, companyHolidays, recentLeaves]);

  // Complete Shift Audit Timeline (Including Every Date in Range)
  const shiftLogs = useMemo(() => {
    if (!startDate || !endDate) return [];

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd, 12, 0, 0);
    const eDate = new Date(ey, em - 1, ed, 12, 0, 0);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) return [];

    const custom = (member?.custom_data as any) || {};
    const rawOffs = member?.weekly_offs || custom.weekly_offs || ['Sunday'];
    const offDayNames: string[] = [];
    if (Array.isArray(rawOffs)) {
      rawOffs.forEach((d: string) => {
        offDayNames.push(String(d).toLowerCase());
      });
    }

    const todayIstStr = getLocalDateString(new Date());
    const logs: any[] = [];
    const cur = new Date(eDate);

    while (cur >= sDate) {
      const dateStr = getLocalDateString(cur);
      const dayLong = cur.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayShort = cur.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const isWeeklyOff = offDayNames.some(o => o === dayLong || o === dayShort || dayLong.includes(o));

      const holidayMatch = (companyHolidays || []).find(h => h.holiday_date === dateStr);
      const leaveMatch = (recentLeaves || []).find(l => dateStr >= l.start_date && dateStr <= l.end_date && l.status !== 'rejected');

      const rec = dateRangeRecords.find(r => r.date === dateStr);

      if (rec && (rec.punch_in_time || rec.check_in_time || rec.status === 'present' || rec.status === 'late' || rec.status === 'half_day')) {
        const inTime = rec.punch_in_time || rec.check_in_time;
        const outTime = rec.punch_out_time || rec.check_out_time;
        const timing = analyzeAttendanceRecordTiming(rec, member, shifts[0]?.start_time || '10:00', shifts[0]?.end_time || '19:00');

        let durationMins = 0;
        if (inTime && outTime) {
          const inMs = new Date(inTime).getTime();
          const outMs = new Date(outTime).getTime();
          durationMins = Math.max(0, Math.floor((outMs - inMs) / 60000));
        } else if (inTime && !outTime && dateStr === todayIstStr) {
          durationMins = Math.floor(liveElapsedSec / 60);
        } else {
          durationMins = rec.total_work_minutes || rec.work_duration_minutes || 0;
        }

        const isHolidayDuty = Boolean(holidayMatch);
        const isWeekOffDuty = Boolean(isWeeklyOff);

        logs.push({
          id: rec.id || `rec_${dateStr}`,
          date: dateStr,
          isPunched: true,
          status: rec.status || (timing.isLate ? 'late' : 'present'),
          punch_in_time: inTime,
          punch_out_time: outTime,
          punch_in_lat: rec.punch_in_lat || rec.check_in_lat,
          punch_in_lng: rec.punch_in_lng || rec.check_in_lng,
          punch_out_lat: rec.punch_out_lat || rec.check_out_lat,
          punch_out_lng: rec.punch_out_lng || rec.check_out_lng,
          selfie_url: rec.selfie_url || rec.check_in_photo || rec.check_in_photo_path || rec.check_in_selfie,
          check_out_selfie_url: rec.check_out_selfie_url || rec.check_out_photo || rec.check_out_photo_path || rec.check_out_selfie,
          location_address: rec.location_address || rec.location_name,
          check_out_address: rec.check_out_address,
          timing,
          durationMinutes: durationMins,
          late_minutes: rec.late_minutes || timing.lateMinutes,
          early_minutes: rec.early_minutes || timing.earlyArrivalMinutes,
          early_checkout_minutes: rec.early_checkout_minutes || timing.earlyCheckoutMinutes,
          overtime_minutes: rec.overtime_minutes || timing.overtimeMinutes,
          isHolidayDuty,
          isWeekOffDuty,
          holidayName: holidayMatch?.name || null
        });
      } else {
        if (holidayMatch) {
          logs.push({
            id: `hol_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'holiday',
            title: holidayMatch.name || 'Company Holiday',
            notes: holidayMatch.note || 'Official Studio Holiday',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        } else if (leaveMatch) {
          logs.push({
            id: `leave_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'leave',
            title: `Leave (${leaveMatch.leave_type || 'Approved'})`,
            notes: leaveMatch.reason || 'Approved leave request',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        } else if (isWeeklyOff) {
          logs.push({
            id: `week_off_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'week_off',
            title: 'Weekly Off',
            notes: 'Scheduled regular weekly day-off',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        } else if (dateStr > todayIstStr) {
          logs.push({
            id: `upcoming_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'upcoming',
            title: 'Scheduled Shift',
            notes: 'Upcoming shift',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        } else if (dateStr === todayIstStr) {
          logs.push({
            id: `today_pending_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'pending',
            title: 'Not Checked In Yet (Today)',
            notes: 'Working day is in progress. Check-in is pending.',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        } else {
          logs.push({
            id: `absent_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'absent',
            title: 'Absent / Not Marked',
            notes: 'Attendance was not marked on this scheduled working day.',
            isHolidayDuty: false,
            isWeekOffDuty: false
          });
        }
      }

      cur.setDate(cur.getDate() - 1);
    }

    return logs.filter(log => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'late') return log.timing?.isLate;
      if (statusFilter === 'present') return log.isPunched && (log.status === 'present' || log.isHolidayDuty || log.isWeekOffDuty);
      if (statusFilter === 'half_day') return log.status === 'half_day';
      if (statusFilter === 'absent') return log.status === 'absent';
      if (statusFilter === 'holiday') return log.status === 'holiday' || log.isHolidayDuty;
      if (statusFilter === 'week_off') return log.status === 'week_off' || log.isWeekOffDuty;
      return log.status === statusFilter;
    });
  }, [startDate, endDate, dateRangeRecords, companyHolidays, recentLeaves, member, shifts, statusFilter, liveElapsedSec]);

  // Derive guaranteed non-localhost direct URL
  const effectiveDirectUrl = useMemo(() => {
    if (typeof window !== 'undefined' && secureToken) {
      return `${window.location.origin}/attendance/${secureToken}`;
    }
    return directUrl;
  }, [secureToken, directUrl]);

  const handleCopyLink = async () => {
    if (!effectiveDirectUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveDirectUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (_) {}
  };

  const isTodayClockedIn = Boolean(activeTodayRecord);
  const isTodayCompleted = Boolean(todayRecord?.check_in_time && todayRecord?.check_out_time);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
          <StudioCoreLiquidLoader />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Loading Shift Audit & Smart Attendance...
          </p>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !member) {
    return (
      <SidebarLayout>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-3xl shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Attendance Profile Not Found</h2>
          <p className="text-sm text-slate-600">
            {error || 'Your staff account is not mapped to an active in-house attendance roster for this studio.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => router.push('/team/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Go to Workspace Dashboard
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── TOP HEADER / PROFILE CARD ── */}
        <div className="px-6 py-5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-300 border-2 border-amber-400 overflow-hidden flex items-center justify-center font-black text-lg text-amber-900 shadow-xs shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                member.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900">{member.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                  {member.primary_role || 'Staff Member'}
                </span>
                {member.is_geofence_exempt && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    🌐 Remote Allowed
                  </span>
                )}
                {isTodayClockedIn && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Currently Clocked In
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium flex-wrap">
                {member.phone_number && (
                  <span className="flex items-center gap-1">
                    📱 {member.phone_number}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Shift: {formatTime12h(member.shift_start || '10:00:00')} - {formatTime12h(member.shift_end || '19:00:00')}
                </span>
                <span>
                  Weekly Offs: <strong className="text-slate-700">{Array.isArray(member?.weekly_offs) && member.weekly_offs.length > 0 ? member.weekly_offs.join(', ') : 'Sunday'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFullStaffModal(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Shift Audit Modal</span>
            </button>
            <button
              type="button"
              onClick={() => reloadSession()}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition shadow-2xs cursor-pointer"
              title="Refresh attendance records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── TODAY'S PUNCH ACTION & LIVE CLOCK CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Live Clock Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">TODAY'S CLOCK (IST)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 font-mono">
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {shifts[0]?.name || 'Standard Shift'} ({shifts[0]?.start_time?.substring(0, 5) || '10:00'} - {shifts[0]?.end_time?.substring(0, 5) || '19:00'})
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Date:</span>
              <span className="font-bold text-slate-800 font-mono">
                {formatDate(getLocalDateString(currentTime))}
              </span>
            </div>
          </div>

          {/* Today's Punch Status Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">PUNCH STATUS TODAY</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isTodayClockedIn ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse' :
                  isTodayCompleted ? 'bg-slate-100 text-slate-800 border border-slate-300' :
                  'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {isTodayClockedIn ? 'CLOCKED IN (WORKING)' :
                   isTodayCompleted ? 'SHIFT COMPLETED' :
                   'NOT PUNCHED YET'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {isTodayClockedIn ? (
                  <>In at <span className="font-bold text-slate-900">{formatTime12h(todayRecord?.check_in_time)}</span> ({todayRecord?.notes || 'Studio HQ'})</>
                ) : isTodayCompleted ? (
                  <>Shift ended at <span className="font-bold text-slate-900">{formatTime12h(todayRecord?.check_out_time)}</span></>
                ) : (
                  'Please punch in to begin tracking your work shift.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Working Duration Today:</span>
              <span className="font-mono font-bold text-emerald-700 flex items-center gap-1.5">
                {isTodayClockedIn ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{Math.floor(liveElapsedSec / 3600)}h {Math.floor((liveElapsedSec % 3600) / 60)}m {String(liveElapsedSec % 60).padStart(2, '0')}s</span>
                  </>
                ) : isTodayCompleted ? (
                  `${Math.floor((todayRecord?.work_duration_minutes || 0) / 60)}h ${(todayRecord?.work_duration_minutes || 0) % 60}m`
                ) : '0m'}
              </span>
            </div>
          </div>

          {/* Quick Action Punch Button Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">1-CLICK PUNCH</span>
              <Camera className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                {isTodayClockedIn ? 'Punch Out & End Shift' : isTodayCompleted ? 'Shift Completed' : 'Punch In with Selfie'}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {isTodayClockedIn 
                  ? 'Ready to clock out? Punch out directly with selfie & GPS.' 
                  : isTodayCompleted 
                  ? 'Your attendance has been recorded for today.' 
                  : 'Start your workday with instant selfie verification & GPS.'}
              </p>
            </div>

            <div className="mt-4 pt-2 space-y-2">
              {!isTodayCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    setPunchActionType(isTodayClockedIn ? 'check_out' : 'check_in');
                    setShowPunchModal(true);
                  }}
                  className={`w-full py-2.5 rounded-xl text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    isTodayClockedIn 
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800' 
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>{isTodayClockedIn ? 'Punch Out Directly' : 'Punch In Directly'}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
                  <span>{linkCopied ? 'Copied Link!' : 'Copy Mobile Link'}</span>
                </button>

                <a
                  href={effectiveDirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 transition-all flex items-center justify-center cursor-pointer"
                  title="Open direct punch portal"
                >
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER & DATE PRESETS BAR (Synced with Studio Owner View) ── */}
        <div className="p-4 bg-white border border-[#EAE5DA] rounded-3xl shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Shift Audit & Attendance History</h2>
              <p className="text-xs text-slate-500 font-medium">
                Verified check-in/out timestamps, selfie evidence, and GPS perimeters.
              </p>
            </div>

            {/* Presets and Custom Inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(['today', 'week', 'month', '3months'] as DatePreset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                      datePreset === preset 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {preset === '3months' ? 'Past 3 Months' : preset === 'month' ? 'This Month' : preset === 'week' ? 'This Week' : 'Today'}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="flex items-center gap-1.5 text-xs bg-white border border-[#EAE5DA] rounded-xl px-2.5 py-1 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
                />
                <span className="text-slate-400">➔</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs font-bold">
            <span className="text-[10px] uppercase font-black text-slate-400 mr-1 shrink-0">Filter:</span>
            {[
              { id: 'all', label: 'All Days' },
              { id: 'present', label: 'Present' },
              { id: 'late', label: 'Late Arrivals' },
              { id: 'half_day', label: 'Half Days' },
              { id: 'absent', label: 'Absents' },
              { id: 'holiday', label: 'Holidays' },
              { id: 'week_off', label: 'Weekly Offs' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 6 SUMMARY KPI CARDS (Identical to Studio Owner StaffDetailsModal) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* 1. Present Days */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Present Days</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {stats.presentDays} {stats.presentDays === 1 ? 'Day' : 'Days'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {stats.halfDays > 0 ? `Incl. ${stats.halfDays} Half ${stats.halfDays === 1 ? 'Day' : 'Days'}` : 'Verified on-duty'}
            </p>
          </div>

          {/* 2. Total Work Time (Continuously Ticking if Clocked In) */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Total Work Time</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono flex items-center gap-1.5">
              {activeTodayRecord && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />}
              <span>
                {Math.floor((stats.totalWorkMinutes * 60 + liveElapsedSec) / 3600)}h {Math.floor(((stats.totalWorkMinutes * 60 + liveElapsedSec) % 3600) / 60)}m {String((stats.totalWorkMinutes * 60 + liveElapsedSec) % 60).padStart(2, '0')}s
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {activeTodayRecord ? 'Live actively ticking' : `Avg: ${stats.avgHoursPerDay} hrs / day`}
            </p>
          </div>

          {/* 3. Absents */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Absents</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-black text-rose-600 font-mono">
              {stats.absentDays} {stats.absentDays === 1 ? 'Day' : 'Days'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {stats.absentDays > 0 ? 'Unexcused / missing' : 'Zero unexcused absences'}
            </p>
          </div>

          {/* 4. Late Arrivals */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Late Arrivals</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600 font-mono">
              {stats.lateDays > 0 ? `${stats.lateDays}D • ${formatMinutesToHours(stats.totalLateMinutes)}` : '0 Days'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {stats.lateDays > 0 ? `${stats.punctualityScore}% punctuality score` : '100% On-Time Record'}
            </p>
          </div>

          {/* 5. Early Check-outs */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Early Check-outs</span>
              <LogOut className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xl font-black text-orange-600 font-mono">
              {stats.earlyCheckoutDays > 0 ? `${stats.earlyCheckoutDays}D • ${formatMinutesToHours(stats.totalEarlyCheckoutMinutes)}` : '0 Days'}
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {stats.earlyCheckoutDays > 0 ? `${stats.earlyCheckoutDays} departures early` : 'Full shift durations'}
            </p>
          </div>

          {/* 6. Overtime */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Overtime</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700 font-mono">
              {stats.overtimeDays > 0 
                ? `${stats.overtimeDays}D • ${formatMinutesToHours(stats.totalOvertimeMinutes)}` 
                : '0 Days'}
            </div>
            <p className="text-[10.5px] text-purple-600 font-medium truncate">
              {stats.overtimeDays > 0 ? `${stats.overtimeDays} overtime shifts` : 'Standard shift hours'}
            </p>
          </div>

        </div>

        {/* ── DATE-WISE SHIFT AUDIT TIMELINE (GPS EVIDENCE & SELFIE SNAPSHOTS) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Date-Wise Shift Audit Timeline</h3>
              <p className="text-xs text-slate-500">Verified check-in/out timestamps, GPS coordinate perimeters, and selfie evidence.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Showing {shiftLogs.length} Records
            </span>
          </div>

          {shiftLogs.length === 0 ? (
            <div className="p-10 bg-white border border-dashed border-[#EAE5DA] rounded-2xl text-center text-slate-400 space-y-1">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No attendance shift logs found for this date range.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shiftLogs.map((log) => {
                const inTime = log.punch_in_time;
                const outTime = log.punch_out_time;

                // 1. UNPUNCHED DAYS (Absent, Company Holiday, Weekly Off, Approved Leave, Upcoming)
                if (!log.isPunched) {
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        log.status === 'pending'
                          ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                          : log.status === 'absent'
                          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                          : log.status === 'holiday'
                          ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                          : log.status === 'week_off'
                          ? 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-300'
                          : log.status === 'leave'
                          ? 'bg-sky-50/30 border-sky-200 hover:border-sky-300'
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatDate(log.date)}
                          </span>
                          {log.status === 'pending' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse">
                              ⏳ NOT CHECKED IN YET (TODAY)
                            </span>
                          )}
                          {log.status === 'absent' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              ❌ ABSENT
                            </span>
                          )}
                          {log.status === 'holiday' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              🌴 COMPANY HOLIDAY
                            </span>
                          )}
                          {log.status === 'week_off' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
                              🛋️ WEEKLY OFF
                            </span>
                          )}
                          {log.status === 'leave' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                              🏖️ APPROVED LEAVE
                            </span>
                          )}
                          {log.status === 'upcoming' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              📅 UPCOMING
                            </span>
                          )}
                        </div>
                        
                        <span className="text-[11px] text-slate-400 font-mono">
                          No Check-In Recorded
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-600 font-medium flex items-center gap-2">
                        <span>
                          {log.status === 'pending'
                            ? '⏳ Working day is in progress. Check-in is pending.'
                            : log.status === 'absent'
                            ? '⚠️ Attendance was not marked on this scheduled working day.'
                            : log.status === 'holiday'
                            ? `🎉 ${log.title || 'Official Company Festival / Public Holiday'}`
                            : log.status === 'week_off'
                            ? '🛋️ Scheduled regular weekly day-off'
                            : log.status === 'leave'
                            ? `🏖️ ${log.title} — ${log.notes || 'Approved leave request'}`
                            : 'Scheduled upcoming working shift'}
                        </span>
                      </div>
                    </div>
                  );
                }

                // 2. PUNCHED DAYS (Present, Late, Half-Day, Holiday Duty, Week-Off Duty)
                return (
                  <div
                    key={log.id}
                    className={`p-4 bg-white border rounded-2xl shadow-2xs space-y-3 transition hover:border-amber-300 ${
                      log.isHolidayDuty
                        ? 'border-amber-300 bg-amber-50/10'
                        : log.isWeekOffDuty
                        ? 'border-indigo-300 bg-indigo-50/10'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatDate(log.date)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          log.isHolidayDuty
                            ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                            : log.isWeekOffDuty
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-400 shadow-2xs'
                            : log.status === 'half_day'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : log.timing?.isLate
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {log.isHolidayDuty
                            ? '🌴 HOLIDAY DUTY'
                            : log.isWeekOffDuty
                            ? '🛋️ WEEK-OFF DUTY'
                            : (log.status || 'PRESENT').toUpperCase()}
                        </span>
                        {log.durationMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono border border-slate-200">
                            ⏱️ {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Verified Attendance Record
                      </span>
                    </div>

                    {/* Special Duty Banner for Holiday / Week-Off Work */}
                    {log.isHolidayDuty && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
                        <span>🌴 Special Duty: Attendance logged on Company Festival Holiday ({log.holidayName || 'Holiday'})</span>
                      </div>
                    )}
                    {log.isWeekOffDuty && (
                      <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold flex items-center gap-1.5">
                        <span>🛋️ Special Duty: Attendance logged on scheduled Weekly Off</span>
                      </div>
                    )}

                    {/* Punch In / Out Timings & Inline Thumbnails */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 text-xs">
                      {/* Check-In Column */}
                      <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Check-In (IST)</span>
                          {log.punch_in_time && (
                            (log.timing?.isEarlyArrival || log.early_minutes > 0) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Arrived {formatMinutesToHours(log.timing?.earlyArrivalMinutes || log.early_minutes)} early
                              </span>
                            ) : (log.timing?.isLate || log.late_minutes > 0) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Late by {formatMinutesToHours(log.timing?.lateMinutes || log.late_minutes)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                On Time
                              </span>
                            )
                          )}
                        </div>

                        {/* Check-In Block with Thumbnail */}
                        <div className="flex items-start gap-2.5">
                          {log.selfie_url ? (
                            <img
                              src={log.selfie_url}
                              alt="In Selfie"
                              onClick={() => setZoomImage(log.selfie_url)}
                              className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shadow-2xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-bold border border-slate-200 shrink-0 text-center leading-tight">
                              No In Photo
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block font-mono">
                              {formatTime12h(log.punch_in_time)}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]" title={log.punch_in_lat ? `${Number(log.punch_in_lat).toFixed(4)}, ${Number(log.punch_in_lng).toFixed(4)}` : (log.location_address || 'Geofence Verified')}>
                              {log.punch_in_lat ? `${Number(log.punch_in_lat).toFixed(4)}, ${Number(log.punch_in_lng).toFixed(4)}` : (log.location_address || 'Geofence Verified')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Check-Out Column */}
                      <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Check-Out (IST)</span>
                          {log.punch_out_time ? (
                            (log.timing?.isEarlyCheckout || log.early_checkout_minutes > 0) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Left {formatMinutesToHours(log.timing?.earlyCheckoutMinutes || log.early_checkout_minutes)} early
                              </span>
                            ) : (log.timing?.isOvertime || log.overtime_minutes > 0) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Worked {formatMinutesToHours(log.timing?.overtimeMinutes || log.overtime_minutes)} OT
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                Shift Completed
                              </span>
                            )
                          ) : inTime ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                            </span>
                          ) : null}
                        </div>

                        {/* Check-Out Block with Thumbnail */}
                        <div className="flex items-start gap-2.5">
                          {log.check_out_selfie_url ? (
                            <img
                              src={log.check_out_selfie_url}
                              alt="Out Selfie"
                              onClick={() => setZoomImage(log.check_out_selfie_url)}
                              className="w-10 h-10 rounded-lg object-cover border border-amber-300 shadow-2xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-bold border border-slate-200 shrink-0 text-center leading-tight">
                              {log.punch_out_time ? 'No Out Photo' : 'Active'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block font-mono">
                              {log.punch_out_time ? formatTime12h(log.punch_out_time) : (
                                inTime ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> In Progress
                                  </span>
                                ) : '—'
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]" title={log.punch_out_lat ? `${Number(log.punch_out_lat).toFixed(4)}, ${Number(log.punch_out_lng).toFixed(4)}` : (log.check_out_address || 'Geofence Verified')}>
                              {log.punch_out_lat ? `${Number(log.punch_out_lat).toFixed(4)}, ${Number(log.punch_out_lng).toFixed(4)}` : (log.check_out_address || 'Geofence Verified')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── PHOTO ZOOM LIGHTBOX MODAL ── */}
      {zoomImage && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setZoomImage(null)}>
          <div className="relative max-w-md w-full bg-white rounded-2xl p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => setZoomImage(null)} 
              className="absolute top-3 right-3 p-1 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer transition z-10"
            >
              <X className="w-5 h-5"/>
            </button>
            <img src={zoomImage} alt="Enlarged Evidence" className="w-full h-auto rounded-xl max-h-[75vh] object-contain"/>
          </div>
        </div>
      )}

      {/* ── STANDALONE FULLSCREEN SHIFT AUDIT MODAL (Identical to Studio Owner) ── */}
      {showFullStaffModal && member && (
        <StaffDetailsModal
          isOpen={showFullStaffModal}
          onClose={() => setShowFullStaffModal(false)}
          member={member}
          records={monthlyHistory}
          shifts={shifts}
          readOnly={true}
          onAttendanceChanged={reloadSession}
        />
      )}

      {/* ── QUICK SELFIE PUNCH MODAL ── */}
      {showPunchModal && secureToken && member && (
        <SelfiePunchModal
          isOpen={showPunchModal}
          onClose={() => setShowPunchModal(false)}
          member={member}
          shifts={shifts}
          locations={locations}
          actionType={punchActionType}
          token={secureToken}
          onPunchSuccess={async () => {
            setShowPunchModal(false);
            await reloadSession();
          }}
        />
      )}

    </SidebarLayout>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, MapPin, TrendingUp, Award, 
  CheckCircle2, Phone, RefreshCw, Compass, Camera, ExternalLink,
  AlertTriangle, LogOut, UserX
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember, AttendanceRecord, AttendanceShift } from '@/types';
import { analyzeAttendanceRecordTiming } from '@/lib/attendance/time-calculations';

interface StaffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember;
  records?: AttendanceRecord[];
  shifts?: AttendanceShift[];
  onUpdateRecord?: (recordId: string, updates: Partial<AttendanceRecord>) => Promise<void>;
}

type DatePreset = 'today' | 'week' | 'month' | '3months' | 'custom';

// 12-hour format with AM/PM (hh:mm A)
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
    }
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1] ? parts[1].slice(0, 2) : '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    return timeStr;
  } catch {
    return '—';
  }
}

export const formatTo12Hr = formatTime12h;

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

export const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StaffDetailsModal({
  isOpen,
  onClose,
  member,
  records = [],
  shifts = [],
  onUpdateRecord
}: StaffDetailsModalProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return getLocalDateString(new Date());
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'half_day' | 'absent' | 'holiday' | 'week_off'>('all');
  const [fetchedRecords, setFetchedRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Active 1-second live ticker
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatLiveDuration = useCallback((inTimeStr?: string | null, outTimeStr?: string | null): string => {
    if (!inTimeStr) return '—';
    const startMs = new Date(inTimeStr).getTime();
    const endMs = outTimeStr ? new Date(outTimeStr).getTime() : nowTick;
    const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [nowTick]);

  const isMissedPunchOut = useCallback((inTimeStr?: string | null, outTimeStr?: string | null, recordDate?: string): boolean => {
    if (!inTimeStr || outTimeStr) return false;
    const todayIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (recordDate && recordDate < todayIst) return true;
    const elapsedHours = (nowTick - new Date(inTimeStr).getTime()) / (1000 * 60 * 60);
    return elapsedHours >= 16;
  }, [nowTick]);

  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = getLocalDateString(today);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(getLocalDateString(monday));
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

  // Load records from both attendance_records and attendance_logs for selected date range with loose matching
  useEffect(() => {
    if (!isOpen || !member?.id) return;

    let isMounted = true;
    const loadMemberHistory = async () => {
      setLoadingRecords(true);
      try {
        const targetId = String(member.id);

        let logQuery = supabase
          .from('attendance_logs')
          .select('*')
          .eq('member_id', targetId)
          .order('date', { ascending: false });

        if (startDate) logQuery = logQuery.gte('date', startDate);
        if (endDate) logQuery = logQuery.lte('date', endDate);

        const { data: logData, error: logError } = await logQuery;
        if (logError) console.warn('attendance_logs query error:', logError);

        let recQuery = supabase
          .from('attendance_records')
          .select('*')
          .eq('member_id', targetId)
          .order('date', { ascending: false });

        if (startDate) recQuery = recQuery.gte('date', startDate);
        if (endDate) recQuery = recQuery.lte('date', endDate);

        const { data: recData, error: recError } = await recQuery;
        if (recError) console.warn('attendance_records query error:', recError);

        const mergedMap = new Map<string, any>();
        (recData || []).forEach((r: any) => {
          const recInPhoto = r.check_in_photo || r.check_in_selfie || r.check_in_photo_path || r.selfie_url || r.photo_path || null;
          const recOutPhoto = r.check_out_photo || r.check_out_selfie || r.punch_out_selfie || r.check_out_photo_path || null;

          mergedMap.set(r.date, {
            ...r,
            punch_in_time: r.punch_in_time || r.check_in_time,
            punch_out_time: r.punch_out_time || r.check_out_time,
            punch_in_lat: r.punch_in_lat || r.check_in_lat || null,
            punch_in_lng: r.punch_in_lng || r.check_in_lng || null,
            punch_out_lat: r.punch_out_lat || r.check_out_lat || null,
            punch_out_lng: r.punch_out_lng || r.check_out_lng || null,
            selfie_url: recInPhoto,
            check_in_photo: recInPhoto,
            check_in_selfie: recInPhoto,
            check_out_selfie_url: recOutPhoto,
            check_out_photo: recOutPhoto,
            check_out_selfie: recOutPhoto,
            location_address: r.location_address || r.location_name || null,
            check_out_address: r.check_out_address || r.location_address || r.location_name || null,
          });
        });

        (logData || []).forEach((log: any) => {
          const existing = mergedMap.get(log.date);
          const logInPhoto = log.selfie_url || log.punch_in_selfie || log.check_in_selfie || log.check_in_photo || null;
          const logOutPhoto = log.check_out_selfie_url || log.punch_out_selfie || log.check_out_photo_path || log.check_out_selfie || null;

          if (existing) {
            existing.log_id = log.id;
            if (log.punch_in_time) {
              existing.punch_in_time = log.punch_in_time;
              if (!existing.check_in_time) existing.check_in_time = log.punch_in_time;
            }
            if (log.punch_out_time) {
              existing.punch_out_time = log.punch_out_time;
              if (!existing.check_out_time) existing.check_out_time = log.punch_out_time;
            }
            if (log.total_work_minutes !== undefined && log.total_work_minutes !== null) {
              existing.total_work_minutes = log.total_work_minutes;
              if (!existing.work_duration_minutes) existing.work_duration_minutes = log.total_work_minutes;
            }
            if (log.punch_in_lat) existing.punch_in_lat = log.punch_in_lat;
            if (log.punch_in_lng) existing.punch_in_lng = log.punch_in_lng;
            if (log.punch_out_lat) existing.punch_out_lat = log.punch_out_lat;
            if (log.punch_out_lng) existing.punch_out_lng = log.punch_out_lng;
            if (log.early_minutes) existing.early_minutes = log.early_minutes;
            if (log.late_minutes) existing.late_minutes = log.late_minutes;
            if (log.overtime_minutes) existing.overtime_minutes = log.overtime_minutes;
            if (logInPhoto && !existing.selfie_url) existing.selfie_url = logInPhoto;
            if (logInPhoto && !existing.check_in_photo) existing.check_in_photo = logInPhoto;
            if (logOutPhoto && !existing.check_out_selfie_url) existing.check_out_selfie_url = logOutPhoto;
            if (logOutPhoto && !existing.check_out_photo) existing.check_out_photo = logOutPhoto;
            if (log.location_address && !existing.location_address) existing.location_address = log.location_address;
            if (log.check_out_address && !existing.check_out_address) existing.check_out_address = log.check_out_address;
          } else {
            mergedMap.set(log.date, {
              id: log.id,
              log_id: log.id,
              member_id: targetId,
              date: log.date,
              status: (log.status || 'present').toLowerCase(),
              check_in_time: log.punch_in_time,
              punch_in_time: log.punch_in_time,
              check_out_time: log.punch_out_time,
              punch_out_time: log.punch_out_time,
              punch_in_lat: log.punch_in_lat,
              punch_in_lng: log.punch_in_lng,
              punch_out_lat: log.punch_out_lat,
              punch_out_lng: log.punch_out_lng,
              early_minutes: log.early_minutes,
              late_minutes: log.late_minutes,
              overtime_minutes: log.overtime_minutes,
              selfie_url: logInPhoto,
              check_in_photo: logInPhoto,
              check_in_selfie: logInPhoto,
              check_out_selfie_url: logOutPhoto,
              check_out_photo: logOutPhoto,
              check_out_selfie: logOutPhoto,
              location_address: log.location_address || null,
              check_out_address: log.check_out_address || null,
              work_duration_minutes: log.total_work_minutes || 0,
              total_work_minutes: log.total_work_minutes || 0,
              is_geofence_exempt: log.is_geofence_exempt || false,
              notes: log.notes
            });
          }
        });

        if (isMounted) {
          const list = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
          setFetchedRecords(list);
        }
      } catch (err) {
        console.error('Error fetching member history:', err);
      } finally {
        if (isMounted) setLoadingRecords(false);
      }
    };

    loadMemberHistory();
    return () => { isMounted = false; };
  }, [isOpen, member?.id, startDate, endDate]);

  const memberRecords = useMemo(() => {
    return fetchedRecords.filter(r => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'late') {
        const t = analyzeAttendanceRecordTiming(r, member);
        return t.isLate;
      }
      return r.status === statusFilter;
    });
  }, [fetchedRecords, statusFilter, member]);

  // Aggregate Metrics
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

    memberRecords.forEach(r => {
      const inTime = r.punch_in_time || r.check_in_time;
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

        const work = r.total_work_minutes || r.work_duration_minutes || 0;
        totalWorkMinutes += work;
      }
    });

    // Accurate Absent Days Metric: Total scheduled days - Present days - Approved Leaves
    let approvedLeaveDays = 0;
    let explicitAbsentDays = 0;

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const effectiveEnd = endDate < todayStr ? endDate : todayStr;

    const sDate = new Date(startDate);
    const eDate = new Date(effectiveEnd);

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
        const dateIso = cur.toISOString().split('T')[0];

        const isWeeklyOff = offDayNames.some(o => o === dayLong || o === dayShort || dayLong.includes(o));
        const rec = fetchedRecords.find(r => r.date === dateIso);
        const isHoliday = rec?.status === 'holiday';

        if (!isWeeklyOff && !isHoliday) {
          scheduledDays++;
        }

        if (rec) {
          if (rec.status === 'leave' || rec.status === 'approved_leave') {
            approvedLeaveDays++;
          } else if (rec.status === 'absent') {
            explicitAbsentDays++;
          }
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
  }, [memberRecords, member, shifts, fetchedRecords, startDate, endDate]);

  // Active check-in state to drive live continuous work hours in header stats
  const activeTodayRecord = useMemo(() => {
    return fetchedRecords.find(r => {
      const inTime = r.punch_in_time || r.check_in_time;
      const outTime = r.punch_out_time || r.check_out_time;
      return Boolean(inTime && !outTime);
    });
  }, [fetchedRecords]);

  const liveElapsedSec = useMemo(() => {
    if (!activeTodayRecord) return 0;
    const inTime = activeTodayRecord.punch_in_time || activeTodayRecord.check_in_time;
    if (!inTime) return 0;
    return Math.max(0, Math.floor((nowTick - new Date(inTime).getTime()) / 1000));
  }, [activeTodayRecord, nowTick]);

  // Map member records into structured audit timeline logs
  const memberLogs = useMemo(() => {
    return memberRecords.map(rec => {
      const inTime = rec.punch_in_time || rec.check_in_time;
      const outTime = rec.punch_out_time || rec.check_out_time;
      const timing = analyzeAttendanceRecordTiming(rec, member, shifts[0]?.start_time || '10:00', shifts[0]?.end_time || '19:00');

      const earlyMinutes = Number(rec.early_minutes || rec.early_arrival_minutes || (timing.isEarlyArrival ? timing.earlyArrivalMinutes : 0));
      const lateMinutes = Number(rec.late_minutes || (timing.isLate ? timing.lateMinutes : 0));
      const earlyCheckoutMinutes = Number(rec.early_checkout_minutes || (timing.isEarlyCheckout ? timing.earlyCheckoutMinutes : 0));
      const overtimeMinutes = Number(rec.overtime_minutes || (timing.isOvertime ? timing.overtimeMinutes : 0));
      const checkInPhoto = rec.check_in_photo || rec.selfie_url || rec.check_in_photo_path || rec.check_in_selfie;
      const checkOutPhoto = rec.check_out_photo || rec.check_out_photo_path || rec.punch_out_selfie || rec.check_out_selfie || rec.check_out_selfie_url;

      return {
        id: rec.id || `log_${rec.date}`,
        date: rec.date,
        punch_in_time: inTime,
        punch_out_time: outTime,
        punch_in_lat: rec.punch_in_lat || rec.check_in_lat,
        punch_in_lng: rec.punch_in_lng || rec.check_in_lng,
        punch_out_lat: rec.punch_out_lat || rec.check_out_lat,
        punch_out_lng: rec.punch_out_lng || rec.check_out_lng,
        early_minutes: earlyMinutes,
        late_minutes: lateMinutes,
        early_checkout_minutes: earlyCheckoutMinutes,
        overtime_minutes: overtimeMinutes,
        selfie_url: checkInPhoto,
        check_in_selfie: checkInPhoto,
        check_out_selfie: checkOutPhoto,
        check_out_selfie_url: checkOutPhoto,
        location_address: rec.location_address || rec.location_name,
        check_out_address: rec.check_out_address || rec.location_address || rec.location_name,
        status: rec.status,
        timing
      };
    });
  }, [memberRecords, member, shifts]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100010] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm font-sans overflow-y-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] text-slate-900 w-full max-w-5xl rounded-3xl border border-[#EAE5DA] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
        >
          {/* Pinned close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 bg-white/80 z-30 transition cursor-pointer shadow-xs border border-slate-200"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ── TOP HEADER ── */}
          <div className="px-6 py-5 bg-[#FAF9F5] border-b border-[#EAE5DA] flex flex-col md:flex-row md:items-center justify-between gap-4 pr-14">
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
                  <h2 className="text-xl font-black text-slate-900">{member.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    {member.primary_role || 'Staff Member'}
                  </span>
                  {member.is_geofence_exempt && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      🌐 Remote Allowed
                    </span>
                  )}
                  {activeTodayRecord && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Currently Clocked In
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 font-medium">
                  {member.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {member.phone_number}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Shift: {formatTime12h(member.shift_start || '10:00:00')} - {formatTime12h(member.shift_end || '19:00:00')}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Range Presets */}
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

          {/* ── BODY CONTENT ── */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#FFFDF9]">

            {/* ── 5 SUMMARY METRIC CARDS (With Continuous Live Ticking Hours & Formatted Times) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              
              {/* 1. Total Working Time (Continuously Ticking if Clocked In) */}
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

              {/* 2. Absents (Total Scheduled - Present - Leaves) */}
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

              {/* 3. Late Arrivals (Total days late + formatted total duration) */}
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

              {/* 4. Early Check-outs (Total days left early + formatted total duration) */}
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

              {/* 5. Total Overtime (Total days + formatted total OT duration) */}
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

            {/* ── 3. DATE-WISE SHIFT LOGS AUDIT TIMELINE (GPS EVIDENCE & SELFIE SNAPSHOTS) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Date-Wise Shift Audit Timeline</h3>
                  <p className="text-xs text-slate-500">Verified check-in/out timestamps, GPS coordinate perimeters, and selfie evidence.</p>
                </div>
                {loadingRecords && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-700 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...
                  </span>
                )}
              </div>

              {memberLogs.length === 0 ? (
                <div className="p-10 bg-white border border-dashed border-[#EAE5DA] rounded-2xl text-center text-slate-400 space-y-1">
                  <Clock className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No attendance shift logs found for this date range.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberLogs.map((log) => {
                    const inTime = log.punch_in_time;
                    const outTime = log.punch_out_time;
                    const missed = isMissedPunchOut(inTime, outTime, log.date);

                    return (
                      <div key={log.id} className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3 hover:border-amber-300 transition">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900">
                              {formatDate(log.date)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              log.status === 'holiday'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : log.status === 'week_off'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : log.status === 'half_day'
                                ? 'bg-orange-50 text-orange-800 border-orange-200'
                                : log.timing?.isLate
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {(log.status || 'PRESENT').toUpperCase()}
                            </span>
                          </div>

                          {/* Status Indicators */}
                          <div className="flex items-center gap-2">
                            {missed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                                Missed Punch Out
                              </span>
                            )}
                          </div>
                        </div>

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
                              {/* Small Thumbnail */}
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
                                  {formatTo12Hr(log.punch_in_time)}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={log.punch_in_lat ? `${Number(log.punch_in_lat).toFixed(4)}, ${Number(log.punch_in_lng).toFixed(4)}` : (log.location_address || 'Geofence Verified')}>
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
                                missed ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                    Missed Out
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                                  </span>
                                )
                              ) : null}
                            </div>

                            {/* Check-Out Block with Thumbnail */}
                            <div className="flex items-start gap-2.5">
                              {/* Small Thumbnail */}
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
                                  {log.punch_out_time ? formatTo12Hr(log.punch_out_time) : (
                                    inTime ? (
                                      missed ? 'Missed Out' : (
                                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> In Progress
                                        </span>
                                      )
                                    ) : '—'
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={log.punch_out_lat ? `${Number(log.punch_out_lat).toFixed(4)}, ${Number(log.punch_out_lng).toFixed(4)}` : (log.check_out_address || 'Geofence Verified')}>
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

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, MapPin, TrendingUp, Award, 
  CheckCircle2, Phone, RefreshCw, Compass, Camera, ExternalLink,
  AlertTriangle, LogOut, UserX, ChevronDown
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
  onAttendanceChanged?: () => Promise<void> | void;
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
  onAttendanceChanged,
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
  const [companyHolidays, setCompanyHolidays] = useState<any[]>([]);
  const [memberLeaves, setMemberLeaves] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Manual regularization state
  const [regularizingDate, setRegularizingDate] = useState<string | null>(null);
  const [regularizeToast, setRegularizeToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRegularizeAttendance = async (date: string, newStatus: 'present' | 'half_day' | 'absent') => {
    if (!member?.id) return;
    setRegularizingDate(date);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const shiftStartStr = member.shift_start || shifts[0]?.start_time || '10:00';
      const shiftEndStr = member.shift_end || shifts[0]?.end_time || '19:00';

      let checkInISO: string | null = null;
      let checkOutISO: string | null = null;
      let workMinutes = 0;

      if (newStatus === 'present') {
        checkInISO = `${date}T${shiftStartStr.substring(0, 5)}:00.000+05:30`;
        checkOutISO = `${date}T${shiftEndStr.substring(0, 5)}:00.000+05:30`;
        workMinutes = 480; // 8 hours standard
      } else if (newStatus === 'half_day') {
        checkInISO = `${date}T${shiftStartStr.substring(0, 5)}:00.000+05:30`;
        checkOutISO = `${date}T14:30:00.000+05:30`;
        workMinutes = 240; // 4 hours standard
      } else {
        // absent
        checkInISO = null;
        checkOutISO = null;
        workMinutes = 0;
      }

      const noteText = `Manually regularized to ${newStatus.toUpperCase()} by Admin`;

      // 1. Upsert attendance_records
      const recPayload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        member_id: member.id,
        date: date,
        status: newStatus,
        check_in_time: checkInISO,
        check_out_time: checkOutISO,
        check_in_verified: newStatus !== 'absent',
        check_out_verified: newStatus !== 'absent',
        work_duration_minutes: workMinutes,
        total_work_minutes: workMinutes,
        notes: noteText,
        updated_at: new Date().toISOString()
      };

      const { error: recErr } = await supabase
        .from('attendance_records')
        .upsert([recPayload], { onConflict: 'member_id,date' });

      if (recErr) console.warn('attendance_records upsert notice:', recErr);

      // 2. Upsert / update attendance_logs
      try {
        const memIds = Array.from(new Set([String(member.id), ...(member.aliasIds || []).map(String)]));
        const { data: existingLogs } = await supabase
          .from('attendance_logs')
          .select('id')
          .in('member_id', memIds)
          .eq('date', date);

        if (existingLogs && existingLogs.length > 0) {
          await supabase
            .from('attendance_logs')
            .update({
              status: newStatus.toUpperCase(),
              punch_in_time: checkInISO,
              punch_out_time: checkOutISO,
              total_work_minutes: workMinutes,
              notes: noteText,
              updated_at: new Date().toISOString()
            })
            .in('id', existingLogs.map(l => l.id));
        } else if (newStatus !== 'absent') {
          await supabase
            .from('attendance_logs')
            .insert([{
              member_id: String(member.id),
              member_name: member.name,
              date: date,
              status: newStatus.toUpperCase(),
              punch_in_time: checkInISO,
              punch_out_time: checkOutISO,
              total_work_minutes: workMinutes,
              notes: noteText
            }]);
        }
      } catch (logErr) {
        console.warn('attendance_logs sync notice:', logErr);
      }

      // 3. Optimistically update fetchedRecords
      setFetchedRecords(prev => {
        const existingIdx = prev.findIndex(r => r.date === date);
        const updatedItem = {
          ...(existingIdx >= 0 ? prev[existingIdx] : {}),
          id: existingIdx >= 0 ? prev[existingIdx].id : `rec_${date}`,
          member_id: member.id,
          date,
          status: newStatus,
          punch_in_time: checkInISO,
          punch_out_time: checkOutISO,
          check_in_time: checkInISO,
          check_out_time: checkOutISO,
          total_work_minutes: workMinutes,
          work_duration_minutes: workMinutes,
          notes: noteText
        };

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = updatedItem;
          return next;
        } else {
          return [updatedItem, ...prev].sort((a, b) => b.date.localeCompare(a.date));
        }
      });

      const label = newStatus === 'present' ? 'Present' : newStatus === 'half_day' ? 'Half Day' : 'Absent';
      setRegularizeToast({
        message: `${formatDate(date)} regularized as ${label}`,
        type: 'success'
      });
      setTimeout(() => setRegularizeToast(null), 3500);

      // 4. Notify parent workspace attendance roster
      if (onAttendanceChanged) {
        await onAttendanceChanged();
      }
    } catch (err: any) {
      console.error('Regularize error:', err);
      setRegularizeToast({
        message: `Failed to update: ${err.message || err}`,
        type: 'error'
      });
      setTimeout(() => setRegularizeToast(null), 4000);
    } finally {
      setRegularizingDate(null);
    }
  };

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

  // Load records from both attendance_records and attendance_logs for selected date range with loose matching
  useEffect(() => {
    if (!isOpen || !member?.id) return;

    let isMounted = true;
    const loadMemberHistory = async () => {
      setLoadingRecords(true);
      try {
        const targetIds = [String(member.id)];
        if ((member as any).aliasIds && Array.isArray((member as any).aliasIds)) {
          (member as any).aliasIds.forEach((id: any) => {
            const sId = String(id);
            if (!targetIds.includes(sId)) targetIds.push(sId);
          });
        }

        // Query Company Holidays
        try {
          const { data: holData } = await supabase
            .from('company_holidays')
            .select('id, holiday_date, name, note')
            .order('holiday_date', { ascending: true });
          if (isMounted && holData) setCompanyHolidays(holData);
        } catch (_) {}

        // Query Leaves
        try {
          const { data: lData } = await supabase
            .from('attendance_leave_requests')
            .select('id, leave_type, start_date, end_date, reason, status')
            .in('member_id', targetIds)
            .neq('status', 'rejected');
          if (isMounted && lData) setMemberLeaves(lData);
        } catch (_) {}

        let logQuery = supabase
          .from('attendance_logs')
          .select('*')
          .in('member_id', targetIds)
          .order('date', { ascending: false });

        if (startDate) logQuery = logQuery.gte('date', startDate);
        if (endDate) logQuery = logQuery.lte('date', endDate);

        const { data: logData, error: logError } = await logQuery;
        if (logError) console.warn('attendance_logs query error:', logError);

        let recQuery = supabase
          .from('attendance_records')
          .select('*')
          .in('member_id', targetIds)
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
              member_id: member.id,
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

        // Calculate work duration strictly from check-in to check-out
        // If currently clocked in without check-out, exclude from static sum so liveElapsedSec drives it
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
        const isHoliday = (companyHolidays || []).some(h => h.holiday_date === dateIso) || fetchedRecords.find(r => r.date === dateIso)?.status === 'holiday';
        const isLeave = (memberLeaves || []).some(l => dateIso >= l.start_date && dateIso <= l.end_date && l.status !== 'rejected');

        if (!isWeeklyOff && !isHoliday) {
          scheduledDays++;
        }

        const rec = fetchedRecords.find(r => r.date === dateIso);
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
  }, [memberRecords, member, shifts, fetchedRecords, startDate, endDate, companyHolidays, memberLeaves]);

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
    const diffSec = Math.max(0, Math.floor((nowTick - new Date(inTime).getTime()) / 1000));
    const breakSec = (Number(activeTodayRecord.total_break_minutes || activeTodayRecord.break_duration_minutes) || 0) * 60;
    return Math.max(0, diffSec - breakSec);
  }, [activeTodayRecord, nowTick]);

  // Map member records into structured audit timeline logs covering every single day in range
  const memberLogs = useMemo(() => {
    if (!startDate || !endDate) return [];

    const sDate = new Date(startDate + 'T00:00:00');
    const eDate = new Date(endDate + 'T00:00:00');
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) return [];

    const todayIstStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const custom = (member?.custom_data as any) || {};
    const rawOffs = member?.weekly_offs || custom.weekly_offs || ['Sunday'];
    const offDayNames: string[] = [];
    if (Array.isArray(rawOffs)) {
      rawOffs.forEach((d: string) => offDayNames.push(String(d).toLowerCase()));
    } else if (typeof rawOffs === 'string') {
      offDayNames.push(rawOffs.toLowerCase());
    }
    if (offDayNames.length === 0) offDayNames.push('sunday', 'sun');

    const logs: any[] = [];
    const cur = new Date(eDate);

    while (cur >= sDate) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayLong = cur.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayShort = cur.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

      const holidayMatch = (companyHolidays || []).find(h => h.holiday_date === dateStr);
      const isWeeklyOff = offDayNames.some(o => o === dayLong || o === dayShort || dayLong.includes(o));
      const leaveMatch = (memberLeaves || []).find(l => dateStr >= l.start_date && dateStr <= l.end_date && l.status !== 'rejected');

      const rec = fetchedRecords.find(r => r.date === dateStr);

      if (rec) {
        const inTime = rec.punch_in_time || rec.check_in_time;
        const outTime = rec.punch_out_time || rec.check_out_time;
        const timing = analyzeAttendanceRecordTiming(rec, member, shifts[0]?.start_time || '10:00', shifts[0]?.end_time || '19:00');

        const isLateRecord = timing.isLate || rec.status === 'late' || (Number(rec.late_minutes) > 0);
        const earlyMinutes = Number(rec.early_minutes || rec.early_arrival_minutes || (timing.isEarlyArrival ? timing.earlyArrivalMinutes : 0));
        const lateMinutes = Number(rec.late_minutes || (timing.isLate ? timing.lateMinutes : 0));
        const earlyCheckoutMinutes = Number(rec.early_checkout_minutes || (timing.isEarlyCheckout ? timing.earlyCheckoutMinutes : 0));
        const overtimeMinutes = Number(rec.overtime_minutes || (timing.isOvertime ? timing.overtimeMinutes : 0));
        const checkInPhoto = rec.check_in_photo || rec.selfie_url || rec.check_in_photo_path || rec.check_in_selfie;
        const checkOutPhoto = rec.check_out_photo || rec.check_out_photo_path || rec.punch_out_selfie || rec.check_out_selfie || rec.check_out_selfie_url;

        let dutyStatus = isLateRecord ? 'late' : (rec.status || 'present');
        let isHolidayDuty = false;
        let isWeekOffDuty = false;

        if (holidayMatch) {
          dutyStatus = 'worked_holiday';
          isHolidayDuty = true;
        } else if (isWeeklyOff) {
          dutyStatus = 'worked_week_off';
          isWeekOffDuty = true;
        }

        // Calculate work duration strictly from check-in to check-out
        let durationMinutes = 0;
        if (inTime && outTime) {
          const inMs = new Date(inTime).getTime();
          const outMs = new Date(outTime).getTime();
          durationMinutes = Math.max(0, Math.floor((outMs - inMs) / 60000));
        } else if (inTime && !outTime) {
          const inMs = new Date(inTime).getTime();
          const isToday = dateStr === todayIstStr;
          const endMs = isToday ? nowTick : inMs;
          durationMinutes = Math.max(0, Math.floor((endMs - inMs) / 60000));
        } else {
          durationMinutes = Number(rec.work_duration_minutes) || Number(rec.total_work_minutes) || 0;
        }
        const breakMins = Number(rec.total_break_minutes || rec.break_duration_minutes) || 0;
        durationMinutes = Math.max(0, durationMinutes - breakMins);

        logs.push({
          id: rec.id || `log_${dateStr}`,
          date: dateStr,
          isPunched: true,
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
          status: dutyStatus,
          isHolidayDuty,
          isWeekOffDuty,
          holidayName: holidayMatch?.name || null,
          durationMinutes,
          timing
        });
      } else {
        // No punch record logged for this date
        if (holidayMatch) {
          logs.push({
            id: `holiday_${dateStr}`,
            date: dateStr,
            isPunched: false,
            status: 'holiday',
            title: holidayMatch.name || 'Company Holiday',
            notes: holidayMatch.note || 'Official festival / public holiday',
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
  }, [startDate, endDate, fetchedRecords, companyHolidays, memberLeaves, member, shifts, statusFilter, nowTick]);

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

            {/* Regularization Feedback Toast */}
            <AnimatePresence>
              {regularizeToast && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm ${
                    regularizeToast.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {regularizeToast.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{regularizeToast.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegularizeToast(null)}
                    className="p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 6 SUMMARY METRIC CARDS (With Present Days, Continuous Live Ticking Hours & Formatted Times) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* 1. Present Days (Verified Attendance) */}
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

              {/* 2. Total Working Time (Continuously Ticking if Clocked In) */}
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

                    // 1. UNPUNCHED DAYS (Absent, Company Holiday, Weekly Off, Approved Leave, Upcoming)
                    if (!log.isPunched) {
                      return (
                        <div
                          key={log.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            log.status === 'absent'
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
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                                No Check-In Recorded
                              </span>
                              {/* Admin Manual Regularization Selector */}
                              <div className="flex items-center gap-1.5 bg-white/95 px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] font-black uppercase text-slate-400 hidden sm:inline">Mark:</span>
                                <div className="relative inline-flex items-center">
                                  <select
                                    disabled={regularizingDate === log.date}
                                    value={
                                      log.status === 'half_day'
                                        ? 'half_day'
                                        : log.status === 'present'
                                        ? 'present'
                                        : log.status === 'absent'
                                        ? 'absent'
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value as 'present' | 'half_day' | 'absent';
                                      if (val) handleRegularizeAttendance(log.date, val);
                                    }}
                                    className={`text-xs font-bold py-1 pl-2 pr-7 rounded-lg border appearance-none cursor-pointer transition focus:outline-none focus:ring-1 ${
                                      log.status === 'present'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                                        : log.status === 'half_day'
                                        ? 'bg-orange-50 text-orange-800 border-orange-300 focus:ring-orange-500'
                                        : log.status === 'absent'
                                        ? 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-500'
                                        : 'bg-white text-slate-700 border-slate-200 focus:ring-slate-400'
                                    }`}
                                  >
                                    <option value="" disabled>Select Status</option>
                                    <option value="present">🟢 Present</option>
                                    <option value="half_day">🟠 Half Day</option>
                                    <option value="absent">🔴 Absent</option>
                                  </select>
                                  {regularizingDate === log.date ? (
                                    <RefreshCw className="w-3 h-3 text-slate-500 animate-spin absolute right-2 pointer-events-none" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-600 font-medium flex items-center gap-2">
                            <span>
                              {log.status === 'absent'
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

                          {/* Status Indicators & Admin Regularization */}
                          <div className="flex items-center gap-2">
                            {missed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                                Missed Punch Out
                              </span>
                            )}
                            {/* Admin Manual Regularization Selector */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[10px] font-black uppercase text-slate-400 hidden sm:inline">Change:</span>
                              <div className="relative inline-flex items-center">
                                <select
                                  disabled={regularizingDate === log.date}
                                  value={
                                    log.status === 'half_day'
                                      ? 'half_day'
                                      : log.status === 'present' || log.isHolidayDuty || log.isWeekOffDuty
                                      ? 'present'
                                      : 'absent'
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value as 'present' | 'half_day' | 'absent';
                                    if (val) handleRegularizeAttendance(log.date, val);
                                  }}
                                  className={`text-xs font-bold py-1 pl-2 pr-7 rounded-lg border appearance-none cursor-pointer transition focus:outline-none focus:ring-1 ${
                                    log.status === 'present' || log.isHolidayDuty || log.isWeekOffDuty
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                                      : log.status === 'half_day'
                                      ? 'bg-orange-50 text-orange-800 border-orange-300 focus:ring-orange-500'
                                      : 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-500'
                                  }`}
                                >
                                  <option value="present">🟢 Present</option>
                                  <option value="half_day">🟠 Half Day</option>
                                  <option value="absent">🔴 Absent</option>
                                </select>
                                {regularizingDate === log.date ? (
                                  <RefreshCw className="w-3 h-3 text-slate-500 animate-spin absolute right-2 pointer-events-none" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                                )}
                              </div>
                            </div>
                          </div>
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

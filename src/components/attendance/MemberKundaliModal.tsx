'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Calendar, Clock, MapPin, ShieldCheck, AlertTriangle, 
  TrendingUp, Award, CheckCircle2, XCircle, Coffee, ChevronRight,
  Sparkles, Camera, Phone, Mail, ArrowUpRight, BarChart2, Filter,
  Pause, Play, RefreshCw, Sun, Check, Eye, Download, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember, AttendanceRecord, AttendanceShift } from '@/types';
import { analyzeAttendanceRecordTiming, formatMinutesToHumanReadable } from '@/lib/attendance/time-calculations';

interface MemberKundaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember;
  records: AttendanceRecord[];
  shifts: AttendanceShift[];
  onUpdateRecord?: (recordId: string, updates: Partial<AttendanceRecord>) => Promise<void>;
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';

export default function MemberKundaliModal({
  isOpen,
  onClose,
  member,
  records,
  shifts,
  onUpdateRecord
}: MemberKundaliModalProps) {
  // Preset & Custom Date Range State
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'half_day' | 'absent' | 'holiday' | 'week_off'>('all');
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [fetchedRecords, setFetchedRecords] = useState<AttendanceRecord[]>([]);

  // Selfie / GPS Map Inspection Modal
  const [inspectPunch, setInspectPunch] = useState<{
    open: boolean;
    type: 'check_in' | 'check_out';
    time?: string | null;
    photoUrl?: string | null;
    lat?: number | null;
    lng?: number | null;
    address?: string | null;
    dateStr?: string;
  }>({ open: false, type: 'check_in' });

  // Fetch Member's Historical Attendance Records for the Date Range
  useEffect(() => {
    if (isOpen && member?.id) {
      fetchMemberHistoricalRecords();
    }
  }, [isOpen, member?.id, startDate, endDate]);

  const fetchMemberHistoricalRecords = async () => {
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('member_id', member.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (data && data.length > 0) {
        setFetchedRecords(data);
      }
    } catch (e) {
      console.warn('Error fetching member records:', e);
    }
  };

  // Combine parent-passed records and fetched records
  const effectiveRecords = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach(r => { if (r.member_id === member.id) map.set(r.id || r.date, r); });
    fetchedRecords.forEach(r => map.set(r.id || r.date, r));
    return Array.from(map.values());
  }, [records, fetchedRecords, member.id]);

  // Handle Preset Changes
  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(today.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // Filter records specifically for this member and date range
  const memberRecords = useMemo(() => {
    return effectiveRecords
      .filter(r => r.member_id === member.id)
      .filter(r => {
        if (!r.date) return false;
        return r.date >= startDate && r.date <= endDate;
      })
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [effectiveRecords, member.id, startDate, endDate, statusFilter]);

  // Executive KPI Calculations
  const stats = useMemo(() => {
    const allRangeRecs = effectiveRecords.filter(
      r => r.member_id === member.id && r.date >= startDate && r.date <= endDate
    );

    const totalLoggedDays = allRangeRecs.length;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let earlyArrivalCount = 0;
    let totalEarlyArrivalMinutes = 0;
    let earlyDepartureCount = 0;
    let totalEarlyDepartureMinutes = 0;
    let overtimeCount = 0;
    let totalOvertimeMinutes = 0;

    let presentRecs = 0;
    let halfDayRecs = 0;
    let absentRecs = 0;
    let holidayRecs = 0;
    let weekOffRecs = 0;

    let totalWorkMinutes = 0;
    let totalPausedMinutes = 0;

    allRangeRecs.forEach(r => {
      const timing = analyzeAttendanceRecordTiming(
        r,
        member,
        shifts[0]?.start_time || '10:00',
        shifts[0]?.end_time || '19:00'
      );

      if (r.status === 'absent') absentRecs++;
      else if (r.status === 'holiday') holidayRecs++;
      else if (r.status === 'week_off') weekOffRecs++;
      else if (r.status === 'half_day') halfDayRecs++;
      else presentRecs++;

      if (timing.isLate) {
        lateCount++;
        totalLateMinutes += timing.lateMinutes;
      }
      if (timing.isEarlyArrival) {
        earlyArrivalCount++;
        totalEarlyArrivalMinutes += timing.earlyArrivalMinutes;
      }
      if (timing.isEarlyCheckout) {
        earlyDepartureCount++;
        totalEarlyDepartureMinutes += timing.earlyCheckoutMinutes;
      }
      if (timing.isOvertime) {
        overtimeCount++;
        totalOvertimeMinutes += timing.overtimeMinutes;
      }

      totalWorkMinutes += (r.work_duration_minutes || r.total_work_minutes || 0);
      totalPausedMinutes += (r.break_duration_minutes || r.total_pause_minutes || 0);
    });

    // Distinct dates where member was present or late
    const uniquePresentDates = new Set(
      filteredRecords
        .filter(r => r.check_in_time || r.status === 'present' || r.status === 'late' || r.status === 'half_day')
        .map(r => r.date)
        .filter(Boolean)
    );
    const totalPresentCount = uniquePresentDates.size;
    const onTimeRate = totalPresentCount > 0 
      ? Math.max(0, Math.round(((totalPresentCount - lateCount) / totalPresentCount) * 100))
      : 100;

    const avgDelayMinutes = lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;
    const totalHoursLogged = Math.round((totalWorkMinutes / 60) * 10) / 10;
    const totalPausedHours = Math.round((totalPausedMinutes / 60) * 10) / 10;

    return {
      totalLoggedDays,
      totalPresentCount,
      onTimeRate,
      lateCount,
      totalLateMinutes,
      totalLateFormatted: formatMinutesToHumanReadable(totalLateMinutes),
      earlyArrivalCount,
      earlyArrivalFormatted: formatMinutesToHumanReadable(totalEarlyArrivalMinutes),
      earlyDepartureCount,
      earlyDepartureFormatted: formatMinutesToHumanReadable(totalEarlyDepartureMinutes),
      overtimeCount,
      totalOvertimeMinutes,
      totalOvertimeFormatted: formatMinutesToHumanReadable(totalOvertimeMinutes),
      avgDelayMinutes,
      absentCount: absentRecs,
      holidayCount: holidayRecs,
      weekOffCount: weekOffRecs,
      totalWorkMinutes,
      totalPausedMinutes,
      totalHoursLogged,
      totalPausedHours
    };
  }, [effectiveRecords, member, shifts, startDate, endDate]);

  // Chart data for daily active hours vs shift target (8.0h)
  const chartData = useMemo(() => {
    return memberRecords.slice(0, 14).reverse().map(r => {
      const activeHrs = Math.round(((r.work_duration_minutes || r.total_work_minutes || 0) / 60) * 10) / 10;
      const pausedHrs = Math.round(((r.break_duration_minutes || r.total_pause_minutes || 0) / 60) * 10) / 10;
      return {
        day: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        hours: activeHrs,
        paused: pausedHrs,
        status: r.status
      };
    });
  }, [memberRecords]);

  if (!isOpen) return null;

  const handleMarkRegularized = async (rec: AttendanceRecord) => {
    if (!onUpdateRecord) return;
    setUpdatingRecordId(rec.id);
    try {
      await onUpdateRecord(rec.id, {
        status: 'present',
        late_minutes: 0,
        notes: [rec.notes, 'Regularized by Management'].filter(Boolean).join(' | ')
      });
    } catch (e) {
      console.error('Regularize error:', e);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs font-sans overflow-y-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] text-slate-900 w-full max-w-5xl rounded-3xl border border-[#EAE5DA] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* ── TOP DRAWER HEADER ── */}
          <div className="px-6 py-5 bg-[#FAF9F5] border-b border-[#EAE5DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{member.name}</h2>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                    {member.primary_role || 'Staff Member'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                  {member.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-amber-600" /> {member.phone_number}
                    </span>
                  )}
                  {member.location_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> {member.location_name} ({member.radius_meters || 150}m)
                    </span>
                  )}
                  {member.shift_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> {member.shift_start.slice(0, 5)} - {member.shift_end ? member.shift_end.slice(0, 5) : '19:00'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Date Range Filter Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-white border border-[#EAE5DA] rounded-xl shadow-2xs">
                {(['today', 'week', 'month', 'custom'] as const).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      datePreset === preset
                        ? 'bg-amber-400 text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {preset === 'today' ? 'Today' : preset === 'week' ? 'This Week' : preset === 'month' ? 'This Month' : 'Custom'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-[#EAE5DA] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 shadow-2xs">
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

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-[#EAE5DA] hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── BODY CONTENT ── */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#FFFDF9]">

            {/* ── 5 TOP METRIC SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              {/* 1. Total Working Hours */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">Total Work Time</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-700 font-mono">
                  {Math.floor(stats.totalWorkMinutes / 60)}h {stats.totalWorkMinutes % 60}m
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  {stats.totalHoursLogged} hrs active
                </p>
              </div>

              {/* 2. Present Days */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">Present Days</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {stats.totalPresentCount} <span className="text-xs text-slate-400 font-medium">Days</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  {stats.onTimeRate}% on-time rate
                </p>
              </div>

              {/* 3. Late Marks */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">Late Marks</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-black text-amber-800 font-mono">
                  {stats.lateCount} <span className="text-xs text-slate-400 font-medium">Times</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  Avg delay: {stats.avgDelayMinutes} mins
                </p>
              </div>

              {/* 4. Total Paused / Break Time */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">Paused / Breaks</span>
                  <Coffee className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-xl font-black text-amber-900 font-mono">
                  {Math.floor(stats.totalPausedMinutes / 60)}h {stats.totalPausedMinutes % 60}m
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  Out-of-zone or pauses
                </p>
              </div>

              {/* 5. Absents */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold uppercase tracking-wider text-[10px]">Absents</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl font-black text-rose-700 font-mono">
                  {stats.absentCount} <span className="text-xs text-slate-400 font-medium">Days</span>
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  {stats.holidayCount} holidays • {stats.weekOffCount} off
                </p>
              </div>

            </div>

            {/* Visual Recharts Bar Graph */}
            {chartData.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Daily Active Shift Hours Timeline</h3>
                    <p className="text-xs text-slate-500 font-medium">Verified active hours inside geofence perimeter</p>
                  </div>
                  <span className="text-xs font-mono text-amber-900 font-black bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                    Shift Target: 8.0 hrs
                  </span>
                </div>

                <div className="h-40 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DC" />
                      <XAxis dataKey="day" stroke="#8C847B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#8C847B" fontSize={10} tickLine={false} domain={[0, 14]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#EAE5DA', borderRadius: 12, fontSize: 11, color: '#211B17', fontWeight: 600 }}
                        formatter={(val: any) => [`${val} hrs`, 'In-Zone Active']}
                      />
                      <ReferenceLine y={8} stroke="#D97706" strokeDasharray="3 3" />
                      <Bar dataKey="hours" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── STRUCTURED SHIFT LOG ROWS ── */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE5DA] pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Structured Shift Logs & Biometric Audits</h3>
                  <p className="text-xs text-slate-500 font-medium">Click on Check-In or Check-Out pills to inspect selfie snapshots & GPS coords</p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'present', 'late', 'half_day', 'holiday', 'week_off'] as const).map(flt => (
                    <button
                      key={flt}
                      onClick={() => setStatusFilter(flt)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black capitalize transition-all cursor-pointer ${
                        statusFilter === flt
                          ? 'bg-amber-400 text-slate-900 shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#EAE5DA]'
                      }`}
                    >
                      {flt === 'week_off' ? 'Weekly Off' : flt}
                    </button>
                  ))}
                </div>
              </div>

              {memberRecords.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-[#EAE5DA] text-center text-xs text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold">No attendance records logged for the selected period.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberRecords.map(rec => {
                    const dateObj = new Date(rec.date);
                    const recTiming = analyzeAttendanceRecordTiming(
                      rec,
                      member,
                      shifts[0]?.start_time || '10:00',
                      shifts[0]?.end_time || '19:00'
                    );
                    const netWork = rec.work_duration_minutes || rec.total_work_minutes || 0;
                    const pausedWork = rec.break_duration_minutes || rec.total_pause_minutes || 0;

                    return (
                      <div 
                        key={rec.id} 
                        className="p-4 bg-white rounded-2xl border border-[#EAE5DA] hover:border-amber-300 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* 1. Left Column: Date & Day */}
                        <div className="flex items-center gap-3 min-w-[170px]">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex flex-col items-center justify-center font-black font-mono text-xs shrink-0">
                            <span>{dateObj.toLocaleDateString('en-IN', { day: '2-digit' })}</span>
                            <span className="text-[9px] uppercase text-amber-700">{dateObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">
                              {dateObj.toLocaleDateString('en-IN', { weekday: 'long' })}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* 2. Middle-Left Column: Check-In Pill */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectPunch({
                                open: true,
                                type: 'check_in',
                                time: rec.check_in_time,
                                photoUrl: rec.check_in_selfie || rec.check_in_photo_path,
                                lat: rec.check_in_lat,
                                lng: rec.check_in_lng,
                                address: rec.device_info?.check_in_address || rec.notes,
                                dateStr: rec.date
                              });
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition cursor-pointer flex items-center gap-2 group shadow-2xs"
                            title="Click to view Check-In Selfie & Map"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition" />
                            <div>
                              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">Check-In</span>
                              <span className="text-xs font-black text-emerald-950 font-mono">
                                {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </span>
                              {recTiming.isLate ? (
                                <span className="text-[9px] font-bold text-amber-700 block">
                                  Late by {recTiming.lateFormattedText}
                                </span>
                              ) : recTiming.isEarlyArrival ? (
                                <span className="text-[9px] font-bold text-emerald-700 block">
                                  Arrived {recTiming.earlyArrivalFormattedText} early
                                </span>
                              ) : rec.check_in_time ? (
                                <span className="text-[9px] font-semibold text-emerald-700 block">✓ On-Time</span>
                              ) : null}
                            </div>
                          </button>
                        </div>

                        {/* 3. Middle-Right Column: Check-Out Pill */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectPunch({
                                open: true,
                                type: 'check_out',
                                time: rec.check_out_time,
                                photoUrl: rec.check_out_selfie || rec.check_out_photo_path,
                                lat: rec.check_out_lat,
                                lng: rec.check_out_lng,
                                address: rec.device_info?.check_out_address,
                                dateStr: rec.date
                              });
                            }}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition cursor-pointer flex items-center gap-2 group shadow-2xs"
                            title="Click to view Check-Out Selfie & Map"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition" />
                            <div>
                              <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">Check-Out</span>
                              <span className="text-xs font-black text-amber-950 font-mono">
                                {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress'}
                              </span>
                              {recTiming.isEarlyCheckout ? (
                                <span className="text-[9px] font-bold text-rose-700 block">
                                  Left {recTiming.earlyCheckoutFormattedText} early
                                </span>
                              ) : recTiming.isOvertime ? (
                                <span className="text-[9px] font-bold text-sky-700 block">
                                  +{recTiming.overtimeFormattedText} OT
                                </span>
                              ) : rec.check_out_time ? (
                                <span className="text-[9px] font-semibold text-emerald-700 block">✓ On-Time</span>
                              ) : null}
                            </div>
                          </button>
                        </div>

                        {/* 4. Right Column: Net Hours Logged */}
                        <div className="text-left md:text-right min-w-[150px]">
                          <span className="text-xs font-black text-slate-900 font-mono block">
                            {Math.floor(netWork / 60)}h {netWork % 60}m Active
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {pausedWork > 0 ? `${pausedWork}m Paused/Breaks` : '0m Paused'}
                          </span>
                        </div>

                        {/* 5. Outer Status Tag */}
                        <div className="flex items-center gap-2">
                          {rec.status === 'present' && !recTiming.isLate && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Present
                            </span>
                          )}
                          {(rec.status === 'late' || recTiming.isLate) && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                Late ({recTiming.lateFormattedText})
                              </span>
                              {onUpdateRecord && (
                                <button
                                  type="button"
                                  disabled={updatingRecordId === rec.id}
                                  onClick={() => handleMarkRegularized(rec)}
                                  className="px-2 py-0.5 text-[10px] font-black bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg shadow-2xs cursor-pointer"
                                >
                                  {updatingRecordId === rec.id ? '...' : 'Regularize'}
                                </button>
                              )}
                            </div>
                          )}
                          {rec.status === 'half_day' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-orange-100 text-orange-900 border border-orange-200">
                              Half-Day
                            </span>
                          )}
                          {rec.status === 'absent' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              Absent
                            </span>
                          )}
                          {rec.status === 'holiday' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                              🎉 Holiday Duty
                            </span>
                          )}
                          {rec.status === 'week_off' && (
                            <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                              🏖️ Week-Off Duty
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {/* ── POPUP: SELFIE SNAPSHOT & GPS AUDIT INSPECTOR ── */}
        <AnimatePresence>
          {inspectPunch.open && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#FFFDF9] rounded-3xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4 text-slate-900"
              >
                <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 capitalize">
                        {inspectPunch.type === 'check_in' ? 'Check-In' : 'Check-Out'} Biometric Audit
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">{inspectPunch.dateStr}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectPunch({ open: false, type: 'check_in' })}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo Preview */}
                <div className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-[#EAE5DA] relative shadow-inner">
                  {inspectPunch.photoUrl ? (
                    <img
                      src={inspectPunch.photoUrl}
                      alt="Punch Selfie"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                      <Camera className="w-8 h-8 opacity-40" />
                      <span className="text-xs font-bold">No Selfie Snapshot Attached</span>
                    </div>
                  )}
                  {inspectPunch.time && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs rounded-lg text-white font-mono text-[11px] font-bold">
                      {new Date(inspectPunch.time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} IST
                    </div>
                  )}
                </div>

                {/* GPS Location Details */}
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>GPS Coordinates: {inspectPunch.lat ? `${inspectPunch.lat.toFixed(5)}, ${inspectPunch.lng?.toFixed(5)}` : 'Location Not Available'}</span>
                  </div>
                  {inspectPunch.address && (
                    <p className="text-[11px] text-slate-600 font-medium pl-5">
                      {inspectPunch.address}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setInspectPunch({ open: false, type: 'check_in' })}
                    className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl text-xs shadow-xs"
                  >
                    Close Audit
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  );
}

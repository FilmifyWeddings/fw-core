'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Calendar, Clock, MapPin, ShieldCheck, AlertTriangle, 
  TrendingUp, Award, CheckCircle2, XCircle, Coffee, ChevronRight,
  Sparkles, Camera, Phone, Mail, ArrowUpRight, BarChart2, Filter,
  Pause, Play, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';
import type { FWTeamMember, AttendanceRecord, AttendanceShift } from '@/types';

interface MemberKundaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember;
  records: AttendanceRecord[];
  shifts: AttendanceShift[];
  onUpdateRecord?: (recordId: string, updates: Partial<AttendanceRecord>) => Promise<void>;
}

export default function MemberKundaliModal({
  isOpen,
  onClose,
  member,
  records,
  shifts,
  onUpdateRecord
}: MemberKundaliModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'half_day' | 'absent'>('all');
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);

  // Filter records specifically for this member & selected month
  const memberRecords = useMemo(() => {
    return records
      .filter(r => r.member_id === member.id && (r.date || '').startsWith(selectedMonth))
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [records, member.id, selectedMonth, statusFilter]);

  // Executive KPI Calculations
  const stats = useMemo(() => {
    const allMemberMonthRecs = records.filter(
      r => r.member_id === member.id && (r.date || '').startsWith(selectedMonth)
    );

    const totalLoggedDays = allMemberMonthRecs.length;
    const presentRecs = allMemberMonthRecs.filter(r => r.status === 'present');
    const lateRecs = allMemberMonthRecs.filter(r => r.status === 'late' || (r.late_minutes && r.late_minutes > 0));
    const halfDayRecs = allMemberMonthRecs.filter(r => r.status === 'half_day');
    const totalPresentCount = presentRecs.length + lateRecs.length + halfDayRecs.length;

    const onTimeRate = totalPresentCount > 0 
      ? Math.round((presentRecs.length / totalPresentCount) * 100) 
      : 100;

    const totalLateMinutes = lateRecs.reduce((acc, r) => acc + (r.late_minutes || 0), 0);
    const avgDelayMinutes = lateRecs.length > 0 ? Math.round(totalLateMinutes / lateRecs.length) : 0;

    const totalWorkMinutes = allMemberMonthRecs.reduce((acc, r) => acc + (r.work_duration_minutes || 0), 0);
    const totalPausedMinutes = allMemberMonthRecs.reduce((acc, r) => acc + (r.break_duration_minutes || 0), 0);
    const totalOvertimeMinutes = allMemberMonthRecs.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);

    const totalHoursLogged = Math.round((totalWorkMinutes / 60) * 10) / 10;
    const totalPausedHours = Math.round((totalPausedMinutes / 60) * 10) / 10;
    const totalOTHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

    return {
      totalLoggedDays,
      totalPresentCount,
      onTimeRate,
      lateCount: lateRecs.length,
      avgDelayMinutes,
      totalHoursLogged,
      totalPausedHours,
      totalOTHours
    };
  }, [records, member.id, selectedMonth]);

  // Chart data for daily active hours vs shift target (8.0h)
  const chartData = useMemo(() => {
    return memberRecords.slice(0, 14).reverse().map(r => {
      const activeHrs = Math.round(((r.work_duration_minutes || 0) / 60) * 10) / 10;
      const pausedHrs = Math.round(((r.break_duration_minutes || 0) / 60) * 10) / 10;
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#1A1816] text-[#FDFCF7] w-full max-w-5xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Header Drawer Bar */}
          <div className="px-6 py-5 bg-[#211E1B] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C89435] to-[#8C6D33] text-white font-black text-lg flex items-center justify-center shadow-lg border border-white/15">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">{member.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF3E6] text-[#8C6D33]">
                    {member.primary_role || 'Crew Member'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                  {member.phone_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#C89435]" /> {member.phone_number}
                    </span>
                  )}
                  {member.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#C89435]" /> {member.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-mono text-white">
                <Calendar className="w-3.5 h-3.5 text-[#C89435]" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">

            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. On-Time Score */}
              <div className="bg-[#24211D] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">On-Time Rate</span>
                  <Award className="w-4 h-4 text-[#C89435]" />
                </div>
                <div className="text-2xl font-black text-[#81C784] font-mono">
                  {stats.onTimeRate}%
                </div>
                <p className="text-[10.5px] text-white/50">
                  {stats.totalPresentCount} days attended in {selectedMonth}
                </p>
              </div>

              {/* 2. Late Arrivals */}
              <div className="bg-[#24211D] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Late Arrivals</span>
                  <Clock className="w-4 h-4 text-[#FFB74D]" />
                </div>
                <div className="text-2xl font-black text-[#FFB74D] font-mono">
                  {stats.lateCount} <span className="text-xs text-white/50">Times</span>
                </div>
                <p className="text-[10.5px] text-white/50">
                  Avg delay: {stats.avgDelayMinutes} mins per late mark
                </p>
              </div>

              {/* 3. In-Zone Active Work Hours */}
              <div className="bg-[#24211D] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">In-Zone Active Hours</span>
                  <TrendingUp className="w-4 h-4 text-[#4FC3F7]" />
                </div>
                <div className="text-2xl font-black text-[#4FC3F7] font-mono">
                  {stats.totalHoursLogged}h
                </div>
                <p className="text-[10.5px] text-white/50">
                  Paused outside: {stats.totalPausedHours}h
                </p>
              </div>

              {/* 4. Overtime Hours */}
              <div className="bg-[#24211D] p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Overtime Hours</span>
                  <Sparkles className="w-4 h-4 text-[#E5B55D]" />
                </div>
                <div className="text-2xl font-black text-[#E5B55D] font-mono">
                  +{stats.totalOTHours}h
                </div>
                <p className="text-[10.5px] text-white/50">
                  Beyond scheduled shift hours
                </p>
              </div>
            </div>

            {/* Visual Recharts Trend Bar Graph */}
            {chartData.length > 0 && (
              <div className="bg-[#24211D] p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Daily In-Zone Work Hours vs 8h Target</h3>
                    <p className="text-xs text-white/50">Clocked in-zone hours per shoot/day</p>
                  </div>
                  <span className="text-xs font-mono text-[#C89435] font-bold">Target: 8.0 hrs</span>
                </div>

                <div className="h-44 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#36302B" />
                      <XAxis dataKey="day" stroke="#746855" fontSize={10} tickLine={false} />
                      <YAxis stroke="#746855" fontSize={10} tickLine={false} domain={[0, 14]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1816', borderColor: '#C89435', borderRadius: 8, fontSize: 11, color: '#fff' }}
                        formatter={(val: any) => [`${val} hrs`, 'In-Zone Clocked']}
                      />
                      <ReferenceLine y={8} stroke="#C89435" strokeDasharray="3 3" />
                      <Bar dataKey="hours" fill="#C89435" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Day-by-Day Timeline & Selfie Audits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Daily Punch Audits & Selfie Verifications</h3>
                <div className="flex items-center gap-1.5">
                  {(['all', 'present', 'late', 'half_day'] as const).map(flt => (
                    <button
                      key={flt}
                      onClick={() => setStatusFilter(flt)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition ${
                        statusFilter === flt
                          ? 'bg-[#C89435] text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {flt}
                    </button>
                  ))}
                </div>
              </div>

              {memberRecords.length === 0 ? (
                <div className="bg-[#24211D] p-8 rounded-2xl border border-dashed border-white/10 text-center text-xs text-white/40">
                  No attendance records logged for {selectedMonth} with filter &quot;{statusFilter}&quot;.
                </div>
              ) : (
                <div className="space-y-3">
                  {memberRecords.map(rec => (
                    <div key={rec.id} className="bg-[#24211D] border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {new Date(rec.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'present' ? 'bg-emerald-500/20 text-emerald-300' :
                            rec.status === 'late' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {rec.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {rec.status === 'late' && (
                            <button
                              disabled={updatingRecordId === rec.id}
                              onClick={() => handleMarkRegularized(rec)}
                              className="px-2.5 py-1 rounded-lg bg-[#C89435] hover:bg-[#B3802B] text-white text-[10.5px] font-bold shadow-xs transition"
                            >
                              {updatingRecordId === rec.id ? 'Regularizing...' : 'Mark Regularized'}
                            </button>
                          )}
                          <span className="text-xs font-mono text-white/80 font-bold">
                            {Math.floor((rec.work_duration_minutes || 0) / 60)}h {(rec.work_duration_minutes || 0) % 60}m Active
                          </span>
                        </div>
                      </div>

                      {/* Side-by-Side Selfie & Coordinates Stage */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Check-In Card */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/60 font-semibold">Check-In (IST)</span>
                            <span className="text-[#81C784] font-mono font-bold">
                              {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </span>
                          </div>
                          {rec.check_in_photo_path ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/60">
                              <img src={rec.check_in_photo_path} alt="Check-in Selfie" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 px-1.5 py-0.5 rounded text-white font-mono">
                                Verified
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-video rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-white/30">
                              No selfie photo
                            </div>
                          )}
                          <div className="text-[10px] text-white/50 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#C89435]" />
                              <span>GPS: {rec.check_in_lat?.toFixed(4) || '—'}, {rec.check_in_lng?.toFixed(4) || '—'}</span>
                            </div>
                            {rec.notes && <span className="text-[9.5px] text-white/40 truncate">{rec.notes}</span>}
                          </div>
                        </div>

                        {/* Check-Out Card */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/60 font-semibold">Check-Out (IST)</span>
                            <span className="text-[#FF8A80] font-mono font-bold">
                              {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </span>
                          </div>
                          {rec.check_out_photo_path ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/60">
                              <img src={rec.check_out_photo_path} alt="Check-out Selfie" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="aspect-video rounded-lg border border-dashed border-white/10 flex items-center justify-center text-[10px] text-white/30">
                              No check-out photo
                            </div>
                          )}
                          <div className="text-[10px] text-white/50 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#FF8A80]" />
                              <span>GPS: {rec.check_out_lat ? `${rec.check_out_lat.toFixed(4)}, ${rec.check_out_lng?.toFixed(4)}` : '—'}</span>
                            </div>
                            {(rec.device_info?.check_out_address || (rec.notes && rec.notes.includes('Punch Out:'))) ? (
                              <span className="text-[9.5px] text-white/40 truncate">
                                {rec.device_info?.check_out_address || rec.notes?.split('Punch Out:')[1]?.trim() || ''}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[10px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#4FC3F7]" />
                              <span>Overtime: {rec.overtime_minutes || 0}m</span>
                            </div>
                            {rec.break_duration_minutes ? (
                              <span className="text-amber-400/80 font-mono">Paused: {rec.break_duration_minutes}m</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

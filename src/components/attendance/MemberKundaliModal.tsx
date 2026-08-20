'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Clock, Calendar, AlertTriangle, ShieldCheck, 
  CheckCircle2, TrendingUp, DollarSign, MapPin, Camera, 
  ExternalLink, Edit3, Check, RefreshCw, Award, ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import type { FWTeamMember, AttendanceRecord, AttendanceShift } from '@/types';
import GeofenceRadarMap from './GeofenceRadarMap';

interface MemberKundaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember | null;
  records: AttendanceRecord[];
  shifts?: AttendanceShift[];
  onUpdateRecord?: (recordId: string, updates: Partial<AttendanceRecord>) => Promise<void>;
}

export default function MemberKundaliModal({
  isOpen,
  onClose,
  member,
  records,
  shifts = [],
  onUpdateRecord
}: MemberKundaliModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [selectedAuditRecord, setSelectedAuditRecord] = useState<AttendanceRecord | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);

  // Filter records for this member and selected month
  const memberRecords = useMemo(() => {
    if (!member) return [];
    return records.filter(r => r.member_id === member.id && (r.date || '').startsWith(selectedMonth));
  }, [member, records, selectedMonth]);

  // Compute Deep "Kundali" HR KPIs
  const analytics = useMemo(() => {
    const totalDays = memberRecords.length;
    const presentRecords = memberRecords.filter(r => r.status === 'present' || r.status === 'late');
    const lateRecords = memberRecords.filter(r => r.status === 'late' || (r.late_minutes && r.late_minutes > 0));
    const halfDayRecords = memberRecords.filter(r => r.status === 'half_day');
    const leaveRecords = memberRecords.filter(r => r.status === 'leave');
    const absentRecords = memberRecords.filter(r => r.status === 'absent');

    const totalLateMinutes = lateRecords.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
    const avgLateMinutes = lateRecords.length > 0 ? Math.round(totalLateMinutes / lateRecords.length) : 0;

    const totalOvertimeMinutes = memberRecords.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
    const totalWorkMinutes = memberRecords.reduce((sum, r) => sum + (r.work_duration_minutes || 0), 0);

    const onTimeCount = presentRecords.length - lateRecords.length;
    const onTimeRate = totalDays > 0 ? Math.round((Math.max(0, onTimeCount) / (totalDays || 1)) * 100) : 100;

    // Daily work hours trend data for Recharts
    const trendData = memberRecords.map(r => {
      const dayNum = parseInt(r.date.split('-')[2], 10);
      const actualHours = Math.round(((r.work_duration_minutes || 0) / 60) * 10) / 10;
      return {
        day: `Day ${dayNum}`,
        date: r.date,
        actualHours,
        expectedHours: 8.0,
        status: r.status,
        lateMinutes: r.late_minutes || 0
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalDays,
      presentCount: presentRecords.length,
      lateCount: lateRecords.length,
      avgLateMinutes,
      halfDayCount: halfDayRecords.length,
      leaveCount: leaveRecords.length,
      absentCount: absentRecords.length,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
      onTimeRate,
      trendData
    };
  }, [memberRecords]);

  // Handle Mark Regularized
  const handleMarkRegularized = async (rec: AttendanceRecord) => {
    if (!onUpdateRecord) return;
    setUpdatingRecordId(rec.id);
    try {
      await onUpdateRecord(rec.id, {
        status: 'present',
        late_minutes: 0,
        notes: (rec.notes ? `${rec.notes} | ` : '') + 'Marked Regularized by Admin'
      });
    } finally {
      setUpdatingRecordId(null);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-[#1A1816] text-white w-full max-w-3xl h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-white/10"
        >
          {/* Header Bar */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#211E1B]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C89435] to-[#8C6D33] text-white font-black flex items-center justify-center text-xl shadow-lg border border-white/20">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{member.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C89435]/20 text-[#E5B55D] border border-[#C89435]/30">
                    Staff Kundali & Intelligence
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">
                  {member.primary_role || 'Studio Staff'} • Phone: {member.phone_number || 'N/A'} • {member.email || 'No email'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Selector */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Executive Performance KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* On-Time Rate */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50 block">On-Time Score</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#81C784] font-mono">{analytics.onTimeRate}%</span>
                </div>
                <div className="h-1 w-full bg-[#81C784] rounded-full mt-2" />
              </div>

              {/* Late Arrivals */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50 block">Late Arrivals</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#FFB74D] font-mono">{analytics.lateCount}</span>
                  <span className="text-[10px] text-white/60">({analytics.avgLateMinutes}m avg)</span>
                </div>
                <div className="h-1 w-full bg-[#FFB74D] rounded-full mt-2" />
              </div>

              {/* Total Overtime */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50 block">Overtime Hours</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#4FC3F7] font-mono">+{analytics.totalOvertimeHours}h</span>
                </div>
                <div className="h-1 w-full bg-[#4FC3F7] rounded-full mt-2" />
              </div>

              {/* Total Hours Worked */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50 block">Hours Logged</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#E5B55D] font-mono">{analytics.totalWorkHours}h</span>
                </div>
                <div className="h-1 w-full bg-[#C89435] rounded-full mt-2" />
              </div>
            </div>

            {/* 2. Visual Graphs: Daily Work Hours Trend (Recharts) */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Work Hours Trend</h3>
                  <p className="text-[11px] text-white/50">Actual hours clocked vs. expected 8.0h shift duration.</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-[#C89435]/20 text-[#E5B55D] rounded-full font-bold">
                  {selectedMonth}
                </span>
              </div>

              {analytics.trendData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-white/40">
                  No attendance records logged for {selectedMonth} yet.
                </div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} domain={[0, 14]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#211E1B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, fontSize: 11 }}
                        formatter={(val: any) => [`${val} Hours`, 'Clocked Duration']}
                      />
                      <ReferenceLine y={8.0} stroke="#C89435" strokeDasharray="3 3" label={{ value: '8h Target', fill: '#C89435', fontSize: 10 }} />
                      <Bar dataKey="actualHours" fill="#81C784" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 3. Daily Punch Audit Cards (Selfies & Geofence Logs) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#C89435]" />
                <span>Daily Punch Audits & Biometric Selfies</span>
              </h3>

              {memberRecords.length === 0 ? (
                <p className="text-xs text-white/40 italic">No punch logs recorded for this month.</p>
              ) : (
                <div className="space-y-3">
                  {memberRecords.map(rec => (
                    <div key={rec.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                            {Math.floor((rec.work_duration_minutes || 0) / 60)}h {(rec.work_duration_minutes || 0) % 60}m
                          </span>
                        </div>
                      </div>

                      {/* Side-by-Side Selfie & Coordinates Stage */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Check-In Card */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/60 font-semibold">Check-In Selfie</span>
                            <span className="text-[#81C784] font-mono font-bold">
                              {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
                            <span className="text-white/60 font-semibold">Check-Out Selfie</span>
                            <span className="text-[#FF8A80] font-mono font-bold">
                              {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
                          <div className="text-[10px] text-white/50 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#4FC3F7]" />
                            <span>Overtime: {rec.overtime_minutes || 0}m</span>
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

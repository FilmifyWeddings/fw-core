'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, Filter, Eye, Pencil, Link2, MapPin, 
  ShieldCheck, AlertTriangle, RefreshCw, Sliders,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';
import type { FWTeamMember, AttendanceRecord, AttendanceShift } from '@/types';
import { analyzeAttendanceRecordTiming } from '@/lib/attendance/time-calculations';
import { formatTime12h } from './StaffDetailsModal';

interface StaffAttendanceRosterProps {
  members: FWTeamMember[];
  records: AttendanceRecord[];
  selectedDate: string;
  shifts?: AttendanceShift[];
  onOpenDetails: (member: FWTeamMember) => void;
  onEditMember: (member: FWTeamMember) => void;
  onPunchIn: (member: FWTeamMember) => Promise<void>;
  onPunchOut: (member: FWTeamMember, record?: any) => Promise<void>;
  punchingMemberId?: string | null;
  onGenerateOrCopyLink?: (memberId: string) => void;
  copiedLinkId?: string | null;
  onOverride?: (member: FWTeamMember, record?: AttendanceRecord) => void;
}

export default function StaffAttendanceRoster({
  members,
  records,
  selectedDate,
  shifts = [],
  onOpenDetails,
  onEditMember,
  onPunchIn,
  onPunchOut,
  punchingMemberId,
  onGenerateOrCopyLink,
  copiedLinkId,
  onOverride
}: StaffAttendanceRosterProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Continuous 1-second live ticker
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopyPunchLink = async (e: React.MouseEvent, member: FWTeamMember) => {
    e.stopPropagation();
    const memberIdStr = String(member.id);
    const punchUrl = `${window.location.origin}/punch/${member.id}`;
    try {
      await navigator.clipboard.writeText(punchUrl);
    } catch (_) {}

    if (onGenerateOrCopyLink) {
      onGenerateOrCopyLink(memberIdStr);
    }

    setToastMessage('Punch-in link copied to clipboard!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Format live duration as HH:MM:SS
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

  // Check if punch log missed punch out
  const isMissedPunchOut = useCallback((inTimeStr?: string | null, outTimeStr?: string | null, recordDate?: string): boolean => {
    if (!inTimeStr || outTimeStr) return false;
    const todayIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (recordDate && recordDate < todayIst) return true;
    const elapsedHours = (nowTick - new Date(inTimeStr).getTime()) / (1000 * 60 * 60);
    return elapsedHours >= 16;
  }, [nowTick]);

  // Record matcher for member with safe String(id)
  const isRecordForMember = useCallback((rec: any, mem: FWTeamMember | null | undefined) => {
    if (!rec || !mem) return false;
    const memId = String(mem.id);
    const recMemberId = String(rec.member_id || '');
    if (recMemberId === memId) return true;

    const aliasIds = (mem as any).aliasIds;
    if (aliasIds && Array.isArray(aliasIds) && aliasIds.map(String).includes(recMemberId)) return true;

    const memName = (mem.name || '').trim().toLowerCase();
    const memEmail = (mem.email || '').trim().toLowerCase();
    if (rec.member?.name && memName && rec.member.name.trim().toLowerCase() === memName) return true;
    if (rec.member?.email && memEmail && rec.member.email.trim().toLowerCase() === memEmail) return true;
    if (rec.name && memName && rec.name.trim().toLowerCase() === memName) return true;
    return false;
  }, []);

  // 1. Strictly in-house staff filter (Case-insensitive & deduplicated)
  const strictInHouse = useMemo(() => {
    const seenNames = new Set<string>();
    return members.filter((member: any) => {
      if (member.is_active === false || member.active_status === false) return false;

      const rawType = String(member.primary_type || '').toLowerCase().trim();
      const typesList = Array.isArray(member.member_types)
        ? member.member_types.map((t: string) => String(t).toLowerCase().trim())
        : [rawType];

      const isFreelancer = 
        rawType.includes('freelance') || 
        typesList.some((t: string) => t.includes('freelance')) ||
        (member.name || '').toLowerCase().includes(' tp') || 
        (member.name || '').toLowerCase().includes(' ref');

      if (isFreelancer) return false;

      // Deduplicate duplicates in list
      const cleanName = (member.name || '').toLowerCase().trim();
      if (!cleanName || seenNames.has(cleanName)) return false;
      seenNames.add(cleanName);

      const isInHouse = 
        rawType === 'in-house' || 
        rawType === 'in_house' || 
        typesList.includes('in-house') || 
        typesList.includes('in_house');

      return isInHouse;
    });
  }, [members]);

  const inHouseStaff = strictInHouse;

  // Extract distinct roles for filter dropdown
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    inHouseStaff.forEach(m => {
      if (m.primary_role) set.add(m.primary_role);
    });
    return Array.from(set);
  }, [inHouseStaff]);

  // Filtered daily roster list with shift timing analyzer
  const rosterList = useMemo(() => {
    const shiftStartTime = shifts[0]?.start_time || '10:00';
    const shiftEndTime = shifts[0]?.end_time || '19:00';

    return inHouseStaff.map(member => {
      const record = records.find(r => isRecordForMember(r, member));
      const timing = analyzeAttendanceRecordTiming(record, member, shiftStartTime, shiftEndTime);
      return { member, record, timing };
    }).filter(({ member, record, timing }) => {
      const nameMatch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
      const roleMatch = roleFilter === 'all' || (member.primary_role || '').toLowerCase().includes(roleFilter.toLowerCase());
      const statusMatch = statusFilter === 'all' || (
        statusFilter === 'late' ? timing.isLate :
        statusFilter === 'present' ? (record && record.status === 'present' && !timing.isLate) :
        (record ? record.status === statusFilter : statusFilter === 'absent')
      );
      return nameMatch && roleMatch && statusMatch;
    });
  }, [inHouseStaff, records, shifts, searchQuery, roleFilter, statusFilter, isRecordForMember]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in-house staff by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {distinctRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present (On-Time)</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half-Day</option>
              <option value="absent">Absent / Pending</option>
              <option value="leave">On Leave</option>
              <option value="holiday">Holiday Duty</option>
              <option value="week_off">Week-Off Duty</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-slate-900 font-extrabold">{rosterList.length}</span> of {inHouseStaff.length} In-House Members
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {rosterList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No in-house staff matched the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Shift / Status</th>
                  <th className="py-3.5 px-4">Check In (IST)</th>
                  <th className="py-3.5 px-4">Check Out (IST)</th>
                  <th className="py-3.5 px-4">Active Work Hours</th>
                  <th className="py-3.5 px-4">Geofence Status</th>
                  <th className="py-3.5 px-4">Selfie / Photo</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {rosterList.map(({ member, record, timing }) => {
                  const memberIdStr = String(member.id);
                  const isPresent = Boolean(record?.check_in_time || record?.punch_in_time);
                  const isCheckedOut = Boolean(record?.check_out_time || record?.punch_out_time);
                  const isLate = timing.isLate;
                  const punchInStr = record?.punch_in_time || record?.check_in_time;
                  const punchOutStr = record?.punch_out_time || record?.check_out_time;
                  const missedPunchOut = isMissedPunchOut(punchInStr, punchOutStr, record?.date || selectedDate);

                  return (
                    <tr 
                      key={memberIdStr} 
                      onClick={() => onOpenDetails(member)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-black text-xs shrink-0 overflow-hidden group-hover:scale-105 transition">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block group-hover:text-amber-800 transition">{member.name}</span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                              <span>{member.primary_role || 'In-House Crew'}</span>
                              {member.is_geofence_exempt && (
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">
                                  Exempt
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift / Status (Active State Pill: Present / Absent) */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                          record?.status === 'holiday' || (record as any)?.device_info?.is_holiday_work
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : record?.status === 'week_off' || (record as any)?.device_info?.is_week_off_work
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : record?.status === 'half_day'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : isLate
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isPresent
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : record?.status === 'leave'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {record?.status === 'holiday' || (record as any)?.device_info?.is_holiday_work
                            ? 'Holiday'
                            : record?.status === 'week_off' || (record as any)?.device_info?.is_week_off_work
                            ? 'Week-Off'
                            : record?.status === 'half_day'
                            ? 'Half-Day'
                            : isLate
                            ? `Late (${timing.lateFormattedText})`
                            : isPresent
                            ? 'Present'
                            : record?.status === 'leave'
                            ? 'On Leave'
                            : 'Absent'}
                        </span>
                      </td>

                      {/* Check In (IST) with 12-hour format */}
                      <td className="py-3 px-4">
                        {punchInStr ? (
                          <div>
                            <span className="font-bold text-slate-800 font-mono text-xs block">
                              {formatTime12h(punchInStr)}
                            </span>
                            {timing.isLate ? (
                              <span className="text-[9.5px] font-bold text-amber-700 block">
                                Late by {timing.lateFormattedText}
                              </span>
                            ) : timing.isEarlyArrival ? (
                              <span className="text-[9.5px] font-bold text-emerald-700 block">
                                Arrived {timing.earlyArrivalFormattedText} early
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-emerald-600 block">✓ On-time</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Check Out (IST) with 12-hour format & Missed Punch Out Badge */}
                      <td className="py-3 px-4">
                        {punchOutStr ? (
                          <div>
                            <span className="font-bold text-slate-800 font-mono text-xs block">
                              {formatTime12h(punchOutStr)}
                            </span>
                            {timing.isEarlyCheckout ? (
                              <span className="text-[9.5px] font-bold text-rose-700 block">
                                Left {timing.earlyCheckoutFormattedText} early
                              </span>
                            ) : timing.isOvertime ? (
                              <span className="text-[9.5px] font-bold text-emerald-700 block">
                                +{timing.overtimeFormattedText} Overtime
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-emerald-600 block">✓ Completed</span>
                            )}
                          </div>
                        ) : punchInStr ? (
                          missedPunchOut ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Missed Punch Out
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[10px] animate-pulse">In Progress</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Active Work Hours with Continuous Live Timer */}
                      <td className="py-3 px-4 font-extrabold text-slate-900 font-mono">
                        {isCheckedOut ? (
                          `${Math.floor(((record?.work_duration_minutes || record?.total_work_minutes) || 0) / 60)}h ${((record?.work_duration_minutes || record?.total_work_minutes) || 0) % 60}m`
                        ) : punchInStr ? (
                          missedPunchOut ? (
                            <div className="space-y-0.5">
                              <span className="text-slate-500 font-mono text-xs block">
                                {Math.floor(((record?.work_duration_minutes || record?.total_work_minutes) || 0) / 60)}h ${((record?.work_duration_minutes || record?.total_work_minutes) || 0) % 60}m
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Missed Punch Out</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-mono text-emerald-700 font-black">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span>{formatLiveDuration(punchInStr)}</span>
                            </div>
                          )
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Geofence Status */}
                      <td className="py-3 px-4">
                        {record?.check_in_geofence_status === 'verified' || record?.is_geofence_exempt || member.is_geofence_exempt ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <MapPin className="w-3 h-3" /> Geofence Verified
                          </span>
                        ) : record?.check_in_geofence_status === 'outside_geofence' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Outside Perimeter
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No GPS</span>
                        )}
                      </td>

                      {/* Selfie Status */}
                      <td className="py-3 px-4">
                        {record?.check_in_photo_path ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" /> Selfie Verified
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No Photo</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Details Button (strictly Details with Eye icon) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDetails(member);
                            }}
                            className="px-2.5 py-1 text-[11px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                            title="View Deep Staff Attendance Details & Logs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {/* Edit Profile Icon Button (Pencil icon) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMember(member);
                            }}
                            className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer inline-flex items-center justify-center"
                            title="Edit Staff Profile, Geofence & Timings"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Personal Punch Link (Clean Link2 Icon Button with Copy Indicator) */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyPunchLink(e, member)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer inline-flex items-center justify-center ${
                              copiedLinkId === memberIdStr
                                ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                            }`}
                            title={copiedLinkId === memberIdStr ? '✓ Copied Link to Clipboard!' : 'Copy Personal Mobile Punch Link'}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[100070] bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

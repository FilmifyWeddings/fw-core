'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/sidebar-layout';
import { supabase } from '@/lib/supabase';
import { 
  Clock, Calendar, MapPin, Camera, CheckCircle2, AlertCircle, 
  Smartphone, Share2, Copy, Check, ExternalLink, RefreshCw, 
  ShieldCheck, AlertTriangle, LogIn, LogOut, Coffee, Sparkles,
  Award, TrendingUp, DollarSign, ChevronRight
} from 'lucide-react';
import { formatMinutesToHumanReadable, analyzeAttendanceRecordTiming } from '@/lib/attendance/time-calculations';
import PunchDetailsModal, { formatTime12h } from '@/components/attendance/PunchDetailsModal';

export default function TeamAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));

  // Modals & Popups
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Live Timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Resolve User and Token
  useEffect(() => {
    async function loadAttendanceProfile() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/team/attendance/me');
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
  }, []);

  // Live Clocked-In Timer for Today
  const liveClockedInTimer = useMemo(() => {
    if (!todayRecord?.check_in_time || todayRecord?.check_out_time) return null;
    try {
      const diffMs = currentTime.getTime() - new Date(todayRecord.check_in_time).getTime();
      if (diffMs <= 0) return '0m';
      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${h}h ${m}m`;
    } catch (_) {
      return null;
    }
  }, [todayRecord, currentTime]);

  // Monthly Report Calculations
  const monthlyStats = useMemo(() => {
    const records = monthlyHistory.filter(r => (r.date || '').startsWith(selectedMonth));
    const uniquePresentDates = new Set(
      records
        .filter(r => r.check_in_time || r.status === 'present' || r.status === 'late' || r.status === 'half_day')
        .map(r => r.date)
        .filter(Boolean)
    );
    const distinctPresentCount = uniquePresentDates.size;

    let totalLateCount = 0;
    let totalLateMinutes = 0;
    let totalOvertimeCount = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkMinutes = 0;

    const analyzedRecords = records.map(r => {
      const timing = analyzeAttendanceRecordTiming(
        r,
        member,
        shifts[0]?.start_time || '10:00',
        shifts[0]?.end_time || '19:00'
      );

      const isLateRecord = timing.isLate || r.status === 'late' || (Number(r.late_minutes) > 0);
      const lateMins = timing.lateMinutes || Number(r.late_minutes) || 0;

      if (isLateRecord) {
        totalLateCount++;
        totalLateMinutes += lateMins;
      }
      if (timing.isOvertime) {
        totalOvertimeCount++;
        totalOvertimeMinutes += timing.overtimeMinutes;
      }

      const isTodayRec = r.date === new Date().toISOString().split('T')[0];
      let dayMins = 0;
      if (r.check_in_time && r.check_out_time) {
        const inMs = new Date(r.check_in_time).getTime();
        const outMs = new Date(r.check_out_time).getTime();
        dayMins = Math.max(0, Math.floor((outMs - inMs) / 60000));
      } else if (r.check_in_time && !r.check_out_time) {
        const inMs = new Date(r.check_in_time).getTime();
        const endMs = isTodayRec ? currentTime.getTime() : inMs;
        dayMins = Math.max(0, Math.floor((endMs - inMs) / 60000));
      } else {
        dayMins = Number(r.work_duration_minutes) || Number(r.total_work_minutes) || 0;
      }

      const breakMins = Number(r.break_duration_minutes) || 0;
      dayMins = Math.max(0, dayMins - breakMins);

      totalWorkMinutes += dayMins;

      return {
        ...r,
        timing,
        isLateRecord,
        dayWorkMinutes: dayMins
      };
    });

    // Calendar Days generation (all days without skipping!)
    const [yearStr, monthStr] = (selectedMonth || '').split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const todayDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const calendarDays: any[] = [];
    for (let d = totalDaysInMonth; d >= 1; d--) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(dateStr + 'T12:00:00');
      const dayOfWeekShort = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

      // Check Holiday & Weekly Off definitions for this date
      const holidayMatch = (companyHolidays || []).find(h => h.holiday_date === dateStr);
      const isOff = (Array.isArray(member?.weekly_offs) && member.weekly_offs.length > 0)
        ? member.weekly_offs.includes(dayOfWeekShort)
        : (dayOfWeekShort === 'Sun');

      // 1. Is there a punch record?
      const punchRec = analyzedRecords.find(r => r.date === dateStr);
      if (punchRec) {
        let dutyType = punchRec.isLateRecord ? 'late' : (punchRec.status || 'present');
        let dutyTitle = punchRec.isLateRecord ? 'Late Arrival' : 'Present & Verified';
        let isHolidayDuty = false;
        let isWeekOffDuty = false;

        if (holidayMatch) {
          dutyType = 'worked_holiday';
          dutyTitle = `Holiday Duty (${holidayMatch.name || 'Festival'})`;
          isHolidayDuty = true;
        } else if (isOff) {
          dutyType = 'worked_week_off';
          dutyTitle = 'Week-Off Duty (Worked on Off)';
          isWeekOffDuty = true;
        }

        calendarDays.push({
          date: dateStr,
          type: dutyType,
          record: punchRec,
          timing: punchRec.timing,
          title: dutyTitle,
          isHolidayDuty,
          isWeekOffDuty,
          holidayName: holidayMatch?.name || null
        });
        continue;
      }

      // 2. Is there a Company Holiday?
      if (holidayMatch) {
        calendarDays.push({
          date: dateStr,
          type: 'holiday',
          record: null,
          title: holidayMatch.name || 'Company Holiday',
          note: holidayMatch.note
        });
        continue;
      }

      // 3. Is there an approved Leave?
      const leave = (recentLeaves || []).find(l => dateStr >= l.start_date && dateStr <= l.end_date && l.status !== 'rejected');
      if (leave) {
        calendarDays.push({
          date: dateStr,
          type: 'leave',
          record: null,
          title: `Leave (${leave.leave_type || 'Approved'})`,
          note: leave.reason
        });
        continue;
      }

      // 4. Is it a Weekly Off?
      if (isOff) {
        calendarDays.push({
          date: dateStr,
          type: 'weekly_off',
          record: null,
          title: 'Weekly Off'
        });
        continue;
      }

      // 5. Past vs Future
      if (dateStr > todayDateStr) {
        calendarDays.push({
          date: dateStr,
          type: 'upcoming',
          record: null,
          title: 'Scheduled Shift'
        });
      } else {
        calendarDays.push({
          date: dateStr,
          type: 'absent',
          record: null,
          title: dateStr === todayDateStr ? 'Not Punched In Today' : 'Absent (No Punch Marked)'
        });
      }
    }

    return {
      totalLoggedDays: records.length,
      presentCount: distinctPresentCount,
      lateCount: totalLateCount,
      totalLateMinutes,
      totalLateFormatted: formatMinutesToHumanReadable(totalLateMinutes),
      overtimeCount: totalOvertimeCount,
      totalOvertimeMinutes,
      totalOvertimeFormatted: formatMinutesToHumanReadable(totalOvertimeMinutes),
      totalWorkMinutes,
      totalWorkFormatted: formatMinutesToHumanReadable(totalWorkMinutes),
      calendarDays
    };
  }, [monthlyHistory, selectedMonth, member, shifts, currentTime, companyHolidays, recentLeaves]);

  const handleCopyLink = () => {
    if (!directUrl && secureToken) {
      const url = `${window.location.origin}/attendance/${secureToken}`;
      navigator.clipboard.writeText(url);
    } else if (directUrl) {
      navigator.clipboard.writeText(directUrl);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const isTodayClockedIn = Boolean(todayRecord?.check_in_time && !todayRecord?.check_out_time);
  const isTodayCompleted = Boolean(todayRecord?.check_out_time);

  return (
    <SidebarLayout>
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE7DF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#166534] border border-emerald-200 font-black">
                Staff & Crew Attendance
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-bold text-zinc-500">{member?.primary_role || 'Team Specialist'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-zinc-900 tracking-tight">
              My Smart Attendance & Punch
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
              Manage your daily shift check-ins, view live hours, overtime, and monthly attendance records.
            </p>
          </div>

          {/* Quick Direct Link Action */}
          {secureToken && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#EBE7DF] hover:border-amber-400 text-zinc-800 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-700" />
                    <span>Copy 1-Click Link</span>
                  </>
                )}
              </button>

              <a
                href={directUrl || `/attendance/${secureToken}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Open Direct View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* 1-Click Add-to-Home-Screen Shortcut Card */}
        {secureToken && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 border border-amber-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-amber-300 flex items-center justify-center text-amber-700 shadow-xs shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-950">
                  📱 Add to Phone Home Screen (1-Click Punch)
                </h3>
                <p className="text-xs text-amber-900/80 mt-0.5 max-w-xl">
                  Apne phone ke browser me apna direct link open karke <span className="font-bold">"Add to Home Screen"</span> karein. Uske baad bina login kiye 1-click me selfie punch laga sakte hain.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-700" />
                    <span>Copy Personal Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Today's Punch Action & Live Timer Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Live Clock Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TODAY'S SHIFT TIME (IST)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-900 font-mono">
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {shifts[0]?.name || 'Standard Shift'} ({shifts[0]?.start_time?.substring(0, 5) || '10:00'} - {shifts[0]?.end_time?.substring(0, 5) || '19:00'})
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Weekly Offs:</span>
              <span className="font-bold text-zinc-700">
                {Array.isArray(member?.weekly_offs) && member.weekly_offs.length > 0 ? member.weekly_offs.join(', ') : 'Sunday'}
              </span>
            </div>
          </div>

          {/* Today's Punch Status Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-2">
              <span>TODAY'S PUNCH STATUS</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isTodayClockedIn ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse' :
                  isTodayCompleted ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isTodayClockedIn ? 'CLOCKED IN (WORKING)' :
                   isTodayCompleted ? 'SHIFT COMPLETED' :
                   'NOT PUNCHED YET'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                {isTodayClockedIn ? (
                  <>In at <span className="font-bold text-zinc-900">{formatTime12h(todayRecord.check_in_time)}</span> ({todayRecord.notes || 'Studio HQ'})</>
                ) : isTodayCompleted ? (
                  <>Shift ended at <span className="font-bold text-zinc-900">{formatTime12h(todayRecord.check_out_time)}</span></>
                ) : (
                  'Please punch in to start tracking your daily shift.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Working Hours Today:</span>
              <span className="font-mono font-bold text-emerald-700">
                {isTodayClockedIn ? (liveClockedInTimer ? `⏱️ ${liveClockedInTimer} live` : 'Active') :
                 isTodayCompleted ? `${Math.floor((todayRecord.work_duration_minutes || 0) / 60)}h ${(todayRecord.work_duration_minutes || 0) % 60}m` : '0m'}
              </span>
            </div>
          </div>

          {/* 1-Click Action Button Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-bold mb-2">
              <span>QUICK ACTION</span>
              <Camera className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                {isTodayClockedIn ? 'Punch Out & End Shift' : 'Punch In with Selfie'}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isTodayClockedIn ? 'Ready to clock out? Open punch portal.' : 'Open personal selfie camera & geo-punch portal.'}
              </p>
            </div>

            <div className="mt-4 pt-2">
              <a
                href={directUrl || `/attendance/${secureToken}`}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isTodayClockedIn ? 'Open Punch Out Portal' : 'Open Punch In Portal'}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Monthly Summary Statistics */}
        <div className="bg-gradient-to-br from-[#211E1B] to-[#36302B] text-white p-6 rounded-3xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <span className="text-[11px] font-bold text-[#E5B55D] uppercase tracking-wider block">
                Monthly Attendance & Time Log
              </span>
              <h2 className="text-xl font-black text-white font-serif">
                Summary for {selectedMonth}
              </h2>
            </div>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-2xs font-mono outline-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-white/60 text-xs block mb-1">Present Days</span>
              <span className="text-2xl font-black text-[#81C784] font-mono">{monthlyStats.presentCount} Days</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-white/60 text-xs block mb-1">Total Worked</span>
              <span className="text-2xl font-black text-white font-mono">{monthlyStats.totalWorkFormatted || '0m'}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-white/60 text-xs block mb-1">Total Late Marks</span>
              <span className="text-2xl font-black text-[#FFB74D] font-mono">{monthlyStats.lateCount}</span>
              <span className="text-[10px] text-white/50 block mt-0.5">({monthlyStats.totalLateFormatted})</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-white/60 text-xs block mb-1">Total Overtime</span>
              <span className="text-2xl font-black text-[#4FC3F7] font-mono">+{monthlyStats.totalOvertimeFormatted}</span>
              <span className="text-[10px] text-white/50 block mt-0.5">({monthlyStats.overtimeCount} Times)</span>
            </div>
          </div>
        </div>

        {/* Full Month Calendar Day by Day Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Month Calendar Breakdown ({selectedMonth})
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Tap on any day row to view selfie photo, punch times, and Google Maps location.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
              {monthlyStats.calendarDays.length} Days
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-zinc-500">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold">Loading calendar logs...</p>
            </div>
          ) : monthlyStats.calendarDays.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-[#EBE7DF] text-center text-xs text-zinc-400">
              No calendar days found for {selectedMonth}.
            </div>
          ) : (
            <div className="space-y-2">
              {monthlyStats.calendarDays.map((day: any) => {
                const rec = day.record;
                const isPunched = Boolean(rec && (rec.check_in_time || rec.punch_in_time));
                const isToday = day.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                const isActiveNow = Boolean(rec && rec.check_in_time && !rec.check_out_time && isToday);

                const dayDateObj = new Date(day.date + 'T12:00:00');
                const formattedDay = dayDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

                const checkInPhoto = rec?.check_in_photo_path || rec?.check_in_selfie || null;

                return (
                  <div
                    key={day.date}
                    onClick={() => {
                      setSelectedDayRecord(day);
                      setShowDetailsModal(true);
                    }}
                    className="p-3.5 bg-white rounded-2xl border border-[#EBE7DF] hover:border-amber-300 transition-all flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99] touch-manipulation group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {isPunched ? (
                        checkInPhoto ? (
                          <img src={checkInPhoto} alt="Selfie" className="w-11 h-11 rounded-xl object-cover border border-zinc-200 shrink-0" />
                        ) : day.type === 'worked_holiday' ? (
                          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-lg shrink-0 border border-amber-300 shadow-2xs">
                            🌴
                          </div>
                        ) : day.type === 'worked_week_off' ? (
                          <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center text-lg shrink-0 border border-indigo-300 shadow-2xs">
                            🛋️
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                            <Camera className="w-5 h-5" />
                          </div>
                        )
                      ) : day.type === 'holiday' ? (
                        <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center text-lg shrink-0 border border-sky-200">
                          🌴
                        </div>
                      ) : day.type === 'weekly_off' ? (
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg shrink-0 border border-indigo-200">
                          🛋️
                        </div>
                      ) : day.type === 'leave' ? (
                        <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg shrink-0 border border-purple-200">
                          🏖️
                        </div>
                      ) : day.type === 'upcoming' ? (
                        <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center text-xs shrink-0 border border-zinc-200">
                          <Calendar className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0 border border-rose-200">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-zinc-900 flex items-center gap-2">
                          <span>{formattedDay}</span>
                          {isToday && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-500 mt-0.5 space-y-0.5 truncate">
                          {isPunched ? (
                            <>
                              <div className="truncate">
                                <span>In: {rec.check_in_time ? formatTime12h(rec.check_in_time) : '--'}</span>
                                {day.type === 'worked_holiday' ? (
                                  <span className="text-amber-800 font-bold ml-1.5">(🌴 Holiday Duty: {day.holidayName || 'Festival'})</span>
                                ) : day.type === 'worked_week_off' ? (
                                  <span className="text-indigo-800 font-bold ml-1.5">(🛋️ Scheduled Week-Off Duty)</span>
                                ) : rec.timing?.isLate ? (
                                  <span className="text-rose-600 font-bold ml-1.5">(Late by {rec.timing.lateFormattedText || `${rec.late_minutes || 0}m`})</span>
                                ) : rec.timing?.isEarlyArrival ? (
                                  <span className="text-emerald-600 font-bold ml-1.5">({rec.timing.earlyArrivalFormattedText} early)</span>
                                ) : rec.check_in_time ? (
                                  <span className="text-emerald-600 font-medium ml-1.5">(On-Time)</span>
                                ) : null}
                              </div>
                              <div className="truncate">
                                {rec.check_out_time ? (
                                  <>
                                    <span>Out: {formatTime12h(rec.check_out_time)}</span>
                                    {rec.timing?.isEarlyCheckout ? (
                                      <span className="text-rose-600 font-bold ml-1.5">(Left {rec.timing.earlyCheckoutFormattedText} early)</span>
                                    ) : rec.timing?.isOvertime ? (
                                      <span className="text-sky-600 font-bold ml-1.5">(+{rec.timing.overtimeFormattedText} OT)</span>
                                    ) : (
                                      <span className="text-emerald-600 font-medium ml-1.5">(On-Time)</span>
                                    )}
                                  </>
                                ) : rec.check_in_time ? (
                                  isToday ? (
                                    <span className="text-emerald-600 font-bold animate-pulse">Out: In Progress (Active)</span>
                                  ) : (
                                    <span className="text-rose-600 font-bold">Out: Missed Check-Out</span>
                                  )
                                ) : null}
                              </div>
                            </>
                          ) : day.type === 'holiday' ? (
                            <div className="text-sky-700 font-bold truncate">
                              🌴 {day.title}
                            </div>
                          ) : day.type === 'weekly_off' ? (
                            <div className="text-indigo-600 font-medium truncate">
                              🛋️ Scheduled Weekly Off
                            </div>
                          ) : day.type === 'leave' ? (
                            <div className="text-purple-700 font-medium truncate">
                              🏖️ {day.title}
                            </div>
                          ) : day.type === 'upcoming' ? (
                            <div className="text-zinc-400 font-medium truncate">
                              Upcoming scheduled shift
                            </div>
                          ) : (
                            <div className="text-rose-600 font-medium truncate">
                              ❌ Absent / Attendance Not Marked
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                        day.type === 'worked_holiday' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' :
                        day.type === 'worked_week_off' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-black' :
                        day.type === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        day.type === 'late' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                        day.type === 'holiday' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                        day.type === 'weekly_off' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                        day.type === 'leave' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                        day.type === 'upcoming' ? 'bg-zinc-100 text-zinc-500' :
                        'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                      }`}>
                        {day.type === 'worked_holiday' ? '🌴 HOLIDAY DUTY' :
                         day.type === 'worked_week_off' ? '🛋️ WEEK-OFF DUTY' :
                         day.type === 'weekly_off' ? 'WEEKLY OFF' :
                         day.type === 'holiday' ? 'HOLIDAY' :
                         day.type === 'leave' ? 'LEAVE' :
                         day.type === 'upcoming' ? 'UPCOMING' :
                         day.type === 'absent' ? 'ABSENT' :
                         day.type.toUpperCase()}
                      </span>

                      <div className="mt-1">
                        {isPunched ? (
                          isActiveNow ? (
                            <div className="text-xs font-mono text-emerald-600 font-bold animate-pulse">
                              ⏱️ {liveClockedInTimer || 'Active'}
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-zinc-500 font-medium">
                              {Math.floor((rec.dayWorkMinutes || rec.work_duration_minutes || 0) / 60)}h {(rec.dayWorkMinutes || rec.work_duration_minutes || 0) % 60}m worked
                            </div>
                          )
                        ) : day.type === 'weekly_off' ? (
                          <div className="text-xs font-mono text-indigo-400 font-medium">Off</div>
                        ) : day.type === 'holiday' ? (
                          <div className="text-xs font-mono text-sky-600 font-medium">Holiday</div>
                        ) : day.type === 'leave' ? (
                          <div className="text-xs font-mono text-purple-600 font-medium">Approved</div>
                        ) : day.type === 'upcoming' ? (
                          <div className="text-xs font-mono text-zinc-400 font-medium">--</div>
                        ) : (
                          <div className="text-xs font-mono text-rose-400 font-medium">0h 0m</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Details Modal */}
        <PunchDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDayRecord(null);
          }}
          dayData={selectedDayRecord}
          liveWorkFormatted={liveClockedInTimer || undefined}
        />

      </div>
    </SidebarLayout>
  );
}

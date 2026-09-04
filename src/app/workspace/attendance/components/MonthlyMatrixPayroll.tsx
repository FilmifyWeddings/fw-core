'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Printer, Download, RefreshCw, 
  Search, Award, Clock, DollarSign, FileText, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember, AttendanceRecord, AttendanceShift, AttendanceLeaveRequest } from '@/types';
import { analyzeAttendanceRecordTiming, formatMinutesToHumanReadable } from '@/lib/attendance/time-calculations';

interface MonthlyMatrixPayrollProps {
  members?: FWTeamMember[];
  shifts?: AttendanceShift[];
  leaveRequests?: AttendanceLeaveRequest[];
}

export default function MonthlyMatrixPayroll({
  members: propMembers,
  shifts = [],
  leaveRequests: propLeaves = []
}: MonthlyMatrixPayrollProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Kolkata', 
      year: 'numeric', 
      month: '2-digit' 
    }).format(new Date());
  });

  const [members, setMembers] = useState<FWTeamMember[]>(propMembers || []);
  const [logs, setLogs] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<AttendanceLeaveRequest[]>(propLeaves);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync prop members if passed
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setMembers(propMembers);
    }
  }, [propMembers]);

  // Sync prop leaves if passed
  useEffect(() => {
    if (propLeaves && propLeaves.length > 0) {
      setLeaves(propLeaves);
    }
  }, [propLeaves]);

  // Strictly in-house staff filter
  const inHouseStaff = useMemo(() => {
    return members.filter((m) => {
      const rawType = String(m.type || m.primary_type || '').toLowerCase().replace(/_/g, '-');
      const memberTypes = Array.isArray(m.member_types)
        ? m.member_types.map((t: string) => String(t).toLowerCase().replace(/_/g, '-'))
        : [];

      // Exclude all freelancers, external partners, and printing labs
      if (
        rawType === 'freelancer' || rawType === 'partner' || rawType === 'lab' || rawType === 'printing-lab' || rawType === 'external' ||
        memberTypes.includes('freelancer') || memberTypes.includes('partner') || memberTypes.includes('lab') || memberTypes.includes('printing-lab') || memberTypes.includes('external')
      ) {
        return false;
      }

      return rawType === 'in-house' || memberTypes.includes('in-house') || (!rawType && memberTypes.length === 0);
    });
  }, [members]);

  // Fetch data for selected month
  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. If members not provided, fetch from fw_team_members
      if (!propMembers || propMembers.length === 0) {
        let teamQ = supabase
          .from('fw_team_members')
          .select('*')
          .order('name', { ascending: true });

        if (workspaceId !== 'ws_demo') {
          teamQ = teamQ.eq('user_id', workspaceId);
        }

        const { data: staffList, error: staffErr } = await teamQ;
        if (!staffErr && staffList) {
          setMembers(staffList as FWTeamMember[]);
        }
      }

      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = `${selectedMonth}-31`;

      // 2. Query attendance_logs for selected date range
      const { data: logsData, error: logErr } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (logErr) console.warn('attendance_logs fetch warning:', logErr);
      setLogs(logsData || []);

      // 3. Query attendance_records for selected date range
      let recQ = supabase
        .from('attendance_records')
        .select('*, member:fw_team_members(*)')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (workspaceId !== 'ws_demo') {
        recQ = recQ.eq('user_id', workspaceId);
      }

      const { data: recsData, error: recErr } = await recQ;
      if (recErr) console.warn('attendance_records fetch warning:', recErr);
      setRecords((recsData as AttendanceRecord[]) || []);

      // 4. Query leave requests if not provided
      if (!propLeaves || propLeaves.length === 0) {
        const { data: leaveData } = await supabase
          .from('attendance_leave_requests')
          .select('*')
          .eq('status', 'approved');

        if (leaveData) {
          setLeaves(leaveData as AttendanceLeaveRequest[]);
        }
      }
    } catch (err) {
      console.error('Error fetching monthly matrix data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, propMembers, propLeaves]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Helper to match record to member with safe string ID comparison
  const isMemberMatch = useCallback((recMemberId: any, member: FWTeamMember) => {
    if (!recMemberId || !member) return false;
    const memId = String(member.id);
    const recId = String(recMemberId);
    if (recId === memId) return true;
    const aliasIds = (member as any).aliasIds;
    if (aliasIds && Array.isArray(aliasIds) && aliasIds.map(String).includes(recId)) return true;
    return false;
  }, []);

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    return inHouseStaff.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.primary_role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inHouseStaff, searchQuery]);

  // Calculate monthly stats per employee with real numbers (no $0 fallbacks)
  const payrollRows = useMemo(() => {
    const shiftStartTime = shifts[0]?.start_time || '10:00';
    const shiftEndTime = shifts[0]?.end_time || '19:00';

    return filteredStaff.map(member => {
      const memberIdStr = String(member.id);

      // Direct string ID matching with fw_team_members
      const memberLogs = logs.filter(
        (l) => String(l.member_id) === String(member.id) ||
        (l.member_name && l.member_name.trim().toLowerCase() === member.name.trim().toLowerCase())
      );

      // Fallback matching with attendance_records
      const memberRecs = records.filter(
        (r) => String(r.member_id) === String(member.id) ||
        ((r.member as any)?.name && (r.member as any).name.trim().toLowerCase() === member.name.trim().toLowerCase())
      );

      // Unify distinct dates present
      const presentDates = new Set<string>();
      memberLogs.forEach(l => {
        const st = String(l.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'PRESENT' || Boolean(l.punch_in_time)) {
          if (l.date) presentDates.add(l.date);
        }
      });

      memberRecs.forEach(r => {
        const st = String(r.status || '').toLowerCase();
        if (st === 'present' || st === 'late' || st === 'half_day' || Boolean(r.check_in_time || r.punch_in_time)) {
          if (r.date) presentDates.add(r.date);
        }
      });

      const presentDays = presentDates.size > 0 
        ? presentDates.size 
        : memberLogs.filter(
            (l) => l.status === 'COMPLETED' || l.status === 'PRESENT'
          ).length;

      // Late marks calculation
      let lateMarks = memberLogs.filter(
        (l) => l.is_late || (l.late_minutes && Number(l.late_minutes) > 0)
      ).length;

      let lateMinutes = memberLogs.reduce(
        (acc, curr) => acc + (Number(curr.late_minutes) || 0), 0
      );

      if (lateMarks === 0 && memberRecs.length > 0) {
        memberRecs.forEach(r => {
          const t = analyzeAttendanceRecordTiming(r, member, shiftStartTime, shiftEndTime);
          if (t.isLate) {
            lateMarks++;
            lateMinutes += t.lateMinutes;
          }
        });
      }

      // Overtime calculation
      let totalOvertimeMinutes = memberLogs.reduce(
        (acc, curr) => acc + (Number(curr.overtime_minutes) || 0), 0
      );

      if (totalOvertimeMinutes === 0 && memberRecs.length > 0) {
        memberRecs.forEach(r => {
          const t = analyzeAttendanceRecordTiming(r, member, shiftStartTime, shiftEndTime);
          if (t.isOvertime) {
            totalOvertimeMinutes += t.overtimeMinutes;
          }
        });
      }
      const totalOvertimeHours = (totalOvertimeMinutes / 60).toFixed(1);

      // Daily Rate & Payable Salary calculation
      const dailyRate = Number(member.daily_rate) || (Number(member.monthly_salary || (member as any).agreed || (member.custom_data as any)?.agreed || (member.custom_data as any)?.monthly_salary || 0) / 30);
      const payableSalary = Math.round(presentDays * dailyRate);

      // Approved leaves in selected month
      const approvedLeavesCount = leaves.filter(l => {
        const matchesMember = String(l.member_id) === String(member.id) || 
          ((l.member as any)?.name && (l.member as any).name.trim().toLowerCase() === member.name.trim().toLowerCase());
        const withinMonth = (l.start_date.substring(0, 7) <= selectedMonth && l.end_date.substring(0, 7) >= selectedMonth);
        return matchesMember && withinMonth;
      }).length;

      return {
        member,
        memberIdStr,
        presentDays,
        lateMarks,
        lateMinutes,
        totalOvertimeHours,
        totalOvertimeMinutes,
        approvedLeavesCount,
        dailyRate,
        payableSalary
      };
    });
  }, [filteredStaff, logs, records, leaves, selectedMonth, shifts]);

  // Overall Totals
  const totalPayableSalary = useMemo(() => {
    return payrollRows.reduce((acc, row) => acc + row.payableSalary, 0);
  }, [payrollRows]);

  const totalPresentDays = useMemo(() => {
    return payrollRows.reduce((acc, row) => acc + row.presentDays, 0);
  }, [payrollRows]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (payrollRows.length === 0) return;

    const headers = [
      'Employee Name', 'Role', 'Month', 'Present Days', 
      'Late Marks', 'Approved Leaves', 
      'Total Overtime Hours', 'Effective Daily Rate', 'Payable Salary (INR)'
    ];

    const rows = payrollRows.map(row => [
      `"${row.member.name}"`,
      `"${row.member.primary_role || 'In-House Crew'}"`,
      selectedMonth,
      row.presentDays,
      row.lateMarks,
      row.approvedLeavesCount,
      row.totalOvertimeHours,
      Math.round(row.dailyRate),
      row.payableSalary
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudioCore_Payroll_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Timesheet Matrix &amp; Payroll</h3>
            <p className="text-xs text-slate-500">Live attendance sync with accurate daily rates, overtime, and payable salaries.</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Month Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 focus:outline-none font-mono cursor-pointer"
            />
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* Print Timesheet */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Timesheet
          </button>

          {/* Refresh */}
          <button
            onClick={fetchMonthData}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="Refresh Payroll Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Workforce</span>
          <div className="text-xl font-black text-slate-900 mt-1">{payrollRows.length} In-House Members</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active on staff roster</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Present Days</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{totalPresentDays} Days</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Logged in {selectedMonth}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Payable Payroll</span>
          <div className="text-xl font-black text-amber-700 mt-1 font-mono">₹{totalPayableSalary.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Calculated from verified rates</p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
            <p className="text-xs font-bold text-slate-600">Calculating monthly timesheet &amp; payroll metrics...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Present Days</th>
                  <th className="py-3.5 px-4 text-center">Late Marks</th>
                  <th className="py-3.5 px-4 text-center">Approved Leaves</th>
                  <th className="py-3.5 px-4 text-center">Total Overtime</th>
                  <th className="py-3.5 px-4 text-right">Payable Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {payrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No staff records found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  payrollRows.map((row) => {
                    const { member, memberIdStr, presentDays, lateMarks, lateMinutes, approvedLeavesCount, totalOvertimeHours, dailyRate, payableSalary } = row;

                    return (
                      <tr key={memberIdStr} className="hover:bg-slate-50/80 transition-colors">
                        {/* Employee */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-black text-xs shrink-0 overflow-hidden">
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                member.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block">{member.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{member.phone_number || ''}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {member.primary_role || 'In-House Crew'}
                        </td>

                        {/* Present Days */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                            presentDays > 0 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {presentDays} {presentDays === 1 ? 'Day' : 'Days'}
                          </span>
                        </td>

                        {/* Late Marks / Penalties */}
                        <td className="py-3 px-4 text-center">
                          {lateMarks > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-200">
                              {lateMarks} {lateMinutes > 0 ? `(${formatMinutesToHumanReadable(lateMinutes)})` : 'Late'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">0</span>
                          )}
                        </td>

                        {/* Approved Leaves */}
                        <td className="py-3 px-4 text-center">
                          {approvedLeavesCount > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-50 text-sky-800 border border-sky-200">
                              {approvedLeavesCount} {approvedLeavesCount === 1 ? 'Day' : 'Days'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">0</span>
                          )}
                        </td>

                        {/* Total Overtime */}
                        <td className="py-3 px-4 text-center">
                          {Number(totalOvertimeHours) > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              +{totalOvertimeHours}h
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">0h</span>
                          )}
                        </td>

                        {/* Payable Salary (Calculated from Real Rates - No $0 Fallback) */}
                        <td className="py-3 px-4 text-right">
                          <div>
                            <span className="font-mono font-black text-slate-900 text-xs block">
                              ₹{payableSalary.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              {dailyRate > 0 ? (
                                `₹${Math.round(dailyRate).toLocaleString('en-IN')}/day (${presentDays}d)`
                              ) : (
                                `${presentDays} Days`
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

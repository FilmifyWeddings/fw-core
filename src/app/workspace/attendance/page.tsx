'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Users, MapPin, CheckCircle2, XCircle, AlertTriangle, 
  Calendar, Coffee, Download, Plus, Search, Filter, RefreshCw, 
  Sparkles, Link2, Copy, Check, ShieldCheck, FileText, ChevronRight, 
  ChevronDown, Edit3, Trash2, X, ExternalLink, ArrowRight, UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { 
  FWTeamMember, AttendanceRecord, AttendanceLocation, 
  AttendanceShift, AttendanceLeaveRequest, AttendanceMemberLink, AttendanceHoliday
} from '@/types';

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'live' | 'matrix' | 'leaves' | 'locations' | 'links' | 'reports'>('roster');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Data states
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [shifts, setShifts] = useState<AttendanceShift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<AttendanceLeaveRequest[]>([]);
  const [memberLinks, setMemberLinks] = useState<AttendanceMemberLink[]>([]);
  const [holidays, setHolidays] = useState<AttendanceHoliday[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    latitude: '19.1363',
    longitude: '72.8277',
    radius_meters: '150',
    address: ''
  });

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: 'Wedding Shoot (Full Day)',
    start_time: '07:00',
    end_time: '23:00',
    grace_period_minutes: '15'
  });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    member_id: '',
    leave_type: 'casual' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const [showOverrideModal, setShowOverrideModal] = useState<{
    open: boolean;
    member?: FWTeamMember;
    record?: AttendanceRecord;
  }>({ open: false });
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent' | 'leave' | 'half_day'>('present');
  const [overrideCheckIn, setOverrideCheckIn] = useState('09:30');
  const [overrideCheckOut, setOverrideCheckOut] = useState('18:30');

  // Load Data
  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Team Members from canonical fw_team_members table
      let teamQuery = supabase
        .from('fw_team_members')
        .select('*')
        .order('name', { ascending: true });

      if (workspaceId !== 'ws_demo') {
        teamQuery = teamQuery.eq('user_id', workspaceId);
      }

      const { data: membersData } = await teamQuery;
      const members = membersData || [];
      setTeamMembers(members);

      // 2. Fetch Attendance Records for selected date
      let recQuery = supabase
        .from('attendance_records')
        .select('*, member:fw_team_members(*)')
        .eq('date', selectedDate);

      if (workspaceId !== 'ws_demo') {
        recQuery = recQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: recData } = await recQuery;
      setRecords(recData || []);

      // 3. Fetch Locations
      let locQuery = supabase.from('attendance_locations').select('*');
      if (workspaceId !== 'ws_demo') locQuery = locQuery.eq('user_id', workspaceId);
      const { data: locData } = await locQuery;
      setLocations(locData || [
        {
          id: 'loc_def_1',
          user_id: workspaceId,
          workspace_id: workspaceId,
          name: 'Mumbai Studio (Andheri West)',
          latitude: 19.1363,
          longitude: 72.8277,
          radius_meters: 200,
          address: 'StudioCore Hub, Link Road, Andheri West',
          is_active: true
        },
        {
          id: 'loc_def_2',
          user_id: workspaceId,
          workspace_id: workspaceId,
          name: 'Kopar Khairane Wedding Banquet Site',
          latitude: 19.1022,
          longitude: 73.0031,
          radius_meters: 350,
          address: 'Royal Palace Banquet, Kopar Khairane',
          is_active: true
        }
      ]);

      // 4. Fetch Member Links
      let linksQuery = supabase.from('attendance_member_links').select('*');
      if (workspaceId !== 'ws_demo') linksQuery = linksQuery.eq('user_id', workspaceId);
      const { data: linksData } = await linksQuery;
      setMemberLinks(linksData || []);

      // 5. Fetch Leaves
      let leavesQuery = supabase.from('attendance_leave_requests').select('*, member:fw_team_members(*)');
      if (workspaceId !== 'ws_demo') leavesQuery = leavesQuery.eq('user_id', workspaceId);
      const { data: leavesData } = await leavesQuery;
      setLeaveRequests(leavesData || []);

    } catch (e) {
      console.error('Error fetching attendance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Generate / Copy Personal Attendance Link for an employee
  const handleGenerateOrCopyLink = async (memberId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      let link = memberLinks.find(l => l.member_id === memberId);

      if (!link) {
        // Generate secure 32-char token
        const secureToken = `att_${memberId.slice(0, 6)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
        
        const newLinkObj: AttendanceMemberLink = {
          id: `link_${Date.now()}`,
          user_id: workspaceId,
          workspace_id: workspaceId,
          member_id: memberId,
          secure_token: secureToken,
          is_active: true
        };

        setMemberLinks(prev => [...prev, newLinkObj]);
        link = newLinkObj;

        if (workspaceId !== 'ws_demo') {
          await supabase.from('attendance_member_links').insert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            member_id: memberId,
            secure_token: secureToken,
            is_active: true
          }]);
        }
      }

      const fullUrl = `${window.location.origin}/attendance/${link.secure_token}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLinkId(memberId);
      setTimeout(() => setCopiedLinkId(null), 2500);

    } catch (err) {
      console.error('Copy link error:', err);
    }
  };

  // Save New Geofence Location
  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      alert('Please enter location name');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newLoc: AttendanceLocation = {
        id: `loc_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        name: locationForm.name.trim(),
        latitude: parseFloat(locationForm.latitude) || 0,
        longitude: parseFloat(locationForm.longitude) || 0,
        radius_meters: parseInt(locationForm.radius_meters) || 150,
        address: locationForm.address.trim(),
        is_active: true
      };

      setLocations(prev => [newLoc, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('attendance_locations').insert([newLoc]);
      }

      setShowAddLocationModal(false);
      setLocationForm({
        name: '',
        latitude: '19.1363',
        longitude: '72.8277',
        radius_meters: '150',
        address: ''
      });
    } catch (e) {
      console.error('Save location error:', e);
    }
  };

  // Submit Leave Request
  const handleSaveLeaveRequest = async () => {
    if (!leaveForm.member_id || !leaveForm.reason.trim()) {
      alert('Please select an employee and enter a reason.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newLeave: AttendanceLeaveRequest = {
        id: `leave_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        member_id: leaveForm.member_id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
      };

      setLeaveRequests(prev => [newLeave, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('attendance_leave_requests').insert([newLeave]);
      }

      setShowLeaveModal(false);
      setLeaveForm({
        member_id: '',
        leave_type: 'casual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } catch (e) {
      console.error('Leave request error:', e);
    }
  };

  // Approve / Reject Leave
  const handleReviewLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      setLeaveRequests(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
      await supabase
        .from('attendance_leave_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leaveId);
    } catch (e) {
      console.error('Review leave error:', e);
    }
  };

  // Manual Attendance Override / Mark Status
  const handleSaveOverride = async () => {
    if (!showOverrideModal.member) return;
    const member = showOverrideModal.member;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const checkInISO = `${selectedDate}T${overrideCheckIn}:00.000Z`;
      const checkOutISO = `${selectedDate}T${overrideCheckOut}:00.000Z`;

      const payload: Partial<AttendanceRecord> = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        member_id: member.id,
        date: selectedDate,
        status: overrideStatus,
        check_in_time: overrideStatus === 'present' || overrideStatus === 'half_day' ? checkInISO : null,
        check_out_time: overrideStatus === 'present' || overrideStatus === 'half_day' ? checkOutISO : null,
        check_in_verified: true,
        check_out_verified: true,
        work_duration_minutes: overrideStatus === 'present' ? 480 : overrideStatus === 'half_day' ? 240 : 0,
        updated_at: new Date().toISOString()
      };

      setRecords(prev => {
        const filtered = prev.filter(r => r.member_id !== member.id);
        return [{ ...(payload as AttendanceRecord), id: `rec_${Date.now()}`, member }, ...filtered];
      });

      if (workspaceId !== 'ws_demo') {
        await supabase
          .from('attendance_records')
          .upsert([{ ...payload, created_at: new Date().toISOString() }], { onConflict: 'member_id,date' });
      }

      setShowOverrideModal({ open: false });
    } catch (e) {
      console.error('Save override error:', e);
    }
  };

  // Summaries calculation
  const totalEmployees = teamMembers.length;
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount = records.filter(r => r.status === 'late' || (r.late_minutes && r.late_minutes > 0)).length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const onLeaveCount = leaveRequests.filter(l => l.status === 'approved' && l.start_date <= selectedDate && l.end_date >= selectedDate).length;
  
  const totalWorkedMinutes = records.reduce((acc, r) => acc + (r.work_duration_minutes || 0), 0);
  const totalOvertimeMinutes = records.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);
  const liveWorkingCount = records.filter(r => r.check_in_time && !r.check_out_time).length;

  // Filtered daily roster list
  const rosterList = useMemo(() => {
    return teamMembers.map(member => {
      const record = records.find(r => r.member_id === member.id);
      return { member, record };
    }).filter(({ member, record }) => {
      const nameMatch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
      const roleMatch = roleFilter === 'all' || (member.primary_role || '').toLowerCase().includes(roleFilter.toLowerCase());
      const statusMatch = statusFilter === 'all' || (record ? record.status === statusFilter : statusFilter === 'absent');
      return nameMatch && roleMatch && statusMatch;
    });
  }, [teamMembers, records, searchQuery, roleFilter, statusFilter]);

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#FDFCF7] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              HEADER & DATE SELECTOR
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-emerald-200/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
                <Clock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Workforce & Attendance</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                    Live Suite
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mobile selfie clock-in, GPS geofencing, shoot day attendance, breaks, and automatic overtime tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Navigation */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply Leave
              </button>

              <button
                onClick={fetchAttendanceData}
                className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
                title="Refresh Attendance Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              WORKFORCE SUMMARY COMMAND CENTER (5 METRIC CARDS)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Present */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Present Today</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-700 tracking-tight tabular-nums font-sans">
                  {presentCount} <span className="text-sm font-bold text-slate-400">/ {totalEmployees}</span>
                </h3>
                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                  {lateCount > 0 ? `${lateCount} Late Arrivals` : 'All On-Time'}
                </p>
              </div>
              <div className="h-1 w-full bg-emerald-500 rounded-full" />
            </div>

            {/* 2. Absent / Not Checked In */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-rose-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Not Present</p>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-rose-700 tracking-tight tabular-nums font-sans">
                  {absentCount}
                </h3>
                <p className="text-[10px] font-semibold text-rose-600 mt-0.5">No Clock-In Yet</p>
              </div>
              <div className="h-1 w-full bg-rose-500 rounded-full" />
            </div>

            {/* 3. Away / Leaves */}
            <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-sky-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Leaves & Off</p>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-sky-700 tracking-tight tabular-nums font-sans">
                  {onLeaveCount}
                </h3>
                <p className="text-[10px] font-semibold text-sky-600 mt-0.5">Approved Time-Off</p>
              </div>
              <div className="h-1 w-full bg-sky-500 rounded-full" />
            </div>

            {/* 4. Total Worked Hours */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Worked Hours</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight tabular-nums font-sans">
                  {Math.floor(totalWorkedMinutes / 60)}h {totalWorkedMinutes % 60}m
                </h3>
                <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                  +{Math.floor(totalOvertimeMinutes / 60)}h {totalOvertimeMinutes % 60}m Overtime
                </p>
              </div>
              <div className="h-1 w-full bg-amber-500 rounded-full" />
            </div>

            {/* 5. Live Working Now */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl border border-emerald-500 shadow-md shadow-emerald-500/20 text-white flex flex-col justify-between space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-emerald-100 uppercase tracking-wider">Live On-Duty</p>
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white flex items-center justify-center animate-pulse">
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight tabular-nums font-sans">
                  {liveWorkingCount} Crew Active
                </h3>
                <p className="text-[11px] font-bold text-emerald-100 mt-0.5">
                  Currently on Shoot / Studio 🔴
                </p>
              </div>
              <div className="h-1 w-full bg-white/40 rounded-full" />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB SWITCHER & SEARCH / FILTERS
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/70 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-emerald-50/60 border border-emerald-200/80 rounded-xl w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'roster' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Daily Roster
              </button>

              <button
                onClick={() => setActiveTab('live')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'live' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Live Activity ({liveWorkingCount})
              </button>

              <button
                onClick={() => setActiveTab('leaves')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'leaves' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Leaves ({leaveRequests.filter(l => l.status === 'pending').length})
              </button>

              <button
                onClick={() => setActiveTab('locations')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'locations' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Geofence & Shifts ({locations.length})
              </button>

              <button
                onClick={() => setActiveTab('links')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'links' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Member Links
              </button>
            </div>

            {/* Search & Filters */}
            {activeTab === 'roster' && (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-medium"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                >
                  <option value="all">All Roles</option>
                  <option value="photographer">Photographers</option>
                  <option value="cinematographer">Cinematographers</option>
                  <option value="editor">Editors</option>
                  <option value="drone">Drone Operators</option>
                </select>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: DAILY ROSTER
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-emerald-300 text-center space-y-3">
                  <Users className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">No Team Members Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add crew members in Team Manager to start tracking daily attendance.
                  </p>
                  <Link
                    href="/team-manager"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition"
                  >
                    Go to Team Manager
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4 font-black">Employee</th>
                          <th className="py-3 px-4 font-black">Status</th>
                          <th className="py-3 px-4 font-black">Check In</th>
                          <th className="py-3 px-4 font-black">Check Out</th>
                          <th className="py-3 px-4 font-black">Work Hours</th>
                          <th className="py-3 px-4 font-black">Location / GPS</th>
                          <th className="py-3 px-4 font-black">Selfie Evidence</th>
                          <th className="py-3 px-4 text-right font-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterList.map(({ member, record }) => {
                          const isPresent = record?.status === 'present';
                          const isLate = record?.status === 'late';
                          const isAbsent = !record || record.status === 'absent';

                          return (
                            <tr key={member.id} className="hover:bg-emerald-50/20 transition">
                              {/* Employee Name & Role */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold text-xs">
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-900">{member.name}</h4>
                                    <p className="text-[10px] font-semibold text-slate-500">{member.primary_role || 'Crew'}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isPresent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isLate
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : record?.status === 'leave'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {isPresent ? '✓ Present' : isLate ? `Late (${record?.late_minutes}m)` : record?.status === 'leave' ? 'On Leave' : 'Absent'}
                                </span>
                              </td>

                              {/* Check In */}
                              <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                                {record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>

                              {/* Check Out */}
                              <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                                {record?.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>

                              {/* Work Hours */}
                              <td className="py-3 px-4 font-extrabold text-slate-900 font-mono">
                                {record?.work_duration_minutes ? (
                                  `${Math.floor(record.work_duration_minutes / 60)}h ${record.work_duration_minutes % 60}m`
                                ) : isPresent ? (
                                  <span className="text-emerald-600 animate-pulse">Working...</span>
                                ) : '—'}
                              </td>

                              {/* Location / GPS Geofence */}
                              <td className="py-3 px-4">
                                {record?.check_in_geofence_status === 'verified' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                                    <MapPin className="w-3 h-3" /> Geofence Verified
                                  </span>
                                ) : record?.check_in_geofence_status === 'outside_geofence' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 w-max">
                                    <AlertTriangle className="w-3 h-3" /> Outside Area
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">No GPS</span>
                                )}
                              </td>

                              {/* Selfie Evidence */}
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
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => handleGenerateOrCopyLink(member.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                                  title="Copy personal mobile attendance link"
                                >
                                  {copiedLinkId === member.id ? '✓ Link Copied' : 'Copy Link'}
                                </button>

                                <button
                                  onClick={() => {
                                    setShowOverrideModal({
                                      open: true,
                                      member,
                                      record: record || undefined
                                    });
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                >
                                  Edit
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

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: LIVE CREW ACTIVITY
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Live Active Crew on Duty</h3>
                  <p className="text-xs text-slate-500">Real-time status of photographers, cinematographers, and editors currently clocked-in.</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> Live Feed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {records.filter(r => r.check_in_time && !r.check_out_time).map(rec => (
                  <div key={rec.id} className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center text-xs">
                          {rec.member?.name?.slice(0, 2).toUpperCase() || 'CW'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900">{rec.member?.name || 'Crew Member'}</h4>
                          <p className="text-[10px] font-semibold text-slate-500">{rec.member?.primary_role || 'Photography'}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Clocked In
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Started At</span>
                        <p className="font-mono font-bold text-slate-800">
                          {new Date(rec.check_in_time!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Geofence</span>
                        <p className="font-bold text-emerald-700">{rec.check_in_geofence_status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: LEAVE MANAGEMENT
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Leave Requests & Approvals</h3>
                  <p className="text-xs text-slate-500">Approve or reject leave requests submitted by studio crew.</p>
                </div>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Apply Leave
                </button>
              </div>

              {leaveRequests.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-2">
                  <Coffee className="w-8 h-8 mx-auto" />
                  <p className="text-xs font-semibold">No leave requests found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Leave Type</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaveRequests.map(leave => (
                        <tr key={leave.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {leave.member?.name || 'Crew Member'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
                              {leave.leave_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {leave.start_date} → {leave.end_date}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            {leave.reason}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              leave.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : leave.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {leave.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReviewLeave(leave.id, 'approved')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewLeave(leave.id, 'rejected')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: GEOFENCE LOCATIONS & SHIFTS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Geofence Attendance Locations</h3>
                  <p className="text-xs text-slate-500">Configure studio offices and wedding venue GPS boundaries to prevent proxy attendance.</p>
                </div>
                <button
                  onClick={() => setShowAddLocationModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Location
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map(loc => (
                  <div key={loc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h4 className="font-extrabold text-slate-900">{loc.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                        {loc.radius_meters}m Radius
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-600">
                      <p>Lat: {loc.latitude} • Lng: {loc.longitude}</p>
                      {loc.address && <p className="text-[11px] font-sans text-slate-500">{loc.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 5: MEMBER ATTENDANCE LINKS MANAGER
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Personal Employee Attendance Links</h3>
                  <p className="text-xs text-slate-500">Each employee has a unique, secure 32-character token URL to clock-in from their mobile phone.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Secure Link Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map(member => {
                      const link = memberLinks.find(l => l.member_id === member.id);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {member.name}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-500">
                            {member.primary_role || 'Crew'}
                          </td>
                          <td className="py-3 px-4">
                            {link ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active Token Generated
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Not generated</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleGenerateOrCopyLink(member.id)}
                              className="px-3 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                            >
                              {copiedLinkId === member.id ? '✓ Link Copied' : 'Copy Mobile Link'}
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
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD GEOFENCE LOCATION
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-emerald-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Add Geofence Attendance Location</h3>
                <button onClick={() => setShowAddLocationModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Location / Venue Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Studio - Andheri West"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Latitude</label>
                    <input
                      type="text"
                      placeholder="19.1363"
                      value={locationForm.latitude}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Longitude</label>
                    <input
                      type="text"
                      placeholder="72.8277"
                      value={locationForm.longitude}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={locationForm.radius_meters}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, radius_meters: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLocation}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
                >
                  Save Location
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: APPLY LEAVE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-sky-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Apply Leave Request</h3>
                <button onClick={() => setShowLeaveModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Select Employee</label>
                  <select
                    value={leaveForm.member_id}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, member_id: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-800"
                  >
                    <option value="">Choose Employee...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.primary_role})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Reason</label>
                  <textarea
                    rows={2}
                    placeholder="Reason for leave..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLeaveRequest}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MANUAL OVERRIDE ATTENDANCE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOverrideModal.open && showOverrideModal.member && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Manual Attendance Override</h3>
                <button onClick={() => setShowOverrideModal({ open: false })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">Employee: {showOverrideModal.member.name}</p>
                  <p className="text-xs font-bold text-slate-500">Date: {selectedDate}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>

                {overrideStatus === 'present' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Check In Time</label>
                      <input
                        type="time"
                        value={overrideCheckIn}
                        onChange={(e) => setOverrideCheckIn(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Check Out Time</label>
                      <input
                        type="time"
                        value={overrideCheckOut}
                        onChange={(e) => setOverrideCheckOut(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowOverrideModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverride}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md"
                >
                  Save Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </SidebarLayout>
  );
}

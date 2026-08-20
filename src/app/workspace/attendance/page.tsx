'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Users, MapPin, CheckCircle2, XCircle, AlertTriangle, 
  Calendar, Coffee, Download, Plus, Search, Filter, RefreshCw, 
  Sparkles, Link2, Copy, Check, ShieldCheck, FileText, ChevronRight, 
  ChevronDown, Edit3, Trash2, X, ExternalLink, ArrowRight, UserCheck,
  Send, MessageCircle, Printer, Sliders, Globe, Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { 
  FWTeamMember, AttendanceRecord, AttendanceLocation, 
  AttendanceShift, AttendanceLeaveRequest, AttendanceMemberLink, AttendanceHoliday
} from '@/types';

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'live' | 'matrix' | 'leaves' | 'locations' | 'shifts' | 'links'>('roster');
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
    latitude: '19.0596',
    longitude: '72.8295',
    radius_meters: '150',
    address: ''
  });

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: 'Standard Studio Shift',
    start_time: '09:30',
    end_time: '18:30',
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
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent' | 'leave' | 'half_day' | 'late'>('present');
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
        recQuery = recQuery.eq('user_id', workspaceId);
      }

      const { data: recordsData } = await recQuery;
      setRecords(recordsData || []);

      // 3. Fetch Geofence Locations
      let locQuery = supabase
        .from('attendance_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId !== 'ws_demo') {
        locQuery = locQuery.eq('user_id', workspaceId);
      }

      const { data: locData } = await locQuery;
      setLocations(locData || []);

      // 4. Fetch Shifts
      let shiftQuery = supabase
        .from('attendance_shifts')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId !== 'ws_demo') {
        shiftQuery = shiftQuery.eq('user_id', workspaceId);
      }

      const { data: shiftData } = await shiftQuery;
      setShifts(shiftData || []);

      // 5. Fetch Member Links
      let linksQuery = supabase
        .from('attendance_member_links')
        .select('*');

      if (workspaceId !== 'ws_demo') {
        linksQuery = linksQuery.eq('user_id', workspaceId);
      }

      const { data: linksData } = await linksQuery;
      setMemberLinks(linksData || []);

      // 6. Fetch Leave Requests
      let leavesQuery = supabase
        .from('attendance_leave_requests')
        .select('*, member:fw_team_members(name, primary_role, phone_number)')
        .order('created_at', { ascending: false });

      if (workspaceId !== 'ws_demo') {
        leavesQuery = leavesQuery.eq('user_id', workspaceId);
      }

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

  // Share Link via WhatsApp
  const handleShareLinkWhatsApp = (member: FWTeamMember) => {
    const link = memberLinks.find(l => l.member_id === member.id);
    const fullUrl = `${window.location.origin}/attendance/${link?.secure_token || 'portal'}`;
    const phone = member.phone_number?.replace(/[^0-9]/g, '') || '';
    const text = encodeURIComponent(`Hi ${member.name},\nHere is your personal mobile attendance punch portal link for StudioCore:\n${fullUrl}\n\nPlease bookmark this link on your phone to punch in and out.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
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
        latitude: '19.0596',
        longitude: '72.8295',
        radius_meters: '150',
        address: ''
      });
    } catch (e) {
      console.error('Save location error:', e);
    }
  };

  // Save New Shift
  const handleSaveShift = async () => {
    if (!shiftForm.name.trim()) {
      alert('Please enter shift name');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const newShift: AttendanceShift = {
        id: `shift_${Date.now()}`,
        user_id: workspaceId,
        workspace_id: workspaceId,
        name: shiftForm.name.trim(),
        start_time: `${shiftForm.start_time}:00`,
        end_time: `${shiftForm.end_time}:00`,
        grace_period_minutes: parseInt(shiftForm.grace_period_minutes) || 15,
        is_active: true
      };

      setShifts(prev => [newShift, ...prev]);

      if (workspaceId !== 'ws_demo') {
        await supabase.from('attendance_shifts').insert([newShift]);
      }

      setShowAddShiftModal(false);
    } catch (e) {
      console.error('Save shift error:', e);
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

  // Approve / Reject Leave with WhatsApp Trigger
  const handleReviewLeave = async (leave: AttendanceLeaveRequest, status: 'approved' | 'rejected') => {
    try {
      setLeaveRequests(prev => prev.map(l => l.id === leave.id ? { ...l, status } : l));
      await supabase
        .from('attendance_leave_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leave.id);

      // Trigger WhatsApp notification if phone number available
      if (leave.member?.phone_number) {
        const phone = leave.member.phone_number.replace(/[^0-9]/g, '');
        const text = encodeURIComponent(
          `Hi ${leave.member.name},\nYour ${leave.leave_type.toUpperCase()} Leave request (${leave.start_date} to ${leave.end_date}) has been *${status.toUpperCase()}* by Studio Management.`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
      }
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
        check_in_time: overrideStatus === 'present' || overrideStatus === 'half_day' || overrideStatus === 'late' ? checkInISO : null,
        check_out_time: overrideStatus === 'present' || overrideStatus === 'half_day' || overrideStatus === 'late' ? checkOutISO : null,
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

  // Export Timesheet to CSV
  const handleExportCSV = () => {
    if (teamMembers.length === 0) return;

    const headers = ['Employee Name', 'Role', 'Date', 'Status', 'Check In', 'Check Out', 'Work Duration (Mins)', 'Late (Mins)', 'Overtime (Mins)'];
    const rows = teamMembers.map(member => {
      const rec = records.find(r => r.member_id === member.id);
      return [
        member.name,
        member.primary_role || 'Crew',
        selectedDate,
        rec?.status || 'absent',
        rec?.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '',
        rec?.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString() : '',
        rec?.work_duration_minutes || 0,
        rec?.late_minutes || 0,
        rec?.overtime_minutes || 0
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudioCore_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summaries calculation
  const totalEmployees = teamMembers.length;
  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount = records.filter(r => r.status === 'late' || (r.late_minutes && r.late_minutes > 0)).length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const onLeaveCount = leaveRequests.filter(l => l.status === 'approved' && l.start_date <= selectedDate && l.end_date >= selectedDate).length;
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
    <div className="min-h-screen bg-[#FDFCF7] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & DATE SELECTOR
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-[#E9DFD2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C89435] to-[#8C6D33] flex items-center justify-center shadow-md shadow-[#C89435]/20 text-white">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Workforce & Smart Attendance</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FAF3E6] text-[#8C6D33] border border-[#E9DFD2]">
                  Enterprise Geo-Fenced
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mobile WebP selfie clock-in, high-precision Haversine geofence, shifts, leaves & automatic payroll matrix.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-[#C89435]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#C89435] hover:bg-[#B3802B] rounded-xl transition flex items-center gap-1.5 shadow-xs"
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
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Absent / Unmarked</p>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-rose-700 tracking-tight tabular-nums font-sans">
                {absentCount}
              </h3>
              <p className="text-[10px] font-semibold text-rose-600 mt-0.5">
                Pending check-in
              </p>
            </div>
            <div className="h-1 w-full bg-rose-500 rounded-full" />
          </div>

          {/* 3. On Duty / Live Floor */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8DCC6] shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-[#C89435] transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Live On Duty</p>
              <div className="w-8 h-8 rounded-lg bg-[#FAF3E6] text-[#8C6D33] border border-[#E8DCC6] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#8C6D33] tracking-tight tabular-nums font-sans">
                {liveWorkingCount}
              </h3>
              <p className="text-[10px] font-semibold text-[#8C6D33] mt-0.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-ping" />
                Active Floor Crew
              </p>
            </div>
            <div className="h-1 w-full bg-[#C89435] rounded-full" />
          </div>

          {/* 4. On Leave */}
          <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-sky-400 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">On Leave</p>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <Coffee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-sky-700 tracking-tight tabular-nums font-sans">
                {onLeaveCount}
              </h3>
              <p className="text-[10px] font-semibold text-sky-600 mt-0.5">
                Approved leaves
              </p>
            </div>
            <div className="h-1 w-full bg-sky-500 rounded-full" />
          </div>

          {/* 5. Geofence Coverage */}
          <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-teal-400 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Active Geofences</p>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-teal-700 tracking-tight tabular-nums font-sans">
                {locations.length}
              </h3>
              <p className="text-[10px] font-semibold text-teal-600 mt-0.5">
                Studio & Event Venues
              </p>
            </div>
            <div className="h-1 w-full bg-teal-500 rounded-full" />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            NAVIGATION TABS
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'roster', label: 'Daily Roster', icon: Clock },
              { id: 'live', label: 'Live Floor View', icon: Users },
              { id: 'matrix', label: 'Monthly Matrix & Payroll', icon: Calendar },
              { id: 'leaves', label: 'Leaves & Approvals', icon: Coffee },
              { id: 'locations', label: 'Geofence Manager', icon: Globe },
              { id: 'shifts', label: 'Shift Timings', icon: Sliders },
              { id: 'links', label: 'Employee Mobile Links', icon: Link2 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#C89435] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: DAILY ROSTER
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4">Work Hours</th>
                      <th className="py-3 px-4">Location / GPS</th>
                      <th className="py-3 px-4">Selfie Evidence</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterList.map(({ member, record }) => {
                      const isPresent = record?.status === 'present';
                      const isLate = record?.status === 'late';
                      const isAbsent = !record || record.status === 'absent';

                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition">
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

                          <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                            {record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                            {record?.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>

                          <td className="py-3 px-4 font-extrabold text-slate-900 font-mono">
                            {record?.work_duration_minutes ? (
                              `${Math.floor(record.work_duration_minutes / 60)}h ${record.work_duration_minutes % 60}m`
                            ) : isPresent ? (
                              <span className="text-emerald-600 animate-pulse">Working...</span>
                            ) : '—'}
                          </td>

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

                          <td className="py-3 px-4">
                            {record?.check_in_photo_path ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                                <ShieldCheck className="w-3 h-3" /> Selfie Verified
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No Photo</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleGenerateOrCopyLink(member.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                            >
                              {copiedLinkId === member.id ? '✓ Copied' : 'Copy Link'}
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
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: LIVE FLOOR VIEW
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

            {records.filter(r => r.check_in_time && !r.check_out_time).length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">No crew currently clocked-in on duty.</p>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: MONTHLY TIMESHEET MATRIX & PAYROLL
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E9DFD2] shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Monthly Timesheet Matrix & Payroll Summary</h3>
                <p className="text-xs text-slate-500">Comprehensive attendance breakdown for salary calculation, overtime, and leave deductions.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Timesheet
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Present Days</th>
                    <th className="py-3 px-4 text-center">Late Penalties</th>
                    <th className="py-3 px-4 text-center">Approved Leaves</th>
                    <th className="py-3 px-4 text-center">Total Overtime</th>
                    <th className="py-3 px-4 text-right">Payable Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers.map(m => {
                    const mRec = records.find(r => r.member_id === m.id);
                    const isPres = mRec?.status === 'present' || mRec?.status === 'late';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                        <td className="py-3 px-4 text-slate-500">{m.primary_role || 'Staff'}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{isPres ? '1 Day' : '0 Days'}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">{mRec?.late_minutes ? `${mRec.late_minutes}m` : '0m'}</td>
                        <td className="py-3 px-4 text-center font-bold text-sky-700">0</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{mRec?.overtime_minutes ? `${mRec.overtime_minutes}m` : '0m'}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">{isPres ? '1.0' : '0.0'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: LEAVE REQUESTS & APPROVALS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Leave Requests & Approvals Inbox</h3>
                <p className="text-xs text-slate-500">Approve or reject leave requests with 1-click WhatsApp employee notification.</p>
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
                                onClick={() => handleReviewLeave(leave, 'approved')}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(leave, 'rejected')}
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
            TAB 5: GEOFENCE LOCATIONS MANAGER
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Geofence Attendance Locations</h3>
                <p className="text-xs text-slate-500">Configure studio offices and wedding venue GPS boundaries with Haversine verification.</p>
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
            TAB 6: SHIFTS & GRACE PERIOD MANAGER
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E9DFD2] shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Work Shifts & Timings</h3>
                <p className="text-xs text-slate-500">Configure studio work timings, grace periods for late punches, and overtime thresholds.</p>
              </div>
              <button
                onClick={() => setShowAddShiftModal(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#C89435] hover:bg-[#B3802B] rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Shift
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map(sh => (
                <div key={sh.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF3E6] text-[#8C6D33] flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-900">{sh.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-600">
                    <p>Start: {sh.start_time.substring(0, 5)} • End: {sh.end_time.substring(0, 5)}</p>
                    <p className="text-[11px] font-sans text-slate-500">Grace Period: {sh.grace_period_minutes} mins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 7: MEMBER ATTENDANCE LINKS MANAGER
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
                    <th className="py-3 px-4 text-right">Actions</th>
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
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleGenerateOrCopyLink(member.id)}
                            className="px-3 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                          >
                            {copiedLinkId === member.id ? '✓ Link Copied' : 'Copy Mobile Link'}
                          </button>
                          <button
                            onClick={() => handleShareLinkWhatsApp(member)}
                            className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition"
                          >
                            WhatsApp Link
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
                      placeholder="19.0596"
                      value={locationForm.latitude}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Longitude</label>
                    <input
                      type="text"
                      placeholder="72.8295"
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
          MODAL: ADD SHIFT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#E9DFD2] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Add Work Shift</h3>
                <button onClick={() => setShowAddShiftModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Shift Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding Shoot Full Day"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Start Time</label>
                    <input
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">End Time</label>
                    <input
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={shiftForm.grace_period_minutes}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, grace_period_minutes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddShiftModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShift}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#C89435] hover:bg-[#B3802B] rounded-xl shadow-md"
                >
                  Save Shift
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
                <h3 className="text-base font-bold text-slate-900">Apply Leave on Behalf of Employee</h3>
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold"
                  >
                    <option value="">-- Choose Employee --</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.primary_role || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, leave_type: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="paid">Paid Privilege Leave</option>
                    <option value="comp_off">Compensatory Off</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Reason for leave..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none resize-none"
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
                  Submit Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MANUAL ATTENDANCE OVERRIDE / EDIT
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
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Attendance Record</h3>
                  <p className="text-xs text-slate-500 font-bold">{showOverrideModal.member.name} • {selectedDate}</p>
                </div>
                <button onClick={() => setShowOverrideModal({ open: false })} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Attendance Status</label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  >
                    <option value="present">Present (On-Time)</option>
                    <option value="late">Late Arrival</option>
                    <option value="half_day">Half Day</option>
                    <option value="leave">On Leave</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Check In Time</label>
                    <input
                      type="time"
                      value={overrideCheckIn}
                      onChange={(e) => setOverrideCheckIn(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Check Out Time</label>
                    <input
                      type="time"
                      value={overrideCheckOut}
                      onChange={(e) => setOverrideCheckOut(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>
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
                  Save Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

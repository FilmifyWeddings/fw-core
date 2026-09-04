'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Users, MapPin, CheckCircle2, XCircle, AlertTriangle, 
  Calendar, Coffee, Download, Plus, Search, Filter, RefreshCw, 
  Sparkles, Link2, Copy, Check, ShieldCheck, FileText, ChevronRight, 
  ChevronDown, Edit3, Trash2, X, ExternalLink, ArrowRight, UserCheck,
  Send, MessageCircle, Printer, Sliders, Globe, Camera, Award, Eye,
  UserPlus, Compass, Star, PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { 
  FWTeamMember, AttendanceRecord, AttendanceLocation, 
  AttendanceShift, AttendanceLeaveRequest, AttendanceMemberLink, AttendanceHoliday
} from '@/types';
import dynamic from 'next/dynamic';
import AttendanceErrorBoundary from '@/components/attendance/AttendanceErrorBoundary';
import { analyzeAttendanceRecordTiming, formatMinutesToHumanReadable } from '@/lib/attendance/time-calculations';
import StaffDetailsModal from './components/StaffDetailsModal';
import StaffAttendanceRoster from './components/StaffAttendanceRoster';
import MonthlyMatrixPayroll from './components/MonthlyMatrixPayroll';
import EditStaffAttendanceModal from './components/EditStaffAttendanceModal';
import AddTeamMemberModal from '@/components/attendance/AddTeamMemberModal';
import CompanyHolidayModal from '@/components/attendance/CompanyHolidayModal';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

const GeofenceMapPicker = dynamic(
  () => import('@/components/attendance/GeofenceMapPicker'),
  { ssr: false }
);

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'live' | 'matrix' | 'leaves'>('roster');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Punch Alert Toast state (5-second auto dismiss)
  const [punchAlert, setPunchAlert] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    if (!punchAlert) return;
    const timer = setTimeout(() => {
      setPunchAlert(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [punchAlert]);

  // Data states
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [shifts, setShifts] = useState<AttendanceShift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<AttendanceLeaveRequest[]>([]);
  const [memberLinks, setMemberLinks] = useState<AttendanceMemberLink[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<FWTeamMember | null>(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showKundaliModal, setShowKundaliModal] = useState<{ open: boolean; member: FWTeamMember | null }>({
    open: false,
    member: null
  });

  // Selected Geofence for Map Editor
  const [selectedLocation, setSelectedLocation] = useState<AttendanceLocation | null>(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    latitude: 19.0596,
    longitude: 72.8295,
    radius_meters: 150,
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

  // Helper to match any attendance record / link to a member by ID, alias ID, name, or email
  const isRecordForMember = useCallback((rec: any, mem: FWTeamMember | null | undefined) => {
    if (!rec || !mem) return false;
    if (rec.member_id === mem.id) return true;
    const aliasIds = (mem as any).aliasIds;
    if (aliasIds && Array.isArray(aliasIds) && aliasIds.includes(rec.member_id)) return true;
    const memName = (mem.name || '').trim().toLowerCase();
    const memEmail = (mem.email || '').trim().toLowerCase();
    if (rec.member?.name && memName && rec.member.name.trim().toLowerCase() === memName) return true;
    if (rec.member?.email && memEmail && rec.member.email.trim().toLowerCase() === memEmail) return true;
    if (rec.name && memName && rec.name.trim().toLowerCase() === memName) return true;
    return false;
  }, []);

  const fetchInHouseStaff = async (workspaceId?: string) => {
    // 1. Get logged-in admin user ID
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = workspaceId || user?.id;
    if (!targetUserId) return [];

    // 2. Fetch in-house staff scoped strictly to this user_id
    const { data: staffList, error } = await supabase
      .from('fw_team_members')
      .select('*')
      .eq('user_id', targetUserId)
      .or('primary_type.ilike.%in-house%,primary_type.ilike.%in_house%')
      .or('is_active.is.null,is_active.eq.true')
      .order('name', { ascending: true });

    if (error || !staffList) return [];

    // Strict deduplication by name & elimination of any marked as freelancer
    const seenNames = new Set<string>();
    const strictInHouse = staffList.filter((member: any) => {
      if (member.is_active === false || member.active_status === false) return false;

      const rawType = String(member.primary_type || '').toLowerCase().trim();
      const isFreelancer = rawType.includes('freelance') || 
        (member.name || '').toLowerCase().includes(' tp') || 
        (member.name || '').toLowerCase().includes(' ref');

      if (isFreelancer) return false;

      // Deduplicate duplicates in list
      const cleanName = (member.name || '').toLowerCase().trim();
      if (!cleanName || seenNames.has(cleanName)) return false;
      seenNames.add(cleanName);

      return rawType === 'in-house' || rawType === 'in_house';
    });

    return strictInHouse;
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // 1. Get logged-in admin user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const workspaceId = user.id;

      // 2. Fetch in-house staff scoped strictly to this user_id
      const { data: staffList, error } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('user_id', user.id)
        .or('primary_type.ilike.%in-house%,primary_type.ilike.%in_house%')
        .or('is_active.is.null,is_active.eq.true')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[attendance] Scoped staffList fetch warning:', error);
      }

      const rawMembers = staffList || [];

      // Deduplicate members and build Alias Map so updated emails never disconnect historical attendance
      const uniqueMembers: any[] = [];
      const memberAliasMap = new Map<string, Set<string>>();

      rawMembers.forEach((m: any) => {
        const cleanName = m.name ? m.name.trim().toLowerCase() : '';
        const cleanEmail = m.email ? m.email.trim().toLowerCase() : '';
        const cleanPhone = m.phone_number ? m.phone_number.replace(/\D/g, '') : '';

        const existing = uniqueMembers.find(u => {
          if (u.id === m.id) return true;
          const uEmail = u.email ? u.email.trim().toLowerCase() : '';
          const uName = u.name ? u.name.trim().toLowerCase() : '';
          const uPhone = u.phone_number ? u.phone_number.replace(/\D/g, '') : '';

          if (cleanEmail && uEmail && cleanEmail === uEmail) return true;
          if (cleanPhone && uPhone && cleanPhone.length > 5 && cleanPhone === uPhone) return true;
          if (cleanName && uName && cleanName === uName) return true;
          return false;
        });

        if (existing) {
          const aliasSet = memberAliasMap.get(existing.id) || new Set([existing.id]);
          aliasSet.add(m.id);
          memberAliasMap.set(existing.id, aliasSet);

          if (m.email && !existing.email) existing.email = m.email;
          if (m.phone_number && !existing.phone_number) existing.phone_number = m.phone_number;
          if (m.avatar_url && !existing.avatar_url) existing.avatar_url = m.avatar_url;
        } else {
          const aliasSet = new Set<string>([m.id]);
          memberAliasMap.set(m.id, aliasSet);
          uniqueMembers.push({ ...m });
        }
      });

      uniqueMembers.forEach(u => {
        const aliasSet = memberAliasMap.get(u.id) || new Set([u.id]);
        u.aliasIds = Array.from(aliasSet);
      });

      setTeamMembers(uniqueMembers);

      // 2. Fetch Attendance Records & attendance_logs for selected date strictly scoped to user_id
      let recQuery = supabase
        .from('attendance_records')
        .select('*, member:fw_team_members(*)')
        .eq('date', selectedDate)
        .eq('user_id', workspaceId);

      const { data: recordsData } = await recQuery;

      // Also query attendance_logs for selectedDate scoped strictly to member IDs in this workspace
      let logsData: any[] = [];
      if (uniqueMembers.length > 0) {
        const { data } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('date', selectedDate)
          .in('member_id', uniqueMembers.map(u => String(u.id)));
        logsData = data || [];
      }

      const mergedMap = new Map<string, any>();
      (recordsData || []).forEach((r: any) => {
        mergedMap.set(String(r.member_id), { ...r });
      });

      (logsData || []).forEach((log: any) => {
        const memId = String(log.member_id);
        const existing = mergedMap.get(memId);
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
          if (log.is_geofence_exempt !== undefined) existing.is_geofence_exempt = log.is_geofence_exempt;
          if (log.status && !existing.status) existing.status = log.status.toLowerCase();
        } else {
          mergedMap.set(memId, {
            id: log.id,
            log_id: log.id,
            member_id: log.member_id,
            user_id: workspaceId,
            workspace_id: workspaceId,
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
            check_in_lat: log.punch_in_lat,
            check_in_lng: log.punch_in_lng,
            check_out_lat: log.punch_out_lat,
            check_out_lng: log.punch_out_lng,
            work_duration_minutes: log.total_work_minutes || 0,
            total_work_minutes: log.total_work_minutes || 0,
            is_geofence_exempt: log.is_geofence_exempt || false,
            check_in_geofence_status: log.is_geofence_exempt ? 'verified' : (log.punch_in_lat ? 'verified' : 'no_geofence'),
            notes: log.notes
          });
        }
      });

      setRecords(Array.from(mergedMap.values()));

      // 3. Fetch Geofence Locations
      // 3. Fetch Geofence Locations via dedicated backend endpoint
      try {
        const locRes = await fetch('/api/attendance/locations');
        if (locRes.ok) {
          const { locations: locData } = await locRes.json();
          const locs = locData || [];
          setLocations(locs);
          if (locs.length > 0) {
            setSelectedLocation(prev => prev && locs.some((l: any) => l.id === prev.id) ? prev : locs[0]);
          }
        }
      } catch (locErr) {
        console.error('Error loading locations from API:', locErr);
      }

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

      // Trigger clear UI Toast
      setPunchAlert({
        message: 'Punch-in link copied to clipboard!',
        type: 'success'
      });
    } catch (err) {
      console.error('Copy link error:', err);
    }
  };

  // Share Link via WhatsApp
  const handleShareLinkWhatsApp = (member: FWTeamMember) => {
    const link = memberLinks.find(l => l.member_id === member.id);
    const fullUrl = `${window.location.origin}/attendance/${link?.secure_token || 'portal'}`;
    const phone = member.phone_number?.replace(/[^0-9]/g, '') || '';
    const text = encodeURIComponent(`Hi ${member.name},\nHere is your personal mobile attendance punch portal link for StudioCore:\n${fullUrl}\n\nPlease bookmark this link on your phone to punch in with selfie & GPS.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Save New Geofence Location
  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      alert('Please enter location name');
      return;
    }

    try {
      const res = await fetch('/api/attendance/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationForm.name.trim(),
          latitude: Number(locationForm.latitude) || 19.0596,
          longitude: Number(locationForm.longitude) || 72.8295,
          radius_meters: Number(locationForm.radius_meters) || 50,
          address: locationForm.address.trim()
        })
      });

      const data = await res.json();
      if (data.location) {
        setLocations(prev => [data.location, ...prev.filter(l => l.id !== data.location.id)]);
        setSelectedLocation(data.location);
      }

      setShowAddLocationModal(false);
    } catch (e) {
      console.error('Save location error:', e);
    }
  };

  // Update existing Geofence coordinates or radius
  const handleUpdateGeofenceOnMap = async (lat: number, lng: number, address?: string, placeName?: string, radius?: number) => {
    if (!selectedLocation) return;
    const updated = {
      ...selectedLocation,
      name: placeName || selectedLocation.name,
      latitude: lat,
      longitude: lng,
      address: address || selectedLocation.address,
      radius_meters: radius ?? selectedLocation.radius_meters
    };

    setSelectedLocation(updated);
    setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));

    try {
      await fetch('/api/attendance/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error('Error updating geofence on map:', e);
    }
  };

  // Delete Geofence
  const handleDeleteGeofence = async (locId: string) => {
    if (!confirm('Are you sure you want to delete this geofence venue?')) return;
    setLocations(prev => prev.filter(l => l.id !== locId));
    if (selectedLocation?.id === locId) {
      setSelectedLocation(locations.find(l => l.id !== locId) || null);
    }
    try {
      await fetch(`/api/attendance/locations?id=${locId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error deleting geofence:', e);
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
        is_overnight: false,
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

  // ── 1. Strictly In-House Staff Filter (Using primary_type & member_types) ──
  const strictInHouse = useMemo(() => {
    const seenNames = new Set<string>();
    return teamMembers.filter((member: any) => {
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
  }, [teamMembers]);

  // Use strictInHouse for all Attendance Roster tables and header counts
  const inHouseStaff = strictInHouse;

  // ── 2. Live 1-Second Continuous Work Timer ──
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Check if punch log missed punch out (punch_in exists, punch_out is null, and log is from past date or >16h old)
  const isMissedPunchOut = useCallback((inTimeStr?: string | null, outTimeStr?: string | null, recordDate?: string): boolean => {
    if (!inTimeStr || outTimeStr) return false;
    const todayIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (recordDate && recordDate < todayIst) return true;
    const elapsedHours = (nowTick - new Date(inTimeStr).getTime()) / (1000 * 60 * 60);
    return elapsedHours >= 16;
  }, [nowTick]);

  // ── 3. Direct Punch In / Out Actions targeting attendance_logs ──
  const [punchingMemberId, setPunchingMemberId] = useState<string | null>(null);

  const handlePunchIn = async (member: FWTeamMember) => {
    setPunchingMemberId(member.id);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = selectedDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

      let punchLat: number | null = null;
      let punchLng: number | null = null;

      const isExempt = Boolean(
        member.is_geofence_exempt || 
        (member as any).geofence_required === false ||
        (member.custom_data as any)?.is_geofence_exempt ||
        (member.custom_data as any)?.allow_anywhere
      );

      // Location Check strictly at the moment of Punch In (unless is_geofence_exempt is true)
      if (!isExempt) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported by browser'));
            } else {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
              });
            }
          });

          punchLat = position.coords.latitude;
          punchLng = position.coords.longitude;

          const officeLat = Number(member.latitude) || Number((member.custom_data as any)?.latitude);
          const officeLng = Number(member.longitude) || Number((member.custom_data as any)?.longitude);
          const allowedRadius = Number(member.radius_meters) || Number((member.custom_data as any)?.radius_meters) || 150;

          if (officeLat && officeLng) {
            const R = 6371e3;
            const φ1 = punchLat * Math.PI / 180;
            const φ2 = officeLat * Math.PI / 180;
            const Δφ = (officeLat - punchLat) * Math.PI / 180;
            const Δλ = (officeLng - punchLng) * Math.PI / 180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const dist = R * c;

            if (dist > allowedRadius) {
              const proceed = window.confirm(
                `⚠️ Location Alert: You are ${Math.round(dist)}m away from assigned office (allowed radius: ${allowedRadius}m).\n\nDo you want to proceed with Punch In anyway?`
              );
              if (!proceed) {
                setPunchingMemberId(null);
                return;
              }
            }
          }
        } catch (geoErr) {
          console.warn('Geolocation notice on punch in:', geoErr);
          const proceedWithoutGps = window.confirm(
            '⚠️ GPS signal unavailable or permission denied. Proceed with Punch In without GPS verification?'
          );
          if (!proceedWithoutGps) {
            setPunchingMemberId(null);
            return;
          }
        }
      }

      // Calculate early/late minutes for arrival timing indicator
      const shiftStartTimeStr = member.shift_start || shifts[0]?.start_time || '10:00';
      const [shiftH = 10, shiftM = 0] = shiftStartTimeStr.split(':').map(Number);
      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const shiftTotalMins = shiftH * 60 + shiftM;
      const nowTotalMins = nowH * 60 + nowM;
      const diffMins = nowTotalMins - shiftTotalMins;

      let arrivalIndicator = 'On time';
      let alertType: 'success' | 'warning' = 'success';
      const earlyMinutes = diffMins < 0 ? Math.abs(diffMins) : 0;
      const lateMinutes = diffMins > 0 ? diffMins : 0;
      const isLate = diffMins > 0;

      if (diffMins < -1) {
        arrivalIndicator = `Arrived ${earlyMinutes}m early`;
      } else if (diffMins > 0) {
        arrivalIndicator = `Arrived ${lateMinutes}m late`;
        alertType = 'warning';
      }

      // Save to Supabase attendance_logs table
      const { error: logErr } = await supabase
        .from('attendance_logs')
        .insert([{
          member_id: String(member.id),
          member_name: member.name,
          date: todayStr,
          punch_in_time: nowIso,
          punch_in_lat: punchLat,
          punch_in_lng: punchLng,
          early_minutes: earlyMinutes,
          late_minutes: lateMinutes,
          is_late: isLate,
          is_geofence_exempt: isExempt,
          status: 'PRESENT'
        }]);

      if (logErr) {
        console.error('attendance_logs insert error:', logErr);
      }

      // Dual-sync to attendance_records for backward compatibility
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const workspaceId = session?.user?.id || 'ws_demo';
        await supabase
          .from('attendance_records')
          .upsert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            member_id: member.id,
            date: todayStr,
            status: 'present',
            check_in_time: nowIso,
            check_in_lat: punchLat,
            check_in_lng: punchLng,
            check_in_verified: true,
            check_in_geofence_status: isExempt ? 'verified' : (punchLat ? 'verified' : 'no_geofence'),
            updated_at: nowIso
          }], { onConflict: 'member_id,date' });
      } catch (recSyncErr) {
        console.warn('attendance_records sync notice:', recSyncErr);
      }

      setPunchAlert({
        message: `${member.name}: Checked in successfully • ${arrivalIndicator}`,
        type: alertType
      });

      await fetchAttendanceData();
    } catch (err: any) {
      console.error('Punch in error:', err);
      alert(`Error during Punch In: ${err.message || err}`);
    } finally {
      setPunchingMemberId(null);
    }
  };

  const handlePunchOut = async (member: FWTeamMember, record: any) => {
    setPunchingMemberId(member.id);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const punchInTime = record.punch_in_time || record.check_in_time;
      const startMs = punchInTime ? new Date(punchInTime).getTime() : now.getTime();
      const endMs = now.getTime();
      const calculatedMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));

      let punchLat: number | null = null;
      let punchLng: number | null = null;
      try {
        if (navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          punchLat = pos.coords.latitude;
          punchLng = pos.coords.longitude;
        }
      } catch (_) {}

      // Update Supabase attendance_logs
      let updateLogQ = supabase
        .from('attendance_logs')
        .update({
          punch_out_time: nowIso,
          punch_out_lat: punchLat,
          punch_out_lng: punchLng,
          total_work_minutes: calculatedMinutes,
          status: 'COMPLETED'
        });

      if (record.log_id) {
        updateLogQ = updateLogQ.eq('id', record.log_id);
      } else {
        updateLogQ = updateLogQ.eq('member_id', String(member.id)).eq('date', record.date || selectedDate);
      }

      const { error: logUpdateErr } = await updateLogQ;
      if (logUpdateErr) console.warn('attendance_logs update notice:', logUpdateErr);

      // Dual-update attendance_records
      try {
        await supabase
          .from('attendance_records')
          .update({
            check_out_time: nowIso,
            check_out_lat: punchLat,
            check_out_lng: punchLng,
            check_out_verified: true,
            work_duration_minutes: calculatedMinutes,
            total_work_minutes: calculatedMinutes,
            status: 'present',
            updated_at: nowIso
          })
          .eq('member_id', member.id)
          .eq('date', record.date || selectedDate);
      } catch (_) {}

      const hours = Math.floor(calculatedMinutes / 60);
      const mins = calculatedMinutes % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      setPunchAlert({
        message: `${member.name}: Checked out successfully • Worked ${durationStr}`,
        type: 'success'
      });

      await fetchAttendanceData();
    } catch (err: any) {
      console.error('Punch out error:', err);
      alert(`Error during Punch Out: ${err.message || err}`);
    } finally {
      setPunchingMemberId(null);
    }
  };

  // Export Timesheet to CSV
  const handleExportCSV = () => {
    if (inHouseStaff.length === 0) return;

    const headers = ['Employee Name', 'Role', 'Date', 'Status', 'Check In (IST)', 'Check Out (IST)', 'Active Duration', 'Late (Mins)', 'Overtime (Mins)'];
    const rows = inHouseStaff.map(member => {
      const rec = records.find(r => isRecordForMember(r, member));
      const inTime = rec?.check_in_time || rec?.punch_in_time;
      const outTime = rec?.check_out_time || rec?.punch_out_time;
      return [
        member.name,
        member.primary_role || 'Crew',
        selectedDate,
        rec?.status || 'absent',
        inTime ? new Date(inTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        outTime ? new Date(outTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        rec?.work_duration_minutes || rec?.total_work_minutes || 0,
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

  // Summaries calculation strictly for in-house workforce
  const totalEmployees = inHouseStaff.length;
  const lateCount = records.filter(r => {
    const mem = inHouseStaff.find(m => isRecordForMember(r, m));
    if (!mem) return false;
    const t = analyzeAttendanceRecordTiming(r, mem);
    return t.isLate;
  }).length;
  const presentCount = inHouseStaff.filter(m => records.some(r => isRecordForMember(r, m) && (r.check_in_time || r.punch_in_time))).length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const onLeaveCount = leaveRequests.filter(l => l.status === 'approved' && l.start_date <= selectedDate && l.end_date >= selectedDate).length;
  const liveWorkingCount = inHouseStaff.filter(m => records.some(r => isRecordForMember(r, m) && (r.check_in_time || r.punch_in_time) && !(r.check_out_time || r.punch_out_time))).length;

  if (loading) {
    return <StudioCoreLiquidLoader label="Loading Attendance Roster..." />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-slate-900 pb-24 pt-2 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & ACTION CONTROLS
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#E9DFD2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600" />
            <h1 className="text-base font-bold text-slate-900">Workforce &amp; Smart Attendance</h1>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Date Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Holidays & Leaves Trigger */}
            <button
              onClick={() => setShowHolidayModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Holidays &amp; Leaves</span>
            </button>

            {/* Export CSV Trigger */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            {/* Apply Leave Trigger */}
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Apply Leave</span>
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
                Studio &amp; Event Venues
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
              { id: 'roster', label: 'Daily Roster (IST)', icon: Clock },
              { id: 'live', label: 'Live Floor View', icon: Users },
              { id: 'matrix', label: 'Monthly Matrix & Payroll', icon: Calendar },
              { id: 'leaves', label: 'Leaves & Approvals', icon: Coffee },
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
            TAB 1: DAILY ROSTER (STAFF ATTENDANCE ROSTER)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'roster' && (
          <StaffAttendanceRoster
            members={inHouseStaff}
            records={records}
            selectedDate={selectedDate}
            shifts={shifts}
            onOpenDetails={(member) => setShowKundaliModal({ open: true, member })}
            onEditMember={(member) => {
              setMemberToEdit(member);
            }}
            onPunchIn={handlePunchIn}
            onPunchOut={handlePunchOut}
            punchingMemberId={punchingMemberId}
            onGenerateOrCopyLink={handleGenerateOrCopyLink}
            copiedLinkId={copiedLinkId}
            onOverride={(member, record) => {
              setShowOverrideModal({
                open: true,
                member,
                record: record || undefined
              });
            }}
          />
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

            {inHouseStaff.filter(m => records.some(r => isRecordForMember(r, m) && (r.check_in_time || r.punch_in_time) && !(r.check_out_time || r.punch_out_time))).length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">No in-house staff currently clocked-in on duty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inHouseStaff.filter(m => records.some(r => isRecordForMember(r, m) && (r.check_in_time || r.punch_in_time) && !(r.check_out_time || r.punch_out_time))).map(mem => {
                  const rec = records.find(r => isRecordForMember(r, mem));
                  const inTime = rec?.punch_in_time || rec?.check_in_time;
                  return (
                    <div key={mem.id} className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center text-xs overflow-hidden shrink-0 border border-emerald-300">
                            {mem.avatar_url ? (
                              <img src={mem.avatar_url} alt={mem.name} className="w-full h-full object-cover" />
                            ) : (
                              mem.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900">{mem.name}</h4>
                            <p className="text-[10px] font-semibold text-slate-500">{mem.primary_role || 'In-House Staff'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Clocked In
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Started At (IST)</span>
                          <p className="font-mono font-bold text-slate-800">
                            {inTime ? new Date(inTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Duration</span>
                          <p className="font-mono font-bold text-emerald-700 flex items-center gap-1 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            {formatLiveDuration(inTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: MONTHLY TIMESHEET MATRIX & PAYROLL
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'matrix' && (
          <MonthlyMatrixPayroll
            members={inHouseStaff}
            shifts={shifts}
            leaveRequests={leaveRequests}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: LEAVE REQUESTS & APPROVALS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Leave Requests &amp; Approvals Inbox</h3>
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

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: STAFF MEMBER DETAILS & ANALYTICS MODAL
      ───────────────────────────────────────────────────────────── */}
      <AttendanceErrorBoundary fallbackTitle="Could not load Staff Details Modal">
        {showKundaliModal.open && showKundaliModal.member && (
          <StaffDetailsModal
            isOpen={showKundaliModal.open}
            onClose={() => setShowKundaliModal({ open: false, member: null })}
            member={showKundaliModal.member}
            records={records}
            shifts={shifts}
            onUpdateRecord={async (id, updates) => {
              setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
              await supabase.from('attendance_records').update(updates).eq('id', id);
            }}
          />
        )}
      </AttendanceErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT STAFF ATTENDANCE & WORK SHIFT TIMINGS
      ───────────────────────────────────────────────────────────── */}
      <AttendanceErrorBoundary fallbackTitle="Could not load Edit Staff Attendance Modal">
        {memberToEdit && (
          <EditStaffAttendanceModal
            isOpen={!!memberToEdit}
            onClose={() => setMemberToEdit(null)}
            member={memberToEdit}
            onMemberUpdated={(updated) => {
              if (updated && updated.id) {
                setTeamMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
              }
              fetchAttendanceData();
            }}
          />
        )}
      </AttendanceErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ONBOARD NEW TEAM MEMBER & MAGIC LINK
      ───────────────────────────────────────────────────────────── */}
      <AttendanceErrorBoundary fallbackTitle="Could not load Staff Profile Modal">
        {showAddMemberModal && (
          <AddTeamMemberModal
            isOpen={showAddMemberModal}
            onClose={() => {
              setShowAddMemberModal(false);
              setMemberToEdit(null);
            }}
            memberToEdit={null}
            locations={locations}
            shifts={shifts}
            onMemberCreated={fetchAttendanceData}
          />
        )}
      </AttendanceErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: COMPANY HOLIDAY & FESTIVE CALENDAR
      ───────────────────────────────────────────────────────────── */}
      <AttendanceErrorBoundary fallbackTitle="Could not load Company Holiday Calendar">
        {showHolidayModal && (
          <CompanyHolidayModal
            isOpen={showHolidayModal}
            onClose={() => setShowHolidayModal(false)}
            onHolidayUpdated={fetchAttendanceData}
          />
        )}
      </AttendanceErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD GEOFENCE VENUE
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddLocationModal && (
          <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
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
                    placeholder="e.g. Udaipur Palace Wedding Venue"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="19.0596"
                      value={locationForm.latitude}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="72.8295"
                      value={locationForm.longitude}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
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
                    onChange={(e) => setLocationForm(prev => ({ ...prev, radius_meters: parseInt(e.target.value) || 150 }))}
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
          <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
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
          <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
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
                    {inHouseStaff.map(m => (
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
          <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
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
                    <label className="text-xs font-bold text-slate-700">Check In Time (IST)</label>
                    <input
                      type="time"
                      value={overrideCheckIn}
                      onChange={(e) => setOverrideCheckIn(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Check Out Time (IST)</label>
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

      {/* ─────────────────────────────────────────────────────────────
          5-SECOND AUTO-DISMISSING PUNCH ALERT TOAST
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {punchAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-6 right-6 z-[100060] max-w-md bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 font-sans"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              punchAlert.type === 'warning' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white tracking-wide truncate">{punchAlert.message}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Studio Core Smart Attendance</p>
            </div>
            <button
              onClick={() => setPunchAlert(null)}
              className="text-slate-400 hover:text-white p-1 transition rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

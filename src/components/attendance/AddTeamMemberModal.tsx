'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserPlus, Send, Sparkles, MessageCircle, MapPin, Clock, 
  DollarSign, RefreshCw, Upload, Camera, Check, Plus, Edit2, 
  Trash2, ShieldCheck, Map, Layers, Sun, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember, AttendanceLocation, AttendanceShift, StaffRole } from '@/types';
import GooglePlacesGeofenceMap from '@/components/attendance/GooglePlacesGeofenceMap';
import { compressStaffAvatar, uploadStaffAvatar } from '@/lib/attendance/avatar-compression';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: FWTeamMember | null;
  locations?: AttendanceLocation[];
  shifts?: AttendanceShift[];
  onMemberCreated?: (member?: FWTeamMember) => void;
}

const DEFAULT_ROLES = [
  'Senior Cinematographer',
  'Lead Photographer',
  'Traditional Videographer',
  'Senior Video Editor',
  'Album & Layout Designer',
  'Drone Pilot',
  'Colorist & Post Supervisor',
  'Studio Production Manager',
  'Lighting & Sound Tech',
  'Studio Assistant'
];

const DAYS_OF_WEEK = [
  { key: 'Sun', label: 'Sun' },
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
];

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  memberToEdit,
  locations = [],
  shifts = [],
  onMemberCreated
}: AddTeamMemberModalProps) {
  const isEditMode = !!memberToEdit;
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedRole, setSelectedRole] = useState('Senior Cinematographer');

  // Custom Dynamic Roles
  const [dbRoles, setDbRoles] = useState<StaffRole[]>([]);
  const [isAddingNewRole, setIsAddingNewRole] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Geofence & Location
  const [latitude, setLatitude] = useState(19.0596);
  const [longitude, setLongitude] = useState(72.8295);
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [locationName, setLocationName] = useState('Studio Main Office');

  // Work Timings & Compensation
  const [shiftStart, setShiftStart] = useState('10:00');
  const [shiftEnd, setShiftEnd] = useState('19:00');
  const [dailyRate, setDailyRate] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');

  // Weekly Offs Multi-Select
  const [weeklyOffs, setWeeklyOffs] = useState<string[]>(['Sun']);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset form on open / member change
  useEffect(() => {
    if (isOpen) {
      fetchStaffRoles();

      if (memberToEdit) {
        setName(memberToEdit.name || '');
        setPhoneNumber(memberToEdit.phone_number || '');
        setWhatsappNumber(memberToEdit.whatsapp_number || memberToEdit.phone_number || '');
        // Clean out internal fallback emails so user sees clean empty input
        const rawEmail = memberToEdit.email || '';
        setEmail(rawEmail.includes('@internal.') ? '' : rawEmail);
        setAvatarUrl(memberToEdit.avatar_url || '');
        setSelectedRole(memberToEdit.primary_role || 'Senior Cinematographer');

        const custom = (memberToEdit.custom_data as any) || {};
        let parsedNotes: any = {};
        try {
          if (memberToEdit.notes && memberToEdit.notes.startsWith('{')) parsedNotes = JSON.parse(memberToEdit.notes);
        } catch (_) {}

        const editLat = Number(memberToEdit.latitude) || Number(custom.latitude) || Number(parsedNotes.latitude) || (locations[0]?.latitude ? Number(locations[0].latitude) : 19.0596);
        const editLng = Number(memberToEdit.longitude) || Number(custom.longitude) || Number(parsedNotes.longitude) || (locations[0]?.longitude ? Number(locations[0].longitude) : 72.8295);
        const editRadius = Number(memberToEdit.radius_meters) || Number(custom.radius_meters) || Number(parsedNotes.radius_meters) || (locations[0]?.radius_meters ? Number(locations[0].radius_meters) : 150);
        const editLocationName = memberToEdit.location_name || custom.location_name || parsedNotes.location_name || locations[0]?.name || 'Studio Main Office';

        setLatitude(editLat);
        setLongitude(editLng);
        setRadiusMeters(editRadius);
        setLocationName(editLocationName);

        const editShiftStart = memberToEdit.shift_start ? memberToEdit.shift_start.slice(0, 5) : (custom.shift_start ? custom.shift_start.slice(0, 5) : '10:00');
        const editShiftEnd = memberToEdit.shift_end ? memberToEdit.shift_end.slice(0, 5) : (custom.shift_end ? custom.shift_end.slice(0, 5) : '19:00');
        setShiftStart(editShiftStart);
        setShiftEnd(editShiftEnd);

        const editDailyRate = memberToEdit.daily_rate ? String(memberToEdit.daily_rate) : (custom.daily_rate ? String(custom.daily_rate) : '');
        const editMonthlySalary = memberToEdit.monthly_salary ? String(memberToEdit.monthly_salary) : (custom.monthly_salary ? String(custom.monthly_salary) : '');
        setDailyRate(editDailyRate);
        setMonthlySalary(editMonthlySalary);

        const editWeeklyOffs = Array.isArray(memberToEdit.weekly_offs) ? memberToEdit.weekly_offs : (Array.isArray(custom.weekly_offs) ? custom.weekly_offs : ['Sun']);
        setWeeklyOffs(editWeeklyOffs);
        setCompressedSizeKb(null);
      } else {
        // Reset to clean defaults
        setName('');
        setPhoneNumber('');
        setWhatsappNumber('');
        setEmail('');
        setAvatarUrl('');
        setSelectedRole(DEFAULT_ROLES[0]);
        setLatitude(locations[0]?.latitude ? Number(locations[0].latitude) : 19.0596);
        setLongitude(locations[0]?.longitude ? Number(locations[0].longitude) : 72.8295);
        setRadiusMeters(locations[0]?.radius_meters ? Number(locations[0].radius_meters) : 150);
        setLocationName(locations[0]?.name || 'Studio Main Office');
        setShiftStart('10:00');
        setShiftEnd('19:00');
        setDailyRate('3500');
        setMonthlySalary('45000');
        setWeeklyOffs(['Sun']);
        setCompressedSizeKb(null);
      }
    }
  }, [isOpen, memberToEdit]);

  // Fetch custom staff roles from Supabase and LocalStorage
  const fetchStaffRoles = async () => {
    // 1. Read local storage cache first
    try {
      const cached = localStorage.getItem('studiocore_custom_roles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setDbRoles(parsed.map(r => typeof r === 'string' ? { id: `local_${r}`, workspace_id: 'ws_demo', role_name: r } : r));
        }
      }
    } catch (_) {}

    // 2. Fetch from Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      let query = supabase.from('staff_roles').select('*').order('role_name', { ascending: true });
      if (workspaceId !== 'ws_demo') {
        query = query.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setDbRoles(prev => {
          const map = new Map<string, StaffRole>();
          prev.forEach(r => map.set(r.role_name.toLowerCase(), r));
          data.forEach(r => map.set(r.role_name.toLowerCase(), r));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Error fetching staff roles:', e);
    }
  };

  // Combine default roles with custom database roles
  const allRolesList = Array.from(
    new Set([...DEFAULT_ROLES, ...dbRoles.map(r => r.role_name)])
  );

  // Handle Dynamic Role Inline Creation
  const handleCreateCustomRole = async () => {
    const roleTrimmed = newRoleInput.trim();
    if (!roleTrimmed) return;
    setSavingRole(true);

    const tempRoleObj: StaffRole = {
      id: `role_${Date.now()}`,
      workspace_id: 'ws_user',
      role_name: roleTrimmed,
      created_at: new Date().toISOString()
    };

    // 1. Optimistically update local state immediately
    setDbRoles(prev => {
      const exists = prev.some(r => r.role_name.toLowerCase() === roleTrimmed.toLowerCase());
      const updated = exists ? prev : [...prev, tempRoleObj];
      try {
        localStorage.setItem('studiocore_custom_roles', JSON.stringify(updated.map(r => r.role_name)));
      } catch (_) {}
      return updated;
    });

    // 2. Select and close modal input immediately
    setSelectedRole(roleTrimmed);
    setNewRoleInput('');
    setIsAddingNewRole(false);
    setSavingRole(false);

    // 3. Background persist to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id;
      if (workspaceId) {
        await supabase
          .from('staff_roles')
          .insert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            role_name: roleTrimmed
          }])
          .select('*');
      }
    } catch (e) {
      console.warn('Background role save notice:', e);
    }
  };

  // Handle Client-Side Compressed Image Upload (50KB–80KB WebP)
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressStaffAvatar(file, 400, 400);
      setCompressedSizeKb(compressed.sizeKb);

      // Upload to Supabase Storage or get base64
      const uploadedUrl = await uploadStaffAvatar(file, name || 'staff_member');
      setAvatarUrl(uploadedUrl);
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Failed to compress image. Please try another image.');
    } finally {
      setCompressing(false);
    }
  };

  // Toggle Weekly Off Day Pill
  const toggleWeeklyOff = (dayKey: string) => {
    setWeeklyOffs(prev => {
      if (prev.includes(dayKey)) {
        return prev.length === 1 ? prev : prev.filter(d => d !== dayKey);
      } else {
        return [...prev, dayKey];
      }
    });
  };

  // Handle Form Submit (Save / Update to Supabase)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) {
      alert('Please enter staff name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // Ensure a valid non-empty string is provided if database still enforces NOT NULL constraint on email
      const safeEmail = email.trim() || (memberToEdit?.email && !memberToEdit.email.includes('@internal.') ? memberToEdit.email : `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@internal.studiocore.in`);

      const customDataObj = {
        latitude: Number(latitude) || 19.0596,
        longitude: Number(longitude) || 72.8295,
        radius_meters: Number(radiusMeters) || 150,
        location_name: locationName.trim() || 'Studio Main Office',
        shift_start: shiftStart || '10:00:00',
        shift_end: shiftEnd || '19:00:00',
        weekly_offs: weeklyOffs,
        daily_rate: parseFloat(dailyRate) || 0,
        monthly_salary: parseFloat(monthlySalary) || 0,
        whatsapp_number: whatsappNumber.trim() || phoneNumber.trim()
      };

      const payload: Record<string, any> = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        name: name.trim(),
        primary_role: selectedRole,
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim() || phoneNumber.trim(),
        email: safeEmail,
        avatar_url: avatarUrl || null,
        latitude: Number(latitude) || 19.0596,
        longitude: Number(longitude) || 72.8295,
        radius_meters: Number(radiusMeters) || 150,
        location_name: locationName.trim() || 'Studio Main Office',
        shift_start: shiftStart || '10:00:00',
        shift_end: shiftEnd || '19:00:00',
        weekly_offs: weeklyOffs,
        daily_rate: parseFloat(dailyRate) || 0,
        monthly_salary: parseFloat(monthlySalary) || 0,
        custom_data: customDataObj,
        is_active: true,
        active_status: true,
        updated_at: new Date().toISOString()
      };

      let savedMember: FWTeamMember | null = null;
      let currentPayload = { ...payload };

      if (isEditMode && memberToEdit?.id) {
        // UPDATE EXISTING MEMBER WITH DYNAMIC COLUMN STRIPPING
        for (let attempt = 0; attempt < 8; attempt++) {
          const res = await supabase
            .from('fw_team_members')
            .update(currentPayload)
            .eq('id', memberToEdit.id)
            .select('*')
            .single();

          if (!res.error) {
            savedMember = res.data;
            break;
          }

          const errMsg = res.error.message || '';
          const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
          if (match && match[1]) {
            delete currentPayload[match[1]];
          } else {
            console.warn('Member update attempt notice:', errMsg);
            break;
          }
        }

        if (!savedMember) {
          const fallbackPayload = {
            name: name.trim(),
            primary_role: selectedRole,
            phone_number: phoneNumber.trim(),
            email: safeEmail,
            avatar_url: avatarUrl || null,
            updated_at: new Date().toISOString()
          };
          const { data: fbData, error: fbErr } = await supabase
            .from('fw_team_members')
            .update(fallbackPayload)
            .eq('id', memberToEdit.id)
            .select('*')
            .single();
          if (fbErr) throw fbErr;
          savedMember = fbData;
        }
      } else {
        // INSERT NEW MEMBER WITH DYNAMIC COLUMN STRIPPING
        for (let attempt = 0; attempt < 8; attempt++) {
          const res = await supabase
            .from('fw_team_members')
            .insert([{ ...currentPayload, created_at: new Date().toISOString() }])
            .select('*')
            .single();

          if (!res.error) {
            savedMember = res.data;
            break;
          }

          const errMsg = res.error.message || '';
          const match = errMsg.match(/Could not find the '([^']+)' column/i) || errMsg.match(/column "([^"]+)" of relation/i);
          if (match && match[1]) {
            delete currentPayload[match[1]];
          } else {
            console.warn('Member insert attempt notice:', errMsg);
            break;
          }
        }

        if (!savedMember) {
          const fallbackInsert = {
            user_id: workspaceId,
            name: name.trim(),
            primary_role: selectedRole,
            phone_number: phoneNumber.trim(),
            email: safeEmail,
            avatar_url: avatarUrl || null,
            created_at: new Date().toISOString()
          };
          const { data: fbData, error: fbErr } = await supabase
            .from('fw_team_members')
            .insert([fallbackInsert])
            .select('*')
            .single();
          if (fbErr) throw fbErr;
          savedMember = fbData;
        }

        // Generate personalized mobile attendance token
        if (savedMember?.id) {
          const memberId = savedMember.id;
          const secureToken = `att_${memberId.slice(0, 6)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
          await supabase.from('attendance_member_links').insert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            member_id: memberId,
            secure_token: secureToken,
            is_active: true,
            created_at: new Date().toISOString()
          }]);

          // Optional WhatsApp invite trigger
          const portalUrl = `${window.location.origin}/attendance/${secureToken}`;
          const cleanPhone = (whatsappNumber || phoneNumber).replace(/[^0-9]/g, '');
          if (cleanPhone) {
            const waMsg = encodeURIComponent(
              `Hi ${name},\nWelcome to the team! 🎉\nHere is your personal mobile attendance punch portal link for StudioCore:\n${portalUrl}\n\nPlease bookmark this link on your phone to punch in with selfie & GPS when reporting on duty.`
            );
            window.open(`https://wa.me/${cleanPhone}?text=${waMsg}`, '_blank');
          }
        }
      }

      if (onMemberCreated) onMemberCreated(savedMember || undefined);
      onClose();
    } catch (err: any) {
      console.error('Save staff error:', err);
      alert(`Error saving staff profile: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-sans overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-3xl w-full border border-[#EAE5DA] shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-900"
        >
          {/* Top Modal Header */}
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs border border-amber-200">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isEditMode ? `Edit Staff Profile: ${memberToEdit.name}` : 'Onboard Staff & Team Member'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isEditMode 
                    ? 'Update profile details, geofence perimeter, shift timings and compensation.' 
                    : 'Add crew member, compress profile photo, configure geofence radius & shift rules.'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">

            {/* ── 1. AVATAR COMPRESSION & CORE CONTACT INFO ── */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Camera className="w-4 h-4 text-amber-600" />
                Staff Profile & Biometric Photo
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Avatar Preview & Upload Trigger */}
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 overflow-hidden flex items-center justify-center shadow-xs">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-amber-700" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    Change
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileSelected}
                  />
                </div>

                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {compressing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <Upload className="w-3.5 h-3.5" />}
                      {compressing ? 'Compressing WebP...' : 'Upload Profile Photo'}
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => { setAvatarUrl(''); setCompressedSizeKb(null); }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 rounded-lg text-xs"
                        title="Remove Avatar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {compressedSizeKb !== null && (
                    <p className="text-[11px] font-black text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      Compressed to {compressedSizeKb} KB (WebP Retina Quality)
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Automatic client-side canvas compression ensures file size strictly between 50KB–80KB.
                  </p>
                </div>
              </div>

              {/* Name, Phone, WhatsApp, Email Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vicky Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Primary Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (!whatsappNumber) setWhatsappNumber(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email ID (Optional)</label>
                  <input
                    type="email"
                    placeholder="staff@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>

            {/* ── 2. DYNAMIC ROLES ENGINE ── */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Primary Studio Role
                </h4>
                {!isAddingNewRole && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewRole(true)}
                    className="px-2.5 py-1 text-[11px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> + Add New Role
                  </button>
                )}
              </div>

              {isAddingNewRole ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <label className="font-bold text-amber-900 text-xs">Create Custom Studio Role:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Lead Colorist, Drone Director, Album Stylist..."
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCustomRole();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomRole}
                      disabled={savingRole || !newRoleInput.trim()}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-lg text-xs shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {savingRole ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save Role
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingNewRole(false); setNewRoleInput(''); }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsAddingNewRole(true);
                      } else {
                        setSelectedRole(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                  >
                    {allRolesList.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="__add_new__">+ Add Custom Role...</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── 3. ASSIGNED GEOFENCE LOCATION (GOOGLE PLACES + SATELLITE MAP) ── */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Assigned Geofence Location &amp; Perimeter
                </h4>
                <span className="text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Allowed Radius: {radiusMeters} Meters
                </span>
              </div>

              {/* Embedded Satellite Map with Google Places Autocomplete & Radius Slider */}
              <div className="rounded-2xl overflow-hidden border border-[#EAE5DA]">
                <GooglePlacesGeofenceMap
                  latitude={latitude}
                  longitude={longitude}
                  radiusMeters={radiusMeters}
                  locationName={locationName}
                  height="360px"
                  onCoordinatesChange={(lat, lng, addr, placeName) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    if (placeName) setLocationName(placeName);
                    else if (addr) setLocationName(addr);
                  }}
                  onRadiusChange={(r) => setRadiusMeters(r)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">Selected Location / Venue Address</label>
                <input
                  type="text"
                  placeholder="e.g. Studio Main Office, Bandra West, Mumbai"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* ── 4. WORK TIMINGS & COMPENSATION ── */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Work Shift Timings & Compensation Rates
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Daily Shoot Day Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="3500"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ── 5. WEEKLY OFF SELECTOR ── */}
            <div className="p-5 bg-white rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sun className="w-4 h-4 text-amber-600" />
                Assigned Weekly Off Days
              </h4>

              <div className="flex flex-wrap gap-2 pt-1">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = weeklyOffs.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleWeeklyOff(day.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        isSelected 
                          ? 'bg-amber-400 text-slate-900 border border-amber-500 scale-105 shadow-xs' 
                          : 'bg-[#FAF9F5] hover:bg-slate-100 text-slate-600 border border-[#EAE5DA]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{day.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                Weekly off days are automatically recognized and marked as non-working on shift logs.
              </p>
            </div>

            {/* ── SUBMIT BUTTONS ── */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#EAE5DA]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || compressing}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : isEditMode ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {submitting ? 'Saving Profile...' : isEditMode ? 'Update Staff Profile' : 'Onboard Team Member'}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

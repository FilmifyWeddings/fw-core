'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Calendar, ShieldCheck, Check, 
  RefreshCw, MapPin, Sparkles, UserCheck, Lock 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember } from '@/types';

const GeofenceMapPicker = dynamic(
  () => import('@/components/attendance/GeofenceMapPicker'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[240px] bg-slate-100 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
        Loading Interactive Map...
      </div>
    ) 
  }
);

interface EditStaffAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember | null;
  onMemberUpdated?: (updatedMember?: any) => void;
}

interface Time12h {
  hour: string;
  minute: string;
  ampm: 'AM' | 'PM';
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ALL_WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_MAP: Record<string, string> = {
  'mon': 'Monday', 'monday': 'Monday',
  'tue': 'Tuesday', 'tuesday': 'Tuesday',
  'wed': 'Wednesday', 'wednesday': 'Wednesday',
  'thu': 'Thursday', 'thursday': 'Thursday',
  'fri': 'Friday', 'friday': 'Friday',
  'sat': 'Saturday', 'saturday': 'Saturday',
  'sun': 'Sunday', 'sunday': 'Sunday'
};

function parse24to12(timeStr?: string | null, defaultHour = '10', defaultMin = '00', defaultAmpm: 'AM' | 'PM' = 'AM'): Time12h {
  if (!timeStr) return { hour: defaultHour, minute: defaultMin, ampm: defaultAmpm };
  try {
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].slice(0, 2) : '00';
    if (isNaN(h)) return { hour: defaultHour, minute: defaultMin, ampm: defaultAmpm };
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const minVal = parseInt(m, 10);
    const minNormalized = !isNaN(minVal) ? String(Math.min(59, Math.max(0, minVal))).padStart(2, '0') : '00';
    return {
      hour: String(h).padStart(2, '0'),
      minute: minNormalized,
      ampm
    };
  } catch {
    return { hour: defaultHour, minute: defaultMin, ampm: defaultAmpm };
  }
}

function format12to24(t: Time12h): string {
  let h = parseInt(t.hour, 10);
  if (t.ampm === 'PM' && h < 12) h += 12;
  if (t.ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${t.minute}:00`;
}

export default function EditStaffAttendanceModal({
  isOpen,
  onClose,
  member,
  onMemberUpdated
}: EditStaffAttendanceModalProps) {
  const customInit = (member?.custom_data as any) || {};
  const initLat = member?.office_latitude !== undefined && member?.office_latitude !== null
    ? (member.office_latitude !== '' ? Number(member.office_latitude) : null)
    : (Number((member as any)?.assigned_lat || member?.latitude || customInit.office_latitude) || null);

  const initLng = member?.office_longitude !== undefined && member?.office_longitude !== null
    ? (member.office_longitude !== '' ? Number(member.office_longitude) : null)
    : (Number((member as any)?.assigned_lng || member?.longitude || customInit.office_longitude) || null);

  const initRadius = member?.geofence_radius_meters !== undefined && member?.geofence_radius_meters !== null
    ? (Number(member.geofence_radius_meters) || 100)
    : (Number((member as any)?.geofence_radius || member?.radius_meters || customInit.geofence_radius_meters) || 100);

  const initAddress = 
    member?.office_address || 
    (member as any)?.assigned_venue || 
    member?.location_name || 
    (member as any)?.address || 
    customInit.office_address || 
    customInit.location_name || 
    '';

  const initExempt = Boolean(
    member?.geofence_exempt !== undefined ? member.geofence_exempt :
    ((member as any)?.is_geofence_exempt || (member as any)?.geofence_required === false || customInit.geofence_exempt || false)
  );

  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(member?.name || '');
  const [primaryRole, setPrimaryRole] = useState(member?.primary_role || 'Staff Member');
  const [noGeofence, setNoGeofence] = useState(initExempt);
  const [officeAddress, setOfficeAddress] = useState<string>(initAddress);
  const [officeLat, setOfficeLat] = useState<number | null>(initLat);
  const [officeLng, setOfficeLng] = useState<number | null>(initLng);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(initRadius);
  const [toastInfo, setToastInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toast = {
    success: (msg: string) => {
      setToastInfo({ type: 'success', message: msg });
      setTimeout(() => setToastInfo(null), 3500);
    },
    error: (msg: string) => {
      setToastInfo({ type: 'error', message: msg });
      setTimeout(() => setToastInfo(null), 4000);
    }
  };

  // 12-Hour AM/PM Time Pickers
  const [shiftStartTime, setShiftStartTime] = useState<Time12h>({ hour: '10', minute: '00', ampm: 'AM' });
  const [shiftEndTime, setShiftEndTime] = useState<Time12h>({ hour: '07', minute: '00', ampm: 'PM' });

  // Multiple Weekly Off Days
  const [selectedWeeklyOffs, setSelectedWeeklyOffs] = useState<string[]>(['Sunday']);

  const toggleWeeklyOff = (day: string) => {
    const fullDay = DAY_MAP[day.toLowerCase()] || day;
    setSelectedWeeklyOffs((prev) => {
      const hasDay = prev.includes(fullDay) || prev.includes(day);
      if (hasDay) {
        return prev.filter(d => d !== fullDay && d !== day);
      } else {
        return [...prev, fullDay];
      }
    });
  };

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setPrimaryRole(member.primary_role || 'Staff Member');

      const custom = (member.custom_data as any) || {};

      // Parse Shift Start & End into 12-Hour values
      const rawStart = member.shift_start || custom.shift_start || '10:00:00';
      const rawEnd = member.shift_end || custom.shift_end || '19:00:00';
      setShiftStartTime(parse24to12(rawStart, '10', '00', 'AM'));
      setShiftEndTime(parse24to12(rawEnd, '07', '00', 'PM'));

      // Weekly Offs (Multiple)
      const rawOffs = member.weekly_off_days || member.weekly_offs || custom.weekly_off_days || custom.weekly_offs || ['Sunday'];
      const normalizedOffs: string[] = [];
      if (Array.isArray(rawOffs)) {
        rawOffs.forEach((d: string) => {
          const mapped = DAY_MAP[String(d).toLowerCase()];
          if (mapped && !normalizedOffs.includes(mapped)) normalizedOffs.push(mapped);
        });
      } else if (typeof rawOffs === 'string') {
        const mapped = DAY_MAP[String(rawOffs).toLowerCase()];
        if (mapped) normalizedOffs.push(mapped);
      }
      setSelectedWeeklyOffs(normalizedOffs.length > 0 ? normalizedOffs : ['Sunday']);

      // Hydrate coordinates, radius, address, and exemption directly from saved values
      const savedLat = member.office_latitude !== undefined && member.office_latitude !== null
        ? (member.office_latitude !== '' ? Number(member.office_latitude) : null)
        : (Number((member as any).assigned_lat || member.latitude || custom.office_latitude) || null);

      const savedLng = member.office_longitude !== undefined && member.office_longitude !== null
        ? (member.office_longitude !== '' ? Number(member.office_longitude) : null)
        : (Number((member as any).assigned_lng || member.longitude || custom.office_longitude) || null);

      const savedRadius = member.geofence_radius_meters !== undefined && member.geofence_radius_meters !== null
        ? (Number(member.geofence_radius_meters) || 100)
        : (Number((member as any).geofence_radius || member.radius_meters || custom.geofence_radius_meters) || 100);

      const savedAddress = 
        member.office_address || 
        (member as any).assigned_venue || 
        member.location_name || 
        (member as any).address || 
        custom.office_address || 
        custom.location_name || 
        '';

      const isExempt = Boolean(
        member.geofence_exempt !== undefined ? member.geofence_exempt :
        ((member as any).is_geofence_exempt || (member as any).geofence_required === false || custom.geofence_exempt || false)
      );

      setOfficeLat(savedLat);
      setOfficeLng(savedLng);
      setGeofenceRadius(savedRadius);
      setOfficeAddress(savedAddress);
      setNoGeofence(isExempt);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    try {
      const shiftStart24 = format12to24(shiftStartTime);
      const shiftEnd24 = format12to24(shiftEndTime);

      const updatePayload = {
        office_latitude: officeLat ? Number(officeLat) : null,
        office_longitude: officeLng ? Number(officeLng) : null,
        office_address: officeAddress || '',
        geofence_radius_meters: Number(geofenceRadius) || 100,
        geofence_exempt: Boolean(noGeofence),
        weekly_off_days: selectedWeeklyOffs,
        shift_start: shiftStart24, // maps to time without time zone
        shift_end: shiftEnd24,     // maps to time without time zone
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('fw_team_members')
        .update(updatePayload)
        .eq('id', member.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Geofence & shift timings updated successfully!');

      // Update local parent list immediately
      if (onMemberUpdated) {
        onMemberUpdated({
          ...member,
          ...updatePayload,
          assigned_lat: updatePayload.office_latitude,
          assigned_lng: updatePayload.office_longitude,
          shift_start: shiftStart24,
          shift_end: shiftEnd24
        });
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-[#FAF9F5] rounded-3xl border border-[#EAE5DA] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col relative"
        >
          {/* Pinned Top-Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 bg-white/80 hover:bg-white z-30 transition border border-slate-200/80 shadow-2xs cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="p-6 bg-white border-b border-[#EAE5DA] flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-amber-500/20 shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                member.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{name || member.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                  In-House Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure shift hours and weekly off days for automated attendance.
              </p>
            </div>
          </div>

          {/* Modal Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            
            {/* ── 1. STAFF PROFILE OVERVIEW (Locked / Read-Only Fields) ── */}
            <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Staff Profile Details
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">Staff Full Name</label>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={name}
                    className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">Primary Role</label>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={primaryRole}
                    className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>
            </div>

            {/* ── 2. WORK SHIFT TIMINGS (Strictly Renamed & 12-Hour AM/PM Time Pickers) ── */}
            <div className="bg-white p-5 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Work Shift Timings
                </h4>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  12-Hour AM / PM Format
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Shift Start 12-Hour Picker */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block">
                    Shift Start Time
                  </label>
                  <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl p-1.5">
                    {/* Hour */}
                    <select
                      value={shiftStartTime.hour}
                      onChange={(e) => setShiftStartTime(prev => ({ ...prev, hour: e.target.value }))}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer px-1 py-1"
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>

                    <span className="text-slate-400 font-bold">:</span>

                    {/* Minute (00 to 59 full range) */}
                    <select
                      value={shiftStartTime.minute}
                      onChange={(e) => setShiftStartTime(prev => ({ ...prev, minute: e.target.value }))}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer px-1 py-1"
                    >
                      {MINUTES_LIST.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* AM / PM */}
                    <select
                      value={shiftStartTime.ampm}
                      onChange={(e) => setShiftStartTime(prev => ({ ...prev, ampm: e.target.value as 'AM' | 'PM' }))}
                      className="bg-white text-xs font-black text-amber-800 border border-amber-200 rounded-lg px-2 py-1 shadow-2xs focus:outline-none cursor-pointer ml-auto"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                {/* Shift End 12-Hour Picker */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs block">
                    Shift End Time
                  </label>
                  <div className="flex items-center gap-1.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl p-1.5">
                    {/* Hour */}
                    <select
                      value={shiftEndTime.hour}
                      onChange={(e) => setShiftEndTime(prev => ({ ...prev, hour: e.target.value }))}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer px-1 py-1"
                    >
                      {HOURS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>

                    <span className="text-slate-400 font-bold">:</span>

                    {/* Minute (00 to 59 full range) */}
                    <select
                      value={shiftEndTime.minute}
                      onChange={(e) => setShiftEndTime(prev => ({ ...prev, minute: e.target.value }))}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer px-1 py-1"
                    >
                      {MINUTES_LIST.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* AM / PM */}
                    <select
                      value={shiftEndTime.ampm}
                      onChange={(e) => setShiftEndTime(prev => ({ ...prev, ampm: e.target.value as 'AM' | 'PM' }))}
                      className="bg-white text-xs font-black text-amber-800 border border-amber-200 rounded-lg px-2 py-1 shadow-2xs focus:outline-none cursor-pointer ml-auto"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Multiple Weekly Off Days (Tactile 3D Buttons) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                  Assign Weekly Off Days
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const fullDay = DAY_MAP[day.toLowerCase()] || day;
                    const isSelected = selectedWeeklyOffs.includes(fullDay) || selectedWeeklyOffs.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeeklyOff(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all transform active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-[0_4px_0_rgb(180,83,9),0_6px_10px_rgba(245,158,11,0.3)] translate-y-0.5'
                            : 'bg-white text-slate-600 border border-slate-200 shadow-[0_3px_0_rgb(226,232,240)] hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-slate-400 mt-2 font-medium">
                  Attendance records on assigned days off will automatically be marked as scheduled Week-Off.
                </p>
              </div>

            </div>

            {/* ── 3. INTERACTIVE MAP & 1M-100M RADIUS VOLUME SLIDER ── */}
            <div className="bg-white p-4 rounded-2xl border border-[#EAE5DA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Studio Office Geofence Perimeter
                </h4>
                {!noGeofence && (
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                    {geofenceRadius}m Active Radius
                  </span>
                )}
              </div>

              {!noGeofence && (
                <div className="space-y-3">
                  {/* Interactive Leaflet/OSM Map with Pin Drag & Place Search */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                    <GeofenceMapPicker
                      key={`map-${member?.id}-${officeLat || 'none'}-${officeLng || 'none'}`}
                      latitude={officeLat ? Number(officeLat) : 19.0596}
                      longitude={officeLng ? Number(officeLng) : 72.8295}
                      radiusMeters={geofenceRadius}
                      locationName={officeAddress || 'Studio Office'}
                      isEditable={true}
                      height="260px"
                      onCoordinatesChange={(lat, lng, addr) => {
                        setOfficeLat(lat);
                        setOfficeLng(lng);
                        if (addr) setOfficeAddress(addr);
                      }}
                      onRadiusChange={(r) => setGeofenceRadius(r)}
                    />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={noGeofence}
                  onChange={(e) => setNoGeofence(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded mt-0.5 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                />
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    No Geofence Required / Punch Allowed Anywhere
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Enable this so this member can check in and out from remote shoot sets, client meetings, or editing home desks without location perimeter blocks.
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </motion.div>

        {/* Floating Toast Notification */}
        {toastInfo && (
          <div className="fixed bottom-6 right-6 z-[100000] max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className={`px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-2.5 ${
              toastInfo.type === 'success' 
                ? 'bg-emerald-950/95 text-white border-emerald-500/50 shadow-emerald-950/40' 
                : 'bg-rose-950/95 text-white border-rose-500/50 shadow-rose-950/40'
            }`}>
              {toastInfo.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold tracking-wide">{toastInfo.message}</span>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

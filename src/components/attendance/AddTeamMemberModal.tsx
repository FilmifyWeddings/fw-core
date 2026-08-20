'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Send, Sparkles, MessageCircle, MapPin, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AttendanceLocation, AttendanceShift } from '@/types';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: AttendanceLocation[];
  shifts: AttendanceShift[];
  onMemberCreated?: () => void;
}

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  locations,
  shifts,
  onMemberCreated
}: AddTeamMemberModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    primary_role: 'Senior Cinematographer',
    phone_number: '',
    email: '',
    shift_id: shifts[0]?.id || '',
    default_geofence_id: locations[0]?.id || '',
    daily_rate: '3500',
    base_salary: '45000'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone_number.trim()) {
      alert('Please provide full name and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Insert into fw_team_members
      const memberPayload = {
        user_id: workspaceId,
        name: form.name.trim(),
        primary_role: form.primary_role,
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || null,
        default_geofence_id: form.default_geofence_id || null,
        shift_id: form.shift_id || null,
        daily_rate: parseFloat(form.daily_rate) || 0,
        base_salary: parseFloat(form.base_salary) || 0,
        created_at: new Date().toISOString()
      };

      const { data: member, error: mErr } = await supabase
        .from('fw_team_members')
        .insert([memberPayload])
        .select('*')
        .single();

      if (mErr) {
        // Retry insert without extended columns if schema strictness
        const fallbackPayload = {
          user_id: workspaceId,
          name: form.name.trim(),
          primary_role: form.primary_role,
          phone_number: form.phone_number.trim(),
          email: form.email.trim() || null,
          created_at: new Date().toISOString()
        };
        const { data: fbMember, error: fbErr } = await supabase
          .from('fw_team_members')
          .insert([fallbackPayload])
          .select('*')
          .single();
        if (fbErr) throw fbErr;
      }

      const memberId = member?.id;

      // 2. Generate secure token & insert attendance_member_links
      const secureToken = `att_${(memberId || 'emp').slice(0, 6)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      await supabase.from('attendance_member_links').insert([{
        user_id: workspaceId,
        workspace_id: workspaceId,
        member_id: memberId,
        secure_token: secureToken,
        is_active: true,
        created_at: new Date().toISOString()
      }]);

      // 3. Open WhatsApp link to send onboarding punch portal
      const portalUrl = `${window.location.origin}/attendance/${secureToken}`;
      const phoneDigits = form.phone_number.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(
        `Hi ${form.name},\nWelcome to the team! 🎉\nHere is your personal mobile attendance punch portal link for StudioCore:\n${portalUrl}\n\nPlease bookmark this link on your phone to punch in with selfie & GPS when reporting on duty.`
      );
      window.open(`https://wa.me/${phoneDigits}?text=${waText}`, '_blank');

      if (onMemberCreated) onMemberCreated();
      onClose();
    } catch (err: any) {
      console.error('Add team member error:', err);
      alert(err.message || 'Failed to onboard team member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-lg w-full border border-[#E9DFD2] shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#F0E8DC] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FAF3E6] text-[#8C6D33] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#211B17]">Onboard Team Member</h3>
                <p className="text-xs text-[#8C847B]">Add staff profile & auto-generate mobile magic punch link.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-[#746E67] block mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C89435] font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">Role / Designation *</label>
                <select
                  value={form.primary_role}
                  onChange={(e) => setForm({ ...form, primary_role: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none font-semibold"
                >
                  <option value="Senior Cinematographer">Senior Cinematographer</option>
                  <option value="Lead Photographer">Lead Photographer</option>
                  <option value="Lead Video Editor">Lead Video Editor</option>
                  <option value="Drone Pilot">Drone Pilot</option>
                  <option value="Album Designer">Album Designer</option>
                  <option value="Studio Manager">Studio Manager</option>
                  <option value="Production Assistant">Production Assistant</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">WhatsApp / Phone *</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none font-mono font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="rahul@studiocore.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">Assigned Geofence / Studio</label>
                <select
                  value={form.default_geofence_id}
                  onChange={(e) => setForm({ ...form, default_geofence_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none font-semibold"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.radius_meters}m)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">Daily Shoot Rate (₹)</label>
                <input
                  type="number"
                  placeholder="3500"
                  value={form.daily_rate}
                  onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#746E67] block mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  placeholder="45000"
                  value={form.base_salary}
                  onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E9DFD2] rounded-xl focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#C89435] hover:bg-[#B3802B] rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5" />
                )}
                <span>Save & Send WhatsApp Magic Link</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

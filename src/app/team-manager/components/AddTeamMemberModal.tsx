'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserPlus, Sparkles, User, Briefcase, Phone, Mail, 
  Camera, Loader2, ShieldCheck, ChevronDown, ChevronUp,
  Target, FileText, Users2, Film, IndianRupee, Check
} from 'lucide-react';
import CountryFlagPhoneInput from './CountryFlagPhoneInput';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';

interface AddTeamMemberModalProps {
  memberToEdit?: any | null;
  isOpen: boolean;
  onClose: () => void;
  initialRole?: string;
  onSave: (member: {
    name: string;
    primary_role: string;
    country_code: string;
    phone_number: string;
    email?: string;
    avatar_url?: string;
    roles?: string[];
    permissions?: any;
  }) => Promise<void> | void;
}

const MULTI_ROLES_OPTIONS = [
  { id: 'Photographer', label: '📸 Photographer' },
  { id: 'Cinematographer', label: '🎥 Cinematographer' },
  { id: 'Drone Pilot', label: '🚁 Drone Pilot' },
  { id: 'Video Editor', label: '🎬 Video Editor' },
  { id: 'Album Designer', label: '🎨 Album Designer' },
  { id: 'Printing Lab', label: '📖 Printing Lab' },
  { id: 'Assistant', label: '🤝 Assistant' },
  { id: 'Traditional Video', label: '📹 Traditional Video' },
];

export default function AddTeamMemberModal({
  memberToEdit,
  isOpen,
  onClose,
  initialRole = 'Photographer',
  onSave,
}: AddTeamMemberModalProps) {
  const { workspaceId } = useWorkspace();
  const [name, setName] = useState('');
  const [primaryRole, setPrimaryRole] = useState(initialRole);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([initialRole]);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  // Granular Permissions Matrix State
  const [leadsAccess, setLeadsAccess] = useState<'NONE' | 'ASSIGNED_ONLY' | 'VIEW_ALL' | 'FULL_EDIT'>('NONE');
  const [quotationsAccess, setQuotationsAccess] = useState<'NONE' | 'VIEW_ONLY' | 'MANAGE'>('NONE');
  const [teamManagerAccess, setTeamManagerAccess] = useState<'NONE' | 'VIEW_ASSIGNED' | 'MANAGE_ALL'>('VIEW_ASSIGNED');
  const [postProductionAccess, setPostProductionAccess] = useState<'NONE' | 'ASSIGNED_ONLY' | 'FULL_ACCESS'>('ASSIGNED_ONLY');
  const [financeAccess, setFinanceAccess] = useState<'NONE' | 'VIEW_ONLY' | 'MANAGE'>('NONE');

  useEffect(() => {
    if (memberToEdit && isOpen) {
      setName(memberToEdit.name || '');
      setPrimaryRole(memberToEdit.primary_role || initialRole);
      setSelectedRoles(memberToEdit.roles || [memberToEdit.primary_role || initialRole]);
      setCountryCode(memberToEdit.country_code || '+91');
      setPhoneNumber(memberToEdit.phone_number || '');
      setEmail(memberToEdit.email || '');
      setAvatarUrl(memberToEdit.avatar_url || '');

      const perms = memberToEdit.permissions || memberToEdit.member_permissions?.[0] || {};
      setLeadsAccess(perms.leads_access || 'NONE');
      setQuotationsAccess(perms.quotations_access || 'NONE');
      setTeamManagerAccess(perms.team_manager_access || 'VIEW_ASSIGNED');
      setPostProductionAccess(perms.post_production_access || 'ASSIGNED_ONLY');
      setFinanceAccess(perms.finance_access || 'NONE');
    } else if (isOpen) {
      setName('');
      setPrimaryRole(initialRole);
      setSelectedRoles([initialRole]);
      setCountryCode('+91');
      setPhoneNumber('');
      setEmail('');
      setAvatarUrl('');
      setLeadsAccess('NONE');
      setQuotationsAccess('NONE');
      setTeamManagerAccess('VIEW_ASSIGNED');
      setPostProductionAccess('ASSIGNED_ONLY');
      setFinanceAccess('NONE');
    }
  }, [memberToEdit, isOpen, initialRole]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => {
      const exists = prev.includes(roleId);
      const next = exists ? prev.filter(r => r !== roleId) : [...prev, roleId];
      if (next.length > 0 && !next.includes(primaryRole)) {
        setPrimaryRole(next[0]);
      }
      return next.length > 0 ? next : [roleId];
    });
  };

  // Client-Side Image Compression Engine
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setAvatarUrl(compressedDataUrl);

      try {
        const { uploadMasterImage } = await import('@/lib/master-image-manager');
        const uploadResult = await uploadMasterImage(supabase, file, {
          bucket: 'team-avatars',
          cacheControl: '31536000'
        });
        if (uploadResult.url) {
          setAvatarUrl(uploadResult.url);
        }
      } catch (storageErr) {
        console.warn('[AddTeamMemberModal] Storage bucket fallback to dataURL:', storageErr);
      }
    } catch (err) {
      console.error('[AddTeamMemberModal] Compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas context failed'));
          }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const permissionsObj = {
        leads_access: leadsAccess,
        quotations_access: quotationsAccess,
        team_manager_access: teamManagerAccess,
        post_production_access: postProductionAccess,
        finance_access: financeAccess,
      };

      // 1. Trigger parent onSave for UI state
      await onSave({
        name: name.trim(),
        primary_role: primaryRole,
        roles: selectedRoles,
        country_code: countryCode,
        phone_number: phoneNumber.trim(),
        email: email.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        permissions: permissionsObj,
      });

      // 2. Persist to Multi-Tenant Database API if email is present and workspace is available
      if (email.trim() && workspaceId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/workspace/members', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              workspace_id: workspaceId,
              name: name.trim(),
              email: email.trim(),
              phone: `${countryCode} ${phoneNumber.trim()}`.trim(),
              primary_role: primaryRole,
              roles: selectedRoles,
              avatar_url: avatarUrl || null,
              permissions: permissionsObj,
            }),
          }).catch(() => {});
        }
      }

      onClose();
    } catch (err) {
      console.error('[AddTeamMemberModal] Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 leading-none">
                  {memberToEdit ? 'Edit Team Member / Partner' : 'Add Team Member / Partner'}
                </h3>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                  Multi-Role Tagging &amp; Granular Permission Matrix
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-zinc-300" />
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-xs transition">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-600">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-amber-500 focus:outline-hidden transition"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-600 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-zinc-400" />
                  <span>Email (For Partner Portal Login)</span>
                </label>
                <input
                  type="email"
                  placeholder="rahul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-amber-500 focus:outline-hidden transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  <span>Mobile Phone</span>
                </label>
                <CountryFlagPhoneInput
                  countryCode={countryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={setCountryCode}
                  onPhoneNumberChange={setPhoneNumber}
                />
              </div>
            </div>

            {/* Multi-Role Badges Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-700 flex items-center justify-between">
                <span>Multi-Role Specializations (Select All That Apply)</span>
                <span className="text-[10px] text-zinc-400 font-normal">Primary: {primaryRole}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MULTI_ROLES_OPTIONS.map((r) => {
                  const isSelected = selectedRoles.includes(r.id);
                  const isPrimary = primaryRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? isPrimary
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{r.label}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Permission Matrix Accordion */}
            <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-50/50">
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-100/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Granular Permission Matrix</p>
                    <p className="text-[10px] text-zinc-500">Configure CRM, Quotations, and Finance access levels</p>
                  </div>
                </div>
                {showPermissions ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              <AnimatePresence>
                {showPermissions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 space-y-3 pt-2 border-t border-zinc-200 bg-white"
                  >
                    {/* Leads & CRM */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-zinc-800">Leads &amp; CRM</span>
                      </div>
                      <select
                        value={leadsAccess}
                        onChange={(e: any) => setLeadsAccess(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800"
                      >
                        <option value="NONE">No Access (Hidden)</option>
                        <option value="ASSIGNED_ONLY">Assigned Only</option>
                        <option value="VIEW_ALL">View All Leads</option>
                        <option value="FULL_EDIT">Full Edit Access</option>
                      </select>
                    </div>

                    {/* Quotations & Pricing */}
                    <div className="flex items-center justify-between py-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-zinc-800">Quotations &amp; Pricing</span>
                      </div>
                      <select
                        value={quotationsAccess}
                        onChange={(e: any) => setQuotationsAccess(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800"
                      >
                        <option value="NONE">Hidden</option>
                        <option value="VIEW_ONLY">View Only</option>
                        <option value="MANAGE">Full Manage</option>
                      </select>
                    </div>

                    {/* Team Manager */}
                    <div className="flex items-center justify-between py-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Users2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-zinc-800">Team Manager</span>
                      </div>
                      <select
                        value={teamManagerAccess}
                        onChange={(e: any) => setTeamManagerAccess(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800"
                      >
                        <option value="NONE">Hidden</option>
                        <option value="VIEW_ASSIGNED">View Assigned Crew</option>
                        <option value="MANAGE_ALL">Full Access</option>
                      </select>
                    </div>

                    {/* Post-Production */}
                    <div className="flex items-center justify-between py-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-rose-600" />
                        <span className="text-xs font-bold text-zinc-800">Post-Production / Projects</span>
                      </div>
                      <select
                        value={postProductionAccess}
                        onChange={(e: any) => setPostProductionAccess(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800"
                      >
                        <option value="NONE">Hidden</option>
                        <option value="ASSIGNED_ONLY">Assigned Projects Only</option>
                        <option value="FULL_ACCESS">Full Access</option>
                      </select>
                    </div>

                    {/* Finance & Invoices */}
                    <div className="flex items-center justify-between py-1 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-yellow-600" />
                        <span className="text-xs font-bold text-zinc-800">Finance &amp; Invoices</span>
                      </div>
                      <select
                        value={financeAccess}
                        onChange={(e: any) => setFinanceAccess(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800"
                      >
                        <option value="NONE">Hidden</option>
                        <option value="VIEW_ONLY">View Only</option>
                        <option value="MANAGE">Full Access</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{memberToEdit ? 'Save Changes' : 'Add Team Member'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

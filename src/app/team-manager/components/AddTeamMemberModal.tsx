'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Sparkles, User, Briefcase, Phone, Mail, Camera, Loader2 } from 'lucide-react';
import CountryFlagPhoneInput from './CountryFlagPhoneInput';
import { supabase } from '@/lib/supabase';

interface AddTeamMemberModalProps {
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
  }) => Promise<void> | void;
}

const COMMON_ROLES = [
  'TM', 'Ass', 'TP', 'TV', 'CP', 'CV', 'Dron', 
  'Makeup Art', 'Cine 2', 'Candid 2', 'social Media persone', 'Reel', 'Family Photographer'
];

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  initialRole = 'Ass',
  onSave,
}: AddTeamMemberModalProps) {
  const [name, setName] = useState('');
  const [primaryRole, setPrimaryRole] = useState(initialRole);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialRole) {
      setPrimaryRole(initialRole);
    }
  }, [initialRole]);

  // Client-Side Image Compression Engine (Max 200x200px, JPEG 0.6 quality, ~15-30KB)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setAvatarUrl(compressedDataUrl);

      // Attempt background upload to Supabase Storage 'team-avatars' bucket if configured
      try {
        const fileExt = 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const blob = await (await fetch(compressedDataUrl)).blob();

        const { data: uploadData, error: uploadErr } = await supabase
          .storage
          .from('team-avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage.from('team-avatars').getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            setAvatarUrl(publicUrlData.publicUrl);
          }
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
            reject(new Error('Canvas error'));
          }
        };
        img.onerror = (e) => reject(e);
        img.src = event.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) return;

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        primary_role: primaryRole,
        country_code: countryCode,
        phone_number: phoneNumber.trim(),
        email: email.trim() || undefined,
        avatar_url: avatarUrl || undefined,
      });
      setName('');
      setPhoneNumber('');
      setEmail('');
      setAvatarUrl('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* 3D Modal Chassis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md bg-white rounded-[24px] border border-[#6C5CE7]/10 shadow-[0_30px_70px_rgba(0,0,0,0.25),0_12px_30px_rgba(108,92,231,0.08)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6C5CE7] flex items-center justify-center text-white shadow-lg shadow-[#6C5CE7]/20">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0B111E] tracking-tight">Add New Team Member</h3>
                  <p className="text-[10px] text-[#4F5E74] font-semibold">Directory registry & assignment allocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-[#4F5E74] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Photo Upload Picker with Avatar Preview */}
              <div className="flex items-center gap-4 bg-[#F8F9FD] p-3 rounded-2xl border border-[#6C5CE7]/10">
                <div className="relative w-14 h-14 rounded-full bg-[#6C5CE7]/10 border-2 border-white ring-2 ring-[#6C5CE7]/30 flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-next/no-img-element
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-[#6C5CE7]" />
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">
                    Profile Photo (Compressed &lt; 30KB)
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#6C5CE7]/20 text-[#6C5CE7] hover:bg-[#6C5CE7]/5 text-xs font-bold transition shadow-sm">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageSelect}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Member Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  Member Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sushant Nawale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-3 rounded-2xl text-sm font-bold text-[#0B111E] placeholder:text-zinc-400 focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 transition"
                />
              </div>

              {/* Primary Designation / Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  Primary Role / Designation
                </label>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-3 rounded-2xl text-sm font-bold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 transition cursor-pointer"
                >
                  {COMMON_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* International Mobile Phone Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  Mobile Number (With Country Flag)
                </label>
                <CountryFlagPhoneInput
                  countryCode={countryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={setCountryCode}
                  onPhoneNumberChange={setPhoneNumber}
                />
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. sushant@studio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-3 rounded-2xl text-sm font-bold text-[#0B111E] placeholder:text-zinc-400 focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 transition"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#4F5E74] hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isCompressing}
                  className="px-6 py-2.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold shadow-lg shadow-[#6C5CE7]/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Allocate'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

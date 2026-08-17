'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Upload, Building2, User, Phone, Mail, 
  MapPin, Check, Loader2, Sparkles, ShieldCheck, 
  ExternalLink, Trash2, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageToDataUrl } from '@/lib/image-compression';

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

interface StudioProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved?: (updatedProfile: any) => void;
}

export default function StudioProfileEditModal({
  isOpen,
  onClose,
  onProfileSaved,
}: StudioProfileEditModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [userId, setUserId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [studioName, setStudioName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [youtube, setYoutube] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [isCompressingAvatar, setIsCompressingAvatar] = useState<boolean>(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState<boolean>(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load User Profile on Open
  useEffect(() => {
    if (!isOpen) return;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const currentEmail = session?.user?.email || '';

        setUserId(currentUserId || '');
        setEmail(currentEmail);

        // Fetch from API
        const token = session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/user/profile-setup', { headers });
        const json = await res.json().catch(() => ({}));

        if (json?.profile) {
          const p = json.profile;
          setFullName(p.fullName || session?.user?.user_metadata?.full_name || '');
          setStudioName(p.studioName || session?.user?.user_metadata?.workspace_name || 'My Studio');
          setPhone(p.phone || session?.user?.user_metadata?.phone || '');
          setAddress(p.address || '');
          setInstagram(p.instagram || '');
          setYoutube(p.youtube || '');
          setFacebook(p.facebook || '');
          setAvatarUrl(p.avatarUrl || '');
          setLogoUrl(p.logoUrl || '');
        }
      } catch (err: any) {
        console.error('[Load Profile Error]:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [isOpen]);

  // Handle Avatar Image Selection & WebP Compression
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingAvatar(true);
        const compressed = await compressImageToDataUrl(file, 450, 0.85);
        setAvatarUrl(compressed);
      } catch (err) {
        console.error('Avatar error:', err);
      } finally {
        setIsCompressingAvatar(false);
      }
    }
  };

  // Handle Logo Image Selection & WebP Compression
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingLogo(true);
        const compressed = await compressImageToDataUrl(file, 450, 0.88);
        setLogoUrl(compressed);
      } catch (err) {
        console.error('Logo error:', err);
      } finally {
        setIsCompressingLogo(false);
      }
    }
  };

  // Submit Profile Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        userId,
        fullName: fullName.trim(),
        studioName: studioName.trim() || 'My Studio',
        phone: phone.trim(),
        address: address.trim(),
        instagram: instagram.trim(),
        youtube: youtube.trim(),
        facebook: facebook.trim(),
        avatarUrl,
        logoUrl,
      };

      const res = await fetch('/api/user/profile-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setSavedSuccess(true);
        if (onProfileSaved) {
          onProfileSaved(payload);
        }
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1000);
      } else {
        throw new Error(json.error || 'Failed to save changes');
      }
    } catch (err: any) {
      console.error('[Save Profile Error]:', err);
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Container in Warm Yellow & Off-White Luxury Theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[620px] bg-[#FDFBF7] rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-r from-amber-400 via-amber-500 to-[#F36F21] px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
                <Building2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                  Studio & Account Profile
                </h2>
                <p className="text-xs text-amber-100 font-medium">
                  Manage branding, contact details, and social links
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 bg-[#FDFBF7]">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-amber-700">
                <Loader2 className="w-8 h-8 animate-spin text-[#F36F21]" />
                <span className="text-xs font-bold">Loading Studio Profile...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    {errorMessage}
                  </div>
                )}

                {/* ── 1. DUAL BRAND ASSETS: AVATAR & STUDIO LOGO ── */}
                <div className="grid grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                  
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs font-black text-zinc-800 mb-2">Profile Photo (Avatar)</span>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-amber-300 hover:border-[#F36F21] bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group shadow-inner"
                    >
                      {isCompressingAvatar ? (
                        <Loader2 className="w-6 h-6 text-[#F36F21] animate-spin" />
                      ) : avatarUrl ? (
                        <>
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Camera className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-amber-500 group-hover:text-[#F36F21] transition-colors" />
                          <span className="text-[10px] font-extrabold text-amber-700 mt-1">Upload</span>
                        </>
                      )}
                    </div>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="mt-1.5 text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>

                  {/* Studio Logo Upload */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs font-black text-zinc-800 mb-2">Studio Brand Logo</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-amber-300 hover:border-[#F36F21] bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group shadow-inner"
                    >
                      {isCompressingLogo ? (
                        <Loader2 className="w-6 h-6 text-[#F36F21] animate-spin" />
                      ) : logoUrl ? (
                        <>
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Upload className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-amber-500 group-hover:text-[#F36F21] transition-colors" />
                          <span className="text-[10px] font-extrabold text-amber-700 mt-1">Brand Logo</span>
                        </>
                      )}
                    </div>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="mt-1.5 text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>

                </div>

                {/* ── 2. BASIC STUDIO INFO ── */}
                <div className="space-y-3 p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F36F21]" />
                    <span>Personal & Studio Identity</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Owner / Full Name</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-400">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your Full Name"
                          className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Studio Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Studio / Business Name *</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-400">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={studioName}
                          onChange={(e) => setStudioName(e.target.value)}
                          placeholder="Studio / Brand Name"
                          required
                          className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Mobile / WhatsApp Number</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-400">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Email ID (Read-only) */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Account Email (Verified)</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 pointer-events-none text-zinc-400">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full pl-9 pr-3 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 text-xs font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Studio Address / Location */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Studio Address / Location</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-zinc-400">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Studio 402, Bandra West, Mumbai, Maharashtra"
                        className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 3. SOCIAL MEDIA & LINKS ── */}
                <div className="space-y-3 p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-[#F36F21]" />
                    <span>Social Media & Portfolio Links</span>
                  </h4>

                  <div className="space-y-2.5">
                    {/* Instagram */}
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-pink-500">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="Instagram Handle (e.g. @theweddingshots or URL)"
                        className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-red-500">
                        <YoutubeIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="YouTube Channel Link (e.g. youtube.com/@yourstudio)"
                        className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Facebook */}
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-blue-600">
                        <FacebookIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="Facebook Page URL (e.g. facebook.com/yourstudio)"
                        className="w-full pl-9 pr-3 h-9 rounded-xl bg-amber-50/30 border border-amber-200 text-zinc-900 text-xs font-semibold focus:bg-white focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 4. SUBMIT / SAVE BUTTON ── */}
                <div className="pt-1 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-amber-100/60 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || savedSuccess}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F36F21] to-[#FF8A3D] hover:from-[#e06118] hover:to-[#f07b2f] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#F36F21]/20 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Profile...</span>
                      </>
                    ) : savedSuccess ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Profile Saved!</span>
                      </>
                    ) : (
                      <>
                        <span>Save Profile Changes</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Upload, Building2, User, Phone, Mail, 
  MapPin, Check, Loader2, Sparkles, ShieldCheck, 
  ExternalLink, Trash2, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { compressImageToDataUrl } from '@/lib/image-compression';
import CountryPhoneInput from '@/components/ui/CountryPhoneInput';

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

  const { refreshContext } = useWorkspace();

  // Submit Profile Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const currentUserId = session?.user?.id || userId;

      const payload = {
        userId: currentUserId,
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
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setSavedSuccess(true);
        if (typeof window !== 'undefined') {
          if (payload.studioName) {
            localStorage.setItem('sc_studio_name', payload.studioName);
            localStorage.setItem('fw_studio_name', payload.studioName);
          }
          if (payload.avatarUrl) localStorage.setItem('sc_avatar_url', payload.avatarUrl);
          if (payload.logoUrl) localStorage.setItem('sc_logo_url', payload.logoUrl);
          if (payload.fullName) localStorage.setItem('sc_user_name', payload.fullName);
          window.dispatchEvent(new CustomEvent('sc_profile_updated', { detail: payload }));
        }
        try {
          await supabase.auth.refreshSession();
        } catch (_) {}
        await refreshContext();
        if (onProfileSaved) {
          onProfileSaved(payload);
        }
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 600);
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
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
        {/* Backdrop click handler */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Container in Light Creamy Luxury Aesthetic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#FEFDF9] dark:bg-[#12161F] rounded-3xl shadow-2xl border border-[#EAE5DA] dark:border-zinc-800 overflow-hidden z-10 my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAE5DA] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-[#FEFDF9] dark:bg-[#12161F]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center font-bold shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Studio Profile & Branding
                </h2>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Manage your official studio identity, owner photo, contact details, and social links.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />

          {/* Form Content */}
          <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-6 bg-[#FEFDF9] dark:bg-[#12161F]">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="text-xs font-bold">Loading Studio Profile...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
                    {errorMessage}
                  </div>
                )}

                {/* ── 1. DUAL BRAND ASSETS: LOGO & AVATAR ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Studio Logo Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Official Studio Logo
                      </span>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-[#F7F5F0] dark:bg-zinc-800 border-2 border-dashed border-[#EAE5DA] dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                        {isCompressingLogo ? (
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                        ) : logoUrl ? (
                          <img src={logoUrl} alt="Studio Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isCompressingLogo}
                          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 border border-[#EAE5DA] dark:border-zinc-600 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                        </button>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                          Recommended 400×400px (PNG / JPG). Synchronized to PDF quotations and invoices.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal / Owner Photo Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Personal / Owner Photo
                      </span>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-[#F7F5F0] dark:bg-zinc-800 border-2 border-[#EAE5DA] dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                        {isCompressingAvatar ? (
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isCompressingAvatar}
                          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 border border-[#EAE5DA] dark:border-zinc-600 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                          Personal portrait for crew management, WhatsApp signatures, and notifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. STUDIO & CONTACT DETAILS ── */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-4">
                  <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Studio & Contact Details</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Studio Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Studio Brand Name *</span>
                      </label>
                      <input
                        type="text"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        placeholder="e.g. Filmify Weddings"
                        required
                        className="w-full px-4 py-2.5 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Owner Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Owner / Manager Full Name</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sushant Nawale"
                        className="w-full px-4 py-2.5 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Studio Phone / WhatsApp</span>
                      </label>
                      <CountryPhoneInput
                        value={phone}
                        onChange={(fullPhone) => setPhone(fullPhone)}
                        placeholder="98765 43210"
                      />
                    </div>

                    {/* Email (Readonly) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Account Email (Verified)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        placeholder="user@studio.com"
                        className="w-full px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/40 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 cursor-not-allowed shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Studio Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Studio Physical Address</span>
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Suite 402, Signature Plaza, Mumbai, Maharashtra 400001"
                      className="w-full px-4 py-2.5 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all resize-none"
                    />
                  </div>
                </div>

                {/* ── 3. SOCIAL MEDIA PRESENCE ── */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-4">
                  <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Social Media & Portfolio Links</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <InstagramIcon className="w-3.5 h-3.5 text-[#E4405F]" />
                        <span>Instagram Handle</span>
                      </label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@filmifyweddings"
                        className="w-full px-3.5 py-2 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <YoutubeIcon className="w-3.5 h-3.5 text-[#FF0000]" />
                        <span>YouTube Channel</span>
                      </label>
                      <input
                        type="text"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        placeholder="youtube.com/@studio"
                        className="w-full px-3.5 py-2 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Facebook */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>Facebook Page</span>
                      </label>
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="facebook.com/studio"
                        className="w-full px-3.5 py-2 bg-[#FDFBF7] dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 4. SUBMIT / SAVE BUTTON ── */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EAE5DA] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || savedSuccess}
                    className="px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : savedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Profile Saved!</span>
                      </>
                    ) : (
                      <>
                        <span>Save Profile Changes</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
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

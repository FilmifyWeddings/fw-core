'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { 
  Sparkles, Camera, Building2, MapPin, 
  ArrowRight, CheckCircle2, X, Upload, ShieldCheck, 
  Layers, Users, FileText, Check, Loader2 
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

interface OnboardingCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  initialStudioName?: string;
  workspaceName?: string;
  userEmail?: string;
  userId?: string;
  onProfileUpdated?: (updatedData: any) => void;
}

export default function OnboardingCelebrationModal({
  isOpen,
  onClose,
  userName = 'Studio Owner',
  initialStudioName,
  workspaceName,
  userEmail = '',
  userId = '',
  onProfileUpdated,
}: OnboardingCelebrationModalProps) {
  const effectiveStudioName = initialStudioName || workspaceName || 'My Studio';
  // Modal Stages: 'welcome' (Step 1) -> 'profile-setup' (Step 2)
  const [stage, setStage] = useState<'welcome' | 'profile-setup'>('welcome');

  // Profile Form States
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [studioName, setStudioName] = useState<string>(effectiveStudioName);
  const [instagram, setInstagram] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState<boolean>(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState<boolean>(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync initial studio name if passed
  useEffect(() => {
    if (effectiveStudioName && effectiveStudioName !== 'My Studio') {
      setStudioName(effectiveStudioName);
    }
  }, [effectiveStudioName]);

  // Dual-Cannon Confetti blast from Left & Right sides
  const fireDualConfetti = () => {
    try {
      const colors = ['#F36F21', '#FF8A3D', '#F59E0B', '#10B981', '#8B5CF6', '#FFFFFF'];
      
      // Left Cannon
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.72 },
        colors,
        zIndex: 99999,
        disableForReducedMotion: true,
      });

      // Right Cannon
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.72 },
        colors,
        zIndex: 99999,
        disableForReducedMotion: true,
      });
    } catch (e) {
      console.warn('[Confetti notice]:', e);
    }
  };

  // Trigger confetti on open
  useEffect(() => {
    if (isOpen) {
      fireDualConfetti();
      const t1 = setTimeout(fireDualConfetti, 1200);
      const t2 = setTimeout(fireDualConfetti, 2500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  // Handle Avatar Image Selection & Compression to KB
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingAvatar(true);
        const compressedDataUrl = await compressImageToDataUrl(file, 400, 0.82);
        setAvatarUrl(compressedDataUrl);
      } catch (err) {
        console.error('Avatar compression error:', err);
      } finally {
        setIsCompressingAvatar(false);
      }
    }
  };

  // Handle Logo Image Selection & Compression to KB
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingLogo(true);
        const compressedDataUrl = await compressImageToDataUrl(file, 400, 0.85);
        setLogoUrl(compressedDataUrl);
      } catch (err) {
        console.error('Logo compression error:', err);
      } finally {
        setIsCompressingLogo(false);
      }
    }
  };

  const markCompletedGlobally = () => {
    try {
      localStorage.setItem('sc_welcome_completed', 'true');
      localStorage.removeItem('sc_show_onboarding_celebration');
      if (userId) {
        localStorage.setItem(`sc_welcome_seen_${userId}`, 'true');
      }
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('welcome');
        url.searchParams.delete('onboarding');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch (e) {}
  };

  // Save Profile Setup
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const currentUserId = session?.user?.id || userId;

      const payload = {
        userId: currentUserId,
        studioName: studioName.trim() || initialStudioName,
        avatarUrl,
        logoUrl,
        instagram: instagram.trim(),
        address: address.trim(),
        fullName: userName,
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
        setIsSavedSuccess(true);
        if (typeof window !== 'undefined' && payload.studioName) {
          localStorage.setItem('sc_studio_name', payload.studioName);
          localStorage.setItem('fw_studio_name', payload.studioName);
        }
        if (onProfileUpdated) {
          onProfileUpdated(payload);
        }
        markCompletedGlobally();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error(json.error || 'Failed to save profile');
      }
    } catch (err: any) {
      console.error('[Save Profile Error]:', err);
      markCompletedGlobally();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Skip Profile Setup
  const handleSkip = () => {
    markCompletedGlobally();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 25 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-[540px] bg-[#FDFBF7] rounded-3xl shadow-2xl border border-amber-200/60 overflow-hidden z-10 my-auto"
        >
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-amber-100/50 transition-all cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ═══════════════════════════════════════════════════════════════
              STAGE 1: LUXURY CONGRATULATIONS WELCOME POPUP
              ═══════════════════════════════════════════════════════════════ */}
          {stage === 'welcome' && (
            <div className="p-6 sm:p-8 text-center flex flex-col items-center">
              
              {/* Animated StudioCore Badge */}
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#F36F21]/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#F36F21] to-[#FF8A3D] flex items-center justify-center shadow-xl shadow-[#F36F21]/30 text-white">
                  <Image
                    src="/images/auth/sc-orange-logo.png"
                    alt="StudioCore Logo"
                    width={48}
                    height={48}
                    unoptimized
                    priority
                    className="object-contain brightness-0 invert"
                  />
                </div>
              </div>

              {/* Onboarding Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-[#c25310] text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#F36F21]" />
                <span>Welcome to StudioCore</span>
              </div>

              {/* Heading */}
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight leading-tight">
                Congratulations, <span className="text-[#F36F21]">{userName}</span>! 🎉
              </h2>
              <p className="text-xs sm:text-sm font-medium text-zinc-600 mt-1 max-w-[420px] leading-relaxed">
                <strong>{studioName || 'Your Studio'}</strong> is now officially active. Focus on your Art, we take care of the rest!
              </p>

              {/* Highlights Feature Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-5 text-left">
                <div className="p-3 rounded-2xl bg-white border border-amber-200/80 shadow-2xs flex flex-col gap-1.5">
                  <div className="w-7 h-7 rounded-xl bg-[#F36F21] text-white flex items-center justify-center shadow-xs">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 leading-tight">Quotation Engine</span>
                  <span className="text-[10px] text-zinc-500">Luxury PDFs & interactive web proposals</span>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col gap-1.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 leading-tight">Leads & CRM</span>
                  <span className="text-[10px] text-zinc-500">Automated WhatsApp & Meta Ads</span>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-indigo-200/80 shadow-2xs flex flex-col gap-1.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 leading-tight">Team & Shoots</span>
                  <span className="text-[10px] text-zinc-500">Crew rosters & GPS attendance</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStage('profile-setup')}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F36F21] to-[#FF8A3D] hover:from-[#e06118] hover:to-[#f07b2f] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F36F21]/25 hover:shadow-xl transition-all cursor-pointer active:scale-98"
                >
                  <span>Complete Studio Profile</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Explore Workspace First
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Personalized Setup · Takes only 30 seconds</span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STAGE 2: STUDIO PROFILE SETUP MODAL
              ═══════════════════════════════════════════════════════════════ */}
          {stage === 'profile-setup' && (
            <div className="p-5 sm:p-7 bg-[#FDFBF7]">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-200/60">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#F36F21] flex items-center justify-center shrink-0 border border-amber-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight leading-tight">
                    Set Up Your Studio Profile
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Add your logo and details to brand your client quotations
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                
                {/* 1. Dual Image Uploads: Profile Photo & Studio Logo */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                  
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[11px] font-bold text-zinc-700 mb-1.5">Profile Photo</span>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-amber-300 hover:border-[#F36F21] bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group shadow-2xs"
                    >
                      {isCompressingAvatar ? (
                        <Loader2 className="w-5 h-5 text-[#F36F21] animate-spin" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-amber-500/80 group-hover:text-[#F36F21] transition-colors" />
                          <span className="text-[9px] font-bold text-amber-700 mt-1">Upload</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Studio Logo Upload */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[11px] font-bold text-zinc-700 mb-1.5">Studio Logo</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-amber-300 hover:border-[#F36F21] bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group shadow-2xs"
                    >
                      {isCompressingLogo ? (
                        <Loader2 className="w-5 h-5 text-[#F36F21] animate-spin" />
                      ) : logoUrl ? (
                        <img src={logoUrl} alt="Studio Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-amber-500/80 group-hover:text-[#F36F21] transition-colors" />
                          <span className="text-[9px] font-bold text-amber-700 mt-1">Brand Logo</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* 2. Studio / Business Name */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Studio / Business Name *"
                    required
                    className="w-full pl-10 pr-3.5 h-10 rounded-xl bg-white border border-amber-200 text-zinc-900 text-xs sm:text-sm font-semibold placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* 3. Instagram Handle / Profile */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Instagram Handle (e.g. @yourstudio)"
                    className="w-full pl-10 pr-3.5 h-10 rounded-xl bg-white border border-amber-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* 4. Studio Address / Location */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Studio Address / City (e.g. Mumbai, Maharashtra)"
                    className="w-full pl-10 pr-3.5 h-10 rounded-xl bg-white border border-amber-200 text-zinc-900 text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* 5. Action Buttons (Save & Complete / Skip) */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isSaving || isSavedSuccess}
                    className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#F36F21] to-[#FF8A3D] hover:from-[#e06118] hover:to-[#f07b2f] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F36F21]/25 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Studio Profile...</span>
                      </div>
                    ) : isSavedSuccess ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Profile Saved! Opening Workspace...</span>
                      </div>
                    ) : (
                      <>
                        <span>Save & Complete Profile</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                  >
                    Skip for Now
                  </button>
                </div>

              </form>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

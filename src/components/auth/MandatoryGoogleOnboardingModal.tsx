'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Building2, Camera, Phone, User, 
  ArrowRight, Check, ChevronDown, Search, Loader2, 
  AlertCircle, Sparkles, MessageCircle
} from 'lucide-react';
import { GoogleGLogo } from './GoogleRoleConfirmModal';
import { compressImageToDataUrl } from '@/lib/image-compression';

// Supported Country Codes (Default: India 🇮🇳 +91)
const COUNTRIES = [
  { code: '+91', iso: 'in', name: 'India', flag: '🇮🇳' },
  { code: '+1', iso: 'us', name: 'United States', flag: '🇺🇸' },
  { code: '+44', iso: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', iso: 'ae', name: 'UAE', flag: '🇦🇪' },
  { code: '+1', iso: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: '+61', iso: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: '+65', iso: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', iso: 'qa', name: 'Qatar', flag: '🇶🇦' },
  { code: '+977', iso: 'np', name: 'Nepal', flag: '🇳🇵' },
  { code: '+880', iso: 'bd', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', iso: 'lk', name: 'Sri Lanka', flag: '🇱🇰' },
];

interface MandatoryGoogleOnboardingModalProps {
  isOpen: boolean;
  userEmail?: string;
  userFullName?: string;
  initialRole?: 'owner' | 'team_member';
  onComplete: (data: { studioName: string; phone: string; fullName: string; role: string; avatarUrl?: string }) => void;
}

export default function MandatoryGoogleOnboardingModal({
  isOpen,
  userEmail = '',
  userFullName = '',
  initialRole = 'owner',
  onComplete,
}: MandatoryGoogleOnboardingModalProps) {
  // Stages: 'details' -> 'celebration_success'
  const [stage, setStage] = useState<'details' | 'celebration_success'>('details');

  const [role, setRole] = useState<'owner' | 'team_member'>(initialRole);
  const [fullName, setFullName] = useState(userFullName);
  const [studioName, setStudioName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');

  // Country Selector dropdown
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial user details when opening
  useEffect(() => {
    if (isOpen) {
      if (userFullName && !fullName) setFullName(userFullName);
      setRole(initialRole);
      setError(null);
      setStage('details');
    }
  }, [isOpen, userFullName, initialRole]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dual-Cannon Confetti blast
  const fireDualConfetti = () => {
    try {
      const colors = ['#F36F21', '#FF8A3D', '#F59E0B', '#10B981', '#8B5CF6', '#FFFFFF'];
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.72 },
        colors,
        zIndex: 99999,
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.72 },
        colors,
        zIndex: 99999,
      });
    } catch (_) {}
  };

  // Avatar upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingAvatar(true);
        const compressed = await compressImageToDataUrl(file, 400, 0.85);
        setAvatarUrl(compressed);
      } catch (err) {
        console.error('Avatar upload compression error:', err);
      } finally {
        setIsCompressingAvatar(false);
      }
    }
  };

  // Direct Save Onboarding (Mandatory Phone & Studio Details)
  const handleSubmitOnboarding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!fullName.trim()) {
      setError('Your Full Name is required');
      return;
    }

    if (role === 'owner' && !studioName.trim()) {
      setError('Studio / Brand Name is required for Studio Owners');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/save-google-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanDigits,
          countryCode: selectedCountry.code,
          fullName: fullName.trim() || userFullName,
          studioName: studioName.trim() || (fullName.trim() ? `${fullName.trim()}'s Studio` : 'My Studio'),
          role,
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to complete profile setup. Please try again.');
      }

      // Switch to celebratory animation stage
      setStage('celebration_success');
      fireDualConfetti();
      setTimeout(fireDualConfetti, 1000);

      // Complete onboarding and trigger callback
      setTimeout(() => {
        onComplete({
          studioName: json.studioName || studioName,
          phone: json.phone || `${selectedCountry.code}${cleanDigits.slice(-10)}`,
          fullName: json.fullName || fullName,
          role: json.role || role,
          avatarUrl: avatarUrl || undefined,
        });
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Error saving profile details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredCountries = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold shadow-2xs">
              <GoogleGLogo className="w-3.5 h-3.5 bg-white rounded-full p-0.5" />
              <span>Google Account Connected</span>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>

            <h3 className="text-lg sm:text-xl font-serif font-black text-slate-900 tracking-tight pt-1">
              {stage === 'celebration_success' ? '🎉 Welcome to StudioCore!' : 'Complete Your Profile'}
            </h3>

            <p className="text-xs text-slate-500 font-medium">
              {stage === 'celebration_success'
                ? 'Your workspace has been created successfully.'
                : 'Mobile number & workspace setup is required to activate your account.'}
            </p>
          </div>

          {/* User Badge */}
          {userEmail && (
            <div className="p-2.5 rounded-2xl bg-white border border-[#EAE5DA] flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                  {userFullName ? userFullName[0].toUpperCase() : 'U'}
                </span>
                <span className="font-bold text-slate-800 truncate">{userEmail}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                Google Verified
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              DETAILS FORM
          ───────────────────────────────────────────────────────────── */}
          {stage === 'details' && (
            <form onSubmit={handleSubmitOnboarding} className="space-y-3 pt-1">
              {/* Profile Avatar / Logo (Optional) */}
              <div className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-[#EAE5DA] shadow-xs flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-black text-amber-800">
                        {fullName ? fullName[0].toUpperCase() : 'S'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isCompressingAvatar}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow hover:bg-amber-700 transition cursor-pointer"
                    title="Upload photo"
                  >
                    {isCompressingAvatar ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    {role === 'owner' ? 'Studio Logo / Photo' : 'Profile Picture'}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Optional • Tap camera icon to upload
                  </p>
                </div>
              </div>

              {/* Role Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      role === 'owner'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-black shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Studio Owner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('team_member')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      role === 'team_member'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-950 font-black shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Team / Crew</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Full Name <span className="text-rose-500 font-black">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:border-amber-500 focus:outline-none font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Studio Name (if Studio Owner) */}
              {role === 'owner' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Studio / Brand Name <span className="text-rose-500 font-black">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      placeholder="e.g. Royal Wedding Films"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:border-amber-500 focus:outline-none font-medium text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Country Code + Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500 font-black">* (Mandatory)</span>
                </label>
                <div className="flex items-center gap-1.5 relative">
                  {/* Country Selector */}
                  <div className="relative" ref={countryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsCountryOpen(!isCountryOpen)}
                      className="h-9 px-2.5 rounded-xl bg-white border border-[#EAE5DA] flex items-center gap-1 text-xs font-bold text-slate-800 hover:border-amber-500 transition cursor-pointer shrink-0"
                    >
                      <span className="text-sm">{selectedCountry.flag}</span>
                      <span className="font-mono">{selectedCountry.code}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {isCountryOpen && (
                      <div className="absolute left-0 bottom-full mb-1.5 w-60 max-h-56 bg-white border border-[#EAE5DA] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search country..."
                            className="w-full text-xs bg-transparent outline-none font-medium"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.code + c.name}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setIsCountryOpen(false);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs hover:bg-amber-50 text-left font-medium cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </span>
                              <span className="font-mono text-slate-500">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:border-amber-500 focus:outline-none font-medium text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                  <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Used for WhatsApp shoot updates and client quotations</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading || phone.length < 10 || !fullName.trim() || (role === 'owner' && !studioName.trim())}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Setting Up Your Workspace...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Complete Setup & Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              CELEBRATION SUCCESS
          ───────────────────────────────────────────────────────────── */}
          {stage === 'celebration_success' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-xl ring-4 ring-amber-100">
                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">
                  {role === 'owner' ? studioName || 'Studio Created!' : 'Account Activated!'}
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  Registered number: <strong className="font-mono">{selectedCountry.code} {phone.slice(-10)}</strong>
                </p>
                <p className="text-xs text-amber-800 font-bold animate-pulse pt-2">
                  Opening your workspace...
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Heart, AtSign, Phone, Users, Image as ImageIcon,
  Film, Calendar, MapPin, Sparkles, CheckCircle2, AlertCircle,
  Upload, Trash2, Plus, ArrowRight, ExternalLink, Save, Clock,
  ChevronDown, ChevronUp, Share2, Check, Copy, RefreshCw, Send,
  UserCheck, ShieldCheck, HelpCircle, Eye
} from 'lucide-react';
import { compressImage } from '@/lib/compressor';
import confetti from 'canvas-confetti';

interface CouplePhoto {
  url: string;
  caption?: string;
  comment?: string;
}

interface FamilyPhoto {
  url: string;
  side: 'Bride' | 'Groom' | 'Combined';
  relation: string;
  names: string;
}

interface PhotoRef {
  url: string;
  pinterest_url?: string;
  category: 'Pose' | 'Decor' | 'Style' | 'Rituals' | 'Lighting';
  notes?: string;
}

interface VideoRef {
  type: 'Reel' | 'YouTube' | 'Drive' | 'Vimeo';
  url: string;
  notes?: string;
}

interface ItineraryItem {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  rituals_notes: string;
}

interface VenueItem {
  event_name: string;
  venue_name: string;
  address: string;
  maps_url: string;
}

interface OutfitItem {
  event_name: string;
  bride_outfit_url?: string;
  groom_outfit_url?: string;
  notes?: string;
}

interface ContactPerson {
  name: string;
  phone: string;
  relation: string;
}

export default function PublicMoodboardPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [submitted, setSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Studio & Client Meta
  const [studioInfo, setStudioInfo] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);

  // 10 Moodboard Sections State
  const [couplePhotos, setCouplePhotos] = useState<CouplePhoto[]>([]);
  const [brideIg, setBrideIg] = useState('');
  const [groomIg, setGroomIg] = useState('');
  const [coupleIg, setCoupleIg] = useState('');

  const [brideCoordinator, setBrideCoordinator] = useState<ContactPerson>({ name: '', phone: '', relation: '' });
  const [groomCoordinator, setGroomCoordinator] = useState<ContactPerson>({ name: '', phone: '', relation: '' });

  const [familyPhotos, setFamilyPhotos] = useState<FamilyPhoto[]>([]);
  const [photoRefs, setPhotoRefs] = useState<PhotoRef[]>([]);
  const [videoRefs, setVideoRefs] = useState<VideoRef[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitItem[]>([]);
  const [paymentContact, setPaymentContact] = useState<ContactPerson>({ name: '', phone: '', relation: '' });

  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Fetch Moodboard Data on Load
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/moodboard/${token}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load mood board');
        }

        const mb = data.moodboard;
        setStudioInfo(data.studio || null);
        setClientInfo(data.client || null);

        setCouplePhotos(Array.isArray(mb.couple_photos) ? mb.couple_photos : []);
        setBrideIg(mb.bride_instagram || '');
        setGroomIg(mb.groom_instagram || '');
        setCoupleIg(mb.couple_instagram || '');

        setBrideCoordinator(mb.bride_coordinator || { name: '', phone: '', relation: '' });
        setGroomCoordinator(mb.groom_coordinator || { name: '', phone: '', relation: '' });

        setFamilyPhotos(Array.isArray(mb.close_family_photos) ? mb.close_family_photos : []);
        setPhotoRefs(Array.isArray(mb.photo_references) ? mb.photo_references : []);
        setVideoRefs(Array.isArray(mb.video_references) ? mb.video_references : []);
        setItinerary(Array.isArray(mb.itinerary_schedule) ? mb.itinerary_schedule : []);
        setVenues(Array.isArray(mb.venue_locations) ? mb.venue_locations : []);
        setOutfits(Array.isArray(mb.outfit_references) ? mb.outfit_references : []);
        setPaymentContact(mb.payment_contact || { name: '', phone: '', relation: '' });

        setCompletionPercentage(mb.completion_percentage || 0);
        if (mb.status === 'SUBMITTED') {
          setSubmitted(true);
        }

        setTimeout(() => {
          initialLoadDoneRef.current = true;
        }, 800);
      } catch (err: any) {
        setError(err.message || 'Mood board link is invalid or expired.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  // Calculate Progress Locally
  useEffect(() => {
    let score = 0;
    if (couplePhotos.length > 0) score += 15;
    if (brideIg || groomIg || coupleIg) score += 10;
    if (brideCoordinator.name || groomCoordinator.name) score += 10;
    if (familyPhotos.length > 0) score += 10;
    if (photoRefs.length > 0) score += 15;
    if (videoRefs.length > 0) score += 10;
    if (itinerary.length > 0) score += 10;
    if (venues.length > 0) score += 10;
    if (outfits.length > 0) score += 5;
    if (paymentContact.name || paymentContact.phone) score += 5;

    setCompletionPercentage(Math.min(100, score));
  }, [
    couplePhotos, brideIg, groomIg, coupleIg, brideCoordinator,
    groomCoordinator, familyPhotos, photoRefs, videoRefs, itinerary,
    venues, outfits, paymentContact
  ]);

  // Auto-Save Mechanism (Debounced by 1.5s)
  useEffect(() => {
    if (!initialLoadDoneRef.current || !token) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveMoodboardData(false);
    }, 1800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    couplePhotos, brideIg, groomIg, coupleIg, brideCoordinator,
    groomCoordinator, familyPhotos, photoRefs, videoRefs, itinerary,
    venues, outfits, paymentContact
  ]);

  async function saveMoodboardData(isFinalSubmit = false) {
    if (!token) return;
    try {
      setSaving(true);
      setSaveStatus('saving');

      const payload = {
        couple_photos: couplePhotos,
        bride_instagram: brideIg,
        groom_instagram: groomIg,
        couple_instagram: coupleIg,
        bride_coordinator: brideCoordinator,
        groom_coordinator: groomCoordinator,
        close_family_photos: familyPhotos,
        photo_references: photoRefs,
        video_references: videoRefs,
        itinerary_schedule: itinerary,
        venue_locations: venues,
        outfit_references: outfits,
        payment_contact: paymentContact,
        submit: isFinalSubmit,
      };

      const res = await fetch(`/api/moodboard/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Auto-save failed');
      }

      setSaveStatus('saved');
      if (isFinalSubmit) {
        setSubmitted(true);
        setShowCelebration(true);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFDF73', '#FF69B4', '#FFFFFF'],
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  }

  // Handle Image Upload with In-Browser WebP Compression + Cloudflare R2
  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
    sectionKey: string
  ) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingSection(sectionKey);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. In-browser high-efficiency WebP compression
        const compressedFile = await compressImage(file, 1920, 0.82);

        // 2. Upload to Cloudflare R2
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('folder', `moodboards/${token}`);

        const uploadRes = await fetch('/api/upload/r2', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Image upload failed');
        }

        onUploaded(uploadData.url);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Network error'}`);
    } finally {
      setUploadingSection(null);
      event.target.value = '';
    }
  }

  const copyPublicLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] text-[#F3EFEA] flex flex-col items-center justify-center p-6">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
          <Heart className="w-8 h-8 text-[#D4AF37] absolute animate-pulse" />
        </div>
        <p className="mt-6 text-sm font-medium tracking-wider text-[#D4AF37] uppercase">
          Crafting Your Wedding Vision Portal...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] text-[#F3EFEA] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-serif text-white font-bold mb-2">Mood Board Portal Unavailable</h1>
        <p className="text-zinc-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C59F2D] text-black font-semibold rounded-full transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const coupleTitle = clientInfo?.name || 'Your Wedding Story';

  return (
    <div className="min-h-screen bg-[#0B0A09] text-[#F4EFEA] font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-[#FFDF73]">
      {/* ── Top Atmospheric Ambient Lighting ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#D4AF37]/15 via-[#917122]/5 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/8 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#917122]/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* ── Sticky Luxury Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0E0C0A]/85 border-b border-[#2C2720]/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {studioInfo?.logo ? (
              <img src={studioInfo.logo} alt="Studio Logo" className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/40" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#FFF0B3] flex items-center justify-center text-black font-serif font-bold text-base shadow-md">
                ✨
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                {studioInfo?.name || 'StudioCore Photography'}
              </div>
              <h1 className="text-base sm:text-lg font-serif font-semibold text-white tracking-wide truncate max-w-[200px] sm:max-w-md">
                {coupleTitle} • Mood Board
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto-Save Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-zinc-800 rounded-full text-xs text-zinc-400">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-[#D4AF37] animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-zinc-300">All changes saved</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>

            {/* Share / Copy Magic Link */}
            <button
              onClick={copyPublicLink}
              title="Copy link to invite your partner/family"
              className="p-2 sm:px-3 sm:py-1.5 bg-[#1C1915] hover:bg-[#2A251F] border border-[#3A3329] rounded-full text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied' : 'Share Link'}</span>
            </button>

            {/* Submit to Studio Button */}
            <button
              onClick={() => saveMoodboardData(true)}
              disabled={saving || submitted}
              className={`px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-lg flex items-center gap-1.5 ${
                submitted
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:from-[#C59F2D] hover:to-[#D4AF37] text-black shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 active:scale-95'
              }`}
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Submitted to Studio</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Vision</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="max-w-6xl mx-auto mt-2.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              Event Prep Completion
            </span>
            <span className="font-mono text-[#D4AF37] font-semibold">{completionPercentage}% Completed</span>
          </div>
          <div className="w-full h-1.5 bg-[#1C1814] rounded-full overflow-hidden border border-[#2D261C]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#917122] via-[#D4AF37] to-[#FFF0B3]"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* ── Main Portal Body ── */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-12">
        {/* Welcome Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-[#3A3326] bg-gradient-to-b from-[#1E1A14]/90 to-[#12100C]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              ✨ Collaborative Wedding Prep
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide">
              Tell Us Your Dream Wedding Vision
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Every detail helps our team capture your raw emotions, favorite angles, intimate family moments, and customized aesthetic. You and your partner can update this together anytime.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 1: COUPLE PORTRAITS & CHEMISTRY                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Camera className="w-4 h-4" />
                Section 1 • Couple Portraits
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Your Favorite Photos & Chemistry
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Upload 2 to 6 casual or styled photos together. This helps our lead photographers study your height difference, best smiling angles, and couple vibe.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingSection === 'couple' ? 'Compressing...' : 'Add Photos'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={uploadingSection === 'couple'}
                onChange={(e) =>
                  handleFileUpload(
                    e,
                    (url) => setCouplePhotos((prev) => [...prev, { url, caption: '' }]),
                    'couple'
                  )
                }
              />
            </label>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {couplePhotos.map((photo, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#2D261C] bg-[#1C1813] flex flex-col">
                <div className="aspect-[4/5] w-full overflow-hidden bg-black/50 relative">
                  <img src={photo.url} alt={`Couple ${idx + 1}`} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                  <button
                    onClick={() => setCouplePhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition opacity-0 group-hover:opacity-100"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2.5 bg-[#16130F]">
                  <input
                    type="text"
                    placeholder="E.g. We love this side profile!"
                    value={photo.caption || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCouplePhotos((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, caption: val } : p))
                      );
                    }}
                    className="w-full text-xs bg-transparent border-b border-zinc-700/60 focus:border-[#D4AF37] text-zinc-200 placeholder-zinc-500 outline-none pb-1"
                  />
                </div>
              </div>
            ))}

            {couplePhotos.length === 0 && (
              <div className="col-span-full py-10 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-[#16130F]/40">
                <ImageIcon className="w-10 h-10 text-[#D4AF37]/50 mb-2" />
                <p className="text-sm text-zinc-300 font-medium">No couple photos added yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Click 'Add Photos' above to upload high-res photos. We automatically compress them directly in your browser.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 2: SOCIAL MEDIA & HASHTAGS                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
              <AtSign className="w-4 h-4" />
              Section 2 • Social Handles & Hashtag
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Instagram Handles & Wedding Tag
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              For tagging during teaser drops, same-day edits, and reel collaborations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Bride's Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">@</span>
                <input
                  type="text"
                  placeholder="bride_handle"
                  value={brideIg}
                  onChange={(e) => setBrideIg(e.target.value.replace(/^@/, ''))}
                  className="w-full bg-[#1C1813] border border-[#2D261C] rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Groom's Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">@</span>
                <input
                  type="text"
                  placeholder="groom_handle"
                  value={groomIg}
                  onChange={(e) => setGroomIg(e.target.value.replace(/^@/, ''))}
                  className="w-full bg-[#1C1813] border border-[#2D261C] rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Couple / Wedding Hashtag</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#D4AF37] text-sm">#</span>
                <input
                  type="text"
                  placeholder="SahilWedsPriya"
                  value={coupleIg}
                  onChange={(e) => setCoupleIg(e.target.value.replace(/^#/, ''))}
                  className="w-full bg-[#1C1813] border border-[#2D261C] rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 3: COORDINATION CONTACTS (BRIDE & GROOM SIDES)       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
              <Phone className="w-4 h-4" />
              Section 3 • Event-Day Coordinators
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Who Should Our Team Coordinate With?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              On the wedding day, you will be busy getting ready. Give us 1 trusted contact from the Bride's side and 1 from the Groom's side (e.g. Sibling or Best Friend) for shoot timings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bride Coordinator */}
            <div className="p-5 rounded-2xl bg-[#191510] border border-[#2D261C] space-y-3">
              <div className="flex items-center gap-2 text-sm font-serif font-semibold text-rose-300">
                👰 Bride's Side Coordinator
              </div>
              <input
                type="text"
                placeholder="Full Name (e.g. Ananya Sharma)"
                value={brideCoordinator.name}
                onChange={(e) => setBrideCoordinator({ ...brideCoordinator, name: e.target.value })}
                className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  placeholder="Phone / WhatsApp Number"
                  value={brideCoordinator.phone}
                  onChange={(e) => setBrideCoordinator({ ...brideCoordinator, phone: e.target.value })}
                  className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
                <input
                  type="text"
                  placeholder="Relation (e.g. Sister, MUA)"
                  value={brideCoordinator.relation}
                  onChange={(e) => setBrideCoordinator({ ...brideCoordinator, relation: e.target.value })}
                  className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            {/* Groom Coordinator */}
            <div className="p-5 rounded-2xl bg-[#191510] border border-[#2D261C] space-y-3">
              <div className="flex items-center gap-2 text-sm font-serif font-semibold text-blue-300">
                🤵 Groom's Side Coordinator
              </div>
              <input
                type="text"
                placeholder="Full Name (e.g. Rohan Nawale)"
                value={groomCoordinator.name}
                onChange={(e) => setGroomCoordinator({ ...groomCoordinator, name: e.target.value })}
                className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  placeholder="Phone / WhatsApp Number"
                  value={groomCoordinator.phone}
                  onChange={(e) => setGroomCoordinator({ ...groomCoordinator, phone: e.target.value })}
                  className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
                <input
                  type="text"
                  placeholder="Relation (e.g. Brother, Best Man)"
                  value={groomCoordinator.relation}
                  onChange={(e) => setGroomCoordinator({ ...groomCoordinator, relation: e.target.value })}
                  className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 4: CLOSE FAMILY PHOTOS (VIP SHOT LIST)               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Section 4 • VIP Family Member Photos
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Close Family Identification Photos
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Upload photos of parents, siblings, and grandparents. Tag them so our team can proactively spot and prioritize them during crowded rituals and stage ceremonies.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingSection === 'family' ? 'Uploading...' : 'Add Family Photo'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={uploadingSection === 'family'}
                onChange={(e) =>
                  handleFileUpload(
                    e,
                    (url) =>
                      setFamilyPhotos((prev) => [
                        ...prev,
                        { url, side: 'Bride', relation: 'Parents', names: '' },
                      ]),
                    'family'
                  )
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {familyPhotos.map((fam, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#2D261C] bg-[#1A1612] p-3 space-y-2.5">
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black relative">
                  <img src={fam.url} alt="Family member" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFamilyPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex gap-2">
                    <select
                      value={fam.side}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFamilyPhotos((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, side: val } : f))
                        );
                      }}
                      className="bg-[#120F0C] border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none"
                    >
                      <option value="Bride">Bride's Side</option>
                      <option value="Groom">Groom's Side</option>
                      <option value="Combined">Both Sides</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Relation (e.g. Mother, Dadi)"
                      value={fam.relation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFamilyPhotos((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, relation: val } : f))
                        );
                      }}
                      className="flex-1 bg-[#120F0C] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Names (e.g. Rajesh & Sunita)"
                    value={fam.names}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFamilyPhotos((prev) =>
                        prev.map((f, i) => (i === idx ? { ...f, names: val } : f))
                      );
                    }}
                    className="w-full bg-[#120F0C] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white outline-none"
                  />
                </div>
              </div>
            ))}

            {familyPhotos.length === 0 && (
              <div className="col-span-full py-8 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-[#16130F]/40">
                <Users className="w-8 h-8 text-[#D4AF37]/50 mb-2" />
                <p className="text-sm text-zinc-300 font-medium">No family references added</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Upload quick photos of key family members so our team never misses their special moments.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 5: VISUAL INSPIRATION & MOOD BOARDS                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Section 5 • Visual Mood Board & Pinterest
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Aesthetic Inspiration & Pose Ideas
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Upload screenshots from Instagram/Pinterest or paste Pinterest board links. Categorize by Poses, Decor, Lighting, or Rituals.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingSection === 'inspo' ? 'Uploading...' : 'Add Inspiration'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={uploadingSection === 'inspo'}
                onChange={(e) =>
                  handleFileUpload(
                    e,
                    (url) =>
                      setPhotoRefs((prev) => [
                        ...prev,
                        { url, category: 'Pose', notes: '', pinterest_url: '' },
                      ]),
                    'inspo'
                  )
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photoRefs.map((ref, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#2D261C] bg-[#1A1612] flex flex-col">
                <div className="aspect-[4/5] w-full bg-black relative overflow-hidden">
                  <img src={ref.url} alt="Inspiration" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <button
                    onClick={() => setPhotoRefs((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] text-[#D4AF37] font-semibold">
                    {ref.category}
                  </span>
                </div>

                <div className="p-2 space-y-1.5 bg-[#15120E]">
                  <select
                    value={ref.category}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setPhotoRefs((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, category: val } : r))
                      );
                    }}
                    className="w-full text-[11px] bg-[#1E1A14] border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none"
                  >
                    <option value="Pose">Couple Poses</option>
                    <option value="Decor">Decor & Vibe</option>
                    <option value="Style">Cinematic Style</option>
                    <option value="Rituals">Mandap / Rituals</option>
                    <option value="Lighting">Moody / Flash</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Notes (e.g. Love this veil shot)"
                    value={ref.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhotoRefs((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, notes: val } : r))
                      );
                    }}
                    className="w-full text-[11px] bg-transparent border-b border-zinc-700/60 focus:border-[#D4AF37] text-zinc-200 placeholder-zinc-500 outline-none pb-0.5"
                  />
                </div>
              </div>
            ))}

            {photoRefs.length === 0 && (
              <div className="col-span-full py-8 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-[#16130F]/40">
                <Sparkles className="w-8 h-8 text-[#D4AF37]/50 mb-2" />
                <p className="text-sm text-zinc-300 font-medium">No inspiration photos uploaded yet</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Upload screenshot references of bridal entries, portraits, or lighting you admire.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 6: VIDEO & REEL REFERENCES                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Film className="w-4 h-4" />
                Section 6 • Video & Reel References
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Cinematic Films & Reel Inspiration
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Share links to Instagram Reels, YouTube Wedding Films, or Google Drive clips that match your dream video editing pace and audio tracks.
              </p>
            </div>

            <button
              onClick={() => setVideoRefs((prev) => [...prev, { type: 'Reel', url: '', notes: '' }])}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Link</span>
            </button>
          </div>

          <div className="space-y-3">
            {videoRefs.map((vid, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#191510] border border-[#2D261C] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <select
                  value={vid.type}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setVideoRefs((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, type: val } : v))
                    );
                  }}
                  className="bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
                >
                  <option value="Reel">Instagram Reel</option>
                  <option value="YouTube">YouTube Film</option>
                  <option value="Drive">Google Drive</option>
                  <option value="Vimeo">Vimeo</option>
                </select>

                <input
                  type="url"
                  placeholder="Paste URL (e.g. https://www.instagram.com/reel/...)"
                  value={vid.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVideoRefs((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, url: val } : v))
                    );
                  }}
                  className="flex-1 bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />

                <input
                  type="text"
                  placeholder="Notes (e.g. Love the audio transition)"
                  value={vid.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVideoRefs((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, notes: val } : v))
                    );
                  }}
                  className="w-full sm:w-64 bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />

                <button
                  onClick={() => setVideoRefs((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-2 hover:bg-rose-600/20 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {videoRefs.length === 0 && (
              <div className="py-6 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-[#16130F]/40">
                <Film className="w-8 h-8 text-[#D4AF37]/50 mb-1.5" />
                <p className="text-xs text-zinc-400 font-medium">No video or reel references added</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 7: EVENT ITINERARY & RITUALS SCHEDULE               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                Section 7 • Master Event Schedule
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Event Timings & Key Rituals
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Add each ceremony (Haldi, Mehendi, Sangeet, Wedding, Reception) with expected start and end timings.
              </p>
            </div>

            <button
              onClick={() =>
                setItinerary((prev) => [
                  ...prev,
                  {
                    event_name: 'Wedding Ceremony',
                    date: '',
                    start_time: '10:00 AM',
                    end_time: '02:00 PM',
                    rituals_notes: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          <div className="space-y-4">
            {itinerary.map((item, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#191510] border border-[#2D261C] space-y-3 relative group">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    placeholder="Event Name (e.g. Sangeet & Cocktail)"
                    value={item.event_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItinerary((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, event_name: val } : it))
                      );
                    }}
                    className="font-serif font-semibold text-base text-[#D4AF37] bg-transparent border-b border-zinc-700/60 focus:border-[#D4AF37] outline-none pb-0.5 flex-1"
                  />
                  <button
                    onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 hover:bg-rose-600/20 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Event Date</label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItinerary((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, date: val } : it))
                        );
                      }}
                      className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">Start Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 06:00 PM"
                      value={item.start_time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItinerary((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, start_time: val } : it))
                        );
                      }}
                      className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">End Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 11:30 PM"
                      value={item.end_time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItinerary((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, end_time: val } : it))
                        );
                      }}
                      className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 text-xs font-medium">
                    Must-Capture Moments & Special Rituals
                  </label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Flashmob by cousins at 9 PM, bride solo dance entry, phoolon ki chaadar ritual."
                    value={item.rituals_notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItinerary((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, rituals_notes: val } : it))
                      );
                    }}
                    className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            ))}

            {itinerary.length === 0 && (
              <div className="py-6 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-[#16130F]/40">
                <Calendar className="w-8 h-8 text-[#D4AF37]/50 mb-1.5" />
                <p className="text-xs text-zinc-400 font-medium">No events added yet. Click 'Add Event' above.</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 8: EVENT VENUES & GOOGLE MAPS                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                Section 8 • Venue Locations & Maps
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Where are the Celebrations Happening?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Provide venue names and Google Maps location links so the photography and drone crew reach on time.
              </p>
            </div>

            <button
              onClick={() =>
                setVenues((prev) => [
                  ...prev,
                  { event_name: '', venue_name: '', address: '', maps_url: '' },
                ])
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Venue</span>
            </button>
          </div>

          <div className="space-y-3">
            {venues.map((ven, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#191510] border border-[#2D261C] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
                <input
                  type="text"
                  placeholder="Event (e.g. Wedding & Reception)"
                  value={ven.event_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVenues((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, event_name: val } : v))
                    );
                  }}
                  className="bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />

                <input
                  type="text"
                  placeholder="Venue Name (e.g. Taj Lands End)"
                  value={ven.venue_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVenues((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, venue_name: val } : v))
                    );
                  }}
                  className="bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />

                <input
                  type="text"
                  placeholder="Full Address / City"
                  value={ven.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVenues((prev) =>
                      prev.map((v, i) => (i === idx ? { ...v, address: val } : v))
                    );
                  }}
                  className="bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Google Maps URL"
                    value={ven.maps_url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVenues((prev) =>
                        prev.map((v, i) => (i === idx ? { ...v, maps_url: val } : v))
                      );
                    }}
                    className="flex-1 bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                  />
                  {ven.maps_url && (
                    <a
                      href={ven.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl hover:bg-[#D4AF37]/30 transition"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setVenues((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-2 hover:bg-rose-600/20 text-zinc-500 hover:text-rose-400 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {venues.length === 0 && (
              <div className="py-6 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-[#16130F]/40">
                <MapPin className="w-8 h-8 text-[#D4AF37]/50 mb-1.5" />
                <p className="text-xs text-zinc-400 font-medium">No venues added yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 9: FINALIZED OUTFITS & JEWELRY STYLING              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                <Heart className="w-4 h-4" />
                Section 9 • Outfits & Styling Harmonies
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                Bride & Groom Outfits per Event
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Upload photos of your final wedding lehenga, sherwani, or reception gowns. This helps us plan color-grading LUTs, backdrop color contrasts, and lighting setups.
              </p>
            </div>

            <button
              onClick={() =>
                setOutfits((prev) => [
                  ...prev,
                  { event_name: 'Wedding Day', notes: '' },
                ])
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-full text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event Outfits</span>
            </button>
          </div>

          <div className="space-y-4">
            {outfits.map((outfit, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#191510] border border-[#2D261C] space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Event (e.g. Sangeet / Wedding)"
                    value={outfit.event_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOutfits((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, event_name: val } : o))
                      );
                    }}
                    className="font-serif font-semibold text-sm text-[#D4AF37] bg-transparent border-b border-zinc-700/60 focus:border-[#D4AF37] outline-none pb-0.5 flex-1"
                  />
                  <button
                    onClick={() => setOutfits((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 hover:bg-rose-600/20 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bride Outfit */}
                  <div className="p-3 bg-[#120F0C] rounded-xl border border-zinc-800 space-y-2">
                    <div className="text-xs font-medium text-rose-300">👰 Bride's Outfit & Jewelry</div>
                    {outfit.bride_outfit_url ? (
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700">
                        <img src={outfit.bride_outfit_url} alt="Bride Outfit" className="w-full h-full object-cover" />
                        <button
                          onClick={() =>
                            setOutfits((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, bride_outfit_url: undefined } : o))
                            )
                          }
                          className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 text-white rounded-full"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer border border-dashed border-zinc-700 hover:border-[#D4AF37] rounded-lg aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition">
                        <Upload className="w-5 h-5 text-[#D4AF37] mb-1" />
                        <span className="text-[11px] text-zinc-400">Upload Bride Outfit Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              (url) =>
                                setOutfits((prev) =>
                                  prev.map((o, i) => (i === idx ? { ...o, bride_outfit_url: url } : o))
                                ),
                              `outfit-bride-${idx}`
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  {/* Groom Outfit */}
                  <div className="p-3 bg-[#120F0C] rounded-xl border border-zinc-800 space-y-2">
                    <div className="text-xs font-medium text-blue-300">🤵 Groom's Outfit & Stole</div>
                    {outfit.groom_outfit_url ? (
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700">
                        <img src={outfit.groom_outfit_url} alt="Groom Outfit" className="w-full h-full object-cover" />
                        <button
                          onClick={() =>
                            setOutfits((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, groom_outfit_url: undefined } : o))
                            )
                          }
                          className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 text-white rounded-full"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer border border-dashed border-zinc-700 hover:border-[#D4AF37] rounded-lg aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition">
                        <Upload className="w-5 h-5 text-[#D4AF37] mb-1" />
                        <span className="text-[11px] text-zinc-400">Upload Groom Outfit Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              (url) =>
                                setOutfits((prev) =>
                                  prev.map((o, i) => (i === idx ? { ...o, groom_outfit_url: url } : o))
                                ),
                              `outfit-groom-${idx}`
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Styling notes (e.g. Pastel pink lehenga with gold embroidery, emerald necklace)"
                  value={outfit.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOutfits((prev) =>
                      prev.map((o, i) => (i === idx ? { ...o, notes: val } : o))
                    );
                  }}
                  className="w-full bg-[#120F0C] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] outline-none"
                />
              </div>
            ))}

            {outfits.length === 0 && (
              <div className="py-6 border border-dashed border-[#3A3326] rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-[#16130F]/40">
                <Heart className="w-8 h-8 text-[#D4AF37]/50 mb-1.5" />
                <p className="text-xs text-zinc-400 font-medium">No outfit references added yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 10: WEDDING-DAY PAYMENT COORDINATOR                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-[#14120E]/90 border border-[#2D261C] rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              Section 10 • On-Day Vendor & Payment Manager
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
              Who is Authorized for Vendor Payments on Event Day?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              To keep your shoot stress-free, please nominate the trusted person (e.g. Uncle, Father, Elder Brother) handling stage settlements or food arrangements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Full Name (e.g. Suresh Nawale)"
              value={paymentContact.name}
              onChange={(e) => setPaymentContact({ ...paymentContact, name: e.target.value })}
              className="bg-[#1C1813] border border-[#2D261C] rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={paymentContact.phone}
              onChange={(e) => setPaymentContact({ ...paymentContact, phone: e.target.value })}
              className="bg-[#1C1813] border border-[#2D261C] rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
            />
            <input
              type="text"
              placeholder="Relation (e.g. Bride's Father / Chacha)"
              value={paymentContact.relation}
              onChange={(e) => setPaymentContact({ ...paymentContact, relation: e.target.value })}
              className="bg-[#1C1813] border border-[#2D261C] rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
            />
          </div>
        </section>

        {/* ── Final Submit Banner ── */}
        <div className="bg-gradient-to-r from-[#1E1A14] via-[#2A2319] to-[#1E1A14] border border-[#D4AF37]/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto animate-bounce" />
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Ready to Share Your Vision with the Studio?
          </h3>
          <p className="text-sm text-zinc-300 max-w-xl mx-auto">
            Once submitted, your lead photographer, cinematographer, and project manager will review the aesthetic mood board and align the shooting crew.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => saveMoodboardData(false)}
              disabled={saving}
              className="px-6 py-3 rounded-full bg-[#1C1813] hover:bg-[#2A241B] border border-zinc-700 text-zinc-200 font-semibold text-sm transition flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>{saving ? 'Saving...' : 'Save Draft Progress'}</span>
            </button>

            <button
              onClick={() => saveMoodboardData(true)}
              disabled={saving || submitted}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37] hover:from-[#C59F2D] hover:to-[#D4AF37] text-black font-bold text-sm tracking-wide transition shadow-lg shadow-[#D4AF37]/25 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitted ? 'Vision Submitted ✓' : 'Submit Mood Board to Studio'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#231E17] py-8 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} {studioInfo?.name || 'StudioCore'}. Powered by StudioCore™ High-Performance Creative Portal.</p>
      </footer>

      {/* ── Submission Celebration Modal ── */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-md w-full bg-[#1A1611] border border-[#D4AF37]/60 rounded-3xl p-8 text-center space-y-5 shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-full flex items-center justify-center mx-auto text-2xl">
                💍
              </div>

              <h4 className="text-2xl font-serif font-bold text-white">
                Vision Successfully Submitted!
              </h4>

              <p className="text-sm text-zinc-300 leading-relaxed">
                Thank you, <strong className="text-[#D4AF37]">{coupleTitle}</strong>! Our photography and cinematography team will craft your shot lists according to your personalized references.
              </p>

              <div className="p-3 bg-[#110E0B] rounded-2xl border border-zinc-800 text-xs text-zinc-400">
                You can revisit this link anytime to update details or add new outfit photos.
              </div>

              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#C59F2D] text-black font-bold rounded-full transition"
              >
                Back to Mood Board
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

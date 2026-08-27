'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Hash, Phone, Users, Sparkles, Film, Calendar,
  MapPin, Heart, DollarSign, Upload, Trash2, Plus, ChevronDown,
  ChevronUp, Check, Copy, RefreshCw, Send, CheckCircle2,
  AlertCircle, Play, ExternalLink, Star, Eye, Clock, X
} from 'lucide-react';
import { compressImage } from '@/lib/compressor';
import { getMediaUrl } from '@/lib/r2-storage';
import confetti from 'canvas-confetti';

export interface CouplePhoto {
  url: string;
  caption?: string;
  comment?: string;
}

export interface FamilyPhoto {
  url: string;
  side: 'Bride' | 'Groom' | 'Combined';
  relation: string;
  names: string;
}

export interface PhotoRef {
  url: string;
  pinterest_url?: string;
  category: 'Pose' | 'Decor' | 'Style' | 'Rituals' | 'Lighting';
  notes?: string;
}

export interface VideoRef {
  type: 'Reel' | 'YouTube' | 'Drive' | 'Vimeo';
  url: string;
  notes?: string;
}

export interface ItineraryItem {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  rituals_notes: string;
}

export interface VenueItem {
  event_name: string;
  venue_name: string;
  address: string;
  maps_url: string;
}

export interface OutfitItem {
  event_name: string;
  bride_outfit_url?: string;
  groom_outfit_url?: string;
  notes?: string;
}

export interface ContactPerson {
  name: string;
  phone: string;
  relation: string;
}

export interface MoodboardClientViewProps {
  initialData?: any;
  client?: any;
  studio?: any;
  token: string;
}

export function MoodboardClientView({
  initialData,
  client,
  studio,
  token,
}: MoodboardClientViewProps) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [submitted, setSubmitted] = useState(initialData?.status === 'SUBMITTED');
  const [showCelebration, setShowCelebration] = useState(false);

  // 10 Moodboard Sections State (with safe fallback defaults)
  const [couplePhotos, setCouplePhotos] = useState<CouplePhoto[]>(
    Array.isArray(initialData?.couple_photos) ? initialData.couple_photos : []
  );
  const [brideIg, setBrideIg] = useState<string>(initialData?.bride_instagram || '');
  const [groomIg, setGroomIg] = useState<string>(initialData?.groom_instagram || '');
  const [coupleIg, setCoupleIg] = useState<string>(initialData?.couple_instagram || '');

  const [brideCoordinator, setBrideCoordinator] = useState<ContactPerson>(
    initialData?.bride_coordinator || { name: '', phone: '', relation: '' }
  );
  const [groomCoordinator, setGroomCoordinator] = useState<ContactPerson>(
    initialData?.groom_coordinator || { name: '', phone: '', relation: '' }
  );

  const [familyPhotos, setFamilyPhotos] = useState<FamilyPhoto[]>(
    Array.isArray(initialData?.close_family_photos) ? initialData.close_family_photos : []
  );
  const [photoRefs, setPhotoRefs] = useState<PhotoRef[]>(
    Array.isArray(initialData?.photo_references) ? initialData.photo_references : []
  );
  const [videoRefs, setVideoRefs] = useState<VideoRef[]>(
    Array.isArray(initialData?.video_references) ? initialData.video_references : []
  );
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(
    Array.isArray(initialData?.itinerary_schedule) ? initialData.itinerary_schedule : []
  );
  const [venues, setVenues] = useState<VenueItem[]>(
    Array.isArray(initialData?.venue_locations) ? initialData.venue_locations : []
  );
  const [outfits, setOutfits] = useState<OutfitItem[]>(
    Array.isArray(initialData?.outfit_references) ? initialData.outfit_references : []
  );
  const [paymentContact, setPaymentContact] = useState<ContactPerson>(
    initialData?.payment_contact || { name: '', phone: '', relation: '' }
  );

  const [completionPercentage, setCompletionPercentage] = useState<number>(
    initialData?.completion_percentage || 0
  );
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Collapsible Accordion State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': true,
    '04': Array.isArray(initialData?.close_family_photos) && initialData.close_family_photos.length > 0,
    '05': Array.isArray(initialData?.photo_references) && initialData.photo_references.length > 0,
    '06': Array.isArray(initialData?.video_references) && initialData.video_references.length > 0,
    '07': Array.isArray(initialData?.itinerary_schedule) && initialData.itinerary_schedule.length > 0,
    '08': Array.isArray(initialData?.venue_locations) && initialData.venue_locations.length > 0,
    '09': Array.isArray(initialData?.outfit_references) && initialData.outfit_references.length > 0,
    '10': !!(initialData?.payment_contact?.name || initialData?.payment_contact?.phone),
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: true }));
  };

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadDoneRef.current = true;
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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

  // Auto-Save Mechanism (Debounced by 1.8s)
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
          colors: ['#F59E0B', '#F97316', '#EC4899', '#3B82F6'],
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
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const coupleTitle = client?.name || initialData?.client_name || 'Rohit Weds Priya';
  const studioName = studio?.name || 'STUDIOCORE PHOTOGRAPHY';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      
      {/* ── Luxury Header Banner ── */}
      <header className="pt-8 pb-6 px-4 sm:px-8 max-w-5xl mx-auto">
        {/* Studio Brand Tag */}
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-700 mb-2">
          <span className="w-4 h-4 rounded-full border border-amber-500/40 bg-amber-50 flex items-center justify-center text-[10px] text-amber-600 font-bold">
            ◎
          </span>
          <span>{studioName}</span>
        </div>

        {/* Title Row & Top Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              {coupleTitle}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#F3EFEA] border border-[#E5DFD7] text-slate-600 text-xs font-semibold">
              Mood Board
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Share Link Button */}
            <button
              onClick={copyPublicLink}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Copied Link' : 'Share Link'}</span>
            </button>

            {/* Submit Vision Button */}
            <button
              onClick={() => saveMoodboardData(true)}
              disabled={saving || submitted}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 ${
                submitted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20'
              }`}
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Submitted ✓</span>
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
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Event Prep Completion</span>
            <span className="text-slate-800 font-mono">{completionPercentage}% Completed</span>
          </div>
          <div className="w-full h-1.5 bg-[#EAE5DD] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* ── Main Interactive Stepper & Cards Container ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <div className="relative">

          {/* ── Vertical Timeline Connector Line (Desktop) ── */}
          <div className="hidden sm:block absolute left-5 top-8 bottom-8 w-[1.5px] bg-[#EAE4DC] z-0" />

          {/* ── All 10 Stepper Cards ── */}
          <div className="space-y-6 sm:pl-16 relative z-10">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 01. COUPLE PORTRAITS                                        */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (01) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-[#F59E0B] text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                01
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Couple Portraits</h2>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Upload 2 to 6 casual or styled photos together. This helps our photographers study your height difference, best smiling angles, and couple vibe.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <label className="cursor-pointer px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>{uploadingSection === 'couple' ? 'Compressing...' : 'Add Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingSection === 'couple'}
                        onChange={(e) => {
                          openSection('01');
                          handleFileUpload(
                            e,
                            (url) => setCouplePhotos((prev) => [...prev, { url, caption: '' }]),
                            'couple'
                          );
                        }}
                      />
                    </label>
                    <button
                      onClick={() => toggleSection('01')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['01'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['01'] && (
                  <div className="pt-1">
                    {couplePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                        {couplePhotos.map((photo, idx) => (
                          <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#EAE5DD] bg-slate-50 flex flex-col">
                            <div className="aspect-[4/5] w-full bg-slate-100 relative overflow-hidden">
                              <img src={getMediaUrl(photo.url)} alt={`Couple ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              <button
                                onClick={() => setCouplePhotos((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Add note/caption..."
                              value={photo.caption || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCouplePhotos((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, caption: val } : p))
                                );
                              }}
                              className="p-2 text-[11px] bg-white border-t border-[#EAE5DD] text-slate-700 outline-none placeholder-slate-400"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Exact Screenshot Empty State */
                      <div className="border border-dashed border-[#EAE4DC] rounded-2xl py-9 px-4 flex flex-col items-center justify-center text-center bg-[#FAF8F5]/60">
                        <div className="w-10 h-10 rounded-full bg-amber-100/60 text-amber-600 flex items-center justify-center mb-2">
                          <Camera className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">No couple photos added yet</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Upload photos to get started.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 02. SOCIAL HANDLES & HASHTAG                                */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (02) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-[#F59E0B] text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                02
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Social Handles & Hashtag</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        For tagging during teaser drops, same-day edits, and reel collaborations.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSection('02')}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                  >
                    {expandedSections['02'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections['02'] && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    {/* Bride Instagram */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bride's Instagram</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-bold">@</span>
                        <input
                          type="text"
                          placeholder="bride_handle"
                          value={brideIg}
                          onChange={(e) => setBrideIg(e.target.value.replace(/^@/, ''))}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition"
                        />
                      </div>
                    </div>

                    {/* Groom Instagram */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Groom's Instagram</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-bold">@</span>
                        <input
                          type="text"
                          placeholder="groom_handle"
                          value={groomIg}
                          onChange={(e) => setGroomIg(e.target.value.replace(/^@/, ''))}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition"
                        />
                      </div>
                    </div>

                    {/* Couple / Wedding Hashtag */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Couple / Wedding Hashtag</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-amber-600 text-xs font-bold">#</span>
                        <input
                          type="text"
                          placeholder="SahilWedsPriya"
                          value={coupleIg}
                          onChange={(e) => setCoupleIg(e.target.value.replace(/^#/, ''))}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 03. EVENT-DAY COORDINATORS                                  */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (03) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-[#8B5CF6] text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                03
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Event-Day Coordinators</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        On the wedding day, you will be busy getting ready. Give us trusted contacts from the Bride's side and Groom's side (e.g. Sibling or Best Friend) for shoot timings.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSection('03')}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                  >
                    {expandedSections['03'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections['03'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    {/* Bride Coordinator Box */}
                    <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] space-y-3">
                      <div className="text-xs font-bold text-slate-800">Bride's Side Coordinator</div>
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Ananya Sharma)"
                        value={brideCoordinator.name}
                        onChange={(e) => setBrideCoordinator({ ...brideCoordinator, name: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                      <input
                        type="tel"
                        placeholder="Phone / WhatsApp Number"
                        value={brideCoordinator.phone}
                        onChange={(e) => setBrideCoordinator({ ...brideCoordinator, phone: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        placeholder="Relation (e.g. Sister, MUA)"
                        value={brideCoordinator.relation}
                        onChange={(e) => setBrideCoordinator({ ...brideCoordinator, relation: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Groom Coordinator Box */}
                    <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] space-y-3">
                      <div className="text-xs font-bold text-slate-800">Groom's Side Coordinator</div>
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Rohan Nawale)"
                        value={groomCoordinator.name}
                        onChange={(e) => setGroomCoordinator({ ...groomCoordinator, name: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                      <input
                        type="tel"
                        placeholder="Phone / WhatsApp Number"
                        value={groomCoordinator.phone}
                        onChange={(e) => setGroomCoordinator({ ...groomCoordinator, phone: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        placeholder="Relation (e.g. Brother, Best Friend)"
                        value={groomCoordinator.relation}
                        onChange={(e) => setGroomCoordinator({ ...groomCoordinator, relation: e.target.value })}
                        className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 04. CLOSE FAMILY IDENTIFICATION PHOTOS                      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (04) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                04
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Close Family Identification Photos</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add family photos to help us recognize key members.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <label className="cursor-pointer px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>{uploadingSection === 'family' ? 'Uploading...' : 'Add Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingSection === 'family'}
                        onChange={(e) => {
                          openSection('04');
                          handleFileUpload(
                            e,
                            (url) =>
                              setFamilyPhotos((prev) => [
                                ...prev,
                                { url, side: 'Bride', relation: 'Parents', names: '' },
                              ]),
                            'family'
                          );
                        }}
                      />
                    </label>
                    <button
                      onClick={() => toggleSection('04')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['04'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['04'] && (
                  <div className="pt-2">
                    {familyPhotos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        {familyPhotos.map((fam, idx) => (
                          <div key={idx} className="rounded-2xl border border-[#EAE5DD] bg-slate-50 p-3 space-y-2">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-200 relative">
                              <img src={getMediaUrl(fam.url)} alt="Family" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setFamilyPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <select
                                value={fam.side}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, side: val } : f))
                                  );
                                }}
                                className="bg-white border border-[#EAE5DD] rounded-lg px-2 py-1 text-slate-700 text-[11px] font-bold"
                              >
                                <option value="Bride">Bride Side</option>
                                <option value="Groom">Groom Side</option>
                                <option value="Combined">Both</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Relation"
                                value={fam.relation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, relation: val } : f))
                                  );
                                }}
                                className="flex-1 bg-white border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] text-slate-800"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Names (e.g. Ramesh & Sita)"
                              value={fam.names}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFamilyPhotos((prev) =>
                                  prev.map((f, i) => (i === idx ? { ...f, names: val } : f))
                                );
                              }}
                              className="w-full bg-white border border-[#EAE5DD] rounded-lg px-2.5 py-1 text-[11px] text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">No family photos added yet. Click 'Add Photos' above.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 05. AESTHETIC INSPIRATION & POSE IDEAS                      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (05) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                05
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Aesthetic Inspiration & Pose Ideas</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share screenshots, Pinterest boards or reference photos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <label className="cursor-pointer px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95">
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>{uploadingSection === 'inspo' ? 'Uploading...' : 'Add Inspiration'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingSection === 'inspo'}
                        onChange={(e) => {
                          openSection('05');
                          handleFileUpload(
                            e,
                            (url) =>
                              setPhotoRefs((prev) => [
                                ...prev,
                                { url, category: 'Pose', notes: '' },
                              ]),
                            'inspo'
                          );
                        }}
                      />
                    </label>
                    <button
                      onClick={() => toggleSection('05')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['05'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['05'] && (
                  <div className="pt-2">
                    {photoRefs.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        {photoRefs.map((ref, idx) => (
                          <div key={idx} className="rounded-2xl border border-[#EAE5DD] bg-slate-50 overflow-hidden flex flex-col">
                            <div className="aspect-[4/5] bg-slate-200 relative">
                              <img src={getMediaUrl(ref.url)} alt="Inspo" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setPhotoRefs((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/70 rounded text-[9px] text-amber-300 font-bold">
                                {ref.category}
                              </span>
                            </div>
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={ref.notes || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPhotoRefs((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, notes: val } : r))
                                );
                              }}
                              className="p-2 text-[11px] bg-white border-t border-[#EAE5DD] text-slate-700 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">No inspiration items added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 06. VIDEO & REELS REFERENCES                                */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (06) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                06
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Video & Reels References</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share reference videos, reels or cinematic ideas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        openSection('06');
                        setVideoRefs((prev) => [...prev, { type: 'Reel', url: '', notes: '' }]);
                      }}
                      className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Link</span>
                    </button>
                    <button
                      onClick={() => toggleSection('06')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['06'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['06'] && (
                  <div className="space-y-3 pt-2">
                    {videoRefs.map((vid, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <select
                          value={vid.type}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setVideoRefs((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, type: val } : v))
                            );
                          }}
                          className="bg-white border border-[#EAE5DD] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                        >
                          <option value="Reel">Instagram Reel</option>
                          <option value="YouTube">YouTube Film</option>
                          <option value="Drive">Google Drive</option>
                        </select>
                        <input
                          type="url"
                          placeholder="Paste link..."
                          value={vid.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVideoRefs((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, url: val } : v))
                            );
                          }}
                          className="flex-1 bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Notes (e.g. song, slow motion pace)"
                          value={vid.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVideoRefs((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, notes: val } : v))
                            );
                          }}
                          className="w-full sm:w-60 bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                        />
                        <button
                          onClick={() => setVideoRefs((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {videoRefs.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No video links added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 07. MASTER EVENT ITINERARY & RITUALS                        */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (07) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                07
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Event Itinerary & Timings</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add ceremonies (Haldi, Mehendi, Sangeet, Wedding, Reception) with timings and special rituals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        openSection('07');
                        setItinerary((prev) => [
                          ...prev,
                          {
                            event_name: 'Wedding Ceremony',
                            date: '',
                            start_time: '10:00 AM',
                            end_time: '02:00 PM',
                            rituals_notes: '',
                          },
                        ]);
                      }}
                      className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Event</span>
                    </button>
                    <button
                      onClick={() => toggleSection('07')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['07'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['07'] && (
                  <div className="space-y-3.5 pt-2">
                    {itinerary.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
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
                            className="font-bold text-xs text-slate-900 bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 flex-1 outline-none"
                          />
                          <button
                            onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItinerary((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, date: val } : it))
                              );
                            }}
                            className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-slate-700 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Start Time (e.g. 06:00 PM)"
                            value={item.start_time}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItinerary((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, start_time: val } : it))
                              );
                            }}
                            className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-slate-700 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="End Time (e.g. 11:30 PM)"
                            value={item.end_time}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItinerary((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, end_time: val } : it))
                              );
                            }}
                            className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-slate-700 outline-none"
                          />
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Special rituals (e.g. bride entry song, varmala fireworks, cake cutting)"
                          value={item.rituals_notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItinerary((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, rituals_notes: val } : it))
                            );
                          }}
                          className="w-full bg-white border border-[#EAE5DD] rounded-xl p-2.5 text-xs text-slate-800 outline-none"
                        />
                      </div>
                    ))}

                    {itinerary.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No event schedule items added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 08. VENUE LOCATIONS & MAPS                                  */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (08) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                08
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Venue Locations & Maps</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add venue details and Google Maps links for smooth coordination.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        openSection('08');
                        setVenues((prev) => [
                          ...prev,
                          { event_name: '', venue_name: '', address: '', maps_url: '' },
                        ]);
                      }}
                      className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Venue</span>
                    </button>
                    <button
                      onClick={() => toggleSection('08')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['08'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['08'] && (
                  <div className="space-y-3 pt-2">
                    {venues.map((ven, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-center">
                        <input
                          type="text"
                          placeholder="Event (e.g. Wedding)"
                          value={ven.event_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVenues((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, event_name: val } : v))
                            );
                          }}
                          className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Venue Name (e.g. Taj Hotel)"
                          value={ven.venue_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVenues((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, venue_name: val } : v))
                            );
                          }}
                          className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Address / Area"
                          value={ven.address}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVenues((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, address: val } : v))
                            );
                          }}
                          className="bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                        />
                        <div className="flex items-center gap-1.5">
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
                            className="flex-1 bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                          />
                          <button
                            onClick={() => setVenues((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {venues.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No venue details added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 09. OUTFITS & STYLING HARMONIES                             */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (09) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                09
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Outfits & Styling Harmonies</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share outfit ideas, color themes and styling preferences.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        openSection('09');
                        setOutfits((prev) => [
                          ...prev,
                          { event_name: 'Wedding Day', notes: '' },
                        ]);
                      }}
                      className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Outfits</span>
                    </button>
                    <button
                      onClick={() => toggleSection('09')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['09'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['09'] && (
                  <div className="space-y-4 pt-2">
                    {outfits.map((outfit, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] space-y-3">
                        <div className="flex items-center justify-between">
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
                            className="font-bold text-xs text-slate-900 bg-white border border-[#EAE5DD] rounded-xl px-3 py-1.5 flex-1 outline-none"
                          />
                          <button
                            onClick={() => setOutfits((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Bride Outfit */}
                          <div className="p-3 bg-white rounded-xl border border-[#EAE5DD] space-y-2">
                            <span className="text-[11px] font-bold text-rose-700">Bride Outfit Photo</span>
                            {outfit.bride_outfit_url ? (
                              <div className="aspect-[4/3] rounded-lg overflow-hidden relative">
                                <img src={getMediaUrl(outfit.bride_outfit_url)} alt="Bride Outfit" className="w-full h-full object-cover" />
                                <button
                                  onClick={() =>
                                    setOutfits((prev) =>
                                      prev.map((o, i) => (i === idx ? { ...o, bride_outfit_url: undefined } : o))
                                    )
                                  }
                                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer border border-dashed border-[#EAE5DD] hover:border-amber-400 rounded-lg aspect-[4/3] flex flex-col items-center justify-center p-2 text-center transition">
                                <Upload className="w-4 h-4 text-amber-600 mb-1" />
                                <span className="text-[10px] text-slate-500 font-bold">Upload Bride Outfit</span>
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
                          <div className="p-3 bg-white rounded-xl border border-[#EAE5DD] space-y-2">
                            <span className="text-[11px] font-bold text-blue-700">Groom Outfit Photo</span>
                            {outfit.groom_outfit_url ? (
                              <div className="aspect-[4/3] rounded-lg overflow-hidden relative">
                                <img src={getMediaUrl(outfit.groom_outfit_url)} alt="Groom Outfit" className="w-full h-full object-cover" />
                                <button
                                  onClick={() =>
                                    setOutfits((prev) =>
                                      prev.map((o, i) => (i === idx ? { ...o, groom_outfit_url: undefined } : o))
                                    )
                                  }
                                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer border border-dashed border-[#EAE5DD] hover:border-amber-400 rounded-lg aspect-[4/3] flex flex-col items-center justify-center p-2 text-center transition">
                                <Upload className="w-4 h-4 text-amber-600 mb-1" />
                                <span className="text-[10px] text-slate-500 font-bold">Upload Groom Outfit</span>
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
                      </div>
                    ))}

                    {outfits.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No outfit references uploaded yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 10. VENDOR & PAYMENT MANAGER                                */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              {/* Stepper Badge (10) */}
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-white text-slate-400 border border-slate-300 font-bold text-xs items-center justify-center shadow-xs select-none">
                10
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Vendor & Payment Manager</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nominate authorized person for vendor payments and settlements.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => {
                        openSection('10');
                      }}
                      className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Details</span>
                    </button>
                    <button
                      onClick={() => toggleSection('10')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                    >
                      {expandedSections['10'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections['10'] && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Suresh Nawale)"
                      value={paymentContact.name}
                      onChange={(e) => setPaymentContact({ ...paymentContact, name: e.target.value })}
                      className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-400"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={paymentContact.phone}
                      onChange={(e) => setPaymentContact({ ...paymentContact, phone: e.target.value })}
                      className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Bride's Father / Chacha)"
                      value={paymentContact.relation}
                      onChange={(e) => setPaymentContact({ ...paymentContact, relation: e.target.value })}
                      className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-400"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Bottom Fixed Submit Bar ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EAE5DD] py-3.5 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>Auto-saving changes...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 font-medium">All changes auto-saved</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => saveMoodboardData(false)}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveMoodboardData(true)}
              disabled={saving || submitted}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitted ? 'Vision Submitted ✓' : 'Submit Mood Board to Studio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Celebration Modal ── */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-7 max-w-md w-full border border-amber-200 shadow-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                💍
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-900">
                Vision Successfully Submitted!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thank you, <strong className="text-amber-800">{coupleTitle}</strong>! Our photography and cinematography team will review your references and align the shooting crew.
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Back to Mood Board
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

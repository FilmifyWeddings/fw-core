'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Hash, Phone, Users, Sparkles, Film, Calendar,
  Heart, Upload, Trash2, Plus, ChevronDown, ChevronUp,
  Check, Copy, RefreshCw, Send, CheckCircle2, Clock,
  ExternalLink, Pencil, MapPin, MessageSquare, BookOpen,
  Share2, Lock, Loader2
} from 'lucide-react';
import { compressImage } from '@/lib/compressor';
import { getMediaUrl } from '@/lib/r2-storage';
import { PhotoDrawModal } from '@/components/moodboard/PhotoDrawModal';
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

export interface InspirationLink {
  url: string;
  platform?: 'Pinterest' | 'Instagram' | 'Drive' | 'Other';
  notes?: string;
}

export interface VideoRef {
  url: string;
  notes?: string;
}

export interface EventItineraryItem {
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  maps_url: string;
  bride_outfit_url?: string;
  groom_outfit_url?: string;
  rituals_notes: string;
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
  const [isLocked, setIsLocked] = useState(initialData?.status === 'SUBMITTED');
  const [showCelebration, setShowCelebration] = useState(false);

  // 1. Couple Portraits
  const [couplePhotos, setCouplePhotos] = useState<CouplePhoto[]>(
    Array.isArray(initialData?.couple_photos) ? initialData.couple_photos : []
  );

  // 2. Social Handles (Accepts Handle or Full URL)
  const [brideIg, setBrideIg] = useState<string>(initialData?.bride_instagram || '');
  const [groomIg, setGroomIg] = useState<string>(initialData?.groom_instagram || '');
  const [coupleIg, setCoupleIg] = useState<string>(initialData?.couple_instagram || '');

  // 3. Event-Day Coordinators (Multiple support for Bride & Groom)
  const normalizeCoordinators = (val: any): ContactPerson[] => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object' && (val.name || val.phone)) return [val];
    return [];
  };

  const [brideCoordinators, setBrideCoordinators] = useState<ContactPerson[]>(
    normalizeCoordinators(initialData?.bride_coordinators || initialData?.bride_coordinator)
  );
  const [groomCoordinators, setGroomCoordinators] = useState<ContactPerson[]>(
    normalizeCoordinators(initialData?.groom_coordinators || initialData?.groom_coordinator)
  );

  // 4. Close Family Photos (Separated Bride & Groom Sides)
  const allFamily = Array.isArray(initialData?.close_family_photos) ? initialData.close_family_photos : [];
  const [brideFamilyPhotos, setBrideFamilyPhotos] = useState<FamilyPhoto[]>(
    allFamily.filter((f: any) => f.side === 'Bride')
  );
  const [groomFamilyPhotos, setGroomFamilyPhotos] = useState<FamilyPhoto[]>(
    allFamily.filter((f: any) => f.side !== 'Bride')
  );

  // Active Annotation Photo for Drawing Canvas
  const [annotatingPhoto, setAnnotatingPhoto] = useState<{
    side: 'Bride' | 'Groom';
    index: number;
    url: string;
  } | null>(null);

  // 5. Inspiration & Pose Ideas (Links Only)
  const normalizeInspirationLinks = (val: any): InspirationLink[] => {
    if (Array.isArray(val)) {
      return val.map((item: any) => {
        if (typeof item === 'string') return { url: item, platform: 'Other', notes: '' };
        return {
          url: item.url || item.pinterest_url || '',
          platform: item.platform || (item.url?.includes('pinterest') ? 'Pinterest' : item.url?.includes('instagram') ? 'Instagram' : 'Other'),
          notes: item.notes || '',
        };
      }).filter((item) => item.url);
    }
    return [];
  };

  const [inspoLinks, setInspoLinks] = useState<InspirationLink[]>(
    normalizeInspirationLinks(initialData?.photo_references || initialData?.inspiration_links)
  );

  // 6. Video & Reels References (Clean url + notes)
  const normalizeVideoRefs = (val: any): VideoRef[] => {
    if (Array.isArray(val)) {
      return val.map((v: any) => {
        if (typeof v === 'string') return { url: v, notes: '' };
        return { url: v.url || '', notes: v.notes || '' };
      }).filter((v) => v.url);
    }
    return [];
  };

  const [videoRefs, setVideoRefs] = useState<VideoRef[]>(
    normalizeVideoRefs(initialData?.video_references)
  );

  // 7. Event Itinerary & Timings (Unified with Venue, Map, Bride/Groom Outfits, Rituals)
  const normalizeItinerary = (val: any, legacyVenues: any[], legacyOutfits: any[]): EventItineraryItem[] => {
    if (Array.isArray(val) && val.length > 0) {
      return val.map((item: any, idx: number) => {
        const matchingVenue = legacyVenues?.[idx] || {};
        const matchingOutfit = legacyOutfits?.[idx] || {};
        return {
          event_name: item.event_name || item.name || 'Wedding Ceremony',
          date: item.date || '',
          start_time: item.start_time || '',
          end_time: item.end_time || '',
          venue_name: item.venue_name || matchingVenue.venue_name || '',
          maps_url: item.maps_url || matchingVenue.maps_url || '',
          bride_outfit_url: item.bride_outfit_url || matchingOutfit.bride_outfit_url || '',
          groom_outfit_url: item.groom_outfit_url || matchingOutfit.groom_outfit_url || '',
          rituals_notes: item.rituals_notes || item.notes || matchingOutfit.notes || '',
        };
      });
    }
    return [];
  };

  const [itinerary, setItinerary] = useState<EventItineraryItem[]>(
    normalizeItinerary(
      initialData?.itinerary_schedule,
      initialData?.venue_locations || [],
      initialData?.outfit_references || []
    )
  );

  // 8. Vendor & Payment Contacts (Multiple support)
  const normalizePaymentContacts = (val: any): ContactPerson[] => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object' && (val.name || val.phone)) return [val];
    return [];
  };

  const [paymentContacts, setPaymentContacts] = useState<ContactPerson[]>(
    normalizePaymentContacts(initialData?.payment_contacts || initialData?.payment_contact)
  );

  const [completionPercentage, setCompletionPercentage] = useState<number>(
    initialData?.completion_percentage || 0
  );
  
  // Track ongoing uploads with animated loading placeholder
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Collapsible Accordion State (7 Sections)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': true,
    '04': true,
    '05': true,
    '06': true,
    '07': true,
    '08': true,
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
    if (brideCoordinators.length > 0 || groomCoordinators.length > 0) score += 15;
    if (brideFamilyPhotos.length > 0 || groomFamilyPhotos.length > 0) score += 15;
    if (inspoLinks.length > 0) score += 15;
    if (videoRefs.length > 0) score += 10;
    if (itinerary.length > 0) score += 15;
    if (paymentContacts.length > 0) score += 5;

    setCompletionPercentage(Math.min(100, score));
  }, [
    couplePhotos, brideIg, groomIg, coupleIg, brideCoordinators,
    groomCoordinators, brideFamilyPhotos, groomFamilyPhotos, inspoLinks,
    videoRefs, itinerary, paymentContacts
  ]);

  // Auto-Save Mechanism (Debounced by 1.8s) - Only when not locked
  useEffect(() => {
    if (!initialLoadDoneRef.current || !token || isLocked) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveMoodboardData(false);
    }, 1800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    couplePhotos, brideIg, groomIg, coupleIg, brideCoordinators,
    groomCoordinators, brideFamilyPhotos, groomFamilyPhotos, inspoLinks,
    videoRefs, itinerary, paymentContacts, isLocked
  ]);

  async function saveMoodboardData(isFinalSubmit = false) {
    if (!token) return;
    try {
      setSaving(true);
      setSaveStatus('saving');

      const mergedFamily = [...brideFamilyPhotos, ...groomFamilyPhotos];

      const payload = {
        couple_photos: couplePhotos,
        bride_instagram: brideIg,
        groom_instagram: groomIg,
        couple_instagram: coupleIg,
        bride_coordinators: brideCoordinators,
        groom_coordinators: groomCoordinators,
        bride_coordinator: brideCoordinators[0] || null,
        groom_coordinator: groomCoordinators[0] || null,
        close_family_photos: mergedFamily,
        photo_references: inspoLinks,
        inspiration_links: inspoLinks,
        video_references: videoRefs,
        itinerary_schedule: itinerary,
        payment_contacts: paymentContacts,
        payment_contact: paymentContacts[0] || null,
        completion_percentage: completionPercentage,
        status: isFinalSubmit ? 'SUBMITTED' : 'DRAFT',
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
        setIsLocked(true);
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

  // Handle Image Upload with Live Spinner Animation + In-Browser WebP Compression + Cloudflare R2
  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
    sectionKey: string
  ) {
    if (isLocked) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingSection(sectionKey);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file, 1920, 0.82);

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

  // Pick Contact from Device Contact Book (Contact Picker API)
  async function handlePickContact(onContactAdded: (contact: ContactPerson) => void) {
    if (isLocked) return;
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          const name = c.name?.[0] || '';
          const tel = c.tel?.[0] || '';
          onContactAdded({
            name,
            phone: tel,
            relation: '',
          });
          return;
        }
      } catch (err) {
        console.log('[Contact Picker closed]:', err);
      }
    }

    // Fallback if Contact Picker is not supported
    onContactAdded({
      name: '',
      phone: '',
      relation: '',
    });
  }

  const copyPublicLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Format Aesthetic Couple Title
  const rawCoupleTitle = client?.name || initialData?.client_name || 'Rohit & Priya';
  const formatCoupleTitle = (nameStr: string) => {
    const parts = nameStr.split(/\s+(?:weds|and|&)\s+/i);
    if (parts.length === 2) {
      return (
        <>
          <span className="capitalize">{parts[0]}</span>
          <span className="font-serif italic font-normal text-amber-700/80 px-2 text-2xl sm:text-3xl">weds</span>
          <span className="capitalize">{parts[1]}</span>
        </>
      );
    }
    return <span className="capitalize">{nameStr}</span>;
  };

  const studioName = studio?.name?.trim() || null;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      
      {/* ── Luxury Header Banner ── */}
      <header className="pt-8 pb-6 px-4 sm:px-8 max-w-5xl mx-auto">
        {/* Studio Brand Tag (Only shown if studio name is provided by admin) */}
        {studioName && (
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-amber-700 mb-2.5">
            <span className="w-4 h-4 rounded-full border border-amber-500/40 bg-amber-50 flex items-center justify-center text-[10px] text-amber-600 font-bold">
              ◎
            </span>
            <span>{studioName}</span>
          </div>
        )}

        {/* Title Row & Top Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight drop-shadow-2xs flex items-baseline">
              {formatCoupleTitle(rawCoupleTitle)}
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
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Copied Link' : 'Share Link'}</span>
            </button>

            {/* Submit Vision Button */}
            {!isLocked ? (
              <button
                onClick={() => saveMoodboardData(true)}
                disabled={saving}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Vision</span>
              </button>
            ) : (
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Vision Submitted & Locked ✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Locked Notice Banner */}
        {isLocked && (
          <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <strong>Mood Board Locked for Studio Review:</strong> Your details and photos have been received by the photography crew. If you wish to make further edits, please contact your studio manager.
            </p>
          </div>
        )}

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
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pb-28">
        <div className="relative">

          {/* Vertical Timeline Connector Line (Desktop) */}
          <div className="hidden sm:block absolute left-5 top-8 bottom-8 w-[1.5px] bg-[#EAE4DC] z-0" />

          {/* Stepper Cards */}
          <div className="space-y-6 sm:pl-16 relative z-10">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 01. COUPLE PORTRAITS                                        */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-[#F59E0B] text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                01
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5">
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

                  {!isLocked && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <label className="cursor-pointer px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95">
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Photos</span>
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
                  )}
                </div>

                {expandedSections['01'] && (
                  <div className="pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {couplePhotos.map((photo, idx) => (
                        <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#EAE5DD] bg-slate-50 flex flex-col shadow-2xs">
                          <div className="aspect-[4/5] w-full bg-slate-100 relative overflow-hidden">
                            <img src={getMediaUrl(photo.url)} alt={`Couple ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            {!isLocked && (
                              <button
                                onClick={() => setCouplePhotos((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Add note/caption..."
                            disabled={isLocked}
                            value={photo.caption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCouplePhotos((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, caption: val } : p))
                              );
                            }}
                            className="p-2 text-[11px] bg-white border-t border-[#EAE5DD] text-slate-700 outline-none placeholder-slate-400 disabled:bg-slate-50"
                          />
                        </div>
                      ))}

                      {/* Live Uploading Shimmer Spinner Card */}
                      {uploadingSection === 'couple' && (
                        <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/50 aspect-[4/5] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                          <span className="text-[11px] font-bold text-amber-800">Compressing & Uploading...</span>
                        </div>
                      )}
                    </div>

                    {couplePhotos.length === 0 && uploadingSection !== 'couple' && (
                      <div className="border border-dashed border-[#EAE4DC] rounded-2xl py-8 px-4 flex flex-col items-center justify-center text-center bg-[#FAF8F5]/60">
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
            {/* 02. SOCIAL HANDLES & HASHTAG (ACCEPTS LINK OR @HANDLE)      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
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
                        Add @handle or paste profile links for tagging during teaser drops and reel collaborations.
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
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-pink-600" />
                        <span>Bride's Instagram</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="@handle or profile link"
                          value={brideIg}
                          onChange={(e) => setBrideIg(e.target.value)}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition pr-8 disabled:bg-slate-50"
                        />
                        {brideIg && (
                          <a
                            href={brideIg.startsWith('http') ? brideIg : `https://instagram.com/${brideIg.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2.5 text-slate-400 hover:text-pink-600"
                            title="Open Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Groom Instagram */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Groom's Instagram</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="@handle or profile link"
                          value={groomIg}
                          onChange={(e) => setGroomIg(e.target.value)}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition pr-8 disabled:bg-slate-50"
                        />
                        {groomIg && (
                          <a
                            href={groomIg.startsWith('http') ? groomIg : `https://instagram.com/${groomIg.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2.5 text-slate-400 hover:text-blue-600"
                            title="Open Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Couple / Wedding Hashtag */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-amber-600" />
                        <span>Couple / Wedding Hashtag</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="#RohitWedsPriya"
                          value={coupleIg}
                          onChange={(e) => setCoupleIg(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                          className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-400 transition disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 03. EVENT-DAY COORDINATORS (MULTIPLE + DIRECT CONTACTS)     */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
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
                        Add key coordinators from Bride & Groom side (e.g. Sibling, Best Friend, MUA) for instant shoot coordination.
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                    
                    {/* Bride Side Coordinators */}
                    <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DD] space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800">Bride's Side Coordinators ({brideCoordinators.length})</span>
                        {!isLocked && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handlePickContact((contact) =>
                                  setBrideCoordinators((prev) => [...prev, contact])
                                )
                              }
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Pick from phone contacts"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Contact Book</span>
                            </button>
                            <button
                              onClick={() =>
                                setBrideCoordinators((prev) => [
                                  ...prev,
                                  { name: '', phone: '', relation: '' },
                                ])
                              }
                              className="p-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {brideCoordinators.map((coord, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 relative shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Full Name (e.g. Ananya Sharma)"
                              value={coord.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBrideCoordinators((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                                );
                              }}
                              className="font-bold text-xs text-slate-800 bg-transparent flex-1 outline-none disabled:text-slate-600"
                            />
                            {!isLocked && (
                              <button
                                onClick={() => setBrideCoordinators((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="relative flex items-center">
                              <input
                                type="tel"
                                disabled={isLocked}
                                placeholder="Phone / WhatsApp"
                                value={coord.phone}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBrideCoordinators((prev) =>
                                    prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                                  );
                                }}
                                className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 outline-none"
                              />
                              {coord.phone && (
                                <a
                                  href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute right-1.5 p-0.5 text-emerald-600 hover:text-emerald-700"
                                  title="WhatsApp Chat"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Relation (e.g. Sister, MUA)"
                              value={coord.relation}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBrideCoordinators((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                                );
                              }}
                              className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {brideCoordinators.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-1">No coordinators added yet. Tap Contact Book or +</p>
                      )}
                    </div>

                    {/* Groom Side Coordinators */}
                    <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DD] space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-800">Groom's Side Coordinators ({groomCoordinators.length})</span>
                        {!isLocked && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handlePickContact((contact) =>
                                  setGroomCoordinators((prev) => [...prev, contact])
                                )
                              }
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Pick from phone contacts"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Contact Book</span>
                            </button>
                            <button
                              onClick={() =>
                                setGroomCoordinators((prev) => [
                                  ...prev,
                                  { name: '', phone: '', relation: '' },
                                ])
                              }
                              className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {groomCoordinators.map((coord, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 relative shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Full Name (e.g. Rohan Nawale)"
                              value={coord.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGroomCoordinators((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                                );
                              }}
                              className="font-bold text-xs text-slate-800 bg-transparent flex-1 outline-none disabled:text-slate-600"
                            />
                            {!isLocked && (
                              <button
                                onClick={() => setGroomCoordinators((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="relative flex items-center">
                              <input
                                type="tel"
                                disabled={isLocked}
                                placeholder="Phone / WhatsApp"
                                value={coord.phone}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroomCoordinators((prev) =>
                                    prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                                  );
                                }}
                                className="w-full bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 outline-none"
                              />
                              {coord.phone && (
                                <a
                                  href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute right-1.5 p-0.5 text-emerald-600 hover:text-emerald-700"
                                  title="WhatsApp Chat"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Relation (e.g. Brother, Best Friend)"
                              value={coord.relation}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGroomCoordinators((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                                );
                              }}
                              className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {groomCoordinators.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-1">No coordinators added yet. Tap Contact Book or +</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 04. CLOSE FAMILY IDENTIFICATION PHOTOS (BRIDE & GROOM SPLIT)*/}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                04
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Close Family Identification Photos</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload photos of Bride's and Groom's immediate family. Tap <strong>Draw & Tag Faces</strong> to circle VIP faces with colors.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSection('04')}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                  >
                    {expandedSections['04'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections['04'] && (
                  <div className="space-y-6 pt-1">
                    
                    {/* ── Bride's Family Members ── */}
                    <div className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#EAE5DD] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800">👰 Bride's Family Members ({brideFamilyPhotos.length})</span>
                        {!isLocked && (
                          <label className="cursor-pointer px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1">
                            <Plus className="w-3 h-3 text-rose-600" />
                            <span>Add Bride Family Photo</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingSection === 'family-bride'}
                              onChange={(e) =>
                                handleFileUpload(
                                  e,
                                  (url) =>
                                    setBrideFamilyPhotos((prev) => [
                                      ...prev,
                                      { url, side: 'Bride', relation: 'Parents', names: '' },
                                    ]),
                                  'family-bride'
                                )
                              }
                            />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {brideFamilyPhotos.map((fam, idx) => (
                          <div key={idx} className="rounded-2xl border border-rose-200 bg-white p-3 space-y-2 shadow-2xs">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 relative group">
                              <img src={getMediaUrl(fam.url)} alt="Bride Family" className="w-full h-full object-cover" />
                              
                              <button
                                onClick={() => setAnnotatingPhoto({ side: 'Bride', index: idx, url: getMediaUrl(fam.url) })}
                                className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/75 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition shadow-sm cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-amber-300" />
                                <span>Draw & Tag Faces</span>
                              </button>

                              {!isLocked && (
                                <button
                                  onClick={() => setBrideFamilyPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Relation (e.g. Parents)"
                                value={fam.relation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBrideFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, relation: val } : f))
                                  );
                                }}
                                className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
                              />
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Names (e.g. Ramesh & Sunita)"
                                value={fam.names}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBrideFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, names: val } : f))
                                  );
                                }}
                                className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Live Uploading Spinner */}
                        {uploadingSection === 'family-bride' && (
                          <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                            <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
                            <span className="text-[11px] font-bold text-rose-800">Uploading Bride Family Photo...</span>
                          </div>
                        )}
                      </div>

                      {brideFamilyPhotos.length === 0 && uploadingSection !== 'family-bride' && (
                        <p className="text-[11px] text-slate-400 italic py-1">No Bride family photos uploaded yet.</p>
                      )}
                    </div>

                    {/* ── Groom's Family Members ── */}
                    <div className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#EAE5DD] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-800">🤵 Groom's Family Members ({groomFamilyPhotos.length})</span>
                        {!isLocked && (
                          <label className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold transition flex items-center gap-1">
                            <Plus className="w-3 h-3 text-blue-600" />
                            <span>Add Groom Family Photo</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingSection === 'family-groom'}
                              onChange={(e) =>
                                handleFileUpload(
                                  e,
                                  (url) =>
                                    setGroomFamilyPhotos((prev) => [
                                      ...prev,
                                      { url, side: 'Groom', relation: 'Parents', names: '' },
                                    ]),
                                  'family-groom'
                                )
                              }
                            />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {groomFamilyPhotos.map((fam, idx) => (
                          <div key={idx} className="rounded-2xl border border-blue-200 bg-white p-3 space-y-2 shadow-2xs">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 relative group">
                              <img src={getMediaUrl(fam.url)} alt="Groom Family" className="w-full h-full object-cover" />
                              
                              <button
                                onClick={() => setAnnotatingPhoto({ side: 'Groom', index: idx, url: getMediaUrl(fam.url) })}
                                className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/75 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition shadow-sm cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-amber-300" />
                                <span>Draw & Tag Faces</span>
                              </button>

                              {!isLocked && (
                                <button
                                  onClick={() => setGroomFamilyPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Relation (e.g. Parents)"
                                value={fam.relation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroomFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, relation: val } : f))
                                  );
                                }}
                                className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
                              />
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Names (e.g. Rajesh & Rekha)"
                                value={fam.names}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroomFamilyPhotos((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, names: val } : f))
                                  );
                                }}
                                className="bg-[#FAF9F6] border border-[#EAE5DD] rounded-lg px-2 py-1 text-[11px] text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Live Uploading Spinner */}
                        {uploadingSection === 'family-groom' && (
                          <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            <span className="text-[11px] font-bold text-blue-800">Uploading Groom Family Photo...</span>
                          </div>
                        )}
                      </div>

                      {groomFamilyPhotos.length === 0 && uploadingSection !== 'family-groom' && (
                        <p className="text-[11px] text-slate-400 italic py-1">No Groom family photos uploaded yet.</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 05. INSPIRATION & POSE IDEAS (LINKS ONLY)                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-rose-500 text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                05
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Inspiration & Pose Ideas</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add links to your <strong>Pinterest Boards</strong>, <strong>Instagram Saved Folders</strong>, or <strong>Google Drive folders</strong>.
                      </p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => {
                          openSection('05');
                          setInspoLinks((prev) => [...prev, { url: '', platform: 'Pinterest', notes: '' }]);
                        }}
                        className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Link</span>
                      </button>
                      <button
                        onClick={() => toggleSection('05')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                      >
                        {expandedSections['05'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {expandedSections['05'] && (
                  <div className="space-y-3 pt-2">
                    {inspoLinks.map((link, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                          📌
                        </div>
                        <input
                          type="url"
                          disabled={isLocked}
                          placeholder="Paste Pinterest Board URL, Instagram Saved Folder, or Drive link..."
                          value={link.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInspoLinks((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, url: val } : item))
                            );
                          }}
                          className="flex-1 bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 disabled:bg-slate-50"
                        />
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="Notes (e.g. Royal aesthetic, candid smiles, varmala pose)"
                          value={link.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInspoLinks((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, notes: val } : item))
                            );
                          }}
                          className="w-full sm:w-64 bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-400 disabled:bg-slate-50"
                        />
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                          {link.url && (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition"
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!isLocked && (
                            <button
                              onClick={() => setInspoLinks((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {inspoLinks.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No inspiration links added yet. Click 'Add Link' above.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 06. VIDEO & REELS REFERENCES (CLEAN LINKS)                  */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
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
                        Add links from <strong>Instagram Reels</strong>, <strong>YouTube Films</strong>, <strong>Vimeo</strong>, or <strong>Google Drive</strong>.
                      </p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => {
                          openSection('06');
                          setVideoRefs((prev) => [...prev, { url: '', notes: '' }]);
                        }}
                        className="px-4 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Video Link</span>
                      </button>
                      <button
                        onClick={() => toggleSection('06')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                      >
                        {expandedSections['06'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {expandedSections['06'] && (
                  <div className="space-y-3 pt-2">
                    {videoRefs.map((vid, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          🎬
                        </div>
                        <input
                          type="url"
                          disabled={isLocked}
                          placeholder="Paste Instagram Reel, YouTube, Vimeo, or Drive link..."
                          value={vid.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVideoRefs((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, url: val } : v))
                            );
                          }}
                          className="flex-1 bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 disabled:bg-slate-50"
                        />
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="Notes (e.g. cinematic grading, slow motion vibe, audio song)"
                          value={vid.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVideoRefs((prev) =>
                              prev.map((v, i) => (i === idx ? { ...v, notes: val } : v))
                            );
                          }}
                          className="w-full sm:w-72 bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-400 disabled:bg-slate-50"
                        />
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                          {vid.url && (
                            <a
                              href={vid.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                              title="Watch Video Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!isLocked && (
                            <button
                              onClick={() => setVideoRefs((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {videoRefs.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No video links added yet. Click 'Add Video Link' above.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 07. EVENT ITINERARY & TIMINGS (CONSOLIDATED & TEXT INPUT)   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                07
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Event Itinerary & Timings</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add all ceremonies with timings, venue map link, Bride & Groom outfit photos, and rituals notes.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSection('07')}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                  >
                    {expandedSections['07'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections['07'] && (
                  <div className="space-y-6 pt-2">
                    {itinerary.map((item, idx) => (
                      <div key={idx} className="p-5 rounded-3xl bg-[#FAF9F6] border border-[#EAE5DD] space-y-4 shadow-xs">
                        
                        {/* Event Title Header (Clean Text Input - No Dropdown) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE5DD]">
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Event Name (e.g. Haldi Morning, Sangeet & Cocktail, Wedding, Reception)"
                              value={item.event_name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItinerary((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, event_name: val } : it))
                                );
                              }}
                              className="font-bold text-sm text-slate-900 bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 flex-1 outline-none focus:border-amber-400 disabled:bg-slate-50"
                            />
                          </div>

                          {!isLocked && (
                            <button
                              onClick={() => setItinerary((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1.5 self-end sm:self-auto cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Date & Native Time Pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Date</label>
                            <input
                              type="date"
                              disabled={isLocked}
                              value={item.date}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItinerary((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, date: val } : it))
                                );
                              }}
                              className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-slate-800 outline-none font-medium disabled:bg-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              <span>Start Time</span>
                            </label>
                            <input
                              type="time"
                              disabled={isLocked}
                              value={item.start_time}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItinerary((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, start_time: val } : it))
                                );
                              }}
                              className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-slate-800 outline-none font-bold text-xs disabled:bg-slate-50 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              <span>End Time</span>
                            </label>
                            <input
                              type="time"
                              disabled={isLocked}
                              value={item.end_time}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItinerary((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, end_time: val } : it))
                                );
                              }}
                              className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-slate-800 outline-none font-bold text-xs disabled:bg-slate-50 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Venue & Google Maps Link */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Venue Name & Address</label>
                            <div className="relative">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="e.g. Grand Ballroom, Taj Lands End, Mumbai"
                                value={item.venue_name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItinerary((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, venue_name: val } : it))
                                  );
                                }}
                                className="w-full bg-white border border-[#EAE5DD] rounded-xl pl-9 pr-3 py-2 text-slate-800 outline-none font-medium disabled:bg-slate-50"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Maps Location Link</label>
                            <div className="relative flex items-center">
                              <input
                                type="url"
                                disabled={isLocked}
                                placeholder="https://maps.app.goo.gl/..."
                                value={item.maps_url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItinerary((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, maps_url: val } : it))
                                  );
                                }}
                                className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3 py-2 text-slate-800 outline-none font-medium pr-8 disabled:bg-slate-50"
                              />
                              {item.maps_url && (
                                <a
                                  href={item.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute right-2.5 text-slate-500 hover:text-indigo-600"
                                  title="Test Maps link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bride & Groom Dress Photos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          
                          {/* Bride Outfit Box */}
                          <div className="p-3.5 bg-white rounded-2xl border border-[#EAE5DD] space-y-2">
                            <span className="text-[11px] font-bold text-rose-700 block">Bride's Outfit / Styling</span>
                            {item.bride_outfit_url ? (
                              <div className="aspect-[4/3] rounded-xl overflow-hidden relative group">
                                <img src={getMediaUrl(item.bride_outfit_url)} alt="Bride Outfit" className="w-full h-full object-cover" />
                                {!isLocked && (
                                  <button
                                    onClick={() =>
                                      setItinerary((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, bride_outfit_url: undefined } : it))
                                      )
                                    }
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : uploadingSection === `event-bride-${idx}` ? (
                              <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                                <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                                <span className="text-[10px] font-bold text-rose-800">Uploading Bride Outfit...</span>
                              </div>
                            ) : !isLocked ? (
                              <label className="cursor-pointer border border-dashed border-[#EAE5DD] hover:border-amber-400 rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition bg-[#FAF8F5]/50">
                                <Upload className="w-4 h-4 text-amber-600 mb-1" />
                                <span className="text-[10px] text-slate-600 font-bold">Upload Bride Outfit Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      (url) =>
                                        setItinerary((prev) =>
                                          prev.map((it, i) => (i === idx ? { ...it, bride_outfit_url: url } : it))
                                        ),
                                      `event-bride-${idx}`
                                    )
                                  }
                                />
                              </label>
                            ) : (
                              <div className="aspect-[4/3] rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                No outfit uploaded
                              </div>
                            )}
                          </div>

                          {/* Groom Outfit Box */}
                          <div className="p-3.5 bg-white rounded-2xl border border-[#EAE5DD] space-y-2">
                            <span className="text-[11px] font-bold text-blue-700 block">Groom's Outfit / Styling</span>
                            {item.groom_outfit_url ? (
                              <div className="aspect-[4/3] rounded-xl overflow-hidden relative group">
                                <img src={getMediaUrl(item.groom_outfit_url)} alt="Groom Outfit" className="w-full h-full object-cover" />
                                {!isLocked && (
                                  <button
                                    onClick={() =>
                                      setItinerary((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, groom_outfit_url: undefined } : it))
                                      )
                                    }
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : uploadingSection === `event-groom-${idx}` ? (
                              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                <span className="text-[10px] font-bold text-blue-800">Uploading Groom Outfit...</span>
                              </div>
                            ) : !isLocked ? (
                              <label className="cursor-pointer border border-dashed border-[#EAE5DD] hover:border-amber-400 rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition bg-[#FAF8F5]/50">
                                <Upload className="w-4 h-4 text-blue-600 mb-1" />
                                <span className="text-[10px] text-slate-600 font-bold">Upload Groom Outfit Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      (url) =>
                                        setItinerary((prev) =>
                                          prev.map((it, i) => (i === idx ? { ...it, groom_outfit_url: url } : it))
                                        ),
                                      `event-groom-${idx}`
                                    )
                                  }
                                />
                              </label>
                            ) : (
                              <div className="aspect-[4/3] rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                No outfit uploaded
                              </div>
                            )}
                          </div>

                        </div>

                        {/* Rituals & Notes */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Key Rituals & Special Moments Notes
                          </label>
                          <textarea
                            rows={2}
                            disabled={isLocked}
                            placeholder="e.g. Bride entry at 07:00 PM with Phoolon ki Chaadar, Varmala fireworks, Couple first dance song: 'Kesariya'..."
                            value={item.rituals_notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItinerary((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, rituals_notes: val } : it))
                              );
                            }}
                            className="w-full bg-white border border-[#EAE5DD] rounded-xl p-3 text-xs text-slate-800 outline-none font-medium disabled:bg-slate-50"
                          />
                        </div>

                      </div>
                    ))}

                    {/* Prominent Bottom "+ Add Another Event" Button */}
                    {!isLocked && (
                      <button
                        onClick={() => {
                          setItinerary((prev) => [
                            ...prev,
                            {
                              event_name: '',
                              date: '',
                              start_time: '',
                              end_time: '',
                              venue_name: '',
                              maps_url: '',
                              bride_outfit_url: '',
                              groom_outfit_url: '',
                              rituals_notes: '',
                            },
                          ]);
                        }}
                        className="w-full py-3.5 bg-amber-50 hover:bg-amber-100/80 border-2 border-dashed border-amber-300 hover:border-amber-400 text-amber-900 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4 text-amber-600" />
                        <span>+ Add Another Event to Itinerary</span>
                      </button>
                    )}

                    {itinerary.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No event schedule items added yet. Click '+ Add Another Event' above.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 08. VENDOR & PAYMENT MANAGER (CONTACT BOOK IMPORT)          */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative">
              <div className="hidden sm:flex absolute -left-16 top-6 w-10 h-10 rounded-full bg-pink-600 text-white font-bold text-xs items-center justify-center shadow-xs border-2 border-white select-none">
                08
              </div>

              <div className="bg-white rounded-3xl border border-[#EFEBE4] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Vendor & Payment Manager</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nominate authorized family members or managers for vendor settlements and day-of payments.
                      </p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() =>
                          handlePickContact((contact) =>
                            setPaymentContacts((prev) => [...prev, contact])
                          )
                        }
                        className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                        title="Import contact from phone"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-pink-600" />
                        <span>Contact Book</span>
                      </button>
                      <button
                        onClick={() => {
                          openSection('08');
                          setPaymentContacts((prev) => [
                            ...prev,
                            { name: '', phone: '', relation: '' },
                          ]);
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-amber-50/60 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Manually</span>
                      </button>
                      <button
                        onClick={() => toggleSection('08')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                      >
                        {expandedSections['08'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {expandedSections['08'] && (
                  <div className="space-y-3 pt-2">
                    {paymentContacts.map((contact, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EAE5DD] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center shadow-2xs">
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="Full Name (e.g. Suresh Nawale)"
                          value={contact.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPaymentContacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                            );
                          }}
                          className="bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-50"
                        />
                        <div className="relative flex items-center">
                          <input
                            type="tel"
                            disabled={isLocked}
                            placeholder="Phone Number"
                            value={contact.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaymentContacts((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                              );
                            }}
                            className="w-full bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none disabled:bg-slate-50"
                          />
                          {contact.phone && (
                            <a
                              href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute right-2.5 text-emerald-600 hover:text-emerald-700"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Role/Relation (e.g. Father, Cash Handler, Planner)"
                            value={contact.relation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaymentContacts((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                              );
                            }}
                            className="flex-1 bg-white border border-[#EAE5DD] rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none disabled:bg-slate-50"
                          />
                          {!isLocked && (
                            <button
                              onClick={() => setPaymentContacts((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {paymentContacts.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No vendor / payment contacts added yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Fixed Bottom Save Bar (Hidden or Read-Only when Locked) ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EAE5DD] py-3.5 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>Auto-saving changes...</span>
              </>
            ) : isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Mood Board Submitted & Locked</span>
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
            {!isLocked ? (
              <>
                <button
                  onClick={() => saveMoodboardData(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => saveMoodboardData(true)}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Mood Board to Studio</span>
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-500 italic">
                Submitted on {initialData?.updated_at ? new Date(initialData.updated_at).toLocaleDateString() : 'recently'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Drawing & Face Tagging Modal ── */}
      {annotatingPhoto !== null && (
        <PhotoDrawModal
          imageUrl={annotatingPhoto.url}
          isOpen={annotatingPhoto !== null}
          onClose={() => setAnnotatingPhoto(null)}
          token={token}
          onSaveAnnotatedImage={(newUrl) => {
            if (annotatingPhoto.side === 'Bride') {
              setBrideFamilyPhotos((prev) =>
                prev.map((f, i) => (i === annotatingPhoto.index ? { ...f, url: newUrl } : f))
              );
            } else {
              setGroomFamilyPhotos((prev) =>
                prev.map((f, i) => (i === annotatingPhoto.index ? { ...f, url: newUrl } : f))
              );
            }
          }}
        />
      )}

      {/* ── Submission Celebration Modal ── */}
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
                Thank you! Our photography and cinematography team will review your references, tagged family photos, and schedule.
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

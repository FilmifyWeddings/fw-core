'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Hash, Phone, Users, Sparkles, Film, Calendar,
  Heart, Upload, Trash2, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Check, Copy, RefreshCw, Send, CheckCircle2, Clock,
  ExternalLink, Pencil, MapPin, MessageSquare, BookOpen,
  Share2, Lock, Loader2, UserPlus, X, DollarSign, Play, MessageCircle
} from 'lucide-react';
import { compressMoodboardImage } from '@/lib/compressor';
import { getMediaUrl } from '@/lib/r2-storage';
import { PhotoDrawModal } from '@/components/moodboard/PhotoDrawModal';
import confetti from 'canvas-confetti';

export interface CouplePhoto {
  url: string;
  caption?: string;
}

export interface CoordinatorContact {
  name: string;
  phone: string;
  relation?: string;
}

export interface ShootPlaceItem {
  id: string;
  place_name: string;
  location_notes?: string;
  couple_photo_url?: string;
  bride_photo_url?: string;
  groom_photo_url?: string;
  comments?: string;
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
  title?: string;
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
  // Determine if this moodboard is for Pre-Wedding
  const isPreWedding = Boolean(
    (initialData?.event_type || initialData?.title || client?.event_type || '').toLowerCase().includes('pre-wedding') ||
    (initialData?.event_type || initialData?.title || client?.event_type || '').toLowerCase().includes('pre wedding')
  );

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isLocked, setIsLocked] = useState(initialData?.status === 'SUBMITTED');
  const [showCelebration, setShowCelebration] = useState(false);

  // 1. Couple Portraits (Limit 8 for Pre-Wedding, 6 for Other Events)
  const maxCouplePhotos = isPreWedding ? 8 : 6;
  const [couplePhotos, setCouplePhotos] = useState<CouplePhoto[]>(
    Array.isArray(initialData?.couple_photos) ? initialData.couple_photos.slice(0, maxCouplePhotos) : []
  );

  // ── PRE-WEDDING SPECIFIC STATE ──
  // Pre-Wedding Coordinators
  const initialCoord = initialData?.shoot_coordination || {};
  const [pwBrideCoordinator, setPwBrideCoordinator] = useState<CoordinatorContact>({
    name: initialCoord.bride_coordinator?.name || initialData?.bride_coordinator?.name || '',
    phone: initialCoord.bride_coordinator?.phone || initialData?.bride_coordinator?.phone || '',
    relation: initialCoord.bride_coordinator?.relation || "Bride Coordinator",
  });
  const [pwGroomCoordinator, setPwGroomCoordinator] = useState<CoordinatorContact>({
    name: initialCoord.groom_coordinator?.name || initialData?.groom_coordinator?.name || '',
    phone: initialCoord.groom_coordinator?.phone || initialData?.groom_coordinator?.phone || '',
    relation: initialCoord.groom_coordinator?.relation || "Groom Coordinator",
  });

  // Pre-Wedding Shoot Places / Locations
  const [shootPlaces, setShootPlaces] = useState<ShootPlaceItem[]>(() => {
    if (Array.isArray(initialData?.shoot_places) && initialData.shoot_places.length > 0) {
      return initialData.shoot_places;
    }
    return [
      {
        id: 'place-' + Date.now(),
        place_name: 'Location 1',
        location_notes: '',
        couple_photo_url: '',
        bride_photo_url: '',
        groom_photo_url: '',
        comments: '',
      },
    ];
  });

  // ── NON-PRE-WEDDING (ORIGINAL 8 SECTIONS) STATE ──
  // 2. Social Handles
  const [brideIg, setBrideIg] = useState<string>(initialData?.bride_instagram || '');
  const [groomIg, setGroomIg] = useState<string>(initialData?.groom_instagram || '');
  const [coupleIg, setCoupleIg] = useState<string>(initialData?.couple_instagram || '');

  // 3. Event-Day Coordinators (Multiple support)
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

  // 4. Close Family Photos (Limit 12 each side)
  const allFamily = Array.isArray(initialData?.close_family_photos) ? initialData.close_family_photos : [];
  const [brideFamilyPhotos, setBrideFamilyPhotos] = useState<FamilyPhoto[]>(
    allFamily.filter((f: any) => f.side === 'Bride').slice(0, 12)
  );
  const [groomFamilyPhotos, setGroomFamilyPhotos] = useState<FamilyPhoto[]>(
    allFamily.filter((f: any) => f.side !== 'Bride').slice(0, 12)
  );

  // Active Annotation Photo for Drawing Canvas
  const [annotatingPhoto, setAnnotatingPhoto] = useState<{
    side: 'Bride' | 'Groom';
    index: number;
    url: string;
  } | null>(null);

  // Contact Modal State for devices where navigator.contacts is unavailable
  const [contactModalTarget, setContactModalTarget] = useState<'bride' | 'groom' | 'payment' | null>(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');

  // 5. Inspiration & Pose Ideas
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

  // 6. Video & Reels References
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

  // 7. Event Itinerary & Timings
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

  // 8. Vendor & Payment Contacts
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

  // Collapsible Accordion State
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

  // Full-Screen Image Lightbox / Gallery Modal
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    items: Array<{ url: string; title?: string; subtitle?: string; notes?: string }>;
    currentIndex: number;
  }>({
    isOpen: false,
    items: [],
    currentIndex: 0,
  });

  const openLightbox = (
    items: Array<{ url: string; title?: string; subtitle?: string; notes?: string }>,
    index: number = 0
  ) => {
    setLightbox({
      isOpen: true,
      items,
      currentIndex: index,
    });
  };

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatEventTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const parts = timeStr.trim().split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const mins = parts[1].slice(0, 2);
        if (isNaN(hours)) return timeStr;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);

  // Calculate Progress
  useEffect(() => {
    if (isPreWedding) {
      let score = 0;
      // 1. Couple Photos (20%)
      if (couplePhotos.some((p) => p.url?.trim())) score += 20;

      // 2. Coordinators (20%)
      if (
        pwBrideCoordinator.name.trim() ||
        pwBrideCoordinator.phone.trim() ||
        pwGroomCoordinator.name.trim() ||
        pwGroomCoordinator.phone.trim()
      ) {
        score += 20;
      }

      // 3. Shoot Places (30%) - only if user uploaded photos, added notes/comments, or customized place name
      if (
        shootPlaces.some((p) =>
          Boolean(
            p.couple_photo_url?.trim() ||
            p.bride_photo_url?.trim() ||
            p.groom_photo_url?.trim() ||
            p.location_notes?.trim() ||
            p.comments?.trim() ||
            (p.place_name?.trim() && !p.place_name.trim().match(/^Location \d+$/i))
          )
        )
      ) {
        score += 30;
      }

      // 4. Inspo (15%)
      if (inspoLinks.some((l) => l.url?.trim())) score += 15;

      // 5. Videos (15%)
      if (videoRefs.some((v) => v.url?.trim())) score += 15;

      setCompletionPercentage(Math.min(100, score));
    } else {
      let score = 0;
      // 1. Couple Photos (15%)
      if (couplePhotos.some((p) => p.url?.trim())) score += 15;

      // 2. Social Handles (10%)
      if (brideIg?.trim() || groomIg?.trim() || coupleIg?.trim()) score += 10;

      // 3. Coordinators (15%)
      if (
        brideCoordinators.some((c) => c.name?.trim() || c.phone?.trim()) ||
        groomCoordinators.some((c) => c.name?.trim() || c.phone?.trim())
      ) {
        score += 15;
      }

      // 4. Close Family Photos (15%)
      if (
        brideFamilyPhotos.some((p) => p.url?.trim()) ||
        groomFamilyPhotos.some((p) => p.url?.trim())
      ) {
        score += 15;
      }

      // 5. Inspo (15%)
      if (inspoLinks.some((l) => l.url?.trim())) score += 15;

      // 6. Videos (10%)
      if (videoRefs.some((v) => v.url?.trim())) score += 10;

      // 7. Itinerary (15%) - event name + at least one detail
      if (
        itinerary.some(
          (it) =>
            it.event_name?.trim() &&
            Boolean(
              it.date?.trim() ||
              it.venue_name?.trim() ||
              it.start_time?.trim() ||
              it.rituals_notes?.trim() ||
              it.bride_outfit_url?.trim() ||
              it.groom_outfit_url?.trim()
            )
        )
      ) {
        score += 15;
      }

      // 8. Payment Contacts (5%)
      if (paymentContacts.some((c) => c.name?.trim() || c.phone?.trim())) {
        score += 5;
      }

      setCompletionPercentage(Math.min(100, score));
    }
  }, [
    isPreWedding, couplePhotos, pwBrideCoordinator, pwGroomCoordinator, shootPlaces,
    brideIg, groomIg, coupleIg, brideCoordinators, groomCoordinators,
    brideFamilyPhotos, groomFamilyPhotos, inspoLinks, videoRefs, itinerary, paymentContacts
  ]);

  // Auto-Save Mechanism
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (!token || isLocked) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveMoodboardData(false);
    }, 1800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    isPreWedding, couplePhotos, pwBrideCoordinator, pwGroomCoordinator, shootPlaces,
    brideIg, groomIg, coupleIg, brideCoordinators, groomCoordinators,
    brideFamilyPhotos, groomFamilyPhotos, inspoLinks, videoRefs, itinerary, paymentContacts, isLocked
  ]);

  async function saveMoodboardData(isFinalSubmit = false) {
    if (!token) return;
    try {
      setSaving(true);
      setSaveStatus('saving');

      let payload: Record<string, any> = {};

      if (isPreWedding) {
        payload = {
          couple_photos: couplePhotos,
          shoot_coordination: {
            bride_coordinator: pwBrideCoordinator,
            groom_coordinator: pwGroomCoordinator,
          },
          bride_coordinator: pwBrideCoordinator,
          groom_coordinator: pwGroomCoordinator,
          shoot_places: shootPlaces,
          photo_references: inspoLinks,
          inspiration_links: inspoLinks,
          video_references: videoRefs,
          completion_percentage: completionPercentage,
          status: isFinalSubmit ? 'SUBMITTED' : 'DRAFT',
          submit: isFinalSubmit,
        };
      } else {
        const mergedFamily = [...brideFamilyPhotos, ...groomFamilyPhotos];
        payload = {
          couple_photos: couplePhotos,
          bride_instagram: brideIg,
          groom_instagram: groomIg,
          couple_instagram: coupleIg,
          bride_coordinator: brideCoordinators,
          groom_coordinator: groomCoordinators,
          close_family_photos: mergedFamily,
          photo_references: inspoLinks,
          inspiration_links: inspoLinks,
          video_references: videoRefs,
          itinerary_schedule: itinerary,
          payment_contact: paymentContacts,
          completion_percentage: completionPercentage,
          status: isFinalSubmit ? 'SUBMITTED' : 'DRAFT',
          submit: isFinalSubmit,
        };
      }

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

  // Handle Image Upload with Ultra-Light WebP Compression
  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (url: string) => void,
    sectionKey: string,
    maxLimit?: number,
    currentCount: number = 0
  ) {
    if (isLocked) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = maxLimit !== undefined ? Math.max(0, maxLimit - currentCount) : files.length;
    if (availableSlots <= 0) {
      alert(`Maximum limit of ${maxLimit} photos reached for this section.`);
      event.target.value = '';
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);

    try {
      setUploadingSection(sectionKey);
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        let fileToSend: File | Blob = file;
        try {
          fileToSend = await compressMoodboardImage(file, 1280, 0.72);
        } catch (compErr) {
          console.warn('[Image compression skipped, uploading original]:', compErr);
          fileToSend = file;
        }

        const formData = new FormData();
        const uploadName = (fileToSend instanceof File && fileToSend.name) ? fileToSend.name : (file.name || 'image.jpg');
        formData.append('file', fileToSend, uploadName);
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
      console.error('[Upload error]:', err);
      alert(`Upload notice: ${err.message || 'Please try selecting the image again.'}`);
    } finally {
      setUploadingSection(null);
      event.target.value = '';
    }
  }

  async function deleteImageFromStorage(url?: string) {
    if (!url) return;
    try {
      await fetch('/api/upload/r2', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.warn('[Failed to delete image from Cloudflare R2]:', err);
    }
  }

  // Pre-Wedding Shoot Places Helper
  const handleUpdatePlace = (placeId: string, updates: Partial<ShootPlaceItem>) => {
    setShootPlaces((prev) =>
      prev.map((p) => (p.id === placeId ? { ...p, ...updates } : p))
    );
  };

  const handleAddPlace = () => {
    const newIdx = shootPlaces.length + 1;
    setShootPlaces((prev) => [
      ...prev,
      {
        id: 'place-' + Date.now(),
        place_name: `Location ${newIdx}`,
        location_notes: '',
        couple_photo_url: '',
        bride_photo_url: '',
        groom_photo_url: '',
        comments: '',
      },
    ]);
  };

  const handleRemovePlace = (placeId: string) => {
    if (shootPlaces.length <= 1) {
      alert('You must have at least one shoot location.');
      return;
    }
    const place = shootPlaces.find((p) => p.id === placeId);
    if (place) {
      if (place.couple_photo_url) deleteImageFromStorage(place.couple_photo_url);
      if (place.bride_photo_url) deleteImageFromStorage(place.bride_photo_url);
      if (place.groom_photo_url) deleteImageFromStorage(place.groom_photo_url);
    }
    setShootPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  // Contact Picker for Non-Pre-Wedding Events
  async function handlePickContact(target: 'bride' | 'groom' | 'payment') {
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
          const newContact: ContactPerson = { name, phone: tel, relation: '' };
          if (target === 'bride') setBrideCoordinators((prev) => [...prev, newContact]);
          else if (target === 'groom') setGroomCoordinators((prev) => [...prev, newContact]);
          else setPaymentContacts((prev) => [...prev, newContact]);
          return;
        }
      } catch (err) {
        console.log('[Contact Picker Fallback to Modal]:', err);
      }
    }

    setContactModalTarget(target);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation(target === 'payment' ? 'Father' : target === 'bride' ? 'Sister' : 'Brother');
  }

  function handleSaveContactModal() {
    if (!newContactName.trim() && !newContactPhone.trim()) {
      setContactModalTarget(null);
      return;
    }
    const newContact: ContactPerson = {
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relation: newContactRelation.trim(),
    };
    if (contactModalTarget === 'bride') setBrideCoordinators((prev) => [...prev, newContact]);
    else if (contactModalTarget === 'groom') setGroomCoordinators((prev) => [...prev, newContact]);
    else if (contactModalTarget === 'payment') setPaymentContacts((prev) => [...prev, newContact]);

    setContactModalTarget(null);
  }

  const copyPublicLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const rawCoupleTitle = client?.name || initialData?.client_name || 'Couple';
  const formatCoupleTitle = (nameStr: string) => {
    const parts = nameStr.split(/\s+(?:weds|and|&)\s+/i);
    if (parts.length === 2) {
      return (
        <>
          <span className="capitalize">{parts[0]}</span>
          <span className="font-serif italic font-normal text-amber-700/80 px-2 text-xl sm:text-3xl">weds</span>
          <span className="capitalize">{parts[1]}</span>
        </>
      );
    }
    return <span className="capitalize">{nameStr}</span>;
  };

  const studioName = studio?.name?.trim() || null;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 font-sans antialiased selection:bg-amber-100 selection:text-amber-900 pb-32">
      {/* ── Header Banner ── */}
      <header className="pt-6 sm:pt-8 pb-5 px-4 sm:px-8 max-w-5xl mx-auto">
        {studioName && (
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 mb-2">
            <span className="w-4 h-4 rounded-full border border-amber-500/40 bg-amber-50 flex items-center justify-center text-[10px] text-amber-700 font-bold">
              •
            </span>
            <span>{studioName}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight drop-shadow-2xs flex items-baseline">
              {formatCoupleTitle(rawCoupleTitle)}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3EFEA] border border-[#E5DFD7] text-slate-600 text-[11px] sm:text-xs font-semibold">
              {initialData?.title || (isPreWedding ? 'Pre-Wedding Moodboard' : 'Mood Board')}
            </span>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              onClick={copyPublicLink}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>

            {!isLocked ? (
              <button
                onClick={() => saveMoodboardData(true)}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Vision</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Locked ✓</span>
              </div>
            )}
          </div>
        </div>

        {isLocked && (
          <div className="mt-3.5 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <strong>Mood Board Locked for Studio Review:</strong> Your vision has been received. To make changes, please contact your photography studio.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Prep Completion</span>
            <span className="text-slate-800 font-mono">{completionPercentage}% Completed</span>
          </div>
          <div className="w-full h-2 bg-[#EAE5DD] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      {/* ── Main Interactive Content Container ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 space-y-5 sm:space-y-6">

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* 01. COUPLE PORTRAITS (ALL EVENTS)                             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
          <div
            onClick={() => toggleSection('01')}
            className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">
                01
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Couple Portraits</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                    {couplePhotos.length} / {maxCouplePhotos}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                  Upload up to {maxCouplePhotos} photos together for height, smiling angles, and couple vibe.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isLocked && couplePhotos.length < maxCouplePhotos && (
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Add Photos</span>
                  <span className="sm:hidden">Add</span>
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
                        (url) => setCouplePhotos((prev) => [...prev.slice(0, maxCouplePhotos - 1), { url, caption: '' }]),
                        'couple',
                        maxCouplePhotos,
                        couplePhotos.length
                      );
                    }}
                  />
                </label>
              )}
              <div className="p-1.5 text-slate-400">
                {expandedSections['01'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {expandedSections['01'] && (
            <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC]">
              <p className="text-xs text-slate-500 mb-4 sm:hidden">
                Upload up to {maxCouplePhotos} photos together for height, smiling angles, and couple vibe.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {couplePhotos.map((photo, idx) => (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#EAE5DD] bg-slate-50 flex flex-col shadow-2xs hover:border-amber-400 transition">
                    <div
                      onClick={() =>
                        openLightbox(
                          couplePhotos.map((p, i) => ({
                            url: getMediaUrl(p.url),
                            title: `Couple Portrait ${i + 1}`,
                            notes: p.caption,
                          })),
                          idx
                        )
                      }
                      className="aspect-[4/5] w-full bg-slate-100 relative overflow-hidden cursor-pointer"
                    >
                      <img src={getMediaUrl(photo.url)} alt={`Couple ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded backdrop-blur-xs">
                          View
                        </span>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteImageFromStorage(photo.url);
                            setCouplePhotos((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-black/65 hover:bg-rose-600 text-white rounded-full transition cursor-pointer z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Caption..."
                      disabled={isLocked}
                      value={photo.caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCouplePhotos((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, caption: val } : p))
                        );
                      }}
                      className="p-1.5 text-[11px] bg-white border-t border-[#EAE5DD] text-slate-700 outline-none placeholder-slate-400 disabled:bg-slate-50"
                    />
                  </div>
                ))}

                {uploadingSection === 'couple' && (
                  <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 aspect-[4/5] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                    <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                    <span className="text-[10px] font-bold text-amber-800">Compressing & Uploading...</span>
                  </div>
                )}

                {!isLocked && couplePhotos.length < maxCouplePhotos && uploadingSection !== 'couple' && (
                  <label className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/60 aspect-[4/5] flex flex-col items-center justify-center p-3 text-center transition group">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
                    <span className="text-[9px] text-slate-400">({maxCouplePhotos - couplePhotos.length} left)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) => setCouplePhotos((prev) => [...prev.slice(0, maxCouplePhotos - 1), { url, caption: '' }]),
                          'couple',
                          maxCouplePhotos,
                          couplePhotos.length
                        )
                      }
                    />
                  </label>
                )}
              </div>

              {couplePhotos.length === 0 && uploadingSection !== 'couple' && (
                <label className="mt-3 block cursor-pointer border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl py-6 px-4 text-center bg-amber-50/40 transition">
                  <Camera className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">No couple photos added yet</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Tap here to select and upload photos (Max {maxCouplePhotos})</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(
                        e,
                        (url) => setCouplePhotos((prev) => [...prev.slice(0, maxCouplePhotos - 1), { url, caption: '' }]),
                        'couple',
                        maxCouplePhotos,
                        couplePhotos.length
                      )
                    }
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* CONDITIONAL BRANCH: PRE-WEDDING VS OTHER EVENTS               */}
        {/* ═════════════════════════════════════════════════════════════ */}

        {isPreWedding ? (
          /* ─────────────────────────────────────────────────────────── */
          /* PRE-WEDDING MODE (5 CLEAN SECTIONS)                         */
          /* ─────────────────────────────────────────────────────────── */
          <>
            {/* 02. SHOOT DAY COORDINATION (BRIDE & GROOM) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('02')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
                    02
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Shoot-Day Coordinators</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add point of contacts for Bride & Groom for smooth coordination during the shoot.
                    </p>
                  </div>
                </div>
                <div className="p-1.5 text-slate-400">
                  {expandedSections['02'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedSections['02'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Bride Side */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-rose-200/80 space-y-3">
                      <span className="text-xs font-bold text-rose-900 block">👰 Bride Side Coordinator</span>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="e.g. Ananya Sharma (Sister)"
                            value={pwBrideCoordinator.name}
                            onChange={(e) => setPwBrideCoordinator(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Phone Number</label>
                            <input
                              type="tel"
                              disabled={isLocked}
                              placeholder="9876543210"
                              value={pwBrideCoordinator.phone}
                              onChange={(e) => setPwBrideCoordinator(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Relation / Role</label>
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Sister / MUA / Friend"
                              value={pwBrideCoordinator.relation}
                              onChange={(e) => setPwBrideCoordinator(prev => ({ ...prev, relation: e.target.value }))}
                              className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Groom Side */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-blue-200/80 space-y-3">
                      <span className="text-xs font-bold text-blue-900 block">🤵 Groom Side Coordinator</span>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="e.g. Rohan Nawale (Brother)"
                            value={pwGroomCoordinator.name}
                            onChange={(e) => setPwGroomCoordinator(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Phone Number</label>
                            <input
                              type="tel"
                              disabled={isLocked}
                              placeholder="9876543210"
                              value={pwGroomCoordinator.phone}
                              onChange={(e) => setPwGroomCoordinator(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Relation / Role</label>
                            <input
                              type="text"
                              disabled={isLocked}
                              placeholder="Brother / Best Friend"
                              value={pwGroomCoordinator.relation}
                              onChange={(e) => setPwGroomCoordinator(prev => ({ ...prev, relation: e.target.value }))}
                              className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 03. SHOOT PLACES / LOCATIONS (MULTIPLE PLACES SUPPORT) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('03')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                    03
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Shoot Places & Locations</h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {shootPlaces.length} Spots
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add multiple shoot locations with Bride, Groom, & Couple reference photos and comments.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSection('03');
                        handleAddPlace();
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Spot</span>
                    </button>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['03'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['03'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-6">
                  {shootPlaces.map((place, pIdx) => (
                    <div key={place.id || pIdx} className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-slate-300 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {pIdx + 1}
                          </span>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Location / Spot Name (e.g. Vagator Beach Cliff, Old Goa Ruins)"
                            value={place.place_name}
                            onChange={(e) => handleUpdatePlace(place.id, { place_name: e.target.value })}
                            className="font-bold text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-amber-500"
                          />
                        </div>

                        {!isLocked && shootPlaces.length > 1 && (
                          <button
                            onClick={() => handleRemovePlace(place.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                            title="Remove Spot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Location Address / Notes */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Location Address / Google Maps Link / Timing Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Light House, Candolim Beach, Goa (Maps link) • Golden hour 5:30 PM"
                          value={place.location_notes || ''}
                          disabled={isLocked}
                          onChange={(e) => handleUpdatePlace(place.id, { location_notes: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* 3 Photos: Bride, Groom, Couple */}
                      <div>
                        <div className="text-xs font-black text-slate-900 mb-2">
                          Spot Outfit & Pose References (Bride, Groom & Couple):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* Bride Photo */}
                          <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2">
                            <span className="text-[11px] font-bold text-rose-800 block">👰 Bride Photo / Outfit</span>
                            {place.bride_photo_url ? (
                              <div
                                onClick={() =>
                                  openLightbox([
                                    {
                                      url: getMediaUrl(place.bride_photo_url!),
                                      title: `${place.place_name} • Bride Reference`,
                                      notes: place.comments,
                                    },
                                  ])
                                }
                                className="aspect-[4/5] rounded-xl overflow-hidden relative group cursor-pointer"
                              >
                                <img src={getMediaUrl(place.bride_photo_url)} alt="Bride" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] font-bold px-2 py-0.5 bg-black/75 rounded">
                                    View
                                  </span>
                                </div>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteImageFromStorage(place.bride_photo_url);
                                      handleUpdatePlace(place.id, { bride_photo_url: '' });
                                    }}
                                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : uploadingSection === `place-${place.id}-bride` ? (
                              <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                                <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                                <span className="text-[10px] font-bold text-rose-800">Uploading...</span>
                              </div>
                            ) : !isLocked ? (
                              <label className="cursor-pointer border border-dashed border-rose-300 hover:border-rose-500 rounded-xl aspect-[4/5] flex flex-col items-center justify-center p-3 text-center transition bg-rose-50/30">
                                <Upload className="w-4 h-4 text-rose-600 mb-1" />
                                <span className="text-[11px] text-rose-800 font-bold">Upload Bride Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      (url) => handleUpdatePlace(place.id, { bride_photo_url: url }),
                                      `place-${place.id}-bride`
                                    )
                                  }
                                />
                              </label>
                            ) : (
                              <div className="aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                No photo
                              </div>
                            )}
                          </div>

                          {/* Groom Photo */}
                          <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                            <span className="text-[11px] font-bold text-blue-800 block">🤵 Groom Photo / Outfit</span>
                            {place.groom_photo_url ? (
                              <div
                                onClick={() =>
                                  openLightbox([
                                    {
                                      url: getMediaUrl(place.groom_photo_url!),
                                      title: `${place.place_name} • Groom Reference`,
                                      notes: place.comments,
                                    },
                                  ])
                                }
                                className="aspect-[4/5] rounded-xl overflow-hidden relative group cursor-pointer"
                              >
                                <img src={getMediaUrl(place.groom_photo_url)} alt="Groom" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] font-bold px-2 py-0.5 bg-black/75 rounded">
                                    View
                                  </span>
                                </div>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteImageFromStorage(place.groom_photo_url);
                                      handleUpdatePlace(place.id, { groom_photo_url: '' });
                                    }}
                                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : uploadingSection === `place-${place.id}-groom` ? (
                              <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                <span className="text-[10px] font-bold text-blue-800">Uploading...</span>
                              </div>
                            ) : !isLocked ? (
                              <label className="cursor-pointer border border-dashed border-blue-300 hover:border-blue-500 rounded-xl aspect-[4/5] flex flex-col items-center justify-center p-3 text-center transition bg-blue-50/30">
                                <Upload className="w-4 h-4 text-blue-600 mb-1" />
                                <span className="text-[11px] text-blue-800 font-bold">Upload Groom Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      (url) => handleUpdatePlace(place.id, { groom_photo_url: url }),
                                      `place-${place.id}-groom`
                                    )
                                  }
                                />
                              </label>
                            ) : (
                              <div className="aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                No photo
                              </div>
                            )}
                          </div>

                          {/* Couple Photo */}
                          <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                            <span className="text-[11px] font-bold text-amber-800 block">👩‍❤️‍👨 Couple Photo / Pose</span>
                            {place.couple_photo_url ? (
                              <div
                                onClick={() =>
                                  openLightbox([
                                    {
                                      url: getMediaUrl(place.couple_photo_url!),
                                      title: `${place.place_name} • Couple Reference`,
                                      notes: place.comments,
                                    },
                                  ])
                                }
                                className="aspect-[4/5] rounded-xl overflow-hidden relative group cursor-pointer"
                              >
                                <img src={getMediaUrl(place.couple_photo_url)} alt="Couple" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] font-bold px-2 py-0.5 bg-black/75 rounded">
                                    View
                                  </span>
                                </div>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteImageFromStorage(place.couple_photo_url);
                                      handleUpdatePlace(place.id, { couple_photo_url: '' });
                                    }}
                                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : uploadingSection === `place-${place.id}-couple` ? (
                              <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                                <span className="text-[10px] font-bold text-amber-800">Uploading...</span>
                              </div>
                            ) : !isLocked ? (
                              <label className="cursor-pointer border border-dashed border-amber-300 hover:border-amber-500 rounded-xl aspect-[4/5] flex flex-col items-center justify-center p-3 text-center transition bg-amber-50/30">
                                <Upload className="w-4 h-4 text-amber-600 mb-1" />
                                <span className="text-[11px] text-amber-800 font-bold">Upload Couple Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileUpload(
                                      e,
                                      (url) => handleUpdatePlace(place.id, { couple_photo_url: url }),
                                      `place-${place.id}-couple`
                                    )
                                  }
                                />
                              </label>
                            ) : (
                              <div className="aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                                No photo
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direction Comments */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Direction / Pose Notes for this Spot:
                        </label>
                        <textarea
                          rows={2}
                          disabled={isLocked}
                          placeholder="e.g. Sunset golden hour shots; dramatic veil flying shot; casual walking poses..."
                          value={place.comments || ''}
                          onChange={(e) => handleUpdatePlace(place.id, { comments: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ))}

                  {!isLocked && (
                    <button
                      onClick={handleAddPlace}
                      className="w-full py-3.5 bg-amber-50 hover:bg-amber-100/80 border-2 border-dashed border-amber-300 hover:border-amber-400 text-amber-950 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>+ Add Another Shoot Spot / Location</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 04. INSPIRATION & POSE IDEAS */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('04')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                    04
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Inspiration & Pose Ideas</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add links to Pinterest Boards, Instagram Saved Folders, or upload pose photos.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSection('04');
                        setInspoLinks((prev) => [...prev, { url: '', platform: 'Pinterest', notes: '' }]);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Link</span>
                    </button>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['04'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['04'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-3">
                  {inspoLinks.map((link, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs">
                      <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
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
                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder="Notes (e.g. sunset walking pose, beach reflection)"
                        value={link.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInspoLinks((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, notes: val } : item))
                          );
                        }}
                        className="w-full sm:w-60 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
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
                    <p className="text-xs text-slate-400 italic py-2 text-center">No inspiration links added yet. Click 'Add Link' above.</p>
                  )}
                </div>
              )}
            </div>

            {/* 05. CINEMATIC VIDEO REFERENCES */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('05')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                    05
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Cinematic Video References</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add links from Instagram Reels, YouTube Films, Vimeo, or Google Drive for video grading & vibe.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSection('05');
                        setVideoRefs((prev) => [...prev, { url: '', notes: '' }]);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Video</span>
                    </button>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['05'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['05'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-3">
                  {videoRefs.map((vid, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
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
                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder="Notes (e.g. drone reveal, slow motion vibe)"
                        value={vid.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVideoRefs((prev) =>
                            prev.map((v, i) => (i === idx ? { ...v, notes: val } : v))
                          );
                        }}
                        className="w-full sm:w-64 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
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
                    <p className="text-xs text-slate-400 italic py-2 text-center">No video links added yet. Click 'Add Video' above.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ─────────────────────────────────────────────────────────── */
          /* WEDDING & ALL OTHER EVENTS (ORIGINAL 8 SECTIONS RESTORED)   */
          /* ─────────────────────────────────────────────────────────── */
          <>
            {/* 02. SOCIAL HANDLES & HASHTAG */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('02')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                    02
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Social Handles & Hashtag</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add @handle or paste profile links for teaser drops and reel collaborations.
                    </p>
                  </div>
                </div>
                <div className="p-1.5 text-slate-400">
                  {expandedSections['02'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedSections['02'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Bride Instagram */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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
                          className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition pr-8 disabled:bg-slate-50"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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
                          className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition pr-8 disabled:bg-slate-50"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-amber-600" />
                        <span>Couple / Wedding Hashtag</span>
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder="#RohitWedsPriya"
                        value={coupleIg}
                        onChange={(e) => setCoupleIg(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                        className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 03. EVENT-DAY COORDINATORS (BRIDE & GROOM) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('03')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
                    03
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Event-Day Coordinators</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add key point of contacts (Sibling, Friend, MUA) for instant shoot coordination.
                    </p>
                  </div>
                </div>
                <div className="p-1.5 text-slate-400">
                  {expandedSections['03'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedSections['03'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Bride Side Coordinators */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-rose-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900">👰 Bride Side ({brideCoordinators.length})</span>
                        {!isLocked && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePickContact('bride')}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Contact Book</span>
                            </button>
                            <button
                              onClick={() => setBrideCoordinators((prev) => [...prev, { name: '', phone: '', relation: '' }])}
                              className="p-1.5 bg-white border border-rose-200 text-rose-800 rounded-xl transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {brideCoordinators.map((coord, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                            {!isLocked && (
                              <button
                                onClick={() => setBrideCoordinators((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="e.g. Ananya Sharma (Bride's Sister)"
                            value={coord.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrideCoordinators((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                              );
                            }}
                            className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Phone Number</label>
                              <div className="relative flex items-center">
                                <input
                                  type="tel"
                                  disabled={isLocked}
                                  placeholder="9876543210"
                                  value={coord.phone}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBrideCoordinators((prev) =>
                                      prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                                    );
                                  }}
                                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none pr-7"
                                />
                                {coord.phone && (
                                  <a
                                    href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-2 text-emerald-600 hover:text-emerald-700"
                                    title="WhatsApp Chat"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Relation / Role</label>
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Sister / MUA / Friend"
                                value={coord.relation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBrideCoordinators((prev) =>
                                    prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                                  );
                                }}
                                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {brideCoordinators.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No coordinators added yet.</p>
                      )}
                    </div>

                    {/* Groom Side Coordinators */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-blue-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">🤵 Groom Side ({groomCoordinators.length})</span>
                        {!isLocked && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePickContact('groom')}
                              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Contact Book</span>
                            </button>
                            <button
                              onClick={() => setGroomCoordinators((prev) => [...prev, { name: '', phone: '', relation: '' }])}
                              className="p-1.5 bg-white border border-blue-200 text-blue-800 rounded-xl transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {groomCoordinators.map((coord, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                            {!isLocked && (
                              <button
                                onClick={() => setGroomCoordinators((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="e.g. Rohan Nawale (Groom's Brother)"
                            value={coord.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGroomCoordinators((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                              );
                            }}
                            className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Phone Number</label>
                              <div className="relative flex items-center">
                                <input
                                  type="tel"
                                  disabled={isLocked}
                                  placeholder="9876543210"
                                  value={coord.phone}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setGroomCoordinators((prev) =>
                                      prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                                    );
                                  }}
                                  className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none pr-7"
                                />
                                {coord.phone && (
                                  <a
                                    href={`https://wa.me/${coord.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-2 text-emerald-600 hover:text-emerald-700"
                                    title="WhatsApp Chat"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Relation / Role</label>
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="Brother / Best Friend"
                                value={coord.relation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGroomCoordinators((prev) =>
                                    prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                                  );
                                }}
                                className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {groomCoordinators.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No coordinators added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 04. CLOSE FAMILY IDENTIFICATION PHOTOS (LIMIT 12 EACH) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('04')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    04
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Close Family Identification Photos</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Upload photos and use 'Draw & Tag Faces' to circle VIP members (Max 12 per side).
                    </p>
                  </div>
                </div>
                <div className="p-1.5 text-slate-400">
                  {expandedSections['04'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedSections['04'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-6">
                  {/* Bride's Family Members (Max 12) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-rose-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-900">👰 Bride's Family Members</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {brideFamilyPhotos.length} / 12
                        </span>
                      </div>
                      {!isLocked && brideFamilyPhotos.length < 12 && (
                        <label className="cursor-pointer px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold transition flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-rose-600" />
                          <span>Add Photo</span>
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
                                    ...prev.slice(0, 11),
                                    { url, side: 'Bride', relation: 'Parents', names: '' },
                                  ]),
                                'family-bride',
                                12,
                                brideFamilyPhotos.length
                              )
                            }
                          />
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {brideFamilyPhotos.map((fam, idx) => (
                        <div key={idx} className="rounded-2xl border border-rose-200 bg-white p-3 space-y-2 shadow-2xs">
                          <div
                            onClick={() =>
                              openLightbox(
                                brideFamilyPhotos.map((f, i) => ({
                                  url: getMediaUrl(f.url),
                                  title: `Bride Family • ${f.relation || 'VIP'}`,
                                  subtitle: f.names || 'Family Member',
                                })),
                                idx
                              )
                            }
                            className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 relative group cursor-pointer"
                          >
                            <img src={getMediaUrl(fam.url)} alt="Bride Family" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAnnotatingPhoto({ side: 'Bride', index: idx, url: getMediaUrl(fam.url) });
                                }}
                                className="absolute bottom-2 left-2 px-2.5 py-1.5 bg-black/75 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 backdrop-blur-md transition shadow-sm cursor-pointer z-10"
                              >
                                <Pencil className="w-3 h-3 text-amber-300" />
                                <span>Draw & Tag Faces</span>
                              </button>
                            )}

                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteImageFromStorage(fam.url);
                                  setBrideFamilyPhotos((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10 cursor-pointer"
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
                              className="bg-[#FAF9F6] border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
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
                              className="bg-[#FAF9F6] border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {uploadingSection === 'family-bride' && (
                        <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                          <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
                          <span className="text-[11px] font-bold text-rose-800">Uploading Photo...</span>
                        </div>
                      )}
                    </div>

                    {brideFamilyPhotos.length === 0 && uploadingSection !== 'family-bride' && (
                      <label className="block cursor-pointer border border-dashed border-rose-300 hover:border-rose-400 rounded-2xl py-5 px-3 text-center bg-rose-50/30 transition">
                        <p className="text-xs font-bold text-rose-900">No Bride family photos added yet</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">Tap here to upload Bride family portraits (Max 12)</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              (url) =>
                                setBrideFamilyPhotos((prev) => [
                                  ...prev.slice(0, 11),
                                  { url, side: 'Bride', relation: 'Parents', names: '' },
                                ]),
                              'family-bride',
                              12,
                              brideFamilyPhotos.length
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  {/* Groom's Family Members (Max 12) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-blue-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-900">🤵 Groom's Family Members</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {groomFamilyPhotos.length} / 12
                        </span>
                      </div>
                      {!isLocked && groomFamilyPhotos.length < 12 && (
                        <label className="cursor-pointer px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-xl text-xs font-bold transition flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Add Photo</span>
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
                                    ...prev.slice(0, 11),
                                    { url, side: 'Groom', relation: 'Parents', names: '' },
                                  ]),
                                'family-groom',
                                12,
                                groomFamilyPhotos.length
                              )
                            }
                          />
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {groomFamilyPhotos.map((fam, idx) => (
                        <div key={idx} className="rounded-2xl border border-blue-200 bg-white p-3 space-y-2 shadow-2xs">
                          <div
                            onClick={() =>
                              openLightbox(
                                groomFamilyPhotos.map((f, i) => ({
                                  url: getMediaUrl(f.url),
                                  title: `Groom Family • ${f.relation || 'VIP'}`,
                                  subtitle: f.names || 'Family Member',
                                })),
                                idx
                              )
                            }
                            className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 relative group cursor-pointer"
                          >
                            <img src={getMediaUrl(fam.url)} alt="Groom Family" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAnnotatingPhoto({ side: 'Groom', index: idx, url: getMediaUrl(fam.url) });
                                }}
                                className="absolute bottom-2 left-2 px-2.5 py-1.5 bg-black/75 hover:bg-blue-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 backdrop-blur-md transition shadow-sm cursor-pointer z-10"
                              >
                                <Pencil className="w-3 h-3 text-amber-300" />
                                <span>Draw & Tag Faces</span>
                              </button>
                            )}

                            {!isLocked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteImageFromStorage(fam.url);
                                  setGroomFamilyPhotos((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10 cursor-pointer"
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
                              className="bg-[#FAF9F6] border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
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
                              className="bg-[#FAF9F6] border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {uploadingSection === 'family-groom' && (
                        <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          <span className="text-[11px] font-bold text-blue-800">Uploading Photo...</span>
                        </div>
                      )}
                    </div>

                    {groomFamilyPhotos.length === 0 && uploadingSection !== 'family-groom' && (
                      <label className="block cursor-pointer border border-dashed border-blue-300 hover:border-blue-400 rounded-2xl py-5 px-3 text-center bg-blue-50/30 transition">
                        <p className="text-xs font-bold text-blue-900">No Groom family photos added yet</p>
                        <p className="text-[11px] text-blue-600 mt-0.5">Tap here to upload Groom family portraits (Max 12)</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              (url) =>
                                setGroomFamilyPhotos((prev) => [
                                  ...prev.slice(0, 11),
                                  { url, side: 'Groom', relation: 'Parents', names: '' },
                                ]),
                              'family-groom',
                              12,
                              groomFamilyPhotos.length
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 05. INSPIRATION & POSE IDEAS */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('05')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                    05
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Inspiration & Pose Ideas</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add links to Pinterest Boards, Instagram Saved Folders, or Drive.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSection('05');
                        setInspoLinks((prev) => [...prev, { url: '', platform: 'Pinterest', notes: '' }]);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Link</span>
                    </button>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['05'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['05'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-3">
                  {inspoLinks.map((link, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs">
                      <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
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
                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder="Notes (e.g. Royal aesthetic, varmala pose)"
                        value={link.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInspoLinks((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, notes: val } : item))
                          );
                        }}
                        className="w-full sm:w-60 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
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
                    <p className="text-xs text-slate-400 italic py-2 text-center">No inspiration links added yet. Click 'Add Link' above.</p>
                  )}
                </div>
              )}
            </div>

            {/* 06. VIDEO & REELS REFERENCES */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('06')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                    06
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Video & Reels References</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add links from Instagram Reels, YouTube Films, Vimeo, or Google Drive.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSection('06');
                        setVideoRefs((prev) => [...prev, { url: '', notes: '' }]);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Video</span>
                    </button>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['06'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['06'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-3">
                  {videoRefs.map((vid, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
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
                        className="w-full sm:flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        placeholder="Notes (e.g. cinematic grading, slow motion vibe)"
                        value={vid.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVideoRefs((prev) =>
                            prev.map((v, i) => (i === idx ? { ...v, notes: val } : v))
                          );
                        }}
                        className="w-full sm:w-64 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
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
                    <p className="text-xs text-slate-400 italic py-2 text-center">No video links added yet. Click 'Add Video' above.</p>
                  )}
                </div>
              )}
            </div>

            {/* 07. EVENT ITINERARY & TIMINGS */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('07')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                    07
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Event Itinerary & Timings</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Add ceremony schedules, venue maps, outfits, and rituals notes.
                    </p>
                  </div>
                </div>
                <div className="p-1.5 text-slate-400">
                  {expandedSections['07'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedSections['07'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-5">
                  {itinerary.map((item, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-slate-300 space-y-4 shadow-xs">
                      {/* Event Title Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Event Name (e.g. Haldi, Sangeet & Cocktail, Wedding, Reception)"
                            value={item.event_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItinerary((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, event_name: val } : it))
                              );
                            }}
                            className="font-bold text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 flex-1 outline-none focus:border-amber-500"
                          />
                        </div>

                        {!isLocked && (
                          <button
                            onClick={() => {
                              if (item.bride_outfit_url) deleteImageFromStorage(item.bride_outfit_url);
                              if (item.groom_outfit_url) deleteImageFromStorage(item.groom_outfit_url);
                              setItinerary((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {(item.date || item.start_time || item.end_time) && (
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-amber-900 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                          {item.date && <span>📅 {formatEventDate(item.date)}</span>}
                          {(item.start_time || item.end_time) && (
                            <span>⏰ {formatEventTime(item.start_time)}{item.end_time ? ` - ${formatEventTime(item.end_time)}` : ''}</span>
                          )}
                        </div>
                      )}

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
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none font-medium"
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
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none font-bold cursor-pointer"
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
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none font-bold cursor-pointer"
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
                              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-800 outline-none font-medium"
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
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none font-medium pr-8"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* Bride Outfit Box */}
                        <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2">
                          <span className="text-[11px] font-bold text-rose-800 block">Bride's Outfit / Styling</span>
                          {item.bride_outfit_url ? (
                            <div
                              onClick={() =>
                                openLightbox([
                                  {
                                    url: getMediaUrl(item.bride_outfit_url),
                                    title: `${item.event_name || 'Ceremony'} • Bride Outfit`,
                                    notes: item.rituals_notes,
                                  },
                                ])
                              }
                              className="aspect-[4/3] rounded-xl overflow-hidden relative group cursor-pointer"
                            >
                              <img src={getMediaUrl(item.bride_outfit_url)} alt="Bride Outfit" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded backdrop-blur-xs">
                                  View Outfit
                                </span>
                              </div>
                              {!isLocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImageFromStorage(item.bride_outfit_url);
                                    setItinerary((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, bride_outfit_url: undefined } : it))
                                    );
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : uploadingSection === `event-bride-${idx}` ? (
                            <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                              <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                              <span className="text-[10px] font-bold text-rose-800">Uploading...</span>
                            </div>
                          ) : !isLocked ? (
                            <label className="cursor-pointer border border-dashed border-slate-300 hover:border-amber-500 rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition bg-[#FAF8F5]/60">
                              <Upload className="w-4 h-4 text-amber-600 mb-1" />
                              <span className="text-[11px] text-slate-700 font-bold">Upload Bride Outfit</span>
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
                        <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2">
                          <span className="text-[11px] font-bold text-blue-800 block">Groom's Outfit / Styling</span>
                          {item.groom_outfit_url ? (
                            <div
                              onClick={() =>
                                openLightbox([
                                  {
                                    url: getMediaUrl(item.groom_outfit_url),
                                    title: `${item.event_name || 'Ceremony'} • Groom Outfit`,
                                    notes: item.rituals_notes,
                                  },
                                ])
                              }
                              className="aspect-[4/3] rounded-xl overflow-hidden relative group cursor-pointer"
                            >
                              <img src={getMediaUrl(item.groom_outfit_url)} alt="Groom Outfit" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-black/75 text-white text-[9px] font-bold rounded backdrop-blur-xs">
                                  View Outfit
                                </span>
                              </div>
                              {!isLocked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImageFromStorage(item.groom_outfit_url);
                                    setItinerary((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, groom_outfit_url: undefined } : it))
                                    );
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition z-10 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : uploadingSection === `event-groom-${idx}` ? (
                            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center animate-pulse space-y-2">
                              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                              <span className="text-[10px] font-bold text-blue-800">Uploading...</span>
                            </div>
                          ) : !isLocked ? (
                            <label className="cursor-pointer border border-dashed border-slate-300 hover:border-amber-500 rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-3 text-center transition bg-[#FAF8F5]/60">
                              <Upload className="w-4 h-4 text-blue-600 mb-1" />
                              <span className="text-[11px] text-slate-700 font-bold">Upload Groom Outfit</span>
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
                          placeholder="e.g. Bride entry at 07:00 PM with Phoolon ki Chaadar, Varmala fireworks, Couple first dance song..."
                          value={item.rituals_notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItinerary((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, rituals_notes: val } : it))
                            );
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none font-medium disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  ))}

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
                      className="w-full py-3.5 bg-amber-50 hover:bg-amber-100/80 border-2 border-dashed border-amber-300 hover:border-amber-400 text-amber-950 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
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

            {/* 08. VENDOR & PAYMENT MANAGER */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EFEBE4] shadow-xs overflow-hidden">
              <div
                onClick={() => toggleSection('08')}
                className="p-5 sm:p-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-pink-100 text-pink-800 font-black text-xs flex items-center justify-center shrink-0">
                    08
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Vendor & Payment Manager</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                      Nominate authorized family members for vendor settlements and day-of cash payments.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handlePickContact('payment')}
                        className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
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
                        className="p-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                  )}
                  <div className="p-1.5 text-slate-400">
                    {expandedSections['08'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSections['08'] && (
                <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[#F5F2EC] space-y-3">
                  {paymentContacts.map((contact, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center shadow-2xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Full Name</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          placeholder="e.g. Suresh Nawale"
                          value={contact.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPaymentContacts((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                            );
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Phone Number</label>
                        <div className="relative flex items-center">
                          <input
                            type="tel"
                            disabled={isLocked}
                            placeholder="9876543210"
                            value={contact.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaymentContacts((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, phone: val } : c))
                              );
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none disabled:bg-slate-50 pr-7"
                          />
                          {contact.phone && (
                            <a
                              href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute right-2 text-emerald-600 hover:text-emerald-700"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Role / Relation</label>
                          <input
                            type="text"
                            disabled={isLocked}
                            placeholder="Father / Cash Handler / Planner"
                            value={contact.relation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaymentContacts((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, relation: val } : c))
                              );
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none disabled:bg-slate-50"
                          />
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => setPaymentContacts((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer self-end mb-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {paymentContacts.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-2 text-center">No vendor / payment contacts added yet.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* ── Fixed Bottom Save Bar ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EAE5DD] py-3.5 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="font-bold text-amber-700">Auto-saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 font-medium hidden sm:inline">All changes saved automatically</span>
                <span className="text-slate-600 font-medium sm:hidden">Saved</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-medium">Unsaved changes</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                onClick={() => saveMoodboardData(false)}
                disabled={saving}
                className="px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save Draft
              </button>
            )}

            {!isLocked ? (
              <button
                onClick={() => saveMoodboardData(true)}
                disabled={saving}
                className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Studio</span>
              </button>
            ) : (
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submitted & Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Contact Modal Fallback ── */}
      <AnimatePresence>
        {contactModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#EAE5DD] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Add {contactModalTarget === 'bride' ? "Bride's" : contactModalTarget === 'groom' ? "Groom's" : 'Payment'} Contact
                </h3>
                <button onClick={() => setContactModalTarget(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-2.5 outline-none font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-2.5 outline-none font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Relation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Sister, Brother, Father, MUA"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-slate-300 rounded-xl p-2.5 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setContactModalTarget(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContactModal}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs"
                >
                  Save Contact
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Photo Drawing & VIP Tagging Modal ── */}
      {annotatingPhoto && (
        <PhotoDrawModal
          isOpen={true}
          imageUrl={annotatingPhoto.url}
          token={token}
          onClose={() => setAnnotatingPhoto(null)}
          onSaveAnnotatedImage={(newUrl: string) => {
            if (annotatingPhoto.side === 'Bride') {
              setBrideFamilyPhotos((prev) =>
                prev.map((f, i) => (i === annotatingPhoto.index ? { ...f, url: newUrl } : f))
              );
            } else {
              setGroomFamilyPhotos((prev) =>
                prev.map((f, i) => (i === annotatingPhoto.index ? { ...f, url: newUrl } : f))
              );
            }
            setAnnotatingPhoto(null);
          }}
        />
      )}

      {/* ── Full-Screen Lightbox Modal ── */}
      <AnimatePresence>
        {lightbox.isOpen && lightbox.items.length > 0 && (
          <div
            onClick={() => setLightbox({ isOpen: false, items: [], currentIndex: 0 })}
            className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            >
              <button
                onClick={() => setLightbox({ isOpen: false, items: [], currentIndex: 0 })}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition z-20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative w-full flex items-center justify-center">
                <img
                  src={lightbox.items[lightbox.currentIndex]?.url}
                  alt={lightbox.items[lightbox.currentIndex]?.title || 'Enlarged Preview'}
                  className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />

                {lightbox.items.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setLightbox((prev) => ({
                          ...prev,
                          currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
                        }))
                      }
                      className="absolute left-2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setLightbox((prev) => ({
                          ...prev,
                          currentIndex: (prev.currentIndex + 1) % prev.items.length,
                        }))
                      }
                      className="absolute right-2 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {(lightbox.items[lightbox.currentIndex]?.title || lightbox.items[lightbox.currentIndex]?.notes) && (
                <div className="mt-3 text-center text-white px-4">
                  {lightbox.items[lightbox.currentIndex]?.title && (
                    <div className="text-sm font-bold">{lightbox.items[lightbox.currentIndex]?.title}</div>
                  )}
                  {lightbox.items[lightbox.currentIndex]?.subtitle && (
                    <div className="text-xs text-amber-300 font-medium">{lightbox.items[lightbox.currentIndex]?.subtitle}</div>
                  )}
                  {lightbox.items[lightbox.currentIndex]?.notes && (
                    <div className="text-xs text-slate-300 mt-1 max-w-lg mx-auto">{lightbox.items[lightbox.currentIndex]?.notes}</div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Celebration Popup on Submit ── */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-200 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl">
                ✨
              </div>
              <h3 className="text-xl font-black text-slate-900">Vision Submitted!</h3>
              <p className="text-xs text-slate-600">
                Thank you! Your shoot preferences, inspiration, and coordinator details have been sent to our photography team. We can't wait to capture your dream celebrations!
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs cursor-pointer"
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

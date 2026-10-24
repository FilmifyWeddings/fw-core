'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Camera,
  Sparkles,
  Download,
  Lock,
  Unlock,
  X,
  Heart,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Crown,
  Copy,
  Check,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Calendar,
  Layers,
  KeyRound,
  Zap,
} from 'lucide-react';
import { getPublicGalleryUrl } from '@/lib/r2';
import { FaceScannerModal } from '@/components/gallery/FaceScannerModal';
import { PremagicLightbox } from '@/components/gallery/PremagicLightbox';
import { ProgressiveSmoothImage } from '@/components/gallery/ProgressiveSmoothImage';

interface PhotoItem {
  id: string;
  gallery_id: string;
  collection_id?: string | null;
  preview_url: string;
  thumbnail_url: string;
  original_key: string;
  width: number;
  height: number;
  face_count: number;
  similarity?: number;
  confidencePercent?: number;
}

interface GalleryCollection {
  id: string;
  name: string;
  photo_count?: number;
}

interface GalleryInfo {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  guest_pin?: string | null;
  admin_pin?: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active?: boolean;
  status?: string;
  studio_slug?: string;
}

function StrictZeroKnowledgeGuestContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const galleryIdOrSlug = (params?.id || params?.slug) as string;

  // Search parameters for access modes
  const isFullAccess = searchParams?.get('access') === 'all' || searchParams?.get('access') === 'full';
  const isSelectionMode = searchParams?.get('album_selection') === 'true';
  const isVipMode = searchParams?.get('vip-link') === '1';
  const personParam = searchParams?.get('person');
  const passKeyParam = searchParams?.get('pass_key');
  const shareKeyParam = searchParams?.get('share_key');
  const isNoPinParam = searchParams?.get('no_pin') === '1' || searchParams?.get('no_pin') === 'true';

  const isPrivilegedMode = isFullAccess || isSelectionMode || isVipMode;

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [fullPhotos, setFullPhotos] = useState<PhotoItem[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN / PassKey State for Privileged Access
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Zero-Knowledge Guest State
  const [isFaceScannerOpen, setIsFaceScannerOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoItem[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Dual Guest Tab: 'my' (AI Face Matched) vs 'all' (Full Event Photos)
  const [guestActiveTab, setGuestActiveTab] = useState<'my' | 'all'>('my');
  const [isSyncingLivePhotos, setIsSyncingLivePhotos] = useState(false);
  const [guestSavedSession, setGuestSavedSession] = useState<{ id?: string; token?: string; name?: string } | null>(null);

  // 50-Photo Progressive Pagination for Privileged View
  const [visibleFullCount, setVisibleFullCount] = useState<number>(50);

  // Lightbox & Selection State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedForAlbum, setSelectedForAlbum] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const guestIdParam = searchParams?.get('guest') || searchParams?.get('guest_id');
  const tokenParam = searchParams?.get('token');

  const currentGalleryStatus = (gallery?.status?.toUpperCase() === 'EXPIRED')
    ? 'EXPIRED'
    : (gallery?.status?.toUpperCase() === 'PUBLISHED' || (gallery?.is_active && gallery?.status?.toUpperCase() !== 'UNPUBLISHED'))
    ? 'PUBLISHED'
    : 'UNPUBLISHED';

  // 1. Fetch Gallery Metadata
  const loadGalleryData = useCallback(async () => {
    if (!galleryIdOrSlug) return;
    setLoading(true);
    setError(null);

    try {
      let gal: any = null;
      try {
        const gRes = await fetch(`/api/gallery/events?id=${galleryIdOrSlug}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.gallery) {
          gal = gJson.gallery;
        }
      } catch (_) {}

      if (!gal) {
        const slugRes = await fetch(`/api/gallery/events?slug=${galleryIdOrSlug}`);
        const slugJson = await slugRes.json();
        if (slugJson.success && slugJson.gallery) {
          gal = slugJson.gallery;
        }
      }

      if (!gal) {
        setError('This wedding gallery was not found or is currently inactive.');
        setLoading(false);
        return;
      }

      setGallery(gal);

      // Check unlock permissions for privileged mode
      const isGuestPinDisabled =
        !isSelectionMode &&
        !isFullAccess &&
        (isNoPinParam ||
          gal.raw_payload?.guest_pin_enabled === false ||
          gal.raw_payload?.guest_ask_pin === false);

      const requiredPin = isSelectionMode
        ? (gal.admin_pin || gal.pin_code)
        : (isGuestPinDisabled ? null : (gal.guest_pin || gal.pin_code));

      const passedKey = isSelectionMode ? passKeyParam : shareKeyParam;

      const hasValidPin =
        isVipMode ||
        isGuestPinDisabled ||
        !requiredPin ||
        passedKey === requiredPin ||
        (typeof window !== 'undefined' && sessionStorage.getItem(`unlocked_${gal.id}`) === 'true');

      if (hasValidPin) {
        setIsUnlocked(true);
      }

      // Fetch full collections & photos if in PRIVILEGED mode OR gallery is PUBLISHED
      const isGalleryPublished = gal.status?.toUpperCase() === 'PUBLISHED' || (gal.is_active && gal.status?.toUpperCase() !== 'UNPUBLISHED');
      if (isGalleryPublished || (isPrivilegedMode && hasValidPin)) {
        // Fetch Collections
        try {
          const cRes = await fetch(`/api/gallery/collections?gallery_id=${gal.id}`);
          const cJson = await cRes.json();
          if (cJson.success && Array.isArray(cJson.collections)) {
            setCollections(cJson.collections);
          }
        } catch (_) {}

        // Fetch Full Photos
        const pRes = await fetch(`/api/gallery/photos?gallery_id=${gal.id}`);
        const pJson = await pRes.json();
        if (pJson.success && Array.isArray(pJson.photos)) {
          setFullPhotos(pJson.photos);
        }

        // Fetch People Clusters
        try {
          const peopleRes = await fetch(`/api/gallery/people?gallery_id=${gal.id}`);
          const peopleJson = await peopleRes.json();
          if (peopleJson.success && Array.isArray(peopleJson.people)) {
            setPeople(peopleJson.people);
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Error loading gallery:', err);
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [galleryIdOrSlug, isSelectionMode, passKeyParam, shareKeyParam, isVipMode, isPrivilegedMode]);

  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

  // Auto-resolve Unique Guest Link or Saved Device Session (No repetitive login on re-scan)
  useEffect(() => {
    if (!gallery) return;

    let isMounted = true;
    const fetchGuestData = async (guestId: string, tok?: string) => {
      try {
        const res = await fetch(`/api/gallery/guest?id=${encodeURIComponent(guestId)}${tok ? `&token=${encodeURIComponent(tok)}` : ''}`);
        const json = await res.json();
        if (!isMounted || !json.success || !json.guest) return;

        const g = json.guest;
        setGuestName(g.guest_name || '');
        setGuestPhone(g.guest_phone || '');
        setGuestEmail(g.guest_email || '');
        setIsVerified(true);
        setHasSearched(true);
        setGuestSavedSession({ id: g.id, token: g.access_token, name: g.guest_name });

        // Save session in localStorage so subsequent QR scans bypass login
        try {
          const sessObj = { id: g.id, token: g.access_token, name: g.guest_name, phone: g.guest_phone, email: g.guest_email };
          localStorage.setItem(`studiocore_guest_${gallery.slug}`, JSON.stringify(sessObj));
          localStorage.setItem(`studiocore_guest_${gallery.id}`, JSON.stringify(sessObj));
        } catch (_) {}

        const status = gallery.status?.toUpperCase() || (gallery.is_active ? 'PUBLISHED' : 'UNPUBLISHED');

        // If gallery is published, match photos using their 512-D embedding
        if (status === 'PUBLISHED' && g.face_embedding && Array.isArray(g.face_embedding) && g.face_embedding.length === 512) {
          setIsMatching(true);
          try {
            const matchRes = await fetch('/api/gallery/match-face', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gallery_id: gallery.id,
                embedding: g.face_embedding,
                threshold: 0.48,
              }),
            });
            const matchJson = await matchRes.json();
            if (isMounted && matchJson.success && Array.isArray(matchJson.photos)) {
              setMatchedPhotos(matchJson.photos);
            }
          } catch (mErr) {
            console.warn('Auto match error:', mErr);
          } finally {
            if (isMounted) setIsMatching(false);
          }
        }
      } catch (err) {
        console.warn('Error auto-resolving guest:', err);
      }
    };

    if (guestIdParam) {
      fetchGuestData(guestIdParam, tokenParam || undefined);
    } else {
      // Check device localStorage
      try {
        const rawLocal = localStorage.getItem(`studiocore_guest_${gallery.slug}`) || localStorage.getItem(`studiocore_guest_${gallery.id}`);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed?.id) {
            fetchGuestData(parsed.id, parsed.token);
          }
        }
      } catch (_) {}
    }

    return () => { isMounted = false; };
  }, [gallery, guestIdParam, tokenParam]);

  // Handle PIN Unlock Submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery) return;

    const requiredPin = isSelectionMode
      ? (gallery.admin_pin || gallery.pin_code)
      : (gallery.guest_pin || gallery.pin_code);

    if (!requiredPin || enteredPin.trim() === requiredPin.trim()) {
      setIsUnlocked(true);
      setPinError(false);
      setShowPinModal(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`unlocked_${gallery.id}`, 'true');
      }
      loadGalleryData();
    } else {
      setPinError(true);
    }
  };

  // 2. Handle 3D Face Scanner Submission
  const handleFaceScanSubmit = async (data: {
    name: string;
    phone: string;
    email: string;
    selfieBase64: string;
  }) => {
    if (!gallery) return;
    setIsMatching(true);
    setGuestName(data.name);
    setGuestPhone(data.phone);
    setGuestEmail(data.email);

    try {
      // 1. Register Guest in CRM (Uploads selfie to Backblaze B2 & saves 512-D embedding)
      try {
        const regRes = await fetch('/api/gallery/guest/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gallery_id: gallery.id,
            guest_name: data.name,
            guest_phone: data.phone,
            guest_email: data.email,
            selfieBase64: data.selfieBase64,
          }),
        });
        const regJson = await regRes.json();
        if (regJson?.isExistingGuest) {
          setIsAlreadyRegistered(true);
        } else {
          setIsAlreadyRegistered(false);
        }

        // Save session in localStorage so subsequent QR scans bypass login
        const savedId = regJson?.guest_id || regJson?.guest?.id;
        const savedTok = regJson?.access_token || regJson?.guest?.access_token;
        if (savedId) {
          try {
            const sessObj = { id: savedId, token: savedTok, name: data.name, phone: data.phone, email: data.email };
            localStorage.setItem(`studiocore_guest_${gallery.slug}`, JSON.stringify(sessObj));
            localStorage.setItem(`studiocore_guest_${gallery.id}`, JSON.stringify(sessObj));
            setGuestSavedSession({ id: savedId, token: savedTok, name: data.name });
          } catch (_) {}
        }
      } catch (regErr) {
        console.warn('Guest registration error:', regErr);
      }

      // If gallery is UNPUBLISHED, registration is complete! Show Thank You view
      if (currentGalleryStatus === 'UNPUBLISHED') {
        setIsFaceScannerOpen(false);
        setMatchedPhotos([]);
        setHasSearched(true);
        setIsVerified(true);
        return;
      }

      // 2. If PUBLISHED: Perform Neural Vector Match
      const res = await fetch('/api/gallery/match-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          galleryId: gallery.id,
          selfieBase64: data.selfieBase64,
          threshold: 0.48,
        }),
      });

      const json = await res.json();
      setIsFaceScannerOpen(false);

      if (json.success && Array.isArray(json.photos)) {
        setMatchedPhotos(json.photos);
        setHasSearched(true);
        setIsVerified(true);
      } else {
        setMatchedPhotos([]);
        setHasSearched(true);
        setIsVerified(true);
      }
    } catch (err: any) {
      console.error('Face matching error:', err);
      setIsFaceScannerOpen(false);
      setMatchedPhotos([]);
      setHasSearched(true);
      setIsVerified(true);
    } finally {
      setIsMatching(false);
    }
  };

  // Switch Guest / Register Someone Else
  const handleSwitchGuest = () => {
    try {
      if (gallery) {
        localStorage.removeItem(`studiocore_guest_${gallery.slug}`);
        localStorage.removeItem(`studiocore_guest_${gallery.id}`);
      }
    } catch (_) {}
    setGuestSavedSession(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setMatchedPhotos([]);
    setHasSearched(false);
    setIsVerified(false);
    setIsFaceScannerOpen(true);
  };

  // Re-sync new photos uploaded later by photographer
  const handleRefreshLivePhotos = async () => {
    if (!gallery) return;
    setIsSyncingLivePhotos(true);
    try {
      // 1. Re-fetch all event photos
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${gallery.id}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setFullPhotos(pJson.photos);
      }

      // 2. Re-fetch collections
      const cRes = await fetch(`/api/gallery/collections?gallery_id=${gallery.id}`);
      const cJson = await cRes.json();
      if (cJson.success && Array.isArray(cJson.collections)) {
        setCollections(cJson.collections);
      }

      // 3. Re-run face matching if guest is logged in
      const guestId = guestSavedSession?.id || guestIdParam;
      const guestTok = guestSavedSession?.token || tokenParam;
      if (guestId) {
        const gRes = await fetch(`/api/gallery/guest?id=${encodeURIComponent(guestId)}${guestTok ? `&token=${encodeURIComponent(guestTok)}` : ''}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.guest?.face_embedding) {
          const mRes = await fetch('/api/gallery/match-face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gallery_id: gallery.id,
              embedding: gJson.guest.face_embedding,
              threshold: 0.48,
            }),
          });
          const mJson = await mRes.json();
          if (mJson.success && Array.isArray(mJson.photos)) {
            setMatchedPhotos(mJson.photos);
          }
        }
      }
    } catch (err) {
      console.warn('Sync live photos notice:', err);
    } finally {
      setIsSyncingLivePhotos(false);
    }
  };

  // Download High-Res Original Photo
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    setDownloadingId(photo.id);
    try {
      const res = await fetch(
        `/api/gallery/download-url?key=${encodeURIComponent(photo.original_key || photo.preview_url)}&name=wedding_${photo.id}.jpg`
      );
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const link = document.createElement('a');
        link.href = json.downloadUrl;
        link.download = `wedding_photo_${photo.id.slice(0, 8)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(photo.preview_url, '_blank');
      }
    } catch (_) {
      window.open(photo.preview_url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  // Batch Download Matched Photos
  const handleDownloadAllMyPhotos = async () => {
    if (matchedPhotos.length === 0) return;
    setIsDownloadingAll(true);
    for (const photo of matchedPhotos) {
      await handleDownloadPhoto(photo);
      await new Promise((r) => setTimeout(r, 400));
    }
    setIsDownloadingAll(false);
  };

  const targetFullPhotos = useMemo(() => {
    return selectedCollectionId === 'all'
      ? fullPhotos
      : fullPhotos.filter((p) => p.collection_id === selectedCollectionId);
  }, [fullPhotos, selectedCollectionId]);

  const displayedPrivilegedPhotos = useMemo(() => {
    return targetFullPhotos.slice(0, visibleFullCount);
  }, [targetFullPhotos, visibleFullCount]);

  const hasMorePrivilegedPhotos = visibleFullCount < targetFullPhotos.length;

  // Compute Active Render List
  const displayedPhotos = isPrivilegedMode && isUnlocked
    ? displayedPrivilegedPhotos
    : matchedPhotos;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center space-y-4 p-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse shadow-md">
          <Camera className="w-8 h-8" />
        </div>
        <p className="text-sm font-black text-zinc-800 tracking-tight">Loading Wedding Gallery...</p>
        <span className="text-xs text-zinc-400">Powered by StudioCore AI</span>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-md">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-zinc-900">Gallery Not Found</h1>
        <p className="text-xs text-zinc-500 max-w-sm">{error || 'This gallery is currently inactive.'}</p>
      </div>
    );
  }

  if (currentGalleryStatus === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center text-center p-6 space-y-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-rose-500/20 animate-ping pointer-events-none" />
          <div className="relative w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-lg">
            <Lock className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-widest border border-rose-300">
            Access Concluded
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            This Wedding Gallery Has Expired
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            Public access to photos for <span className="font-bold text-zinc-800">{gallery.title}</span> has closed or reached its validity limit.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#E7E2D8] shadow-sm max-w-sm w-full space-y-3 text-center">
          <p className="text-xs text-zinc-600 leading-relaxed">
            If you are a family member, guest, or client needing to view or download photos, please contact the studio owner directly to request access.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition shadow-sm"
          >
            Return to StudioCore
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans pb-32 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          1. LUXURY WEDDING HERO HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative bg-zinc-950 text-white overflow-hidden">
        {gallery.cover_url ? (
          <img
            src={gallery.cover_url}
            alt={gallery.title}
            className="w-full h-80 sm:h-96 object-cover opacity-45 filter brightness-75 scale-105"
          />
        ) : (
          <div className="w-full h-80 sm:h-96 bg-gradient-to-b from-zinc-900 via-zinc-950 to-[#FAF9F5]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F5] via-black/50 to-black/80" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 max-w-6xl mx-auto">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-widest border border-amber-400/40 backdrop-blur-md">
                ✨ Official Wedding Gallery
              </span>
            </div>

            {/* PIN Unlock Button for Admin / Full Access */}
            {!isUnlocked && (
              <button
                onClick={() => setShowPinModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/20 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter PIN</span>
              </button>
            )}
          </div>

          {/* Hero Titles */}
          <div className="space-y-2 text-center sm:text-left max-w-2xl">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-400 text-xs font-serif italic">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white drop-shadow-md">
              {gallery.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 font-serif italic drop-shadow-xs">
              Moments captured forever. Find all your personal memories with AI Face Search.
            </p>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA: ZERO-KNOWLEDGE HERO OR MATCHED GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 relative z-10 space-y-8">
        
        {/* CASE A: STRICT ZERO-KNOWLEDGE LOCKED HERO (Before Face Search) */}
        {!isPrivilegedMode && !hasSearched && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-[#E7E2D8] shadow-xl text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-9 h-9 text-amber-600" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
                🔒 Privacy Protected
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                {currentGalleryStatus === 'UNPUBLISHED' ? 'Pre-Register for Event Photos' : 'Your Wedding Memories Await'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                {currentGalleryStatus === 'UNPUBLISHED'
                  ? 'Scan your selfie & register your contact details now. As soon as the photographers upload & publish the event photos, you will be notified instantly via WhatsApp and Email!'
                  : 'To respect guest privacy, photos are locked. Take a quick selfie, and our AI will instantly find and display all your photos on screen.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsFaceScannerOpen(true)}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-sm tracking-wide shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2.5 mx-auto transition-all active:scale-98 cursor-pointer group"
              >
                <Camera className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>{currentGalleryStatus === 'UNPUBLISHED' ? 'Register Selfie for Live Alerts' : 'Find My Photos (Scan Face)'}</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-4 text-[11px] text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Private
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Sub-Second AI Match
              </span>
            </div>
          </div>
        )}

        {/* CASE UNPUBLISHED: CELEBRATORY REGISTRATION CONFIRMATION */}
        {(!isPrivilegedMode && hasSearched && currentGalleryStatus === 'UNPUBLISHED') && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-emerald-200 shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            {/* Animated Celebration Avatar / Badge */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-300">
                {isAlreadyRegistered ? '✨ Already Registered' : '✨ Registration Successful'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                {isAlreadyRegistered ? `Welcome Back, ${guestName || 'Guest'}!` : `Thank You So Much for Registering${guestName ? `, ${guestName}` : ''}!`}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
                {isAlreadyRegistered
                  ? `You have already registered with this phone / email for ${gallery.title}. As soon as the photos are edited & published by the studio, you will be notified instantly!`
                  : `Your selfie and contact details are safely registered for ${gallery.title}. Our photography team is actively capturing and curating the unforgettable moments from this celebration.`}
              </p>
            </div>

            {/* Notification Alert Box */}
            <div className="bg-[#FAF9F5] rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Instant Notification Guaranteed</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                As soon as the photos are edited and published by the studio, you will receive an instant notification with your personal photo album directly on:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {guestPhone && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp: {guestPhone}</span>
                  </span>
                )}
                {guestEmail && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{guestEmail}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 3-Step Live Progress Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Step 1</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-zinc-900">Selfie Registered</div>
                <p className="text-[10px] text-zinc-500">Your biometric face index is secured</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1 animate-pulse">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Step 2</span>
                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                </div>
                <div className="text-xs font-bold text-zinc-900">Editing &amp; AI Matching</div>
                <p className="text-[10px] text-zinc-500">Photos being curated by studio team</p>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Step 3</span>
                  <Zap className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-xs font-bold text-zinc-700">Instant Delivery</div>
                <p className="text-[10px] text-zinc-500">Private album link sent to WhatsApp</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Page link copied! Keep this bookmarked to view photos once published.');
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Bookmark / Copy Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasSearched(false);
                  setIsFaceScannerOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 border border-[#E7E2D8] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Register Another Person</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE B: PUBLISHED GUEST VIEW (DUAL TAB: MY PHOTOS VS ALL EVENT PHOTOS) */}
        {(!isPrivilegedMode && hasSearched && currentGalleryStatus === 'PUBLISHED') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Control Bar: Dual Tabs, Guest Badge & Live Sync */}
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-[#E7E2D8] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-[#FAF9F5] border border-[#E7E2D8] rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setGuestActiveTab('my')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    guestActiveTab === 'my'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>My Photos ({matchedPhotos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuestActiveTab('all')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    guestActiveTab === 'all'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>All Event Photos ({fullPhotos.length})</span>
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                {guestName && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 text-xs font-bold text-amber-900 shadow-2xs">
                    <span>👤 {guestName}</span>
                    <button
                      type="button"
                      onClick={handleSwitchGuest}
                      className="text-[10px] text-amber-700 hover:text-amber-900 underline ml-1 cursor-pointer font-bold"
                      title="Switch guest or scan someone else"
                    >
                      (Switch)
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRefreshLivePhotos}
                  disabled={isSyncingLivePhotos}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 border border-[#E7E2D8] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Sync photos uploaded later by photographer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isSyncingLivePhotos ? 'animate-spin' : ''}`} />
                  <span>{isSyncingLivePhotos ? 'Syncing...' : 'Sync Photos'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: MY PHOTOS VIEW */}
            {guestActiveTab === 'my' && (
              <div className="space-y-6">
                {matchedPhotos.length > 0 ? (
                  <>
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                            ✓ Face Verified
                          </span>
                          <span className="text-xs font-bold text-zinc-500">
                            {guestName || 'Guest'}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                          🎉 Found {matchedPhotos.length} photos of you!
                        </h2>
                        <p className="text-xs text-zinc-500">
                          Out of {fullPhotos.length} celebration photos in {gallery.title}.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadAllMyPhotos}
                          disabled={isDownloadingAll}
                          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-amber-400" />
                          <span>{isDownloadingAll ? 'Downloading...' : 'Download All My Photos'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFaceScannerOpen(true)}
                          className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 border border-[#E7E2D8] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Rescan Selfie</span>
                        </button>
                      </div>
                    </div>

                    {/* Matched Justified Multi-Column Grid */}
                    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5 space-y-3.5">
                      {matchedPhotos.map((photo, idx) => (
                        <div
                          key={photo.id}
                          onClick={() => setSelectedPhotoIndex(idx)}
                          className="group relative break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 border border-[#E7E2D8] shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                        >
                          <ProgressiveSmoothImage
                            src={photo.preview_url || photo.thumbnail_url}
                            thumbnailSrc={photo.thumbnail_url}
                            alt="Matched Photo"
                            aspectRatio={photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined}
                            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Actions Bottom Bar */}
                          <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-mono text-zinc-300">
                              Photo #{idx + 1}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPhoto(photo);
                              }}
                              className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-md cursor-pointer"
                              title="Download High-Res"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E7E2D8] shadow-sm text-center space-y-5 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                      <Camera className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-zinc-900">
                        No Matching Photos Found Yet
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        We scanned all {fullPhotos.length} celebration photos and couldn&apos;t detect a clear match for your selfie yet. You can browse all event photos or re-scan with better lighting.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setGuestActiveTab('all')}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>Browse All {fullPhotos.length} Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFaceScannerOpen(true)}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 border border-[#E7E2D8] font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Re-scan Selfie</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALL EVENT PHOTOS VIEW */}
            {guestActiveTab === 'all' && (
              <div className="space-y-6">
                {/* Collections Capsule Filters */}
                {collections.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCollectionId('all')}
                      className={`px-4 py-2 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
                        selectedCollectionId === 'all'
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-white text-zinc-600 border border-[#E7E2D8] hover:bg-zinc-50'
                      }`}
                    >
                      All Celebration Photos ({fullPhotos.length})
                    </button>
                    {collections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedCollectionId(col.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
                          selectedCollectionId === col.id
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'bg-white text-zinc-600 border border-[#E7E2D8] hover:bg-zinc-50'
                        }`}
                      >
                        {col.name} ({col.photo_count ?? fullPhotos.filter((p) => p.collection_id === col.id).length})
                      </button>
                    ))}
                  </div>
                )}

                {/* All Photos Grid */}
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5 space-y-3.5">
                  {targetFullPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className="group relative break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 border border-[#E7E2D8] shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      <ProgressiveSmoothImage
                        src={photo.preview_url || photo.thumbnail_url}
                        thumbnailSrc={photo.thumbnail_url}
                        alt="Event Photo"
                        aspectRatio={photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined}
                        className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-mono text-zinc-300">
                          #{idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(photo);
                          }}
                          className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-md cursor-pointer"
                          title="Download High-Res"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE C: PRIVILEGED MODE (Full Access or Album Selection) */}
        {isPrivilegedMode && isUnlocked && (
          <div className="space-y-6">
            
            {/* Collection Tabs */}
            {collections.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCollectionId('all')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
                    selectedCollectionId === 'all'
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-white text-zinc-600 border border-[#E7E2D8] hover:bg-zinc-50'
                  }`}
                >
                  All Photos ({fullPhotos.length})
                </button>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition shrink-0 cursor-pointer ${
                      selectedCollectionId === col.id
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-white text-zinc-600 border border-[#E7E2D8] hover:bg-zinc-50'
                    }`}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}

            {/* Privileged Full Photo Justified Multi-Column Grid */}
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5 space-y-3.5">
              {displayedPhotos.map((photo, idx) => {
                const isSelected = selectedForAlbum.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        const next = new Set(selectedForAlbum);
                        if (isSelected) next.delete(photo.id);
                        else next.add(photo.id);
                        setSelectedForAlbum(next);
                      } else {
                        setSelectedPhotoIndex(idx);
                      }
                    }}
                    className={`group relative break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-4 ring-amber-500/20'
                        : 'border-[#E7E2D8] hover:shadow-lg'
                    }`}
                  >
                    <ProgressiveSmoothImage
                      src={photo.preview_url || photo.thumbnail_url}
                      thumbnailSrc={photo.thumbnail_url}
                      alt="Wedding photo"
                      aspectRatio={photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined}
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />

                    {isSelectionMode && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-black/40 text-white/80 flex items-center justify-center backdrop-blur-xs">
                            <Square className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.face_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                          👥 {photo.face_count}
                        </span>
                      ) : <span />}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPhoto(photo);
                        }}
                        className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-md cursor-pointer"
                        title="Download High-Res"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMorePrivilegedPhotos && (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-zinc-500 font-medium">
                  Showing {displayedPrivilegedPhotos.length} of {targetFullPhotos.length} photos
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleFullCount((prev) => Math.min(prev + 50, targetFullPhotos.length))}
                  className="px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-sm transition active:scale-98 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Next 50 Photos</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. 3D BIOMETRIC FACE SCANNER MODAL
      ───────────────────────────────────────────────────────────── */}
      <FaceScannerModal
        isOpen={isFaceScannerOpen}
        onClose={() => setIsFaceScannerOpen(false)}
        onSubmit={handleFaceScanSubmit}
        galleryId={gallery.id}
        onScanComplete={(photos) => {
          setMatchedPhotos(photos);
          setHasSearched(true);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          5. PIN UNLOCK MODAL (Zero-Trust Gatekeeper)
      ───────────────────────────────────────────────────────────── */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-zinc-200 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-zinc-900">Protected Gallery</h3>
              <p className="text-xs text-zinc-500">
                {isSelectionMode
                  ? 'Enter the Client PIN to access the Album Selection Portal.'
                  : 'Enter the Guest PIN to view the full wedding album.'}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="Enter 4 or 6-digit PIN"
                className="w-full text-center text-xl tracking-widest font-mono py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-bold"
                autoFocus
              />

              {pinError && (
                <p className="text-[11px] font-bold text-rose-600 text-center">
                  Invalid PIN code. Please check and try again.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-2xl transition shadow-md cursor-pointer"
              >
                Unlock Gallery
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. PREMAGIC / FOTOOWL TOUCH-SWIPE LIGHTBOX WITH SMART HD ZOOM
      ───────────────────────────────────────────────────────────── */}
      {selectedPhotoIndex !== null && displayedPhotos[selectedPhotoIndex] && (
        <PremagicLightbox
          photos={displayedPhotos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onNavigate={(idx) => setSelectedPhotoIndex(idx)}
          onDownload={handleDownloadPhoto as any}
          allowDownloads={gallery.allow_downloads ?? true}
        />
      )}

    </div>
  );
}

export default function StrictGuestGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center space-y-4 p-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <p className="text-sm font-black text-zinc-800 tracking-tight">Loading Wedding Gallery...</p>
          <span className="text-xs text-zinc-400">Powered by StudioCore AI</span>
        </div>
      }
    >
      <StrictZeroKnowledgeGuestContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Camera,
  Sparkles,
  Download,
  Lock,
  Unlock,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  CheckCircle2,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Crown,
  Copy,
  Check,
  QrCode,
  User,
  Users,
  Phone,
  Mail,
  Smartphone,
  ShieldCheck,
  Calendar,
  KeyRound,
  RefreshCw,
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
  is_face_ai_enabled?: boolean;
  status?: string;
  studio_slug?: string;
}

interface CoverPositioning {
  url: string;
  desktop: { x: number; y: number; zoom: number };
  mobile: { x: number; y: number; zoom: number };
}

function parseCoverUrl(coverUrl: string | null | undefined): CoverPositioning {
  if (!coverUrl) {
    return {
      url: '',
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const hashIdx = coverUrl.indexOf('#');
  if (hashIdx === -1) {
    return {
      url: coverUrl,
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const cleanUrl = coverUrl.substring(0, hashIdx);
  const hash = coverUrl.substring(hashIdx + 1);
  const params = new URLSearchParams(hash);

  return {
    url: cleanUrl,
    desktop: {
      x: Number(params.get('dx')) || 50,
      y: Number(params.get('dy')) || 50,
      zoom: Number(params.get('dz')) || 100,
    },
    mobile: {
      x: Number(params.get('mx')) || 50,
      y: Number(params.get('my')) || 50,
      zoom: Number(params.get('mz')) || 100,
    },
  };
}

function GuestSlugGalleryContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params?.slug as string;

  // Search parameters for access modes
  const isFullAccess = searchParams?.get('access') === 'all' || searchParams?.get('access') === 'full';
  const isSelectionMode = searchParams?.get('album_selection') === 'true';
  const maxLimitParam = searchParams?.get('max_limit');
  const maxSelectionLimit = maxLimitParam ? parseInt(maxLimitParam, 10) : null;
  const isVipMode = searchParams?.get('vip-link') === '1';
  const passKeyParam = searchParams?.get('pass_key');
  const shareKeyParam = searchParams?.get('share_key');
  const isNoPinParam = searchParams?.get('no_pin') === '1' || searchParams?.get('no_pin') === 'true';

  const isPrivilegedMode = isFullAccess || isSelectionMode || isVipMode;

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [fullPhotos, setFullPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection Filter State
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectorName, setSelectorName] = useState('');
  const [selectorEmail, setSelectorEmail] = useState('');
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [isSyncingSelection, setIsSyncingSelection] = useState(false);

  // PIN / PassKey State for Privileged Access
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [openFaceScannerAfterPin, setOpenFaceScannerAfterPin] = useState(false);

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
    : (gallery?.status?.toUpperCase() === 'PUBLISHED')
    ? 'PUBLISHED'
    : 'UNPUBLISHED';

  // 1. Fetch Gallery Data
  const loadGalleryData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      let gal: any = null;
      try {
        const slugRes = await fetch(`/api/gallery/events?slug=${slug}`);
        const slugJson = await slugRes.json();
        if (slugJson.success && slugJson.gallery) {
          gal = slugJson.gallery;
        }
      } catch (_) {}

      if (!gal) {
        const gRes = await fetch(`/api/gallery/events?id=${slug}`);
        const gJson = await gRes.json();
        if (gJson.success && gJson.gallery) {
          gal = gJson.gallery;
        }
      }

      if (!gal) {
        setError('This wedding gallery was not found or is currently inactive.');
        setLoading(false);
        return;
      }

      setGallery(gal);

      // Check unlock permissions
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

      // Fetch full collections & photos in parallel if in PRIVILEGED mode OR gallery is PUBLISHED
      const isGalleryPublished = gal.status?.toUpperCase() === 'PUBLISHED' || (gal.is_active && gal.status?.toUpperCase() !== 'UNPUBLISHED');
      if (isGalleryPublished || (isPrivilegedMode && hasValidPin)) {
        try {
          const [cRes, pRes] = await Promise.all([
            fetch(`/api/gallery/collections?gallery_id=${gal.id}`),
            fetch(`/api/gallery/photos?gallery_id=${gal.id}`),
          ]);
          const [cJson, pJson] = await Promise.all([cRes.json(), pRes.json()]);

          if (cJson.success && Array.isArray(cJson.collections)) {
            setCollections(cJson.collections);
          }
          if (pJson.success && Array.isArray(pJson.photos)) {
            setFullPhotos(pJson.photos);
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Error loading gallery:', err);
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [slug, isSelectionMode, passKeyParam, shareKeyParam, isVipMode, isPrivilegedMode]);

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
          localStorage.setItem(`studiocore_guest_${slug}`, JSON.stringify(sessObj));
          localStorage.setItem(`studiocore_guest_${gallery.id}`, JSON.stringify(sessObj));
        } catch (_) {}

        const status = gallery.status?.toUpperCase() || (gallery.is_active ? 'PUBLISHED' : 'UNPUBLISHED');

        // Safely parse face embedding (array or string)
        const rawEmb = Array.isArray(g.face_embedding)
          ? g.face_embedding
          : (typeof g.face_embedding === 'string' ? JSON.parse(g.face_embedding) : null);

        // 1. Instant Render: Load existing pre-matched photos in milliseconds
        if (Array.isArray(g.matched_photo_ids) && g.matched_photo_ids.length > 0) {
          try {
            const preRes = await fetch(`/api/gallery/photos?gallery_id=${gallery.id}&ids=${g.matched_photo_ids.join(',')}`);
            const preJson = await preRes.json();
            if (isMounted && preJson.success && Array.isArray(preJson.photos) && preJson.photos.length > 0) {
              setMatchedPhotos(preJson.photos);
            }
          } catch (_) {}
        }

        // 2. If gallery is PUBLISHED, background-match to discover any photos newly uploaded since registration
        if (status === 'PUBLISHED' && rawEmb && rawEmb.length === 512) {
          setIsMatching(true);
          try {
            const matchRes = await fetch('/api/gallery/match-face', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gallery_id: gallery.id,
                embedding: rawEmb,
                threshold: 0.48,
              }),
            });
            const matchJson = await matchRes.json();
            if (isMounted && matchJson.success && Array.isArray(matchJson.photos) && matchJson.photos.length > 0) {
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
        const rawLocal = localStorage.getItem(`studiocore_guest_${slug}`) || localStorage.getItem(`studiocore_guest_${gallery.id}`);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed?.id) {
            fetchGuestData(parsed.id, parsed.token);
          }
        }
      } catch (_) {}
    }

    return () => { isMounted = false; };
  }, [gallery, guestIdParam, tokenParam, slug]);

  // Handle PIN Unlock
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

      if (openFaceScannerAfterPin) {
        setOpenFaceScannerAfterPin(false);
        if (gallery.is_face_ai_enabled === false) {
          setHasSearched(true);
        } else {
          setIsFaceScannerOpen(true);
        }
      }
    } else {
      setPinError(true);
    }
  };

  // Find My Photo Trigger: Checks PIN requirement first
  const handleFindMyPhotoClick = () => {
    if (!gallery) return;

    const isGuestPinDisabled =
      !isSelectionMode &&
      !isFullAccess &&
      (isNoPinParam ||
        gallery.raw_payload?.guest_pin_enabled === false ||
        gallery.raw_payload?.guest_ask_pin === false);

    const requiredPin = isSelectionMode
      ? (gallery.admin_pin || gallery.pin_code)
      : (isGuestPinDisabled ? null : (gallery.guest_pin || gallery.pin_code));

    const isPinActive = Boolean(requiredPin && requiredPin.trim().length > 0);

    if (isPinActive && !isUnlocked) {
      setOpenFaceScannerAfterPin(true);
      setShowPinModal(true);
    } else {
      if (gallery.is_face_ai_enabled === false) {
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`unlocked_${gallery.id}`, 'true');
        }
        setHasSearched(true);
        loadGalleryData();
      } else {
        setIsFaceScannerOpen(true);
      }
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
            localStorage.setItem(`studiocore_guest_${slug}`, JSON.stringify(sessObj));
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

      // 2. If PUBLISHED: Neural ArcFace Vector Match
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
      localStorage.removeItem(`studiocore_guest_${slug}`);
      if (gallery) localStorage.removeItem(`studiocore_guest_${gallery.id}`);
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

  // Download High-Res Photo
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

  // Batch Download All Matched Photos
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
  const infiniteGuestSentinelRef = useRef<HTMLDivElement>(null);

  // Automatic Infinite Scroll for Guest Portal
  useEffect(() => {
    if (!hasMorePrivilegedPhotos) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleFullCount((prev) => Math.min(prev + 50, targetFullPhotos.length));
        }
      },
      { rootMargin: '400px' }
    );

    const el = infiniteGuestSentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMorePrivilegedPhotos, targetFullPhotos.length]);

  // Load selector identity and sync from backend for cross-device persistence
  useEffect(() => {
    if (!gallery?.id || !isSelectionMode) return;
    try {
      const stored = localStorage.getItem(`studiocore_selector_${gallery.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) {
          setSelectorName(parsed.name || '');
          setSelectorEmail(parsed.email);
          // Load selections from database
          fetch(`/api/gallery/selections?gallery_id=${gallery.id}&email=${encodeURIComponent(parsed.email)}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.success && Array.isArray(res.selected_photo_ids)) {
                setSelectedForAlbum(new Set(res.selected_photo_ids));
              }
            })
            .catch(() => {});
          return;
        }
      }
      if (isUnlocked) {
        setShowSelectorModal(true);
      }
    } catch (_) {}
  }, [gallery?.id, isSelectionMode, isUnlocked]);

  // Sync selections to backend
  const syncSelectionToBackend = useCallback(async (newSelection: Set<string>, name: string, email: string) => {
    if (!gallery?.id || !email) return;
    setIsSyncingSelection(true);
    try {
      await fetch('/api/gallery/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          client_name: name || 'Guest',
          client_email: email,
          selected_photo_ids: Array.from(newSelection),
          max_limit: maxSelectionLimit,
        }),
      });
    } catch (_) {} finally {
      setIsSyncingSelection(false);
    }
  }, [gallery?.id, maxSelectionLimit]);

  const handleSelectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectorEmail || !selectorEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    const cleanName = selectorName.trim() || 'Guest';
    const cleanEmail = selectorEmail.trim().toLowerCase();

    try {
      localStorage.setItem(`studiocore_selector_${gallery?.id}`, JSON.stringify({ name: cleanName, email: cleanEmail }));
    } catch (_) {}

    setShowSelectorModal(false);

    // Fetch existing selections for this email
    if (gallery?.id) {
      setIsSyncingSelection(true);
      try {
        const res = await fetch(`/api/gallery/selections?gallery_id=${gallery.id}&email=${encodeURIComponent(cleanEmail)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.selected_photo_ids)) {
          setSelectedForAlbum(new Set(json.selected_photo_ids));
        }
      } catch (_) {} finally {
        setIsSyncingSelection(false);
      }
    }
  };

  const handleSwitchSelector = () => {
    setShowSelectorModal(true);
  };

  // LocalStorage persistence for Album Selection Mode
  useEffect(() => {
    if (!gallery?.id || !isSelectionMode) return;
    try {
      const saved = localStorage.getItem(`studiocore_album_selection_${gallery.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedForAlbum(new Set(parsed));
        }
      }
    } catch (_) {}
  }, [gallery?.id, isSelectionMode]);

  useEffect(() => {
    if (!gallery?.id || !isSelectionMode) return;
    try {
      localStorage.setItem(`studiocore_album_selection_${gallery.id}`, JSON.stringify(Array.from(selectedForAlbum)));
    } catch (_) {}
  }, [selectedForAlbum, gallery?.id, isSelectionMode]);

  // Real-time debounced auto-sync to backend (guaranteed persistence across devices/tabs)
  useEffect(() => {
    if (!gallery?.id || !isSelectionMode) return;
    const effectiveEmail = selectorEmail || guestSavedSession?.email || (gallery as any)?.client_email || 'guest@gallery.local';
    const effectiveName = selectorName || guestSavedSession?.name || 'Guest Client';

    const timer = setTimeout(() => {
      syncSelectionToBackend(selectedForAlbum, effectiveName, effectiveEmail);
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedForAlbum, gallery?.id, isSelectionMode, selectorEmail, selectorName, guestSavedSession, syncSelectionToBackend]);

  const displayedPhotos = useMemo(() => {
    let list = isPrivilegedMode && isUnlocked
      ? displayedPrivilegedPhotos
      : matchedPhotos;

    if (isSelectionMode && showOnlySelected) {
      list = (isPrivilegedMode && isUnlocked ? targetFullPhotos : matchedPhotos).filter((p) =>
        selectedForAlbum.has(p.id)
      );
    }
    return list;
  }, [isPrivilegedMode, isUnlocked, displayedPrivilegedPhotos, matchedPhotos, isSelectionMode, showOnlySelected, targetFullPhotos, selectedForAlbum]);

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
      
      {/* 1. LUXURY WEDDING HERO */}
      <div className="relative bg-zinc-950 text-white overflow-hidden">
        {gallery.cover_url ? (
          <>
            {/* Desktop Hero Cover */}
            <img
              src={parseCoverUrl(gallery.cover_url).url || gallery.cover_url}
              alt={gallery.title}
              style={{
                objectPosition: `${parseCoverUrl(gallery.cover_url).desktop.x}% ${parseCoverUrl(gallery.cover_url).desktop.y}%`,
                transform: `scale(${parseCoverUrl(gallery.cover_url).desktop.zoom / 100})`,
                transformOrigin: `${parseCoverUrl(gallery.cover_url).desktop.x}% ${parseCoverUrl(gallery.cover_url).desktop.y}%`,
              }}
              className="hidden sm:block w-full h-80 sm:h-96 object-cover transition-all duration-300"
            />
            {/* Mobile Hero Cover */}
            <img
              src={parseCoverUrl(gallery.cover_url).url || gallery.cover_url}
              alt={gallery.title}
              style={{
                objectPosition: `${parseCoverUrl(gallery.cover_url).mobile.x}% ${parseCoverUrl(gallery.cover_url).mobile.y}%`,
                transform: `scale(${parseCoverUrl(gallery.cover_url).mobile.zoom / 100})`,
                transformOrigin: 'center center',
              }}
              className="block sm:hidden w-full h-80 sm:h-96 object-cover transition-all duration-300"
            />
          </>
        ) : (
          <div className="w-full h-80 sm:h-96 bg-gradient-to-b from-zinc-900 via-zinc-950 to-[#FAF9F5]" />
        )}

        {/* Clean Luxury Gradient: Crystal clear faces with subtle bottom shade for couple name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 max-w-6xl mx-auto">
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

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 relative z-10 space-y-8">
        
        {/* CASE A: STRICT ZERO-KNOWLEDGE LOCKED HERO (Before Face Search) */}
        {!isPrivilegedMode && !hasSearched && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-[#E7E2D8] shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-9 h-9 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                {gallery.is_face_ai_enabled === false
                  ? 'Explore Event Gallery'
                  : 'Register to get your photos on your mobile'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                {gallery.is_face_ai_enabled === false
                  ? 'Access and view all high-resolution memories captured during this event.'
                  : 'Complete your registration by capturing a selfie to secure access your photos from this event.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFindMyPhotoClick}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-sm tracking-wide shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2.5 mx-auto transition-all active:scale-98 cursor-pointer group"
              >
                <Camera className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>{gallery.is_face_ai_enabled === false ? 'View Event Photos' : 'Find My Photo'}</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </button>
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
                {isAlreadyRegistered ? `Welcome Back, ${guestName || 'Guest'}!` : 'Your registration successfully'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed font-medium">
                {isAlreadyRegistered
                  ? `You have already registered with this phone / email for ${gallery.title}. As soon as the photos are edited & published by the studio, you will be notified instantly!`
                  : 'We will notify you when your photos are ready'}
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
                  setIsAlreadyRegistered(false);
                  setGuestName('');
                  setGuestPhone('');
                  setGuestEmail('');
                  setIsFaceScannerOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-600/20 active:scale-98"
              >
                <Users className="w-4 h-4 text-amber-200" />
                <span>Click here to new registration</span>
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

        {/* CASE C: PRIVILEGED FULL ACCESS */}
        {isPrivilegedMode && isUnlocked && (
          <div className="space-y-6">
            {/* Album Selection Sticky Banner */}
            {isSelectionMode && (
              <div className="sticky top-4 z-40 bg-zinc-950/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-400">Album Selection Mode</span>
                      {maxSelectionLimit && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                          Limit: {maxSelectionLimit}
                        </span>
                      )}
                      {isSyncingSelection ? (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Synced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                      <span>
                        Selected <strong className="text-white text-sm font-black">{selectedForAlbum.size}</strong>
                        {maxSelectionLimit ? ` / ${maxSelectionLimit}` : ''} photos
                      </span>
                      {selectorEmail && (
                        <span className="text-zinc-500">
                          • for <strong className="text-zinc-300">{selectorName || selectorEmail}</strong>
                          <button
                            type="button"
                            onClick={handleSwitchSelector}
                            className="text-amber-400 hover:text-amber-300 underline ml-1.5 cursor-pointer font-bold"
                          >
                            (Switch User)
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      showOnlySelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{showOnlySelected ? 'Show All Photos' : `View Selected (${selectedForAlbum.size})`}</span>
                  </button>

                  {selectedForAlbum.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all your photo selections?')) {
                          const next = new Set<string>();
                          setSelectedForAlbum(next);
                          syncSelectionToBackend(next, selectorName, selectorEmail);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {isSelectionMode && showOnlySelected && displayedPhotos.length === 0 && (
              <div className="bg-white rounded-3xl p-8 border border-[#E7E2D8] text-center space-y-3">
                <CheckSquare className="w-8 h-8 text-purple-600 mx-auto" />
                <h3 className="text-base font-black text-zinc-900">No Photos Selected Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Click on any photo in the gallery to mark it for your album selection.
                </p>
                <button
                  type="button"
                  onClick={() => setShowOnlySelected(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition"
                >
                  Browse All Photos
                </button>
              </div>
            )}

            {collections.length > 0 && !showOnlySelected && (
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
                        if (!selectorEmail) {
                          setShowSelectorModal(true);
                          return;
                        }
                        const next = new Set(selectedForAlbum);
                        if (isSelected) {
                          next.delete(photo.id);
                          setSelectedForAlbum(next);
                          syncSelectionToBackend(next, selectorName, selectorEmail);
                        } else {
                          if (maxSelectionLimit && next.size >= maxSelectionLimit) {
                            alert(`You can select up to a maximum of ${maxSelectionLimit} photos.`);
                            return;
                          }
                          next.add(photo.id);
                          setSelectedForAlbum(next);
                          syncSelectionToBackend(next, selectorName, selectorEmail);
                        }
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

            {/* Automatic Infinite Scroll Sentinel */}
            {hasMorePrivilegedPhotos && (
              <div ref={infiniteGuestSentinelRef} className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 shadow-2xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>Loading more photos... ({displayedPrivilegedPhotos.length} of {targetFullPhotos.length})</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. SMART 3D FACE GUIDANCE SCANNER */}
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

      {/* 4. PIN UNLOCK MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-zinc-200 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-zinc-900">Enter Access PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setOpenFaceScannerAfterPin(false);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={8}
                placeholder="PIN Code"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className="w-full text-center py-3 bg-[#FAF9F5] border border-zinc-200 rounded-2xl text-lg font-mono font-black tracking-widest focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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

      {/* 5. CLIENT SELECTION IDENTITY MODAL (NAME & EMAIL) */}
      {showSelectorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-zinc-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-black text-zinc-900">Album Photo Selection</h3>
              </div>
              {selectorEmail && (
                <button
                  type="button"
                  onClick={() => setShowSelectorModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Enter your details to select photos for the album. Your selections will automatically sync across your phone and laptop!
              </p>
            </div>

            <form onSubmit={handleSelectorSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={selectorName}
                  onChange={(e) => setSelectorName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                  Your Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={selectorEmail}
                  onChange={(e) => setSelectorEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF9F5] border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Log in with this email on any device to continue your selections.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Start Selecting Photos
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. PREMAGIC / FOTOOWL TOUCH-SWIPE LIGHTBOX WITH SMART HD ZOOM */}
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

export default function GuestSlugGalleryPage() {
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
      <GuestSlugGalleryContent />
    </Suspense>
  );
}

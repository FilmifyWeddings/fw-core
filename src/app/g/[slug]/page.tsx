'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { parseCoverUrl } from '@/lib/gallery-cover-utils';
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
  Cloud,
  Send,
  AlertCircle,
  ArrowDown,
} from 'lucide-react';

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  );
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}
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
  pass_key?: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
  is_active?: boolean;
  is_face_ai_enabled?: boolean;
  status?: string;
  studio_slug?: string;
  couple_slug?: string;
  unique_code?: string;
  max_selection_limit?: number;
  studio_branding?: {
    studio_name: string;
    studio_slug: string;
    logo_url: string | null;
    tagline: string;
    instagram_handle: string;
    facebook_handle: string;
    youtube_handle: string;
    phone: string;
    email: string;
  };
  raw_payload?: any;
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
  const [isSelectionSubmitted, setIsSelectionSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

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
      const codeFromSearch = searchParams?.get('code');
      const coupleFromSearch = searchParams?.get('couple');

      try {
        const queryUrl = `/api/gallery/events?slug=${encodeURIComponent(slug)}${codeFromSearch ? `&code=${encodeURIComponent(codeFromSearch)}` : ''}${coupleFromSearch ? `&couple=${encodeURIComponent(coupleFromSearch)}` : ''}`;
        const slugRes = await fetch(queryUrl);
        const slugJson = await slugRes.json();
        if (slugJson.success && slugJson.gallery) {
          gal = slugJson.gallery;
        }
      } catch (_) {}

      if (!gal && codeFromSearch) {
        try {
          const cRes = await fetch(`/api/gallery/events?code=${encodeURIComponent(codeFromSearch)}`);
          const cJson = await cRes.json();
          if (cJson.success && cJson.gallery) {
            gal = cJson.gallery;
          }
        } catch (_) {}
      }

      if (!gal) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUuid) {
          const gRes = await fetch(`/api/gallery/events?id=${slug}`);
          const gJson = await gRes.json();
          if (gJson.success && gJson.gallery) {
            gal = gJson.gallery;
          }
        }
      }

      if (!gal) {
        setError('This wedding gallery was not found or is currently inactive.');
        setLoading(false);
        return;
      }

      setGallery(gal);

      // Check unlock permissions
      const isPrivileged = isFullAccess || isSelectionMode;
      const isGuestPinEnabled = gal.raw_payload?.guest_pin_enabled !== undefined
        ? Boolean(gal.raw_payload.guest_pin_enabled)
        : (gal.raw_payload?.guest_ask_pin !== undefined ? Boolean(gal.raw_payload.guest_ask_pin) : true);

      const resolvedPrivilegedPin = (
        gal.pass_key ||
        gal.raw_payload?.pass_key ||
        gal.admin_pin ||
        gal.pin_code ||
        '518399'
      ).toString().trim();

      const resolvedGuestPin = isGuestPinEnabled
        ? (gal.guest_pin || gal.raw_payload?.guest_pin || gal.pin_code || '700680').toString().trim()
        : null;

      const requiredPin = isPrivileged ? resolvedPrivilegedPin : resolvedGuestPin;
      const passedKey = isPrivileged ? passKeyParam : shareKeyParam;

      const modeKey = isSelectionMode ? 'selection' : (isFullAccess ? 'full' : 'guest');
      const sessionKey = `studiocore_unlocked_${modeKey}_${gal.id}`;
      const isSessionUnlocked = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === requiredPin;
      const isUrlKeyUnlocked = Boolean(passedKey && requiredPin && passedKey.trim() === requiredPin);

      const hasValidPin = isVipMode || !requiredPin || isUrlKeyUnlocked || isSessionUnlocked;

      if (hasValidPin) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
        if (isPrivilegedMode) {
          setShowPinModal(true);
        }
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
  }, [slug, isSelectionMode, isFullAccess, passKeyParam, shareKeyParam, isVipMode, isPrivilegedMode]);

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

    const isPrivileged = isFullAccess || isSelectionMode;
    const isGuestPinEnabled = gallery.raw_payload?.guest_pin_enabled !== undefined
      ? Boolean(gallery.raw_payload.guest_pin_enabled)
      : (gallery.raw_payload?.guest_ask_pin !== undefined ? Boolean(gallery.raw_payload.guest_ask_pin) : true);

    const resolvedPrivilegedPin = (
      gallery.pass_key ||
      gallery.raw_payload?.pass_key ||
      gallery.admin_pin ||
      gallery.pin_code ||
      '518399'
    ).toString().trim();

    const resolvedGuestPin = isGuestPinEnabled
      ? (gallery.guest_pin || gallery.raw_payload?.guest_pin || gallery.pin_code || '700680').toString().trim()
      : null;

    const requiredPin = isPrivileged ? resolvedPrivilegedPin : resolvedGuestPin;
    const modeKey = isSelectionMode ? 'selection' : (isFullAccess ? 'full' : 'guest');
    const sessionKey = `studiocore_unlocked_${modeKey}_${gallery.id}`;

    if (!requiredPin || enteredPin.trim() === requiredPin) {
      setIsUnlocked(true);
      setPinError(false);
      setShowPinModal(false);
      if (typeof window !== 'undefined' && requiredPin) {
        sessionStorage.setItem(sessionKey, requiredPin);
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

    const isGuestPinEnabled = gallery.raw_payload?.guest_pin_enabled !== undefined
      ? Boolean(gallery.raw_payload.guest_pin_enabled)
      : (gallery.raw_payload?.guest_ask_pin !== undefined ? Boolean(gallery.raw_payload.guest_ask_pin) : true);

    const resolvedGuestPin = isGuestPinEnabled
      ? (gallery.guest_pin || gallery.raw_payload?.guest_pin || gallery.pin_code || '700680').toString().trim()
      : null;

    const modeKey = 'guest';
    const sessionKey = `studiocore_unlocked_${modeKey}_${gallery.id}`;
    const isSessionUnlocked = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === resolvedGuestPin;

    if (resolvedGuestPin && !isUnlocked && !isSessionUnlocked) {
      setOpenFaceScannerAfterPin(true);
      setShowPinModal(true);
    } else {
      setIsFaceScannerOpen(true);
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

  const effectiveMaxSelectionLimit = (gallery?.max_selection_limit && gallery.max_selection_limit > 0)
    ? gallery.max_selection_limit
    : (maxSelectionLimit || 50);

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
              if (res.success) {
                if (Array.isArray(res.selected_photo_ids)) {
                  setSelectedForAlbum(new Set(res.selected_photo_ids));
                }
                if (res.is_submitted) {
                  setIsSelectionSubmitted(true);
                  setSubmittedAt(res.submitted_at || null);
                } else {
                  setIsSelectionSubmitted(false);
                  setSubmittedAt(null);
                }
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
    if (!gallery?.id || !email || isSelectionSubmitted) return;
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
          max_limit: effectiveMaxSelectionLimit,
        }),
      });
    } catch (_) {} finally {
      setIsSyncingSelection(false);
    }
  }, [gallery?.id, isSelectionSubmitted, effectiveMaxSelectionLimit]);

  const handleSubmitSelection = async () => {
    if (!gallery?.id) return;
    const effectiveEmail = selectorEmail || guestSavedSession?.email || (gallery as any)?.client_email || 'guest@gallery.local';
    const effectiveName = selectorName || guestSavedSession?.name || 'Guest Client';

    if (selectedForAlbum.size === 0) {
      alert('Please select at least 1 photo for your album before submitting.');
      return;
    }

    setIsSubmittingSelection(true);
    try {
      const res = await fetch('/api/gallery/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          client_name: effectiveName,
          client_email: effectiveEmail,
          selected_photo_ids: Array.from(selectedForAlbum),
          is_submitted: true,
          submitted_at: new Date().toISOString(),
          max_limit: effectiveMaxSelectionLimit,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsSelectionSubmitted(true);
        setSubmittedAt(new Date().toISOString());
        setShowSubmitConfirmModal(false);
        setShowOnlySelected(true);
      } else {
        alert(json.error || 'Failed to submit selection. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting selections:', err);
      alert('Failed to submit selections. Please check your internet connection.');
    } finally {
      setIsSubmittingSelection(false);
    }
  };

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
        if (json.success) {
          if (Array.isArray(json.selected_photo_ids)) {
            setSelectedForAlbum(new Set(json.selected_photo_ids));
          }
          if (json.is_submitted) {
            setIsSelectionSubmitted(true);
            setSubmittedAt(json.submitted_at || null);
          } else {
            setIsSelectionSubmitted(false);
            setSubmittedAt(null);
          }
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

  const studioBranding = gallery.studio_branding;
  const studioName = studioBranding?.studio_name || 'Wedding Studio';
  const studioLogo = studioBranding?.logo_url;
  const studioTagline = studioBranding?.tagline || 'Fine Art Wedding Photography & Films';
  const studioSubtitle = studioBranding?.subtitle || studioBranding?.studio_subtitle || studioBranding?.tagline || 'Fine Art Wedding Photography & Films';
  const instagramHandle = studioBranding?.instagram_handle;
  const facebookHandle = studioBranding?.facebook_handle;
  const youtubeHandle = studioBranding?.youtube_handle;
  const studioPhone = studioBranding?.phone;
  const studioEmail = studioBranding?.email;
  const socialVisibility = studioBranding?.social_visibility || {
    whatsapp: true,
    instagram: true,
    facebook: true,
    youtube: true,
  };
  const totalPhotosCount = fullPhotos?.length || (gallery as any)?.photos_count || (gallery as any)?.total_photos || 0;

  // ── DYNAMIC DESIGN CONFIGURATION (PRESETS, PALETTE, FONTS, MOTION) ──
  const designConfig = gallery?.raw_payload?.design;
  const designPreset = designConfig?.preset || 'cinematic_bleed';
  const designPalette = designConfig?.palette || {
    canvasBg: '#FAF9F5',
    textColor: '#18181B',
    accentColor: '#D97706',
    subtextColor: '#71717A',
    cardBg: '#FFFFFF',
  };
  const headingFont = designConfig?.typography?.headingFont || "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
  const bodyFont = designConfig?.typography?.bodyFont || "'Plus Jakarta Sans', sans-serif";
  const motionAnimation = designConfig?.motion?.animation || 'cinematic_zoom';
  const coverFocal = designConfig?.cover?.focalPoint || { x: 50, y: 50 };
  const coverOpacity = designConfig?.cover?.overlayOpacity ?? 40;
  const effectiveCoverUrl = designConfig?.cover?.url || parseCoverUrl(gallery.cover_url).url || gallery.cover_url || '';
  const formattedDate = new Date(gallery.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const coverPos = parseCoverUrl(gallery.cover_url || effectiveCoverUrl);
  const cleanCoverUrl = coverPos.url || effectiveCoverUrl;

  const isLightPalette = useMemo(() => {
    const hex = (designPalette.canvasBg || '#FAF9F5').replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
    }
    return true;
  }, [designPalette.canvasBg]);

  // Entrance motion animation classes
  const getMotionClass = (type: string) => {
    switch (type) {
      case 'fade_up':
        return 'animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both';
      case 'curtain_reveal':
        return 'animate-in fade-in zoom-in-95 duration-1000 fill-mode-both';
      case 'soft_focus':
        return 'animate-in fade-in duration-1000 fill-mode-both';
      case 'parallax_float':
        return 'animate-in fade-in duration-1000 fill-mode-both';
      case 'cinematic_zoom':
      default:
        return 'animate-in fade-in duration-1000 fill-mode-both';
    }
  };

  return (
    <div
      style={{
        backgroundColor: designPalette.canvasBg,
        color: designPalette.textColor,
        fontFamily: bodyFont,
      }}
      className="min-h-screen pb-32 select-none transition-colors duration-300">
      
      {/* 0. LUXURY STUDIO HEADER BAR (GLOSSY BLUR - LIGHT / DARK SYNC) */}
      <header
        className="sticky top-0 z-40 transition-all backdrop-blur-md border-b shadow-2xs"
        style={{
          backgroundColor: isLightPalette ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 9, 11, 0.88)',
          borderColor: isLightPalette ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
          color: isLightPalette ? '#18181B' : '#FFFFFF',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {studioLogo ? (
              <img
                src={studioLogo}
                alt={studioName}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-black/10"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 font-serif font-black flex items-center justify-center text-xs shadow-xs">
                {studioName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <span
                className="block text-xs sm:text-sm font-semibold tracking-wide"
                style={{ fontFamily: headingFont }}
              >
                {studioName}
              </span>
              <span className="block text-[10px] opacity-60 hidden sm:block font-light">
                {studioSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalPhotosCount > 0 && (
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider opacity-60 mr-1 hidden sm:inline">
                {totalPhotosCount} PHOTOS
              </span>
            )}
            {isSelectionMode ? (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 border border-rose-500/30 text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>Album Selection</span>
              </span>
            ) : isFullAccess ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30 text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-amber-600" />
                <span>VIP Access</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 text-[10px] sm:text-xs font-medium opacity-80">
                Official Client Gallery
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 1. LUXURY WEDDING HERO (4 EXACT HANDCRAFTED PRESETS) */}
      <div className="relative overflow-hidden transition-all duration-700">
        
        {/* PRESET 1: CINEMATIC HERO (Photo 4: Mr Sushant Photography Edge-to-Edge Hero) */}
        {(designPreset === 'cinematic_hero' || designPreset === 'cinematic_bleed' || (!['editorial_canvas', 'faded_luxe', 'split_atelier', 'haute_editorial', 'royal_medallion', 'grand_diptych'].includes(designPreset))) && (
          <div className="relative min-h-[85vh] sm:min-h-[92vh] w-full flex flex-col justify-between overflow-hidden">
            {/* Desktop Hero Image with Auto Cinematic Zoom & Exact Focal Position */}
            {cleanCoverUrl ? (
              <>
                <img
                  src={cleanCoverUrl}
                  alt={gallery.title}
                  className="hidden sm:block absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out animate-in fade-in zoom-in-[1.03]"
                  style={{
                    objectPosition: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                    transformOrigin: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                    transform: `scale(${coverPos.desktop.zoom / 100})`,
                  }}
                />
                <img
                  src={cleanCoverUrl}
                  alt={gallery.title}
                  className="block sm:hidden absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out animate-in fade-in zoom-in-[1.03]"
                  style={{
                    objectPosition: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                    transformOrigin: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                    transform: `scale(${coverPos.mobile.zoom / 100})`,
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900" />
            )}
            
            {/* Soft Ambient Vignette */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 transition-opacity"
              style={{ opacity: Math.max(coverOpacity / 100, 0.45) }}
            />

            {/* Top Bar inside Cover */}
            <div className="relative z-10 px-6 sm:px-12 py-6 flex items-center justify-between text-white/90">
              <span className="text-xs sm:text-sm font-serif tracking-wider" style={{ fontFamily: headingFont }}>
                {studioName}
              </span>
              {totalPhotosCount > 0 && (
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-80">
                  {totalPhotosCount} PHOTOS
                </span>
              )}
            </div>

            {/* Center-Bottom Romantic Typography with Golden Glow & Staggered Slide Animations */}
            <div className="relative z-10 px-6 pb-12 sm:pb-16 text-center space-y-3 max-w-3xl mx-auto">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.28em] text-amber-200/90 block font-semibold drop-shadow-md animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 fill-mode-both">
                GALLERY BY {studioName.toUpperCase()}
              </span>
              <h1
                className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white drop-shadow-2xl capitalize animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 fill-mode-both"
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
              <span className="text-xs sm:text-sm text-zinc-300 font-mono tracking-widest block drop-shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
                {formattedDate}
              </span>
              <div className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-700 fill-mode-both">
                <a
                  href="#sub-events-bar"
                  className="inline-flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer group"
                  aria-label="Scroll to gallery content"
                >
                  <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/50 to-white/90 animate-pulse" />
                  <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* PRESET 2: EDITORIAL CANVAS (Photo 2: Terre Verde Vogue Layout) */}
        {(designPreset === 'editorial_canvas' || designPreset === 'haute_editorial') && (
          <div
            className="py-10 sm:py-16 px-4 sm:px-8 text-center flex flex-col items-center justify-center relative min-h-[85vh] transition-colors duration-500"
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Top Bar */}
            <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 text-xs font-mono uppercase tracking-widest opacity-60">
              <span>{studioName}</span>
              {totalPhotosCount > 0 && <span>{totalPhotosCount} PHOTOS</span>}
            </div>

            {/* Oversized High-Fashion Title */}
            <div className="space-y-2 max-w-4xl mx-auto animate-in fade-in duration-700">
              <h1
                className="text-4xl sm:text-7xl lg:text-8xl font-normal tracking-[0.22em] uppercase leading-none"
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
            </div>

            {/* Framed Vertical Portrait Artwork (3:4 ratio) */}
            <div className="mt-8 sm:mt-12 w-64 sm:w-80 md:w-96 aspect-[3/4] rounded-xs overflow-hidden shadow-2xl border-4 border-white bg-black relative group animate-in fade-in zoom-in-95 duration-1000">
              {effectiveCoverUrl ? (
                <img
                  src={effectiveCoverUrl}
                  alt={gallery.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-103"
                  style={{
                    objectPosition: `${coverFocal.x}% ${coverFocal.y}%`,
                  }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-800" />
              )}
            </div>

            {/* Bottom Subtle Date and Arrow */}
            <div className="pt-8 sm:pt-10 flex flex-col items-center gap-2 text-xs font-mono tracking-widest uppercase opacity-60">
              <span>{formattedDate}</span>
              <a href="#gallery-content" className="pt-2 hover:opacity-100 transition-opacity" aria-label="Scroll down">
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </a>
            </div>
          </div>
        )}

        {/* PRESET 3: FADED LUXE (Photo 3: KnotsbyAMP Misty Backdrop & Centered Typography) */}
        {(designPreset === 'faded_luxe' || designPreset === 'royal_medallion') && (
          <div className="relative min-h-[85vh] sm:min-h-[90vh] w-full flex flex-col justify-between overflow-hidden bg-white">
            {/* Soft High-Key Misty Photo Background */}
            {effectiveCoverUrl && (
              <img
                src={effectiveCoverUrl}
                alt={gallery.title}
                className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-105 contrast-95 transition-transform duration-1000"
                style={{
                  objectPosition: `${coverFocal.x}% ${coverFocal.y}%`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/95" />

            {/* Top Bar */}
            <div className="relative z-10 px-6 sm:px-12 py-5 border-b border-black/5 flex items-center justify-between text-zinc-900 text-xs font-mono uppercase tracking-widest">
              <span className="font-bold">{studioName}</span>
              <span className="hidden sm:inline font-serif normal-case tracking-normal text-sm opacity-70">
                {gallery.title}
              </span>
              <span>{totalPhotosCount > 0 ? `${totalPhotosCount} PHOTOS` : ''}</span>
            </div>

            {/* Center Content: Ring indicator, stacked serif title, date */}
            <div className="relative z-10 px-6 py-12 text-center space-y-4 max-w-2xl mx-auto my-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-400/80 mx-auto" />
              <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-zinc-500 block font-semibold">
                GALLERY BY {studioName.toUpperCase()}
              </span>
              <h1
                className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-zinc-900 uppercase leading-tight"
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
              <span className="text-xs sm:text-sm text-zinc-600 font-mono tracking-widest block pt-1">
                {formattedDate}
              </span>
            </div>

            {/* Bottom Delicate Line & Arrow */}
            <div className="relative z-10 pb-8 flex flex-col items-center">
              <div className="w-px h-8 bg-zinc-300" />
              <a href="#gallery-content" className="pt-2 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="Scroll down">
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </a>
            </div>
          </div>
        )}

        {/* PRESET 4: SPLIT ATELIER (Photo 5: Modern Diptych Side-by-Side Canvas) */}
        {(designPreset === 'split_atelier' || designPreset === 'grand_diptych') && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 min-h-[85vh] w-full border-b border-black/10 overflow-hidden transition-colors duration-500"
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Left Content Side */}
            <div className="p-8 sm:p-16 lg:p-20 flex flex-col justify-between space-y-8 animate-in fade-in slide-in-from-left-6 duration-1000">
              {/* Top Header */}
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest opacity-60">
                <span className="font-bold">{studioName}</span>
                {totalPhotosCount > 0 && <span>{totalPhotosCount} PHOTOS</span>}
              </div>

              {/* Center Typography */}
              <div className="space-y-4 my-auto">
                <span className="text-[11px] font-mono uppercase tracking-[0.28em] opacity-60 block font-bold">
                  GALLERY BY {studioName.toUpperCase()}
                </span>
                <h1
                  className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-wide uppercase leading-tight"
                  style={{ fontFamily: headingFont }}
                >
                  {gallery.title}
                </h1>
                <span className="text-xs sm:text-sm font-mono tracking-widest opacity-70 block pt-1">
                  {formattedDate}
                </span>
              </div>

              {/* Bottom Arrow Indicator */}
              <div className="pt-4">
                <a
                  href="#gallery-content"
                  className="inline-flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Scroll down"
                >
                  <div className="w-px h-6 bg-current opacity-40" />
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                </a>
              </div>
            </div>

            {/* Right Artwork Side */}
            <div className="min-h-[420px] lg:min-h-full overflow-hidden relative group animate-in fade-in zoom-in-95 duration-1000">
              {effectiveCoverUrl ? (
                <img
                  src={effectiveCoverUrl}
                  alt={gallery.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102"
                  style={{
                    objectPosition: `${coverFocal.x}% ${coverFocal.y}%`,
                  }}
                />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
            </div>
          </div>
        )}

      </div>

      <div id="sub-events-bar" className="scroll-mt-14" />
      
      {/* 1.5 STICKY SUB-EVENTS HORIZONTAL BAR (SYNCED WITH PALETTE COLORS) */}
      <div
        className="sticky top-[52px] sm:top-[57px] z-30 transition-all backdrop-blur-md border-y shadow-2xs"
        style={{
          backgroundColor: `${designPalette.cardBg || designPalette.canvasBg}F0`,
          borderColor: `${designPalette.textColor}18`,
          color: designPalette.textColor,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1">
            <button
              type="button"
              onClick={() => setSelectedCollectionId('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs ${
                selectedCollectionId === 'all' ? 'font-black' : 'opacity-70 hover:opacity-100'
              }`}
              style={
                selectedCollectionId === 'all'
                  ? { backgroundColor: designPalette.accentColor, color: '#FFFFFF' }
                  : { backgroundColor: `${designPalette.textColor}0D`, color: designPalette.textColor }
              }
            >
              All Photos ({fullPhotos.length})
            </button>
            {collections.map((col) => {
              const isSel = selectedCollectionId === col.id;
              const count = col.photo_count ?? fullPhotos.filter((p) => p.collection_id === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs ${
                    isSel ? 'font-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    isSel
                      ? { backgroundColor: designPalette.accentColor, color: '#FFFFFF' }
                      : { backgroundColor: `${designPalette.textColor}0D`, color: designPalette.textColor }
                  }
                >
                  {col.name} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono opacity-60 shrink-0">
            <span>{fullPhotos.length} Photos</span>
            <span>•</span>
            <span>AI Face Search</span>
          </div>
        </div>
      </div>
      
      <div id="gallery-content" className="scroll-mt-14" />
      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 relative z-10 space-y-8">

        {/* CASE P: PRIVILEGED ACCESS LOCKED (Enter PIN / Pass Key) */}
        {isPrivilegedMode && !isUnlocked && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-[#E7E2D8] shadow-xl text-center space-y-6 max-w-lg mx-auto animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-9 h-9 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2
                className="text-2xl font-normal text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              >
                {isSelectionMode ? 'Album Selection Access' : 'Full Event Access'}
              </h2>
              <p
                className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem' }}
              >
                {isSelectionMode
                  ? 'Please enter the client pass key to review, select, and finalize photos for your custom album print.'
                  : 'This gallery is PIN protected. Enter the access PIN code to view all high-resolution event photos.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="px-8 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs tracking-wide shadow-xl shadow-zinc-900/20 flex items-center justify-center gap-2 mx-auto transition-all active:scale-98 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Enter Access PIN / Pass Key</span>
              </button>
            </div>
          </div>
        )}
        
        {/* CASE A: STRICT ZERO-KNOWLEDGE LOCKED HERO (Before Face Search) */}
        {!isPrivilegedMode && !hasSearched && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-[#E7E2D8] shadow-xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-9 h-9 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-normal text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              >
                {gallery.is_face_ai_enabled === false
                  ? 'Explore Event Gallery'
                  : 'Register to get your photos on your mobile'}
              </h2>
              <p
                className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem' }}
              >
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
                <span style={{ fontFamily: "'Cinzel', 'Playfair Display', serif", letterSpacing: '0.05em' }}>
                  {gallery.is_face_ai_enabled === false ? 'View Event Photos' : 'Find My Photo'}
                </span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </button>
            </div>
          </div>
        )}

        {/* CASE UNPUBLISHED: LUXURY CONGRATULATIONS CONFIRMATION SCREEN (No Steps 1, 2, 3) */}
        {(!isPrivilegedMode && hasSearched && currentGalleryStatus === 'UNPUBLISHED') && (
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-emerald-200/80 shadow-2xl text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            {/* Animated Celebration Avatar / Badge */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-300">
                {isAlreadyRegistered ? '✨ Already Registered' : '🎉 Registration Successful'}
              </span>
              <h2
                className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              >
                {isAlreadyRegistered
                  ? `Welcome Back, ${guestName || 'Guest'}!`
                  : 'Congratulations! Thank you so much for your registration.'}
              </h2>
              <p
                className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem' }}
              >
                We will notify you on WhatsApp as soon as your photos are ready.
              </p>
            </div>

            {/* Notification Alert Box */}
            <div className="bg-[#FAF9F5] rounded-2xl p-5 border border-[#E7E2D8] text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Instant Notification Guaranteed</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                As soon as the photos are published by the studio, you will receive an instant notification with your personal photo album directly on:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {guestPhone && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp: {guestPhone}</span>
                  </span>
                )}
                {guestEmail && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-medium">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{guestEmail}</span>
                  </span>
                )}
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
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
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
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-600/20 active:scale-98"
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

            {isSelectionMode && showOnlySelected && displayedPhotos.length === 0 && (
              <div className="bg-white rounded-3xl p-8 border border-[#E7E2D8] text-center space-y-3">
                <Heart className="w-8 h-8 text-rose-600 fill-rose-600 mx-auto" />
                <h3 className="text-base font-black text-zinc-900">No Photos Selected Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Click on the heart icon on any photo in the gallery to mark it for your custom album selection.
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
                        if (isSelectionSubmitted) {
                          setSelectedPhotoIndex(idx);
                          return;
                        }
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
                          if (effectiveMaxSelectionLimit && next.size >= effectiveMaxSelectionLimit) {
                            alert(`You can select up to a maximum of ${effectiveMaxSelectionLimit} photos. Please unselect another photo to choose this one.`);
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
                        ? 'border-rose-500 ring-4 ring-rose-500/25 shadow-xl'
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

                    {/* Animated Heart Icon Button for Photo Selection */}
                    {isSelectionMode && (
                      <button
                        type="button"
                        disabled={isSelectionSubmitted}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelectionSubmitted) return;
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
                            if (effectiveMaxSelectionLimit && next.size >= effectiveMaxSelectionLimit) {
                              alert(`You can select up to a maximum of ${effectiveMaxSelectionLimit} photos. Please unselect another photo to choose this one.`);
                              return;
                            }
                            next.add(photo.id);
                            setSelectedForAlbum(next);
                            syncSelectionToBackend(next, selectorName, selectorEmail);
                          }
                        }}
                        className={`absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isSelectionSubmitted
                            ? (isSelected ? 'bg-rose-600 text-white ring-2 ring-white cursor-not-allowed opacity-90' : 'hidden')
                            : isSelected
                            ? 'bg-rose-600 text-white ring-2 ring-white shadow-lg shadow-rose-600/50 scale-105 active:scale-95 animate-in zoom-in-90'
                            : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md active:scale-90 hover:scale-105'
                        }`}
                        title={isSelected ? 'Remove from selection' : 'Select for album'}
                      >
                        <Heart className={`w-4 h-4 transition-transform ${isSelected ? 'fill-white text-white scale-110' : 'text-white'}`} />
                      </button>
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
        isProcessing={isMatching}
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

      {/* FLOATING ALBUM SELECTION BOTTOM DOCK */}
      {isSelectionMode && isUnlocked && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 bg-zinc-950/95 backdrop-blur-xl text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isSelectionSubmitted
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {isSelectionSubmitted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                  {isSelectionSubmitted ? 'Selection Locked' : 'Album Selection'}
                </span>
                {effectiveMaxSelectionLimit && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    Limit: {effectiveMaxSelectionLimit}
                  </span>
                )}
                {isSyncingSelection ? (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                  </span>
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-zinc-400" title="Cloud Synced" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                <span>
                  Selected <strong className="text-white text-sm font-black">{selectedForAlbum.size}</strong>
                  {effectiveMaxSelectionLimit ? ` / ${effectiveMaxSelectionLimit}` : ''} photos
                </span>
                {selectorEmail && (
                  <span className="text-zinc-500 hidden sm:inline">
                    • for <strong className="text-zinc-300">{selectorName || selectorEmail}</strong>
                    {!isSelectionSubmitted && (
                      <button
                        type="button"
                        onClick={handleSwitchSelector}
                        className="text-amber-400 hover:text-amber-300 underline ml-1.5 cursor-pointer font-bold text-[11px]"
                      >
                        (Switch)
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                showOnlySelected
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showOnlySelected ? 'fill-white' : ''}`} />
              <span>{showOnlySelected ? 'All Photos' : `Selected (${selectedForAlbum.size})`}</span>
            </button>

            {!isSelectionSubmitted ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedForAlbum.size === 0) {
                    alert('Please select at least 1 photo for your album before submitting.');
                    return;
                  }
                  setShowSubmitConfirmModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-98"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Selection</span>
              </button>
            ) : (
              <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Submitted &amp; Locked</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT SELECTION CONFIRMATION MODAL */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-inner">
              <Send className="w-7 h-7 text-rose-600" />
            </div>

            <div className="text-center space-y-2">
              <h3
                className="text-xl font-black text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              >
                Submit {selectedForAlbum.size} Photos for Album Design?
              </h3>
              <p
                className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem' }}
              >
                Once submitted, your album selection will be locked so the studio team can finalize layout and printing.
              </p>
            </div>

            <div className="bg-[#FAF9F5] rounded-2xl p-4 border border-[#E7E2D8] text-xs space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>Selected Photos:</span>
                <strong className="text-zinc-900 font-bold">{selectedForAlbum.size} photos</strong>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Allowed Limit:</span>
                <strong className="text-zinc-900 font-bold">{effectiveMaxSelectionLimit} photos</strong>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Client:</span>
                <strong className="text-zinc-900 font-bold">{selectorName || selectorEmail}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                disabled={isSubmittingSelection}
                className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitSelection}
                disabled={isSubmittingSelection}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                {isSubmittingSelection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. STUDIO BRANDING FOOTER */}
      <footer className="mt-20 border-t border-[#E7E2D8] bg-[#F5F2EB] text-zinc-800 py-12 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            {studioLogo ? (
              <img
                src={studioLogo}
                alt={studioName}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-500/30 mx-auto shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 font-serif font-black flex items-center justify-center text-base shadow-sm mx-auto">
                {studioName.charAt(0).toUpperCase()}
              </div>
            )}
            <h3
              className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900"
              style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
            >
              {studioName}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 font-serif italic max-w-md mx-auto">
              {studioTagline}
            </p>
          </div>

          {/* Social Media Links */}
          {(studioPhone || instagramHandle || facebookHandle || youtubeHandle || studioEmail) && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {/* 1. WhatsApp */}
              {socialVisibility?.whatsapp !== false && studioPhone && (
                <a
                  href={`https://wa.me/${studioPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-emerald-300 hover:text-emerald-700 text-zinc-700 text-xs font-semibold shadow-2xs transition"
                >
                  <img
                    src="/assets/icons/Whatsapp.png"
                    alt="WhatsApp"
                    className="w-4 h-4 object-contain"
                  />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* 2. Instagram */}
              {socialVisibility?.instagram !== false && instagramHandle && (
                <a
                  href={instagramHandle.startsWith('http') ? instagramHandle : `https://instagram.com/${instagramHandle.replace('@', '').trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-pink-300 hover:text-pink-600 text-zinc-700 text-xs font-semibold shadow-2xs transition"
                >
                  <InstagramIcon className="w-4 h-4 text-pink-500" />
                  <span>Instagram</span>
                </a>
              )}

              {/* 3. Facebook */}
              {socialVisibility?.facebook !== false && facebookHandle && (
                <a
                  href={facebookHandle.startsWith('http') ? facebookHandle : `https://facebook.com/${facebookHandle.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-blue-300 hover:text-blue-600 text-zinc-700 text-xs font-semibold shadow-2xs transition"
                >
                  <FacebookIcon className="w-4 h-4 text-blue-600" />
                  <span>Facebook</span>
                </a>
              )}

              {/* 4. YouTube */}
              {socialVisibility?.youtube !== false && youtubeHandle && (
                <a
                  href={youtubeHandle.startsWith('http') ? youtubeHandle : `https://youtube.com/${youtubeHandle.startsWith('@') ? youtubeHandle : `@${youtubeHandle}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-red-300 hover:text-red-600 text-zinc-700 text-xs font-semibold shadow-2xs transition"
                >
                  <YoutubeIcon className="w-4 h-4 text-red-600" />
                  <span>YouTube</span>
                </a>
              )}

              {/* Email */}
              {studioEmail && (
                <a
                  href={`mailto:${studioEmail}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E2D8] hover:border-zinc-400 text-zinc-700 text-xs font-semibold shadow-2xs transition"
                >
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span>Email</span>
                </a>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-[#E7E2D8]/80 text-[11px] text-zinc-400">
            © {new Date().getFullYear()} {studioName}. All rights reserved. • Powered by StudioCore
          </div>
        </div>
      </footer>

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

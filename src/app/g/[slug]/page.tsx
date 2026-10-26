'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { parseCoverUrl, CoverPositioning } from '@/lib/gallery-cover-utils';
import { SparkleStar, WashiTape, HandDrawnOval, FaceAiFocusIcon } from '@/components/gallery/CoverPresetEffects';
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
  ArrowUp,
  Share2,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { JustifiedGalleryLayout } from '@/components/gallery/JustifiedGalleryLayout';

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

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.04 20.15C10.55 20.15 9.09 19.75 7.82 19L7.52 18.82L4.41 19.64L5.24 16.61L5.04 16.3C4.22 14.99 3.79 13.47 3.79 11.91C3.79 7.37 7.49 3.67 12.04 3.67C14.25 3.67 16.32 4.53 17.88 6.09C19.44 7.65 20.3 9.72 20.3 11.93C20.3 16.47 16.6 20.15 12.04 20.15ZM16.56 14.39C16.31 14.26 15.09 13.66 14.86 13.58C14.64 13.5 14.47 13.46 14.31 13.71C14.14 13.96 13.66 14.52 13.51 14.69C13.37 14.86 13.22 14.88 12.97 14.76C12.72 14.63 11.92 14.37 10.97 13.52C10.23 12.86 9.73 12.05 9.58 11.8C9.44 11.55 9.57 11.41 9.69 11.29C9.8 11.18 9.94 11 10.06 10.86C10.18 10.72 10.23 10.62 10.31 10.45C10.39 10.28 10.35 10.14 10.29 10.01C10.23 9.88 9.73 8.66 9.52 8.16C9.32 7.67 9.12 7.74 8.96 7.73C8.82 7.72 8.65 7.72 8.48 7.72C8.31 7.72 8.04 7.78 7.81 8.03C7.58 8.28 6.94 8.88 6.94 10.1C6.94 11.32 7.83 12.49 7.95 12.66C8.07 12.83 9.71 15.36 12.21 16.44C12.81 16.7 13.27 16.85 13.63 16.97C14.23 17.16 14.78 17.13 15.22 17.07C15.71 16.99 16.72 16.45 16.93 15.86C17.14 15.27 17.14 14.76 17.08 14.66C17.02 14.56 16.81 14.52 16.56 14.39Z" />
    </svg>
  );
}
import { downloadPhotosAsZip, ZipDownloadProgress, extractOriginalFileName } from '@/lib/gallery/clientZipDownloader';
import { ZipDownloadModal } from '@/components/gallery/ZipDownloadModal';
import { DownloadSelectionModal } from '@/components/gallery/DownloadSelectionModal';
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
  preview_key?: string;
  thumbnail_key?: string;
  width: number;
  height: number;
  face_count: number;
  similarity?: number;
  confidencePercent?: number;
  [key: string]: any;
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
  const isPreviewMode = searchParams?.get('preview') === 'true' || searchParams?.get('mode') === 'preview';
  const passKeyParam = searchParams?.get('pass_key');
  const shareKeyParam = searchParams?.get('share_key');

  const isPrivilegedMode = isFullAccess || isSelectionMode || isVipMode || isPreviewMode;

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
  const [isMyPhotosActive, setIsMyPhotosActive] = useState<boolean>(true);
  const [isSyncingLivePhotos, setIsSyncingLivePhotos] = useState(false);
  const [guestSavedSession, setGuestSavedSession] = useState<{ id?: string; token?: string; name?: string; phone?: string; email?: string } | null>(null);

  // 50-Photo Progressive Pagination for Privileged View
  const [visibleFullCount, setVisibleFullCount] = useState<number>(50);

  // Lightbox & Selection State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedForAlbum, setSelectedForAlbum] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isDownloadSelectModalOpen, setIsDownloadSelectModalOpen] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipDownloadProgress | null>(null);
  const zipAbortControllerRef = useRef<AbortController | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Warn user if reloading while ZIP download is actively running
  useEffect(() => {
    if (!isDownloadingAll) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Photo download is in progress. Leaving will cancel the download.';
      return 'Photo download is in progress. Leaving will cancel the download.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDownloadingAll]);
  const [isSubEventsDropdownOpen, setIsSubEventsDropdownOpen] = useState(false);
  const subEventsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subEventsDropdownRef.current && !subEventsDropdownRef.current.contains(e.target as Node)) {
        setIsSubEventsDropdownOpen(false);
      }
    };
    if (isSubEventsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSubEventsDropdownOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowScrollTop(window.scrollY > 350);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      // Check unlock permissions for specific access modes
      let requiredPin: string | null = null;

      if (isFullAccess) {
        const isFullAccessSkipPin = Boolean(gal.full_access_skip_pin ?? gal.raw_payload?.full_access_skip_pin);
        if (!isFullAccessSkipPin) {
          const pinVal = gal.pass_key || gal.raw_payload?.pass_key || gal.admin_pin || gal.pin_code;
          if (pinVal) requiredPin = pinVal.toString().trim();
        }
      } else if (isSelectionMode) {
        const isSelectionSkipPin = Boolean(gal.selection_skip_pin ?? gal.raw_payload?.selection_skip_pin);
        if (!isSelectionSkipPin) {
          const pinVal = gal.pass_key || gal.raw_payload?.pass_key || gal.admin_pin || gal.pin_code;
          if (pinVal) requiredPin = pinVal.toString().trim();
        }
      } else {
        // Guest Access PIN check
        const isGuestSkipPin = Boolean(gal.guest_skip_pin ?? gal.raw_payload?.guest_skip_pin);
        const isGuestPinEnabled = gal.raw_payload?.guest_pin_enabled !== undefined
          ? Boolean(gal.raw_payload.guest_pin_enabled)
          : (gal.raw_payload?.guest_ask_pin !== undefined ? Boolean(gal.raw_payload.guest_ask_pin) : !isGuestSkipPin);

        if (isGuestPinEnabled && !isGuestSkipPin) {
          const pinVal = gal.guest_pin || gal.raw_payload?.guest_pin || gal.pin_code;
          if (pinVal) requiredPin = pinVal.toString().trim();
        }
      }

      const passedKey = isPrivilegedMode ? passKeyParam : shareKeyParam;

      const modeKey = isSelectionMode ? 'selection' : (isFullAccess ? 'full' : 'guest');
      const sessionKey = `studiocore_unlocked_${modeKey}_${gal.id}`;
      const isSessionUnlocked = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === requiredPin;
      const isUrlKeyUnlocked = Boolean(passedKey && requiredPin && passedKey.trim() === requiredPin);

      const hasValidPin = isPreviewMode || isVipMode || !requiredPin || isUrlKeyUnlocked || isSessionUnlocked;

      if (hasValidPin) {
        setIsUnlocked(true);
        if (isPreviewMode) {
          setHasSearched(true);
          setIsVerified(true);
        }
      } else {
        setIsUnlocked(false);
        if (isPrivilegedMode) {
          setShowPinModal(true);
        }
      }

      // Render gallery hero immediately so user sees cover preset in milliseconds!
      setGallery(gal);
      setLoading(false);

      // Fetch full collections & photos in parallel in background
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
      setLoading(false);
    }
  }, [slug, isSelectionMode, isFullAccess, passKeyParam, shareKeyParam, isVipMode, isPreviewMode, isPrivilegedMode]);

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
                threshold: 0.40,
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
        const rawLocal = localStorage.getItem(`studiocore_guest_profile_${gallery.id}`) || localStorage.getItem(`studiocore_guest_${slug}`) || localStorage.getItem(`studiocore_guest_${gallery.id}`);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed?.name) {
            setGuestName(parsed.name);
          }
          if (parsed?.id) {
            fetchGuestData(parsed.id, parsed.token);
          } else if (Array.isArray(parsed?.matchedPhotoIds) && parsed.matchedPhotoIds.length > 0) {
            fetch(`/api/gallery/photos?gallery_id=${gallery.id}&ids=${parsed.matchedPhotoIds.join(',')}`)
              .then((r) => r.json())
              .then((j) => {
                if (isMounted && j.success && Array.isArray(j.photos) && j.photos.length > 0) {
                  setMatchedPhotos(j.photos);
                  setHasSearched(true);
                  setIsMyPhotosActive(true);
                }
              })
              .catch(() => {});
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

    let requiredPin: string | null = null;
    if (isFullAccess) {
      const isFullAccessSkipPin = Boolean(gallery.full_access_skip_pin ?? gallery.raw_payload?.full_access_skip_pin);
      if (!isFullAccessSkipPin) {
        const pinVal = gallery.pass_key || gallery.raw_payload?.pass_key || gallery.admin_pin || gallery.pin_code;
        if (pinVal) requiredPin = pinVal.toString().trim();
      }
    } else if (isSelectionMode) {
      const isSelectionSkipPin = Boolean(gallery.selection_skip_pin ?? gallery.raw_payload?.selection_skip_pin);
      if (!isSelectionSkipPin) {
        const pinVal = gallery.pass_key || gallery.raw_payload?.pass_key || gallery.admin_pin || gallery.pin_code;
        if (pinVal) requiredPin = pinVal.toString().trim();
      }
    } else {
      const isGuestSkipPin = Boolean(gallery.guest_skip_pin ?? gallery.raw_payload?.guest_skip_pin);
      const isGuestPinEnabled = gallery.raw_payload?.guest_pin_enabled !== undefined
        ? Boolean(gallery.raw_payload.guest_pin_enabled)
        : (gallery.raw_payload?.guest_ask_pin !== undefined ? Boolean(gallery.raw_payload.guest_ask_pin) : !isGuestSkipPin);

      if (isGuestPinEnabled && !isGuestSkipPin) {
        const pinVal = gallery.guest_pin || gallery.raw_payload?.guest_pin || gallery.pin_code;
        if (pinVal) requiredPin = pinVal.toString().trim();
      }
    }

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

      if (openFaceScannerAfterPin && !isPrivilegedMode) {
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

  // Find My Photo Trigger: Only for Guest Access mode
  const handleFindMyPhotoClick = () => {
    if (!gallery || isPrivilegedMode) return;

    const isGuestSkipPin = Boolean(gallery.guest_skip_pin ?? gallery.raw_payload?.guest_skip_pin);
    const isGuestPinEnabled = gallery.raw_payload?.guest_pin_enabled !== undefined
      ? Boolean(gallery.raw_payload.guest_pin_enabled)
      : (gallery.raw_payload?.guest_ask_pin !== undefined ? Boolean(gallery.raw_payload.guest_ask_pin) : !isGuestSkipPin);

    const resolvedGuestPin = (isGuestPinEnabled && !isGuestSkipPin)
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
          threshold: 0.40,
        }),
      });

      const json = await res.json();
      setIsFaceScannerOpen(false);

      if (json.success && Array.isArray(json.photos)) {
        setMatchedPhotos(json.photos);
        setHasSearched(true);
        setIsVerified(true);
        setIsMyPhotosActive(true);
        try {
          const profObj = {
            id: savedId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            matchedPhotoIds: json.photos.map((p: any) => p.id),
          };
          localStorage.setItem(`studiocore_guest_profile_${gallery.id}`, JSON.stringify(profObj));
          localStorage.setItem(`studiocore_guest_profile_${slug}`, JSON.stringify(profObj));
        } catch (_) {}
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
              threshold: 0.40,
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

  // Download High-Res Photo (Direct Save, Original Filename, iPhone Camera Roll Support)
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    setDownloadingId(photo.id);
    const targetKey = photo.original_key || photo.preview_key || photo.preview_url;
    const originalFileName = extractOriginalFileName(photo);

    try {
      const res = await fetch(
        `/api/gallery/download-url?key=${encodeURIComponent(targetKey)}&name=${encodeURIComponent(originalFileName)}`
      );
      const json = await res.json();
      const directUrl = (json.success && json.downloadUrl) ? json.downloadUrl : photo.preview_url;

      // 1. iPhone iOS Safari: native Save Image to Camera Roll via Web Share API
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && typeof navigator.share === 'function') {
        try {
          const imgRes = await fetch(directUrl);
          const blob = await imgRes.blob();
          const file = new File([blob], originalFileName, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: originalFileName,
            });
            return;
          }
        } catch (_) {}
      }

      // 2. Android & Desktop: Direct single-click download with original filename
      const link = document.createElement('a');
      link.href = directUrl;
      link.setAttribute('download', originalFileName);
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    } catch (_) {}

    // Fallback: fetch blob or stream directly
    try {
      const fallbackUrl = `/api/gallery/image?key=${encodeURIComponent(targetKey)}&download=1&name=${encodeURIComponent(originalFileName)}`;
      window.open(fallbackUrl, '_blank');
    } catch (_) {
      window.open(photo.preview_url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  // Batch Download Photos as Single Original High-Res ZIP Archive with Category Folders
  const handleDownloadPhotosZip = async (photosToZip: PhotoItem[], zipNamePrefix: string, customRootFolder?: string) => {
    if (photosToZip.length === 0) {
      alert('No photos available to download.');
      return;
    }

    const controller = new AbortController();
    zipAbortControllerRef.current = controller;
    setIsZipModalOpen(true);
    setIsDownloadingAll(true);

    const eventTitle = (gallery?.title || 'Wedding').trim();
    const cleanZipName = `${eventTitle} - ${zipNamePrefix}.zip`;
    const rootFolderName = customRootFolder || `${eventTitle} - ${zipNamePrefix}`;

    // Map collection IDs to names
    const colMap: Record<string, string> = {};
    collections.forEach((c) => {
      colMap[c.id] = c.name;
    });

    const res = await downloadPhotosAsZip({
      photos: photosToZip,
      zipFileName: cleanZipName,
      rootFolderName,
      collectionsMap: colMap,
      onProgress: (p) => setZipProgress(p),
      signal: controller.signal,
    });

    setIsDownloadingAll(false);
    if (!res.success && res.error && !res.error.includes('aborted') && !res.error.includes('cancelled')) {
      alert(`Download error: ${res.error}`);
    }
  };

  const handleCancelZipDownload = () => {
    if (zipAbortControllerRef.current) {
      zipAbortControllerRef.current.abort();
    }
    setIsZipModalOpen(false);
    setIsDownloadingAll(false);
    setZipProgress(null);
  };

  // Batch Download All Matched Photos (Organized by Sub-Event Folders, Named: [Event] - [GuestName].zip)
  const handleDownloadAllMyPhotos = async () => {
    const guestLabel = guestName ? guestName.trim() : 'Guest';
    await handleDownloadPhotosZip(matchedPhotos, guestLabel, `${gallery?.title || 'Wedding'} - ${guestLabel}`);
  };

  // One-click Download Trigger: Direct download for guest, selector modal for privileged
  const handleDownloadAllPhotosTrigger = () => {
    if (!isPrivilegedMode) {
      handleDownloadAllMyPhotos();
      return;
    }
    setIsDownloadSelectModalOpen(true);
  };

  // Confirmed from DownloadSelectionModal
  const handleConfirmDownloadSelection = async ({ mode, collectionIds }: { mode: 'all' | 'custom'; collectionIds: string[] }) => {
    setIsDownloadSelectModalOpen(false);
    let photosToDownload: PhotoItem[] = [];
    let prefix = 'All_Photos';

    if (mode === 'all') {
      photosToDownload = fullPhotos;
      prefix = 'All_Photos';
    } else {
      photosToDownload = fullPhotos.filter(
        (p) => p.collection_id && collectionIds.includes(p.collection_id)
      );
      prefix = collectionIds.length === 1
        ? (collections.find((c) => c.id === collectionIds[0])?.name?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Event')
        : 'Selected_Events';
    }

    if (photosToDownload.length === 0) {
      alert('No photos found in the selected categories.');
      return;
    }

    await handleDownloadPhotosZip(photosToDownload, prefix);
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
    // 1. In Guest Access mode (!isPrivilegedMode): STRICT PRIVACY - ONLY show guest's matched photos!
    if (!isPrivilegedMode) {
      if (selectedCollectionId === 'all') {
        return matchedPhotos;
      }
      return matchedPhotos.filter((p) => p.collection_id === selectedCollectionId);
    }

    // 2. Privileged Access mode (Full Access / Album Selection)
    if (isSelectionMode && showOnlySelected) {
      return targetFullPhotos.filter((p) => selectedForAlbum.has(p.id));
    }

    return isUnlocked ? displayedPrivilegedPhotos : [];
  }, [isPrivilegedMode, selectedCollectionId, matchedPhotos, isSelectionMode, showOnlySelected, targetFullPhotos, selectedForAlbum, isUnlocked, displayedPrivilegedPhotos]);

  if (loading) {
    const rawBranding = gallery?.studio_branding;
    const currentStudioName = rawBranding?.studio_name;
    const currentStudioLogo = rawBranding?.logo_url;

    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-between p-8 select-none animate-in fade-in duration-300">
        <div className="w-full flex justify-center pt-8" />

        {/* Center Animated Logo & Studio Branding */}
        <div className="flex flex-col items-center text-center space-y-4 my-auto max-w-sm">
          {currentStudioLogo ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg bg-transparent">
              <img src={currentStudioLogo} alt={currentStudioName || 'Studio Logo'} className="w-full h-full object-contain" />
            </div>
          ) : currentStudioName ? (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-serif font-black flex items-center justify-center text-3xl shadow-lg">
              {currentStudioName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-amber-600/20 border-t-amber-600 animate-spin" />
          )}

          <div className="space-y-1.5">
            {currentStudioName && (
              <h2
                className="text-2xl sm:text-3xl font-normal text-zinc-900 tracking-wide"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
              >
                {currentStudioName}
              </h2>
            )}
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-400 font-semibold">
                Opening Gallery
              </span>
            </div>
          </div>
        </div>

        <div className="pb-4 text-center">
          <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
            Powered by <span className="font-bold text-zinc-700">StudioCore.in</span>
          </p>
        </div>
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

  const studioBranding: any = gallery.studio_branding;
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

  // ── DYNAMIC DESIGN CONFIGURATION (PRESETS, PALETTE, FONTS, MOTION, LAYOUT) ──
  const designConfig = gallery?.raw_payload?.design;
  const designPreset = designConfig?.preset || 'cinematic_bleed';
  const designPalette = designConfig?.palette || {
    canvasBg: '#FAF9F5',
    textColor: '#18181B',
    accentColor: '#D97706',
    subtextColor: '#71717A',
    cardBg: '#FFFFFF',
  };
  const layoutConfig = designConfig?.layout || {
    style: 'masonry',
    gap: 12,
    cornerRadius: 12,
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

  const canvasHex = (designPalette.canvasBg || '#FAF9F5').replace('#', '');
  const isLightPalette = canvasHex.length === 6
    ? ((parseInt(canvasHex.substring(0, 2), 16) * 0.299 +
        parseInt(canvasHex.substring(2, 4), 16) * 0.587 +
        parseInt(canvasHex.substring(4, 6), 16) * 0.114) > 150)
    : true;

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

  const handleShareClick = () => {
    if (typeof window !== 'undefined') {
      if (navigator.share) {
        navigator.share({
          title: gallery?.title || 'Wedding Gallery',
          text: `View our wedding gallery by ${studioName}`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Gallery link copied to clipboard!');
      }
    }
  };

  // Guest Thank-You / Registration Confirmation View (Unpublished Gallery)
  // When guest has registered and gallery is UNPUBLISHED, show clean celebratory confirmation without 85vh cover hero
  const isGuestRegisteredUnpublished = !isPrivilegedMode && hasSearched && currentGalleryStatus === 'UNPUBLISHED';

  if (isGuestRegisteredUnpublished) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between select-none transition-colors duration-300"
        style={{
          backgroundColor: designPalette.canvasBg,
          color: designPalette.textColor,
          fontFamily: bodyFont,
        }}
      >
        {/* Luxury Top Header Bar */}
        <header
          className="w-full px-4 sm:px-8 py-3 flex items-center justify-between border-b backdrop-blur-xl"
          style={{
            backgroundColor: `${designPalette.canvasBg}E6`,
            borderColor: `${designPalette.textColor}15`,
            color: designPalette.textColor,
          }}
        >
          <div className="flex items-center gap-3">
            {studioLogo ? (
              <img src={studioLogo} alt={studioName} className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                {studioName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: headingFont }}>
              {studioName}
            </span>
          </div>

          <span className="text-xs font-bold tracking-tight opacity-75" style={{ fontFamily: headingFont }}>
            {gallery.title}
          </span>
        </header>

        {/* Centerpiece Luxury Congratulations Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="bg-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-emerald-200/80 shadow-2xl text-center space-y-6 max-w-xl w-full animate-in fade-in zoom-in-95 duration-300 text-zinc-900">
            {/* Animated Celebration Avatar / Badge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-300">
                {isAlreadyRegistered ? '✨ Already Registered' : '🎉 Registration Successful'}
              </span>
              <h2
                className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight"
                style={{ fontFamily: headingFont }}
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
            <div className="bg-[#FAF9F5] rounded-2xl p-4 sm:p-5 border border-[#E7E2D8] text-left space-y-3">
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
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs opacity-60">
          <p>&copy; 2026 {studioName}. Powered by StudioCore.in</p>
        </footer>

        {/* Face Scanner Modal */}
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
      </div>
    );
  }

  // Guest Landing Flow: Cover photo with aesthetic couple name, date, and frosted glass "Find My Photos" pill
  const isGuestPreRegistration = !isPrivilegedMode && !hasSearched && !isVerified;

  const renderHeroAction = () => {
    if (isGuestPreRegistration) {
      return (
        <div className="pt-4 sm:pt-6 animate-in fade-in zoom-in-95 duration-500">
          <button
            type="button"
            onClick={handleFindMyPhotoClick}
            className="group relative inline-flex items-center justify-center gap-2.5 sm:gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-white font-bold text-xs sm:text-sm tracking-wider shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer backdrop-blur-xl border border-white/30"
            style={{
              backgroundColor: designPalette.accentColor,
            }}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:scale-110 transition-transform" />
            <span style={{ fontFamily: "'Cinzel', 'Playfair Display', serif", letterSpacing: '0.08em' }}>
              {gallery.is_face_ai_enabled === false ? 'View Event Photos' : 'Find My Photos'}
            </span>
            <FaceAiFocusIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      );
    }
    return (
      <div className="pt-3">
        <a
          href="#sub-events-bar"
          className="inline-flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-all cursor-pointer group"
          aria-label="Scroll to gallery content"
        >
          <div className="w-px h-6 bg-current opacity-40 group-hover:h-8 transition-all" />
          <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform animate-bounce" />
        </a>
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: designPalette.canvasBg,
        color: designPalette.textColor,
        fontFamily: bodyFont,
      }}
      className={
        isGuestPreRegistration
          ? "min-h-[100dvh] flex flex-col justify-between overflow-y-auto select-none transition-colors duration-300"
          : "min-h-screen pb-16 sm:pb-8 select-none transition-colors duration-300"
      }>
      
      {/* 0. LUXURY STUDIO HEADER BAR (GLOSSY LIQUID BLUR - SYNCED WITH PALETTE) */}
      <header
        className="sticky top-0 z-40 shrink-0 transition-all backdrop-blur-xl backdrop-saturate-150 border-b shadow-2xs"
        style={{
          backgroundColor: `${designPalette.canvasBg}E6`,
          borderColor: `${designPalette.textColor}15`,
          color: designPalette.textColor,
        }}
      >
        <div className="w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
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
              <span className="block text-[10px] opacity-65 hidden sm:block font-light">
                {studioSubtitle}
              </span>
            </div>
          </div>

          {/* Statically Centered Couple / Event Name in Middle of Header */}
          <div className="hidden md:flex flex-col items-center justify-center text-center px-4 max-w-md truncate">
            <span
              className="text-sm sm:text-base font-bold tracking-tight truncate block"
              style={{ fontFamily: headingFont }}
            >
              {gallery.title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(!isPrivilegedMode && !isGuestPreRegistration && gallery.is_face_ai_enabled !== false) && (
              <button
                type="button"
                onClick={handleFindMyPhotoClick}
                className="px-3 sm:px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                title="AI Face Recognition - Find My Photos"
              >
                <FaceAiFocusIcon className="w-3.5 h-3.5 text-white" />
                <span className="inline font-bold">Find My Photo</span>
              </button>
            )}
            {isPrivilegedMode && totalPhotosCount > 0 && (
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider opacity-65 mr-1 hidden sm:inline">
                {totalPhotosCount} PHOTOS
              </span>
            )}
            {isSelectionMode && (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 border border-rose-500/30 text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>Album Selection</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 1. LUXURY WEDDING HERO (HANDCRAFTED PRESETS) */}
      <div className={isGuestPreRegistration ? "relative flex-1 min-h-0 flex flex-col justify-between overflow-hidden transition-all duration-700" : "relative overflow-hidden transition-all duration-700"}>
        
        {/* PRESET 1: CINEMATIC HERO (Classic Full Bleed Hero) */}
        {(designPreset === 'cinematic_hero' || designPreset === 'cinematic_bleed' || (![
          'editorial_canvas',
          'faded_luxe',
          'split_atelier',
          'haute_editorial',
          'royal_medallion',
          'grand_diptych',
          'monochrome_portal',
          'vintage_scrapbook',
          'grand_maison',
        ].includes(designPreset))) && (
          <div className={`relative w-full flex flex-col justify-between overflow-hidden ${isGuestPreRegistration ? 'h-full min-h-0 flex-1' : 'min-h-[85vh] sm:min-h-[92vh]'}`}>
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

            {/* Spacer */}
            <div className={`relative z-10 ${isGuestPreRegistration ? 'p-2 sm:p-4' : 'p-6'}`} />

            {/* Center-Bottom Romantic Typography with Golden Glow & Staggered Slide Animations */}
            <div className={`relative z-10 px-4 sm:px-6 text-center space-y-2 sm:space-y-3 max-w-3xl mx-auto ${isGuestPreRegistration ? 'pb-4 sm:pb-8 my-auto' : 'pb-12 sm:pb-16'}`}>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.28em] text-amber-200/90 block font-semibold drop-shadow-md animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 fill-mode-both">
                GALLERY BY {studioName.toUpperCase()}
              </span>
              <h1
                className={`font-normal tracking-tight text-white drop-shadow-2xl capitalize animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 fill-mode-both ${isGuestPreRegistration ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-4xl sm:text-6xl lg:text-7xl'}`}
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
              <span className="text-xs sm:text-sm text-zinc-300 font-mono tracking-widest block drop-shadow-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
                {formattedDate}
              </span>
              {renderHeroAction()}
            </div>
          </div>
        )}

        {/* PRESET 2: EDITORIAL CANVAS (Photo 2: Terre Verde Vogue Layout) */}
        {(designPreset === 'editorial_canvas' || designPreset === 'haute_editorial') && (
          <div
            className={`px-4 sm:px-8 text-center flex flex-col items-center justify-between relative w-full transition-colors duration-500 ${isGuestPreRegistration ? 'h-full min-h-0 flex-1 py-4 sm:py-6' : 'py-10 sm:py-16 min-h-[85vh] justify-center'}`}
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Oversized High-Fashion Title (Studio name and photo count removed per user request) */}
            <div className="space-y-1 sm:space-y-2 max-w-4xl mx-auto animate-in fade-in duration-700">
              <h1
                className={`font-normal uppercase leading-none ${isGuestPreRegistration ? 'text-3xl sm:text-6xl lg:text-7xl tracking-[0.16em]' : 'text-4xl sm:text-7xl lg:text-8xl tracking-[0.22em]'}`}
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
            </div>

            {/* Framed Vertical Portrait Artwork (3:4 ratio) */}
            <div className={`${isGuestPreRegistration ? 'my-auto w-48 sm:w-64 md:w-80 max-h-[46vh] aspect-[3/4]' : 'mt-8 sm:mt-12 w-64 sm:w-80 md:w-96 aspect-[3/4]'} rounded-xs overflow-hidden shadow-2xl border-4 border-white bg-black relative group animate-in fade-in zoom-in-95 duration-1000`}>
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
            <div className={`flex flex-col items-center gap-1.5 text-xs font-mono tracking-widest uppercase opacity-60 ${isGuestPreRegistration ? 'pt-2' : 'pt-8 sm:pt-10'}`}>
              <span>{formattedDate}</span>
              {renderHeroAction()}
            </div>
          </div>
        )}

        {/* PRESET 3: FADED LUXE (KnotsbyAMP Misty Backdrop with Bottom-Up Gradient Fade & Centered Typography) */}
        {(designPreset === 'faded_luxe' || designPreset === 'royal_medallion') && (
          <div
            className={`relative w-full flex flex-col justify-end overflow-hidden transition-colors duration-500 ${isGuestPreRegistration ? 'h-full min-h-0 flex-1' : 'min-h-[85vh] sm:min-h-[90vh]'}`}
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Clear Background Photo (High clarity, opacity 85-90%) */}
            {effectiveCoverUrl && (
              <img
                src={effectiveCoverUrl}
                alt={gallery.title}
                className="absolute inset-0 w-full h-full object-cover opacity-85 sm:opacity-90 filter contrast-[1.02] brightness-[1.02] transition-transform duration-1000"
                style={{
                  objectPosition: `${coverFocal.x}% ${coverFocal.y}%`,
                }}
              />
            )}

            {/* Bottom-Up Gradient Fade (strictly 40%-50% from bottom per user request) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${designPalette.canvasBg} 0%, ${designPalette.canvasBg}F2 18%, ${designPalette.canvasBg}99 32%, ${designPalette.canvasBg}26 44%, transparent 50%)`,
              }}
            />

            {/* Bottom Content: Stacked serif title, date, placed right at bottom */}
            <div className={`relative z-10 px-6 text-center space-y-2 sm:space-y-3 max-w-3xl mx-auto mt-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 ${isGuestPreRegistration ? 'pb-4 sm:pb-8 pt-4' : 'pt-10 pb-2 sm:pb-4'}`}>
              <span className="text-[11px] font-mono uppercase tracking-[0.28em] opacity-60 block font-semibold">
                GALLERY BY {studioName.toUpperCase()}
              </span>
              <h1
                className={`font-normal tracking-tight uppercase leading-tight drop-shadow-xs ${isGuestPreRegistration ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-4xl sm:text-6xl lg:text-7xl'}`}
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
              <span className="text-xs sm:text-sm font-mono tracking-widest opacity-75 block">
                {formattedDate}
              </span>

              {renderHeroAction()}
            </div>
          </div>
        )}

        {/* PRESET 4: SPLIT ATELIER (Modern Diptych Side-by-Side Canvas with Fixed Standard Height) */}
        {(designPreset === 'split_atelier' || designPreset === 'grand_diptych') && (
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 w-full border-b border-black/10 overflow-hidden transition-colors duration-500 ${isGuestPreRegistration ? 'h-full min-h-0 flex-1' : 'min-h-[85vh] lg:h-[88vh] max-h-[92vh]'}`}
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Left Content Side */}
            <div className={`flex flex-col justify-between space-y-4 animate-in fade-in slide-in-from-left-6 duration-1000 ${isGuestPreRegistration ? 'p-4 sm:p-8 lg:p-12 order-2 lg:order-1' : 'p-8 sm:p-14 lg:p-16'}`}>
              {/* Gallery by {studioName} subtitle (Duplicate top bar removed per user request) */}
              <div className="pt-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.28em] opacity-60 block font-bold">
                  GALLERY BY {studioName.toUpperCase()}
                </span>
              </div>

              {/* Vertically Centered Typography */}
              <div className="space-y-3 my-auto">
                <h1
                  className={`font-normal tracking-wide uppercase leading-tight ${isGuestPreRegistration ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-4xl sm:text-6xl lg:text-7xl'}`}
                  style={{ fontFamily: headingFont }}
                >
                  {gallery.title}
                </h1>
                <span className="text-xs sm:text-sm font-mono tracking-widest opacity-70 block pt-1">
                  {formattedDate}
                </span>
              </div>

              {renderHeroAction()}
            </div>

            {/* Right Artwork Side (Responsive frame visible on mobile too) */}
            <div className={`${isGuestPreRegistration ? 'order-1 lg:order-2 h-44 sm:h-64 lg:h-full relative overflow-hidden rounded-2xl mx-3 sm:mx-0 my-1 lg:my-0 shadow-md' : 'min-h-[380px] lg:min-h-full'} overflow-hidden relative group animate-in fade-in zoom-in-95 duration-1000`}>
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

        {/* PRESET 6: MONOCHROME PORTAL & ARCH DUO (From User Photo 2) */}
        {designPreset === 'monochrome_portal' && (
          <div className={`relative w-full flex flex-col justify-between items-center overflow-hidden bg-zinc-950 px-4 text-center ${isGuestPreRegistration ? 'h-full min-h-0 flex-1 py-3 sm:py-5' : 'min-h-[88vh] sm:min-h-[96vh] py-6'}`}>
            {/* Grayscale Wide Panorama Background with 40% Opacity per user request */}
            {cleanCoverUrl && (
              <>
                <img
                  src={cleanCoverUrl}
                  alt={gallery.title}
                  className="hidden sm:block absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-40 transition-transform duration-1000 ease-out"
                  style={{
                    objectPosition: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                    transform: `scale(${coverPos.desktop.zoom / 100})`,
                  }}
                />
                <img
                  src={cleanCoverUrl}
                  alt={gallery.title}
                  className="block sm:hidden absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-40 transition-transform duration-1000 ease-out"
                  style={{
                    objectPosition: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                    transform: `scale(${coverPos.mobile.zoom / 100})`,
                  }}
                />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/85" />

            {/* Top Spacing (Brand name and fine art wedding visuals removed per user request) */}
            <div className={isGuestPreRegistration ? 'h-1 sm:h-4 w-full' : 'h-6 sm:h-10 w-full'} />

            {/* Centerpiece Color Arch Portal Window (From User Photo 2) */}
            <div className="relative z-20 my-auto flex items-center justify-center w-full max-w-5xl">
              {/* Flanking Hairlines & Story Badges */}
              <div className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-xs font-mono tracking-widest text-white/80 uppercase">
                <span className="w-16 lg:w-28 h-px bg-white/40" />
                <span className="px-3.5 py-1 rounded-full border border-white/30 bg-black/40 backdrop-blur-md shadow-sm">
                  ✦ STORY
                </span>
              </div>
              <div className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-xs font-mono tracking-widest text-white/80 uppercase">
                <span className="px-3.5 py-1 rounded-full border border-white/30 bg-black/40 backdrop-blur-md shadow-sm">
                  GALLERY ✦
                </span>
                <span className="w-16 lg:w-28 h-px bg-white/40" />
              </div>

              {/* The Vibrant Center Arch Portal Frame */}
              <div className={`${isGuestPreRegistration ? 'w-48 sm:w-64 md:w-80 max-h-[46vh] aspect-[9/13]' : 'w-64 sm:w-80 md:w-96 aspect-[9/13]'} rounded-t-[140px] sm:rounded-t-[200px] rounded-b-2xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.9)] border-2 border-white/50 relative bg-zinc-900 group`}>
                {cleanCoverUrl && (
                  <>
                    <img
                      src={cleanCoverUrl}
                      alt={gallery.title}
                      className="hidden sm:block w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      style={{
                        objectPosition: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                        transform: `scale(${coverPos.desktop.zoom / 100})`,
                      }}
                    />
                    <img
                      src={cleanCoverUrl}
                      alt={gallery.title}
                      className="block sm:hidden w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      style={{
                        objectPosition: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                        transform: `scale(${coverPos.mobile.zoom / 100})`,
                      }}
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Bottom Romantic Flourish Typography (Enlarged font, star icons removed per user request) */}
            <div className={`relative z-20 space-y-1.5 text-white max-w-3xl mx-auto ${isGuestPreRegistration ? 'pb-2' : 'pb-4'}`}>
              <h1
                className={`font-normal tracking-tight text-white uppercase drop-shadow-xl ${isGuestPreRegistration ? 'text-2xl sm:text-5xl md:text-6xl' : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl'}`}
                style={{ fontFamily: headingFont }}
              >
                {gallery.title}
              </h1>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-mono text-zinc-300 tracking-widest">
                <span>{formattedDate}</span>
                {totalPhotosCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{totalPhotosCount} PHOTOS</span>
                  </>
                )}
              </div>
              {renderHeroAction()}
            </div>
          </div>
        )}

        {/* PRESET 7: VINTAGE SCRAPBOOK (Photo 1: Tilted Polaroid, Washi Tape, Script Calligraphy & Circled Date) */}
        {designPreset === 'vintage_scrapbook' && (
          <div
            className={`relative w-full flex flex-col justify-between px-4 sm:px-8 transition-colors duration-500 ${isGuestPreRegistration ? 'min-h-[85vh] flex-1 py-3 sm:py-4 overflow-y-auto' : 'min-h-[88vh] sm:min-h-[95vh] py-6 sm:py-10'}`}
            style={{ backgroundColor: designPalette.canvasBg, color: designPalette.textColor }}
          >
            {/* Subtle Paper Grain Effect */}
            <div
              className="absolute inset-0 opacity-[0.035] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(${designPalette.textColor} 1px, transparent 1px)`,
                backgroundSize: '16px 16px',
              }}
            />

            {/* Top Header Row (Studio name removed per user request) */}
            <div className="relative z-10 w-full max-w-6xl mx-auto flex justify-end">
              <div className="text-right leading-none space-y-0.5">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] opacity-50 block font-bold">
                  OUR
                </span>
                <span
                  className="text-2xl sm:text-4xl font-normal block"
                  style={{ fontFamily: "'Great Vibes', cursive", color: designPalette.accentColor }}
                >
                  Forever
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.28em] opacity-65 block font-semibold">
                  WEDDING CHAPTER
                </span>
              </div>
            </div>

            {/* Centerpiece Scrapbook Collage */}
            <div className={`relative z-10 my-auto w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-around gap-4 sm:gap-8 lg:gap-16 ${isGuestPreRegistration ? 'py-1 sm:py-3' : 'py-6 sm:py-10'}`}>
              {/* Left Side: Romantic Wedding Vows & Circled Date Stamp */}
              <div className={`order-2 lg:order-1 text-center lg:text-left max-w-md space-y-3 sm:space-y-6 animate-in fade-in slide-in-from-left-6 duration-1000 ${isGuestPreRegistration ? 'hidden md:block' : ''}`}>
                <p className="text-xs sm:text-base md:text-lg opacity-75 font-serif leading-relaxed italic">
                  &ldquo;Every single chapter written with love, laughter, and timeless devotion. A celebration of two hearts becoming one forever.&rdquo;
                </p>

                {/* Authentic Hand-Drawn Circled Date Stamp (From User Photo 1) */}
                <div className="flex justify-center lg:justify-start" style={{ color: designPalette.accentColor }}>
                  <HandDrawnOval>
                    <span className="text-sm sm:text-lg md:text-xl font-serif italic tracking-wide font-semibold" style={{ color: designPalette.accentColor }}>
                      {formattedDate}
                    </span>
                  </HandDrawnOval>
                </div>
              </div>

              {/* Right Side: The Tilted Polaroid Photo Card with Washi Tape */}
              <div className="order-1 lg:order-2 relative animate-in fade-in zoom-in-95 duration-1000">
                <div className={`relative bg-white p-2.5 sm:p-5 pb-6 sm:pb-12 shadow-[0_25px_60px_rgba(0,0,0,0.22)] border border-stone-200/80 transform rotate-2 sm:rotate-3 hover:rotate-0 transition-transform duration-700 ${isGuestPreRegistration ? 'w-44 sm:w-56 md:w-64 max-h-[50vh]' : 'w-64 sm:w-80 md:w-96'}`}>
                  {/* Frosted Translucent Washi Tape Across Top-Left Corner */}
                  <div className="absolute -top-3 sm:-top-5 left-3 sm:left-6 z-30">
                    <WashiTape className="transform -rotate-12" />
                  </div>

                  {/* Polaroid Photo with Focal Point & Auto Scale */}
                  <div className="w-full aspect-[4/5] bg-stone-900 overflow-hidden relative">
                    {cleanCoverUrl ? (
                      <>
                        <img
                          src={cleanCoverUrl}
                          alt={gallery.title}
                          className="hidden sm:block w-full h-full object-cover transition-transform duration-1000 hover:scale-103"
                          style={{
                            objectPosition: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                            transform: `scale(${coverPos.desktop.zoom / 100})`,
                          }}
                        />
                        <img
                          src={cleanCoverUrl}
                          alt={gallery.title}
                          className="block sm:hidden w-full h-full object-cover transition-transform duration-1000 hover:scale-103"
                          style={{
                            objectPosition: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                            transform: `scale(${coverPos.mobile.zoom / 100})`,
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full bg-stone-200" />
                    )}
                  </div>

                  {/* Bottom Polaroid Caption: Couple Title */}
                  <div className="pt-2 sm:pt-4 text-center">
                    <h1
                      className={`text-zinc-800 tracking-wide font-normal capitalize ${isGuestPreRegistration ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'}`}
                      style={{ fontFamily: headingFont }}
                    >
                      {gallery.title}
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Attribution & Navigation Scroll Arrow */}
            <div className="relative z-10 w-full pt-2 flex flex-col items-center justify-center space-y-1.5 text-center">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.28em] text-zinc-500">
                <span>GALLERY BY {studioName.toUpperCase()}</span>
                {totalPhotosCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{totalPhotosCount} PHOTOS</span>
                  </>
                )}
              </div>
              {renderHeroAction()}
            </div>
          </div>
        )}

        {/* PRESET 8: GRAND MAISON (Photo 2: High-Fashion Editorial Cover with Massive Overlapping Title) */}
        {designPreset === 'grand_maison' && (() => {
          const isCustomBg = designPalette.canvasBg && designPalette.canvasBg !== '#FAF9F5';
          const bgColor = isCustomBg ? designPalette.canvasBg : '#540B13';
          const textColor = isCustomBg ? designPalette.textColor : '#FAF7F2';

          return (
            <div
              className={`relative w-full flex flex-col justify-between items-center overflow-hidden px-4 sm:px-8 transition-colors duration-500 ${isGuestPreRegistration ? 'h-full min-h-0 flex-1 py-3 sm:py-4' : 'min-h-[88vh] sm:min-h-[96vh] py-6 sm:py-10'}`}
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {/* Top Spacing / Mobile Header Quote (Per user photo: text on top for mobile) */}
              <div className="w-full text-center">
                <div className="block md:hidden pt-1 pb-1">
                  <span className="text-[11px] sm:text-xs font-serif uppercase tracking-widest opacity-80 block">
                    Creating your timeless love story
                  </span>
                </div>
                <div className={`hidden md:block w-full ${isGuestPreRegistration ? 'h-2 sm:h-4' : 'h-4 sm:h-8'}`} />
              </div>

              {/* Centerpiece: Centered Vertical Portrait Artwork Flanked by Fine Art Quotes */}
              <div className="relative z-10 my-auto w-full max-w-6xl mx-auto flex items-center justify-center sm:justify-around px-2">
                {/* Left Fine Art Quote (Desktop only) */}
                <div className="hidden md:flex flex-col items-center text-center space-y-2 opacity-80 max-w-[180px] animate-in fade-in slide-in-from-left-4 duration-1000">
                  <span className="text-xs lg:text-sm font-serif uppercase tracking-widest leading-relaxed">
                    Creating your timeless love story
                  </span>
                  <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                </div>

                {/* Centered Vertical Portrait Frame (No heavy shadow per user request) */}
                <div className={`relative ${isGuestPreRegistration ? 'w-48 sm:w-64 md:w-80 max-h-[46vh] aspect-[3/4]' : 'w-64 sm:w-80 md:w-96 aspect-[3/4]'} overflow-hidden bg-stone-900 border border-white/20 animate-in fade-in zoom-in-95 duration-1000 shadow-xl`}>
                  {cleanCoverUrl ? (
                    <>
                      <img
                        src={cleanCoverUrl}
                        alt={gallery.title}
                        className="hidden sm:block w-full h-full object-cover transition-transform duration-1000 hover:scale-103"
                        style={{
                          objectPosition: `${coverPos.desktop.x}% ${coverPos.desktop.y}%`,
                          transform: `scale(${coverPos.desktop.zoom / 100})`,
                        }}
                      />
                      <img
                        src={cleanCoverUrl}
                        alt={gallery.title}
                        className="block sm:hidden w-full h-full object-cover transition-transform duration-1000 hover:scale-103"
                        style={{
                          objectPosition: `${coverPos.mobile.x}% ${coverPos.mobile.y}%`,
                          transform: `scale(${coverPos.mobile.zoom / 100})`,
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full bg-stone-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Right Fine Art Quote (Desktop only, completely removed on mobile per user request) */}
                <div className="hidden md:flex flex-col items-center text-center space-y-2 opacity-80 max-w-[180px] animate-in fade-in slide-in-from-right-4 duration-1000">
                  <span className="text-xs lg:text-sm font-serif uppercase tracking-widest leading-relaxed">
                    Fine art wedding photography &amp; film
                  </span>
                  <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                </div>
              </div>

              {/* Bottom Massive Haute-Couture Serif Typography (Overlapping lower 25-30% of portrait photo) */}
              <div className={`relative z-20 w-full text-center px-2 space-y-1 sm:space-y-2 ${isGuestPreRegistration ? '-mt-6 sm:-mt-10 md:-mt-14' : '-mt-14 sm:-mt-20 md:-mt-24 lg:-mt-28'}`}>
                <h1
                  className={`font-serif tracking-[0.1em] sm:tracking-[0.16em] uppercase font-normal drop-shadow-2xl leading-none animate-in fade-in slide-in-from-bottom-6 duration-1000 ${isGuestPreRegistration ? 'text-3xl sm:text-5xl md:text-6xl' : 'text-4xl sm:text-7xl md:text-8xl lg:text-9xl'}`}
                  style={{ fontFamily: headingFont }}
                >
                  {gallery.title}
                </h1>
                <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-mono tracking-widest uppercase opacity-75 pt-1">
                  <span>{formattedDate}</span>
                </div>
                {renderHeroAction()}
              </div>
            </div>
          );
        })()}

      </div>

      {/* 1.5 STICKY SUB-EVENTS HORIZONTAL BAR & MAIN CONTENT */}
      {!isGuestPreRegistration && (
        <>
          <div id="sub-events-bar" className="scroll-mt-14" />
          
          {/* 1.5 STICKY SUB-EVENTS HORIZONTAL BAR (GLOSSY LIQUID BLUR - SYNCED WITH PALETTE) */}
          <div
            className="sticky top-[52px] sm:top-[57px] z-30 transition-all backdrop-blur-xl border-y shadow-2xs"
            style={{
              backgroundColor: `${designPalette.canvasBg}F0`,
              borderColor: `${designPalette.textColor}18`,
              color: designPalette.textColor,
            }}
          >
        <div className="w-full px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 relative">
          {/* Left: Events Dropdown Button & Personalized Guest Badge */}
          <div className="flex items-center gap-2 shrink-0 z-40">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSubEventsDropdownOpen((prev) => !prev)}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: isSubEventsDropdownOpen ? designPalette.accentColor : `${designPalette.textColor}0D`,
                  color: isSubEventsDropdownOpen ? '#FFFFFF' : designPalette.textColor,
                  border: `1px solid ${designPalette.textColor}25`,
                }}
                title="Sub-Events Menu"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Events</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSubEventsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSubEventsDropdownOpen && (
                <div
                  ref={subEventsDropdownRef}
                  className="absolute left-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border py-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-2xl"
                  style={{
                    backgroundColor: designPalette.canvasBg,
                    borderColor: `${designPalette.textColor}25`,
                    color: designPalette.textColor,
                  }}
                >
                  <div
                    className="px-3.5 py-2 text-[10px] uppercase font-bold tracking-wider opacity-60 border-b flex items-center justify-between"
                    style={{ borderColor: `${designPalette.textColor}15` }}
                  >
                    <span>Select Event</span>
                    <span className="font-mono">({collections.length + 1})</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId('all');
                        setIsSubEventsDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer hover:bg-black/5 ${
                        selectedCollectionId === 'all' ? 'font-bold' : 'opacity-85'
                      }`}
                      style={selectedCollectionId === 'all' ? { color: designPalette.accentColor } : {}}
                    >
                      <span>All Photos</span>
                      <span className="text-[10px] opacity-60 font-mono">
                        ({isPrivilegedMode ? fullPhotos.length : matchedPhotos.length})
                      </span>
                    </button>

                    {collections.map((col) => {
                      const isSel = selectedCollectionId === col.id;
                      const count = isPrivilegedMode
                        ? (col.photo_count ?? fullPhotos.filter((p) => p.collection_id === col.id).length)
                        : matchedPhotos.filter((p) => p.collection_id === col.id).length;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setSelectedCollectionId(col.id);
                            setIsSubEventsDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer hover:bg-black/5 ${
                            isSel ? 'font-bold' : 'opacity-85'
                          }`}
                          style={isSel ? { color: designPalette.accentColor } : {}}
                        >
                          <span className="truncate">{col.name}</span>
                          <span className="text-[10px] opacity-60 font-mono ml-2">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Personalized Guest Badge + Instant ZIP Download (Only for Guest mode) */}
            {!isPrivilegedMode && guestName && (
              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-300">
                <div
                  className="px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/30"
                  title="Your Matched Photos"
                >
                  <span className="truncate max-w-[110px] sm:max-w-[140px]">👤 {guestName}</span>
                  <FaceAiFocusIcon className="w-3.5 h-3.5 text-white" />
                  {matchedPhotos.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-700 text-white">
                      {matchedPhotos.length}
                    </span>
                  )}
                </div>

                {matchedPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllMyPhotos}
                    disabled={isDownloadingAll}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    title="Download All My Photos (ZIP)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download ZIP</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sub-Events Horizontal Scrollable Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 scroll-smooth flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedCollectionId('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer shrink-0 shadow-2xs ${
                selectedCollectionId === 'all' ? 'font-black' : 'opacity-70 hover:opacity-100'
              }`}
              style={
                selectedCollectionId === 'all'
                  ? { backgroundColor: designPalette.accentColor, color: '#FFFFFF' }
                  : { backgroundColor: `${designPalette.textColor}0D`, color: designPalette.textColor }
              }
            >
              All Photos ({isPrivilegedMode ? fullPhotos.length : matchedPhotos.length})
            </button>
            {collections.map((col) => {
              const isSel = selectedCollectionId === col.id;
              const count = isPrivilegedMode
                ? (col.photo_count ?? fullPhotos.filter((p) => p.collection_id === col.id).length)
                : matchedPhotos.filter((p) => p.collection_id === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer shrink-0 shadow-2xs ${
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

          {/* Right side: Action buttons with explicit text labels */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {!isPrivilegedMode && gallery.is_face_ai_enabled !== false && (
              <button
                type="button"
                onClick={() => setIsFaceScannerOpen(true)}
                title="AI Face Search / My Photos"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: `${designPalette.textColor}0A`,
                  borderColor: `${designPalette.textColor}25`,
                  color: designPalette.textColor,
                }}
              >
                <FaceAiFocusIcon className="w-3.5 h-3.5" />
                <span>My Photos</span>
              </button>
            )}

            {isPrivilegedMode && !isUnlocked && (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                title="Enter PIN to unlock private photos"
                className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: `${designPalette.textColor}0A`,
                  borderColor: `${designPalette.textColor}25`,
                  color: designPalette.textColor,
                }}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private Photos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadAllPhotosTrigger}
              title="Download Photos"
              disabled={isDownloadingAll}
              className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: `${designPalette.textColor}0A`,
                borderColor: `${designPalette.textColor}25`,
                color: designPalette.textColor,
              }}
            >
              {isDownloadingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleShareClick}
              title="Share Gallery Link"
              className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
              style={{
                backgroundColor: `${designPalette.textColor}0A`,
                borderColor: `${designPalette.textColor}25`,
                color: designPalette.textColor,
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
      
      <div id="gallery-content" className="scroll-mt-14" />
      {/* 2. MAIN CONTENT AREA (Generous top padding below sticky bar) */}
      <div className="max-w-[1550px] mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-8 relative z-10 space-y-8">

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

        {/* CASE B: PUBLISHED GUEST VIEW (STRICT PRIVACY: ONLY MATCHED PHOTOS) */}
        {(!isPrivilegedMode && hasSearched && currentGalleryStatus === 'PUBLISHED') && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Control Bar: Guest Badge & Live Sync */}
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-[#E7E2D8] shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 text-xs font-bold text-amber-900 shadow-2xs">
                  👤 {guestName || 'Guest'}
                </span>
                <button
                  type="button"
                  onClick={handleSwitchGuest}
                  className="text-xs text-amber-700 hover:text-amber-900 underline cursor-pointer font-bold"
                  title="Switch guest or scan someone else"
                >
                  (Switch)
                </button>
              </div>

              <div className="flex items-center gap-2">
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

            {/* GUEST PHOTOS VIEW */}
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

                  {/* Matched Photos Grid (filtered by selected sub-event / collection) */}
                  <JustifiedGalleryLayout
                    photos={displayedPhotos}
                    layoutConfig={layoutConfig}
                    onPhotoClick={(photo, idx) => setSelectedPhotoIndex(idx)}
                    onDownloadPhoto={handleDownloadPhoto}
                  />
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
                      We scanned the celebration photos and couldn&apos;t detect a clear match for your selfie yet. Please re-scan with a clearer selfie or different lighting.
                    </p>
                  </div>

                  <div className="flex items-center justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFaceScannerOpen(true)}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Re-scan Selfie</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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

            {/* Privileged Full Photo Grid (Justified / Responsive Masonry) */}
            <JustifiedGalleryLayout
              photos={displayedPhotos}
              layoutConfig={layoutConfig}
              isSelectionMode={isSelectionMode}
              selectedForAlbum={selectedForAlbum}
              isSelectionSubmitted={isSelectionSubmitted}
              effectiveMaxSelectionLimit={effectiveMaxSelectionLimit}
              selectorEmail={selectorEmail}
              onRequestSelectorModal={() => setShowSelectorModal(true)}
              onPhotoClick={(photo, idx) => {
                // Clicking on photo card ALWAYS opens the high-resolution lightbox viewer
                setSelectedPhotoIndex(idx);
              }}
              onToggleSelect={(photo) => {
                // ONLY clicking the heart icon toggles album selection / deselection
                if (isSelectionSubmitted) return;
                if (!selectorEmail) {
                  setShowSelectorModal(true);
                  return;
                }
                const next = new Set(selectedForAlbum);
                if (selectedForAlbum.has(photo.id)) {
                  next.delete(photo.id);
                } else {
                  if (effectiveMaxSelectionLimit && next.size >= effectiveMaxSelectionLimit) {
                    alert(`You can select up to a maximum of ${effectiveMaxSelectionLimit} photos. Please unselect another photo to choose this one.`);
                    return;
                  }
                  next.add(photo.id);
                }
                setSelectedForAlbum(next);
                syncSelectionToBackend(next, selectorName, selectorEmail);
              }}
              onDownloadPhoto={handleDownloadPhoto}
            />

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
        </>
      )}

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

      {/* FLOATING ALBUM SELECTION BOTTOM DOCK (LUXURY PALETTE) */}
      {isSelectionMode && isUnlocked && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 bg-[#FAF9F5]/98 backdrop-blur-xl text-zinc-900 rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isSelectionSubmitted
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {isSelectionSubmitted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Heart className="w-5 h-5 fill-rose-600 text-rose-600 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                  {isSelectionSubmitted ? 'Selection Locked' : 'Album Selection'}
                </span>
                {effectiveMaxSelectionLimit && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    Limit: {effectiveMaxSelectionLimit}
                  </span>
                )}
                {isSyncingSelection ? (
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span title="Cloud Synced"><Cloud className="w-3.5 h-3.5 text-zinc-400" /></span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                <span>
                  Selected <strong className="text-zinc-900 text-sm font-black">{selectedForAlbum.size}</strong>
                  {effectiveMaxSelectionLimit ? ` / ${effectiveMaxSelectionLimit}` : ''} photos
                </span>
                {selectorEmail && (
                  <span className="text-zinc-400 hidden sm:inline">
                    • for <strong className="text-zinc-700">{selectorName || selectorEmail}</strong>
                    {!isSelectionSubmitted && (
                      <button
                        type="button"
                        onClick={handleSwitchSelector}
                        className="text-amber-700 hover:text-amber-800 underline ml-1.5 cursor-pointer font-bold text-[11px]"
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
                  : 'bg-white text-zinc-700 border border-[#E7E2D8] hover:bg-[#F2EEE6]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showOnlySelected ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-98"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Selection</span>
              </button>
            ) : (
              <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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

      {/* 5. IMMERSIVE LUXURY FOOTER OR MINIMAL GUEST FOOTER */}
      {isGuestPreRegistration ? (
        <footer
          className="shrink-0 w-full py-2.5 sm:py-3.5 text-center text-[10px] sm:text-[11px] space-y-0.5 relative z-20 border-t backdrop-blur-md"
          style={{
            borderColor: `${designPalette.textColor}15`,
            color: designPalette.textColor,
            backgroundColor: `${designPalette.canvasBg}E6`,
          }}
        >
          <p className="opacity-75">
            &copy; {new Date().getFullYear()} {studioName}. All Rights Reserved.
          </p>
          <p className="opacity-60 text-[9px] sm:text-[10px]">
            Powered by{' '}
            <a
              href="https://studiocore.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:opacity-100 transition-opacity"
            >
              StudioCore.in
            </a>
          </p>
        </footer>
      ) : (
        <footer
          className="mt-20 border-t py-12 px-4 sm:px-8 transition-colors duration-500"
          style={{
            backgroundColor: designPalette.canvasBg,
            color: designPalette.textColor,
            borderColor: `${designPalette.textColor}15`,
          }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              {studioLogo ? (
                <img
                  src={studioLogo}
                  alt={studioName}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-black/10 mx-auto shadow-sm"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full font-serif font-black flex items-center justify-center text-base shadow-sm mx-auto"
                  style={{
                    backgroundColor: designPalette.accentColor,
                    color: '#FFFFFF',
                  }}
                >
                  {studioName.charAt(0).toUpperCase()}
                </div>
              )}
              <h3
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ fontFamily: headingFont }}
              >
                {studioName}
              </h3>
              <p className="text-xs sm:text-sm opacity-70 italic max-w-md mx-auto">
                {studioSubtitle}
              </p>
            </div>

            {/* Social Media Links - Horizontal Row of Pure Vector Icons */}
            {(studioPhone || instagramHandle || facebookHandle || youtubeHandle || studioEmail) && (
              <div className="flex items-center justify-center gap-3 pt-2">
                {/* WhatsApp */}
                {socialVisibility?.whatsapp !== false && studioPhone && (
                  <a
                    href={`https://wa.me/${studioPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    style={{
                      borderColor: `${designPalette.textColor}25`,
                      color: designPalette.textColor,
                      backgroundColor: `${designPalette.textColor}08`,
                    }}
                    title="WhatsApp"
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>
                )}

                {/* Instagram */}
                {socialVisibility?.instagram !== false && instagramHandle && (
                  <a
                    href={instagramHandle.startsWith('http') ? instagramHandle : `https://instagram.com/${instagramHandle.replace('@', '').trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    style={{
                      borderColor: `${designPalette.textColor}25`,
                      color: designPalette.textColor,
                      backgroundColor: `${designPalette.textColor}08`,
                    }}
                    title="Instagram"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                )}

                {/* Facebook */}
                {socialVisibility?.facebook !== false && facebookHandle && (
                  <a
                    href={facebookHandle.startsWith('http') ? facebookHandle : `https://facebook.com/${facebookHandle.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    style={{
                      borderColor: `${designPalette.textColor}25`,
                      color: designPalette.textColor,
                      backgroundColor: `${designPalette.textColor}08`,
                    }}
                    title="Facebook"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                )}

                {/* YouTube */}
                {socialVisibility?.youtube !== false && youtubeHandle && (
                  <a
                    href={youtubeHandle.startsWith('http') ? youtubeHandle : `https://youtube.com/${youtubeHandle.startsWith('@') ? youtubeHandle : `@${youtubeHandle}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    style={{
                      borderColor: `${designPalette.textColor}25`,
                      color: designPalette.textColor,
                      backgroundColor: `${designPalette.textColor}08`,
                    }}
                    title="YouTube"
                    aria-label="YouTube"
                  >
                    <YoutubeIcon className="w-4 h-4" />
                  </a>
                )}

                {/* Email */}
                {studioEmail && (
                  <a
                    href={`mailto:${studioEmail}`}
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                    style={{
                      borderColor: `${designPalette.textColor}25`,
                      color: designPalette.textColor,
                      backgroundColor: `${designPalette.textColor}08`,
                    }}
                    title="Email"
                    aria-label="Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            <div
              className="pt-4 border-t text-[11px] space-y-1 transition-colors"
              style={{
                borderColor: `${designPalette.textColor}18`,
                color: designPalette.textColor,
              }}
            >
              <p className="opacity-75">
                &copy; {new Date().getFullYear()} {studioName}. All Rights Reserved.
              </p>
              <p className="opacity-60 text-[10px]">
                Powered by{' '}
                <a
                  href="https://studiocore.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:opacity-100 transition-opacity"
                >
                  StudioCore.in
                </a>
              </p>
            </div>
          </div>
        </footer>
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

      {/* 6.4 DOWNLOAD SELECTION MODAL (All Photos vs Sub-Events) */}
      <DownloadSelectionModal
        isOpen={isDownloadSelectModalOpen}
        onClose={() => setIsDownloadSelectModalOpen(false)}
        albumTitle={gallery?.title || 'Wedding Gallery'}
        totalPhotosCount={fullPhotos.length}
        collections={collections}
        onConfirmDownload={handleConfirmDownloadSelection}
        accentColor={designPalette.accentColor}
      />

      {/* 6.5 CLIENT-SIDE ORIGINAL HIGH-RES ZIP DOWNLOAD FLOATING WIDGET */}
      <ZipDownloadModal
        isOpen={isZipModalOpen}
        albumTitle={gallery?.title || 'Wedding Gallery'}
        progress={zipProgress}
        onCancel={handleCancelZipDownload}
        accentColor={designPalette.accentColor}
      />

      {/* 7. MOBILE APP-LIKE STICKY BOTTOM BAR (sm:hidden) */}
      {!isGuestPreRegistration && (
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-black/10 py-1.5 px-3 shadow-lg flex items-center justify-around sm:hidden transition-transform duration-300"
          style={{
            backgroundColor: `${designPalette.canvasBg}F5`,
            borderColor: `${designPalette.textColor}1A`,
            color: designPalette.textColor,
          }}
        >
          <button
            type="button"
            onClick={handleShareClick}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition active:scale-90"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {!isPrivilegedMode && gallery.is_face_ai_enabled !== false && (
            <button
              type="button"
              onClick={() => setIsFaceScannerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-amber-700 transition active:scale-90"
            >
              <FaceAiFocusIcon className="w-4 h-4" />
              <span>My Photos</span>
            </button>
          )}

          {isPrivilegedMode && !isUnlocked && (
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition active:scale-90"
            >
              <Lock className="w-4 h-4" />
              <span>Private</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadAllPhotosTrigger}
            disabled={isDownloadingAll}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition active:scale-90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>

          {isSelectionMode && (
            <button
              type="button"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition active:scale-90 ${
                showOnlySelected ? 'text-rose-600 font-bold' : 'text-zinc-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${selectedForAlbum.size > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>Selected ({selectedForAlbum.size})</span>
            </button>
          )}
        </nav>
      )}

      {/* Floating Scroll-to-Top Button */}
      {!isGuestPreRegistration && showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-white/90 text-zinc-900 shadow-xl border border-black/10 flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

    </div>
  );
}

export default function GuestSlugGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-between p-8 select-none">
          <div className="w-full flex justify-center pt-8" />
          <div className="flex flex-col items-center text-center space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full border-2 border-amber-600/20 border-t-amber-600 animate-spin" />
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-400 font-semibold">
                Opening Gallery
              </span>
            </div>
          </div>
          <div className="pb-4 text-center">
            <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              Powered by <span className="font-bold text-zinc-700">StudioCore.in</span>
            </p>
          </div>
        </div>
      }
    >
      <GuestSlugGalleryContent />
    </Suspense>
  );
}

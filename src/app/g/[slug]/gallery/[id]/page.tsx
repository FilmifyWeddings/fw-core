'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
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
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoItem[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Lightbox & Selection State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedForAlbum, setSelectedForAlbum] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

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
      const requiredPin = isSelectionMode
        ? (gal.admin_pin || gal.pin_code)
        : (gal.guest_pin || gal.pin_code);

      const passedKey = isSelectionMode ? passKeyParam : shareKeyParam;

      const hasValidPin =
        isVipMode ||
        !requiredPin ||
        passedKey === requiredPin ||
        (typeof window !== 'undefined' && sessionStorage.getItem(`unlocked_${gal.id}`) === 'true');

      if (hasValidPin) {
        setIsUnlocked(true);
      }

      // ONLY fetch full collections & photos if in PRIVILEGED mode and UNLOCKED
      if (isPrivilegedMode && hasValidPin) {
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
      // 1. Register Guest in CRM in background (non-blocking)
      try {
        fetch('/api/gallery/guest/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gallery_id: gallery.id,
            guest_name: data.name,
            guest_phone: data.phone,
            guest_email: data.email,
            selfieBase64: data.selfieBase64,
          }),
        }).catch(() => {});
      } catch (regErr) {
        console.warn('Guest registration background error:', regErr);
      }

      // 2. Perform Neural Vector Match
      const res = await fetch('/api/gallery/match-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          galleryId: gallery.id,
          selfieBase64: data.selfieBase64,
          threshold: 0.38,
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

  // Compute Active Render List
  const displayedPhotos = isPrivilegedMode && isUnlocked
    ? (selectedCollectionId === 'all'
        ? fullPhotos
        : fullPhotos.filter((p) => p.collection_id === selectedCollectionId))
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
                Your Wedding Memories Await
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                To respect guest privacy, photos are locked. Take a quick selfie, and our AI will instantly find and display all your photos on screen.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsFaceScannerOpen(true)}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-sm tracking-wide shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2.5 mx-auto transition-all active:scale-98 cursor-pointer group"
              >
                <Camera className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>Find My Photos (Scan Face)</span>
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

        {/* CASE B1: MATCHED PHOTOS FOUND */}
        {(!isPrivilegedMode && hasSearched && matchedPhotos.length > 0) && (
          <div className="space-y-6">
            
            {/* Matched Header Bar */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                    ✓ Face Verified
                  </span>
                  <span className="text-xs font-bold text-zinc-500">
                    {guestName || 'Guest'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>🎉 Found {matchedPhotos.length} photos of you!</span>
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
                  <span>{isDownloadingAll ? 'Downloading...' : 'Download All Photos'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFaceScannerOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-zinc-100 text-zinc-700 border border-[#E7E2D8] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Again</span>
                </button>
              </div>
            </div>

            {/* Strict Matched Photos Justified Multi-Column Grid */}
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3.5 space-y-3.5">
              {matchedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className="group relative break-inside-avoid rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 border border-[#E7E2D8] shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={photo.thumbnail_url || photo.preview_url}
                    alt="Matched Photo"
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Badges Top Right */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    {photo.confidencePercent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-[10px] font-black text-emerald-300 border border-emerald-500/40">
                        {photo.confidencePercent}% Match
                      </span>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono text-zinc-300">
                      Photo #{idx + 1}
                    </span>

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
              ))}
            </div>

          </div>
        )}

        {/* CASE B2: NO MATCHES FOUND IN PROCESSED ALBUM */}
        {(!isPrivilegedMode && hasSearched && matchedPhotos.length === 0) && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E7E2D8] shadow-sm text-center space-y-5 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900">
                No Matching Photos Found
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                We couldn&apos;t find clear matches for this selfie in this album. Try capturing another close-up photo in brighter lighting.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFaceScannerOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs transition cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Again with Better Light</span>
            </button>
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
                    <img
                      src={photo.thumbnail_url || photo.preview_url}
                      alt="Wedding photo"
                      loading="lazy"
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

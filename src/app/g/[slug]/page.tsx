'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Camera,
  Sparkles,
  Play,
  Pause,
  Download,
  Share2,
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
  FileCheck,
  Copy,
  Check,
} from 'lucide-react';
import { getPublicGalleryUrl } from '@/lib/r2';

interface PhotoItem {
  id: string;
  gallery_id: string;
  preview_url: string;
  thumbnail_url: string;
  original_key: string;
  width: number;
  height: number;
  face_count: number;
  similarity?: number;
  confidencePercent?: number;
}

interface GalleryInfo {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  pin_code: string | null;
  cover_url: string | null;
  allow_downloads: boolean;
}

export default function GuestGalleryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const mode = searchParams?.get('mode') || 'guest'; // 'guest' | 'all' | 'selection' | 'vip'

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN Protection State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Face Matching State
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoItem[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'matched'>(mode === 'guest' ? 'all' : 'all');
  const [cameraActive, setCameraActive] = useState(false);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);

  // Album Selection Mode State
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [copiedSelection, setCopiedSelection] = useState(false);

  // Lightbox State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Slideshow State
  const [isSlideshow, setIsSlideshow] = useState(false);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Video Camera Stream Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Fetch Gallery Data & Photos
  const loadGalleryData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const gRes = await fetch(`/api/gallery/events?slug=${slug}`);
      const gJson = await gRes.json();
      if (!gJson.success || !gJson.gallery) {
        setError('Gallery not found or inactive');
        setLoading(false);
        return;
      }

      const gal = gJson.gallery;
      setGallery(gal);

      // If VIP mode, or no PIN code, or unlocked in session -> unlock immediately
      if (mode === 'vip' || !gal.pin_code || sessionStorage.getItem(`gallery_unlocked_${gal.id}`) === 'true') {
        setIsUnlocked(true);
      }

      // Fetch photos
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${gal.id}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setPhotos(pJson.photos);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [slug, mode]);

  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

  // Handle PIN Unlock
  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery) return;

    if (gallery.pin_code && enteredPin.trim() === gallery.pin_code.trim()) {
      setIsUnlocked(true);
      setPinError(false);
      sessionStorage.setItem(`gallery_unlocked_${gallery.id}`, 'true');
    } else {
      setPinError(true);
    }
  };

  // Camera Management
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capture Selfie from Camera
  const captureSelfieAndMatch = async () => {
    if (!videoRef.current || !gallery) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    await performFaceMatch(base64);
  };

  // Handle File Upload Selfie
  const handleUploadSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gallery) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await performFaceMatch(base64);
    };
    reader.readAsDataURL(file);
  };

  // Perform Face Match API Request
  const performFaceMatch = async (selfieBase64: string) => {
    if (!gallery) return;
    setIsMatching(true);
    setMatchNotice('Analyzing your face and searching wedding photos...');

    try {
      const res = await fetch('/api/gallery/face-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId: gallery.id,
          selfieBase64,
          similarityThreshold: 0.50,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.matches)) {
        const matchMap = new Map(json.matches.map((m: any) => [m.photoId, m]));
        
        const matched = photos
          .filter(p => matchMap.has(p.id))
          .map(p => {
            const m = matchMap.get(p.id) as any;
            return {
              ...p,
              similarity: m?.similarity,
              confidencePercent: m?.confidencePercent,
            };
          })
          .sort((a, b) => (b.confidencePercent || 0) - (a.confidencePercent || 0));

        setMatchedPhotos(matched);
        setActiveFilter('matched');
        setIsFaceModalOpen(false);

        if (matched.length > 0) {
          setMatchNotice(`🎉 Found ${matched.length} photos of you!`);
        } else {
          setMatchNotice('No matching photos found with your selfie. Showing all gallery photos.');
          setActiveFilter('all');
        }
      } else {
        alert(json.error || 'Face match failed');
      }
    } catch (err: any) {
      alert(`Error during face search: ${err.message}`);
    } finally {
      setIsMatching(false);
    }
  };

  // Download High-Res Original from R2
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    setDownloadingId(photo.id);
    try {
      const res = await fetch('/api/gallery/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalKey: photo.original_key, previewKey: photo.preview_url }),
      });
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const a = document.createElement('a');
        a.href = json.downloadUrl;
        a.download = `wedding_photo_${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(photo.preview_url, '_blank');
      }
    } catch (err) {
      window.open(photo.preview_url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  // Toggle Selection in Selection Mode
  const togglePhotoSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayedPhotos = activeFilter === 'matched' && matchedPhotos.length > 0 ? matchedPhotos : photos;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center space-y-4 p-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
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
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-zinc-900">Gallery Not Available</h1>
        <p className="text-xs text-zinc-500 max-w-sm">{error || 'This wedding gallery is not currently active.'}</p>
      </div>
    );
  }

  // PIN Protection Gate
  if (!isUnlocked && gallery.pin_code && mode !== 'vip') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-[#E7E2D8] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Private Wedding Gallery
            </span>
            <h2 className="text-xl font-black text-zinc-900 pt-2 tracking-tight">
              {gallery.title}
            </h2>
            <p className="text-xs text-zinc-500 font-serif italic">
              Please enter the 4-digit PIN code provided on your table standee.
            </p>
          </div>

          <form onSubmit={handleUnlockWithPin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Enter PIN Code"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 bg-[#FBF9F5] rounded-2xl border border-zinc-300 focus:bg-white focus:outline-hidden focus:border-amber-500"
              />
              {pinError && (
                <p className="text-xs font-bold text-rose-600 mt-2">Incorrect PIN code. Please try again.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Unlock Gallery</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans pb-32 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          1. LUXURY WEDDING HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative bg-zinc-900 text-white overflow-hidden">
        {gallery.cover_url ? (
          <img
            src={gallery.cover_url}
            alt={gallery.title}
            className="w-full h-72 sm:h-96 object-cover opacity-50 filter brightness-75 scale-105"
          />
        ) : (
          <div className="w-full h-72 sm:h-96 bg-gradient-to-b from-zinc-800 to-zinc-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F5] via-black/40 to-black/70" />

        {/* Hero Text & Controls */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-12 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/20">
              ✨ StudioCore AI Gallery
            </span>

            {mode === 'vip' && (
              <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                <Crown className="w-3 h-3" />
                <span>VIP Direct Access</span>
              </span>
            )}
          </div>

          <div className="text-center space-y-2 max-w-2xl mx-auto pb-4">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {gallery.title}
            </h1>
            <p className="text-xs sm:text-sm font-serif italic text-amber-200/90 tracking-wide">
              {new Date(gallery.event_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })} • {photos.length} Captured Moments
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING ACTION CONTROLS & FACE AI SEARCH BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8 relative z-20 space-y-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E7E2D8] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">Find Yourself in this Wedding</h3>
              <p className="text-xs text-zinc-500">Take a quick selfie to filter and download all photos of you</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsFaceModalOpen(true);
              startCamera();
            }}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Find My Photos (AI)</span>
          </button>
        </div>

        {/* Filter Pills */}
        {matchedPhotos.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Personalized AI Match: {matchedPhotos.length} photos found of you!</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('matched')}
                className={'px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ' + (
                  activeFilter === 'matched' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-900 border border-emerald-200'
                )}
              >
                ✨ My Photos ({matchedPhotos.length})
              </button>

              <button
                onClick={() => setActiveFilter('all')}
                className={'px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ' + (
                  activeFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-900 border border-emerald-200'
                )}
              >
                All Photos ({photos.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. RESPONSIVE MASONRY PHOTO GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {displayedPhotos.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-zinc-200 space-y-3">
            <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto" />
            <h3 className="text-base font-bold text-zinc-700">No Photos Found</h3>
            <p className="text-xs text-zinc-400">Photos will appear here as soon as they are uploaded.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {displayedPhotos.map((photo, idx) => {
              const isFav = favorites.has(photo.id);
              const isSelected = selectedPhotos.has(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (mode === 'selection') {
                      togglePhotoSelection(photo.id);
                    } else {
                      setSelectedPhotoIndex(idx);
                    }
                  }}
                  className={'break-inside-avoid relative rounded-2xl overflow-hidden bg-zinc-100 border shadow-2xs group cursor-pointer hover:shadow-lg transition-all ' + (
                    isSelected ? 'ring-4 ring-purple-500 border-purple-500' : 'border-zinc-200/80'
                  )}
                >
                  <img
                    src={photo.thumbnail_url}
                    alt="Wedding memory"
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-103 transition-transform duration-300"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Similarity Badge */}
                  {photo.confidencePercent && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md">
                      {photo.confidencePercent}% Match
                    </div>
                  )}

                  {/* Selection Mode Checkbox */}
                  {mode === 'selection' && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-md">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-purple-400 fill-purple-400" />
                      ) : (
                        <Square className="w-5 h-5 text-white" />
                      )}
                    </div>
                  )}

                  {/* Quick Action Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <button
                      onClick={(e) => toggleFavorite(photo.id, e)}
                      className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition cursor-pointer"
                    >
                      <Heart className={'w-4 h-4 ' + (isFav ? 'fill-rose-500 text-rose-500' : 'text-white')} />
                    </button>

                    {gallery.allow_downloads && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPhoto(photo);
                        }}
                        className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition cursor-pointer"
                        title="Download High-Res Original"
                      >
                        <Download className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SELECTION MODE FLOATING BOTTOM TRAY
      ───────────────────────────────────────────────────────────── */}
      {mode === 'selection' && (
        <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-40 bg-zinc-900/95 backdrop-blur-md text-white rounded-3xl p-4 shadow-2xl border border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
              {selectedPhotos.size}
            </div>
            <div>
              <p className="text-xs font-black">Photos Selected</p>
              <p className="text-[10.5px] text-zinc-400">For Album Printing</p>
            </div>
          </div>

          <button
            disabled={selectedPhotos.size === 0}
            onClick={() => {
              const list = Array.from(selectedPhotos).join('\n');
              navigator.clipboard.writeText(`Selected Photos for ${gallery.title}:\n${list}`);
              setCopiedSelection(true);
              setTimeout(() => setCopiedSelection(false), 2500);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedSelection ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSelection ? 'Copied List' : 'Export Selection'}</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. "FIND MY PHOTOS" FACE AI MODAL
      ───────────────────────────────────────────────────────────── */}
      {isFaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl text-center space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-zinc-900">AI Selfie Photo Finder</h3>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setIsFaceModalOpen(false);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isMatching ? (
              <div className="space-y-5">
                {cameraActive ? (
                  <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-amber-500 shadow-xl bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full animate-spin pointer-events-none" style={{ animationDuration: '8s' }} />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-full bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center mx-auto text-amber-800 space-y-2">
                    <Camera className="w-12 h-12 text-amber-500" />
                    <span className="text-xs font-bold">Align your face inside</span>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-700">
                    {cameraActive ? 'Look straight into the camera and snap!' : 'Take a selfie or select from your gallery'}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Your photo is processed privately to find your matching moments.
                  </p>
                </div>

                <div className="space-y-2">
                  {cameraActive ? (
                    <button
                      onClick={captureSelfieAndMatch}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 Snap Selfie &amp; Search</span>
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Open Camera</span>
                    </button>
                  )}

                  <label className="w-full py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload from Phone Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadSelfie}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-zinc-900">Scanning Faces with pgvector...</h4>
                  <p className="text-xs text-zinc-500">{matchNotice || 'Searching wedding photos in sub-second speed'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. LIGHTBOX MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedPhotoIndex !== null && displayedPhotos[selectedPhotoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between text-white p-4 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">
                {selectedPhotoIndex + 1} of {displayedPhotos.length}
              </span>
              {displayedPhotos[selectedPhotoIndex].confidencePercent && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {displayedPhotos[selectedPhotoIndex].confidencePercent}% AI Match
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {gallery.allow_downloads && (
                <button
                  disabled={downloadingId === displayedPhotos[selectedPhotoIndex].id}
                  onClick={() => handleDownloadPhoto(displayedPhotos[selectedPhotoIndex])}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original</span>
                </button>
              )}

              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <img
              src={displayedPhotos[selectedPhotoIndex].preview_url}
              alt="Fullscreen"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
            />

            {displayedPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedPhotoIndex(prev => (prev! === 0 ? displayedPhotos.length - 1 : prev! - 1))}
                  className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setSelectedPhotoIndex(prev => (prev! === displayedPhotos.length - 1 ? 0 : prev! + 1))}
                  className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

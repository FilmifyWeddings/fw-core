'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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
} from 'lucide-react';
import { getPublicGalleryUrl } from '@/lib/r2';

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
}

function StrictGuestGalleryContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const galleryIdOrSlug = (params?.id || params?.slug) as string;

  // Search parameters for access modes
  const isFullAccess = searchParams?.get('access') === 'all';
  const isSelectionMode = searchParams?.get('album_selection') === 'true';
  const isVipMode = searchParams?.get('vip-link') === '1';
  const personParam = searchParams?.get('person');
  const passKeyParam = searchParams?.get('pass_key');
  const shareKeyParam = searchParams?.get('share_key');

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [fullPhotos, setFullPhotos] = useState<PhotoItem[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN / PassKey Protection State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Guest Face Search & Registration State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoItem[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);

  // Lightbox State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isStrictGuestMode = !isFullAccess && !isSelectionMode && !isVipMode;

  // 1. Fetch Gallery Info & Photos
  const loadGalleryData = useCallback(async () => {
    if (!galleryIdOrSlug) return;
    setLoading(true);
    setError(null);

    try {
      let gal: any = null;
      try {
        const gRes = await fetch(`/api/gallery/events?id=${galleryIdOrSlug}`);
        const gJson = await gRes.json();
        gal = gJson.gallery;
      } catch (_) {}

      if (!gal) {
        const slugRes = await fetch(`/api/gallery/events?slug=${galleryIdOrSlug}`);
        const slugJson = await slugRes.json();
        gal = slugJson.gallery;
      }

      if (!gal) {
        setError('This wedding gallery was not found or is currently private.');
        setLoading(false);
        return;
      }

      setGallery(gal);

      // Check unlock permissions
      const requiredPin = isSelectionMode
        ? (gal.admin_pin || gal.pin_code)
        : (gal.guest_pin || gal.pin_code);

      const passedKey = isSelectionMode ? passKeyParam : shareKeyParam;

      if (
        isVipMode ||
        !requiredPin ||
        passedKey === requiredPin ||
        sessionStorage.getItem(`unlocked_${gal.id}`) === 'true'
      ) {
        setIsUnlocked(true);
      }

      // Fetch Collections
      try {
        const cRes = await fetch(`/api/gallery/collections?gallery_id=${gal.id}`);
        const cJson = await cRes.json();
        if (cJson.success && Array.isArray(cJson.collections)) {
          setCollections(cJson.collections);
        }
      } catch (_) {}

      // Fetch Photos
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${gal.id}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setFullPhotos(pJson.photos);

        // Load People Clusters for Google Photos bar
        try {
          const peopleRes = await fetch(`/api/gallery/people?gallery_id=${gal.id}`);
          const peopleJson = await peopleRes.json();
          if (peopleJson.success && Array.isArray(peopleJson.people)) {
            setPeople(peopleJson.people);

            // If personParam is provided in URL
            if (personParam) {
              const matchedP = peopleJson.people.find((p: any) => p.id === personParam);
              if (matchedP && Array.isArray(matchedP.photo_ids)) {
                const photoSet = new Set(matchedP.photo_ids);
                const matched = pJson.photos.filter((ph: any) => photoSet.has(ph.id));
                if (matched.length > 0) {
                  setMatchedPhotos(matched);
                  setMatchNotice(`🎉 Welcome! Here are your ${matched.length} photos from ${gal.title}.`);
                }
              }
            }
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Error loading guest gallery:', err);
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [galleryIdOrSlug, isSelectionMode, passKeyParam, shareKeyParam, isVipMode, isStrictGuestMode, personParam]);

  useEffect(() => {
    loadGalleryData();
  }, [loadGalleryData]);

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

  // Perform Real InsightFace ArcFace Neural Match
  const performFaceMatch = async (base64: string) => {
    if (!gallery) return;
    setIsMatching(true);
    setMatchNotice('AI is searching your face across all photos in milliseconds...');

    try {
      // 1. If guest details are provided, register them into Supabase
      if (guestName.trim() && guestPhone.trim()) {
        try {
          await fetch('/api/gallery/guest/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gallery_id: gallery.id,
              guest_name: guestName.trim(),
              guest_phone: guestPhone.trim(),
              guest_email: guestEmail.trim() || undefined,
              selfieBase64: base64,
            }),
          });
        } catch (_) {}
      }

      // 2. Perform deep vector face match
      const res = await fetch('/api/gallery/match-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId: gallery.id,
          selfieBase64: base64,
          threshold: 0.38,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.photos)) {
        setMatchedPhotos(json.photos);
        setIsFaceModalOpen(false);

        if (json.photos.length > 0) {
          setMatchNotice(`🎉 Found ${json.photos.length} photos of ${guestName.trim() || 'you'}!`);
        } else {
          setMatchNotice(
            guestPhone.trim()
              ? `Registration saved, ${guestName || 'Guest'}! Your personalized album link will be sent to WhatsApp (${guestPhone}) as soon as more photos are processed.`
              : 'No matching photos found with this selfie yet. Try taking a clear, well-lit selfie!'
          );
        }
      } else {
        alert(json.error || 'Face match failed');
      }
    } catch (err: any) {
      alert(`Face search error: ${err.message}`);
    } finally {
      setIsMatching(false);
    }
  };

  // Download High-Res Original from R2
  const handleDownloadPhoto = async (photo: PhotoItem) => {
    setDownloadingId(photo.id);
    try {
      const res = await fetch(`/api/gallery/download-url?key=${encodeURIComponent(photo.original_key || photo.preview_url)}&name=wedding_${photo.id}.jpg`);
      const json = await res.json();
      if (json.success && json.downloadUrl) {
        const a = document.createElement('a');
        a.href = json.downloadUrl;
        a.download = `wedding_${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(photo.preview_url, '_blank');
      }
    } catch (_) {
      window.open(photo.preview_url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const displayedPhotos = matchedPhotos.length > 0 ? matchedPhotos : fullPhotos;

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

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 font-sans pb-32 select-none">
      
      {/* 1. LUXURY WEDDING HERO BANNER */}
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

        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-12 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/20">
              ✨ StudioCore AI Gallery
            </span>

            {isVipMode && (
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
              })} • {fullPhotos.length} Captured Moments
            </p>
          </div>
        </div>
      </div>

      {/* 2. GOOGLE PHOTOS PEOPLE AVATARS BAR */}
      {people.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
          <div className="bg-white rounded-3xl p-4 border border-[#E7E2D8] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>People in this Wedding ({people.length})</span>
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:inline">Tap any face to filter</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => {
                  setSelectedPersonId(null);
                  setMatchedPhotos([]);
                  setMatchNotice(null);
                }}
                className={'flex flex-col items-center gap-1 shrink-0 cursor-pointer transition ' + (
                  selectedPersonId === null && matchedPhotos.length === 0 ? 'scale-105' : 'opacity-70 hover:opacity-100'
                )}
              >
                <div className={'w-12 h-12 rounded-full flex items-center justify-center border-2 ' + (
                  selectedPersonId === null && matchedPhotos.length === 0
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-400/30'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                )}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-zinc-800">All</span>
              </button>

              {people.map(p => {
                const isSel = selectedPersonId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (isSel) {
                        setSelectedPersonId(null);
                        setMatchedPhotos([]);
                        setMatchNotice(null);
                      } else {
                        setSelectedPersonId(p.id);
                        const pSet = new Set(p.photo_ids);
                        const matched = fullPhotos.filter((ph: any) => pSet.has(ph.id));
                        setMatchedPhotos(matched);
                        setMatchNotice(`Showing ${matched.length} photos of ${p.name}`);
                      }
                    }}
                    className={'flex flex-col items-center gap-1 shrink-0 cursor-pointer transition ' + (
                      isSel ? 'scale-105' : 'opacity-80 hover:opacity-100'
                    )}
                  >
                    <div className={'relative w-12 h-12 rounded-full overflow-hidden border-2 ' + (
                      isSel
                        ? 'border-purple-600 ring-3 ring-purple-500/30'
                        : 'border-zinc-200 hover:border-purple-400'
                    )}>
                      <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover object-top" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-700 max-w-[60px] truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. FLOATING FACE AI SEARCH BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4 relative z-20 space-y-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E7E2D8] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900">Find Yourself with AI Face Search</h3>
              <p className="text-xs text-zinc-500">Take a quick selfie to filter and download all photos of you</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsFaceModalOpen(true);
                startCamera();
              }}
              className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Face Search</span>
            </button>

            {matchedPhotos.length > 0 && (
              <button
                onClick={() => {
                  setMatchedPhotos([]);
                  setSelectedPersonId(null);
                  setMatchNotice(null);
                }}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Show All Photos ({fullPhotos.length})
              </button>
            )}
          </div>
        </div>

        {/* Match Notice Banner */}
        {matchNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{matchNotice}</span>
            </div>
            <button
              onClick={() => setMatchNotice(null)}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Photos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-4">
          {displayedPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhotoIndex(idx)}
              className="group relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <img
                src={photo.thumbnail_url || photo.preview_url}
                alt="Wedding photo"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.face_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                    {photo.face_count} {photo.face_count === 1 ? 'Face' : 'Faces'}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPhoto(photo);
                  }}
                  className="p-1.5 rounded-full bg-white text-zinc-900 hover:bg-amber-400 transition shadow-md"
                  title="Download High-Res"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. FACE SEARCH MODAL WITH GUEST DETAILS & REAL-TIME MATCH */}
      {isFaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                ✨ StudioCore Face AI
              </span>
              <button
                onClick={() => {
                  stopCamera();
                  setIsFaceModalOpen(false);
                }}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-zinc-900">Find &amp; Save Your Photos</h3>
              <p className="text-xs text-zinc-500">
                Take a selfie &amp; enter your details. We will find all your photos and send your private album to your WhatsApp!
              </p>
            </div>

            {/* Camera / Selfie Box */}
            <div className="space-y-2 text-center">
              {selfieData ? (
                <div className="relative w-36 h-36 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md">
                  <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieData(null);
                      startCamera();
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 inset-x-1 text-center text-[9.5px] font-black text-emerald-400 bg-black/70 py-0.5 rounded-md">
                    ✓ Face Captured
                  </span>
                </div>
              ) : cameraActive ? (
                <div className="relative w-full max-w-[260px] mx-auto aspect-square rounded-3xl overflow-hidden border-2 border-amber-500 shadow-md bg-black">
                  <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                  <button
                    type="button"
                    onClick={async () => {
                      const video = videoRef.current;
                      if (!video) return;
                      const canvas = canvasRef.current || document.createElement('canvas');
                      canvas.width = video.videoWidth || 640;
                      canvas.height = video.videoHeight || 640;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const b64 = canvas.toDataURL('image/jpeg', 0.85);
                        setSelfieData(b64);
                        stopCamera();
                      }
                    }}
                    className="absolute bottom-3 inset-x-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Selfie</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Open Camera</span>
                  </button>

                  <label className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200">
                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setSelfieData(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Guest Contact Details Form */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FBF9F5] rounded-xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                  WhatsApp Number (For Photo Delivery)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FBF9F5] rounded-xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="rahul@gmail.com"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FBF9F5] rounded-xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!selfieData) {
                    alert('Please capture a selfie or upload a photo first!');
                    return;
                  }
                  await performFaceMatch(selfieData);
                }}
                disabled={isMatching || !selfieData}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {isMatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Face &amp; Saving Registration...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Search My Photos &amp; Save Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LIGHTBOX MODAL */}
      {selectedPhotoIndex !== null && displayedPhotos[selectedPhotoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={displayedPhotos[selectedPhotoIndex].preview_url}
            alt="Expanded view"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />

          {/* Navigation Controls */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={() => setSelectedPhotoIndex(selectedPhotoIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {selectedPhotoIndex < displayedPhotos.length - 1 && (
            <button
              onClick={() => setSelectedPhotoIndex(selectedPhotoIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-3">
            <button
              onClick={() => handleDownloadPhoto(displayedPhotos[selectedPhotoIndex])}
              className="px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs font-black flex items-center gap-2 hover:bg-zinc-200 transition shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Download Original</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function StrictGuestGalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-xs font-bold text-zinc-500">
        Loading Guest Portal...
      </div>
    }>
      <StrictGuestGalleryContent />
    </Suspense>
  );
}

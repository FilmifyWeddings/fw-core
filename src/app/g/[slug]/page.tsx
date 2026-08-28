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
  QrCode,
  Send,
  User,
  Users,
  Phone,
  Mail,
  Smartphone,
  ShieldCheck,
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
  status?: string; // 'UNPUBLISHED' | 'PUBLISHED' | 'DRAFT'
}

export default function GuestGalleryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const mode = searchParams?.get('mode') || 'guest';
  const isRegisterParam = searchParams?.get('register') === '1' || mode === 'register';
  const guestParamId = searchParams?.get('guest');

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-Event Registration State
  const [isRegisterMode, setIsRegisterMode] = useState(isRegisterParam);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // PIN Protection State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Face Matching State
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [matchedPhotos, setMatchedPhotos] = useState<PhotoItem[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'matched'>('all');
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

      if (gal.status === 'UNPUBLISHED' || isRegisterParam) {
        setIsRegisterMode(true);
      }

      // If VIP mode, or no PIN code, or unlocked in session -> unlock immediately
      if (mode === 'vip' || !gal.pin_code || sessionStorage.getItem(`gallery_unlocked_${gal.id}`) === 'true') {
        setIsUnlocked(true);
      }

      // Fetch photos
      const pRes = await fetch(`/api/gallery/photos?gallery_id=${gal.id}`);
      const pJson = await pRes.json();
      if (pJson.success && Array.isArray(pJson.photos)) {
        setPhotos(pJson.photos);
        // Load People Clusters for Google Photos style row
        try {
          const peopleRes = await fetch(`/api/gallery/people?gallery_id=${gal.id}`);
          const peopleJson = await peopleRes.json();
          if (peopleJson.success && Array.isArray(peopleJson.people)) {
            setPeople(peopleJson.people);
          }
        } catch (_) {}

        // If guestParamId is provided, filter for that guest
        if (guestParamId) {
          const guestRes = await fetch(`/api/gallery/guest/list?gallery_id=${gal.id}`);
          const guestJson = await guestRes.json();
          if (guestJson.success && Array.isArray(guestJson.guests)) {
            const currentGuest = guestJson.guests.find((g: any) => g.id === guestParamId);
            if (currentGuest && Array.isArray(currentGuest.matched_photo_ids) && currentGuest.matched_photo_ids.length > 0) {
              const matchedSet = new Set(currentGuest.matched_photo_ids);
              const matched = pJson.photos.filter((p: any) => matchedSet.has(p.id));
              if (matched.length > 0) {
                setMatchedPhotos(matched);
                setActiveFilter('matched');
                setMatchNotice(`🎉 Welcome ${currentGuest.guest_name}! Here are your ${matched.length} photos.`);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [slug, mode, isRegisterParam, guestParamId]);

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

    if (isRegisterMode) {
      setSelfieData(base64);
    } else {
      await performFaceMatch(base64);
    }
  };

  // Handle File Upload Selfie
  const handleUploadSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gallery) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (isRegisterMode) {
        setSelfieData(base64);
      } else {
        await performFaceMatch(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Pre-Event Guest Registration Submission
  const handleGuestRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery || !guestName.trim() || !guestPhone.trim()) {
      alert('Please enter your Name and WhatsApp Number');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch('/api/gallery/guest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: gallery.id,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          guest_email: guestEmail.trim() || undefined,
          selfieBase64: selfieData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRegistrationSuccess(true);
      } else {
        alert(json.error || 'Registration failed');
      }
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Perform Real Face Match API Request
  const performFaceMatch = async (selfieBase64: string) => {
    if (!gallery) return;
    setIsMatching(true);
    setMatchNotice('Analyzing your face and searching wedding moments...');

    try {
      const res = await fetch('/api/gallery/match-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          galleryId: gallery.id,
          selfieBase64,
          threshold: 0.40,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.photos)) {
        setMatchedPhotos(json.photos);
        setActiveFilter('matched');
        setIsFaceModalOpen(false);

        if (json.photos.length > 0) {
          setMatchNotice(`🎉 Found ${json.photos.length} photos of you!`);
        } else {
          setMatchNotice('No matching photos found with this selfie. Showing all wedding photos.');
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

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotos(prev => {
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

  // ─────────────────────────────────────────────────────────────
  // PRE-EVENT GUEST QR REGISTRATION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (isRegisterMode || gallery.status === 'UNPUBLISHED') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-lg w-full mx-auto space-y-6 pt-4">
          
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Face Registration</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
              {gallery.title}
            </h1>
            <p className="text-xs text-zinc-500 font-serif italic">
              Register with a quick selfie to receive your wedding photos directly on WhatsApp!
            </p>
          </div>

          {registrationSuccess ? (
            <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-5 animate-in fade-in zoom-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-zinc-900">You're All Set, {guestName}!</h2>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  Your face has been registered in StudioCore AI. As soon as the photographer publishes the official wedding photos, your personalized album will be delivered straight to your WhatsApp (<strong>{guestPhone}</strong>).
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Instant Auto-Dispatch Enabled</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-xl space-y-6">
              
              {/* Selfie Capture Box */}
              <div className="space-y-2 text-center">
                <label className="text-xs font-black text-zinc-800 uppercase tracking-wider block">
                  1. Take a 1-Second Selfie
                </label>
                
                {selfieData ? (
                  <div className="relative w-40 h-40 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md">
                    <img src={selfieData} alt="Selfie preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSelfieData(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2 inset-x-2 text-center text-[10px] font-black text-emerald-400 bg-black/70 py-0.5 rounded-lg">
                      ✓ Face Captured
                    </span>
                  </div>
                ) : cameraActive ? (
                  <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden border-2 border-amber-500 shadow-md bg-black">
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                    <button
                      type="button"
                      onClick={captureSelfieAndMatch}
                      className="absolute bottom-4 inset-x-8 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Selfie</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Open Camera</span>
                    </button>

                    <label className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-zinc-200">
                      <ImageIcon className="w-4 h-4 text-zinc-500" />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleUploadSelfie} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* Guest Details Form */}
              <form onSubmit={handleGuestRegister} className="space-y-4 pt-2 border-t border-zinc-100">
                <div>
                  <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                    2. Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#FBF9F5] rounded-2xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                    3. WhatsApp Mobile Number (For Instant Photos)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#FBF9F5] rounded-2xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider block mb-1">
                    4. Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="rahul@gmail.com"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#FBF9F5] rounded-2xl border border-zinc-300 text-xs font-bold focus:bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isRegistering ? (
                    <span>Registering with StudioCore AI...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Register for Instant Wedding Photos</span>
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

        </div>

        <div className="text-center text-[11px] text-zinc-400 pt-6">
          <span>Powered by StudioCore AI • Zero Storage Loss Wedding Delivery</span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLISHED GALLERY VIEW
  // ─────────────────────────────────────────────────────────────
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

      {/* 1.5 GOOGLE PHOTOS PEOPLE AVATARS BAR */}
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
                  setActiveFilter('all');
                  setMatchNotice(null);
                }}
                className={'flex flex-col items-center gap-1 shrink-0 cursor-pointer transition ' + (
                  selectedPersonId === null && activeFilter === 'all' ? 'scale-105' : 'opacity-70 hover:opacity-100'
                )}
              >
                <div className={'w-12 h-12 rounded-full flex items-center justify-center border-2 ' + (
                  selectedPersonId === null && activeFilter === 'all'
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
                        setActiveFilter('all');
                        setMatchNotice(null);
                      } else {
                        setSelectedPersonId(p.id);
                        const pSet = new Set(p.photo_ids);
                        const matched = photos.filter((ph: any) => pSet.has(ph.id));
                        setMatchedPhotos(matched);
                        setActiveFilter('matched');
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

      {/* 2. FLOATING FACE AI SEARCH BAR */}
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

            {activeFilter === 'matched' && (
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setMatchNotice(null);
                }}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition cursor-pointer"
              >
                Show All Photos ({photos.length})
              </button>
            )}
          </div>
        </div>

        {matchNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-between">
            <span>{matchNotice}</span>
            <button onClick={() => setMatchNotice(null)} className="text-amber-700 hover:text-amber-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. PHOTO GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
          {displayedPhotos.map((photo, idx) => {
            const isFav = favorites.has(photo.id);
            const isSel = selectedPhotos.has(photo.id);

            return (
              <div
                key={photo.id}
                onClick={() => setSelectedPhotoIndex(idx)}
                className="break-inside-avoid relative rounded-2xl overflow-hidden group bg-zinc-100 border border-zinc-200 shadow-2xs hover:shadow-md transition cursor-pointer"
              >
                <img
                  src={photo.thumbnail_url || photo.preview_url}
                  alt="Wedding photo"
                  loading="lazy"
                  className="w-full object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-bold backdrop-blur-xs">
                      {photo.face_count || 1} {photo.face_count === 1 ? 'Face' : 'Faces'}
                    </span>

                    <button
                      onClick={e => toggleFavorite(photo.id, e)}
                      className="p-1.5 rounded-full bg-black/40 text-white hover:text-rose-400 transition"
                    >
                      <Heart className={'w-3.5 h-3.5 ' + (isFav ? 'fill-rose-500 text-rose-500' : '')} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={e => toggleSelectPhoto(photo.id, e)}
                      className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/70 transition"
                    >
                      {isSel ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDownloadPhoto(photo);
                      }}
                      className="p-1.5 rounded-lg bg-white text-zinc-900 hover:bg-zinc-200 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. FACE SEARCH MODAL */}
      {isFaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-zinc-200 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700">StudioCore AI</span>
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
              <h3 className="text-base font-black text-zinc-900">Take a Quick Selfie</h3>
              <p className="text-xs text-zinc-500">AI will scan all {photos.length} photos and show only yours in seconds</p>
            </div>

            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-zinc-200">
              <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={captureSelfieAndMatch}
                disabled={isMatching}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>{isMatching ? 'Matching Faces...' : 'Search My Photos'}</span>
              </button>

              <label className="w-full py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-zinc-500" />
                <span>Upload from Gallery</span>
                <input type="file" accept="image/*" onChange={handleUploadSelfie} className="hidden" />
              </label>
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

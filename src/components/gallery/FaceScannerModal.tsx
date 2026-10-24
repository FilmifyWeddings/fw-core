'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  User,
  Mail,
  ShieldCheck,
  Zap,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  name: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+968', country: 'OM', flag: '🇴🇲', name: 'Oman' },
  { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+977', country: 'NP', flag: '🇳🇵', name: 'Nepal' },
  { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94', country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: '+230', country: 'MU', flag: '🇲🇺', name: 'Mauritius' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
];

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    name: string;
    phone: string;
    email: string;
    selfieBase64: string;
  }) => Promise<void> | void;
  onScanComplete?: (matchedPhotos: any[], guestData: { name: string; phone: string; email: string }) => Promise<void> | void;
  galleryId?: string;
  galleryTitle?: string;
  isProcessing?: boolean;
}

type GuidanceState =
  | 'evaluating'
  | 'no_face'
  | 'too_dark'
  | 'too_bright'
  | 'not_centered'
  | 'looking_away'
  | 'too_far'
  | 'ready';

export function FaceScannerModal({
  isOpen,
  onClose,
  onSubmit,
  onScanComplete,
  galleryId,
  galleryTitle,
  isProcessing = false,
}: FaceScannerModalProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // India (+91) default
  const [guestPhone, setGuestPhone] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  // Guidance status & message
  const [guidance, setGuidance] = useState<GuidanceState>('evaluating');
  const [guidanceMessage, setGuidanceMessage] = useState('Position your face inside the oval');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const faceDetectorRef = useRef<any>(null);

  // Initialize Native / Browser FaceDetector if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        faceDetectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
      } catch (_) {
        faceDetectorRef.current = null;
      }
    }
  }, []);

  // 1. Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedSelfie(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser. Please use Chrome, Safari, or an updated browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('[Camera Access Error]:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions in your browser settings.');
      setIsCameraActive(false);
    }
  }, []);

  // 2. Stop Camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // 3. Real Face Landmark & Pose Evaluation Engine
  const evaluateFaceFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || capturedSelfie) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState >= 2 && ctx) {
      const w = 180;
      const h = 180;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(video, 0, 0, w, h);

      // Method A: Native FaceDetector API (Chromium / Android / Chrome Desktop)
      if (faceDetectorRef.current) {
        try {
          const faces = await faceDetectorRef.current.detect(video);
          if (!faces || faces.length === 0) {
            setGuidance('no_face');
            setGuidanceMessage('🔴 No face detected. Keep face in frame');
            animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
            return;
          }

          const face = faces[0];
          const box = face.boundingBox;
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 640;

          // Check if face is centered in oval
          const faceCenterX = (box.x + box.width / 2) / vw;
          const faceCenterY = (box.y + box.height / 2) / vh;
          const faceRatio = box.height / vh;

          if (faceRatio < 0.20) {
            setGuidance('too_far');
            setGuidanceMessage('🔴 Move closer to the camera');
            animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
            return;
          }

          if (faceCenterX < 0.25 || faceCenterX > 0.75 || faceCenterY < 0.15 || faceCenterY > 0.85) {
            setGuidance('not_centered');
            setGuidanceMessage('🟡 Center your face in the oval');
            animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
            return;
          }

          // Relaxed eye landmark check to support natural head tilts and angled faces
          if (face.landmarks && Array.isArray(face.landmarks)) {
            const eyes = face.landmarks.filter((l: any) => l.type === 'eye');
            if (eyes.length >= 2) {
              const eye1 = eyes[0].locations[0];
              const eye2 = eyes[1].locations[0];
              const eyeDistance = Math.abs(eye1.x - eye2.x);
              const eyeDiffY = Math.abs(eye1.y - eye2.y);
              if (eyeDistance < box.width * 0.10 || eyeDiffY > box.height * 0.45) {
                setGuidance('looking_away');
                setGuidanceMessage('🟡 Look towards the camera');
                animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
                return;
              }
            }
          }

          setGuidance('ready');
          setGuidanceMessage('🟢 Face Detected! Click Capture');
          animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
          return;
        } catch (_) {}
      }

      // Method B: High-Precision Biological Face Feature & Symmetry Analysis
      try {
        const frameData = ctx.getImageData(0, 0, w, h);
        const data = frameData.data;

        let totalLuma = 0;
        let skinPixels = 0;
        let leftEyeRegionDarkness = 0;
        let rightEyeRegionDarkness = 0;
        let centralFacePixels = 0;

        const ovalCenterX = w / 2;
        const ovalCenterY = h / 2;
        const radiusX = w * 0.30;
        const radiusY = h * 0.38;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Luminance
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuma += luma;

            // Inside oval check
            const dx = (x - ovalCenterX) / radiusX;
            const dy = (y - ovalCenterY) / radiusY;
            const isInsideOval = dx * dx + dy * dy <= 1.0;

            if (isInsideOval) {
              centralFacePixels++;

              // Skin-tone chromaticity detection in YCbCr space
              const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
              const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;

              const isSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && r > g && r > b;
              if (isSkin) {
                skinPixels++;
              }

              // Eye Socket Dark Region Symmetry Analysis (Upper middle half of oval)
              if (y >= h * 0.32 && y <= h * 0.52) {
                if (x >= w * 0.28 && x <= w * 0.46 && luma < 90) {
                  leftEyeRegionDarkness++;
                }
                if (x >= w * 0.54 && x <= w * 0.72 && luma < 90) {
                  rightEyeRegionDarkness++;
                }
              }
            }
          }
        }

        const avgLuma = totalLuma / (w * h);
        const skinRatio = skinPixels / Math.max(centralFacePixels, 1);

        if (avgLuma < 35) {
          setGuidance('too_dark');
          setGuidanceMessage('🔴 Too Dark - Move to better light');
        } else if (avgLuma > 248) {
          setGuidance('too_bright');
          setGuidanceMessage('🔴 Too Bright / Glare - Reduce direct light');
        } else if (skinRatio < 0.12) {
          setGuidance('no_face');
          setGuidanceMessage('🔴 No face detected. Keep face in frame');
        } else if (skinRatio < 0.18) {
          setGuidance('not_centered');
          setGuidanceMessage('🟡 Center your face inside the oval');
        } else {
          // Relaxed for spectacles, sunglasses, head tilts and slight side angles
          const eyeDifference = Math.abs(leftEyeRegionDarkness - rightEyeRegionDarkness);
          const maxEyeDarkness = Math.max(leftEyeRegionDarkness, rightEyeRegionDarkness, 1);

          if (eyeDifference / maxEyeDarkness > 0.98 && maxEyeDarkness > 60) {
            setGuidance('looking_away');
            setGuidanceMessage('🟡 Look towards the camera');
          } else {
            setGuidance('ready');
            setGuidanceMessage('🟢 Ready to Capture');
          }
        }
      } catch (_) {
        setGuidance('ready');
        setGuidanceMessage('🟢 Ready to Capture');
      }
    }

    animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
  }, [isCameraActive, capturedSelfie]);

  useEffect(() => {
    if (isOpen && cameraRequested && !capturedSelfie) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraRequested, capturedSelfie, startCamera, stopCamera]);

  useEffect(() => {
    if (isCameraActive && !capturedSelfie) {
      animFrameRef.current = requestAnimationFrame(evaluateFaceFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, capturedSelfie, evaluateFaceFrame]);

  // Reset camera requested when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setCameraRequested(false);
      setCapturedSelfie(null);
    }
  }, [isOpen]);

  // Capture Snapshot from Video
  const handleSnap = () => {
    if (!videoRef.current) return;
    if (guidance === 'too_dark') {
      alert('Lighting is too dark. Please move to better light before capturing.');
      return;
    }

    const video = videoRef.current;
    const snapCanvas = document.createElement('canvas');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 640;
    snapCanvas.width = vw;
    snapCanvas.height = vh;
    const ctx = snapCanvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal for natural mirror selfie
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);

    const base64 = snapCanvas.toDataURL('image/jpeg', 0.92);
    setCapturedSelfie(base64);
    setCameraRequested(false);
    setIsCameraActive(false);
    setGuidance('ready');
    setGuidanceMessage('✓ Face Captured');
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedSelfie(null);
    setCameraRequested(true);
    setGuidance('evaluating');
    setGuidanceMessage('Position your face inside the oval');
  };

  const [internalProcessing, setInternalProcessing] = useState(false);

  // Form Validation
  const isEmailValid = guestEmail.trim().length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const cleanPhoneDigits = guestPhone.replace(/\D/g, '');
  const isPhoneValid = selectedCountry.code === '+91'
    ? cleanPhoneDigits.length === 10
    : cleanPhoneDigits.length >= 7 && cleanPhoneDigits.length <= 15;
  const isNameValid = guestName.trim().length >= 2;
  const isSubmitting = isProcessing || internalProcessing;
  const isReadyToSubmit = isNameValid && isPhoneValid && isEmailValid && !!capturedSelfie && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReadyToSubmit || !capturedSelfie) return;

    const fullPhone = `${selectedCountry.code}${cleanPhoneDigits}`;

    if (onSubmit) {
      setInternalProcessing(true);
      try {
        await onSubmit({
          name: guestName.trim(),
          phone: fullPhone,
          email: guestEmail.trim(),
          selfieBase64: capturedSelfie,
        });
      } finally {
        setInternalProcessing(false);
      }
      return;
    }

    if (onScanComplete) {
      setInternalProcessing(true);
      try {
        const matchRes = await fetch('/api/gallery/match-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gallery_id: galleryId,
            galleryId: galleryId,
            selfieBase64: capturedSelfie,
            image_base64: capturedSelfie,
            threshold: 0.40,
          }),
        });

        const matchJson = await matchRes.json();
        const matchedPhotos = matchJson.photos || [];

        await onScanComplete(matchedPhotos, {
          name: guestName.trim(),
          phone: fullPhone,
          email: guestEmail.trim(),
        });
        onClose();
      } catch (err: any) {
        alert(`Face search error: ${err.message}`);
      } finally {
        setInternalProcessing(false);
      }
    }
  };

  if (!isOpen) return null;

  const filteredCountries = COUNTRY_CODES.filter((c) => {
    if (!countrySearch.trim()) return true;
    const q = countrySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.includes(q) || c.country.toLowerCase().includes(q);
  });

  const getRingBorderClass = () => {
    if (capturedSelfie) return 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.6)]';
    switch (guidance) {
      case 'ready':
        return 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.8)] animate-pulse';
      case 'too_dark':
      case 'too_bright':
      case 'no_face':
        return 'border-rose-500 shadow-[0_0_22px_rgba(239,68,68,0.6)]';
      case 'not_centered':
      case 'looking_away':
      case 'too_far':
        return 'border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.6)]';
      default:
        return 'border-zinc-400/80';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-[#FAF9F5] rounded-3xl sm:rounded-4xl p-5 sm:p-7 max-w-lg w-full max-h-[92vh] overflow-y-auto border border-[#E7E2D8] shadow-2xl space-y-4 my-auto text-zinc-900 relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                AI Face Registration
              </span>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 leading-tight">
                Register &amp; Find Your Photos
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Details Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Full Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-600 pl-1">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition"
              />
            </div>
          </div>

          {/* 2. Email Address */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-600 pl-1">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition"
              />
            </div>
          </div>

          {/* 3. Phone Number with Country Flag Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-600 pl-1">WhatsApp Number *</label>
            <div className="relative flex items-center gap-2">
              {/* Flag + Country Code Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="flex items-center gap-1.5 bg-white border border-[#E7E2D8] hover:border-amber-500/40 px-3 py-2.5 rounded-2xl text-xs font-bold text-zinc-900 transition focus:outline-hidden shadow-2xs cursor-pointer"
                >
                  <span className="text-base leading-none">{selectedCountry.flag}</span>
                  <span className="text-xs font-bold text-zinc-700 font-mono">{selectedCountry.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {/* Country Dropdown Menu */}
                {isCountryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => {
                        setIsCountryDropdownOpen(false);
                        setCountrySearch('');
                      }}
                    />
                    <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-white border border-[#E7E2D8] rounded-2xl shadow-xl max-h-60 overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95">
                      {/* Search box inside dropdown */}
                      <div className="relative p-1 border-b border-zinc-100">
                        <Search className="absolute left-2.5 top-3 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden"
                          autoFocus
                        />
                      </div>

                      {/* Country List */}
                      <div className="overflow-y-auto max-h-48 py-1 space-y-0.5">
                        {filteredCountries.map((c, idx) => {
                          const isSelected = selectedCountry.code === c.code && selectedCountry.country === c.country;
                          return (
                            <button
                              key={`${c.country}-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setIsCountryDropdownOpen(false);
                                setCountrySearch('');
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'text-zinc-700 hover:bg-zinc-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-base leading-none">{c.flag}</span>
                                <span className="font-semibold text-zinc-800 truncate text-[11px]">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-zinc-400 font-mono">{c.code}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Number Input */}
              <div className="relative flex-1">
                <input
                  type="tel"
                  required
                  placeholder={selectedCountry.code === '+91' ? '98765 43210' : 'Phone number'}
                  value={guestPhone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setGuestPhone(cleaned);
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition font-mono"
                />
              </div>
            </div>
            {selectedCountry.code === '+91' && cleanPhoneDigits.length > 0 && cleanPhoneDigits.length !== 10 && (
              <p className="text-[10px] text-rose-500 pl-1 font-medium">Please enter a valid 10-digit mobile number</p>
            )}
          </div>

          {/* 4. Live Camera Selfie Viewport / Trigger / Captured Card */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-zinc-600 pl-1 flex items-center justify-between">
              <span>Capture Live Selfie *</span>
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Single Face Only
              </span>
            </label>

            {capturedSelfie ? (
              /* State A: Captured Selfie (Turns VIBRANT GREEN with checkmark & Retake option) */
              <div
                onClick={handleRetake}
                className="p-3.5 bg-emerald-50 hover:bg-emerald-100/70 border-2 border-emerald-500 rounded-2xl flex items-center justify-between shadow-xs transition-all cursor-pointer group"
                title="Click anywhere to retake selfie"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs shrink-0 bg-black">
                    <img
                      src={capturedSelfie}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0.5 right-0.5 bg-emerald-600 text-white p-0.5 rounded-full shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Selfie Captured Successfully!</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Click to retake or proceed to register
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetake();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 border border-emerald-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retake</span>
                </button>
              </div>
            ) : cameraRequested ? (
              /* State B: Active Camera Viewport with cancel button, 3D oval guide, snap button */
              <div className="relative rounded-3xl bg-zinc-950 overflow-hidden aspect-4/3 sm:aspect-square flex items-center justify-center border-2 border-zinc-800 shadow-inner">
                {/* Cancel Camera Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCameraRequested(false);
                    stopCamera();
                  }}
                  className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition cursor-pointer"
                  title="Close camera"
                >
                  <X className="w-4 h-4" />
                </button>

                {cameraError ? (
                  <div className="p-6 text-center space-y-3 text-white">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition cursor-pointer"
                    >
                      Allow Camera &amp; Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover -scale-x-100"
                    />

                    {/* 3D Glowing Oval Guide */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                      <div
                        className={`relative w-44 h-60 sm:w-52 sm:h-68 rounded-[50%] border-4 transition-all duration-200 flex items-center justify-center ${getRingBorderClass()}`}
                      >
                        {guidance === 'ready' && (
                          <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
                        )}
                        <div className="absolute top-2 w-4 h-1 bg-white/80 rounded-full" />
                        <div className="absolute bottom-2 w-4 h-1 bg-white/80 rounded-full" />
                      </div>
                    </div>

                    {/* Real-time Guidance Status */}
                    <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-black tracking-tight shadow-md backdrop-blur-md border ${
                          guidance === 'ready'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                            : guidance === 'too_dark' || guidance === 'too_bright' || guidance === 'no_face'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                            : 'bg-zinc-900/80 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {guidanceMessage}
                      </span>
                    </div>

                    {/* Capture Button */}
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleSnap}
                        disabled={guidance === 'too_dark'}
                        className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
                          guidance === 'ready'
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 scale-105 shadow-emerald-500/30'
                            : 'bg-zinc-900/90 text-white hover:bg-zinc-800 border border-zinc-700'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>{guidance === 'ready' ? 'Ready to Capture' : 'Capture Selfie'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* State C: Premium "Capture Live Selfie" trigger button */
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setCameraRequested(true);
                }}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 hover:from-amber-100/70 hover:to-amber-50 text-zinc-900 flex items-center justify-between group transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-zinc-900 group-hover:text-amber-800 flex items-center gap-1.5">
                      <span>Capture Live Selfie</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium">Click to open camera &amp; capture your face</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-800 font-bold text-xs border border-amber-300/60 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  Open Camera
                </div>
              </button>
            )}
          </div>

          {/* 5. Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isReadyToSubmit || isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-black text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                isReadyToSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white shadow-amber-600/25 active:scale-98'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Finding My Photos... Please wait</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Find My Photos</span>
                </>
              )}
            </button>
          </div>

          {/* 6. Privacy & WhatsApp Notification Notice (strictly below the button as requested) */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[10.5px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Your details and selfie are used strictly for private face-matching. We will send your personal album link directly to your WhatsApp.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}

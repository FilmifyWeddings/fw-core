'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string;
    selfieBase64: string;
  }) => Promise<void> | void;
  galleryTitle?: string;
  isProcessing?: boolean;
}

type GuidanceStatus = 'evaluating' | 'too_dark' | 'too_bright' | 'not_centered' | 'ready';

export function FaceScannerModal({
  isOpen,
  onClose,
  onSubmit,
  galleryTitle,
  isProcessing = false,
}: FaceScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  // Guidance status state
  const [guidance, setGuidance] = useState<GuidanceStatus>('evaluating');
  const [guidanceMessage, setGuidanceMessage] = useState('Position your face inside the oval');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedSelfie(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by your browser. Please use file upload.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
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
      setCameraError(err.message || 'Unable to access front camera. Please allow camera permissions or upload a photo.');
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

  // 3. Real-time Luminance & Posture Evaluator Loop
  const evaluateVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || capturedSelfie) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState >= 2 && ctx) {
      const w = 160;
      const h = 160;
      canvas.width = w;
      canvas.height = h;

      // Draw downscaled center box for ultra-fast luminance check (60fps)
      ctx.drawImage(video, 0, 0, w, h);

      try {
        const imageData = ctx.getImageData(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
        const data = imageData.data;
        let totalLuminance = 0;
        let pixelCount = data.length / 4;
        let minLuma = 255;
        let maxLuma = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard ITU-R BT.601 luminance
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += luma;
          if (luma < minLuma) minLuma = luma;
          if (luma > maxLuma) maxLuma = luma;
        }

        const avgLuma = totalLuminance / pixelCount;
        const contrast = maxLuma - minLuma;

        if (avgLuma < 52) {
          setGuidance('too_dark');
          setGuidanceMessage('🔴 Too Dark - Move to better light');
        } else if (avgLuma > 238) {
          setGuidance('too_bright');
          setGuidanceMessage('🔴 Too Bright / Glare - Reduce direct light');
        } else if (contrast < 40) {
          setGuidance('not_centered');
          setGuidanceMessage('🟡 Center your face clearly inside the oval');
        } else {
          setGuidance('ready');
          setGuidanceMessage('🟢 Perfect lighting! Ready to capture');
        }
      } catch (_) {}
    }

    animFrameRef.current = requestAnimationFrame(evaluateVideoFrame);
  }, [isCameraActive, capturedSelfie]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedSelfie) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, capturedSelfie, startCamera, stopCamera]);

  useEffect(() => {
    if (isCameraActive && !capturedSelfie) {
      animFrameRef.current = requestAnimationFrame(evaluateVideoFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, capturedSelfie, evaluateVideoFrame]);

  // Capture Snapshot from Video
  const handleSnap = () => {
    if (!videoRef.current) return;
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
    setGuidance('ready');
    setGuidanceMessage('✓ Selfie Captured');
    stopCamera();
  };

  // Handle File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setCapturedSelfie(b64);
      setGuidance('ready');
      setGuidanceMessage('✓ Photo Loaded');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedSelfie(null);
    setGuidance('evaluating');
    setGuidanceMessage('Position your face inside the oval');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Form Validation
  const isEmailValid = guestEmail.trim().length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const isPhoneValid = guestPhone.replace(/[^0-9]/g, '').length >= 10;
  const isNameValid = guestName.trim().length >= 2;
  const isReadyToSubmit = isNameValid && isPhoneValid && isEmailValid && !!capturedSelfie && !isProcessing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReadyToSubmit || !capturedSelfie) return;

    await onSubmit({
      name: guestName.trim(),
      phone: guestPhone.trim(),
      email: guestEmail.trim(),
      selfieBase64: capturedSelfie,
    });
  };

  if (!isOpen) return null;

  // Ring Style by Guidance Status
  const getRingBorderClass = () => {
    if (capturedSelfie) return 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]';
    switch (guidance) {
      case 'ready':
        return 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.7)] animate-pulse';
      case 'too_dark':
      case 'too_bright':
        return 'border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
      case 'not_centered':
        return 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]';
      default:
        return 'border-zinc-400/80';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      {/* Hidden processing canvas for frame analysis */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-[#FAF9F5] rounded-3xl sm:rounded-4xl p-5 sm:p-7 max-w-lg w-full border border-[#E7E2D8] shadow-2xl space-y-5 my-auto text-zinc-900 relative">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                AI Face Scanner
              </span>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 leading-tight">
                Find Your Wedding Photos
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

        {/* Mode Selector Tabs (Camera vs Upload) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-200/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              if (capturedSelfie) setCapturedSelfie(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* ── 3D SMART GUIDANCE SCANNER VIEWPORT ── */}
        <div className="relative rounded-3xl bg-zinc-950 overflow-hidden aspect-4/3 sm:aspect-square flex items-center justify-center border-2 border-zinc-800 shadow-inner">
          
          {activeTab === 'camera' ? (
            <>
              {cameraError ? (
                <div className="p-6 text-center space-y-3 text-white">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition"
                  >
                    Use File Upload Instead
                  </button>
                </div>
              ) : capturedSelfie ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedSelfie}
                    alt="Captured Selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-zinc-900 font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Selfie</span>
                    </button>
                  </div>
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

                  {/* 3D Glowing Oval Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div
                      className={`relative w-48 h-64 sm:w-56 sm:h-72 rounded-[50%] border-4 transition-all duration-300 flex items-center justify-center ${getRingBorderClass()}`}
                    >
                      {/* Laser Scan line when ready */}
                      {guidance === 'ready' && (
                        <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
                      )}

                      {/* Top & Bottom Tick marks */}
                      <div className="absolute top-2 w-4 h-1 bg-white/80 rounded-full" />
                      <div className="absolute bottom-2 w-4 h-1 bg-white/80 rounded-full" />
                    </div>
                  </div>

                  {/* Capture Button Bar */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleSnap}
                      className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
                        guidance === 'ready'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 scale-105 shadow-emerald-500/30'
                          : 'bg-zinc-900/90 text-white hover:bg-zinc-800 border border-zinc-700'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>{guidance === 'ready' ? 'Capture Selfie' : 'Snap Photo'}</span>
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Upload Tab */
            <div className="p-6 text-center space-y-4 text-white w-full h-full flex flex-col items-center justify-center">
              {capturedSelfie ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedSelfie}
                    alt="Uploaded Photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <label className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-zinc-900 font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Choose Different Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-3xl bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center mx-auto shadow-md">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Select a clear face selfie</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
                      Choose a close-up portrait photo with good lighting for highest matching accuracy.
                    </p>
                  </div>
                  <label className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload From Phone / PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {/* Real-time Guidance Message Tag */}
          <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-tight shadow-md backdrop-blur-md border ${
                guidance === 'ready'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                  : guidance === 'too_dark' || guidance === 'too_bright'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-700'
              }`}
            >
              {guidanceMessage}
            </span>
          </div>

        </div>

        {/* ── COMPULSORY GUEST DETAILS FORM ── */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            
            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition"
              />
            </div>

            {/* WhatsApp Phone */}
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-emerald-600" />
              <input
                type="tel"
                required
                placeholder="WhatsApp Number (e.g. +91 98765 43210) *"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 shadow-2xs transition font-mono"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                placeholder="Email Address *"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E2D8] rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[10.5px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Your details and selfie are used strictly for private face-matching. We will send your personal album link directly to your WhatsApp.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!isReadyToSubmit}
            className={`w-full py-3.5 rounded-2xl font-black text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer ${
              isReadyToSubmit
                ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white shadow-amber-600/25 active:scale-98'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching ArcFace Vector Database...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Capture &amp; Find My Photos</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, Coffee, 
  LogOut, RefreshCw, ShieldCheck, Sparkles, AlertTriangle, Wifi, WifiOff, X
} from 'lucide-react';
import type { AttendanceRecord, AttendanceBreak, AttendanceLocation } from '@/types';

export default function PersonalAttendancePage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState<'check_in' | 'check_out' | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline listener
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Attendance Session
  useEffect(() => {
    if (token) fetchSession();
  }, [token]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/attendance/session?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (res.ok) {
        setMember(data.member);
        setTodayRecord(data.todayRecord);
        setActiveBreak(data.activeBreak);
        setLocations(data.locations || []);
      } else {
        console.error('Session error:', data.error);
      }
    } catch (e) {
      console.error('Fetch session failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sync Offline Queue
  const syncOfflineQueue = async () => {
    const queueStr = localStorage.getItem('fw_offline_attendance');
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (Array.isArray(queue) && queue.length > 0) {
        for (const item of queue) {
          if (item.action === 'check_in') {
            await fetch('/api/public/attendance/check-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
          }
        }
        localStorage.removeItem('fw_offline_attendance');
        fetchSession();
      }
    } catch (_) {}
  };

  // Request Camera & GPS on Modal Open
  useEffect(() => {
    if (showVerifyModal) {
      startCamera();
      acquireGPS();
    } else {
      stopCamera();
    }
  }, [showVerifyModal]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera permission denied or camera not found.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const acquireGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
      },
      err => {
        console.warn('GPS error:', err.message);
        setGpsError('GPS location permission required for geofence validation.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Capture Selfie Canvas to Base64 WebP
  const captureSelfieBase64 = (): string | null => {
    if (!videoRef.current) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Center crop square
      const video = videoRef.current;
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - minDim) / 2;
      const startY = (video.videoHeight - minDim) / 2;

      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 480, 480);
      return canvas.toDataURL('image/webp', 0.8);
    } catch (e) {
      console.error('Capture frame error:', e);
      return null;
    }
  };

  // Submit Check-In
  const handleVerifyCheckIn = async () => {
    setVerifying(true);
    const photoBase64 = captureSelfieBase64();

    const payload = {
      token,
      lat: gpsLocation?.lat || null,
      lng: gpsLocation?.lng || null,
      accuracy: gpsLocation?.accuracy || null,
      photoBase64,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    if (!navigator.onLine) {
      // Store in offline queue
      const existing = JSON.parse(localStorage.getItem('fw_offline_attendance') || '[]');
      existing.push({ action: 'check_in', payload, timestamp: new Date().toISOString() });
      localStorage.setItem('fw_offline_attendance', JSON.stringify(existing));

      setSuccessAnimation('Saved Offline! Will sync automatically.');
      setTimeout(() => {
        setShowVerifyModal(null);
        setVerifying(false);
        setSuccessAnimation(null);
      }, 2000);
      return;
    }

    try {
      const res = await fetch('/api/public/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setTodayRecord(data.record);
        setSuccessAnimation(data.geofenceStatus === 'outside_geofence' ? 'Checked in (Outside Geofence)' : 'Check-In Verified!');
        setTimeout(() => {
          setShowVerifyModal(null);
          setVerifying(false);
          setSuccessAnimation(null);
        }, 1800);
      } else {
        alert(data.error || 'Failed to verify check-in');
        setVerifying(false);
      }
    } catch (e) {
      console.error('Check-in error:', e);
      alert('Network error during check-in');
      setVerifying(false);
    }
  };

  // Submit Check-Out
  const handleVerifyCheckOut = async () => {
    setVerifying(true);
    const photoBase64 = captureSelfieBase64();

    try {
      const res = await fetch('/api/public/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lat: gpsLocation?.lat || null,
          lng: gpsLocation?.lng || null,
          accuracy: gpsLocation?.accuracy || null,
          photoBase64
        })
      });
      const data = await res.json();

      if (res.ok) {
        setTodayRecord(data.record);
        setSuccessAnimation(`Checked Out! Worked: ${Math.floor((data.netWorkMinutes || 0) / 60)}h ${(data.netWorkMinutes || 0) % 60}m`);
        setTimeout(() => {
          setShowVerifyModal(null);
          setVerifying(false);
          setSuccessAnimation(null);
        }, 2200);
      } else {
        alert(data.error || 'Failed to check-out');
        setVerifying(false);
      }
    } catch (e) {
      alert('Network error during checkout');
      setVerifying(false);
    }
  };

  // Break Toggle
  const handleToggleBreak = async () => {
    const action = activeBreak ? 'end' : 'start';
    try {
      const res = await fetch('/api/public/attendance/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, breakType: 'lunch' })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveBreak(action === 'start' ? data.activeBreak : null);
      } else {
        alert(data.error || 'Failed to update break status');
      }
    } catch (_) {
      alert('Network error');
    }
  };

  // Dynamic Greeting based on time of day
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Calculate elapsed working timer
  const getElapsedTimeString = () => {
    if (!todayRecord?.check_in_time) return '00h 00m';
    const start = new Date(todayRecord.check_in_time).getTime();
    const end = todayRecord.check_out_time ? new Date(todayRecord.check_out_time).getTime() : currentTime.getTime();
    const diffMin = Math.max(0, Math.floor((end - start) / 60000));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading Workforce Portal...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center max-w-sm w-full space-y-3 shadow-lg">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-black text-slate-900">Invalid Attendance Link</h3>
          <p className="text-xs text-slate-500">
            This personal attendance link has expired or is disabled. Please contact your studio manager.
          </p>
        </div>
      </div>
    );
  }

  const isCheckedIn = !!todayRecord?.check_in_time;
  const isCheckedOut = !!todayRecord?.check_out_time;

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-slate-900 flex flex-col justify-between font-sans selection:bg-amber-100">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP MOBILE CONTAINER (MAX 440PX)
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md mx-auto p-5 space-y-5">

        {/* Studio Branding & Offline Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-slate-800">Filmify Workforce</span>
          </div>

          {!isOnline ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1 border border-emerald-200">
              <Wifi className="w-3 h-3" /> Online
            </span>
          )}
        </div>

        {/* Personalized Employee Greeting Card */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">{greeting},</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{member.name}</h2>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {member.primary_role || 'Crew Member'}
              </span>
            </div>

            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-200 to-yellow-100 border-2 border-amber-300 flex items-center justify-center text-amber-900 font-black text-xl shadow-xs overflow-hidden">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                member.name.slice(0, 2).toUpperCase()
              )}
            </div>
          </div>

          {/* Date & Live Clock */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="font-black text-slate-900 font-mono tracking-wide text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MAIN INTERACTIVE WORKFORCE STATE AREA
        ───────────────────────────────────────────────────────────── */}
        {!isCheckedIn ? (
          /* ── 1. PRE-CHECK IN: BIG CHECK IN BUTTON ── */
          <div className="bg-white p-6 rounded-3xl border border-amber-200/90 shadow-sm text-center space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Shift: 09:30 AM → 06:30 PM</p>
              <h3 className="text-lg font-black text-slate-900">Ready to start your workday?</h3>
            </div>

            {/* Giant Glowing Check In Button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowVerifyModal('check_in')}
              className="w-full py-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg tracking-wider uppercase shadow-xl shadow-emerald-500/25 border border-emerald-400 flex flex-col items-center justify-center gap-1 transition"
            >
              <Camera className="w-8 h-8 stroke-[2.5]" />
              <span>[ CHECK IN ]</span>
              <span className="text-[10px] font-bold tracking-normal opacity-90">Selfie & GPS Verification</span>
            </motion.button>

            {/* Geofence & Camera Indicators */}
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700">
                <MapPin className="w-3.5 h-3.5" /> GPS Geofence
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700">
                <Camera className="w-3.5 h-3.5" /> Face Camera
              </span>
            </div>
          </div>
        ) : isCheckedOut ? (
          /* ── 2. POST CHECK-OUT SUMMARY ── */
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Workday Completed!</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your attendance record has been finalized.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Check In</span>
                <p className="font-black text-slate-800 font-mono mt-0.5">
                  {todayRecord?.check_in_time ? new Date(todayRecord.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Check Out</span>
                <p className="font-black text-slate-800 font-mono mt-0.5">
                  {todayRecord?.check_out_time ? new Date(todayRecord.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-extrabold">
              <span className="text-emerald-800">Total Net Hours:</span>
              <span className="text-emerald-900 font-mono text-sm">
                {Math.floor((todayRecord?.work_duration_minutes || 0) / 60)}h {(todayRecord?.work_duration_minutes || 0) % 60}m
              </span>
            </div>
          </div>
        ) : (
          /* ── 3. ACTIVELY WORKING STATE ── */
          <div className="bg-white p-6 rounded-3xl border border-emerald-200/90 shadow-sm text-center space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                {activeBreak ? 'On Break' : 'You are Working'}
              </span>

              <span className="text-xs font-bold text-slate-500 font-mono">
                In: {todayRecord?.check_in_time ? new Date(todayRecord.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>

            {/* Live Stopwatch Elapsed Working Timer */}
            <div className="py-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-inner space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Working Time</p>
              <h4 className="text-3xl font-black font-mono tracking-wider text-emerald-400">
                {getElapsedTimeString()}
              </h4>
            </div>

            {/* Break & Check Out Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleToggleBreak}
                className={`py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border shadow-2xs ${
                  activeBreak
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                }`}
              >
                <Coffee className="w-4 h-4" />
                {activeBreak ? 'End Break' : 'Take Break'}
              </button>

              <button
                onClick={() => setShowVerifyModal('check_out')}
                className="py-3 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                Check Out
              </button>
            </div>
          </div>
        )}

        {/* Location & Guidelines Mini Card */}
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-xs space-y-1.5">
          <p className="font-extrabold text-slate-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Attendance Guidelines:
          </p>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Attendance captures a live verification selfie and GPS coordinate. Ensure you are within your designated studio or event venue radius.
          </p>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          FULL-SCREEN MOBILE CAMERA & GPS VERIFICATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Attendance Verification</span>
                <h3 className="text-lg font-black text-white">
                  {showVerifyModal === 'check_in' ? 'Check-In Selfie Scan' : 'Check-Out Verification'}
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(null)}
                className="p-2 rounded-full bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Live Camera Feed with Animated Face Scanner Frame */}
            <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden bg-slate-900 border-2 border-amber-400 shadow-2xl flex items-center justify-center">
              {cameraError ? (
                <div className="p-4 text-center space-y-2 text-xs text-rose-400">
                  <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
                  <p>{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Circular Face Alignment Overlay */}
                  <div className="absolute inset-0 border-4 border-dashed border-amber-400/70 rounded-full m-6 pointer-events-none animate-pulse" />

                  {/* Scanning HUD line animation */}
                  <motion.div
                    animate={{ y: [-120, 120, -120] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-lg shadow-amber-400"
                  />
                </>
              )}

              {/* Success Overlay Animation */}
              {successAnimation && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20"
                >
                  <CheckCircle2 className="w-14 h-14 text-white stroke-[2.5] animate-bounce" />
                  <h4 className="text-xl font-black text-white">{successAnimation}</h4>
                </motion.div>
              )}
            </div>

            {/* Bottom: GPS Status & Capture Button */}
            <div className="w-full max-w-xs mx-auto space-y-3">
              {/* GPS Status Pill */}
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-center text-xs flex items-center justify-center gap-2">
                <MapPin className={`w-4 h-4 ${gpsLocation ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                <span className="font-semibold text-slate-200">
                  {gpsLocation
                    ? `GPS Ready (±${gpsLocation.accuracy}m)`
                    : gpsError || 'Acquiring GPS location...'}
                </span>
              </div>

              {/* Confirm Button */}
              <button
                disabled={verifying || !!successAnimation}
                onClick={showVerifyModal === 'check_in' ? handleVerifyCheckIn : handleVerifyCheckOut}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base tracking-wide uppercase shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>{showVerifyModal === 'check_in' ? 'Capture & Check In' : 'Confirm Check Out'}</span>
                  </>
                )}
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

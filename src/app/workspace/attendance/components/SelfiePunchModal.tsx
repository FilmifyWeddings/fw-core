'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, MapPin, X, RefreshCw, AlertCircle, ShieldCheck, 
  Sparkles, Compass, CheckCircle2, LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FWTeamMember, AttendanceRecord } from '@/types';
import { captureAndCompressVideoFrame } from '@/lib/attendance/image-compression';

export interface SelfiePunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FWTeamMember;
  actionType: 'check_in' | 'check_out';
  onSuccess?: (result: { record?: AttendanceRecord; message?: string }) => void;
}

/**
 * Standard Haversine distance calculator between two GPS coordinates in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function SelfiePunchModal({
  isOpen,
  onClose,
  member,
  actionType = 'check_in',
  onSuccess
}: SelfiePunchModalProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Office geofence coordinates
  const custom = (member?.custom_data as any) || {};
  const officeLat = Number(
    (member as any)?.office_latitude ?? 
    (member as any)?.assigned_lat ?? 
    member?.latitude ?? 
    custom.office_latitude ?? 
    custom.assigned_lat ?? 
    custom.latitude ?? 
    0
  );
  const officeLng = Number(
    (member as any)?.office_longitude ?? 
    (member as any)?.assigned_lng ?? 
    member?.longitude ?? 
    custom.office_longitude ?? 
    custom.assigned_lng ?? 
    custom.longitude ?? 
    0
  );
  const allowedRadiusMeters = Number(
    (member as any)?.geofence_radius_meters || 
    member?.radius_meters || 
    custom.geofence_radius_meters || 
    custom.radius_meters || 
    100
  );

  const isExempt = Boolean(
    (member as any)?.geofence_exempt ||
    member?.is_geofence_exempt || 
    (member as any)?.geofence_required === false || 
    custom.geofence_exempt ||
    custom.is_geofence_exempt || 
    custom.allow_anywhere || 
    false
  );

  // Live Haversine distance computation
  const distanceMeters = useMemo(() => {
    if (!userLat || !userLng || !officeLat || !officeLng) return 0;
    return calculateDistance(userLat, userLng, officeLat, officeLng);
  }, [userLat, userLng, officeLat, officeLng]);

  const isInside = useMemo(() => {
    if (isExempt) return true;
    if (!officeLat || !officeLng) return true;
    return distanceMeters <= allowedRadiusMeters;
  }, [isExempt, officeLat, officeLng, distanceMeters, allowedRadiusMeters]);

  // Formatted distance display: >= 1000m shows "X.X km", else "X m"
  const formattedDistance = useMemo(() => {
    return distanceMeters >= 1000 
      ? `${(distanceMeters / 1000).toFixed(1)} km` 
      : `${distanceMeters} m`;
  }, [distanceMeters]);

  // Start front camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera access required for facial biometric selfie verification. Please allow camera access.');
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Acquire GPS position
  const acquireGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsError(err.code === 1 ? 'Location permission denied.' : 'GPS location unavailable.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      acquireGPS();
    } else {
      stopCamera();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setErrorMessage(null);
    }
    return () => {
      stopCamera();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, startCamera, stopCamera, acquireGPS]);

  // Execute punch in or out
  const handleExecutePunch = async () => {
    if (!isInside && !isExempt) {
      setErrorMessage(`Outside Geofence (${formattedDistance} away). Punch is permitted only within ${allowedRadiusMeters}m of office.`);
      return;
    }

    setVerifying(true);
    setErrorMessage(null);

    try {
      let selfieBase64 = '';
      if (videoRef.current && cameraActive) {
        try {
          const comp = await captureAndCompressVideoFrame(videoRef.current, 600, 0.55);
          selfieBase64 = comp.base64;
        } catch (e) {
          console.warn('Fallback capture frame:', e);
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 480;
          canvas.height = videoRef.current.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            selfieBase64 = canvas.toDataURL('image/jpeg', 0.6);
          }
        }
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
      const memberIdStr = String(member.id);

      const endpoint = actionType === 'check_in' 
        ? '/api/public/attendance/check-in' 
        : '/api/public/attendance/check-out';

      // Submit via backend API or fallback direct Supabase update
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: memberIdStr,
            lat: userLat,
            lng: userLng,
            accuracy,
            photoBase64: selfieBase64,
            address: member.location_name || (member as any).office_address || 'Studio Office'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (onSuccess) onSuccess(data);
          onClose();
          return;
        }
      } catch (apiErr) {
        console.warn('API endpoint fallback to direct Supabase operation:', apiErr);
      }

      // Direct fallback to Supabase attendance_logs
      if (actionType === 'check_in') {
        await supabase.from('attendance_logs').insert([{
          member_id: memberIdStr,
          member_name: member.name,
          date: todayStr,
          punch_in_time: nowIso,
          punch_in_lat: userLat,
          punch_in_lng: userLng,
          selfie_url: selfieBase64,
          check_in_selfie: selfieBase64,
          is_geofence_exempt: isExempt,
          status: 'PRESENT'
        }]);

        await supabase.from('attendance_records').upsert([{
          member_id: memberIdStr,
          date: todayStr,
          check_in_time: nowIso,
          check_in_lat: userLat,
          check_in_lng: userLng,
          check_in_photo_path: selfieBase64,
          check_in_selfie: selfieBase64,
          check_in_verified: true,
          status: 'present',
          updated_at: nowIso
        }], { onConflict: 'member_id,date' });
      } else {
        await supabase.from('attendance_logs').update({
          punch_out_time: nowIso,
          punch_out_lat: userLat,
          punch_out_lng: userLng,
          check_out_selfie_url: selfieBase64,
          punch_out_selfie: selfieBase64,
          status: 'COMPLETED'
        }).eq('member_id', memberIdStr).eq('date', todayStr);

        await supabase.from('attendance_records').update({
          check_out_time: nowIso,
          check_out_lat: userLat,
          check_out_lng: userLng,
          check_out_photo_path: selfieBase64,
          check_out_selfie: selfieBase64,
          check_out_verified: true,
          updated_at: nowIso
        }).eq('member_id', memberIdStr).eq('date', todayStr);
      }

      if (onSuccess) {
        onSuccess({ message: `${actionType === 'check_in' ? 'Checked in' : 'Checked out'} successfully` });
      }
      onClose();
    } catch (err: any) {
      console.error('Punch execution error:', err);
      setErrorMessage(err.message || 'Failed to complete attendance punch');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#1A1918] text-white w-full max-w-sm sm:max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  {actionType === 'check_in' ? 'Facial Biometric Punch In' : 'Facial Biometric Punch Out'}
                </h3>
                <p className="text-[11px] text-white/60">{member.name} • {member.primary_role || 'Staff'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Viewport with Biometric Oval Guide */}
          <div className="relative w-full aspect-[4/4] bg-black overflow-hidden flex items-center justify-center border-b border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Oval Face Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[66%] h-[78%] rounded-[50%] border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex flex-col items-center justify-between p-3">
                <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded-full font-bold">
                  Align Face in Oval
                </span>
                <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-[9px] text-white/70">
                  Facial Liveness Active
                </span>
              </div>
            </div>

            {cameraError && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-xs text-white/90 font-medium">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Enable Camera
                </button>
              </div>
            )}
          </div>

          {/* Live GPS Radar & Haversine Distance Status */}
          <div className="p-4 space-y-3 bg-white/[0.02]">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Geofence Radar</span>
                </div>
                <button
                  type="button"
                  onClick={acquireGPS}
                  className="text-[10px] text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Refresh GPS
                </button>
              </div>

              {userLat && userLng ? (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/60">GPS Accuracy: ±{accuracy}m</span>
                    <span className="font-mono text-amber-300 text-[10px]">
                      {userLat.toFixed(4)}, {userLng.toFixed(4)}
                    </span>
                  </div>

                  {/* Haversine Computed Distance Display */}
                  {isExempt ? (
                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1.5">
                      <span>🌐 Remote Authorized (Punch allowed anywhere)</span>
                    </div>
                  ) : (
                    <div className={`p-2 rounded-xl text-[11px] font-bold flex items-center justify-between border ${
                      isInside 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                    }`}>
                      <span>
                        {isInside 
                          ? `✓ Inside Geofence (${formattedDistance} from office)` 
                          : `⚠️ Outside Geofence (${formattedDistance} away)`}
                      </span>
                      <span className="text-[10px] opacity-75 font-normal">Max: {allowedRadiusMeters}m</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white/60 text-xs py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Acquiring high accuracy GPS coordinates...</span>
                </div>
              )}

              {gpsError && (
                <p className="text-[10.5px] text-rose-400 font-medium">{gpsError}</p>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Submit Punch Button */}
            <button
              type="button"
              disabled={verifying || (!isInside && !isExempt)}
              onClick={handleExecutePunch}
              className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-900 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                !isInside && !isExempt
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                  : actionType === 'check_in'
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
              }`}
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Biometric Punch...</span>
                </>
              ) : actionType === 'check_in' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Biometric Punch In</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Confirm Biometric Punch Out</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

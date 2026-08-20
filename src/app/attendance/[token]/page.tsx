'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, Coffee, 
  LogOut, RefreshCw, ShieldCheck, Sparkles, AlertTriangle, Wifi, WifiOff, X,
  Calendar, Send, ChevronRight, Check, History, Plane, DollarSign, Award,
  Compass, ArrowUpRight, TrendingUp, Navigation, Pause, Play
} from 'lucide-react';
import type { AttendanceRecord, AttendanceBreak, AttendanceLocation } from '@/types';
import { validateCoordinatesAgainstGeofences, GeofenceValidationResult, calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';
import { captureAndCompressVideoFrame } from '@/lib/attendance/image-compression';
import { saveOfflinePunch, getOfflinePunches, removeOfflinePunch } from '@/lib/attendance/offline-store';

export default function PersonalAttendancePage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  // Tab State: 'punch' | 'report'
  const [activeTab, setActiveTab] = useState<'punch' | 'report'>('punch');

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  // Live Geofence Heartbeat & In-Zone Active State
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean>(true);
  const [currentDistanceMeters, setCurrentDistanceMeters] = useState<number>(0);
  const [currentAllowedRadius, setCurrentAllowedRadius] = useState<number>(50);
  const [lastExitTime, setLastExitTime] = useState<string | null>(null);

  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState<'check_in' | 'check_out' | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceValidationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'casual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Live clock tick
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
    checkOfflineQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkOfflineQueueCount = async () => {
    try {
      const items = await getOfflinePunches();
      setOfflineQueueCount(items.length);
    } catch (_) {}
  };

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
        setShifts(data.shifts || []);
        setMonthlyHistory(data.monthlyHistory || []);
        setRecentLeaves(data.recentLeaves || []);
      } else {
        console.error('Session error:', data.error);
        setErrorMessage(data.error || 'Failed to load session');
      }
    } catch (e) {
      console.error('Fetch session failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME GEOFENCE WATCHER (watchPosition + 60s Heartbeat)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    const handlePos = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);

      setGpsLocation({ lat, lng, accuracy });

      const validation = validateCoordinatesAgainstGeofences(
        { latitude: lat, longitude: lng },
        locations
      );

      setGeofenceResult(validation);
      setCurrentDistanceMeters(validation.distanceMeters);
      setCurrentAllowedRadius(validation.allowedRadiusMeters);

      if (validation.isWithinGeofence) {
        setIsInsideGeofence(true);
        setLastExitTime(null);
      } else {
        setIsInsideGeofence(false);
        setLastExitTime(prev => prev || new Date().toISOString());
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePos,
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [locations]);

  // Periodic Heartbeat Sync (every 60s when clocked in)
  useEffect(() => {
    if (!todayRecord || !todayRecord.check_in_time || todayRecord.check_out_time) return;

    const sendHeartbeat = async () => {
      if (!gpsLocation) return;
      try {
        const res = await fetch('/api/public/attendance/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            lat: gpsLocation.lat,
            lng: gpsLocation.lng,
            accuracy: gpsLocation.accuracy,
            lastExitTime,
            isPausedClient: !isInsideGeofence
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.record) setTodayRecord(data.record);
          if (data.autoCheckoutTriggered) {
            setSuccessAnimation('Shift Auto-Ended: Exited studio geofence perimeter.');
          }
        }
      } catch (_) {}
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(heartbeatInterval);
  }, [todayRecord?.check_in_time, todayRecord?.check_out_time, gpsLocation, isInsideGeofence, lastExitTime, token]);

  // Sync Offline Queue
  const syncOfflineQueue = async () => {
    try {
      const punches = await getOfflinePunches();
      if (punches.length === 0) return;

      const res = await fetch('/api/public/attendance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ punches })
      });

      if (res.ok) {
        for (const p of punches) {
          await removeOfflinePunch(p.id);
        }
        setOfflineQueueCount(0);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please enable camera permission.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // GPS Acquisition Helper
  const acquireGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported on this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        };
        setGpsLocation(coords);

        const res = validateCoordinatesAgainstGeofences(
          { latitude: coords.lat, longitude: coords.lng },
          locations
        );
        setGeofenceResult(res);
        setIsInsideGeofence(res.isWithinGeofence);
        setCurrentDistanceMeters(res.distanceMeters);
        setCurrentAllowedRadius(res.allowedRadiusMeters);
      },
      (err) => {
        console.warn('GPS error code:', err.code, err.message);
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow location access in your browser settings.');
        } else if (err.code === 2) {
          setGpsError('Location unavailable. Please ensure device Location / GPS is turned ON.');
        } else {
          setGpsError('GPS acquisition timed out. Retrying...');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Submit Punch (Check-In or Check-Out)
  const handleExecutePunch = async () => {
    if (!showVerifyModal) return;

    // Strict client-side Geofence blocker
    if (geofenceResult && !geofenceResult.isWithinGeofence) {
      setErrorMessage(`Outside Geofence (${geofenceResult.distanceMeters}m away). Check-in allowed only inside studio/venue perimeter (${geofenceResult.allowedRadiusMeters}m).`);
      return;
    }

    setVerifying(true);
    setErrorMessage(null);

    try {
      let compressedSelfie = '';
      if (videoRef.current && cameraActive) {
        try {
          const comp = await captureAndCompressVideoFrame(videoRef.current, 600, 0.55);
          compressedSelfie = comp.base64;
        } catch (e) {
          console.warn('Selfie compression fallback:', e);
        }
      }

      if (!navigator.onLine) {
        await saveOfflinePunch({
          token,
          action: showVerifyModal,
          timestamp: new Date().toISOString(),
          latitude: gpsLocation?.lat || 0,
          longitude: gpsLocation?.lng || 0,
          accuracy: gpsLocation?.accuracy || 0,
          selfieBase64: compressedSelfie
        });

        setOfflineQueueCount(prev => prev + 1);
        setSuccessAnimation(showVerifyModal === 'check_in' ? 'Punch-In Saved (Offline)' : 'Punch-Out Saved (Offline)');
        stopCamera();
        setShowVerifyModal(null);
        setVerifying(false);
        return;
      }

      const endpoint = showVerifyModal === 'check_in' ? '/api/public/attendance/check-in' : '/api/public/attendance/check-out';
      const resolvedAddress = geofenceResult?.nearestLocationName || locations[0]?.name || (gpsLocation ? `Lat: ${gpsLocation.lat.toFixed(4)}, Lng: ${gpsLocation.lng.toFixed(4)}` : '');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lat: gpsLocation?.lat,
          lng: gpsLocation?.lng,
          accuracy: gpsLocation?.accuracy,
          address: resolvedAddress,
          photoBase64: compressedSelfie,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.record) {
          setTodayRecord(data.record);
        }
        setSuccessAnimation(data.message || (showVerifyModal === 'check_in' ? 'Checked In Successfully!' : 'Checked Out Successfully!'));
        stopCamera();
        setShowVerifyModal(null);
        fetchSession();
      } else {
        setErrorMessage(data.error || 'Failed to submit punch');
      }
    } catch (err: any) {
      console.error('Punch execution error:', err);
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setVerifying(false);
    }
  };

  // Submit Leave Request
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) return;
    setLeaveSubmitting(true);

    try {
      const res = await fetch('/api/public/attendance/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          leave_type: leaveForm.leave_type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          reason: leaveForm.reason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowLeaveModal(false);
        setLeaveForm({
          leave_type: 'casual',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          reason: ''
        });
        setSuccessAnimation('Leave Application Submitted for Review!');
        fetchSession();
      } else {
        alert(data.error || 'Failed to apply leave');
      }
    } catch (e: any) {
      alert(e.message || 'Error applying leave');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Calculate live working duration in IST (Respecting real-time pauses)
  const getLiveDurationString = () => {
    if (!todayRecord || !todayRecord.check_in_time) return '0h 00m';
    const startMs = new Date(todayRecord.check_in_time).getTime();
    const endMs = todayRecord.check_out_time ? new Date(todayRecord.check_out_time).getTime() : currentTime.getTime();
    const diffMin = Math.max(0, Math.floor((endMs - startMs) / 60000) - (todayRecord.break_duration_minutes || 0));
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
  };

  // Monthly Report Calculations
  const monthlyStats = useMemo(() => {
    const records = monthlyHistory.filter(r => (r.date || '').startsWith(selectedMonth));
    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late');
    const lateCount = records.filter(r => r.status === 'late' || (r.late_minutes && r.late_minutes > 0));
    const totalWorkMins = records.reduce((acc, r) => acc + (r.work_duration_minutes || 0), 0);
    const totalOTMins = records.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);

    const dailyRate = 3500;
    const estimatedPayout = presentCount.length * dailyRate;

    return {
      totalLoggedDays: records.length,
      presentCount: presentCount.length,
      lateCount: lateCount.length,
      totalHours: Math.round((totalWorkMins / 60) * 10) / 10,
      totalOTHours: Math.round((totalOTMins / 60) * 10) / 10,
      estimatedPayout,
      records
    };
  }, [monthlyHistory, selectedMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#C89435] animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-[#746E67]">Authenticating attendance portal...</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = Boolean(todayRecord?.check_in_time && !todayRecord?.check_out_time);
  const isCheckedOut = Boolean(todayRecord?.check_out_time);
  const isPunchBlockedByGeofence = Boolean(geofenceResult && !geofenceResult.isWithinGeofence);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#211B17] flex flex-col justify-between max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-[#EFE8DC]">
      {/* Top App Bar */}
      <header className="px-5 pt-6 pb-3 bg-white border-b border-[#F0E8DC] sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C89435] to-[#8C6D33] text-white font-bold flex items-center justify-center shadow-md text-base">
              {member?.name ? member.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[#211B17] leading-tight flex items-center gap-1.5">
                <span>{member?.name || 'Team Member'}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#FAF3E6] text-[#8C6D33] border border-[#E9DFD2]">
                  {member?.primary_role || 'Staff'}
                </span>
              </h1>
              <div className="text-[11px] text-[#8C847B] flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-[#C89435]" />
                <span>{currentTime.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })} (IST)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-semibold border border-[#C8E6C9]">
                <Wifi className="w-2.5 h-2.5" />
                <span>Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFEBEE] text-[#C62828] text-[10px] font-semibold border border-[#FFCDD2] animate-pulse">
                <WifiOff className="w-2.5 h-2.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher: 1. Punch Stage | 2. My Monthly Report */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-[#FAF8F3] rounded-xl border border-[#F0E8DC]">
          <button
            onClick={() => setActiveTab('punch')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'punch'
                ? 'bg-[#C89435] text-white shadow-xs'
                : 'text-[#746E67] hover:text-[#211B17]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Punch Stage</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-[#C89435] text-white shadow-xs'
                : 'text-[#746E67] hover:text-[#211B17]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Monthly Report</span>
          </button>
        </div>

        {/* Offline Queue Notification Pill */}
        {offlineQueueCount > 0 && (
          <div className="mt-2.5 p-2 bg-[#FFF8E1] border border-[#FFE082] rounded-[10px] text-[11px] text-[#F57F17] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{offlineQueueCount} offline punch(es) pending auto-sync</span>
            </div>
            {isOnline && (
              <button 
                onClick={syncOfflineQueue}
                className="text-[10.5px] font-bold text-[#E65100] underline"
              >
                Sync Now
              </button>
            )}
          </div>
        )}

        {/* Real-Time Out-of-Radius Auto-Pause Alert Banner */}
        {isCheckedIn && !isCheckedOut && (
          <div className={`mt-2.5 p-2.5 rounded-[12px] text-xs flex items-center justify-between border transition-all ${
            isInsideGeofence 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
              : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2] shadow-sm animate-pulse'
          }`}>
            <div className="flex items-center gap-2">
              {isInsideGeofence ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-ping" />
                  <span className="font-bold">🟢 Active in Zone</span>
                  <span className="text-[10.5px] opacity-80">({currentDistanceMeters}m from studio)</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-[#C62828] flex-shrink-0" />
                  <div>
                    <span className="font-black block">⚠️ Timer Paused</span>
                    <span className="text-[10px] opacity-90">
                      You are {currentDistanceMeters}m outside allowed radius ({currentAllowedRadius}m). Return to zone to resume.
                    </span>
                  </div>
                </>
              )}
            </div>
            <span className="text-[10.5px] font-mono font-bold whitespace-nowrap pl-2">
              {todayRecord?.break_duration_minutes ? `Paused: ${todayRecord.break_duration_minutes}m` : 'Live GPS'}
            </span>
          </div>
        )}
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
        {activeTab === 'punch' ? (
          <>
            {/* Live Clock & Shift Badge (IST) */}
            <div className="text-center my-2">
              <div className="text-[44px] font-black tracking-tight text-[#211B17] font-mono leading-none">
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <p className="text-[12px] text-[#8C847B] font-medium mt-1">
                {shifts[0]?.name ? `${shifts[0].name} (${shifts[0].start_time.substring(0, 5)} - ${shifts[0].end_time.substring(0, 5)})` : 'Standard Studio Shift (09:30 AM - 06:30 PM)'}
              </p>
            </div>

            {/* Status Card & Geofence Indicator */}
            <div className="bg-white rounded-[20px] p-4 border border-[#F0E8DC] shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F7F2EA]">
                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#99928A] block">Today's Status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isCheckedOut ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#ECEFF1] text-[#455A64]">
                        Checked Out
                      </span>
                    ) : isCheckedIn ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                        todayRecord?.status === 'late'
                          ? 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]'
                          : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                      } flex items-center gap-1`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                        {todayRecord?.status === 'late' ? `Late (${todayRecord?.late_minutes}m)` : 'On Duty (Present)'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#FFF3E0] text-[#E65100]">
                        Not Punched In
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-[#99928A] block">Active Work Time</span>
                  <span className="text-[16px] font-bold text-[#211B17] font-mono">
                    {getLiveDurationString()}
                  </span>
                </div>
              </div>

              {/* Today Timeline Points */}
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="bg-[#FAF8F3] p-2.5 rounded-[12px] border border-[#F2ECE2]">
                  <span className="text-[#8C847B] text-[10px] block">Punch In</span>
                  <span className="font-semibold text-[#211B17]">
                    {todayRecord?.check_in_time ? new Date(todayRecord.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                  </span>
                  {todayRecord?.late_minutes ? (
                    <span className="text-[9.5px] text-[#C62828] block">({todayRecord.late_minutes}m late arrival)</span>
                  ) : null}
                </div>

                <div className="bg-[#FAF8F3] p-2.5 rounded-[12px] border border-[#F2ECE2]">
                  <span className="text-[#8C847B] text-[10px] block">Punch Out</span>
                  <span className="font-semibold text-[#211B17]">
                    {todayRecord?.check_out_time ? new Date(todayRecord.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                  </span>
                  {todayRecord?.overtime_minutes ? (
                    <span className="text-[9.5px] text-[#2E7D32] block">(+{todayRecord.overtime_minutes}m OT)</span>
                  ) : null}
                </div>
              </div>

              {/* Persistent Selfie Preview if Punched In */}
              {todayRecord?.check_in_photo_path && (
                <div className="mt-3 pt-3 border-t border-[#F7F2EA] flex items-center gap-3">
                  <img
                    src={todayRecord.check_in_photo_path}
                    alt="Punch In Selfie"
                    className="w-12 h-12 rounded-xl object-cover border border-[#E9DFD2] shadow-2xs"
                  />
                  <div className="text-[11px] text-[#746E67]">
                    <span className="font-bold text-[#211B17] block">Selfie Verified</span>
                    <span className="text-[10px] text-[#99928A]">{todayRecord.notes || 'Recorded on duty'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button (Big Mobile Punch Button) */}
            <div className="my-2 flex flex-col items-center">
              {!isCheckedIn ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVerifyModal('check_in')}
                  className="w-44 h-44 rounded-full bg-gradient-to-tr from-[#2E7D32] via-[#388E3C] to-[#4CAF50] text-white font-bold flex flex-col items-center justify-center shadow-[0_12px_36px_rgba(46,125,50,0.38)] border-4 border-white active:shadow-inner"
                >
                  <Camera className="w-10 h-10 mb-1" />
                  <span className="text-[17px] tracking-wide uppercase font-black">PUNCH IN</span>
                  <span className="text-[10px] text-white/80 font-medium">Selfie + Geo-Radar</span>
                </motion.button>
              ) : !isCheckedOut ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVerifyModal('check_out')}
                  className="w-44 h-44 rounded-full bg-gradient-to-tr from-[#D32F2F] via-[#E53935] to-[#EF5350] text-white font-bold flex flex-col items-center justify-center shadow-[0_12px_36px_rgba(211,47,47,0.38)] border-4 border-white active:shadow-inner"
                >
                  <LogOut className="w-10 h-10 mb-1" />
                  <span className="text-[17px] tracking-wide uppercase font-black">PUNCH OUT</span>
                  <span className="text-[10px] text-white/80 font-medium">End Daily Shift</span>
                </motion.button>
              ) : (
                <div className="w-44 h-44 rounded-full bg-[#ECEFF1] text-[#546E7A] font-bold flex flex-col items-center justify-center border-4 border-white shadow-md">
                  <CheckCircle2 className="w-10 h-10 mb-1 text-[#2E7D32]" />
                  <span className="text-[15px] font-black">COMPLETED</span>
                  <span className="text-[10px] text-[#78909C]">Shift finished for today</span>
                </div>
              )}
            </div>

            {/* Apply Leave Shortcut */}
            <div className="mt-3">
              <button
                onClick={() => setShowLeaveModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#E9DFD2] rounded-[14px] text-[12px] font-semibold text-[#211B17] shadow-xs hover:border-[#C89435] transition-all"
              >
                <Plane className="w-4 h-4 text-[#C89435]" />
                <span>Apply for Leave / Regularization</span>
              </button>
            </div>
          </>
        ) : (
          /* TAB 2: MY MONTHLY REPORT & STATS */
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#211B17]">My Attendance & Earnings</h2>
                <p className="text-xs text-[#8C847B]">Summary of your shoot attendance and estimated payout.</p>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-[#E9DFD2] rounded-xl px-2.5 py-1 text-xs font-bold text-[#211B17] shadow-2xs font-mono"
              />
            </div>

            {/* Monthly Earnings Card */}
            <div className="bg-gradient-to-br from-[#211E1B] to-[#36302B] text-white p-5 rounded-[20px] shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#E5B55D] uppercase tracking-wider">Estimated Monthly Payout</span>
                <DollarSign className="w-4 h-4 text-[#E5B55D]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono">₹{monthlyStats.estimatedPayout.toLocaleString('en-IN')}</span>
                <span className="text-xs text-white/60">({monthlyStats.presentCount} Days × ₹3,500)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                <div>
                  <span className="text-white/60 text-[10px] block">Present</span>
                  <span className="font-bold text-[#81C784]">{monthlyStats.presentCount} Days</span>
                </div>
                <div>
                  <span className="text-white/60 text-[10px] block">Late Marks</span>
                  <span className="font-bold text-[#FFB74D]">{monthlyStats.lateCount}</span>
                </div>
                <div>
                  <span className="text-white/60 text-[10px] block">Overtime</span>
                  <span className="font-bold text-[#4FC3F7]">+{monthlyStats.totalOTHours}h</span>
                </div>
              </div>
            </div>

            {/* Day by Day Log */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#99928A]">Month Log ({selectedMonth})</h3>
              {monthlyStats.records.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-[#E9DFD2] text-center text-xs text-[#8C847B]">
                  No punch records logged for {selectedMonth}.
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyStats.records.map(rec => (
                    <div key={rec.id} className="p-3 bg-white rounded-[14px] border border-[#F0E8DC] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        {rec.check_in_photo_path ? (
                          <img src={rec.check_in_photo_path} alt="Selfie" className="w-10 h-10 rounded-lg object-cover border border-[#E9DFD2]" />
                        ) : null}
                        <div>
                          <div className="font-bold text-xs text-[#211B17]">
                            {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[10.5px] text-[#746E67] mt-0.5">
                            In: {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--'} | Out: {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'present' ? 'bg-[#E8F5E9] text-[#2E7D32]' :
                          rec.status === 'late' ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#FFEBEE] text-[#C62828]'
                        }`}>
                          {rec.status.toUpperCase()}
                        </span>
                        <div className="text-[10px] font-mono text-[#8C847B] mt-0.5">
                          {Math.floor((rec.work_duration_minutes || 0) / 60)}h {(rec.work_duration_minutes || 0) % 60}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-2.5 text-center border-t border-[#F0E8DC] bg-white/60 text-[10.5px] text-[#99928A]">
        StudioCore Enterprise Smart Geo-Attendance & Workforce
      </footer>

      {/* ========================================================= */}
      {/* 1. CAMERA & BIOMETRIC VERIFICATION MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-between p-4 max-w-md mx-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between text-white pt-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#4CAF50]" />
                <h3 className="text-base font-bold">
                  {showVerifyModal === 'check_in' ? 'Selfie Punch In' : 'Selfie Punch Out'}
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Camera Viewport with Oval Biometric Face Guide */}
            <div className="relative w-full aspect-[3/4] bg-black rounded-[24px] overflow-hidden border-2 border-white/20 my-auto flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Biometric Oval Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[62%] h-[72%] rounded-[50%] border-2 border-dashed border-[#C89435]/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col items-center justify-between p-4">
                  <span className="text-[10.5px] text-white/90 bg-black/60 px-2 py-0.5 rounded-full">
                    Align Face in Oval
                  </span>
                  <Sparkles className="w-5 h-5 text-[#C89435] animate-spin" />
                  <span className="text-[10px] text-white/70">
                    Auto-Compressing WebP &lt; 40KB
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-white">
                  <AlertCircle className="w-8 h-8 text-[#FF5252] mb-2" />
                  <p className="text-xs text-white/90">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-1.5 bg-[#C89435] text-white rounded-full text-xs font-semibold"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </div>

            {/* Real-time GPS Radar Status Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-[16px] p-3 text-white text-xs mb-3 border border-white/15">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#4CAF50] flex-shrink-0" />
                  <span className="font-semibold">Live GPS Radar</span>
                </div>
                <button
                  onClick={acquireGPS}
                  className="text-[10px] font-bold text-[#E5B55D] flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Refresh GPS
                </button>
              </div>

              {gpsLocation ? (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                    <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                    <span>Accuracy: ±{gpsLocation.accuracy}m</span>
                  </div>
                  {geofenceResult && (
                    <div className={`mt-1 text-[11px] font-medium ${geofenceResult.isWithinGeofence ? 'text-[#81C784]' : 'text-[#FF8A80] font-bold'}`}>
                      {geofenceResult.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-white/70 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Acquiring high accuracy GPS coordinates...</span>
                </div>
              )}
              {gpsError && <p className="text-[10.5px] text-[#FF8A80] mt-1">{gpsError}</p>}
            </div>

            {/* Error banner if rejected */}
            {errorMessage && (
              <div className="p-2.5 bg-[#FFCDD2] text-[#C62828] rounded-[10px] text-xs font-medium mb-3">
                {errorMessage}
              </div>
            )}

            {/* Confirm & Punch Button (Disabled strictly when outside radius) */}
            <button
              disabled={verifying || isPunchBlockedByGeofence}
              onClick={handleExecutePunch}
              className={`w-full py-3.5 rounded-[16px] text-sm font-black uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isPunchBlockedByGeofence
                  ? 'bg-slate-600 cursor-not-allowed opacity-60'
                  : showVerifyModal === 'check_in'
                  ? 'bg-gradient-to-r from-[#2E7D32] to-[#43A047] active:scale-[0.98]'
                  : 'bg-gradient-to-r from-[#C62828] to-[#E53935] active:scale-[0.98]'
              }`}
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Biometrics & Geo...</span>
                </>
              ) : isPunchBlockedByGeofence ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Outside Geofence Zone ({currentDistanceMeters}m)</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & {showVerifyModal === 'check_in' ? 'Punch In' : 'Punch Out'}</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 2. APPLY LEAVE MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F0E8DC] mb-4">
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-[#C89435]" />
                  <h3 className="text-base font-bold text-[#211B17]">Apply for Leave / Regularization</h3>
                </div>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-7 h-7 rounded-full bg-[#FAF8F3] text-[#746E67] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-3.5">
                <div>
                  <label className="text-[11.5px] font-bold text-[#746E67] block mb-1">Leave Type</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] border border-[#E9DFD2] rounded-[12px] text-xs font-semibold"
                  >
                    <option value="casual">Casual Leave (CL)</option>
                    <option value="sick">Sick Leave (SL)</option>
                    <option value="paid">Paid Privilege Leave (PL)</option>
                    <option value="comp_off">Compensatory Off (Comp-Off)</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11.5px] font-bold text-[#746E67] block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E9DFD2] rounded-[12px] text-xs font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-bold text-[#746E67] block mb-1">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#E9DFD2] rounded-[12px] text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11.5px] font-bold text-[#746E67] block mb-1">Reason for Leave</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="E.g., Attending family function, medical appointment..."
                    rows={3}
                    className="w-full px-3.5 py-2 bg-[#FAF8F3] border border-[#E9DFD2] rounded-[12px] text-xs font-medium resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="w-full py-3 bg-[#C89435] hover:bg-[#B3802B] text-white rounded-[14px] text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  {leaveSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Leave Request</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {successAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#211B17] text-white px-5 py-3 rounded-full shadow-2xl z-50 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
            <span>{successAnimation}</span>
            <button onClick={() => setSuccessAnimation(null)} className="ml-2 text-white/60">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

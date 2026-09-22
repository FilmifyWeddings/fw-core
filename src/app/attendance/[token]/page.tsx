'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, Coffee, 
  LogOut, RefreshCw, ShieldCheck, Sparkles, AlertTriangle, Wifi, WifiOff, X,
  Calendar, Send, ChevronRight, Check, History, Plane, DollarSign, Award,
  Compass, ArrowUpRight, TrendingUp, Navigation, Pause, Play, Sun,
  Smartphone, Share2
} from 'lucide-react';
import type { AttendanceRecord, AttendanceBreak, AttendanceLocation } from '@/types';
import { validateCoordinatesAgainstGeofences, GeofenceValidationResult, calculateDistance, calculateHaversineDistanceMeters } from '@/lib/attendance/geo-fence';
import { captureAndCompressVideoFrame } from '@/lib/attendance/image-compression';
import { saveOfflinePunch, getOfflinePunches, removeOfflinePunch } from '@/lib/attendance/offline-store';
import { analyzeAttendanceRecordTiming, formatMinutesToHumanReadable } from '@/lib/attendance/time-calculations';
import PunchDetailsModal from '@/components/attendance/PunchDetailsModal';

const formatShiftTime12h = (timeStr?: string) => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

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
  const [holidayToday, setHolidayToday] = useState<any>(null);
  const [companyHolidays, setCompanyHolidays] = useState<any[]>([]);
  const [isWeeklyOff, setIsWeeklyOff] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  // Day detail pop-up modal
  const [selectedDayRecord, setSelectedDayRecord] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Live Geofence Heartbeat & In-Zone Active State
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean>(true);
  const [currentDistanceMeters, setCurrentDistanceMeters] = useState<number>(0);
  const [currentAllowedRadius, setCurrentAllowedRadius] = useState<number>(150);
  const [lastExitTime, setLastExitTime] = useState<string | null>(null);

  // Formatted distance display: >= 1000m shows "X.X km", else "X m"
  const formattedDistance = useMemo(() => {
    return currentDistanceMeters >= 1000 
      ? `${(currentDistanceMeters / 1000).toFixed(1)} km` 
      : `${currentDistanceMeters} m`;
  }, [currentDistanceMeters]);

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

  // Check if member is exempt from geofence checks (support direct column, custom_data, and notes JSON)
  const isGeofenceExempt = useMemo(() => {
    if (!member) return false;
    let parsedNotes: any = {};
    try {
      if (member.notes && typeof member.notes === 'string' && member.notes.startsWith('{')) {
        parsedNotes = JSON.parse(member.notes);
      }
    } catch (_) {}

    const custom = (member.custom_data as any) || {};

    return Boolean(
      member.geofence_exempt === true ||
      member.is_geofence_exempt === true ||
      member.geofence_required === false ||
      custom.geofence_exempt === true ||
      custom.is_geofence_exempt === true ||
      custom.allow_anywhere === true ||
      custom.geofence_required === false ||
      parsedNotes.geofence_exempt === true ||
      parsedNotes.is_geofence_exempt === true ||
      parsedNotes.allow_anywhere === true ||
      parsedNotes.geofence_required === false
    );
  }, [member]);

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
        setHolidayToday(data.holidayToday || null);
        setCompanyHolidays(data.companyHolidays || []);
        setIsWeeklyOff(!!data.isWeeklyOff);
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

      setCurrentDistanceMeters(validation.distanceMeters);
      setCurrentAllowedRadius(validation.allowedRadiusMeters);

      if (isGeofenceExempt) {
        setIsInsideGeofence(true);
        setLastExitTime(null);
        setGeofenceResult({
          isWithinGeofence: true,
          closestLocation: validation.closestLocation || null,
          distanceMeters: validation.distanceMeters,
          allowedRadiusMeters: 99999,
          message: `✓ Remote Authorized (Punch allowed anywhere)`,
          nearestLocationName: validation.nearestLocationName || 'Remote Location'
        });
      } else {
        setGeofenceResult(validation);
        if (validation.isWithinGeofence) {
          setIsInsideGeofence(true);
          setLastExitTime(null);
        } else {
          setIsInsideGeofence(false);
          setLastExitTime(prev => prev || new Date().toISOString());
        }
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
  }, [locations, isGeofenceExempt]);

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
        checkOfflineQueueCount();
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
          width: { ideal: 720 },
          height: { ideal: 960 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Front camera stream error:', err);
      setCameraError('Camera access required for facial biometric verification. Please allow camera permissions.');
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
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);
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
        setCurrentDistanceMeters(res.distanceMeters);
        setCurrentAllowedRadius(res.allowedRadiusMeters);

        if (isGeofenceExempt) {
          setIsInsideGeofence(true);
          setGeofenceResult({
            isWithinGeofence: true,
            closestLocation: res.closestLocation || null,
            distanceMeters: res.distanceMeters,
            allowedRadiusMeters: 99999,
            message: `✓ Remote Authorized (Punch allowed anywhere)`,
            nearestLocationName: res.nearestLocationName || 'Remote Location'
          });
        } else {
          setGeofenceResult(res);
          setIsInsideGeofence(res.isWithinGeofence);
        }
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

    // Strict client-side Geofence blocker (only for non-exempt staff)
    if (!isGeofenceExempt && geofenceResult && !geofenceResult.isWithinGeofence) {
      const formattedDist = geofenceResult.distanceMeters >= 1000 
        ? `${(geofenceResult.distanceMeters / 1000).toFixed(1)} km` 
        : `${geofenceResult.distanceMeters} m`;
      setErrorMessage(`Outside Geofence (${formattedDist} away). Check-in allowed only inside studio/venue perimeter (${geofenceResult.allowedRadiusMeters}m).`);
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

  // Calculate live working duration in IST (Continuous timer until explicit Punch Out)
  const getLiveDurationString = () => {
    if (!todayRecord || !todayRecord.check_in_time) return '0h 00m';
    const startMs = new Date(todayRecord.check_in_time).getTime();
    const endMs = todayRecord.check_out_time ? new Date(todayRecord.check_out_time).getTime() : currentTime.getTime();
    const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Today's Real-time Shift Timing & Late/Early Arrival Analyzer
  const todayTiming = useMemo(() => {
    return analyzeAttendanceRecordTiming(
      todayRecord,
      member,
      shifts[0]?.start_time || '10:00',
      shifts[0]?.end_time || '19:00'
    );
  }, [todayRecord, member, shifts]);

  // Live Clocked-In Timer for Today
  const liveClockedInTimer = useMemo(() => {
    if (!todayRecord?.check_in_time || todayRecord?.check_out_time) return null;
    try {
      const diffMs = currentTime.getTime() - new Date(todayRecord.check_in_time).getTime();
      if (diffMs <= 0) return '0m';
      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${h}h ${m}m`;
    } catch (_) {
      return null;
    }
  }, [todayRecord, currentTime]);

  // Monthly Report Calculations
  const monthlyStats = useMemo(() => {
    const records = monthlyHistory.filter(r => (r.date || '').startsWith(selectedMonth));
    const uniquePresentDates = new Set(
      records
        .filter(r => r.check_in_time || r.status === 'present' || r.status === 'late' || r.status === 'half_day')
        .map(r => r.date)
        .filter(Boolean)
    );
    const distinctPresentCount = uniquePresentDates.size;

    let totalLateCount = 0;
    let totalLateMinutes = 0;
    let totalEarlyArrivalCount = 0;
    let totalEarlyArrivalMinutes = 0;
    let totalEarlyDepartureCount = 0;
    let totalEarlyDepartureMinutes = 0;
    let totalOvertimeCount = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkMinutes = 0;

    const analyzedRecords = records.map(r => {
      const timing = analyzeAttendanceRecordTiming(
        r,
        member,
        shifts[0]?.start_time || '10:00',
        shifts[0]?.end_time || '19:00'
      );

      const isLateRecord = timing.isLate || r.status === 'late' || (Number(r.late_minutes) > 0);
      const lateMins = timing.lateMinutes || Number(r.late_minutes) || 0;

      if (isLateRecord) {
        totalLateCount++;
        totalLateMinutes += lateMins;
      }
      if (timing.isEarlyArrival) {
        totalEarlyArrivalCount++;
        totalEarlyArrivalMinutes += timing.earlyArrivalMinutes;
      }
      if (timing.isEarlyCheckout) {
        totalEarlyDepartureCount++;
        totalEarlyDepartureMinutes += timing.earlyCheckoutMinutes;
      }
      if (timing.isOvertime) {
        totalOvertimeCount++;
        totalOvertimeMinutes += timing.overtimeMinutes;
      }

      const isTodayRec = r.date === new Date().toISOString().split('T')[0];
      let dayMins = 0;
      if (r.check_in_time && r.check_out_time) {
        const inMs = new Date(r.check_in_time).getTime();
        const outMs = new Date(r.check_out_time).getTime();
        dayMins = Math.max(0, Math.floor((outMs - inMs) / 60000));
      } else if (r.check_in_time && !r.check_out_time) {
        const inMs = new Date(r.check_in_time).getTime();
        const endMs = isTodayRec ? currentTime.getTime() : inMs;
        dayMins = Math.max(0, Math.floor((endMs - inMs) / 60000));
      } else {
        dayMins = Number(r.work_duration_minutes) || Number(r.total_work_minutes) || 0;
      }

      const breakMins = Number(r.break_duration_minutes) || 0;
      dayMins = Math.max(0, dayMins - breakMins);

      totalWorkMinutes += dayMins;

      return {
        ...r,
        timing,
        isLateRecord,
        dayWorkMinutes: dayMins
      };
    });

    const custom = (member?.custom_data as any) || {};
    const dailyRate = Number(member?.daily_rate) || Number(custom.daily_rate) || 0;
    const monthlySalary = Number(member?.monthly_salary) || Number(custom.monthly_salary) || 0;
    const isMonthly = monthlySalary > 0 || member?.payout_type === 'monthly';

    let estimatedPayout = 0;
    let payoutSubtitle = '';

    if (isMonthly) {
      estimatedPayout = monthlySalary;
      payoutSubtitle = `(Monthly Fixed Salary • ${distinctPresentCount} Days Present)`;
    } else if (dailyRate > 0) {
      estimatedPayout = distinctPresentCount * dailyRate;
      payoutSubtitle = `(${distinctPresentCount} Days × ₹${dailyRate.toLocaleString('en-IN')}/day)`;
    } else {
      estimatedPayout = 0;
      payoutSubtitle = `(${distinctPresentCount} Days Logged)`;
    }

    // Build complete calendar days for selectedMonth without skipping any dates
    const [yearStr, monthStr] = (selectedMonth || '').split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const todayDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const calendarDays: any[] = [];
    for (let d = totalDaysInMonth; d >= 1; d--) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Do not show upcoming/future dates in monthly report (strictly past days and today only)
      if (dateStr > todayDateStr) {
        continue;
      }

      const dayDate = new Date(dateStr + 'T12:00:00');
      const dayOfWeekShort = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

      // Check Holiday & Weekly Off definitions for this date
      const holidayMatch = (companyHolidays || []).find(h => h.holiday_date === dateStr);
      const isOff = (Array.isArray(member?.weekly_offs) && member.weekly_offs.length > 0)
        ? member.weekly_offs.includes(dayOfWeekShort)
        : (dayOfWeekShort === 'Sun');

      // 1. Is there a punch record?
      const punchRec = analyzedRecords.find(r => r.date === dateStr);

      if (punchRec) {
        let dutyType = punchRec.isLateRecord ? 'late' : (punchRec.status || 'present');
        let dutyTitle = punchRec.isLateRecord ? 'Late Arrival' : 'Present & Verified';
        let isHolidayDuty = false;
        let isWeekOffDuty = false;

        if (holidayMatch) {
          dutyType = 'worked_holiday';
          dutyTitle = `Holiday Duty (${holidayMatch.name || 'Festival'})`;
          isHolidayDuty = true;
        } else if (isOff) {
          dutyType = 'worked_week_off';
          dutyTitle = 'Week-Off Duty (Worked on Off)';
          isWeekOffDuty = true;
        }

        calendarDays.push({
          date: dateStr,
          type: dutyType,
          record: punchRec,
          timing: punchRec.timing,
          title: dutyTitle,
          isHolidayDuty,
          isWeekOffDuty,
          holidayName: holidayMatch?.name || null
        });
        continue;
      }

      // 2. Is there a Company Holiday?
      if (holidayMatch) {
        calendarDays.push({
          date: dateStr,
          type: 'holiday',
          record: null,
          title: holidayMatch.name || 'Company Holiday',
          note: holidayMatch.note
        });
        continue;
      }

      // 3. Is there an approved Leave?
      const leave = (recentLeaves || []).find(l => dateStr >= l.start_date && dateStr <= l.end_date && l.status !== 'rejected');
      if (leave) {
        calendarDays.push({
          date: dateStr,
          type: 'leave',
          record: null,
          title: `Leave (${leave.leave_type || 'Approved'})`,
          note: leave.reason
        });
        continue;
      }

      // 4. Is it a Weekly Off?
      if (isOff) {
        calendarDays.push({
          date: dateStr,
          type: 'weekly_off',
          record: null,
          title: 'Weekly Off'
        });
        continue;
      }

      // 5. Unpunched working day
      calendarDays.push({
        date: dateStr,
        type: 'absent',
        record: null,
        title: dateStr === todayDateStr ? 'Not Punched In Today' : 'Absent (No Punch Marked)'
      });
    }

    return {
      totalLoggedDays: records.length,
      presentCount: distinctPresentCount,
      lateCount: totalLateCount,
      totalLateMinutes,
      totalLateFormatted: formatMinutesToHumanReadable(totalLateMinutes),
      earlyArrivalCount: totalEarlyArrivalCount,
      earlyArrivalFormatted: formatMinutesToHumanReadable(totalEarlyArrivalMinutes),
      earlyDepartureCount: totalEarlyDepartureCount,
      earlyDepartureFormatted: formatMinutesToHumanReadable(totalEarlyDepartureMinutes),
      overtimeCount: totalOvertimeCount,
      totalOvertimeMinutes,
      totalOvertimeFormatted: formatMinutesToHumanReadable(totalOvertimeMinutes),
      totalWorkMinutes,
      totalWorkFormatted: formatMinutesToHumanReadable(totalWorkMinutes),
      totalHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
      totalOTHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      dailyRate,
      monthlySalary,
      isMonthly,
      estimatedPayout,
      payoutSubtitle,
      records: analyzedRecords,
      calendarDays
    };
  }, [monthlyHistory, selectedMonth, member, shifts, currentTime, companyHolidays, recentLeaves]);

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
  const isPunchBlockedByGeofence = !isGeofenceExempt && Boolean(geofenceResult && !geofenceResult.isWithinGeofence);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#211B17] flex flex-col justify-between max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-[#EFE8DC]">
      {/* Top App Bar */}
      <header className="px-5 pt-6 pb-3 bg-white border-b border-[#F0E8DC] sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C89435] to-[#8C6D33] text-white font-bold flex items-center justify-center shadow-md text-base overflow-hidden shrink-0 border border-amber-300">
              {member?.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                member?.name ? member.name.charAt(0).toUpperCase() : 'U'
              )}
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

        {/* Real-Time Continuous Live Working Status Banner */}
        {isCheckedIn && !isCheckedOut && (
          <div className="mt-2.5 p-2.5 rounded-[12px] text-xs flex items-center justify-between border transition-all bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-ping shrink-0" />
              <div>
                <span className="font-bold">🟢 Live Duty Active</span>
                <span className="text-[10.5px] opacity-80 ml-1.5 font-medium">
                  {isGeofenceExempt ? '(Remote Authorized)' : isInsideGeofence ? `(${formattedDistance} from studio)` : '(Field/Outdoor Duty)'}
                </span>
              </div>
            </div>
            <span className="text-[10.5px] font-mono font-black whitespace-nowrap pl-2 text-emerald-800">
              {getLiveDurationString()}
            </span>
          </div>
        )}
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
        {activeTab === 'punch' ? (
          <>
            {/* 1-Click Mobile Shortcut / Add to Home Screen Banner */}
            <div className="mb-3 p-3 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold text-amber-950 truncate">
                    1-Click Home Screen Punch
                  </p>
                  <p className="text-[10px] text-amber-800/80 truncate">
                    Save to phone home screen for instant access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-[11px] font-bold shrink-0 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Clock & Shift Badge (IST) */}
            <div className="text-center my-2">
              <div className="text-[44px] font-black tracking-tight text-[#211B17] font-mono leading-none">
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <p className="text-[12px] text-[#8C847B] font-medium mt-1">
                {shifts[0]?.name ? `${shifts[0].name} (${formatShiftTime12h(shifts[0].start_time)} - ${formatShiftTime12h(shifts[0].end_time)})` : 'Standard Studio Shift (10:00 AM - 07:00 PM)'}
              </p>
            </div>

            {/* Holiday / Weekly Off Alerts */}
            {holidayToday && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-950 font-bold flex items-center gap-2 mb-3 shadow-2xs">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-black text-purple-900 block">{holidayToday.name} (Company Holiday)</span>
                  <span className="text-[10px] text-purple-700 font-normal">Today is a paid festival holiday. Full attendance score is credited.</span>
                </div>
              </div>
            )}

            {isWeeklyOff && !isCheckedIn && !holidayToday && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 font-bold flex items-center gap-2 mb-3 shadow-2xs">
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-black text-amber-900 block">Scheduled Weekly Off</span>
                  <span className="text-[10px] text-amber-700 font-normal">Today is your weekly off day. You are not required to punch in.</span>
                </div>
              </div>
            )}

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
                        todayRecord?.status === 'holiday' || todayRecord?.device_info?.is_holiday_work
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : todayRecord?.status === 'week_off' || todayRecord?.device_info?.is_week_off_work
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          : todayTiming.isLate
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                      } flex items-center gap-1`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                        {todayRecord?.status === 'holiday' || todayRecord?.device_info?.is_holiday_work
                          ? '🎉 Holiday Duty'
                          : todayRecord?.status === 'week_off' || todayRecord?.device_info?.is_week_off_work
                          ? '🏖️ Week-Off Duty'
                          : todayTiming.isLate
                          ? `⏱️ Late by ${todayTiming.lateFormattedText}`
                          : 'On Duty (Present)'}
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
                  {todayTiming.isLate ? (
                    <span className="text-[10.5px] text-[#C62828] font-bold block mt-0.5">
                      ⏱️ Late by {todayTiming.lateFormattedText}
                    </span>
                  ) : todayTiming.isEarlyArrival ? (
                    <span className="text-[10.5px] text-[#2E7D32] font-bold block mt-0.5">
                      🟢 Arrived {todayTiming.earlyArrivalFormattedText} early
                    </span>
                  ) : todayRecord?.check_in_time ? (
                    <span className="text-[10.5px] text-[#2E7D32] font-semibold block mt-0.5">✓ On-Time</span>
                  ) : null}
                </div>

                <div className="bg-[#FAF8F3] p-2.5 rounded-[12px] border border-[#F2ECE2]">
                  <span className="text-[#8C847B] text-[10px] block">Punch Out</span>
                  <span className="font-semibold text-[#211B17]">
                    {todayRecord?.check_out_time ? new Date(todayRecord.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                  </span>
                  {todayTiming.isEarlyCheckout ? (
                    <span className="text-[10.5px] text-[#C62828] font-bold block mt-0.5">
                      🚪 Left {todayTiming.earlyCheckoutFormattedText} early
                    </span>
                  ) : todayTiming.isOvertime ? (
                    <span className="text-[10.5px] text-[#2E7D32] font-bold block mt-0.5">
                      ⚡ +{todayTiming.overtimeFormattedText} OT
                    </span>
                  ) : todayRecord?.check_out_time ? (
                    <span className="text-[10.5px] text-[#2E7D32] font-semibold block mt-0.5">✓ On-Time</span>
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
                <span className="text-[11px] font-bold text-[#E5B55D] uppercase tracking-wider">
                  {monthlyStats.isMonthly ? 'Monthly Salary' : 'Estimated Monthly Payout'}
                </span>
                <DollarSign className="w-4 h-4 text-[#E5B55D]" />
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black text-white font-mono">
                  ₹{monthlyStats.estimatedPayout.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-white/60 font-medium">
                  {monthlyStats.payoutSubtitle}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                <div>
                  <span className="text-white/60 text-[10px] block">Present</span>
                  <span className="font-bold text-[#81C784] text-xs">{monthlyStats.presentCount} Days</span>
                </div>
                <div>
                  <span className="text-white/60 text-[10px] block">Total Worked</span>
                  <span className="font-bold text-white text-xs">{monthlyStats.totalWorkFormatted || '0m'}</span>
                </div>
                <div>
                  <span className="text-white/60 text-[10px] block">Late Marks</span>
                  <span className="font-bold text-[#FFB74D] text-xs">{monthlyStats.lateCount} ({monthlyStats.totalLateFormatted})</span>
                </div>
                <div>
                  <span className="text-white/60 text-[10px] block">Overtime</span>
                  <span className="font-bold text-[#4FC3F7] text-xs">+{monthlyStats.totalOvertimeFormatted} ({monthlyStats.overtimeCount})</span>
                </div>
              </div>
            </div>

            {/* Day by Day Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#99928A]">Month Calendar Log ({selectedMonth})</h3>
                <span className="text-[10px] text-zinc-400 font-medium">Tap day to view photo & GPS</span>
              </div>

              {monthlyStats.calendarDays.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-[#E9DFD2] text-center text-xs text-[#8C847B]">
                  No calendar records for {selectedMonth}.
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyStats.calendarDays.map((day: any) => {
                    const rec = day.record;
                    const isPunched = Boolean(rec && (rec.check_in_time || rec.punch_in_time));
                    const isToday = day.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                    const isActiveNow = Boolean(rec && rec.check_in_time && !rec.check_out_time && isToday);

                    // Formatted Date
                    const dayDateObj = new Date(day.date + 'T12:00:00');
                    const formattedDay = dayDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

                    const checkInPhoto = rec?.check_in_photo_path || rec?.check_in_selfie || null;

                    return (
                      <div 
                        key={day.date}
                        onClick={() => {
                          setSelectedDayRecord(day);
                          setShowDetailsModal(true);
                        }}
                        className="p-3 bg-white rounded-[14px] border border-[#F0E8DC] flex items-center justify-between shadow-2xs hover:border-amber-300 transition-all cursor-pointer active:scale-[0.99] touch-manipulation group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isPunched ? (
                            checkInPhoto ? (
                              <img src={checkInPhoto} alt="Selfie" className="w-10 h-10 rounded-lg object-cover border border-[#E9DFD2] shrink-0" />
                            ) : day.type === 'worked_holiday' ? (
                              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-base shrink-0 border border-amber-300 shadow-2xs">
                                🌴
                              </div>
                            ) : day.type === 'worked_week_off' ? (
                              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center text-base shrink-0 border border-indigo-300 shadow-2xs">
                                🛋️
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                                <Camera className="w-4 h-4" />
                              </div>
                            )
                          ) : day.type === 'holiday' ? (
                            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center text-base shrink-0 border border-sky-200">
                              🌴
                            </div>
                          ) : day.type === 'weekly_off' ? (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-base shrink-0 border border-indigo-200">
                              🛋️
                            </div>
                          ) : day.type === 'leave' ? (
                            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-base shrink-0 border border-purple-200">
                              🏖️
                            </div>
                          ) : day.type === 'upcoming' ? (
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-400 flex items-center justify-center text-xs shrink-0 border border-zinc-200">
                              <Calendar className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs shrink-0 border border-rose-200">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#211B17] flex items-center gap-1.5">
                              <span>{formattedDay}</span>
                              {isToday && (
                                <span className="text-[9.5px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-black">
                                  Today
                                </span>
                              )}
                            </div>

                            <div className="text-[10.5px] text-[#746E67] mt-0.5 space-y-0.5 truncate">
                              {isPunched ? (
                                <>
                                  <div className="truncate">
                                    <span>In: {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}</span>
                                    {day.type === 'worked_holiday' ? (
                                      <span className="text-amber-800 font-bold ml-1.5">(🌴 Holiday Duty: {day.holidayName || 'Festival'})</span>
                                    ) : day.type === 'worked_week_off' ? (
                                      <span className="text-indigo-800 font-bold ml-1.5">(🛋️ Scheduled Week-Off Duty)</span>
                                    ) : rec.timing?.isLate ? (
                                      <span className="text-rose-600 font-bold ml-1.5">(Late by {rec.timing.lateFormattedText || `${rec.late_minutes || 0}m`})</span>
                                    ) : rec.timing?.isEarlyArrival ? (
                                      <span className="text-emerald-600 font-bold ml-1.5">({rec.timing.earlyArrivalFormattedText} early)</span>
                                    ) : rec.check_in_time ? (
                                      <span className="text-emerald-600 font-medium ml-1.5">(On-Time)</span>
                                    ) : null}
                                  </div>
                                  <div className="truncate">
                                    {rec.check_out_time ? (
                                      <>
                                        <span>Out: {new Date(rec.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                        {rec.timing?.isEarlyCheckout ? (
                                          <span className="text-rose-600 font-bold ml-1.5">(Left {rec.timing.earlyCheckoutFormattedText} early)</span>
                                        ) : rec.timing?.isOvertime ? (
                                          <span className="text-sky-600 font-bold ml-1.5">(+{rec.timing.overtimeFormattedText} OT)</span>
                                        ) : (
                                          <span className="text-emerald-600 font-medium ml-1.5">(On-Time)</span>
                                        )}
                                      </>
                                    ) : rec.check_in_time ? (
                                      isToday ? (
                                        <span className="text-emerald-600 font-bold animate-pulse">Out: In Progress (Active)</span>
                                      ) : (
                                        <span className="text-rose-600 font-bold">Out: Missed Check-Out</span>
                                      )
                                    ) : null}
                                  </div>
                                </>
                              ) : day.type === 'holiday' ? (
                                <div className="text-sky-700 font-bold truncate">
                                  🌴 {day.title}
                                </div>
                              ) : day.type === 'weekly_off' ? (
                                <div className="text-indigo-600 font-medium truncate">
                                  🛋️ Scheduled Weekly Off
                                </div>
                              ) : day.type === 'leave' ? (
                                <div className="text-purple-700 font-medium truncate">
                                  🏖️ {day.title}
                                </div>
                              ) : day.type === 'upcoming' ? (
                                <div className="text-zinc-400 font-medium truncate">
                                  Upcoming scheduled shift
                                </div>
                              ) : (
                                <div className="text-rose-600 font-medium truncate">
                                  ❌ Absent / Attendance Not Marked
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            day.type === 'worked_holiday' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' :
                            day.type === 'worked_week_off' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-black' :
                            day.type === 'present' ? 'bg-[#E8F5E9] text-[#2E7D32]' :
                            day.type === 'late' ? 'bg-[#FFF3E0] text-[#E65100]' :
                            day.type === 'holiday' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                            day.type === 'weekly_off' ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                            day.type === 'leave' ? 'bg-[#F3E8FF] text-[#7E22CE]' :
                            day.type === 'upcoming' ? 'bg-zinc-100 text-zinc-500' :
                            'bg-[#FFEBEE] text-[#C62828] font-bold'
                          }`}>
                            {day.type === 'worked_holiday' ? '🌴 HOLIDAY DUTY' :
                             day.type === 'worked_week_off' ? '🛋️ WEEK-OFF DUTY' :
                             day.type === 'weekly_off' ? 'WEEKLY OFF' :
                             day.type === 'holiday' ? 'HOLIDAY' :
                             day.type === 'leave' ? 'LEAVE' :
                             day.type === 'upcoming' ? 'UPCOMING' :
                             day.type === 'absent' ? 'ABSENT' :
                             day.type.toUpperCase()}
                          </span>

                          <div className="mt-0.5">
                            {isPunched ? (
                              isActiveNow ? (
                                <div className="text-[10px] font-mono text-emerald-600 font-bold animate-pulse">
                                  ⏱️ {liveClockedInTimer || 'Active'}
                                </div>
                              ) : (
                                <div className="text-[10px] font-mono text-[#8C847B]">
                                  {Math.floor((rec.dayWorkMinutes || rec.work_duration_minutes || 0) / 60)}h {(rec.dayWorkMinutes || rec.work_duration_minutes || 0) % 60}m worked
                                </div>
                              )
                            ) : day.type === 'weekly_off' ? (
                              <div className="text-[10px] font-mono text-indigo-400">Off</div>
                            ) : day.type === 'holiday' ? (
                              <div className="text-[10px] font-mono text-sky-600">Holiday</div>
                            ) : day.type === 'leave' ? (
                              <div className="text-[10px] font-mono text-purple-600">Approved</div>
                            ) : day.type === 'upcoming' ? (
                              <div className="text-[10px] font-mono text-zinc-400">--</div>
                            ) : (
                              <div className="text-[10px] font-mono text-rose-400">0h 0m</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Day Details Modal (Mobile / Desktop) */}
      <PunchDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDayRecord(null);
        }}
        dayData={selectedDayRecord}
        liveWorkFormatted={liveClockedInTimer || undefined}
      />

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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-white/90">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                      <span>Accuracy: ±{gpsLocation.accuracy}m</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-amber-300 bg-black/50 px-2 py-0.5 rounded-md border border-amber-300/30 font-bold">
                      📍 {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                    </span>
                  </div>
                  {isGeofenceExempt ? (
                    <div className="mt-1 text-[11px] font-bold text-[#81C784] bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center justify-between">
                      <span>✓ Remote Authorized (Punch Allowed)</span>
                      {currentDistanceMeters > 0 && (
                        <span className="text-[10px] font-normal opacity-80">({formattedDistance} from base)</span>
                      )}
                    </div>
                  ) : geofenceResult ? (
                    <div className={`mt-1 text-[11px] font-medium ${geofenceResult.isWithinGeofence ? 'text-[#81C784]' : 'text-[#FF8A80] font-bold'}`}>
                      {geofenceResult.message}
                    </div>
                  ) : null}
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
                  <span>Outside Geofence Zone ({formattedDistance})</span>
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

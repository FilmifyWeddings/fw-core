'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, MapPin, Camera, ExternalLink, Calendar, 
  CheckCircle2, AlertTriangle, LogIn, LogOut, Sun, 
  Sparkles, Coffee, ShieldCheck, Maximize2
} from 'lucide-react';

interface PunchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: any | null;
  liveWorkFormatted?: string;
}

export function formatTime12h(isoStr?: string | null): string {
  if (!isoStr) return '--';
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
    }
    return isoStr;
  } catch (_) {
    return isoStr || '--';
  }
}

export default function PunchDetailsModal({
  isOpen,
  onClose,
  dayData,
  liveWorkFormatted,
}: PunchDetailsModalProps) {
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  if (!isOpen || !dayData) return null;

  const rec = dayData.record || dayData;
  const timing = dayData.timing || rec.timing;
  const isPunched = Boolean(rec && (rec.check_in_time || rec.punch_in_time));
  const todayIstStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  const isToday = dayData.date === todayIstStr;
  const isActiveNow = Boolean(rec && rec.check_in_time && !rec.check_out_time && isToday);

  // Photos
  const checkInPhoto = rec?.check_in_photo_path || rec?.check_in_selfie || rec?.selfie_url || null;
  const checkOutPhoto = rec?.check_out_photo_path || rec?.check_out_selfie || rec?.check_out_selfie_url || null;

  // Times
  const inTimeStr = rec?.check_in_time || rec?.punch_in_time;
  const outTimeStr = rec?.check_out_time || rec?.punch_out_time;

  // Locations & Coordinates
  const inLat = rec?.check_in_lat || rec?.punch_in_lat;
  const inLng = rec?.check_in_lng || rec?.punch_in_lng;
  const inLocationName = rec?.notes || rec?.location_name || rec?.location_address || 'Studio / Office Perimeter';

  const outLat = rec?.check_out_lat || rec?.punch_out_lat;
  const outLng = rec?.check_out_lng || rec?.punch_out_lng;
  const outLocationName = rec?.check_out_address || rec?.notes || rec?.location_name || 'Studio / Office Perimeter';

  // Worked Duration - Strictly calculated from check_in_time
  let durationDisplay = '';
  if (isActiveNow) {
    if (inTimeStr) {
      const startMs = new Date(inTimeStr).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      durationDisplay = `${hrs}h ${mins}m Active`;
    } else {
      durationDisplay = liveWorkFormatted || 'In Progress (Active)';
    }
  } else if (inTimeStr && outTimeStr) {
    const startMs = new Date(inTimeStr).getTime();
    const endMs = new Date(outTimeStr).getTime();
    const netMins = Math.max(0, Math.floor((endMs - startMs) / 60000)) - (Number(rec?.break_duration_minutes) || 0);
    const hrs = Math.floor(netMins / 60);
    const mins = netMins % 60;
    durationDisplay = `${hrs}h ${mins}m Worked`;
  } else if (rec?.work_duration_minutes || rec?.total_work_minutes) {
    const mins = Number(rec.work_duration_minutes || rec.total_work_minutes);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    durationDisplay = `${h}h ${m}m Worked`;
  }

  // Date Formatting
  const formattedDate = (() => {
    try {
      const d = new Date(dayData.date + 'T12:00:00');
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (_) {
      return dayData.date;
    }
  })();

  const isHolidayDuty = Boolean(dayData.isHolidayDuty || dayData.type === 'worked_holiday' || (isPunched && (rec?.status === 'holiday' || (rec as any)?.device_info?.is_holiday_work)));
  const isWeekOffDuty = Boolean(dayData.isWeekOffDuty || dayData.type === 'worked_week_off' || (isPunched && (rec?.status === 'week_off' || (rec as any)?.device_info?.is_week_off_work)));
  const statusType = isHolidayDuty ? 'worked_holiday' : isWeekOffDuty ? 'worked_week_off' : (dayData.type || (timing?.isLate ? 'late' : (rec?.status || 'present')));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100020] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white text-zinc-900 w-full max-w-md rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col my-auto relative max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#FAF9F6] border-b border-[#F0ECE4] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 leading-tight">
                  {formattedDate}
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                  Punch Verification & Time Log
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Status & Duration Summary Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-[#EBE7DF]">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isHolidayDuty ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs font-extrabold' :
                  isWeekOffDuty ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs font-extrabold' :
                  statusType === 'present' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  statusType === 'late' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  statusType === 'holiday' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                  statusType === 'weekly_off' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                  statusType === 'leave' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                  'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {isHolidayDuty ? '🌴 HOLIDAY DUTY' :
                   isWeekOffDuty ? '🛋️ WEEK-OFF DUTY' :
                   statusType === 'weekly_off' ? 'WEEKLY OFF' :
                   statusType === 'holiday' ? 'HOLIDAY' :
                   statusType === 'leave' ? 'LEAVE' :
                   statusType === 'absent' ? 'ABSENT' :
                   statusType.toUpperCase()}
                </span>
                {isActiveNow && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Live Clocked In
                  </span>
                )}
              </div>

              {durationDisplay && (
                <span className="text-xs font-mono font-bold text-zinc-700 bg-white px-2.5 py-1 rounded-xl border border-[#EBE7DF] shadow-2xs">
                  ⏱️ {durationDisplay}
                </span>
              )}
            </div>

            {/* Special Holiday / Week-Off Duty Notice */}
            {isHolidayDuty && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                <span>🌴</span>
                <span>Special Duty: Punch logged on Company Festival Holiday ({dayData.holidayName || 'Official Holiday'}).</span>
              </div>
            )}
            {isWeekOffDuty && (
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center gap-2">
                <span>🛋️</span>
                <span>Special Duty: Punch logged on scheduled Weekly Off.</span>
              </div>
            )}

            {/* Non-Punch Days Explanation */}
            {!isPunched && (
              <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#EBE7DF] text-center space-y-2">
                <div className="text-3xl mx-auto">
                  {statusType === 'holiday' ? '🌴' : statusType === 'weekly_off' ? '🛋️' : statusType === 'leave' ? '🏖️' : '📋'}
                </div>
                <h4 className="text-sm font-bold text-zinc-900">
                  {dayData.title || (statusType === 'holiday' ? 'Company Holiday' : statusType === 'weekly_off' ? 'Scheduled Weekly Off' : 'No Punch Logged')}
                </h4>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  {statusType === 'holiday'
                    ? 'No shift required. Studio was officially closed for company holiday.'
                    : statusType === 'weekly_off'
                    ? 'Scheduled weekly rest day for employee roster.'
                    : statusType === 'leave'
                    ? 'Leave approved for this date.'
                    : 'No check-in or punch record registered on this date.'}
                </p>
              </div>
            )}

            {/* Punch In Card */}
            {isPunched && inTimeStr && (
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <LogIn className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black uppercase text-zinc-800">Punch In Record</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {formatTime12h(inTimeStr)}
                  </span>
                </div>

                <div className="flex gap-3">
                  {/* Selfie Photo */}
                  {checkInPhoto ? (
                    <div 
                      onClick={() => setZoomPhoto(checkInPhoto)}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 shrink-0 cursor-pointer group bg-zinc-100"
                    >
                      <img src={checkInPhoto} alt="Punch In Selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 shrink-0 text-[10px]">
                      <Camera className="w-5 h-5 mb-0.5 text-zinc-300" />
                      <span>No Selfie</span>
                    </div>
                  )}

                  {/* Punch In Details */}
                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    <div>
                      {timing?.isLate ? (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                          ⚠️ Late by {timing.lateFormattedText || `${rec?.late_minutes || 0}m`}
                        </span>
                      ) : timing?.isEarlyArrival ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                          ✓ Early by {timing.earlyArrivalFormattedText}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                          ✓ On-Time Arrival
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-zinc-600 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-tight">{inLocationName}</span>
                    </div>

                    {inLat && inLng && (
                      <a
                        href={`https://www.google.com/maps?q=${inLat},${inLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold mt-0.5 hover:underline"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Punch Out Card */}
            {isPunched && (
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBE7DF] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black uppercase text-zinc-800">Punch Out Record</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {outTimeStr ? formatTime12h(outTimeStr) : (isActiveNow ? 'Active' : '--')}
                  </span>
                </div>

                {outTimeStr ? (
                  <div className="flex gap-3">
                    {/* Checkout Selfie */}
                    {checkOutPhoto ? (
                      <div 
                        onClick={() => setZoomPhoto(checkOutPhoto)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 shrink-0 cursor-pointer group bg-zinc-100"
                      >
                        <img src={checkOutPhoto} alt="Punch Out Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 shrink-0 text-[10px]">
                        <Camera className="w-5 h-5 mb-0.5 text-zinc-300" />
                        <span>No Selfie</span>
                      </div>
                    )}

                    {/* Punch Out Details */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div>
                        {timing?.isEarlyCheckout ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                            ⚠️ Left {timing.earlyCheckoutFormattedText} early
                          </span>
                        ) : timing?.isOvertime ? (
                          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 inline-block">
                            + Overtime {timing.overtimeFormattedText}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                            ✓ Shift Completed On-Time
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-zinc-600 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{outLocationName}</span>
                      </div>

                      {outLat && outLng && (
                        <a
                          href={`https://www.google.com/maps?q=${outLat},${outLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold mt-0.5 hover:underline"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-50 text-center">
                    {isActiveNow ? (
                      <p className="text-xs font-bold text-emerald-700">
                        🟢 Staff member is currently working. Punch out will be recorded at end of shift.
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-rose-600">
                        ⚠️ No check-out recorded for this shift (Missed punch-out).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Close Button */}
          <div className="p-4 bg-[#FAF9F6] border-t border-[#F0ECE4] text-center">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Done / Close Details
            </button>
          </div>

          {/* Full Screen Photo Zoom Modal */}
          {zoomPhoto && (
            <div 
              onClick={() => setZoomPhoto(null)}
              className="fixed inset-0 z-[100030] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-sm w-full bg-black rounded-3xl overflow-hidden border border-white/20">
                <img src={zoomPhoto} alt="Zoomed Selfie" className="w-full h-auto object-contain max-h-[80vh]" />
                <button
                  onClick={() => setZoomPhoto(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

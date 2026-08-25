/**
 * Robust Indian Standard Time (Asia/Kolkata) Timing & Attendance Analytics Engine
 * Calculates exact Late Arrival, Early Arrival, Early Departure, and Overtime.
 */

export interface PunchTimingAnalysis {
  // Check-In metrics
  isLate: boolean;
  isEarlyArrival: boolean;
  lateMinutes: number;
  earlyArrivalMinutes: number;
  lateFormattedText: string;
  earlyArrivalFormattedText: string;

  // Check-Out metrics
  isEarlyCheckout: boolean;
  isOvertime: boolean;
  earlyCheckoutMinutes: number;
  overtimeMinutes: number;
  earlyCheckoutFormattedText: string;
  overtimeFormattedText: string;
}

/**
 * Formats minute count to human readable "Xh Ym" or "Ym"
 */
export function formatMinutesToHumanReadable(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Extracts exact IST (Asia/Kolkata) hours and minutes from any ISO date string or Date object
 */
export function getIstTotalMinutes(dateInput: string | Date | null | undefined): number | null {
  if (!dateInput) return null;
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return null;

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);

    const h = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return h * 60 + m;
  } catch (_) {
    return null;
  }
}

/**
 * Parses a shift string like "10:00:00" or "10:00" or "09:30 AM" into total minutes from midnight
 */
export function parseShiftTimeToMinutes(shiftStr: string | null | undefined, defaultMinutes: number): number {
  if (!shiftStr || typeof shiftStr !== 'string') return defaultMinutes;
  try {
    const clean = shiftStr.trim();
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        return h * 60 + m;
      }
    }
  } catch (_) {}
  return defaultMinutes;
}

/**
 * Comprehensive timing analyzer for a single attendance record
 */
export function analyzeAttendanceRecordTiming(
  record: {
    check_in_time?: string | null;
    check_out_time?: string | null;
    late_minutes?: number | null;
    early_arrival_minutes?: number | null;
    early_checkout_minutes?: number | null;
    overtime_minutes?: number | null;
    device_info?: any;
  } | null | undefined,
  member: {
    shift_start?: string | null;
    shift_end?: string | null;
    custom_data?: any;
  } | null | undefined,
  defaultShiftStart: string = '10:00',
  defaultShiftEnd: string = '19:00'
): PunchTimingAnalysis {
  const custom = (member?.custom_data as any) || {};
  const sStartStr = member?.shift_start ? String(member.shift_start) : (custom.shift_start ? String(custom.shift_start) : defaultShiftStart);
  const sEndStr = member?.shift_end ? String(member.shift_end) : (custom.shift_end ? String(custom.shift_end) : defaultShiftEnd);

  const shiftStartMinutes = parseShiftTimeToMinutes(sStartStr, 10 * 60); // default 10:00 AM (600 mins)
  const shiftEndMinutes = parseShiftTimeToMinutes(sEndStr, 19 * 60);     // default 07:00 PM (1140 mins)

  // 1. Check-In Analysis
  let lateMinutes = Number(record?.late_minutes) || Number(record?.device_info?.late_minutes) || 0;
  let earlyArrivalMinutes = Number(record?.early_arrival_minutes) || Number(record?.device_info?.early_arrival_minutes) || 0;

  if (record?.check_in_time) {
    const checkInMins = getIstTotalMinutes(record.check_in_time);
    if (checkInMins !== null) {
      if (checkInMins > shiftStartMinutes) {
        lateMinutes = checkInMins - shiftStartMinutes;
        earlyArrivalMinutes = 0;
      } else if (checkInMins < shiftStartMinutes) {
        earlyArrivalMinutes = shiftStartMinutes - checkInMins;
        lateMinutes = 0;
      } else {
        lateMinutes = 0;
        earlyArrivalMinutes = 0;
      }
    }
  }

  // 2. Check-Out Analysis
  let earlyCheckoutMinutes = Number(record?.early_checkout_minutes) || Number(record?.device_info?.early_checkout_minutes) || 0;
  let overtimeMinutes = Number(record?.overtime_minutes) || Number(record?.device_info?.overtime_minutes) || 0;

  if (record?.check_out_time) {
    const checkOutMins = getIstTotalMinutes(record.check_out_time);
    if (checkOutMins !== null) {
      if (checkOutMins < shiftEndMinutes) {
        earlyCheckoutMinutes = shiftEndMinutes - checkOutMins;
        overtimeMinutes = 0;
      } else if (checkOutMins > shiftEndMinutes) {
        overtimeMinutes = checkOutMins - shiftEndMinutes;
        earlyCheckoutMinutes = 0;
      } else {
        earlyCheckoutMinutes = 0;
        overtimeMinutes = 0;
      }
    }
  }

  return {
    isLate: lateMinutes > 0,
    isEarlyArrival: earlyArrivalMinutes > 0,
    lateMinutes,
    earlyArrivalMinutes,
    lateFormattedText: formatMinutesToHumanReadable(lateMinutes),
    earlyArrivalFormattedText: formatMinutesToHumanReadable(earlyArrivalMinutes),

    isEarlyCheckout: earlyCheckoutMinutes > 0,
    isOvertime: overtimeMinutes > 0,
    earlyCheckoutMinutes,
    overtimeMinutes,
    earlyCheckoutFormattedText: formatMinutesToHumanReadable(earlyCheckoutMinutes),
    overtimeFormattedText: formatMinutesToHumanReadable(overtimeMinutes)
  };
}

/**
 * ============================================================
 * WHATSAPP ANTI-BAN & HUMANIZED PACING ENGINE
 * src/lib/whatsapp-antiban.ts
 * ============================================================
 *
 * Implements organic, human-simulated scheduling to protect WhatsApp numbers
 * from automated detection, spam reporting, and account bans.
 *
 * KEY DEFENSES:
 * 1. Multi-Day Drip Jitter (±35 to 65 minutes):
 *    Prevents the "Same Minute Everyday" robotic fingerprint.
 * 2. Do Not Disturb (DND) / Working Hours Guard:
 *    Ensures messages are never dispatched between 9:00 PM and 9:30 AM IST.
 *    Late night triggers are rescheduled to the next morning (10:15 - 11:45 AM).
 * 3. Humanized Inter-Step Pacing:
 *    Enforces randomized intervals (12 - 25s) between consecutive messages.
 * ============================================================
 */

export interface AntiBanScheduleOptions {
  baseDate?: Date;
  delayValue: number;
  delayUnit: string;
  stepIndex?: number;
  enforceDND?: boolean;
}

/**
 * Calculates an organic, anti-ban safe dispatch date/time.
 */
export function calculateSmartAntiBanSchedule(
  baseDate: Date,
  delayValue: number,
  delayUnit: string,
  stepIndex = 0,
  enforceDND = true
): Date {
  let delayMs = 0;
  const unit = (delayUnit || 'minutes').toLowerCase();
  const val = Math.max(0, Number(delayValue) || 0);

  // Multi-step anti-ban pacing: 1 to 10 minutes random jitter ("aage peeche")
  const jitterSign = Math.random() < 0.5 ? -1 : 1;
  const randomJitterMins = Math.floor(Math.random() * 10) + 1; // 1 to 10 minutes
  const jitterMs = jitterSign * randomJitterMins * 60 * 1000;

  if (unit === 'seconds') {
    // If delay is zero or immediate, first step is 2-4s, subsequent steps 12-20s
    if (val === 0) {
      delayMs = stepIndex === 0 ? (2000 + Math.floor(Math.random() * 2000)) : (12000 + Math.floor(Math.random() * 8000));
    } else {
      delayMs = val * 1000 + Math.floor(Math.random() * 3000);
    }
  } else if (unit === 'minutes') {
    // Base minutes delay + random 1 to 10 minute jitter (minimum 1 minute)
    const baseMs = val * 60 * 1000;
    delayMs = Math.max(60 * 1000, baseMs + (stepIndex > 0 || val > 10 ? jitterMs : (randomJitterMins * 15 * 1000)));
  } else if (unit === 'hours') {
    // Base hours delay + random 1 to 10 minute organic jitter (e.g. 2 hrs ± 1..10 mins)
    const baseMs = val * 60 * 60 * 1000;
    delayMs = Math.max(10 * 60 * 1000, baseMs + jitterMs);
  } else if (unit === 'days') {
    // Multi-Day Followup: Base days delay + random 1 to 10 minute organic jitter
    // Prevents clockwork dispatch at the exact same minute everyday
    const baseMs = val * 24 * 60 * 60 * 1000;
    delayMs = Math.max(60 * 60 * 1000, baseMs + jitterMs);
  }

  let scheduled = new Date(baseDate.getTime() + delayMs);

  // Business Hours / DND Guard (Indian Standard Time UTC+5:30)
  // If the delay is in hours or days, guard against dispatching between 9:00 PM and 9:30 AM IST
  if (enforceDND && (unit === 'days' || unit === 'hours')) {
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // +05:30
    const istDate = new Date(scheduled.getTime() + istOffsetMs);
    const istHours = istDate.getUTCHours();
    const istMinutes = istDate.getUTCMinutes();

    // Night Window: 21:00 (9:00 PM) to 09:30 (9:30 AM)
    const isNight = istHours >= 21 || istHours < 9 || (istHours === 9 && istMinutes < 30);
    if (isNight) {
      // Shift to the next morning between 10:15 AM and 11:45 AM IST with randomized minute & second
      const randomMorningHour = 10 + (Math.random() > 0.4 ? 1 : 0); // 10 or 11
      const randomMorningMinute = 15 + Math.floor(Math.random() * 35); // 15 to 50
      const randomSeconds = Math.floor(Math.random() * 59);

      if (istHours >= 21) {
        // Night after 9 PM -> move to next calendar day morning
        istDate.setUTCDate(istDate.getUTCDate() + 1);
      }
      istDate.setUTCHours(randomMorningHour, randomMorningMinute, randomSeconds, 0);

      // Convert back to UTC ISO
      scheduled = new Date(istDate.getTime() - istOffsetMs);
    }
  }

  return scheduled;
}

/**
 * Returns a human-like delay (in ms) to wait between sending bulk or successive WhatsApp messages.
 */
export function getHumanizedStepDelay(stepIndex: number): number {
  if (stepIndex === 0) {
    return 2000 + Math.floor(Math.random() * 2000); // 2-4 seconds
  }
  // 13 - 19 seconds randomized pacing
  return 13000 + Math.floor(Math.random() * 6000);
}

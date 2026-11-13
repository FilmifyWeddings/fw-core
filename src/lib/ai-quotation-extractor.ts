import { 
  DEFAULT_AIRY_PROPOSAL, 
  normalizeQuotationData, 
  resolvePrimaryCoverLocation, 
  sanitizeAndParseJson,
  formatQuotationDate,
  STANDARD_PAGE_DEFINITIONS
} from '@/lib/quotation-defaults';
import { isPlaceholderCoupleName } from '@/lib/quotation-defaults';
import { transliterateDevanagariName } from '@/lib/speech-text-cleaner';

const QUOTATION_MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUOTATION_MONTH_IDX: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

export function parseQuotationDateParts(rawDate: string): { year: number; monthIdx: number; day: number } | null {
  if (!rawDate) return null;
  const formatted = formatQuotationDate(rawDate);
  if (!formatted || formatted === 'Date Not Fixed') return null;
  const m = formatted.match(/^(\d{1,2})\s*-\s*([A-Za-z]+)\s*-\s*(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIdx = QUOTATION_MONTH_IDX[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (isNaN(day) || monthIdx === undefined || isNaN(year)) return null;
  return { year, monthIdx, day };
}

/**
 * Pure UTC calendar arithmetic (avoids +05:30 / DST timezone off-by-one shifts).
 */
export function addDaysToQuotationDate(rawBaseDate: string, deltaDays: number): string {
  const parts = parseQuotationDateParts(rawBaseDate);
  if (!parts) return rawBaseDate || 'Date Not Fixed';
  const dt = new Date(Date.UTC(parts.year, parts.monthIdx, parts.day + deltaDays));
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const m = QUOTATION_MONTH_ABBR[dt.getUTCMonth()];
  const y = String(dt.getUTCFullYear());
  return `${d} - ${m} - ${y}`;
}

function parseSmallCountWord(token: string): number {
  const t = (token || '').trim().toLowerCase();
  const map: Record<string, number> = {
    '1': 1, 'एक': 1, 'one': 1,
    '2': 2, 'दो': 2, 'two': 2,
    '3': 3, 'तीन': 3, 'three': 3,
    '4': 4, 'चार': 4, 'four': 4,
    '5': 5, 'पांच': 5, 'पाँच': 5, 'five': 5,
    '6': 6, 'छह': 6, 'छः': 6, 'six': 6,
    '7': 7, 'सात': 7, 'seven': 7
  };
  return map[t] ?? (parseInt(t, 10) || 1);
}

/**
 * Detects relative day offset within a clause ("उसके अगले दिन" -> +1, "2 दिन बाद" -> +2, "एक दिन पहले" -> -1, "उसी दिन" -> 0).
 */
export function detectRelativeDayOffset(clause: string): number | null {
  if (!clause) return null;
  const s = clause.toLowerCase().trim();

  // Negative numeric days before: "2 days before", "दो दिन पहले"
  const negNumMatch = s.match(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|one|two|three|four|five|six|seven)\s*(?:दिन\s*(?:के\s*)?(?:पहले|पूर्व)|din\s*(?:ke\s*)?(?:pehle|pahle|before)|days?\s*(?:before|earlier|prior))(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i);
  if (negNumMatch) {
    return -parseSmallCountWord(negNumMatch[1]);
  }

  // Single day before: "previous day", "day before", "पिछले दिन", "उससे पहले दिन"
  if (/(?:पिछले\s*दिन|उससे\s*पहले(?:\s*(?:के|का|को))?\s*दिन|उसके\s*पहले(?:\s*(?:के|का|को))?\s*दिन|previous\s*day|day\s*before|pichle\s*din)/i.test(s)) {
    return -1;
  }

  // Day after next ("परसों" / "day after tomorrow" -> +2)
  if (/(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:परसों|parson|day\s*after\s*tomorrow)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(s)) {
    return 2;
  }

  // Positive numeric days later: "2 दिन बाद", "दो दिन के बाद", "2 days later", "after 2 days"
  const posNumMatch =
    s.match(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|one|two|three|four|five|six|seven)\s*(?:दिन\s*(?:के\s*)?(?:बाद|पश्चात|लेटर)|din\s*(?:ke\s*)?(?:baad|bad|later|after)|days?\s*(?:later|after))(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i) ||
    s.match(/(?:after|बाद)\s*(\d+|one|two|three|four|five|six|seven|दो|तीन|चार|पांच)\s*(?:days?|दिन)/i);
  if (posNumMatch) {
    return parseSmallCountWord(posNumMatch[1]);
  }

  // Next day: "उसके अगले दिन", "अगले दिन", "नेक्स्ट डे", "दूसरे दिन", "next day", "following day", "day after"
  if (/(?:उसके\s*अगले\s*दिन|अगले\s*दिन|दूसरे\s*दिन|नेक्स्ट\s*डे|next\s*day|following\s*day|day\s*after|uske\s*agle\s*din|agle\s*din|dusre\s*din|doosre\s*din|tomorrow)/i.test(s)) {
    return 1;
  }

  // Same day: "उसी दिन", "सेम डे", "same day", "same date", "एक ही दिन"
  if (/(?:उसी\s*दिन|सेम\s*डे|एक\s*ही\s*दिन|एक\s*ही\s*तारीख|एक\s*ही\s*डेट|usi\s*din|same\s*day|same\s*date|ek\s*hi\s*din|ek\s*hi\s*date|on\s*that\s*day)/i.test(s)) {
    return 0;
  }

  return null;
}

/**
 * Checks whether user text explicitly negates Pre-Wedding shoot.
 */
export function detectPreWeddingNegation(text: string): boolean {
  if (!text) return false;
  return /(?:no\s+pre[\s-]*wed(?:ding)?|without\s+pre[\s-]*wed(?:ding)?|skip\s+pre[\s-]*wed(?:ding)?|exclude\s+pre[\s-]*wed(?:ding)?|don'?t\s+(?:want|need|include|add)\s+pre[\s-]*wed(?:ding)?|pre[\s-]*wed(?:ding)?\s*(?:nahi|nahin|nhi|na|not\s*(?:required|needed|included))|प्री[\s-]*वेडिंग\s*(?:नहीं|नाहीं|नको|मत|छोड़)|प्रि[\s-]*वेडिंग\s*(?:नहीं|नाहीं|नको)|प्रीवेडिंग\s*(?:नहीं|नाहीं|नको))/i.test(text);
}

/**
 * Unicode-safe detection of Pre-Wedding shoot request in English, Hinglish, Hindi, or Marathi.
 */
export function detectPreWeddingIntent(text: string): boolean {
  if (!text || !text.trim()) return false;
  if (detectPreWeddingNegation(text)) return false;
  return /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:pre[\s-]*wed(?:ding)?|prewedding|pre[\s-]*shoot|preshoot|previewing|प्री[\s-]*वेडिंग|प्रि[\s-]*वेडिंग|प्रीवेडिंग|प्रिवेडिंग|प्री[\s-]*शूट|प्रि[\s-]*शूट|प्री[\s-]*शुट|प्रीशूट)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(text);
}

/**
 * Synchronizes Pre-Wedding (`shootDetails`) presence in a pageSequence array based strictly on visibility.
 */
export function syncShootPageInSequence(pageSequence: any[] | undefined, shootVisible: boolean): any[] {
  const base = Array.isArray(pageSequence) && pageSequence.length > 0 ? [...pageSequence] : [];
  const filtered = shootVisible
    ? base
    : base.filter((p: any) => {
        const typeStr = typeof p === 'string' ? p : (p?.type || p?.id || '');
        return typeStr !== 'shootDetails';
      });

  if (shootVisible) {
    const alreadyHasShoot = filtered.some((p: any) => {
      const typeStr = typeof p === 'string' ? p : (p?.type || p?.id || '');
      return typeStr === 'shootDetails';
    });
    if (!alreadyHasShoot) {
      const shootStd = STANDARD_PAGE_DEFINITIONS.find(s => s.type === 'shootDetails');
      const shootItem = {
        id: 'shootDetails-std',
        type: 'shootDetails',
        label: shootStd?.label || 'Pre-Wedding Shoot',
        isStandard: true
      };
      const aboutIdx = filtered.findIndex((p: any) => (typeof p === 'string' ? p : p?.type) === 'aboutUs');
      const coverIdx = filtered.findIndex((p: any) => (typeof p === 'string' ? p : p?.type) === 'cover');
      const insertAt = aboutIdx >= 0 ? aboutIdx + 1 : (coverIdx >= 0 ? coverIdx + 1 : 0);
      filtered.splice(insertAt, 0, shootItem);
    }
  }
  return filtered;
}

/**
 * Unicode-safe detection of explicit Special Value Additions / complimentary / freebie intent.
 * Ignores non-freebie English phrases like "freelance", "feel free", "hassle-free".
 */
export function detectSpecialValueIntent(text: string): boolean {
  if (!text || !text.trim()) return false;
  const scrubbed = text.replace(
    /\b(?:freelance(?:r|rs)?|feel[\s-]+free|hassle[\s-]+free|stress[\s-]+free|tension[\s-]+free|free[\s-]+time|duty[\s-]+free)\b/gi,
    ' '
  );
  return /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:special[\s-]+value[\s-]+additions?|value[\s-]+additions?|special[\s-]+add[\s-]*ons?|complimentary|complementary|free[\s-]+(?:drone|gift|gifts|addon|addons|add-on|add-ons|bonus|item|items|frame|frames|usb|box|storage|cloud|gallery|reel|reels|teaser|invite|e-?invite|calendar|album|mini\s*book|pre[\s-]*wed(?:ding)?|service|coverage|shoot)|(?:drone|frame|frames|usb|pendrive|pen\s*drive|album|mini\s*(?:album|book)|teaser|e-?invite|invite|gift|gifts)\s+(?:free|फ्री)|free\s+(?:mein|me|de\s+(?:rahe|dena|dijiye)|denge|dijiye|add|karo|rakhna|rakh\s+dena|laga\s+dena)|बोनस|कॉम्प्लिमेंट्री|कम्प्लिमेंट्री|स्पेशल\s*वैल्यू\s*एडिशन|स्पेशल\s*ऐड\s*ऑन|फ्री\s*(?:में|मे|देना|दे\s*देना|देंगे|रखो|रखना|ऐड|ड्रोन|फ्रेम|गिफ्ट|रील|टीज़र|एल्बम|पेनड्राइव|कवरेज)|मुफ़्त|मुफ्त)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(scrubbed);
}

/**
 * Extracts complimentary / Special Value Addition items from spoken/written user notes.
 */
export function extractSpecialValueAdditionsFromText(
  rawText: string,
  studioSpecialAddons: string[] = []
): string[] {
  if (!rawText || !rawText.trim()) return [];
  const scrubbed = rawText.replace(
    /\b(?:freelance(?:r|rs)?|feel[\s-]+free|hassle[\s-]+free|stress[\s-]+free|tension[\s-]+free|free[\s-]+time|duty[\s-]+free)\b/gi,
    ' '
  );
  if (!detectSpecialValueIntent(scrubbed)) return [];
  const results: string[] = [];
  const addItem = (label: string) => {
    const clean = (label || '').trim();
    if (!clean) return;
    if (!results.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      results.push(clean);
    }
  };
  const findCatalog = (re: RegExp): string | undefined =>
    studioSpecialAddons.find((a) => re.test(a));

  const scrubbedLower = scrubbed.toLowerCase();
  for (const addonTitle of studioSpecialAddons) {
    const clean = String(addonTitle || '').trim();
    if (!clean || clean.length < 4) continue;
    const low = clean.toLowerCase();
    if (scrubbedLower.includes(low)) {
      addItem(clean);
      continue;
    }
    const coreWords = low
      .replace(/\([^)]*\)/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['with', 'from', 'for', 'all', 'wedding', 'complimentary', 'free', 'custom'].includes(w));
    if (coreWords.length >= 2 && coreWords.every((w) => scrubbedLower.includes(w))) {
      addItem(clean);
    }
  }

  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:4k\s*)?(?:drone|ड्रोन)|(?:drone|ड्रोन)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/drone/i) || 'Complimentary Drone Coverage');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:\d+\s*)?(?:photo\s*)?(?:frames?|फ्रेम)|(?:photo\s*)?(?:frames?|फ्रेम)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/frame/i) || 'Complimentary Framed Photo Print');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:wooden\s*|crystal\s*)?(?:usb|pen\s*drive|pendrive|पेनड्राइव)|(?:usb|pen\s*drive|pendrive|पेनड्राइव)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/usb|pendrive/i) || 'Complimentary Wooden USB Presentation Box');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:1[\s-]*day\s*|1[\s-]*minute\s*)?(?:pre[\s-]*wed(?:ding)?\s*)?(?:teaser|टीज़र)|(?:pre[\s-]*wed(?:ding)?\s*)?(?:teaser|टीज़र)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/teaser/i) || 'Complimentary Pre-Wedding Teaser');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:e[\s-]*invite|save\s*the\s*date|invite|इनवाइट)|(?:e[\s-]*invite|save\s*the\s*date|invite|इनवाइट)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/invite|save\s*the\s*date/i) || 'Complimentary Save the Date Animated E-Invite');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:mini\s*(?:album|book)|parent\s*album|मिनी\s*एल्बम)|(?:mini\s*(?:album|book)|parent\s*album|मिनी\s*एल्बम)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/mini|parent\s*album/i) || 'Complimentary Mini Parent Album');
  }
  if (/(?:free|complimentary|complementary|फ्री|मुफ्त|मुफ़्त)\s*(?:cloud\s*storage|online\s*gallery|sneak\s*peek)|(?:cloud\s*storage|online\s*gallery)\s*(?:free|फ्री|मुफ्त|मुफ़्त)/i.test(scrubbed)) {
    addItem(findCatalog(/cloud|gallery|sneak/i) || 'Complimentary Online Gallery & Cloud Storage');
  }

  const protectedText = scrubbed.replace(/(\d),(?=\d)/g, '$1__NCOMMA__');
  const specialClauseRe = /(?:special\s+value\s+additions?|complimentary|complementary|बोनस|कॉम्प्लिमेंट्री)\s*(?:में|मे|mein|is|are|:|-|add)?\s*([^.!?\n।]+)/gi;
  for (const m of protectedText.matchAll(specialClauseRe)) {
    const tail = (m[1] || '')
      .replace(/__NCOMMA__/g, ',')
      .replace(/^(?:mein|me|में|मे|add|ऐड|करो|रखो|is|are|:|-)\s*/i, '')
      .replace(/\s+(?:free|mein|me|रखो|करो|ऐड|add|dena|dene|chahiye|hai|hain|रहेगा|रहेगी)$/i, '')
      .trim();
    if (!tail || tail.length < 3 || tail.length > 80) continue;
    if (
      isValidDeliverableItem(tail, studioSpecialAddons) &&
      !/^(?:item|items|addon|add-on|option|options|page|section|special|value|addition|additions)$/i.test(tail)
    ) {
      const prefixed = /^(?:complimentary|free|complementary)/i.test(tail)
        ? tail.replace(/\b[a-z]/g, (c) => c.toUpperCase())
        : `Complimentary ${tail.replace(/\b[a-z]/g, (c) => c.toUpperCase())}`;
      addItem(prefixed);
    }
  }

  return results;
}

/**
 * Synchronizes Special Value Additions (`specialValueAdditions`) presence in pageSequence based strictly on visibility.
 */
export function syncSpecialValuePageInSequence(pageSequence: any[] | undefined, specialVisible: boolean): any[] {
  const base = Array.isArray(pageSequence) && pageSequence.length > 0 ? [...pageSequence] : [];
  const filtered = specialVisible
    ? base
    : base.filter((p: any) => {
        const typeStr = typeof p === 'string' ? p : (p?.type || p?.id || '');
        return typeStr !== 'specialValueAdditions';
      });

  if (specialVisible) {
    const alreadyHas = filtered.some((p: any) => {
      const typeStr = typeof p === 'string' ? p : (p?.type || p?.id || '');
      return typeStr === 'specialValueAdditions';
    });
    if (!alreadyHas) {
      const stdDef = STANDARD_PAGE_DEFINITIONS.find(s => s.type === 'specialValueAdditions');
      const item = {
        id: 'specialValueAdditions-std',
        type: 'specialValueAdditions',
        label: stdDef?.label || 'Special Value Additions',
        isStandard: true
      };
      const delivIdx = filtered.findIndex((p: any) => (typeof p === 'string' ? p : p?.type) === 'deliverablesPage');
      const funcIdx = filtered.findIndex((p: any) => (typeof p === 'string' ? p : p?.type) === 'functionsPage');
      const priceIdx = filtered.findIndex((p: any) => (typeof p === 'string' ? p : p?.type) === 'pricingPage');
      const insertAt = delivIdx >= 0 ? delivIdx + 1 : (funcIdx >= 0 ? funcIdx + 1 : (priceIdx >= 0 ? priceIdx : filtered.length));
      filtered.splice(insertAt, 0, item);
    }
  }
  return filtered;
}

/**
 * Resolves any spoken/extracted ceremony name to the exact function name configured in the Studio Owner's Settings
 * (`workspace_event_types` + `workspace_quotation_settings.defaultFunctions`) so Quotations sync seamlessly to Team Manager & Post-Production.
 */
export function resolveStudioFunctionName(
  rawName: string,
  studioEventNames?: string[],
  defaultFunctions?: any[]
): string {
  const cleanRaw = (rawName || '').trim();
  const primaryNames: string[] = [];
  const secondaryNames: string[] = [];
  const seenPrimary = new Set<string>();
  const seenAll = new Set<string>();

  const collect = (candidate: any, targetArr: string[], seenSet: Set<string>) => {
    if (!candidate) return;
    if (typeof candidate === 'object') {
      if (String(candidate.category || '').toLowerCase() === 'ritual') return;
      candidate = candidate.name;
    }
    const name = String(candidate || '').trim();
    if (!name) return;
    const lower = name.toLowerCase();
    // Keep pre-wedding shoot out of main wedding function mapping
    if (/pre[\s-]*wed|prewedding|pre[\s-]*shoot|preshoot/.test(lower)) return;
    if (!seenSet.has(lower)) {
      seenSet.add(lower);
      targetArr.push(name);
    }
  };

  if (Array.isArray(studioEventNames)) {
    studioEventNames.forEach(item => {
      collect(item, primaryNames, seenPrimary);
      collect(item, secondaryNames, seenAll);
    });
  }
  if (Array.isArray(defaultFunctions)) {
    defaultFunctions.forEach(item => collect(item, secondaryNames, seenAll));
  }

  const orderedPool = primaryNames.length > 0 ? primaryNames : secondaryNames;

  if (!cleanRaw) {
    return resolveStudioSingleEvent('Wedding', orderedPool);
  }

  // Handle combined names like "Wedding + Haldi", "Haldi + Sangeet", or "Haldi & Mehendi"
  if (cleanRaw.includes('+') || /\s+(?:&|and|और)\s+/i.test(cleanRaw)) {
    const exactCombined = orderedPool.find(s => s.toLowerCase() === cleanRaw.toLowerCase());
    if (exactCombined) return exactCombined;
    const parts = cleanRaw
      .split(/\s*(?:\+|&|\band\b|और)\s*/i)
      .map(p => resolveStudioSingleEvent(p.trim(), orderedPool))
      .filter(Boolean);
    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(' + ');
    }
  }

  // Try authoritative workspace_event_types list first; only check secondary defaultFunctions if nothing matched
  if (primaryNames.length > 0) {
    const resPrimary = resolveStudioSingleEvent(cleanRaw, primaryNames, false);
    if (resPrimary) return resPrimary;
  }

  return resolveStudioSingleEvent(cleanRaw, secondaryNames, true) || cleanRaw.replace(/\b\w/g, l => l.toUpperCase());
}

function resolveStudioSingleEvent(rawName: string, studioNames: string[], allowDefaultFallback: boolean = true): string {
  const clean = (rawName || '').trim();
  const lower = clean.toLowerCase();

  // 1. Exact case-insensitive match in studio settings
  const exact = studioNames.find(s => s.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Strip generic ceremony suffixes and check exact match in studio settings ("Wedding Ceremony" -> "Wedding")
  const stripped = lower
    .replace(/\b(?:ceremony|function|night|party|shoot|event|day)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped) {
    const exactStripped = studioNames.find(s => s.toLowerCase() === stripped);
    if (exactStripped) return exactStripped;
  }

  // 3. Semantic synonym concept matching -> exact Studio Settings name (or clean StudioCore default)
  const conceptDefs: Array<{
    concept: string;
    testRaw: RegExp;
    preferStudioExact: string[];
    testStudioPartial: RegExp;
    fallbackDefault: string;
  }> = [
    {
      concept: 'wedding',
      testRaw: /^(?:शादी|लग्न|विवाह|फेरे|वेडिंग|बारात|nikah|anand\s*karaj|barat|baraat|wedding(?:\s+(?:ceremony|day|story|function))?|marriage|pheras)$/i,
      preferStudioExact: ['wedding', 'wedding day', 'wedding ceremony', 'varmala & pheras'],
      testStudioPartial: /^(?!.*pre[\s-]*wed).*(?:wedding|marriage|varmala|pheras)/i,
      fallbackDefault: 'Wedding'
    },
    {
      concept: 'haldi',
      testRaw: /(?:हल्दी|हळद|पीठी|pithi|haldi)/i,
      preferStudioExact: ['haldi', 'haldi ceremony'],
      testStudioPartial: /haldi|pithi/i,
      fallbackDefault: 'Haldi'
    },
    {
      concept: 'sangeet',
      testRaw: /(?:संगीत|sangeet)/i,
      preferStudioExact: ['sangeet', 'sangeet night'],
      testStudioPartial: /^sangeet(?:\s+night|\s+sandhya|\s+ceremony)?$/i,
      fallbackDefault: 'Sangeet'
    },
    {
      concept: 'mehendi',
      testRaw: /(?:मेहंदी|मेंहदी|meh[ae]?ndi|henna)/i,
      preferStudioExact: ['mehendi', 'mehndi', 'mehendi ceremony'],
      testStudioPartial: /meh[ae]?ndi/i,
      fallbackDefault: 'Mehendi'
    },
    {
      concept: 'engagement',
      testRaw: /(?:सगाई|रिंग\s*सेरेमनी|साखरपुडा|रोका|एंगेजमेंट|engagement|ring\s*ceremony|roka|sagai|tilak)/i,
      preferStudioExact: ['engagement', 'ring ceremony', 'ring ceremony / engagement', 'engagement ceremony', 'roka'],
      testStudioPartial: /ring\s*ceremony|engagement|roka|sagai/i,
      fallbackDefault: 'Ring Ceremony'
    },
    {
      concept: 'reception',
      testRaw: /(?:रिसेप्शन|reception)/i,
      preferStudioExact: ['reception', 'reception dinner'],
      testStudioPartial: /reception/i,
      fallbackDefault: 'Reception'
    },
    {
      concept: 'cocktail',
      testRaw: /(?:कॉकटेल|cocktail)/i,
      preferStudioExact: ['cocktail', 'cocktail party'],
      testStudioPartial: /cocktail/i,
      fallbackDefault: 'Cocktail Party'
    },
    {
      concept: 'pool_party',
      testRaw: /(?:पूल\s*पार्टी|pool\s*party)/i,
      preferStudioExact: ['pool party'],
      testStudioPartial: /pool\s*party/i,
      fallbackDefault: 'Pool Party'
    },
    {
      concept: 'mayra',
      testRaw: /(?:मायरा|भाता|mayra|bhat)/i,
      preferStudioExact: ['mayra', 'mayra function'],
      testStudioPartial: /mayra/i,
      fallbackDefault: 'Mayra'
    },
    {
      concept: 'ganesh_puja',
      testRaw: /(?:गणेश\s*पूजा|ganesh\s*puj|puja|pooja)/i,
      preferStudioExact: ['ganesh puja', 'puja', 'pooja'],
      testStudioPartial: /ganesh\s*pu|puja|pooja/i,
      fallbackDefault: 'Ganesh Puja'
    },
    {
      concept: 'home_entry',
      testRaw: /(?:गृह\s*प्रवेश|घर\s*का\s*शूट|घर\s*पे\s*एंट्री|home\s*entry|griha\s*pravesh)/i,
      preferStudioExact: ['home entry', 'home entry shoot', 'griha pravesh'],
      testStudioPartial: /home\s*entry|griha/i,
      fallbackDefault: 'Home Entry Shoot'
    }
  ];

  // Guard: don't match "wedding" inside "pre-wedding"
  if (!/pre[\s-]*wed/i.test(lower)) {
    for (const c of conceptDefs) {
      if (c.testRaw.test(lower) || (stripped && c.testRaw.test(stripped))) {
        if (studioNames.length > 0) {
          for (const pref of c.preferStudioExact) {
            const found = studioNames.find(s => s.toLowerCase() === pref);
            if (found) return found;
          }
          const partial = studioNames.find(s => c.testStudioPartial.test(s));
          if (partial) return partial;
        }
        return allowDefaultFallback ? c.fallbackDefault : '';
      }
    }
  }

  // 4. Title case normalized fallback if custom event wasn't in concept map
  if (studioNames.length > 0 && stripped) {
    const partialStudio = studioNames.find(s => s.toLowerCase() === stripped || s.toLowerCase().includes(stripped));
    if (partialStudio) return partialStudio;
  }

  return allowDefaultFallback ? clean.replace(/\b\w/g, l => l.toUpperCase()) : '';
}

/**
 * Resolves Crew Role Name respecting Studio Owner's master_crew_roles settings first.
 */
export function resolveStudioCrewRole(
  rawRole: string,
  studioCrewRoles?: Array<string | { name?: string; short_code?: string }>
): string {
  const raw = (rawRole || '').trim();
  if (!raw) return 'Candid Photographer';
  const list = Array.isArray(studioCrewRoles) ? studioCrewRoles : [];

  const exactByRoleOrCode = list.find((item) => {
    const name = typeof item === 'string' ? item : item?.name;
    const code = typeof item === 'string' ? '' : item?.short_code;
    return (name && name.toLowerCase() === raw.toLowerCase()) || (code && code.toLowerCase() === raw.toLowerCase());
  });
  if (exactByRoleOrCode) {
    return typeof exactByRoleOrCode === 'string' ? exactByRoleOrCode : (exactByRoleOrCode.name || raw);
  }

  const normalized = normalizeCrewRoleName(raw);
  const matchedNorm = list.find((item) => {
    const name = typeof item === 'string' ? item : item?.name;
    return name && name.toLowerCase() === normalized.toLowerCase();
  });
  if (matchedNorm) {
    return typeof matchedNorm === 'string' ? matchedNorm : (matchedNorm.name || normalized);
  }

  return normalized;
}

/**
 * Standardized Crew Role Normalization Dictionary with Intelligent Fuzzy Matching
 */
export function normalizeCrewRoleName(rawRole: string): string {
  if (!rawRole) return 'Candid Photographer';
  const s = rawRole.toLowerCase().trim();

  // 0. Semi Cinematic / Semi Kinematic (MUST be checked before general Cinematographer!)
  if (
    s.includes('semi-cinematic') || 
    s.includes('semi cinematic') || 
    s.includes('semi-kinematic') || 
    s.includes('semi kinematic') || 
    s.includes('semi-cine') || 
    s.includes('semi cine') || 
    s.includes('semi cinema') || 
    s === 'sc' || 
    s === 'scv'
  ) {
    return 'Semi Cinematic';
  }

  // 0.1 Semi Standard / Semi Traditional (MUST be checked before general Traditional!)
  if (
    s.includes('semi-standard') || 
    s.includes('semi standard') || 
    s.includes('semi-traditional') || 
    s.includes('semi traditional') || 
    s.includes('semi-trad') || 
    s.includes('semi trad') || 
    s === 'ss' || 
    s === 'stv' || 
    s === 'sst'
  ) {
    return 'Semi Standard';
  }

  // 1. Cinematographer & all variations / spelling mistakes
  if (
    s.includes('cinematog') || 
    s.includes('cinematrap') ||
    s.includes('cinematraf') ||
    s.includes('cinematic') || 
    s.includes('cinema') || 
    s.includes('cine video') || 
    s.includes('cine') || 
    s === 'cv'
  ) {
    return 'Cinematographer';
  }

  // 2. Candid Photographer & spelling mistakes
  if (
    s.includes('candid photo') || 
    s.includes('candid photog') || 
    s.includes('candid') || 
    s.includes('candit') || 
    s.includes('kandid') || 
    s === 'cp'
  ) {
    return 'Candid Photographer';
  }

  // 3. Traditional Photographer
  if (
    s.includes('traditional photo') || 
    s.includes('traditional camera') ||
    s.includes('traditional still') ||
    s.includes('trad photo') || 
    s.includes('tred photo') || 
    s.includes('treational photo') ||
    s.includes('trad photog') ||
    s === 'tp'
  ) {
    return 'Traditional Photographer';
  }

  // 3.1 Family Photographer
  if (s.includes('family photo') || s.includes('family photog') || s === 'fp') {
    return 'Family Photographer';
  }

  // 4. Traditional Videographer
  if (
    s.includes('traditional video') || 
    s.includes('trad video') || 
    s.includes('tred video') || 
    s.includes('tred videography') ||
    s.includes('trad videop') ||
    s === 'tv'
  ) {
    return 'Traditional Videographer';
  }

  // 5. Drone Pilot
  if (s.includes('drone') || s.includes('dron') || s.includes('aerial') || s === 'dp') {
    return 'Drone Pilot';
  }

  // 6. Assistant / Helper
  if (s.includes('assistant') || s.includes('asistant') || s === 'ass' || s.includes('helper') || s.includes('light boy') || s.includes('lightman')) {
    return 'Assistant / Helper';
  }

  // 7. Social Media / Reels
  if (s.includes('social media') || s.includes('story creator') || s.includes('reel') || s.includes('reels') || s === 'rc') {
    return 'Social Media Reels Creator';
  }

  // 8. Live streaming
  if (s.includes('live') || s.includes('streaming') || s.includes('led') || s === 'ls') {
    return 'Live Stream Operator';
  }

  // 9. Teaser
  if (s.includes('teaser') || s === 'ts') {
    return 'Teaser Specialist';
  }

  // 10. Editors
  if (s.includes('photo edit') || s.includes('retouch') || s === 'pe') {
    return 'Photo Editor / Retoucher';
  }
  if (s.includes('video edit') || s === 've') {
    return 'Video Editor';
  }
  if (s.includes('album') || s === 'ad') {
    return 'Album Designer';
  }

  // Capitalize custom role nicely
  return rawRole.trim().replace(/\b\w/g, l => l.toUpperCase());
}

const COUPLE_INVALID_WORDS = new Set([
  'होगी', 'होगा', 'रहेगा', 'रहेगी', 'रखना', 'चाहिए', 'शादी', 'हल्दी', 'संगीत', 'फेरे', 'लग्न', 'विवाह',
  'मेहंदी', 'सगाई', 'रिसेप्शन', 'कैंडिड', 'सिनेमैटोग्राफर', 'ड्रोन', 'ट्रेडिशनल', 'फोटोग्राफर', 'वीडियोग्राफर',
  'शूट', 'कोटेशन', 'प्रपोजल', 'बजट', 'पैकेज', 'वेडिंग', 'प्री', 'अगले', 'दूसरे', 'उसी', 'नेक्स्ट', 'पहले',
  'बाद', 'दिन', 'दोनों', 'सभी', 'एक', 'उसके', 'उसमें', 'नहीं',
  'उनकी', 'इनकी', 'उनका', 'उनके', 'उनको', 'मेरी', 'हमारी', 'तुम्हारी', 'आपकी', 'इसका', 'उसका', 'क्लाइंट',
  'स्टैंडर्ड', 'प्रीमियम', 'लक्ज़री', 'क्रू', 'टीम', 'पार्टनर', 'वीडियो', 'विडियो', 'फोटो', 'फोटोज', 'फोटोज़',
  'एडिटेड', 'रॉ', 'एल्बम', 'एलबम', 'रील', 'रील्स', 'इंस्टाग्राम', 'पेनड्राइव', 'हार्ड', 'ड्राइव', 'टीज़र', 'टीजर',
  'हाइलाइट', 'फिल्म', 'डिलीवरेबल', 'डिलीवरेबल्स', 'लोकेशन', 'वेन्यू', 'जगह', 'शहर', 'कुल', 'टोटल', 'अमाउंट',
  'एडवांस', 'एडवान्स', 'टोकन', 'बुकिंग', 'फिक्स', 'डिस्काउंट', 'ऑफर', 'ट्रैवल', 'स्टे', 'अतिरिक्त', 'फ्री',
  'बस', 'सिर्फ', 'केवल', 'सुबह', 'शाम', 'रात', 'दोपहर', 'पूरा', 'फुल', 'हाफ', 'दो', 'तीन', 'चार', 'पांच', 'पाँच',
  'घंटे', 'घंटा', 'इवेंट', 'इवेंट्स', 'फंक्शन', 'फंक्शंस', 'सारे', 'हर', 'अलग', 'सेम', 'साइड', 'दुल्हन', 'दूल्हा',
  'बनानी', 'बनाना', 'बनाने', 'है', 'हैं', 'देने', 'होंगे', 'इसमें', 'सबसे', 'लिए', 'लिये', 'की', 'का', 'के', 'को', 'में', 'से', 'पर',
  'हाँ', 'हां', 'सर', 'ओके', 'ठीक', 'तो', 'भी', 'ही', 'ये', 'वो', 'और', 'तथा', 'या', 'एवं',
  'wedding', 'marriage', 'shaadi', 'shadi', 'proposal', 'quotation', 'quote', 'haldi', 'sangeet', 'mehendi', 'mehndi',
  'reception', 'engagement', 'roka', 'cocktail', 'mayra', 'puja', 'pre', 'prewedding', 'shoot', 'candid', 'cine', 'cinematographer',
  'cinematography', 'cinematic', 'traditional', 'trad', 'drone', 'pilot', 'photographer', 'photography', 'videographer', 'videography',
  'budget', 'price', 'rate', 'cost', 'package', 'amount', 'total', 'advance', 'token', 'booking', 'fix', 'fixed', 'discount', 'offer',
  'regular', 'best', 'gst', 'tax', 'travel', 'stay', 'accommodation', 'extra', 'complimentary', 'free', 'option',
  'date', 'day', 'days', 'hour', 'hours', 'min', 'minute', 'minutes', 'next', 'same', 'both', 'all', 'each', 'every', 'after', 'before',
  'client', 'lead', 'partner', 'crew', 'team', 'standard', 'premium', 'luxury', 'basic', 'classic', 'semi', 'creator',
  'video', 'videos', 'photo', 'photos', 'edited', 'edit', 'raw', 'footage', 'album', 'albums', 'photobook', 'reel', 'reels', 'instagram',
  'pendrive', 'hard', 'drive', 'teaser', 'trailer', 'highlight', 'highlights', 'film', 'films', 'deliverable', 'deliverables',
  'location', 'venue', 'city', 'destination', 'place', 'different', 'separate', 'alag', 'only', 'bas', 'sirf', 'keval',
  'morning', 'evening', 'afternoon', 'night', 'full', 'half', 'one', 'two', 'three', 'four', 'five', 'event', 'events',
  'function', 'functions', 'ceremony', 'ceremonies', 'ritual', 'rituals', 'sabhi', 'saare', 'sare', 'har', 'music', 'decor', 'makeup',
  'family', 'friends', 'side', 'sides', 'bride', 'groom', 'couple', 'coverage', 'ring',
  'delhi', 'mumbai', 'pune', 'jaipur', 'udaipur', 'goa', 'lucknow', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
  'ahmedabad', 'surat', 'chandigarh', 'indore', 'nagpur', 'lonavala',
  'liye', 'liya', 'banani', 'banana', 'banane', 'banao', 'isme', 'ismein', 'uske', 'sabse', 'pehle', 'phir', 'fir', 'baad',
  'rahega', 'rahegi', 'rahna', 'rakhna', 'dena', 'dene', 'chahiye', 'hui', 'hua', 'hai', 'hain', 'ki', 'ka', 'ke', 'ko',
  'mein', 'me', 'se', 'par', 'aur', 'and', 'with', 'for', 'the', 'this', 'that', 'is', 'are', 'will', 'be', 'hum', 'humein',
  'humko', 'humare', 'hamare', 'mera', 'meri', 'mere', 'hamara', 'hamari', 'aap', 'aapka', 'aapki', 'aapke', 'unke', 'inke',
  'aaj', 'kal', 'parso', 'bhi', 'toh', 'haan', 'han', 'ok', 'okay', 'sir', 'ji', 'customer', 'demo', 'sample', 'new', 'naya', 'nayi',
  'jo', 'wo', 'woh', 'ye', 'yeh', 'mujhe', 'muje', 'mujhko', 'unko', 'inko', 'share', 'karna', 'karo', 'kardo', 'karne', 'karni',
  'bhejna', 'bhejo', 'usme', 'usmein', 'jisme', 'jismein', 'quotion', 'qution', 'qoutation', 'kotation', 'koteshan', 'kotesan',
  'venue', 'venues', 'add', 'kar', 'karke', 'humne', 'maine', 'mene', 'apne', 'apna', 'apni', 'ek', 'bhai', 'bro', 'friend',
  'hey', 'hi', 'hello', 'please', 'plz', 'kindly', 'create', 'make', 'generate', 'prepare', 'draft', 'send', 'bana', 'banado',
  'मुझे', 'हमें', 'मेरे', 'अपना', 'भाई', 'कृपया', 'करना', 'बनाना'
]);

const SPOKEN_NAME_MONTHS = new Set([
  'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may', 'june', 'jun',
  'july', 'jul', 'august', 'aug', 'september', 'sep', 'sept', 'october', 'oct', 'november', 'nov', 'december', 'dec'
]);

/**
 * Returns true if a couple name candidate is empty, punctuation/pronoun artifact ("। उनकी"), non-name phrase, or placeholder.
 */
export function isInvalidCoupleName(rawCandidate?: string | null, extraInvalidWords?: Set<string>): boolean {
  const cleaned = String(rawCandidate || '')
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return true;
  if (/\d|₹/.test(cleaned)) return true;
  if (isPlaceholderCoupleName(cleaned)) return true;
  const stripped = cleaned.replace(/[\s।|.,:;!?'"\-–—&+]/g, '');
  if (stripped.length < 2) return true;
  const allWords = cleaned.toLowerCase().split(/[\s&+/]+/).filter(Boolean);
  if (allWords.length === 0 || allWords.length > 6) return true;
  const parts = cleaned.toLowerCase().split(/\s*(?:&|weds|and|\+|तथा|और)\s*/i).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  const isStop = (w: string) =>
    COUPLE_INVALID_WORDS.has(w) || SPOKEN_NAME_MONTHS.has(w) || (extraInvalidWords ? extraInvalidWords.has(w) : false);
  // Every `&`-separated side MUST have at least one valid non-stopword word
  if (parts.some(p => {
    const words = p.split(/\s+/).filter(Boolean);
    return words.length === 0 || words.every(isStop);
  })) {
    return true;
  }
  return false;
}

/**
 * Translates common Devanagari/Hindi name words or phonetically transliterates arbitrary Devanagari names -> Title Case English.
 */
function normalizeSpokenNameToEnglish(rawName: string): string {
  if (!rawName) return '';
  let s = rawName
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .replace(/\s*(?:और|तथा|एवं|व|एंड|aur|and|weds|\+)\s*/gi, ' & ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/[\u0900-\u097F]/.test(s)) {
    const parts = s.split(' & ').map((side) => {
      const cleanedSide = transliterateDevanagariName(side.trim());
      return cleanedSide;
    });
    s = parts.join(' & ');
  }

  // Title-case Latin words neatly while preserving short initials like "O"
  return s
    .split(/\s+/)
    .map((tok) => {
      if (tok === '&') return '&';
      if (!/[A-Za-z]/.test(tok)) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\s*&\s*/g, ' & ')
    .trim();
}

/**
 * Strips conversational filler edges from a candidate client/couple name before validation.
 */
function cleanCandidateNameEdges(raw: string, extraInvalidWords?: Set<string>): string {
  let parts = String(raw || '')
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const isEdgeNoise = (w: string) => {
    const lw = w.toLowerCase();
    return COUPLE_INVALID_WORDS.has(lw) || SPOKEN_NAME_MONTHS.has(lw) || (extraInvalidWords ? extraInvalidWords.has(lw) : false);
  };

  while (parts.length > 0 && isEdgeNoise(parts[0])) parts.shift();
  while (parts.length > 0 && isEdgeNoise(parts[parts.length - 1])) parts.pop();
  return parts.join(' ').trim();
}

/**
 * Strips leading/trailing stopword prefixes from each side of a couple/client candidate and normalizes to clean Title Case with " & ".
 */
function cleanCoupleCandidateEdges(rawCandidate?: string | null, extraInvalidWords?: Set<string>): string {
  const cleaned = String(rawCandidate || '')
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  const isStop = (w: string) =>
    COUPLE_INVALID_WORDS.has(w.toLowerCase()) ||
    SPOKEN_NAME_MONTHS.has(w.toLowerCase()) ||
    (extraInvalidWords ? extraInvalidWords.has(w.toLowerCase()) : false);

  const rawSides = cleaned
    .split(/(?:\s*[&+]\s*|\s+(?:weds|and|aur|तथा|और)\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawSides.length === 0 || rawSides.length > 2) return '';

  const cleanedSides: string[] = [];
  for (const side of rawSides) {
    const words = side.split(/\s+/).filter(Boolean);
    while (words.length > 0 && isStop(words[0])) words.shift();
    while (words.length > 0 && isStop(words[words.length - 1])) words.pop();
    if (words.length === 0) return '';
    if (words.some((w) => isStop(w))) return '';
    cleanedSides.push(words.join(' '));
  }

  const joined = cleanedSides.join(' & ');
  return normalizeSpokenNameToEnglish(joined);
}

/**
 * Extracts client or couple name directly from spoken/written user notes (Hindi, Hinglish, Marathi, English).
 * Returns clean English Title Case name ("O Piya", "Rohit", "Sagar & Riddhi") or "" if none was mentioned.
 */
export function extractSpokenCoupleName(rawUserNotes?: string | null, studioEventNames: string[] = []): string {
  const userNotes = String(rawUserNotes || '').trim();
  if (!userNotes) return '';

  const extraInvalid = new Set(studioEventNames.map((e) => String(e || '').toLowerCase()).filter(Boolean));
  const isStrictValidCandidate = (rawCand: string): string => {
    const rawSides = String(rawCand || '')
      .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
      .split(/(?:\s*[&+]\s*|\s+(?:weds|and|aur|तथा|और)\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawSides.length === 0 || rawSides.length > 2) return '';

    const normalizedSides: string[] = [];
    for (const side of rawSides) {
      const sideCleaned = cleanCandidateNameEdges(side, extraInvalid);
      if (!sideCleaned) return '';
      const ws = sideCleaned.split(/\s+/).filter(Boolean);
      if (ws.length === 0 || ws.length > 3) return '';
      if (ws.some((w) => {
        const lw = w.toLowerCase();
        return COUPLE_INVALID_WORDS.has(lw) || SPOKEN_NAME_MONTHS.has(lw) || extraInvalid.has(lw);
      })) {
        return '';
      }
      if (ws.length === 1 && ws[0].replace(/[^A-Za-z\u0900-\u097F]/g, '').length < 2) {
        return '';
      }
      normalizedSides.push(sideCleaned);
    }

    const joinedClean = normalizedSides.join(' & ');
    if (isInvalidCoupleName(joinedClean, extraInvalid)) return '';
    const english = normalizeSpokenNameToEnglish(joinedClean);
    if (!english || isInvalidCoupleName(english, extraInvalid)) return '';
    return english;
  };

  // Optional polite/pronoun prefix skipped before capturing actual client/couple name (bounded to avoid backtracking)
  const leadingFillerPrefix = '(?:(?:hey|hi|hello|please|plz|kindly|sir|bhai|mujhe|muje|humein|hume|humko|humne|maine|mene|apne|apna|mera|ek|create|make|generate|bana|banado|मुझे|हमें|कृपया|सर)\\s+){0,4}';

  // 1. Explicit English labels: "Couple: X & Y", "Client name: X", "Name: X"
  const explicitMatch = userNotes.match(/(?:^|[\s.;,\n])(?:couple(?:\s*name)?|client(?:\s*name)?|bride\s*(?:&|and)\s*groom|groom\s*(?:&|and)\s*bride)\s*[:=\-]+\s*([A-Za-z\u0900-\u097F\s&'+.-]{2,45}?)(?=\s+(?:wedding|marriage|shaadi|quotation|quotion|qution|qoutation|proposal|haldi|sangeet|reception|mehendi|event|shoot|budget|price|rate|cost|date|on|ke\s+liye|ki|ka|\d|₹|rs|all|deliverable)|[,\n\r.;।]|$)/i);
  if (explicitMatch?.[1]) {
    const valid = isStrictValidCandidate(explicitMatch[1]);
    if (valid) return valid;
  }

  // 2. Explicit Hindi/Hinglish labels: "कपल का नाम रहेगा रौनक और प्रेक्षा", "क्लाइंट का नाम रोहित", "कपल नेम X Y"
  const hindiLabelMatch = userNotes.match(/(?:कपल(?:\s*का)?\s*नाम(?:\s*रहेगा|\s*है)?|कपल\s*नेम|क्लाइंट\s*(?:का\s*)?नाम(?:\s*रहेगा|\s*है)?|नाम(?:\s*रहेगा|\s*है)?)\s*[:=\-]?\s*([\u0900-\u097FA-Za-z\s&'+.-]{2,45}?)(?=\s+(?:वेडिंग|शादी|लग्न|कोटेशन|हल्दी|संगीत|रिसेप्शन|मेहंदी|तारीख|बजट|\d|ऑल|all|का|की|के|है)|[,\n\r.;।]|$)/i);
  if (hindiLabelMatch?.[1]) {
    const valid = isStrictValidCandidate(hindiLabelMatch[1]);
    if (valid) return valid;
  }

  // 3. Direct Hinglish/Hindi single or couple intro:
  //    "O Piya ke liye quotation...", "Mujhe Akshay and Manali ka quotation banana hai", "Rohit ke liye ek quotation banani hai..."
  const introRe = new RegExp(
    `(?:^|[।.,;\\n]\\s*)${leadingFillerPrefix}([A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?(?:(?:\\s*[&+]\\s*|\\s+(?:weds|and|aur|तथा|और)\\s+)[A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?)?)\\s+(?:ke\\s+liye|ke\\s+liya|k\\s+liye|के\\s+लिए|के\\s+लिये|ka|ki|ke|का|की|के)\\s+(?:(?:ek|a|one|new|naya|nayi|final|total|\\d+|एक|नया|नयी)\\s+)?(?:events?\\s*(?:ka|ki|ke)?\\s*)?(?:quotation|quotion|qution|qoutation|quote|koteshan|proposal|wedding|marriage|shaadi|shadi|engagement|haldi|sangeet|mehendi|reception|event|shoot|package|banan[ai]|banao|कोटेशन|प्रपोजल|वेडिंग|शादी|लग्न|सगाई|इवेंट|शूट|पैकेज|बनान[ाी])`,
    'gi'
  );
  for (const m of userNotes.matchAll(introRe)) {
    if (m[1]) {
      const valid = isStrictValidCandidate(m[1]);
      if (valid) return valid;
    }
  }

  // 4. Explicit English prefix: "quotation for X", "quote for X", "proposal for X", "wedding for X"
  const forRe = new RegExp(
    `(?:quotation|quotion|qution|qoutation|quote|proposal|wedding)\\s+for\\s+${leadingFillerPrefix}([A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?(?:(?:\\s*[&+]\\s*|\\s+(?:weds|and|aur|तथा|और)\\s+)[A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?)?)(?=\\s+(?:wedding|marriage|shaadi|reception|event|events|pre-wedding|haldi|sangeet|mehendi|on|date|in|budget|total|\\d|₹)|[,\\n\\r.;।]|$)`,
    'gi'
  );
  for (const m of userNotes.matchAll(forRe)) {
    if (m[1]) {
      const valid = isStrictValidCandidate(m[1]);
      if (valid) return valid;
    }
  }

  // 4B. Leading name before comma + event/quotation summary ("O Piya, total 3 events hain...")
  const commaIntroRe = new RegExp(
    `^(?:client\\s+|couple\\s+)?${leadingFillerPrefix}([A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?(?:(?:\\s*[&+]\\s*|\\s+(?:weds|and|aur|तथा|और)\\s+)[A-Za-z\\u0900-\\u097F]{1,20}(?:\\s+[A-Za-z\\u0900-\\u097F]{2,20})?)?)\\s*,\\s*(?:total\\s+\\d+\\s+events?|wedding|haldi|sangeet|engagement|mehendi|reception|quotation|quotion)`,
    'i'
  );
  const commaMatch = userNotes.match(commaIntroRe);
  if (commaMatch?.[1]) {
    const valid = isStrictValidCandidate(commaMatch[1]);
    if (valid) return valid;
  }

  // 5. Scan ALL standalone couple pairs ("Sagar & Vruddhi", "Rohan aur Pooja") skipping non-name pairs like "Standard Crew aur Premium"
  const pairRe = new RegExp(
    `(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])([A-Za-z\\u0900-\\u097F]{2,20}(?:\\s*[&+]\\s*|\\s+(?:weds|and|तथा|और)\\s+)[A-Za-z\\u0900-\\u097F]{2,20})(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`,
    'gi'
  );
  for (const m of userNotes.matchAll(pairRe)) {
    if (m[1]) {
      const valid = isStrictValidCandidate(m[1]);
      if (valid) return valid;
    }
  }

  return '';
}

/**
 * Strips punctuation artifacts ("। उनकी") and leading filler words ("Mujhe Akshay and Manali" -> "Akshay & Manali").
 */
export function sanitizeExtractedCoupleName(rawCandidate?: string | null, leadFallback?: string | null): string {
  const raw = String(rawCandidate || '')
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw && !isInvalidCoupleName(raw)) {
    const edgeCleaned = cleanCoupleCandidateEdges(raw);
    return edgeCleaned && !isInvalidCoupleName(edgeCleaned) ? edgeCleaned : raw;
  }
  const fb = String(leadFallback || '')
    .replace(/^[\s।|.,:;!?'"\-–—]+|[\s।|.,:;!?'"\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (fb && !isInvalidCoupleName(fb)) return fb;
  return 'Groom & Bride';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts ALL crew roles & quantities from a snippet (while-loop multi-role, Hindi phonetic variants,
 * plus any custom role defined in Studio Settings master_crew_roles).
 */
export function extractCrewRolesFromText(
  snippet: string,
  studioCrewRoles: Array<string | { name?: string; short_code?: string }> = []
): Array<{ name: string; qty: number }> {
  if (!snippet || !snippet.trim()) return [];
  const numPrefix = '(?:(\\d+|एक|दो|तीन|चार|पांच|पाँच|one|two|three|four|five)\\s*(?:x|\\*|-)?)';
  const numSuffix = '(?:x|\\*|:|-)?\\s*(\\d+)';

  const builtInCrewDefs: Array<{ name: string; regex: RegExp }> = [
    {
      name: 'Semi Cinematic',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:सेमी[\\s-]*काइनेमैटिक|सेमी[\\s-]*सिनेमैटिक|semi[\\s-]*(?:cinematic|kinematic|cine))(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Semi Standard',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:सेमी[\\s-]*स्टैंडर्ड|सेमी[\\s-]*ट्रेडिशनल|semi[\\s-]*(?:standard|traditional|trad))(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Traditional Photographer',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:(?:ट्रेडिशनल|ट्रैडिशनल|ट्रेड)\\s*(?:फोटोग्राफर|फोटोग्राफी|कैमरामैन|फोटो\\s*वाला|फोटो)|(?:traditional|trad)\\s*(?:photo(?:grapher|graphy|s)?|cameraman|still)|\\btp\\b)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Traditional Videographer',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:(?:ट्रेडिशनल|ट्रैडिशनल|ट्रेड)\\s*(?:वीडियोग्राफर|वीडियोग्राफी|वीडियो)|(?:traditional|trad)\\s*video(?:grapher|graphy)?|\\btv\\b)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Candid Photographer',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:कैंडिड\\s*(?:फोटोग्राफर|फोटोग्राफी|कैमरामैन|फोटो)|कैंडिड|candid\\s*(?:photo(?:grapher|graphy|s)?)?|\\bcp\\b)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Cinematographer',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:सिनेमैटोग्राफर|सिनेमैटोग्राफी|सिनेमैटिक\\s*(?:वीडियो|विडियो)?|सिनेमा|cinematog(?:rapher|raphy)?|cinematic(?:\\s*video)?|\\bcine\\b|\\bcv\\b)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Drone Pilot',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:ड्रोन\\s*(?:पायलट|कैमरा)?|drone\\s*(?:pilot|coverage|shoot)?|aerial\\s*drone)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Family Photographer',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:फैमिली\\s*(?:फोटोग्राफर|फोटो)|family\\s*photo(?:grapher|graphy)?)(?:\\s*${numSuffix})?`, 'gi')
    },
    {
      name: 'Social Media Reels Creator',
      regex: new RegExp(`(?:${numPrefix}\\s+)?(?:सोशल\\s*मीडिया\\s*रील्स?\\s*क्रिएटर|रील्स?\\s*क्रिएटर|social\\s*media\\s*reels?\\s*creator|reels?\\s*creator)(?:\\s*${numSuffix})?`, 'gi')
    }
  ];

  // Dynamically include custom roles configured in master_crew_roles (longest names first)
  const customCrewDefs: Array<{ name: string; regex: RegExp }> = [];
  const seenNames = new Set(builtInCrewDefs.map((d) => d.name.toLowerCase()));
  const sortedStudioRoles = [...(studioCrewRoles || [])].sort((a, b) => {
    const na = typeof a === 'string' ? a : (a?.name || '');
    const nb = typeof b === 'string' ? b : (b?.name || '');
    return nb.length - na.length;
  });

  for (const r of sortedStudioRoles) {
    const roleName = (typeof r === 'string' ? r : r?.name || '').trim();
    if (!roleName || roleName.length < 3) continue;
    const rl = roleName.toLowerCase();
    if (seenNames.has(rl) || rl === 'sales person' || rl === 'salesperson' || rl === 'team manager') continue;
    seenNames.add(rl);
    customCrewDefs.push({
      name: roleName,
      regex: new RegExp(`(?:${numPrefix}\\s+)?${escapeRegExp(roleName)}(?:\\s*${numSuffix})?`, 'gi')
    });
  }

  const allDefs = [...customCrewDefs, ...builtInCrewDefs];
  const foundMap = new Map<string, number>();
  let maskedSnippet = snippet;

  for (const c of allDefs) {
    let iter = 0;
    while (iter < 10) {
      iter++;
      c.regex.lastIndex = 0;
      const m = c.regex.exec(maskedSnippet);
      if (!m || !m[0]) break;
      const qtyToken = m[1] || m[2] || '1';
      const qty = parseSmallCountWord(qtyToken);
      const resolvedRole = resolveStudioCrewRole(c.name, studioCrewRoles);
      foundMap.set(resolvedRole, Math.max(foundMap.get(resolvedRole) || 0, qty));
      maskedSnippet =
        maskedSnippet.slice(0, m.index) +
        ' '.repeat(m[0].length) +
        maskedSnippet.slice(m.index + m[0].length);
    }
  }

  return Array.from(foundMap.entries()).map(([name, qty]) => ({ name, qty }));
}

function mergeCrewList(
  existing: Array<{ name: string; qty: number }> | undefined,
  additions: Array<{ name: string; qty: number }>,
  studioCrewRoles: Array<string | { name?: string; short_code?: string }> = []
): Array<{ name: string; qty: number }> {
  const result = Array.isArray(existing)
    ? existing.map((r) => ({ name: resolveStudioCrewRole(r.name, studioCrewRoles), qty: Number(r.qty || 1) }))
    : [];

  for (const add of additions) {
    const canonName = resolveStudioCrewRole(add.name, studioCrewRoles);
    const qty = Math.max(1, Number(add.qty || 1));
    const idx = result.findIndex((r) => r.name.toLowerCase() === canonName.toLowerCase());
    if (idx !== -1) {
      result[idx] = { ...result[idx], qty: Math.max(result[idx].qty, qty) };
    } else {
      result.push({ name: canonName, qty });
    }
  }
  return result;
}

function removeCrewFromList(
  existing: Array<{ name: string; qty: number }> | undefined,
  removals: Array<{ name: string; qty: number }>,
  studioCrewRoles: Array<string | { name?: string; short_code?: string }> = []
): Array<{ name: string; qty: number }> {
  const remNames = new Set(removals.map((r) => resolveStudioCrewRole(r.name, studioCrewRoles).toLowerCase()));
  return (Array.isArray(existing) ? existing : []).filter(
    (r) => !remNames.has(resolveStudioCrewRole(r.name, studioCrewRoles).toLowerCase())
  );
}

function normalizeDeliverableCountToken(tok: string): number {
  const t = (tok || '').trim().toLowerCase();
  const map: Record<string, number> = {
    '1': 1, 'एक': 1, 'one': 1, 'ek': 1,
    '2': 2, 'दो': 2, 'two': 2, 'do': 2,
    '3': 3, 'तीन': 3, 'three': 3, 'teen': 3,
    '4': 4, 'चार': 4, 'four': 4, 'char': 4,
    '5': 5, 'पांच': 5, 'पाँच': 5, 'five': 5, 'paanch': 5, 'panch': 5,
    '6': 6, 'छह': 6, 'छः': 6, 'six': 6,
    '10': 10, 'दस': 10, 'ten': 10,
    '50': 50, 'पचास': 50,
    '100': 100, 'सौ': 100,
    '200': 200, 'दो सौ': 200,
    '300': 300, 'तीन सौ': 300,
    '400': 400, 'चार सौ': 400,
    '500': 500, 'पांच सौ': 500, 'पाँच सौ': 500
  };
  if (map[t] !== undefined) return map[t];
  const parsed = parseInt(t.replace(/[^\d]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

const DELIVERABLE_NUM_PREFIX = '(?:(\\d+|पांच\\s*सौ|पाँच\\s*सौ|तीन\\s*सौ|दो\\s*सौ|सौ|एक|दो|तीन|चार|पांच|पाँच|छह|छः|दस|पचास|one|two|three|four|five|six|ten|ek|do|teen|char|paanch|panch)\\s*)';

const DEFAULT_EXTRACTED_DELIVERABLES = [
  'All Raw Photos & Footage in Hard Drive',
  'Cinematic Wedding Highlight Film (15-20 Min)',
  'Cinematic Wedding Teaser (1-2 Min)',
  '3 Instagram Reels',
  'Traditional Long Video (2-3 Hours)',
  'Custom Printed Coffee Table Album'
];

const BUILTIN_TRIGGER_NOTE_PHRASES = [
  'standard crew',
  'premium crew',
  'basic crew',
  'classic crew',
  'luxury crew',
  'gold crew',
  'silver crew',
  'alag crew',
  'same crew',
  'separate crew',
  'different crew',
  'standard team',
  'premium team',
  'स्टैंडर्ड क्रू',
  'स्टैंडर्ड टीम',
  'प्रीमियम क्रू',
  'प्रीमियम टीम',
  'बेसिक क्रू',
  'क्लासिक क्रू',
  'अलग क्रू'
];

const TRIGGER_NOTE_REGEX_CACHE = new Map<string, [RegExp, RegExp]>();

function getTriggerNoteRegexes(trig: string): [RegExp, RegExp] {
  const cached = TRIGGER_NOTE_REGEX_CACHE.get(trig);
  if (cached) return cached;

  const esc = trig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixGroup = '(?:\\s+(?:preset|package|crew|team|setup|tier|option|included|applied|selected|configured))*';
  const boundaryBefore = '(?:^|(?<![a-zA-Z0-9\\u0900-\\u097F]))';
  const boundaryAfter = '(?=$|(?![a-zA-Z0-9\\u0900-\\u097F]))';

  const prefixedOrStandaloneRe = new RegExp(
    `(?:^|[|;,•\\n])\\s*(?:(?:crew|team|preset|package|trigger)\\s*[:\\-–]?\\s*)?${esc}${suffixGroup}(?=\\s*(?:$|[|;,•\\n()\\-–]))`,
    'gi'
  );
  const parenOrBoundaryRe = new RegExp(
    `\\(\\s*${esc}${suffixGroup}\\s*\\)|[-–:]\\s*${esc}${suffixGroup}${boundaryAfter}|${boundaryBefore}(?:(?:crew|team|preset|package|trigger)\\s*[:\\-–]?\\s*)?${esc}${suffixGroup}${boundaryAfter}`,
    'gi'
  );
  const pair: [RegExp, RegExp] = [prefixedOrStandaloneRe, parenOrBoundaryRe];
  if (TRIGGER_NOTE_REGEX_CACHE.size < 200) {
    TRIGGER_NOTE_REGEX_CACHE.set(trig, pair);
  }
  return pair;
}

/**
 * Strips shortcut/crew trigger labels ("Standard Crew", "Premium Crew", custom studio trigger names)
 * from function card notes so only genuine event instructions/remarks remain.
 */
export function sanitizeEventFunctionNotes(rawNotes?: string | null, studioShortcuts: any[] = []): string {
  let clean = String(rawNotes || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const triggerPhrases = new Set<string>(BUILTIN_TRIGGER_NOTE_PHRASES);
  if (Array.isArray(studioShortcuts)) {
    for (const sc of studioShortcuts) {
      const trig = String(sc?.trigger || '').trim().toLowerCase();
      if (trig.length >= 3) triggerPhrases.add(trig);
    }
  }

  let cleanLower = clean.toLowerCase();
  const sortedTriggers = Array.from(triggerPhrases).sort((a, b) => b.length - a.length);
  const matchedTriggers: string[] = [];
  for (const trig of sortedTriggers) {
    if (cleanLower.includes(trig)) matchedTriggers.push(trig);
  }

  if (matchedTriggers.length > 0) {
    const noteCore = cleanLower.replace(/[.:;,\-–—()\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const trig of matchedTriggers) {
      const trigCore = trig.trim().replace(/[.:;,\-–—()]+/g, '');
      if (!noteCore || noteCore === trigCore) return '';

      const [prefixedOrStandaloneRe, parenOrBoundaryRe] = getTriggerNoteRegexes(trig);
      prefixedOrStandaloneRe.lastIndex = 0;
      clean = clean.replace(prefixedOrStandaloneRe, ' ');
      parenOrBoundaryRe.lastIndex = 0;
      clean = clean.replace(parenOrBoundaryRe, ' ');
    }
  }

  clean = clean
    .replace(/^[\s|;,.\-–—:()]+|[\s|;,.\-–—:()]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return '';
  const finalCore = clean.toLowerCase().replace(/[.:;,\-–—()\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (matchedTriggers.some((t) => finalCore === t || finalCore === `crew ${t}` || finalCore === `${t} preset`)) {
    return '';
  }

  return clean;
}

/**
 * Validates that a deliverable string is a genuine photography/video deliverable item
 * and NOT a conversational Hindi/Hinglish sentence fragment, command phrase ("all deliverables add करना"),
 * or split currency number ("3", "000 Ka Hai Usme").
 */
export function isValidDeliverableItem(rawItem?: string | null, studioDeliverables: string[] = []): boolean {
  const clean = String(rawItem || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || clean.length < 3 || clean.length > 95) return false;

  // Reject voice-command meta phrases even before catalog checks
  if (/(?:all\s*deliverables?(?:\s*add)?|deliverables?\s*add|add\s*deliverables?|all\s*droppers|ऑल\s*डिलीवरेबल्स|सभी\s*डिलीवरेबल्स|सारे\s*डिलीवरेबल्स|saare\s*deliverables)/i.test(clean)) {
    return false;
  }

  // Always trust exact matches configured in Studio Settings (excluding command phrases checked above)
  if (studioDeliverables.some((sd) => String(sd || '').trim().toLowerCase() === clean.toLowerCase())) {
    return true;
  }

  // Reject pure numbers, currencies, or dangling split thousands like "000" / "000 Ka Hai Usme"
  if (/^\s*0{2,}\b/.test(clean)) return false;
  if (/^[\d,\s.+₹\-–—/%kKlL]+$/i.test(clean)) return false;

  // Reject pricing/budget/financial terms inside deliverables
  if (/(?:₹|\brs\.?\b|\binr\b|\bbudget\b|बजट|\bprice\b|प्राइस|\bpackage\b|पैकेज|\bamount\b|अमाउंट|\badvance\b|एडवांस|\bdiscount\b|डिस्काउंट|छूट|\btoken\b|टोकन|\bpayment\b|पेमेंट|\bcost\b|\blakh\b|लाख|\bthousand\b|हजार|हज़ार|\b\d+\s*k\b|\b\d{1,3},\d{3})/i.test(clean)) {
    return false;
  }

  // Reject conversational Hindi / Hinglish / English dictation prose & trailing command verbs
  if (/\b(?:quotation|quotion|qution|qoutation|proposal|share|mujhe|mujhko|unko|inko|humein|humko|apne|unke|inke|karna|karo|kardo|karne|karni|bhejna|bhejo|banani|banana|banane|rahega|rahegi|chahiye|lena|dena|dene|bolna|bola|bataya|ka\s+hai|ki\s+hai|ke\s+liye|ke\s+liya|ka\s+package|wo|woh|ye|yeh|jo|usme|usmein|isme|ismein|jisme|jismein|iske|uske|total\s+\d+\s+events?|add\s*kar(?:na|o|do|ne)?)\b|(?:कोटेशन|प्रपोजल|मुझे|उनको|इनको|हमें|करना|करो|करने|करनी|भेजना|बनानी|बनाना|रहेगा|रहेगी|चाहिए|लेना|देना|बोलना|बोला|बताया|वो|यह|ये|जो|उसमें|उसमे|इसमें|इसमे|जिसमें|जिसमे|ऐड\s*करना|ऐड\s*करो)/i.test(clean)) {
    return false;
  }

  // Reject standalone "Add ..." commands without a clear deliverable count/noun
  if (/^(?:add|ऐड|include|put|rakhna|keep)\b/i.test(clean)) {
    return false;
  }

  // Reject dangling multi-word prose containing digits without any deliverable noun
  const hasDeliverableNoun = /(?:photo|image|pic|picture|video|film|teaser|trailer|highlight|reel|album|photobook|photo\s*book|raw|hard\s*drive|hdd|ssd|usb|pendrive|pen\s*drive|frame|print|canvas|edit|sde|invite|invitation|calendar|book|copy|soft\s*copy|gallery|cloud|minutes?|mins?|hours?|hrs?|sheets?|pages?|फोटो|वीडियो|एल्बम|रील|पेनड्राइव|टीज़र|टीजर|हाईलाइट|फिल्म|रॉ)/i.test(clean);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 4 && /\d/.test(clean) && !hasDeliverableNoun) {
    return false;
  }
  if (words.length > 8 && !hasDeliverableNoun) {
    return false;
  }

  return true;
}

/**
 * Bilingual Hindi / Hinglish / English Deliverables Extractor.
 * Accurately captures counted deliverables ("500 edited photos", "5 Instagram reels", "2 albums", "1 pendrive")
 * as well as custom & studio catalog items without confusing crew roles ("Reels Creator", "Traditional Videographer").
 */
export function extractDeliverablesFromText(
  rawText: string,
  studioDeliverables: string[] = []
): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize Devanagari digits
  let sanitized = rawText.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));

  // Strip "all deliverables add करना / ऑल् डिलीवरेबल्स" command phrases BEFORE parsing custom clauses
  sanitized = sanitized.replace(
    /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:all\s*deliverables?\s*(?:add|ऐड)?\s*(?:karna|karo|kardo|karne(?:\s*hain?)?|करना|करो|करने(?:\s*हैं?)?)?|ऑल\s*डिलीवरेबल्स\s*(?:ऐड)?\s*(?:करना|करो)?|सभी\s*डिलीवरेबल्स\s*(?:ऐड)?\s*(?:करना|करो)?|सारे\s*डिलीवरेबल्स\s*(?:ऐड)?\s*(?:करना|करो)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi,
    ' '
  );

  // Strip crew role titles so "Traditional Videographer" / "Reels Creator" NEVER trigger deliverable matches
  sanitized = sanitized.replace(/(?:सोशल\s*मीडिया\s*)?(?:रील्स?\s*क्रिएटर|reels?\s*creator)/gi, ' __CREW_ROLE__ ');
  sanitized = sanitized.replace(/(?:traditional|trad|ट्रेडिशनल|ट्रैडिशनल|ट्रेड)\s*video(?:grapher|graphy)|(?:ट्रेडिशनल|ट्रैडिशनल)\s*वीडियोग्राफर/gi, ' __CREW_ROLE__ ');
  sanitized = sanitized.replace(/(?:traditional|trad|ट्रेडिशनल|ट्रैडिशनल|ट्रेड)\s*photo(?:grapher|graphy)|(?:ट्रेडिशनल|ट्रैडिशनल)\s*फोटोग्राफर/gi, ' __CREW_ROLE__ ');
  sanitized = sanitized.replace(/(?:candid|कैंडिड)\s*(?:photo(?:grapher|graphy)|फोटोग्राफर)?/gi, ' __CREW_ROLE__ ');
  sanitized = sanitized.replace(/(?:cinematographer|cinematography|सिनेमैटोग्राफर|सिनेमैटोग्राफी)/gi, ' __CREW_ROLE__ ');

  // Protect numeric thousands commas ("3,000", "30,000", "2,50,000") before clause splitting
  const protectedSanitized = sanitized.replace(/(\d),(?=\d)/g, '$1__NCOMMA__');

  // Remove Pre-Wedding-only clauses (keep clauses that mention deliverables/main wedding)
  const nonPreWedParts = protectedSanitized
    .split(/(?:[\n.;।|]+|\s*,\s*|\s+(?:और|aur|and)\s+)/i)
    .map((part) => part.replace(/__NCOMMA__/g, ','))
    .filter((part) => {
      const pLower = part.toLowerCase();
      const isPreWed = /(?:pre[\s-]*wed|prewedding|pre[\s-]*shoot|preshoot|प्री[\s-]*वेडिंग|प्रीवेडिंग|प्री[\s-]*शूट)/i.test(pLower);
      if (!isPreWed) return true;
      return /(?:deliverable|डिलीवरेबल|डिलीवरी)/i.test(pLower);
    });

  const scanText = nonPreWedParts.join(' , ').trim();
  if (!scanText) return [];

  const matched: string[] = [];
  const addUnique = (label: string) => {
    const clean = label.trim();
    if (!clean || !isValidDeliverableItem(clean, studioDeliverables)) return;
    if (!matched.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      matched.push(clean);
    }
  };

  const findStudioMatch = (re: RegExp): string | undefined =>
    studioDeliverables.find((d) => re.test(d));

  // 1. Edited Photos ("500 edited photos", "300+ एडिटेड फोटोज", "कलर करेक्टेड फोटोज")
  const editedPhotosRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX}\\+?\\s*)?(?:high[\\s-]*res(?:olution)?\\s*)?(?:color[\\s-]*(?:corrected|graded)|edited|कलर\\s*करेक्टेड|एडिटेड)\\s*(?:photos?|images?|pics?|pictures?|फोटो(?:ज|ज़|स)?|इमेजेज)|(?:${DELIVERABLE_NUM_PREFIX}\\+?\\s*)(?:photos?|images?|फोटो(?:ज|ज़|स)?)\\b`,
    'i'
  );
  const editedM = scanText.match(editedPhotosRe);
  if (editedM) {
    const cnt = normalizeDeliverableCountToken(editedM[1] || editedM[2] || '');
    if (cnt >= 10) {
      addUnique(`${cnt} High-Res Edited Photos`);
    } else {
      addUnique(findStudioMatch(/edited|color\s*corrected|soft\s*copy/i) || 'High Resolution Edited Photos (300+)');
    }
  }

  // 2. Instagram Reels ("5 Instagram reels", "5 reels", "3 रील्स")
  const reelsRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:instagram\\s*|insta\\s*|इंस्टाग्राम\\s*)?(?:reels?|रील्स?|रील)(?=[^a-zA-Z0-9\\u0900-\\u097F]|$)`,
    'i'
  );
  const reelsM = scanText.match(reelsRe);
  if (reelsM) {
    const cnt = normalizeDeliverableCountToken(reelsM[1] || '');
    const hasInstaPrefix = /(?:instagram|insta|इंस्टाग्राम)/i.test(reelsM[0]);
    if (cnt > 0) {
      addUnique(`${cnt} Instagram ${cnt === 1 ? 'Reel' : 'Reels'}`);
    } else if (hasInstaPrefix) {
      addUnique(findStudioMatch(/reel/i) || '3 Instagram Reels');
    }
  }

  // 3. USB Pendrive ("1 pendrive", "पेनड्राइव", "usb drive")
  const pendriveRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:usb\\s*)?(?:pen\\s*drive|pendrive|usb\\s*drive|पेन\\s*ड्राइव|पेनड्राइव)(?=[^a-zA-Z0-9\\u0900-\\u097F]|$)`,
    'i'
  );
  const pdM = scanText.match(pendriveRe);
  if (pdM) {
    const cnt = normalizeDeliverableCountToken(pdM[1] || '');
    if (cnt > 1) {
      addUnique(`${cnt} USB Pendrives`);
    } else if (cnt === 1) {
      addUnique('1 USB Pendrive');
    } else {
      addUnique(findStudioMatch(/pen\s*drive|pendrive|usb/i) || '1 USB Pendrive');
    }
  }

  // 4. Raw Photos / Hard Drive
  if (/(?:all\s*raw|raw\s*(?:photos?|footage|data|images?|files?)|hard\s*drive|hdd|रॉ\s*(?:फोटो|डेटा|फुटेज)|हार्ड\s*ड्राइव)/i.test(scanText)) {
    addUnique(findStudioMatch(/raw|hard\s*drive/i) || 'All Raw Photos & Footage in Hard Drive');
  }

  // 5. Albums / Photobooks ("2 albums", "2 एल्बम", "फोटोबुक", "coffee table album")
  const albumRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:coffee\\s*table\\s*|custom\\s*printed\\s*|karizma\\s*|luxury\\s*|printed\\s*)?(?:photobooks?|photo\\s*books?|albums?|फोटोबुक|एल्बम|अल्बम)(?=[^a-zA-Z0-9\\u0900-\\u097F]|$)`,
    'i'
  );
  const albumM = scanText.match(albumRe);
  if (albumM) {
    const cnt = normalizeDeliverableCountToken(albumM[1] || '');
    if (cnt > 1) {
      addUnique(`${cnt} Custom Printed Photobook Albums`);
    } else {
      addUnique(findStudioMatch(/album|photobook/i) || (cnt === 1 ? '1 Custom Printed Photobook Album' : 'Custom Printed Coffee Table Album'));
    }
  }

  // 6. Teaser Video
  const teaserRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:cinematic\\s*|wedding\\s*|1[\\s-]*min(?:ute)?\\s*)?(?:teaser|टीज़र|टीजर)(?:\\s*(?:video|film|reel))?`,
    'i'
  );
  const teaserM = scanText.match(teaserRe);
  if (teaserM) {
    const cnt = normalizeDeliverableCountToken(teaserM[1] || '');
    if (cnt > 1) {
      addUnique(`${cnt} Cinematic Wedding Teasers`);
    } else {
      addUnique(findStudioMatch(/teaser/i) || 'Cinematic Wedding Teaser (1-2 Min)');
    }
  }

  // 7. Highlight Film / Cinematic Video / Wedding Film
  const cineRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:highlight(?:\\s*film|\\s*video)?|cinematic\\s*(?:wedding\\s*)?(?:film|video)|wedding\\s*(?:film|video)|हाईलाइट|हाइलाइट|वेडिंग\\s*फिल्म)`,
    'i'
  );
  const cineM = scanText.match(cineRe);
  if (cineM) {
    const cnt = normalizeDeliverableCountToken(cineM[1] || '');
    const spokeHighlight = /highlight|हाईलाइट|हाइलाइट/i.test(cineM[0]);
    const catMatch = spokeHighlight
      ? findStudioMatch(/highlight|wedding\s*film/i)
      : findStudioMatch(/cinematic\s*(?:wedding\s*)?(?:film|video)|wedding\s*film/i);
    if (catMatch) {
      addUnique(catMatch);
    } else if (/cinematic\s*(?:wedding\s*)?video/i.test(cineM[0])) {
      addUnique(cnt > 1 ? `${cnt} Cinematic Videos` : (cnt === 1 ? '1 Cinematic Video' : 'Cinematic Video'));
    } else if (cnt > 0 || /wedding\s*film|वेडिंग\s*फिल्म/i.test(cineM[0])) {
      addUnique('Cinematic Wedding Highlight Film (15-20 Min)');
    }
  }

  // 8. Traditional Long Video (safe since crew roles were stripped above!)
  const tradVidRe = new RegExp(
    `(?:${DELIVERABLE_NUM_PREFIX})?(?:traditional\\s*(?:long\\s*)?(?:video|movie|film)|long\\s*video|full\\s*(?:length\\s*)?(?:wedding\\s*)?video|लॉन्ग\\s*वीडियो|फुल\\s*वीडियो|ट्रेडिशनल\\s*(?:वीडियो|मूवी))`,
    'i'
  );
  const tradVidM = scanText.match(tradVidRe);
  if (tradVidM) {
    const cnt = normalizeDeliverableCountToken(tradVidM[1] || '');
    const spokeLong = /long\s*video|full\s*(?:length\s*)?(?:wedding\s*)?video|लॉन्ग|फुल/i.test(tradVidM[0]);
    const catMatch = spokeLong
      ? findStudioMatch(/traditional\s*long\s*video|long\s*video/i)
      : findStudioMatch(/traditional\s*(?:wedding\s*)?(?:video|movie|film)/i);
    if (catMatch) {
      addUnique(catMatch);
    } else if (/traditional\s*video/i.test(tradVidM[0])) {
      addUnique(cnt > 1 ? `${cnt} Traditional Videos` : (cnt === 1 ? '1 Traditional Video' : 'Traditional Video'));
    } else {
      addUnique('Traditional Long Video (2-3 Hours)');
    }
  }

  // 9. Special Deliverables (Save The Date, Same Day Edit, E-Invite, Frame, Calendar)
  if (/(?:same\s*day\s*edit|\bsde\b|सेम\s*डे\s*एडिट)/i.test(scanText)) {
    addUnique(findStudioMatch(/same\s*day|sde/i) || 'Same Day Edit (SDE) Film');
  }
  if (/(?:save\s*the\s*date|सेव\s*द\s*डेट)/i.test(scanText)) {
    addUnique(findStudioMatch(/save\s*the\s*date/i) || 'Save The Date Video / E-Invite');
  }
  if (/(?:e[\s-]*invite|digital\s*invite|invitation\s*video|ई[\s-]*इनवाइट)/i.test(scanText)) {
    addUnique(findStudioMatch(/e[\s-]*invite|invite/i) || 'Digital E-Invite Video');
  }
  const frameRe = new RegExp(`(?:${DELIVERABLE_NUM_PREFIX})?(?:photo\\s*frames?|framed\\s*(?:prints?|photos?)|canvas\\s*prints?|फोटो\\s*फ्रेम)`, 'i');
  const frameM = scanText.match(frameRe);
  if (frameM) {
    const cnt = normalizeDeliverableCountToken(frameM[1] || '');
    addUnique(cnt > 1 ? `${cnt} Framed Photo Prints` : (cnt === 1 ? '1 Framed Photo Print' : 'Custom Framed Photo Print'));
  }

  // 10. Direct Studio Catalog Substring Matches for custom Studio Deliverables (e.g. "Mini Book", "Cloud Gallery", or exact single-word title)
  const scanLower = scanText.replace(/__CREW_ROLE__/g, ' ').toLowerCase();
  for (const stTitle of studioDeliverables) {
    const lowerTitle = String(stTitle || '').toLowerCase().trim();
    if (!lowerTitle || lowerTitle.length < 4) continue;
    const strippedTitle = lowerTitle.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    const coreWords = strippedTitle
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['with', 'from', 'photos', 'video', 'high', 'full', 'custom', 'resolution'].includes(w));
    const exactPhraseHit = strippedTitle.length >= 4 && scanLower.includes(strippedTitle);
    if (exactPhraseHit || (coreWords.length >= 2 && coreWords.every((w) => scanLower.includes(w)))) {
      // Skip downgrading an already-extracted specific counted item (e.g. keep "5 Instagram Reels" instead of "3 Instagram Reels")
      const isReelsCatalog = lowerTitle.includes('reel') && matched.some((m) => /\breel/i.test(m));
      const isPhotosCatalog = (lowerTitle.includes('edited') || lowerTitle.includes('photo')) && matched.some((m) => /edited photos/i.test(m));
      const isAlbumCatalog = (lowerTitle.includes('album') || lowerTitle.includes('photobook')) && matched.some((m) => /album|photobook/i.test(m));
      if (!isReelsCatalog && !isPhotosCatalog && !isAlbumCatalog) {
        addUnique(stTitle);
      }
    }
  }

  // 11. Explicit "Deliverables mein X, Y aur Z" clause tail parser (supports multiple clauses & stops before location/timing/pricing)
  const delivClauseRe = /(?:deliverables?|डिलीवरेबल्स?|डिलीवरी)\s*(?:में|मे|mein|in|:|-|हैं|है|rakhna|करने\s*हैं?)?\s*([^.!?\n।]+)/gi;
  for (const delivClauseMatch of scanText.matchAll(delivClauseRe)) {
    if (!delivClauseMatch[1]) continue;
    const protectedClause = delivClauseMatch[1].replace(/(\d),(?=\d)/g, '$1__NCOMMA__');
    const rawTail = protectedClause
      .replace(/^[\s,:\-]+/, '')
      .replace(/^(?:add\s*(?:karna|karo|kardo|karne(?:\s*hain?)?|करना|करो|करने(?:\s*हैं?)?)?|ऐड\s*(?:करना|करो|करने(?:\s*हैं?)?)?|करना|करो|करने\s*(?:हैं|है)?)\s*(?:,|$|\s+)/i, '')
      .replace(/^[\s,:\-]+/, '')
      .replace(/(?:add\s*(?:karna|karo|kardo|karne(?:\s*hain?)?|करना|करो|करने(?:\s*हैं?)?)?|ऐड\s*(?:करना|करो|करने(?:\s*हैं?)?)?|करना|करो|करने\s*(?:हैं|है)?|rakhna|chahiye|dena|रखना|चाहिए|देना|rahega|rahegi|milega|milengi)\s*$/i, '')
      .replace(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:budget|बजट|price|प्राइस|package|पैकेज|amount|अमाउंट|cost|discount|ऑफर|offer|advance|एडवांस|gst|total|टोटल|रुपये|lakh|लाख|हजार|₹|quotation|quotion|qution|qoutation|mujhe|mujhko|unko|inko|share\s+karna|location|लोकेशन|venue|वेन्यू|timing|टाइमिंग|date|तारीख|tarikh|baje|बजे|sabhi\s+events|saare\s+events|same\s+venue|मुझे|उनको|इनको).*$/i, '')
      .trim();

    if (rawTail && !/^(?:all|add|ऑल|सभी|सारे|ऐड|करने|करना|है|हैं|jo|wo|woh|ye|yeh|mujhe|mujhko|unko|inko)\b/i.test(rawTail)) {
      const tokens = rawTail
        .split(/\s*(?:,|\s+(?:और|aur|and|&|\+)\s+)\s*/i)
        .map((t) =>
          t
            .replace(/__NCOMMA__/g, ',')
            .replace(/^(?:में|मे|mein|और|aur|and|इसका|उसका|साथ\s*ही|add|ऐड|रखना|चाहिए|देना|करने|करना)\s+/gi, '')
            .replace(/\s+(?:add|ऐड|करना|करो|करने|रखना|चाहिए|rahega|rahegi|milega|milengi|रहेगा|रहेंगी|है|हैं)$/gi, '')
            .trim()
        )
        .filter((t) => {
          if (!t || t.length < 3) return false;
          if (/^[\d,\s.+₹\-kKlL]+$/i.test(t)) return false;
          if (/(?:₹|\bbudget\b|बजट|प्राइस|अमाउंट|एडवांस|लख|लाख|हजार|advance|price|amount|total|package|standard\s*crew|alag\s*crew|discount|location|venue|timing|baje)/i.test(t)) return false;
          if (/^(?:__CREW_ROLE__|add|all|ok|karna|karo|karne|rakhna|chahiye|dena|hain?|iska|uska|aur\s+iska|करना|करो|करने|करें|रहेगा|रहेंगी|रखना|चाहिए|देना|इसका|उसका|और\s+इसका|साथ\s+ही)$/i.test(t)) return false;
          return isValidDeliverableItem(t, studioDeliverables);
        });

      for (const tok of tokens) {
        const lowerTok = tok.toLowerCase();
        const formattedTok = tok.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

        const exactDuplicate = matched.some((m) => m.toLowerCase() === lowerTok);
        if (exactDuplicate) continue;

        // Skip adding bare or raw bilingual variants if a standard normalized deliverable
        // for this exact count & category already exists in matched (e.g. skip "5 Reels" / "5 रील्स" when "5 Instagram Reels" is present)
        const bareNoun = lowerTok.replace(/^\d+\s*/, '').replace(/^(?:एक|दो|तीन|चार|पांच|पाँच|दस)\s*/, '').trim();
        const isBareReel = /^(?:reels?|रील्स?|रील|instagram\s*reels?|insta\s*reels?|इंस्टाग्राम\s*रील्स?)$/i.test(bareNoun);
        const isBarePhoto = /^(?:photos?|images?|pics?|edited\s*photos?|edited\s*images?|फोटो|फ़ोटो|एडिटेड\s*फोटो)$/i.test(bareNoun);
        const isBareAlbum = /^(?:albums?|photobooks?|एल्बम|फोटोबुक)$/i.test(bareNoun);
        const isBarePendrive = /^(?:pendrive|pen\s*drive|usb(?:\s*drive)?|पेनड्राइव|पेन\s*ड्राइव)$/i.test(bareNoun);

        const hasAlreadyNormalized = matched.some((m) => {
          const mLow = m.toLowerCase();
          if (isBareReel && mLow.includes('reel')) {
            const mNum = mLow.match(/^\d+/)?.[0];
            const tokNum = lowerTok.match(/^\d+/)?.[0];
            return !tokNum || mNum === tokNum;
          }
          if (isBarePhoto && (mLow.includes('photo') || mLow.includes('edited'))) {
            const mNum = mLow.match(/^\d+/)?.[0];
            const tokNum = lowerTok.match(/^\d+/)?.[0];
            return !tokNum || mNum === tokNum;
          }
          if (isBareAlbum && (mLow.includes('album') || mLow.includes('photobook'))) {
            const mNum = mLow.match(/^\d+/)?.[0];
            const tokNum = lowerTok.match(/^\d+/)?.[0];
            return !tokNum || mNum === tokNum;
          }
          if (isBarePendrive && (mLow.includes('pendrive') || mLow.includes('usb'))) {
            return true;
          }
          return false;
        });

        if (hasAlreadyNormalized) continue;

        // If the user explicitly spoke a custom deliverable (e.g. "1 Same-Day Drone Highlight Reel" or "1 Embossed Linen Box"),
        // remove any generic catalog defaults that were loosely triggered by words present in this compound
        if (lowerTok.includes('reel')) {
          const idx = matched.findIndex((m) => /^(?:3\s+Instagram\s+Reels|Instagram\s+Reels?)$/i.test(m));
          if (idx !== -1) matched.splice(idx, 1);
        }
        if (lowerTok.includes('highlight') || lowerTok.includes('cinematic')) {
          const idx = matched.findIndex((m) => /^(?:Cinematic\s+Wedding\s+Highlight\s+Film\s*\(15-20\s*Min\)|Cinematic\s+Highlight\s+Film)$/i.test(m));
          if (idx !== -1) matched.splice(idx, 1);
        }
        if (lowerTok.includes('album') || lowerTok.includes('photobook')) {
          const idx = matched.findIndex((m) => /^(?:Custom\s+Printed\s+Coffee\s+Table\s+Album|Coffee\s+Table\s+Album)$/i.test(m));
          if (idx !== -1) matched.splice(idx, 1);
        }

        addUnique(formattedTok);
      }
    }
  }

  return matched.filter((item) => isValidDeliverableItem(item, studioDeliverables));
}

export function mergeDeliverablesSmart(
  baseList: string[] | undefined,
  additions: string[],
  preferCountedOverride: boolean = false
): string[] {
  let result = Array.isArray(baseList) ? baseList.filter(Boolean).map((s) => String(s).trim()) : [];

  for (const addItem of additions) {
    const addClean = String(addItem || '').trim();
    if (!addClean) continue;
    const addLow = addClean.toLowerCase();

    // If addition is specifically counted (e.g. "500 High-Res Edited Photos" or "5 Instagram Reels"), replace generic equivalent
    if (preferCountedOverride && /^\d+\s+/.test(addClean)) {
      if (addLow.includes('reel')) {
        result = result.filter((r) => !/\breels?\b/i.test(r) || r.toLowerCase() === addLow);
      } else if (addLow.includes('edited photo')) {
        result = result.filter((r) => !/edited\s*(?:photo|image)/i.test(r) || r.toLowerCase() === addLow);
      } else if (addLow.includes('album') || addLow.includes('photobook')) {
        result = result.filter((r) => !/(?:album|photobook)/i.test(r) || r.toLowerCase() === addLow);
      }
    }

    if (!result.some((r) => r.toLowerCase() === addLow)) {
      result.push(addClean);
    }
  }
  return result;
}

const DELIVERABLE_NOISE_TOKENS = new Set([
  '1', '2', '3', '4', '5', 'high', 'res', 'resolution', 'full', 'custom', 'printed', 'wedding', 'main',
  'min', 'mins', 'hour', 'hours', 'hrs', 'all', 'with', 'for', 'and', 'the', 'plus', 'special', 'extra',
  'footage', 'super', 'fine', 'ultra', 'hd', '4k', 'usb', 'long', 'table', 'coffee', 'best', 'quality', 'data'
]);

/**
 * Verifies that a deliverable returned by Gemini is grounded in the user's prompt,
 * spoken deliverables, or mapped studio shortcuts (so template/catalog items never hallucinate unrequested).
 */
function isGeminiDeliverableGrounded(
  aiItem: string,
  rawPromptText: string,
  spokenDeliverables: string[],
  shortcutDeliverables: string[]
): boolean {
  const clean = String(aiItem || '').trim();
  if (!clean) return false;
  const low = clean.toLowerCase();

  if (shortcutDeliverables.some((s) => String(s || '').trim().toLowerCase() === low)) {
    return true;
  }

  const getMeaningfulTokens = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !DELIVERABLE_NOISE_TOKENS.has(t));

  const itemTokens = getMeaningfulTokens(clean);
  const stemMatch = (tok: string, target: string): boolean => {
    const base = tok.endsWith('s') && tok.length > 4 ? tok.slice(0, -1) : tok;
    return target.includes(tok) || target.includes(base);
  };

  for (const sp of spokenDeliverables) {
    const spLow = String(sp || '').toLowerCase();
    if (!spLow) continue;
    if (spLow === low) return true;
    const spTokens = getMeaningfulTokens(spLow);
    if (
      itemTokens.some((t) => spTokens.some((st) => st === t || st.includes(t) || t.includes(st)))
    ) {
      return true;
    }
  }

  const promptLow = String(rawPromptText || '').toLowerCase();
  if (promptLow && itemTokens.length > 0 && itemTokens.some((t) => stemMatch(t, promptLow))) {
    return true;
  }

  return false;
}

interface ScopedShortcutMatch {
  trigger: string;
  mappedCrew: Array<{ name: string; qty: number }>;
  mappedDeliverables: string[];
  mappedPrice: number | null;
  mappedSpecialAddons: string[];
  scopedEvents: Set<string> | null;
  isBuiltinFallback?: boolean;
}

const ALL_DELIVERABLES_TRIGGER_RE =
  /(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables?|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)/i;

/**
 * Returns true ONLY if the studio owner has explicitly configured a custom shortcut for "all deliverables"
 * with specific mappedDeliverables in Settings -> AI Training. When true, saying "all deliverables" MUST
 * execute that exact custom shortcut instead of dumping the entire deliverables catalog!
 */
export function hasCustomAllDeliverablesShortcut(
  shortcutMatches: Array<{ trigger?: string; mappedDeliverables?: string[] }> = []
): boolean {
  return (shortcutMatches || []).some(
    (sm) =>
      ALL_DELIVERABLES_TRIGGER_RE.test(String(sm?.trigger || '').trim()) &&
      Array.isArray(sm?.mappedDeliverables) &&
      sm.mappedDeliverables.length > 0
  );
}

const INDIAN_CITY_MAP_GLOBAL: Record<string, string> = {
  'उदयपुर': 'Udaipur', 'udaipur': 'Udaipur',
  'जयपुर': 'Jaipur', 'jaipur': 'Jaipur',
  'गोवा': 'Goa', 'goa': 'Goa',
  'मुंबई': 'Mumbai', 'बंबई': 'Mumbai', 'mumbai': 'Mumbai',
  'दिल्ली': 'Delhi', 'नई दिल्ली': 'New Delhi', 'delhi': 'Delhi', 'new delhi': 'New Delhi',
  'पुणे': 'Pune', 'pune': 'Pune',
  'नासिक': 'Nashik', 'nashik': 'Nashik',
  'सूरत': 'Surat', 'surat': 'Surat',
  'अहमदाबाद': 'Ahmedabad', 'ahmedabad': 'Ahmedabad',
  'इंदौर': 'Indore', 'indore': 'Indore',
  'भोपाल': 'Bhopal', 'bhopal': 'Bhopal',
  'नागपुर': 'Nagpur', 'nagpur': 'Nagpur',
  'जोधपुर': 'Jodhpur', 'jodhpur': 'Jodhpur',
  'जैसलमेर': 'Jaisalmer', 'jaisalmer': 'Jaisalmer',
  'आगरा': 'Agra', 'agra': 'Agra',
  'वाराणसी': 'Varanasi', 'varanasi': 'Varanasi', 'बनारस': 'Varanasi',
  'ऋषिकेश': 'Rishikesh', 'rishikesh': 'Rishikesh',
  'जिम कॉर्बेट': 'Jim Corbett', 'jim corbett': 'Jim Corbett',
  'हैदराबाद': 'Hyderabad', 'hyderabad': 'Hyderabad',
  'बेंगलुरु': 'Bengaluru', 'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru',
  'कोलकाता': 'Kolkata', 'kolkata': 'Kolkata',
  'चंडीगढ़': 'Chandigarh', 'chandigarh': 'Chandigarh',
  'लखनऊ': 'Lucknow', 'lucknow': 'Lucknow'
};

function cleanExtractedLocationCandidate(rawLoc: string): string {
  if (!rawLoc) return '';
  let s = String(rawLoc).replace(/["']/g, '').split(/[,\n.;।]/)[0].trim();
  // Stop before unrelated trailing clauses ("location Delhi aur..." / "location Delhi for...")
  s = s.split(/\s+(?:saare|all\s+events?|sabhi|total\s+\d+|for\s+\d+)\b/i)[0].trim();
  // Strip trailing Hindi/Hinglish postpositions & copulas repeatedly ("Delhi ki hai" -> "Delhi")
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(
        /\s+(?:ki|ka|ke|ko|me|mein|par|pe|se|hai|hain|h|rahega|rahegi|hoga|hogi|is|are|को|का|की|के|में|मे|पर|पे|से|है|हैं|रहेगा|रहेगी|होगा|होगी)$/i,
        ''
      )
      .trim();
    if (next === s) break;
    s = next;
  }
  const lower = s.toLowerCase();
  if (
    !s ||
    s.length <= 2 ||
    /^(?:same\s*(?:venue|place|hotel|location)?|same|शादी|वेडिंग|हल्दी|संगीत|रिसेप्शन|मेहंदी|में|दोनों|सभी|par|hai|hain|ki|ka|ke|tbd|not\s*fix(?:ed)?)$/i.test(lower)
  ) {
    return '';
  }
  for (const [k, v] of Object.entries(INDIAN_CITY_MAP_GLOBAL)) {
    if (lower === k.toLowerCase()) return v;
  }
  return s;
}

export function extractSpokenLocationFromNotes(snippet: string): string {
  if (!snippet) return '';
  // 1. Check explicit location/venue/city label first ("Location Delhi ki hai", "Venue Taj Palace Jaipur rahega")
  const explicitLocMatch = snippet.match(
    /(?:^|[\s.;,\n])(?:at|venue|location|city|destination|लोकेशन|वेन्यू|स्थान|जगह|शहर)(?:\s+(?:is|are|hai|हैं|है|में|मे|पर|पे|:))?[:\s-]+(["']?[A-Za-z\u0900-\u097F0-9\s.-]{2,45}["']?)(?=[,\n\r.;।]|$)/i
  );
  if (explicitLocMatch?.[1]) {
    const cleanedExplicit = cleanExtractedLocationCandidate(explicitLocMatch[1]);
    if (cleanedExplicit) {
      // If cleanedExplicit is a longer phrase containing a known city, prefer clean city unless it's a hotel/palace venue name
      if (!/hotel|palace|resort|lawn|banquet|bhavan|mandap|gardens?|villa|club|fort/i.test(cleanedExplicit)) {
        for (const [k, v] of Object.entries(INDIAN_CITY_MAP_GLOBAL)) {
          if (new RegExp(`(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${k}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'i').test(cleanedExplicit)) {
            return v;
          }
        }
      }
      return cleanedExplicit;
    }
  }
  // 2. Fallback: scan entire snippet for well-known Indian wedding cities
  for (const [k, v] of Object.entries(INDIAN_CITY_MAP_GLOBAL)) {
    if (new RegExp(`(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${k}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'i').test(snippet)) {
      return v;
    }
  }
  return '';
}

const hasUnicodeWord = (haystack: string, needle: string): boolean => {
  const cleanNeedle = String(needle || '').trim();
  if (!cleanNeedle) return false;
  const re = new RegExp(
    `(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${escapeRegExp(cleanNeedle)}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`,
    'i'
  );
  return re.test(haystack);
};

const matchesShortcutTriggerText = (text: string, trigLower: string): boolean => {
  if (!text || !trigLower) return false;
  if (hasUnicodeWord(text, trigLower)) return true;
  const words = trigLower.split(/\s+/).filter(Boolean);
  // Require multi-word triggers to appear close together (never match "standard" from Event 1 + "crew" from Event 2!)
  if (words.length > 1) {
    const nearRe = new RegExp(
      `(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${words.map(escapeRegExp).join('[^\\n.;।,]{0,25}?')}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`,
      'i'
    );
    if (nearRe.test(text)) return true;
  } else if (words.length === 1 && hasUnicodeWord(text, words[0])) {
    return true;
  }
  if (/(?:all|sabhi|saare|ऑल|सभी|सारे).*deliverable|deliverable.*all/i.test(trigLower) && ALL_DELIVERABLES_TRIGGER_RE.test(text)) {
    return true;
  }
  if (trigLower.includes('standard') && /स्टैंडर्ड\s*(?:क्रू|टीम)/i.test(text)) return true;
  if (trigLower.includes('premium') && /प्रीमियम\s*(?:क्रू|टीम)/i.test(text)) return true;
  return false;
};

interface EventCrewOverrideInfo {
  eventName: string;
  explicitCrew: Array<{ name: string; qty: number }>;
  hasExplicitCrew: boolean;
  hasRestrictiveOverride: boolean;
  triggeredShortcuts: Set<string>;
}

/**
 * Analyzes userNotes per ceremony clause to determine:
 * 1) Which shortcuts were triggered specifically inside one event clause vs globally.
 * 2) Which events explicitly specified their own custom/restricted crew ("bas 1 Traditional Photographer aur alag crew"),
 *    so other-event or global shortcuts NEVER leak onto them!
 */
export function analyzeScopedShortcutsAndCrewOverrides(
  userNotes: string,
  studioShortcuts: any[] = [],
  studioEventNames: string[] = [],
  studioDefaultFunctions: any[] = [],
  studioCrewRoles: any[] = [],
  extraContextText: string = ''
): {
  shortcutMatches: ScopedShortcutMatch[];
  eventOverrides: Map<string, EventCrewOverrideInfo>;
  anyShortcutScopedToSubset: boolean;
} {
  const notes = (userNotes || '').trim();
  const shortcutMatches: ScopedShortcutMatch[] = [];
  const eventOverrides = new Map<string, EventCrewOverrideInfo>();

  if (!notes) {
    return { shortcutMatches, eventOverrides, anyShortcutScopedToSubset: false };
  }

  const normalizedShortcuts: Array<{
    trigger: string;
    triggerLower: string;
    mappedCrew: Array<{ name: string; qty: number }>;
    mappedDeliverables: string[];
    mappedPrice: number | null;
    mappedSpecialAddons: string[];
    isBuiltinFallback?: boolean;
  }> = [];

  for (const sc of studioShortcuts || []) {
    if (!sc?.trigger) continue;
    const trigLower = String(sc.trigger).toLowerCase().trim();
    const mappedCrew: Array<{ name: string; qty: number }> = [];
    if (Array.isArray(sc.mappedCrew)) {
      for (const c of sc.mappedCrew) {
        const rName = resolveStudioCrewRole(typeof c === 'string' ? c : c?.name || '', studioCrewRoles);
        const q = Number(c?.qty || 1);
        if (q > 0) {
          const idx = mappedCrew.findIndex((m) => m.name.toLowerCase() === rName.toLowerCase());
          if (idx !== -1) mappedCrew[idx].qty = Math.max(mappedCrew[idx].qty, q);
          else mappedCrew.push({ name: rName, qty: q });
        }
      }
    }
    normalizedShortcuts.push({
      trigger: sc.trigger,
      triggerLower: trigLower,
      mappedCrew,
      mappedDeliverables: Array.isArray(sc.mappedDeliverables) ? sc.mappedDeliverables.filter(Boolean) : [],
      mappedPrice: sc.mappedPrice ? Number(sc.mappedPrice) : null,
      mappedSpecialAddons: Array.isArray(sc.mappedSpecialAddons)
        ? sc.mappedSpecialAddons.map((x: any) => String(x || '').trim()).filter(Boolean)
        : []
    });
  }

  // Built-in "Standard Crew" shortcut fallback ONLY if user's Settings don't already define one
  const hasSettingsStandardCrew = normalizedShortcuts.some((s) => s.triggerLower.includes('standard'));
  if (!hasSettingsStandardCrew && /\b(?:standard\s*crew|स्टैंडर्ड\s*क्रू|स्टैंडर्ड\s*टीम)\b/i.test(notes)) {
    normalizedShortcuts.push({
      trigger: 'standard crew',
      triggerLower: 'standard crew',
      mappedCrew: [
        { name: resolveStudioCrewRole('Candid Photographer', studioCrewRoles), qty: 2 },
        { name: resolveStudioCrewRole('Cinematographer', studioCrewRoles), qty: 2 },
        { name: resolveStudioCrewRole('Traditional Videographer', studioCrewRoles), qty: 1 },
        { name: resolveStudioCrewRole('Drone Pilot', studioCrewRoles), qty: 1 }
      ],
      mappedDeliverables: [],
      mappedPrice: null,
      mappedSpecialAddons: [],
      isBuiltinFallback: true
    });
  }

  const clauseTriggerMaskRegex = normalizedShortcuts.length > 0
    ? new RegExp(
        normalizedShortcuts
          .map((s) => escapeRegExp(s.triggerLower))
          .sort((a, b) => b.length - a.length)
          .join('|'),
        'gi'
      )
    : null;

  const builtInEvMatchers: Array<{ rawTitle: string; regex: RegExp }> = [
    { rawTitle: 'Haldi', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:हल्दी|हळद|पीठी|pithi|haldi)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Sangeet', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:संगीत|sangeet(?:\s*night)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Wedding', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:शादी|लग्न|विवाह|फेरे|वेडिंग|बारात|wedding(?:\s*ceremony)?|marriage|pheras|varmala)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Mehendi', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:मेहंदी|मेंहदी|meh[ae]?ndi)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Ring Ceremony', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:सगाई|रिंग\s*सेरेमनी|साखरपुडा|रोका|एंगेजमेंट|engagement(?:\s*ceremony)?|ring\s*ceremony|roka|sagai)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Reception', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:रिसेप्शन|reception(?:\s*dinner)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Cocktail Party', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:कॉकटेल(?:\s*पार्टी)?|cocktail(?:\s*party)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Pool Party', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:पूल\s*पार्टी|pool\s*party)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Home Entry Shoot', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:गृह\s*प्रवेश|घर\s*का\s*शूट|घर\s*पे\s*एंट्री|home\s*entry(?:\s*shoot)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Mayra', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:मायरा|भाता|mayra)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { rawTitle: 'Ganesh Puja', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:गणेश\s*पूजा|ganesh\s*puja|puja|pooja)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi }
  ];

  for (const sName of studioEventNames || []) {
    const cleanS = String(sName || '').trim();
    if (!cleanS || cleanS.length < 3 || /pre[\s-]*wed|prewedding|pre[\s-]*shoot/i.test(cleanS)) continue;
    if (!builtInEvMatchers.some((b) => { b.regex.lastIndex = 0; return b.regex.test(cleanS); })) {
      builtInEvMatchers.push({
        rawTitle: cleanS,
        regex: new RegExp(`(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${escapeRegExp(cleanS)}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'gi')
      });
    }
  }

  const getEventsInText = (txt: string, maskTriggers: boolean = true): string[] => {
    let clean = txt.replace(/(?:pre[\s-]*wed(?:ding)?|prewedding|pre[\s-]*shoot|preshoot|प्री[\s-]*वेडिंग|प्रीवेडिंग|प्री[\s-]*शूट)/gi, ' ');
    if (maskTriggers && clauseTriggerMaskRegex) {
      clean = clean.replace(clauseTriggerMaskRegex, ' ');
    }
    const found: string[] = [];
    for (const m of builtInEvMatchers) {
      m.regex.lastIndex = 0;
      if (m.regex.test(clean)) {
        const resolved = resolveStudioFunctionName(m.rawTitle, studioEventNames, studioDefaultFunctions);
        if (!found.some((x) => x.toLowerCase() === resolved.toLowerCase())) {
          found.push(resolved);
        }
      }
    }
    return found;
  };

  // Split userNotes into sequential clauses while keeping same-comma multi-ceremony phrases grouped together
  // UNLESS internal conjunctions separate distinct per-event crews/shortcuts/dates.
  const sentences = notes
    .split(/(?:\r?\n|[.;।|])+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const rawSegments: string[] = [];
  for (const sent of sentences) {
    const commaParts = sent.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
    for (const cp of commaParts) {
      const conjSplit = cp
        .split(/\s+(?:और|तथा|व|and|&|aur|फिर|then)\s+/i)
        .map((s) => s.trim())
        .filter(Boolean);
      const cpEvents = getEventsInText(cp, true);
      // Keep commaPart intact when 2+ events share ONE non-crew phrase ("15 Dec ko Haldi aur Mehendi hai, isme...")
      const partsWithCrewOrShortcut = conjSplit.filter((sp) => {
        const noTrig = clauseTriggerMaskRegex ? sp.replace(clauseTriggerMaskRegex, ' ') : sp;
        return (
          extractCrewRolesFromText(noTrig, studioCrewRoles).length > 0 ||
          normalizedShortcuts.some((sc) => matchesShortcutTriggerText(sp, sc.triggerLower))
        );
      });
      if (cpEvents.length >= 2 && conjSplit.length >= 2 && partsWithCrewOrShortcut.length === 0) {
        rawSegments.push(cp);
      } else {
        rawSegments.push(...conjSplit);
      }
    }
  }

  const RESTRICTIVE_CREW_RE = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:bas|only|sirf|keval|just|alag(?:\s*(?:crew|team|log))?|separate(?:\s*(?:crew|team))?|different(?:\s*(?:crew|team))?|बस|सिर्फ|केवल|अलग\s*(?:क्रू|टीम|लोग)?|सेपरेट\s*क्रू)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i;
  const GLOBAL_SCOPE_RE = /(?:(?:सभी|हर|सारे|दोनों|तीनों|चारों|प्रत्येक)\s*(?:इवेंट|इवेंट्स|फंक्शन|फंक्शंस|functions?|events?|ceremon(?:y|ies)|में|मे|को|पे|mein)|(?:दोनों|तीनों|चारों)\b|\b(?:both)\b|\b(?:every|each|all)\s+(?:the\s+)?(?:events?|functions?|ceremon(?:y|ies))\b)/i;

  const clausesWithEvents: Array<{ text: string; events: string[]; isGlobalModifier: boolean }> = [];
  let activeEvents: string[] = [];

  for (const seg of rawSegments) {
    const segLower = seg.toLowerCase();
    const isPreWedOnly = /(?:pre[\s-]*wed|prewedding|pre[\s-]*shoot|प्री[\s-]*वेडिंग|प्री[\s-]*शूट)/i.test(segLower) && getEventsInText(seg, true).length === 0;
    if (isPreWedOnly) {
      activeEvents = [];
      continue;
    }
    const isClosingDelivOrBudget = /(?:deliverable|डिलीवरेबल|डिलीवरी|बजट|budget|package|discount|अमाउंट)/i.test(segLower) && getEventsInText(seg, true).length === 0;
    if (isClosingDelivOrBudget) {
      activeEvents = [];
      continue;
    }

    const evs = getEventsInText(seg, true);
    const isGlobalMod = GLOBAL_SCOPE_RE.test(seg);
    if (isGlobalMod) {
      activeEvents = [];
    } else if (evs.length > 0) {
      activeEvents = evs;
    }

    const attachedEvents = isGlobalMod
      ? []
      : (evs.length > 0 ? evs : (activeEvents.length >= 1 ? activeEvents : []));

    clausesWithEvents.push({
      text: seg,
      events: attachedEvents,
      isGlobalModifier: isGlobalMod
    });
  }

  const allMentionedEvents = Array.from(
    new Set(clausesWithEvents.flatMap((c) => c.events.map((e) => e.toLowerCase())))
  );

  // Build per-event crew & restrictive override map + track shortcut trigger scopes
  for (const cl of clausesWithEvents) {
    if (cl.events.length === 0 || cl.isGlobalModifier) continue;
    const clauseNoTriggers = clauseTriggerMaskRegex ? cl.text.replace(clauseTriggerMaskRegex, ' ') : cl.text;
    const crewInClause = extractCrewRolesFromText(clauseNoTriggers, studioCrewRoles);
    const hasRestrictive = RESTRICTIVE_CREW_RE.test(cl.text);

    for (const ev of cl.events) {
      const evKey = ev.toLowerCase();
      const info = eventOverrides.get(evKey) || {
        eventName: ev,
        explicitCrew: [],
        hasExplicitCrew: false,
        hasRestrictiveOverride: false,
        triggeredShortcuts: new Set<string>()
      };

      if (crewInClause.length > 0) {
        info.explicitCrew = mergeCrewList(info.explicitCrew, crewInClause, studioCrewRoles);
        info.hasExplicitCrew = true;
      }
      if (hasRestrictive) {
        info.hasRestrictiveOverride = true;
      }

      for (const sc of normalizedShortcuts) {
        if (matchesShortcutTriggerText(cl.text, sc.triggerLower)) {
          info.triggeredShortcuts.add(sc.triggerLower);
        }
      }

      eventOverrides.set(evKey, info);
    }
  }

  const allNotesTextCombined = [notes, extraContextText].filter(Boolean).join(' ');

  for (const sc of normalizedShortcuts) {
    const isMatch = matchesShortcutTriggerText(allNotesTextCombined, sc.triggerLower);

    if (!isMatch) continue;

    // Collect which events explicitly triggered this shortcut in their own clause
    const triggeredEventsSet = new Set<string>();
    let appearedWithoutEventClause = false;

    for (const cl of clausesWithEvents) {
      const matchedInClause = matchesShortcutTriggerText(cl.text, sc.triggerLower);
      if (matchedInClause) {
        if (cl.events.length > 0 && !cl.isGlobalModifier) {
          cl.events.forEach((e) => triggeredEventsSet.add(e.toLowerCase()));
        } else {
          appearedWithoutEventClause = true;
        }
      }
    }

    // Scope shortcut ONLY to its triggering event(s) when triggered on a specific ceremony subset
    const scopedEvents =
      triggeredEventsSet.size > 0 &&
      !appearedWithoutEventClause &&
      allMentionedEvents.some((e) => !triggeredEventsSet.has(e))
        ? triggeredEventsSet
        : null;

    shortcutMatches.push({
      trigger: sc.trigger,
      mappedCrew: sc.mappedCrew,
      mappedDeliverables: sc.mappedDeliverables,
      mappedPrice: sc.mappedPrice,
      mappedSpecialAddons: sc.mappedSpecialAddons,
      scopedEvents,
      isBuiltinFallback: sc.isBuiltinFallback
    });
  }

  return {
    shortcutMatches,
    eventOverrides,
    anyShortcutScopedToSubset: shortcutMatches.some((s) => s.scopedEvents !== null)
  };
}

/**
 * Produces human-readable scoped trigger hints for the LLM extraction prompt so Gemini
 * applies shortcuts ONLY to matching events and NEVER leaks Standard Crew onto explicit-crew events.
 */
export function buildScopedShortcutPromptHints(
  userNotes: string,
  studioSettings: any,
  studioEventTypes: any[] = [],
  studioCrewRoles: any[] = []
): string {
  const studioShortcuts: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts)
    ? studioSettings.aiRules.shortcuts
    : [];
  const studioEventNames: string[] = (Array.isArray(studioEventTypes) ? studioEventTypes : [])
    .filter((e: any) => typeof e === 'string' || String(e?.category || '').toLowerCase() !== 'ritual')
    .map((e: any) => (typeof e === 'string' ? e : e?.name || '').trim())
    .filter(Boolean);
  const studioDefaultFunctions: any[] = Array.isArray(studioSettings?.defaultFunctions)
    ? studioSettings.defaultFunctions
    : [];

  const analysis = analyzeScopedShortcutsAndCrewOverrides(
    userNotes,
    studioShortcuts,
    studioEventNames,
    studioDefaultFunctions,
    studioCrewRoles
  );

  const lines: string[] = [];
  for (const sm of analysis.shortcutMatches) {
    const scopeDesc = sm.scopedEvents
      ? `SCOPED ONLY TO: ${Array.from(sm.scopedEvents).join(', ')} (DO NOT copy onto other events!)`
      : `APPLIES ONLY to events WITHOUT their own explicit crew/override`;
    const parts: string[] = [];
    if (sm.mappedCrew.length > 0) parts.push(`Crew: ${sm.mappedCrew.map((c) => `${c.qty}x ${c.name}`).join(', ')}`);
    if (sm.mappedDeliverables.length > 0) parts.push(`Deliverables: ${sm.mappedDeliverables.join(', ')}`);
    if (sm.mappedPrice) parts.push(`Price: ₹${sm.mappedPrice}`);
    if (sm.mappedSpecialAddons.length > 0) parts.push(`Special Value Add-ons: ${sm.mappedSpecialAddons.join(', ')}`);
    if (parts.length > 0) {
      lines.push(`[STUDIO TRIGGER "${sm.trigger}" — ${scopeDesc}] -> ${parts.join(' | ')}`);
    }
  }

  for (const [, ov] of analysis.eventOverrides.entries()) {
    if (ov.hasExplicitCrew || ov.hasRestrictiveOverride) {
      const crewStr = ov.explicitCrew.map((c) => `${c.qty}x ${c.name}`).join(', ');
      lines.push(`[EXPLICIT PER-EVENT CREW LOCK FOR "${ov.eventName}"]: Keep ONLY ${crewStr || 'its explicit crew'} — NEVER merge other-event/Standard Crew here!`);
    }
  }

  const studioDelivTitles: string[] = Array.isArray(studioSettings?.deliverables)
    ? studioSettings.deliverables.map((d: any) => (typeof d === 'string' ? d : d?.title || '').trim()).filter(Boolean)
    : [];
  const spokenDelivs = extractDeliverablesFromText(userNotes, studioDelivTitles);
  if (spokenDelivs.length > 0) {
    lines.push(`[SPOKEN DELIVERABLES TO INCLUDE VERBATIM]: ${spokenDelivs.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Deterministically enforces Settings -> AI Training rules (shortcuts + customInstructions)
 * AND spoken voice-note directives (e.g. "सभी इवेंट में 1 Traditional Photographer ऐड करो")
 * onto ANY mapped Quotation Document while STRICTLY isolating per-event explicit crew overrides!
 */
export function applyAiTrainingAndVoiceDirectives(doc: any, contextData: any): void {
  if (!doc || typeof doc !== 'object') return;

  const studioSettings = contextData?.studioSettings || {};
  const studioCrewRoles: any[] = Array.isArray(contextData?.studioCrewRoles) ? contextData.studioCrewRoles : [];
  const studioEventNames: string[] = Array.isArray(contextData?.studioEventTypes)
    ? contextData.studioEventTypes
        .filter((e: any) => typeof e === 'string' || String(e?.category || '').toLowerCase() !== 'ritual')
        .map((e: any) => (typeof e === 'string' ? e : e?.name || '').trim())
        .filter(Boolean)
    : [];
  const studioDefaultFunctions: any[] = Array.isArray(studioSettings?.defaultFunctions)
    ? studioSettings.defaultFunctions
    : [];
  const studioDeliverables: string[] = Array.isArray(studioSettings?.deliverables)
    ? studioSettings.deliverables.map((d: any) => (typeof d === 'string' ? d : d?.title || '').trim()).filter(Boolean)
    : [];
  const studioSpecialAddons: string[] = Array.isArray(studioSettings?.specialAddons)
    ? studioSettings.specialAddons.map((a: any) => (typeof a === 'string' ? a : a?.title || '').trim()).filter(Boolean)
    : [];
  const studioShortcuts: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts)
    ? studioSettings.aiRules.shortcuts
    : [];
  const customInstructions: string = String(studioSettings?.aiRules?.customInstructions || '').trim();

  const userNotes = [
    contextData?.additional_user_notes,
    contextData?.additionalNotes,
    contextData?.leadNotes,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
  const effectivePromptNotes =
    String(contextData?.additional_user_notes || contextData?.additionalNotes || '').trim() || userNotes;
  const rawFormStr = JSON.stringify(contextData?.raw_form_fields || '');
  const allNotesText = `${userNotes} ${rawFormStr}`.toLowerCase();

  // 1. Scoped Studio Shortcuts & Per-Event Explicit Crew Overrides ("When I Say X on Event A -> NEVER leak onto Event B with alag crew")
  const analysis = analyzeScopedShortcutsAndCrewOverrides(
    userNotes,
    studioShortcuts,
    studioEventNames,
    studioDefaultFunctions,
    studioCrewRoles,
    rawFormStr
  );

  const matchedShortcutDelivs: string[] = [];
  const matchedShortcutSpecialAddons: string[] = [];
  let matchedShortcutPrice: number | null = null;
  const functions: any[] = Array.isArray(doc.functionsPage?.items) ? doc.functionsPage.items : [];
  const anyOtherShortcutMatched = analysis.shortcutMatches.some((sm) => sm.mappedCrew.length > 0);
  const hasCustomAllDelivShortcut = hasCustomAllDeliverablesShortcut(analysis.shortcutMatches);

  // Resolve exact + component keys for combined ceremony cards (e.g. "Haldi + Mehendi" -> ["haldi + mehendi", "haldi", "mehendi"])
  const getFnOverrideKeys = (fnName: string): string[] => {
    const resolvedFull = resolveStudioFunctionName(fnName || '', studioEventNames, studioDefaultFunctions).toLowerCase();
    const parts = String(fnName || '')
      .split(/\s*(?:\+|&|\band\b|\/)\s*/i)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => resolveStudioFunctionName(p, studioEventNames, studioDefaultFunctions).toLowerCase());
    return Array.from(new Set([resolvedFull, ...parts].filter(Boolean)));
  };

  for (const sm of analysis.shortcutMatches) {
    if (sm.mappedDeliverables.length > 0) {
      matchedShortcutDelivs.push(...sm.mappedDeliverables);
    }
    if (sm.mappedSpecialAddons && sm.mappedSpecialAddons.length > 0) {
      matchedShortcutSpecialAddons.push(...sm.mappedSpecialAddons);
    }
    if (sm.mappedPrice) matchedShortcutPrice = sm.mappedPrice;

    if (sm.mappedCrew.length > 0 && functions.length > 0) {
      const trigKey = sm.trigger.toLowerCase().trim();
      functions.forEach((fn: any) => {
        const fnKeys = getFnOverrideKeys(fn.name || '');
        const matchingOvs = fnKeys
          .map((k) => analysis.eventOverrides.get(k))
          .filter((v): v is NonNullable<typeof v> => Boolean(v));
        const hasAnyExplicitCrew = matchingOvs.some((o) => o.hasExplicitCrew && o.explicitCrew.length > 0);
        const hasAnyRestrictive = matchingOvs.some((o) => o.hasRestrictiveOverride);
        const hasAnyDirectShortcutHere = matchingOvs.some((o) => o.triggeredShortcuts.size > 0);
        const combinedOvCrew = matchingOvs.reduce<Array<{ name: string; qty: number }>>(
          (acc, o) => mergeCrewList(acc, o.explicitCrew || [], studioCrewRoles),
          []
        );

        const isExplicitlyTriggeredOnThisFn = matchingOvs.some((o) => o.triggeredShortcuts.has(trigKey));
        if (sm.scopedEvents !== null) {
          // Scoped shortcut (e.g. "Wedding mein Standard Crew"): ONLY apply to functions inside scopedEvents!
          if (fnKeys.some((k) => sm.scopedEvents!.has(k))) {
            if (hasAnyExplicitCrew && combinedOvCrew.length > 0) {
              fn.requirements = mergeCrewList(combinedOvCrew, sm.mappedCrew, studioCrewRoles);
            } else {
              fn.requirements = mergeCrewList([], sm.mappedCrew, studioCrewRoles);
            }
          }
        } else {
          // Global/unscoped shortcut: NEVER leak onto a function that explicitly stated its own crew,
          // restrictive override, OR already invoked its own distinct shortcut trigger!
          if (isExplicitlyTriggeredOnThisFn || (!hasAnyExplicitCrew && !hasAnyRestrictive && !hasAnyDirectShortcutHere)) {
            fn.requirements = mergeCrewList(fn.requirements, sm.mappedCrew, studioCrewRoles);
          }
        }
      });
    }
  }

  // Anti-Leak Sanitization: If Gemini (LLM) accidentally copied another event's Standard Crew / shortcut crew
  // onto an event where the user explicitly stated different/restricted crew ("Haldi mein bas 1 Traditional Photographer aur alag crew"),
  // strip leaked shortcut/hallucinated roles and restore strictly that event's explicit spoken crew!
  if (functions.length > 0) {
    functions.forEach((fn: any) => {
      // Never allow shortcut trigger names ("Standard Crew", "Premium Crew", custom triggers) to leak into card notes!
      fn.notes = sanitizeEventFunctionNotes(fn.notes, studioShortcuts);

      const fnKeys = getFnOverrideKeys(fn.name || '');
      const matchingOvs = fnKeys
        .map((k) => analysis.eventOverrides.get(k))
        .filter((v): v is NonNullable<typeof v> => Boolean(v));
      if (matchingOvs.length === 0) return;

      const hadDirectShortcut = matchingOvs.some((o) => o.triggeredShortcuts.size > 0);
      const hasRestrictive = matchingOvs.some((o) => o.hasRestrictiveOverride);
      const hasExplicit = matchingOvs.some((o) => o.hasExplicitCrew && o.explicitCrew.length > 0);
      const explicitCombined = matchingOvs.reduce<Array<{ name: string; qty: number }>>(
        (acc, o) => mergeCrewList(acc, o.explicitCrew || [], studioCrewRoles),
        []
      );
      const shouldLockExplicitCrew =
        !hadDirectShortcut &&
        (hasRestrictive || (hasExplicit && anyOtherShortcutMatched));

      if (shouldLockExplicitCrew && explicitCombined.length > 0) {
        fn.requirements = explicitCombined.map((c) => ({ ...c }));
      } else if (!hadDirectShortcut && hasExplicit && explicitCombined.length > 0) {
        fn.requirements = explicitCombined.map((c) => ({ ...c }));
      }
    });
  }

  // Merge Deliverables (All Deliverables Add + Shortcut Deliverables + Explicit Spoken Deliverables with counts/Hindi support!)
  const hasAllDelivReq = ALL_DELIVERABLES_TRIGGER_RE.test(allNotesText) && !hasCustomAllDelivShortcut;
  const explicitSpokenDelivs = extractDeliverablesFromText(userNotes, studioDeliverables);

  if (!doc.deliverablesPage) doc.deliverablesPage = { selectedItems: [], availableOptions: [] };
  if (hasAllDelivReq) {
    const fullCatalog = studioDeliverables.length > 0 ? studioDeliverables : DEFAULT_EXTRACTED_DELIVERABLES;
    doc.deliverablesPage.selectedItems = mergeDeliverablesSmart([...fullCatalog], explicitSpokenDelivs, true)
      .filter((item: string) => isValidDeliverableItem(item, fullCatalog));
  } else if (hasCustomAllDelivShortcut) {
    // User explicitly configured an "all deliverables" custom shortcut -> obey THAT shortcut's Y list strictly!
    doc.deliverablesPage.selectedItems = mergeDeliverablesSmart([...matchedShortcutDelivs], explicitSpokenDelivs, true)
      .filter((item: string) => isValidDeliverableItem(item, studioDeliverables));
  } else {
    let baseSelected = Array.isArray(doc.deliverablesPage.selectedItems)
      ? doc.deliverablesPage.selectedItems.filter((item: string) => isValidDeliverableItem(item, studioDeliverables))
      : [];
    if (matchedShortcutDelivs.length > 0) {
      baseSelected = mergeDeliverablesSmart(baseSelected, matchedShortcutDelivs, false);
    }
    if (explicitSpokenDelivs.length > 0) {
      baseSelected = mergeDeliverablesSmart(baseSelected, explicitSpokenDelivs, true);
    }
    doc.deliverablesPage.selectedItems = baseSelected.filter((item: string) =>
      isValidDeliverableItem(item, studioDeliverables)
    );
  }

  doc.deliverablesPage.availableOptions = Array.from(
    new Set([
      ...studioDeliverables,
      ...(doc.deliverablesPage.availableOptions || []),
      ...(doc.deliverablesPage.selectedItems || [])
    ])
  ).filter(Boolean);

  // Enforce Special Value Additions visibility strictly when spoken/complimentary or triggered via shortcut
  const spokenSpecialAddons = extractSpecialValueAdditionsFromText(effectivePromptNotes, studioSpecialAddons);
  const hasSpecialValueSignal =
    detectSpecialValueIntent(effectivePromptNotes) ||
    matchedShortcutSpecialAddons.length > 0 ||
    spokenSpecialAddons.length > 0;

  if (hasSpecialValueSignal) {
    const existingSpecial = Array.isArray(doc.specialValueAdditions?.selectedItems)
      ? doc.specialValueAdditions.selectedItems.filter(Boolean)
      : [];
    const combinedSpecial = Array.from(
      new Set([...existingSpecial, ...matchedShortcutSpecialAddons, ...spokenSpecialAddons])
    ).filter(Boolean);
    doc.specialValueAdditions = {
      ...(doc.specialValueAdditions || {}),
      visible: true,
      selectedItems: combinedSpecial,
      availableOptions: Array.from(
        new Set([
          ...studioSpecialAddons,
          ...(doc.specialValueAdditions?.availableOptions || []),
          ...combinedSpecial
        ])
      ).filter(Boolean),
      note: doc.specialValueAdditions?.note || ''
    };
  } else {
    doc.specialValueAdditions = {
      ...(doc.specialValueAdditions || {}),
      visible: false,
      selectedItems: [],
      note: ''
    };
  }

  if (Array.isArray(doc.pageSequence) && doc.pageSequence.length > 0) {
    doc.pageSequence = syncSpecialValuePageInSequence(
      doc.pageSequence,
      Boolean(doc.specialValueAdditions?.visible)
    );
  }

  // Apply shortcut price if base price isn't explicitly set by spoken numbers
  if (matchedShortcutPrice && doc.pricingPage && (!doc.pricingPage.basePrice || doc.pricingPage.basePrice === 150000)) {
    const hasExplicitBudgetInNotes = /(?:₹|rs\.?|inr|लख|लाख|lakh|lac|हजार|thousand|\d{2,}k)\s*/i.test(userNotes) || /\b\d{5,7}\b/.test(userNotes);
    if (!hasExplicitBudgetInNotes) {
      doc.pricingPage.basePrice = matchedShortcutPrice;
    }
  }

  // 2. Parse Settings Custom Instructions & Spoken Voice-Note Rule Commands
  const ruleEntries: Array<{ text: string; isCustomSetting: boolean }> = [];

  if (customInstructions) {
    customInstructions
      .split(/[\n;।]+|(?<=\S)\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => ruleEntries.push({ text: s, isCustomSetting: true }));
  }

  if (userNotes) {
    userNotes
      .split(/[\n;।]+|(?<=\S)\.\s+|(?=(?:सभी|हर|सारे|every|all)\s+(?:इवेंट|इवेंट्स|फंक्शन|फंक्शंस|functions?|events?|ceremon(?:y|ies)))/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => ruleEntries.push({ text: s, isCustomSetting: false }));
  }

  const EVENT_HINT_RE = /(?:haldi|हल्दी|sangeet|संगीत|mehendi|मेहंदी|wedding|शादी|लग्न|reception|रिसेप्शन|engagement|सगाई|रिंग\s*सेरेमनी|roka|रोका|cocktail|pool\s*party|mayra|मायरा|ganesh\s*puja|गणेश\s*पूजा)/i;

  for (const entry of ruleEntries) {
    const line = entry.text;
    if (!line || line.length < 4) continue;

    const hasGlobalScope =
      /(?:सभी|हर|सारे|every|each|all)\s*(?:इवेंट|इवेंट्स|फंक्शन|फंक्शंस|functions?|events?|ceremon(?:y|ies)|शूट|days?)/i.test(line) ||
      /\b(?:always|हमेशा|प्रत्येक)\b/i.test(line);
    const hasEventHint = EVENT_HINT_RE.test(line);
    const hasRemoveIntent = /(?:हटा|निकाल|remove|exclude|without|don'?t\s+(?:want|need|include|add)|मत\s*(?:रखो|लगाओ|ऐड))/i.test(line);
    const hasAddAction = /(?:ऐड|जोड़|डाल|शामिल|रख|रखो|लगा|add|include|append|put|with)/i.test(line);

    const crewFound = extractCrewRolesFromText(line, studioCrewRoles);

    // A) Global Crew Rule (e.g. "सभी इवेंट में 1 Traditional Photographer ऐड करो" OR Settings rule "Add 1 Traditional Photographer")
    if (crewFound.length > 0 && (hasGlobalScope || (entry.isCustomSetting && !hasEventHint))) {
      if (hasRemoveIntent && !hasAddAction) {
        functions.forEach((fn) => {
          fn.requirements = removeCrewFromList(fn.requirements, crewFound, studioCrewRoles);
        });
      } else if (hasGlobalScope || hasAddAction || entry.isCustomSetting) {
        functions.forEach((fn) => {
          const fnKey = resolveStudioFunctionName(fn.name || '', studioEventNames, studioDefaultFunctions).toLowerCase();
          const ov = analysis.eventOverrides.get(fnKey);
          // Do not force external Settings customInstructions crew onto a card where user explicitly locked "अलग क्रू" / "bas ... alag crew"
          if (entry.isCustomSetting && ov?.hasRestrictiveOverride) {
            return;
          }
          fn.requirements = mergeCrewList(fn.requirements, crewFound, studioCrewRoles);
        });
      }
      continue;
    }

    // B) Per-Event Crew / Timing Rule (especially from Settings customInstructions or explicit voice add)
    if (hasEventHint && functions.length > 0) {
      const eventMatches = line.match(new RegExp(EVENT_HINT_RE.source, 'gi')) || [];
      const targetResolvedNames = Array.from(
        new Set(eventMatches.map((m) => resolveStudioFunctionName(m, studioEventNames, studioDefaultFunctions).toLowerCase()))
      );

      const matchingFuncs = functions.filter((fn) => {
        const fnLower = String(fn.name || '').toLowerCase();
        return (
          targetResolvedNames.some((t) => fnLower === t || fnLower.includes(t) || t.includes(fnLower)) ||
          eventMatches.some((em) => fnLower.includes(em.toLowerCase()))
        );
      });

      if (matchingFuncs.length > 0) {
        if (crewFound.length > 0 && (hasAddAction || entry.isCustomSetting)) {
          matchingFuncs.forEach((fn) => {
            const fnKey = resolveStudioFunctionName(fn.name || '', studioEventNames, studioDefaultFunctions).toLowerCase();
            const ov = analysis.eventOverrides.get(fnKey);
            if (entry.isCustomSetting && ov?.hasRestrictiveOverride) {
              return;
            }
            if (hasRemoveIntent && !hasAddAction) {
              fn.requirements = removeCrewFromList(fn.requirements, crewFound, studioCrewRoles);
            } else {
              fn.requirements = mergeCrewList(fn.requirements, crewFound, studioCrewRoles);
            }
          });
        }
        // Apply default ceremony time window from Settings customInstructions when card lacks timing
        if (entry.isCustomSetting) {
          const timeMatch = line.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*(?:से|to|till|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
          if (timeMatch) {
            matchingFuncs.forEach((fn) => {
              if (!fn.startTime) fn.startTime = timeMatch[1].toUpperCase().trim();
              if (!fn.endTime) fn.endTime = timeMatch[2].toUpperCase().trim();
            });
          }
        }
      }
    }

    // C) Custom Instructions Travel / Minimum Package Pricing Policies
    if (entry.isCustomSetting && doc.pricingPage) {
      if (/(?:डेस्टिनेशन|destination)/i.test(line) && /(?:ट्रैवल|travel)/i.test(line)) {
        const isDestLead = /(?:डेस्टिनेशन|destination|udaipur|उदयपुर|jaipur|जयपुर|goa|गोवा|jodhpur|जोधपुर)/i.test(allNotesText);
        const amtM = line.match(/₹?\s*([\d,]+)\s*(हजार|लाख|k|lakh)?/i);
        if (isDestLead && amtM && !doc.pricingPage.travelCharges) {
          let val = parseInt(amtM[1].replace(/,/g, ''), 10) || 0;
          if (/लाख|lakh/i.test(amtM[2] || '')) val *= 100000;
          else if (/हजार|k/i.test(amtM[2] || '')) val *= 1000;
          if (val > 0) doc.pricingPage.travelCharges = val;
        }
      }
      if (/(?:मिनिमम|minimum)/i.test(line) && /(?:पैकेज|package)/i.test(line)) {
        const amtM = line.match(/₹?\s*([\d,]+)\s*(हजार|लाख|k|lakh)?/i);
        if (amtM && doc.pricingPage.basePrice > 0) {
          let minVal = parseInt(amtM[1].replace(/,/g, ''), 10) || 0;
          if (/लाख|lakh/i.test(amtM[2] || '')) minVal *= 100000;
          else if (/हजार|k/i.test(amtM[2] || '')) minVal *= 1000;
          const explicitBudget = /(?:बजट|budget|अमाउंट|amount|₹)\s*[:=-]?\s*(\d[\d,]*)/i.test(userNotes);
          if (minVal > 0 && !explicitBudget && doc.pricingPage.basePrice < minVal) {
            doc.pricingPage.basePrice = minVal;
          }
        }
      }
    }
  }
}

/**
 * Normalizes Hindi / Marathi counting words and numerals to standard numeric equivalents.
 */
const HINDI_NUMBER_WORD_MAP: Array<{ regex: RegExp; val: string }> = [
  { regex: /डेढ़\s*लाख/g, val: '150000' },
  { regex: /ढाई\s*लाख|अडीच\s*लाख/g, val: '250000' },
  { regex: /सवा\s*लाख/g, val: '125000' },
  { regex: /पौने\s*दो\s*लाख/g, val: '175000' },
  { regex: /एक\s*लाख/g, val: '100000' },
  { regex: /दो\s*लाख/g, val: '200000' },
  { regex: /तीन\s*लाख/g, val: '300000' },
  { regex: /चार\s*लाख/g, val: '400000' },
  { regex: /पांच\s*लाख/g, val: '500000' },
  { regex: /दस\s*हजार|दस\s*हज़ार/g, val: '10000' },
  { regex: /पंद्रह\s*हजार|पंद्रह\s*हज़ार/g, val: '15000' },
  { regex: /बीस\s*हजार|बीस\s*हज़ार/g, val: '20000' },
  { regex: /पच्चीस\s*हजार|पच्चीस\s*हज़ार/g, val: '25000' },
  { regex: /तीस\s*हजार|तीस\s*हज़ार/g, val: '30000' },
  { regex: /पैंतीस\s*हजार|पैंतीस\s*हज़ार/g, val: '35000' },
  { regex: /चालीस\s*हजार|चालीस\s*हज़ार/g, val: '40000' },
  { regex: /पचास\s*हजार|पचास\s*हज़ार/g, val: '50000' },
  { regex: /साठ\s*हजार|साठ\s*हज़ार/g, val: '60000' },
  { regex: /सत्तर\s*हजार|सत्तर\s*हज़ार/g, val: '70000' },
  { regex: /अस्सी\s*हजार|अस्सी\s*हज़ार/g, val: '80000' },
  { regex: /नब्बे\s*हजार|नब्बे\s*हज़ार/g, val: '90000' }
];

export function normalizeHindiNumberWords(raw: string): string {
  let s = (raw || '').toLowerCase();
  if (!/[\u0900-\u097F]/.test(s)) return s;
  for (const item of HINDI_NUMBER_WORD_MAP) {
    s = s.replace(item.regex, item.val);
  }
  return s;
}

/**
 * Intelligent currency amount parser: resolves Lakhs, K, Crores, Thousand, and raw numbers.
 */
export function parseCurrencyAmount(rawStr: string): number {
  if (!rawStr) return 0;
  let s = String(rawStr).toLowerCase().trim();
  s = normalizeHindiNumberWords(s);
  
  const croreMatch = s.match(/([0-9.]+)\s*(?:cr|crore|करोड़)/i);
  if (croreMatch) {
    const n = parseFloat(croreMatch[1]);
    if (!isNaN(n)) return Math.round(n * 10000000);
  }

  const lakhMatch = s.match(/([0-9.]+)\s*(?:lakh|lac|l|लाख)/i);
  if (lakhMatch) {
    const n = parseFloat(lakhMatch[1]);
    if (!isNaN(n)) return Math.round(n * 100000);
  }
  
  const kMatch = s.match(/([0-9.]+)\s*(?:k|thousand|हजार|हज़ार)/i);
  if (kMatch) {
    const n = parseFloat(kMatch[1]);
    if (!isNaN(n)) return Math.round(n * 1000);
  }

  const digitsMatch = s.match(/[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,7}/);
  if (digitsMatch) {
    return parseInt(digitsMatch[0].replace(/,/g, ''), 10);
  }
  return 0;
}

export interface EvaluatedPricingResult {
  basePrice: number;
  discountAmount: number;
  travelCharges: number;
  accommodationCharges: number;
  additionalCharges: number;
  gstPct: number;
  netTotal: number;
  note: string;
  steps: Array<{ name: string; pct: string; amount: number; status: string }>;
}

/**
 * Authoritative Mathematical Pricing Method Evaluator
 * Evaluates complex pricing methods just like Gemini and ChatGPT:
 * - Multi-day multiplications (e.g. ₹35,000/day x 2 days = ₹70,000)
 * - Multi-event summations (e.g. Haldi ₹25k + Sangeet ₹35k + Wedding ₹70k = ₹1,30,000)
 * - Add-on charges (albums, drones, travel, stay)
 * - Flat and percentage discounts
 * - Net total investment calculation
 * - Mathematically balanced payment schedule milestone steps
 */
export function evaluatePricingMethod(rawText: string, defaultPrice: number = 150000): EvaluatedPricingResult {
  const normText = normalizeHindiNumberWords(rawText || '');
  const text = normText.toLowerCase();

  let basePrice = 0;
  let discountAmount = 0;
  let travelCharges = 0;
  let accommodationCharges = 0;
  let additionalCharges = 0;
  let gstPct = 0;
  let calculationNote = '';

  const amtPattern = '(?:(?:₹|rs\\.?|inr)\\s*)?([0-9]+(?:[.,][0-9]+)*(?:\\s*(?:lakh|lakhs|lac|lacs|l|लाख|k|thousand|thousands|हजार|हज़ार|cr|crore|crores|करोड़))?)';

  // 1. Travel charges
  const travelMatch = text.match(new RegExp(`(?:travel|travelling|traveling|यात्रा|ट्रैवल|सफर)\\s*(?:charges|cost|expense|खर्चा)?[:\\s]*${amtPattern}(?!\\s*[%])`, 'i')) ||
                      text.match(new RegExp(`${amtPattern}\\s*(?:travel|travelling|यात्रा|ट्रैवल)(?!\\s*[%])`, 'i'));
  if (travelMatch) {
    travelCharges = parseCurrencyAmount(travelMatch[1]);
  }

  // 2. Stay / Accommodation charges
  const stayMatch = text.match(new RegExp(`(?:stay|accommodation|hotel|कमरा|रहना|होटल)\\s*(?:charges|cost|expense|खर्चा)?[:\\s]*${amtPattern}(?!\\s*[%])`, 'i')) ||
                    text.match(new RegExp(`${amtPattern}\\s*(?:stay|accommodation|hotel|होटल)(?!\\s*[%])`, 'i'));
  if (stayMatch) {
    accommodationCharges = parseCurrencyAmount(stayMatch[1]);
  }

  // 3. Discount calculation (Handles percentage, explicit flat discount, and "X ka diya hai aur discount karke Y mein" final-price phrasing)
  const discPctMatch = text.match(/([0-9.]+)\s*%\s*(?:discount|off|छूट)/i) || 
                       text.match(/(?:discount|off|छूट)[:\s]*([0-9.]+)\s*%/i);
  let discPct = 0;
  if (discPctMatch) {
    discPct = parseFloat(discPctMatch[1]) || 0;
  }

  const discFlatMatch =
    text.match(new RegExp(`${amtPattern}\\s*(?:ka|ke|ki|का|के|की)?\\s*(?:flat\\s*)?(?:discount|off|minus|concession|डिस्काउंट|छूट)(?!\\s*%)`, 'i')) ||
    text.match(new RegExp(`(?:discount|off|minus|concession|less|छूट|कम|डिस्काउंट)(?:\\s*(?:of|hai|is|ka|diya|mila|:|\\-))+\\s*${amtPattern}(?!\\s*%)`, 'i'));
  if (discFlatMatch) {
    discountAmount = parseCurrencyAmount(discFlatMatch[1]);
  }

  let afterDiscountPrice = 0;
  const afterDiscMatch =
    text.match(new RegExp(`(?:discount|less|छूट|कम|डिस्काउंट)\\s*(?:karke|kar\\s*ke|deke|de\\s*ke|dekar|करके|देकर|देके|के\\s*बाद|after)\\s*(?:final|offer|deal|net|कुल)?[:\\s]*(?:mein|me|में)?[:\\s]*${amtPattern}(?!\\s*%)`, 'i')) ||
    text.match(new RegExp(`(?:after|with)\\s*(?:the\\s*)?(?:discount|छूट|डिस्काउंट)[:\\s]*(?:final\\s*)?${amtPattern}(?!\\s*%)`, 'i')) ||
    text.match(new RegExp(`${amtPattern}\\s*(?:mein|me|में|at|for)\\s*(?:discount\\s*karke|final\\s*(?:kiya|hua|diya)|settle\\s*(?:kiya|hua)|done\\s*(?:kiya|hua)|usko\\s+discount\\s*karke\\s*diya)`, 'i'));
  if (afterDiscMatch) {
    afterDiscountPrice = parseCurrencyAmount(afterDiscMatch[1]);
  }

  // Track advance/token amount early so fallback basePrice search never accidentally picks the advance amount
  const advanceSkipMatch =
    text.match(new RegExp(`(?:advance|token|booking|टोकन|एडवांस)\\s*(?:amount|money|रुपये|है|रहेगा|is|:)?[:\\s]*${amtPattern}(?!\\s*%)`, 'i')) ||
    text.match(new RegExp(`${amtPattern}\\s*(?:advance|token|booking|टोकन|एडवांस)`, 'i'));
  const advanceCandidateAmt = advanceSkipMatch ? parseCurrencyAmount(advanceSkipMatch[1]) : 0;

  // 4. Additional charges (album, drone add-on)
  const albumMatch = text.match(new RegExp(`${amtPattern}\\s*(?:album|photobook|एल्बम)`, 'i')) ||
                     text.match(new RegExp(`(?:album|photobook|एल्बम)\\s*[:\\s]*${amtPattern}`, 'i'));
  if (albumMatch) {
    const val = parseCurrencyAmount(albumMatch[1]);
    if (val > 0 && val < 100000) additionalCharges += val;
  }

  const droneMatch = text.match(new RegExp(`${amtPattern}\\s*(?:drone|ड्रोन)`, 'i')) ||
                     text.match(new RegExp(`(?:drone|ड्रोन)\\s*[:\\s]*${amtPattern}`, 'i'));
  if (droneMatch) {
    const val = parseCurrencyAmount(droneMatch[1]);
    if (val > 0 && val < 100000) additionalCharges += val;
  }

  // 5. Per day / Per event multiplication e.g. '35,000 per day for 2 days' or '40k per day x 3 days'
  const multiDayMatch = text.match(new RegExp(`${amtPattern}\\s*(?:per\\s*day|per\\s*event|per\\s*function|दिन|डे)\\s*(?:[x*]|for|into)?\\s*(\\d+)\\s*(?:days|events|functions|दिन)?`, 'i')) ||
                        text.match(new RegExp(`(\\d+)\\s*(?:days|events|functions|दिन)\\s*(?:into|[x*]|@)?\\s*${amtPattern}\\s*(?:per\\s*day|per\\s*event)?`, 'i'));
  if (multiDayMatch) {
    const rateStr = multiDayMatch[1].match(/\d/) ? multiDayMatch[1] : multiDayMatch[2];
    const qtyStr = multiDayMatch[2].match(/^[0-9]+$/) ? multiDayMatch[2] : multiDayMatch[1];
    const rate = parseCurrencyAmount(rateStr);
    const qty = parseInt(qtyStr, 10) || 1;
    if (rate > 0 && qty > 0) {
      basePrice = rate * qty;
      calculationNote = `₹${rate.toLocaleString('en-IN')}/day x ${qty} Days = ₹${basePrice.toLocaleString('en-IN')}`;
    }
  }

  // 6. Multi-event rates summation e.g. 'haldi 25000, sangeet 35000, wedding 70000'
  if (!basePrice) {
    const eventRates: number[] = [];
    const events = ['haldi', 'sangeet', 'mehendi', 'wedding', 'reception', 'engagement', 'roka', 'हल्दी', 'संगीत', 'शादी', 'वेडिंग', 'रिसेप्शन'];
    for (const evt of events) {
      const regex = new RegExp(`${evt}[^0-9]{1,15}${amtPattern}`, 'i');
      const m = text.match(regex);
      if (m) {
        const num = parseCurrencyAmount(m[1]);
        if (num >= 5000) eventRates.push(num);
      }
    }
    if (eventRates.length >= 2) {
      basePrice = eventRates.reduce((a, b) => a + b, 0);
      calculationNote = `Sum of ${eventRates.length} ceremonies = ₹${basePrice.toLocaleString('en-IN')}`;
    }
  }

  // 7. Direct package / regular / budget / "ka diya hai" price
  if (!basePrice) {
    const pkgMatch = text.match(new RegExp(`${amtPattern}\\s*(?:का\\s*(?:पैकेज|बजट|कोटेशन|दिया|है|था)|के\\s*लिए|ka\\s*(?:package|budget|quotation|diya|hai|tha|rate)|package|budget|बजट|पैकेज)`, 'i')) ||
                     text.match(new RegExp(`(?:package|budget|total|price|cost|investment|बजट|पैकेज|कोटेशन|अमाउंट|प्राइस)\\s*(?:है|is|ka|ke|का|के|:|\\s)*\\s*${amtPattern}(?!\\s*[%])`, 'i'));
    if (pkgMatch) {
      const candidatePkg = parseCurrencyAmount(pkgMatch[1]);
      if (candidatePkg > 0 && candidatePkg !== afterDiscountPrice && candidatePkg !== discountAmount) {
        basePrice = candidatePkg;
      }
    }
  }

  // 8. Fallback to any prominent amount in text (excluding discount amount, travel, advance, after-discount final price)
  const allProminentNumbers = [...text.matchAll(new RegExp(amtPattern, 'gi'))]
    .map(m => parseCurrencyAmount(m[1]))
    .filter(n => n >= 5000 && n !== discountAmount && n !== travelCharges && n !== advanceCandidateAmt);

  if (!basePrice) {
    const baseCandidates = allProminentNumbers.filter(n => n !== afterDiscountPrice);
    if (baseCandidates.length > 0) {
      basePrice = baseCandidates[0];
    } else if (afterDiscountPrice > 0) {
      basePrice = afterDiscountPrice;
    }
  }

  if (!basePrice) basePrice = defaultPrice;

  // Apply explicit "after discount Y" difference against larger basePrice X ("60,000 ka diya hai aur discount karke 54,000 mein")
  if (afterDiscountPrice > 0) {
    if (basePrice <= afterDiscountPrice) {
      const largerOrig = allProminentNumbers.find(n => n > afterDiscountPrice && n <= afterDiscountPrice * 4);
      if (largerOrig) {
        basePrice = largerOrig;
      }
    }
    if (basePrice > afterDiscountPrice && afterDiscountPrice >= basePrice * 0.25) {
      discountAmount = basePrice - afterDiscountPrice;
    }
  }

  // Apply percentage discount if found
  if (discPct > 0 && !discountAmount) {
    discountAmount = Math.round((basePrice * discPct) / 100);
  }

  // Check regular vs best offer price
  if (!discountAmount) {
    const regMatch = text.match(new RegExp(`(?:regular|standard|actual)[:\\s]*${amtPattern}`, 'i'));
    const offerMatch = text.match(new RegExp(`(?:offer|deal|final|special|best)[:\\s]*${amtPattern}`, 'i'));
    if (regMatch && offerMatch) {
      const reg = parseCurrencyAmount(regMatch[1]);
      const off = parseCurrencyAmount(offerMatch[1]);
      if (reg > off && off > 0) {
        basePrice = reg;
        discountAmount = reg - off;
      }
    }
  }

  // Safety guard: discountAmount must never exceed basePrice
  if (discountAmount >= basePrice && basePrice > 0) {
    const largerBase = allProminentNumbers.find(n => n > discountAmount);
    if (largerBase) {
      basePrice = largerBase;
      discountAmount = Math.max(0, largerBase - (afterDiscountPrice || basePrice));
    } else {
      discountAmount = 0;
    }
  }

  // 9. GST percentage
  const gstMatch = text.match(/([0-9.]+)\s*%\s*gst/i) || text.match(/gst[:\s]*([0-9.]+)\s*%/i);
  if (gstMatch) {
    gstPct = parseFloat(gstMatch[1]) || 0;
  }

  const netSubtotal = Math.max(0, basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges);
  const gstAmount = Math.round(netSubtotal * (gstPct / 100));
  const netTotal = netSubtotal + gstAmount;

  if (discountAmount > 0 && !calculationNote) {
    calculationNote = `Special discount of ₹${discountAmount.toLocaleString('en-IN')} applied (Net: ₹${netTotal.toLocaleString('en-IN')})`;
  }

  // 10. Payment schedule calculation (Percentages or flat amounts, balanced strictly to Net Total)
  const steps: Array<{ name: string; pct: string; amount: number; status: string }> = [];

  // Check if explicit flat advance token was mentioned (e.g. "25,000 token received")
  const flatAdvanceMatch = text.match(/(?:advance|token|booking|टोकन|एडवांस)[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)(?!\s*[%])/i) ||
                           text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:advance|token|booking|टोकन|एडवांस)(?!\s*[%])/i);
  let explicitAdvanceAmt = 0;
  if (flatAdvanceMatch) {
    const parsedAdv = parseCurrencyAmount(flatAdvanceMatch[1]);
    if (parsedAdv > 0 && parsedAdv < netTotal) {
      explicitAdvanceAmt = parsedAdv;
    }
  }

  const hasExplicitPaymentReceived = /\b(advance received|advance paid|already paid|already received|payment received|token received|token paid|amount received|amount paid|प्राप्त|दिया)\b/i.test(text);

  const pctMatches = [...text.matchAll(/(\d{1,2})\s*%\s*(?:advance|token|booking|event|wedding|delivery|final)/gi)];
  if (pctMatches.length >= 2) {
    let allocated = 0;
    pctMatches.forEach((m, idx) => {
      const p = parseInt(m[1], 10);
      const isLast = idx === pctMatches.length - 1;
      const amt = isLast ? Math.max(0, netTotal - allocated) : Math.round((netTotal * p) / 100);
      allocated += amt;
      const isAdv = m[0].includes('advance') || m[0].includes('token') || m[0].includes('booking');
      const name = isAdv ? 'Advance Token'
                 : m[0].includes('event') || m[0].includes('wedding') ? 'On Event Day' : 'On Final Delivery';
      const status = isAdv && hasExplicitPaymentReceived ? 'Completed' : 'Pending';
      steps.push({ name, pct: p + '%', amount: amt, status });
    });
  } else if (explicitAdvanceAmt > 0) {
    const advPct = Math.round((explicitAdvanceAmt / netTotal) * 100);
    const rem = Math.max(0, netTotal - explicitAdvanceAmt);
    const eventAmt = Math.round(rem * 0.60);
    const delivAmt = Math.max(0, rem - eventAmt);
    steps.push(
      { name: 'Advance Token', pct: `${advPct}%`, amount: explicitAdvanceAmt, status: hasExplicitPaymentReceived ? 'Completed' : 'Pending' },
      { name: 'On Event Day', pct: `${Math.round((eventAmt / netTotal) * 100)}%`, amount: eventAmt, status: 'Pending' },
      { name: 'On Final Delivery', pct: `${Math.max(0, 100 - advPct - Math.round((eventAmt / netTotal) * 100))}%`, amount: delivAmt, status: 'Pending' }
    );
  } else if (text.includes('50%') && (text.includes('half') || text.includes('दो भाग') || text.includes('50% 50%'))) {
    const s1 = Math.round(netTotal * 0.50);
    const s2 = Math.max(0, netTotal - s1);
    steps.push(
      { name: 'Advance Booking', pct: '50%', amount: s1, status: hasExplicitPaymentReceived ? 'Completed' : 'Pending' },
      { name: 'On Event Day / Delivery', pct: '50%', amount: s2, status: 'Pending' }
    );
  } else {
    // Default 30% / 50% / 20%
    const s1 = Math.round(netTotal * 0.30);
    const s2 = Math.round(netTotal * 0.50);
    const s3 = Math.max(0, netTotal - s1 - s2);
    steps.push(
      { name: 'Advance Token', pct: '30%', amount: s1, status: hasExplicitPaymentReceived ? 'Completed' : 'Pending' },
      { name: 'On Event Day', pct: '50%', amount: s2, status: 'Pending' },
      { name: 'On Final Delivery', pct: '20%', amount: s3, status: 'Pending' }
    );
  }

  return {
    basePrice,
    discountAmount,
    travelCharges,
    accommodationCharges,
    additionalCharges,
    gstPct,
    netTotal,
    note: calculationNote,
    steps
  };
}

function formatClockTimeToken(rawHourMin: string, explicitMeridiem?: string, hintWord?: string): string {
  const m = String(rawHourMin || '').trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return '';
  let hr = parseInt(m[1], 10);
  const min = m[2] ? m[2] : '00';
  if (isNaN(hr) || hr < 0 || hr > 23) return '';

  let meridiem = (explicitMeridiem || '').toUpperCase().trim();
  if (!meridiem) {
    if (hr === 0) {
      hr = 12;
      meridiem = 'AM';
    } else if (hr > 12) {
      hr = hr - 12;
      meridiem = 'PM';
    } else if (hintWord) {
      const h = hintWord.toLowerCase();
      if (/^(?:subah|morning|सुबह)$/i.test(h)) {
        meridiem = 'AM';
      } else if (/^(?:dopahar|afternoon|shaam|sham|evening|raat|night|दोपहर|शाम|रात)$/i.test(h)) {
        meridiem = 'PM';
      }
    }
  } else if (hr > 12) {
    hr = hr - 12;
  }

  return meridiem ? `${hr}:${min} ${meridiem}` : `${hr}:${min}`;
}

export function extractTimingFromSnippet(snippet: string): {
  startTime: string;
  endTime: string;
  durationSlot?: string;
} {
  const clean = String(snippet || '').replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d))).trim();
  if (!clean) return { startTime: '', endTime: '' };

  let startTime = '';
  let endTime = '';

  const periodRe = '(morning|subah|सुबह|afternoon|dopahar|दोपहर|evening|shaam|sham|शाम|night|raat|रात)';

  // 1. Explicit ranges ("10 AM to 5 PM", "subah 9 se shaam 4", "10 se 5 baje", "10:30am - 4pm")
  const rangeRegex = new RegExp(
    `(?:(?:${periodRe})\\s*)?(\\d{1,2}(?::\\d{2})?)\\s*(am|pm|a\\.m\\.|p\\.m\\.|baje|बजे)?\\s*(?:-|–|to|till|se|से)\\s*(?:(?:${periodRe})\\s*)?(\\d{1,2}(?::\\d{2})?)\\s*(am|pm|a\\.m\\.|p\\.m\\.|baje|बजे)?`,
    'gi'
  );
  for (const m of clean.matchAll(rangeRegex)) {
    const [full, p1, n1, u1Raw, p2, n2, u2Raw] = m;
    const afterText = clean.slice((m.index || 0) + full.length, (m.index || 0) + full.length + 18);
    // Reject date ranges ("14 to 16 December", "14 - 16 Dec") or currency ranges
    if (/^\s*(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|tarikh|तारीख|k\b|lakh|000)/i.test(afterText)) {
      continue;
    }
    const u1 = (u1Raw || '').replace(/\./g, '').toLowerCase();
    const u2 = (u2Raw || '').replace(/\./g, '').toLowerCase();
    const hasTimeSignal = Boolean(p1 || p2 || /am|pm|baje|बजे/.test(u1) || /am|pm|baje|बजे/.test(u2) || n1.includes(':') || n2.includes(':'));
    if (!hasTimeSignal) continue;

    const hr1 = parseInt(n1.split(':')[0], 10);
    const hr2 = parseInt(n2.split(':')[0], 10);
    if (hr1 < 1 || hr1 > 23 || hr2 < 1 || hr2 > 23) continue;

    let mer1 = u1 === 'am' || u1 === 'pm' ? u1.toUpperCase() : '';
    let mer2 = u2 === 'am' || u2 === 'pm' ? u2.toUpperCase() : '';
    if (!mer1 && !mer2 && !p1 && !p2 && /baje|बजे/.test(u1 + u2)) {
      if (hr1 >= 6 && hr1 <= 11 && hr2 >= 1 && hr2 < hr1) {
        mer1 = 'AM';
        mer2 = 'PM';
      } else if (hr1 >= 6 && hr1 <= 11 && hr2 <= 11 && hr2 > hr1) {
        mer1 = 'AM';
        mer2 = 'AM';
      }
    }
    startTime = formatClockTimeToken(n1, mer1, p1);
    endTime = formatClockTimeToken(n2, mer2, p2);
    if (startTime && endTime) break;
  }

  // 2. Keyed startTime / endTime format
  if (!startTime) {
    const sM = clean.match(/(?:startTime|start_time|start|from|timing)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?)\s*(AM|PM|am|pm)?["']?/i);
    const eM = clean.match(/(?:endTime|end_time|end|till)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?)\s*(AM|PM|am|pm)?["']?/i);
    if (sM) startTime = formatClockTimeToken(sM[1], sM[2]);
    if (eM) endTime = formatClockTimeToken(eM[1], eM[2]);
  }

  // 3. Single explicit start time ("evening 7 baje", "subah 9 baje", "7 pm onwards", "at 7:30 pm", "7 baje se")
  if (!startTime) {
    const singleRegex = new RegExp(
      `(?:(${periodRe})\\s*(?:ko\\s*|mein\\s*|me\\s*|at\\s*)?|\\b(?:at|from|timing|time)\\s*[:\\-]?\\s*)?(\\d{1,2}(?::\\d{2})?)\\s*(?:(am|pm|a\\.m\\.|p\\.m\\.|baje|बजे)(?:\\s*(?:onwards|sharp|se|से))?|(onwards|sharp))`,
      'gi'
    );
    for (const m of clean.matchAll(singleRegex)) {
      const [full, pWord, , numStr, unitRaw, postCue] = m;
      const beforeSlice = clean.slice(Math.max(0, (m.index || 0) - 10), m.index || 0);
      const afterSlice = clean.slice((m.index || 0) + full.length, (m.index || 0) + full.length + 16);
      if (/(?:₹|rs\.?|,)\s*$/i.test(beforeSlice)) continue;
      if (/^\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|000|k\b|lakh|days?|hours?|hrs?|min)/i.test(afterSlice)) {
        continue;
      }
      const unit = (unitRaw || '').replace(/\./g, '').toLowerCase();
      const hasClockCue = Boolean(unit === 'am' || unit === 'pm' || unit === 'baje' || unit === 'बजे' || postCue || numStr.includes(':') || pWord);
      if (!hasClockCue) continue;
      const hr = parseInt(numStr.split(':')[0], 10);
      if (hr < 1 || hr > 23) continue;
      let mer = unit === 'am' || unit === 'pm' ? unit.toUpperCase() : '';
      if (!mer && !pWord && /baje|बजे/.test(unit)) {
        const ctxNear = (beforeSlice + ' ' + afterSlice).toLowerCase();
        if (/(?:subah|morning|सुबह)/i.test(ctxNear)) mer = 'AM';
        else if (/(?:shaam|sham|evening|raat|night|dopahar|afternoon|शाम|रात|दोपहर)/i.test(ctxNear)) mer = 'PM';
      }
      startTime = formatClockTimeToken(numStr, mer, pWord);
      if (startTime) break;
    }
  }

  // 4. Time-of-day durationSlot ("Morning", "Afternoon", "Evening", "Night", "Full Day")
  // Mask out ceremony titles like "Sangeet Night" / "Cocktail Night" unless paired with timing context
  // When an explicit start+end clock range spans two different periods (e.g. "subah 9 se shaam 4"), skip single-slot label
  const slotScan = clean
    .replace(/\b(?:sangeet|cocktail|reception|bachelor|hens)\s+night\b/gi, ' ')
    .replace(/\bnight\s+(?:stay|stays)\b/gi, ' ');

  const hasMorningSlot = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:morning|subah|सुबह)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(slotScan);
  const hasAfternoonSlot = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:afternoon|dopahar|दोपहर)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(slotScan);
  const hasEveningSlot = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:evening|shaam|sham|शाम)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(slotScan);
  const hasNightSlot = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:night|raat|रात)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(slotScan);
  const slotCount = [hasMorningSlot, hasAfternoonSlot, hasEveningSlot, hasNightSlot].filter(Boolean).length;

  let durationSlot: string | undefined;
  if (/(?:full\s*day|पूरा\s*दिन|पूरे\s*दिन|pura\s*din)/i.test(slotScan)) {
    durationSlot = 'Full Day';
  } else if (!(startTime && endTime && slotCount >= 2)) {
    if (hasMorningSlot) durationSlot = 'Morning';
    else if (hasAfternoonSlot) durationSlot = 'Afternoon';
    else if (hasEveningSlot) durationSlot = 'Evening';
    else if (hasNightSlot) durationSlot = 'Night';
  }

  return { startTime, endTime, ...(durationSlot ? { durationSlot } : {}) };
}

function syncEventTimingsFromPrompt(
  items: any[],
  rawPromptNotes: string,
  studioEventNames: string[],
  studioDefaultFunctions: any[]
): any[] {
  if (!Array.isArray(items) || items.length === 0) return items;

  const eventConcepts: Array<{ re: RegExp; canonical: string }> = [
    { re: /\b(?:haldi|pithi)\b|हल्दी|पीठी/i, canonical: 'haldi' },
    { re: /\b(?:sangeet)\b|संगीत/i, canonical: 'sangeet' },
    { re: /\b(?:mehendi|mehndi|mehandi)\b|मेहंदी|मेंहदी/i, canonical: 'mehendi' },
    { re: /\b(?:wedding|marriage|pheras|varmala|baraat)\b|शादी|लग्न|विवाह|फेरे/i, canonical: 'wedding' },
    { re: /\b(?:engagement|ring\s*ceremony|roka|sagai)\b|सगाई|रिंग\s*सेरेमनी|रोका/i, canonical: 'engagement' },
    { re: /\b(?:reception)\b|रिसेप्शन/i, canonical: 'reception' },
    { re: /\b(?:cocktail)\b|कॉकटेल/i, canonical: 'cocktail' },
    { re: /\b(?:pool\s*party)\b|पूल\s*पार्टी/i, canonical: 'pool_party' },
    { re: /\b(?:home\s*entry)\b|गृह\s*प्रवेश/i, canonical: 'home_entry' },
    { re: /\b(?:mayra)\b|मायरा/i, canonical: 'mayra' },
    { re: /\b(?:ganesh\s*puja|puja|pooja)\b|गणेश\s*पूजा/i, canonical: 'ganesh_puja' }
  ];

  const getConceptKeys = (name: string): string[] => {
    const keys = new Set<string>();
    const lower = String(name || '').toLowerCase();
    for (const part of lower.split(/\s*(?:\+|&|\band\b|\/)\s*/i)) {
      const p = part.trim();
      if (!p) continue;
      keys.add(p);
      const resolved = resolveStudioFunctionName(p, studioEventNames, studioDefaultFunctions).toLowerCase();
      if (resolved) keys.add(resolved);
      for (const ec of eventConcepts) {
        if (ec.re.test(p) || ec.re.test(resolved)) keys.add(ec.canonical);
      }
    }
    return Array.from(keys);
  };

  const clauses = String(rawPromptNotes || '')
    .split(/(?:\r?\n|[.;।|]|,|\s+(?:और|aur|and|&|फिर|then|after\s*that)\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauseTimings = clauses.map((cl) => ({
    text: cl,
    keys: new Set(
      eventConcepts.filter((ec) => ec.re.test(cl)).map((ec) => ec.canonical)
    ),
    lower: cl.toLowerCase(),
    timing: extractTimingFromSnippet(cl)
  }));

  return items.map((fn: any) => {
    let startTime = String(fn.startTime || '').trim();
    let endTime = String(fn.endTime || '').trim();
    let durationSlot = fn.durationSlot && fn.durationSlot !== 'None' ? String(fn.durationSlot).trim() : '';

    if (fn.time && (!startTime || !endTime)) {
      const parsedTime = extractTimingFromSnippet(String(fn.time));
      if (!startTime && parsedTime.startTime) startTime = parsedTime.startTime;
      if (!endTime && parsedTime.endTime) endTime = parsedTime.endTime;
      if (!durationSlot && parsedTime.durationSlot) durationSlot = parsedTime.durationSlot;
    }

    if (!startTime || !durationSlot) {
      const fnKeys = getConceptKeys(fn.name || '');
      const matchedClauses = clauseTimings.filter((ct) =>
        fnKeys.some((k) => ct.keys.has(k) || (k.length >= 4 && ct.lower.includes(k)))
      );
      for (const mc of matchedClauses) {
        if (!startTime && mc.timing.startTime) {
          startTime = mc.timing.startTime;
          if (!endTime && mc.timing.endTime) endTime = mc.timing.endTime;
        }
        if (!endTime && mc.timing.endTime && (!startTime || startTime === mc.timing.startTime)) {
          endTime = mc.timing.endTime;
        }
        if (!durationSlot && mc.timing.durationSlot) {
          durationSlot = mc.timing.durationSlot;
        }
      }

      if (items.length === 1 && !startTime && !durationSlot && rawPromptNotes) {
        const wholeTiming = extractTimingFromSnippet(rawPromptNotes);
        if (!startTime && wholeTiming.startTime) startTime = wholeTiming.startTime;
        if (!endTime && wholeTiming.endTime) endTime = wholeTiming.endTime;
        if (!durationSlot && wholeTiming.durationSlot) durationSlot = wholeTiming.durationSlot;
      }
    }

    return {
      ...fn,
      startTime,
      endTime,
      ...(durationSlot ? { durationSlot } : {})
    };
  });
}

function reconcileSpokenPricing(
  pricingPage: any,
  rawPromptNotes: string
): void {
  if (!pricingPage || !rawPromptNotes) return;
  const evalRes = evaluatePricingMethod(rawPromptNotes, 0);
  if (evalRes.basePrice <= 0) return;

  const curBase = Number(pricingPage.basePrice || 0);
  const curDisc = Number(pricingPage.discountAmount || 0);

  if (evalRes.discountAmount > 0 && evalRes.basePrice > evalRes.discountAmount) {
    const evalNet = evalRes.basePrice - evalRes.discountAmount;
    const curNet = curBase - curDisc;
    // Fix if AI confused net price for basePrice, forgot discount, or put final offer price into discountAmount
    if (
      curBase <= 0 ||
      curDisc <= 0 ||
      curDisc >= curBase ||
      (curBase === evalNet && curDisc === 0) ||
      Math.abs(curNet - evalNet) > 100
    ) {
      pricingPage.basePrice = evalRes.basePrice;
      pricingPage.discountAmount = evalRes.discountAmount;
      if (!pricingPage.note) {
        pricingPage.note = evalRes.note;
      }
    }
  } else if (curBase <= 0 && evalRes.basePrice > 0) {
    pricingPage.basePrice = evalRes.basePrice;
  }
}

/**
 * Intelligent Fallback Extraction Engine when LLM API keys are not present
 */
export function fallbackHeuristicExtractor(contextData: any) {
  const userNotes = (contextData.additional_user_notes || '').trim();

  // If user pasted valid JSON directly into AI prompt notes, parse and unwrap it
  const directParsed = sanitizeAndParseJson(userNotes);
  if (directParsed && typeof directParsed === 'object') {
    const root = directParsed.quotation || directParsed;
    if (root.cover || root.pages || root.functionsPage || root.functions_coverage || root.pricingPage || root.shootDetails) {
      return mapAiOutputToQuotationDocument(directParsed, {}, { ...contextData, _isDirectJson: true });
    }
  }

  const leadInfo = contextData.lead_info || {};
  const raw = contextData.raw_form_fields || {};
  const meta = contextData.meta_fields || {};
  const notes = `${userNotes}\n${contextData.notes_and_comments || ''}`;
  const fullText = `${notes} ${JSON.stringify(raw)} ${JSON.stringify(meta)}`.toLowerCase();

  // Gather Studio Owner Settings (Functions, Crew Roles, Deliverables, Pre-Wedding Settings)
  const studioSettings = contextData.studioSettings || {};
  const studioDefaultFunctions: any[] = Array.isArray(studioSettings.defaultFunctions) ? studioSettings.defaultFunctions : [];
  const rawStudioEvents: any[] = Array.isArray(contextData.studioEventTypes) ? contextData.studioEventTypes : [];
  const studioEventNames: string[] = Array.from(
    new Set(
      rawStudioEvents
        .filter((e: any) => typeof e === 'string' || String(e?.category || '').toLowerCase() !== 'ritual')
        .map((e: any) => (typeof e === 'string' ? e : e?.name || ''))
        .filter(Boolean)
    )
  );
  const allConfiguredEventNames: string[] = Array.from(
    new Set([
      ...studioEventNames,
      ...studioDefaultFunctions.map((f: any) => f?.name || '').filter(Boolean)
    ])
  );
  const studioCrewRoles: any[] = Array.isArray(contextData.studioCrewRoles) ? contextData.studioCrewRoles : [];

  // 1. Couple & Names (strictly prioritizes spoken/written user notes over CRM lead record & template placeholders)
  let cleanNameStr = extractSpokenCoupleName(userNotes, allConfiguredEventNames);

  // If no valid name was extracted from notes, fallback cleanly to Lead record from CRM
  if (!cleanNameStr || isInvalidCoupleName(cleanNameStr)) {
    const candidateLeadName =
      raw.couple_name ||
      raw.client_name ||
      raw.bride_and_groom ||
      raw.groom_and_bride ||
      leadInfo.name ||
      raw.name ||
      raw.full_name ||
      '';
    const leadClean = String(candidateLeadName || '').trim();
    if (leadClean && !isInvalidCoupleName(leadClean)) {
      cleanNameStr = leadClean;
    } else {
      cleanNameStr = '';
    }
  }

  let groomName = '';
  let brideName = '';
  let coupleName = '';

  const splitRegex = /\s*(?:&|weds|and|\+|तथा|और)\s*/i;
  const stripKeywords = (s: string) => {
    return s
      .replace(
        /\s+(?:\b(?:wedding|marriage|shaadi|quotation|quotion|qution|qoutation|proposal|haldi|sangeet|reception|mehendi|event|shoot|budget|price|rate|cost|date|on|all|deliverables?|days?|day)\b|\d).*$/i,
        ''
      )
      .trim();
  };

  if (cleanNameStr && splitRegex.test(cleanNameStr)) {
    const parts = cleanNameStr.split(splitRegex);
    groomName = stripKeywords((parts[0] || '').trim());
    brideName = stripKeywords((parts[1] || '').trim());
    groomName = groomName ? groomName.charAt(0).toUpperCase() + groomName.slice(1) : '';
    brideName = brideName ? brideName.charAt(0).toUpperCase() + brideName.slice(1) : '';
    coupleName = groomName && brideName ? `${groomName} & ${brideName}` : (groomName || brideName || 'Client');
  } else if (cleanNameStr && !isPlaceholderCoupleName(cleanNameStr)) {
    const singleClean = stripKeywords(cleanNameStr);
    groomName = singleClean ? singleClean.charAt(0).toUpperCase() + singleClean.slice(1) : 'Client';
    brideName = '';
    coupleName = groomName;
  } else {
    groomName = 'Client';
    brideName = '';
    coupleName = 'Client';
  }

  // 2. Pre-Wedding Intent & Main Event Type Detection (strictly scoped to user voice/text message when present)
  const userNegatedPreWed = detectPreWeddingNegation(userNotes);
  const formSignals = [raw.event_type, raw.services, raw.event, raw.functions].filter(Boolean).join(' ');
  const hasPreWed = !userNegatedPreWed && (
    userNotes
      ? detectPreWeddingIntent(userNotes)
      : (detectPreWeddingIntent(contextData.notes_and_comments || '') || detectPreWeddingIntent(formSignals))
  );

  // Strip Pre-Wedding words from a temporary scan copy so "Pre-Wedding" never falsely matches "Wedding"
  const preWedMaskedNotes = notes.replace(
    /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:pre[\s-]*wed(?:ding)?|prewedding|pre[\s-]*shoot|preshoot|previewing|प्री[\s-]*वेडिंग|प्रि[\s-]*वेडिंग|प्रीवेडिंग|प्रिवेडिंग|प्री[\s-]*शूट|प्रि[\s-]*शूट|प्री[\s-]*शुट|प्रीशूट)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi,
    ' __PREWED__ '
  );
  const preWedMaskedLower = preWedMaskedNotes.toLowerCase();

  const hasWed = /(?:wedding|marriage|shaadi|लग्न|विवाह|फेरे|वेडिंग|शादी)/i.test(preWedMaskedLower);
  const hasEng = /(?:engagement|roka|ring\s*ceremony|सगाई|साखरपुडा)/i.test(preWedMaskedLower);

  let eventType = 'Wedding';
  if (hasPreWed && hasWed) {
    eventType = 'Pre-Wedding & Wedding';
  } else if (hasPreWed && !hasWed) {
    eventType = 'Pre-Wedding';
  } else if (hasEng && !hasWed) {
    eventType = 'Engagement';
  } else if (preWedMaskedLower.includes('reception')) {
    eventType = 'Wedding & Reception';
  } else if (preWedMaskedLower.includes('maternity')) {
    eventType = 'Maternity Shoot';
  }

  // 3. Indian City & Location Resolution
  const INDIAN_CITY_MAP: Record<string, string> = {
    'मुंबई': 'Mumbai', 'mumbai': 'Mumbai', 'बॉम्बे': 'Mumbai', 'बम्बई': 'Mumbai',
    'पुणे': 'Pune', 'pune': 'Pune', 'पूना': 'Pune',
    'उदयपुर': 'Udaipur', 'udaipur': 'Udaipur',
    'गोवा': 'Goa', 'goa': 'Goa',
    'जयपुर': 'Jaipur', 'jaipur': 'Jaipur',
    'दिल्ली': 'Delhi', 'delhi': 'Delhi', 'नई दिल्ली': 'New Delhi', 'new delhi': 'New Delhi',
    'अहमदाबाद': 'Ahmedabad', 'ahmedabad': 'Ahmedabad',
    'सूरत': 'Surat', 'surat': 'Surat',
    'नागपुर': 'Nagpur', 'nagpur': 'Nagpur',
    'नाशिक': 'Nashik', 'nashik': 'Nashik',
    'कोल्हापुर': 'Kolhapur', 'kolhapur': 'Kolhapur',
    'इंदौर': 'Indore', 'indore': 'Indore',
    'भोपाल': 'Bhopal', 'bhopal': 'Bhopal',
    'लोनावला': 'Lonavala', 'lonavala': 'Lonavala',
    'महाबलेश्वर': 'Mahabaleshwar', 'mahabaleshwar': 'Mahabaleshwar',
    'अलीबाग': 'Alibaug', 'alibaug': 'Alibaug',
    'जोधपुर': 'Jodhpur', 'jodhpur': 'Jodhpur',
    'जैसलमेर': 'Jaisalmer', 'jaisalmer': 'Jaisalmer',
    'आगरा': 'Agra', 'agra': 'Agra',
    'वाराणसी': 'Varanasi', 'varanasi': 'Varanasi', 'बनारस': 'Varanasi',
    'ऋषिकेश': 'Rishikesh', 'rishikesh': 'Rishikesh',
    'जिम कॉर्बेट': 'Jim Corbett', 'jim corbett': 'Jim Corbett',
    'हैदराबाद': 'Hyderabad', 'hyderabad': 'Hyderabad',
    'बेंगलुरु': 'Bengaluru', 'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru',
    'कोलकाता': 'Kolkata', 'kolkata': 'Kolkata',
    'चंडीगढ़': 'Chandigarh', 'chandigarh': 'Chandigarh',
    'लखनऊ': 'Lucknow', 'lucknow': 'Lucknow'
  };

  const extractLocationFromSnippet = (snippet: string): string => {
    return extractSpokenLocationFromNotes(snippet);
  };

  const extractDateFromSnippet = (snippet: string, fallbackMonthYear?: { monthIdx: number; year: number } | null): string => {
    if (!snippet) return '';
    const dateM = snippet.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s*(\d{2,4}))?/i);
    if (dateM) {
      return formatQuotationDate(dateM[0]);
    }
    const monthFirstM = snippet.match(/(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,-]+(\d{2,4}))?/i);
    if (monthFirstM) {
      return formatQuotationDate(monthFirstM[0]);
    }
    const slashM = snippet.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (slashM) {
      return formatQuotationDate(slashM[0]);
    }
    if (fallbackMonthYear) {
      const bareDayM = snippet.match(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:तारीख|tarikh|date|को|ko)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i);
      if (bareDayM) {
        const dNum = parseInt(bareDayM[1], 10);
        if (dNum >= 1 && dNum <= 31) {
          return `${String(dNum).padStart(2, '0')} - ${QUOTATION_MONTH_ABBR[fallbackMonthYear.monthIdx]} - ${fallbackMonthYear.year}`;
        }
      }
    }
    return '';
  };

  const extractTimesFromSnippet = (snippet: string) => extractTimingFromSnippet(snippet);

  const extractCrewFromSnippet = (snippet: string): Array<{ name: string; qty: number }> => {
    return extractCrewRolesFromText(snippet, studioCrewRoles);
  };

  let location = extractLocationFromSnippet(userNotes) || raw.venue || raw.location || raw.city || raw.destination || '';

  // 4. Headline Dates
  let weddingDate = extractDateFromSnippet(userNotes);
  if (!weddingDate && (raw.event_date || raw.wedding_date || raw.date || raw.wedding_month || raw.month)) {
    weddingDate = formatQuotationDate(raw.event_date || raw.wedding_date || raw.date || raw.wedding_month || raw.month);
  }
  const isDateNotFixed = !weddingDate || weddingDate === 'Date Not Fixed' || fullText.includes('not fix') || fullText.includes('not fixed') || fullText.includes('tbd');
  if (isDateNotFixed && !weddingDate) {
    weddingDate = 'Date Not Fixed';
  }

  // 5. Intelligent Mathematical Pricing & Method Evaluation
  let budget: number | null = null;
  const rawBudget = raw.budget || raw.package_budget || raw.preferred_budget_range || raw.approximate_budget || raw.pricing || null;
  if (rawBudget) {
    budget = parseCurrencyAmount(String(rawBudget));
  }

  const evaluatedPricing = evaluatePricingMethod(notes, budget || 150000);
  let basePrice = evaluatedPricing.basePrice;
  let discountAmount = evaluatedPricing.discountAmount;
  let travelCharges = evaluatedPricing.travelCharges;
  let accommodationCharges = evaluatedPricing.accommodationCharges;
  let additionalCharges = evaluatedPricing.additionalCharges;
  let gstPct = evaluatedPricing.gstPct;
  let pricingNote = evaluatedPricing.note;
  let paymentSteps = evaluatedPricing.steps;

  // Global custom times fallback (used strictly when <= 1 event so multi-event timings NEVER leak!)
  const globalTimes = extractTimesFromSnippet(userNotes);
  const customStartTime = globalTimes.startTime;
  const customEndTime = globalTimes.endTime;
  const customDurationSlot = globalTimes.durationSlot || '';

  // Check studio shortcuts (scoped per ceremony vs global!) for crew, deliverables & pricing
  const studioShortcuts: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts)
    ? studioSettings.aiRules.shortcuts
    : [];

  const heuristicScopeAnalysis = analyzeScopedShortcutsAndCrewOverrides(
    userNotes,
    studioShortcuts,
    studioEventNames,
    studioDefaultFunctions,
    studioCrewRoles
  );

  let shortcutDeliverables: string[] = [];
  for (const sm of heuristicScopeAnalysis.shortcutMatches) {
    if (sm.mappedDeliverables.length > 0) {
      shortcutDeliverables.push(...sm.mappedDeliverables);
    }
    if (sm.mappedPrice && basePrice <= 0 && !budget) {
      basePrice = sm.mappedPrice;
    }
  }

  // 6. Functions & Multi-Ceremony Chronological Extraction (Relative Dates + Separate Cards + Studio Settings Names)
  const builtinEventMatchers: Array<{ concept: string; rawTitle: string; regex: RegExp }> = [
    { concept: 'haldi', rawTitle: 'Haldi', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:हल्दी|हळद|पीठी|pithi|haldi)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'sangeet', rawTitle: 'Sangeet', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:संगीत|sangeet(?:\s*night)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'wedding', rawTitle: 'Wedding', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:शादी|लग्न|विवाह|फेरे|वेडिंग|बारात|wedding(?:\s*ceremony)?|marriage|pheras|varmala)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'mehendi', rawTitle: 'Mehendi', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:मेहंदी|मेंहदी|meh[ae]?ndi)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'engagement', rawTitle: 'Ring Ceremony', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:सगाई|रिंग\s*सेरेमनी|साखरपुडा|रोका|एंगेजमेंट|engagement(?:\s*ceremony)?|ring\s*ceremony|roka|sagai)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'reception', rawTitle: 'Reception', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:रिसेप्शन|reception(?:\s*dinner)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'cocktail', rawTitle: 'Cocktail Party', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:कॉकटेल(?:\s*पार्टी)?|cocktail(?:\s*party)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'pool_party', rawTitle: 'Pool Party', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:पूल\s*पार्टी|pool\s*party)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'home_entry', rawTitle: 'Home Entry Shoot', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:गृह\s*प्रवेश|घर\s*का\s*शूट|घर\s*पे\s*एंट्री|home\s*entry(?:\s*shoot)?)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'mayra', rawTitle: 'Mayra', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:मायरा|भाता|mayra)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi },
    { concept: 'ganesh_puja', rawTitle: 'Ganesh Puja', regex: /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:गणेश\s*पूजा|ganesh\s*puja|puja|pooja)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/gi }
  ];

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const customEventMatchers: Array<{ concept: string; rawTitle: string; regex: RegExp }> = [];
  for (const sName of allConfiguredEventNames) {
    const lower = sName.toLowerCase();
    if (/pre[\s-]*wed|prewedding|pre[\s-]*shoot/.test(lower)) continue;
    const alreadyBuiltin = builtinEventMatchers.some(b => {
      b.regex.lastIndex = 0;
      return b.regex.test(sName);
    });
    if (!alreadyBuiltin && sName.trim().length >= 3) {
      customEventMatchers.push({
        concept: `custom_${lower}`,
        rawTitle: sName.trim(),
        regex: new RegExp(`(?:^|[^\\u0900-\\u097Fa-zA-Z0-9])${escapeRegExp(sName.trim())}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'gi')
      });
    }
  }
  customEventMatchers.sort((a, b) => b.rawTitle.length - a.rawTitle.length);
  const allEventMatchers = [...builtinEventMatchers, ...customEventMatchers];

  interface EventHit {
    concept: string;
    resolvedName: string;
    startIdx: number;
    endIdx: number;
  }

  const findEventsInText = (text: string): EventHit[] => {
    const hits: EventHit[] = [];
    for (const matcher of allEventMatchers) {
      matcher.regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = matcher.regex.exec(text)) !== null) {
        const prefixLen = m[0].length - m[0].trimStart().length;
        const startIdx = m.index + prefixLen;
        const endIdx = m.index + m[0].length;
        // Avoid overlapping matches
        if (!hits.some(h => Math.max(h.startIdx, startIdx) < Math.min(h.endIdx, endIdx))) {
          hits.push({
            concept: matcher.concept,
            resolvedName: resolveStudioFunctionName(matcher.rawTitle, studioEventNames, studioDefaultFunctions),
            startIdx,
            endIdx
          });
        }
      }
    }
    return hits.sort((a, b) => a.startIdx - b.startIdx);
  };

  // Explicit combine indicator vs explicit separate indicator
  const EXPLICIT_COMBINE_REGEX = /(?:एक\s*ही\s*दिन|ek\s*hi\s*din|ek\s*din\s*pe|एक\s*ही\s*तारीख|एक\s*ही\s*डेट|ek\s*hi\s*date|एक\s*साथ|ek\s*sath|साथ\s*में|saath\s*mein|एक\s*ही\s*फंक्शन|ek\s*hi\s*function|एक\s*ही\s*इवेंट|एक\s*कार्ड|single\s*card|single\s*function|combine(?:d)?|clubbed|merged|together)/i;
  const EXPLICIT_SPLIT_CARD_REGEX = /(?:अलग[\s-]*अलग(?:\s*(?:कार्ड|इवेंट|फंक्शन|events?|cards?))?|alag[\s-]*alag(?:\s*(?:card|cards|event|events))?|separate(?:\s*(?:card|cards|event|events))?|seperate(?:\s*(?:card|cards))?|split\s*cards?)/i;
  const BOTH_SEPARATE_MODIFIER_REGEX = /(?:दोनों\s*(?:में|मे|को|पे)|तीनों\s*(?:में|मे|को|पे)|चारों\s*(?:में|मे|को|पे)|सभी\s*(?:में|मे|को|पे)|हर\s*(?:फंक्शन|इवेंट)|both\s*(?:events?|functions?)?|all\s*(?:events?|functions?)|each\s*(?:event|function)?|every\s*(?:event|function)?|separate(?:ly)?|अलग[\s-]*अलग|alag[\s-]*alag)/i;
  const CONTINUATION_PRONOUN_REGEX = /(?:उसमें|इसमें|उसमे|इसमे|जिसमें|जिसमे|usme|isme|jisme|jismein|there|for\s*that)/i;
  const partHasExplicitSplitRequest = EXPLICIT_SPLIT_CARD_REGEX.test(userNotes);

  const explicitDateCountInNotes = (userNotes.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/gi) || []).length;

  // Split into sentence blocks by hard boundaries, then split conjunctions ONLY when events have distinct dates/times/crews/venues or explicit split request
  const hardSentences = preWedMaskedNotes
    .split(/(?:\r?\n|[.;।|])+/)
    .map(s => s.trim())
    .filter(Boolean);

  const sequentialClauses: Array<{ text: string; groupSharedDate?: string }> = [];
  for (const sent of hardSentences) {
    const sentHasExplicitSplit = EXPLICIT_SPLIT_CARD_REGEX.test(sent);
    const commaParts = sent.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
    for (const part of commaParts) {
      const partEvents = findEventsInText(part);
      const hasCombineWord = EXPLICIT_COMBINE_REGEX.test(part);
      const hasPlusJoin = partEvents.length >= 2 && /\+/.test(part.slice(partEvents[0].startIdx, partEvents[partEvents.length - 1].endIdx));
      const hasTimeWindowSplit =
        (/(?:सुबह|morning|subah)/i.test(part) && /(?:शाम|evening|night|raat|sham)/i.test(part)) ||
        (part.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi) || []).length >= 2;
      const hasExplicitSeparateHints = sentHasExplicitSplit || EXPLICIT_SPLIT_CARD_REGEX.test(part) || hasTimeWindowSplit;

      // Split on sequential connectors ("और", "aur", "&", "and", "तथा", "व", "फिर", "then", "after that") to inspect whether subParts differ by date, time, location, or crew
      const subParts = part
        .split(/\s+(?:और|aur|तथा|व|and|&|फिर|उसके\s*बाद|जिसके\s*बाद|then|after\s*that)\s+/i)
        .map(sp => sp.trim())
        .filter(Boolean);

      const datedSubIndices = subParts
        .map((sp, idx) => ({ idx, dt: extractDateFromSnippet(sp) }))
        .filter(x => x.dt && x.dt !== 'Date Not Fixed');
      const distinctDates = new Set(datedSubIndices.map((x) => x.dt));
      const hasAnyRelOffset = subParts.some(sp => detectRelativeDayOffset(sp) !== null);
      const distinctLocs = new Set(subParts.map(sp => extractLocationFromSnippet(sp)).filter(Boolean));
      const subPartsWithOwnCrew = subParts.filter(sp => {
        const spCrew = extractCrewFromSnippet(sp);
        const spTrig = studioShortcuts.some(sc => sc?.trigger && matchesShortcutTriggerText(sp, String(sc.trigger).toLowerCase()));
        const isJustContinuation = CONTINUATION_PRONOUN_REGEX.test(sp) && findEventsInText(sp).length === 0;
        return !isJustContinuation && (spCrew.length > 0 || spTrig);
      });

      const shouldCombinePartByDefault =
        partEvents.length >= 2 &&
        !hasExplicitSeparateHints &&
        !partHasExplicitSplitRequest &&
        !hasAnyRelOffset &&
        distinctDates.size <= 1 &&
        distinctLocs.size <= 1 &&
        subPartsWithOwnCrew.length <= 1 &&
        !BOTH_SEPARATE_MODIFIER_REGEX.test(part);

      // Keep same-day multi-ceremony comma phrases combined as ONE card ("10 तारीख को हल्दी और संगीत है" -> "Haldi + Sangeet", "15 Dec Haldi aur Mehendi hai" -> "Haldi + Mehendi")!
      if ((hasCombineWord || hasPlusJoin || shouldCombinePartByDefault) && partEvents.length >= 2 && !hasExplicitSeparateHints) {
        sequentialClauses.push({ text: part, _forceCombined: true } as any);
        continue;
      }

      // Check if all subParts in this single comma-group share ONE explicit date (e.g. when split explicitly for alag-alag cards)
      const hasNotFixedHint = /(?:not\s*fix|tbd|फिक्स\s*नहीं|तय\s*नहीं)/i.test(part);
      const groupSharedDate =
        subParts.length >= 2 &&
        datedSubIndices.length === 1 &&
        !hasAnyRelOffset &&
        !hasNotFixedHint &&
        !part.includes('__PREWED__') &&
        subParts.every(sp => findEventsInText(sp).length > 0)
          ? datedSubIndices[0].dt
          : undefined;

      // Special check: if "Wedding" and "Haldi एक ही दिन पे है" got split across "और"/"&", re-glue adjacent combined pair!
      for (let i = 0; i < subParts.length; i++) {
        const cur = subParts[i];
        const nxt = subParts[i + 1];
        if (
          nxt &&
          findEventsInText(cur).length >= 1 &&
          findEventsInText(nxt).length >= 1 &&
          !extractDateFromSnippet(cur) &&
          detectRelativeDayOffset(cur) === null &&
          extractCrewFromSnippet(cur).length === 0 &&
          EXPLICIT_COMBINE_REGEX.test(nxt) &&
          !BOTH_SEPARATE_MODIFIER_REGEX.test(nxt)
        ) {
          sequentialClauses.push({ text: `${cur} & ${nxt}`, groupSharedDate });
          i++; // skip nxt
        } else if (
          i === 0 &&
          nxt &&
          findEventsInText(cur).length === 0 &&
          extractCrewFromSnippet(cur).length > 0 &&
          !extractDateFromSnippet(cur) &&
          !BOTH_SEPARATE_MODIFIER_REGEX.test(cur) &&
          !CONTINUATION_PRONOUN_REGEX.test(cur) &&
          findEventsInText(nxt).length >= 1 &&
          extractCrewFromSnippet(nxt).length === 0
        ) {
          sequentialClauses.push({ text: `${cur} & ${nxt}`, groupSharedDate });
          i++; // skip nxt
        } else {
          sequentialClauses.push({ text: cur, groupSharedDate });
        }
      }
    }
  }

  const functions: any[] = [];
  let lastResolvedDate: string | null = null;
  let lastMonthYear: { monthIdx: number; year: number } | null = null;
  let pendingDateForNextEvent: string | null = null;
  let pendingLocationForNextEvent: string | null = null;
  let pendingTimingForNextEvent: { startTime: string; endTime: string; durationSlot?: string } | null = null;
  const totalEventClausesInNotes = sequentialClauses.filter(c => findEventsInText(c.text).length > 0).length;
  const allowGlobalTimeFallback = totalEventClausesInNotes <= 1;
  const globalModifierCrew: Array<{ name: string; qty: number }> = [];
  const globalModifierRoleSet = new Set<string>();
  const preWedClauses: string[] = [];
  let lastActiveTarget: 'prewed' | 'function' | 'global_crew' | null = null;

  for (const clauseItem of sequentialClauses) {
    const clause = clauseItem.text;
    const isPreWedClause = clause.includes('__PREWED__');
    const eventsInClause = findEventsInText(clause);

    if (isPreWedClause) {
      preWedClauses.push(clause.replace(/__PREWED__/g, 'Pre-Wedding'));
    }

    // Extract explicit or relative date from this clause
    const explicitDate = extractDateFromSnippet(clause, lastMonthYear);
    if (explicitDate) {
      const p = parseQuotationDateParts(explicitDate);
      if (p) lastMonthYear = { monthIdx: p.monthIdx, year: p.year };
    }
    const relOffset = detectRelativeDayOffset(clause);

    let clauseResolvedDate = '';
    if (explicitDate && explicitDate !== 'Date Not Fixed') {
      clauseResolvedDate = explicitDate;
    } else if (relOffset !== null) {
      const anchor = lastResolvedDate || (weddingDate && weddingDate !== 'Date Not Fixed' ? weddingDate : '');
      if (anchor) {
        clauseResolvedDate = addDaysToQuotationDate(anchor, relOffset);
        const p = parseQuotationDateParts(clauseResolvedDate);
        if (p) lastMonthYear = { monthIdx: p.monthIdx, year: p.year };
      }
    } else if (clauseItem.groupSharedDate && eventsInClause.length > 0) {
      clauseResolvedDate = clauseItem.groupSharedDate;
    }

    // If this clause ONLY talks about Pre-Wedding (no main ceremony matched), update chronological date anchor and continue!
    if (isPreWedClause && eventsInClause.length === 0) {
      if (clauseResolvedDate) lastResolvedDate = clauseResolvedDate;
      lastActiveTarget = 'prewed';
      continue;
    }

    const clauseCrew = extractCrewFromSnippet(clause);
    const clauseLoc = extractLocationFromSnippet(clause);
    const clauseTimes = extractTimesFromSnippet(clause);

    // Case A: Clause mentions NO main wedding event -> treat as modifier / continuation clause
    if (eventsInClause.length === 0) {
      const isGlobalMod = BOTH_SEPARATE_MODIFIER_REGEX.test(clause);
      const isContMod = CONTINUATION_PRONOUN_REGEX.test(clause);
      const looksLikeClosingTerms = /(?:बजट|budget|price|cost|discount|ऑफर|offer|advance|एडवांस|gst|album|एल्बम|photobook|फोटोबुक|long\s*video|all\s*deliverable|ऑल\s*डिलीवरेबल|सभी\s*डिलीवरेबल)/i.test(clause);

      // If previous clause was Pre-Wedding and this clause continues Pre-Wedding crew/reels/location without switching to pricing/albums/global modifier, keep it with Pre-Wedding!
      if (hasPreWed && lastActiveTarget === 'prewed' && !isGlobalMod && !looksLikeClosingTerms) {
        preWedClauses.push(clause.replace(/__PREWED__/g, 'Pre-Wedding'));
        if (clauseResolvedDate) lastResolvedDate = clauseResolvedDate;
        continue;
      }
      if (looksLikeClosingTerms) {
        lastActiveTarget = null;
      }

      if (clauseCrew.length > 0) {
        if (isGlobalMod || (lastActiveTarget === 'global_crew' && !isContMod && !clauseLoc && !clauseResolvedDate && relOffset === null) || (functions.length > 1 && !isContMod && !clauseLoc && !clauseResolvedDate && relOffset === null && /\b(?:दोनों|तीनों|चारों|सभी|both|all|each|every)\b/i.test(clause))) {
          lastActiveTarget = 'global_crew';
          for (const cr of clauseCrew) {
            if (!globalModifierRoleSet.has(cr.name.toLowerCase())) {
              globalModifierRoleSet.add(cr.name.toLowerCase());
              globalModifierCrew.push(cr);
            }
          }
        } else if (functions.length > 0) {
          // Attach to the immediately preceding card ("Wedding 10 Nov को है, उसमें 2 Candid Photographer")
          lastActiveTarget = 'function';
          const prevCard = functions[functions.length - 1];
          const existingReqs: Array<{ name: string; qty: number }> = prevCard._explicitCrew || [];
          for (const cr of clauseCrew) {
            if (!existingReqs.some(r => r.name.toLowerCase() === cr.name.toLowerCase())) {
              existingReqs.push(cr);
            }
          }
          prevCard._explicitCrew = existingReqs;
          prevCard.requirements = [...existingReqs];
        } else {
          lastActiveTarget = 'global_crew';
          for (const cr of clauseCrew) {
            if (!globalModifierRoleSet.has(cr.name.toLowerCase())) {
              globalModifierRoleSet.add(cr.name.toLowerCase());
              globalModifierCrew.push(cr);
            }
          }
        }
      }

      if (clauseLoc) {
        if (functions.length > 0 && !functions[functions.length - 1].location) {
          functions[functions.length - 1].location = clauseLoc;
        } else {
          pendingLocationForNextEvent = clauseLoc;
        }
      }

      if (clauseTimes.startTime || clauseTimes.endTime || clauseTimes.durationSlot) {
        if (functions.length > 0 && !functions[functions.length - 1].startTime && !functions[functions.length - 1].durationSlot && !clauseResolvedDate && !pendingDateForNextEvent) {
          if (clauseTimes.startTime) functions[functions.length - 1].startTime = clauseTimes.startTime;
          if (clauseTimes.endTime) functions[functions.length - 1].endTime = clauseTimes.endTime;
          if (clauseTimes.durationSlot) functions[functions.length - 1].durationSlot = clauseTimes.durationSlot;
        } else {
          pendingTimingForNextEvent = clauseTimes;
        }
      }

      if (clauseResolvedDate) {
        if (functions.length > 0 && functions[functions.length - 1].dateNotFixed && !isGlobalMod && relOffset === null) {
          functions[functions.length - 1].date = clauseResolvedDate;
          functions[functions.length - 1].dateNotFixed = false;
          lastResolvedDate = clauseResolvedDate;
        } else {
          pendingDateForNextEvent = clauseResolvedDate;
          lastResolvedDate = clauseResolvedDate;
        }
      }
      continue;
    }

    // Case B: Events found in this clause!
    lastActiveTarget = 'function';
    if (clauseResolvedDate) {
      lastResolvedDate = clauseResolvedDate;
    }

    const effectiveCardDate =
      clauseResolvedDate ||
      pendingDateForNextEvent ||
      (explicitDateCountInNotes === 1 && weddingDate && weddingDate !== 'Date Not Fixed' && lastResolvedDate === null ? weddingDate : 'Date Not Fixed');

    if (effectiveCardDate && effectiveCardDate !== 'Date Not Fixed') {
      lastResolvedDate = effectiveCardDate;
    }
    pendingDateForNextEvent = null;

    const effectiveCardLoc = clauseLoc || pendingLocationForNextEvent || location || '';
    pendingLocationForNextEvent = null;

    const cardStartTime = clauseTimes.startTime || pendingTimingForNextEvent?.startTime || (allowGlobalTimeFallback ? customStartTime : '');
    const cardEndTime = clauseTimes.endTime || pendingTimingForNextEvent?.endTime || (allowGlobalTimeFallback ? customEndTime : '');
    const cardDurationSlot = clauseTimes.durationSlot || pendingTimingForNextEvent?.durationSlot || (allowGlobalTimeFallback ? customDurationSlot : '');
    pendingTimingForNextEvent = null;

    const spanStart = eventsInClause[0].startIdx;
    const spanEnd = eventsInClause[eventsInClause.length - 1].endIdx;
    const betweenEventsText = clause.slice(spanStart, spanEnd);
    const isExplicitlyCombinedCard =
      eventsInClause.length >= 2 &&
      !BOTH_SEPARATE_MODIFIER_REGEX.test(clause) &&
      !EXPLICIT_SPLIT_CARD_REGEX.test(clause) &&
      (Boolean((clauseItem as any)._forceCombined) || EXPLICIT_COMBINE_REGEX.test(clause) || /\+/.test(betweenEventsText));

    if (isExplicitlyCombinedCard) {
      const uniqueNames = Array.from(new Set(eventsInClause.map(e => e.resolvedName)));
      const combinedTitle = uniqueNames.join(' + ');
      if (!functions.some(f => f.name.toLowerCase() === combinedTitle.toLowerCase())) {
        functions.push({
          id: `func-ai-${functions.length + 1}`,
          name: combinedTitle,
          date: effectiveCardDate || 'Date Not Fixed',
          dateNotFixed: !effectiveCardDate || effectiveCardDate === 'Date Not Fixed',
          startTime: cardStartTime,
          endTime: cardEndTime,
          ...(cardDurationSlot ? { durationSlot: cardDurationSlot } : {}),
          location: effectiveCardLoc,
          _explicitCrew: clauseCrew.length > 0 ? [...clauseCrew] : undefined,
          requirements: clauseCrew.length > 0 ? [...clauseCrew] : [],
          notes: ''
        });
      }
    } else {
      // ALWAYS create SEPARATE function cards for each ceremony!
      for (const hit of eventsInClause) {
        const resolvedDate = effectiveCardDate || 'Date Not Fixed';
        const resolvedIsNotFixed = !resolvedDate || resolvedDate === 'Date Not Fixed';
        const existingDatedMatch = functions.find(
          f => f.name.toLowerCase() === hit.resolvedName.toLowerCase() && !f.dateNotFixed
        );
        const existingUndatedMatch = functions.find(
          f => f.name.toLowerCase() === hit.resolvedName.toLowerCase() && f.dateNotFixed
        );
        const alreadySameNameAndDate = functions.some(
          f => f.name.toLowerCase() === hit.resolvedName.toLowerCase() && f.date === resolvedDate
        );

        if (resolvedIsNotFixed && existingDatedMatch) {
          if (clauseCrew.length > 0) {
            const baseReqs = Array.isArray(existingDatedMatch._explicitCrew) ? existingDatedMatch._explicitCrew : [];
            for (const cr of clauseCrew) {
              if (!baseReqs.some((r: any) => r.name.toLowerCase() === cr.name.toLowerCase())) baseReqs.push(cr);
            }
            existingDatedMatch._explicitCrew = baseReqs;
            existingDatedMatch.requirements = [...baseReqs];
          }
          if (!existingDatedMatch.location && effectiveCardLoc) existingDatedMatch.location = effectiveCardLoc;
          if (!existingDatedMatch.startTime && cardStartTime) existingDatedMatch.startTime = cardStartTime;
          if (!existingDatedMatch.endTime && cardEndTime) existingDatedMatch.endTime = cardEndTime;
          if (!existingDatedMatch.durationSlot && cardDurationSlot) existingDatedMatch.durationSlot = cardDurationSlot;
        } else if (!resolvedIsNotFixed && existingUndatedMatch && !alreadySameNameAndDate) {
          existingUndatedMatch.date = resolvedDate;
          existingUndatedMatch.dateNotFixed = false;
          if (clauseCrew.length > 0) {
            const baseReqs = Array.isArray(existingUndatedMatch._explicitCrew) ? existingUndatedMatch._explicitCrew : [];
            for (const cr of clauseCrew) {
              if (!baseReqs.some((r: any) => r.name.toLowerCase() === cr.name.toLowerCase())) baseReqs.push(cr);
            }
            existingUndatedMatch._explicitCrew = baseReqs;
            existingUndatedMatch.requirements = [...baseReqs];
          }
          if (!existingUndatedMatch.location && effectiveCardLoc) existingUndatedMatch.location = effectiveCardLoc;
          if (!existingUndatedMatch.startTime && cardStartTime) existingUndatedMatch.startTime = cardStartTime;
          if (!existingUndatedMatch.endTime && cardEndTime) existingUndatedMatch.endTime = cardEndTime;
          if (!existingUndatedMatch.durationSlot && cardDurationSlot) existingUndatedMatch.durationSlot = cardDurationSlot;
        } else if (!alreadySameNameAndDate) {
          functions.push({
            id: `func-ai-${functions.length + 1}`,
            name: hit.resolvedName,
            date: resolvedDate,
            dateNotFixed: resolvedIsNotFixed,
            startTime: cardStartTime,
            endTime: cardEndTime,
            ...(cardDurationSlot ? { durationSlot: cardDurationSlot } : {}),
            location: effectiveCardLoc,
            _explicitCrew: clauseCrew.length > 0 ? [...clauseCrew] : undefined,
            requirements: clauseCrew.length > 0 ? [...clauseCrew] : [],
            notes: ''
          });
        }
      }
    }
  }

  // Fallback default function if zero main ceremonies detected
  if (functions.length === 0) {
    const fallbackEventName = resolveStudioFunctionName('Wedding', studioEventNames, studioDefaultFunctions);
    functions.push({
      id: 'func-ai-def',
      name: fallbackEventName,
      date: weddingDate || 'Date Not Fixed',
      dateNotFixed: isDateNotFixed,
      startTime: customStartTime,
      endTime: customEndTime,
      ...(customDurationSlot ? { durationSlot: customDurationSlot } : {}),
      location: location || '',
      requirements: [],
      notes: ''
    });
  }

  // Apply global modifier crew ("दोनों में 1 Traditional Photographer"), scoped shortcut crew, studio defaultFunctions crew, or clean defaults
  const getHeuristicFnKeys = (fnName: string): string[] => {
    const resolvedFull = resolveStudioFunctionName(fnName || '', studioEventNames, studioDefaultFunctions).toLowerCase();
    const parts = String(fnName || '')
      .split(/\s*(?:\+|&|\band\b|\/)\s*/i)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => resolveStudioFunctionName(p, studioEventNames, studioDefaultFunctions).toLowerCase());
    return Array.from(new Set([resolvedFull, ...parts].filter(Boolean)));
  };

  for (const fn of functions) {
    let finalReqs: Array<{ name: string; qty: number }> = Array.isArray(fn._explicitCrew) ? [...fn._explicitCrew] : [];
    delete fn._explicitCrew;

    const fnKeys = getHeuristicFnKeys(fn.name || '');
    const matchingOvs = fnKeys
      .map((k) => heuristicScopeAnalysis.eventOverrides.get(k))
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
    const hasAnyRestrictive = matchingOvs.some((o) => o.hasRestrictiveOverride);
    const hasAnyExplicit = matchingOvs.some((o) => o.hasExplicitCrew);
    const hasAnyDirectShortcut = matchingOvs.some((o) => o.triggeredShortcuts.size > 0);
    const fnKey = fnKeys[0];

    if (globalModifierCrew.length > 0 && !hasAnyRestrictive) {
      for (const gCrew of globalModifierCrew) {
        if (!finalReqs.some(r => r.name.toLowerCase() === gCrew.name.toLowerCase())) {
          finalReqs.push({ ...gCrew });
        }
      }
    }

    // Apply matching scoped or non-overridden global shortcuts
    for (const sm of heuristicScopeAnalysis.shortcutMatches) {
      if (sm.mappedCrew.length === 0) continue;
      const trigKey = sm.trigger.toLowerCase().trim();
      const triggeredHere = matchingOvs.some((o) => o.triggeredShortcuts.has(trigKey));
      if (sm.scopedEvents !== null) {
        if (fnKeys.some((k) => sm.scopedEvents!.has(k))) {
          finalReqs = mergeCrewList(finalReqs, sm.mappedCrew, studioCrewRoles);
        }
      } else if (triggeredHere || (!hasAnyExplicit && !hasAnyRestrictive && !hasAnyDirectShortcut)) {
        if (finalReqs.length === 0 || triggeredHere) {
          finalReqs = mergeCrewList(finalReqs, sm.mappedCrew, studioCrewRoles);
        }
      }
    }

    if (finalReqs.length === 0 && !hasAnyExplicit && !hasAnyRestrictive && studioDefaultFunctions.length > 0) {
      const cleanEventBase = (s: string) => s.toLowerCase().replace(/\b(?:ceremony|night|party|function|shoot|event|day)\b/gi, '').replace(/\s+/g, ' ').trim();
      const fnLower = fn.name.toLowerCase().trim();
      const fnBase = cleanEventBase(fn.name);
      const matchedDef = studioDefaultFunctions.find(df => {
        if (!df?.name) return false;
        const dfLower = df.name.toLowerCase().trim();
        if (dfLower === fnLower) return true;
        if (!dfLower.includes('&') && !dfLower.includes('+')) {
          return cleanEventBase(df.name) === fnBase;
        }
        return false;
      });
      if (matchedDef) {
        if (Array.isArray(matchedDef.requirements) && matchedDef.requirements.length > 0) {
          finalReqs = matchedDef.requirements.map((r: any) => ({
            name: resolveStudioCrewRole(typeof r === 'string' ? r : r?.name || '', studioCrewRoles),
            qty: Number(r?.qty || 1)
          }));
        }
        if (!fn.startTime && matchedDef.startTime) fn.startTime = matchedDef.startTime;
        if (!fn.endTime && matchedDef.endTime) fn.endTime = matchedDef.endTime;
        if (!fn.notes && matchedDef.notes) fn.notes = sanitizeEventFunctionNotes(matchedDef.notes, studioShortcuts);
      }
    }

    if (finalReqs.length === 0) {
      finalReqs = [
        { name: resolveStudioCrewRole('Candid Photographer', studioCrewRoles), qty: 1 },
        { name: resolveStudioCrewRole('Cinematographer', studioCrewRoles), qty: 1 }
      ];
    }

    fn.notes = sanitizeEventFunctionNotes(fn.notes, studioShortcuts);
    fn.requirements = finalReqs;
  }

  // Update primary location from Wedding ceremony if present
  const weddingFunc = functions.find(f => f.name.toLowerCase().includes('wedding') && f.location);
  if (weddingFunc && weddingFunc.location) {
    location = weddingFunc.location;
  }

  // Extract Pre-Wedding shoot details dynamically when requested
  let shootDetailsObj: any = {
    visible: false,
    daysText: '',
    crewText: '',
    deliverablesText: '',
    showExclusionsNote: true
  };

  if (hasPreWed) {
    const pwText = preWedClauses.join(' ') || userNotes;
    const daysMatch = pwText.match(/(\d+|एक|दो|तीन|चार|पांच|one|two|three|four|five)\s*(?:days?|दिन|डेज?)/i);
    const pwDaysNum = daysMatch ? parseSmallCountWord(daysMatch[1]) : 1;
    const pwDaysText = pwDaysNum === 1 ? '1 Day Shoot' : `${pwDaysNum} Days Shoot`;

    const pwCrewExtracted = extractCrewFromSnippet(pwText);
    const studioPwReqs: string[] = Array.isArray(studioSettings?.requirements) ? studioSettings.requirements : [];
    const pwCrewText = pwCrewExtracted.length > 0
      ? pwCrewExtracted.map(c => `${c.qty}x ${c.name}`).join('\n')
      : (studioPwReqs.length > 0 ? studioPwReqs.slice(0, 3).join('\n') : '1x Candid Photographer\n1x Cinematographer\n1x Drone Pilot');

    const studioPwDelivs: string[] = Array.isArray(studioSettings?.preWeddingDeliverables) ? studioSettings.preWeddingDeliverables : [];
    const pwDelivMatches: string[] = [];
    const pwLower = pwText.toLowerCase();
    const reelM = pwText.match(/(\d+|एक|दो|तीन|चार|पांच)\s*(?:instagram\s*)?(?:reels?|रील्स?)/i);
    if (reelM) {
      const cnt = parseSmallCountWord(reelM[1]);
      pwDelivMatches.push(`${cnt} Instagram ${cnt === 1 ? 'Reel' : 'Reels'}`);
    } else if (/reel|रील/i.test(pwLower)) {
      pwDelivMatches.push('1 Teaser Video Reel');
    }
    if (/teaser|टीज़र|टीजर/i.test(pwLower)) pwDelivMatches.push('Pre-Wedding Teaser Video');
    if (/save\s*the\s*date/i.test(pwLower)) pwDelivMatches.push('3 Save The Dates Photos');
    if (/countdown/i.test(pwLower)) pwDelivMatches.push('1 Countdown Reel');
    if (/edited|photo|फ़ोटो|फोटो|images/i.test(pwLower)) pwDelivMatches.push('Approx. 50 High Resolution Edited Images');
    if (/raw|रॉ/i.test(pwLower)) pwDelivMatches.push('Full Ultra HD Super-Fine Raw Photos');
    if (/highlight|film/i.test(pwLower)) pwDelivMatches.push('Pre-Wedding Highlight Film');

    const finalPwDelivs = pwDelivMatches.length > 0
      ? Array.from(new Set(pwDelivMatches)).join('\n')
      : (studioPwDelivs.length > 0
          ? studioPwDelivs.slice(0, 3).join('\n')
          : 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n1 Teaser Video Reel');

    const pwLocation = preWedClauses.length > 0 ? extractLocationFromSnippet(pwText) : '';
    const pwDate = preWedClauses.length > 0 ? extractDateFromSnippet(pwText) : '';

    shootDetailsObj = {
      visible: true,
      daysText: pwDaysText,
      crewText: pwCrewText,
      deliverablesText: finalPwDelivs,
      ...(pwLocation ? { location: pwLocation } : {}),
      ...(pwDate && pwDate !== 'Date Not Fixed' ? { date: pwDate } : {}),
      showExclusionsNote: true
    };
  }

  // 7. Studio Settings Deliverables, Bilingual Spoken Deliverables & Shorthands Sync
  const studioDeliverables: string[] = Array.isArray(studioSettings?.deliverables)
    ? studioSettings.deliverables
        .map((d: any) => typeof d === 'string' ? d : d?.title)
        .filter(Boolean)
    : [];

  let deliverables: string[] = [];

  // Check if "all deliverables" or "all droppers" trigger was spoken or requested — UNLESS a custom "all deliverables" shortcut is configured!
  const hasCustomAllDelivHeuristic = hasCustomAllDeliverablesShortcut(heuristicScopeAnalysis.shortcutMatches);
  const hasAllDeliverablesRequested = ALL_DELIVERABLES_TRIGGER_RE.test(fullText) && !hasCustomAllDelivHeuristic;
  const spokenDeliverables = extractDeliverablesFromText(notes, studioDeliverables);

  if (hasAllDeliverablesRequested) {
    const fullCatalog = studioDeliverables.length > 0 ? studioDeliverables : DEFAULT_EXTRACTED_DELIVERABLES;
    deliverables = mergeDeliverablesSmart([...fullCatalog], spokenDeliverables, true)
      .filter((item) => isValidDeliverableItem(item, fullCatalog));
  } else if (hasCustomAllDelivHeuristic) {
    deliverables = mergeDeliverablesSmart(shortcutDeliverables, spokenDeliverables, true)
      .filter((item) => isValidDeliverableItem(item, studioDeliverables));
  } else if (shortcutDeliverables.length > 0 || spokenDeliverables.length > 0) {
    deliverables = mergeDeliverablesSmart(shortcutDeliverables, spokenDeliverables, true)
      .filter((item) => isValidDeliverableItem(item, studioDeliverables));
  }

  const studioSpecialAddons: string[] = Array.isArray(studioSettings?.specialAddons)
    ? studioSettings.specialAddons
        .map((a: any) => (typeof a === 'string' ? a : a?.title))
        .filter(Boolean)
    : [];
  const shortcutSpecialAddons: string[] = [];
  for (const sm of heuristicScopeAnalysis.shortcutMatches) {
    if (sm.mappedSpecialAddons && sm.mappedSpecialAddons.length > 0) {
      shortcutSpecialAddons.push(...sm.mappedSpecialAddons);
    }
  }
  const effectiveSpecialNotes = userNotes || notes;
  const spokenSpecialAddons = extractSpecialValueAdditionsFromText(effectiveSpecialNotes, studioSpecialAddons);
  const hasSpecialValueAddons =
    detectSpecialValueIntent(effectiveSpecialNotes) ||
    shortcutSpecialAddons.length > 0 ||
    spokenSpecialAddons.length > 0;
  const resolvedSpecialAddons = hasSpecialValueAddons
    ? Array.from(new Set([...shortcutSpecialAddons, ...spokenSpecialAddons])).filter(Boolean)
    : [];

  const sanitizedFallbackCouple = cleanNameStr
    ? sanitizeExtractedCoupleName(coupleName, contextData?.lead_info?.name || '')
    : (contextData?.lead_info?.name && !isInvalidCoupleName(contextData.lead_info.name)
        ? sanitizeExtractedCoupleName(contextData.lead_info.name, '')
        : 'Client');

  const heuristicDoc = {
    cover: {
      coupleName: sanitizedFallbackCouple,
      groomName: sanitizedFallbackCouple.includes('&') ? sanitizedFallbackCouple.split('&')[0].trim() : sanitizedFallbackCouple,
      brideName: sanitizedFallbackCouple.includes('&') ? (sanitizedFallbackCouple.split('&')[1] || '').trim() : '',
      eventType,
      locationName: location
    },
    shootDetails: shootDetailsObj,
    functionsPage: {
      items: functions
    },
    deliverablesPage: {
      selectedItems: deliverables
    },
    specialValueAdditions: {
      visible: hasSpecialValueAddons,
      selectedItems: resolvedSpecialAddons,
      note: ''
    },
    pricingPage: {
      basePrice,
      discountAmount,
      gstPct,
      travelCharges,
      accommodationCharges,
      additionalCharges,
      showExclusionsNote: true,
      note: pricingNote || (discountAmount > 0 ? `Special discount of ₹${discountAmount.toLocaleString('en-IN')}` : '')
    },
    paymentTermsPage: {
      steps: paymentSteps
    },
    missingInformation: location ? [] : ['Wedding venue / location'],
    conflicts: []
  };

  applyAiTrainingAndVoiceDirectives(heuristicDoc, contextData);
  return heuristicDoc;
}

/**
 * Maps raw AI extraction result into the exact StudioCore Quotation JSON document structure.
 */
export function mapAiOutputToQuotationDocument(aiData: any, baseSchema: any, contextData: any) {
  let rootObj = aiData?.document || aiData?.quotation || aiData;

  const studioSettings = contextData?.studioSettings || {};
  const studioDefaultFunctions: any[] = Array.isArray(studioSettings?.defaultFunctions) ? studioSettings.defaultFunctions : [];
  const rawStudioEvents: any[] = Array.isArray(contextData?.studioEventTypes) ? contextData.studioEventTypes : [];
  const studioEventNames: string[] = Array.from(
    new Set(
      rawStudioEvents
        .filter((e: any) => typeof e === 'string' || String(e?.category || '').toLowerCase() !== 'ritual')
        .map((e: any) => (typeof e === 'string' ? e : e?.name || ''))
        .filter(Boolean)
    )
  );
  const studioCrewRoles: any[] = Array.isArray(contextData?.studioCrewRoles) ? contextData.studioCrewRoles : [];

  // Canonical top-level field normalizer
  if (rootObj && typeof rootObj === 'object') {
    if (!rootObj.cover) rootObj.cover = {};
    if (rootObj.coupleName && !rootObj.cover.coupleName) rootObj.cover.coupleName = rootObj.coupleName;
    if (rootObj.groomName && !rootObj.cover.groomName) rootObj.cover.groomName = rootObj.groomName;
    if (rootObj.brideName && !rootObj.cover.brideName) rootObj.cover.brideName = rootObj.brideName;
    if (rootObj.eventType && !rootObj.cover.eventType) rootObj.cover.eventType = rootObj.eventType;
    if ((rootObj.location || rootObj.venue || rootObj.city) && !rootObj.cover.locationName) {
      rootObj.cover.locationName = rootObj.location || rootObj.venue || rootObj.city;
    }
    if ((rootObj.weddingDate || rootObj.event_date) && !rootObj.cover.weddingDate) {
      rootObj.cover.weddingDate = rootObj.weddingDate || rootObj.event_date;
    }
    if (!rootObj.functionsPage) {
      if (Array.isArray(rootObj.functions) || Array.isArray(rootObj.events)) {
        rootObj.functionsPage = { items: rootObj.functions || rootObj.events };
      }
    } else if (!rootObj.functionsPage.items && (Array.isArray(rootObj.functions) || Array.isArray(rootObj.events))) {
      rootObj.functionsPage.items = rootObj.functions || rootObj.events;
    }
    if (!rootObj.deliverablesPage) {
      if (Array.isArray(rootObj.deliverables)) {
        rootObj.deliverablesPage = { selectedItems: rootObj.deliverables };
      }
    } else if (!rootObj.deliverablesPage.selectedItems && Array.isArray(rootObj.deliverables)) {
      rootObj.deliverablesPage.selectedItems = rootObj.deliverables;
    }
    if (!rootObj.pricingPage) {
      if (rootObj.pricing || rootObj.budget || rootObj.basePrice) {
        rootObj.pricingPage = typeof rootObj.pricing === 'object' ? rootObj.pricing : { basePrice: rootObj.basePrice || rootObj.budget || 150000 };
      }
    }
  }

  const rawPromptNotes = (contextData?.additional_user_notes || contextData?.additionalNotes || '').trim();
  const allUserNotesRaw = [
    contextData?.additional_user_notes,
    contextData?.additionalNotes,
    contextData?.leadNotes,
    contextData?.notes,
    contextData?.notes_and_comments,
    aiData?.notes
  ].filter(Boolean).join(' ');
  const allUserNotes = allUserNotesRaw.toLowerCase();

  const isDirectJson = Boolean(contextData?._isDirectJson || sanitizeAndParseJson(rawPromptNotes));
  const formSignals = [
    contextData?.raw_form_fields?.event_type,
    contextData?.raw_form_fields?.services,
    contextData?.raw_form_fields?.event,
    contextData?.raw_form_fields?.functions
  ].filter(Boolean).join(' ');
  const userNegatedPreWed = detectPreWeddingNegation(rawPromptNotes || allUserNotesRaw);
  const promptPreWedRequested = isDirectJson
    ? Boolean(rootObj?.shootDetails?.visible)
    : (!userNegatedPreWed && (
        rawPromptNotes
          ? detectPreWeddingIntent(rawPromptNotes)
          : (detectPreWeddingIntent(contextData?.notes_and_comments || allUserNotesRaw) || detectPreWeddingIntent(formSignals))
      ));

  const hasExplicitPaymentReceived = /\b(advance received|advance paid|already paid|already received|payment received|token received|token paid|amount received|amount paid)\b/i.test(allUserNotes);

  // Check if rootObj is ALREADY a structured StudioCore Quotation JSON document
  if (rootObj.cover || rootObj.functionsPage || rootObj.pricingPage || rootObj.pages) {
    const studioDelivs1: string[] = Array.isArray(studioSettings?.deliverables)
      ? studioSettings.deliverables.map((d: any) => (typeof d === 'string' ? d : d?.title)).filter(Boolean)
      : [];
    const studioSpecialAddons1: string[] = Array.isArray(studioSettings?.specialAddons)
      ? studioSettings.specialAddons.map((a: any) => (typeof a === 'string' ? a : a?.title)).filter(Boolean)
      : [];
    const studioShortcuts1: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts)
      ? studioSettings.aiRules.shortcuts
      : [];
    const allNotesText1 = [
      contextData?.additional_user_notes,
      contextData?.notes_and_comments,
      contextData?.additionalNotes
    ].filter(Boolean).join(' ').toLowerCase();
    const rawPromptOrAll1 = rawPromptNotes || allUserNotesRaw;
    const rawFormStr1 = JSON.stringify(contextData?.raw_form_fields || '');
    const branch1Shortcuts = analyzeScopedShortcutsAndCrewOverrides(
      rawPromptOrAll1,
      studioShortcuts1,
      studioEventNames,
      studioDefaultFunctions,
      studioCrewRoles,
      rawFormStr1
    );
    const shortcutDelivs1 = branch1Shortcuts.shortcutMatches.flatMap((sm) => sm.mappedDeliverables || []);
    const shortcutSpecial1 = branch1Shortcuts.shortcutMatches.flatMap((sm) => sm.mappedSpecialAddons || []);
    const spokenDelivs1 = !isDirectJson ? extractDeliverablesFromText(rawPromptOrAll1, studioDelivs1) : [];
    const hasCustomAllDeliv1 = hasCustomAllDeliverablesShortcut(branch1Shortcuts.shortcutMatches);
    const hasAllDelivReq1 = ALL_DELIVERABLES_TRIGGER_RE.test(allNotesText1) && !hasCustomAllDeliv1;

    // Capture valid explicit deliverables BEFORE normalizeQuotationData fills baseSchema template defaults
    const rawRootDelivs: string[] = Array.isArray(rootObj.deliverablesPage?.selectedItems)
      ? rootObj.deliverablesPage.selectedItems
          .map((item: any) => String(item || '').trim())
          .filter((s: string) => {
            if (!s) return false;
            const low = s.toLowerCase();
            if (low.includes('pre-wedding') || low.includes('prewedding') || low.includes('pre wedding') || low.includes('previewing')) {
              return false;
            }
            return isDirectJson || isValidDeliverableItem(s, studioDelivs1);
          })
      : [];

    const spokenSpecial1 = !isDirectJson
      ? extractSpecialValueAdditionsFromText(rawPromptOrAll1, studioSpecialAddons1)
      : [];
    const hasSpecialSignal1 = isDirectJson
      ? Boolean(
          rootObj?.specialValueAdditions?.visible ??
          (Array.isArray(rootObj?.specialValueAdditions?.selectedItems) && rootObj.specialValueAdditions.selectedItems.length > 0)
        )
      : (detectSpecialValueIntent(rawPromptOrAll1) || shortcutSpecial1.length > 0 || spokenSpecial1.length > 0);

    // Enforce Pre-Wedding & Special Value Additions strict visibility on rootObj BEFORE normalizeQuotationData
    if (!isDirectJson) {
      if (!promptPreWedRequested) {
        rootObj.shootDetails = {
          ...(rootObj.shootDetails || {}),
          visible: false,
          daysText: '',
          crewText: '',
          deliverablesText: ''
        };
      } else {
        const sObj = rootObj.shootDetails || {};
        rootObj.shootDetails = {
          ...sObj,
          visible: true,
          daysText: sObj.daysText || '1 Day Shoot',
          crewText: sObj.crewText || (Array.isArray(studioSettings?.requirements) && studioSettings.requirements.length > 0 ? studioSettings.requirements.slice(0, 3).join('\n') : '1x Candid Photographer\n1x Cinematographer\n1x Drone Pilot'),
          deliverablesText: sObj.deliverablesText || (Array.isArray(studioSettings?.preWeddingDeliverables) && studioSettings.preWeddingDeliverables.length > 0 ? studioSettings.preWeddingDeliverables.slice(0, 3).join('\n') : 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n1 Teaser Video Reel'),
          showExclusionsNote: true
        };
      }

      if (!hasSpecialSignal1) {
        rootObj.specialValueAdditions = {
          ...(rootObj.specialValueAdditions || {}),
          visible: false,
          selectedItems: [],
          note: ''
        };
      } else {
        rootObj.specialValueAdditions = {
          ...(rootObj.specialValueAdditions || {}),
          visible: true
        };
      }
    }

    const normDoc = normalizeQuotationData(rootObj, baseSchema);
    if (!isDirectJson) {
      if (!normDoc.deliverablesPage) normDoc.deliverablesPage = { selectedItems: [], availableOptions: [] };
      if (hasAllDelivReq1) {
        const fullCatalog1 = studioDelivs1.length > 0 ? studioDelivs1 : DEFAULT_EXTRACTED_DELIVERABLES;
        normDoc.deliverablesPage.selectedItems = mergeDeliverablesSmart([...fullCatalog1], spokenDelivs1, true)
          .filter((item: string) => isValidDeliverableItem(item, fullCatalog1));
      } else if (hasCustomAllDeliv1) {
        normDoc.deliverablesPage.selectedItems = mergeDeliverablesSmart([...shortcutDelivs1], spokenDelivs1, true)
          .filter((item: string) => isValidDeliverableItem(item, studioDelivs1));
      } else {
        const groundedRootDelivs = rawRootDelivs.filter((item: string) =>
          isGeminiDeliverableGrounded(item, rawPromptOrAll1, spokenDelivs1, shortcutDelivs1)
        );
        normDoc.deliverablesPage.selectedItems = mergeDeliverablesSmart(
          groundedRootDelivs,
          [...shortcutDelivs1, ...spokenDelivs1],
          true
        ).filter((item: string) => isValidDeliverableItem(item, studioDelivs1));
      }
    }
    normDoc.pageSequence = syncShootPageInSequence(normDoc.pageSequence, Boolean(normDoc.shootDetails?.visible));
    normDoc.pageSequence = syncSpecialValuePageInSequence(normDoc.pageSequence, Boolean(normDoc.specialValueAdditions?.visible));

    // Strictly ensure payment milestones default to Pending unless explicitly paid
    if (normDoc.paymentTermsPage?.steps && Array.isArray(normDoc.paymentTermsPage.steps)) {
      normDoc.paymentTermsPage.steps = normDoc.paymentTermsPage.steps.map((s: any) => {
        const stepStatusLower = String(s.status || '').toLowerCase().trim();
        const isPaid = (stepStatusLower === 'completed' || stepStatusLower === 'paid') && hasExplicitPaymentReceived;
        return {
          ...s,
          status: isPaid ? 'Completed' : 'Pending'
        };
      });
    }

    // Preserve SEPARATE cards (NO unconditional same-date merging) & map names to Studio Owner Settings!
    if (normDoc.functionsPage?.items && Array.isArray(normDoc.functionsPage.items)) {
      const nonPreWedItems = normDoc.functionsPage.items.filter((fn: any) => {
        const nameLower = (fn.name || '').toLowerCase();
        return !nameLower.includes('pre-wedding') && !nameLower.includes('prewedding') && !nameLower.includes('pre wedding') && !nameLower.includes('previewing');
      });
      const itemsToKeep = nonPreWedItems.length > 0 ? nonPreWedItems : normDoc.functionsPage.items;
      normDoc.functionsPage.items = itemsToKeep.map((fn: any, idx: number) => ({
        ...fn,
        id: fn.id || `func-ai-${idx + 1}`,
        name: resolveStudioFunctionName(fn.name || 'Wedding', studioEventNames, studioDefaultFunctions),
        date: fn.dateNotFixed ? 'Date Not Fixed' : formatQuotationDate(fn.date),
        dateNotFixed: fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed'),
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        location: fn.location || '',
        notes: sanitizeEventFunctionNotes(fn.notes, studioShortcuts1),
        requirements: Array.isArray(fn.requirements) && fn.requirements.length > 0
          ? fn.requirements.map((r: any) => ({
              name: resolveStudioCrewRole(typeof r === 'string' ? r : r.name || '', studioCrewRoles),
              qty: Number(r.qty || 1)
            }))
          : [
              { name: resolveStudioCrewRole('Candid Photographer', studioCrewRoles), qty: 1 },
              { name: resolveStudioCrewRole('Cinematographer', studioCrewRoles), qty: 1 }
            ]
      }));
      if (!isDirectJson) {
        normDoc.functionsPage.items = syncEventTimingsFromPrompt(
          normDoc.functionsPage.items,
          rawPromptOrAll1,
          studioEventNames,
          studioDefaultFunctions
        );
      }
    }

    // ⚡ MANDATE: Resolve single primary cover location (prefer spoken location, never let base template Mumbai leak)
    const spokenCoverLoc1 = !isDirectJson ? extractSpokenLocationFromNotes(rawPromptOrAll1) : '';
    const cleanedRootLoc1 = cleanExtractedLocationCandidate(rootObj.cover?.locationName || '');
    const promptMentionsMumbai1 = /\bmumbai\b|\bमुंबई\b/i.test(rawPromptOrAll1);
    if (!isDirectJson && normDoc.functionsPage?.items && Array.isArray(normDoc.functionsPage.items)) {
      normDoc.functionsPage.items = normDoc.functionsPage.items.map((fn: any) => {
        let loc = cleanExtractedLocationCandidate(fn.location || '') || (fn.location || '');
        if (!promptMentionsMumbai1 && /^mumbai$/i.test(loc.trim()) && spokenCoverLoc1) {
          loc = spokenCoverLoc1;
        }
        if (!loc && spokenCoverLoc1) loc = spokenCoverLoc1;
        return { ...fn, location: loc };
      });
    }
    if (normDoc.cover) {
      const resolvedPrimary1 = resolvePrimaryCoverLocation(
        spokenCoverLoc1 || cleanedRootLoc1 || normDoc.cover.locationName || '',
        normDoc.functionsPage?.items || []
      );
      normDoc.cover.locationName =
        spokenCoverLoc1 && (!resolvedPrimary1 || (!promptMentionsMumbai1 && /^mumbai$/i.test(resolvedPrimary1.trim())))
          ? spokenCoverLoc1
          : resolvedPrimary1;
    }

    // Filter out any pre-wedding or invalid conversational deliverables from deliverablesPage
    if (normDoc.deliverablesPage?.selectedItems && Array.isArray(normDoc.deliverablesPage.selectedItems)) {
      normDoc.deliverablesPage.selectedItems = normDoc.deliverablesPage.selectedItems.filter((item: string) => {
        const itemLower = String(item || '').toLowerCase();
        if (itemLower.includes('pre-wedding') || itemLower.includes('prewedding') || itemLower.includes('pre wedding') || itemLower.includes('previewing')) {
          return false;
        }
        return isDirectJson || isValidDeliverableItem(item, studioDelivs1);
      });
    }

    // ⚡ FULL DELIVERABLES SYNC: If user requested "all deliverables", inject ALL deliverables from Studio Settings!
    if (hasAllDelivReq1) {
      if (!normDoc.deliverablesPage) normDoc.deliverablesPage = { selectedItems: [] };
      const fullCatalog1 = studioDelivs1.length > 0 ? studioDelivs1 : DEFAULT_EXTRACTED_DELIVERABLES;
      normDoc.deliverablesPage.selectedItems = mergeDeliverablesSmart([...fullCatalog1], spokenDelivs1, true)
        .filter((item: string) => isValidDeliverableItem(item, fullCatalog1));
    }
    if (studioDelivs1.length > 0) {
      if (!normDoc.deliverablesPage) normDoc.deliverablesPage = { selectedItems: [], availableOptions: [] };
      normDoc.deliverablesPage.availableOptions = Array.from(new Set([
        ...studioDelivs1,
        ...(normDoc.deliverablesPage.availableOptions || []),
        ...(normDoc.deliverablesPage.selectedItems || [])
      ]));
    }

    if (normDoc.shootDetails) normDoc.shootDetails.showExclusionsNote = true;
    if (normDoc.pricingPage) normDoc.pricingPage.showExclusionsNote = true;

    // Enforce Settings AI Training (Shortcuts + Custom Instructions) & Spoken Rules!
    if (!isDirectJson) {
      applyAiTrainingAndVoiceDirectives(normDoc, contextData);
      normDoc.pageSequence = syncSpecialValuePageInSequence(normDoc.pageSequence, Boolean(normDoc.specialValueAdditions?.visible));
    }

    // Sanitize coupleName (prevent invalid pronouns/punctuation & enforce explicit spoken prompt name priority)
    const rawLeadFallback = String(contextData?.lead_info?.name || '').trim();
    const leadFallbackName = rawLeadFallback && !isInvalidCoupleName(rawLeadFallback) ? cleanCoupleCandidateEdges(rawLeadFallback) : '';
    const spokenPromptCouple = !isDirectJson ? extractSpokenCoupleName(rawPromptNotes, studioEventNames) : '';

    const coverCoupleRaw = cleanCoupleCandidateEdges(String(normDoc.cover?.coupleName || '').trim());
    const coverGroomRaw = cleanCoupleCandidateEdges(String(normDoc.cover?.groomName || '').trim());
    const coverBrideRaw = cleanCoupleCandidateEdges(String(normDoc.cover?.brideName || '').trim());
    let candidateCouple = coverCoupleRaw && !isInvalidCoupleName(coverCoupleRaw) ? coverCoupleRaw : '';
    if (!candidateCouple) {
      if (coverGroomRaw && coverBrideRaw && !isInvalidCoupleName(`${coverGroomRaw} & ${coverBrideRaw}`)) {
        candidateCouple = `${coverGroomRaw} & ${coverBrideRaw}`;
      } else if (coverGroomRaw && !isInvalidCoupleName(coverGroomRaw)) {
        candidateCouple = coverGroomRaw;
      }
    }
    const baseCoupleRaw = String(baseSchema?.cover?.coupleName || '').trim().toLowerCase();
    const notesLowerForCouple = rawPromptNotes.toLowerCase();
    const spokenLowerC = spokenPromptCouple.toLowerCase();
    const candLowerC = candidateCouple.toLowerCase();
    const candidateTokensPresentInPrompt = Boolean(
      candidateCouple &&
      candLowerC
        .split(/[\s&+/]+/)
        .filter((t) => t.length >= 2)
        .some((t) => notesLowerForCouple.includes(t))
    );
    const spokenIsSupersetOfCandidate = Boolean(
      spokenLowerC &&
      candLowerC &&
      spokenLowerC !== candLowerC &&
      (spokenLowerC.includes(candLowerC) ||
        candLowerC.split(/[\s&+/]+/).filter(Boolean).every((t) => spokenLowerC.includes(t)) &&
        spokenLowerC.length > candLowerC.length)
    );
    if (
      spokenPromptCouple &&
      (!candidateCouple ||
        spokenIsSupersetOfCandidate ||
        (leadFallbackName && candLowerC === leadFallbackName.toLowerCase() && spokenLowerC !== leadFallbackName.toLowerCase()) ||
        (baseCoupleRaw && candLowerC === baseCoupleRaw && spokenLowerC !== baseCoupleRaw) ||
        (!candidateTokensPresentInPrompt && !/[\u0900-\u097F]/.test(rawPromptNotes)))
    ) {
      candidateCouple = spokenPromptCouple;
    }

    const cName = candidateCouple || leadFallbackName || 'Client';
    if (!normDoc.cover) normDoc.cover = {};
    normDoc.cover.coupleName = cName;
    if (cName.includes('&')) {
      const parts = cName.split('&').map((s: string) => s.trim()).filter(Boolean);
      normDoc.cover.groomName = parts[0] || cName;
      normDoc.cover.brideName = parts[1] || '';
    } else {
      normDoc.cover.groomName = cName;
      normDoc.cover.brideName = '';
    }

    if (!isDirectJson && normDoc.pricingPage) {
      reconcileSpokenPricing(normDoc.pricingPage, rawPromptOrAll1);
    }

    const baseP = normDoc.pricingPage?.basePrice || 0;
    const discP = normDoc.pricingPage?.discountAmount || 0;
    const travP = normDoc.pricingPage?.travelCharges || 0;
    const accP = normDoc.pricingPage?.accommodationCharges || 0;
    const addlP = normDoc.pricingPage?.additionalCharges || 0;
    const gstP = normDoc.pricingPage?.gstPct || 0;
    const subTot = Math.max(0, baseP - discP + travP + accP + addlP);
    const totAmount = Math.round(subTot * (1 + gstP / 100));

    const maxPhotoQty = Math.max(0, ...(normDoc.functionsPage?.items || []).map((f: any) =>
      (f.requirements || []).filter((r: any) => /photo/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
    ));
    const maxVideoQty = Math.max(0, ...(normDoc.functionsPage?.items || []).map((f: any) =>
      (f.requirements || []).filter((r: any) => /cinemat|cine|video/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
    ));

    const summary = {
      coupleName: cName,
      weddingDate: normDoc.functionsPage?.items?.[0]?.date || normDoc.cover?.weddingDate || 'Date TBD',
      location: normDoc.cover?.locationName || 'Location TBD',
      functionsCount: normDoc.functionsPage?.items?.length || 0,
      functionsList: (normDoc.functionsPage?.items || []).map((f: any) => f.name),
      photographers: maxPhotoQty,
      cinematographers: maxVideoQty,
      totalInvestment: `₹${totAmount.toLocaleString('en-IN')}`
    };

    const resolvedEv = (normDoc.cover?.eventType || baseSchema?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
    const docTitle = `${cName} - ${resolvedEv}`;
    normDoc.designName = docTitle;
    normDoc.title = docTitle;

    return {
      document: normDoc,
      summary,
      missingInformation: [],
      conflicts: []
    };
  }

  const doc = JSON.parse(JSON.stringify(baseSchema));

  const cover = aiData.cover || aiData.couple || {};
  const shootDetails = aiData.shootDetails || {};
  const functionsPage = aiData.functionsPage || {};
  const deliverablesPage = aiData.deliverablesPage || {};
  const specialValueAdditions = aiData.specialValueAdditions || {};
  const pricingPage = aiData.pricingPage || aiData.pricing || {};
  const paymentTermsPage = aiData.paymentTermsPage || aiData.payment_schedule || {};

  // 1. Cover Page (explicitly override baseSchema demo cover identity fields so template demo names NEVER bleed through)
  if (!doc.cover) doc.cover = {};
  const spokenPromptCoupleMain = !isDirectJson ? extractSpokenCoupleName(rawPromptNotes, studioEventNames) : '';
  const aiCoverCoupleRaw = cleanCoupleCandidateEdges(String(cover.coupleName || '').trim());
  const aiCoverGroomRaw = cleanCoupleCandidateEdges(String(cover.groomName || '').trim());
  const aiCoverBrideRaw = cleanCoupleCandidateEdges(String(cover.brideName || '').trim());
  const baseLeadRaw = String(contextData?.lead_info?.name || '').trim();
  const validLeadFallback = baseLeadRaw && !isInvalidCoupleName(baseLeadRaw) ? cleanCoupleCandidateEdges(baseLeadRaw) : '';

  let resolvedInitialCouple = '';
  if (aiCoverCoupleRaw && !isInvalidCoupleName(aiCoverCoupleRaw)) {
    resolvedInitialCouple = aiCoverCoupleRaw;
  } else if (aiCoverGroomRaw && aiCoverBrideRaw && !isInvalidCoupleName(`${aiCoverGroomRaw} & ${aiCoverBrideRaw}`)) {
    resolvedInitialCouple = `${aiCoverGroomRaw} & ${aiCoverBrideRaw}`;
  } else if (aiCoverGroomRaw && !isInvalidCoupleName(aiCoverGroomRaw)) {
    resolvedInitialCouple = aiCoverGroomRaw;
  } else if (aiCoverBrideRaw && !isInvalidCoupleName(aiCoverBrideRaw)) {
    resolvedInitialCouple = aiCoverBrideRaw;
  }

  const baseCoupleMainRaw = String(baseSchema?.cover?.coupleName || '').trim().toLowerCase();
  const notesLowerForCoupleMain = rawPromptNotes.toLowerCase();
  const spokenLowerM = spokenPromptCoupleMain.toLowerCase();
  const resolvedLowerM = resolvedInitialCouple.toLowerCase();
  const resolvedTokensPresentInPrompt = Boolean(
    resolvedInitialCouple &&
    resolvedLowerM
      .split(/[\s&+/]+/)
      .filter((t) => t.length >= 2)
      .some((t) => notesLowerForCoupleMain.includes(t))
  );
  const spokenMainIsSuperset = Boolean(
    spokenLowerM &&
    resolvedLowerM &&
    spokenLowerM !== resolvedLowerM &&
    (spokenLowerM.includes(resolvedLowerM) ||
      resolvedLowerM.split(/[\s&+/]+/).filter(Boolean).every((t) => spokenLowerM.includes(t)) &&
      spokenLowerM.length > resolvedLowerM.length)
  );
  if (
    spokenPromptCoupleMain &&
    (!resolvedInitialCouple ||
      spokenMainIsSuperset ||
      (validLeadFallback && resolvedLowerM === validLeadFallback.toLowerCase() && spokenLowerM !== validLeadFallback.toLowerCase()) ||
      (baseCoupleMainRaw && resolvedLowerM === baseCoupleMainRaw && spokenLowerM !== baseCoupleMainRaw) ||
      (!resolvedTokensPresentInPrompt && !/[\u0900-\u097F]/.test(rawPromptNotes)))
  ) {
    resolvedInitialCouple = spokenPromptCoupleMain;
  }

  const finalCoverCouple = resolvedInitialCouple || validLeadFallback || 'Client';
  doc.cover.coupleName = finalCoverCouple;
  if (finalCoverCouple.includes('&')) {
    const cParts = finalCoverCouple.split('&').map((s: string) => s.trim()).filter(Boolean);
    doc.cover.groomName = cParts[0] || finalCoverCouple;
    doc.cover.brideName = cParts[1] || '';
  } else {
    doc.cover.groomName = finalCoverCouple;
    doc.cover.brideName = '';
  }
  if (cover.eventType) doc.cover.eventType = cover.eventType;
  doc.cover.locationName = cover.locationName || '';

  // 2. Pre-Wedding Shoot Details Page (Strictly conditional)
  if (promptPreWedRequested || (isDirectJson && shootDetails.visible)) {
    if (!doc.shootDetails) doc.shootDetails = {};
    doc.shootDetails.visible = true;
    doc.shootDetails.daysText = shootDetails.daysText || '1 Day Shoot';
    doc.shootDetails.crewText = shootDetails.crewText || (Array.isArray(studioSettings?.requirements) && studioSettings.requirements.length > 0 ? studioSettings.requirements.slice(0, 3).join('\n') : '1x Candid Photographer\n1x Cinematographer\n1x Drone Pilot');
    doc.shootDetails.deliverablesText = shootDetails.deliverablesText || (Array.isArray(studioSettings?.preWeddingDeliverables) && studioSettings.preWeddingDeliverables.length > 0 ? studioSettings.preWeddingDeliverables.slice(0, 3).join('\n') : 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n1 Teaser Video Reel');
    doc.shootDetails.showExclusionsNote = true;
  } else {
    doc.shootDetails = {
      ...(doc.shootDetails || {}),
      visible: false,
      daysText: '',
      crewText: '',
      deliverablesText: '',
      showExclusionsNote: true
    };
  }

  // 3. Functions Page (Strictly Separate Function Cards unless explicitly combined + Exact Studio Names)
  if (!doc.functionsPage) doc.functionsPage = {};
  const rawFuncs = functionsPage.items || aiData.functions || [];
  if (Array.isArray(rawFuncs) && rawFuncs.length > 0) {
    const nonPreWedFuncs = rawFuncs.filter((fn: any) => {
      const nameLower = (fn.name || '').toLowerCase();
      return !nameLower.includes('pre-wedding') && !nameLower.includes('prewedding') && !nameLower.includes('pre wedding') && !nameLower.includes('previewing');
    });

    const funcsToProcess = nonPreWedFuncs.length > 0 ? nonPreWedFuncs : [
      { name: resolveStudioFunctionName('Wedding', studioEventNames, studioDefaultFunctions), requirements: [{ name: 'Candid Photographer', qty: 1 }, { name: 'Cinematographer', qty: 1 }] }
    ];

    doc.functionsPage.items = funcsToProcess.map((fn: any, idx: number) => {
      let requirementsList: { name: string; qty: number }[] = [];
      if (Array.isArray(fn.requirements)) {
        requirementsList = fn.requirements.map((r: any) => ({
          name: resolveStudioCrewRole(typeof r === 'string' ? r : r.name || '', studioCrewRoles),
          qty: Number(r.qty || 1)
        }));
      } else {
        if (fn.photographers) requirementsList.push({ name: resolveStudioCrewRole('Candid Photographer', studioCrewRoles), qty: Number(fn.photographers) });
        if (fn.cinematographers) requirementsList.push({ name: resolveStudioCrewRole('Cinematographer', studioCrewRoles), qty: Number(fn.cinematographers) });
        if (fn.drone) requirementsList.push({ name: resolveStudioCrewRole('Drone Pilot', studioCrewRoles), qty: 1 });
      }

      if (requirementsList.length === 0) {
        requirementsList = [
          { name: resolveStudioCrewRole('Candid Photographer', studioCrewRoles), qty: 1 },
          { name: resolveStudioCrewRole('Cinematographer', studioCrewRoles), qty: 1 }
        ];
      }

      const isNotFixed = fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed' || fn.date === 'TBD');

      return {
        id: fn.id || `func-ai-${Date.now()}-${idx}`,
        name: resolveStudioFunctionName(fn.name || `Function ${idx + 1}`, studioEventNames, studioDefaultFunctions),
        date: isNotFixed ? 'Date Not Fixed' : formatQuotationDate(fn.date),
        dateNotFixed: isNotFixed,
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        ...(fn.durationSlot && fn.durationSlot !== 'None' ? { durationSlot: fn.durationSlot } : {}),
        ...(fn.time ? { time: fn.time } : {}),
        location: fn.location || fn.venue || '',
        requirements: requirementsList,
        notes: sanitizeEventFunctionNotes(fn.notes, Array.isArray(studioSettings?.aiRules?.shortcuts) ? studioSettings.aiRules.shortcuts : [])
      };
    });
    if (!isDirectJson) {
      doc.functionsPage.items = syncEventTimingsFromPrompt(
        doc.functionsPage.items,
        rawPromptNotes || allUserNotesRaw,
        studioEventNames,
        studioDefaultFunctions
      );
    }
  }

  // ⚡ MANDATE: Resolve single primary cover location (prefer spoken location, never let stale/demo location overwrite it)
  const spokenCoverLoc2 = !isDirectJson ? extractSpokenLocationFromNotes(rawPromptNotes || allUserNotesRaw) : '';
  const cleanedAiLoc2 = cleanExtractedLocationCandidate(cover.locationName || '');
  const promptMentionsMumbai2 = /\bmumbai\b|\bमुंबई\b/i.test(rawPromptNotes || allUserNotesRaw);
  if (!isDirectJson && doc.functionsPage?.items && Array.isArray(doc.functionsPage.items)) {
    doc.functionsPage.items = doc.functionsPage.items.map((fn: any) => {
      let loc = cleanExtractedLocationCandidate(fn.location || '') || (fn.location || '');
      if (!promptMentionsMumbai2 && /^mumbai$/i.test(loc.trim()) && spokenCoverLoc2) {
        loc = spokenCoverLoc2;
      }
      if (!loc && spokenCoverLoc2) loc = spokenCoverLoc2;
      return { ...fn, location: loc };
    });
  }
  if (doc.cover) {
    const resolvedPrimary2 = resolvePrimaryCoverLocation(
      spokenCoverLoc2 || cleanedAiLoc2 || cover.locationName || '',
      doc.functionsPage?.items || []
    );
    doc.cover.locationName =
      spokenCoverLoc2 && (!resolvedPrimary2 || (!promptMentionsMumbai2 && /^mumbai$/i.test(resolvedPrimary2.trim())))
        ? spokenCoverLoc2
        : resolvedPrimary2;
  }

  // 4. Deliverables Page (Main Wedding Deliverables Only - Pre-wedding moved to shootDetails ONLY if Pre-Wedding enabled)
  if (!doc.deliverablesPage) doc.deliverablesPage = {};
  if (!isDirectJson) {
    // Prevent baseSchema template demo deliverables from leaking when user did not request them
    doc.deliverablesPage.selectedItems = [];
  }
  const studioDeliverables: string[] = Array.isArray(studioSettings?.deliverables)
    ? studioSettings.deliverables
        .map((d: any) => typeof d === 'string' ? d : d?.title)
        .filter(Boolean)
    : [];
  const studioShortcuts: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts)
    ? studioSettings.aiRules.shortcuts
    : [];

  // ⚡ MANDATE: Enforce Studio Settings Deliverables & Shortcuts synchronization ("x डालेंगे तो y होगा")
  const rawNotesForBranch2 = rawPromptNotes || allUserNotesRaw;
  const rawFormStr2 = JSON.stringify(contextData?.raw_form_fields || '');
  const allNotesText = `${contextData?.additional_user_notes || ''} ${rawFormStr2}`.toLowerCase();

  const branch2Analysis = analyzeScopedShortcutsAndCrewOverrides(
    rawNotesForBranch2,
    studioShortcuts,
    studioEventNames,
    studioDefaultFunctions,
    studioCrewRoles,
    rawFormStr2
  );
  const hasCustomAllDeliv2 = hasCustomAllDeliverablesShortcut(branch2Analysis.shortcutMatches);
  const hasAllDelivReq = ALL_DELIVERABLES_TRIGGER_RE.test(allNotesText) && !hasCustomAllDeliv2;
  const matchedShortcutDelivs: string[] = [];
  const matchedShortcutSpecialAddons2: string[] = [];
  for (const sm of branch2Analysis.shortcutMatches) {
    if (sm.mappedDeliverables.length > 0) matchedShortcutDelivs.push(...sm.mappedDeliverables);
    if (sm.mappedSpecialAddons && sm.mappedSpecialAddons.length > 0) {
      matchedShortcutSpecialAddons2.push(...sm.mappedSpecialAddons);
    }
  }
  const spokenDelivsBranch2 = !isDirectJson ? extractDeliverablesFromText(rawNotesForBranch2, studioDeliverables) : [];

  const rawDeliv = deliverablesPage.selectedItems || aiData.deliverables || [];
  let validAiWeddingDelivs: string[] = [];
  if (Array.isArray(rawDeliv) && rawDeliv.length > 0) {
    const preWedDelivs: string[] = [];
    const weddingDelivs: string[] = [];

    rawDeliv.forEach((item: string) => {
      const cleanItem = String(item || '').trim();
      if (!cleanItem) return;
      const itemLower = cleanItem.toLowerCase();
      if (itemLower.includes('pre-wedding') || itemLower.includes('prewedding') || itemLower.includes('pre wedding') || itemLower.includes('previewing')) {
        preWedDelivs.push(cleanItem);
      } else if (
        isDirectJson ||
        (isValidDeliverableItem(cleanItem, studioDeliverables) &&
          (hasAllDelivReq || isGeminiDeliverableGrounded(cleanItem, rawNotesForBranch2, spokenDelivsBranch2, matchedShortcutDelivs)))
      ) {
        weddingDelivs.push(cleanItem);
      }
    });

    validAiWeddingDelivs = weddingDelivs;
    doc.deliverablesPage.selectedItems = weddingDelivs;

    if (preWedDelivs.length > 0 && promptPreWedRequested) {
      if (!doc.shootDetails) doc.shootDetails = { visible: true };
      doc.shootDetails.visible = true;
      const existingText = doc.shootDetails.deliverablesText || '';
      const existingLines = existingText ? existingText.split('\n') : [];
      const mergedShootDelivs = Array.from(new Set([...existingLines, ...preWedDelivs])).filter(Boolean).join('\n');
      doc.shootDetails.deliverablesText = mergedShootDelivs;
    }
  }

  if (hasAllDelivReq) {
    const fullCatalog2 = studioDeliverables.length > 0 ? studioDeliverables : DEFAULT_EXTRACTED_DELIVERABLES;
    doc.deliverablesPage.selectedItems = mergeDeliverablesSmart(
      [...fullCatalog2],
      [...spokenDelivsBranch2, ...(Array.isArray(doc.deliverablesPage.selectedItems) ? doc.deliverablesPage.selectedItems : [])],
      true
    ).filter((item: string) => isValidDeliverableItem(item, fullCatalog2));
  } else if (hasCustomAllDeliv2) {
    doc.deliverablesPage.selectedItems = mergeDeliverablesSmart(
      matchedShortcutDelivs,
      spokenDelivsBranch2,
      true
    );
  } else if (matchedShortcutDelivs.length > 0 || spokenDelivsBranch2.length > 0) {
    doc.deliverablesPage.selectedItems = mergeDeliverablesSmart(
      validAiWeddingDelivs,
      [...matchedShortcutDelivs, ...spokenDelivsBranch2],
      true
    );
  }

  if (!isDirectJson && Array.isArray(doc.deliverablesPage.selectedItems)) {
    doc.deliverablesPage.selectedItems = doc.deliverablesPage.selectedItems.filter((item: string) =>
      isValidDeliverableItem(item, studioDeliverables)
    );
  }

  // Populate availableOptions with all studio deliverables AND extracted custom deliverables
  doc.deliverablesPage.availableOptions = Array.from(new Set([
    ...studioDeliverables,
    ...(doc.deliverablesPage.availableOptions || []),
    ...(doc.deliverablesPage.selectedItems || [])
  ])).filter(Boolean);

  // 5. Special Value Additions Page (strictly conditional unless complimentary/freebie spoken or mapped by shortcut)
  const studioSpecialAddons2: string[] = Array.isArray(studioSettings?.specialAddons)
    ? studioSettings.specialAddons.map((a: any) => (typeof a === 'string' ? a : a?.title)).filter(Boolean)
    : [];
  const spokenSpecial2 = !isDirectJson ? extractSpecialValueAdditionsFromText(rawNotesForBranch2, studioSpecialAddons2) : [];
  const hasSpecialSignal2 = isDirectJson
    ? Boolean(specialValueAdditions.visible ?? (Array.isArray(specialValueAdditions.selectedItems) && specialValueAdditions.selectedItems.length > 0))
    : (detectSpecialValueIntent(rawNotesForBranch2) || matchedShortcutSpecialAddons2.length > 0 || spokenSpecial2.length > 0);

  if (hasSpecialSignal2) {
    const rawSpecial = Array.isArray(specialValueAdditions.selectedItems) ? specialValueAdditions.selectedItems : [];
    const mergedSpecial2 = Array.from(
      new Set([...rawSpecial, ...matchedShortcutSpecialAddons2, ...spokenSpecial2])
    ).filter(Boolean);
    doc.specialValueAdditions = {
      ...(doc.specialValueAdditions || {}),
      visible: true,
      selectedItems: mergedSpecial2,
      note: specialValueAdditions.note || doc.specialValueAdditions?.note || ''
    };
  } else {
    doc.specialValueAdditions = {
      ...(doc.specialValueAdditions || {}),
      visible: false,
      selectedItems: [],
      note: ''
    };
  }

  // 6. Pricing Page
  if (!doc.pricingPage) doc.pricingPage = {};
  const rawBase = pricingPage.regularPrice ?? pricingPage.regular_price ?? pricingPage.basePrice ?? pricingPage.base_price;
  if (rawBase !== undefined) doc.pricingPage.basePrice = Number(String(rawBase).replace(/[^\d.-]/g, '')) || 0;
  let rawDisc = pricingPage.discountAmount ?? pricingPage.discount_amount ?? pricingPage.discount;
  let discAmt = rawDisc !== undefined ? (Number(String(rawDisc).replace(/[^\d.-]/g, '')) || 0) : 0;
  const rawBest = pricingPage.bestPrice ?? pricingPage.best_price ?? pricingPage.offerPrice ?? pricingPage.offer_price;
  if (rawBest !== undefined) {
    const bestNum = Number(String(rawBest).replace(/[^\d.-]/g, '')) || 0;
    const baseNum = Number(doc.pricingPage.basePrice || 0);
    if (bestNum > 0 && baseNum > bestNum && discAmt === 0) {
      discAmt = baseNum - bestNum;
    }
  }
  doc.pricingPage.discountAmount = discAmt;
  if (pricingPage.gstPct !== undefined) doc.pricingPage.gstPct = Number(pricingPage.gstPct);
  if (pricingPage.travelCharges !== undefined) doc.pricingPage.travelCharges = Number(pricingPage.travelCharges);
  if (pricingPage.accommodationCharges !== undefined) doc.pricingPage.accommodationCharges = Number(pricingPage.accommodationCharges);
  if (pricingPage.additionalCharges !== undefined) doc.pricingPage.additionalCharges = Number(pricingPage.additionalCharges);
  doc.pricingPage.showExclusionsNote = true;
  if (!isDirectJson) {
    reconcileSpokenPricing(doc.pricingPage, rawNotesForBranch2);
  }

  // Enforce Settings AI Training (Shortcuts + Custom Instructions) & Spoken Rules!
  if (!isDirectJson) {
    applyAiTrainingAndVoiceDirectives(doc, contextData);
  }

  // Calculate Summary (sanitized coupleName so placeholders & random phrases can never leak)
  const rawLeadFallbackMain = String(contextData?.lead_info?.name || '').trim();
  const leadFallbackName = rawLeadFallbackMain && !isInvalidCoupleName(rawLeadFallbackMain) ? cleanCoupleCandidateEdges(rawLeadFallbackMain) : '';
  const candidatePostDirective = cleanCoupleCandidateEdges(String(doc.cover?.coupleName || '').trim());
  const coupleName = (candidatePostDirective && !isInvalidCoupleName(candidatePostDirective))
    ? candidatePostDirective
    : (spokenPromptCoupleMain || leadFallbackName || 'Client');
  doc.cover.coupleName = coupleName;
  if (coupleName.includes('&')) {
    const finalParts = coupleName.split('&').map((s: string) => s.trim()).filter(Boolean);
    doc.cover.groomName = finalParts[0] || coupleName;
    doc.cover.brideName = finalParts[1] || '';
  } else {
    doc.cover.groomName = coupleName;
    doc.cover.brideName = '';
  }
  const baseAmt = doc.pricingPage.basePrice || 150000;
  const discAmtVal = doc.pricingPage.discountAmount || 0;
  const travAmt = doc.pricingPage.travelCharges || 0;
  const accAmt = doc.pricingPage.accommodationCharges || 0;
  const addlAmt = doc.pricingPage.additionalCharges || 0;
  const gstPctVal = doc.pricingPage.gstPct || 0;
  const subTotalAmount = Math.max(0, baseAmt - discAmtVal + travAmt + accAmt + addlAmt);
  const totalAmount = Math.round(subTotalAmount * (1 + gstPctVal / 100));

  // 7. Payment Terms Page
  if (!doc.paymentTermsPage) doc.paymentTermsPage = {};
  const rawSteps = paymentTermsPage.steps || (Array.isArray(paymentTermsPage) ? paymentTermsPage : aiData.payment_schedule) || [];
  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    let allocated = 0;
    doc.paymentTermsPage.steps = rawSteps.map((step: any, idx: number) => {
      const stepStatusLower = String(step.status || '').toLowerCase().trim();
      const isPaid = (stepStatusLower === 'completed' || stepStatusLower === 'paid') && hasExplicitPaymentReceived;
      const stepPct = parseFloat(String(step.pct || '').replace(/[^0-9.]/g, '')) || 0;
      let stepAmt = Number(step.amount || 0);

      if (stepAmt === 0 && totalAmount > 0 && stepPct > 0) {
        const isLast = idx === rawSteps.length - 1;
        stepAmt = isLast ? Math.max(0, totalAmount - allocated) : Math.round((totalAmount * stepPct) / 100);
      }
      allocated += stepAmt;

      return {
        name: step.name || 'Payment Milestone',
        pct: step.pct || (totalAmount > 0 ? `${Math.round((stepAmt / totalAmount) * 100)}%` : '30%'),
        amount: stepAmt,
        status: isPaid ? 'Completed' : 'Pending'
      };
    });
  }

  const maxPhotoQty = Math.max(0, ...(doc.functionsPage?.items || []).map((f: any) =>
    (f.requirements || []).filter((r: any) => /photo/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
  ));
  const maxVideoQty = Math.max(0, ...(doc.functionsPage?.items || []).map((f: any) =>
    (f.requirements || []).filter((r: any) => /cinemat|cine|video/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
  ));

  const summary = {
    coupleName,
    weddingDate: doc.functionsPage?.items?.[0]?.date || 'Date TBD',
    location: doc.cover.locationName || 'Location TBD',
    functionsCount: doc.functionsPage?.items?.length || 0,
    functionsList: (doc.functionsPage?.items || []).map((f: any) => f.name),
    photographers: maxPhotoQty,
    cinematographers: maxVideoQty,
    totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
  };

  const normalizedFinalDoc = normalizeQuotationData(doc, baseSchema);
  normalizedFinalDoc.pageSequence = syncShootPageInSequence(
    normalizedFinalDoc.pageSequence,
    Boolean(normalizedFinalDoc.shootDetails?.visible)
  );
  normalizedFinalDoc.pageSequence = syncSpecialValuePageInSequence(
    normalizedFinalDoc.pageSequence,
    Boolean(normalizedFinalDoc.specialValueAdditions?.visible)
  );

  // Strictly preserve template design and typography tokens from baseSchema
  if (baseSchema) {
    if (baseSchema.look) normalizedFinalDoc.look = baseSchema.look;
    if (baseSchema.theme || baseSchema.look) normalizedFinalDoc.theme = baseSchema.theme || baseSchema.look;
    if (baseSchema.primaryFont) normalizedFinalDoc.primaryFont = baseSchema.primaryFont;
    if (baseSchema.secondaryFont) normalizedFinalDoc.secondaryFont = baseSchema.secondaryFont;
    if (baseSchema.colorPalette && !normalizedFinalDoc.colorPalette) normalizedFinalDoc.colorPalette = baseSchema.colorPalette;
  }

  // Consistent title naming everywhere: "${coupleName} - ${eventType}"
  const resolvedEventType = (doc.cover?.eventType || baseSchema?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
  const calculatedTitle = `${coupleName} - ${resolvedEventType}`;
  normalizedFinalDoc.designName = calculatedTitle;
  normalizedFinalDoc.title = calculatedTitle;

  return {
    document: normalizedFinalDoc,
    summary,
    missingInformation: aiData.missingInformation || [],
    conflicts: aiData.conflicts || []
  };
}

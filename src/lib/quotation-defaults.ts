// src/lib/quotation-defaults.ts

export interface PageSequenceItem {
  id: string;
  type: string;
  label: string;
  isStandard?: boolean;
  customId?: string;
}

export const STANDARD_PAGE_DEFINITIONS: { type: string; label: string }[] = [
  { type: 'cover', label: 'Cover Page' },
  { type: 'aboutUs', label: 'About Us' },
  { type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { type: 'functionsPage', label: 'Functions & Coverage' },
  { type: 'deliverablesPage', label: 'Deliverables' },
  { type: 'specialValueAdditions', label: 'Special Value Additions' },
  { type: 'pricingPage', label: 'Pricing Details' },
  { type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { type: 'termsPage', label: 'Terms & Conditions' },
  { type: 'thankYouPage', label: 'Thank You Page' },
];

export const DEFAULT_PAGE_SEQUENCE: PageSequenceItem[] = STANDARD_PAGE_DEFINITIONS.map(std => ({
  id: `${std.type}-std`,
  type: std.type,
  label: std.label,
  isStandard: true
}));

export const DEFAULT_AIRY_PROPOSAL = {
  theme: 'cyprus-sand-dune',
  look: 'cyprus-sand-dune',
  primaryFont: 'Cormorant Garamond',
  secondaryFont: 'Plus Jakarta Sans',
  designName: 'Minimalist Airy Proposal',
  pageSequence: DEFAULT_PAGE_SEQUENCE,
  customPages: [],
  cover: {
    coupleName: 'YASH & TWINKLE',
    groomName: 'Yash',
    brideName: 'Twinkle',
    eventType: 'Wedding Photography & Films',
    weddingDate: 'December 14, 2026',
    locationName: 'Udaipur, Rajasthan',
    brandName: '',
    sideOption: 'A Wedding Story',
    photoUrl: '',
    brandLogoUrl: '',
    brandLogoSize: 80,
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  aboutUs: {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'We are a dedicated team of visual artists crafting heartfelt wedding films and editorial photographs that feel as timeless as your love.',
    signature: '',
    photo: '',
    photoHeight: 320,
    photoWidth: 100,
    photoFocalY: 50,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  shootDetails: {
    visible: true,
    kicker: 'PRE-WEDDING',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Full Day Creative Session',
    crewText: '1x Candid Photographer\n1x Cinematographer\n1x Drone Specialist',
    deliverablesHeading: 'Deliverables',
    deliverablesText: '1x 60-Sec Instagram Cinematic Teaser\n40+ Color-Graded High-Resolution Master Portraits\nFull High-Resolution Digital Master Gallery Link',
    showExclusionsNote: true,
    photo: '',
    photoHeight: 320,
    photoWidth: 100,
    photoFocalY: 50,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
  functionsPage: {
    kicker: 'CELEBRATIONS',
    heading: 'Functions & Crew Coverage',
    items: [
      {
        id: 'func_1',
        name: 'Haldi & Mehendi',
        date: 'December 12, 2026',
        dateNotFixed: false,
        startTime: '10:00 AM',
        endTime: '03:00 PM',
        time: '10:00 AM - 03:00 PM',
        durationSlot: 'Morning Rituals',
        location: 'The Leela Palace Courtyard',
        venue: 'The Leela Palace Courtyard',
        notes: 'Casual bright candid portraits & organic ceremony moments',
        requirements: [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ],
        team: '1x Candid Photographer, 1x Cinematographer'
      },
      {
        id: 'func_2',
        name: 'Sangeet & Cocktail Night',
        date: 'December 13, 2026',
        dateNotFixed: false,
        startTime: '07:00 PM',
        endTime: '01:00 AM',
        time: '07:00 PM - 01:00 AM',
        durationSlot: 'Evening Glamour',
        location: 'Grand Ballroom',
        venue: 'Grand Ballroom',
        notes: 'High-energy dance performances, stage lighting & family portraits',
        requirements: [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 2 }
        ],
        team: '1x Candid, 1x Traditional, 2x Cinematographer'
      },
      {
        id: 'func_3',
        name: 'The Wedding Ceremony & Reception',
        date: 'December 14, 2026',
        dateNotFixed: false,
        startTime: '04:00 PM',
        endTime: '12:00 AM',
        time: '04:00 PM - 12:00 AM',
        durationSlot: 'Main Ceremony',
        location: 'Lakeside Mandap & Lawn',
        venue: 'Lakeside Mandap & Lawn',
        notes: 'Baraat, Varmala, Pheras, Emotional Vidai & Reception',
        requirements: [
          { name: 'Candid Photographer', qty: 2 },
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 2 },
          { name: 'Drone Pilot', qty: 1 }
        ],
        team: '2x Candid, 1x Traditional, 2x Cinematographer, 1x Drone'
      }
    ]
  },
  deliverablesPage: {
    kicker: 'WHAT WE DELIVER',
    heading: 'DELIVERABLES',
    selectedItems: [
      'All Unedited High-Resolution RAW Photos (Delivered within 7 days via Hard Drive/Cloud)',
      '350+ Signature Master Color-Graded & Retouched Photographs',
      '1x 3 to 5-Minute 4K Cinematic Highlight Trailer Film',
      '1x 30 to 45-Minute Long Extended Documentary Feature Film',
      '4x Vertical Reels (9:16) tailored for Social Media & Instagram',
      '1x Premium Handcrafted Leatherette Wedding Photobook Album (40 Sheets / 80 Pages)'
    ],
    availableOptions: [
      'All Unedited High-Resolution RAW Photos',
      '350+ Signature Master Color-Graded & Retouched Photographs',
      '1x 3 to 5-Minute 4K Cinematic Highlight Trailer Film',
      '1x 30 to 45-Minute Long Extended Documentary Feature Film',
      '4x Vertical Reels (9:16) tailored for Social Media & Instagram',
      '1x Premium Handcrafted Leatherette Wedding Photobook Album (40 Sheets / 80 Pages)',
      '2x Mini Parent Albums (Identical Copies)',
      'Same Day Edit (SDE) 1-Minute Reel for Reception Screen',
      'Full Wedding Livestreaming (YouTube / Private link)',
      'Pre-Wedding Shoot (1 Day with Hair & Makeup)'
    ]
  },
  specialValueAdditions: {
    kicker: 'SPECIAL VALUE ADDITIONS',
    heading: 'Special Value Additions',
    selectedItems: [
      'Complimentary 4K Drone Aerial Coverage across all Wedding Functions',
      'Express Same-Week 25-Photo Sneak Peek Gallery for Instant Social Sharing',
      'Custom Engraved Crystal USB Presentation Box with Master Archival Drive'
    ],
    availableOptions: [
      'Complimentary 4K Drone Aerial Coverage across all Wedding Functions',
      'Express Same-Week 25-Photo Sneak Peek Gallery for Instant Social Sharing',
      'Custom Engraved Crystal USB Presentation Box with Master Archival Drive',
      'Complimentary 1-Minute Save the Date Animated Motion Video Invitation',
      'Free Digital Cloud Storage for 2 Full Years'
    ],
    note: ''
  },
  pricingPage: {
    kicker: 'INVESTMENT & BREAKDOWN',
    heading: 'PRICING DETAILS',
    basePrice: 285000,
    discountAmount: 0,
    gstPct: 0,
    travelCharges: 0,
    accommodationCharges: 0,
    additionalCharges: 0,
    showExclusionsNote: true,
    note: 'Custom customized package created specifically for your celebrations.'
  },
  paymentTermsPage: {
    kicker: 'SCHEDULE',
    heading: 'Payment Milestones & Commercial Terms',
    steps: [
      { name: 'Booking Advance (To lock & confirm dates)', pct: '25%', amount: 67500, status: 'Pending' },
      { name: 'Mid-Way Milestone (15 days prior to event)', pct: '50%', amount: 135000, status: 'Pending' },
      { name: 'Final Delivery & Album Dispatch', pct: '25%', amount: 67500, status: 'Pending' }
    ],
    note: 'Payments can be remitted via IMPS, NEFT, RTGS or UPI.'
  },
  addOnsPage: {
    visible: false,
    kicker: 'OPTIONAL UPGRADES',
    heading: 'Available Add-Ons & Enhancements',
    items: [
      { id: 'addon_1', name: 'Same-Day Edit (SDE) Reel', price: 25000, description: '1-minute fast-turnaround reel displayed on reception LED screens' },
      { id: 'addon_2', name: 'Parent Album Duos (2x Books)', price: 30000, description: '2 exact miniature hardbound photobook copies for parents' }
    ]
  },
  termsPage: {
    visible: true,
    kicker: 'POLICIES',
    heading: 'Standard Studio Policies & Terms of Service',
    terms: [
      'Dates are exclusively reserved upon confirmation of the 25% booking advance.',
      'Travel, lodging, and local transit for outstation crew to be provided by client.',
      'Delivery timeline: RAW files within 7 days; Teaser within 20 days; Full Deliverables within 6-8 weeks.',
      'Client approvals on photo selection for albums required within 30 days of receiving gallery.',
      'Studio reserves rights to display wedding media on official creative portfolio and social channels.'
    ]
  },
  thankYouPage: {
    kicker: 'GRATITUDE',
    heading: 'Thank You For Choosing Us',
    text: 'We are truly thrilled and honored to be a part of your once-in-a-lifetime journey. Let us create magic together!',
    contactPerson: '',
    phone: '',
    email: '',
    website: '',
    social: '',
    instagramHandle: '',
    instagramUrl: '',
    photo: '',
    photoHeight: 360,
    photoWidth: 75,
    photoFocalY: 50,
    bgOpacity: 40,
    frameShape: 'rounded',
    imagePosition: 'bottom',
  },
};

export function calculatePricingTotals(pricing: any) {
  const p = pricing || DEFAULT_AIRY_PROPOSAL.pricingPage;
  const base = Number(p?.basePrice ?? p?.base ?? 0);
  const disc = Number(p?.discountAmount ?? p?.discount ?? 0);
  const accom = Number(p?.accommodationCharges ?? p?.accommodation ?? 0);
  const travel = Number(p?.travelCharges ?? p?.travel ?? 0);
  const addl = Number(p?.additionalCharges ?? p?.additional ?? 0);
  const gross = Math.max(0, base - disc + accom + travel + addl);
  const gstPct = Number(p?.gstPct ?? p?.gstPercent ?? 0);
  const gstAmount = Math.round(gross * (gstPct / 100));
  const netTotal = gross + gstAmount;
  return { base, disc, accom, travel, addl, gross, gstPct, gstAmount, netTotal };
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
    s.includes('trad photo') || 
    s.includes('tred photo') || 
    s.includes('treational photo') ||
    s.includes('trad photog') ||
    s === 'tp'
  ) {
    return 'Traditional Photographer';
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

  return rawRole.trim().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Consolidates multiple ceremonies or functions occurring on the SAME DATE into a single function card.
 * Joins ceremony names with ' + ' (e.g. 'Haldi + Sangeet').
 * Merges crew requirements, combining quantities for identical roles.
 * Eliminates generic placeholder names like "Event 1", "Event 2", "Function 1".
 */
export function consolidateSameDateFunctions(items: any[]): any[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const normalizeDateKey = (dateStr: string): string => {
    if (!dateStr) return '';
    const s = dateStr.trim().toLowerCase();
    if (s === 'date not fixed' || s === 'tbd' || s === 'not fixed' || s === 'not specified') return '';
    return s
      .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
      .replace(/[,\-\/\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanEventName = (rawName: string): string => {
    if (!rawName) return 'Wedding Ceremony';
    let name = rawName.trim();
    if (/^(?:event|function)\s*\d+$/i.test(name)) {
      return 'Wedding Ceremony';
    }
    name = name
      .replace(/(?:event|function)\s*\d+\s*\+?\s*/gi, '')
      .replace(/\s*\+\s*$/, '')
      .replace(/^\s*\+\s*/, '')
      .trim();
    return name || 'Wedding Ceremony';
  };

  const result: any[] = [];
  const dateMap = new Map<string, any>();

  for (const rawItem of items) {
    if (!rawItem) continue;
    const item = { ...rawItem, name: cleanEventName(rawItem.name) };
    const dateKey = normalizeDateKey(item.date);

    if (dateKey && dateMap.has(dateKey)) {
      const existing = dateMap.get(dateKey);

      // 1. Combine function titles with ' + ', avoiding duplicates
      const existingParts = (existing.name || '').split('+').map((s: string) => s.trim().toLowerCase());
      const newParts = (item.name || '').split('+').map((s: string) => s.trim());
      const partsToAdd = newParts.filter((p: string) => p && !existingParts.includes(p.toLowerCase()));

      if (partsToAdd.length > 0) {
        existing.name = `${existing.name} + ${partsToAdd.join(' + ')}`;
      }

      // 2. Merge Requirements (combine quantities of identical roles)
      const reqMap = new Map<string, number>();
      (existing.requirements || []).forEach((r: any) => {
        const role = normalizeCrewRoleName(typeof r === 'string' ? r : r?.name);
        reqMap.set(role, (reqMap.get(role) || 0) + Number(r?.qty || 1));
      });
      (item.requirements || []).forEach((r: any) => {
        const role = normalizeCrewRoleName(typeof r === 'string' ? r : r?.name);
        reqMap.set(role, (reqMap.get(role) || 0) + Number(r?.qty || 1));
      });

      existing.requirements = Array.from(reqMap.entries()).map(([name, qty]) => ({ name, qty }));
      existing.team = existing.requirements.map((r: any) => `${r.qty}x ${r.name}`).join(', ');

      // 3. Merge timings
      if (!existing.startTime && item.startTime) existing.startTime = item.startTime;
      if (item.endTime) existing.endTime = item.endTime;
      if (existing.startTime && existing.endTime) {
        existing.time = `${existing.startTime} - ${existing.endTime}`;
      } else if (item.time && !existing.time) {
        existing.time = item.time;
      }

      // 4. Merge locations
      if (!existing.location && item.location) {
        existing.location = item.location;
        existing.venue = item.venue || item.location;
      } else if (item.location && existing.location && !existing.location.toLowerCase().includes(item.location.toLowerCase())) {
        existing.location = `${existing.location} / ${item.location}`;
        existing.venue = existing.location;
      }

      // 5. Merge notes
      if (item.notes && item.notes !== existing.notes) {
        existing.notes = existing.notes ? `${existing.notes} | ${item.notes}` : item.notes;
      }
    } else {
      const reqs = Array.isArray(item.requirements) && item.requirements.length > 0
        ? item.requirements.map((r: any) => ({
            name: normalizeCrewRoleName(typeof r === 'string' ? r : r?.name),
            qty: Number(r?.qty || 1)
          }))
        : [
            { name: 'Candid Photographer', qty: 1 },
            { name: 'Cinematographer', qty: 1 }
          ];

      const processedItem = {
        ...item,
        requirements: reqs,
        team: Array.isArray(item.team) ? item.team.join(', ') : (item.team || reqs.map((r: any) => `${r.qty}x ${r.name}`).join(', '))
      };

      if (dateKey) {
        dateMap.set(dateKey, processedItem);
      }
      result.push(processedItem);
    }
  }

  return result;
}

/**
 * Resolves the single primary location for the Quotation Cover Page.
 * Priority:
 * 1. Main Wedding ceremony venue (HIGHEST PRIORITY)
 * 2. Reception or Engagement venue (if no Wedding venue specified)
 * 3. First available function location
 * 4. Cleaned single city/venue from rawCoverLocation (NEVER concats multiple venues)
 */
export function resolvePrimaryCoverLocation(rawCoverLocation: string, functions: any[]): string {
  if (Array.isArray(functions) && functions.length > 0) {
    const weddingFunc = functions.find(f => {
      const n = (f?.name || '').toLowerCase();
      return (n.includes('wedding') || n.includes('vivah') || n.includes('shaadi') || n.includes('pheras')) && (f.location || f.venue);
    });
    if (weddingFunc && (weddingFunc.location || weddingFunc.venue)) {
      return String(weddingFunc.location || weddingFunc.venue).trim();
    }

    const majorFunc = functions.find(f => {
      const n = (f?.name || '').toLowerCase();
      return (n.includes('reception') || n.includes('sangeet') || n.includes('engagement') || n.includes('ring')) && (f.location || f.venue);
    });
    if (majorFunc && (majorFunc.location || majorFunc.venue)) {
      return String(majorFunc.location || majorFunc.venue).trim();
    }

    const firstWithLoc = functions.find(f => f?.location || f?.venue);
    if (firstWithLoc && (firstWithLoc.location || firstWithLoc.venue)) {
      return String(firstWithLoc.location || firstWithLoc.venue).trim();
    }
  }

  if (rawCoverLocation && typeof rawCoverLocation === 'string') {
    const s = rawCoverLocation.trim();
    if (s.includes(',') || s.includes(';') || s.includes('\n')) {
      const parts = s.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        const luxuryVenue = parts.find(p => /hotel|palace|resort|lawn|banquet|bhavan|mandap|gardens?/i.test(p));
        return luxuryVenue || parts[0];
      }
    }
    return s;
  }

  return '';
}

/**
 * Ultra-robust JSON parser that handles:
 * - Single-line and multi-line JSON
 * - Markdown code blocks (```json ... ```)
 * - Trailing commas before } and ]
 * - Smart quotes (“ ” ‘ ’)
 * - Comments (// ...)
 * - Control characters, zero-width spaces, UTF-8 BOM
 */
/**
 * Normalizes event/wedding dates to the strict standard format: "DD - MMM - YYYY" (e.g. "13 - Dec - 2026").
 * Handles ISO dates (2026-12-13), slash dates (13/12/2026), text dates (13 Dec 2026, December 13, 2026), etc.
 */
export function formatQuotationDate(raw: string | null | undefined): string {
  if (!raw) return 'Date Not Fixed';
  const str = String(raw).trim();
  if (
    !str ||
    str.toLowerCase() === 'date not fixed' ||
    str.toLowerCase() === 'tbd' ||
    str.toLowerCase() === 'date tbd' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return 'Date Not Fixed';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNameToIndex: Record<string, number> = {
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

  // 1. If already in "DD - MMM - YYYY" or "DD - MMMM - YYYY" (e.g. "13 - Dec - 2026")
  const standardMatch = str.match(/^(\d{1,2})\s*-\s*([A-Za-z]+)\s*-\s*(\d{4})$/);
  if (standardMatch) {
    const day = standardMatch[1].padStart(2, '0');
    const mLower = standardMatch[2].toLowerCase();
    const mIdx = monthNameToIndex[mLower] ?? -1;
    const mStr = mIdx >= 0 ? months[mIdx] : (standardMatch[2].charAt(0).toUpperCase() + standardMatch[2].slice(1, 3).toLowerCase());
    const year = standardMatch[3];
    return `${day} - ${mStr} - ${year}`;
  }

  // 2. Match ISO YYYY-MM-DD or YYYY/MM/DD (e.g. "2026-12-13")
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthNum = parseInt(isoMatch[2], 10) - 1;
    const day = isoMatch[3].padStart(2, '0');
    if (monthNum >= 0 && monthNum < 12) {
      return `${day} - ${months[monthNum]} - ${year}`;
    }
  }

  // 3. Match DD-MM-YYYY or DD/MM/YYYY (e.g. "13/12/2026", "13-12-2026")
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthNum = parseInt(dmyMatch[2], 10) - 1;
    const year = dmyMatch[3];
    if (monthNum >= 0 && monthNum < 12) {
      return `${day} - ${months[monthNum]} - ${year}`;
    }
  }

  // 4. Match "13 Dec 2026", "13th December 2026", "13-Dec-2026"
  const textDayMatch = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]+)[\s,-]+(\d{4})/i);
  if (textDayMatch) {
    const day = textDayMatch[1].padStart(2, '0');
    const mLower = textDayMatch[2].toLowerCase();
    const mIdx = monthNameToIndex[mLower] ?? -1;
    const mStr = mIdx >= 0 ? months[mIdx] : (textDayMatch[2].charAt(0).toUpperCase() + textDayMatch[2].slice(1, 3).toLowerCase());
    const year = textDayMatch[3];
    return `${day} - ${mStr} - ${year}`;
  }

  // 5. Match "December 13, 2026" or "Dec 13 2026"
  const monthFirstMatch = str.match(/^([A-Za-z]+)[\s-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{4})/i);
  if (monthFirstMatch) {
    const mLower = monthFirstMatch[1].toLowerCase();
    const mIdx = monthNameToIndex[mLower] ?? -1;
    const mStr = mIdx >= 0 ? months[mIdx] : (monthFirstMatch[1].charAt(0).toUpperCase() + monthFirstMatch[1].slice(1, 3).toLowerCase());
    const day = monthFirstMatch[2].padStart(2, '0');
    const year = monthFirstMatch[3];
    return `${day} - ${mStr} - ${year}`;
  }

  // 6. Native Date parse fallback
  const parsedTimestamp = Date.parse(str);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} - ${month} - ${year}`;
    }
  }

  return str;
}

export function sanitizeAndParseJson(rawText: string): any | null {
  if (!rawText || !rawText.trim()) return null;
  let text = rawText.trim();

  // 1. Strip markdown fences (including language tag or whitespace)
  const fenceMatch = text.match(/\`\`\`(?:json)?([\s\S]*?)\`\`\`/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '');
    if (text.includes('```')) {
      text = text.replace(/\`\`\`(?:json)?/gi, '').replace(/\`\`\`/g, '').trim();
    }
  }

  // 2. Normalize smart quotes and hidden zero-width unicode
  text = text.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '');
  text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  let candidate = text.substring(startIdx, endIdx + 1);

  // Quick direct parse
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}

  // Strip single-line and multi-line comments
  candidate = candidate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');

  // Remove trailing commas before } or ]
  candidate = candidate.replace(/,\s*([}\]])/g, '$1');

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}

  // Convert single-quoted keys/strings: 'key': 'val' -> "key": "val"
  try {
    let singleQuoteFixed = candidate.replace(/'([^'\\\\]*(?:\\.[^'\\\\]*)*)'/g, '"$1"');
    singleQuoteFixed = singleQuoteFixed.replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(singleQuoteFixed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}

  // Escape literal unescaped newlines/tabs inside string literals
  try {
    let inString = false;
    let escaped = false;
    let out = '';
    for (let i = 0; i < candidate.length; i++) {
      const c = candidate[i];
      if (c === '"' && !escaped) {
        inString = !inString;
        out += c;
      } else if (inString && (c === '\n' || c === '\r')) {
        out += (c === '\n' ? '\\n' : '');
      } else if (inString && c === '\t') {
        out += '\\t';
      } else {
        out += c;
      }
      escaped = (c === '\\' && !escaped);
    }
    const parsed = JSON.parse(out.replace(/,\s*([}\]])/g, '$1'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}

  return null;
}

/**
 * Normalizes input document payload, merging on top of the User's Active Default Template (baseTemplate).
 * Preserves the user's design themes, fonts, colors, branding, custom pages, and default copy!
 */
export function normalizeQuotationData(rawInput: any, baseTemplate?: any) {
  const d = baseTemplate && typeof baseTemplate === 'object' && Object.keys(baseTemplate).length > 0 
    ? baseTemplate 
    : DEFAULT_AIRY_PROPOSAL;

  if (!rawInput || typeof rawInput !== 'object') return d;

  // 1. Unwrap root wrappers if present ({ quotation: { ... } } or { pages: { ... } })
  let loaded = rawInput;
  if (loaded.quotation && typeof loaded.quotation === 'object') {
    loaded = { ...loaded, ...loaded.quotation };
  }
  const pagesObj = loaded.pages && typeof loaded.pages === 'object' ? loaded.pages : loaded;

  // 2. Normalize Functions / Events Page (Computed first so Cover Page can extract primary location)
  const funcsSrc = loaded.functionsPage || pagesObj.functions_coverage || pagesObj.functions || {};
  const rawEvents = funcsSrc.items || funcsSrc.events || funcsSrc.functions || [];
  let funcItems: any[] = [];

  if (Array.isArray(rawEvents) && rawEvents.length > 0) {
    funcItems = rawEvents.map((e: any, idx: number) => {
      let requirements: { name: string; qty: number }[] = [];
      if (Array.isArray(e.requirements) && e.requirements.length > 0) {
        requirements = e.requirements.map((r: any) => ({
          name: normalizeCrewRoleName(typeof r === 'string' ? r : (r?.name || 'Candid Photographer')),
          qty: Number(r?.qty || 1)
        }));
      } else if (Array.isArray(e.services) && e.services.length > 0) {
        requirements = e.services.map((s: string) => ({ name: normalizeCrewRoleName(s), qty: 1 }));
      } else if (e.team || e.services) {
        const teamStr = String(e.team || e.services);
        requirements = teamStr.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ name: normalizeCrewRoleName(s), qty: 1 }));
      }

      if (requirements.length === 0) {
        requirements = [
          { name: 'Traditional Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ];
      }

      const isNotFixed = e.dateNotFixed ?? (!e.date || e.date === 'Date Not Fixed' || e.date === 'TBD');
      const normalizedDate = isNotFixed ? 'Date Not Fixed' : formatQuotationDate(e.date);

      return {
        id: e.id || `func_${idx + 1}`,
        name: e.name || e.event_name || `Function ${idx + 1}`,
        date: normalizedDate,
        dateNotFixed: isNotFixed || normalizedDate === 'Date Not Fixed',
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        time: e.time || (e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : (e.time || '')),
        durationSlot: e.durationSlot || '',
        location: e.location || e.venue || '',
        venue: e.venue || e.location || '',
        notes: e.notes || '',
        requirements,
        team: Array.isArray(e.team) ? e.team.join(', ') : (e.team || requirements.map(r => `${r.qty}x ${r.name}`).join(', '))
      };
    });
  } else if (Array.isArray(d.functionsPage?.items)) {
    funcItems = d.functionsPage.items;
  }

  // ⚡ MANDATE: Automatically consolidate ceremonies occurring on the same date (e.g. Haldi + Sangeet)
  funcItems = consolidateSameDateFunctions(funcItems);

  const functionsPage = {
    ...(d.functionsPage || {}),
    ...funcsSrc,
    kicker: funcsSrc.kicker || d.functionsPage?.kicker || 'CELEBRATIONS',
    heading: funcsSrc.heading || d.functionsPage?.heading || 'Functions & Crew Coverage',
    items: funcItems
  };

  // 3. Normalize Cover Page (with single primary location resolver)
  const coverSrc = loaded.cover || pagesObj.cover || {};
  const groomName = coverSrc.groomName ?? (d.cover?.groomName || 'Rahul');
  const brideName = coverSrc.brideName ?? (d.cover?.brideName || 'Neha');
  const coupleName = coverSrc.coupleName || (coverSrc.groomName && coverSrc.brideName ? `${coverSrc.groomName} & ${coverSrc.brideName}` : (loaded.client?.client_name || d.cover?.coupleName || 'Couple Name'));
  const eventType = coverSrc.eventType ?? coverSrc.title ?? coverSrc.event_type ?? d.cover?.eventType ?? 'Wedding Photography & Films';
  
  const rawLoc = coverSrc.locationName !== undefined ? coverSrc.locationName : (coverSrc.wedding_location || coverSrc.city || d.cover?.locationName || '');
  const locationName = resolvePrimaryCoverLocation(rawLoc, funcItems);

  const rawWeddingDate = coverSrc.weddingDate || coverSrc.quotation_date || coverSrc.wedding_date || (funcItems[0]?.date !== 'Date Not Fixed' ? funcItems[0]?.date : '') || d.cover?.weddingDate || '';
  const weddingDate = formatQuotationDate(rawWeddingDate);

  const cover = {
    ...(d.cover || {}),
    ...coverSrc,
    groomName,
    brideName,
    coupleName,
    eventType,
    locationName,
    weddingDate,
    sideOption: coverSrc.sideOption || d.cover?.sideOption || 'A Wedding Story',
    brandName: d.cover?.brandName || coverSrc.brandName || '',
    brandLogoUrl: coverSrc.brandLogoUrl || d.cover?.brandLogoUrl || '',
    brandLogoSize: coverSrc.brandLogoSize || d.cover?.brandLogoSize || 80,
    photoUrl: coverSrc.photoUrl ? coverSrc.photoUrl : (d.cover?.photoUrl || ''),
    photoHeight: coverSrc.photoHeight ?? d.cover?.photoHeight ?? 360,
    photoWidth: coverSrc.photoWidth ?? d.cover?.photoWidth ?? 75,
    photoFocalY: coverSrc.photoFocalY ?? d.cover?.photoFocalY ?? 50,
    bgOpacity: coverSrc.bgOpacity ?? d.cover?.bgOpacity ?? 40,
    frameShape: coverSrc.frameShape || d.cover?.frameShape || 'rounded',
    imagePosition: coverSrc.imagePosition || d.cover?.imagePosition || 'bottom',
  };

  // 4. Normalize About Us
  const aboutSrc = loaded.aboutUs || pagesObj.about_us || {};
  const aboutUs = {
    ...(d.aboutUs || {}),
    ...aboutSrc,
    kicker: d.aboutUs?.kicker || aboutSrc.kicker || 'INTRODUCTION',
    heading: d.aboutUs?.heading || aboutSrc.heading || 'ABOUT US',
    text: (d.aboutUs?.text && d.aboutUs.text.trim().length > 15) ? d.aboutUs.text : (aboutSrc.text || d.aboutUs?.text || ''),
    signature: d.aboutUs?.signature || aboutSrc.signature || '',
    photo: aboutSrc.photo ? aboutSrc.photo : (d.aboutUs?.photo || ''),
  };

  // 5. Normalize Pre-Wedding Shoot Details
  const shootSrc = loaded.shootDetails || pagesObj.pre_wedding || {};
  const shootVisible = shootSrc.visible !== undefined 
    ? Boolean(shootSrc.visible) 
    : Boolean(shootSrc.crewText || shootSrc.deliverablesText || d.shootDetails?.visible);

  const shootDetails = {
    ...(d.shootDetails || {}),
    ...shootSrc,
    visible: shootVisible,
    kicker: d.shootDetails?.kicker || shootSrc.kicker || 'PRE-WEDDING',
    heading: d.shootDetails?.heading || shootSrc.heading || 'Pre-Wedding Shoot',
    daysText: shootSrc.daysText || d.shootDetails?.daysText || '1 Full Day Creative Session',
    crewText: shootSrc.crewText !== undefined ? shootSrc.crewText : (d.shootDetails?.crewText || ''),
    deliverablesHeading: d.shootDetails?.deliverablesHeading || shootSrc.deliverablesHeading || 'Deliverables',
    deliverablesText: shootSrc.deliverablesText !== undefined ? shootSrc.deliverablesText : (d.shootDetails?.deliverablesText || ''),
    showExclusionsNote: shootSrc.showExclusionsNote !== undefined ? Boolean(shootSrc.showExclusionsNote) : true,
    photo: shootSrc.photo ? shootSrc.photo : (d.shootDetails?.photo || ''),
  };

  // 6. Normalize Deliverables Page
  const delivSrc = loaded.deliverablesPage || pagesObj.deliverables || {};
  let delivItems: string[] = [];
  if (Array.isArray(delivSrc.selectedItems) && delivSrc.selectedItems.length > 0) {
    delivItems = delivSrc.selectedItems;
  } else if (Array.isArray(delivSrc.items) && delivSrc.items.length > 0) {
    delivItems = delivSrc.items;
  } else if (Array.isArray(d.deliverablesPage?.selectedItems)) {
    delivItems = d.deliverablesPage.selectedItems;
  }

  const combinedOptions = Array.from(new Set([
    ...(d.deliverablesPage?.availableOptions || []),
    ...(Array.isArray(delivSrc.availableOptions) ? delivSrc.availableOptions : []),
    ...delivItems
  ]));

  const deliverablesPage = {
    ...(d.deliverablesPage || {}),
    ...delivSrc,
    kicker: d.deliverablesPage?.kicker || delivSrc.kicker || 'WHAT WE DELIVER',
    heading: d.deliverablesPage?.heading || delivSrc.heading || 'DELIVERABLES',
    selectedItems: delivItems,
    availableOptions: combinedOptions
  };

  // 7. Normalize Special Value Additions
  const valAddSrc = loaded.specialValueAdditions || pagesObj.special_value_additions || {};
  const valAddItems = Array.isArray(valAddSrc.selectedItems)
    ? valAddSrc.selectedItems
    : (Array.isArray(valAddSrc.items) ? valAddSrc.items : (d.specialValueAdditions?.selectedItems || []));

  const valCombinedOptions = Array.from(new Set([
    ...(d.specialValueAdditions?.availableOptions || []),
    ...(Array.isArray(valAddSrc.availableOptions) ? valAddSrc.availableOptions : []),
    ...valAddItems
  ]));

  const specialValueAdditions = {
    ...(d.specialValueAdditions || {}),
    ...valAddSrc,
    kicker: d.specialValueAdditions?.kicker || valAddSrc.kicker || 'SPECIAL VALUE ADDITIONS',
    heading: valAddSrc.heading || d.specialValueAdditions?.heading || 'Special Value Additions',
    selectedItems: valAddItems,
    availableOptions: valCombinedOptions,
    note: valAddSrc.note || d.specialValueAdditions?.note || ''
  };

  // 8. Normalize Pricing Page (with Regular Price vs Best Offer Price Separation)
  const pricingSrc = loaded.pricingPage || pagesObj.pricing || {};
  let rawBase = pricingSrc.regularPrice ?? pricingSrc.regular_price ?? pricingSrc.basePrice ?? pricingSrc.base_price ?? pricingSrc.total_amount ?? pricingSrc.base ?? d.pricingPage?.basePrice ?? 150000;
  if (typeof rawBase === 'string') rawBase = Number(rawBase.replace(/[^\d.-]/g, '')) || 0;
  const basePrice = Math.max(0, Math.round(Number(rawBase)));

  let rawDiscount = pricingSrc.discountAmount ?? pricingSrc.discount_amount ?? pricingSrc.discount ?? 0;
  if (typeof rawDiscount === 'string') rawDiscount = Number(rawDiscount.replace(/[^\d.-]/g, '')) || 0;
  let discountAmount = Math.max(0, Math.round(Number(rawDiscount)));

  const rawBest = pricingSrc.bestPrice ?? pricingSrc.best_price ?? pricingSrc.offerPrice ?? pricingSrc.offer_price;
  if (rawBest !== undefined) {
    const bestNum = typeof rawBest === 'string' ? (Number(rawBest.replace(/[^\d.-]/g, '')) || 0) : Number(rawBest);
    if (bestNum > 0 && basePrice > bestNum && discountAmount === 0) {
      discountAmount = Math.max(0, basePrice - bestNum);
    }
  }
  const gstPct = Number(pricingSrc.gstPct ?? pricingSrc.gstPercent ?? (d.pricingPage?.gstPct || 0));
  const travelCharges = Number(pricingSrc.travelCharges ?? pricingSrc.travel ?? 0);
  const accommodationCharges = Number(pricingSrc.accommodationCharges ?? pricingSrc.accommodation ?? 0);
  const additionalCharges = Number(pricingSrc.additionalCharges ?? pricingSrc.additional ?? 0);

  const pricingPage = {
    ...(d.pricingPage || {}),
    ...pricingSrc,
    kicker: d.pricingPage?.kicker || pricingSrc.kicker || 'INVESTMENT & BREAKDOWN',
    heading: d.pricingPage?.heading || pricingSrc.heading || 'PRICING DETAILS',
    basePrice,
    discountAmount,
    gstPct,
    travelCharges,
    accommodationCharges,
    additionalCharges,
    showExclusionsNote: pricingSrc.showExclusionsNote !== undefined ? Boolean(pricingSrc.showExclusionsNote) : true,
    note: pricingSrc.note || d.pricingPage?.note || ''
  };

  // 9. Normalize Payment Terms Page
  const payTermsSrc = loaded.paymentTermsPage || pagesObj.payment_terms || {};
  const netAmount = Math.max(0, basePrice - discountAmount + travelCharges + accommodationCharges + additionalCharges);

  let paySteps = payTermsSrc.steps || [];
  if (!Array.isArray(paySteps) || paySteps.length === 0) {
    if (Array.isArray(d.paymentTermsPage?.steps) && d.paymentTermsPage.steps.length > 0) {
      paySteps = d.paymentTermsPage.steps.map((s: any) => ({
        ...s,
        amount: Math.round(netAmount * (parseInt(s.pct, 10) || 30) / 100)
      }));
    } else {
      paySteps = [
        { name: 'Advance Token', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' },
        { name: 'On Event Day', pct: '50%', amount: Math.round(netAmount * 0.50), status: 'Pending' },
        { name: 'On Final Delivery', pct: '25%', amount: Math.round(netAmount * 0.25), status: 'Pending' }
      ];
    }
  } else {
    paySteps = paySteps.map((s: any) => ({
      name: s.name || 'Payment Milestone',
      pct: s.pct || '30%',
      amount: Number(s.amount || 0),
      status: s.status || 'Pending'
    }));
  }

  const paymentTermsPage = {
    ...(d.paymentTermsPage || {}),
    ...payTermsSrc,
    kicker: payTermsSrc.kicker || d.paymentTermsPage?.kicker || 'SCHEDULE',
    heading: payTermsSrc.heading || d.paymentTermsPage?.heading || 'Payment Milestones & Commercial Terms',
    steps: paySteps,
    note: payTermsSrc.note || d.paymentTermsPage?.note || ''
  };

  // 10. Normalize Thank You Page
  const thankSrc = loaded.thankYouPage || pagesObj.thank_you || {};
  const thankYouPage = {
    ...(d.thankYouPage || {}),
    ...thankSrc,
    kicker: d.thankYouPage?.kicker || thankSrc.kicker || 'GRATITUDE',
    heading: d.thankYouPage?.heading || thankSrc.heading || 'THANK YOU',
    brandName: d.thankYouPage?.brandName || thankSrc.brandName || d.cover?.brandName || '',
    contactPerson: d.thankYouPage?.contactPerson || thankSrc.contactPerson || '',
    phone: thankSrc.phone || d.thankYouPage?.phone || '',
    email: thankSrc.email || d.thankYouPage?.email || '',
    website: thankSrc.website || d.thankYouPage?.website || '',
    social: thankSrc.social || thankSrc.instagramHandle || thankSrc.instagram || d.thankYouPage?.social || '',
    instagramHandle: thankSrc.instagramHandle || thankSrc.instagram || thankSrc.social || d.thankYouPage?.instagramHandle || '',
    instagramUrl: thankSrc.instagramUrl || thankSrc.instagram_url || d.thankYouPage?.instagramUrl || '',
    photo: thankSrc.photo ? thankSrc.photo : (d.thankYouPage?.photo || ''),
    signature: d.thankYouPage?.signature || thankSrc.signature || '',
    subHeading: d.thankYouPage?.subHeading || thankSrc.subHeading || '',
  };

  // 11. Normalize Terms Page
  const termsSrc = loaded.termsPage || pagesObj.terms_conditions || {};
  const termsPage = {
    ...(d.termsPage || {}),
    ...termsSrc,
    visible: termsSrc.visible !== undefined ? Boolean(termsSrc.visible) : (d.termsPage?.visible ?? true),
    terms: Array.isArray(termsSrc.terms) && termsSrc.terms.length > 0 ? termsSrc.terms : (d.termsPage?.terms || [])
  };

  // 12. Calculate Active Page Sequence from Page Visibility Flags
  const toPageSequenceItem = (rawItem: any): PageSequenceItem => {
    if (typeof rawItem === 'string') {
      const std = STANDARD_PAGE_DEFINITIONS.find(s => s.type === rawItem);
      return {
        id: `${rawItem}-std`,
        type: rawItem,
        label: std?.label || rawItem.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        isStandard: !!std
      };
    }
    if (rawItem && typeof rawItem === 'object') {
      const typeStr = rawItem.type || rawItem.id || 'cover';
      const std = STANDARD_PAGE_DEFINITIONS.find(s => s.type === typeStr);
      return {
        id: rawItem.id || `${typeStr}-std`,
        type: typeStr,
        label: rawItem.label || std?.label || typeStr,
        isStandard: rawItem.isStandard ?? !!std,
        customId: rawItem.customId
      };
    }
    return { id: 'cover-std', type: 'cover', label: 'Cover Page', isStandard: true };
  };

  let finalPageSequence: PageSequenceItem[] = [];

  if (Array.isArray(loaded.pageSequence) && loaded.pageSequence.length > 0) {
    finalPageSequence = loaded.pageSequence.map(toPageSequenceItem);
  } else if (Array.isArray(d.pageSequence) && d.pageSequence.length > 0) {
    finalPageSequence = d.pageSequence
      .map(toPageSequenceItem)
      .filter((p: PageSequenceItem) => {
        if (p.type === 'shootDetails' && !shootDetails.visible) return false;
        if (p.type === 'termsPage' && termsPage.visible === false) return false;
        return true;
      });
  } else {
    const rawTypes: string[] = ['cover', 'aboutUs'];
    if (shootDetails.visible) rawTypes.push('shootDetails');
    rawTypes.push('functionsPage');
    rawTypes.push('deliverablesPage');
    if (specialValueAdditions.selectedItems && specialValueAdditions.selectedItems.length > 0) {
      rawTypes.push('specialValueAdditions');
    }
    rawTypes.push('pricingPage');
    if (paymentTermsPage.steps && paymentTermsPage.steps.length > 0) {
      rawTypes.push('paymentTermsPage');
    }

    const addOnsSrc = loaded.addOnsPage || pagesObj.add_ons;
    if (addOnsSrc?.visible === true && Array.isArray(addOnsSrc.items) && addOnsSrc.items.length > 0) {
      rawTypes.push('addOnsPage');
    }

    if (termsPage.visible !== false) rawTypes.push('termsPage');
    rawTypes.push('thankYouPage');

    finalPageSequence = rawTypes.map(toPageSequenceItem);
  }

  return {
    ...d,
    ...loaded,
    look: d.look || loaded.look || 'cyprus-sand-dune',
    theme: d.theme || d.look || loaded.theme || 'cyprus-sand-dune',
    primaryFont: d.primaryFont || loaded.primaryFont || 'Cormorant Garamond',
    secondaryFont: d.secondaryFont || loaded.secondaryFont || 'Plus Jakarta Sans',
    designName: d.designName || loaded.designName || 'Minimalist Airy Proposal',
    colorPalette: d.colorPalette || loaded.colorPalette,
    cover,
    aboutUs,
    shootDetails,
    functionsPage,
    deliverablesPage,
    specialValueAdditions,
    pricingPage,
    paymentTermsPage,
    termsPage,
    thankYouPage,
    customPages: Array.isArray(loaded.customPages) && loaded.customPages.length > 0 ? loaded.customPages : (d.customPages || []),
    pageSequence: finalPageSequence
  };
}

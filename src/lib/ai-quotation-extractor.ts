import { 
  DEFAULT_AIRY_PROPOSAL, 
  normalizeQuotationData, 
  consolidateSameDateFunctions, 
  resolvePrimaryCoverLocation, 
  sanitizeAndParseJson,
  formatQuotationDate
} from '@/lib/quotation-defaults';
import { isPlaceholderCoupleName } from '@/lib/quotation-defaults';

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

  // Capitalize custom role nicely
  return rawRole.trim().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Normalizes Hindi / Marathi counting words and numerals to standard numeric equivalents.
 */
export function normalizeHindiNumberWords(raw: string): string {
  let s = (raw || '').toLowerCase();
  const wordMap: Array<{ regex: RegExp; val: string }> = [
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
  for (const item of wordMap) {
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

  const digitsMatch = s.match(/[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7}/);
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

  // 1. Travel charges
  const travelMatch = text.match(/(?:travel|travelling|traveling|यात्रा|ट्रैवल|सफर)\s*(?:charges|cost|expense|खर्चा)?[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)(?!\s*[%])/i) ||
                      text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:travel|travelling|यात्रा|ट्रैवल)(?!\s*[%])/i);
  if (travelMatch) {
    travelCharges = parseCurrencyAmount(travelMatch[1]);
  }

  // 2. Stay / Accommodation charges
  const stayMatch = text.match(/(?:stay|accommodation|hotel|कमरा|रहना|होटल)\s*(?:charges|cost|expense|खर्चा)?[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)(?!\s*[%])/i) ||
                    text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:stay|accommodation|hotel|होटल)(?!\s*[%])/i);
  if (stayMatch) {
    accommodationCharges = parseCurrencyAmount(stayMatch[1]);
  }

  // 3. Discount calculation (Check early to cleanly isolate discount amount from package price)
  const discPctMatch = text.match(/([0-9.]+)\s*%\s*(?:discount|off|छूट)/i) || 
                       text.match(/(?:discount|off|छूट)[:\s]*([0-9.]+)\s*%/i);
  let discPct = 0;
  if (discPctMatch) {
    discPct = parseFloat(discPctMatch[1]) || 0;
  }

  const discFlatMatch = text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:discount|off|minus|डिस्काउंट|छूट)(?!\s*[%])/i) ||
                        text.match(/(?:discount|off|minus|concession|less|छूट|कम|डिस्काउंट)[:\s]+([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)(?!\s*[%])/i);
  if (discFlatMatch) {
    discountAmount = parseCurrencyAmount(discFlatMatch[1]);
  }

  // 4. Additional charges (album, drone add-on)
  const albumMatch = text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:album|photobook|एल्बम)/i) ||
                     text.match(/(?:album|photobook|एल्बम)\s*[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)/i);
  if (albumMatch) {
    const val = parseCurrencyAmount(albumMatch[1]);
    if (val > 0 && val < 100000) additionalCharges += val;
  }

  const droneMatch = text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:drone|ड्रोन)/i) ||
                     text.match(/(?:drone|ड्रोन)\s*[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)/i);
  if (droneMatch) {
    const val = parseCurrencyAmount(droneMatch[1]);
    if (val > 0 && val < 100000) additionalCharges += val;
  }

  // 5. Per day / Per event multiplication e.g. '35,000 per day for 2 days' or '40k per day x 3 days'
  const multiDayMatch = text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:per\s*day|per\s*event|per\s*function|दिन|डे)\s*(?:[x*]|for|into)?\s*(\d+)\s*(?:days|events|functions|दिन)?/i) ||
                        text.match(/(\d+)\s*(?:days|events|functions|दिन)\s*(?:into|[x*]|@)?\s*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:per\s*day|per\s*event)?/i);
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
      const regex = new RegExp(evt + '[^0-9]{1,15}([0-9]+(?:[.,][0-9]+)*(?:\\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)', 'i');
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

  // 7. Direct package / regular / budget price
  if (!basePrice) {
    const pkgMatch = text.match(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)\s*(?:का\s*पैकेज|का\s*बजट|का\s*कोटेशन|ka\s*package|ka\s*budget|package|budget|बजट|पैकेज)/i) ||
                     text.match(/(?:package|budget|total|price|cost|investment|बजट|पैकेज|कोटेशन)[:\s]+([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)(?!\s*[%])/i);
    if (pkgMatch) {
      basePrice = parseCurrencyAmount(pkgMatch[1]);
    }
  }

  // 8. Fallback to any prominent amount in text (excluding discount amount)
  if (!basePrice) {
    const numbers = [...text.matchAll(/([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand|हजार|हज़ार))?)/gi)]
      .map(m => parseCurrencyAmount(m[1]))
      .filter(n => n >= 15000 && n !== discountAmount && n !== travelCharges);
    if (numbers.length > 0) {
      basePrice = numbers[0];
    }
  }

  if (!basePrice) basePrice = defaultPrice;

  // Apply percentage discount if found
  if (discPct > 0 && !discountAmount) {
    discountAmount = Math.round((basePrice * discPct) / 100);
  }

  // Check regular vs best offer price
  if (!discountAmount) {
    const regMatch = text.match(/(?:regular|standard|actual)[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand))?)/i);
    const offerMatch = text.match(/(?:offer|deal|final|special|best)[:\s]*([0-9]+(?:[.,][0-9]+)*(?:\s*(?:lakh|lac|k|thousand))?)/i);
    if (regMatch && offerMatch) {
      const reg = parseCurrencyAmount(regMatch[1]);
      const off = parseCurrencyAmount(offerMatch[1]);
      if (reg > off && off > 0) {
        basePrice = reg;
        discountAmount = reg - off;
      }
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
      return mapAiOutputToQuotationDocument(directParsed, {}, contextData);
    }
  }

  const leadInfo = contextData.lead_info || {};
  const raw = contextData.raw_form_fields || {};
  const meta = contextData.meta_fields || {};
  const notes = `${userNotes}\n${contextData.notes_and_comments || ''}`;
  const fullText = `${notes} ${JSON.stringify(raw)} ${JSON.stringify(meta)}`.toLowerCase();

  // 1. Couple & Names
  let leadName = '';

  // Check explicit "Couple: X & Y" or "Couple name: X and Y" or "Client: X & Y"
  const explicitMatch = userNotes.match(/(?:couple(?:\s*name)?|client(?:\s*name)?|bride\s*(?:&|and)\s*groom|groom\s*(?:&|and)\s*bride)[:\s]+([A-Za-z\u0900-\u097F\s&'+.-]+?)(?=\s+(?:wedding|marriage|shaadi|quotation|proposal|haldi|sangeet|reception|mehendi|event|shoot|budget|price|rate|cost|date|on|\d|₹|rs|all|deliverable)|[,\n\r.]|$)/i);
  if (explicitMatch && explicitMatch[1].trim()) {
    leadName = explicitMatch[1].trim();
  }

  // Hindi Couple Name matching e.g. "कपल का नाम रहेगा रौनक और प्रेक्षा" or "कपल नेम राहुल नेहा"
  if (!leadName) {
    const hindiCoupleMatch = userNotes.match(/(?:कपल(?:\s*का)?\s*नाम(?:\s*रहेगा)?|कपल\s*नेम|कपल|जो\s*की\s*रहेगा|जो\s*रहेगा|कोटेशन\s*रहेगा|रहेगा|कोटेशन\s*बनाना\s*है)[:\s]*([\u0900-\u097Fa-zA-Z\s&'+.-]+?)(?=\s+(?:वेडिंग|शादी|लग्न|कोटेशन|हल्दी|संगीत|रिसेप्शन|मेहंदी|तारीख|बजट|\d|ऑल|all|का|की|के|है)|[,\n\r.]|$)/i);
    if (hindiCoupleMatch && hindiCoupleMatch[1].trim()) {
      leadName = hindiCoupleMatch[1].trim();
    }
  }

  // Check for standalone couple name pattern e.g. "Sagar & Vruddhi" or "Rahul and Pooja"
  if (!leadName) {
    const couplePatternMatch = userNotes.match(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])([A-Za-z\u0900-\u097F]{2,20}\s*(?:&|weds|and|\+|तथा|और)\s*[A-Za-z\u0900-\u097F]{2,20})(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i);
    if (couplePatternMatch && couplePatternMatch[1]?.trim()) {
      leadName = couplePatternMatch[1].trim();
    }
  }

  // Check for "X और Y का कोटेशन / शादी" pattern
  if (!leadName) {
    const hindiKaMatch = userNotes.match(/(?:^|[^\u0900-\u097Fa-zA-Z0-9])([A-Za-z\u0900-\u097F]{2,20}\s*(?:&|weds|and|\+|तथा|और)\s*[A-Za-z\u0900-\u097F]{2,20})\s*(?:का|की|के)\s*(?:कोटेशन|वेडिंग|शादी|इवेंट)/i);
    if (hindiKaMatch && hindiKaMatch[1]?.trim()) {
      leadName = hindiKaMatch[1].trim();
    }
  }

  // Check for "Quotation for X & Y" or "quote for X & Y"
  if (!leadName) {
    const forMatch = userNotes.match(/(?:quotation\s+for|quote\s+for|proposal\s+for|for)\s+([A-Za-z\u0900-\u097F\s&]+?)(?=\s+(?:wedding|reception|event|pre-wedding|haldi|sangeet|on|date|budget|\d)|[,\n\r.]|$)/i);
    if (forMatch && forMatch[1].trim()) {
      leadName = forMatch[1].trim();
    }
  }

  // Common Hindi name transliterations
  const HINDI_NAME_TRANSLATE: Record<string, string> = {
    'संस्कृति': 'Sanskriti',
    'रूपेश': 'Rupesh',
    'संस्कृती': 'Sanskriti',
    'रौनक': 'Raunak',
    'प्रेक्षा': 'Preksha',
    'सागर': 'Sagar',
    'रिद्धि': 'Riddhi',
    'रोहन': 'Rohan',
    'पूजा': 'Pooja',
    'राहुल': 'Rahul',
    'नेहा': 'Neha',
    'मोनालिसा': 'Monalisha',
    'अथर्व': 'Atharva',
    'साक्षी': 'Sakshi',
    'संदीप': 'Sandeep',
    'प्रिया': 'Priya',
    'अनुजा': 'Anuja',
    'हर्षल': 'Harshal',
    'अमन': 'Aman',
    'श्रद्धा': 'Shraddha',
    'ध्रुव': 'Dhruv',
    'विशाल': 'Vishal',
    'सुमती': 'Sumati',
    'यश': 'Yash',
    'हर्षिता': 'Harshita',
    'मंथन': 'Manthan',
    'और': '&',
    'तथा': '&',
    'व': '&',
    'एंड': '&'
  };

  let cleanNameStr = leadName;
  for (const [k, v] of Object.entries(HINDI_NAME_TRANSLATE)) {
    cleanNameStr = cleanNameStr.replace(new RegExp(`(^|[^\\u0900-\\u097Fa-zA-Z0-9])${k}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'gi'), `$1${v}`);
  }
  cleanNameStr = cleanNameStr.replace(/\s+/g, ' ').trim();

  // If no name extracted from notes or placeholder name, fallback to Lead record from CRM
  if (!cleanNameStr || isPlaceholderCoupleName(cleanNameStr)) {
    const candidateLeadName = 
      raw.couple_name || 
      raw.client_name || 
      raw.bride_and_groom || 
      raw.groom_and_bride || 
      leadInfo.name || 
      raw.name || 
      raw.full_name || 
      '';
    if (candidateLeadName && !isPlaceholderCoupleName(candidateLeadName)) {
      cleanNameStr = String(candidateLeadName).trim();
    }
  }

  let groomName = '';
  let brideName = '';
  let coupleName = '';

  const splitRegex = /\s*(?:&|weds|and|\+|तथा|और)\s*/i;
  const stripKeywords = (s: string) => {
    return s.replace(/\s+(?:wedding|marriage|shaadi|quotation|proposal|haldi|sangeet|reception|mehendi|event|shoot|budget|price|rate|cost|date|on|\d|all|deliverable|days|day).*$/i, '').trim();
  };

  if (splitRegex.test(cleanNameStr)) {
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
    brideName = 'Partner';
    coupleName = 'Client & Partner';
  }

  // 2. Event Type
  let eventType = 'Wedding';
  const hasNegativePreWed = /प्री-?वेडिंग नहीं|प्री ?वेडिंग नाहीं|no pre-?wedding|not have pre-?wedding/i.test(fullText);
  const hasPreWed = !hasNegativePreWed && (fullText.includes('pre wedding') || fullText.includes('pre-wedding') || fullText.includes('prewedding') || fullText.includes('previewing') || fullText.includes('pre-shoot') || fullText.includes('pre shoot'));
  const hasWed = fullText.includes('wedding') || fullText.includes('marriage') || fullText.includes('shaadi') || fullText.includes('वेडिंग') || fullText.includes('शादी');
  const hasEng = fullText.includes('engagement') || fullText.includes('roka') || fullText.includes('ring ceremony') || fullText.includes('सगाई');

  if (hasPreWed && hasWed) {
    eventType = 'Pre-Wedding & Wedding';
  } else if (hasPreWed && !hasWed) {
    eventType = 'Pre-Wedding';
  } else if (hasEng && !hasWed) {
    eventType = 'Engagement';
  } else if (fullText.includes('reception')) {
    eventType = 'Wedding & Reception';
  } else if (fullText.includes('maternity')) {
    eventType = 'Maternity Shoot';
  }

  // 3. Location / Venue
  let location = '';
  if (userNotes) {
    const locMatch = userNotes.match(/(?:at|in|venue|location|city|destination)[:\s]+([A-Za-z0-9\s,]+)/i);
    if (locMatch) {
      location = locMatch[1].split('\n')[0].trim();
    }
  }
  if (!location) {
    location = raw.venue || raw.location || raw.city || raw.destination || '';
  }

  // 4. Dates
  let weddingDate = '';
  const dateMatch = userNotes.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:\d{2,4})?)\b/i);
  if (dateMatch) {
    weddingDate = dateMatch[1];
  } else if (raw.event_date || raw.wedding_date || raw.date || raw.wedding_month || raw.month) {
    weddingDate = raw.event_date || raw.wedding_date || raw.date || raw.wedding_month || raw.month;
  }
  const isDateNotFixed = !weddingDate || fullText.includes('not fix') || fullText.includes('not fixed') || fullText.includes('tbd');
  if (isDateNotFixed && !weddingDate) {
    weddingDate = 'Date Not Fixed';
  }

  // 5. Intelligent Mathematical Pricing & Method Evaluation (Evaluates formulas, multipliers, additions & discounts like Gemini & ChatGPT)
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

  // Extract custom times and location from notes
  let customStartTime = '';
  let customEndTime = '';
  const startMatch = userNotes.match(/(?:startTime|start_time|start|from|timing)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?)["']?/i);
  if (startMatch) customStartTime = startMatch[1].trim();

  const endMatch = userNotes.match(/(?:endTime|end_time|end|to)[:\s]+["']?([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?)["']?/i);
  if (endMatch) customEndTime = endMatch[1].trim();

  if (!location) {
    const locMatch2 = userNotes.match(/(?:location|venue|at|in)[:\s]+["']?([^"\n,}]+)["']?/i);
    if (locMatch2) location = locMatch2[1].trim();
  }

  // Extract requirements from notes if specified
  const parsedRequirements: any[] = [];

  // Check for Semi Cinematic / Semi Kinematic
  if (
    fullText.includes('semi-cinematic') || 
    fullText.includes('semi cinematic') || 
    fullText.includes('semi-kinematic') || 
    fullText.includes('semi kinematic') || 
    fullText.includes('semi cine') ||
    fullText.includes('semi-cine')
  ) {
    parsedRequirements.push({ name: 'Semi Cinematic', qty: 1 });
  }

  // Check for Semi Standard / Semi Traditional
  if (
    fullText.includes('semi-standard') || 
    fullText.includes('semi standard') || 
    fullText.includes('semi-traditional') || 
    fullText.includes('semi traditional') || 
    fullText.includes('semi trad') ||
    fullText.includes('semi-trad')
  ) {
    parsedRequirements.push({ name: 'Semi Standard', qty: 1 });
  }

  const reqMatches = [...userNotes.matchAll(/(?:name|role)?[:\s]*["']?([A-Za-z\s]+(?:Photographer|Videographer|Cinematographer|Drone|Pilot|Assistant|Creator|Person))["']?/gi)];
  if (reqMatches.length > 0) {
    reqMatches.forEach((m) => {
      const normalized = normalizeCrewRoleName(m[1]);
      if (normalized && !parsedRequirements.some(r => r.name === normalized)) {
        parsedRequirements.push({ name: normalized, qty: 1 });
      }
    });
  }
  // Check studio shortcuts for crew and pricing before creating functions
  const studioShortcuts: any[] = Array.isArray(contextData.studioSettings?.aiRules?.shortcuts)
    ? contextData.studioSettings.aiRules.shortcuts
    : [];

  let shortcutCrew: Array<{ name: string; qty: number }> | null = null;
  let shortcutDeliverables: string[] = [];

  for (const sc of studioShortcuts) {
    if (!sc.trigger) continue;
    const trigLower = sc.trigger.toLowerCase().trim();
    const words = trigLower.split(/\s+/);
    const isMatch = fullText.includes(trigLower) || 
      words.every(w => fullText.includes(w)) ||
      (trigLower.includes('deliverable') && (fullText.includes('ऑल डिलीवरेबल्स') || fullText.includes('all deliverable')));

    if (isMatch) {
      if (Array.isArray(sc.mappedCrew) && sc.mappedCrew.length > 0) {
        shortcutCrew = sc.mappedCrew;
      }
      if (Array.isArray(sc.mappedDeliverables) && sc.mappedDeliverables.length > 0) {
        shortcutDeliverables.push(...sc.mappedDeliverables);
      }
      if (sc.mappedPrice && (!priceMatches.length && !budget)) {
        basePrice = sc.mappedPrice;
      }
    }
  }

  const defaultRequirements = parsedRequirements.length > 0 
    ? parsedRequirements 
    : (shortcutCrew && shortcutCrew.length > 0 
        ? shortcutCrew 
        : [
            { name: 'Candid Photographer', qty: 1 },
            { name: 'Cinematographer', qty: 1 }
          ]);

  // 6. Functions & Coverage Extraction
  const functions: any[] = [];
  const knownEvents = [
    { key: 'haldi + sangeet', name: 'Haldi + Sangeet' },
    { key: 'haldi', name: 'Haldi' },
    { key: 'mehendi', name: 'Mehendi' },
    { key: 'sangeet', name: 'Sangeet' },
    { key: 'wedding', name: 'Wedding' },
    { key: 'reception', name: 'Reception' },
    { key: 'engagement', name: 'Ring Ceremony' },
    { key: 'cocktail', name: 'Cocktail Party' },
    { key: 'mayra', name: 'Mayra Function' },
    { key: 'ganesh puja', name: 'Ganesh Puja' }
  ];

  // Check multi-event combinations first
  let remainingText = fullText;
  if (remainingText.includes('haldi') && remainingText.includes('sangeet') && (remainingText.includes('same day') || remainingText.includes('haldi + sangeet') || remainingText.includes('haldi & sangeet'))) {
    functions.push({
      id: 'func-ai-1',
      name: 'Haldi + Sangeet',
      date: weddingDate || 'Date Not Fixed',
      dateNotFixed: isDateNotFixed,
      startTime: customStartTime,
      endTime: customEndTime,
      location: location || '',
      requirements: defaultRequirements,
      notes: ''
    });
    remainingText = remainingText.replace(/haldi/g, '').replace(/sangeet/g, '');
  }

  knownEvents.forEach((evt, idx) => {
    if (remainingText.includes(evt.key)) {
      functions.push({
        id: `func-ai-${idx + 2}`,
        name: evt.name,
        date: weddingDate || 'Date Not Fixed',
        dateNotFixed: isDateNotFixed,
        startTime: customStartTime,
        endTime: customEndTime,
        location: location || '',
        requirements: defaultRequirements,
        notes: ''
      });
    }
  });

  if (functions.length === 0) {
    functions.push({
      id: 'func-ai-def',
      name: 'Wedding',
      date: weddingDate || 'Date Not Fixed',
      dateNotFixed: isDateNotFixed,
      startTime: customStartTime,
      endTime: customEndTime,
      location: location || '',
      requirements: defaultRequirements,
      notes: ''
    });
  }

  // 7. Studio Settings Deliverables & Shorthands Sync
  const studioDeliverables: string[] = Array.isArray(contextData.studioSettings?.deliverables)
    ? contextData.studioSettings.deliverables
        .map((d: any) => typeof d === 'string' ? d : d?.title)
        .filter(Boolean)
    : [];

  let deliverables: string[] = [];

  // Check if "all deliverables" or "all droppers" trigger was spoken or requested (Unicode safe for Hindi/Marathi/English)
  const hasAllDeliverablesRequested = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(fullText);

  // Check if any custom shortcut triggered mapped deliverables (using previously declared shortcutDeliverables)
  for (const sc of studioShortcuts) {
    if (!sc.trigger) continue;
    const trigLower = sc.trigger.toLowerCase().trim();
    if (fullText.includes(trigLower) || trigLower.split(/\s+/).every((w: string) => fullText.includes(w))) {
      if (Array.isArray(sc.mappedDeliverables) && sc.mappedDeliverables.length > 0) {
        shortcutDeliverables.push(...sc.mappedDeliverables);
      }
      if (sc.mappedPrice && (!priceMatches.length && !budget)) {
        basePrice = sc.mappedPrice;
      }
    }
  }

  if (hasAllDeliverablesRequested && studioDeliverables.length > 0) {
    // ⚡ FULL SYNC: Add ALL deliverables configured in Quotation Settings!
    deliverables = [...studioDeliverables];
  } else if (shortcutDeliverables.length > 0) {
    deliverables = [...new Set(shortcutDeliverables)];
  } else if (studioDeliverables.length > 0) {
    // If user mentioned specific words, match against studio deliverables catalog
    const matchedStudioDelivs = studioDeliverables.filter((title: string) => {
      const tLower = title.toLowerCase();
      if (tLower.includes('teaser') && fullText.includes('teaser')) return true;
      if (tLower.includes('highlight') && (fullText.includes('highlight') || fullText.includes('film'))) return true;
      if (tLower.includes('traditional') && (fullText.includes('traditional') || fullText.includes('long video'))) return true;
      if (tLower.includes('album') && (fullText.includes('album') || fullText.includes('photobook'))) return true;
      if (tLower.includes('reel') && (fullText.includes('reel') || fullText.includes('instagram'))) return true;
      if (tLower.includes('raw') && (fullText.includes('raw') || fullText.includes('hard drive'))) return true;
      if (tLower.includes('edited') && (fullText.includes('edited') || fullText.includes('photos') || fullText.includes('images'))) return true;
      return false;
    });

    if (matchedStudioDelivs.length > 0) {
      deliverables = matchedStudioDelivs;
    } else {
      deliverables = studioDeliverables.slice(0, 6);
    }
  } else {
    // Base fallback if no studio deliverables configured
    deliverables = [
      'All Raw Photos & Footage in Hard Drive',
      'Cinematic Wedding Highlight Film (15-20 Min)',
      'Cinematic Wedding Teaser (1-2 Min)',
      '3 Instagram Reels',
      'Traditional Long Video (2-3 Hours)',
      'Custom Printed Coffee Table Album'
    ];
  }

  return {
    cover: {
      coupleName,
      groomName,
      brideName,
      eventType,
      locationName: location
    },
    shootDetails: {
      visible: hasPreWed,
      daysText: '1 Day Shoot',
      crewText: 'Candid Photography\nCinematography\nDrone Pilot',
      deliverablesText: 'Full Ultra HD Super-Fine Raw Photos\nApprox. 50 High Resolution Edited Images\n1 Teaser Video Reel',
      showExclusionsNote: true
    },
    functionsPage: {
      items: functions
    },
    deliverablesPage: {
      selectedItems: deliverables
    },
    specialValueAdditions: {
      selectedItems: fullText.includes('free drone') ? ['Complimentary Drone Coverage'] : [],
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
}

/**
 * Maps raw AI extraction result into the exact StudioCore Quotation JSON document structure.
 */
export function mapAiOutputToQuotationDocument(aiData: any, baseSchema: any, contextData: any) {
  const rootObj = aiData.quotation || aiData;

  // Check if user's notes or prompt explicitly confirmed any payment/advance was already received
  const allUserNotes = [
    contextData?.additionalNotes,
    contextData?.leadNotes,
    contextData?.notes,
    aiData?.notes
  ].filter(Boolean).join(' ').toLowerCase();

  const hasExplicitPaymentReceived = /\b(advance received|advance paid|already paid|already received|payment received|token received|token paid|amount received|amount paid)\b/i.test(allUserNotes);

  // Check if rootObj is ALREADY a structured StudioCore Quotation JSON document
  if (rootObj.cover || rootObj.functionsPage || rootObj.pricingPage || rootObj.pages) {
    const normDoc = normalizeQuotationData(rootObj, baseSchema);

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

    // Normalize crew role names and filter out pre-wedding cards from functionsPage
    if (normDoc.functionsPage?.items && Array.isArray(normDoc.functionsPage.items)) {
      const nonPreWedItems = normDoc.functionsPage.items.filter((fn: any) => {
        const nameLower = (fn.name || '').toLowerCase();
        return !nameLower.includes('pre-wedding') && !nameLower.includes('prewedding') && !nameLower.includes('pre wedding') && !nameLower.includes('previewing');
      });
      const itemsToKeep = nonPreWedItems.length > 0 ? nonPreWedItems : normDoc.functionsPage.items;
      const mappedItems = itemsToKeep.map((fn: any) => ({
        ...fn,
        name: fn.name || 'Wedding',
        date: fn.dateNotFixed ? 'Date Not Fixed' : formatQuotationDate(fn.date),
        dateNotFixed: fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed'),
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        location: fn.location || '',
        notes: fn.notes || '',
        requirements: Array.isArray(fn.requirements)
          ? fn.requirements.map((r: any) => ({
              name: normalizeCrewRoleName(typeof r === 'string' ? r : r.name || ''),
              qty: Number(r.qty || 1)
            }))
          : [
              { name: 'Candid Photographer', qty: 1 },
              { name: 'Cinematographer', qty: 1 }
            ]
      }));

      // ⚡ MANDATE: Automatically merge same-date events (e.g. Haldi + Sangeet)
      normDoc.functionsPage.items = consolidateSameDateFunctions(mappedItems);
    }

    // ⚡ MANDATE: Resolve single primary cover location (Wedding first, no multi-venue concatenation)
    if (normDoc.cover) {
      normDoc.cover.locationName = resolvePrimaryCoverLocation(
        normDoc.cover.locationName || '', 
        normDoc.functionsPage?.items || []
      );
    }

    // Filter out any pre-wedding deliverables from deliverablesPage
    if (normDoc.deliverablesPage?.selectedItems && Array.isArray(normDoc.deliverablesPage.selectedItems)) {
      normDoc.deliverablesPage.selectedItems = normDoc.deliverablesPage.selectedItems.filter((item: string) => {
        const itemLower = String(item || '').toLowerCase();
        return !itemLower.includes('pre-wedding') && !itemLower.includes('prewedding') && !itemLower.includes('pre wedding') && !itemLower.includes('previewing');
      });
    }

    // ⚡ FULL DELIVERABLES SYNC: If user requested "all deliverables", inject ALL deliverables from Studio Settings!
    const allNotesText = [
      contextData?.additional_user_notes,
      contextData?.notes_and_comments,
      contextData?.additionalNotes
    ].filter(Boolean).join(' ').toLowerCase();

    const hasAllDelivReq = /\b(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)\b/i.test(allNotesText);
    const studioDelivs: string[] = Array.isArray(contextData?.studioSettings?.deliverables)
      ? contextData.studioSettings.deliverables.map((d: any) => typeof d === 'string' ? d : d?.title).filter(Boolean)
      : [];

    if (hasAllDelivReq && studioDelivs.length > 0) {
      if (!normDoc.deliverablesPage) normDoc.deliverablesPage = { selectedItems: [] };
      normDoc.deliverablesPage.selectedItems = [...studioDelivs];
    }

    // Ensure showExclusionsNote is default ON (true)
    if (normDoc.shootDetails) normDoc.shootDetails.showExclusionsNote = true;
    if (normDoc.pricingPage) normDoc.pricingPage.showExclusionsNote = true;

    const cName = normDoc.cover?.coupleName || (normDoc.cover?.groomName ? `${normDoc.cover.groomName} & ${normDoc.cover.brideName}` : 'Client & Partner');
    const baseP = normDoc.pricingPage?.basePrice || 0;
    const discP = normDoc.pricingPage?.discountAmount || 0;
    const travP = normDoc.pricingPage?.travelCharges || 0;
    const accP = normDoc.pricingPage?.accommodationCharges || 0;
    const addlP = normDoc.pricingPage?.additionalCharges || 0;
    const gstP = normDoc.pricingPage?.gstPct || 0;
    const subTot = Math.max(0, baseP - discP + travP + accP + addlP);
    const totAmount = Math.round(subTot * (1 + gstP / 100));

    const summary = {
      coupleName: cName,
      weddingDate: normDoc.functionsPage?.items?.[0]?.date || normDoc.cover?.weddingDate || 'Date TBD',
      location: normDoc.cover?.locationName || 'Location TBD',
      functionsCount: normDoc.functionsPage?.items?.length || 0,
      functionsList: (normDoc.functionsPage?.items || []).map((f: any) => f.name),
      photographers: 2,
      cinematographers: 2,
      totalInvestment: `₹${totAmount.toLocaleString('en-IN')}`
    };

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

  // 1. Cover Page
  if (!doc.cover) doc.cover = {};
  if (cover.coupleName) doc.cover.coupleName = cover.coupleName;
  if (cover.groomName) doc.cover.groomName = cover.groomName;
  if (cover.brideName) doc.cover.brideName = cover.brideName;
  if (cover.eventType) doc.cover.eventType = cover.eventType;
  doc.cover.locationName = cover.locationName || '';

  // 2. Pre-Wedding Shoot Details Page
  const isPromptPreWed = allUserNotes.includes('pre-wedding') || allUserNotes.includes('prewedding') || allUserNotes.includes('pre wedding') || allUserNotes.includes('previewing');
  if (shootDetails.visible || shootDetails.daysText || shootDetails.crewText || isPromptPreWed) {
    if (!doc.shootDetails) doc.shootDetails = {};
    doc.shootDetails.visible = true;
    doc.shootDetails.daysText = shootDetails.daysText || '1 Day Shoot';
    doc.shootDetails.crewText = shootDetails.crewText || 'Candid Photography\nCinematography\nDrone Pilot';
    if (shootDetails.deliverablesText) doc.shootDetails.deliverablesText = shootDetails.deliverablesText;
    doc.shootDetails.showExclusionsNote = true;
  }

  // 3. Functions Page (Strictly Main Wedding Functions - No Pre-Wedding cards)
  if (!doc.functionsPage) doc.functionsPage = {};
  const rawFuncs = functionsPage.items || aiData.functions || [];
  if (Array.isArray(rawFuncs) && rawFuncs.length > 0) {
    // Strictly filter out any Pre-Wedding cards from Functions & Coverage
    const nonPreWedFuncs = rawFuncs.filter((fn: any) => {
      const nameLower = (fn.name || '').toLowerCase();
      return !nameLower.includes('pre-wedding') && !nameLower.includes('prewedding') && !nameLower.includes('pre wedding') && !nameLower.includes('previewing');
    });

    const funcsToProcess = nonPreWedFuncs.length > 0 ? nonPreWedFuncs : [
      { name: 'Wedding Ceremony', requirements: [{ name: 'Candid Photographer', qty: 1 }, { name: 'Cinematographer', qty: 1 }] }
    ];

    doc.functionsPage.items = funcsToProcess.map((fn: any, idx: number) => {
      let requirementsList: { name: string; qty: number }[] = [];
      if (Array.isArray(fn.requirements)) {
        requirementsList = fn.requirements.map((r: any) => ({
          name: normalizeCrewRoleName(typeof r === 'string' ? r : r.name || ''),
          qty: Number(r.qty || 1)
        }));
      } else {
        if (fn.photographers) requirementsList.push({ name: 'Candid Photographer', qty: Number(fn.photographers) });
        if (fn.cinematographers) requirementsList.push({ name: 'Cinematographer', qty: Number(fn.cinematographers) });
        if (fn.drone) requirementsList.push({ name: 'Drone Pilot', qty: 1 });
      }

      if (requirementsList.length === 0) {
        requirementsList = [
          { name: 'Candid Photographer', qty: 1 },
          { name: 'Cinematographer', qty: 1 }
        ];
      }

      const isNotFixed = fn.dateNotFixed ?? (!fn.date || fn.date === 'Date Not Fixed' || fn.date === 'TBD');

      return {
        id: fn.id || `func-ai-${Date.now()}-${idx}`,
        name: fn.name || `Function ${idx + 1}`,
        date: isNotFixed ? 'Date Not Fixed' : formatQuotationDate(fn.date),
        dateNotFixed: isNotFixed,
        startTime: fn.startTime || '',
        endTime: fn.endTime || '',
        location: fn.location || fn.venue || '',
        requirements: requirementsList,
        notes: fn.notes || ''
      };
    });

    // ⚡ MANDATE: Automatically merge same-date events (e.g. Haldi + Sangeet)
    doc.functionsPage.items = consolidateSameDateFunctions(doc.functionsPage.items);
  }

  // ⚡ MANDATE: Resolve single primary cover location (Wedding first, no multi-venue concatenation)
  if (doc.cover) {
    doc.cover.locationName = resolvePrimaryCoverLocation(cover.locationName || '', doc.functionsPage?.items || []);
  }

  // 4. Deliverables Page (Main Wedding Deliverables Only - Pre-wedding moved to shootDetails)
  if (!doc.deliverablesPage) doc.deliverablesPage = {};
  const rawDeliv = deliverablesPage.selectedItems || aiData.deliverables || [];
  if (Array.isArray(rawDeliv) && rawDeliv.length > 0) {
    const preWedDelivs: string[] = [];
    const weddingDelivs: string[] = [];

    rawDeliv.forEach((item: string) => {
      const itemLower = String(item || '').toLowerCase();
      if (itemLower.includes('pre-wedding') || itemLower.includes('prewedding') || itemLower.includes('pre wedding') || itemLower.includes('previewing')) {
        preWedDelivs.push(item);
      } else {
        weddingDelivs.push(item);
      }
    });

    doc.deliverablesPage.selectedItems = weddingDelivs;

    if (preWedDelivs.length > 0) {
      if (!doc.shootDetails) doc.shootDetails = { visible: true };
      doc.shootDetails.visible = true;
      const existingText = doc.shootDetails.deliverablesText || '';
      const existingLines = existingText ? existingText.split('\n') : [];
      const mergedShootDelivs = Array.from(new Set([...existingLines, ...preWedDelivs])).filter(Boolean).join('\n');
      doc.shootDetails.deliverablesText = mergedShootDelivs;
    }
  }

  // ⚡ MANDATE: Enforce Studio Settings Deliverables & Shortcuts synchronization ("x डालेंगे तो y होगा")
  const studioDeliverables: string[] = Array.isArray(contextData?.studioSettings?.deliverables)
    ? contextData.studioSettings.deliverables
        .map((d: any) => typeof d === 'string' ? d : d?.title)
        .filter(Boolean)
    : [];
  const studioShortcuts: any[] = Array.isArray(contextData?.studioSettings?.aiRules?.shortcuts)
    ? contextData.studioSettings.aiRules.shortcuts
    : [];

  const allNotesText = `${contextData?.additional_user_notes || ''} ${JSON.stringify(contextData?.raw_form_fields || '')}`.toLowerCase();
  const hasAllDelivReq = /(?:^|[^\u0900-\u097Fa-zA-Z0-9])(?:all\s*deliverable\s*add|all\s*deliverables\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers|ऑल\s*डिलीवरेबल्स(?:\s*ऐड)?|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|saare\s*deliverables|सारे\s*डिलीवरेबल्स)(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/i.test(allNotesText);

  let matchedShortcutCrew: Array<{ name: string; qty: number }> | null = null;
  let matchedShortcutPrice: number | null = null;
  let matchedShortcutDelivs: string[] = [];

  for (const sc of studioShortcuts) {
    if (!sc.trigger) continue;
    const trigLower = sc.trigger.toLowerCase().trim();
    const words = trigLower.split(/\s+/);
    const isMatch = allNotesText.includes(trigLower) || 
      words.every(w => allNotesText.includes(w)) ||
      (trigLower.includes('deliverable') && (allNotesText.includes('ऑल डिलीवरेबल्स') || allNotesText.includes('all deliverable')));

    if (isMatch) {
      if (Array.isArray(sc.mappedCrew) && sc.mappedCrew.length > 0) matchedShortcutCrew = sc.mappedCrew;
      if (Array.isArray(sc.mappedDeliverables) && sc.mappedDeliverables.length > 0) matchedShortcutDelivs.push(...sc.mappedDeliverables);
      if (sc.mappedPrice) matchedShortcutPrice = sc.mappedPrice;
    }
  }

  if (hasAllDelivReq && studioDeliverables.length > 0) {
    doc.deliverablesPage.selectedItems = [...studioDeliverables];
  } else if (matchedShortcutDelivs.length > 0) {
    doc.deliverablesPage.selectedItems = [...new Set(matchedShortcutDelivs)];
  }

  // Populate availableOptions with all studio deliverables
  if (studioDeliverables.length > 0) {
    doc.deliverablesPage.availableOptions = Array.from(new Set([
      ...studioDeliverables,
      ...(doc.deliverablesPage.availableOptions || []),
      ...(doc.deliverablesPage.selectedItems || [])
    ]));
  }

  // Assign matched shortcut crew to functions
  if (matchedShortcutCrew && matchedShortcutCrew.length > 0 && Array.isArray(doc.functionsPage?.items)) {
    doc.functionsPage.items.forEach((fn: any) => {
      fn.requirements = matchedShortcutCrew;
    });
  }

  // Assign matched shortcut price
  if (matchedShortcutPrice && doc.pricingPage && (!doc.pricingPage.basePrice || doc.pricingPage.basePrice === 150000)) {
    doc.pricingPage.basePrice = matchedShortcutPrice;
  }

  // 5. Special Value Additions Page
  if (!doc.specialValueAdditions) doc.specialValueAdditions = {};
  const rawSpecial = specialValueAdditions.selectedItems || [];
  if (Array.isArray(rawSpecial)) {
    doc.specialValueAdditions.selectedItems = rawSpecial;
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

  // Calculate Summary
  const coupleName = doc.cover.coupleName || `${doc.cover.groomName || 'Client'} & ${doc.cover.brideName || 'Partner'}`;
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

      // If step amount was not provided or 0, calculate mathematically from totalAmount
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

  const summary = {
    coupleName,
    weddingDate: doc.functionsPage?.items?.[0]?.date || 'Date TBD',
    location: doc.cover.locationName || 'Location TBD',
    functionsCount: doc.functionsPage?.items?.length || 0,
    functionsList: (doc.functionsPage?.items || []).map((f: any) => f.name),
    photographers: 2,
    cinematographers: 2,
    totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
  };

  const normalizedFinalDoc = normalizeQuotationData(doc, baseSchema);

  // Strictly preserve template design and typography tokens from baseSchema
  if (baseSchema) {
    if (baseSchema.look) normalizedFinalDoc.look = baseSchema.look;
    if (baseSchema.theme || baseSchema.look) normalizedFinalDoc.theme = baseSchema.theme || baseSchema.look;
    if (baseSchema.primaryFont) normalizedFinalDoc.primaryFont = baseSchema.primaryFont;
    if (baseSchema.secondaryFont) normalizedFinalDoc.secondaryFont = baseSchema.secondaryFont;
    if (baseSchema.colorPalette && !normalizedFinalDoc.colorPalette) normalizedFinalDoc.colorPalette = baseSchema.colorPalette;
  }

  // Consistent title naming everywhere: "${coupleName} - ${eventType}"
  const eventType = (doc.cover?.eventType || baseSchema?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
  const calculatedTitle = `${coupleName} - ${eventType}`;
  normalizedFinalDoc.designName = calculatedTitle;
  normalizedFinalDoc.title = calculatedTitle;

  return {
    document: normalizedFinalDoc,
    summary,
    missingInformation: aiData.missingInformation || [],
    conflicts: aiData.conflicts || []
  };
}

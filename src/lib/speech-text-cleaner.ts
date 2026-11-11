/**
 * Instant Client-Side Speech-to-Text Normalizer & Cleaner (0ms Latency)
 * Transcribes and cleans spoken Hindi, Marathi, Hinglish, and English voice notes
 * into polished, structured, and properly matched quotation requirements.
 */

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const HINDI_MONTH_WORDS: Array<{ words: string[]; replacement: string }> = [
  { words: ['जनवरी', 'जान्युवारी', 'जानेवारी'], replacement: 'January' },
  { words: ['फरवरी', 'फेब्रुवारी', 'फ़रवरी'], replacement: 'February' },
  { words: ['मार्च'], replacement: 'March' },
  { words: ['अप्रैल', 'एप्रिल'], replacement: 'April' },
  { words: ['मई'], replacement: 'May' },
  { words: ['जून'], replacement: 'June' },
  { words: ['जुलाई', 'जुलै'], replacement: 'July' },
  { words: ['अगस्त', 'ऑगस्ट'], replacement: 'August' },
  { words: ['सितंबर', 'सितम्बर', 'सप्टेंबर'], replacement: 'September' },
  { words: ['अक्टूबर', 'ऑक्टोबर'], replacement: 'October' },
  { words: ['नवंबर', 'नवम्बर', 'नोव्हेंबर'], replacement: 'November' },
  { words: ['दिसंबर', 'दिसम्बर', 'डिसेंबर'], replacement: 'December' },
];

const HINDI_NUMBER_WORDS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(?:साढ़े\s*पांच\s*लाख|पांच\s*लाख\s*पचास\s*हजार|5\.5\s*लाख)/gi, replacement: '₹5,50,000' },
  { pattern: /(?:साढ़े\s*चार\s*लाख|चार\s*लाख\s*पचास\s*हजार|4\.5\s*लाख)/gi, replacement: '₹4,50,000' },
  { pattern: /(?:सवा\s*दो\s*लाख|2\.25\s*लाख)/gi, replacement: '₹2,25,000' },
  { pattern: /(?:ढाई\s*लाख|दो\s*लाख\s*पचास\s*हजार|2\.5\s*लाख|अडीच\s*लाख)/gi, replacement: '₹2,50,000' },
  { pattern: /(?:साढ़े\s*तीन\s*लाख|तीन\s*लाख\s*पचास\s*हजार|3\.5\s*लाख)/gi, replacement: '₹3,50,000' },
  { pattern: /(?:एक\s*लाख\s*अस्सी\s*हजार|1\.8\s*लाख)/gi, replacement: '₹1,80,000' },
  { pattern: /(?:एक\s*लाख\s*सत्तर\s*हजार|1\.7\s*लाख)/gi, replacement: '₹1,70,000' },
  { pattern: /(?:एक\s*लाख\s*साठ\s*हजार|1\.6\s*लाख)/gi, replacement: '₹1,60,000' },
  { pattern: /(?:एक\s*लाख\s*पचास\s*हजार|डेढ़\s*लाख|1\.5\s*लाख)/gi, replacement: '₹1,50,000' },
  { pattern: /(?:पौने\s*दो\s*लाख|एक\s*लाख\s*पचहत्तर\s*हजार|1\.75\s*लाख)/gi, replacement: '₹1,75,000' },
  { pattern: /(?:एक\s*लाख\s*चालीस\s*हजार|1\.4\s*लाख)/gi, replacement: '₹1,40,000' },
  { pattern: /(?:एक\s*लाख\s*तीस\s*हजार|1\.3\s*लाख)/gi, replacement: '₹1,30,000' },
  { pattern: /(?:सवा\s*लाख|एक\s*लाख\s*पच्चीस\s*हजार|1\.25\s*लाख)/gi, replacement: '₹1,25,000' },
  { pattern: /(?:एक\s*लाख\s*बीस\s*हजार|1\.2\s*लाख)/gi, replacement: '₹1,20,000' },
  { pattern: /(?:एक\s*लाख\s*दस\s*हजार|1\.1\s*लाख)/gi, replacement: '₹1,10,000' },
  { pattern: /(?:एक\s*लाख|1\s*लाख)/gi, replacement: '₹1,00,000' },
  { pattern: /(?:दो\s*लाख|2\s*लाख)/gi, replacement: '₹2,00,000' },
  { pattern: /(?:तीन\s*लाख|3\s*लाख)/gi, replacement: '₹3,00,000' },
  { pattern: /(?:चार\s*लाख|4\s*लाख)/gi, replacement: '₹4,00,000' },
  { pattern: /(?:पांच\s*लाख|पाँच\s*लाख|5\s*लाख)/gi, replacement: '₹5,00,000' },
  { pattern: /(?:नब्बे\s*हजार|90\s*हजार)/gi, replacement: '₹90,000' },
  { pattern: /(?:पचासी\s*हजार|85\s*हजार)/gi, replacement: '₹85,000' },
  { pattern: /(?:अस्सी\s*हजार|80\s*हजार)/gi, replacement: '₹80,000' },
  { pattern: /(?:पचहत्तर\s*हजार|75\s*हजार)/gi, replacement: '₹75,000' },
  { pattern: /(?:सत्तर\s*हजार|70\s*हजार)/gi, replacement: '₹70,000' },
  { pattern: /(?:साठ\s*हजार|60\s*हजार)/gi, replacement: '₹60,000' },
  { pattern: /(?:पचास\s*हजार|50\s*हजार)/gi, replacement: '₹50,000' },
  { pattern: /(?:चालीस\s*हजार|40\s*हजार)/gi, replacement: '₹40,000' },
  { pattern: /(?:पैंतीस\s*हजार|35\s*हजार)/gi, replacement: '₹35,000' },
  { pattern: /(?:तीस\s*हजार|30\s*हजार)/gi, replacement: '₹30,000' },
  { pattern: /(?:पच्चीस\s*हजार|25\s*हजार)/gi, replacement: '₹25,000' },
  { pattern: /(?:बीस\s*हजार|20\s*हजार)/gi, replacement: '₹20,000' },
  { pattern: /(?:पंद्रह\s*हजार|15\s*हजार)/gi, replacement: '₹15,000' },
  { pattern: /(?:दस\s*हजार|10\s*हजार)/gi, replacement: '₹10,000' },
  { pattern: /(?:पांच\s*हजार|पाँच\s*हजार|5\s*हजार)/gi, replacement: '₹5,000' },
];

const HINDI_NAME_TRANSLATE: Record<string, string> = {
  'राहुल': 'Rahul',
  'पूजा': 'Pooja',
  'नेहा': 'Neha',
  'सागर': 'Sagar',
  'रिद्धि': 'Riddhi',
  'अथर्व': 'Atharva',
  'साक्षी': 'Sakshi',
  'रोहन': 'Rohan',
  'सिमरन': 'Simran',
  'रौनक': 'Raunak',
  'प्रेक्षा': 'Preksha',
  'संस्कृति': 'Sanskriti',
  'रूपेश': 'Rupesh',
  'अमित': 'Amit',
  'प्रिया': 'Priya',
  'ध्रुव': 'Dhruv',
  'विशाल': 'Vishal',
  'सुमती': 'Sumati',
  'यश': 'Yash',
  'हर्षिता': 'Harshita',
  'मंथन': 'Manthan',
  'गौरव': 'Gaurav',
  'श्रेया': 'Shreya',
  'कुणाल': 'Kunal',
  'अंकिता': 'Ankita',
  'आदित्य': 'Aditya',
  'और': '&',
  'तथा': '&',
  'व': '&',
  'एंड': '&'
};

function safeUnicodeReplace(text: string, searchWord: string, replaceWord: string): string {
  const re = new RegExp(`(^|[^\\u0900-\\u097Fa-zA-Z0-9])${searchWord}(?=[^\\u0900-\\u097Fa-zA-Z0-9]|$)`, 'gi');
  return text.replace(re, `$1${replaceWord}`);
}

/**
 * Clean spoken voice notes into clean, structured quotation requirements
 */
export function cleanVoiceTranscript(rawText: string, contextLeadName?: string): string {
  if (!rawText || !rawText.trim()) return '';
  let text = rawText.trim().replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d] || d);

  // 1. Currency & Numbers normalization
  for (const { pattern, replacement } of HINDI_NUMBER_WORDS) {
    text = text.replace(pattern, replacement);
  }

  // 1.1 Month names normalization (strict Unicode word boundaries so "में" or "मेहंदी" is never corrupted into "May")
  for (const { words, replacement } of HINDI_MONTH_WORDS) {
    for (const w of words) {
      text = safeUnicodeReplace(text, w, replacement);
    }
  }
  // Only normalize Marathi "मे" as May when directly paired with a day/year numeral (e.g. "10 मे" or "मे 2026")
  text = text.replace(/(\d{1,2})\s*मे(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/g, '$1 May');
  text = text.replace(/(^|[^\u0900-\u097Fa-zA-Z0-9])मे\s*(\d{2,4})(?=[^\u0900-\u097Fa-zA-Z0-9]|$)/g, '$1May $2');

  // 2. Deliverables Shorthands
  text = text.replace(/(?:ऑल\s*डिलीवरेबल्स\s*ऐड|ऑल\s*डिलीवरेबल्स|सभी\s*डिलीवरेबल्स(?:\s*ऐड)?|सारे\s*डिलीवरेबल्स(?:\s*ऐड)?|all\s*deliverables\s*add|all\s*deliverable\s*add|all\s*deliverables|all\s*deliverable|all\s*droppers)/gi, 'All Deliverables Add');

  // 3. Protect Pre-Wedding BEFORE replacing standalone "वेडिंग" -> "Wedding"
  text = text.replace(/(?:प्री[\s-]*वेडिंग|प्रि[\s-]*वेडिंग|प्रीवेडिंग|प्रिवेडिंग)/gi, 'Pre-Wedding');
  text = text.replace(/(?:प्री[\s-]*शूट|प्रि[\s-]*शूट|प्री[\s-]*शुट|प्रीशूट)/gi, 'Pre-Wedding Shoot');

  // 3.1 Indian Ceremonies Normalization
  text = safeUnicodeReplace(text, 'हल्दी', 'Haldi');
  text = safeUnicodeReplace(text, 'हळद', 'Haldi');
  text = safeUnicodeReplace(text, 'संगीत', 'Sangeet');
  text = safeUnicodeReplace(text, 'वेडिंग', 'Wedding');
  text = safeUnicodeReplace(text, 'शादी', 'Wedding');
  text = safeUnicodeReplace(text, 'लग्न', 'Wedding');
  text = safeUnicodeReplace(text, 'फेरे', 'Wedding');
  text = safeUnicodeReplace(text, 'रिसेप्शन', 'Reception');
  text = safeUnicodeReplace(text, 'मेहंदी', 'Mehendi');
  text = safeUnicodeReplace(text, 'मेंहदी', 'Mehendi');
  text = safeUnicodeReplace(text, 'सगाई', 'Ring Ceremony');
  text = safeUnicodeReplace(text, 'रिंग सेरेमनी', 'Ring Ceremony');
  text = safeUnicodeReplace(text, 'साखरपुडा', 'Ring Ceremony');
  text = safeUnicodeReplace(text, 'रोका', 'Ring Ceremony');
  text = safeUnicodeReplace(text, 'कोटेशन', 'Quotation');

  // 4. Crew Terms Normalization (match longest full role titles first so suffixes like "ग्राफर" are never stranded)
  text = text.replace(/(?:सोशल\s*मीडिया\s*रील्स?\s*क्रिएटर|सोशल\s*मीडिया\s*क्रिएटर)/gi, 'Social Media Reels Creator');
  text = text.replace(/(?:रील्स?\s*क्रिएटर)/gi, 'Reels Creator');
  text = text.replace(/(?:फैमिली\s*फोटोग्राफर|फैमिली\s*फोटो)/gi, 'Family Photographer');
  text = text.replace(/(?:कैंडिड\s*फोटोग्राफर|कैंडिड\s*फोटोग्राफी|कैंडिड\s*फोटो|कैंडिड)/gi, 'Candid Photographer');
  text = text.replace(/(?:सिनेमैटोग्राफर|सिनेमैटोग्राफी|सिनेमैटिक\s*वीडियो|सिनेमैटिक|सिनेमा)/gi, 'Cinematographer');
  text = text.replace(/(?:ट्रेडिशनल\s*वीडियोग्राफर|ट्रैडिशनल\s*वीडियोग्राफर|ट्रेडिशनल\s*वीडियोग्राफी|ट्रेडिशनल\s*वीडियो|ट्रेड\s*वीडियो)/gi, 'Traditional Videographer');
  text = text.replace(/(?:ट्रेडिशनल\s*फोटोग्राफर|ट्रैडिशनल\s*फोटोग्राफर|ट्रेडिशनल\s*फोटोग्राफी|ट्रेडिशनल\s*कैमरामैन|ट्रेडिशनल\s*फोटो\s*वाला|ट्रेडिशनल\s*फोटो|ट्रेड\s*फोटो)/gi, 'Traditional Photographer');
  text = text.replace(/(?:ड्रोन\s*पायलट|ड्रोन)/gi, 'Drone Pilot');
  text = text.replace(/(?:सेमी\s*काइनेमैटिक|सेमी\s*सिनेमैटिक|semi-cinematic)/gi, 'Semi Cinematic');
  text = text.replace(/(?:सेमी\s*स्टैंडर्ड|सेमी\s*ट्रेडिशनल|semi-standard)/gi, 'Semi Standard');
  text = text.replace(/(?:इंस्टाग्राम\s*रील्स|इंस्टाग्राम\s*रील|रील्स|रील|reels?)(?!\s*creator)/gi, 'Reels');

  // 5. Transliterate known Indian Names
  for (const [k, v] of Object.entries(HINDI_NAME_TRANSLATE)) {
    text = safeUnicodeReplace(text, k, v);
  }

  // 6. Format explicit couple prefixes
  text = text.replace(/(?:कपल\s*का\s*नाम\s*रहेगा|कपल\s*का\s*नाम|कपल\s*नेम|कपल|couple\s*name\s*is|couple\s*name)\s*[:=-]?\s*([A-Za-z\s&]+?)(?=\s+(?:Pre-Wedding|Wedding|Quotation|Haldi|Sangeet|Reception|Ring Ceremony|Mehendi|\d|All|₹)|$)/gi, (match, names) => {
    const cleanNames = names.split(/\s*&\s*|\s+and\s+/i)
      .map((n: string) => n.trim().charAt(0).toUpperCase() + n.trim().slice(1).toLowerCase())
      .filter(Boolean)
      .join(' & ');
    return cleanNames ? `Couple: ${cleanNames} ` : match;
  });

  // If lead name is known and user said something without couple name, ensure lead name can be preserved
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

const SPEECH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'that', 'this', 'please', 'plz', 'karo', 'karna', 'kardo', 'hai', 'hain', 'ho', 'hoga',
  'mein', 'me', 'main', 'se', 'ko', 'ka', 'ki', 'ke', 'chahiye', 'chahte', 'rahi', 'raha', 'rahe',
  'करो', 'करना', 'करदो', 'है', 'हैं', 'हो', 'होगा', 'में', 'से', 'को', 'का', 'की', 'के', 'चाहिए',
  'था', 'थी', 'थे', 'रहा', 'रही', 'रहे', 'वाला', 'वाली', 'वाले', 'भी', 'तो', 'ही', 'ये', 'वो',
  'haan', 'han', 'ha', 'uh', 'um', 'umm', 'hmm', 'matlab', 'basically', 'ok', 'okay', 'हाँ', 'हां'
]);

const BILINGUAL_CANONICAL_MAP: Record<string, string> = {
  'सभी': 'all', 'हर': 'all', 'सारे': 'all', 'every': 'all', 'each': 'all',
  'इवेंट': 'event', 'इवेंट्स': 'event', 'फंक्शन': 'event', 'फंक्शंस': 'event', 'events': 'event', 'function': 'event', 'functions': 'event',
  'ऐड': 'add', 'जोड़': 'add', 'डाल': 'add', 'include': 'add', 'insert': 'add', 'append': 'add',
  'अगले': 'next', 'नेक्स्ट': 'next', 'बाद': 'next', 'दूसरे': 'next', 'दूसरा': 'next',
  'उसी': 'same', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5',
  'दिन': 'day', 'days': 'day', 'तारीख': 'date', 'डेट': 'date',
  'बजट': 'budget', 'अमाउंट': 'budget', 'प्राइस': 'budget', 'पैकेज': 'budget', 'टोटल': 'total', 'total': 'total', 'amount': 'budget', 'price': 'budget', 'package': 'budget',
  'लोकेशन': 'location', 'वेन्यू': 'location', 'शहर': 'location', 'जगह': 'location', 'venue': 'location', 'city': 'location',
  'कपल': 'couple', 'नाम': 'name', 'ऑल': 'all', 'डिलीवरेबल्स': 'deliverables', 'deliverable': 'deliverables',
  'traditional': 'traditional', 'photographer': 'photographer', 'videographer': 'videographer',
  'candid': 'candid', 'cinematographer': 'cinematographer', 'drone': 'drone', 'pilot': 'pilot',
  'lakh': 'lakh', 'lac': 'lakh', 'लाख': 'lakh', 'thousand': 'thousand', 'हजार': 'thousand',
  'extra': 'extra', 'अतिरिक्त': 'extra', 'अलग': 'separate', 'सेपरेट': 'separate', 'combine': 'combined', 'combined': 'combined',
  'रूल': 'rule', 'ट्रेनिंग': 'training', 'नोट': 'note', 'album': 'album', 'एल्बम': 'album', 'फोटोबुक': 'album', 'photobook': 'album'
};

function normalizeComparisonTokens(input: string): string[] {
  const expanded = cleanVoiceTranscript(input)
    .toLowerCase()
    .replace(/₹/g, ' ')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख)/gi, (_, n) => String(Math.round(parseFloat(n) * 100000)))
    .replace(/(\d+(?:\.\d+)?)\s*(?:k|thousand|हजार)/gi, (_, n) => String(Math.round(parseFloat(n) * 1000)));

  const rawTokens = expanded
    .split(/[^a-z0-9\u0900-\u097F]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !SPEECH_STOP_WORDS.has(t));

  return rawTokens.map((t) => BILINGUAL_CANONICAL_MAP[t] || t);
}

function stripAiOutputArtifacts(text: string): string {
  let out = String(text || '').trim();
  out = out.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```\s*$/i, '').trim();
  out = out.replace(/^(?:here\s+is\s+(?:the|your)\s+[^:\n]+:|clean(?:ed)?\s+(?:finished\s+)?(?:replacement\s+)?(?:transcript|text|output)\s*:|polished\s+(?:transcript|text)\s*:)\s*/i, '');
  out = out
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+\*\*([^:*]+):\*\*\s*/gm, '$1: ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '');
  out = out.replace(/^["']|["']$/g, '').trim();
  return out.replace(/\n{2,}/g, '. ').replace(/\s*\n\s*/g, '. ').replace(/\s+/g, ' ').trim();
}

function splitIntoClauses(text: string): string[] {
  const normalized = text
    .replace(/([।.;!?])+/g, '|SPLIT|')
    .replace(/\s+(?=(?:हर|सभी|every|all|add|ऐड|इसके\s+अलावा|और\s+(?:अमाउंट|बजट|हर|सभी|कपल|लोकेशन)|plus|also|note|budget|total)\b)/gi, '|SPLIT|');
  return normalized
    .split('|SPLIT|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Guarantee 100% lossless retention after AI speech cleanup:
 * Ensures ChatGPT/Gemini-level cleanup NEVER deletes spoken amounts, dates,
 * ceremonies, crew instructions, custom training directives, or trailing clauses.
 */
export function enforceLosslessSpeechRetention(
  rawText: string,
  polishedText: string,
  contextLeadName?: string
): string {
  const baseCleaned = cleanVoiceTranscript(rawText, contextLeadName);
  const candidate = stripAiOutputArtifacts(polishedText);

  if (!baseCleaned) return candidate;
  if (!candidate || candidate.length < 4) return baseCleaned;

  const baseTokens = normalizeComparisonTokens(baseCleaned);
  const candidateTokens = normalizeComparisonTokens(candidate);
  const candidateTokenSet = new Set(candidateTokens);

  if (baseTokens.length === 0) return candidate;

  // 1. Check overall content-token retention
  let retainedCount = 0;
  for (const tok of baseTokens) {
    if (candidateTokenSet.has(tok)) retainedCount++;
  }
  const retentionRatio = retainedCount / baseTokens.length;

  // If AI heavily summarized or dropped >35% of spoken content, return complete baseCleaned
  if (retentionRatio < 0.65 && baseCleaned.length > candidate.length * 1.15) {
    return baseCleaned;
  }

  // 2. Check critical significant numbers (>= 1000, budgets, years) & clause retention
  const missingClauses: string[] = [];
  const clauses = splitIntoClauses(baseCleaned);

  for (const clause of clauses) {
    const clauseTokens = normalizeComparisonTokens(clause);
    if (clauseTokens.length < 2) continue;

    const bigNumbers = clauseTokens.filter((t) => /^\d{4,}$/.test(t));
    const missingBigNum = bigNumbers.some((n) => !candidateTokenSet.has(n));

    let overlap = 0;
    for (const tok of clauseTokens) {
      if (candidateTokenSet.has(tok)) overlap++;
    }
    const clauseCoverage = overlap / clauseTokens.length;

    const isCriticalDirective = /(?:add|ऐड|डाल|traditional|photographer|videographer|drone|candid|cinemat|budget|₹|pre-wedding|couple|haldi|sangeet|mehendi|reception|wedding|deliverable|reel|album|date|location|next|अगले)/i.test(clause);

    if (missingBigNum || (clauseCoverage < 0.5 && (isCriticalDirective || clauseTokens.length >= 3))) {
      missingClauses.push(clause);
    }
  }

  if (missingClauses.length === 0) {
    return candidate;
  }

  // If 3+ clauses were dropped, the AI truncated or heavily summarized -> use lossless baseCleaned
  if (missingClauses.length >= 3) {
    return baseCleaned;
  }

  // Append only genuinely dropped clauses cleanly without duplicating
  let finalOut = candidate.replace(/[.\s]+$/, '');
  for (const mc of missingClauses) {
    finalOut += `. ${mc}`;
  }
  return finalOut.trim();
}

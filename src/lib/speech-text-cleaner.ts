/**
 * Instant Client-Side Speech-to-Text Normalizer & Cleaner (0ms Latency)
 * Transcribes and cleans spoken Hindi, Marathi, Hinglish, and English voice notes
 * into polished, structured, and properly matched quotation requirements.
 */

const HINDI_NUMBER_WORDS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(?:एक\s*लाख\s*पचास\s*हजार|डेढ़\s*लाख|1\.5\s*लाख)/gi, replacement: '₹1,50,000' },
  { pattern: /(?:एक\s*लाख\s*बीस\s*हजार|1\.2\s*लाख)/gi, replacement: '₹1,20,000' },
  { pattern: /(?:एक\s*लाख\s*अस्सी\s*हजार|1\.8\s*लाख)/gi, replacement: '₹1,80,000' },
  { pattern: /(?:एक\s*लाख\s*साठ\s*हजार|1\.6\s*लाख)/gi, replacement: '₹1,60,000' },
  { pattern: /(?:एक\s*लाख\s*सत्तर\s*हजार|1\.7\s*लाख)/gi, replacement: '₹1,70,000' },
  { pattern: /(?:एक\s*लाख|1\s*लाख)/gi, replacement: '₹1,00,000' },
  { pattern: /(?:दो\s*लाख\s*पचास\s*हजार|ढाई\s*लाख|2\.5\s*लाख)/gi, replacement: '₹2,50,000' },
  { pattern: /(?:दो\s*लाख|2\s*लाख)/gi, replacement: '₹2,00,000' },
  { pattern: /(?:तीन\s*लाख|3\s*लाख)/gi, replacement: '₹3,00,000' },
  { pattern: /(?:चार\s*लाख|4\s*लाख)/gi, replacement: '₹4,00,000' },
  { pattern: /(?:पांच\s*लाख|5\s*लाख)/gi, replacement: '₹5,00,000' },
  { pattern: /(?:नब्बे\s*हजार|90\s*हजार)/gi, replacement: '₹90,000' },
  { pattern: /(?:अस्सी\s*हजार|80\s*हजार)/gi, replacement: '₹80,000' },
  { pattern: /(?:सत्तर\s*हजार|70\s*हजार)/gi, replacement: '₹70,000' },
  { pattern: /(?:पचास\s*हजार|50\s*हजार)/gi, replacement: '₹50,000' },
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
  let text = rawText.trim();

  // 1. Currency & Numbers normalization
  for (const { pattern, replacement } of HINDI_NUMBER_WORDS) {
    text = text.replace(pattern, replacement);
  }

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
  text = text.replace(/(?:कैंडिड\s*फोटोग्राफर|कैंडिड\s*फोटोग्राफी|कैंडिड\s*फोटो|कैंडिड)/gi, 'Candid Photographer');
  text = text.replace(/(?:सिनेमैटोग्राफर|सिनेमैटोग्राफी|सिनेमैटिक\s*वीडियो|सिनेमैटिक|सिनेमा)/gi, 'Cinematographer');
  text = text.replace(/(?:ट्रेडिशनल\s*वीडियोग्राफर|ट्रेडिशनल\s*वीडियोग्राफी|ट्रेडिशनल\s*वीडियो|ट्रेड\s*वीडियो)/gi, 'Traditional Videographer');
  text = text.replace(/(?:ट्रेडिशनल\s*फोटोग्राफर|ट्रेडिशनल\s*फोटोग्राफी|ट्रेडिशनल\s*फोटो|ट्रेड\s*फोटो)/gi, 'Traditional Photographer');
  text = text.replace(/(?:ड्रोन\s*पायलट|ड्रोन)/gi, 'Drone Pilot');
  text = text.replace(/(?:सेमी\s*काइनेमैटिक|सेमी\s*सिनेमैटिक|semi-cinematic)/gi, 'Semi Cinematic');
  text = text.replace(/(?:सेमी\s*स्टैंडर्ड|सेमी\s*ट्रेडिशनल|semi-standard)/gi, 'Semi Standard');
  text = text.replace(/(?:इंस्टाग्राम\s*रील्स|इंस्टाग्राम\s*रील|रील्स|रील|reels?)/gi, 'Reels');

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

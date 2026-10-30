'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Check, AlertTriangle, ArrowRight, Loader2, 
  FileText, Calendar, MapPin, Users, DollarSign, Camera, Video, MessageSquare,
  Mic, MicOff, Volume2, Square
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import { broadcastQuotationSync } from '@/lib/realtime-quotations';
import { QuotationTemplateSelector, StudioTemplateItem, getSynchronousCachedTemplates } from './quotation-template-selector';
import { fallbackHeuristicExtractor, mapAiOutputToQuotationDocument } from '@/lib/ai-quotation-extractor';
import { isPlaceholderCoupleName } from '@/lib/quotation-finance-sync';
import { 
  consolidateSameDateFunctions, 
  resolvePrimaryCoverLocation, 
  sanitizeAndParseJson,
  formatQuotationDate,
  normalizeQuotationData,
  DEFAULT_AIRY_PROPOSAL
} from '@/lib/quotation-defaults';

interface AiQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  quotationId?: string | null;
  selectedTemplateId?: string | null;
  availableTemplates?: StudioTemplateItem[];
  currentDocumentData?: any;
  onApplied?: (updatedDoc: any, targetQuotationId: string) => void;
}

function tryParsePastedAiJson(rawText: string, baseTemplate?: any, leadContext?: any): any | null {
  if (!rawText || !rawText.trim()) return null;

  // 1. Fast sanitized JSON parse (<1ms)
  // When user pastes structured JSON directly (from ChatGPT or prompt copy), return immediately!
  const parsed = sanitizeAndParseJson(rawText);
  if (parsed && typeof parsed === 'object') {
    let root = parsed;
    if (root.quotation && typeof root.quotation === 'object') root = root.quotation;
    if (root.proposal && typeof root.proposal === 'object') root = root.proposal;
    if (root.quotation_details && typeof root.quotation_details === 'object') root = root.quotation_details;
    if (root.data && typeof root.data === 'object' && !root.cover && !root.functionsPage) root = root.data;

    const hasAnyContent = Boolean(
      root.cover || root.functionsPage || root.pricingPage || root.shootDetails ||
      root.deliverablesPage || root.pages || root.events || root.functions ||
      root.deliverables || root.services || root.pricing || root.package || root.client
    );

    if (hasAnyContent) {
      return normalizeQuotationData(root, baseTemplate || DEFAULT_AIRY_PROPOSAL);
    }
  }

  // If input is natural language / spoken voice notes (not valid structured JSON), return null
  // so the caller invokes OpenAI GPT-4o-mini route (/api/quotations/ai-extract) with 100% full extraction!
  return null;
}


function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch (_) {}
  }
  return '';
}

export function AiQuotationModal({
  isOpen,
  onClose,
  lead,
  quotationId,
  selectedTemplateId,
  availableTemplates,
  currentDocumentData,
  onApplied
}: AiQuotationModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(selectedTemplateId || '');

  // 🎙️ OpenAI Whisper MediaRecorder State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeSuccess, setTranscribeSuccess] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const startVoiceRecording = async () => {
    setErrorMsg(null);
    setTranscribeSuccess(false);
    isCancelledRef.current = false;
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        alert('Microphone access is not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      audioChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

            recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (_) {}
        if (timerRef.current) clearInterval(timerRef.current);

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        // Resilient delay for iOS WebKit to flush dataavailable event
        await new Promise((r) => setTimeout(r, 150));

        const chunks = audioChunksRef.current;
        if (!chunks || chunks.length === 0) {
          setErrorMsg('कोई आवाज़ रिकॉर्ड नहीं हुई। कृपया दोबारा बोलें।');
          return;
        }

        const actualMime = recorder.mimeType || mimeType || 'audio/mp4';
        const audioBlob = new Blob(chunks, { type: actualMime });
        audioChunksRef.current = [];

        console.log('[Audio Recording Completed]:', audioBlob.size, 'bytes, mime:', actualMime);
        if (audioBlob.size < 100) {
          setErrorMsg('रिकॉर्डिंग बहुत छोटी थी। कृपया कम से कम 2-3 सेकंड बोलें।');
          return;
        }

        await transcribeWithWhisper(audioBlob, actualMime);
      };

      // CRITICAL FOR IOS: Never pass timeslice! Calling recorder.start() without timeslice prevents 0-byte chunk bug on iOS WebKit.
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Microphone Permission Error]:', err);
      alert('Microphone access was denied. Please allow microphone permissions in your browser.');
    }
  };

  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    try {
      // Do not call requestData() before stop() on iOS WebKit - simply call stop()
      mediaRecorderRef.current.stop();
    } catch (e) {
      console.warn('Error stopping media recorder:', e);
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const transcribeWithWhisper = async (audioBlob: Blob, detectedMime: string = '') => {
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
            const fd = new FormData();
      const isMp4 = detectedMime.includes('mp4') || detectedMime.includes('aac') || detectedMime.includes('m4a');
      const ext = isMp4 ? 'mp4' : 'webm';
      const file = new File([audioBlob], `voice_input.${ext}`, {
        type: isMp4 ? 'audio/mp4' : 'audio/webm'
      });
      fd.append('audio', file, `voice_input.${ext}`);
      const res = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setAdditionalNotes((prev: string) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed}\n\n${data.text}` : data.text;
        });
        setTranscribeSuccess(true);
        setTimeout(() => setTranscribeSuccess(false), 5000);
      } else {
        throw new Error(data.error || 'Could not transcribe audio');
      }
    } catch (err: any) {
      console.warn('[Whisper Transcribe Notice]:', err);
      setErrorMsg(err.message || 'Audio transcription unavailable. You can type or paste notes directly.');
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    if (selectedTemplateId) {
      setActiveTemplateId(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  // Extracted Result State
  const [extractedDoc, setExtractedDoc] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  const effectiveLead: any = lead || {
    id: quotationId || 'draft',
    name: currentDocumentData?.cover?.coupleName || 'Client',
    phone: '',
    email: '',
    raw_payload: {},
    comments: []
  };

  const activeTemplateObj = availableTemplates?.find(t => t.id === (activeTemplateId || selectedTemplateId)) || availableTemplates?.find(t => t.is_default) || availableTemplates?.[0];
  let resolvedBaseDoc = activeTemplateObj?.content_json || currentDocumentData || null;
  if (!resolvedBaseDoc && typeof window !== 'undefined') {
    try {
      const cachedTmpls = getSynchronousCachedTemplates(effectiveLead?.workspace_id);
      const foundCached = cachedTmpls.find(t => t.id === (activeTemplateId || selectedTemplateId)) || cachedTmpls.find(t => t.is_default) || cachedTmpls[0];
      if (foundCached?.content_json) {
        resolvedBaseDoc = foundCached.content_json;
      }
    } catch (_) {}
  }
  const baseTemplateDoc = resolvedBaseDoc;

  if (!isOpen) return null;

  const handleCopySystemPrompt = () => {
    const rawPayload = effectiveLead.raw_payload || {};
    const extractedEventDate = rawPayload.event_date || rawPayload.wedding_date || rawPayload.date || rawPayload.wedding_month || rawPayload.month || effectiveLead.event_date || '';
    const extractedBudget = rawPayload.budget || rawPayload.preferred_budget_range || rawPayload.approximate_budget || effectiveLead.budget || '';
    const extractedLocation = rawPayload.location || rawPayload.city || rawPayload.venue || rawPayload.destination || effectiveLead.location || '';
    const extractedFunctions = rawPayload.functions || rawPayload.wedding_functions || rawPayload.events || '';

    const masterPrompt = `You are StudioCore AI Quotation Assistant for Professional Wedding & Event Photography Studios.

==================================================
🎯 YOUR TASK:
Analyze the client requirements, notes, or conversation below and convert them into a 100% structured StudioCore Quotation JSON document.
CRITICAL MANDATE: Extract real event dates/months, real wedding functions (Haldi, Sangeet, Wedding, etc.), real budgets, and real locations from the LEAD & CLIENT CONTEXT. DO NOT hallucinate fake data, and DO NOT output default placeholders when real client data is present.

==================================================
📋 PAGE-BY-PAGE RULES & MAPPING:

1. COVER PAGE (cover):
- coupleName: Exact couple name requested by user. Format nicely (e.g. "Sagar & Vruddhi").
- groomName: Extracted groom name (e.g. "Sagar").
- brideName: Extracted bride name (e.g. "Vruddhi").
- eventType: Title of event (e.g. "Wedding", "Pre-Wedding", "Pre-Wedding & Wedding", "Engagement", "Reception", "Maternity", "Corporate Event").
- locationName: SINGLE PRIMARY COVER LOCATION ONLY!
  * Strict Priority Order for Cover Location:
    1. Main Wedding ceremony venue/city (HIGHEST PRIORITY - e.g. "Taj Lake Palace, Udaipur").
    2. Reception or Engagement venue (if no Wedding venue specified).
    3. First mentioned venue/city.
  * NEVER concatenate multiple different event locations onto the cover page (NEVER output "Home, Sangeet Hall, Taj Lake Palace").
  * Individual event venues must stay inside their respective function cards in functionsPage.items!
  * If NOT mentioned anywhere, keep EMPTY string "" (DO NOT hallucinate or guess fake locations).

2. ABOUT US (aboutUs):
- KEEP DEFAULT TEMPLATE AS IS (No changes).

3. PRE-WEDDING SHOOT (shootDetails) - DEDICATED SEPARATE PAGE:
- If pre-wedding is requested/included:
  - visible: true
  - daysText: e.g. "1 Day Shoot" (Default if not specified) or "2 Days Shoot", "3 Days Shoot".
  - crewText: Requirements/crew (e.g. "Candid Photography\\nCinematography\\nDrone Pilot\\nReel Creator").
  - deliverablesText: Expected deliverables (e.g. "1 Minute Teaser Reel\\n50+ Color Graded Photos\\nSave the Date Video").
  - showExclusionsNote: true (Default ON).

4. FUNCTIONS & COVERAGE (functionsPage):
- CRITICAL SAME-DATE EVENT CONSOLIDATION MANDATE (MUST FOLLOW):
  * If two or more ceremonies/events occur on the SAME DATE or SAME DAY (for example: "22 February ko Haldi aur Sangeet hai", or "Haldi and Sangeet on 22 Feb", or Mehendi & Ring Ceremony on the same date):
    YOU MUST COMBINE THEM INTO ONE SINGLE FUNCTION CARD!
    Name it by joining ceremony names with " + " (e.g. "Haldi + Sangeet", "Mehendi + Sangeet", "Puja + Haldi").
    DO NOT create separate cards for events occurring on the same date! Combine their crew requirements into that single card.
  * ONLY create separate cards for events that occur on DIFFERENT DATES (e.g. 21 Feb Mehendi card, 22 Feb Haldi + Sangeet card, 23 Feb Wedding card).
  * REAL CEREMONY NAMES MANDATE: NEVER output generic names like "Event 1", "Event 2", "Function 1", "Function 2". ALWAYS extract and use the real event names (Haldi, Mehendi, Sangeet, Ring Ceremony, Wedding, Reception, Cocktail, Mayra, Ganesh Puja, etc.).
- items: Array of event objects:
  - id: Unique string "func_1", "func_2", etc.
  - name: Combined ceremony title (e.g. "Haldi + Sangeet", "Wedding Ceremony", "Reception").
  - date: CRITICAL DATE FORMAT MANDATE: Every date MUST strictly be formatted as "DD - MMM - YYYY" (e.g. "13 - Dec - 2026", "22 - Feb - 2026", "05 - Jan - 2027"). NEVER output ISO dates like 2026-12-13, and NEVER output other formats! ONLY set date: "Date Not Fixed" and dateNotFixed: true if NO date, month, or season is mentioned anywhere in context!
  - dateNotFixed: boolean (false if date or month is known, true only if completely unspecified).
  - startTime / endTime: Exact time if specified (e.g. "09:00 AM" / "02:00 PM"). If NO time specified, keep EMPTY string ""!
  - location: Venue or location for this specific function. If NO location specified, keep EMPTY string ""!
  - notes: Special event notes if specified. If none, keep EMPTY string ""!
  - requirements: Array of { name: string, qty: number } using the Standardized Crew Normalization Dictionary:
    * "Cinematographer" (CV, Cinematography, Cinematic Video, Cine Video, Cinematic)
    * "Traditional Photographer" (TP, Traditional Photography, Traditional Photo)
    * "Candid Photographer" (CP, Candid Photography, Candid Photo, Candid Photos)
    * "Traditional Videographer" (TV, Traditional Video, Traditional Videography, Tred Video)
    * "Semi Cinematic" (Semi-Cinematic, Semi Kinematic, Semi-Kinematic, Semi-Cine, Semi Cine, Semi Cinematic Video, Semi Cine Video)
    * "Semi Standard" (Semi-Standard, Semi Traditional, Semi-Traditional, Semi Standard Video, Semi Traditional Video, Semi-Trad)
    * "Social Media Person" (Story Creator, Social Media Manager)
    * "Reel Creator" (Reels, Reel Person, Reel Maker, Instagram Reel)
    * "Live Videography" (Live Streaming, LED Live Setup, Live TV)
    * "Drone Pilot" (Drone, Drone Videography, Aerial Drone)
    * "Assistant" (Ass, Helper, Light Boy)
    * "Team Manager" (TM, Event Coordinator, Shoot Manager)
    * "Makeup Artist" (MUA, Bridal Makeup)
    * "Family Photographer" (Family Photos, Family Photography)
    * IMPORTANT: If user mentions "semi-kinematic" or "semi-cinematic", output exact name "Semi Cinematic". If user mentions "semi-standard" or "semi-traditional", output exact name "Semi Standard".
    * If multiple ceremonies on this card require crew, SUM the quantities together (e.g. if Haldi needs 1 Candid and Sangeet needs 1 Candid + 1 Cinematographer -> the combined Haldi + Sangeet card has { "name": "Candid Photographer", "qty": 2 }, { "name": "Cinematographer", "qty": 1 }).

5. DELIVERABLES (deliverablesPage):
- selectedItems: Array of exact deliverables requested by user (e.g. "Full Ultra HD Super-Fine Raw Photos", "High Resolution Edited Photos (300+)", "Cinematic Teaser (3-5 Mins)", "Traditional Wedding Film (30-45 Mins)", "Instagram Reels Package (5 Reels)"). Custom deliverables will be added seamlessly.

6. SPECIAL VALUE ADDITIONS (specialValueAdditions):
- selectedItems: Array of complimentary/free bonus items (e.g. "Complimentary Drone Coverage", "Complimentary 1 Day Pre-Wedding Teaser", "Complimentary Wooden USB Box"). If none, keep empty array [].

7. PRICING DETAILS (pricingPage):
- STRICT PRICING & DISCOUNT LOGIC (REGULAR PRICE VS BEST OFFER PRICE):
  * regularPrice (or basePrice): The gross standard regular package price before any offer/discount (Integer, e.g. 180000). Inspect LEAD & CLIENT CONTEXT (e.g. 'budget', 'preferred_budget_range', or notes).
  * bestPrice (or offerPrice): The best offer price given to the client (Integer, e.g. 150000).
  * discountAmount: Difference between regularPrice and bestPrice (e.g. 180000 - 150000 = 30000).
    - If user mentions: "Regular price 1,80,000, Best offer price 1,50,000" -> regularPrice: 180000, bestPrice: 150000, discountAmount: 30000.
    - If user explicitly mentions a flat discount (e.g. "20,000 discount" on a 180000 package) -> regularPrice: 180000, discountAmount: 20000, bestPrice: 160000.
    - If NO discount or offer was mentioned, discountAmount MUST STRICTLY BE 0 and bestPrice equals regularPrice.
  * Net Total Calculation: Net Amount = basePrice - discountAmount + travelCharges + accommodationCharges.
- gstPct: GST percentage if specified (Number, e.g. 18), else 0.
- travelCharges: Travel cost if specified (Number), else 0.
- accommodationCharges: Stay/Hotel cost if specified (Number), else 0.
- additionalCharges: Any extra costs (Number), else 0.
- showExclusionsNote: true (Default ON).

8. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- steps: Array of payment milestones with custom percentages & amounts:
  - e.g. [
      { "name": "Advance Token", "pct": "30%", "amount": 45000, "status": "Pending" },
      { "name": "On Event Day", "pct": "50%", "amount": 75000, "status": "Pending" },
      { "name": "On Final Delivery", "pct": "20%", "amount": 30000, "status": "Pending" }
    ]
  - If user mentions specific ratio (e.g. 50%/50% or 30%/50%/20% or 20%/40%/40%), calculate accordingly based on basePrice.
  - CRITICAL STATUS RULE: Every step status MUST strictly be "Pending". NEVER output "Completed" unless the user's prompt or notes explicitly states that the advance or milestone has already been paid/received.

==================================================
OUTPUT FORMAT & CRITICAL JSON MANDATE:
- Respond ONLY with 100% valid, parseable JSON matching the schema below.
- NO markdown preamble or conversational text. Wrap in standard \`\`\`json ... \`\`\` or output pure JSON.
- NO single quotes in keys or string values.
- NO trailing commas before closing braces/brackets (e.g. NO { "a": 1, } or [ 1, 2, ]).
- All numbers must be bare numeric literals (e.g. 180000, NOT "1,80,000").
NOTE: The values in this schema are structure guides. You MUST populate them with the ACTUAL extracted data from LEAD & CLIENT CONTEXT:
{
  "cover": {
    "coupleName": "${effectiveLead?.name || 'Client Name'}",
    "groomName": "${effectiveLead?.name?.split('&')[0]?.trim() || effectiveLead?.name?.split(' ')[0]?.trim() || 'Groom'}",
    "brideName": "${effectiveLead?.name?.includes('&') ? effectiveLead?.name?.split('&')[1]?.trim() : ''}",
    "eventType": "Wedding",
    "locationName": "${extractedLocation ? extractedLocation.replace(/"/g, '\\"') : ''}"
  },
  "shootDetails": {
    "visible": false,
    "daysText": "1 Day Shoot",
    "crewText": "Candid Photography\\nCinematography\\nDrone Pilot",
    "deliverablesText": "Full Ultra HD Raw Photos\\nApprox. 50 Edited Photos\\n1 Teaser Video Reel",
    "showExclusionsNote": true
  },
  "functionsPage": {
    "items": [
      {
        "id": "func-1",
        "name": "Wedding",
        "date": ${extractedEventDate ? JSON.stringify(formatQuotationDate(extractedEventDate)) : '"13 - Dec - 2026"'},
        "dateNotFixed": ${extractedEventDate ? 'false' : 'true'},
        "startTime": "",
        "endTime": "",
        "location": "${extractedLocation ? extractedLocation.replace(/"/g, '\\"') : ''}",
        "requirements": [
          { "name": "Candid Photographer", "qty": 1 },
          { "name": "Cinematographer", "qty": 1 }
        ],
        "notes": ""
      }
    ]
  },
  "deliverablesPage": {
    "selectedItems": [
      "Full Ultra HD Super-Fine Raw Photos",
      "High Resolution Edited Photos (300+)",
      "Cinematic Teaser (3-5 Mins)",
      "Traditional Wedding Film (30-45 Mins)"
    ]
  },
  "specialValueAdditions": {
    "selectedItems": [],
    "note": ""
  },
  "pricingPage": {
    "basePrice": 150000,
    "discountAmount": 0,
    "gstPct": 0,
    "travelCharges": 0,
    "accommodationCharges": 0,
    "additionalCharges": 0,
    "showExclusionsNote": true,
    "note": ""
  },
  "paymentTermsPage": {
    "steps": [
      { "name": "Advance Token", "pct": "30%", "amount": 45000, "status": "Pending" },
      { "name": "On Event Day", "pct": "50%", "amount": 75000, "status": "Pending" },
      { "name": "On Final Delivery", "pct": "20%", "amount": 30000, "status": "Pending" }
    ]
  }
}

==================================================
LEAD & CLIENT CONTEXT:
- Lead Name: ${effectiveLead.name || 'N/A'}
- Phone: ${effectiveLead.phone || 'N/A'}
- Email: ${effectiveLead.email || 'N/A'}
- Extracted Event Date / Month: ${extractedEventDate || 'Not specified'}
- Extracted Budget / Range: ${extractedBudget || 'Not specified'}
- Extracted Venue / City: ${extractedLocation || 'Not specified'}
- Extracted Functions / Requirements: ${extractedFunctions || 'Not specified'}
- Lead Form Payload: ${JSON.stringify(effectiveLead.raw_payload || {}, null, 2)}
- Lead Comments & Notes: ${Array.isArray(effectiveLead.comments) ? effectiveLead.comments.map((c: any) => c.text).join('\n') : 'N/A'}
- Additional Notes: ${additionalNotes || 'N/A'}`;

    navigator.clipboard.writeText(masterPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const notes = additionalNotes.trim();

      // FAST PATH: Synchronously parse pasted AI JSON in 0ms before any network calls!
      const clientParsedDoc = tryParsePastedAiJson(notes, baseTemplateDoc || currentDocumentData, effectiveLead);
      if (clientParsedDoc) {
        setExtractedDoc(clientParsedDoc);
        const coupleName = clientParsedDoc.cover?.coupleName || 'Client';
        const totalAmount = (clientParsedDoc.pricingPage?.basePrice || 0) - (clientParsedDoc.pricingPage?.discountAmount || 0);
        setSummary({
          coupleName,
          weddingDate: clientParsedDoc.functionsPage?.items?.[0]?.date || 'Date TBD',
          location: clientParsedDoc.cover?.locationName || 'Location TBD',
          functionsCount: clientParsedDoc.functionsPage?.items?.length || 0,
          functionsList: (clientParsedDoc.functionsPage?.items || []).map((f: any) => f.name),
          photographers: 2,
          cinematographers: 2,
          totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
        });
        setMissingInfo([]);
        setConflicts([]);
        setStep('preview');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: effectiveLead.id,
          quotationId: quotationId || null,
          explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || null,
          currentDocument: baseTemplateDoc || currentDocumentData || null,
          additionalNotes: additionalNotes.trim()
        })
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error('AI Quotation server is initializing. Please click Generate Quotation again in a moment.');
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI could not generate quotation.');
      }

      setExtractedDoc(json.extractedDocument);
      setSummary(json.summary);
      setMissingInfo(json.missingInformation || []);
      setConflicts(json.conflicts || []);
      setStep('preview');
    } catch (err: any) {
      console.error('[AI Modal Generation Error]:', err);
      setErrorMsg(err.message || "AI couldn't generate the quotation. Your existing quotation has not been changed.");
    } finally {
      setGenerating(false);
    }
  };

  const applyDocAndNavigate = async (docToApply: any) => {
    if (!docToApply) return;

    // ⚡ INSTANT 0ms OPTIMISTIC BUILDER APPLY (Inside Builder):
    if (quotationId && onApplied) {
      const mergedDoc = normalizeQuotationData(docToApply, currentDocumentData || baseTemplateDoc);
      const docCouple = (docToApply?.cover?.coupleName || mergedDoc?.cover?.coupleName || '').trim();
      const coupleName = (docCouple && !isPlaceholderCoupleName(docCouple)) 
        ? docCouple 
        : (effectiveLead?.name && !['client', 'valued client', 'lead'].includes(effectiveLead.name.toLowerCase().trim()) ? effectiveLead.name : 'Quotation');
      if (!mergedDoc.cover) mergedDoc.cover = {};
      mergedDoc.cover.coupleName = coupleName;
      if (docToApply?.cover?.groomName) mergedDoc.cover.groomName = docToApply.cover.groomName;
      if (docToApply?.cover?.brideName) mergedDoc.cover.brideName = docToApply.cover.brideName;
      if (effectiveLead.location && !mergedDoc.cover.locationName) {
        mergedDoc.cover.locationName = effectiveLead.location;
      }
      const eventType = (docToApply?.cover?.eventType || mergedDoc?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
      const quotationTitle = `${coupleName} - ${eventType}`;
      mergedDoc.designName = quotationTitle;
      mergedDoc.title = quotationTitle;

      try {
        sessionStorage.setItem(`current_quotation_doc_${quotationId}`, JSON.stringify(mergedDoc));
        sessionStorage.setItem('current_active_quotation_doc', JSON.stringify({ id: quotationId, document: mergedDoc }));
      } catch (_) {}

      onApplied(mergedDoc, quotationId);
      onClose();

      // Silent background cloud persistence
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || '';
          await fetch('/api/quotations/ai-apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              quotationId,
              document: mergedDoc
            })
          });
          const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
          await cacheDocumentLocal(quotationId, mergedDoc, 1);
        } catch (e) {
          console.warn('[AI Apply Background Persist]:', e);
        }
      })();
      return;
    }

    // ⚡ INSTANT OPTIMISTIC CREATION FOR LEAD (<50ms):
    const lId = effectiveLead.id;
    const leadShort = String(lId || 'LEAD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Calculate next version dynamically from local caches
    let nextVersion = 1;
    if (lId && lId !== 'draft') {
      try {
        const scRaw = sessionStorage.getItem(`lead_quotes_cache_${lId}`) || localStorage.getItem(`lead_quotes_cache_${lId}`);
        if (scRaw) {
          const parsed = JSON.parse(scRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            nextVersion = Math.max(...parsed.map((v: any) => Number(v.version) || 0)) + 1;
          }
        }
        if (nextVersion === 1) {
          const stored = localStorage.getItem('sc_quotation_summary_map');
          if (stored) {
            const map = JSON.parse(stored);
            if (map[lId]?.versions?.length > 0) {
              nextVersion = Math.max(...map[lId].versions.map((v: any) => Number(v.version) || 0)) + 1;
            } else if (map[lId]?.count > 0) {
              nextVersion = (map[lId].count || 0) + 1;
            }
          }
        }
      } catch (_) {}
    }

    const targetQId = quotationId || `FW-Q-${leadShort}-V${nextVersion}-${randSuffix}`;

    const mergedDoc = normalizeQuotationData(docToApply, baseTemplateDoc || currentDocumentData);
    mergedDoc.id = targetQId;
    mergedDoc.lead_id = lId;
    mergedDoc.lead_version = nextVersion;

        const docCouple = (docToApply?.cover?.coupleName || mergedDoc?.cover?.coupleName || '').trim();
    const coupleName = (docCouple && !isPlaceholderCoupleName(docCouple)) 
      ? docCouple 
      : (effectiveLead?.name && !['client', 'valued client', 'lead'].includes(effectiveLead.name.toLowerCase().trim()) ? effectiveLead.name : 'Quotation');
    if (!mergedDoc.cover) mergedDoc.cover = {};
    mergedDoc.cover.coupleName = coupleName;
    if (docToApply?.cover?.groomName) mergedDoc.cover.groomName = docToApply.cover.groomName;
    if (docToApply?.cover?.brideName) mergedDoc.cover.brideName = docToApply.cover.brideName;
    if (effectiveLead.location && !mergedDoc.cover.locationName) {
      mergedDoc.cover.locationName = effectiveLead.location;
    }

    const eventType = (docToApply?.cover?.eventType || mergedDoc?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
    const quotationTitle = `${coupleName} - ${eventType}`;
    mergedDoc.designName = quotationTitle;
    mergedDoc.title = quotationTitle;

    // 2. Prime sessionStorage & localStorage immediately (0ms hydration in builder)
    try {
      sessionStorage.setItem(`current_quotation_doc_${targetQId}`, JSON.stringify(mergedDoc));
      sessionStorage.setItem('current_active_quotation_doc', JSON.stringify({ id: targetQId, document: mergedDoc }));
      localStorage.setItem(`wg_proposal_draft_${targetQId}`, JSON.stringify(mergedDoc));

      if (lId && lId !== 'draft') {
        const newVer = {
          id: targetQId,
          template_id: targetQId,
          lead_id: lId,
          version: nextVersion,
          version_label: `V${nextVersion}`,
          title: quotationTitle,
          couple_name: coupleName,
          is_final: false,
          created_at: new Date().toISOString()
        };

        let existingCache: any[] = [];
        try {
          const scRaw = sessionStorage.getItem(`lead_quotes_cache_${lId}`) || localStorage.getItem(`lead_quotes_cache_${lId}`);
          if (scRaw) existingCache = JSON.parse(scRaw);
        } catch (_) {}
        const updatedCache = [newVer, ...existingCache.filter((v: any) => v.id !== targetQId && v.template_id !== targetQId)];
        sessionStorage.setItem(`lead_quotes_cache_${lId}`, JSON.stringify(updatedCache));
        localStorage.setItem(`lead_quotes_cache_${lId}`, JSON.stringify(updatedCache));

        const stored = localStorage.getItem('sc_quotation_summary_map');
        const map = stored ? JSON.parse(stored) : {};
        const prev = map[lId] || { count: 0, hasFinal: false, versions: [] };
        map[lId] = {
          count: (prev.count || 0) + 1,
          hasFinal: prev.hasFinal || false,
          finalVersion: prev.finalVersion,
          versions: [newVer, ...(prev.versions || []).filter((v: any) => v.template_id !== targetQId && v.id !== targetQId)]
        };
        localStorage.setItem('sc_quotation_summary_map', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('quotation_created', { detail: { leadId: lId, quotationId: targetQId } }));

        broadcastQuotationSync(lead?.workspace_id, {
          leadId: lId,
          quotationId: targetQId,
          action: 'create',
          isFinal: false
        });
      }
    } catch (_) {}

    // 3. Immediately trigger navigation or callback in <50ms!
    if (onApplied) {
      onApplied(mergedDoc, targetQId);
    } else if (targetQId && targetQId !== 'draft') {
      router.push(`/workspace/quotations/builder/templet/${targetQId}`);
      onClose();
    } else {
      onClose();
    }

    // 4. Non-blocking background cloud persistence (Supabase single source of truth)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';

        if (!quotationId && lId && lId !== 'draft') {
          await fetch('/api/quotations/create-for-lead', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              leadId: lId,
              quotationId: targetQId,
              clientName: coupleName,
              explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || undefined,
              initialDocument: mergedDoc
            })
          });
        } else if (targetQId && targetQId !== 'draft') {
          await fetch('/api/quotations/ai-apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              quotationId: targetQId,
              document: mergedDoc
            })
          });
        }

        const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
        await cacheDocumentLocal(targetQId, mergedDoc, 1);
      } catch (e) {
        console.warn('[AI Background Persist Error]:', e);
      }
    })();
  };

  const handleApply = async () => {
    await applyDocAndNavigate(extractedDoc);
  };

  const handleQuickCreateAndOpen = async () => {
    setErrorMsg(null);
    try {
      const notes = additionalNotes.trim();

      if (!notes) {
        setErrorMsg('कृपया पहले माइक से बोलें या कोटेशन की कुछ डिटेल्स लिखें (या Paste करें) ताकि AI कोटेशन बना सके!');
        return;
      }

      setGenerating(true);

      // FAST PATH 1: Synchronously parse pasted AI JSON in 0ms before any network calls!
      const clientParsedDoc = tryParsePastedAiJson(notes, baseTemplateDoc || currentDocumentData, effectiveLead);
      if (clientParsedDoc) {
        setExtractedDoc(clientParsedDoc);
        await applyDocAndNavigate(clientParsedDoc);
        return;
      }

      // 2. Full AI Extraction via OpenAI GPT-4o-mini
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: effectiveLead.id,
          quotationId: quotationId || null,
          explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || null,
          currentDocument: baseTemplateDoc || currentDocumentData || null,
          additionalNotes: notes
        })
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error('AI Quotation server is initializing. Please try again in a moment.');
      }

      if (!res.ok || !json.success || !json.extractedDocument) {
        throw new Error(json.error || 'AI could not generate quotation.');
      }

      setExtractedDoc(json.extractedDocument);
      await applyDocAndNavigate(json.extractedDocument);
    } catch (err: any) {
      console.error('[AI Modal Quick Create Error]:', err);
      setErrorMsg(err.message || "Could not create quotation. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-white dark:bg-[#1A1816] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 dark:border-amber-500/10 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                  ✨ Create Quotation with AI
                </h3>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {step === 'input' ? "AI will use this lead's information to prepare your quotation." : "Review AI generated proposal before applying."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto overflow-x-hidden flex-1 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 'input' ? (
              <div className="space-y-4">
                {/* Lead Summary Overview */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 dark:bg-zinc-900/60 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Lead Information
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Ready for Extraction
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>{lead?.name || 'Valued Client'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Client details</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Event & date info</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lead notes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{quotationId ? 'Current quotation draft' : 'Default template schema'}</span>
                    </div>
                  </div>
                </div>

                {/* Selected Studio Template Design */}
                {!quotationId && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/5 dark:bg-zinc-900/60 border border-amber-500/20 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Template Design
                        </div>
                        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          Applied to new quotation
                        </div>
                      </div>
                    </div>
                    <QuotationTemplateSelector
                      templates={availableTemplates}
                      selectedId={activeTemplateId || selectedTemplateId || null}
                      onSelect={(id) => setActiveTemplateId(id)}
                      workspaceId={effectiveLead?.workspace_id}
                      placement="bottom"
                      align="right"
                    />
                  </div>
                )}

                {/* 🎙️ ChatGPT-Style Voice & Text Input Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Requirements & Details (Voice or Text)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                      OpenAI Whisper + GPT-4o-mini
                    </span>
                  </div>

                  {/* Success & Error Toasts (Always visible on mobile without scrolling) */}
                  {transcribeSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>वॉइस ट्रांसक्राइब हो गई! नीचे '⚡ Create Quotation' पर क्लिक करें या टेक्स्ट एडिट करें।</span>
                    </motion.div>
                  )}

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{errorMsg}</span>
                      </div>
                      <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}

                  {/* ChatGPT-Style Input Card */}
                  <div className={`relative rounded-2xl border transition-all duration-200 bg-white dark:bg-zinc-900 ${
                    isRecording 
                      ? 'border-rose-500 ring-4 ring-rose-500/20 shadow-lg' 
                      : isTranscribing
                      ? 'border-amber-500 ring-4 ring-amber-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-xs'
                  }`}>
                    {/* Textarea */}
                    <textarea
                      rows={5}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder={isTranscribing ? "🎙️ आपकी आवाज़ OpenAI Whisper से ट्रांसक्राइब हो रही है, कृपया रुकें..." : "माइक से बोलें या यहाँ लिखें (हिंदी, मराठी, English):\nजैसे: 'रोहन और पूजा की शादी 18-19 नवंबर को लोनावला में, 18 को संगीत और हल्दी, 2 कैंडिड और 2 सिनेमैटोग्राफर, 1 ड्रोन, पैकेज 2.2 लाख, 20k डिस्काउंट, 25% एडवांस...'\n\n💡 या ChatGPT का JSON सीधे यहाँ पेस्ट करें!"}
                      className="w-full p-4 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none resize-none leading-relaxed"
                    />

                    {/* ChatGPT Bottom Action Bar */}
                    <div className="flex items-center justify-between p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-b-2xl">
                      {/* Left: Copy Prompt / Info */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySystemPrompt}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="Copy Master JSON Prompt to paste in ChatGPT"
                        >
                          {promptCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-amber-500" />
                              <span>Copy AI Prompt</span>
                            </>
                          )}
                        </button>

                        {additionalNotes.length > 0 && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                            {additionalNotes.length} chars
                          </span>
                        )}
                      </div>

                      {/* Right: ChatGPT Voice Controls */}
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-3 py-1.5 rounded-full">
                            {/* Red Pulsing Dot */}
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                            </span>

                            {/* Live Audio Waveform Bars (ChatGPT style) */}
                            <div className="flex items-center gap-1">
                              <span className="w-1 h-3.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1 h-5 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1 h-2.5 bg-rose-400 rounded-full animate-bounce"></span>
                              <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                              <span className="w-1 h-3 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.35s]"></span>
                            </div>

                            {/* Timer */}
                            <span className="text-[11px] font-black text-rose-700 dark:text-rose-300 tabular-nums">
                              {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                            </span>

                            {/* Cancel Button */}
                            <button
                              type="button"
                              onClick={cancelVoiceRecording}
                              className="w-6 h-6 rounded-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer ml-1"
                              title="Cancel recording"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            {/* Stop & Transcribe Button */}
                            <button
                              type="button"
                              onClick={stopVoiceRecording}
                              className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                              title="Stop and Transcribe"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>Done</span>
                            </button>
                          </div>
                        ) : isTranscribing ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            <span>Transcribing with Whisper...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {additionalNotes.trim().length > 0 && (
                              <button
                                type="button"
                                onClick={handleQuickCreateAndOpen}
                                disabled={generating}
                                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                title="Create Quotation with AI"
                              >
                                {generating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Create</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={startVoiceRecording}
                              disabled={generating}
                              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                              title="बोलकर कोटेशन बनाएँ (OpenAI Whisper Voice Mode)"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW STEP */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Quotation Summary
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Couple Name</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.coupleName || 'Rahul & Neha'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Wedding Date</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.weddingDate || 'TBD'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Location / Venue</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.location || 'MUMBAI'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Investment</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
                        {summary?.totalInvestment || '₹1,50,000'}
                      </span>
                    </div>
                  </div>

                  {/* Functions List */}
                  {summary?.functionsList && summary.functionsList.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">Functions Identified ({summary.functionsCount})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.functionsList.map((fn: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            ✓ {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conflicts Alert */}
                {conflicts.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Data Conflict Detected</span>
                    </div>
                    {conflicts.map((conf: any, idx: number) => (
                      <div key={idx} className="text-xs text-amber-900 dark:text-amber-200 pl-6">
                        • {conf.message || `${conf.field}: ${conf.values?.join(' vs ')}`}
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing Details Warning */}
                {missingInfo.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>⚠ {missingInfo.length} detail{missingInfo.length > 1 ? 's' : ''} need your attention</span>
                    </div>
                    <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4 list-disc">
                      {missingInfo.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            {step === 'input' ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={generating}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySystemPrompt}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copy complete multi-page AI system prompt with client metadata"
                  >
                    {promptCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span>Copy AI Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickCreateAndOpen}
                    disabled={generating || applying}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-amber-500/25 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {generating || applying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{quotationId ? 'Applying to Quotation...' : 'Opening Design...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>{quotationId ? '⚡ Apply to Quotation' : '⚡ Create Quotation'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  disabled={applying}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to Input
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Applying Data...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{missingInfo.length > 0 ? 'Apply Anyway' : 'Apply to Quotation'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

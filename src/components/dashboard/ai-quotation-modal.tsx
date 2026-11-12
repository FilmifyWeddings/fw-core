'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Check, AlertTriangle, ArrowRight, Loader2, 
  FileText, Calendar, MapPin, Users, DollarSign, Camera, Video, MessageSquare,
  Mic, MicOff, Volume2, Square, Copy
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import { broadcastQuotationSync } from '@/lib/realtime-quotations';
import { QuotationTemplateSelector, StudioTemplateItem, getSynchronousCachedTemplates } from './quotation-template-selector';
import { fallbackHeuristicExtractor, mapAiOutputToQuotationDocument, syncShootPageInSequence, syncSpecialValuePageInSequence } from '@/lib/ai-quotation-extractor';
import { isPlaceholderCoupleName } from '@/lib/quotation-defaults';
import { cleanVoiceTranscript, normalizeComparisonTokens } from '@/lib/speech-text-cleaner';
import { safeLocalStorageSet, safeSessionStorageSet, pruneDocumentForListCache } from '@/lib/storage-safety';
import {
  fetchWorkspaceQuotationSettings,
  fetchWorkspaceEventTypes,
  fetchWorkspaceCrewRoles,
  WorkspaceQuotationSettings,
  WorkspaceEventType,
  WorkspaceCrewRole
} from '@/lib/workspace-settings';
import { 
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
  onApplied?: (updatedDoc: any, targetQuotationId: string, isBackgroundRefine?: boolean) => void;
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
  // so the caller invokes Google Gemini (/api/quotations/ai-extract) with 100% full extraction!
  return null;
}


function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const isSafariWebKit = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
  const candidates = isSafariWebKit
    ? [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/aac',
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

  const rawCurrCouple = String(currentDocumentData?.cover?.coupleName || '').trim();
  const effectiveLead: any = lead || {
    id: quotationId || 'draft',
    name: rawCurrCouple && !isPlaceholderCoupleName(rawCurrCouple) ? rawCurrCouple : 'Client',
    phone: '',
    email: '',
    raw_payload: {},
    comments: []
  };

  // ⚙️ Studio Quotation Settings, Official Functions, Crew Roles & AI Shortcuts Sync
  const [studioSettings, setStudioSettings] = useState<WorkspaceQuotationSettings | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const wsId = lead?.workspace_id || (lead as any)?.raw_payload?.workspace_id;
        const local = localStorage.getItem(`wg_quote_settings_${wsId || 'default'}`) || localStorage.getItem('wg_quote_settings_default');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (_) {}
    }
    return null;
  });

  const [studioEventTypes, setStudioEventTypes] = useState<WorkspaceEventType[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const wsId = lead?.workspace_id || (lead as any)?.raw_payload?.workspace_id;
        const local = localStorage.getItem(`wg_custom_event_types_${wsId || 'default'}`) || localStorage.getItem('wg_custom_event_types_default');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            return parsed.filter((e: any) => String(e?.category || '').toLowerCase() !== 'ritual');
          }
        }
      } catch (_) {}
    }
    return [];
  });

  const [studioCrewRoles, setStudioCrewRoles] = useState<WorkspaceCrewRole[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    try {
      router.prefetch('/workspace/quotations/builder/templet/draft');
    } catch (_) {}

    const syncStudioConfig = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        authSessionRef.current = {
          token: session?.access_token || '',
          userId: session?.user?.id || ''
        };
        let wsId = effectiveLead?.workspace_id || (effectiveLead as any)?.raw_payload?.workspace_id || session?.user?.id || undefined;
        const [settings, evTypes, roles] = await Promise.all([
          fetchWorkspaceQuotationSettings(wsId).catch(() => null),
          fetchWorkspaceEventTypes(wsId).catch(() => null),
          fetchWorkspaceCrewRoles(wsId).catch(() => null)
        ]);
        if (!active) return;
        if (settings) setStudioSettings(settings);
        if (Array.isArray(evTypes) && evTypes.length > 0) {
          setStudioEventTypes(evTypes.filter(e => String(e?.category || '').toLowerCase() !== 'ritual'));
        }
        if (Array.isArray(roles) && roles.length > 0) {
          setStudioCrewRoles(roles);
        }
      } catch (err) {
        console.warn('[AiQuotationModal] Error fetching studio settings:', err);
      }
    };
    syncStudioConfig();
    const onSettingsUpdated = () => { syncStudioConfig(); };
    window.addEventListener('workspace_quotation_settings_updated', onSettingsUpdated);
    window.addEventListener('workspace_crew_roles_updated', onSettingsUpdated);
    return () => {
      active = false;
      window.removeEventListener('workspace_quotation_settings_updated', onSettingsUpdated);
      window.removeEventListener('workspace_crew_roles_updated', onSettingsUpdated);
    };
  }, [isOpen, effectiveLead?.workspace_id, router]);

  // 🎙️ Voice MediaRecorder & Real-time Live Streaming State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [transcribeSuccess, setTranscribeSuccess] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialAppendTextRef = useRef<string>('');
  const liveCapturedTextRef = useRef<string>('');
  const rawLiveTranscriptRef = useRef<string>('');
  const committedRawTranscriptRef = useRef<string>('');
  const currentSegmentRawRef = useRef<string>('');
  const isRecordingRef = useRef<boolean>(false);
  const dictationFinalizedRef = useRef<boolean>(false);
  const voiceSessionIdRef = useRef<number>(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);
  const additionalNotesRef = useRef<string>(additionalNotes);
  additionalNotesRef.current = additionalNotes;
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoScrollOnNextNotesRef = useRef<boolean>(false);
  const isPolishingInProgressRef = useRef<boolean>(false);
  const authSessionRef = useRef<{ token: string; userId: string } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const maxMicRmsRef = useRef<number>(0);
  const hadAnalyserSamplesRef = useRef<boolean>(false);
  const rmsRafRef = useRef<number | null>(null);

  const stopAudioMeter = () => {
    if (rmsRafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      try { cancelAnimationFrame(rmsRafRef.current); } catch (_) {}
      rmsRafRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }
  };

  const joinPrefixAndDictation = (prefix: string, body: string): string => {
    const cleanPrefix = (prefix || '').trim();
    const cleanBody = (body || '').trim();
    if (!cleanPrefix) return cleanBody;
    if (!cleanBody) return cleanPrefix;
    return `${cleanPrefix} ${cleanBody}`;
  };

  /**
   * ⚡ Real-Time Gemini Flash AI Polish & Intent Analysis (100% Lossless)
   * Analyzes what the user spoke, fixes speech errors/misheard words without dropping ANY clause,
   * detects couple names, ceremonies, crew, rules, budget, and deliverables,
   * and updates the textarea seamlessly in place.
   */
  const polishTextWithGemini = async (textToPolish: string, replaceEntireField: boolean = false) => {
    const raw = (textToPolish || '').trim();
    if (!raw || isPolishingInProgressRef.current) return;
    isPolishingInProgressRef.current = true;
    setIsPolishing(true);
    try {
      let cachedSess = authSessionRef.current;
      if (!cachedSess) {
        const { data: { session } } = await supabase.auth.getSession();
        cachedSess = { token: session?.access_token || '', userId: session?.user?.id || '' };
        authSessionRef.current = cachedSess;
      }
      const res = await fetch('/api/ai/polish-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: raw,
          leadName: effectiveLead?.name,
          workspaceId: effectiveLead?.workspace_id || cachedSess?.userId || null,
          userId: cachedSess?.userId || null,
          studioSettings: studioSettings,
          studioEventTypes: studioEventTypes,
          studioCrewRoles: studioCrewRoles
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.polishedText) {
          let cleanPolished = json.polishedText.trim();

          // Client-side safeguard: if raw voice input had an amount/budget and cleanPolished missed it, keep it
          const rawAmt = raw.match(/(?:बजट|budget|प्राइस|price|अमाउंट|amount)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?\s*(?:लाख|lakh|lac|हजार|thousand|k|cr|करोड़)|\d{4,7})/i);
          if (rawAmt && !cleanPolished.match(/(?:₹|rs\.?|inr|\d+\s*(?:lakh|lac|लाख|k|हजार|thousand))/i)) {
            cleanPolished += `. Budget: ${rawAmt[0].trim()}`;
          }

          autoScrollOnNextNotesRef.current = true;
          if (!replaceEntireField && initialAppendTextRef.current) {
            setAdditionalNotes(joinPrefixAndDictation(initialAppendTextRef.current, cleanPolished));
          } else {
            setAdditionalNotes(cleanPolished);
          }
          setTranscribeSuccess(true);
          setTimeout(() => setTranscribeSuccess(false), 4000);
        }
      }
    } catch (err) {
      console.warn('[AI Voice Polish error]:', err);
    } finally {
      setIsPolishing(false);
      isPolishingInProgressRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioMeter();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      if (audioStreamRef.current) {
        try { audioStreamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {}
        audioStreamRef.current = null;
      }
    };
  }, []);

  const finalizeLiveTextFallback = (spokenRaw: string, shouldPolishWithLlm: boolean = true) => {
    const raw = (spokenRaw || '').trim();
    if (!raw || isCancelledRef.current) return;
    const finalCleaned = cleanVoiceTranscript(raw, effectiveLead?.name);
    liveCapturedTextRef.current = finalCleaned;
    autoScrollOnNextNotesRef.current = true;
    setAdditionalNotes(joinPrefixAndDictation(initialAppendTextRef.current, finalCleaned));
    setTranscribeSuccess(true);
    setIsRecording(false);
    setIsTranscribing(false);
    setTimeout(() => setTranscribeSuccess(false), 4000);
    if (shouldPolishWithLlm && !isPolishingInProgressRef.current) {
      polishTextWithGemini(raw, false);
    }
  };

  const transcribeWithAudioAi = async (audioBlob: Blob, detectedMime: string = '', liveFallbackRaw: string = '') => {
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      const lowerMime = (detectedMime || '').toLowerCase();
      let ext = 'webm';
      let cleanMime = 'audio/webm';
      if (lowerMime.includes('mp4') || lowerMime.includes('aac') || lowerMime.includes('m4a')) {
        ext = 'mp4';
        cleanMime = 'audio/mp4';
      } else if (lowerMime.includes('wav')) {
        ext = 'wav';
        cleanMime = 'audio/wav';
      } else if (lowerMime.includes('ogg')) {
        ext = 'ogg';
        cleanMime = 'audio/ogg';
      } else if (lowerMime.includes('mp3') || lowerMime.includes('mpeg')) {
        ext = 'mp3';
        cleanMime = 'audio/mpeg';
      }

      const file = new File([audioBlob], `voice_input.${ext}`, { type: cleanMime });
      fd.append('audio', file, `voice_input.${ext}`);
      if (effectiveLead?.name) fd.append('leadName', String(effectiveLead.name));

      const evNames = Array.from(new Set(studioEventTypes.map((e) => e?.name || '').filter(Boolean))).join(', ');
      if (evNames) fd.append('studioEventNames', evNames);

      const roleNames = Array.from(new Set(studioCrewRoles.map((r) => r?.name || '').filter(Boolean))).join(', ');
      if (roleNames) fd.append('studioCrewRoles', roleNames);

      const triggers = Array.isArray(studioSettings?.aiRules?.shortcuts)
        ? studioSettings.aiRules.shortcuts.map((s: any) => s?.trigger).filter(Boolean).join(', ')
        : '';
      if (triggers) fd.append('shortcutTriggers', triggers);
      if (liveFallbackRaw) fd.append('liveDraft', liveFallbackRaw);

      const res = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        body: fd
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        console.warn('[Audio AI Non-JSON response]:', rawText?.slice(0, 150));
        throw new Error('Audio AI service was momentarily busy.');
      }

      if (res.status === 422 && data?.noSpeech) {
        if (liveFallbackRaw && liveFallbackRaw.trim().length >= 2) {
          const wordCount = liveFallbackRaw.trim().split(/\s+/).filter(Boolean).length;
          finalizeLiveTextFallback(liveFallbackRaw, wordCount >= 4);
        } else {
          setErrorMsg('आवाज़ साफ़ सुनाई नहीं दी। कृपया थोड़ा नज़दीक से दोबारा बोलें या सीधे लिखें।');
        }
        return;
      }

      if (res.ok && data.text) {
        const finalAudioText = String(data.text || '').trim();
        // Guard against severe divergence only when WebSpeech clearly captured >= 4 meaningful tokens
        if (liveFallbackRaw && liveFallbackRaw.trim().length >= 4) {
          const liveTokens = normalizeComparisonTokens(liveFallbackRaw);
          const candTokens = normalizeComparisonTokens(finalAudioText);
          const candWordCount = finalAudioText.split(/\s+/).filter(Boolean).length;
          if (liveTokens.length >= 4 && candWordCount >= 25 && candTokens.length >= 16) {
            const candSet = new Set(candTokens);
            let shared = 0;
            let sharedNums = 0;
            for (const tok of liveTokens) {
              if (candSet.has(tok)) {
                shared++;
                if (/^\d+$/.test(tok)) sharedNums++;
              }
            }
            const overlapRatio = shared / Math.min(liveTokens.length, candTokens.length);
            if (overlapRatio < 0.08 && sharedNums === 0) {
              finalizeLiveTextFallback(liveFallbackRaw, true);
              return;
            }
          }
        }
        autoScrollOnNextNotesRef.current = true;
        setAdditionalNotes(joinPrefixAndDictation(initialAppendTextRef.current, finalAudioText));
        setTranscribeSuccess(true);
        setTimeout(() => setTranscribeSuccess(false), 4500);

        // Google Gemini Audio AI already produces 1-step clean lossless text (`oneStepPolished: true`).
        // Only run secondary /api/ai/polish-speech when needed.
        if (!data.oneStepPolished) {
          polishTextWithGemini(finalAudioText, false);
        }
      } else {
        throw new Error(data.error || 'Could not transcribe audio.');
      }
    } catch (err: any) {
      console.warn('[Audio AI Notice]:', err);
      if (liveFallbackRaw && liveFallbackRaw.trim().length > 0) {
        finalizeLiveTextFallback(liveFallbackRaw, true);
      } else {
        let friendlyMsg = err.message || 'Audio transcription unavailable. You can type or paste notes directly.';
        if (friendlyMsg.includes('<!DOCTYPE') || friendlyMsg.includes('Unexpected token') || friendlyMsg.includes('JSON')) {
          friendlyMsg = 'Voice transcription service was momentarily interrupted. Please speak again or type notes directly.';
        }
        setErrorMsg(friendlyMsg);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const startVoiceRecording = async () => {
    setErrorMsg(null);
    setTranscribeSuccess(false);
    isCancelledRef.current = false;
    isRecordingRef.current = true;
    dictationFinalizedRef.current = false;
    voiceSessionIdRef.current += 1;
    initialAppendTextRef.current = additionalNotes.trim();
    liveCapturedTextRef.current = '';
    rawLiveTranscriptRef.current = '';
    committedRawTranscriptRef.current = '';
    currentSegmentRawRef.current = '';

    // 1. WebSpeech API for 0ms REAL-TIME LIVE STREAMING preview while MediaRecorder captures full fidelity audio
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'hi-IN'; // Recognizes Hindi, Marathi, Hinglish & English live!

        rec.onresult = (event: any) => {
          let currentSegText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentSegText += event.results[i][0].transcript + ' ';
          }
          currentSegmentRawRef.current = currentSegText.trim();
          const fullRaw = [committedRawTranscriptRef.current, currentSegmentRawRef.current]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          rawLiveTranscriptRef.current = fullRaw;

          const cleaned = cleanVoiceTranscript(fullRaw, effectiveLead?.name);
          liveCapturedTextRef.current = cleaned;
          autoScrollOnNextNotesRef.current = true;
          setAdditionalNotes(joinPrefixAndDictation(initialAppendTextRef.current, cleaned));
        };

        rec.onerror = (e: any) => {
          if (e?.error !== 'no-speech' && e?.error !== 'aborted') {
            console.warn('[WebSpeech Warning]:', e?.error);
          }
        };

        rec.onend = () => {
          if (currentSegmentRawRef.current) {
            committedRawTranscriptRef.current = [
              committedRawTranscriptRef.current,
              currentSegmentRawRef.current
            ]
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            currentSegmentRawRef.current = '';
            rawLiveTranscriptRef.current = committedRawTranscriptRef.current;
          }
          if (isRecordingRef.current && !isCancelledRef.current) {
            setTimeout(() => {
              if (isRecordingRef.current && !isCancelledRef.current && recognitionRef.current === rec) {
                try {
                  rec.start();
                } catch (_) {}
              }
            }, 60);
          }
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn('[WebSpeech Init Error]:', e);
      }
    }

    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        isRecordingRef.current = false;
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
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      maxMicRmsRef.current = 0;
      hadAnalyserSamplesRef.current = false;
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx: AudioContext = new AudioCtx();
          audioCtxRef.current = ctx;
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
          const timeDomain = new Uint8Array(analyser.fftSize);
          const sampleRms = () => {
            if (!isRecordingRef.current || audioCtxRef.current !== ctx) return;
            try {
              analyser.getByteTimeDomainData(timeDomain);
              let sumSq = 0;
              for (let i = 0; i < timeDomain.length; i++) {
                const v = (timeDomain[i] - 128) / 128;
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / timeDomain.length);
              if (rms > maxMicRmsRef.current) maxMicRmsRef.current = rms;
              hadAnalyserSamplesRef.current = true;
            } catch (_) {}
            rmsRafRef.current = requestAnimationFrame(sampleRms);
          };
          rmsRafRef.current = requestAnimationFrame(sampleRms);
        }
      } catch (_) {}

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAudioMeter();
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (_) {}
        if (audioStreamRef.current === stream) audioStreamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        if (dictationFinalizedRef.current) return;
        dictationFinalizedRef.current = true;

        // Grab live WebSpeech fallback immediately while sending complete audio blob to Google Gemini Audio AI!
        const capturedRaw = (
          rawLiveTranscriptRef.current ||
          [committedRawTranscriptRef.current, currentSegmentRawRef.current].filter(Boolean).join(' ') ||
          liveCapturedTextRef.current ||
          ''
        ).trim();

        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        const actualMime = recorder.mimeType || mimeType || 'audio/mp4';
        const audioBlob = chunks.length > 0 ? new Blob(chunks, { type: actualMime }) : null;

        // If mic sampled pure silence and WebSpeech captured zero words, abort cleanly without risking STT hallucinations
        if (!capturedRaw && hadAnalyserSamplesRef.current && maxMicRmsRef.current < 0.003) {
          setErrorMsg('माइक में कोई आवाज़ सुनाई नहीं दी। कृपया थोड़ा तेज़ और पास से बोलें या सीधे लिखें।');
          return;
        }

        if (capturedRaw.length > 0) {
          const previewClean = cleanVoiceTranscript(capturedRaw, effectiveLead?.name);
          autoScrollOnNextNotesRef.current = true;
          setAdditionalNotes(joinPrefixAndDictation(initialAppendTextRef.current, previewClean));
        }

        if (audioBlob && audioBlob.size >= 400) {
          console.log('[Audio AI Pipeline] Sending actual recorded audio:', audioBlob.size, 'bytes, mime:', actualMime);
          await transcribeWithAudioAi(audioBlob, actualMime, capturedRaw);
          return;
        }

        if (capturedRaw.length > 0) {
          finalizeLiveTextFallback(capturedRaw, true);
        } else {
          setErrorMsg('कोई आवाज़ रिकॉर्ड नहीं हुई। कृपया दोबारा बोलें।');
        }
      };

      // CRITICAL FOR iOS: Never pass timeslice! Prevents 0-byte chunk bug on iOS WebKit.
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      isRecordingRef.current = false;
      console.error('[Microphone Permission Error]:', err);
      alert('Microphone access was denied. Please allow microphone permissions in your browser.');
    }
  };

  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    isRecordingRef.current = false;
    dictationFinalizedRef.current = true;
    stopAudioMeter();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    if (audioStreamRef.current) {
      try { audioStreamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {}
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    committedRawTranscriptRef.current = '';
    currentSegmentRawRef.current = '';
    rawLiveTranscriptRef.current = '';
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAdditionalNotes(initialAppendTextRef.current || '');
  };

  const stopVoiceRecording = () => {
    const activeSessId = voiceSessionIdRef.current;
    isRecordingRef.current = false;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Pad 250ms before stopping recorder so concluding words/amounts on click are captured cleanly in audio!
    setTimeout(() => {
      if (isCancelledRef.current || activeSessId !== voiceSessionIdRef.current) return;

      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
          // Safety net in case browser MediaRecorder fails to emit onstop
          setTimeout(() => {
            if (!dictationFinalizedRef.current && !isCancelledRef.current && activeSessId === voiceSessionIdRef.current) {
              dictationFinalizedRef.current = true;
              const rawFull = (
                rawLiveTranscriptRef.current ||
                [committedRawTranscriptRef.current, currentSegmentRawRef.current].filter(Boolean).join(' ')
              ).trim();
              if (rawFull) finalizeLiveTextFallback(rawFull, true);
            }
          }, 1800);
          return;
        } catch (e) {
          console.warn('Error stopping media recorder:', e);
        }
      }

      if (!dictationFinalizedRef.current && !isCancelledRef.current) {
        dictationFinalizedRef.current = true;
        const rawFull = (
          rawLiveTranscriptRef.current ||
          [committedRawTranscriptRef.current, currentSegmentRawRef.current].filter(Boolean).join(' ')
        ).trim();
        const cleanedCap = (liveCapturedTextRef.current || '').trim();
        const fallbackText = (additionalNotesRef.current || '').replace(initialAppendTextRef.current || '', '').trim();
        const spoken = rawFull || cleanedCap || fallbackText;
        if (spoken) finalizeLiveTextFallback(spoken, true);
      }
    }, 250);
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
  const [fetchedTemplateDoc, setFetchedTemplateDoc] = useState<any>(null);

  const activeTemplateObj = useMemo(() => {
    if (!availableTemplates || availableTemplates.length === 0) return null;
    const targetId = activeTemplateId || selectedTemplateId;
    if (targetId) {
      const found = availableTemplates.find(t => t.id === targetId);
      if (found) return found;
    }
    return availableTemplates.find(t => t.is_default) || availableTemplates[0] || null;
  }, [availableTemplates, activeTemplateId, selectedTemplateId]);

  const baseTemplateDoc = useMemo(() => {
    if (activeTemplateObj?.content_json && typeof activeTemplateObj.content_json === 'object' && Object.keys(activeTemplateObj.content_json).length > 0) {
      return activeTemplateObj.content_json;
    }
    if (fetchedTemplateDoc && typeof fetchedTemplateDoc === 'object' && Object.keys(fetchedTemplateDoc).length > 0) {
      return fetchedTemplateDoc;
    }
    if (typeof window !== 'undefined') {
      try {
        const cachedTmpls = getSynchronousCachedTemplates(effectiveLead?.workspace_id);
        const targetId = activeTemplateId || selectedTemplateId || activeTemplateObj?.id;
        const found = cachedTmpls.find(t => t.id === targetId) || cachedTmpls.find(t => t.is_default) || cachedTmpls[0];
        if (found?.content_json && Object.keys(found.content_json).length > 0) {
          return found.content_json;
        }
      } catch (_) {}
    }
    return currentDocumentData || DEFAULT_AIRY_PROPOSAL;
  }, [activeTemplateObj, fetchedTemplateDoc, activeTemplateId, selectedTemplateId, effectiveLead?.workspace_id, currentDocumentData]);

  // Ensure content_json of selected template is always fetched & state updated if missing in memory
  useEffect(() => {
    const targetId = activeTemplateId || selectedTemplateId || activeTemplateObj?.id;
    if (!targetId) return;

    if (activeTemplateObj?.content_json && Object.keys(activeTemplateObj.content_json).length > 0) {
      setFetchedTemplateDoc(activeTemplateObj.content_json);
      return;
    }

    fetch(`/api/templates/${targetId}`)
      .then(r => r.json())
      .then(json => {
        const docContent = json.document?.content_json || json.document?.document_json || (json.document?.cover ? json.document : null);
        if (docContent) {
          if (activeTemplateObj) {
            activeTemplateObj.content_json = docContent;
          }
          setFetchedTemplateDoc(docContent);
        }
      })
      .catch(err => console.warn('[AI Modal] Template content fetch error:', err));
  }, [activeTemplateId, selectedTemplateId, activeTemplateObj]);

  // Auto-scroll live voice dictation box to bottom when recording/transcribing updates notes
  useEffect(() => {
    if (!autoScrollOnNextNotesRef.current && !isRecording) return;
    autoScrollOnNextNotesRef.current = false;
    const el = notesTextareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.scrollTop = notesTextareaRef.current.scrollHeight;
      }
    });
  }, [additionalNotes, isRecording, isTranscribing, isPolishing]);

  if (!isOpen) return null;

  const handleCopySystemPrompt = () => {
    const rawPayload = effectiveLead.raw_payload || {};
    const extractedEventDate = rawPayload.event_date || rawPayload.wedding_date || rawPayload.date || rawPayload.wedding_month || rawPayload.month || effectiveLead.event_date || '';
    const extractedBudget = rawPayload.budget || rawPayload.preferred_budget_range || rawPayload.approximate_budget || effectiveLead.budget || '';
    const extractedLocation = rawPayload.location || rawPayload.city || rawPayload.venue || rawPayload.destination || effectiveLead.location || '';
    const extractedFunctions = rawPayload.functions || rawPayload.wedding_functions || rawPayload.events || '';

    const studioEventNamesList = Array.from(
      new Set(
        studioEventTypes
          .map(e => (e?.name || '').trim())
          .filter(n => n && !/pre[\s-]*wed|prewedding|pre[\s-]*shoot/i.test(n))
      )
    );

    const masterPrompt = `You are StudioCore AI Quotation Assistant for Professional Wedding & Event Photography Studios.

==================================================
🎯 YOUR TASK:
Analyze the client requirements, notes, or conversation below and convert them into a 100% structured StudioCore Quotation JSON document.
CRITICAL MANDATE: Extract real event dates/months, real wedding functions, real budgets, and real locations from the LEAD & CLIENT CONTEXT. DO NOT hallucinate fake data, and DO NOT output default placeholders when real client data is present.
${studioEventNamesList.length > 0 ? `\nSTUDIO'S OFFICIAL FUNCTIONS / SUB-EVENTS LIST (USE THESE EXACT NAMES):\n${studioEventNamesList.map(n => `- "${n}"`).join('\n')}\n` : ''}
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
- STRICT VISIBILITY RULE:
  * If Pre-Wedding ("pre-wedding", "pre shoot", "प्री वेडिंग", "प्री-वेडिंग", "प्रीवेडिंग") is NOT requested in the client notes / voice note (or explicitly declined):
    YOU MUST set visible: false and leave daysText: "", crewText: "", deliverablesText: ""!
  * ONLY if Pre-Wedding IS explicitly requested:
    - visible: true
    - daysText: e.g. "1 Day Shoot" (Default if not specified) or "2 Days Shoot", "3 Days Shoot".
    - crewText: Requirements/crew (e.g. "Candid Photography\\nCinematography\\nDrone Pilot\\nReel Creator").
    - deliverablesText: Expected deliverables (e.g. "1 Minute Teaser Reel\\n50+ Color Graded Photos\\nSave the Date Video").
    - showExclusionsNote: true (Default ON).

4. FUNCTIONS & COVERAGE (functionsPage):
- SEPARATE FUNCTION CARDS BY DEFAULT vs EXPLICIT COMBINATION RULE (CRITICAL!):
  * By default, ALWAYS create a SEPARATE function card in functionsPage.items for EVERY event/sub-event mentioned — EVEN IF events occur on the SAME DATE! Give each card its exact name, date, and crew requirements.
  * ONLY combine multiple events into one card ("Event A + Event B") if the user EXPLICITLY requests combining them together on one card/day (e.g., "Wedding और Haldi एक ही दिन पे है", "Haldi + Sangeet एक साथ", "combine Haldi and Sangeet"). Phrases like "दोनों में 1 Traditional Photographer" ALWAYS keep two SEPARATE cards (1x Traditional Photographer in each card).
  * STUDIO SETTINGS EVENT NAMES MANDATE: Use exact function names from the Studio's Official Functions List above (e.g. "Wedding", "Haldi", "Sangeet" — NEVER invent suffixes like "Ceremony" or "Night" if not in settings). NEVER output generic names like "Event 1", "Function 1".
  * RELATIVE DATE ARITHMETIC MANDATE: Accurately calculate relative dates across clauses (e.g., "Wedding 10 November को है और उसके अगले दिन Haldi है" => Wedding on "10 - Nov - 2026" and Haldi on "11 - Nov - 2026"; "30 Nov" + next day => "01 - Dec - 2026"; "एक दिन पहले" => -1 day; "उसी दिन" => same date).
- items: Array of event objects:
  - id: Unique string "func_1", "func_2", etc.
  - name: Exact function name from Studio Settings (e.g. "Wedding", "Haldi", "Sangeet", or combined "Wedding + Haldi" only when explicitly combined).
  - date: CRITICAL DATE FORMAT MANDATE: Every date MUST strictly be formatted as "DD - MMM - YYYY" (e.g. "13 - Dec - 2026", "22 - Feb - 2026", "05 - Jan - 2027"). NEVER output ISO dates like 2026-12-13! ONLY set date: "Date Not Fixed" and dateNotFixed: true if NO date, month, or season is mentioned anywhere!
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
    * Keep each card's own exact crew quantities cleanly per card (only combine crew quantities when the user explicitly asked for a combined card).

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
      const rawNotes = additionalNotes.trim();
      const notes = cleanVoiceTranscript(rawNotes, effectiveLead?.name);

      // FAST PATH 1: Synchronously parse pasted AI JSON in 0ms before any network calls!
      const clientParsedDoc = tryParsePastedAiJson(notes, baseTemplateDoc || currentDocumentData, effectiveLead);
      if (clientParsedDoc) {
        setExtractedDoc(clientParsedDoc);
        const coupleName = clientParsedDoc.cover?.coupleName || effectiveLead?.name || 'Client';
        const totalAmount = (clientParsedDoc.pricingPage?.basePrice || 0) - (clientParsedDoc.pricingPage?.discountAmount || 0) + (clientParsedDoc.pricingPage?.travelCharges || 0) + (clientParsedDoc.pricingPage?.accommodationCharges || 0) + (clientParsedDoc.pricingPage?.additionalCharges || 0);
        const pCount = Math.max(0, ...(clientParsedDoc.functionsPage?.items || []).map((f: any) =>
          (f.requirements || []).filter((r: any) => /photo/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
        ));
        const vCount = Math.max(0, ...(clientParsedDoc.functionsPage?.items || []).map((f: any) =>
          (f.requirements || []).filter((r: any) => /cinemat|cine|video/i.test(r.name)).reduce((s: number, r: any) => s + Number(r.qty || 1), 0)
        ));
        setSummary({
          coupleName,
          weddingDate: clientParsedDoc.functionsPage?.items?.[0]?.date || 'Date TBD',
          location: clientParsedDoc.cover?.locationName || 'Location TBD',
          functionsCount: clientParsedDoc.functionsPage?.items?.length || 0,
          functionsList: (clientParsedDoc.functionsPage?.items || []).map((f: any) => f.name),
          photographers: pCount,
          cinematographers: vCount,
          totalInvestment: `₹${totalAmount.toLocaleString('en-IN')}`
        });
        setMissingInfo([]);
        setConflicts([]);
        setStep('preview');
        return;
      }

      // ⚡ FAST PATH 2: Instant Client-Side Extraction with Full Mathematical Method Engine (<15ms)
      const instantContext = {
        additional_user_notes: notes,
        lead_info: effectiveLead,
        raw_form_fields: effectiveLead.raw_payload || {},
        notes_and_comments: Array.isArray(effectiveLead.comments) ? effectiveLead.comments.map((c: any) => c.text).join('\n') : '',
        meta_fields: {},
        studioSettings: studioSettings,
        studioEventTypes: studioEventTypes,
        studioCrewRoles: studioCrewRoles
      };

      const instantRaw = fallbackHeuristicExtractor(instantContext);
      const instantRes = mapAiOutputToQuotationDocument(instantRaw, baseTemplateDoc || currentDocumentData, instantContext);
      const instantDoc = instantRes.document || instantRes;

      let finalDoc = instantDoc;
      const initialTotal = (instantDoc.pricingPage?.basePrice || 0) - (instantDoc.pricingPage?.discountAmount || 0) + (instantDoc.pricingPage?.travelCharges || 0) + (instantDoc.pricingPage?.accommodationCharges || 0) + (instantDoc.pricingPage?.additionalCharges || 0);
      let finalSummary = instantRes.summary || {
        coupleName: instantDoc.cover?.coupleName || effectiveLead?.name || 'Client',
        weddingDate: instantDoc.functionsPage?.items?.[0]?.date || 'Date TBD',
        location: instantDoc.cover?.locationName || 'Location TBD',
        functionsCount: instantDoc.functionsPage?.items?.length || 0,
        functionsList: (instantDoc.functionsPage?.items || []).map((f: any) => f.name),
        photographers: 1,
        cinematographers: 1,
        totalInvestment: `₹${initialTotal.toLocaleString('en-IN')}`
      };

      // 🧠 PRIMARY AI CALCULATION ENGINE: Call Google Gemini for authoritative extraction & math evaluation
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const aiRes = await fetch('/api/quotations/ai-extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            leadId: effectiveLead.id,
            workspaceId: effectiveLead.workspace_id || session?.user?.id || null,
            userId: session?.user?.id || null,
            quotationId: quotationId || null,
            explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || null,
            currentDocument: baseTemplateDoc || currentDocumentData || null,
            additionalNotes: notes,
            studioSettings: studioSettings,
            studioEventTypes: studioEventTypes,
            studioCrewRoles: studioCrewRoles
          }),
          signal: AbortSignal.timeout(20000)
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          if (aiJson.success && aiJson.extractedDocument) {
            finalDoc = aiJson.extractedDocument?.document || aiJson.extractedDocument;
            if (aiJson.summary) finalSummary = aiJson.summary;
            console.log('[AI Modal] Successfully extracted via Gemini AI Engine!');
          }
        }
      } catch (geminiErr) {
        console.warn('[AI Modal] AI call fast timeout or offline, using local math engine:', geminiErr);
      }

      setExtractedDoc(finalDoc);
      setSummary(finalSummary);
      setMissingInfo([]);
      setConflicts([]);
      setStep('preview');
    } catch (err: any) {
      console.error('[AI Modal Generation Error]:', err);
      let friendly = err.message || "AI couldn't generate the quotation. Your existing quotation has not been changed.";
      if (friendly.includes('<!DOCTYPE') || friendly.includes('Unexpected token') || friendly.includes('JSON')) {
        friendly = 'AI service was momentarily busy. Please click Create Quotation again or type your requirements.';
      }
      setErrorMsg(friendly);
    } finally {
      setGenerating(false);
    }
  };

  const applyDocAndNavigate = async (
    docToApply: any,
    options?: {
      pendingAiNotes?: string | null;
      isDirectJson?: boolean;
    }
  ) => {
    if (!docToApply) return;

    const stripTrailingKeywords = (name: string) => {
      return (name || '')
        .replace(
          /\s+(?:\b(?:wedding|marriage|shaadi|quotation|quotion|qution|qoutation|proposal|haldi|sangeet|reception|mehendi|event|shoot|budget|price|rate|cost|date|on|all|deliverables?|days?|day)\b|\d).*$/i,
          ''
        )
        .trim();
    };

    const chosenBaseDoc = baseTemplateDoc || activeTemplateObj?.content_json || currentDocumentData || DEFAULT_AIRY_PROPOSAL;

    const applyVisualTokens = (targetDoc: any, baseDoc: any) => {
      if (!targetDoc || !baseDoc) return;
      targetDoc.look = baseDoc.look || targetDoc.look || 'cyprus-sand-dune';
      targetDoc.theme = baseDoc.theme || baseDoc.look || targetDoc.theme || 'cyprus-sand-dune';
      targetDoc.primaryFont = baseDoc.primaryFont || targetDoc.primaryFont || 'Cormorant Garamond';
      targetDoc.secondaryFont = baseDoc.secondaryFont || targetDoc.secondaryFont || 'Plus Jakarta Sans';
      if (baseDoc.colorPalette) targetDoc.colorPalette = baseDoc.colorPalette;

      if (!targetDoc.cover) targetDoc.cover = {};
      if (baseDoc.cover) {
        if (baseDoc.cover.frameShape) targetDoc.cover.frameShape = baseDoc.cover.frameShape;
        if (baseDoc.cover.photoUrl) targetDoc.cover.photoUrl = baseDoc.cover.photoUrl;
        if (baseDoc.cover.photoHeight !== undefined) targetDoc.cover.photoHeight = baseDoc.cover.photoHeight;
        if (baseDoc.cover.photoWidth !== undefined) targetDoc.cover.photoWidth = baseDoc.cover.photoWidth;
        if (baseDoc.cover.photoFocalY !== undefined) targetDoc.cover.photoFocalY = baseDoc.cover.photoFocalY;
        if (baseDoc.cover.bgOpacity !== undefined) targetDoc.cover.bgOpacity = baseDoc.cover.bgOpacity;
        if (baseDoc.cover.imagePosition) targetDoc.cover.imagePosition = baseDoc.cover.imagePosition;
        if (baseDoc.cover.sideOption) targetDoc.cover.sideOption = baseDoc.cover.sideOption;
        if (baseDoc.cover.brandName) targetDoc.cover.brandName = baseDoc.cover.brandName;
        if (baseDoc.cover.brandLogoUrl) targetDoc.cover.brandLogoUrl = baseDoc.cover.brandLogoUrl;
        if (baseDoc.cover.brandLogoSize !== undefined) targetDoc.cover.brandLogoSize = baseDoc.cover.brandLogoSize;
        if (baseDoc.cover.coverStyle) targetDoc.cover.coverStyle = baseDoc.cover.coverStyle;
      }

      const shootVisible = Boolean(targetDoc.shootDetails?.visible);
      const specialVisible = Boolean(targetDoc.specialValueAdditions?.visible);
      if (Array.isArray(baseDoc.pageSequence) && baseDoc.pageSequence.length > 0) {
        const clonedSeq = JSON.parse(JSON.stringify(baseDoc.pageSequence));
        const withShoot = syncShootPageInSequence(clonedSeq, shootVisible);
        targetDoc.pageSequence = syncSpecialValuePageInSequence(withShoot, specialVisible);
      } else {
        const withShoot = syncShootPageInSequence(targetDoc.pageSequence, shootVisible);
        targetDoc.pageSequence = syncSpecialValuePageInSequence(withShoot, specialVisible);
      }
      if (Array.isArray(baseDoc.customPages) && baseDoc.customPages.length > 0) {
        targetDoc.customPages = baseDoc.customPages;
      }

      if (baseDoc.aboutUs) {
        if (!targetDoc.aboutUs) targetDoc.aboutUs = {};
        if (baseDoc.aboutUs.photo) targetDoc.aboutUs.photo = baseDoc.aboutUs.photo;
        if (baseDoc.aboutUs.signature) targetDoc.aboutUs.signature = baseDoc.aboutUs.signature;
        if (baseDoc.aboutUs.kicker) targetDoc.aboutUs.kicker = baseDoc.aboutUs.kicker;
        if (baseDoc.aboutUs.heading) targetDoc.aboutUs.heading = baseDoc.aboutUs.heading;
        if (baseDoc.aboutUs.text && (!targetDoc.aboutUs.text || targetDoc.aboutUs.text.length < 15)) {
          targetDoc.aboutUs.text = baseDoc.aboutUs.text;
        }
      }
      if (baseDoc.shootDetails) {
        if (!targetDoc.shootDetails) targetDoc.shootDetails = {};
        if (baseDoc.shootDetails.photo) targetDoc.shootDetails.photo = baseDoc.shootDetails.photo;
        if (baseDoc.shootDetails.kicker) targetDoc.shootDetails.kicker = baseDoc.shootDetails.kicker;
        if (baseDoc.shootDetails.heading) targetDoc.shootDetails.heading = baseDoc.shootDetails.heading;
      }
      if (baseDoc.termsPage) {
        targetDoc.termsPage = {
          ...(targetDoc.termsPage || {}),
          ...baseDoc.termsPage
        };
      }
      if (baseDoc.thankYouPage) {
        if (!targetDoc.thankYouPage) targetDoc.thankYouPage = {};
        if (baseDoc.thankYouPage.photo) targetDoc.thankYouPage.photo = baseDoc.thankYouPage.photo;
        if (baseDoc.thankYouPage.signature) targetDoc.thankYouPage.signature = baseDoc.thankYouPage.signature;
        if (baseDoc.thankYouPage.brandName) targetDoc.thankYouPage.brandName = baseDoc.thankYouPage.brandName;
        if (baseDoc.thankYouPage.phone) targetDoc.thankYouPage.phone = baseDoc.thankYouPage.phone;
        if (baseDoc.thankYouPage.email) targetDoc.thankYouPage.email = baseDoc.thankYouPage.email;
        if (baseDoc.thankYouPage.website) targetDoc.thankYouPage.website = baseDoc.thankYouPage.website;
      }
      const appliedTemplateId = activeTemplateId || selectedTemplateId || activeTemplateObj?.id;
      if (appliedTemplateId) {
        targetDoc.source_template_id = appliedTemplateId;
        targetDoc.template_id = appliedTemplateId;
      }
    };

    const getTokenAndUser = async () => {
      if (authSessionRef.current?.token) return authSessionRef.current;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sess = { token: session?.access_token || '', userId: session?.user?.id || '' };
        authSessionRef.current = sess;
        return sess;
      } catch (_) {
        return { token: '', userId: '' };
      }
    };

    // ⚡ INSTANT 0ms OPTIMISTIC BUILDER APPLY (Inside Builder):
    if (quotationId && onApplied) {
      const mergedDoc = normalizeQuotationData(docToApply, chosenBaseDoc);
      applyVisualTokens(mergedDoc, chosenBaseDoc);
      const rawDocCouple = stripTrailingKeywords((docToApply?.cover?.coupleName || '').trim());
      const rawGroom = stripTrailingKeywords((docToApply?.cover?.groomName || '').trim());
      const rawBride = stripTrailingKeywords((docToApply?.cover?.brideName || '').trim());
      const candidateLead = stripTrailingKeywords((effectiveLead?.name || '').trim());

      let coupleName = '';
      if (rawDocCouple && !isPlaceholderCoupleName(rawDocCouple)) {
        coupleName = rawDocCouple;
      } else if (rawGroom && rawBride && !isPlaceholderCoupleName(`${rawGroom} & ${rawBride}`)) {
        coupleName = `${rawGroom} & ${rawBride}`;
      } else if (candidateLead && !isPlaceholderCoupleName(candidateLead)) {
        coupleName = candidateLead;
      } else {
        coupleName = 'Client';
      }
      if (!mergedDoc.cover) mergedDoc.cover = {};
      mergedDoc.cover.coupleName = coupleName;
      if (coupleName.includes('&')) {
        const cParts = coupleName.split('&').map((s: string) => s.trim()).filter(Boolean);
        mergedDoc.cover.groomName = cParts[0] || coupleName;
        mergedDoc.cover.brideName = cParts[1] || '';
      } else {
        mergedDoc.cover.groomName = coupleName;
        mergedDoc.cover.brideName = '';
      }
      if (effectiveLead.location && !mergedDoc.cover.locationName) {
        mergedDoc.cover.locationName = effectiveLead.location;
      }
      const eventType = (docToApply?.cover?.eventType || mergedDoc?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
      const quotationTitle = `${coupleName} - ${eventType}`;
      mergedDoc.designName = quotationTitle;
      mergedDoc.title = quotationTitle;

      safeSessionStorageSet(`current_quotation_doc_${quotationId}`, JSON.stringify(mergedDoc));
      safeSessionStorageSet('current_active_quotation_doc', JSON.stringify({ id: quotationId, document: mergedDoc }));
      safeLocalStorageSet(`wg_proposal_draft_${quotationId}`, JSON.stringify(mergedDoc), quotationId);

      // Open/update builder UI immediately (<50ms)!
      onApplied(mergedDoc, quotationId);
      onClose();

      // Silent background cloud persistence + optional LLM refinement for natural-language voice notes
      (async () => {
        try {
          const { token, userId: cachedUid } = await getTokenAndUser();
          let finalToPersist = mergedDoc;

          if (options?.pendingAiNotes && !options?.isDirectJson) {
            try {
              const aiRes = await fetch('/api/quotations/ai-extract', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  leadId: effectiveLead.id,
                  workspaceId: effectiveLead.workspace_id || cachedUid || null,
                  userId: cachedUid || null,
                  quotationId,
                  explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || null,
                  currentDocument: mergedDoc,
                  additionalNotes: options.pendingAiNotes,
                  studioSettings,
                  studioEventTypes,
                  studioCrewRoles
                }),
                signal: AbortSignal.timeout(20000)
              });
              if (aiRes.ok) {
                const aiJson = await aiRes.json();
                const refinedRaw = aiJson.extractedDocument?.document || aiJson.extractedDocument;
                if (aiJson.success && refinedRaw) {
                  const refinedNormalized = normalizeQuotationData(refinedRaw, chosenBaseDoc);
                  applyVisualTokens(refinedNormalized, chosenBaseDoc);
                  finalToPersist = refinedNormalized;
                  safeSessionStorageSet(`current_quotation_doc_${quotationId}`, JSON.stringify(finalToPersist));
                  safeSessionStorageSet('current_active_quotation_doc', JSON.stringify({ id: quotationId, document: finalToPersist }));
                  safeLocalStorageSet(`wg_proposal_draft_${quotationId}`, JSON.stringify(finalToPersist), quotationId);
                  onApplied(finalToPersist, quotationId, true);
                }
              }
            } catch (refineErr) {
              console.warn('[AI Background Refine In-Builder Notice]:', refineErr);
            }
          }

          await fetch('/api/quotations/ai-apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              quotationId,
              document: finalToPersist
            }),
            keepalive: true
          });
          const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
          await cacheDocumentLocal(quotationId, finalToPersist, 1);
        } catch (e) {
          console.warn('[AI Apply Background Persist]:', e);
        }
      })();
      return;
    }

    // ⚡ INSTANT <100ms OPTIMISTIC CREATION FOR LEAD -> OPEN BUILDER IMMEDIATELY:
    const lId = effectiveLead.id;
    const leadShort = String(lId || 'LEAD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Calculate next version dynamically across ALL local + raw_payload sources
    let nextVersion = 1;
    if (lId && lId !== 'draft') {
      try {
        let maxFoundVer = 0;
        const scRaw = sessionStorage.getItem(`lead_quotes_cache_${lId}`) || localStorage.getItem(`lead_quotes_cache_${lId}`);
        if (scRaw) {
          const parsed = JSON.parse(scRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((v: any) => {
              const vn = Number(v.version || v.lead_version) || 0;
              if (vn > maxFoundVer) maxFoundVer = vn;
            });
          }
        }
        const stored = localStorage.getItem('sc_quotation_summary_map');
        if (stored) {
          const map = JSON.parse(stored);
          if (Array.isArray(map[lId]?.versions)) {
            map[lId].versions.forEach((v: any) => {
              const vn = Number(v.version || v.lead_version) || 0;
              if (vn > maxFoundVer) maxFoundVer = vn;
            });
          } else if (map[lId]?.count > maxFoundVer) {
            maxFoundVer = Number(map[lId].count) || 0;
          }
        }
        const rawVers = (effectiveLead as any)?.raw_payload?.quotation_versions;
        if (Array.isArray(rawVers)) {
          rawVers.forEach((v: any) => {
            const vn = Number(v.version || v.lead_version) || 0;
            if (vn > maxFoundVer) maxFoundVer = vn;
          });
        }
        nextVersion = maxFoundVer + 1;
      } catch (_) {}
    }

    let targetQId = quotationId || `FW-Q-${leadShort}-V${nextVersion}-${randSuffix}`;

    const mergedDoc = normalizeQuotationData(docToApply, chosenBaseDoc);
    applyVisualTokens(mergedDoc, chosenBaseDoc);
    mergedDoc.id = targetQId;
    mergedDoc.lead_id = lId;
    mergedDoc.lead_version = nextVersion;

    const rawDocCouple = stripTrailingKeywords((docToApply?.cover?.coupleName || '').trim());
    const rawGroom = stripTrailingKeywords((docToApply?.cover?.groomName || '').trim());
    const rawBride = stripTrailingKeywords((docToApply?.cover?.brideName || '').trim());
    const candidateLead = stripTrailingKeywords((effectiveLead?.name || '').trim());

    let coupleName = '';
    if (rawDocCouple && !isPlaceholderCoupleName(rawDocCouple)) {
      coupleName = rawDocCouple;
    } else if (rawGroom && rawBride && !isPlaceholderCoupleName(`${rawGroom} & ${rawBride}`)) {
      coupleName = `${rawGroom} & ${rawBride}`;
    } else if (candidateLead && !isPlaceholderCoupleName(candidateLead)) {
      coupleName = candidateLead;
    } else {
      coupleName = 'Client';
    }
    if (!mergedDoc.cover) mergedDoc.cover = {};
    mergedDoc.cover.coupleName = coupleName;
    if (coupleName.includes('&')) {
      const cParts = coupleName.split('&').map((s: string) => s.trim()).filter(Boolean);
      mergedDoc.cover.groomName = cParts[0] || coupleName;
      mergedDoc.cover.brideName = cParts[1] || '';
    } else {
      mergedDoc.cover.groomName = coupleName;
      mergedDoc.cover.brideName = '';
    }
    if (effectiveLead.location && !mergedDoc.cover.locationName) {
      mergedDoc.cover.locationName = effectiveLead.location;
    }

    const eventType = (docToApply?.cover?.eventType || mergedDoc?.cover?.eventType || 'Wedding').replace(/quotation/i, '').trim() || 'Wedding';
    const quotationTitle = `${coupleName} - ${eventType}`;
    mergedDoc.designName = quotationTitle;
    mergedDoc.title = quotationTitle;

    // Helper to safely update list/summary caches with pruned metadata (zero QuotaExceededError!)
    const persistListCachesSafely = (canonicalQId: string, canonicalVer: number) => {
      if (!lId || lId === 'draft') return;
      try {
        const newVer = pruneDocumentForListCache({
          id: canonicalQId,
          template_id: canonicalQId,
          lead_id: lId,
          version: canonicalVer,
          lead_version: canonicalVer,
          version_label: `V${canonicalVer}`,
          title: quotationTitle,
          couple_name: coupleName,
          is_final: false,
          created_at: new Date().toISOString(),
          content_json: mergedDoc,
        });

        let existingCache: any[] = [];
        try {
          const scRaw = sessionStorage.getItem(`lead_quotes_cache_${lId}`) || localStorage.getItem(`lead_quotes_cache_${lId}`);
          if (scRaw) existingCache = JSON.parse(scRaw);
        } catch (_) {}
        const updatedCache = [
          newVer,
          ...existingCache
            .filter((v: any) => v.id !== canonicalQId && v.template_id !== canonicalQId && v.id !== targetQId && v.template_id !== targetQId)
            .map(pruneDocumentForListCache),
        ];
        safeSessionStorageSet(`lead_quotes_cache_${lId}`, JSON.stringify(updatedCache));
        safeLocalStorageSet(`lead_quotes_cache_${lId}`, JSON.stringify(updatedCache), canonicalQId);

        const stored = localStorage.getItem('sc_quotation_summary_map');
        const map = stored ? JSON.parse(stored) : {};
        const prev = map[lId] || { count: 0, hasFinal: false, versions: [] };
        const mergedVers = [
          {
            id: canonicalQId,
            template_id: canonicalQId,
            version: canonicalVer,
            version_label: `V${canonicalVer}`,
            title: quotationTitle,
            couple_name: coupleName,
            is_final: false,
            created_at: newVer.created_at,
          },
          ...(prev.versions || []).filter(
            (v: any) => v.template_id !== canonicalQId && v.id !== canonicalQId && v.template_id !== targetQId && v.id !== targetQId
          ),
        ];
        map[lId] = {
          count: Math.max((prev.count || 0), mergedVers.length),
          hasFinal: prev.hasFinal || false,
          finalVersion: prev.finalVersion,
          versions: mergedVers,
        };
        safeLocalStorageSet('sc_quotation_summary_map', JSON.stringify(map), canonicalQId);
      } catch (_) {}
    };

    const resolvedExplicitTemplateId = activeTemplateId || selectedTemplateId || activeTemplateObj?.id || undefined;

    // 2. Prime sessionStorage, localStorage & list caches synchronously (<10ms -> 0ms Builder hydration!)
    safeSessionStorageSet(`current_quotation_doc_${targetQId}`, JSON.stringify(mergedDoc));
    safeSessionStorageSet('current_active_quotation_doc', JSON.stringify({ id: targetQId, document: mergedDoc }));
    safeSessionStorageSet(`pending_db_create_${targetQId}`, String(Date.now()));
    safeLocalStorageSet(`wg_proposal_draft_${targetQId}`, JSON.stringify(mergedDoc), targetQId);

    if (options?.pendingAiNotes && !options?.isDirectJson) {
      safeSessionStorageSet(`ai_pending_refine_${targetQId}`, JSON.stringify({
        leadId: lId,
        workspaceId: effectiveLead.workspace_id || authSessionRef.current?.userId || null,
        userId: authSessionRef.current?.userId || null,
        quotationId: targetQId,
        explicitTemplateId: resolvedExplicitTemplateId || null,
        additionalNotes: options.pendingAiNotes,
        studioSettings,
        studioEventTypes,
        studioCrewRoles,
        createdAt: Date.now()
      }));
    }

    persistListCachesSafely(targetQId, nextVersion);
    try {
      window.dispatchEvent(new CustomEvent('quotation_created', { detail: { leadId: lId, quotationId: targetQId, version: nextVersion } }));
      broadcastQuotationSync(lead?.workspace_id, {
        leadId: lId,
        quotationId: targetQId,
        action: 'create',
        isFinal: false
      });
    } catch (_) {}

    // 3. Fire non-blocking cloud persistence (`keepalive: true`) and register synchronization promise
    // so background Gemini refinement inside Builder waits for INSERT before executing AI-Apply!
    const bgPersistPromise = (async () => {
      try {
        const { token } = await getTokenAndUser();

        if (!quotationId && lId && lId !== 'draft') {
          const createRes = await fetch('/api/quotations/create-for-lead', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              leadId: lId,
              quotationId: targetQId,
              clientName: coupleName,
              explicitTemplateId: resolvedExplicitTemplateId,
              initialDocument: mergedDoc
            }),
            keepalive: true
          });

          if (createRes.ok) {
            const createJson = await createRes.json().catch(() => ({}));
            const canonicalId = createJson.quotationId || targetQId;
            const canonicalVer = typeof createJson.leadVersion === 'number' && createJson.leadVersion > 0
              ? createJson.leadVersion
              : nextVersion;
            if (createJson.document && canonicalId === targetQId) {
              mergedDoc.lead_version = canonicalVer;
              persistListCachesSafely(canonicalId, canonicalVer);
            }
          }
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
            }),
            keepalive: true
          });
        }

        const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
        await cacheDocumentLocal(targetQId, mergedDoc, 1);
      } catch (e) {
        console.warn('[AI Background Persist Notice]:', e);
      } finally {
        try { sessionStorage.removeItem(`pending_db_create_${targetQId}`); } catch (_) {}
      }
    })();

    if (typeof window !== 'undefined') {
      const w = window as any;
      if (!w.__pendingCreatePromises) w.__pendingCreatePromises = {};
      w.__pendingCreatePromises[targetQId] = bgPersistPromise;
    }

    // 4. Open Builder IMMEDIATELY (<100ms from click)!
    if (onApplied) {
      onApplied(mergedDoc, targetQId);
    } else if (targetQId && targetQId !== 'draft') {
      router.push(`/workspace/quotations/builder/templet/${targetQId}`);
      onClose();
    } else {
      onClose();
    }
  };

  const handleApply = async () => {
    await applyDocAndNavigate(extractedDoc);
  };

  const handleQuickCreateAndOpen = async () => {
    setErrorMsg(null);
    try {
      // Wait briefly ONLY if audio transcription / polish is actively finishing (never blocks normal clicks!)
      if (isTranscribing || isPolishingInProgressRef.current) {
        for (let i = 0; i < 30; i++) {
          if (!isTranscribing && !isPolishingInProgressRef.current) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      const rawNotes = (additionalNotesRef.current || additionalNotes || '').trim();

      if (!rawNotes) {
        setErrorMsg('कृपया पहले माइक से बोलें या कोटेशन की कुछ डिटेल्स लिखें (या Paste करें) ताकि AI कोटेशन बना सके!');
        return;
      }

      setGenerating(true);
      const notes = cleanVoiceTranscript(rawNotes, effectiveLead?.name);

      // FAST PATH 1: Synchronously parse pasted AI JSON in <2ms & open Builder immediately!
      const clientParsedDoc = tryParsePastedAiJson(notes, baseTemplateDoc || currentDocumentData, effectiveLead);
      if (clientParsedDoc) {
        setExtractedDoc(clientParsedDoc);
        await applyDocAndNavigate(clientParsedDoc, { isDirectJson: true });
        return;
      }

      // ⚡ FAST PATH 2: Instant Synchronous Client-Side Extraction (<15ms) -> Open Builder IMMEDIATELY (<100ms),
      // while Gemini AI Verification refines asynchronously in the background inside the open Builder!
      const instantContext = {
        additional_user_notes: notes,
        lead_info: effectiveLead,
        raw_form_fields: effectiveLead.raw_payload || {},
        notes_and_comments: Array.isArray(effectiveLead.comments) ? effectiveLead.comments.map((c: any) => c.text).join('\n') : '',
        meta_fields: {},
        studioSettings: studioSettings,
        studioEventTypes: studioEventTypes,
        studioCrewRoles: studioCrewRoles
      };

      const instantRaw = fallbackHeuristicExtractor(instantContext);
      const instantRes = mapAiOutputToQuotationDocument(instantRaw, baseTemplateDoc || currentDocumentData, instantContext);
      const instantDoc = instantRes.document || instantRes;

      // Resolve Google Gemini extraction before opening Builder so client/couple name
      // renders accurately from Frame 0 with zero post-navigation flicker.
      let finalDocToApply = instantDoc;
      let geminiSucceeded = false;
      try {
        let sess = authSessionRef.current;
        if (!sess?.token) {
          const { data: { session } } = await supabase.auth.getSession();
          sess = { token: session?.access_token || '', userId: session?.user?.id || '' };
          authSessionRef.current = sess;
        }
        const aiRes = await fetch('/api/quotations/ai-extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sess.token}`
          },
          body: JSON.stringify({
            leadId: effectiveLead.id,
            workspaceId: effectiveLead.workspace_id || sess.userId || null,
            userId: sess.userId || null,
            quotationId: quotationId || null,
            explicitTemplateId: activeTemplateId || selectedTemplateId || activeTemplateObj?.id || null,
            currentDocument: baseTemplateDoc || currentDocumentData || null,
            additionalNotes: notes,
            studioSettings,
            studioEventTypes,
            studioCrewRoles
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const extracted = aiJson?.extractedDocument?.document || aiJson?.extractedDocument;
          if (aiJson?.success && extracted) {
            finalDocToApply = extracted;
            geminiSucceeded = true;
          }
        }
      } catch (quickGeminiErr) {
        console.warn('[AI Modal Quick Create Gemini fallback]:', quickGeminiErr);
      }

      setExtractedDoc(finalDocToApply);
      await applyDocAndNavigate(finalDocToApply, {
        pendingAiNotes: geminiSucceeded ? null : notes,
        isDirectJson: false
      });
    } catch (err: any) {
      console.error('[AI Modal Quick Create Error]:', err);
      let friendly = err.message || "Could not create quotation. Please try again.";
      if (friendly.includes('<!DOCTYPE') || friendly.includes('Unexpected token') || friendly.includes('JSON')) {
        friendly = 'AI quotation service was momentarily interrupted. Please click Create Quotation again or verify notes.';
      }
      setErrorMsg(friendly);
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
            {step === 'input' ? (
              <div className="space-y-4">
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

                {/* 🎙️ Voice & Text Input Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Requirements & Details</span>
                    </label>
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

                  {/* Audio AI Analyzing Banner (clean unified indicator) */}
                  {(isTranscribing || isPolishing) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5 shadow-xs"
                    >
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                      <span>Audio AI Analyzing...</span>
                    </motion.div>
                  )}

                  {/* ChatGPT-Style Input Card */}
                  <div className={`relative rounded-2xl border transition-all duration-200 bg-white dark:bg-zinc-900 ${
                    isRecording 
                      ? 'border-rose-500 ring-4 ring-rose-500/20 shadow-lg' 
                      : (isTranscribing || isPolishing)
                      ? 'border-amber-500 ring-4 ring-amber-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-xs'
                  }`}>
                    {/* Live Streaming Indicator when mic is on */}
                    {isRecording && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                        <span>🔴 लाइव वॉइस लिसनिंग... (बोलते रहें, आपके शब्द यहाँ रियल-टाइम लाइव टाइप हो रहे हैं)</span>
                      </div>
                    )}
                    {/* Textarea */}
                    <textarea
                      ref={notesTextareaRef}
                      rows={5}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder={isRecording ? "🔴 आपकी आवाज़ लाइव रिकॉर्ड और टाइप हो रही है, बोलते रहें..." : (isTranscribing || isPolishing) ? "Audio AI Analyzing..." : "माइक से बोलें या यहाँ लिखें (हिंदी, मराठी, English):\nजैसे: 'रोहन और पूजा की शादी 18-19 नवंबर को लोनावला में, 18 को संगीत और हल्दी, 2 कैंडिड और 2 सिनेमैटोग्राफर, 1 ड्रोन, पैकेज 2.2 लाख, 20k डिस्काउंट, 25% एडवांस...'\n\n💡 या AI का JSON सीधे यहाँ पेस्ट करें!"}
                      className="w-full p-4 min-h-[110px] max-h-[160px] overflow-y-auto bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none resize-none leading-relaxed"
                    />

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 rounded-b-2xl">
                      {/* Left: Copy Prompt / Clear / Char count */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySystemPrompt}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                          title="Copy Master JSON Prompt"
                        >
                          {promptCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Copy Prompt</span>
                            </>
                          )}
                        </button>

                        {additionalNotes.trim().length > 0 && !isRecording && !isTranscribing && !isPolishing && (
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalNotes('');
                              setTranscribeSuccess(false);
                              setErrorMsg(null);
                            }}
                            className="px-2 py-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-[11px] transition-all cursor-pointer"
                            title="Clear notes"
                          >
                            Clear
                          </button>
                        )}

                        {additionalNotes.length > 0 && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:inline">
                            {additionalNotes.length} chars
                          </span>
                        )}
                      </div>

                      {/* Right: ChatGPT / Antigravity Voice Controls */}
                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <div className="flex items-center gap-2.5 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 text-white border border-zinc-700/60 px-3 py-1.5 rounded-full shadow-lg">
                            {/* Live Audio Frequency Waveform Visualizer (Antigravity Voice Style) */}
                            <div className="flex items-center gap-1 px-1">
                              <span className="w-1 h-3 bg-amber-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] [animation-delay:-0.3s]"></span>
                              <span className="w-1 h-5 bg-gradient-to-t from-orange-500 to-amber-300 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] [animation-delay:-0.15s]"></span>
                              <span className="w-1 h-2.5 bg-amber-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]"></span>
                              <span className="w-1 h-4 bg-orange-400 rounded-full animate-[pulse_0.35s_ease-in-out_infinite] [animation-delay:-0.2s]"></span>
                              <span className="w-1 h-3 bg-amber-300 rounded-full animate-[pulse_0.55s_ease-in-out_infinite] [animation-delay:-0.35s]"></span>
                              <span className="w-1 h-1.5 bg-amber-500 rounded-full animate-[pulse_0.45s_ease-in-out_infinite]"></span>
                            </div>

                            {/* Timer */}
                            <span className="text-[11px] font-black text-amber-300 tracking-wider tabular-nums font-mono">
                              {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                            </span>

                            {/* Cancel Button */}
                            <button
                              type="button"
                              onClick={cancelVoiceRecording}
                              className="w-6 h-6 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-0.5"
                              title="Cancel recording"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            {/* Stop & Transcribe Button */}
                            <button
                              type="button"
                              onClick={stopVoiceRecording}
                              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                              title="Stop and Transcribe"
                            >
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>Done</span>
                            </button>
                          </div>
                        ) : (isTranscribing || isPolishing) ? (
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
                            <span>Audio AI Analyzing...</span>
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
                              title="बोलकर कोटेशन बनाएँ (StudioCore AI Voice Mode)"
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
                        {summary?.coupleName && !isPlaceholderCoupleName(summary.coupleName) ? summary.coupleName : 'Client'}
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
                <button
                  type="button"
                  onClick={onClose}
                  disabled={generating}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

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
                        <span>{quotationId ? 'Applying with AI...' : 'AI Calculating & Opening...'}</span>
                      </>
                    ) : (
                      <span>{quotationId ? 'Apply to Quotation' : 'Create Quotation'}</span>
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

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, X, Check, RotateCcw, Loader2, Square, 
  Copy, ChevronDown, CheckCircle2, RefreshCw, Plus, Play, Pause, Wand2
} from 'lucide-react';

interface AiMicButtonProps {
  onInsertComment: (cleanedText: string) => void;
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface LanguageOption {
  id: string;
  label: string;
  subLabel: string;
  flag: string;
  recLang: string;
}

const INDIAN_LANGUAGES: LanguageOption[] = [
  { id: 'mr-IN', label: 'मराठी (Marathi)', subLabel: 'Pure Marathi Script', flag: '🇮🇳', recLang: 'mr-IN' },
  { id: 'mr-ENG', label: 'Marathi in Eng', subLabel: 'Marathish (ABC)', flag: '🔤', recLang: 'mr-IN' },
  { id: 'hi-IN', label: 'हिंदी (Hindi)', subLabel: 'Pure Hindi Script', flag: '🇮🇳', recLang: 'hi-IN' },
  { id: 'hi-ENG', label: 'Hinglish', subLabel: 'Hindi in Eng (ABC)', flag: '🔤', recLang: 'en-IN' },
  { id: 'en-IN', label: 'English (IN)', subLabel: 'Professional English', flag: '🇬🇧', recLang: 'en-IN' },
  { id: 'gu-IN', label: 'ગુજરાતી (Gujarati)', subLabel: 'Gujarati Script', flag: '🇮🇳', recLang: 'gu-IN' },
  { id: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', subLabel: 'Punjabi Script', flag: '🇮🇳', recLang: 'pa-IN' },
  { id: 'bn-IN', label: 'বাংলা (Bengali)', subLabel: 'Bengali Script', flag: '🇮🇳', recLang: 'bn-IN' },
  { id: 'ta-IN', label: 'தமிழ் (Tamil)', subLabel: 'Tamil Script', flag: '🇮🇳', recLang: 'ta-IN' },
  { id: 'te-IN', label: 'తెలుగు (Telugu)', subLabel: 'Telugu Script', flag: '🇮🇳', recLang: 'te-IN' },
  { id: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', subLabel: 'Kannada Script', flag: '🇮🇳', recLang: 'kn-IN' },
  { id: 'ml-IN', label: 'മലയാളം (Malayalam)', subLabel: 'Malayalam Script', flag: '🇮🇳', recLang: 'ml-IN' },
];

export default function AiMicButton({
  onInsertComment,
  buttonText = 'Voice AI',
  className = '',
  size = 'md',
}: AiMicButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'review'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveStreamText, setLiveStreamText] = useState('');
  const [finalComment, setFinalComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);

  // Selected Language State (Persistent in localStorage)
  const [selectedLang, setSelectedLang] = useState<string>('mr-IN');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveTextRef = useRef<string>('');
  const initialAppendTextRef = useRef<string>('');

  // Load user's saved language preference
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('studiocore_ai_voice_lang');
      if (savedLang && INDIAN_LANGUAGES.some((l) => l.id === savedLang)) {
        setSelectedLang(savedLang);
      }
    } catch (_) {}
  }, []);

  const handleSelectLanguage = (langId: string) => {
    setSelectedLang(langId);
    setIsLangDropdownOpen(false);
    try {
      localStorage.setItem('studiocore_ai_voice_lang', langId);
    } catch (_) {}
  };

  useEffect(() => {
    return () => {
      stopMediaTracks();
    };
  }, []);

  const stopMediaTracks = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setRecordingState('idle');
    setErrorMessage(null);
    setLiveStreamText('');
    setFinalComment('');
    setSeconds(0);
    setIsLangDropdownOpen(false);
  };

  const handleCloseModal = () => {
    stopRecording();
    stopMediaTracks();
    setIsOpen(false);
  };

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.id === selectedLang) || INDIAN_LANGUAGES[0];

  // Start recording (isAppending = true keeps previous text!)
  const startRecording = async (isAppending = false) => {
    setErrorMessage(null);
    setSeconds(0);
    liveTextRef.current = '';
    audioChunksRef.current = [];

    if (isAppending && finalComment.trim()) {
      initialAppendTextRef.current = finalComment.trim();
      setLiveStreamText(finalComment.trim() + ' ');
    } else {
      initialAppendTextRef.current = '';
      setLiveStreamText('');
      setFinalComment('');
    }

    // 1. WebSpeech API for real-time live typing
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = currentLangObj.recLang;

        rec.onresult = (event: any) => {
          let currentSessionText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentSessionText += event.results[i][0].transcript + ' ';
          }
          const trimmed = currentSessionText.trim();
          liveTextRef.current = trimmed;

          if (initialAppendTextRef.current) {
            setLiveStreamText(initialAppendTextRef.current + ' ' + trimmed);
          } else {
            setLiveStreamText(trimmed);
          }
        };

        rec.onerror = (e: any) => {
          console.warn('[WebSpeech Warning]:', e.error);
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn('[WebSpeech Init Error]:', e);
      }
    }

    // 2. Microphone Stream & Web Audio Visualizer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // MediaRecorder setup
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const liveCaptured = liveTextRef.current.trim();
        const combinedResult = initialAppendTextRef.current 
          ? (initialAppendTextRef.current + ' ' + liveCaptured).trim()
          : liveCaptured;

        stopMediaTracks();

        if (combinedResult.length > 0) {
          setFinalComment(combinedResult);
          setRecordingState('review');
        } else {
          setErrorMessage('No speech captured. Please speak clearly into your mic.');
          setRecordingState('idle');
        }
      };

      mediaRecorder.start(250);
      setRecordingState('recording');

      // Continuous timer
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Recording Error]:', err);
      setErrorMessage('Microphone access denied. Please allow mic permissions.');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Optional AI Polish Feature (formats terms & grammar)
  const handleAiPolish = async () => {
    if (!finalComment.trim() || isPolishing) return;
    setIsPolishing(true);
    try {
      const res = await fetch('/api/ai/voice-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: finalComment,
          selectedLanguage: selectedLang,
        }),
      });
      const json = await res.json();
      if (json.success && (json.cleanedComment || json.text)) {
        setFinalComment(json.cleanedComment || json.text);
      }
    } catch (e) {
      console.warn('[AI Polish Error]:', e);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleCopy = async () => {
    if (!finalComment) return;
    try {
      await navigator.clipboard.writeText(finalComment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleInsert = () => {
    if (finalComment.trim()) {
      onInsertComment(finalComment.trim());
      handleCloseModal();
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Generate dynamic waveform bars for Photo 1 style animation
  const waveformHeights = [14, 22, 36, 18, 42, 28, 50, 32, 45, 20, 38, 26, 48, 30, 22, 16];

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          TRIGGER BUTTON (WARM YELLOW CRM THEME)
      ───────────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 border border-amber-300 transition-all ${className}`}
        title="Record Voice Note"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-950 animate-pulse" />
        <Mic className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
        <span>{buttonText}</span>
      </motion.button>

      {/* ─────────────────────────────────────────────────────────────
          MINIMAL CHATGPT / GEMINI STYLE MODAL (CRM WARM YELLOW)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#FFFDF7] text-slate-900 rounded-3xl border border-amber-200/90 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col p-5 space-y-4"
            >
              {/* Background Ambient Soft Glow */}
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-200/45 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-yellow-200/35 rounded-full blur-3xl pointer-events-none" />

              {/* ─────────────────────────────────────────────────────────────
                  TOP HEADER: BRAND & LANGUAGE SELECTOR CORNER
              ───────────────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between z-20 border-b border-amber-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-2xs text-slate-950">
                    <Mic className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-black tracking-tight text-slate-900">
                    Voice Note
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* LANGUAGE SELECTOR DROPDOWN */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-200 text-[11px] font-black transition shadow-2xs"
                      title="Change Spoken Language"
                    >
                      <span>{currentLangObj.flag}</span>
                      <span className="max-w-[70px] truncate">{currentLangObj.label.split(' ')[0]}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-amber-700" />
                    </button>

                    {/* Language Dropdown Menu */}
                    <AnimatePresence>
                      {isLangDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl border border-amber-200 shadow-xl z-50 p-1 max-h-60 overflow-y-auto space-y-0.5"
                        >
                          <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            Select Language:
                          </div>
                          {INDIAN_LANGUAGES.map((lang) => (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => handleSelectLanguage(lang.id)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-left text-xs font-bold transition ${
                                selectedLang === lang.id
                                  ? 'bg-amber-100/80 text-amber-950 font-black border border-amber-300'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs">{lang.flag}</span>
                                <div>
                                  <div className="text-[11px] leading-tight font-extrabold">{lang.label}</div>
                                  <div className="text-[8px] text-slate-400">{lang.subLabel}</div>
                                </div>
                              </div>
                              {selectedLang === lang.id && (
                                <Check className="w-3 h-3 text-amber-800 shrink-0" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-amber-50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MAIN BODY (PHOTO 1 & PHOTO 2 COMPACT MINIMAL DESIGN)
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 flex flex-col items-center justify-center space-y-3">
                
                {/* 1. IDLE & RECORDING STATE: PHOTO 2 AURA MIC + PHOTO 1 WAVEFORM */}
                {recordingState === 'recording' || recordingState === 'idle' ? (
                  <div className="w-full flex flex-col items-center space-y-3">
                    
                    {/* PHOTO 2 INSPIRED: SLEEK COMPACT MIC WITH GLOWING WARM YELLOW AURA RING */}
                    <div className="relative flex items-center justify-center my-1">
                      {/* Aura Glow Ring 1 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.25 + audioLevel * 0.008, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.45, 0.9, 0.45] : 0.3,
                        }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                        className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-amber-300/80 via-yellow-300/70 to-amber-400/80 blur-md pointer-events-none"
                      />

                      {/* Aura Glow Ring 2 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.45 + audioLevel * 0.012, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.25, 0.6, 0.25] : 0.15,
                        }}
                        transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut' }}
                        className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400/40 to-amber-300/30 blur-lg pointer-events-none"
                      />

                      {/* Center Compact Mic Button (Photo 2 Style) */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={recordingState === 'recording' ? stopRecording : () => startRecording(false)}
                        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          recordingState === 'recording'
                            ? 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-200/80 animate-pulse'
                            : 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/35 hover:scale-105 ring-4 ring-amber-200/80'
                        }`}
                      >
                        {recordingState === 'recording' ? (
                          <Square className="w-5 h-5 fill-current" />
                        ) : (
                          <div className="relative flex items-center justify-center">
                            <Mic className="w-6 h-6 stroke-[2.4]" />
                            <Sparkles className="w-3 h-3 text-amber-950 absolute -top-1.5 -right-2 animate-pulse" />
                          </div>
                        )}
                      </motion.button>
                    </div>

                    {/* PHOTO 1 INSPIRED: SLEEK AUDIO WAVEFORM PILL WHILE RECORDING */}
                    {recordingState === 'recording' ? (
                      <div className="w-full flex flex-col items-center space-y-2">
                        {/* Audio Wave Pill */}
                        <div className="w-full py-2 px-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                          {/* Timer */}
                          <span className="text-xs font-black font-mono text-slate-900 shrink-0">
                            {formatTimer(seconds)}
                          </span>

                          {/* Dynamic Waveform Bars (Photo 1 Style) */}
                          <div className="flex items-center gap-[3px] flex-1 justify-center h-6 overflow-hidden">
                            {waveformHeights.map((baseH, i) => {
                              const dynamicH = Math.max(
                                4,
                                Math.min(24, Math.round(baseH * 0.3 + (audioLevel * (0.2 + (i % 3) * 0.1))))
                              );
                              return (
                                <motion.span
                                  key={i}
                                  animate={{ height: dynamicH }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className={`w-[3px] rounded-full ${
                                    i < 9 ? 'bg-amber-500' : 'bg-slate-300'
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Stop Pill Button */}
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0 hover:scale-105 transition"
                            title="Done Speaking"
                          >
                            <Square className="w-2.5 h-2.5 fill-current" />
                          </button>
                        </div>

                        {/* Real-time live transcript streaming */}
                        <div className="w-full p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs text-xs max-h-24 overflow-y-auto">
                          <p className="text-slate-900 font-bold leading-snug whitespace-pre-wrap text-[11px]">
                            {liveStreamText || (
                              <span className="text-slate-400 font-normal italic">
                                Speaking in {currentLangObj.label.split(' ')[0]}...
                              </span>
                            )}
                            <span className="inline-block w-1.5 h-3 bg-amber-500 ml-1 animate-pulse" />
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-0.5">
                        <h4 className="text-xs font-black text-slate-900">Tap Mic to Speak</h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Listening language: <span className="font-black text-amber-900">{currentLangObj.label}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 2. REVIEW & EDIT STATE WITH "CONTINUE SPEAKING (+ MIC)" BUTTON */}
                {recordingState === 'review' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-2.5"
                  >
                    {/* Clean Output Textarea */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span className="flex items-center gap-1 text-amber-900 font-black">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          Note ({currentLangObj.label.split(' ')[0]}):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAiPolish}
                            disabled={isPolishing}
                            className="text-[10px] font-black text-amber-800 hover:text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-300/80 flex items-center gap-1 transition"
                            title="Format terms & grammar with AI"
                          >
                            <Sparkles className={`w-2.5 h-2.5 ${isPolishing ? 'animate-spin' : ''}`} />
                            {isPolishing ? 'Polishing...' : 'AI Polish'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 transition"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={finalComment}
                        onChange={(e) => setFinalComment(e.target.value)}
                        placeholder="Your spoken note appears here..."
                        className="w-full p-2.5 rounded-2xl bg-white border border-amber-300 text-slate-900 font-bold text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none shadow-2xs"
                      />
                    </div>

                    {/* ACTION BUTTONS WITH "CONTINUE SPEAKING (+ MIC)" OPTION */}
                    <div className="flex flex-col gap-1.5 pt-0.5">
                      
                      {/* Top Row: Continue Speaking (+ Mic) & Retry */}
                      <div className="flex items-center gap-2">
                        {/* CONTINUE SPEAKING (+ MIC) BUTTON */}
                        <button
                          type="button"
                          onClick={() => startRecording(true)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200/90 text-amber-950 text-xs font-black transition flex items-center justify-center gap-1.5 border border-amber-300 shadow-2xs"
                          title="Speak more text to append to this note"
                        >
                          <Mic className="w-3.5 h-3.5 text-amber-900 stroke-[2.5]" />
                          <Plus className="w-3 h-3 text-amber-900 -ml-1 stroke-[3]" />
                          <span>Continue Speaking</span>
                        </button>

                        {/* Retry / Restart Button */}
                        <button
                          type="button"
                          onClick={() => startRecording(false)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                          title="Clear and record again"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      </div>

                      {/* Primary CTA: Insert Comment */}
                      <button
                        type="button"
                        onClick={handleInsert}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs tracking-wide uppercase shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Insert into Comment</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="w-full p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] text-center font-bold">
                    {errorMessage}
                  </div>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

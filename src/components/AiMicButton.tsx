'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, X, Check, RotateCcw, Loader2, Square, 
  Globe, Copy, ChevronDown, CheckCircle2, RefreshCw, Volume2
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
  recLang: string; // WebSpeech API language code
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
  const [rawTranscript, setRawTranscript] = useState('');
  const [cleanedComment, setCleanedComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Selected Language State (Saved in LocalStorage)
  const [selectedLang, setSelectedLang] = useState<string>('mr-IN');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // References for MediaRecorder, WebSpeech & Web Audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveTextRef = useRef<string>('');

  // Load user's preferred language from localStorage
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

  // Clean up on unmount or modal close
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
    setRawTranscript('');
    setCleanedComment('');
    setSeconds(0);
    setIsLangDropdownOpen(false);
  };

  const handleCloseModal = () => {
    stopRecording();
    stopMediaTracks();
    setIsOpen(false);
  };

  const currentLangObj = INDIAN_LANGUAGES.find((l) => l.id === selectedLang) || INDIAN_LANGUAGES[0];

  const startRecording = async () => {
    setErrorMessage(null);
    setLiveStreamText('');
    setRawTranscript('');
    setCleanedComment('');
    setSeconds(0);
    liveTextRef.current = '';
    audioChunksRef.current = [];

    // 1. Initialize Real-Time Live Speech Recognition with exact selected language code
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = currentLangObj.recLang; // e.g. 'mr-IN' for Marathi, 'hi-IN' for Hindi, 'en-IN' for English

        rec.onresult = (event: any) => {
          let fullStr = '';
          for (let i = 0; i < event.results.length; i++) {
            fullStr += event.results[i][0].transcript + ' ';
          }
          const trimmed = fullStr.trim();
          liveTextRef.current = trimmed;
          setLiveStreamText(trimmed);
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

    // 2. Initialize Microphone & High-Fidelity Audio Stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Web Audio API for Gemini / ChatGPT Live Soundwave Visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Real-time volume amplitude loop
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

      // Set up MediaRecorder
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const liveCaptured = liveTextRef.current.trim();
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        stopMediaTracks();

        // Process audio via Dual-Engine (Groq Whisper + Live Speech Fallback)
        if (audioBlob.size > 500 || liveCaptured.length > 2) {
          await processVoiceInput(audioBlob, liveCaptured);
        } else {
          setErrorMessage('Recording too short. Please speak clearly into your mic.');
          setRecordingState('idle');
        }
      };

      mediaRecorder.start(250); // Collect data chunks every 250ms
      setRecordingState('recording');

      // Continuous recording timer (No limit!)
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Recording Error]:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow mic access in browser settings.'
          : 'Could not access microphone. Please check your mic connection.'
      );
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

  // Send to API with Groq Whisper + Selected Language + Gemini Polish
  const processVoiceInput = async (blob: Blob, liveText: string) => {
    setRecordingState('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice_comment.webm');
      formData.append('liveText', liveText);
      formData.append('selectedLanguage', selectedLang);

      const res = await fetch('/api/ai/voice-comment', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Speech transcription failed.');
      }

      setRawTranscript(json.rawTranscript || liveText || '');
      setCleanedComment(json.cleanedComment || json.text || liveText || '');
      setRecordingState('review');
    } catch (err: any) {
      console.error('[Voice Processing Error]:', err);
      if (liveText.length > 2) {
        // Safe graceful fallback to live recognized transcript
        setRawTranscript(liveText);
        setCleanedComment(liveText);
        setRecordingState('review');
      } else {
        setErrorMessage(err.message || 'Speech recognition failed. Please try again.');
        setRecordingState('idle');
      }
    }
  };

  const handleCopy = async () => {
    if (!cleanedComment) return;
    try {
      await navigator.clipboard.writeText(cleanedComment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleInsert = () => {
    if (cleanedComment.trim()) {
      onInsertComment(cleanedComment.trim());
      handleCloseModal();
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          TRIGGER BUTTON (CRM WARM AMBER / YELLOW THEME)
      ───────────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300 transition-all ${className}`}
        title="Record AI Voice Note (ChatGPT / Gemini Style)"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-950 animate-pulse" />
        <Mic className="w-3.5 h-3.5 text-amber-950" />
        <span>{buttonText}</span>
      </motion.button>

      {/* ─────────────────────────────────────────────────────────────
          ULTRA-MINIMAL CHATGPT / GEMINI LIVE MODAL (CRM YELLOW THEME)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="relative w-full max-w-md bg-[#FFFDF7] text-slate-900 rounded-3xl border border-amber-200/90 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col p-6 space-y-5"
            >
              {/* Background Warm Sun Aura */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none" />

              {/* ─────────────────────────────────────────────────────────────
                  HEADER: BRAND + LANGUAGE SELECTOR CORNER
              ───────────────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between z-20 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xs text-slate-950">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                      StudioCore AI Voice
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Live AI
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* LANGUAGE SELECTOR DROPDOWN (CORNER) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-950 border border-amber-200 text-xs font-bold transition shadow-2xs"
                      title="Change Spoken Language"
                    >
                      <span>{currentLangObj.flag}</span>
                      <span className="text-[11px] max-w-[90px] truncate">{currentLangObj.label.split(' ')[0]}</span>
                      <ChevronDown className="w-3 h-3 text-amber-700" />
                    </button>

                    {/* Language Dropdown Menu */}
                    <AnimatePresence>
                      {isLangDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl border border-amber-200 shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto space-y-0.5"
                        >
                          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            Select Default Language:
                          </div>
                          {INDIAN_LANGUAGES.map((lang) => (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => handleSelectLanguage(lang.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-bold transition ${
                                selectedLang === lang.id
                                  ? 'bg-amber-100/80 text-amber-950 font-black border border-amber-300/80'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm">{lang.flag}</span>
                                <div>
                                  <div className="text-xs leading-tight">{lang.label}</div>
                                  <div className="text-[9px] text-slate-400 font-normal">{lang.subLabel}</div>
                                </div>
                              </div>
                              {selectedLang === lang.id && (
                                <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />
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
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-amber-50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MAIN INTERACTIVE BODY: MINIMAL CHATGPT / GEMINI LISTENING
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 flex flex-col items-center justify-center space-y-4">
                
                {/* 1. RECORDING & IDLE STATE: GEMINI / CHATGPT MINIMAL FLUID ORB */}
                {recordingState === 'recording' || recordingState === 'idle' ? (
                  <div className="w-full flex flex-col items-center space-y-4">
                    
                    {/* Animated Minimal Fluid Pulse Rings (Warm Amber Theme) */}
                    <div className="relative flex items-center justify-center my-1">
                      {/* Fluid Wave Ring 1 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.3 + audioLevel * 0.009, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.4, 0.85, 0.4] : 0.25,
                        }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-200 blur-md pointer-events-none"
                      />

                      {/* Fluid Wave Ring 2 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.5 + audioLevel * 0.012, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.2, 0.6, 0.2] : 0.15,
                        }}
                        transition={{ repeat: Infinity, duration: 2.1, ease: 'easeInOut' }}
                        className="absolute w-36 h-36 rounded-full bg-gradient-to-br from-yellow-300/60 to-amber-200/40 blur-lg pointer-events-none"
                      />

                      {/* Minimal Center Mic Button */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.93 }}
                        onClick={recordingState === 'recording' ? stopRecording : startRecording}
                        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
                          recordingState === 'recording'
                            ? 'bg-gradient-to-tr from-rose-500 to-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-200 animate-pulse'
                            : 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/35 hover:scale-105 ring-4 ring-amber-200/70'
                        }`}
                      >
                        {recordingState === 'recording' ? (
                          <Square className="w-6 h-6 fill-current" />
                        ) : (
                          <Mic className="w-8 h-8 stroke-[2.4]" />
                        )}
                      </motion.button>
                    </div>

                    {/* Timer & Status Label */}
                    <div className="text-center space-y-0.5">
                      {recordingState === 'recording' ? (
                        <>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-xl font-black font-mono tracking-widest text-slate-900">
                              {formatTimer(seconds)}
                            </span>
                          </div>
                          <p className="text-xs font-black text-amber-900">
                            Listening in <span className="underline decoration-amber-400">{currentLangObj.label}</span>...
                          </p>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-black text-slate-900">Tap to Speak</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Speaks in <span className="font-bold text-amber-900">{currentLangObj.label}</span>
                          </p>
                        </>
                      )}
                    </div>

                    {/* REAL-TIME LIVE STREAMING TRANSCRIPT BOX */}
                    {recordingState === 'recording' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full p-3.5 rounded-2xl bg-white border border-amber-200 shadow-sm text-xs space-y-1 min-h-[60px] max-h-32 overflow-y-auto"
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Live Transcription:
                          </span>
                          <span className="font-mono text-slate-400">Real-Time</span>
                        </div>
                        <p className="text-slate-900 font-bold leading-relaxed whitespace-pre-wrap">
                          {liveStreamText || (
                            <span className="text-slate-400 font-normal italic">
                              Speak now... your voice will type here in real-time...
                            </span>
                          )}
                          <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-1 animate-pulse" />
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : null}

                {/* 2. PROCESSING STATE */}
                {recordingState === 'processing' && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shadow-xs">
                        <RefreshCw className="w-6 h-6 text-amber-800 animate-spin" />
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-slate-900">Polishing Comment...</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Formatting in {currentLangObj.label} with Studio terms
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. REVIEW & EDIT STATE */}
                {recordingState === 'review' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1 text-amber-900 font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          Polished AI Note ({currentLangObj.label.split(' ')[0]}):
                        </span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition"
                        >
                          <Copy className="w-3 h-3" />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {/* Clean Output Textarea */}
                      <textarea
                        rows={3}
                        value={cleanedComment}
                        onChange={(e) => setCleanedComment(e.target.value)}
                        className="w-full p-3 rounded-2xl bg-white border border-amber-300 text-slate-900 font-bold text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none shadow-xs"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-100/70 hover:bg-amber-200 text-amber-950 text-xs font-bold transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry
                      </button>

                      <button
                        type="button"
                        onClick={handleInsert}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs tracking-wide uppercase shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Insert Comment
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="w-full p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold">
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

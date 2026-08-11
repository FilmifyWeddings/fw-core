'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, X, Check, RotateCcw, Loader2, Square, 
  Volume2, Globe, Copy, ArrowRight, Wand2, ShieldCheck,
  CheckCircle2, RefreshCw
} from 'lucide-react';

interface AiMicButtonProps {
  onInsertComment: (cleanedText: string) => void;
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

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

  // Output Script Style Selector
  const [outputFormat, setOutputFormat] = useState<'auto' | 'hinglish' | 'native' | 'english'>('auto');

  // MediaRecorder, WebSpeech & Web Audio References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveTextRef = useRef<string>('');

  // Clean up recording tracks on unmount or modal close
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
  };

  const handleCloseModal = () => {
    stopRecording();
    stopMediaTracks();
    setIsOpen(false);
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setLiveStreamText('');
    setRawTranscript('');
    setCleanedComment('');
    setSeconds(0);
    liveTextRef.current = '';
    audioChunksRef.current = [];

    // 1. Initialize Real-Time Live Speech Recognition (WebSpeech API)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        // Multi-lingual Indian Speech Support
        rec.lang = 'hi-IN'; // Recognizes Hindi, Marathi, Hinglish naturally

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

  // Send to API with Groq Whisper + Live Speech + Gemini Polish
  const processVoiceInput = async (blob: Blob, liveText: string) => {
    setRecordingState('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice_comment.webm');
      formData.append('liveText', liveText);
      formData.append('outputFormat', outputFormat);

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
          TRIGGER BUTTON
      ───────────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white shadow-md shadow-emerald-500/20 border border-emerald-300 transition-all ${className}`}
        title="Record AI Voice Note (ChatGPT / Gemini Style)"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
        <Mic className="w-3.5 h-3.5" />
        <span>{buttonText}</span>
      </motion.button>

      {/* ─────────────────────────────────────────────────────────────
          LIGHT THEME CHATGPT / GEMINI LIVE VOICE MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md font-sans">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-lg bg-[#FDFCF7] text-slate-900 rounded-3xl border border-emerald-200/90 shadow-2xl overflow-hidden flex flex-col p-6 space-y-5"
            >
              {/* Background Light Ambient Glow */}
              <div className="absolute -top-20 -right-20 w-52 h-52 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between z-10 border-b border-emerald-100/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                      StudioCore AI Voice
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Live AI
                      </span>
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Real-time Indian speech: Marathi, Hindi, Hinglish, English
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  OUTPUT SCRIPT / LANGUAGE FORMAT SELECTOR
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-extrabold px-1">
                  <span>Output Script Format:</span>
                  <span className="text-emerald-700 font-mono text-[10px] font-bold">Auto-matches Spoken Language</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-2xl">
                  {[
                    { id: 'auto', label: '🌟 Auto Style', hint: 'Natural' },
                    { id: 'hinglish', label: '🔤 Hinglish', hint: 'Roman ABC' },
                    { id: 'native', label: '🇮🇳 Native', hint: 'मराठी / हिंदी' },
                    { id: 'english', label: '🇬🇧 English', hint: 'Translated' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOutputFormat(tab.id as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 ${
                        outputFormat === tab.id
                          ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{tab.label}</span>
                      <span className="text-[9px] opacity-75 font-semibold">{tab.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MAIN INTERACTIVE BODY
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 flex flex-col items-center justify-center py-2 space-y-4">
                
                {/* 1. RECORDING & IDLE STATE: GEMINI / CHATGPT LIVE SOUNDWAVE ORB */}
                {recordingState === 'recording' || recordingState === 'idle' ? (
                  <div className="w-full flex flex-col items-center space-y-4">
                    {/* Animated Pulsing Soundwave Orb (Light Theme) */}
                    <div className="relative flex items-center justify-center my-2">
                      {/* Pulse Wave Ring 1 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.25 + audioLevel * 0.008, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.4, 0.8, 0.4] : 0.3,
                        }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        className="absolute w-32 h-32 rounded-full bg-emerald-200/70 blur-md pointer-events-none"
                      />

                      {/* Pulse Wave Ring 2 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.45 + audioLevel * 0.012, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.3, 0.6, 0.3] : 0.15,
                        }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="absolute w-40 h-40 rounded-full bg-amber-200/50 blur-lg pointer-events-none"
                      />

                      {/* Center Mic Button */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={recordingState === 'recording' ? stopRecording : startRecording}
                        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
                          recordingState === 'recording'
                            ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-500/30 ring-4 ring-rose-300 animate-pulse'
                            : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 text-white shadow-emerald-600/30 hover:scale-105 ring-4 ring-emerald-200'
                        }`}
                      >
                        {recordingState === 'recording' ? (
                          <Square className="w-7 h-7 fill-current" />
                        ) : (
                          <Mic className="w-8 h-8 stroke-[2.4]" />
                        )}
                      </motion.button>
                    </div>

                    {/* Timer & Status Label */}
                    <div className="text-center space-y-1">
                      {recordingState === 'recording' ? (
                        <>
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                              {formatTimer(seconds)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-emerald-700">
                            Listening live... Speak naturally in Marathi, Hindi, or English
                          </p>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-black text-slate-900">Tap Microphone to Speak</h4>
                          <p className="text-xs text-slate-500 max-w-xs font-medium">
                            Live real-time speech recognition with auto multi-lingual detection.
                          </p>
                        </>
                      )}
                    </div>

                    {/* REAL-TIME LIVE STREAMING TRANSCRIPT BOX */}
                    {recordingState === 'recording' && (
                      <div className="w-full p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-sm text-xs space-y-1 min-h-[70px] max-h-36 overflow-y-auto">
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Speech Streaming:
                          </span>
                          <span className="font-mono text-slate-400">Real-Time</span>
                        </div>
                        <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">
                          {liveStreamText || (
                            <span className="text-slate-400 font-medium italic">
                              Start speaking... your words will appear here in real-time...
                            </span>
                          )}
                          <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-1 animate-pulse" />
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 2. PROCESSING STATE */}
                {recordingState === 'processing' && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center">
                        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-900">Polishing Voice Note...</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Transcribing & formatting quotation comment with AI
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. REVIEW & EDIT STATE */}
                {recordingState === 'review' && (
                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Polished AI Comment:
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
                        rows={4}
                        value={cleanedComment}
                        onChange={(e) => setCleanedComment(e.target.value)}
                        className="w-full p-3.5 rounded-2xl bg-white border border-emerald-300 text-slate-900 font-bold text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none shadow-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Record Again
                      </button>

                      <button
                        type="button"
                        onClick={handleInsert}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wide uppercase shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Insert into Comment
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold">
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

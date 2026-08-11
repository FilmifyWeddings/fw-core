'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, X, Check, RotateCcw, Loader2, Square, 
  Volume2, Globe, Copy, ArrowRight, Wand2, ShieldCheck
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
  const [rawTranscript, setRawTranscript] = useState('');
  const [cleanedComment, setCleanedComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Output Script Style Selector
  const [outputFormat, setOutputFormat] = useState<'auto' | 'hinglish' | 'native' | 'english'>('auto');

  // MediaRecorder & Web Audio References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setRawTranscript('');
    setCleanedComment('');
    setSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Set up Web Audio API for dynamic ChatGPT/Gemini Soundwave Orb Visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Live volume amplitude loop
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        stopMediaTracks();

        if (audioBlob.size > 800) {
          await sendAudioToGroqWhisper(audioBlob);
        } else {
          setErrorMessage('Recording was too short. Please tap the mic and speak clearly.');
          setRecordingState('idle');
        }
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setRecordingState('recording');

      // Continuous recording timer (NO 1-minute limit!)
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Recording Error]:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in browser settings.'
          : 'Could not access microphone. Please check your mic connection.'
      );
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Direct Audio Transmission to Groq Whisper Large-v3 API
  const sendAudioToGroqWhisper = async (blob: Blob) => {
    setRecordingState('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice_comment.webm');
      formData.append('outputFormat', outputFormat);

      const res = await fetch('/api/ai/voice-comment', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Speech transcription failed.');
      }

      setRawTranscript(json.rawTranscript || '');
      setCleanedComment(json.cleanedComment || json.text || '');
      setRecordingState('review');
    } catch (err: any) {
      console.error('[Groq Whisper Error]:', err);
      setErrorMessage(err.message || 'Speech recognition failed. Please try again.');
      setRecordingState('idle');
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-md shadow-emerald-500/20 border border-emerald-400/40 transition-all ${className}`}
        title="Record AI Voice Note (Whisper Large-v3)"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <Mic className="w-3.5 h-3.5" />
        <span>{buttonText}</span>
      </motion.button>

      {/* ─────────────────────────────────────────────────────────────
          FUTURISTIC CHATGPT / GEMINI LIVE VOICE MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-slate-900/95 text-white rounded-3xl border border-slate-700/80 shadow-2xl shadow-emerald-500/10 overflow-hidden flex flex-col p-6 space-y-6"
            >
              {/* Background ambient neon glow */}
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                      StudioCore AI Voice Note
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Whisper Large-v3
                      </span>
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400">
                      Multi-lingual speech: Marathi, Hindi, Hinglish, English
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  OUTPUT SCRIPT / LANGUAGE FORMAT SELECTOR
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                  <span>Output Script Style:</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Auto-detects Spoken Language</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-2xl">
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
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        outputFormat === tab.id
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{tab.label}</span>
                      <span className="text-[9px] opacity-75 font-normal">{tab.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MAIN INTERACTIVE BODY
              ───────────────────────────────────────────────────────────── */}
              <div className="z-10 flex flex-col items-center justify-center py-4 space-y-5">
                
                {/* 1. RECORDING & IDLE STATE: GEMINI LIVE SOUNDWAVE ORB */}
                {recordingState === 'recording' || recordingState === 'idle' ? (
                  <div className="flex flex-col items-center space-y-4">
                    {/* Animated Pulsing Soundwave Orb */}
                    <div className="relative flex items-center justify-center">
                      {/* Pulse Wave Ring 1 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.2 + audioLevel * 0.008, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.3, 0.7, 0.3] : 0.2,
                        }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-emerald-500/30 to-cyan-500/30 blur-md pointer-events-none"
                      />

                      {/* Pulse Wave Ring 2 */}
                      <motion.div
                        animate={{
                          scale: recordingState === 'recording' ? [1, 1.4 + audioLevel * 0.012, 1] : 1,
                          opacity: recordingState === 'recording' ? [0.2, 0.5, 0.2] : 0.1,
                        }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-500/20 blur-lg pointer-events-none"
                      />

                      {/* Center Mic Button */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={recordingState === 'recording' ? stopRecording : startRecording}
                        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                          recordingState === 'recording'
                            ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-600/40 ring-4 ring-rose-500/30 animate-pulse'
                            : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/40 hover:scale-105 ring-4 ring-emerald-500/20'
                        }`}
                      >
                        {recordingState === 'recording' ? (
                          <Square className="w-8 h-8 fill-current" />
                        ) : (
                          <Mic className="w-10 h-10 stroke-[2.3]" />
                        )}
                      </motion.button>
                    </div>

                    {/* Timer & Status Label */}
                    <div className="text-center space-y-1">
                      {recordingState === 'recording' ? (
                        <>
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span className="text-2xl font-black font-mono tracking-widest text-white">
                              {formatTimer(seconds)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-400">
                            Listening... Speak naturally in Marathi, Hindi, or English
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Tap red square when finished (No time limit)
                          </p>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-black text-white">Tap Microphone to Speak</h4>
                          <p className="text-xs text-slate-400 max-w-xs">
                            Direct Groq Whisper Large-v3 recognition with instant multi-lingual auto-detection.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* 2. PROCESSING STATE */}
                {recordingState === 'processing' && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white">Processing Voice Recording...</h4>
                      <p className="text-xs text-slate-400">
                        Transcribing via Groq Whisper Large-v3 & Polishing with Gemini AI
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. REVIEW & EDIT STATE */}
                {recordingState === 'review' && (
                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          Polished AI Comment:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
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
                        className="w-full p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/40 text-white font-medium text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none shadow-inner"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Record Again
                      </button>

                      <button
                        type="button"
                        onClick={handleInsert}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wide uppercase shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Insert into Comment
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-semibold">
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

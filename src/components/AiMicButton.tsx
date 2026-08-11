'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Sparkles, X, Check, RotateCcw, Loader2, Square, Volume2 } from 'lucide-react';

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
  const [liveTranscript, setLiveTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [cleanedComment, setCleanedComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Web Audio & Speech Recognition References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSpeechTextRef = useRef<string>('');

  // Clean up recording on unmount or modal close
  useEffect(() => {
    return () => {
      stopMediaTracks();
    };
  }, []);

  const stopMediaTracks = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

  const startRecording = async () => {
    setErrorMessage(null);
    setLiveTranscript('');
    setRawTranscript('');
    setCleanedComment('');
    setSeconds(0);
    liveSpeechTextRef.current = '';
    audioChunksRef.current = [];

    // Try initializing Web Speech API for real-time live browser transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'hi-IN'; // Multi-lingual Indian speech recognition

        rec.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          const trimmed = currentText.trim();
          liveSpeechTextRef.current = trimmed;
          setLiveTranscript(trimmed);
        };

        rec.onerror = (e: any) => {
          console.warn('[WebSpeech API Warning]:', e.error);
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn('[WebSpeech Init Error]:', e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for VAD & Live Soundwave Level
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Audio VAD Level Loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Set up MediaRecorder
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const liveText = liveSpeechTextRef.current.trim();
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        stopMediaTracks();

        // If live text was captured by browser WebSpeech, use it directly!
        if (liveText.length > 2) {
          await processRawText(liveText);
        } else if (audioBlob.size > 500) {
          await processAudioBlob(audioBlob);
        } else {
          setErrorMessage('Recording too short. Please speak again clearly.');
          setRecordingState('idle');
        }
      };

      mediaRecorder.start(250); // Collect data chunks every 250ms
      setRecordingState('recording');

      // Start 60s max ticker
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Recording Error]:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow mic access in browser settings.'
          : 'Could not access microphone. Please check your mic settings.'
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
    }
  };

  const processRawText = async (speechText: string) => {
    setRecordingState('processing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/voice-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: speechText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Voice text polishing failed.');
      }

      setRawTranscript(speechText);
      setCleanedComment(json.cleanedComment || json.text || speechText);
      setRecordingState('review');
    } catch (err: any) {
      console.warn('[Process RawText Exception]:', err);
      // Fallback to raw text if AI API polishing fails
      setRawTranscript(speechText);
      setCleanedComment(speechText);
      setRecordingState('review');
    }
  };

  const processAudioBlob = async (blob: Blob) => {
    setRecordingState('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/ai/voice-comment', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Voice transcription failed.');
      }

      setRawTranscript(json.rawTranscript || '');
      setCleanedComment(json.cleanedComment || json.text || json.rawTranscript || '');
      setRecordingState('review');
    } catch (err: any) {
      console.error('[Voice Process Error]:', err);
      setErrorMessage(err.message || 'Speech recognition failed. Please speak clearly and try again.');
      setRecordingState('idle');
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    startRecording();
  };

  const handleCloseModal = () => {
    stopRecording();
    stopMediaTracks();
    setIsOpen(false);
    setRecordingState('idle');
  };

  const handleConfirmInsert = () => {
    if (cleanedComment.trim()) {
      onInsertComment(cleanedComment.trim());
    }
    handleCloseModal();
  };

  // Button Size Styles
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px] gap-1 rounded-lg',
    md: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
    lg: 'px-4 py-2 text-sm gap-2 rounded-xl',
  };

  return (
    <>
      {/* AI Mic Trigger Button */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`inline-flex items-center font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-md hover:shadow-lg transition-all cursor-pointer select-none border border-purple-400/30 ${sizeClasses[size]} ${className}`}
        title="Record AI Voice Comment (Hindi / Hinglish / Marathi / English)"
      >
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
        <Mic className="w-3.5 h-3.5" />
        <span>{buttonText}</span>
      </button>

      {/* Live Voice Recording & Transcription Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#141312] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-zinc-900 to-indigo-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">AI Voice Comment Assistant</h3>
                  <p className="text-[10px] text-zinc-400">Speak in Hindi, Hinglish, Marathi, or English</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 space-y-5">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* State 1: Active Recording with Live Soundwave & Real-time Text */}
              {recordingState === 'recording' && (
                <div className="space-y-4 text-center py-2">
                  {/* Glowing Mic Badge */}
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-xl z-10">
                      <Mic className="w-8 h-8 animate-pulse" />
                    </div>
                  </div>

                  {/* Audio Level Soundwaves Visualizer */}
                  <div className="flex items-center justify-center gap-1.5 h-8">
                    {[40, 70, 100, 60, 90, 50, 80, 100, 60, 40].map((h, i) => {
                      const scaledHeight = Math.max(8, Math.round((audioLevel / 100) * h));
                      return (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 transition-all duration-75"
                          style={{ height: `${scaledHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Real-time Streaming Live Text Box */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-purple-500/30 text-left min-h-[60px] max-h-[100px] overflow-y-auto">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                      🎙️ Live Speech Text:
                    </span>
                    <p className="text-xs text-zinc-200 font-medium italic">
                      {liveTranscript || 'Listening... Speak your notes clearly'}
                    </p>
                  </div>

                  {/* Timer */}
                  <div className="text-xl font-black font-mono tracking-wider text-purple-300">
                    00:{seconds < 10 ? `0${seconds}` : seconds} / 01:00
                  </div>

                  {/* Stop Recording Action */}
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Done Speaking</span>
                  </button>
                </div>
              )}

              {/* State 2: Processing AI Transcription */}
              {recordingState === 'processing' && (
                <div className="py-10 space-y-3 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto" />
                  <p className="text-sm font-extrabold text-white">Transcribing & Polishing Comment...</p>
                  <p className="text-xs text-zinc-400">Formatting speech with Groq & Gemini 1.5 Flash</p>
                </div>
              )}

              {/* State 3: Review & Edit Preview */}
              {recordingState === 'review' && (
                <div className="space-y-4">
                  {/* Raw Transcript Collapsible Note */}
                  {rawTranscript && (
                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        🎙️ Raw Audio Transcript:
                      </span>
                      <p className="text-zinc-300 italic">{rawTranscript}</p>
                    </div>
                  )}

                  {/* Polished Comment Input Textarea */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Polished Comment Preview (Editable)
                    </label>
                    <textarea
                      rows={4}
                      value={cleanedComment}
                      onChange={(e) => setCleanedComment(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-900 border border-purple-500/40 text-white text-xs font-medium focus:outline-none focus:border-purple-400 leading-relaxed shadow-inner"
                      placeholder="Comment text will appear here..."
                    />
                  </div>
                </div>
              )}

              {/* Idle State Fallback */}
              {recordingState === 'idle' && !errorMessage && (
                <div className="py-8 text-center space-y-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all inline-flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Speaking</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            {recordingState === 'review' && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-xs cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmInsert}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Insert Comment</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

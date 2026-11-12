import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript, normalizeComparisonTokens } from '@/lib/speech-text-cleaner';

export const maxDuration = 60; // 60s timeout for audio transcription

/**
 * Checks uncompressed 16-bit PCM WAV buffers for pure silence / near-zero floor noise (< -50dBFS).
 */
function analyzeWavSilence(audioBuffer: ArrayBuffer): { isWav: boolean; isSilent: boolean; peak: number; rms: number } {
  const buf = Buffer.from(audioBuffer);
  if (buf.length < 44) return { isWav: false, isSilent: false, peak: 1, rms: 1 };
  const riff = buf.subarray(0, 4).toString('ascii');
  const wave = buf.subarray(8, 12).toString('ascii');
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return { isWav: false, isSilent: false, peak: 1, rms: 1 };
  }

  let offset = 12;
  let audioFormat = 1;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataLen = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.subarray(offset, offset + 4).toString('ascii');
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ' && offset + 24 <= buf.length) {
      audioFormat = buf.readUInt16LE(offset + 8);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    } else if (id === 'data') {
      dataStart = offset + 8;
      dataLen = Math.min(size, buf.length - dataStart);
      break;
    }
    offset += 8 + size + (size % 2);
  }

  if (dataStart < 0 || dataLen < 2 || audioFormat !== 1 || bitsPerSample !== 16) {
    return { isWav: true, isSilent: false, peak: 1, rms: 1 };
  }

  let maxAbs = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = dataStart; i + 1 < dataStart + dataLen; i += 2) {
    const s = buf.readInt16LE(i) / 32768;
    const a = Math.abs(s);
    if (a > maxAbs) maxAbs = a;
    sumSq += s * s;
    count++;
  }
  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
  const isSilent = peakIsSilent(maxAbs, rms);
  return { isWav: true, isSilent, peak: maxAbs, rms };
}

function peakIsSilent(peak: number, rms: number): boolean {
  return peak < 0.003 && rms < 0.0005;
}

/**
 * Detects explicit [NO_SPEECH] sentinel, common STT silence hallucinations, or severe divergence vs liveDraft.
 */
function isPhantomOrHallucinatedTranscript(rawText: string, liveDraft: string): boolean {
  const txt = String(rawText || '').trim();
  if (!txt) return true;

  const stripped = txt.replace(/[\s.,!?;:'"()[\]\-–—।|♪*~`]+/g, '');
  if (stripped.length < 2) return true;

  const lower = txt.toLowerCase();
  if (
    /\[?\s*(?:no[_\s-]*speech|silent|silence|inaudible|unintelligible|music|applause|noise|blank[_\s-]*audio|empty)\s*\]?/i.test(lower) ||
    /^(?:no\s+speech(?:\s+detected)?|nothing\s+spoken|silence)$/i.test(lower)
  ) {
    return true;
  }

  // Known Whisper / STT silence phantom outputs across languages
  const phantomPhrases = [
    'tervetuloa',
    'thank you for watching',
    'thanks for watching',
    'please subscribe',
    'subtitles by',
    'amara.org',
    'mbc news',
    'altyazı',
    'translated by',
    'you.',
    'you',
  ];
  const lowerClean = lower.replace(/[.!?,\s]+$/g, '').trim();
  if (phantomPhrases.includes(lowerClean)) return true;
  if (/amara\.org|subtitles\s+by|thank(?:s|\s+you)\s+for\s+watching/i.test(lower)) return true;

  // Guard against wild hallucinated quotation generation when WebSpeech captured clear contrasting words
  const draftTrim = String(liveDraft || '').trim();
  if (draftTrim) {
    const liveTokens = normalizeComparisonTokens(draftTrim);
    const candTokens = normalizeComparisonTokens(txt);
    const wordCount = txt.split(/\s+/).filter(Boolean).length;
    if (liveTokens.length >= 2 && wordCount >= 25 && candTokens.length >= 16) {
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
      if (overlapRatio < 0.10 && sharedNums === 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Server-side Strict Verbatim Audio Transcription & Lossless Cleaner
 * Primary: Google Gemini Multimodal Audio AI (gemini-3-flash-preview -> gemini-3.1-flash-lite -> gemini-flash-latest)
 * Fallback: OpenAI Audio API (gpt-4o-mini-transcribe -> whisper-1), then Groq Whisper if configured.
 * Supports Hindi, Marathi, English, and Hinglish without hallucinating unspoken names, events, or budgets.
 */
export async function POST(req: NextRequest) {
  try {
    const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    const geminiKeys = (process.env.GEMINI_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | File | null;
    const studioEventNames = String(formData.get('studioEventNames') || '').trim();
    const studioCrewRoles = String(formData.get('studioCrewRoles') || '').trim();
    const liveDraft = String(formData.get('liveDraft') || '').trim();

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength < 200) {
      return NextResponse.json({ error: 'Audio recording was too short or empty' }, { status: 400 });
    }

    // Detect true audio container format (iPhone MP4/AAC vs Android/Desktop WebM/WAV/OGG/MP3)
    let fileExt = 'webm';
    let mimeType = 'audio/webm';
    const magic = new Uint8Array(audioBuffer.slice(0, 12));
    const isEbmlWebm = magic[0] === 0x1a && magic[1] === 0x45 && magic[2] === 0xdf && magic[3] === 0xa3;
    const isFtypMp4 = magic[4] === 0x66 && magic[5] === 0x74 && magic[6] === 0x79 && magic[7] === 0x70; // 'ftyp'
    const isRiffWav = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46; // 'RIFF'
    const isOgg = magic[0] === 0x4f && magic[1] === 0x67 && magic[2] === 0x67 && magic[3] === 0x53; // 'OggS'
    const clientType = (audioFile.type || '').toLowerCase();

    if (isFtypMp4 || clientType.includes('mp4') || clientType.includes('m4a') || clientType.includes('aac')) {
      fileExt = 'mp4';
      mimeType = 'audio/mp4';
    } else if (isRiffWav || clientType.includes('wav')) {
      fileExt = 'wav';
      mimeType = 'audio/wav';
    } else if (isOgg || clientType.includes('ogg')) {
      fileExt = 'ogg';
      mimeType = 'audio/ogg';
    } else if (clientType.includes('mp3') || clientType.includes('mpeg')) {
      fileExt = 'mp3';
      mimeType = 'audio/mpeg';
    } else if (isEbmlWebm || clientType.includes('webm')) {
      fileExt = 'webm';
      mimeType = 'audio/webm';
    }

    // Immediate deterministic WAV silence rejection (zero API calls, zero hallucination risk)
    if (isRiffWav) {
      const wavStats = analyzeWavSilence(audioBuffer);
      if (wavStats.isWav && wavStats.isSilent) {
        return NextResponse.json(
          {
            success: false,
            noSpeech: true,
            error: 'No clear speech detected in recording. Please speak clearly into your microphone and try again.',
          },
          { status: 422 }
        );
      }
    }

    let transcript = '';
    let activeEngine = '';
    let oneStepPolished = false;
    let noSpeechConfirmedByPrimary = false;
    let lastErrorDetail = '';

    const vocabEvents = (studioEventNames || 'Haldi, Mehendi, Sangeet, Wedding, Engagement, Reception').slice(0, 220);
    const vocabRoles = (studioCrewRoles || 'Candid Photographer, Traditional Photographer, Cinematographer, Traditional Videographer, Drone Pilot, Semi Cinematic, Semi Standard, Reels Creator').slice(0, 260);

    // 1. PRIMARY ENGINE: Google Gemini Multimodal Audio AI (Strict Verbatim with [NO_SPEECH] sentinel)
    if (geminiKeys.length > 0) {
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioPrompt = `You are a strictly VERBATIM audio speech transcriber.
Transcribe ONLY the exact words clearly spoken aloud by the human speaker in the attached audio recording.

STRICT ANTI-HALLUCINATION MANDATE:
1. NEVER invent, guess, autocomplete, or generate sentences, client names, events, dates, crew roles, shortcuts, deliverables, locations, or amounts that are NOT clearly audible in the attached audio.
2. If the audio is silent, contains only background noise/static, is too faint/unintelligible, or has no clear spoken words, output ONLY the exact token: [NO_SPEECH]
3. Passive vocabulary spelling reference ONLY (NEVER insert or mention ANY word below unless the speaker clearly said it aloud):
   - Events: ${vocabEvents}
   - Roles: ${vocabRoles}
4. Keep the transcription faithful to what the speaker actually said (Devanagari Hindi, Hinglish, or English), using clean digits for spoken numbers (e.g. 500, 2,50,000) and plain text (NO markdown, NO bullet points, NO JSON, NO commentary).

Output ONLY the verbatim heard words, or [NO_SPEECH].`;

      const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      for (const geminiKey of geminiKeys) {
        if (transcript || noSpeechConfirmedByPrimary) break;
        for (const model of candidateModels) {
          if (transcript || noSpeechConfirmedByPrimary) break;
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
              },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: audioPrompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Audio
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0,
                  maxOutputTokens: 2500,
                  thinkingConfig: { thinkingBudget: 0 }
                }
              }),
              signal: AbortSignal.timeout(20000),
            });
            if (res.ok) {
              const data = await res.json();
              const parts = data?.candidates?.[0]?.content?.parts || [];
              const rawModelText = parts
                .filter((p: any) => !p?.thought && typeof p?.text === 'string')
                .map((p: any) => p.text)
                .join('')
                .trim();

              if (isPhantomOrHallucinatedTranscript(rawModelText, liveDraft)) {
                console.log(`[Gemini Audio ${model}] Confirmed no clear speech / rejected phantom output:`, rawModelText.slice(0, 80));
                if (model === 'gemini-3-flash-preview' || model === 'gemini-3.1-flash-lite') {
                  // Authoritative primary model returned OK with [NO_SPEECH] — do NOT cascade to noisier fallbacks!
                  noSpeechConfirmedByPrimary = true;
                  break;
                }
                continue;
              }

              const cleaned = cleanVoiceTranscript(rawModelText) || rawModelText;
              if (cleaned && !isPhantomOrHallucinatedTranscript(cleaned, liveDraft)) {
                transcript = cleaned;
                activeEngine = model;
                oneStepPolished = true;
                console.log(`[Gemini Audio Verbatim Success via ${model}]:`, transcript);
                break;
              }
            } else {
              const errTxt = await res.text().catch(() => '');
              lastErrorDetail = `${model}: ${res.status}`;
              console.warn(`[Gemini Audio Error on ${model}]:`, res.status, errTxt.slice(0, 120));
            }
          } catch (modelErr: any) {
            lastErrorDetail = modelErr?.message || String(modelErr);
            console.warn(`[Gemini Audio Model ${model} Exception]:`, lastErrorDetail);
          }
        }
      }
    }

    if (noSpeechConfirmedByPrimary && !transcript) {
      return NextResponse.json(
        {
          success: false,
          noSpeech: true,
          error: 'No clear speech detected in recording. Please speak clearly or type your notes directly.',
        },
        { status: 422 }
      );
    }

    // 2. SECONDARY FALLBACK: OpenAI Speech-to-Text (gpt-4o-mini-transcribe -> whisper-1)
    // Neutral vocabulary-only hint (NEVER inject Couple/Lead Name or sample amounts/shortcuts so Whisper never hallucinates them!)
    if (!transcript && !noSpeechConfirmedByPrimary && openAiKey) {
      const openAiModels = ['gpt-4o-mini-transcribe', 'whisper-1'];
      const hintPrompt = `Spelling vocabulary only: ${vocabEvents}, ${vocabRoles}. Do not invent speech if silent.`;
      for (const oaModel of openAiModels) {
        try {
          const oaForm = new FormData();
          const fileObj = new File([audioBuffer], `recording.${fileExt}`, { type: mimeType });
          oaForm.append('file', fileObj);
          oaForm.append('model', oaModel);
          oaForm.append('prompt', hintPrompt.slice(0, 500));
          oaForm.append('temperature', '0');

          const oaRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openAiKey}`,
            },
            body: oaForm,
            signal: AbortSignal.timeout(20000),
          });

          if (oaRes.ok) {
            const oaJson = await oaRes.json();
            const rawText = (oaJson.text || '').trim();
            if (!isPhantomOrHallucinatedTranscript(rawText, liveDraft)) {
              transcript = cleanVoiceTranscript(rawText) || rawText;
              activeEngine = `openai-${oaModel}`;
              oneStepPolished = false;
              console.log(`[OpenAI ${oaModel} Audio Fallback Success]:`, transcript);
              break;
            }
          } else {
            const errTxt = await oaRes.text().catch(() => '');
            lastErrorDetail = `openai-${oaModel}: ${oaRes.status}`;
            console.warn(`[OpenAI ${oaModel} Error]:`, oaRes.status, errTxt.slice(0, 120));
          }
        } catch (oaErr: any) {
          lastErrorDetail = oaErr?.message || String(oaErr);
          console.warn(`[OpenAI ${oaModel} Exception]:`, lastErrorDetail);
        }
      }
    }

    // 3. TERTIARY FALLBACK: Groq Whisper Large-v3-turbo (only if GROQ_API_KEY configured)
    if (!transcript && !noSpeechConfirmedByPrimary && groqKey) {
      try {
        const groqFormData = new FormData();
        const fileObj = new File([audioBuffer], `recording.${fileExt}`, {
          type: mimeType,
        });
        groqFormData.append('file', fileObj);
        groqFormData.append('model', 'whisper-large-v3-turbo');
        groqFormData.append('temperature', '0');
        groqFormData.append(
          'prompt',
          'Haldi, Mehendi, Sangeet, Wedding, Reception, Candid Photographer, Cinematographer, Drone.'
        );

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: groqFormData,
          signal: AbortSignal.timeout(20000),
        });

        if (groqRes.ok) {
          const groqJson = await groqRes.json();
          const rawText = (groqJson.text || '').trim();
          if (!isPhantomOrHallucinatedTranscript(rawText, liveDraft)) {
            transcript = cleanVoiceTranscript(rawText) || rawText;
            activeEngine = 'groq-whisper-large-v3-turbo';
            oneStepPolished = false;
            console.log('[Groq Whisper Fallback Success]:', transcript);
          }
        }
      } catch (err: any) {
        console.warn('[Groq Whisper Fallback Exception]:', err?.message || err);
      }
    }

    if (!transcript) {
      return NextResponse.json({
        error: lastErrorDetail || 'No clear speech detected in audio. Please speak clearly or type your notes directly.',
        noSpeech: !lastErrorDetail,
        success: false
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      text: transcript,
      engine: activeEngine,
      oneStepPolished
    });
  } catch (err: any) {
    console.error('[Transcribe Audio Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Audio transcription failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript } from '@/lib/speech-text-cleaner';

export const maxDuration = 60; // 60s timeout for audio transcription

/**
 * Server-side 1-Step AI Audio Transcription & Lossless Dictation Polisher
 * Primary: Google Gemini Multimodal Audio AI (gemini-3-flash-preview -> gemini-3.1-flash-lite -> gemini-flash-latest)
 * Fallback: OpenAI Audio API (gpt-4o-mini-transcribe -> whisper-1), then Groq Whisper if configured.
 * Supports Hindi, Marathi, English, and Hinglish with studio-specific wedding photography context.
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
    const leadName = String(formData.get('leadName') || '').trim();
    const studioEventNames = String(formData.get('studioEventNames') || '').trim();
    const studioCrewRoles = String(formData.get('studioCrewRoles') || '').trim();
    const shortcutTriggers = String(formData.get('shortcutTriggers') || '').trim();
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

    let transcript = '';
    let activeEngine = '';
    let oneStepPolished = false;
    let lastErrorDetail = '';

    // 1. PRIMARY ENGINE: Google Gemini Multimodal Audio AI (1-Step Audio -> Clean Lossless Studio Text)
    if (geminiKeys.length > 0) {
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioPrompt = `You are a 100% LOSSLESS bilingual audio transcriber & speech cleaner for an Indian wedding photography studio (StudioCore).
Listen carefully to the ENTIRE audio recording from the very first second to the very last millisecond.

CRITICAL RULES — ZERO OMISSION / ZERO SUMMARIZATION:
1. Transcribe EVERY spoken detail completely in clean Hinglish/English/Hindi so NOTHING is lost — especially trailing budget amounts, discounts, advance terms, dates, relative date words ("agla din", "same day", "ek din pehle"), venue locations, per-event crew constraints, and counted deliverables!
2. Output plain natural punctuated text (NO markdown headings, NO bullet lists, NO JSON, NO commentary or preface like "Here is...").
3. Preserve per-event crew locks & shortcuts EXACTLY (e.g., preserve "Standard Crew", "alag crew", "bas 1 Traditional Photographer", "only", "sabhi events me"): NEVER merge separate event crews into one.
4. Convert spoken numbers & counts to clean Arabic digits ("ek" -> "1", "do" -> "2", "paanch" -> "5", "paanch sau" -> "500") and clean currency ("do lakh" -> "₹2,00,000", "50 hajar" -> "₹50,000").
5. Capitalize proper Couple Names, Venue Cities, and Official Events in clean Title Case English.
6. STUDIO DICTIONARY (use exact spellings when heard):
   - Official Events: ${studioEventNames || 'Wedding, Haldi, Sangeet, Mehendi, Ring Ceremony, Reception'}
   - Official Crew Roles: ${studioCrewRoles || 'Candid Photographer, Traditional Photographer, Cinematographer, Traditional Videographer, Drone Pilot, Semi Cinematic, Semi Standard, Reels Creator'}
   ${shortcutTriggers ? `- Studio Shortcuts / Triggers: ${shortcutTriggers}` : ''}
   ${leadName ? `- Active Lead / Client Name: ${leadName}` : ''}
   ${liveDraft ? `- Live Mic Reference (may contain browser speech typos or clipped ending — ALWAYS trust the audio recording above this reference): ${liveDraft.slice(0, 600)}` : ''}

Output ONLY the clean, complete dictated text ready to drop into the requirement box.`;

      const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      for (const geminiKey of geminiKeys) {
        if (transcript) break;
        for (const model of candidateModels) {
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
                  temperature: 0.05,
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
              if (rawModelText && rawModelText.length > 2) {
                transcript = cleanVoiceTranscript(rawModelText, leadName) || rawModelText;
                activeEngine = model;
                oneStepPolished = true;
                console.log(`[Gemini Audio 1-Step Success via ${model}]:`, transcript);
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

    // 2. SECONDARY FALLBACK: OpenAI Speech-to-Text (gpt-4o-mini-transcribe -> whisper-1)
    if (!transcript && openAiKey) {
      const openAiModels = ['gpt-4o-mini-transcribe', 'whisper-1'];
      const hintPrompt = `Indian wedding photography quotation notes. Couple: ${leadName || 'Client'}. Events: ${studioEventNames || 'Haldi, Sangeet, Wedding, Mehendi, Reception'}. Roles: ${studioCrewRoles || 'Candid Photographer, Traditional Photographer, Cinematographer, Drone Pilot'}. Triggers: ${shortcutTriggers || 'Standard Crew, All Deliverables Add'}. Deliverables: edited photos, Instagram reels, pendrive, album, teaser.`;
      for (const oaModel of openAiModels) {
        try {
          const oaForm = new FormData();
          const fileObj = new File([audioBuffer], `recording.${fileExt}`, { type: mimeType });
          oaForm.append('file', fileObj);
          oaForm.append('model', oaModel);
          oaForm.append('prompt', hintPrompt.slice(0, 800));
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
            if (rawText) {
              transcript = rawText;
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
    if (!transcript && groqKey) {
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
          'Indian wedding photography quotation details: Haldi, Mehendi, Sangeet, Wedding, Reception, Standard Crew, Candid Photography, Cinematography, Drone, Album, All Deliverables Add.'
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
          if (rawText) {
            transcript = rawText;
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
        error: lastErrorDetail || 'Could not transcribe audio. Please speak again or type your notes directly.',
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

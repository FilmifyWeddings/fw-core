import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 60s timeout for audio transcription

/**
 * Server-side AI Audio Transcription API Route (OpenAI Whisper + Groq Fallback)
 * Transcribes Indian languages (Hindi, Marathi, English, Hinglish, Gujarati)
 * Resilient against iPhone Safari MP4 and Android/Desktop WebM/WAV formats.
 */
export async function POST(req: NextRequest) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength < 200) {
      return NextResponse.json({ error: 'Audio recording was too short or empty' }, { status: 400 });
    }

    // Detect true audio container format (iPhone MP4/AAC vs Android/Desktop WebM/WAV/OGG)
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
      mimeType = 'audio/mp3';
    } else if (isEbmlWebm || clientType.includes('webm')) {
      fileExt = 'webm';
      mimeType = 'audio/webm';
    }

    let transcript = '';
    let lastErrorDetail = '';

    // 1. PRIMARY: Google Gemini Multimodal Audio Transcription
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
        for (const model of candidateModels) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      text: "Accurately transcribe the spoken voice in this audio file word-for-word in its original language (Hindi, Marathi, English, or Hinglish). Do not add any preface, formatting, brackets, commentary, markdown, or notes. Output ONLY the exact transcribed words."
                    },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 2000
                }
              }),
              signal: AbortSignal.timeout(25000),
            });
            if (res.ok) {
              const data = await res.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (text) {
                transcript = text;
                console.log(`[Gemini Audio Transcription Success via ${model}]:`, transcript);
                break;
              }
            } else {
              const errTxt = await res.text().catch(() => '');
              console.warn(`[Gemini Audio Transcription Error on ${model}]:`, res.status, errTxt.slice(0, 100));
            }
          } catch (modelErr: any) {
            console.warn(`[Gemini Audio Transcription Model ${model} Exception]:`, modelErr?.message || modelErr);
          }
        }
      } catch (geminiEx: any) {
        console.warn('[Gemini Audio Transcription Outer Exception]:', geminiEx?.message || geminiEx);
      }
    }

    // 2. SECONDARY FALLBACK: OpenAI Whisper API (whisper-1)
    if (!transcript && openAiKey) {
      try {
        const whisperFormData = new FormData();
        const fileObj = new File([audioBuffer], `recording.${fileExt}`, {
          type: mimeType,
        });
        whisperFormData.append('file', fileObj);
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append('language', 'hi');
        whisperFormData.append(
          'prompt',
          'Indian wedding photography quotation details: Haldi, Mehendi, Sangeet, Wedding, Reception, Candid Photography, Cinematography, Drone, Album, Rates in Lakhs, Advance Token.'
        );

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
          body: whisperFormData,
          signal: AbortSignal.timeout(28000), // 28s timeout safely within Nginx proxy limit
        });

        if (res.ok) {
          const json = await res.json();
          transcript = (json.text || '').trim();
          console.log('[OpenAI Whisper Success]:', transcript);
        } else {
          const errText = await res.text();
          lastErrorDetail = `OpenAI Whisper: ${res.status} ${errText}`;
          console.warn('[OpenAI Whisper Error]:', res.status, errText);
        }
      } catch (e: any) {
        lastErrorDetail = e?.message || String(e);
        console.warn('[OpenAI Whisper Exception]:', lastErrorDetail);
      }
    }

    // 2. FALLBACK: Groq Whisper Large-v3-turbo (Zero latency & high accuracy if needed)
    if (!transcript && groqKey) {
      try {
        const groqFormData = new FormData();
        const fileObj = new File([audioBuffer], `recording.${fileExt}`, {
          type: mimeType,
        });
        groqFormData.append('file', fileObj);
        groqFormData.append('model', 'whisper-large-v3-turbo');
        groqFormData.append('language', 'hi');
        groqFormData.append('temperature', '0');
        groqFormData.append(
          'prompt',
          'Indian wedding photography quotation details: Haldi, Mehendi, Sangeet, Wedding, Reception, Candid Photography, Cinematography, Drone, Album, Rates in Lakhs.'
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
          transcript = (groqJson.text || '').trim();
          console.log('[Groq Whisper Fallback Success]:', transcript);
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
    });
  } catch (err: any) {
    console.error('[Transcribe Audio Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Audio transcription failed' }, { status: 500 });
  }
}

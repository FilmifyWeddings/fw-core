import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 60s timeout for audio transcription

/**
 * Server-side AI Audio Transcription API Route (OpenAI Whisper + Groq Fallback)
 * Transcribes Indian languages (Hindi, Marathi, English, Hinglish, Gujarati)
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

    let transcript = '';

    // 1. PRIMARY: OpenAI Whisper API (whisper-1)
    if (openAiKey) {
      try {
        const whisperFormData = new FormData();
        const fileObj = new File([audioBuffer], 'recording.webm', {
          type: audioFile.type || 'audio/webm',
        });
        whisperFormData.append('file', fileObj);
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append(
          'prompt',
          'Wedding photography quotation details: Haldi, Mehendi, Sangeet, Wedding, Candid Photography, Cinematography, Drone, Album, Rates in Lakhs.'
        );

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
          body: whisperFormData,
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const json = await res.json();
          transcript = (json.text || '').trim();
          console.log('[OpenAI Whisper Success]:', transcript);
        } else {
          const errText = await res.text();
          console.warn('[OpenAI Whisper Error]:', res.status, errText);
        }
      } catch (e: any) {
        console.warn('[OpenAI Whisper Exception]:', e?.message || e);
      }
    }

    // 2. FALLBACK: Groq Whisper Large-v3-turbo (Zero latency & high accuracy if OpenAI credits exhausted)
    if (!transcript && groqKey) {
      try {
        const groqFormData = new FormData();
        const fileObj = new File([audioBuffer], 'recording.webm', {
          type: audioFile.type || 'audio/webm',
        });
        groqFormData.append('file', fileObj);
        groqFormData.append('model', 'whisper-large-v3-turbo');
        groqFormData.append('temperature', '0');
        groqFormData.append(
          'prompt',
          'Wedding photography quotation: Haldi, Mehendi, Sangeet, Wedding, Candid Photography, Cinematography, Drone, Album.'
        );

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: groqFormData,
          signal: AbortSignal.timeout(10000),
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
        error: 'Could not transcribe audio. Please ensure OpenAI credits are active or type your notes directly.',
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

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds timeout

/**
 * Server-side AI Voice Comment API Route
 * 1. Takes audio Blob from client FormData
 * 2. Transcribes multi-lingual audio (Hinglish/Hindi/Marathi/English) via OpenAI Whisper API
 * 3. Polishes & formats transcript using GPT-4o-mini tailored for Wedding Studio Quotations
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is missing in server environment variables.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided in request.' },
        { status: 400 }
      );
    }

    // Prepare FormData for OpenAI Whisper API
    const whisperFormData = new FormData();
    const fileBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type || 'audio/webm' });
    whisperFormData.append('file', fileBlob, 'voice_comment.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append(
      'prompt',
      'StudioCore Wedding Photography Quotation Client Notes. Supports Hinglish, Hindi, Marathi, English.'
    );

    // Call OpenAI Whisper API
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error('[Whisper API Error]:', errText);
      return NextResponse.json(
        { success: false, error: 'Audio transcription failed. Please try speaking again.' },
        { status: 500 }
      );
    }

    const whisperJson = await whisperRes.json();
    const rawTranscript = (whisperJson.text || '').trim();

    if (!rawTranscript) {
      return NextResponse.json(
        { success: false, error: 'No clear speech detected in recording. Please try again.' },
        { status: 400 }
      );
    }

    // Polish raw transcript using GPT-4o-mini
    const polishSystemPrompt = `You are StudioCore AI Voice Assistant for wedding photography studios.
Clean this raw voice transcript.
1. Fix Hindi, Hinglish, Marathi, and English spelling or grammar errors.
2. Format photography, event, and quotation terms cleanly (e.g., Haldi, Mehendi, Sangeet, Wedding, Pre-Wedding, Candid Photography, Cinematography, Drone, Album, Reels, Advance Payment, Deliverables, GST).
3. Keep the exact tone and intent of the user. Do NOT add conversational filler like "Here is your cleaned comment:".
4. Output ONLY the polished comment text string.`;

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: polishSystemPrompt },
          { role: 'user', content: rawTranscript },
        ],
        temperature: 0.3,
      }),
    });

    let cleanedComment = rawTranscript;
    if (chatRes.ok) {
      const chatJson = await chatRes.json();
      const content = chatJson.choices?.[0]?.message?.content?.trim();
      if (content) {
        // Strip quotes if wrapped
        cleanedComment = content.replace(/^["']|["']$/g, '');
      }
    }

    return NextResponse.json({
      success: true,
      rawTranscript,
      cleanedComment,
    });
  } catch (error: any) {
    console.error('[Voice Comment API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing voice comment.' },
      { status: 500 }
    );
  }
}

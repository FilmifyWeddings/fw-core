import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds timeout

/**
 * Server-side AI Voice Comment API Route
 * Step A: Audio Transcription via Groq Whisper Large-v3 (or OpenAI Whisper fallback)
 * Step B: Google Gemini 1.5 Flash (or GPT-4o-mini) Text Formatting & Polish
 */
export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let rawTranscript = '';
    let audioFile: Blob | File | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.rawText) rawTranscript = String(body.rawText).trim();
    } else {
      const formData = await req.formData();
      const directText = formData.get('rawText');
      if (directText) rawTranscript = String(directText).trim();
      audioFile = formData.get('audio') as Blob | File | null;
    }

    // If no direct text, transcribe audio file via Groq Whisper (or OpenAI fallback)
    if (!rawTranscript && audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();

      // Try Groq Whisper Large-v3
      if (groqKey) {
        try {
          const groqFormData = new FormData();
          const fileObj = new File([audioArrayBuffer], 'voice_recording.webm', {
            type: audioFile.type || 'audio/webm',
          });
          groqFormData.append('file', fileObj);
          groqFormData.append('model', 'whisper-large-v3');
          groqFormData.append(
            'prompt',
            'StudioCore Wedding Photography Client Notes. Supports Hinglish, Hindi, Marathi, and English.'
          );

          const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
            },
            body: groqFormData,
          });

          if (groqRes.ok) {
            const groqJson = await groqRes.json();
            rawTranscript = (groqJson.text || '').trim();
          } else {
            const errBody = await groqRes.text();
            console.warn('[Groq Whisper Error]:', errBody);
          }
        } catch (e) {
          console.warn('[Groq API Exception]:', e);
        }
      }

      // Fallback to OpenAI Whisper API
      if (!rawTranscript && openAiKey) {
        try {
          const whisperFormData = new FormData();
          const fileObj = new File([audioArrayBuffer], 'voice_comment.webm', {
            type: audioFile.type || 'audio/webm',
          });
          whisperFormData.append('file', fileObj);
          whisperFormData.append('model', 'whisper-1');

          const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openAiKey}`,
            },
            body: whisperFormData,
          });

          if (whisperRes.ok) {
            const whisperJson = await whisperRes.json();
            rawTranscript = (whisperJson.text || '').trim();
          }
        } catch (e) {
          console.warn('[OpenAI Whisper Exception]:', e);
        }
      }
    }

    if (!rawTranscript) {
      return NextResponse.json(
        { success: false, error: 'Could not transcribe speech. Please speak clearly and try again.' },
        { status: 400 }
      );
    }

    // Step B: Text Cleanup & Formatting via Google Gemini 1.5 Flash (or GPT-4o fallback)
    let cleanedComment = rawTranscript;
    const systemInstruction =
      'You are a professional wedding studio assistant. Clean up this raw voice transcript. Fix any Hinglish, Marathi, or Hindi phonetic typos, format wedding photography terms correctly, and return polished text for a quotation/lead comment.';

    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemInstruction}\n\nRaw Voice Transcript:\n"${rawTranscript}"\n\nReturn ONLY the clean polished text string:`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const gText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (gText) {
            cleanedComment = gText.replace(/^["']|["']$/g, '');
          }
        } else {
          const gErr = await geminiRes.text();
          console.warn('[Gemini 1.5 Flash Error]:', gErr);
        }
      } catch (e) {
        console.warn('[Gemini API Exception]:', e);
      }
    }

    // Fallback to OpenAI GPT-4o-mini
    if (cleanedComment === rawTranscript && openAiKey) {
      try {
        const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: rawTranscript },
            ],
            temperature: 0.2,
          }),
        });

        if (chatRes.ok) {
          const chatJson = await chatRes.json();
          const content = chatJson.choices?.[0]?.message?.content?.trim();
          if (content) {
            cleanedComment = content.replace(/^["']|["']$/g, '');
          }
        }
      } catch (e) {
        console.warn('[GPT-4o Fallback Exception]:', e);
      }
    }

    return NextResponse.json({
      success: true,
      text: cleanedComment,
      rawTranscript,
      cleanedComment,
    });
  } catch (error: any) {
    console.error('[Voice Comment Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing voice comment.' },
      { status: 500 }
    );
  }
}

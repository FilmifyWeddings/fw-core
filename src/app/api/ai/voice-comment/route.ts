import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minutes server execution timeout

/**
 * Server-side AI Voice Comment API Route
 * Dual-Engine Architecture:
 * 1. Primary: Direct Audio via Groq Whisper Large-v3 (or OpenAI Whisper)
 * 2. Fallback: Client-Captured Live Real-Time Speech Transcript
 * 3. Step B: Gemini 1.5 Flash (or GPT-4o-mini) Text Polishing & Script Matching
 */
export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let rawTranscript = '';
    let liveFallbackText = '';
    let audioFile: Blob | File | null = null;
    let outputFormat: 'auto' | 'hinglish' | 'native' | 'english' = 'auto';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.rawText) rawTranscript = String(body.rawText).trim();
      if (body.liveText) liveFallbackText = String(body.liveText).trim();
      if (body.outputFormat) outputFormat = body.outputFormat;
    } else {
      const formData = await req.formData();
      const directText = formData.get('rawText');
      if (directText) rawTranscript = String(directText).trim();

      const liveTextVal = formData.get('liveText');
      if (liveTextVal) liveFallbackText = String(liveTextVal).trim();

      audioFile = formData.get('audio') as Blob | File | null;

      const formatVal = formData.get('outputFormat');
      if (formatVal && ['auto', 'hinglish', 'native', 'english'].includes(String(formatVal))) {
        outputFormat = formatVal as any;
      }
    }

    // Step A: Transcribe Audio via Groq Whisper Large-v3
    if (!rawTranscript && audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();

      if (audioArrayBuffer && audioArrayBuffer.byteLength > 500) {
        // 1. Try Groq Whisper Large-v3
        if (groqKey) {
          try {
            const groqFormData = new FormData();
            const fileObj = new File([audioArrayBuffer], 'voice_note.webm', {
              type: audioFile.type || 'audio/webm',
            });
            groqFormData.append('file', fileObj);
            groqFormData.append('model', 'whisper-large-v3');
            groqFormData.append('temperature', '0');
            groqFormData.append(
              'prompt',
              'StudioCore Wedding Photography Client Notes in Marathi, Hindi, Hinglish, Gujarati, Bengali, Tamil, Telugu, and English.'
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
              console.log('[Groq Whisper Large-v3 Result]:', rawTranscript);
            } else {
              const errBody = await groqRes.text();
              console.warn('[Groq Whisper Error Body]:', errBody);
            }
          } catch (e) {
            console.warn('[Groq Whisper Exception]:', e);
          }
        }

        // 2. Fallback to OpenAI Whisper API
        if (!rawTranscript && openAiKey) {
          try {
            const whisperFormData = new FormData();
            const fileObj = new File([audioArrayBuffer], 'voice_note.webm', {
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
              console.log('[OpenAI Whisper Result]:', rawTranscript);
            }
          } catch (e) {
            console.warn('[OpenAI Whisper Exception]:', e);
          }
        }
      }
    }

    // 3. Fallback to client-side real-time transcript if whisper did not return
    if (!rawTranscript && liveFallbackText) {
      rawTranscript = liveFallbackText;
      console.log('[Using Live WebSpeech Fallback]:', rawTranscript);
    }

    if (!rawTranscript) {
      return NextResponse.json(
        { success: false, error: 'No speech detected. Please speak clearly into your mic and try again.' },
        { status: 400 }
      );
    }

    // Step B: Text Cleanup & Formatting via Google Gemini 1.5 Flash (or GPT-4o fallback)
    let cleanedComment = rawTranscript;

    let formatGuideline = '';
    if (outputFormat === 'hinglish') {
      formatGuideline = `OUTPUT SCRIPT RULE: Output in clean, natural HINGLISH or MARATHISH using English/Latin alphabet (e.g. "Client ne bola ki Haldi aur Sangeet ke photos 7 days me chahiye"). Do NOT use Devanagari script.`;
    } else if (outputFormat === 'native') {
      formatGuideline = `OUTPUT SCRIPT RULE: Output in authentic Indian Script (Devanagari for Hindi/Marathi, e.g. "लग्नाचे आणि रिसेप्शनचे फोटो वेळेवर द्यावे" or "क्लाइंट ने टोकन अमाउंट दे दिया है"). Preserve the exact native language script.`;
    } else if (outputFormat === 'english') {
      formatGuideline = `OUTPUT SCRIPT RULE: Translate and output in clean, professional ENGLISH text (e.g. "The client requested delivery of wedding and reception photos on time").`;
    } else {
      // auto
      formatGuideline = `OUTPUT SCRIPT RULE: Preserve the user's natural spoken language and script. If spoken in Hindi/Marathi script or Hinglish, clean grammar and punctuation while keeping the original language style.`;
    }

    const systemInstruction = `You are an elite StudioCore AI voice assistant for wedding photography studios.
Clean up and format this raw voice transcript into a polished quotation/lead comment.

${formatGuideline}

TERMINOLOGY & POLISHING RULES:
1. Fix any phonetic slips, stutters, and background noise typos.
2. Standardize wedding photography terms (Haldi, Mehendi, Sangeet, Wedding, Pre-Wedding, Candid Photography, Traditional Video, Cinematography, Drone Operator, Teaser Film, 2 Albums, Advance Token Amount, GST, Deliverables).
3. Return ONLY the final polished comment text. Do NOT wrap in quotes, do NOT add conversational filler like "Here is your note:".`;

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
                temperature: 0.15,
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
            temperature: 0.15,
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
      outputFormat,
    });
  } catch (error: any) {
    console.error('[Voice Comment Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing voice comment.' },
      { status: 500 }
    );
  }
}

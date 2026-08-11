import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minutes server execution timeout

/**
 * Server-side AI Voice Comment API Route
 * Multi-Lingual Architecture with Indian Regional Languages:
 * Supports: Marathi, Marathish (Eng), Hindi, Hinglish, English, Gujarati, Punjabi, Bengali, Tamil, Telugu, Kannada, Malayalam
 */
export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let rawTranscript = '';
    let liveFallbackText = '';
    let audioFile: Blob | File | null = null;
    let selectedLanguage = 'mr-IN'; // default to Marathi or user choice
    let outputFormat: 'auto' | 'hinglish' | 'native' | 'english' = 'auto';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body.rawText) rawTranscript = String(body.rawText).trim();
      if (body.liveText) liveFallbackText = String(body.liveText).trim();
      if (body.selectedLanguage) selectedLanguage = String(body.selectedLanguage);
      if (body.outputFormat) outputFormat = body.outputFormat;
    } else {
      const formData = await req.formData();
      const directText = formData.get('rawText');
      if (directText) rawTranscript = String(directText).trim();

      const liveTextVal = formData.get('liveText');
      if (liveTextVal) liveFallbackText = String(liveTextVal).trim();

      const langVal = formData.get('selectedLanguage');
      if (langVal) selectedLanguage = String(langVal);

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

            // Pass language hint if available
            const whisperLangMap: Record<string, string> = {
              'mr-IN': 'mr',
              'mr-ENG': 'mr',
              'hi-IN': 'hi',
              'hi-ENG': 'hi',
              'en-IN': 'en',
              'gu-IN': 'gu',
              'pa-IN': 'pa',
              'bn-IN': 'bn',
              'ta-IN': 'ta',
              'te-IN': 'te',
              'kn-IN': 'kn',
              'ml-IN': 'ml',
            };

            const whisperCode = whisperLangMap[selectedLanguage];
            if (whisperCode && whisperCode !== 'en') {
              groqFormData.append('language', whisperCode);
            }

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

    let languageRule = '';
    if (selectedLanguage === 'mr-IN') {
      languageRule = `TARGET LANGUAGE: Authentic MARATHI (मराठी) in pure Devanagari script.
Examples: "क्लायंटने सांगितले की हळद आणि संगीताचे फोटो वेळेवर द्यावे.", "टोकन रक्कम ₹५०,००० जमा झाली आहे."`;
    } else if (selectedLanguage === 'mr-ENG') {
      languageRule = `TARGET LANGUAGE: MARATHISH (Marathi written in English ABC Latin script).
Examples: "Client ne sangitle ki Haldi aani Sangeet che photos time var dya.", "Token amount 50,000 receive zali aahe."`;
    } else if (selectedLanguage === 'hi-IN') {
      languageRule = `TARGET LANGUAGE: Authentic HINDI (हिंदी) in pure Devanagari script.
Examples: "क्लाइंट ने कहा कि हल्दी और संगीत के फोटो समय पर दें.", "टोकन अमाउंट ₹50,000 प्राप्त हो गया है."`;
    } else if (selectedLanguage === 'hi-ENG') {
      languageRule = `TARGET LANGUAGE: HINGLISH (Hindi written in English ABC Latin script).
Examples: "Client ne bola ki Haldi aur Sangeet ke photos 7 days me chahiye.", "Token amount 50,000 received ho gaya hai."`;
    } else if (selectedLanguage === 'en-IN') {
      languageRule = `TARGET LANGUAGE: Clean, professional ENGLISH.
Examples: "Client requested delivery of Haldi and Sangeet photos within 7 days.", "Advance token of 50,000 received."`;
    } else if (selectedLanguage === 'gu-IN') {
      languageRule = `TARGET LANGUAGE: Authentic GUJARATI (ગુજરાતી) in native Gujarati script.`;
    } else if (selectedLanguage === 'pa-IN') {
      languageRule = `TARGET LANGUAGE: Authentic PUNJABI (ਪੰਜਾਬੀ) in Gurmukhi script.`;
    } else if (selectedLanguage === 'bn-IN') {
      languageRule = `TARGET LANGUAGE: Authentic BENGALI (বাংলা) in Bengali script.`;
    } else if (selectedLanguage === 'ta-IN') {
      languageRule = `TARGET LANGUAGE: Authentic TAMIL (தமிழ்) in Tamil script.`;
    } else if (selectedLanguage === 'te-IN') {
      languageRule = `TARGET LANGUAGE: Authentic TELUGU (తెలుగు) in Telugu script.`;
    } else if (selectedLanguage === 'kn-IN') {
      languageRule = `TARGET LANGUAGE: Authentic KANNADA (ಕನ್ನಡ) in Kannada script.`;
    } else if (selectedLanguage === 'ml-IN') {
      languageRule = `TARGET LANGUAGE: Authentic MALAYALAM (മലയാളം) in Malayalam script.`;
    } else {
      languageRule = `TARGET LANGUAGE: Preserve the exact spoken language and script cleanly.`;
    }

    const systemInstruction = `You are an elite StudioCore AI voice assistant for wedding photography studios.
Clean up and format this raw voice transcript into a polished quotation/lead comment.

${languageRule}

TERMINOLOGY & POLISHING RULES:
1. Fix any phonetic slips, background noise glitches, or stutters.
2. Standardize wedding photography terms (Haldi, Mehendi, Sangeet, Wedding, Pre-Wedding, Candid Photography, Cinematography, Drone, Album, Teaser, Deliverables, Token Advance, GST).
3. Return ONLY the final polished comment text. Do NOT wrap in quotes, do NOT add introductory conversational filler like "Here is your text:".`;

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
                temperature: 0.1,
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
            temperature: 0.1,
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
      selectedLanguage,
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

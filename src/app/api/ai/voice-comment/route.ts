import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 2 minutes server execution timeout

/**
 * Server-side Google Gemini AI Voice Comment API Route
 * Multi-Lingual Architecture with Indian Regional Languages:
 * Supports: Marathi, Marathish (Eng), Hindi, Hinglish, English, Gujarati, Punjabi, Bengali, Tamil, Telugu, Kannada, Malayalam
 */
export async function POST(req: NextRequest) {
  try {
    const geminiKeys = (process.env.GEMINI_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

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

    // Step A: Transcribe Audio 100% via Google Gemini Multimodal Audio AI
    if (!rawTranscript && audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();

      if (audioArrayBuffer && audioArrayBuffer.byteLength > 500 && geminiKeys.length > 0) {
        const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');
        const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const geminiKey of geminiKeys) {
          if (rawTranscript) break;
          for (const model of candidateModels) {
            if (rawTranscript) break;
            try {
              const generationConfig: Record<string, any> = {
                temperature: 0,
                maxOutputTokens: 1500,
              };
              if (model.startsWith('gemini-3')) {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }

              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiKey,
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          { text: 'Accurately transcribe this voice recording verbatim. Output ONLY the words spoken.' },
                          {
                            inlineData: {
                              mimeType: audioFile.type || 'audio/webm',
                              data: base64Audio,
                            },
                          },
                        ],
                      },
                    ],
                    generationConfig,
                  }),
                  signal: AbortSignal.timeout(20000),
                }
              );
              if (geminiRes.ok) {
                const geminiJson = await geminiRes.json();
                const parts = geminiJson.candidates?.[0]?.content?.parts || [];
                const t = parts
                  .filter((p: any) => !p?.thought && typeof p?.text === 'string')
                  .map((p: any) => p.text)
                  .join('')
                  .trim();
                if (t) {
                  rawTranscript = t;
                  break;
                }
              }
            } catch (e) {
              console.warn(`[Gemini ${model} Voice Comment Transcribe Exception]:`, e);
            }
          }
        }
      }
    }

    // Fallback to client-side real-time WebSpeech transcript if audio AI returned empty
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

    // Step B: Text Cleanup & Formatting via Google Gemini
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

    if (geminiKeys.length > 0) {
      const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let updated = false;
      for (const geminiKey of geminiKeys) {
        if (updated) break;
        for (const model of candidateModels) {
          try {
            const generationConfig: Record<string, any> = {
              temperature: 0.1,
            };
            if (model.startsWith('gemini-3')) {
              generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': geminiKey,
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
                  generationConfig,
                }),
                signal: AbortSignal.timeout(15000),
              }
            );

            if (geminiRes.ok) {
              const geminiJson = await geminiRes.json();
              const parts = geminiJson.candidates?.[0]?.content?.parts || [];
              const gText = parts
                .filter((p: any) => !p?.thought && typeof p?.text === 'string')
                .map((p: any) => p.text)
                .join('')
                .trim();
              if (gText) {
                cleanedComment = gText.replace(/^["']|["']$/g, '');
                updated = true;
                break;
              }
            } else {
              const gErr = await geminiRes.text();
              console.warn(`[Gemini ${model} Error]:`, gErr.slice(0, 150));
            }
          } catch (e) {
            console.warn(`[Gemini ${model} Exception]:`, e);
          }
        }
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

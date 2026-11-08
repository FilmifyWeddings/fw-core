import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript } from '@/lib/speech-text-cleaner';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 30; // 30 seconds server execution timeout

/**
 * High-Speed AI Voice Polish & Intent Replacement Route (ChatGPT Manager)
 * Primary Engine: OpenAI GPT-4o-mini (Tier 1 Ultra-Low-Latency, Superior Multilingual Hindi/Hinglish/Marathi & Math)
 * Secondary Engine: Google Gemini (gemini-flash-latest)
 * Tertiary Fallback: Instant Rule-Based Cleaner
 *
 * Analyzes raw spoken audio transcript from microphone, understands user true intent,
 * fixes speech-to-text recognition errors, stutters, and phonetic slips,
 * applies Studio AI Training rules and Voice Trigger Shortcuts,
 * performs mathematical calculations, and formats couple names, ceremonies, crew, budget,
 * and deliverables cleanly for instant text-area replacement.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = String(body.rawText || body.text || '').trim();
    const leadName = String(body.leadName || '').trim();
    const workspaceId = String(body.workspaceId || '').trim();
    let studioSettings = body.studioSettings || null;

    if (!rawText) {
      return NextResponse.json({ success: false, error: 'No text provided to polish' }, { status: 400 });
    }

    // 1. Fetch Studio Quotation Settings & Shortcuts if not provided
    if (!studioSettings && workspaceId) {
      try {
        const { data: row } = await supabaseAdmin
          .from('workspace_quotation_settings')
          .select('settings')
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        if (row?.settings && typeof row.settings === 'object') {
          studioSettings = row.settings;
        }
      } catch (e) {
        console.warn('[Polish Speech] Could not fetch workspace_quotation_settings:', e);
      }
    }

    const shortcuts: any[] = Array.isArray(studioSettings?.aiRules?.shortcuts) 
      ? studioSettings.aiRules.shortcuts 
      : [];
    const customInstructions = studioSettings?.aiRules?.customInstructions || '';
    const shortcutsContext = shortcuts.length > 0 
      ? shortcuts.map((s: any) => `- Trigger: "${s.trigger}" ${s.description ? `(${s.description})` : ''} -> Crew: ${JSON.stringify(s.mappedCrew || [])}, Deliverables: ${JSON.stringify(s.mappedDeliverables || [])}, Price: ${s.mappedPrice || 'N/A'}`).join('\n')
      : 'None';

    // 2. Client-side heuristic baseline (instant fallback)
    const baseCleaned = cleanVoiceTranscript(rawText, leadName);

    const systemInstruction = `You are the AI Speech Transcriber & Polish Assistant for StudioCore wedding photography and cinematography studios.
The studio owner or sales manager just recorded voice notes into their microphone in Hindi, Hinglish, Marathi, or English.

YOUR MISSION:
Output the complete, accurate, and clean transcript of EVERYTHING the user said.
Fix speech-to-text recognition errors, stutters, and phonetic slips while faithfully preserving 100% of the user's spoken words, sentences, requests, notes, and instructions.

ABSOLUTE MANDATES:
1. PRESERVE ALL SPOKEN CONTENT (DO NOT TRUNCATE OR SUMMARIZE):
   - You MUST include every ceremony, detail, requirement, client comment, crew detail, date, and budget mentioned.
   - NEVER drop or omit any spoken sentence. The text must NOT be incomplete ("aadha-adhura").
   - STRICT: DO NOT structure the text into rigid bullet templates like "Couple: ... / Location: ... / Events: ... / Pricing: ...".
   - Keep the natural sentence and paragraph structure of the user's speech. If the user spoke in sentences, keep the sentences.

2. PHONETIC & TECHNICAL TERM CORRECTIONS (HINDI / HINGLISH / MARATHI / ENGLISH):
   - Fix camera & crew terms:
     * "कैंडिडेट" / "कैंडिड फोटो" / "कैंडिड" -> "Candid Photographer"
     * "सिनेमा" / "सिनेमैटिक" / "सिनेमैटोग्राफी" -> "Cinematographer"
     * "ड्रोन" / "ड्रोन पायलट" -> "Drone Pilot"
     * "ट्रैडिशनल" / "ट्रेडिशनल वीडियो" -> "Traditional Videographer"
     * "ट्रेडिशनल फोटो" -> "Traditional Photographer"
     * "सेमी सिनेमैटिक" -> "Semi-Cinematic"
   - Fix ceremony names:
     * "हल्दी" / "हळद" -> "Haldi"
     * "संगीत" -> "Sangeet"
     * "शादी" / "लग्न" / "फेरे" -> "Wedding"
     * "रिसेप्शन" -> "Reception"
     * "मेहंदी" -> "Mehendi"
     * "सगाई" / "रिंग सेरेमनी" / "साखरपुडा" / "रोका" -> "Ring Ceremony"
   - Clean up deliverable terms:
     * "ऑल डिलीवरी" / "ऑल डिलीवरेबल्स" / "सभी डिलीवरी" -> "All Deliverables Add"
     * "रील" / "रील्स" -> "Reels"
     * "फोटोबुक" / "एल्बम" -> "Photobook / Album"
   - Format numbers & prices into clean Indian currency:
     * "2 लाख" / "दो लाख" -> "₹2,00,000"
     * "ढाई लाख" / "2.5 lakh" -> "₹2,50,000"
     * "डेढ़ लाख" / "1.5 lakh" -> "₹1,50,000"
     * "50 हजार" / "पचास हजार" -> "₹50,000"
     * "25k" -> "₹25,000"
     * "35k" -> "₹35,000"
     * "70k" -> "₹70,000"
   - Clean up couple and client names into Title Case English (e.g. "रोहन और सिमरन" -> "Rohan & Simran", "अथर्व और साक्षी" -> "Atharva & Sakshi", "राहुल और नेहा" -> "Rahul & Neha").
   ${leadName ? `- If user mentions a specific couple name in the speech, prioritize the SPOKEN couple name over the lead name "${leadName}".` : ''}

3. CLEANUP STUTTERS & FILLERS NATURALLY:
   - Remove acoustic glitches, repetitive stutters (e.g. "हां हां वो वो", "uh", "um"), and speech-to-text artifacts without altering the actual meaning or removing any requirements.

4. STUDIO AI TRAINING SHORTCUTS TO RECOGNIZE & EXPAND IF MENTIONED:
${shortcutsContext}
${customInstructions ? `\nSTUDIO CUSTOM RULES:\n${customInstructions}` : ''}

5. OUTPUT RULES:
   - Output ONLY the clean, clear polished text.
   - Do NOT add any preamble like "Here is your polished transcript:", explanations, options, or markdown fences (\`\`\`).
   - Plain text only.`;

    // 3. EXCLUSIVE ENGINE: Google Gemini (Tier 1 Paid Plan with gemini-3.8-flash, gemini-flash-latest & gemini-2.5-flash)
    const rawGeminiKeys = (process.env.GEMINI_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (rawGeminiKeys.length > 0) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
      for (const geminiKey of rawGeminiKeys) {
        for (const model of candidateModels) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const res = await fetch(geminiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: systemInstruction },
                      { text: `Raw Voice Input:\n"${rawText}"\n\nClean Finished Replacement Text:` }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 2000
                }
              }),
              signal: AbortSignal.timeout(22000)
            });

            if (res.ok) {
              const geminiJson = await res.json();
              const polishedText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (polishedText && polishedText.length > 5) {
                const cleanResult = polishedText.replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();
                return NextResponse.json({
                  success: true,
                  polishedText: cleanResult,
                  engine: `gemini-${model}`
                });
              }
            } else {
              const errBody = await res.text().catch(() => '');
              console.warn(`[Polish Speech] Gemini ${model} error (${res.status}):`, errBody.slice(0, 150));
            }
          } catch (geminiErr: any) {
            console.warn(`[Polish Speech] Gemini ${model} exception:`, geminiErr?.message || geminiErr);
          }
        }
      }
    }

    // 5. Graceful Fallback: Return rule-based cleaned transcript
    return NextResponse.json({
      success: true,
      polishedText: baseCleaned,
      engine: 'heuristic-cleaner'
    });
  } catch (error: any) {
    console.error('[Polish Speech Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to polish speech' }, { status: 500 });
  }
}

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

    const systemInstruction = `You are StudioCore Google Gemini AI Quotation Voice Finisher (just like Google Gemini / Antigravity voice assistant) for a premier wedding photography and cinematography studio.
The studio owner or sales manager just spoke voice notes into their microphone in Hindi, Hinglish, Marathi, or English.
Analyze the raw speech transcript, understand the user's true intent, fix any speech-to-text transcription errors, phonetic slips, stutters, and grammatical mistakes (e.g. "कैंडिडेट" / "कैंडिड" -> "Candid Photographer", "सिनेमा" -> "Cinematographer", "ड्रोन" -> "Drone Pilot", "ट्रैडिशनल" -> "Traditional Videographer/Photographer", "ऑल डिलीवरी बस" -> "All Deliverables Add", "डेढ़ लाख" -> "₹1,50,000", numbers to currency, Hindi/Marathi dates).

STUDIO AI TRAINING SHORTCUTS TO RECOGNIZE & ACCURATELY EXPAND:
${shortcutsContext}

${customInstructions ? `STUDIO AI TRAINING CUSTOM RULES & TONE:\n${customInstructions}` : ''}

CRITICAL MANDATES (GEMINI / ANTIGRAVITY FINISHING FIDELITY):
1. ACCURATE COUPLE NAME DETECTION:
   - Identify Groom and Bride names accurately from the voice transcript (e.g. "राहुल और नेहा" -> "Rahul & Neha", "रोहित और अंजलि" -> "Rohit & Anjali").
   - Format: "Couple: [Groom] & [Bride]" (e.g. "Couple: Rahul & Neha").
   ${leadName ? `- Note: The CRM lead contact name is "${leadName}", but if the spoken notes mention a specific couple name, strictly prioritize the SPOKEN couple name!` : ''}

2. INTELLIGENT MATHEMATICAL PRICING & METHOD CALCULATION (GEMINI 3.8 FLASH PRECISION):
   - When user mentions pricing, per-day rates, multi-day shoots, discounts, or payment milestones, EVALUATE THE MATH METHOD ACCURATELY:
     * Multiplications: "35000 per day for 2 days" -> ₹70,000.
     * Additions: "Haldi 25k, Sangeet 35k, Wedding 70k" -> ₹1,30,000 total.
     * Denominations: "2.5 lakh" / "ढाई लाख" = ₹2,50,000; "डेढ़ लाख" = ₹1,50,000; "25k" = ₹25,000.
     * Discounts: "₹25,000 discount" -> Net Total = Base Price - Discount.
     * Net Total: Calculate Net Investment = Base Price - Discount + Travel/Extras.
     * Payment Terms Milestones: If percentages are mentioned (e.g. 25% token advance, 50% event day, 25% delivery), CALCULATE the exact rupee amount for EACH milestone based on Net Investment!

3. ZERO PLACEHOLDER & FAKE BRACKET MANDATE:
   - Format what was ACTUALLY spoken into clean, clear, natural lines covering:
     * Couple: Groom & Bride (if mentioned)
     * Location: City / Venue (if mentioned)
     * Events & Dates: list of ceremonies with date, venue, and crew (only those actually spoken)
     * Deliverables: ONLY list deliverables if explicitly mentioned by user (e.g. Traditional Video, Cinematic Teaser, 2 Photobooks).
     * Pricing / Budget: Base package, discount, net amount (with evaluated math)
     * Payment Milestones: (only if payment terms or token advance were mentioned)
   - STRICT: NEVER output robotic fake bracket placeholders like "[Deliverable 1]", "[Deliverable 2]", "[Time/Slot]", "[Venue/City]", or "(To be specified)". If the user did NOT mention something, DO NOT include that line or section!
   - Finish and clean the user's speech naturally and fluently, exactly as they intended.

4. RETURN ONLY the polished, finished replacement text that will directly replace the user's text in the text box.
5. Do NOT output conversational filler (e.g. "Here is your polished quotation:"), options (no "Option 1 / Option 2"), explanations, or markdown code blocks (\`\`\`). Output plain clean text only.`;

    // 3. EXCLUSIVE ENGINE: Google Gemini (Tier 1 Paid Plan with gemini-3.8-flash & gemini-flash-latest)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
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
            signal: AbortSignal.timeout(12000)
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

import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript } from '@/lib/speech-text-cleaner';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 30; // 30 seconds server execution timeout

/**
 * High-Speed AI Voice Polish & Intent Replacement Route
 * Uses Google Gemini 3.8 Flash (Tier 1 low-latency) with fallback to instant rule-based cleaner.
 * Analyzes raw spoken text from microphone, understands user true intent,
 * fixes speech-to-text recognition errors, stutters, and phonetic slips,
 * and formats couple names, ceremonies, crew, budget, and deliverables cleanly.
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
      ? shortcuts.map((s: any) => `- Trigger: "${s.trigger}" ${s.description ? `(${s.description})` : ''}`).join('\n')
      : 'None';

    // 2. Client-side heuristic baseline (instant fallback)
    const baseCleaned = cleanVoiceTranscript(rawText, leadName);

    // 3. Google Gemini 3.8 Flash Engine
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const systemInstruction = `You are StudioCore AI Voice Intelligence for a professional wedding photography studio.
The user just spoke voice notes into their microphone. Analyze the raw speech transcript, understand the user's true intent, fix any speech-to-text transcription errors, phonetic slips, stutters, and grammatical mistakes (e.g. "कैंडिडेट" -> "Candid Photographer", "ऑल डिलीवरी बस" -> "All Deliverables Add", "डेढ़ लाख" -> "₹1,50,000", numbers to currency, Hindi/Marathi dates).

STUDIO SHORTCUTS TO RECOGNIZE & ACCURATELY PRESERVE:
${shortcutsContext}
${customInstructions ? `STUDIO TRAINING RULES:\n${customInstructions}` : ''}

CRITICAL MANDATES:
1. Understand the real intent of what the user is trying to say.
2. INTELLIGENT MATHEMATICAL PRICING & METHOD CALCULATION (LIKE GEMINI & CHATGPT):
   - When the user mentions pricing, per-day rates, multi-day shoots, discounts, or payment milestones, YOU MUST EVALUATE THE MATH METHOD ACCURATELY:
     * Multiplications: e.g. "35000 per day for 2 days" -> Calculate ₹70,000.
     * Additions: e.g. "Haldi 25k, Sangeet 35k, Wedding 70k" -> Calculate ₹1,30,000 total.
     * Denominations: "2.5 lakh" / "ढाई लाख" = ₹2,50,000; "डेढ़ लाख" = ₹1,50,000; "25k" = ₹25,000.
     * Discounts: e.g. "₹25,000 discount" or "10% discount on ₹2,000,000" -> ₹20,000 discount.
     * Net Total: Calculate Net Investment = Base Price - Discount + Travel/Extras.
     * Payment Terms Milestones: If percentages are given (e.g. 30% advance, 50% event day, 20% delivery), CALCULATE the exact rupee amount for EACH milestone based on Net Investment!
3. Structure the notes cleanly:
   - Couple: [Groom] & [Bride] (e.g. "Couple: Rahul & Pooja")
   - Dates & Functions: e.g. "18 - Nov - 2026: Haldi + Sangeet", "19 - Nov - 2026: Wedding Ceremony"
   - Crew requirements: e.g. "2 Candid Photographers, 2 Cinematographers, 1 Drone Pilot"
   - Pricing Method & Breakdown:
     * Base Package: ₹... (e.g. ₹35,000/day x 2 days = ₹70,000 + Album ₹20,000 = ₹90,000)
     * Discount: ₹...
     * Travel / Extra Charges: ₹...
     * Net Total Investment: ₹...
     * Payment Terms: 30% Advance Token (₹...), 50% On Event Day (₹...), 20% On Final Delivery (₹...)
   - Deliverables: e.g. "All Deliverables Add"
4. Return ONLY the polished, structured replacement text that will directly replace the user's text in the text box.
5. Do NOT output conversational filler, introductory remarks (like "Here is the polished text:"), or markdown code blocks (\`\`\`). Return ONLY the replacement text.`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemInstruction },
                  { text: `Raw Voice Input:\n"${rawText}"\n\nCleaned & Formatted Replacement Text:` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 600
            }
          }),
          signal: AbortSignal.timeout(6000) // 6s fast timeout
        });

        if (res.ok) {
          const geminiJson = await res.json();
          const polishedText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (polishedText && polishedText.length > 5) {
            // Strip any wrapping quotes or backticks if present
            const cleanResult = polishedText.replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();
            return NextResponse.json({
              success: true,
              polishedText: cleanResult,
              engine: 'gemini-3.8-flash'
            });
          }
        } else {
          const errText = await res.text().catch(() => '');
          console.warn('[Polish Speech] Gemini 3.8 Flash returned error:', res.status, errText.slice(0, 150));
        }
      } catch (geminiErr: any) {
        console.warn('[Polish Speech] Gemini call exception:', geminiErr?.message || geminiErr);
      }
    }

    // 4. Graceful Fallback: Return rule-based cleaned transcript
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

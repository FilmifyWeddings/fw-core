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

    const systemInstruction = `You are StudioCore ChatGPT Quotation Manager for a premier wedding photography and cinematography studio.
The studio owner or sales manager just spoke voice notes into their microphone in Hindi, Hinglish, Marathi, or English.
Analyze the raw speech transcript, understand the user's true intent, fix any speech-to-text transcription errors, phonetic slips, stutters, and grammatical mistakes (e.g. "कैंडिडेट" / "कैंडिड" -> "Candid Photographer", "सिनेमा" -> "Cinematographer", "ड्रोन" -> "Drone Pilot", "ट्रैडिशनल" -> "Traditional Videographer/Photographer", "ऑल डिलीवरी बस" -> "All Deliverables Add", "डेढ़ लाख" -> "₹1,50,000", numbers to currency, Hindi/Marathi dates).

STUDIO AI TRAINING SHORTCUTS TO RECOGNIZE & ACCURATELY EXPAND:
${shortcutsContext}

${customInstructions ? `STUDIO AI TRAINING CUSTOM RULES & TONE:\n${customInstructions}` : ''}

CRITICAL MANDATES:
1. ACCURATE COUPLE NAME DETECTION:
   - Identify the Groom and Bride names accurately from the voice transcript (e.g. "राहुल और नेहा" -> "Rahul & Neha", "रोहित और अंजलि" -> "Rohit & Anjali").
   - If user explicitly mentions a couple name, format it clearly as: "Couple: [Groom] & [Bride]".
   ${leadName ? `- Note: The CRM lead contact name is "${leadName}", but if the spoken notes mention a different groom/bride or specific couple name, prioritize the SPOKEN couple name!` : ''}

2. INTELLIGENT MATHEMATICAL PRICING & METHOD CALCULATION (CHATGPT MANAGER PRECISION):
   - When the user mentions pricing, per-day rates, multi-day shoots, discounts, or payment milestones, YOU MUST EVALUATE THE MATH METHOD ACCURATELY:
     * Multiplications: e.g. "35000 per day for 2 days" -> Calculate ₹70,000.
     * Additions: e.g. "Haldi 25k, Sangeet 35k, Wedding 70k" -> Calculate ₹1,30,000 total.
     * Denominations: "2.5 lakh" / "ढाई लाख" = ₹2,50,000; "डेढ़ लाख" = ₹1,50,000; "25k" = ₹25,000.
     * Discounts: e.g. "₹25,000 discount" -> Net Total = Base Price - Discount.
     * Net Total: Calculate Net Investment = Base Price - Discount + Travel/Extras.
     * Payment Terms Milestones: If percentages are mentioned (e.g. 30% advance, 50% event day, 20% delivery), CALCULATE the exact rupee amount for EACH milestone based on Net Investment!

3. STRUCTURE THE NOTES CLEANLY FOR 1-CLICK QUOTATION CONVERSION:
   Couple: [Groom] & [Bride]
   Dates & Functions:
   - [DD - Mon - YYYY] [Function Name]: [Venue/City], [Time/Slot]
   Crew Requirements:
   - [Count] [Role Name] (e.g. 2 Candid Photographers, 2 Cinematographers, 1 Drone Pilot)
   Deliverables:
   - [Deliverable 1]
   - [Deliverable 2]
   Pricing & Math Breakdown:
   - Base Package: ₹...
   - Discount: ₹...
   - Net Total Investment: ₹...
   Payment Terms:
   - [X]% Booking Token: ₹...
   - [Y]% On Event Day: ₹...
   - [Z]% On Final Delivery: ₹...
   Special Notes:
   - [Any special instructions, terms, or notes mentioned]

4. RETURN ONLY the polished, structured replacement text that will directly replace the user's text in the text box.
5. Do NOT output conversational filler (e.g. "Here is your polished quotation:"), explanations, or markdown code blocks (\`\`\`). Output plain text only.`;

    // 3. PRIMARY ENGINE: Google Gemini (Tier 1 Paid Plan with gemini-3.8-flash Priority)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
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
                maxOutputTokens: 800
              }
            }),
            signal: AbortSignal.timeout(10000)
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
          }
        } catch (geminiErr: any) {
          console.warn(`[Polish Speech] Gemini ${model} exception:`, geminiErr?.message || geminiErr);
        }
      }
    }

    // 4. SECONDARY ENGINE: OpenAI GPT-4o-mini Fallback
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `Raw Spoken Audio Transcript:\n"${rawText}"\n\nCleaned & Formatted Specification:` }
            ],
            temperature: 0.1,
            max_tokens: 800
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (res.ok) {
          const json = await res.json();
          const polishedText = json.choices?.[0]?.message?.content?.trim();
          if (polishedText && polishedText.length > 5) {
            const cleanResult = polishedText.replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();
            return NextResponse.json({
              success: true,
              polishedText: cleanResult,
              engine: 'chatgpt-gpt-4o-mini'
            });
          }
        }
      } catch (openAiErr: any) {
        console.warn('[Polish Speech] OpenAI fallback exception:', openAiErr?.message || openAiErr);
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

import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript } from '@/lib/speech-text-cleaner';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_EVENT_TYPES, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

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

    // 1. Fetch Studio Quotation Settings, Event Types & Crew Roles if not provided
    const candidateWsIds = Array.from(new Set([
      body.userId,
      body.ownerId,
      workspaceId
    ].filter(Boolean)));

    if (candidateWsIds.length === 0) {
      try {
        const { data: prof } = await supabaseAdmin.from('profiles').select('id, workspace_id').limit(1).maybeSingle();
        if (prof?.id) candidateWsIds.push(prof.id);
        if (prof?.workspace_id) candidateWsIds.push(prof.workspace_id);
      } catch (_) {}
    }

    if (!studioSettings || !studioSettings.aiRules) {
      try {
        for (const cWsId of candidateWsIds) {
          const { data: row } = await supabaseAdmin
            .from('workspace_quotation_settings')
            .select('settings')
            .eq('workspace_id', cWsId)
            .maybeSingle();
          if (row?.settings && typeof row.settings === 'object') {
            studioSettings = row.settings;
            break;
          }
        }
      } catch (e) {
        console.warn('[Polish Speech] Could not fetch workspace_quotation_settings:', e);
      }
    }

    let studioEventTypes: any[] = [];
    if (Array.isArray(body.studioEventTypes) && body.studioEventTypes.length > 0) {
      studioEventTypes = body.studioEventTypes;
    } else {
      try {
        for (const cWsId of candidateWsIds) {
          const { data: evRows } = await supabaseAdmin
            .from('workspace_event_types')
            .select('name, category, display_order')
            .eq('workspace_id', cWsId)
            .order('display_order', { ascending: true });
          if (Array.isArray(evRows) && evRows.length > 0) {
            studioEventTypes = evRows.filter((e: any) => String(e?.category || '').toLowerCase() !== 'ritual');
            break;
          }
        }
      } catch (_) {}
    }
    if (studioEventTypes.length === 0) studioEventTypes = DEFAULT_EVENT_TYPES;

    let studioCrewRoles: any[] = [];
    if (Array.isArray(body.studioCrewRoles) && body.studioCrewRoles.length > 0) {
      studioCrewRoles = body.studioCrewRoles;
    } else {
      try {
        for (const cWsId of candidateWsIds) {
          const { data: roleRows } = await supabaseAdmin
            .from('master_crew_roles')
            .select('name, short_code, display_order')
            .eq('workspace_id', cWsId)
            .order('display_order', { ascending: true });
          if (Array.isArray(roleRows) && roleRows.length > 0) {
            studioCrewRoles = roleRows;
            break;
          }
        }
      } catch (_) {}
    }
    if (studioCrewRoles.length === 0) studioCrewRoles = DEFAULT_CREW_ROLES;

    const studioEventNames = Array.from(
      new Set(
        studioEventTypes
          .map((e: any) => (typeof e === 'string' ? e : e?.name || '').trim())
          .filter((n: string) => n && !/pre[\s-]*wed|prewedding|pre[\s-]*shoot/i.test(n))
      )
    );
    const studioCrewNames = Array.from(
      new Set(
        studioCrewRoles
          .map((r: any) => (typeof r === 'string' ? r : r?.name || '').trim())
          .filter(Boolean)
      )
    );

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
Fix speech-to-text recognition errors, stutters, and phonetic slips while faithfully preserving 100% of the user's spoken words, sentences, timing relationships, requests, notes, and instructions.

ABSOLUTE MANDATES:
1. PRESERVE ALL SPOKEN CONTENT, RELATIVE DATES, SEPARATE/COMBINED PHRASES & TRAILING BUDGET:
   - You MUST include every ceremony, date, relative-date cue ("अगले दिन", "उसके अगले दिन", "दूसरे दिन", "उसी दिन", "एक ही दिन पे", "2 दिन बाद", "एक दिन पहले"), crew detail, Pre-Wedding mention, and budget mentioned.
   - CRITICAL: NEVER drop or reword relative-date phrases or quantity modifiers (e.g., preserve "उसके अगले दिन", "दोनों में", "एक ही दिन पे").
   - CRITICAL: NEVER drop, truncate, or omit the final words or concluding sentences of the speech!
   - If the user concluded by stating an amount, budget, or price (e.g. "दो लाख", "₹2,00,000", "50 हजार"), that amount MUST be preserved!
   - NEVER invent "Pre-Wedding" if the speaker did not say Pre-Wedding! Keep "Pre-Wedding" cleanly if they DID say it ("प्री वेडिंग" / "प्री-वेडिंग" -> "Pre-Wedding").
   - STRICT: Keep the natural sentence flow of the user's speech (do NOT convert into bullet headings).

2. PHONETIC & TECHNICAL TERM CORRECTIONS (ALIGNED WITH STUDIO OWNER SETTINGS):
   - Official Studio Function / Sub-Event Names (USE THESE EXACT SPELLINGS — NEVER append "Ceremony" or "Night" unless listed here!):
     ${studioEventNames.length > 0 ? studioEventNames.join(', ') : 'Wedding, Haldi, Sangeet, Mehendi, Reception'}
   - Official Studio Crew Roles (USE THESE EXACT NAMES):
     ${studioCrewNames.join(', ')}, Drone Pilot, Semi Cinematic, Semi Standard
   - Fix camera & crew terms cleanly using the Studio Crew Roles above (e.g. "कैंडिडेट"/"कैंडिड" -> "Candid Photographer", "ट्रेडिशनल फोटो" -> "Traditional Photographer", "ट्रेडिशनल वीडियो" -> "Traditional Videographer", "सिनेमा"/"सिनेमैटोग्राफर" -> "Cinematographer", "ड्रोन" -> "Drone Pilot").
   - Fix ceremony names cleanly using the Studio Function Names above (e.g. "हल्दी"/"हळद" -> "Haldi", "संगीत" -> "Sangeet", "शादी"/"लग्न"/"वेडिंग" -> exact matching Wedding name from Studio Function Names above, e.g. "Wedding").
   - Clean up deliverable terms ("ऑल डिलीवरी"/"ऑल डिलीवरेबल्स" -> "All Deliverables Add", "रील"/"रील्स" -> "Reels", "फोटोबुक"/"एल्बम" -> "Photobook / Album").
   - Format numbers & prices into clean Indian currency ("2 लाख" -> "₹2,00,000", "ढाई लाख" -> "₹2,50,000", "50 हजार" -> "₹50,000").
   - Clean up couple and client names into Title Case English (e.g. "रोहन और सिमरन" -> "Rohan & Simran").
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
                let cleanResult = polishedText.replace(/^```[a-z]*\n?|```$/g, '').replace(/^["']|["']$/g, '').trim();

                // Anti-drop safeguard: If rawText contained an amount or budget and cleanResult inexplicably dropped it, append it!
                const rawAmountMatch = rawText.match(/(?:बजट|budget|प्राइस|price|अमाउंट|amount|टोटल|total)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?\s*(?:लाख|lakh|lac|हजार|thousand|k|cr|करोड़)|\d{4,7})/i);
                if (rawAmountMatch && !cleanResult.match(/(?:₹|rs\.?|inr|\d+\s*(?:lakh|lac|लाख|k|हजार|thousand))/i)) {
                  cleanResult += ` (Budget: ${rawAmountMatch[0].trim()})`;
                }

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

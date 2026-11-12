import { NextRequest, NextResponse } from 'next/server';
import { cleanVoiceTranscript, enforceLosslessSpeechRetention } from '@/lib/speech-text-cleaner';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_EVENT_TYPES, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

export const maxDuration = 30; // 30 seconds server execution timeout

/**
 * High-Speed Google Gemini Voice Polish & Intent Replacement Route
 * Primary Engine: Google Gemini (gemini-flash-lite-latest -> gemini-3.1-flash-lite -> gemini-3-flash-preview)
 * Safety Fallback: Instant Deterministic Rule-Based Cleaner
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

    // 1. Fetch Studio Quotation Settings, Event Types & Crew Roles in parallel when missing
    const candidateWsIds = Array.from(new Set([
      body.userId,
      body.ownerId,
      workspaceId
    ].filter(Boolean)));

    if (body.userId) {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('id, workspace_id')
          .eq('id', String(body.userId))
          .maybeSingle();
        if (prof?.workspace_id && !candidateWsIds.includes(prof.workspace_id)) {
          candidateWsIds.push(prof.workspace_id);
        }
      } catch (_) {}
    }

    const needSettings = (!studioSettings || !studioSettings.aiRules) && candidateWsIds.length > 0;
    const needEvents = !(Array.isArray(body.studioEventTypes) && body.studioEventTypes.length > 0) && candidateWsIds.length > 0;
    const needRoles = !(Array.isArray(body.studioCrewRoles) && body.studioCrewRoles.length > 0) && candidateWsIds.length > 0;

    let studioEventTypes: any[] = Array.isArray(body.studioEventTypes) && body.studioEventTypes.length > 0 ? body.studioEventTypes : [];
    let studioCrewRoles: any[] = Array.isArray(body.studioCrewRoles) && body.studioCrewRoles.length > 0 ? body.studioCrewRoles : [];

    if (needSettings || needEvents || needRoles) {
      try {
        const [settingsRes, eventsRes, rolesRes] = await Promise.all([
          needSettings
            ? supabaseAdmin
                .from('workspace_quotation_settings')
                .select('workspace_id, settings')
                .in('workspace_id', candidateWsIds)
            : Promise.resolve({ data: null } as any),
          needEvents
            ? supabaseAdmin
                .from('workspace_event_types')
                .select('workspace_id, name, category, display_order')
                .in('workspace_id', candidateWsIds)
                .order('display_order', { ascending: true })
            : Promise.resolve({ data: null } as any),
          needRoles
            ? supabaseAdmin
                .from('master_crew_roles')
                .select('workspace_id, name, short_code, display_order')
                .in('workspace_id', candidateWsIds)
                .order('display_order', { ascending: true })
            : Promise.resolve({ data: null } as any),
        ]);

        if (needSettings && Array.isArray(settingsRes?.data)) {
          for (const cid of candidateWsIds) {
            const hit = settingsRes.data.find((r: any) => r.workspace_id === cid && r.settings && typeof r.settings === 'object');
            if (hit) {
              studioSettings = hit.settings;
              break;
            }
          }
        }
        if (needEvents && Array.isArray(eventsRes?.data)) {
          for (const cid of candidateWsIds) {
            const matched = eventsRes.data.filter((e: any) => e.workspace_id === cid && String(e?.category || '').toLowerCase() !== 'ritual');
            if (matched.length > 0) {
              studioEventTypes = matched;
              break;
            }
          }
        }
        if (needRoles && Array.isArray(rolesRes?.data)) {
          for (const cid of candidateWsIds) {
            const matched = rolesRes.data.filter((r: any) => r.workspace_id === cid);
            if (matched.length > 0) {
              studioCrewRoles = matched;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[Polish Speech] Parallel studio config lookup warning:', e);
      }
    }

    if (studioEventTypes.length === 0) studioEventTypes = DEFAULT_EVENT_TYPES;
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

    const systemInstruction = `You are a 100% LOSSLESS Verbatim Dictation Polisher for StudioCore wedding photography and cinematography studios.
The studio owner just dictated a voice note in Hindi, Hinglish, Marathi, or English into the quotation box.

YOUR #1 CRITICAL RULE — ZERO DELETION / ZERO SUMMARIZATION:
You MUST keep 100% of EVERY detail, clause, instruction, rule, number, date, relative-date cue, location, crew count, deliverable, custom rule, and concluding price mentioned by the user!
- NEVER summarize, condense, shorten, skip, or drop "less important" sentences! Do NOT keep only "main points" — preserve EVERY SINGLE SENTENCE AND CLAUSE spoken by the user in complete detail.
- Think like ChatGPT / Gemini verbatim dictation cleanup: fix broken phonetic speech-to-text typos, clean stutters ("uh", "umm", "हां हां वो वो"), punctuate cleanly, and translate/normalize studio terms cleanly while keeping 100% of the spoken meaning intact from first word to last word!

ABSOLUTE MANDATES:
1. PRESERVE EVERY CLAUSE, RULE & INSTRUCTION:
   - Keep EVERY relative-date phrase ("अगले दिन", "उसके अगले दिन", "दूसरे दिन", "उसी दिन", "एक ही दिन पे", "2 दिन बाद", "एक दिन पहले").
   - Keep EVERY voice-note instruction / rule command word-for-word clearly (e.g., "सभी इवेंट में 1 Traditional Photographer ऐड करो" / "हर फंक्शन में ड्रोन रखो" / "ट्रैवल अलग से रहेगा" / "Pre-Wedding शामिल नहीं है"). NEVER omit instructions or meta-rules spoken by the user!
   - NEVER drop trailing sentences, final notes, or closing prices/budgets (e.g., "दो लाख", "₹2,00,000", "50 हजार").
   - NEVER invent "Pre-Wedding" if the speaker did not say Pre-Wedding! Keep "Pre-Wedding" cleanly if they DID say it.
   - Do NOT convert speech into markdown headings, bullet lists, or summary cards — output clean natural flowing sentences separated cleanly by periods/punctuation.

2. PHONETIC & TECHNICAL TERM CORRECTIONS (ALIGNED WITH STUDIO OWNER SETTINGS):
   - Official Studio Function / Sub-Event Names (USE THESE EXACT SPELLINGS — NEVER append "Ceremony" or "Night" unless listed here!):
     ${studioEventNames.length > 0 ? studioEventNames.join(', ') : 'Wedding, Haldi, Sangeet, Mehendi, Reception'}
   - Official Studio Crew Roles (USE THESE EXACT NAMES):
     ${studioCrewNames.join(', ')}, Drone Pilot, Semi Cinematic, Semi Standard
   - Fix phonetic mic slips cleanly using the Studio Crew Roles above (e.g. "कैंडिडेट"/"कैंडिड" -> "Candid Photographer", "ट्रेडिशनल फोटो"/"ट्रेडिशनल कैमरामैन" -> "Traditional Photographer", "ट्रेडिशनल वीडियो" -> "Traditional Videographer", "सिनेमा"/"सिनेमैटोग्राफर" -> "Cinematographer", "ड्रोन" -> "Drone Pilot").
   - Keep per-event crew constraints & shortcut triggers verbatim ("Standard Crew", "alag crew", "अलग क्रू", "bas 1 Traditional Photographer", "only"): NEVER merge crew across different events.
   - Clean up deliverable terms and keep ALL spoken deliverable counts in Arabic digits ("ऑल डिलीवरी"/"ऑल डिलीवरेबल्स" -> "All Deliverables Add", "500 एडिटेड फोटो" -> "500 Edited Photos", "5 रील" -> "5 Instagram Reels", "1 पेनड्राइव" -> "1 Pendrive", "2 एल्बम" -> "2 Albums", "फोटोबुक" -> "Photobook / Album").
   - Format prices cleanly in Indian currency while preserving exact value ("2 लाख" -> "₹2,00,000", "ढाई लाख" -> "₹2,50,000", "50 हजार" -> "₹50,000").
   - Clean up couple and client names into Title Case English (e.g. "रोहन और सिमरन" -> "Rohan & Simran").
   ${leadName ? `- If user mentions a specific couple name in speech, keep the spoken couple name accurately alongside any lead reference "${leadName}".` : ''}

3. STUDIO AI TRAINING SHORTCUTS (PRESERVE & RECOGNIZE):
${shortcutsContext}
${customInstructions ? `\nSTUDIO CUSTOM RULES:\n${customInstructions}` : ''}

4. OUTPUT RULES:
   - Plain text ONLY. No preambles ("Here is..."), no markdown fences (\`\`\`), no bolding, no bullet points.`;

    // 3. PRIMARY ENGINE: Google Gemini (gemini-flash-lite-latest -> gemini-3.1-flash-lite -> gemini-3-flash-preview)
    const rawGeminiKeys = (process.env.GEMINI_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (rawGeminiKeys.length > 0) {
      // Note: gemini-flash-lite-latest rejects thinkingConfig (400 INVALID_ARGUMENT), so only include thinkingConfig where supported
      const candidateModels: Array<{ id: string; supportsThinkingZero: boolean }> = [
        { id: 'gemini-flash-lite-latest', supportsThinkingZero: false },
        { id: 'gemini-3.1-flash-lite', supportsThinkingZero: true },
        { id: 'gemini-3-flash-preview', supportsThinkingZero: true },
      ];
      for (const geminiKey of rawGeminiKeys) {
        for (const { id: model, supportsThinkingZero } of candidateModels) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const generationConfig: Record<string, any> = {
              temperature: 0.05,
              maxOutputTokens: 2500,
            };
            if (supportsThinkingZero) {
              generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }

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
                generationConfig
              }),
              signal: AbortSignal.timeout(12000)
            });

            if (res.ok) {
              const geminiJson = await res.json();
              const parts = geminiJson.candidates?.[0]?.content?.parts || [];
              const polishedText = parts
                .filter((p: any) => !p?.thought && typeof p?.text === 'string')
                .map((p: any) => p.text)
                .join('')
                .trim();
              if (polishedText && polishedText.length > 3) {
                const cleanResult = enforceLosslessSpeechRetention(rawText, polishedText, leadName);

                return NextResponse.json({
                  success: true,
                  polishedText: cleanResult,
                  engine: model
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

    // 4. Deterministic Safety Fallback: Return rule-based cleaned transcript
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

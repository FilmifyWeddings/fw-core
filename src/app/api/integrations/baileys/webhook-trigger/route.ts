/**
 * POST /api/integrations/baileys/webhook-trigger
 * ==============================================
 *
 * HINDI EXPLANATION:
 * Yeh route Supabase Database Webhook ka receiver hai.
 * Jab bhi `baileys_action_queue` mein koi naya row INSERT hota hai,
 * Supabase automatically is endpoint ko hit karta hai.
 *
 * Flow:
 * 1. Supabase webhook → POST /api/integrations/baileys/webhook-trigger
 * 2. Payload mein naya action_queue row hota hai
 * 3. Hum workspace ka creds.json Supabase se load karte hain → /tmp
 * 4. makeWASocket() → connect → message bhejo → socket band karo
 * 5. Message status DB mein update karo (queued → sent/failed)
 *
 * SECURITY:
 * - BAILEYS_WEBHOOK_SECRET env var se validate karo
 * - Supabase webhook mein same secret set karna hai HTTP header mein
 *
 * VERCEL CONFIG:
 * maxDuration = 60 (Vercel Pro required for 60s functions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessageServerless, normalizeJid, processSingleQueuedAction } from '@/lib/baileys-serverless';

// Tell Vercel this route can run up to 60 seconds (Pro plan)
export const maxDuration = 60;
// Must be Node.js runtime (not Edge) for Baileys fs access
export const runtime = 'nodejs';

// ─── Webhook Secret Validation ────────────────────────────────────────────────
function validateWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.BAILEYS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook-trigger] BAILEYS_WEBHOOK_SECRET not set in environment!');
    return false;
  }

  // Check both common header formats
  const providedSecret =
    req.headers.get('x-webhook-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  return providedSecret === secret;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Validate webhook secret
  if (!validateWebhookSecret(req)) {
    console.error('[webhook-trigger] Unauthorized — invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 2. Parse Supabase webhook payload
  const eventType = body.type as string;
  const record = body.record as {
    id: string;
    workspace_id: string;
    action_type: string;
    payload: Record<string, unknown>;
    status: string;
    next_retry_at?: string;
  } | undefined;

  if (!record || eventType !== 'INSERT') {
    console.log('[webhook-trigger] Ignoring non-INSERT event or missing record');
    return NextResponse.json({ skipped: true });
  }

  if (record.status !== 'pending') {
    console.log('[webhook-trigger] Action not pending, skipping');
    return NextResponse.json({ skipped: true, reason: 'not_pending' });
  }

  // Skip immediate webhook dispatches for future-scheduled actions
  if (record.next_retry_at && new Date(record.next_retry_at) > new Date()) {
    console.log(`[webhook-trigger] Action ${record.id} is scheduled for the future (${record.next_retry_at}), skipping immediate execution`);
    return NextResponse.json({ skipped: true, reason: 'scheduled_in_future' });
  }

  console.log(`[webhook-trigger] Processing action: ${record.id} (${record.action_type})`);

  // 3. Mark as processing
  await supabaseAdmin
    .from('baileys_action_queue')
    .update({
      status: 'processing',
      attempt_count: 1,
      processed_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  // 4. Process the action (send message via serverless hydration)
  const result = await processSingleQueuedAction(supabaseAdmin, {
    workspace_id: record.workspace_id,
    action_type: record.action_type,
    payload: record.payload,
  });

  // 5. Update final status in DB
  if (result.success) {
    await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'done',
        result_message_id: result.waMessageId ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    console.log(`[webhook-trigger] ✅ Action ${record.id} completed. WA ID: ${result.waMessageId}`);
    return NextResponse.json({
      success: true,
      actionId: record.id,
      waMessageId: result.waMessageId,
    });
  } else {
    await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'failed',
        error_message: result.error,
        processed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    console.error(`[webhook-trigger] ❌ Action ${record.id} failed: ${result.error}`);
    return NextResponse.json({
      success: false,
      actionId: record.id,
      error: result.error,
    }, { status: 500 });
  }
}

// HEAD/GET for Supabase webhook health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'baileys-webhook-trigger',
    version: '2.0-serverless',
  });
}

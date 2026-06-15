/**
 * GET /api/integrations/baileys/qr-init
 * ======================================
 *
 * HINDI EXPLANATION:
 * Yeh route Server-Sent Events (SSE) use karta hai.
 * Jab user "Connect WhatsApp" button dabata hai, browser is route ko GET karta hai.
 * Hum Baileys socket initialize karte hain, aur jab bhi QR aata hai ya
 * connection hoti hai, hum event stream mein push karte hain.
 *
 * Flow:
 * 1. Browser → GET /api/integrations/baileys/qr-init
 * 2. Server → SSE stream open karta hai (HTTP 200 + text/event-stream)
 * 3. Baileys socket init → QR generate hota hai
 * 4. Server → event: qr data: "<qr-string>" stream karta hai
 * 5. Browser → QR render karta hai
 * 6. User WhatsApp se scan karta hai
 * 7. Server → event: connected data: {"phone":"91XXXXXXXXXX"} bhejta hai
 * 8. Stream band hoti hai
 *
 * SSE KYU:
 * - Long-polling se better (single HTTP connection)
 * - Real-time push (no polling delay)
 * - Automatic reconnect on network drop
 * - Works perfectly with Vercel's streaming response support
 *
 * IMPORTANT: Vercel Pro = 60s max. SSE connection in 55s timeout.
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { generateQrServerless } from '@/lib/baileys-serverless';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  // EventSource doesn't support custom headers, so token comes via query param
  const authHeader = req.headers.get('authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const token = authHeader?.replace('Bearer ', '') ?? queryToken;

  const webhookSecret = process.env.BAILEYS_WEBHOOK_SECRET;
  let workspaceId: string | null = null;

  // Option A: Check if token is the webhook secret (useful for internal testing / automation)
  if (webhookSecret && token === webhookSecret) {
    workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return new Response('Unauthorized: Missing workspaceId query parameter when using Webhook Secret', { status: 401 });
    }
  } else {
    // Option B: Regular Supabase auth check
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token ?? undefined);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }
    workspaceId = user.id;
  }

  // ── Setup SSE Stream ────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* stream may have closed */
        }
      };

      // Initial ping
      send('status', { message: 'Initializing Baileys socket...', state: 'connecting' });

      // Start a heartbeat ping interval to keep connection alive and prevent Vercel idle timeouts
      const pingInterval = setInterval(() => {
        send('status', { message: 'Keep-alive ping...', state: 'connecting', timestamp: Date.now() });
      }, 1500);

      try {
        await generateQrServerless(
          supabaseAdmin,
          workspaceId,
          // onQr callback — send QR string to browser
          (qrString) => {
            send('qr', { qr: qrString });
          },
          // onConnected callback — session authenticated!
          (phoneNumber) => {
            send('connected', { phone: phoneNumber, state: 'open' });
          },
          // onError callback
          (errMsg) => {
            send('baileys-error', { message: errMsg, state: 'disconnected' });
          },
          55_000 // 55s timeout (5s buffer before Vercel's 60s limit)
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send('baileys-error', { message: msg, state: 'disconnected' });
      } finally {
        clearInterval(pingInterval);
        // Send final close event and close stream
        try {
          send('done', { message: 'Session closed' });
          controller.close();
        } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Important for nginx/Vercel proxy buffering
    },
  });
}

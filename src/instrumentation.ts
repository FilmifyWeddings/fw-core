async function verifyWorkerConnection() {
  const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[instrumentation] ✅ Baileys Worker reachable at 127.0.0.1:${WORKER_PORT}`, data.socket ? `Socket: ${data.socket}` : '');
        return true;
      }
    } catch {
      // not ready yet
    }
    if (attempt < 5) {
      console.log(`[instrumentation] ⏳ Waiting for Baileys Worker (attempt ${attempt}/5)...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.error(`[instrumentation] ❌ Baileys Worker UNREACHABLE at 127.0.0.1:${WORKER_PORT} after 5 attempts. Queue processing will fail.`);
  return false;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if ((globalThis as any).__baileysReconnectInitialized) {
      console.log('[instrumentation] Baileys Auto-Reconnect already initialized, skipping.');
      return;
    }
    (globalThis as any).__baileysReconnectInitialized = true;

    console.log('[instrumentation] Node.js runtime detected. Initializing...');
    if (process.env.DISABLE_WHATSAPP_WORKER === 'true') {
      console.log('[instrumentation] Baileys Auto-Reconnect and Poller disabled via environment variable.');
      return;
    }

    // Verify worker is reachable (non-blocking — logs warning if not)
    verifyWorkerConnection();

    const { supabaseAdmin } = await import('@/lib/supabase');
    const { autoReconnectSessions, startQueuePoller } = await import('@/lib/baileys-serverless');

    autoReconnectSessions(supabaseAdmin).catch(err => {
      console.error('[instrumentation] Baileys Auto-Reconnect failed on boot:', err);
    });

    startQueuePoller(supabaseAdmin);
  }
}

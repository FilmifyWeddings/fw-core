export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Prevent duplicate bootup runs during Next.js dev reloads/HMR
    if ((globalThis as any).__baileysReconnectInitialized) {
      console.log('[instrumentation] Baileys Auto-Reconnect already initialized, skipping.');
      return;
    }
    (globalThis as any).__baileysReconnectInitialized = true;

    console.log('[instrumentation] Node.js runtime detected. Initializing Baileys Auto-Reconnect...');
    if (process.env.DISABLE_WHATSAPP_WORKER === 'true') {
      console.log('[instrumentation] Baileys Auto-Reconnect and Poller disabled via environment variable.');
      return;
    }
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { autoReconnectSessions, startQueuePoller } = await import('@/lib/baileys-serverless');
    
    autoReconnectSessions(supabaseAdmin).catch(err => {
      console.error('[instrumentation] Baileys Auto-Reconnect failed on boot:', err);
    });

    startQueuePoller(supabaseAdmin);
  }
}

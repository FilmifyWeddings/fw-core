export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[instrumentation] Node.js runtime detected. Initializing Baileys Auto-Reconnect...');
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { autoReconnectSessions } = await import('@/lib/baileys-serverless');
    
    autoReconnectSessions(supabaseAdmin).catch(err => {
      console.error('[instrumentation] Baileys Auto-Reconnect failed on boot:', err);
    });
  }
}

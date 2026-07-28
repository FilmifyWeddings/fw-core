import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Auth optional — allow unauthenticated health checks from PM2/nginx
  let userId: string | null = null;
  if (token) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (user) userId = user.id;
  }

  const checks: Record<string, any> = {};
  const t0 = Date.now();

  // 1. Database
  try {
    const { count, error: dbErr } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*', { count: 'exact', head: true });
    checks.database = { status: dbErr ? 'error' : 'ok', error: dbErr?.message || null };
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message };
  }

  // 2. Worker
  const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
  try {
    const workerRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/health`, { signal: AbortSignal.timeout(5000) });
    if (workerRes.ok) {
      const workerData = await workerRes.json();
      checks.worker = { status: 'ok', ...workerData };
    } else {
      checks.worker = { status: 'error', error: `HTTP ${workerRes.status}` };
    }
  } catch (e: any) {
    checks.worker = { status: 'offline', error: e.message };
  }

  // 3. WhatsApp Sessions
  try {
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from('baileys_sessions')
      .select('workspace_id, conn_state, phone_number, last_connected');

    if (sessErr) {
      checks.sessions = { status: 'error', error: sessErr.message };
    } else {
      const open = sessions?.filter(s => s.conn_state === 'open').length || 0;
      const total = sessions?.length || 0;
      checks.sessions = { status: 'ok', total, connected: open, disconnected: total - open, list: sessions };
    }
  } catch (e: any) {
    checks.sessions = { status: 'error', error: e.message };
  }

  // 4. Queue Poller Status
  const pollerInit = (globalThis as any).__baileysQueuePollerInitialized;
  checks.queuePoller = {
    status: pollerInit ? 'running' : 'stopped',
    initialized: !!pollerInit,
  };

  // 5. Queue stats
  try {
    const { data: queueStats, error: qErr } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('status');

    if (qErr) {
      checks.queue = { status: 'error', error: qErr.message };
    } else {
      const pending = queueStats?.filter(s => s.status === 'pending').length || 0;
      const processing = queueStats?.filter(s => s.status === 'processing').length || 0;
      const done = queueStats?.filter(s => s.status === 'done').length || 0;
      const failed = queueStats?.filter(s => s.status === 'failed').length || 0;
      checks.queue = { status: 'ok', total: queueStats?.length || 0, pending, processing, done, failed };
    }
  } catch (e: any) {
    checks.queue = { status: 'error', error: e.message };
  }

  // 6. Last processed action
  try {
    const { data: lastDone, error: lastErr } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('action_type, created_at, processed_at, status')
      .eq('status', 'done')
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    checks.lastProcessed = lastDone
      ? { status: 'ok', actionType: lastDone.action_type, createdAt: lastDone.created_at, processedAt: lastDone.processed_at }
      : { status: 'none', message: 'No processed actions found' };
  } catch (e: any) {
    checks.lastProcessed = { status: 'error', error: e.message };
  }

  // 7. Last sent message
  try {
    const { data: lastMsg, error: msgErr } = await supabaseAdmin
      .from('baileys_messages')
      .select('id, wa_message_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    checks.lastMessageSent = lastMsg
      ? { status: 'ok', id: lastMsg.id, waMessageId: lastMsg.wa_message_id, messageStatus: lastMsg.status, createdAt: lastMsg.created_at }
      : { status: 'none', message: 'No messages sent yet' };
  } catch (e: any) {
    checks.lastMessageSent = { status: 'error', error: e.message };
  }

  // 8. Workflow logs summary
  try {
    const { data: wfStats, error: wfErr } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('status');

    if (wfErr) {
      checks.workflowLogs = { status: 'error', error: wfErr.message };
    } else {
      const sent = wfStats?.filter(s => s.status === 'sent').length || 0;
      const pending = wfStats?.filter(s => s.status === 'pending').length || 0;
      const failed = wfStats?.filter(s => s.status === 'failed').length || 0;
      checks.workflowLogs = { status: 'ok', total: wfStats?.length || 0, sent, pending, failed };
    }
  } catch (e: any) {
    checks.workflowLogs = { status: 'error', error: e.message };
  }

  const elapsed = Date.now() - t0;

  return NextResponse.json({
    status: checks.worker?.status === 'ok' && checks.database?.status === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: elapsed,
    checks,
    userId,
  });
}

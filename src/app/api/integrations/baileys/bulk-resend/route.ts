import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId,
      startDate,
      endDate,
      statusFilter,
      selectedIds,
      delayBetweenMs = 3000,
      batchSize = 1,
      skipReadMessages = true,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
      query = query.in('id', selectedIds);
    } else {
      query = query.in('status', ['failed', 'pending']);
      if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
      if (endDate) query = query.lte('created_at', new Date(endDate).toISOString());
    }

    query = query.order('created_at', { ascending: true });

    const { data: items, error } = await query;
    if (error) throw error;
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, message: 'No items to resend', count: 0 });
    }

    const now = new Date().toISOString();
    const reQueued: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        if (skipReadMessages && item.status === 'done') continue;

        const delayOffset = Math.floor(i / batchSize) * delayBetweenMs;
        const scheduledAt = new Date(Date.now() + delayOffset).toISOString();

        await supabaseAdmin
          .from('baileys_action_queue')
          .update({
            status: 'pending',
            attempt_count: 0,
            error_message: null,
            failure_reason: null,
            next_retry_at: null,
            created_at: now,
          })
          .eq('id', item.id);

        reQueued.push(item.id);
      }
    }

    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    fetch(`http://127.0.0.1:${WORKER_PORT}/trigger`, { method: 'POST' }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `${reQueued.length} items re-queued for resend with ${delayBetweenMs}ms delay between batches`,
      count: reQueued.length,
      ids: reQueued,
      config: { delayBetweenMs, batchSize, skipReadMessages },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

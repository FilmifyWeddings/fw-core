import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

type GroupDispatchPayload = {
  /** Full WhatsApp group JID e.g. "120363XXXXXXXXXX@g.us" */
  groupJid: string;
  leadData: {
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    budget?: string;
    weddingDate?: string;
    [key: string]: string | undefined;
  };
};

/**
 * POST /api/integrations/baileys/group-dispatch
 * WGL (WhatsApp Group Lead) Dispatcher.
 * Queues a beautiful lead summary card to be sent to a WhatsApp group.
 * Used when a new Facebook lead hits the DB or a lead is manually added.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GroupDispatchPayload = await req.json();

    if (!body.groupJid || !body.leadData?.name) {
      return NextResponse.json({
        error: 'Missing required fields: groupJid, leadData.name',
      }, { status: 400 });
    }

    // Validate JID format for groups
    if (!body.groupJid.endsWith('@g.us')) {
      return NextResponse.json({
        error: 'groupJid must be a valid WhatsApp group JID ending in @g.us',
      }, { status: 400 });
    }

    // Check connection
    const { data: session } = await supabaseAdmin
      .from('baileys_sessions')
      .select('conn_state')
      .eq('workspace_id', user.id)
      .maybeSingle();

    if (!session || session.conn_state !== 'open') {
      return NextResponse.json({
        error: 'WhatsApp not connected',
        conn_state: session?.conn_state ?? 'disconnected',
      }, { status: 409 });
    }

    // Queue group dispatch action
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('baileys_action_queue')
      .insert({
        workspace_id: user.id,
        action_type: 'group_dispatch',
        payload: {
          groupJid: body.groupJid,
          leadData: body.leadData,
        },
        priority: 3, // Higher priority than normal messages
      })
      .select('id')
      .single();

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueId: queueItem?.id,
      message: `Group dispatch queued for ${body.leadData.name} → ${body.groupJid}`,
    });
  } catch (err) {
    console.error('[baileys/group-dispatch] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/integrations/baileys/group-dispatch
 * Returns list of available WhatsApp groups for the connected session.
 * Worker syncs these from 'chats.set' event.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('baileys_chats')
      .select('jid, display_name, last_message_at')
      .eq('workspace_id', user.id)
      .eq('is_group', true)
      .order('display_name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ groups: data ?? [] });
  } catch (err) {
    console.error('[baileys/group-dispatch GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

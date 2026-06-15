import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/integrations/baileys/messages?jid=<chatJid>&limit=50&before=<timestamp>
 * Returns chronological message history for a specific chat.
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

    const searchParams = req.nextUrl.searchParams;
    const jid = searchParams.get('jid');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const before = searchParams.get('before'); // ISO timestamp for pagination

    if (!jid) {
      return NextResponse.json({ error: 'Missing required query param: jid' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('baileys_messages')
      .select('id, wa_message_id, direction, message_text, media_url, media_type, status, delivered_at, read_at, sent_at, metadata')
      .eq('workspace_id', user.id)
      .eq('chat_jid', jid)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('sent_at', before);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return in chronological order (oldest first)
    const messages = (data ?? []).reverse();

    return NextResponse.json({ messages, jid });
  } catch (err) {
    console.error('[baileys/messages] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

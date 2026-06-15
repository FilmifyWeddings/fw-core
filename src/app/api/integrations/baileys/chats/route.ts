import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/integrations/baileys/chats
 * Returns the list of chats/contacts for the WhatsApp Web sidebar.
 * Sorted by last_message_at DESC.
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
    const search = searchParams.get('search') ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    let query = supabaseAdmin
      .from('baileys_chats')
      .select('id, jid, display_name, phone_number, is_group, unread_count, last_message, last_message_at, profile_pic_url')
      .eq('workspace_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ chats: data ?? [] });
  } catch (err) {
    console.error('[baileys/chats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve active whatsapp groups (is_group = true) for workspace_id
    const { data: chats, error: dbErr } = await supabaseAdmin
      .from('baileys_chats')
      .select('jid, display_name')
      .eq('workspace_id', user.id)
      .eq('is_group', true)
      .order('display_name', { ascending: true });

    if (dbErr) {
      console.error('[GET /api/workflows/whatsapp-groups] DB Error:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ groups: chats || [] });
  } catch (err: any) {
    console.error('[GET /api/workflows/whatsapp-groups] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

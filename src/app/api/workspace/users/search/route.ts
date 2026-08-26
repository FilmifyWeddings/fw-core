import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const query = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, users: [] });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Search profiles by email, full_name, or workspace_name
    const { data: profiles, error: searchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url, logo_url, workspace_name')
      .neq('id', user.id)
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(6);

    if (searchErr || !profiles) {
      return NextResponse.json({ success: true, users: [] });
    }

    const formattedUsers = profiles.map(p => ({
      id: p.id,
      email: p.email || '',
      name: p.full_name || p.workspace_name || 'StudioCore User',
      phone: p.phone || '',
      avatar_url: p.avatar_url || p.logo_url || '',
      workspace_name: p.workspace_name || '',
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

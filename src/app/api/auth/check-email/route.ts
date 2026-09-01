import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email || !email.includes('@') || email.length < 5) {
      return NextResponse.json({ exists: false });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check in profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (profile) {
      return NextResponse.json({
        exists: true,
        role: profile.role || 'user',
        name: profile.full_name || '',
      });
    }

    // 2. Check in auth.users
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        role: existingUser.user_metadata?.role || 'user',
        name: existingUser.user_metadata?.full_name || '',
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err: any) {
    return NextResponse.json({ exists: false, error: err.message });
  }
}

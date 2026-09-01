import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Create or retrieve auth user in Supabase
    let userId: string | null = null;

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || 'Crew Member',
        role: 'team_member',
      },
    });

    if (createErr) {
      // If user already exists, update password
      if (createErr.message.includes('already exists') || (createErr as any).code === 'email_exists') {
        const { data: listUser } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listUser?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          userId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: password,
            email_confirm: true,
          });
        } else {
          return NextResponse.json({ success: false, error: createErr.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ success: false, error: createErr.message }, { status: 400 });
      }
    } else if (newUser?.user) {
      userId = newUser.user.id;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Failed to establish user account' }, { status: 500 });
    }

    // 2. Link member records in database
    await supabaseAdmin.rpc('link_team_member_auth_user', {
      p_user_id: userId,
      p_email: cleanEmail,
      p_phone: phone || null,
    });

    // 3. Ensure profile exists
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: cleanEmail,
        full_name: fullName || 'Crew Member',
        role: 'team_member',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

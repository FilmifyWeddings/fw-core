import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    // 1. Validate OTP from pending_signups
    const { data: record, error } = await supabaseAdmin
      .from('pending_signups')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp_code', cleanOtp)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !record) {
      return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 400 });
    }

    // 2. NOW create user in Supabase auth as pre-confirmed (email_confirm: true)
    let userId: string | undefined;
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: record.password_hash,
      email_confirm: true,
      user_metadata: { full_name: record.full_name },
    });

    if (createError) {
      // If user existed in auth.users from a prior attempt, heal and confirm their account
      if (
        createError.message?.toLowerCase().includes('already') ||
        createError.message?.toLowerCase().includes('exists')
      ) {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            existing.id,
            {
              password: record.password_hash,
              email_confirm: true,
              user_metadata: { full_name: record.full_name },
            }
          );
          if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 400 });
          }
          userId = updated?.user?.id;
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      userId = userData?.user?.id;
    }

    // 3. Upsert profile
    if (userId) {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: record.full_name,
        role: 'owner',
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Remove pending record
    await supabaseAdmin.from('pending_signups').delete().eq('email', cleanEmail);

    return NextResponse.json({ success: true, message: 'Account verified successfully' });
  } catch (err: any) {
    console.error('[verify-signup] Handler error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

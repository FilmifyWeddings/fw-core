import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { email, otp, phone, role, fullName } = await req.json();
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

    const userFullName = fullName?.trim() || record.full_name || cleanEmail.split('@')[0];
    const userRole = role === 'team_member' ? 'team_member' : 'owner';
    const cleanPhone = phone ? String(phone).trim() : undefined;

    // 2. NOW create user in Supabase auth as pre-confirmed (email_confirm: true)
    let userId: string | undefined;
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: record.password_hash,
      email_confirm: true,
      phone: cleanPhone,
      user_metadata: {
        full_name: userFullName,
        phone: cleanPhone,
        role: userRole,
      },
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
              user_metadata: {
                full_name: userFullName,
                phone: cleanPhone,
                role: userRole,
              },
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

    // 3. Upsert profile safely without schema mismatch
    if (userId) {
      const profilePayload: any = {
        id: userId,
        email: cleanEmail,
        full_name: userFullName,
        platform_role: userRole,
        updated_at: new Date().toISOString(),
      };

      if (cleanPhone) {
        profilePayload.phone = cleanPhone;
        profilePayload.phone_verified = true;
      }

      if (userRole === 'owner') {
        const studioName = `${userFullName}'s Studio`;
        profilePayload.workspace_name = studioName;
        profilePayload.business_name = studioName;
      }

      const { error: profErr } = await supabaseAdmin.from('profiles').upsert(profilePayload);
      if (profErr) {
        console.warn('[verify-signup] profile upsert warning:', profErr.message);
      }
    }

    // 4. Remove pending record
    await supabaseAdmin.from('pending_signups').delete().eq('email', cleanEmail);

    return NextResponse.json({ success: true, message: 'Account verified successfully' });
  } catch (err: any) {
    console.error('[verify-signup] Handler error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

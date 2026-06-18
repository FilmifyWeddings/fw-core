import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { isUserSuperAdmin } from '@/lib/auth/admin-guard';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (!isUserSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { version_number, release_notes } = body;

    if (!version_number || !release_notes) {
      return NextResponse.json({ error: 'Bad Request: version_number and release_notes are required' }, { status: 400 });
    }

    // Deactivate current active versions
    const { error: deactivateError } = await supabaseAdmin
      .from('app_versions')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      return NextResponse.json({ error: `Deactivation failed: ${deactivateError.message}` }, { status: 500 });
    }

    // Insert new active version (deployed_by points to super admin uid)
    const { data: newVersion, error: insertError } = await supabaseAdmin
      .from('app_versions')
      .insert({
        version_number,
        release_notes,
        is_active: true,
        deployed_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: `Version publish failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, version: newVersion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

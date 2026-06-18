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
    const { version_id } = body;

    if (!version_id) {
      return NextResponse.json({ error: 'Bad Request: version_id is required' }, { status: 400 });
    }

    // Deactivate all versions except the rollback target
    const { error: deactivateError } = await supabaseAdmin
      .from('app_versions')
      .update({ is_active: false })
      .neq('id', version_id);

    if (deactivateError) {
      return NextResponse.json({ error: `Deactivation failed: ${deactivateError.message}` }, { status: 500 });
    }

    // Set the rollback target version to active
    const { data: rolledVersion, error: activateError } = await supabaseAdmin
      .from('app_versions')
      .update({ is_active: true })
      .eq('id', version_id)
      .select()
      .single();

    if (activateError) {
      return NextResponse.json({ error: `Rollback activation failed: ${activateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, version: rolledVersion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    await supabaseAdmin
      .from('quotation_templates')
      .update({ is_global_default: false })
      .eq('is_system_template', true);

    const { data: updatedTmpl, error } = await supabaseAdmin
      .from('quotation_templates')
      .update({
        is_global_default: true,
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_system_template', true)
      .select()
      .single();

    if (error) {
      console.error('[Set Global Default Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Global Default System Template Set]:', { globalDefaultId: id });

    return NextResponse.json({
      success: true,
      globalDefaultId: id,
      template: updatedTmpl
    });
  } catch (error: any) {
    console.error('Error setting global default:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

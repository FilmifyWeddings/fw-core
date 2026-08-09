import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';

/**
 * Super Admin API: Toggle a template as System Template for all users
 * Strictly restricted to Super Admin (sushantnawale700@gmail.com).
 */

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

    // 1. Fetch Target Template Record
    const { data: tmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!tmpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const nextIsSystem = !tmpl.is_system_template;
    const nextStatus = nextIsSystem ? 'published' : 'draft';

    // 2. Update Template Status
    const { data: updatedTmpl, error } = await supabaseAdmin
      .from('quotation_templates')
      .update({
        is_system_template: nextIsSystem,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Toggle System Template Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[System Template Toggled]:', { id, is_system_template: nextIsSystem, status: nextStatus });

    return NextResponse.json({
      success: true,
      templateId: id,
      is_system_template: nextIsSystem,
      status: nextStatus,
      template: updatedTmpl
    });
  } catch (error: any) {
    console.error('Error toggling system template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

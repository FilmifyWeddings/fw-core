import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

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
    let { data: tmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // 2. If not found in quotation_templates, check quotations table or create fallback
    if (!tmpl) {
      const { data: quoteRec } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .maybeSingle();

      if (quoteRec || id === GLOBAL_SYSTEM_TEMPLATE_ID) {
        const { data: newTmpl, error: insertErr } = await supabaseAdmin
          .from('quotation_templates')
          .insert({
            id: id,
            title: quoteRec?.title || 'System Default Wedding Template',
            category: 'Wedding',
            is_system_template: true,
            is_default: false,
            status: 'published',
            user_id: 'SYSTEM',
            workspace_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!insertErr && newTmpl) {
          tmpl = newTmpl;
        }
      }
    }

    if (!tmpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const nextIsSystem = !tmpl.is_system_template;
    const nextStatus = nextIsSystem ? 'published' : 'draft';

    // 3. Update Template Status
    const { data: updatedTmpl, error } = await supabaseAdmin
      .from('quotation_templates')
      .update({
        is_system_template: nextIsSystem,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', tmpl.id)
      .select()
      .single();

    if (error) {
      console.error('[Toggle System Template Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[System Template Toggled]:', { id: tmpl.id, is_system_template: nextIsSystem, status: nextStatus });

    return NextResponse.json({
      success: true,
      templateId: tmpl.id,
      is_system_template: nextIsSystem,
      status: nextStatus,
      template: updatedTmpl
    });
  } catch (error: any) {
    console.error('Error toggling system template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

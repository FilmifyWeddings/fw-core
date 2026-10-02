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

    // 2. If not found in quotation_templates, check quotation_documents or fallback
    if (!tmpl) {
      const { data: docRec } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docRec) {
        const docTitle = docRec.content_json?.designName || docRec.content_json?.cover?.coupleName || 'Quotation Template';
        const { data: createdTmpl } = await supabaseAdmin
          .from('quotation_templates')
          .upsert({
            id: id,
            title: docTitle,
            category: 'Wedding',
            is_system_template: false,
            is_default: false,
            status: 'draft',
            user_id: 'SYSTEM',
            workspace_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .single();

        if (createdTmpl) {
          tmpl = createdTmpl;
        }
      }
    }

    if (!tmpl) {
      const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isIdUuid
        ? supabaseAdmin.from('quotations').select('*').or(`id.eq.${id},quotation_number.eq.${id}`).maybeSingle()
        : supabaseAdmin.from('quotations').select('*').eq('quotation_number', id).maybeSingle();

      const { data: quoteRec } = await query;

      if (quoteRec || id === GLOBAL_SYSTEM_TEMPLATE_ID) {
        const { data: newTmpl, error: insertErr } = await supabaseAdmin
          .from('quotation_templates')
          .upsert({
            id: id,
            title: quoteRec?.title || 'System Default Wedding Template',
            category: 'Wedding',
            is_system_template: false,
            is_default: false,
            status: 'draft',
            user_id: 'SYSTEM',
            workspace_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
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
        user_id: 'SYSTEM',
        workspace_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', tmpl.id)
      .select()
      .single();

    if (error) {
      console.error('[Toggle System Template Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. If published as system template, ensure quotation_documents is also accessible under SYSTEM
    if (nextIsSystem) {
      await supabaseAdmin
        .from('quotation_documents')
        .update({
          user_id: 'SYSTEM',
          workspace_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', tmpl.id);
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

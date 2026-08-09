import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';

async function handleGet(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    const { data: tmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .eq('is_system_template', true)
      .maybeSingle();

    const { data: doc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    if (!tmpl && !doc) {
      return NextResponse.json({ error: 'System Template not found' }, { status: 404 });
    }

    const docJson = doc?.document_json || doc?.content_json || { meta: { title: tmpl?.title || 'System Default Wedding Template', currency: 'INR' }, pages: [] };

    return NextResponse.json({
      success: true,
      template: tmpl || { id, title: 'System Template', is_system_template: true },
      document: {
        template_id: id,
        version: doc?.version || 1,
        content_json: docJson,
        document_json: docJson
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleUpdate(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const document = body.content_json || body.document;
    const title = body.title;
    const category = body.category;
    const status = body.status;

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (targetTmpl && !targetTmpl.is_system_template) {
      return NextResponse.json({ error: 'Admin API can only update System Templates.' }, { status: 400 });
    }

    await supabaseAdmin
      .from('quotation_templates')
      .upsert({
        id,
        workspace_id: null,
        user_id: 'SYSTEM',
        is_system_template: true,
        title: title || targetTmpl?.title || document?.meta?.title || 'System Default Wedding Template',
        category: category || targetTmpl?.category || 'Wedding',
        status: status || targetTmpl?.status || 'published',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (document) {
      await supabaseAdmin
        .from('quotation_documents')
        .upsert({
          template_id: id,
          workspace_id: null,
          user_id: 'SYSTEM',
          document_json: document,
          content_json: document,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });
    }

    console.log('[ADMIN TEMPLATE SAVE]', { templateId: id, isSystemTemplate: true, saveTargetId: id });

    return NextResponse.json({
      success: true,
      templateId: id,
      version: body.version || 1
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleDelete(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (targetTmpl?.is_global_default) {
      return NextResponse.json({ error: 'Cannot delete the current Global Default System Template.' }, { status: 400 });
    }

    await supabaseAdmin.from('quotation_documents').delete().eq('template_id', id);
    await supabaseAdmin.from('quotation_templates').delete().eq('id', id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export const GET = handleGet;
export const PUT = handleUpdate;
export const PATCH = handleUpdate;
export const DELETE = handleDelete;

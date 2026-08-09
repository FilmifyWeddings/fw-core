import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Single Template Route (GET, PUT, PATCH, DELETE)
 * Handles security checks, RLS workspace isolation, and system template auto-forking.
 */

async function handleGet(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'demo_user';

    let workspaceId = userId;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 1. System Template (FW-2WT85Y0) is readable by all authenticated users
    if (id === GLOBAL_SYSTEM_TEMPLATE_ID) {
      const { data: sysTmpl } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('id', GLOBAL_SYSTEM_TEMPLATE_ID)
        .maybeSingle();

      const { data: sysDoc } = await supabase
        .from('quotation_documents')
        .select('*')
        .eq('template_id', GLOBAL_SYSTEM_TEMPLATE_ID)
        .maybeSingle();

      return NextResponse.json({
        template: sysTmpl || { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
        document: sysDoc?.document_json || { meta: { title: 'System Default Wedding Template', currency: 'INR' }, pages: [] }
      });
    }

    // 2. Fetch User Template Metadata
    const { data: tmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!tmpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 3. User Isolation Check — User A cannot view User B's private template
    const isOwner = tmpl.is_system_template ||
      tmpl.workspace_id === workspaceId ||
      tmpl.user_id === userId ||
      tmpl.user_id === 'SYSTEM' ||
      tmpl.user_id === 'demo_user';

    if (!isOwner) {
      return NextResponse.json({ error: 'Access Denied: You do not have permission to view this quotation template.' }, { status: 403 });
    }

    // 4. Fetch Template Document
    const { data: doc } = await supabase
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    return NextResponse.json({
      template: tmpl,
      document: doc?.document_json || { meta: {}, pages: [] }
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleUpdate(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id || 'demo_user';
    let userEmail = session?.user?.email;

    if (userEmail === 'sushantnawale700@gmail.com') {
      const impId = req.headers.get('x-impersonated-tenant-id');
      if (impId) userId = impId;
    }

    let workspaceId = userId;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    const body = await req.json().catch(() => ({}));
    const document = body.content_json || body.document;
    const title = body.title;
    const category = body.category;

    // Check if target template is System Template (FW-2WT85Y0 or is_system_template)
    const { data: targetTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM';

    if (isSystemTemplate) {
      // RULE: User editing system template -> DO NOT update FW-2WT85Y0. Fork new user template and set as default!
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newTemplateId = `FW-USER-${randomSuffix}`;

      // Reset is_default = false on user's existing templates
      if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
        await supabase
          .from('quotation_templates')
          .update({ is_default: false })
          .eq('workspace_id', workspaceId)
          .not('is_system_template', 'eq', true);
      } else {
        await supabase
          .from('quotation_templates')
          .update({ is_default: false })
          .eq('user_id', userId)
          .not('is_system_template', 'eq', true);
      }

      // Clone document and generate fresh page IDs
      const clonedDoc = JSON.parse(JSON.stringify(document || { meta: {}, pages: [] }));
      if (Array.isArray(clonedDoc.pages)) {
        clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
          ...page,
          id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`
        }));
      }

      // Insert new user template as default
      await supabase
        .from('quotation_templates')
        .insert({
          id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          title: title || 'Customized Wedding Template',
          category: category || 'Wedding',
          is_system_template: false,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Insert new user template document
      await supabase
        .from('quotation_documents')
        .insert({
          template_id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          document_json: clonedDoc,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return NextResponse.json({
        success: true,
        isAutoCloned: true,
        redirected: true,
        newTemplateId,
        message: 'System template customized into your workspace default template.'
      });
    }

    // Security Check for user-owned template — verify ownership
    if (targetTmpl && targetTmpl.workspace_id !== workspaceId && targetTmpl.user_id !== userId && targetTmpl.user_id !== 'demo_user') {
      return NextResponse.json({ error: 'Access Denied: You cannot modify another user\'s template.' }, { status: 403 });
    }

    // Save directly to user-owned template
    if (title || category) {
      await supabase
        .from('quotation_templates')
        .update({
          ...(title ? { title } : {}),
          ...(category ? { category } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    if (document) {
      await supabase
        .from('quotation_documents')
        .upsert({
          template_id: id,
          workspace_id: workspaceId,
          user_id: userId,
          document_json: document,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });
    }

    return NextResponse.json({
      success: true,
      templateId: id
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleDelete(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'demo_user';

    const { data: targetTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // RULE: System template cannot be deleted
    if (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === GLOBAL_SYSTEM_TEMPLATE_ID) {
      return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 400 });
    }

    // RULE: User A cannot delete User B's template
    if (targetTmpl && targetTmpl.workspace_id !== userId && targetTmpl.user_id !== userId && targetTmpl.user_id !== 'demo_user') {
      return NextResponse.json({ error: 'Access Denied: You cannot delete another user\'s template.' }, { status: 403 });
    }

    // RULE: Cannot delete current default template
    if (targetTmpl?.is_default) {
      return NextResponse.json({
        error: 'Cannot delete your current Default Template. Please set another template as Default first.'
      }, { status: 400 });
    }

    // Delete user template & document from Supabase
    await supabase.from('quotation_documents').delete().eq('template_id', id);
    await supabase.from('quotation_templates').delete().eq('id', id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export const GET = handleGet;
export const PUT = handleUpdate;
export const PATCH = handleUpdate;
export const DELETE = handleDelete;

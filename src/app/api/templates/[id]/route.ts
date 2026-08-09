import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Single Template & Lead Quotation Document Route (GET, PUT, PATCH, DELETE)
 * Handles security checks, RLS workspace isolation, system template auto-forking, and lead quotation resolution.
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

      const docJson = sysDoc?.document_json || sysDoc?.content_json || { meta: { title: 'System Default Wedding Template', currency: 'INR' }, pages: [] };

      return NextResponse.json({
        template: sysTmpl || { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
        document: {
          template_id: GLOBAL_SYSTEM_TEMPLATE_ID,
          version: sysDoc?.version || 1,
          content_json: docJson,
          document_json: docJson
        }
      });
    }

    // 2. Fetch User Template Metadata from quotation_templates
    const { data: tmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // 3. Fetch Document Snapshot from quotation_documents
    const { data: doc } = await supabase
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    // 4. Fetch Quotation Record from quotations if exists
    const { data: quoteRec } = await supabase
      .from('quotations')
      .select('*')
      .or(`id.eq.${id},quotation_number.eq.${id}`)
      .maybeSingle();

    const docJson = doc?.document_json || doc?.content_json || quoteRec?.content_json || null;

    if (!tmpl && !docJson && !quoteRec) {
      return NextResponse.json({ error: 'Quotation template or document not found' }, { status: 404 });
    }

    // 5. User Isolation Check — User A cannot view User B's private template / quotation
    const targetWorkspace = tmpl?.workspace_id || tmpl?.user_id || doc?.workspace_id || doc?.user_id || quoteRec?.workspace_id || quoteRec?.user_id;
    const isOwner = tmpl?.is_system_template ||
      !targetWorkspace ||
      targetWorkspace === workspaceId ||
      targetWorkspace === userId ||
      targetWorkspace === 'SYSTEM' ||
      targetWorkspace === 'demo_user';

    if (!isOwner) {
      return NextResponse.json({ error: 'Access Denied: You do not have permission to view this quotation document.' }, { status: 403 });
    }

    return NextResponse.json({
      template: tmpl || {
        id,
        title: quoteRec?.title || 'Quotation Document',
        is_system_template: false,
        is_default: false
      },
      document: {
        template_id: id,
        version: doc?.version || 1,
        content_json: docJson || { meta: {}, pages: [] },
        document_json: docJson || { meta: {}, pages: [] }
      }
    });
  } catch (error: any) {
    console.error('Error fetching template/document:', error);
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

    // Check if target is System Template (FW-2WT85Y0 or is_system_template)
    const { data: targetTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM';
    const isAdmin = userEmail === 'sushantnawale700@gmail.com';

    if (isSystemTemplate && isAdmin) {
      // RULE: Super Admin editing system template -> Update directly in Supabase!
      await supabaseAdmin
        .from('quotation_templates')
        .update({
          title: title || targetTmpl?.title || 'System Template',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (document) {
        await supabaseAdmin
          .from('quotation_documents')
          .upsert({
            template_id: id,
            document_json: document,
            content_json: document,
            updated_at: new Date().toISOString()
          }, { onConflict: 'template_id' });
      }

      console.log('[Super Admin System Template Saved Directly]:', { templateId: id });

      return NextResponse.json({
        success: true,
        templateId: id,
        version: body.version || 1
      });
    }

    if (isSystemTemplate && !isAdmin) {
      // RULE: Normal User editing system template -> Fork new user template and set as default!
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

    // Save directly to user-owned template or quotation document
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
          content_json: document,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });

      // Update quotations table if record exists
      await supabase
        .from('quotations')
        .update({
          content_json: document,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${id},quotation_number.eq.${id}`);
    }

    return NextResponse.json({
      success: true,
      templateId: id
    });
  } catch (error: any) {
    console.error('Error updating template/document:', error);
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
    const userEmail = session?.user?.email;
    const isAdmin = userEmail?.toLowerCase() === 'sushantnawale700@gmail.com';

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // RULE: System template cannot be deleted by normal users, but CAN be deleted by Super Admin!
    if (!isAdmin && (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === GLOBAL_SYSTEM_TEMPLATE_ID)) {
      return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 400 });
    }

    // RULE: Cannot delete current default template for non-admin
    if (!isAdmin && targetTmpl?.is_default) {
      return NextResponse.json({
        error: 'Cannot delete your current Default Template. Please set another template as Default first.'
      }, { status: 400 });
    }

    // Delete template & document from Supabase (using supabaseAdmin for Super Admin)
    const client = isAdmin ? supabaseAdmin : supabase;
    await client.from('quotation_documents').delete().eq('template_id', id);
    await client.from('quotation_templates').delete().eq('id', id);
    await client.from('quotations').delete().or(`id.eq.${id},quotation_number.eq.${id}`);

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

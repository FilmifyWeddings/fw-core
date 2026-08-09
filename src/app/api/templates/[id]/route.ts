import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Single Template Route (GET, PUT, DELETE)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch template metadata
    const { data: tmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Fetch template document
    const { data: doc } = await supabase
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    if (!doc && !tmpl) {
      // Return system default structure if FW-2WT85Y0 requested and not yet seeded
      if (id === GLOBAL_SYSTEM_TEMPLATE_ID) {
        return NextResponse.json({
          template: { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true },
          document: { meta: { title: 'System Default Wedding Template', currency: 'INR' }, pages: [] }
        });
      }
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      template: tmpl || { id, title: 'Quotation Template', is_system_template: false },
      document: doc?.document_json || { meta: {}, pages: [] }
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const { document, title, category } = body;

    // Check if target template is System Template (FW-2WT85Y0 or is_system_template)
    const { data: targetTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM';

    if (isSystemTemplate) {
      // RULE: User editing system template -> DO NOT update FW-2WT85Y0. Fork new user template and set as default!
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
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
        redirected: true,
        newTemplateId,
        message: 'System template customized into your workspace default template.'
      });
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: targetTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // RULE: System template cannot be deleted
    if (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === GLOBAL_SYSTEM_TEMPLATE_ID) {
      return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 400 });
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

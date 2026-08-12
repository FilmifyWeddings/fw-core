import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative Single Template & Lead Quotation Document Route (GET, PUT, PATCH, DELETE)
 * Handles security checks, workspace isolation, system template direct editing for Super Admin, and auto-forking for users.
 */

async function handleGet(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    let workspaceId = userId;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 1. System Template is readable by all authenticated users
    if (id === GLOBAL_SYSTEM_TEMPLATE_ID) {
      const { data: sysTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', GLOBAL_SYSTEM_TEMPLATE_ID)
        .maybeSingle();

      const { data: sysDoc } = await supabaseAdmin
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

    // 2. Fetch Template, Document Snapshot, and Quotation Record in parallel (3x Faster!)
    const [tmplRes, docRes, quoteRecRes] = await Promise.all([
      supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', id)
        .maybeSingle(),
      supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .maybeSingle()
    ]);

    const tmpl = tmplRes.data;
    const doc = docRes.data;
    const quoteRec = quoteRecRes.data;

    const docJson = doc?.document_json || doc?.content_json || quoteRec?.canvas_data || quoteRec?.content_json || null;

    if (!tmpl && !docJson && !quoteRec) {
      return NextResponse.json({ error: 'Quotation template or document not found' }, { status: 404 });
    }

    // 5. User Isolation Check — Super Admin can view all, users can view system templates, public previews, or their own
    const isPublicPreview = req.nextUrl.searchParams.get('preview') === 'public' || !!req.nextUrl.searchParams.get('token');
    const targetWorkspace = tmpl?.workspace_id || tmpl?.user_id || doc?.workspace_id || doc?.user_id || quoteRec?.workspace_id || quoteRec?.user_id;
    const isOwner = isSuperAdmin ||
      isPublicPreview ||
      tmpl?.is_system_template ||
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
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

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

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id.startsWith('SYS-');

    // ── SUPER ADMIN DIRECT UPDATE ENGINE ──
    if (isSuperAdmin) {
      console.log('[SUPER ADMIN DIRECT UPDATE]', { id, isSystemTemplate, title });

      const newTitle = title || document?.designName || targetTmpl?.title || 'System Default Wedding Template';

      await supabaseAdmin
        .from('quotation_templates')
        .upsert({
          id,
          user_id: 'SYSTEM',
          workspace_id: null,
          title: newTitle,
          category: category || targetTmpl?.category || 'Wedding',
          is_system_template: true,
          status: 'published',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (document) {
        await supabaseAdmin
          .from('quotation_documents')
          .upsert({
            template_id: id,
            user_id: 'SYSTEM',
            workspace_id: null,
            content_json: document,
            updated_at: new Date().toISOString()
          }, { onConflict: 'template_id' });

        await supabaseAdmin
          .from('quotations')
          .update({
            title: newTitle,
            updated_at: new Date().toISOString()
          })
          .or(`id.eq.${id},quotation_number.eq.${id}`);
      }

      return NextResponse.json({
        success: true,
        templateId: id,
        version: body.version || 1
      });
    }

    // ── NORMAL USER FORKING ENGINE ──
    if (isSystemTemplate) {
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newTemplateId = `FW-USER-${randomSuffix}`;

      if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
        await supabaseAdmin
          .from('quotation_templates')
          .update({ is_default: false })
          .eq('workspace_id', workspaceId)
          .not('is_system_template', 'eq', true);
      } else {
        await supabaseAdmin
          .from('quotation_templates')
          .update({ is_default: false })
          .eq('user_id', userId)
          .not('is_system_template', 'eq', true);
      }

      const clonedDoc = JSON.parse(JSON.stringify(document || { meta: {}, pages: [] }));
      if (Array.isArray(clonedDoc.pages)) {
        clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
          ...page,
          id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`
        }));
      }

      const newTitle = title || clonedDoc.designName || 'Customized Wedding Template';

      await supabaseAdmin
        .from('quotation_templates')
        .insert({
          id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          title: newTitle,
          category: category || targetTmpl?.category || 'Wedding',
          is_system_template: false,
          is_default: true,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      await supabaseAdmin
        .from('quotation_documents')
        .insert({
          template_id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          content_json: clonedDoc,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return NextResponse.json({
        success: true,
        isAutoCloned: true,
        newTemplateId: newTemplateId,
        version: 1
      });
    }

    // ── LEAD QUOTATION VERSION AUTO-FORKING ENGINE ──
    // If editing a document linked to a lead (e.g. FW-Q-* or document.lead_id), auto-fork into a NEW version (V3)!
    const targetDocRes = await supabaseAdmin
      .from('quotation_documents')
      .select('lead_id, lead_version, version, content_json')
      .eq('template_id', id)
      .maybeSingle();

    const targetDoc = targetDocRes?.data;
    const targetLeadId = document?.lead_id || targetDoc?.lead_id || (id.startsWith('FW-Q-') || id.startsWith('FW-L-') ? id.split('-')[2] : null);

    if (targetLeadId) {
      const leadShortId = targetLeadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

      const { data: existingDocs } = await supabaseAdmin
        .from('quotation_documents')
        .select('version, lead_version, content_json')
        .or(`lead_id.eq.${targetLeadId},template_id.ilike.%${leadShortId}%`);

      let maxVersion = 0;
      (existingDocs || []).forEach((d: any) => {
        const v = d.lead_version || d.content_json?.lead_version || d.version || 0;
        if (v > maxVersion) maxVersion = v;
      });

      const nextVersion = maxVersion + 1;
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newVersionTemplateId = `FW-Q-${leadShortId}-V${nextVersion}-${randomSuffix}`;

      const clonedDoc = JSON.parse(JSON.stringify(document || { meta: {}, pages: [] }));
      clonedDoc.lead_id = targetLeadId;
      clonedDoc.lead_version = nextVersion;

      await supabaseAdmin
        .from('quotation_documents')
        .insert({
          template_id: newVersionTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          lead_id: targetLeadId,
          lead_version: nextVersion,
          version: nextVersion,
          content_json: clonedDoc,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      (async () => {
        try {
          await supabaseAdmin.from('quotations').insert({
            quotation_number: newVersionTemplateId,
            workspace_id: workspaceId,
            user_id: userId,
            title: title || clonedDoc.designName || 'Wedding Quotation',
            client_name: clonedDoc.cover?.coupleName || 'Valued Client',
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } catch (e) {}
      })();

      return NextResponse.json({
        success: true,
        isAutoCloned: true,
        newTemplateId: newVersionTemplateId,
        version: nextVersion
      });
    }

    // Normal User editing their master/standalone template
    const newTitle = title || document?.designName || targetTmpl?.title || 'Wedding - Design 1';

    await supabaseAdmin
      .from('quotation_templates')
      .update({
        title: newTitle,
        category: category || targetTmpl?.category || 'Wedding',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (document) {
      await supabaseAdmin
        .from('quotation_documents')
        .upsert({
          template_id: id,
          workspace_id: workspaceId,
          user_id: userId,
          content_json: document,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });

      await supabaseAdmin
        .from('quotations')
        .update({
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${id},quotation_number.eq.${id}`);
    }

    return NextResponse.json({
      success: true,
      templateId: id,
      version: body.version || 1
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
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!isSuperAdmin && (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === GLOBAL_SYSTEM_TEMPLATE_ID)) {
      return NextResponse.json({ error: 'System templates cannot be deleted by normal users.' }, { status: 403 });
    }

    if (!isSuperAdmin && targetTmpl?.is_default) {
      return NextResponse.json({
        error: 'Cannot delete your current Default Template. Please set another template as Default first.'
      }, { status: 400 });
    }

    console.log('[PERMANENT DELETE EXECUTED]', { id, isSuperAdmin });

    await supabaseAdmin.from('quotation_documents').delete().eq('template_id', id);
    await supabaseAdmin.from('quotations').delete().or(`id.eq.${id},quotation_number.eq.${id}`);
    await supabaseAdmin.from('quotation_templates').delete().eq('id', id);

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

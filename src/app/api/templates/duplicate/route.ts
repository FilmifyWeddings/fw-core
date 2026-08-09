import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

/**
 * Authoritative Route to Duplicate Any Template
 * Deep clones the requested template, generates fresh IDs,
 * handles Super Admin system template creation & user workspace cloning.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    const body = await req.json().catch(() => ({}));
    const { sourceTemplateId } = body;

    if (!sourceTemplateId) {
      return NextResponse.json({ error: 'sourceTemplateId is required' }, { status: 400 });
    }

    // 1. Fetch Source Template Metadata
    const { data: sourceTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', sourceTemplateId)
      .maybeSingle();

    // 2. Fetch Source Document JSON
    const { data: sourceDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', sourceTemplateId)
      .maybeSingle();

    let docJson = sourceDoc?.document_json || sourceDoc?.content_json;

    // Fallback for system template if document not found in DB
    if (!docJson && (sourceTemplateId === GLOBAL_SYSTEM_TEMPLATE_ID || sourceTmpl?.is_system_template)) {
      docJson = DEFAULT_AIRY_PROPOSAL;
    }

    if (!docJson) {
      return NextResponse.json({ error: 'Source template document content not found' }, { status: 404 });
    }

    const title = `${sourceTmpl?.title || docJson.designName || 'Quotation Template'} (Copy)`;

    // Deep clone document JSON and generate fresh unique custom page IDs
    const clonedDoc = JSON.parse(JSON.stringify(docJson));
    clonedDoc.designName = title;

    if (clonedDoc.customPages && typeof clonedDoc.customPages === 'object') {
      const regeneratedCustomPages: Record<string, any> = {};
      Object.entries(clonedDoc.customPages).forEach(([oldId, pageObj]: [string, any]) => {
        const newPageId = `custom_page_${Math.random().toString(36).substring(2, 8)}`;
        regeneratedCustomPages[newPageId] = { ...pageObj, id: newPageId };
        if (Array.isArray(clonedDoc.pageSequence)) {
          clonedDoc.pageSequence = clonedDoc.pageSequence.map((seqId: string) => seqId === oldId ? newPageId : seqId);
        }
      });
      clonedDoc.customPages = regeneratedCustomPages;
    }

    // ── SUPER ADMIN DUPLICATION ENGINE ──
    if (isSuperAdmin) {
      const newSystemId = `SYS-WEDDING-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: newTmpl, error: tmplInsErr } = await supabaseAdmin
        .from('quotation_templates')
        .insert({
          id: newSystemId,
          workspace_id: null,
          user_id: 'SYSTEM',
          title,
          category: sourceTmpl?.category || 'Wedding',
          is_system_template: true,
          is_default: false,
          is_global_default: false,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tmplInsErr) {
        console.error('Error creating duplicated system template:', tmplInsErr);
        return NextResponse.json({ error: tmplInsErr.message }, { status: 500 });
      }

      await supabaseAdmin
        .from('quotation_documents')
        .insert({
          template_id: newSystemId,
          workspace_id: null,
          user_id: 'SYSTEM',
          content_json: clonedDoc,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log('[Super Admin Duplicated System Template]:', { sourceId: sourceTemplateId, newSystemId });

      return NextResponse.json({
        success: true,
        newTemplateId: newSystemId,
        template: newTmpl
      });
    }

    // ── NORMAL USER WORKSPACE DUPLICATION ENGINE ──
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newTemplateId = `FW-USER-${randomSuffix}`;

    const { data: newTmpl, error: tmplInsErr } = await supabaseAdmin
      .from('quotation_templates')
      .insert({
        id: newTemplateId,
        workspace_id: workspaceId,
        user_id: userId,
        title,
        category: sourceTmpl?.category || 'Wedding',
        is_system_template: false,
        is_default: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tmplInsErr) {
      console.error('Error inserting duplicated user template:', tmplInsErr);
      return NextResponse.json({ error: tmplInsErr.message }, { status: 500 });
    }

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
      newTemplateId: newTemplateId,
      template: newTmpl
    });
  } catch (error: any) {
    console.error('Error in template duplication:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

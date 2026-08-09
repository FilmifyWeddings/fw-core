import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

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

    const { data: sourceTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const { data: sourceDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    if (!sourceTmpl && !sourceDoc) {
      return NextResponse.json({ error: 'Source System Template not found' }, { status: 404 });
    }

    const newSystemId = `SYS-WEDDING-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const baseContent = sourceDoc?.document_json || sourceDoc?.content_json || DEFAULT_AIRY_PROPOSAL;
    const clonedDoc = JSON.parse(JSON.stringify(baseContent));

    if (clonedDoc.customPages && typeof clonedDoc.customPages === 'object') {
      const regeneratedCustomPages: Record<string, any> = {};
      Object.entries(clonedDoc.customPages).forEach(([oldId, pageObj]: [string, any]) => {
        const newPageId = `custom_page_${Math.random().toString(36).substring(2, 8)}`;
        regeneratedCustomPages[newPageId] = {
          ...pageObj,
          id: newPageId
        };
        if (Array.isArray(clonedDoc.pageSequence)) {
          clonedDoc.pageSequence = clonedDoc.pageSequence.map((seqId: string) => seqId === oldId ? newPageId : seqId);
        }
      });
      clonedDoc.customPages = regeneratedCustomPages;
    }

    const newTitle = `${sourceTmpl?.title || clonedDoc?.meta?.title || 'System Default Wedding Template'} (Copy)`;

    const { data: newTmpl, error: tmplErr } = await supabaseAdmin
      .from('quotation_templates')
      .insert({
        id: newSystemId,
        workspace_id: null,
        user_id: 'SYSTEM',
        title: newTitle,
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

    if (tmplErr) {
      console.error('[Duplicate System Template Error]:', tmplErr);
      return NextResponse.json({ error: tmplErr.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('quotation_documents')
      .insert({
        template_id: newSystemId,
        workspace_id: null,
        user_id: 'SYSTEM',
        document_json: clonedDoc,
        content_json: clonedDoc,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    console.log('[System Template Duplicated]:', { sourceId: id, newSystemId });

    return NextResponse.json({
      success: true,
      newSystemId,
      template: newTmpl
    });
  } catch (error: any) {
    console.error('Error duplicating system template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

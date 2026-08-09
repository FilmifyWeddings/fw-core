import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Route to Duplicate Any Template
 * Deep clones the exact template requested, generates fresh template ID + fresh page IDs,
 * saves to Supabase under current workspace as an independent template (is_default = false).
 */
export async function POST(req: NextRequest) {
  try {
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
    const { sourceTemplateId } = body;

    if (!sourceTemplateId) {
      return NextResponse.json({ error: 'sourceTemplateId is required' }, { status: 400 });
    }

    // 1. Fetch Source Template Metadata
    const { data: sourceTmpl } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', sourceTemplateId)
      .maybeSingle();

    // 2. Fetch Source Document JSON
    const { data: sourceDoc } = await supabase
      .from('quotation_documents')
      .select('*')
      .eq('template_id', sourceTemplateId)
      .maybeSingle();

    let docJson = sourceDoc?.document_json;

    // Fallback for system template if document not found in DB
    if (!docJson && (sourceTemplateId === GLOBAL_SYSTEM_TEMPLATE_ID || sourceTmpl?.is_system_template)) {
      docJson = {
        meta: { title: 'System Default Wedding Template', currency: 'INR' },
        pages: []
      };
    }

    if (!docJson) {
      return NextResponse.json({ error: 'Source template document content not found' }, { status: 404 });
    }

    // Generate fresh unique Template ID
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newTemplateId = `FW-USER-${randomSuffix}`;

    // Deep clone document JSON and generate fresh unique page IDs
    const clonedDoc = JSON.parse(JSON.stringify(docJson));
    if (Array.isArray(clonedDoc.pages)) {
      clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
        ...page,
        id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`,
      }));
    }

    const title = `${sourceTmpl?.title || 'Quotation Template'} (Copy)`;

    // Insert new user template metadata into Supabase
    const { data: newTmpl, error: tmplInsErr } = await supabase
      .from('quotation_templates')
      .insert({
        id: newTemplateId,
        workspace_id: workspaceId,
        user_id: userId,
        title,
        category: sourceTmpl?.category || 'Wedding',
        is_system_template: false,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tmplInsErr) {
      console.error('Error inserting duplicated template:', tmplInsErr);
      return NextResponse.json({ error: tmplInsErr.message }, { status: 500 });
    }

    // Insert new user template document into Supabase
    const { error: docInsErr } = await supabase
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

    if (docInsErr) {
      console.error('Error inserting duplicated template document:', docInsErr);
    }

    return NextResponse.json({
      success: true,
      template: newTmpl,
      newTemplateId
    });
  } catch (error: any) {
    console.error('Error in template duplicate API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

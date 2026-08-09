import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function getUniqueDesignName(requestedName: string, existingNames: string[]): string {
  const cleanName = (requestedName || 'Wedding - Design 1').trim();
  const baseName = cleanName
    .replace(/\s*\(?Copy\s*\d*\)?$/i, '')
    .trim() || 'Wedding - Design 1';

  let candidate = `${baseName} Copy`;
  if (!existingNames.includes(candidate)) {
    return candidate;
  }

  let counter = 2;
  while (existingNames.includes(`${baseName} Copy ${counter}`)) {
    counter++;
  }
  return `${baseName} Copy ${counter}`;
}

// POST /api/templates/duplicate - Multi-Tenant Atomic Template Duplication with User Isolation
export async function POST(req: NextRequest) {
  try {
    const { sourceTemplateId } = await req.json();
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId = 'demo_user';
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!sourceTemplateId) {
      return NextResponse.json({ error: 'Source template ID is required' }, { status: 400 });
    }

    // 1. Verify source template permissions
    const { data: sourceTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, is_system_template, title')
      .eq('id', sourceTemplateId)
      .maybeSingle();

    const isSystemSource = sourceTemplateId === 'FW-37C63A54D4' || sourceTemplateId === 'SYSTEM_DEFAULT_WEDDING' || sourceTmpl?.is_system_template || sourceTmpl?.user_id === 'SYSTEM';

    if (!isSystemSource && sourceTmpl && sourceTmpl.user_id && sourceTmpl.user_id !== userId && sourceTmpl.user_id !== 'demo_user') {
      return NextResponse.json(
        { error: 'Access denied: You cannot duplicate another user\'s private template.', isForbidden: true },
        { status: 403 }
      );
    }

    // 2. Fetch existing template titles for user to ensure unique title generation
    const { data: userTemplates } = await supabaseAdmin
      .from('quotation_templates')
      .select('title')
      .eq('user_id', userId);

    const { data: userQuotes } = await supabaseAdmin
      .from('quotations')
      .select('title')
      .eq('workspace_id', userId);

    const existingTitles = Array.from(new Set([
      ...(userTemplates || []).map(t => t.title),
      ...(userQuotes || []).map(q => q.title)
    ].filter(Boolean)));

    // 3. Fetch source document JSON
    let sourceJson: any = null;
    const { data: sourceDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('content_json')
      .eq('template_id', sourceTemplateId)
      .maybeSingle();

    if (sourceDoc?.content_json) {
      sourceJson = sourceDoc.content_json;
    } else {
      const { data: legacy } = await supabaseAdmin
        .from('quotations')
        .select('content_json, title')
        .or(`id.eq.${sourceTemplateId},quotation_number.eq.${sourceTemplateId}`)
        .maybeSingle();
      sourceJson = legacy?.content_json || null;
    }

    if (!sourceJson || Object.keys(sourceJson).length === 0) {
      const { data: globalDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', 'FW-37C63A54D4')
        .maybeSingle();
      sourceJson = globalDoc?.content_json || {
        theme: 'cyprus-sand-dune',
        primaryFont: 'Cormorant Garamond',
        secondaryFont: 'Plus Jakarta Sans',
        designName: sourceTmpl?.title || 'Wedding - Design 1',
        cover: {
          coupleName: 'Rahul & Neha',
          eventType: 'WEDDING',
          eventDate: 'DECEMBER 2026',
          location: 'MUMBAI',
          brandName: 'FILMIFY WEDDINGS'
        }
      };
    }

    const baseTitle = sourceTmpl?.title || sourceJson?.designName || 'Wedding - Design 1';
    const uniqueTitle = getUniqueDesignName(baseTitle, existingTitles);

    const newTemplateId = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const now = new Date().toISOString();

    // 4. DEEP CLONE (No shared mutable nested object references)
    const duplicatedJson = typeof structuredClone === 'function'
      ? structuredClone(sourceJson)
      : JSON.parse(JSON.stringify(sourceJson));

    duplicatedJson.id = newTemplateId;
    duplicatedJson.designName = uniqueTitle;

    // Regenerate unique page IDs for new template
    if (Array.isArray(duplicatedJson.pageSequence)) {
      duplicatedJson.pageSequence = duplicatedJson.pageSequence.map((p: any) => ({
        ...p,
        id: 'page_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    if (Array.isArray(duplicatedJson.customPages)) {
      duplicatedJson.customPages = duplicatedJson.customPages.map((cp: any) => ({
        ...cp,
        id: 'cpage_' + Math.random().toString(36).substring(2, 9)
      }));
    }

    // 5. Insert new template record owned by current user
    const { data: newTemplate, error: tmplErr } = await supabaseAdmin
      .from('quotation_templates')
      .insert({
        id: newTemplateId,
        user_id: userId,
        title: uniqueTitle,
        category: duplicatedJson?.eventGroup || 'Wedding',
        is_system_template: false,
        is_default: false,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (tmplErr) throw tmplErr;

    // 6. Insert new document record
    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('quotation_documents')
      .insert({
        template_id: newTemplateId,
        user_id: userId,
        version: 1,
        content_json: duplicatedJson,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (docErr) throw docErr;

    // 7. Insert initial version history record
    if (newDoc?.id) {
      await supabaseAdmin.from('quotation_versions').insert({
        document_id: newDoc.id,
        template_id: newTemplateId,
        user_id: userId,
        version: 1,
        content_json: duplicatedJson,
        created_at: now
      });
    }

    // Also sync to legacy quotations table for full backwards compatibility
    await supabaseAdmin.from('quotations').insert({
      workspace_id: userId,
      quotation_number: newTemplateId,
      title: uniqueTitle,
      client_name: `${duplicatedJson?.cover?.coupleName || duplicatedJson?.cover?.groomName || 'Rahul & Neha'}`,
      content_json: duplicatedJson,
      status: 'draft',
      created_at: now,
      updated_at: now
    });

    const quotationObject = {
      id: newTemplateId,
      quotation_number: newTemplateId,
      title: uniqueTitle,
      client_name: `${duplicatedJson?.cover?.coupleName || duplicatedJson?.cover?.groomName || 'Rahul & Neha'}`,
      content_json: duplicatedJson,
      is_default: false,
      is_system_template: false,
      updated_at: now
    };

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully.',
      newTemplateId,
      quotation: quotationObject,
      document: newDoc,
      template: newTemplate
    });
  } catch (err: any) {
    console.error('[POST /api/templates/duplicate] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

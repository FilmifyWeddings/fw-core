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
    candidate = `${baseName} Copy ${counter}`;
  }
  return candidate;
}

// POST /api/templates/duplicate - Instant Template Duplication with Unique Name Auto-Increment
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

    // 1. Fetch all existing template titles for this user to enforce unique name validation
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

    // 2. Fetch source template document
    let sourceJson: any = null;
    const { data: sourceDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('content_json')
      .eq('template_id', sourceTemplateId)
      .maybeSingle();

    if (sourceDoc?.content_json) {
      sourceJson = sourceDoc.content_json;
    } else {
      // Fallback query to legacy quotations table
      const { data: legacy } = await supabaseAdmin
        .from('quotations')
        .select('content_json, title')
        .or(`id.eq.${sourceTemplateId},quotation_number.eq.${sourceTemplateId}`)
        .maybeSingle();
      sourceJson = legacy?.content_json || {};
    }

    const baseTitle = sourceJson?.designName || 'Wedding - Design 1';
    const uniqueTitle = getUniqueDesignName(baseTitle, existingTitles);

    const newTemplateId = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const now = new Date().toISOString();

    // Deep clone source document JSON
    const duplicatedJson = typeof structuredClone === 'function'
      ? structuredClone(sourceJson)
      : JSON.parse(JSON.stringify(sourceJson));

    duplicatedJson.id = newTemplateId;
    duplicatedJson.designName = uniqueTitle;

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

    // 3. Insert new template record
    const { data: newTemplate } = await supabaseAdmin.from('quotation_templates').insert({
      id: newTemplateId,
      user_id: userId,
      title: uniqueTitle,
      category: sourceJson?.eventGroup || 'Wedding',
      created_at: now,
      updated_at: now
    }).select().single();

    // 4. Insert new document record
    const { data: newDoc } = await supabaseAdmin.from('quotation_documents').insert({
      template_id: newTemplateId,
      user_id: userId,
      version: 1,
      content_json: duplicatedJson,
      created_at: now,
      updated_at: now
    }).select().single();

    // 5. Insert initial version history record
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
      updated_at: now
    };

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully.',
      newTemplateId,
      quotation: quotationObject,
      document: newDoc
    });
  } catch (err: any) {
    console.error('[POST /api/templates/duplicate] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

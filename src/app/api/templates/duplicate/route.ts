import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/templates/duplicate - Duplicate template into a new independent cloud document
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

    // 1. Fetch source template document
    const { data: sourceDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('content_json')
      .eq('template_id', sourceTemplateId)
      .maybeSingle();

    const sourceJson = sourceDoc?.content_json || {};
    const newTemplateId = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const now = new Date().toISOString();

    const duplicatedJson = {
      ...sourceJson,
      designName: (sourceJson.designName || 'Wedding - Design 1') + ' (Copy)'
    };

    // 2. Create new template
    await supabaseAdmin.from('quotation_templates').insert({
      id: newTemplateId,
      user_id: userId,
      title: duplicatedJson.designName,
      created_at: now,
      updated_at: now
    });

    // 3. Create new document
    const { data: newDoc } = await supabaseAdmin.from('quotation_documents').insert({
      template_id: newTemplateId,
      user_id: userId,
      version: 1,
      content_json: duplicatedJson,
      created_at: now,
      updated_at: now
    }).select().single();

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully.',
      newTemplateId,
      document: newDoc
    });
  } catch (err: any) {
    console.error('[POST /api/templates/duplicate] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/templates/restore - Restore document to a target version from history
export async function POST(req: NextRequest) {
  try {
    const { templateId, version } = await req.json();

    if (!templateId || !version) {
      return NextResponse.json({ error: 'templateId and version are required' }, { status: 400 });
    }

    // 1. Fetch target version record
    const { data: versionRecord } = await supabaseAdmin
      .from('quotation_versions')
      .select('content_json, user_id')
      .eq('template_id', templateId)
      .eq('version', version)
      .maybeSingle();

    if (!versionRecord) {
      return NextResponse.json({ error: 'Target version not found' }, { status: 444 });
    }

    // 2. Fetch current document to get next version index
    const { data: currentDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('version')
      .eq('template_id', templateId)
      .maybeSingle();

    const nextVersion = (currentDoc?.version || 0) + 1;
    const now = new Date().toISOString();

    // 3. Update document with restored content
    const { data: restoredDoc } = await supabaseAdmin
      .from('quotation_documents')
      .upsert({
        template_id: templateId,
        user_id: versionRecord.user_id,
        version: nextVersion,
        content_json: versionRecord.content_json,
        updated_at: now
      }, { onConflict: 'template_id' })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: `Restored template to version ${version}.`,
      version: nextVersion,
      document: restoredDoc
    });
  } catch (err: any) {
    console.error('[POST /api/templates/restore] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

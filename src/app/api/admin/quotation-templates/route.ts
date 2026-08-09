import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminRequest } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    const { data: templates, error } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('is_system_template', true)
      .order('is_global_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Templates Fetch Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, templates: templates || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Access Denied: Super Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = body.title || 'System Default Wedding Template';
    const category = body.category || 'Wedding';

    const newSystemId = `SYS-WEDDING-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: newTmpl, error: tmplErr } = await supabaseAdmin
      .from('quotation_templates')
      .insert({
        id: newSystemId,
        workspace_id: null,
        user_id: 'SYSTEM',
        title,
        category,
        is_system_template: true,
        is_default: false,
        is_global_default: false,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tmplErr) {
      console.error('[Admin Create System Template Error]:', tmplErr);
      return NextResponse.json({ error: tmplErr.message }, { status: 500 });
    }

    const initialDoc = DEFAULT_AIRY_PROPOSAL;
    await supabaseAdmin
      .from('quotation_documents')
      .insert({
        template_id: newSystemId,
        workspace_id: null,
        user_id: 'SYSTEM',
        content_json: initialDoc,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      newSystemId,
      template: newTmpl
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

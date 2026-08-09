import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// GET /api/templates/[id] - Fetch single cloud document JSON with Multi-Tenant Security & System Template Support
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;
    let userStudioName: string | null = null;

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        userStudioName = user.user_metadata?.studioName || user.user_metadata?.studio_name || null;
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const isSystemId = id === 'FW-37C63A54D4' || id === 'SYSTEM_DEFAULT_WEDDING' || id === 'SYSTEM_DEFAULT';

    // 1. Check quotation_templates first to verify system template status
    const { data: tmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, is_system_template, is_default')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = isSystemId || tmpl?.is_system_template || tmpl?.user_id === 'SYSTEM';

    // 2. Query quotation_documents table
    let { data: doc, error: docErr } = await supabaseAdmin
      .from('quotation_documents')
      .select('*')
      .eq('template_id', id)
      .maybeSingle();

    if (!doc && id === '1' && userId) {
      // Fallback for default route '1': fetch user's single active document
      const { data: userDocs } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (userDocs && userDocs.length > 0) {
        doc = userDocs[0];
      }
    }

    // 3. Legacy fallback to quotations table if quotation_documents is not populated yet
    if (!doc) {
      const { data: legacy } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .maybeSingle();

      if (legacy) {
        doc = {
          id: legacy.id || id,
          template_id: legacy.quotation_number || id,
          user_id: legacy.workspace_id,
          version: 1,
          content_json: legacy.content_json,
          updated_at: legacy.updated_at
        };
      }
    }

    if (doc) {
      // Security User Isolation Check: System templates are public-read; private user templates require ownership
      const isOwner = userId && doc.user_id && (doc.user_id === userId || doc.user_id === 'demo_user');
      const isSystemDoc = isSystemTemplate || doc.user_id === 'SYSTEM';

      if (!isSystemDoc && !isOwner) {
        return NextResponse.json(
          { error: 'Access denied: You do not own this quotation template.', isForbidden: true },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        document: doc,
        version: doc.version || 1,
        isSystemTemplate: isSystemDoc,
        userStudioName
      });
    }

    return NextResponse.json({
      success: true,
      document: null,
      isSystemTemplate: isSystemTemplate,
      message: 'Template not found, initialize fresh document.',
      userStudioName
    });
  } catch (err: any) {
    console.error('[GET /api/templates/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/templates/[id] - Save cloud document JSON with System Template Auto-Cloning Guard
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content_json, version: expectedVersion, user_id } = body;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let currentUserId = user_id || 'demo_user';

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    // 1. Fetch target template record to check ownership & system status
    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, is_system_template')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === 'FW-37C63A54D4' || id === 'SYSTEM_DEFAULT_WEDDING' || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM';

    let targetTemplateId = id;
    let isAutoCloned = false;

    // SYSTEM TEMPLATE MUTATION GUARD: Normal users editing system templates get an auto-cloned user-owned template
    if (isSystemTemplate) {
      targetTemplateId = 'FW-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      isAutoCloned = true;
    } else if (targetTmpl && targetTmpl.user_id && targetTmpl.user_id !== currentUserId && targetTmpl.user_id !== 'demo_user') {
      // User Isolation Guard for non-system templates
      return NextResponse.json(
        { error: 'Access denied: You cannot modify another user\'s template.', isForbidden: true },
        { status: 403 }
      );
    }

    // 2. Fetch current document for optimistic concurrency locking
    const { data: currentDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, version, user_id')
      .eq('template_id', targetTemplateId)
      .maybeSingle();

    const nextVersion = Math.max(currentDoc?.version || 0, expectedVersion || 0) + 1;
    const now = new Date().toISOString();

    const updatedContentJson = { ...content_json, id: targetTemplateId };

    // 3. Upsert quotation_templates
    await supabaseAdmin
      .from('quotation_templates')
      .upsert({
        id: targetTemplateId,
        user_id: currentUserId,
        title: updatedContentJson?.designName || 'Wedding - Design 1',
        is_system_template: false,
        updated_at: now
      }, { onConflict: 'id' });

    // 4. Upsert quotation_documents
    const docPayload = {
      template_id: targetTemplateId,
      user_id: currentUserId,
      version: nextVersion,
      content_json: updatedContentJson,
      updated_at: now
    };

    const { data: savedDoc } = await supabaseAdmin
      .from('quotation_documents')
      .upsert(docPayload, { onConflict: 'template_id' })
      .select()
      .maybeSingle();

    // 5. Append row to quotation_versions history
    if (savedDoc?.id) {
      await supabaseAdmin.from('quotation_versions').insert({
        document_id: savedDoc.id,
        template_id: targetTemplateId,
        user_id: currentUserId,
        version: nextVersion,
        content_json: updatedContentJson,
        created_at: now
      });
    }

    // 6. Also sync to legacy quotations table for full backwards compatibility
    await supabaseAdmin.from('quotations').upsert({
      workspace_id: currentUserId,
      quotation_number: targetTemplateId,
      title: updatedContentJson?.designName || 'Wedding - Design 1',
      client_name: `${updatedContentJson?.cover?.groomName || 'Rahul'} & ${updatedContentJson?.cover?.brideName || 'Neha'}`,
      content_json: updatedContentJson,
      status: 'draft',
      updated_at: now
    }, { onConflict: 'workspace_id,quotation_number' });

    return NextResponse.json({
      success: true,
      message: isAutoCloned ? 'System template cloned to personal workspace.' : 'Cloud document autosaved successfully.',
      isAutoCloned,
      newTemplateId: targetTemplateId,
      version: nextVersion,
      document: savedDoc || docPayload
    });
  } catch (err: any) {
    console.error('[PATCH /api/templates/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete template & document with system template protection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, is_system_template')
      .eq('id', id)
      .maybeSingle();

    if (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === 'FW-37C63A54D4') {
      return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 403 });
    }

    if (targetTmpl && targetTmpl.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await supabaseAdmin
      .from('quotation_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    await supabaseAdmin
      .from('quotation_documents')
      .delete()
      .eq('template_id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

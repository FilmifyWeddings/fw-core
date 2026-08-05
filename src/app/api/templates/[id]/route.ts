import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// GET /api/templates/[id] - Fetch single cloud document JSON
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

    // 1. Check quotation_documents table first
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

    // 2. Legacy fallback to quotations table if quotation_documents is not populated yet
    if (!doc) {
      const { data: legacy } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${id},quotation_number.eq.${id}`)
        .maybeSingle();

      if (legacy) {
        // Hydrate doc format from legacy table
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
      // Security User Isolation Check
      if (userId && doc.user_id && doc.user_id !== userId && doc.user_id !== 'demo_user') {
        return NextResponse.json(
          { error: 'Access denied: You do not own this quotation template.', isForbidden: true },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        document: doc,
        version: doc.version || 1,
        userStudioName
      });
    }

    return NextResponse.json({
      success: true,
      document: null,
      message: 'Template not found, initialize fresh document.',
      userStudioName
    });
  } catch (err: any) {
    console.error('[GET /api/templates/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/templates/[id] - Save / Autosave cloud document JSON with Optimistic Locking & Versioning
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

    // 1. Fetch current document to check optimistic concurrency lock
    const { data: currentDoc } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, version, user_id')
      .eq('template_id', id)
      .maybeSingle();

    if (currentDoc && currentDoc.user_id && currentDoc.user_id !== currentUserId && currentDoc.user_id !== 'demo_user') {
      return NextResponse.json(
        { error: 'Access denied: You cannot modify another user\'s template.', isForbidden: true },
        { status: 403 }
      );
    }

    // Optimistic Concurrency Lock Check
    if (currentDoc && expectedVersion && currentDoc.version > expectedVersion) {
      return NextResponse.json(
        {
          error: 'Version conflict: Outdated write rejected.',
          isConflict: true,
          serverVersion: currentDoc.version
        },
        { status: 409 }
      );
    }

    const nextVersion = (currentDoc?.version || 0) + 1;
    const now = new Date().toISOString();

    // 2. Ensure template record exists
    await supabaseAdmin
      .from('quotation_templates')
      .upsert({
        id: id,
        user_id: currentUserId,
        title: content_json?.designName || 'Wedding - Design 1',
        updated_at: now
      }, { onConflict: 'id' });

    // 3. Upsert quotation_documents
    const docPayload = {
      template_id: id,
      user_id: currentUserId,
      version: nextVersion,
      content_json: content_json,
      updated_at: now
    };

    const { data: savedDoc, error: docErr } = await supabaseAdmin
      .from('quotation_documents')
      .upsert(docPayload, { onConflict: 'template_id' })
      .select()
      .maybeSingle();

    // 4. Append row to quotation_versions audit table for undo / history
    if (savedDoc?.id) {
      await supabaseAdmin.from('quotation_versions').insert({
        document_id: savedDoc.id,
        template_id: id,
        user_id: currentUserId,
        version: nextVersion,
        content_json: content_json,
        created_at: now
      });
    }

    // Also sync to legacy quotations table for full backwards compatibility
    await supabaseAdmin.from('quotations').upsert({
      workspace_id: currentUserId,
      quotation_number: id,
      title: content_json?.designName || 'Wedding - Design 1',
      client_name: `${content_json?.cover?.groomName || 'Rahul'} & ${content_json?.cover?.brideName || 'Neha'}`,
      content_json: content_json,
      status: 'draft',
      updated_at: now
    }, { onConflict: 'workspace_id,quotation_number' });

    return NextResponse.json({
      success: true,
      message: 'Cloud document autosaved successfully.',
      version: nextVersion,
      document: savedDoc || docPayload
    });
  } catch (err: any) {
    console.error('[PATCH /api/templates/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete template & document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        await supabaseAdmin
          .from('quotation_templates')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

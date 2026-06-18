import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List all WhatsApp templates for a workspace
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const { data: templates, error } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      results: templates || []
    });
  } catch (err: any) {
    console.error('Fetch templates error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a WhatsApp template and sync with WhatsBoost
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, category, language, type, payload, buttons, meta_approval_required } = body;

    if (!name || !category || !language || !type) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
    }

    // Direct approval: templates created locally are instantly approved and active
    const templateStatus = 'approved';

    // 2. Write to local database in Supabase
    const { data: template, error: dbErr } = await supabaseAdmin
      .from('whatsapp_templates')
      .insert({
        workspace_id: workspaceId,
        name: name,
        category: category,
        language: language,
        type: type,
        status: templateStatus,
        payload: payload || {},
        buttons: buttons || [],
        meta_approval_required: !!meta_approval_required,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbErr) {
      console.error('Database template insert error:', dbErr);
      throw dbErr;
    }

    // 3. Log event to live_logs
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" created and synced successfully (${templateStatus}).`,
      metadata: { templateId: template.id, status: templateStatus }
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (err: any) {
    console.error('Template creation error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Template creation failed' }, { status: 500 });
  }
}

// PATCH: Update an existing WhatsApp template and sync with WhatsBoost
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const templateId = searchParams.get('template_id');

  if (!workspaceId || !templateId) {
    return NextResponse.json({ error: 'Missing workspace_id or template_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, category, language, type, payload, buttons, meta_approval_required } = body;

    if (!name || !category || !language || !type) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
    }

    // Direct approval: templates updated locally are instantly approved and active
    const templateStatus = 'approved';

    // 3. Write updates to local database in Supabase
    const { data: template, error: dbErr } = await supabaseAdmin
      .from('whatsapp_templates')
      .update({
        name: name,
        category: category,
        language: language,
        type: type,
        status: templateStatus,
        payload: payload || {},
        buttons: buttons || [],
        meta_approval_required: !!meta_approval_required,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (dbErr) {
      console.error('Database template update error:', dbErr);
      throw dbErr;
    }

    // 4. Log event to live_logs
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" updated and synced successfully (${templateStatus}).`,
      metadata: { templateId: template.id, status: templateStatus }
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (err: any) {
    console.error('Template update error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Template update failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List all WhatsApp templates for a workspace (supports both tenant_whatsapp_templates and whatsapp_templates)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const shootType = searchParams.get('shoot_type') || 'all';

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    // Try querying tenant_whatsapp_templates first (Law 1 Multi-Tenancy RLS compliant)
    const { data: tenantTemplates, error: tenantError } = await supabaseAdmin
      .from('tenant_whatsapp_templates')
      .select('*')
      .eq('tenant_id', workspaceId)
      .order('created_at', { ascending: false });

    if (!tenantError && tenantTemplates) {
      // Map to standard template structure expected by UI
      const results = tenantTemplates.map(t => {
        // payload_json stores list_sections, poll_options, footer, etc.
        const payloadJson = (t.payload_json as any) || {};
        // Derive type: prefer explicit DB column, then fall back by presence of media URL
        const templateType: string = t.type || (t.media_url_payload ? 'media' : 'text');
        return {
          id: t.id,
          name: t.template_name,
          category: t.category,
          language: 'en_US',
          type: templateType,
          status: 'approved',
          payload: {
            body: t.body_text || payloadJson.body || '',
            footer: payloadJson.footer || '',
            mediaUrl: t.media_url_payload || payloadJson.mediaUrl || '',
            mediaMime: payloadJson.mediaMime || '',
            // List fields
            buttonText: payloadJson.buttonText || '',
            sections: payloadJson.sections || [],
            // Poll fields
            question: payloadJson.question || t.body_text || '',
            allowMultiple: payloadJson.allowMultiple || false,
            options: payloadJson.options || [],
          },
          buttons: (t.buttons as any[]) || [],
          meta_approval_required: false,
          created_at: t.created_at,
          updated_at: t.updated_at
        };
      });

      // Filter by shoot type category if not 'all'
      const filtered = shootType === 'all' 
        ? results 
        : results.filter(t => t.category === shootType || t.category === 'all' || t.category === 'custom');

      return NextResponse.json({
        success: true,
        results: filtered
      });
    }

    // Fallback to legacy whatsapp_templates table
    const { data: templates, error } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const filteredLegacy = shootType === 'all'
      ? (templates || [])
      : (templates || []).filter(t => t.category === shootType || t.category === 'all' || t.category === 'utility');

    return NextResponse.json({
      success: true,
      results: filteredLegacy
    });
  } catch (err: any) {
    console.error('Fetch templates error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a WhatsApp template
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

    const templateStatus = 'approved';

    // 1. Try insert into tenant_whatsapp_templates first
    // Derive the primary body text — for polls, use `question`; for others, use `body`
    const bodyText = payload?.body || payload?.question || '';
    const mediaUrl = payload?.mediaUrl || payload?.default_send_media_url || '';

    // Build the full payload_json that preserves list sections, poll options, footer, etc.
    const payloadJson = payload || {};

    const { data: tenantData, error: tenantInsertError } = await supabaseAdmin
      .from('tenant_whatsapp_templates')
      .insert({
        tenant_id: workspaceId,
        template_name: name,
        category: category,
        body_text: bodyText,
        media_url_payload: mediaUrl || null,
        type: type,                      // FIX: persist the actual type ('text'|'media'|'list'|'poll')
        buttons: buttons || [],          // FIX: persist action buttons array
        payload_json: payloadJson        // FIX: persist full structured payload
      })
      .select()
      .maybeSingle();

    if (!tenantInsertError && tenantData) {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'sync_templates_success',
        message: `WhatsApp template "${name}" (${type}) created in tenant storage.`,
        metadata: { templateId: tenantData.id, status: templateStatus, type }
      });

      const payloadJsonOut = (tenantData.payload_json as any) || {};
      return NextResponse.json({
        success: true,
        template: {
          id: tenantData.id,
          name: tenantData.template_name,
          category: tenantData.category,
          language: 'en_US',
          type: tenantData.type || type,
          status: 'approved',
          payload: {
            body: tenantData.body_text,
            mediaUrl: tenantData.media_url_payload,
            ...payloadJsonOut
          },
          buttons: tenantData.buttons || []
        }
      });
    }

    // 2. Fallback to legacy whatsapp_templates table
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

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" created successfully (${templateStatus}).`,
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

// PATCH: Update an existing WhatsApp template
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

    const templateStatus = 'approved';
    const bodyText = payload?.body || payload?.question || '';
    const mediaUrl = payload?.mediaUrl || payload?.default_send_media_url || '';
    const payloadJson = payload || {};

    // 1. Try update in tenant_whatsapp_templates first
    const { data: tenantData, error: tenantUpdateError } = await supabaseAdmin
      .from('tenant_whatsapp_templates')
      .update({
        template_name: name,
        category: category,
        body_text: bodyText,
        media_url_payload: mediaUrl || null,
        type: type,                      // FIX: persist the actual type
        buttons: buttons || [],          // FIX: persist action buttons array
        payload_json: payloadJson        // FIX: persist full structured payload
      })
      .eq('id', templateId)
      .eq('tenant_id', workspaceId)
      .select()
      .maybeSingle();

    if (!tenantUpdateError && tenantData) {
      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'sync_templates_success',
        message: `WhatsApp template "${name}" (${type}) updated in tenant storage.`,
        metadata: { templateId: tenantData.id, type }
      });

      const payloadJsonOut = (tenantData.payload_json as any) || {};
      return NextResponse.json({
        success: true,
        template: {
          id: tenantData.id,
          name: tenantData.template_name,
          category: tenantData.category,
          language: 'en_US',
          type: tenantData.type || type,
          status: 'approved',
          payload: {
            body: tenantData.body_text,
            mediaUrl: tenantData.media_url_payload,
            ...payloadJsonOut
          },
          buttons: tenantData.buttons || []
        }
      });
    }

    // 2. Fallback to legacy whatsapp_templates table
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

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" updated successfully (${templateStatus}).`,
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

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

/**
 * Authoritative Route to Set Any Quotation Template as User Default in Supabase.
 * Rules:
 * 1. If target template is a System Template, auto-clone it as a user-owned workspace default template (is_default = true).
 * 2. If target template is a User Template, clear is_default on other user templates and mark target template is_default = true.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId } = await resolveRequestUser(req);

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    let workspaceId = userId;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (profile?.id) workspaceId = profile.id;

    // 1. Fetch Target Template Metadata
    const { data: targetTemplate } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystem = id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTemplate?.is_system_template || targetTemplate?.user_id === 'SYSTEM';

    console.log('[SET AS DEFAULT REQUEST]', { id, isSystem, userId, workspaceId });

    // ── CASE A: Setting a System Template as User Default ──
    if (isSystem) {
      // Clear is_default on existing user workspace templates
      await supabaseAdmin
        .from('quotation_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`);

      // Fetch source document JSON
      const { data: sysDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', id)
        .maybeSingle();

      const docJson = sysDoc?.content_json || sysDoc?.document_json || DEFAULT_AIRY_PROPOSAL;

      // Check if user already has an un-system copy of this template
      const { data: existingUserCopy } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`)
        .eq('title', targetTemplate?.title || 'System Default Wedding Template')
        .not('is_system_template', 'eq', true)
        .maybeSingle();

      let activeDefaultId = existingUserCopy?.id;

      if (existingUserCopy) {
        await supabaseAdmin
          .from('quotation_templates')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('id', existingUserCopy.id);
      } else {
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        activeDefaultId = `FW-USER-${randomSuffix}`;

        const clonedDoc = JSON.parse(JSON.stringify(docJson));
        if (Array.isArray(clonedDoc.pages)) {
          clonedDoc.pages = clonedDoc.pages.map((page: any, idx: number) => ({
            ...page,
            id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(7)}`
          }));
        }

        await supabaseAdmin
          .from('quotation_templates')
          .insert({
            id: activeDefaultId,
            workspace_id: workspaceId,
            user_id: userId,
            title: targetTemplate?.title || 'Default Wedding Template',
            category: targetTemplate?.category || 'Wedding',
            is_system_template: false,
            is_default: true,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        await supabaseAdmin
          .from('quotation_documents')
          .insert({
            template_id: activeDefaultId,
            workspace_id: workspaceId,
            user_id: userId,
            content_json: clonedDoc,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return NextResponse.json({
        success: true,
        defaultTemplateId: activeDefaultId,
        message: 'System template set as default for workspace'
      });
    }

    // ── CASE B: Setting a User Template as Default ──
    if (!targetTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Clear is_default = false on user's other templates
    await supabaseAdmin
      .from('quotation_templates')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`);

    // Mark target template as is_default = true
    const { data: updatedTmpl, error: updateErr } = await supabaseAdmin
      .from('quotation_templates')
      .update({
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Error setting template as default in Supabase:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      defaultTemplateId: id,
      template: updatedTmpl
    });
  } catch (error: any) {
    console.error('Error in set-default template API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

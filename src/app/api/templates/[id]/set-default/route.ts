import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

/**
 * Authoritative Route to Set Any Quotation Template as Active User Default in Supabase
 * Directly sets target template ID as default in DB & user metadata & profiles without altering target ID.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, userEmail } = await resolveRequestUser(req);

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

    console.log('[SET DEFAULT TEMPLATE REQUEST]', { id, userId, workspaceId, userEmail });

    // 1. Fetch target template metadata
    const { data: targetTemplate } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const isSystemTemplate = id === 'FW-2WT85Y0' || id === 'FW-37C63A54D4' || !!targetTemplate?.is_system_template || targetTemplate?.user_id === 'SYSTEM' || id.startsWith('SYS-');

    let finalTemplateId = id;

    if (isSystemTemplate) {
      // REQUIREMENT 3 & 13: System Templates must NOT be mutated or set as user default directly.
      // Fork the system template into an independent user template if user selects system template as default.
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      finalTemplateId = `FW-USER-${randomSuffix}`;

      // Fetch system template document content
      const { data: sysDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', id)
        .maybeSingle();

      const docContent = sysDoc?.content_json || sysDoc?.document_json;

      // Insert forked template record for user
      await supabaseAdmin
        .from('quotation_templates')
        .insert({
          id: finalTemplateId,
          workspace_id: workspaceId,
          user_id: userId,
          title: targetTemplate?.title ? `${targetTemplate.title} (My Default)` : 'My Default Wedding Template',
          category: targetTemplate?.category || 'Wedding',
          is_system_template: false,
          is_default: true,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (docContent) {
        await supabaseAdmin
          .from('quotation_documents')
          .insert({
            template_id: finalTemplateId,
            workspace_id: workspaceId,
            user_id: userId,
            content_json: docContent,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } else {
      // REQUIREMENT 13: Security verification — user must own the target template or template must be unassigned
      if (targetTemplate && targetTemplate.user_id && targetTemplate.user_id !== userId && targetTemplate.user_id !== 'demo_user' && targetTemplate.workspace_id !== workspaceId) {
        return NextResponse.json(
          { error: 'Access denied: You cannot set another user\'s template as default.', isForbidden: true },
          { status: 403 }
        );
      }
    }

    // 2. REQUIREMENT 2: Clear is_default = false for all other user-owned templates for current workspace/user ONLY
    await supabaseAdmin
      .from('quotation_templates')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`)
      .eq('is_system_template', false);

    // 3. REQUIREMENT 1: Update target template with workspace_id, user_id, is_system_template: false, is_default: true
    let updatedTmpl: any = null;
    if (!isSystemTemplate) {
      const { data: uTmpl, error: updateErr } = await supabaseAdmin
        .from('quotation_templates')
        .update({
          workspace_id: workspaceId,
          user_id: userId,
          is_system_template: false,
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', finalTemplateId)
        .select()
        .maybeSingle();

      if (updateErr) {
        console.error('Error setting template as default in Supabase:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      updatedTmpl = uTmpl;

      // Also ensure quotation_documents has workspace_id and user_id updated for consistency
      await supabaseAdmin
        .from('quotation_documents')
        .update({
          workspace_id: workspaceId,
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', finalTemplateId);
    }

    // 4. Update profiles and user_metadata for backwards compatibility
    if (userId && userId !== 'demo_user') {
      try {
        const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
        const existingMeta = userRecord?.user?.user_metadata || {};
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingMeta,
            default_template_id: finalTemplateId
          }
        });
      } catch (err) {
        console.warn('[User Metadata Update Warning]:', err);
      }

      try {
        await supabaseAdmin
          .from('profiles')
          .update({ default_template_id: finalTemplateId, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (pErr) {
        console.warn('[Profiles Table Update Warning]:', pErr);
      }
    }

    // REQUIREMENT 10: Temporary Runtime Debug Log
    console.log('[SET DEFAULT DEBUG]', {
      currentUserId: userId,
      currentWorkspaceId: workspaceId,
      targetTemplateId: finalTemplateId,
      targetTemplateUserId: userId,
      targetTemplateWorkspaceId: workspaceId,
      savedIsDefault: true
    });

    return NextResponse.json({
      success: true,
      defaultTemplateId: finalTemplateId,
      template: updatedTmpl,
      message: `Template ${finalTemplateId} is now set as active default template`
    });
  } catch (error: any) {
    console.error('Error in set-default template API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

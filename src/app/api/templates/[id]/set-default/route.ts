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

    console.log('[SET DEFAULT TEMPLATE]', { id, userId, workspaceId, userEmail });

    // 1. Store active default_template_id in user_metadata (Supabase Auth)
    if (userId && userId !== 'demo_user') {
      try {
        const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
        const existingMeta = userRecord?.user?.user_metadata || {};
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingMeta,
            default_template_id: id
          }
        });
      } catch (err) {
        console.warn('[User Metadata Update Warning]:', err);
      }

      // 2. Try updating default_template_id column in profiles table
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ default_template_id: id, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (pErr) {
        console.warn('[Profiles Table Update Warning]:', pErr);
      }
    }

    // 3. Clear is_default = false on all workspace and user templates in DB
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(workspaceId);
    if (isUuid) {
      await supabaseAdmin
        .from('quotation_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId},is_system_template.eq.true,user_id.eq.SYSTEM`);
    } else {
      await supabaseAdmin
        .from('quotation_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .or(`user_id.eq.${userId},is_system_template.eq.true,user_id.eq.SYSTEM`);
    }

    // 4. Mark selected target template as is_default = true in DB
    const { data: updatedTmpl, error: updateErr } = await supabaseAdmin
      .from('quotation_templates')
      .update({
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error('Error setting template as default in Supabase:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      defaultTemplateId: id,
      template: updatedTmpl,
      message: `Template ${id} is now set as active default template`
    });
  } catch (error: any) {
    console.error('Error in set-default template API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

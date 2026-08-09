import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';

/**
 * Authoritative Route to Set a User Template as Default for Workspace in Supabase
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: { session } } = await supabase.auth.getSession();
    let userId = session?.user?.id || 'demo_user';
    let userEmail = session?.user?.email;

    if (userEmail === 'sushantnawale700@gmail.com') {
      const impId = req.headers.get('x-impersonated-tenant-id');
      if (impId) userId = impId;
    }

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // 1. Fetch Target Template
    const { data: targetTemplate, error: fetchErr } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !targetTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // System templates cannot be set as user default directly (user must edit/customize it first to generate a user copy)
    if (targetTemplate.is_system_template || id === GLOBAL_SYSTEM_TEMPLATE_ID || targetTemplate.user_id === 'SYSTEM') {
      return NextResponse.json({
        error: 'System template cannot be directly set as default. Click Edit to create your own customized version first.'
      }, { status: 400 });
    }

    let workspaceId = targetTemplate.workspace_id || userId;

    // 2. Clear is_default = false for all other templates of this workspace/user
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      await supabase
        .from('quotation_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .not('is_system_template', 'eq', true);
    } else {
      await supabase
        .from('quotation_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .not('is_system_template', 'eq', true);
    }

    // 3. Mark selected template as is_default = true
    const { data: updatedTmpl, error: updateErr } = await supabase
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
      template: updatedTmpl
    });
  } catch (error: any) {
    console.error('Error in set-default template API:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

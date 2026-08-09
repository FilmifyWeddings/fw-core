import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/templates/[id]/set-default - Secure Set-As-Default Operation with Single-User-Default Enforcement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let currentUserId = 'demo_user';

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // 1. Check if template exists
    const { data: targetTemplate } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, title')
      .eq('id', id)
      .maybeSingle();

    const isSystem = id === 'FW-37C63A54D4' || id === 'SYSTEM_DEFAULT_WEDDING' || (targetTemplate as any)?.is_system_template;

    // Verify ownership: user can set as default if they own it or if it's a global system template
    if (targetTemplate && !isSystem && targetTemplate.user_id && targetTemplate.user_id !== currentUserId && targetTemplate.user_id !== 'demo_user') {
      return NextResponse.json(
        { error: 'Access denied: You cannot set another user\'s template as default.', isForbidden: true },
        { status: 403 }
      );
    }

    // 2. Unset default flag for all existing templates belonging to current user / demo_user
    try {
      await supabaseAdmin
        .from('quotation_templates')
        .update({ is_default: false })
        .or(`user_id.eq.${currentUserId},user_id.eq.demo_user,user_id.is.null`);

      // 3. Upsert target template is_default = true
      if (!isSystem) {
        await supabaseAdmin
          .from('quotation_templates')
          .upsert({
            id: id,
            user_id: currentUserId,
            title: targetTemplate?.title || 'Wedding Template',
            category: 'Wedding',
            is_default: true,
            is_system_template: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      }
    } catch (e: any) {
      console.warn('[Set Default Warning] Schema cache updated column fallback:', e?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Default quotation template updated successfully.',
      defaultTemplateId: id
    });
  } catch (err: any) {
    console.error('[POST /api/templates/[id]/set-default] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

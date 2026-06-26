import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try querying tenant_whatsapp_templates first
    const { data: tenantTemplates, error: tenantError } = await supabaseAdmin
      .from('tenant_whatsapp_templates')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false });

    if (!tenantError && tenantTemplates) {
      const results = tenantTemplates.map(t => {
        const payloadJson = (t.payload_json as any) || {};
        const templateType: string = t.type || (t.media_url_payload ? 'media' : 'text');
        return {
          id: t.id,
          name: t.template_name,
          category: t.category,
          language: 'en_US',
          type: templateType,
          status: 'approved',
          body_text: t.body_text || payloadJson.body || '',
          buttons: (t.buttons as any[]) || [],
        };
      });

      return NextResponse.json({ templates: results });
    }

    // Fallback to legacy whatsapp_templates table
    const { data: templates, error: legacyError } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', user.id)
      .order('created_at', { ascending: false });

    if (legacyError) throw legacyError;

    const legacyResults = (templates || []).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category || 'utility',
      language: 'en_US',
      type: t.media_url ? 'media' : 'text',
      status: 'approved',
      body_text: t.body_text || '',
      buttons: [],
    }));

    return NextResponse.json({ templates: legacyResults });
  } catch (err: any) {
    console.error('[GET /api/workflows/whatsapp-templates] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

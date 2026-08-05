import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// GET /api/templates/history?templateId=xxx - Fetch append-only version history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({ error: 'templateId query param is required' }, { status: 400 });
    }

    const { data: versions, error } = await supabaseAdmin
      .from('quotation_versions')
      .select('id, version, created_at')
      .eq('template_id', templateId)
      .order('version', { ascending: false });

    if (error) {
      console.warn('[GET /api/templates/history] Error:', error.message);
    }

    return NextResponse.json({
      success: true,
      history: versions || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

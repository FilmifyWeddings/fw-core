import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params;
    const body = await req.json().catch(() => ({}));
    
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const payload: any = { ...body, updated_at: new Date().toISOString() };
    
    // Sanitize stage_id if not valid UUID
    if ('stage_id' in payload && !isValidUUID(payload.stage_id)) {
      payload.stage_id = null;
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .select('*')
      .single();

    if (error) {
      console.error('[API Lead Update Error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (err: any) {
    console.error('[API Lead Update Exception]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

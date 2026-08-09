import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const tokenStr = authHeader.replace('Bearer ', '').trim();

    let userId: string | null = null;
    let workspaceId: string | null = null;

    if (tokenStr) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(tokenStr);
      if (user) {
        userId = user.id;
        workspaceId = (user.user_metadata?.workspace_id || user.id) as string;
      }
    }

    const body = await req.json();
    const { quotationId } = body;

    if (!quotationId) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }

    // 1. Fetch existing quotation record from public.quotations
    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from('quotations')
      .select('*')
      .or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`)
      .maybeSingle();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Quotation record not found' }, { status: 404 });
    }

    // 2. Ensure stable public token
    let publicToken = quote.public_token;

    if (!publicToken) {
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      publicToken = `qt_live_${randomPart}`;

      await supabaseAdmin
        .from('quotations')
        .update({ public_token: publicToken, updated_at: new Date().toISOString() })
        .eq('id', quote.id);
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const publicUrl = `${origin}/p/quotation/${publicToken}`;

    return NextResponse.json({
      success: true,
      quotationId: quote.quotation_number || quote.id,
      token: publicToken,
      publicUrl
    });
  } catch (error: any) {
    console.error('[POST /api/quotations/send-link] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

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

    // 1. Fetch existing quotation record from public.quotations safely (prevent Postgres UUID type error 22P02)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quotationId);

    let query = supabaseAdmin.from('quotations').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${quotationId},quotation_number.eq.${quotationId}`);
    } else {
      query = query.eq('quotation_number', quotationId);
    }

    let { data: quote, error: quoteErr } = await query.maybeSingle();

    // Fallback: If not found in quotations table, check quotation_documents and create missing quotations row
    if (!quote) {
      const { data: docRow } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', quotationId)
        .maybeSingle();

      if (docRow) {
        const content = docRow.content_json || {};
        const title = content.designName || 'Wedding Quotation';
        const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const publicToken = `qt_live_${randomPart}`;

        const { data: createdQuote } = await supabaseAdmin
          .from('quotations')
          .insert({
            quotation_number: quotationId,
            workspace_id: docRow.workspace_id || workspaceId || userId || 'DEFAULT_WS',
            user_id: docRow.user_id || userId || 'DEFAULT_USER',
            client_id: docRow.lead_id || content.lead_id || null,
            title: title,
            client_name: title,
            canvas_data: content,
            public_token: publicToken,
            status: 'draft',
            created_at: docRow.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .maybeSingle();

        if (createdQuote) {
          quote = createdQuote;
          quoteErr = null;
        }
      }
    }

    if (!quote) {
      console.error('[QUOTATION SEND LINK TRACE] Quotation not found for ID:', quotationId, 'Error:', quoteErr);
      return NextResponse.json({
        error: `Quotation record not found for ID "${quotationId}"`,
        quotationId
      }, { status: 404 });
    }

    // 2. Ensure stable public token (reuse if existing, create if missing)
    let publicToken = quote.public_token;

    if (!publicToken) {
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      publicToken = `qt_live_${randomPart}`;

      await supabaseAdmin
        .from('quotations')
        .update({ public_token: publicToken, updated_at: new Date().toISOString() })
        .eq('id', quote.id);
    }

    // Canonical Application Domain Resolution
    const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    const xForwardedHost = req.headers?.get('x-forwarded-host');
    const xForwardedProto = req.headers?.get('x-forwarded-proto');
    const rawHost = xForwardedHost || req.headers?.get('host') || '';

    let origin = 'https://test.studiocore.in';

    if (envAppUrl && !envAppUrl.includes('localhost') && !envAppUrl.includes('ngrok')) {
      origin = envAppUrl.replace(/\/$/, '');
    } else if (rawHost && !rawHost.includes('localhost') && !rawHost.includes('127.0.0.1')) {
      const proto = xForwardedProto || (rawHost.includes('localhost') ? 'http' : 'https');
      origin = `${proto}://${rawHost.replace(/\/$/, '')}`;
    } else if (envAppUrl) {
      origin = envAppUrl.replace(/\/$/, '');
    } else if (req.nextUrl?.origin) {
      origin = req.nextUrl.origin;
    }

    const publicUrl = `${origin}/p/quotation/${publicToken}`;

    console.log('[QUOTATION SEND LINK TRACE]', {
      quotationId,
      quotationFound: true,
      publicToken,
      publicUrl
    });

    return NextResponse.json({
      success: true,
      quotationId: quote.quotation_number || quote.id,
      publicToken,
      publicUrl
    });
  } catch (error: any) {
    console.error('[POST /api/quotations/send-link] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

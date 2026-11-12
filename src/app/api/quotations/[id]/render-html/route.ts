import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML } from '@/lib/pdf-html-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// GET /api/quotations/[id]/render-html - Dedicated server route for rendering clean quotation HTML
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Quotation ID is required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const isPrint = url.searchParams.get('print') === 'true';

    const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: doc } = isIdUuid
      ? await supabaseAdmin
          .from('quotation_documents')
          .select('content_json')
          .or(`template_id.eq.${id},id.eq.${id}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await supabaseAdmin
          .from('quotation_documents')
          .select('content_json')
          .eq('template_id', id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

    const documentData = doc?.content_json || { templateId: id };
    let html = renderQuotationToHTML(documentData);

    if (isPrint) {
      html += `\n<script>window.onload = function() { setTimeout(function() { window.print(); }, 350); };</script>`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    console.error('[GET /api/quotations/[id]/render-html] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const wsId = req.nextUrl.searchParams.get('workspace_id');
    const memberId = req.nextUrl.searchParams.get('member_id');
    const deliverableType = req.nextUrl.searchParams.get('type');

    if (!token || !wsId) {
      return NextResponse.json({ error: 'Missing token or workspace_id' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('project_deliverables')
      .select('*')
      .eq('workspace_id', wsId);

    if (memberId) {
      query = query.eq('assigned_member_id', memberId);
    }
    if (deliverableType) {
      query = query.eq('deliverable_type', deliverableType);
    }

    const { data: deliverables, error: delErr } = await query.order('created_at', { ascending: false });

    if (delErr) {
      return NextResponse.json({ success: true, deliverables: [] });
    }

    return NextResponse.json({ success: true, deliverables: deliverables || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const body = await req.json();

    const {
      id,
      workspace_id,
      project_id,
      project_name,
      assigned_member_id,
      deliverable_type,
      title,
      status,
      drive_folder_url,
      preview_url,
      sheet_count,
      paper_finish,
      tracking_number,
      courier_partner,
      delivery_address,
      lab_bill_amount,
      lab_invoice_url,
      due_date,
      notes,
      revision_comments
    } = body;

    if (!token || !workspace_id || !title || !deliverable_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: any = {
      workspace_id,
      project_id: project_id || null,
      project_name: project_name || null,
      assigned_member_id: assigned_member_id || null,
      deliverable_type,
      title,
      status: status || 'PENDING',
      drive_folder_url: drive_folder_url || null,
      preview_url: preview_url || null,
      sheet_count: sheet_count ? Number(sheet_count) : 0,
      paper_finish: paper_finish || 'MATTE',
      tracking_number: tracking_number || null,
      courier_partner: courier_partner || null,
      delivery_address: delivery_address || null,
      lab_bill_amount: lab_bill_amount ? Number(lab_bill_amount) : 0,
      lab_invoice_url: lab_invoice_url || null,
      due_date: due_date || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    if (revision_comments) {
      payload.revision_comments = revision_comments;
    }

    if (id) {
      payload.id = id;
    }

    const { data: result, error: saveErr } = await supabaseAdmin
      .from('project_deliverables')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (saveErr) {
      console.error('[project_deliverables Save Error]:', saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deliverable: result,
      message: 'Deliverable updated and synchronized live with Studio Owner ledger.',
    });
  } catch (err: any) {
    console.error('[project_deliverables POST Exception]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

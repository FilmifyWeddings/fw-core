import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { VendorStatement } from '@/lib/services/vendorDeliverablesService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const searchParams = req.nextUrl.searchParams;
    const vendorId = searchParams.get('vendor_id');
    const workspaceId = searchParams.get('workspace_id') || userId;

    let query = supabaseAdmin
      .from('vendor_statements')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: statements, error } = await query.order('statement_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      statements: statements || []
    });
  } catch (error: any) {
    console.error('[API /vendors/statements GET error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch statements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json();
    const workspaceId = body.workspace_id || userId;

    const statementNumber = body.statement_number || `STMT-${Date.now().toString().slice(-6)}`;
    const statementDate = body.statement_date || new Date().toISOString().split('T')[0];

    const payload: Partial<VendorStatement> = {
      workspace_id: workspaceId,
      vendor_id: body.vendor_id,
      vendor_name: body.vendor_name || 'Vendor',
      vendor_email: body.vendor_email || '',
      statement_number: statementNumber,
      statement_date: statementDate,
      start_date: body.start_date || '',
      end_date: body.end_date || '',
      order_ids: body.order_ids || [],
      items_json: body.items_json || [],
      total_albums: Number(body.total_albums) || 0,
      total_sheets: Number(body.total_sheets) || 0,
      subtotal: Number(body.subtotal) || 0,
      paid_amount: Number(body.paid_amount) || 0,
      balance_due: Number(body.balance_due) || 0,
      notes: body.notes || '',
      updated_at: new Date().toISOString()
    };

    const { data: savedStatement, error } = await supabaseAdmin
      .from('vendor_statements')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      statement: savedStatement
    });
  } catch (error: any) {
    console.error('[API /vendors/statements POST error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to save statement' }, { status: 500 });
  }
}

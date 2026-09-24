import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { 
  fetchVendorAlbumOrders, 
  saveVendorAlbumOrder,
  deleteVendorAlbumOrder
} from '@/lib/services/vendorDeliverablesService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const searchParams = req.nextUrl.searchParams;
    const vendorId = searchParams.get('vendor_id') || '';
    const vendorEmail = searchParams.get('vendor_email') || '';
    const vendorName = searchParams.get('vendor_name') || '';
    const workspaceId = searchParams.get('workspace_id') || userId;

    if (!vendorId && !vendorEmail && !vendorName) {
      return NextResponse.json({ error: 'vendor_id or vendor_email is required' }, { status: 400 });
    }

    const orders = await fetchVendorAlbumOrders(workspaceId, vendorId, vendorEmail, vendorName);

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error: any) {
    console.error('[API /vendors/albums GET error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch vendor album orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json();
    const workspaceId = body.workspace_id || userId;

    if (!body.partner_id || !body.client_name) {
      return NextResponse.json({ error: 'partner_id and client_name are required' }, { status: 400 });
    }

    const saved = await saveVendorAlbumOrder(workspaceId, body);

    return NextResponse.json({
      success: true,
      order: saved
    });
  } catch (error: any) {
    console.error('[API /vendors/albums POST error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to save vendor album order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let orderId = searchParams.get('id') || searchParams.get('order_id');
    if (!orderId) {
      try {
        const body = await req.json();
        orderId = body.id || body.order_id || body.deliverable_id;
      } catch (_) {}
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const success = await deleteVendorAlbumOrder(orderId);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('[API /vendors/albums DELETE error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete order' }, { status: 500 });
  }
}

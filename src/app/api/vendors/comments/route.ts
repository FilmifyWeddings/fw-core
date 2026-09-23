import { NextRequest, NextResponse } from 'next/server';
import { addVendorOrderComment } from '@/lib/services/vendorDeliverablesService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, author, text, reminderAt, isVoice } = body;

    if (!orderId || !text) {
      return NextResponse.json({ error: 'orderId and text are required' }, { status: 400 });
    }

    const updated = await addVendorOrderComment(orderId, {
      author: author || 'Studio Lead',
      text,
      reminder_at: reminderAt,
      is_voice: isVoice
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to add comment to order' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: updated
    });
  } catch (error: any) {
    console.error('[API /vendors/comments POST error]:', error);
    return NextResponse.json({ error: error.message || 'Comment failed' }, { status: 500 });
  }
}

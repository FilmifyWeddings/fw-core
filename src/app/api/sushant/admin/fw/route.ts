import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/auth/super-admin-auth';
import { getSuperAdminTelemetry } from '@/lib/services/super-admin-telemetry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySuperAdminSession(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const telemetry = await getSuperAdminTelemetry(startDate, endDate);

    return NextResponse.json({
      success: true,
      ...telemetry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to aggregate Super Admin telemetry' },
      { status: 500 }
    );
  }
}

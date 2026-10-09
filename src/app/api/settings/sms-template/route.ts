import { NextRequest, NextResponse } from 'next/server';
import { getSmsTemplate, updateSmsTemplate } from '@/lib/sms-gateway';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

/**
 * GET /api/settings/sms-template
 * Fetches current editable SMS headline and matter.
 */
export async function GET(req: NextRequest) {
  try {
    const templateKey = req.nextUrl.searchParams.get('key') || 'google_onboarding_otp';
    const template = await getSmsTemplate(templateKey);
    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * POST /api/settings/sms-template
 * Updates the SMS headline and matter text.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { templateKey = 'google_onboarding_otp', headline, bodyText } = body;

    if (!bodyText || !bodyText.includes('{OTP}')) {
      return NextResponse.json({
        error: 'Body text must contain the {OTP} placeholder where the verification code will be inserted.',
      }, { status: 400 });
    }

    const updated = await updateSmsTemplate(templateKey, headline || 'StudioCore Verification', bodyText);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update SMS template in database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SMS template headline and text updated successfully!',
      template: { headline, bodyText },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update SMS template' }, { status: 500 });
  }
}

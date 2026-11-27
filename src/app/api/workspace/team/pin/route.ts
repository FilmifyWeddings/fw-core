import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyMetaAuth } from '@/lib/meta-auth';
import { sendEmailOtp } from '@/lib/email-service';
import { invalidateWorkspaceCache } from '@/lib/server-swr-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hashSecret(val: string, salt: string) {
  return crypto.createHash('sha256').update(`${salt}:${val}`).digest('hex');
}

async function getSettingsRow(wsId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_finance_settings')
    .select('id, custom_data, user_id, workspace_id')
    .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function upsertTeamSecurity(wsId: string, updater: (prev: any) => any) {
  const existing = await getSettingsRow(wsId);
  const customData = (existing?.custom_data && typeof existing.custom_data === 'object') ? { ...existing.custom_data } : {};
  const nextSec = updater(customData.team_security || {});
  customData.team_security = nextSec;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from('workspace_finance_settings')
      .update({ custom_data: customData, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from('workspace_finance_settings')
      .insert([{
        user_id: wsId,
        workspace_id: wsId,
        custom_data: customData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    if (error) throw error;
  }
  return nextSec;
}

async function resolveOwnerEmail(wsId: string, userId: string): Promise<string> {
  try {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('owner_id').eq('id', wsId).maybeSingle();
    const ownerId = ws?.owner_id || userId;
    const { data: prof } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', ownerId).maybeSingle();
    if (prof?.email) return prof.email;
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(ownerId);
    return userRes?.user?.email || '';
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  try {
    const requestedWsId = new URL(req.url).searchParams.get('workspace_id');
    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const wsId = auth.workspaceId || requestedWsId;
    const row = await getSettingsRow(wsId);
    const sec = (row?.custom_data as any)?.team_security || {};
    const ownerEmail = await resolveOwnerEmail(wsId, auth.userId);

    return NextResponse.json({
      success: true,
      hasPin: Boolean(sec.pin_hash),
      hiddenMemberIds: Array.isArray(sec.hidden_member_ids) ? sec.hidden_member_ids : [],
      ownerEmail,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to load PIN status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedWsId = body?.workspace_id || new URL(req.url).searchParams.get('workspace_id');
    const auth = await verifyMetaAuth(req, requestedWsId);
    if (!auth.authorized) {
      return auth.errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const wsId = auth.workspaceId || requestedWsId;
    const action = body?.action;

    if (action === 'set_initial_pin') {
      const pin = String(body?.pin || '').replace(/\D/g, '');
      if (pin.length < 4 || pin.length > 6) {
        return NextResponse.json({ success: false, error: 'PIN must be 4 to 6 digits.' }, { status: 400 });
      }
      const existing = await getSettingsRow(wsId);
      const sec = (existing?.custom_data as any)?.team_security || {};
      if (sec.pin_hash) {
        return NextResponse.json({ success: false, error: 'PIN is already set. Use Email OTP to change or reset your PIN.' }, { status: 400 });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      await upsertTeamSecurity(wsId, (prev) => ({
        ...prev,
        pin_salt: salt,
        pin_hash: hashSecret(pin, salt),
        pin_updated_at: new Date().toISOString(),
      }));
      invalidateWorkspaceCache(wsId);
      return NextResponse.json({ success: true, hasPin: true });
    }

    if (action === 'request_otp') {
      const ownerEmail = await resolveOwnerEmail(wsId, auth.userId);
      if (!ownerEmail) {
        return NextResponse.json({ success: false, error: 'Studio owner email not found.' }, { status: 400 });
      }
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpSalt = crypto.randomBytes(8).toString('hex');
      const expiresAt = Date.now() + 10 * 60 * 1000;

      await upsertTeamSecurity(wsId, (prev) => ({
        ...prev,
        otp_salt: otpSalt,
        otp_hash: hashSecret(otp, otpSalt),
        otp_expires_at: expiresAt,
      }));

      const mailRes = await sendEmailOtp({
        toEmail: ownerEmail,
        recipientName: 'Studio Owner',
        otp,
        expiresInMinutes: 10,
      });

      if (!mailRes?.success) {
        return NextResponse.json({ success: false, error: 'Failed to send OTP email. Please check SMTP configuration.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, sentTo: ownerEmail });
    }

    if (action === 'verify_otp_and_set_pin') {
      const otp = String(body?.otp || '').trim();
      const newPin = String(body?.newPin || '').replace(/\D/g, '');
      if (otp.length !== 6) {
        return NextResponse.json({ success: false, error: 'Please enter the 6-digit OTP sent to your email.' }, { status: 400 });
      }
      if (newPin.length < 4 || newPin.length > 6) {
        return NextResponse.json({ success: false, error: 'New PIN must be 4 to 6 digits.' }, { status: 400 });
      }
      const existing = await getSettingsRow(wsId);
      const sec = (existing?.custom_data as any)?.team_security || {};
      if (!sec.otp_hash || !sec.otp_salt || !sec.otp_expires_at) {
        return NextResponse.json({ success: false, error: 'No active OTP request found. Please request a new OTP.' }, { status: 400 });
      }
      if (Date.now() > Number(sec.otp_expires_at)) {
        return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new OTP.' }, { status: 400 });
      }
      if (hashSecret(otp, sec.otp_salt) !== sec.otp_hash) {
        return NextResponse.json({ success: false, error: 'Invalid OTP code. Please check your email and try again.' }, { status: 400 });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      await upsertTeamSecurity(wsId, (prev) => ({
        ...prev,
        pin_salt: newSalt,
        pin_hash: hashSecret(newPin, newSalt),
        pin_updated_at: new Date().toISOString(),
        otp_hash: null,
        otp_salt: null,
        otp_expires_at: null,
      }));
      invalidateWorkspaceCache(wsId);
      return NextResponse.json({ success: true, hasPin: true });
    }

    if (action === 'verify_pin') {
      const pin = String(body?.pin || '').replace(/\D/g, '');
      const existing = await getSettingsRow(wsId);
      const sec = (existing?.custom_data as any)?.team_security || {};
      if (!sec.pin_hash || !sec.pin_salt) {
        return NextResponse.json({ success: true, valid: true, noPinConfigured: true });
      }
      const valid = hashSecret(pin, sec.pin_salt) === sec.pin_hash;
      if (!valid) {
        return NextResponse.json({ success: false, valid: false, error: 'Incorrect PIN. Please try again.' }, { status: 401 });
      }
      return NextResponse.json({ success: true, valid: true });
    }

    if (action === 'toggle_hide_member') {
      const memberId = String(body?.memberId || '').trim();
      const hide = Boolean(body?.hide);
      if (!memberId) {
        return NextResponse.json({ success: false, error: 'Missing memberId' }, { status: 400 });
      }
      const nextSec = await upsertTeamSecurity(wsId, (prev) => {
        const current = new Set<string>(Array.isArray(prev.hidden_member_ids) ? prev.hidden_member_ids : []);
        if (hide) current.add(memberId);
        else current.delete(memberId);
        return { ...prev, hidden_member_ids: Array.from(current) };
      });
      invalidateWorkspaceCache(wsId);
      return NextResponse.json({ success: true, hiddenMemberIds: nextSec.hidden_member_ids });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/workspace/team/pin POST] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'PIN operation failed' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/auth/super-admin-auth';
import { getSuperAdminTelemetry } from '@/lib/services/super-admin-telemetry';
import { supabaseAdmin } from '@/lib/supabase';

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

/**
 * POST /api/sushant/admin/fw
 * Super Admin God-Mode Action Engine:
 * Enables the founder to override plans, extend validity (+2d, +7d, +30d), set custom storage,
 * toggle granular features, set custom limits, and manage platform blocks.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySuperAdminSession(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, studioId, targetUserId, ...payload } = body;
    const targetId = studioId || targetUserId;

    if (!targetId) {
      return NextResponse.json({ error: 'Target Studio ID is required' }, { status: 400 });
    }

    // Fetch existing profile to merge custom overrides cleanly
    const { data: existingProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, subscription_plan, subscription_expires_at, is_platform_blocked, custom_overrides')
      .eq('id', targetId)
      .maybeSingle();

    if (fetchErr || !existingProfile) {
      return NextResponse.json({ error: `Studio profile not found: ${fetchErr?.message || 'Invalid ID'}` }, { status: 404 });
    }

    const currentOverrides = existingProfile.custom_overrides || {};
    let updateProfileFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      // 1. Master Full God-Mode Save
      case 'save_god_mode': {
        const {
          plan,
          expiresAt,
          storageQuotaGb,
          isBlocked,
          features,
          customLimits,
          adminNotes,
        } = payload;

        if (plan) {
          updateProfileFields.subscription_plan = plan.toLowerCase();
          updateProfileFields.subscription_tier = plan.toLowerCase();
        }

        if (expiresAt) {
          updateProfileFields.subscription_expires_at = new Date(expiresAt).toISOString();
        }

        if (typeof isBlocked === 'boolean') {
          updateProfileFields.is_platform_blocked = isBlocked;
          if (isBlocked) {
            try {
              await supabaseAdmin.auth.admin.signOut(targetId);
            } catch (_) {}
          }
        }

        // Construct clean custom_overrides object
        const mergedOverrides = {
          ...currentOverrides,
          storage_quota_gb: (typeof storageQuotaGb === 'number' && storageQuotaGb > 0) ? storageQuotaGb : (currentOverrides.storage_quota_gb ?? null),
          features: {
            ...(currentOverrides.features || {}),
            ...(features || {}),
          },
          custom_limits: {
            ...(currentOverrides.custom_limits || {}),
            ...(customLimits || {}),
          },
          admin_notes: typeof adminNotes === 'string' ? adminNotes : (currentOverrides.admin_notes || ''),
          updated_by: auth.email || 'SuperAdmin',
          updated_at: new Date().toISOString(),
        };

        updateProfileFields.custom_overrides = mergedOverrides;

        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update(updateProfileFields)
          .eq('id', targetId);

        if (updateErr) {
          throw new Error(`Failed to update profile: ${updateErr.message}`);
        }

        // Also sync to subscriptions table if exists
        try {
          await supabaseAdmin
            .from('subscriptions')
            .upsert({
              workspace_id: targetId,
              plan_id: plan ? plan.toLowerCase() : existingProfile.subscription_plan || 'trial',
              status: isBlocked ? 'suspended' : 'active',
              current_period_end: updateProfileFields.subscription_expires_at || existingProfile.subscription_expires_at,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
        } catch (_) {}

        return NextResponse.json({
          success: true,
          message: 'God-Mode settings applied successfully!',
          profile: updateProfileFields,
        });
      }

      // 2. Extend Validity (+2 Days, +7 Days, +30 Days, or custom Date)
      case 'extend_validity':
      case 'extend_plan': {
        const days = Number(payload.days || 30);
        const currentExp = existingProfile.subscription_expires_at
          ? new Date(existingProfile.subscription_expires_at).getTime()
          : Date.now();
        const baseTime = currentExp > Date.now() ? currentExp : Date.now();
        const newExpiry = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

        updateProfileFields.subscription_expires_at = newExpiry;
        updateProfileFields.subscription_status = 'active';

        const { error: extErr } = await supabaseAdmin
          .from('profiles')
          .update(updateProfileFields)
          .eq('id', targetId);

        if (extErr) throw new Error(extErr.message);

        return NextResponse.json({
          success: true,
          message: `Validity extended by ${days} days. New expiry: ${new Date(newExpiry).toLocaleDateString('en-IN')}`,
          subscription_expires_at: newExpiry,
        });
      }

      // 3. Quick Quota Bump (Storage GB or WhatsApp messages)
      case 'bump_quota': {
        const mergedOverrides = { ...currentOverrides };
        if (payload.storageQuotaGb) {
          mergedOverrides.storage_quota_gb = Number(payload.storageQuotaGb);
        }
        if (payload.whatsappQuota) {
          mergedOverrides.whatsapp_quota = Number(payload.whatsappQuota);
        }
        mergedOverrides.updated_at = new Date().toISOString();

        updateProfileFields.custom_overrides = mergedOverrides;

        const { error: bumpErr } = await supabaseAdmin
          .from('profiles')
          .update(updateProfileFields)
          .eq('id', targetId);

        if (bumpErr) throw new Error(bumpErr.message);

        return NextResponse.json({
          success: true,
          message: 'Quota updated successfully!',
          custom_overrides: mergedOverrides,
        });
      }

      // 4. Toggle Platform Block (Suspension)
      case 'toggle_block': {
        const isBlocked = Boolean(payload.isBlocked ?? payload.is_platform_blocked);
        updateProfileFields.is_platform_blocked = isBlocked;

        const { error: blockErr } = await supabaseAdmin
          .from('profiles')
          .update(updateProfileFields)
          .eq('id', targetId);

        if (blockErr) throw new Error(blockErr.message);

        if (isBlocked) {
          try {
            await supabaseAdmin.auth.admin.signOut(targetId);
          } catch (_) {}
        }

        return NextResponse.json({
          success: true,
          message: isBlocked ? 'Studio access suspended and sessions terminated.' : 'Studio access restored successfully.',
          is_platform_blocked: isBlocked,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[SuperAdmin Action Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Operation failed' },
      { status: 500 }
    );
  }
}


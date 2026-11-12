import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import {
  DEFAULT_WORKSPACE_QUOTATION_SETTINGS,
  WorkspaceQuotationSettings,
} from '@/lib/workspace-settings';

export const dynamic = 'force-dynamic';

const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

async function resolveAuthorizedWorkspaceId(userId: string, requestedWsId?: string | null, isSuperAdminUser?: boolean): Promise<{ allowed: boolean; workspaceId: string }> {
  const cleanUser = (userId || '').trim();
  const cleanRequested = (requestedWsId || '').trim();

  if (!isUuid(cleanUser)) {
    return { allowed: false, workspaceId: '' };
  }

  // Fetch user's profile + memberships to determine authorized workspaces
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, workspace_id')
      .eq('id', cleanUser)
      .maybeSingle(),
    supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', cleanUser),
  ]);

  const authorizedIds = new Set<string>([cleanUser]);
  if (profile?.workspace_id && isUuid(profile.workspace_id)) {
    authorizedIds.add(profile.workspace_id);
  }
  if (Array.isArray(memberships)) {
    for (const m of memberships) {
      if (m?.workspace_id && isUuid(m.workspace_id)) authorizedIds.add(m.workspace_id);
    }
  }

  const defaultWsId = (profile?.workspace_id && isUuid(profile.workspace_id))
    ? profile.workspace_id
    : cleanUser;

  if (!cleanRequested || !isUuid(cleanRequested)) {
    return { allowed: true, workspaceId: defaultWsId };
  }

  if (authorizedIds.has(cleanRequested) || Boolean(isSuperAdminUser)) {
    return { allowed: true, workspaceId: cleanRequested };
  }

  // Strict multi-tenant isolation: never allow reading or writing another studio's shortcuts/settings
  return { allowed: false, workspaceId: '' };
}

function mergeWithDefaults(rawSettings: any): WorkspaceQuotationSettings {
  const s = (rawSettings && typeof rawSettings === 'object') ? rawSettings : {};
  return {
    deliverables: Array.isArray(s.deliverables) && s.deliverables.length > 0 ? s.deliverables : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.deliverables,
    specialAddons: Array.isArray(s.specialAddons) && s.specialAddons.length > 0 ? s.specialAddons : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.specialAddons,
    paidAddons: Array.isArray(s.paidAddons) && s.paidAddons.length > 0 ? s.paidAddons : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.paidAddons,
    defaultFunctions: Array.isArray(s.defaultFunctions) && s.defaultFunctions.length > 0 ? s.defaultFunctions : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.defaultFunctions,
    requirements: Array.isArray(s.requirements) && s.requirements.length > 0 ? s.requirements : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.requirements,
    preWeddingDeliverables: Array.isArray(s.preWeddingDeliverables) && s.preWeddingDeliverables.length > 0 ? s.preWeddingDeliverables : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.preWeddingDeliverables,
    durationSlots: Array.isArray(s.durationSlots) && s.durationSlots.length > 0 ? s.durationSlots : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.durationSlots,
    paymentSteps: Array.isArray(s.paymentSteps) && s.paymentSteps.length > 0 ? s.paymentSteps : DEFAULT_WORKSPACE_QUOTATION_SETTINGS.paymentSteps,
    pdfTheme: s.pdfTheme || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.pdfTheme,
    quoteTerms: s.quoteTerms || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.quoteTerms,
    contractClauses: s.contractClauses || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.contractClauses,
    quoteExpiryDays: s.quoteExpiryDays ?? DEFAULT_WORKSPACE_QUOTATION_SETTINGS.quoteExpiryDays,
    currency: s.currency || DEFAULT_WORKSPACE_QUOTATION_SETTINGS.currency,
    aiRules: s.aiRules && typeof s.aiRules === 'object'
      ? {
          customInstructions: typeof s.aiRules.customInstructions === 'string' ? s.aiRules.customInstructions : '',
          shortcuts: Array.isArray(s.aiRules.shortcuts) ? s.aiRules.shortcuts : [],
        }
      : { customInstructions: '', shortcuts: [] },
  };
}

/**
 * GET /api/workspace/quotation-settings?workspace_id=...
 * Authoritative studio-scoped reader using supabaseAdmin after verifying ownership.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, isSuperAdmin } = await resolveRequestUser(req);
    const requestedWsId = req.nextUrl.searchParams.get('workspace_id');

    const { allowed, workspaceId } = await resolveAuthorizedWorkspaceId(userId, requestedWsId, isSuperAdmin);
    if (!allowed || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized workspace access' },
        { status: userId && userId !== 'demo_user' ? 403 : 401 }
      );
    }

    const { data: rows, error } = await supabaseAdmin
      .from('workspace_quotation_settings')
      .select('workspace_id, settings, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[API workspace/quotation-settings GET error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const latestRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const settings = mergeWithDefaults(latestRow?.settings);

    return NextResponse.json({
      success: true,
      workspaceId,
      settings,
      updatedAt: latestRow?.updated_at || null,
    });
  } catch (err: any) {
    console.error('[API workspace/quotation-settings GET exception]:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspace/quotation-settings
 * Body: { workspace_id?, settings: Partial<WorkspaceQuotationSettings> }
 * Safe persistence even when unique constraint on workspace_id hasn't been migrated yet
 * (explicit UPDATE-then-INSERT + duplicate row cleanup).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, isSuperAdmin } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const requestedWsId = body?.workspace_id || body?.workspaceId || req.nextUrl.searchParams.get('workspace_id');
    const incomingSettings = body?.settings && typeof body.settings === 'object' ? body.settings : body;

    const { allowed, workspaceId } = await resolveAuthorizedWorkspaceId(userId, requestedWsId, isSuperAdmin);
    if (!allowed || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized workspace modification attempt' },
        { status: userId && userId !== 'demo_user' ? 403 : 401 }
      );
    }

    const now = new Date().toISOString();

    // Fetch existing rows (handles tables both with & without unique(workspace_id))
    const { data: existingRows, error: fetchErr } = await supabaseAdmin
      .from('workspace_quotation_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (fetchErr) {
      console.error('[API workspace/quotation-settings POST lookup error]:', fetchErr.message);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    const existingSettings = (existingRows && existingRows[0]?.settings) || {};
    const mergedSettings = mergeWithDefaults({
      ...existingSettings,
      ...incomingSettings,
      aiRules: incomingSettings?.aiRules !== undefined
        ? {
            customInstructions: typeof incomingSettings.aiRules?.customInstructions === 'string'
              ? incomingSettings.aiRules.customInstructions
              : (existingSettings?.aiRules?.customInstructions || ''),
            shortcuts: Array.isArray(incomingSettings.aiRules?.shortcuts)
              ? incomingSettings.aiRules.shortcuts
              : (existingSettings?.aiRules?.shortcuts || []),
          }
        : existingSettings?.aiRules,
    });

    if (existingRows && existingRows.length > 0) {
      const { error: updateErr } = await supabaseAdmin
        .from('workspace_quotation_settings')
        .update({
          settings: mergedSettings,
          updated_at: now,
        })
        .eq('workspace_id', workspaceId);

      if (updateErr) {
        console.error('[API workspace/quotation-settings POST update error]:', updateErr.message);
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('workspace_quotation_settings')
        .insert([{
          workspace_id: workspaceId,
          settings: mergedSettings,
          created_at: now,
          updated_at: now,
        }]);

      if (insertErr) {
        console.error('[API workspace/quotation-settings POST insert error]:', insertErr.message);
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      persisted: true,
      workspaceId,
      settings: mergedSettings,
      updatedAt: now,
    });
  } catch (err: any) {
    console.error('[API workspace/quotation-settings POST exception]:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

interface CacheEntry {
  timestamp: number;
  data: any;
}
const serverTemplatesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000; // 15s in-memory cache for ultra-fast 1ms responses

/**
 * Authoritative Quotation Templates List API (GET)
 * Bypasses RLS using supabaseAdmin to ensure quotation_documents content_json is never blocked.
 * Guarantees exact user-selected default_template_id is marked as default in response.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail, isSuperAdmin } = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get('workspace_id');
    
    // Effective tenant/user ID
    const effectiveUserId = (userId && userId !== 'demo_user')
      ? userId
      : (workspaceIdParam && workspaceIdParam !== 'demo_user' ? workspaceIdParam : '');

    const isAdmin = isSuperAdmin || (userEmail?.toLowerCase() === 'sushantnawale700@gmail.com');
    const shouldBypassCache = searchParams.get('refresh') === 'true' || req.headers.get('cache-control') === 'no-cache';
    const cacheKey = `${effectiveUserId || 'anon'}_${workspaceIdParam || 'none'}_${isAdmin ? 'admin' : 'user'}`;

    if (!shouldBypassCache && serverTemplatesCache.has(cacheKey)) {
      const entry = serverTemplatesCache.get(cacheKey)!;
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(entry.data);
      }
    }

    let activeDefaultId: string | null = null;
    const candidateIdSet = new Set<string>();
    const cleanId = (val: unknown) => {
      const s = String(val || '').trim();
      return /^[a-zA-Z0-9_-]{4,64}$/.test(s) && s !== 'demo_user' ? s : '';
    };
    const safeEffectiveId = cleanId(effectiveUserId);
    const safeWsParam = cleanId(workspaceIdParam);
    if (safeEffectiveId) candidateIdSet.add(safeEffectiveId);

    // Run auth metadata, studio tenant lookup, and active system template query concurrently
    const [userRecRes, profileRes, memberRes, sysTmplRes] = await Promise.all([
      safeEffectiveId
        ? supabaseAdmin.auth.admin.getUserById(safeEffectiveId).catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      safeEffectiveId
        ? supabaseAdmin.from('profiles').select('workspace_id').eq('id', safeEffectiveId).maybeSingle()
        : Promise.resolve({ data: null }),
      safeEffectiveId
        ? supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', safeEffectiveId)
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
        .eq('id', 'FW-USER-SJ05RN')
        .limit(1),
    ]);

    if (userRecRes?.data?.user?.user_metadata?.default_template_id) {
      activeDefaultId = userRecRes.data.user.user_metadata.default_template_id;
    }
    const profileWs = cleanId((profileRes as any)?.data?.workspace_id);
    if (profileWs) candidateIdSet.add(profileWs);
    const memberRows = Array.isArray((memberRes as any)?.data) ? (memberRes as any).data : [];
    for (const m of memberRows) {
      const mWs = cleanId(m?.workspace_id);
      if (mWs) candidateIdSet.add(mWs);
    }
    // Allow workspace_id query param if caller is unauthenticated fallback or authorized owner/member/admin
    if (safeWsParam && (!userId || isAdmin || candidateIdSet.has(safeWsParam))) {
      candidateIdSet.add(safeWsParam);
    }

    const candidateIds = Array.from(candidateIdSet);
    let validTemplates: any[] = [];

    // 1. Fetch Studio's Own Created Quotation Templates across authorized studio/owner IDs
    let userTemplates: any[] = [];
    if (candidateIds.length > 0) {
      const idList = candidateIds.join(',');
      const { data: uTmpls, error: uErr } = await supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
        .not('status', 'in', '("archived","deleted")')
        .not('id', 'ilike', 'FW-Q-%')
        .not('id', 'ilike', 'FW-L-%')
        .eq('is_system_template', false)
        .or(`workspace_id.in.(${idList}),user_id.in.(${idList})`)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });

      if (uErr) console.warn('[Quotation Templates] user templates fetch warning:', uErr.message);
      userTemplates = uTmpls || [];
    }

    // 2. Active System Template (FW-USER-SJ05RN / "Premium") already fetched in parallel above
    const { data: activeSysTmpls, error: sysErr } = sysTmplRes;
    if (sysErr) console.warn('[Quotation Templates] system template fetch warning:', sysErr.message);

    const seen = new Set<string>();
    // Add studio owner templates first
    (userTemplates || []).forEach(t => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        validTemplates.push(t);
      }
    });

    // Add active system template
    if (activeSysTmpls && activeSysTmpls.length > 0) {
      const sys = activeSysTmpls[0];
      if (!seen.has(sys.id)) {
        seen.add(sys.id);
        validTemplates.push(sys);
      }
    } else if (!seen.has('FW-USER-SJ05RN')) {
      // Fallback in-memory representation if DB row was temporarily missing
      validTemplates.push({
        id: 'FW-USER-SJ05RN',
        user_id: 'SYSTEM',
        workspace_id: null,
        title: 'Premium',
        category: 'Wedding',
        is_default: validTemplates.length === 0,
        is_system_template: true,
        status: 'published',
        updated_at: new Date().toISOString()
      });
    }

    const templateIds = validTemplates.map(t => t.id);

    // Fetch document content_json using supabaseAdmin (bypasses RLS)
    const docsMap: Record<string, any> = {};
    if (templateIds.length > 0) {
      const { data: docsData, error: docsErr } = await supabaseAdmin
        .from('quotation_documents')
        .select('template_id, content_json, lead_id')
        .in('template_id', templateIds);

      if (docsErr) {
        console.error('[Quotation Documents Fetch Error]:', docsErr.code || docsErr.message?.slice(0, 200) || 'Query error');
      }

      if (docsData) {
        docsData.forEach(d => {
          if (d.template_id && d.content_json) {
            docsMap[d.template_id] = d.content_json;
          }
        });
      }

      // Fallback check in quotations table for any templates whose doc was saved there
      const missingIds = templateIds.filter(id => !docsMap[id]);
      if (missingIds.length > 0) {
        try {
          const { data: qRows } = await supabaseAdmin
            .from('quotations')
            .select('quotation_number, id, content_json, canvas_data')
            .or(`quotation_number.in.(${missingIds.join(',')}),id.in.(${missingIds.join(',')})`);
          if (qRows) {
            qRows.forEach(q => {
              const qContent = q.content_json || q.canvas_data;
              if (qContent) {
                if (q.quotation_number && !docsMap[q.quotation_number]) docsMap[q.quotation_number] = qContent;
                if (q.id && !docsMap[q.id]) docsMap[q.id] = qContent;
              }
            });
          }
        } catch (_) {}
      }
    }

    const hasAnyDefaultInDb = validTemplates.some(t => t.is_default);

    const results = validTemplates
      .filter(t => {
        // Exclude lead-specific quotation instances
        if (t.id.startsWith('FW-Q-') || t.id.startsWith('FW-L-')) return false;
        // Require valid content_json or system preset
        const hasContent = Boolean(docsMap[t.id]);
        return hasContent || t.id === 'FW-USER-SJ05RN' || Boolean(t.is_system_template);
      })
      .map(t => {
        let isDefault = false;
        if (activeDefaultId) {
          isDefault = t.id === activeDefaultId;
        } else if (t.is_default) {
          isDefault = true;
        } else if (!hasAnyDefaultInDb && t.id === validTemplates[0]?.id) {
          isDefault = true;
        }

        const docContent = docsMap[t.id] || (Boolean(t.is_system_template) ? DEFAULT_AIRY_PROPOSAL : null);
        let title = (t.title && t.title !== 'Wedding - Design 1') ? t.title : 'Premium';
        if (
          docContent?.designName &&
          typeof docContent.designName === 'string' &&
          docContent.designName.trim() &&
          docContent.designName !== 'Minimalist Airy Proposal' &&
          docContent.designName !== 'Personalised Wedding Quotation' && docContent.designName !== 'Wedding - Design 1'
        ) {
          title = docContent.designName.trim();
        }

        return {
          ...t,
          title,
          is_default: isDefault,
          content_json: docContent
        };
      });

    // Do NOT inject "Minimalist Airy Proposal" phantom card. Studio owners only see their authentic designs.

    // Deduplicate templates by ID (ensures custom designs and system designs are never clobbered by title)
    const idSeen = new Map<string, any>();
    for (const t of results) {
      if (!idSeen.has(t.id)) {
        idSeen.set(t.id, t);
      }
    }
    const deduplicatedResults = Array.from(idSeen.values());
    deduplicatedResults.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

    const responsePayload = {
      success: true,
      activeDefaultTemplateId: activeDefaultId,
      templates: deduplicatedResults
    };
    serverTemplatesCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching quotation templates:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

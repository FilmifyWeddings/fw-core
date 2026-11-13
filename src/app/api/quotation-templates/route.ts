import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';

interface CacheEntry {
  timestamp: number;
  data: any;
}

// In-memory cache for ultra-fast <1ms responses (10 minutes TTL)
const serverTemplatesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// In-memory tenant workspace mapping cache (5 minutes TTL)
const userWorkspacesCache = new Map<string, { timestamp: number; ids: string[] }>();
const WS_CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateServerTemplatesCache() {
  serverTemplatesCache.clear();
}

/**
 * Extracts strictly lightweight presentation metadata (<1KB) for gallery cards and template selectors.
 * Strips out heavy page arrays (functions, deliverables, paymentTerms, thankyou, shootDetails)
 * and guarantees oversized base64 data URIs never bloat the list payload.
 */
function extractLightweightContent(rawDoc: any) {
  if (!rawDoc || typeof rawDoc !== 'object') return null;
  const cover = rawDoc.cover || {};
  let photoUrl = typeof cover.photoUrl === 'string' ? cover.photoUrl : '';

  // If base64 photo is huge, fallback to system cover to prevent multi-megabyte payload
  if (photoUrl && photoUrl.startsWith('data:') && photoUrl.length > 50000) {
    photoUrl = '/images/system-premium-cover.webp';
  }

  return {
    designName: rawDoc.designName || rawDoc.title || 'Quotation Template',
    eventGroup: rawDoc.eventGroup || 'Wedding',
    look: rawDoc.look || rawDoc.theme || 'cyprus-sand-dune',
    theme: rawDoc.theme || rawDoc.look || 'cyprus-sand-dune',
    primaryFont: rawDoc.primaryFont || "'Playfair Display', serif",
    secondaryFont: rawDoc.secondaryFont || "'Cinzel', serif",
    pageSequence: ['cover'],
    cover: {
      coupleName: cover.coupleName || '',
      groomName: cover.groomName || '',
      brideName: cover.brideName || '',
      photoUrl: photoUrl || '/images/system-premium-cover.webp',
      eventType: cover.eventType || 'Wedding',
      locationName: cover.locationName || '',
      brandName: cover.brandName || '',
      bgOpacity: cover.bgOpacity ?? 40,
      frameShape: cover.frameShape || 'arch',
      date: cover.date || ''
    }
  };
}

/**
 * Authoritative Quotation Templates List API (GET)
 * Ultra-fast (<1ms warm cache, <500ms cold), lightweight (~2KB total payload),
 * multi-tenant workspace aware, zero-waterfall execution.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail, isSuperAdmin } = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get('workspace_id');
    const returnFull = searchParams.get('full') === 'true';

    // Effective tenant/user ID
    const effectiveUserId = (userId && userId !== 'demo_user')
      ? userId
      : (workspaceIdParam && workspaceIdParam !== 'demo_user' ? workspaceIdParam : '');

    const isAdmin = isSuperAdmin || (userEmail?.toLowerCase() === 'sushantnawale700@gmail.com');
    const shouldBypassCache = searchParams.get('refresh') === 'true' || req.headers.get('cache-control') === 'no-cache';
    const cacheKey = `${effectiveUserId || 'anon'}_${workspaceIdParam || 'none'}_${isAdmin ? 'admin' : 'user'}_${returnFull ? 'full' : 'light'}`;

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
    if (safeWsParam) candidateIdSet.add(safeWsParam);

    // 1. Resolve candidate workspace IDs (with 5-minute memory cache)
    if (safeEffectiveId) {
      const cachedWs = userWorkspacesCache.get(safeEffectiveId);
      if (cachedWs && Date.now() - cachedWs.timestamp < WS_CACHE_TTL_MS) {
        cachedWs.ids.forEach(id => candidateIdSet.add(id));
      } else {
        const [profileRes, memberRes] = await Promise.all([
          supabaseAdmin.from('profiles').select('workspace_id, default_template_id').eq('id', safeEffectiveId).maybeSingle(),
          supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', safeEffectiveId)
        ]);

        if (profileRes?.data?.default_template_id) {
          activeDefaultId = profileRes.data.default_template_id;
        }
        const profileWs = cleanId((profileRes as any)?.data?.workspace_id);
        if (profileWs) candidateIdSet.add(profileWs);

        const memberRows = Array.isArray((memberRes as any)?.data) ? (memberRes as any).data : [];
        for (const m of memberRows) {
          const mWs = cleanId(m?.workspace_id);
          if (mWs) candidateIdSet.add(mWs);
        }

        userWorkspacesCache.set(safeEffectiveId, {
          timestamp: Date.now(),
          ids: Array.from(candidateIdSet)
        });
      }
    }

    // 2. Fetch system template AND all studio owner templates in ONE SINGLE CONCURRENT QUERY
    const candidateList = Array.from(candidateIdSet).filter(Boolean);
    const orFilter = candidateList.length > 0
      ? `id.eq.FW-USER-SJ05RN,workspace_id.in.(${candidateList.join(',')}),user_id.in.(${candidateList.join(',')})`
      : `id.eq.FW-USER-SJ05RN`;

    const { data: dbTemplates, error: tmplErr } = await supabaseAdmin
      .from('quotation_templates')
      .select('id, user_id, workspace_id, title, category, is_default, is_system_template, status, updated_at')
      .not('status', 'in', '("archived","deleted")')
      .not('id', 'ilike', 'FW-Q-%')
      .not('id', 'ilike', 'FW-L-%')
      .or(orFilter)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (tmplErr) {
      console.warn('[Quotation Templates] fetch error:', tmplErr.message);
    }

    const validTemplates: any[] = [];
    const seen = new Set<string>();

    // Studio templates first
    (dbTemplates || []).forEach(t => {
      if (t.id !== 'FW-USER-SJ05RN' && !t.is_system_template && !seen.has(t.id)) {
        seen.add(t.id);
        validTemplates.push(t);
      }
    });

    // System template ("Premium" / FW-USER-SJ05RN)
    const sysTemplate = (dbTemplates || []).find(t => t.id === 'FW-USER-SJ05RN' || t.is_system_template);
    if (sysTemplate && !seen.has(sysTemplate.id)) {
      seen.add(sysTemplate.id);
      validTemplates.push(sysTemplate);
    } else if (!seen.has('FW-USER-SJ05RN')) {
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

    // 3. Fetch documents for these templates in parallel
    const templateIds = validTemplates.map(t => t.id);
    const docsMap: Record<string, any> = {};

    if (templateIds.length > 0) {
      const { data: docsData } = await supabaseAdmin
        .from('quotation_documents')
        .select('template_id, content_json, lead_id')
        .in('template_id', templateIds);

      if (docsData) {
        docsData.forEach(d => {
          if (d.template_id && d.content_json) {
            docsMap[d.template_id] = d.content_json;
          }
        });
      }

      // Fallback check in quotations table for any missing
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
        if (t.id.startsWith('FW-Q-') || t.id.startsWith('FW-L-')) return false;
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

        const rawDoc = docsMap[t.id] || (Boolean(t.is_system_template) ? DEFAULT_AIRY_PROPOSAL : null);
        let title = (t.title && t.title !== 'Wedding - Design 1') ? t.title : 'Premium';
        if (
          rawDoc?.designName &&
          typeof rawDoc.designName === 'string' &&
          rawDoc.designName.trim() &&
          rawDoc.designName !== 'Minimalist Airy Proposal' &&
          rawDoc.designName !== 'Personalised Wedding Quotation' &&
          rawDoc.designName !== 'Wedding - Design 1'
        ) {
          title = rawDoc.designName.trim();
        }

        // Return lightweight projection unless explicitly asked for full
        const docContent = returnFull ? rawDoc : (extractLightweightContent(rawDoc) || rawDoc);

        return {
          ...t,
          title,
          is_default: isDefault,
          content_json: docContent
        };
      });

    // Deduplicate templates by ID
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

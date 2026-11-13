import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GLOBAL_SYSTEM_TEMPLATE_ID } from '@/lib/quotation-template-resolver';
import { DEFAULT_AIRY_PROPOSAL } from '@/lib/quotation-defaults';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractCoupleNameFromQuotation, syncBookedLeadOrFinalQuotation } from '@/lib/quotation-finance-sync';
import { clearLeadSummaryCache } from '@/lib/quotation-summary-cache';
import { isInvalidCoupleName } from '@/lib/ai-quotation-extractor';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Authoritative Single Template & Lead Quotation Document Route (GET, PUT, PATCH, DELETE)
 * Handles security checks, workspace isolation, system template direct editing for Super Admin, and auto-forking for users.
 */

async function handleGet(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    let workspaceId = userId;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, workspace_id')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.workspace_id) workspaceId = profile.workspace_id;
      else if (profile?.id) workspaceId = profile.id;
    }

    // 1. System Template is readable by all authenticated users
    if (id === GLOBAL_SYSTEM_TEMPLATE_ID) {
      const { data: sysTmpl } = await supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', GLOBAL_SYSTEM_TEMPLATE_ID)
        .maybeSingle();

      const { data: sysDoc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', GLOBAL_SYSTEM_TEMPLATE_ID)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let docJson = sysDoc?.document_json || sysDoc?.content_json;
      if (!docJson || (typeof docJson === 'object' && !docJson.cover && !docJson.pages?.length && !docJson.pageSequence?.length)) {
        docJson = DEFAULT_AIRY_PROPOSAL;
      }

      return NextResponse.json({
        template: sysTmpl || { id: GLOBAL_SYSTEM_TEMPLATE_ID, title: 'System Default Wedding Template', is_system_template: true, is_default: false },
        document: {
          template_id: GLOBAL_SYSTEM_TEMPLATE_ID,
          version: sysDoc?.version || 1,
          content_json: docJson,
          document_json: docJson
        }
      });
    }

    const isIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 2. Fetch Template, Document Snapshot, and Quotation Record in parallel (3x Faster!)
    const [tmplRes, docRes, quoteRecRes] = await Promise.all([
      supabaseAdmin
        .from('quotation_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      isIdUuid
        ? supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .or(`template_id.eq.${id},id.eq.${id}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : supabaseAdmin
            .from('quotation_documents')
            .select('*')
            .eq('template_id', id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      isIdUuid
        ? supabaseAdmin
            .from('quotations')
            .select('*')
            .or(`id.eq.${id},quotation_number.eq.${id},public_token.eq.${id}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : supabaseAdmin
            .from('quotations')
            .select('*')
            .or(`quotation_number.eq.${id},public_token.eq.${id}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
    ]);

    const tmpl = tmplRes.data;
    const doc = docRes.data;
    const quoteRec = quoteRecRes.data;

    let rawDocJson = doc?.document_json || doc?.content_json || quoteRec?.canvas_data || quoteRec?.content_json || null;
    let docJson: any = rawDocJson;
    if (typeof rawDocJson === 'string') {
      try {
        docJson = JSON.parse(rawDocJson);
      } catch (_) {
        docJson = rawDocJson;
      }
    }
    if (docJson && typeof docJson === 'object') {
      if (docJson.quotation && typeof docJson.quotation === 'object') docJson = { ...docJson, ...docJson.quotation };
      if (docJson.content_json && typeof docJson.content_json === 'object') docJson = { ...docJson, ...docJson.content_json };
    }

    if (!tmpl && !docJson && !quoteRec) {
      return NextResponse.json({ error: 'Quotation template or document not found' }, { status: 404 });
    }

    // 5. User Isolation Check — Super Admin can view all, users can view system templates, public previews, or their own
    const isPublicPreview = req.nextUrl.searchParams.get('preview') === 'public' || !!req.nextUrl.searchParams.get('token');
    const targetWorkspace = tmpl?.workspace_id || tmpl?.user_id || doc?.workspace_id || doc?.user_id || quoteRec?.workspace_id || quoteRec?.user_id;

    let isMember = false;
    if (!isSuperAdmin && !isPublicPreview && targetWorkspace && targetWorkspace !== workspaceId && targetWorkspace !== userId && targetWorkspace !== 'SYSTEM' && targetWorkspace !== 'demo_user' && userId) {
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', targetWorkspace)
        .eq('user_id', userId)
        .maybeSingle();
      if (member) isMember = true;
    }

    const isOwner = isSuperAdmin ||
      isPublicPreview ||
      isMember ||
      (Boolean(tmpl?.is_system_template) && tmpl?.status === 'published') ||
      !targetWorkspace ||
      targetWorkspace === workspaceId ||
      targetWorkspace === userId ||
      targetWorkspace === 'SYSTEM' ||
      targetWorkspace === 'demo_user';

    if (!isOwner) {
      return NextResponse.json({ error: 'Access Denied: You do not have permission to view this quotation document.' }, { status: 403 });
    }

    const finalDoc = docJson || DEFAULT_AIRY_PROPOSAL;

    return NextResponse.json({
      template: tmpl || {
        id,
        title: quoteRec?.title || 'Quotation Document',
        is_system_template: false,
        is_default: false
      },
      document: {
        template_id: id,
        version: doc?.version || 1,
        content_json: finalDoc,
        document_json: finalDoc
      }
    });
  } catch (error: any) {
    console.error('Error fetching template/document:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleUpdate(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Batch 1: Parallel param resolution, user auth, and JSON body parse
    const [{ id }, authRes, body] = await Promise.all([
      context.params,
      resolveRequestUser(req),
      req.json().catch(() => ({}))
    ]);
    const { userId: authUserId, isSuperAdmin } = authRes;

    let userId = authUserId || body.user_id || '';
    let workspaceId = body.workspace_id || userId;
    const document = body.content_json || body.document;
    const title = body.title;
    const category = body.category;
    const hintLeadId = body.lead_id || document?.lead_id || document?.content_json?.lead_id || null;

    // Batch 2: Parallel DB metadata reads (profiles + quotation_templates + quotation_documents + optional leads)
    const [profileRes, targetTmplRes, currentDocRes, leadPreRes] = await Promise.all([
      userId
        ? supabaseAdmin
            .from('profiles')
            .select('id, workspace_id')
            .eq('id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('quotation_templates')
        .select('id, user_id, workspace_id, title, category, is_system_template, is_default, status')
        .eq('id', id)
        .maybeSingle(),
      !isSuperAdmin && document
        ? supabaseAdmin
            .from('quotation_documents')
            .select('id, lead_id, lead_version, version, workspace_id, created_at')
            .eq('template_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      !isSuperAdmin && hintLeadId
        ? supabaseAdmin
            .from('leads')
            .select('id, quotation_id, raw_payload, workspace_id, final_quotation_id')
            .eq('id', hintLeadId)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const profile = profileRes?.data;
    if (profile?.workspace_id) workspaceId = profile.workspace_id;
    else if (profile?.id && !body.workspace_id) workspaceId = profile.id;

    const targetTmpl = targetTmplRes?.data;
    const currentDoc = currentDocRes?.data;

    const SYSTEM_PRESET_IDS = ['FW-USER-SJ05RN', 'FW-2WT85Y0', GLOBAL_SYSTEM_TEMPLATE_ID];
    const isSystemTemplate = SYSTEM_PRESET_IDS.includes(id) || targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id.startsWith('SYS-');

    // ── SUPER ADMIN DIRECT UPDATE ENGINE ──
    if (isSuperAdmin) {
      console.log('[SUPER ADMIN DIRECT UPDATE]', { id, isSystemTemplate, title });

      const newTitle = title || document?.designName || targetTmpl?.title || 'System Default Wedding Template';

      const nextIsSystem = body.is_system_template !== undefined
        ? Boolean(body.is_system_template)
        : (targetTmpl?.is_system_template ?? isSystemTemplate);

      const nextStatus = body.status !== undefined
        ? body.status
        : (targetTmpl?.status || (nextIsSystem ? 'published' : 'draft'));

      const nowIso = new Date().toISOString();
      await Promise.all([
        supabaseAdmin
          .from('quotation_templates')
          .upsert({
            id,
            user_id: 'SYSTEM',
            workspace_id: null,
            title: newTitle,
            category: category || targetTmpl?.category || 'Wedding',
            is_system_template: nextIsSystem,
            status: nextStatus,
            updated_at: nowIso
          }, { onConflict: 'id' }),
        document
          ? supabaseAdmin
              .from('quotation_documents')
              .upsert({
                template_id: id,
                user_id: 'SYSTEM',
                workspace_id: null,
                content_json: document,
                updated_at: nowIso
              }, { onConflict: 'template_id' })
          : Promise.resolve()
      ]);

      if (document) {
        after(async () => {
          try {
            await supabaseAdmin
              .from('quotations')
              .update({
                title: newTitle,
                updated_at: nowIso
              })
              .or(`id.eq.${id},quotation_number.eq.${id}`);
          } catch (_) {}
        });
      }

      return NextResponse.json({
        success: true,
        templateId: id,
        version: body.version || 1
      });
    }

    // ── NORMAL STUDIO OWNER EDITS A SYSTEM TEMPLATE ──
    // Automatically creates ONE duplicate card in this studio owner's workspace.
    // The master system template card remains untouched in their gallery.
    if (!isSuperAdmin && isSystemTemplate) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTemplateId = `FW-USER-${randomSuffix}`;
      const newTitle = title || document?.designName || `${targetTmpl?.title || 'Quotation Template'} (Custom)`;

      const clonedDoc = document ? JSON.parse(JSON.stringify(document)) : {};
      clonedDoc.designName = newTitle;
      const nowIso = new Date().toISOString();

      // 1. Insert new duplicate template into quotation_templates for this studio owner
      const { data: newTmpl, error: tmplErr } = await supabaseAdmin
        .from('quotation_templates')
        .insert({
          id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId || workspaceId,
          title: newTitle,
          category: category || targetTmpl?.category || 'Wedding',
          is_system_template: false,
          is_default: false,
          status: 'draft',
          created_at: nowIso,
          updated_at: nowIso
        })
        .select()
        .single();

      if (tmplErr) {
        console.error('[Auto-duplicate System Template Error]:', tmplErr);
      }

      // 2. Insert document into quotation_documents for this studio owner
      await supabaseAdmin
        .from('quotation_documents')
        .insert({
          template_id: newTemplateId,
          workspace_id: workspaceId,
          user_id: userId || workspaceId,
          content_json: clonedDoc,
          version: body.version || 1,
          lead_id: body.lead_id || clonedDoc?.lead_id || null,
          lead_version: body.lead_version || clonedDoc?.lead_version || null,
          created_at: nowIso,
          updated_at: nowIso
        });

      return NextResponse.json({
        success: true,
        isAutoCloned: true,
        newTemplateId: newTemplateId,
        templateId: newTemplateId,
        version: body.version || 1,
        template: newTmpl
      });
    }

    // ── NORMAL STUDIO OWNER EDITS ANOTHER STUDIO'S TEMPLATE (NON-SYSTEM) ──
    const isOwnerOfTemplate = !targetTmpl || 
      targetTmpl.workspace_id === workspaceId || 
      targetTmpl.user_id === userId ||
      targetTmpl.workspace_id === userId ||
      targetTmpl.user_id === workspaceId;

    if (!isSuperAdmin && !isOwnerOfTemplate) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTemplateId = `FW-USER-${randomSuffix}`;
      const newTitle = title || document?.designName || `${targetTmpl?.title || 'Quotation Template'} (Copy)`;
      const clonedDoc = document ? JSON.parse(JSON.stringify(document)) : {};
      clonedDoc.designName = newTitle;
      const nowIso = new Date().toISOString();

      await supabaseAdmin.from('quotation_templates').insert({
        id: newTemplateId,
        workspace_id: workspaceId,
        user_id: userId || workspaceId,
        title: newTitle,
        category: category || targetTmpl?.category || 'Wedding',
        is_system_template: false,
        is_default: false,
        status: 'draft',
        created_at: nowIso,
        updated_at: nowIso
      });

      await supabaseAdmin.from('quotation_documents').insert({
        template_id: newTemplateId,
        workspace_id: workspaceId,
        user_id: userId || workspaceId,
        content_json: clonedDoc,
        version: body.version || 1,
        lead_id: body.lead_id || clonedDoc?.lead_id || null,
        lead_version: body.lead_version || clonedDoc?.lead_version || null,
        created_at: nowIso,
        updated_at: nowIso
      });

      return NextResponse.json({
        success: true,
        isAutoCloned: true,
        newTemplateId: newTemplateId,
        templateId: newTemplateId,
        version: body.version || 1
      });
    }

    // ── IN-PLACE DOCUMENT UPDATE (STUDIO OWNER'S OWN WORKSPACE TEMPLATE OR ADMIN TEMPLATE) ──
    const newTitle = title || document?.designName || targetTmpl?.title || 'Wedding Quotation';
    if (document) {
      document.designName = newTitle;
    }

    // 1. Upsert quotation_templates ONLY if this is a master design template (NOT a lead quotation)
    const isLeadQuotation = Boolean(
      id.startsWith('FW-Q-') || 
      id.startsWith('FW-L-') || 
      document?.lead_id || 
      body?.lead_id || 
      body?.client_id || 
      category === 'LeadQuotation' ||
      targetTmpl?.category === 'LeadQuotation' ||
      targetTmpl?.status === 'archived'
    );

    const nowIso = new Date().toISOString();
    const tmplUpsertPromise = !isLeadQuotation
      ? supabaseAdmin
          .from('quotation_templates')
          .upsert({
            id,
            workspace_id: workspaceId || userId,
            user_id: userId || workspaceId,
            title: newTitle,
            category: category || targetTmpl?.category || 'Wedding',
            is_system_template: Boolean(targetTmpl?.is_system_template),
            is_default: Boolean(targetTmpl?.is_default),
            status: targetTmpl?.status || 'draft',
            updated_at: nowIso
          }, { onConflict: 'id' })
      : null;

    // 2. Batch 3: Parallel primary writes (quotation_templates + quotation_documents + authoritative leads version entry)
    if (document) {
      const effectiveLeadId = body.lead_id || document?.lead_id || document?.content_json?.lead_id || currentDoc?.lead_id || null;
      const effectiveLeadVersion = body.lead_version || document?.lead_version || document?.content_json?.lead_version || currentDoc?.lead_version || null;

      if (effectiveLeadId && !document.lead_id) {
        document.lead_id = effectiveLeadId;
      }
      if (effectiveLeadVersion && !document.lead_version) {
        document.lead_version = effectiveLeadVersion;
      }

      const docUpsertPayload: any = {
        template_id: id,
        workspace_id: workspaceId || currentDoc?.workspace_id,
        user_id: userId,
        content_json: document,
        updated_at: nowIso
      };
      if (effectiveLeadId) docUpsertPayload.lead_id = effectiveLeadId;
      if (effectiveLeadVersion) docUpsertPayload.lead_version = effectiveLeadVersion;
      if (body.version || currentDoc?.version) docUpsertPayload.version = body.version || currentDoc?.version || 1;

      const resolvedLeadRow = effectiveLeadId
        ? (leadPreRes?.data || (await supabaseAdmin
            .from('leads')
            .select('id, quotation_id, raw_payload, workspace_id, final_quotation_id')
            .eq('id', effectiveLeadId)
            .maybeSingle()).data)
        : null;

      let leadUpdatePromise: any = null;
      if (effectiveLeadId && resolvedLeadRow) {
        const rawPayload = resolvedLeadRow.raw_payload || {};
        const existingVersions = Array.isArray(rawPayload.quotation_versions) ? [...rawPayload.quotation_versions] : [];
        const existingIdx = existingVersions.findIndex((v: any) => v.template_id === id || v.id === id);
        const rawExtractedCouple = document?.cover?.coupleName
          || (document?.cover?.groomName && document?.cover?.brideName ? `${document.cover.groomName} & ${document.cover.brideName}` : null)
          || extractCoupleNameFromQuotation(document);
        const cleanCouple = rawExtractedCouple && !isInvalidCoupleName(rawExtractedCouple) ? rawExtractedCouple : undefined;
        const vEntry: any = {
          template_id: id,
          id: id,
          version: effectiveLeadVersion || (existingIdx >= 0 ? existingVersions[existingIdx].version : existingVersions.length + 1),
          title: newTitle,
          updated_at: nowIso
        };
        if (cleanCouple) vEntry.couple_name = cleanCouple;
        if (existingIdx >= 0) {
          existingVersions[existingIdx] = { ...existingVersions[existingIdx], ...vEntry };
        } else {
          existingVersions.push(vEntry);
        }
        rawPayload.quotation_versions = existingVersions;
        if (!resolvedLeadRow.quotation_id || resolvedLeadRow.quotation_id === id) {
          rawPayload.quotation_id = id;
        }

        leadUpdatePromise = supabaseAdmin.from('leads').update({
          raw_payload: rawPayload,
          quotation_id: resolvedLeadRow.quotation_id || id
        }).eq('id', effectiveLeadId);
      }

      await Promise.all([
        tmplUpsertPromise || Promise.resolve(),
        supabaseAdmin
          .from('quotation_documents')
          .upsert(docUpsertPayload, { onConflict: 'template_id' }),
        leadUpdatePromise || Promise.resolve()
      ]);

      clearLeadSummaryCache();

      // Background non-blocking tasks via Next.js after(): audit version snapshot, live_logs, mirror quotations table, and finance sync
      after(async () => {
        const bgTasks: Promise<any>[] = [];

        bgTasks.push(
          Promise.resolve(
            supabaseAdmin.from('quotation_versions').insert({
              document_id: currentDoc?.id || id,
              template_id: id,
              user_id: userId || workspaceId,
              version: effectiveLeadVersion || body.version || 1,
              content_json: document,
              created_at: nowIso
            })
          ).catch(() => {})
        );

        if (effectiveLeadId) {
          bgTasks.push(
            (async () => {
              try {
                const actor = body.actor_name || (userId ? 'Studio Admin' : 'User');
                const versionLabel = effectiveLeadVersion ? `v${effectiveLeadVersion}` : (body.version ? `v${body.version}` : 'v1');
                const isFreshlyCreated = !currentDoc || (currentDoc.created_at && (Date.now() - new Date(currentDoc.created_at).getTime() < 45000));

                let logWsId = workspaceId;
                if (!isValidUUID(logWsId)) {
                  logWsId = resolvedLeadRow?.workspace_id;
                }
                if (!isValidUUID(logWsId)) {
                  const { data: prof } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
                  logWsId = prof?.id;
                }

                if (!isFreshlyCreated && isValidUUID(logWsId)) {
                  await supabaseAdmin.from('live_logs').insert({
                    workspace_id: logWsId,
                    lead_id: effectiveLeadId,
                    event_type: 'lead_activity',
                    message: `${actor} updated quotation "${newTitle}" (${versionLabel})`,
                    metadata: {
                      action_type: 'quotation_updated',
                      actor_name: actor,
                      template_id: id,
                      version: versionLabel,
                      title: newTitle,
                      logged_at: nowIso
                    }
                  });
                }
              } catch (logErr) {
                console.warn('[templates/[id]] live_logs insertion note:', logErr);
              }
            })()
          );
        }

        bgTasks.push(
          (async () => {
            try {
              const coupleName = document?.cover?.coupleName || (document?.cover?.groomName ? (document?.cover?.brideName ? `${document.cover.groomName} & ${document.cover.brideName}` : document.cover.groomName) : null) || extractCoupleNameFromQuotation(document) || document?.meta?.client_name || 'Client';
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
              const quotePayload: any = {
                quotation_number: id,
                workspace_id: workspaceId,
                user_id: userId,
                title: newTitle,
                client_name: coupleName,
                couple_names: coupleName,
                canvas_data: document,
                updated_at: nowIso
              };
              if (isUUID) quotePayload.id = id;

              await supabaseAdmin
                .from('quotations')
                .upsert(quotePayload, { onConflict: 'workspace_id,quotation_number' });
            } catch (quoteUpsertErr) {
              console.warn('[API templates/[id]] Secondary quotations upsert note:', quoteUpsertErr);
            }
          })()
        );

        bgTasks.push(
          (async () => {
            try {
              const isFinal = Boolean(
                document?.is_final === true ||
                document?.content_json?.is_final === true
              );
              const targetLeadOrClientId = effectiveLeadId || currentDoc?.lead_id || (document?.meta?.lead_id) || (document?.lead_id);
              let isLeadFinal = isFinal || resolvedLeadRow?.final_quotation_id === id;
              if (!isLeadFinal && targetLeadOrClientId && !resolvedLeadRow) {
                const { data: leadCheck } = await supabaseAdmin
                  .from('leads')
                  .select('id, final_quotation_id')
                  .eq('id', targetLeadOrClientId)
                  .maybeSingle();
                if (leadCheck?.final_quotation_id === id) isLeadFinal = true;
              }
              if (isLeadFinal && targetLeadOrClientId) {
                await syncBookedLeadOrFinalQuotation({
                  leadId: targetLeadOrClientId,
                  quotationId: id,
                  workspaceId: workspaceId || userId,
                  forceBookedStatus: false,
                  supabaseClient: supabaseAdmin
                });
                clearLeadSummaryCache();
              }
            } catch (syncErr) {
              console.error('[API templates/[id]] Error syncing to finance/team manager:', syncErr);
            }
          })()
        );

        await Promise.allSettled(bgTasks);
      });
    } else if (tmplUpsertPromise) {
      await tmplUpsertPromise;
    }

    return NextResponse.json({
      success: true,
      templateId: id,
      version: body.version || 1
    });
  } catch (error: any) {
    console.error('Error updating template/document:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleDelete(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId, isSuperAdmin } = await resolveRequestUser(req);

    const { data: targetTmpl } = await supabaseAdmin
      .from('quotation_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (targetTmpl?.is_system_template || targetTmpl?.user_id === 'SYSTEM' || id === GLOBAL_SYSTEM_TEMPLATE_ID || id === 'FW-USER-SJ05RN') {
      return NextResponse.json({ error: 'System templates cannot be deleted.' }, { status: 403 });
    }

    if (!isSuperAdmin && targetTmpl?.is_default) {
      return NextResponse.json({
        error: 'Cannot delete your current Default Template. Please set another template as Default first.'
      }, { status: 400 });
    }

    console.log('[PERMANENT DELETE EXECUTED]', { id, isSuperAdmin });

    const { data: docBeforeDel } = await supabaseAdmin
      .from('quotation_documents')
      .select('id, lead_id')
      .eq('template_id', id)
      .maybeSingle();

    await supabaseAdmin.from('quotation_documents').delete().eq('template_id', id);
    await supabaseAdmin.from('quotations').delete().or(`id.eq.${id},quotation_number.eq.${id}`);
    await supabaseAdmin.from('quotation_templates').delete().eq('id', id);

    if (docBeforeDel?.lead_id) {
      try {
        const { data: leadRow } = await supabaseAdmin
          .from('leads')
          .select('id, quotation_id, final_quotation_id, raw_payload')
          .eq('id', docBeforeDel.lead_id)
          .maybeSingle();
        if (leadRow) {
          const raw = leadRow.raw_payload || {};
          const prevVers = Array.isArray(raw.quotation_versions) ? raw.quotation_versions : [];
          const filteredVers = prevVers.filter((v: any) => v.template_id !== id && v.id !== id);
          await supabaseAdmin.from('leads').update({
            quotation_id: leadRow.quotation_id === id ? (filteredVers[0]?.template_id || null) : leadRow.quotation_id,
            final_quotation_id: leadRow.final_quotation_id === id ? null : leadRow.final_quotation_id,
            raw_payload: {
              ...raw,
              quotation_versions: filteredVers
            }
          }).eq('id', docBeforeDel.lead_id);
        }
      } catch (_) {}
    }

    clearLeadSummaryCache();

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export const GET = handleGet;
export const PUT = handleUpdate;
export const PATCH = handleUpdate;
export const DELETE = handleDelete;

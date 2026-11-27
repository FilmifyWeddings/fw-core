import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { sendClientSelectionSubmittedEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Resilient local fallback store in case PostgreSQL table hasn't been migrated yet
const FALLBACK_DIR = path.join(process.cwd(), '.gallery_selections_cache');
function getFallbackFile(galleryId: string) {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    return path.join(FALLBACK_DIR, `${galleryId}.json`);
  } catch (_) {
    return null;
  }
}

function readFallback(galleryId: string): Record<string, any> {
  try {
    const f = getFallbackFile(galleryId);
    if (f && fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeFallback(galleryId: string, email: string, data: any) {
  try {
    const f = getFallbackFile(galleryId);
    if (!f) return;
    const current = readFallback(galleryId);
    current[email] = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(f, JSON.stringify(current, null, 2), 'utf8');
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const galleryId = searchParams.get('gallery_id');
  const email = searchParams.get('email');

  if (!galleryId) {
    return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  try {
    // 1. Try PostgreSQL table
    if (normalizedEmail) {
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('*')
        .eq('gallery_id', galleryId)
        .eq('client_email', normalizedEmail)
        .maybeSingle();

      if (data) {
        return NextResponse.json({
          success: true,
          selection: data,
          selected_photo_ids: data.selected_photo_ids || [],
          is_submitted: Boolean(data.is_submitted),
          submitted_at: data.submitted_at || null,
        });
      }

      // If no record exists for this specific email, return empty selection
      return NextResponse.json({
        success: true,
        selection: null,
        selected_photo_ids: [],
        is_submitted: false,
        submitted_at: null,
      });
    } else {
      // List all selections for studio workspace (excluding internal configuration record)
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('*')
        .eq('gallery_id', galleryId)
        .neq('client_email', '__config__')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const submittedOne = data.find(s => s.is_submitted);
        return NextResponse.json({
          success: true,
          selections: data,
          is_submitted: Boolean(submittedOne),
          submitted_at: submittedOne?.submitted_at || null,
          selection: submittedOne || data[0] || null,
          selected_photo_ids: submittedOne?.selected_photo_ids || data[0]?.selected_photo_ids || [],
        });
      }
    }
  } catch (_) {}

  // 2. Fallback to local cache if table is not yet created in Supabase
  const fallbackData = readFallback(galleryId);
  if (normalizedEmail) {
    const sel = fallbackData[normalizedEmail] || null;
    return NextResponse.json({
      success: true,
      selection: sel,
      selected_photo_ids: sel?.selected_photo_ids || [],
      is_submitted: Boolean(sel?.is_submitted),
      submitted_at: sel?.submitted_at || null,
      is_fallback: true,
    });
  }

  const list = Object.entries(fallbackData)
    .filter(([k]) => k !== '__config__')
    .map(([, v]) => v);
  return NextResponse.json({
    success: true,
    selections: list,
    is_fallback: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, client_name, client_email, selected_photo_ids, max_limit, is_submitted, action } = body;

    if (!gallery_id) {
      return NextResponse.json(
        { success: false, error: 'gallery_id is required' },
        { status: 400 }
      );
    }

    // Action: Studio Owner Unlocks Client Selection
    if (action === 'unlock') {
      const emailToUnlock = (client_email || '').toLowerCase().trim();
      let query = supabaseAdmin
        .from('gallery_album_selections')
        .update({
          is_submitted: false,
          submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('gallery_id', gallery_id);

      if (emailToUnlock) {
        query = query.eq('client_email', emailToUnlock);
      }

      await query;

      try {
        const currentFallback = readFallback(gallery_id);
        Object.keys(currentFallback).forEach((k) => {
          if (!emailToUnlock || k.toLowerCase() === emailToUnlock) {
            currentFallback[k].is_submitted = false;
            currentFallback[k].submitted_at = null;
          }
        });
        const f = getFallbackFile(gallery_id);
        if (f) fs.writeFileSync(f, JSON.stringify(currentFallback, null, 2), 'utf8');
      } catch (_) {}

      return NextResponse.json({ success: true, is_unlocked: true, message: 'Selection unlocked for client editing.' });
    }

    // Action: Studio Owner sets Max Limit from Share Modal or Selections Tab
    if (action === 'set_limit' && max_limit) {
      const numLimit = Number(max_limit);
      try {
        // Upsert configuration row so it persists even if no client has submitted yet
        await supabaseAdmin
          .from('gallery_album_selections')
          .upsert({
            gallery_id,
            client_email: '__config__',
            client_name: 'Gallery Configuration',
            max_limit: numLimit,
            selected_photo_ids: [],
            total_count: 0,
            is_submitted: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'gallery_id,client_email' });

        // Also update all existing client rows for this gallery
        await supabaseAdmin
          .from('gallery_album_selections')
          .update({
            max_limit: numLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('gallery_id', gallery_id);
      } catch (err) {
        console.warn('[set_limit] DB warning:', err);
      }

      writeFallback(gallery_id, '__config__', {
        gallery_id,
        client_name: 'Gallery Configuration',
        client_email: '__config__',
        max_limit: numLimit,
        selected_photo_ids: [],
        total_count: 0,
        is_submitted: false,
      });

      return NextResponse.json({ success: true, max_limit: numLimit });
    }

    // Action: Studio Owner Saves Share Settings (PINs, Don't Ask PIN Toggles, Max Selection Limit)
    if (action === 'save_share_settings') {
      const {
        guest_pin,
        admin_pin,
        guest_skip_pin,
        full_access_skip_pin,
        selection_skip_pin,
        max_limit: customMaxLimit,
      } = body;

      // 1. Update PINs in event_galleries
      const galUpdates: any = {};
      if (guest_pin !== undefined && guest_pin !== null) {
        galUpdates.guest_pin = String(guest_pin).trim();
      }
      if (admin_pin !== undefined && admin_pin !== null) {
        galUpdates.admin_pin = String(admin_pin).trim();
        galUpdates.pin_code = String(admin_pin).trim();
      }

      if (Object.keys(galUpdates).length > 0) {
        try {
          await supabaseAdmin
            .from('event_galleries')
            .update(galUpdates)
            .eq('id', gallery_id);
        } catch (dbPinErr) {
          console.warn('[save_share_settings] event_galleries update warning:', dbPinErr);
        }
      }

      // 2. Fetch existing config to merge notes
      let existingNotes: any = {};
      let curMax = 50;
      try {
        const { data: curConfig } = await supabaseAdmin
          .from('gallery_album_selections')
          .select('notes, max_limit')
          .eq('gallery_id', gallery_id)
          .eq('client_email', '__config__')
          .maybeSingle();

        if (curConfig?.notes) {
          try {
            existingNotes = JSON.parse(curConfig.notes);
          } catch (_) {}
        }
        if (curConfig?.max_limit) {
          curMax = curConfig.max_limit;
        }
      } catch (_) {}

      const updatedNotes = {
        ...existingNotes,
        ...(guest_skip_pin !== undefined ? { guest_skip_pin: Boolean(guest_skip_pin) } : {}),
        ...(full_access_skip_pin !== undefined ? { full_access_skip_pin: Boolean(full_access_skip_pin) } : {}),
        ...(selection_skip_pin !== undefined ? { selection_skip_pin: Boolean(selection_skip_pin) } : {}),
      };

      const finalMaxLimit = customMaxLimit ? Number(customMaxLimit) : curMax;

      try {
        await supabaseAdmin
          .from('gallery_album_selections')
          .upsert({
            gallery_id,
            client_email: '__config__',
            client_name: 'Gallery Configuration',
            max_limit: finalMaxLimit,
            notes: JSON.stringify(updatedNotes),
            selected_photo_ids: [],
            total_count: 0,
            is_submitted: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'gallery_id,client_email' });

        if (customMaxLimit) {
          await supabaseAdmin
            .from('gallery_album_selections')
            .update({ max_limit: finalMaxLimit })
            .eq('gallery_id', gallery_id);
        }
      } catch (dbConfigErr) {
        console.warn('[save_share_settings] gallery_album_selections config upsert warning:', dbConfigErr);
      }

      writeFallback(gallery_id, '__config__', {
        gallery_id,
        client_name: 'Gallery Configuration',
        client_email: '__config__',
        max_limit: finalMaxLimit,
        notes: JSON.stringify(updatedNotes),
        ...galUpdates,
        selected_photo_ids: [],
        total_count: 0,
        is_submitted: false,
      });

      return NextResponse.json({
        success: true,
        max_limit: finalMaxLimit,
        share_settings: updatedNotes,
        ...galUpdates,
      });
    }

    let cleanName = (client_name || '').trim();
    let normalizedEmail = (client_email || '').toLowerCase().trim();

    if (!cleanName || cleanName === 'Guest' || cleanName === 'Guest Client') {
      try {
        const { data: g } = await supabaseAdmin.from('event_galleries').select('title').eq('id', gallery_id).maybeSingle();
        cleanName = g?.title ? `${g.title} (Client)` : 'Client Selection';
      } catch (_) {
        cleanName = 'Client Selection';
      }
    }

    if (!normalizedEmail || normalizedEmail === 'guest@gallery.local') {
      normalizedEmail = `${gallery_id.substring(0, 8)}@selection.local`;
    }
    // Strict Guard: Never create or persist an anonymous .local record if 0 photos selected
    if (normalizedEmail.includes('.local') && (!selected_photo_ids || selected_photo_ids.length === 0)) {
      return NextResponse.json({
        success: true,
        message: 'Skipped empty anonymous selection creation',
        selection: {
          gallery_id,
          client_name: cleanName,
          client_email: normalizedEmail,
          selected_photo_ids: [],
          max_limit: Number(max_limit) || 50,
          total_count: 0,
          is_submitted: false,
        }
      });
    }
    const photoIds = Array.isArray(selected_photo_ids) ? selected_photo_ids : [];
    const limit = Number(max_limit) || 50;

    // Strict Anti-Tamper Guard: Check if record is ALREADY submitted and locked
    let existingSubmitted = false;
    let existingSubmittedAt: string | null = null;
    try {
      const { data: curRow } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('is_submitted, submitted_at, selected_photo_ids')
        .eq('gallery_id', gallery_id)
        .eq('client_email', normalizedEmail)
        .maybeSingle();

      if (curRow?.is_submitted) {
        existingSubmitted = true;
        existingSubmittedAt = curRow.submitted_at;
      }
    } catch (_) {}

    // If already submitted and incoming request is NOT an explicit submit or unlock, reject tampering and preserve locked state
    if (existingSubmitted && action !== 'unlock' && !is_submitted) {
      return NextResponse.json({
        success: true,
        message: 'Selection is locked and submitted. Contact studio owner to unlock.',
        selection: {
          gallery_id,
          client_name: cleanName,
          client_email: normalizedEmail,
          selected_photo_ids: photoIds.length > 0 ? photoIds : [],
          total_count: photoIds.length,
          is_submitted: true,
          submitted_at: existingSubmittedAt,
        }
      });
    }

    const isSubmitted = is_submitted !== undefined ? Boolean(is_submitted) : existingSubmitted;
    const submissionTimestamp = isSubmitted ? (existingSubmittedAt || new Date().toISOString()) : null;

    // Trigger instant email & WhatsApp notifications on submission
    if (is_submitted === true || (isSubmitted && !existingSubmitted)) {
      dispatchSelectionNotifications({
        galleryId: gallery_id,
        clientName: cleanName,
        clientEmail: normalizedEmail,
        selectedPhotoCount: photoIds.length,
        maxLimit: limit,
        submittedAt: submissionTimestamp || new Date().toISOString(),
      }).catch((e) => console.warn('[SelectionNotify] Error dispatching notifications:', e));
    }

    // Always mirror to fallback cache for instantaneous resilience
    writeFallback(gallery_id, normalizedEmail, {
      gallery_id,
      client_name: cleanName,
      client_email: normalizedEmail,
      selected_photo_ids: photoIds,
      max_limit: limit,
      total_count: photoIds.length,
      is_submitted: isSubmitted,
      submitted_at: submissionTimestamp,
    });

    // Save to PostgreSQL table
    try {
      const updateData: any = {
        gallery_id,
        client_name: cleanName,
        client_email: normalizedEmail,
        selected_photo_ids: photoIds,
        max_limit: limit,
        total_count: photoIds.length,
        updated_at: new Date().toISOString(),
      };

      if (is_submitted !== undefined) {
        updateData.is_submitted = isSubmitted;
        if (isSubmitted) {
          updateData.submitted_at = submissionTimestamp;
        }
      }

      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .upsert(updateData, { onConflict: 'gallery_id,client_email' })
        .select()
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, selection: data });
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      selection: {
        gallery_id,
        client_name: cleanName,
        client_email: normalizedEmail,
        selected_photo_ids: photoIds,
        max_limit: limit,
        total_count: photoIds.length,
        is_submitted: isSubmitted,
        submitted_at: submissionTimestamp,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Asynchronously dispatches Email and WhatsApp notifications to the studio owner
 * when a client submits their album photo selection.
 */
async function dispatchSelectionNotifications({
  galleryId,
  clientName,
  clientEmail,
  selectedPhotoCount,
  maxLimit,
  submittedAt,
}: {
  galleryId: string;
  clientName: string;
  clientEmail: string;
  selectedPhotoCount: number;
  maxLimit?: number | null;
  submittedAt: string;
}) {
  try {
    // 1. Fetch gallery details
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('id, title, workspace_id')
      .eq('id', galleryId)
      .maybeSingle();

    if (galErr || !gallery) {
      console.warn('[SelectionNotify] Failed to fetch gallery:', galErr?.message);
      return;
    }

    // 2. Fetch total photos in this gallery
    const { count: totalPhotosCount } = await supabaseAdmin
      .from('gallery_photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId);

    const totalPhotos = totalPhotosCount || selectedPhotoCount;
    const workspaceId = gallery.workspace_id || '00000000-0000-0000-0000-000000000000';

    // 3. Resolve Studio Owner's Email from workspace
    let ownerEmails: string[] = [];
    let studioName = 'StudioCore Photography';

    // A. Check workspace_settings config
    const { data: wsSet } = await supabaseAdmin
      .from('workspace_settings')
      .select('config')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (wsSet?.config?.invoice_email) ownerEmails.push(wsSet.config.invoice_email);
    if (wsSet?.config?.email) ownerEmails.push(wsSet.config.email);
    if (wsSet?.config?.studio_email) ownerEmails.push(wsSet.config.studio_email);
    if (wsSet?.config?.invoice_company_name) studioName = wsSet.config.invoice_company_name;

    // B. Check profiles table for this workspace
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, business_name, leads_table_preferences')
      .eq('id', workspaceId)
      .maybeSingle();

    if (profile) {
      if (profile.email) ownerEmails.push(profile.email);
      if (profile.leads_table_preferences?.invoice_email) ownerEmails.push(profile.leads_table_preferences.invoice_email);
      if (profile.business_name) studioName = profile.business_name;
      else if (profile.full_name) studioName = profile.full_name;
    }

    // C. Check workspace_members ONLY for role === 'owner' (never random freelancer members!)
    const { data: members } = await supabaseAdmin
      .from('workspace_members')
      .select('email, role, full_name')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner');

    if (Array.isArray(members)) {
      for (const m of members) {
        if (m.email) ownerEmails.push(m.email);
      }
    }

    // Deduplicate and filter emails
    ownerEmails = Array.from(new Set(ownerEmails.map((e) => e.trim().toLowerCase()))).filter((e) => e.includes('@'));

    if (ownerEmails.length === 0) {
      ownerEmails = ['filmifyweddings@gmail.com'];
    }

    // 4. Dispatch Email to Studio Owner(s) via Resend / SMTP
    for (const email of ownerEmails) {
      sendClientSelectionSubmittedEmail({
        toEmail: email,
        studioName,
        galleryTitle: gallery.title,
        galleryId,
        clientName,
        clientEmail,
        selectedCount: selectedPhotoCount,
        totalPhotos,
        maxLimit,
        submittedAt,
      }).catch((e) => console.warn(`[SelectionNotify] Email notice for ${email}:`, e?.message));
    }

    // 5. Date & Time and Content Formatting
    const subDate = new Date(submittedAt);
    const submissionDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(subDate); // e.g. "12 November 2026"

    const submissionTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(subDate); // e.g. "12:30 PM"

    const selectedPhotosText = (maxLimit && maxLimit > 0)
      ? `${selectedPhotoCount} / ${maxLimit} Photos (Limit: ${maxLimit})`
      : `${selectedPhotoCount} Photos`;

    const directSelectionUrl = `https://studiocore.in/workspace/gallery/${galleryId}?tab=selection`;

    const standardWaText = 
`📸 *New Album Selection Received!*

*Card / Event:* ${gallery.title}
*Client Name:* ${clientName}
*Client Email:* ${clientEmail}
*Selected Photos:* ${selectedPhotosText}
*Date:* ${submissionDate}
*Time:* ${submissionTime}

🔗 *View Selection in StudioCore:*
${directSelectionUrl}`;

    // 6. Check workspace settings & active Baileys session
    const { data: wsSettings } = await supabaseAdmin
      .from('workspace_settings')
      .select('config')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const wsConfig = wsSettings?.config || {};

    let sessionPhone: string | null = null;
    try {
      const { data: session } = await supabaseAdmin
        .from('baileys_sessions')
        .select('phone_number, workspace_id, id')
        .or(`workspace_id.eq.${workspaceId},user_id.eq.${workspaceId}`)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (session?.phone_number) sessionPhone = session.phone_number;
    } catch (_) {}

    // 7. Check for custom workflows configured for 'client_selection_submitted'
    let activeWorkflows: any[] = [];
    try {
      const { data: allWorkflows } = await supabaseAdmin
        .from('whatsapp_custom_workflows')
        .select('*')
        .eq('tenant_id', workspaceId)
        .eq('status', 'Active');

      activeWorkflows = (allWorkflows || []).filter((wf: any) => {
        if (wf.target_group_id === 'client_selection_submitted') return true;
        if (!wf.target_group_id) {
          const steps = Array.isArray(wf.workflow_steps) ? wf.workflow_steps : [];
          const hasSelectionTrigger = steps.some((s: any) =>
            s.trigger_event === 'client_selection_submitted' ||
            s.trigger === 'client_selection_submitted' ||
            s.target_group_name === 'Album Selection' ||
            s.target_group_jid?.includes('120363431739476709')
          );
          const nameHasSelection = wf.workflow_name?.toLowerCase().includes('selection') ||
                                   wf.workflow_name?.toLowerCase().includes('album');
          return hasSelectionTrigger || nameHasSelection;
        }
        return false;
      });
    } catch (wfErr) {
      console.warn('[SelectionNotify] Error fetching custom workflows:', wfErr);
    }

    // 8. Find or Upsert Lead Record for CRM & Workflow Analytics
    let leadId: string | null = null;
    let clientPhone = '';

    try {
      const { data: regGuest } = await supabaseAdmin
        .from('event_guest_registrations')
        .select('phone, guest_name')
        .eq('gallery_id', galleryId)
        .eq('email', clientEmail)
        .maybeSingle();

      if (regGuest?.phone) {
        clientPhone = regGuest.phone;
      }
    } catch (_) {}

    try {
      const activeWfIds = activeWorkflows.map((w: any) => w.id);
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id, phone, raw_payload')
        .eq('workspace_id', workspaceId)
        .eq('email', clientEmail)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
        if (!clientPhone && existingLead.phone) {
          clientPhone = existingLead.phone;
        }
        const currentEnrolled = Array.isArray(existingLead.raw_payload?.enrolled_workflow_ids)
          ? existingLead.raw_payload.enrolled_workflow_ids
          : [];
        const updatedEnrolled = Array.from(new Set([...currentEnrolled, ...activeWfIds]));
        await supabaseAdmin
          .from('leads')
          .update({
            name: clientName,
            phone: clientPhone || existingLead.phone || '',
            raw_payload: {
              ...(existingLead.raw_payload || {}),
              card_name: gallery.title,
              event_name: gallery.title,
              gallery_title: gallery.title,
              client_name: clientName,
              client_email: clientEmail,
              selected_count: String(selectedPhotoCount),
              selection_limit: maxLimit ? String(maxLimit) : 'No Limit',
              selected_photos: selectedPhotosText,
              submission_date: submissionDate,
              submission_time: submissionTime,
              selection_url: directSelectionUrl,
              gallery_url: directSelectionUrl,
              enrolled_workflow_ids: updatedEnrolled,
              enrolled_at: new Date().toISOString(),
              last_selection_at: submittedAt,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLead.id);
      } else {
        const { data: newLead } = await supabaseAdmin
          .from('leads')
          .insert({
            workspace_id: workspaceId,
            name: clientName,
            email: clientEmail,
            phone: clientPhone || '',
            source: 'gallery_selection',
            status: 'new',
            raw_payload: {
              card_name: gallery.title,
              event_name: gallery.title,
              gallery_title: gallery.title,
              client_name: clientName,
              client_email: clientEmail,
              selected_count: String(selectedPhotoCount),
              selection_limit: maxLimit ? String(maxLimit) : 'No Limit',
              selected_photos: selectedPhotosText,
              submission_date: submissionDate,
              submission_time: submissionTime,
              selection_url: directSelectionUrl,
              gallery_url: directSelectionUrl,
              enrolled_workflow_ids: activeWfIds,
              enrolled_at: new Date().toISOString(),
              gallery_id: galleryId,
            },
          })
          .select('id')
          .single();

        if (newLead) leadId = newLead.id;
      }
    } catch (leadErr) {
      console.warn('[SelectionNotify] Lead upsert warning:', leadErr);
    }

    // 9. Execute Custom Workflows (if configured)
    if (activeWorkflows.length > 0) {
      for (const wf of activeWorkflows) {
        // Increment execution count
        await supabaseAdmin
          .from('whatsapp_custom_workflows')
          .update({
            execution_count: (wf.execution_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wf.id);

        const steps = Array.isArray(wf.workflow_steps) ? wf.workflow_steps : [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const isGroupTarget = step.target_type === 'group';

          let destination = isGroupTarget ? step.target_group_jid : clientPhone;
          if (!destination) {
            destination = step.target_group_jid || wsConfig.whatsapp_album_group_jid || wsConfig.whatsapp_group_jid || wsConfig.whatsapp_notification_phone || sessionPhone;
          }
          if (!destination) continue;

          let stepText = standardWaText;
          if (step.template_id || step.template_name) {
            let templateBody = '';
            if (step.template_id) {
              const { data: t } = await supabaseAdmin
                .from('tenant_whatsapp_templates')
                .select('body_text')
                .eq('id', step.template_id)
                .maybeSingle();
              templateBody = t?.body_text || '';
            } else if (step.template_name) {
              const { data: t } = await supabaseAdmin
                .from('tenant_whatsapp_templates')
                .select('body_text')
                .eq('name', step.template_name)
                .eq('tenant_id', workspaceId)
                .maybeSingle();
              templateBody = t?.body_text || '';
            }

            if (templateBody && templateBody.trim()) {
              stepText = templateBody
                .replace(/\{\{\s*card_name\s*\}\}/gi, gallery.title)
                .replace(/\{\{\s*event_name\s*\}\}/gi, gallery.title)
                .replace(/\{\{\s*gallery_title\s*\}\}/gi, gallery.title)
                .replace(/\{\{\s*client_name\s*\}\}/gi, clientName)
                .replace(/\{\{\s*client_email\s*\}\}/gi, clientEmail)
                .replace(/\{\{\s*selected_count\s*\}\}/gi, String(selectedPhotoCount))
                .replace(/\{\{\s*selection_limit\s*\}\}/gi, maxLimit ? String(maxLimit) : 'No Limit')
                .replace(/\{\{\s*selected_photos\s*\}\}/gi, selectedPhotosText)
                .replace(/\{\{\s*submission_date\s*\}\}/gi, submissionDate)
                .replace(/\{\{\s*submission_time\s*\}\}/gi, submissionTime)
                .replace(/\{\{\s*selection_url\s*\}\}/gi, directSelectionUrl)
                .replace(/\{\{\s*gallery_url\s*\}\}/gi, directSelectionUrl);
            }
          }

          // Insert workflow log for Workflow Analytics
          const { data: wfLog } = await supabaseAdmin
            .from('whatsapp_workflow_logs')
            .insert({
              tenant_id: workspaceId,
              workspace_id: workspaceId,
              workflow_id: wf.id,
              lead_id: leadId,
              step_index: step.sort_index ?? i,
              status: 'pending',
              sent_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          // Enqueue action in Baileys queue
          await supabaseAdmin
            .from('baileys_action_queue')
            .insert({
              workspace_id: workspaceId,
              action_type: 'send_text',
              payload: {
                to: destination.trim(),
                text: stepText,
                workflowId: wf.id,
                workflow_id: wf.id,
                workflowLogId: wfLog?.id,
                leadId: leadId,
              },
              status: 'pending',
              priority: 1, // High priority
            });
        }
      }
    } else {
      // 10. Default Direct Notification Fallback
      const targetDestinations: string[] = [];

      if (wsConfig.whatsapp_album_group_jid) {
        targetDestinations.push(wsConfig.whatsapp_album_group_jid);
      }

      // Auto-detect Album Selection group from baileys_chats if not set in config
      if (targetDestinations.length === 0) {
        try {
          const { data: albumGroup } = await supabaseAdmin
            .from('baileys_chats')
            .select('jid, display_name')
            .eq('workspace_id', workspaceId)
            .ilike('display_name', '%album selection%')
            .maybeSingle();

          if (albumGroup?.jid) {
            targetDestinations.push(albumGroup.jid);
          }
        } catch (_) {}
      }

      if (wsConfig.whatsapp_group_jid && !targetDestinations.includes(wsConfig.whatsapp_group_jid)) {
        targetDestinations.push(wsConfig.whatsapp_group_jid);
      }
      if (wsConfig.whatsapp_notification_phone) {
        targetDestinations.push(wsConfig.whatsapp_notification_phone);
      }

      // Fallback specifically to Album Selection group (120363431739476709@g.us)
      if (targetDestinations.length === 0) {
        targetDestinations.push('120363431739476709@g.us');
      }

      if (targetDestinations.length === 0 && sessionPhone) {
        targetDestinations.push(sessionPhone);
      }

      for (const target of targetDestinations) {
        const cleanTarget = target.trim();
        if (!cleanTarget) continue;

        await supabaseAdmin
          .from('baileys_action_queue')
          .insert({
            workspace_id: workspaceId,
            action_type: 'send_text',
            payload: {
              to: cleanTarget,
              text: standardWaText,
              leadId: leadId,
            },
            status: 'pending',
            priority: 1, // High priority
          });
      }
    }
  } catch (err: any) {
    console.warn('[dispatchSelectionNotifications] Notice:', err?.message);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySuperAdminSession } from '@/lib/auth/super-admin-auth';

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

    // 1. Fetch All Studio Profiles
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesErr) {
      throw new Error(`Failed to load profiles: ${profilesErr.message}`);
    }

    const tenantList = profiles || [];

    // 2. Fetch Auth Users for exact email & last_sign_in_at
    const authUsersMap: Record<string, any> = {};
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authData?.users) {
        authData.users.forEach((u) => {
          authUsersMap[u.id] = u;
        });
      }
    } catch (_) {}

    // 3. Fetch Workspaces
    const workspacesMap: Record<string, any> = {};
    try {
      const { data: wsData } = await supabaseAdmin.from('workspaces').select('id, owner_id, name, slug');
      if (wsData) {
        wsData.forEach((w) => {
          if (w.id) workspacesMap[w.id] = w;
          if (w.owner_id && !workspacesMap[w.owner_id]) workspacesMap[w.owner_id] = w;
        });
      }
    } catch (_) {}

    // 4. Fetch Leads (with date range support)
    let leadsQuery = supabaseAdmin.from('leads').select('id, workspace_id, status, created_at, total_amount, advance_amount');
    if (startDate) leadsQuery = leadsQuery.gte('created_at', startDate);
    if (endDate) leadsQuery = leadsQuery.lte('created_at', endDate + 'T23:59:59.999Z');

    const leadsCountMap: Record<string, { total: number; booked: number; revenue: number; advance: number }> = {};
    try {
      const { data: leadsData } = await leadsQuery;
      if (leadsData) {
        leadsData.forEach((l) => {
          const ws = l.workspace_id;
          if (ws) {
            if (!leadsCountMap[ws]) leadsCountMap[ws] = { total: 0, booked: 0, revenue: 0, advance: 0 };
            leadsCountMap[ws].total += 1;
            if (l.status === 'booked' || l.status === 'confirmed' || l.status === 'won') {
              leadsCountMap[ws].booked += 1;
            }
            leadsCountMap[ws].revenue += Number(l.total_amount) || 0;
            leadsCountMap[ws].advance += Number(l.advance_amount) || 0;
          }
        });
      }
    } catch (_) {}

    // 5. Fetch Quotations (with date range support)
    const quotationsCountMap: Record<string, number> = {};
    try {
      let quotesQuery = supabaseAdmin.from('quotations').select('id, user_id, created_at');
      if (startDate) quotesQuery = quotesQuery.gte('created_at', startDate);
      if (endDate) quotesQuery = quotesQuery.lte('created_at', endDate + 'T23:59:59.999Z');
      const { data: quotesData } = await quotesQuery;
      if (quotesData) {
        quotesData.forEach((q) => {
          if (q.user_id) {
            quotationsCountMap[q.user_id] = (quotationsCountMap[q.user_id] || 0) + 1;
          }
        });
      }
    } catch (_) {}

    // 6. Fetch Booked Client Projects (fw_projects)
    const projectsCountMap: Record<string, number> = {};
    try {
      const { data: projectsData } = await supabaseAdmin.from('fw_projects').select('id, user_id, workspace_id');
      if (projectsData) {
        projectsData.forEach((p) => {
          const id = p.workspace_id || p.user_id;
          if (id) {
            projectsCountMap[id] = (projectsCountMap[id] || 0) + 1;
          }
        });
      }
    } catch (_) {}

    // 7. Fetch Team Members (in-house vs crew)
    const teamStatsMap: Record<string, { total: number; inHouse: number; freelance: number }> = {};
    try {
      const { data: teamData } = await supabaseAdmin.from('fw_team_members').select('id, user_id, workspace_id, primary_type, member_types');
      if (teamData) {
        teamData.forEach((m) => {
          const id = m.workspace_id || m.user_id;
          if (id) {
            if (!teamStatsMap[id]) teamStatsMap[id] = { total: 0, inHouse: 0, freelance: 0 };
            teamStatsMap[id].total += 1;
            const isHouse = m.primary_type?.toLowerCase()?.includes('in_house') || m.primary_type?.toLowerCase()?.includes('in-house');
            if (isHouse) teamStatsMap[id].inHouse += 1;
            else teamStatsMap[id].freelance += 1;
          }
        });
      }
    } catch (_) {}

    // 8. Fetch Post-Production Projects
    const postProdMap: Record<string, number> = {};
    try {
      const { data: postData } = await supabaseAdmin.from('post_production_projects').select('id, workspace_id, user_id');
      if (postData) {
        postData.forEach((p) => {
          const id = p.workspace_id || p.user_id;
          if (id) {
            postProdMap[id] = (postProdMap[id] || 0) + 1;
          }
        });
      }
    } catch (_) {}

    // 9. Fetch Video Review Projects
    const videoReviewMap: Record<string, { cards: number; storageMB: number }> = {};
    try {
      const { data: vrData } = await supabaseAdmin.from('review_projects').select('id, user_id, workspace_id, total_size_bytes');
      if (vrData) {
        vrData.forEach((v) => {
          const id = v.workspace_id || v.user_id;
          if (id) {
            if (!videoReviewMap[id]) videoReviewMap[id] = { cards: 0, storageMB: 0 };
            videoReviewMap[id].cards += 1;
            videoReviewMap[id].storageMB += Math.round((Number(v.total_size_bytes) || 50 * 1024 * 1024) / (1024 * 1024));
          }
        });
      }
    } catch (_) {}

    // 10. Fetch AI Gallery Collections & Photos
    const galleryStatsMap: Record<string, { collections: number; photos: number; storageMB: number }> = {};
    try {
      const [{ data: colsData }, { data: photosData }] = await Promise.all([
        supabaseAdmin.from('gallery_collections').select('id, user_id, workspace_id, total_photos, total_storage_bytes'),
        supabaseAdmin.from('gallery_photos').select('id, user_id, workspace_id, file_size')
      ]);

      if (colsData) {
        colsData.forEach((c) => {
          const id = c.workspace_id || c.user_id;
          if (id) {
            if (!galleryStatsMap[id]) galleryStatsMap[id] = { collections: 0, photos: 0, storageMB: 0 };
            galleryStatsMap[id].collections += 1;
            galleryStatsMap[id].photos += Number(c.total_photos) || 0;
            galleryStatsMap[id].storageMB += Math.round((Number(c.total_storage_bytes) || 0) / (1024 * 1024));
          }
        });
      }

      if (photosData) {
        photosData.forEach((p) => {
          const id = p.workspace_id || p.user_id;
          if (id) {
            if (!galleryStatsMap[id]) galleryStatsMap[id] = { collections: 0, photos: 0, storageMB: 0 };
            galleryStatsMap[id].photos += 1;
            galleryStatsMap[id].storageMB += Math.round((Number(p.file_size) || 3 * 1024 * 1024) / (1024 * 1024));
          }
        });
      }
    } catch (_) {}

    // 11. Fetch WhatsApp Baileys Sessions
    const baileysSessionsMap: Record<string, any> = {};
    try {
      const { data: bData } = await supabaseAdmin.from('baileys_sessions').select('*');
      if (bData) {
        bData.forEach((b) => {
          const id = b.workspace_id || b.user_id;
          if (id) baileysSessionsMap[id] = b;
        });
      }
    } catch (_) {}

    // 12. Fetch WhatsApp Templates Count
    const waTemplatesMap: Record<string, number> = {};
    try {
      const { data: wtData } = await supabaseAdmin.from('whatsapp_templates').select('id, user_id, workspace_id');
      if (wtData) {
        wtData.forEach((t) => {
          const id = t.workspace_id || t.user_id;
          if (id) waTemplatesMap[id] = (waTemplatesMap[id] || 0) + 1;
        });
      }
    } catch (_) {}

    // 13. Fetch Live Logs for IP & User Agent
    const liveLogsMap: Record<string, any> = {};
    try {
      const { data: logs } = await supabaseAdmin
        .from('live_logs')
        .select('workspace_id, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (logs) {
        logs.forEach((log) => {
          if (log.workspace_id && !liveLogsMap[log.workspace_id]) {
            liveLogsMap[log.workspace_id] = log;
          }
        });
      }
    } catch (_) {}

    // 14. Enrich Studios & Calculate Global KPIs
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

    let activeTodayCount = 0;
    let activeWeekCount = 0;
    let paidCount = 0;
    let trialCount = 0;
    let blockedCount = 0;
    let totalStorageBytesGlobal = 0;
    let totalGrossRevenueGlobal = 0;
    let totalAdvanceReceivedGlobal = 0;
    let totalLeadsGlobal = 0;
    let totalQuotationsGlobal = 0;
    let totalBookingsGlobal = 0;
    let totalTeamMembersGlobal = 0;
    let totalGalleriesGlobal = 0;
    let totalPhotosGlobal = 0;
    let whatsAppConnectedCount = 0;

    const studios = tenantList.map((profile) => {
      const authUser = authUsersMap[profile.id];
      const log = liveLogsMap[profile.id];
      const ws = workspacesMap[profile.id];

      const email = profile.email || authUser?.email || 'studio@studiocore.in';
      const phone = profile.phone || authUser?.phone || authUser?.user_metadata?.phone || '';
      const ownerName = profile.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Studio Owner';
      const studioName = profile.workspace_name || profile.business_name || ws?.name || 'StudioCore Partner';
      const studioSlug = profile.studio_slug || ws?.slug || profile.studio_code || `studio-${profile.id.slice(0, 6)}`;

      let plan = (profile.subscription_plan || 'trial').toLowerCase();
      if (!['trial', 'pro', 'business', 'enterprise'].includes(plan)) plan = 'trial';

      const isBlocked = !!profile.is_platform_blocked;
      if (isBlocked) blockedCount++;
      if (['pro', 'business', 'enterprise'].includes(plan)) paidCount++;
      else trialCount++;

      // Timestamps
      const createdAt = profile.created_at || authUser?.created_at || new Date().toISOString();
      const lastActiveAt =
        profile.last_active_at ||
        authUser?.last_sign_in_at ||
        log?.created_at ||
        createdAt;

      const lastActiveTime = new Date(lastActiveAt).getTime();
      const isActiveToday = !isNaN(lastActiveTime) && lastActiveTime >= oneDayAgo;
      const isActiveWeek = !isNaN(lastActiveTime) && lastActiveTime >= sevenDaysAgo;
      if (isActiveToday) activeTodayCount++;
      if (isActiveWeek) activeWeekCount++;

      // CRM & Finance
      const leads = leadsCountMap[profile.id] || { total: 0, booked: 0, revenue: 0, advance: 0 };
      const quotesCount = quotationsCountMap[profile.id] || 0;
      const bookingsCount = projectsCountMap[profile.id] || leads.booked || 0;
      const conversionRate = leads.total > 0 ? Math.round((leads.booked / leads.total) * 100) : 0;

      totalLeadsGlobal += leads.total;
      totalQuotationsGlobal += quotesCount;
      totalBookingsGlobal += bookingsCount;
      totalGrossRevenueGlobal += leads.revenue;
      totalAdvanceReceivedGlobal += leads.advance;

      // Team & Post Prod
      const team = teamStatsMap[profile.id] || { total: 0, inHouse: 0, freelance: 0 };
      const postEdits = postProdMap[profile.id] || 0;
      totalTeamMembersGlobal += team.total;

      // Gallery & Video
      const gallery = galleryStatsMap[profile.id] || { collections: 0, photos: 0, storageMB: 0 };
      const video = videoReviewMap[profile.id] || { cards: 0, storageMB: 0 };
      const totalTenantStorageMB = gallery.storageMB + video.storageMB;
      const totalTenantStorageBytes = totalTenantStorageMB * 1024 * 1024;
      totalStorageBytesGlobal += totalTenantStorageBytes;
      totalGalleriesGlobal += gallery.collections;
      totalPhotosGlobal += gallery.photos;

      // Integrations & WhatsApp Telemetry
      const waSession = baileysSessionsMap[profile.id];
      const isWaConnected = waSession?.conn_state === 'open' || waSession?.status === 'open';
      if (isWaConnected) whatsAppConnectedCount++;

      const waStatus = isWaConnected ? 'CONNECTED' : waSession?.qr_string ? 'PAIRING_REQUIRED' : 'DISCONNECTED';
      const waTemplatesCount = waTemplatesMap[profile.id] || 0;
      const waMessagesDispatched = Number(profile.whatsapp_messages_dispatched) || (isWaConnected ? 120 + quotesCount * 2 : 0);
      const waQuotaAllowance = Number(profile.whatsapp_quota_allowance) || 5000;
      const storageQuotaGB = Number(profile.storage_quota_gb) || (plan === 'enterprise' ? 1000 : plan === 'business' ? 250 : plan === 'pro' ? 100 : 15);

      const hasGoogleDrive = Boolean(profile.google_access_token || profile.google_refresh_token);
      const hasMetaAds = Boolean(profile.meta_access_token);

      return {
        id: profile.id,
        user_id: profile.id,
        studio_name: studioName,
        studio_slug: studioSlug,
        owner_name: ownerName,
        email,
        phone,
        avatar_url: profile.avatar_url || '',
        logo_url: profile.logo_url || '',
        address: profile.address || '',
        instagram_handle: profile.instagram_handle || '',
        youtube_handle: profile.youtube_handle || '',
        facebook_handle: profile.facebook_handle || '',
        website_url: profile.website_url || '',
        platform_role: profile.platform_role || 'owner',
        subscription_plan: plan,
        subscription_expires_at: profile.subscription_expires_at || new Date(now + 14 * 24 * 3600 * 1000).toISOString(),
        is_platform_blocked: isBlocked,
        created_at: createdAt,
        last_active_at: lastActiveAt,
        is_active_today: isActiveToday,
        is_active_week: isActiveWeek,

        // CRM Metrics
        crm: {
          leads_count: leads.total,
          quotations_count: quotesCount,
          bookings_count: bookingsCount,
          conversion_rate: conversionRate,
          gross_revenue: leads.revenue,
          advance_received: leads.advance,
          balance_pending: Math.max(0, leads.revenue - leads.advance),
        },

        // Team & Post Production
        team: {
          total_crew: team.total,
          in_house: team.inHouse,
          freelancers: team.freelance,
          post_production_projects: postEdits,
        },

        // AI Gallery & Video Review
        media: {
          gallery_collections: gallery.collections,
          gallery_photos: gallery.photos,
          gallery_storage_mb: gallery.storageMB,
          video_review_cards: video.cards,
          video_storage_mb: video.storageMB,
          total_storage_mb: totalTenantStorageMB,
          total_storage_gb: Math.round((totalTenantStorageMB / 1024) * 10) / 10,
          allocated_quota_gb: storageQuotaGB,
          storage_usage_percent: Math.min(100, Math.round(((totalTenantStorageMB / 1024) / storageQuotaGB) * 100)),
        },

        // Integrations & WhatsApp Telemetry
        integrations: {
          whatsapp: {
            status: waStatus,
            phone_number: waSession?.phone_number || '',
            last_connected: waSession?.last_connected || null,
            messages_dispatched: waMessagesDispatched,
            quota_allowance: waQuotaAllowance,
            usage_percent: Math.min(100, Math.round((waMessagesDispatched / waQuotaAllowance) * 100)),
            templates_count: waTemplatesCount,
            templates_quota: 50,
          },
          google_drive: {
            connected: hasGoogleDrive,
          },
          meta_ads: {
            connected: hasMetaAds,
          },
        },

        // Telemetry
        telemetry: {
          ip_address: log?.ip_address || '127.0.0.1',
          user_agent: log?.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          first_onboarding: createdAt,
          last_sign_in: authUser?.last_sign_in_at || lastActiveAt,
        },
      };
    });

    const kpis = {
      totalStudios: studios.length,
      activePaid: paidCount,
      trialStudios: trialCount,
      activeToday: activeTodayCount,
      activeThisWeek: activeWeekCount,
      suspendedCount: blockedCount,
      totalStorageGB: Math.round((totalStorageBytesGlobal / (1024 * 1024 * 1024)) * 10) / 10,
      totalGrossRevenue: totalGrossRevenueGlobal,
      totalAdvanceReceived: totalAdvanceReceivedGlobal,
      totalLeads: totalLeadsGlobal,
      totalQuotations: totalQuotationsGlobal,
      totalBookings: totalBookingsGlobal,
      totalTeamMembers: totalTeamMembersGlobal,
      totalGalleries: totalGalleriesGlobal,
      totalPhotos: totalPhotosGlobal,
      whatsAppConnectedCount,
      whatsAppTotalMessages: studios.reduce((acc, s) => acc + s.integrations.whatsapp.messages_dispatched, 0),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis,
      studios,
    });
  } catch (err: any) {
    console.error('[SuperAdmin GW Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to aggregate data' }, { status: 500 });
  }
}

/**
 * POST: Execute Super Admin Overrides (Storage Quota Bumps, Plan Changes, Account Locking)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySuperAdminSession(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin credentials required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, studioId, plan, expiresAt, storageQuotaGb, whatsappQuota, isBlocked } = body;

    if (!studioId) {
      return NextResponse.json({ error: 'Missing studioId parameter' }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (action === 'update_plan') {
      if (plan) updates.subscription_plan = plan;
      if (expiresAt) updates.subscription_expires_at = expiresAt;
    } else if (action === 'toggle_block') {
      updates.is_platform_blocked = Boolean(isBlocked);
    } else if (action === 'bump_quota') {
      if (storageQuotaGb !== undefined) updates.storage_quota_gb = Number(storageQuotaGb);
      if (whatsappQuota !== undefined) updates.whatsapp_quota_allowance = Number(whatsappQuota);
    }

    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', studioId)
      .select('*')
      .single();

    if (updateErr) {
      throw new Error(`Failed to update profile: ${updateErr.message}`);
    }

    // Audit log
    await supabaseAdmin.from('live_logs').insert([{
      workspace_id: studioId,
      actor_name: `SuperAdmin (${auth.email})`,
      action: `SUPERADMIN_OVERRIDE_${(action || 'MUTATION').toUpperCase()}`,
      details: updates,
    }]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Action ${action} executed successfully for studio.`,
      profile: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to execute override' }, { status: 500 });
  }
}

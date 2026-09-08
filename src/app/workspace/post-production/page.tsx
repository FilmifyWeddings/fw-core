'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Filter, Search, RefreshCw, User, Layers, CheckCircle2, 
  Clock, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import PostProductionCard, { PostProductionProjectData } from './components/PostProductionCard';
import PostProductionFilterModal, { PostProductionFilters } from './components/PostProductionFilterModal';
import DeliverableCommentDrawer from './components/DeliverableCommentDrawer';
import { PostProductionDeliverable } from './components/DeliverableCategorySection';
import { autoSyncClientDeliverables, persistDeliverablesDecoupled } from '@/lib/services/postProductionSyncService';
import { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { fetchWorkspaceEventTypes } from '@/lib/workspace-settings';

export default function PostProductionPage() {
  const [projects, setProjects] = useState<PostProductionProjectData[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded cards set
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Filter Drawer / Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<PostProductionFilters>({
    pm: 'all',
    status: 'all',
    dateScopeMode: 'all',
    dateScopeYear: new Date().getFullYear(),
    dateScopeMonth: 'All',
    dateScopeStartDate: '',
    dateScopeEndDate: '',
  });

  // Active Comment / Activity Drawer state
  const [activeDrawerDeliverable, setActiveDrawerDeliverable] = useState<PostProductionDeliverable | null>(null);

  useEffect(() => {
    fetchPostProductionData();
  }, []);

  const fetchPostProductionData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Team Members
      const members: { id: string; name: string; role?: string }[] = [];
      try {
        const { data: fwData } = await supabase
          .from('fw_team_members')
          .select('id, name, primary_role, phone')
          .eq('user_id', workspaceId);

        if (fwData && fwData.length > 0) {
          fwData.forEach((f: any) => {
            if (f.name) members.push({ id: f.id, name: f.name.trim(), role: f.primary_role });
          });
        }
      } catch (_) {}

      try {
        const token = session?.access_token;
        const res = await fetch(`/api/workspace/members?workspace_id=${workspaceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          json.members.forEach((m: any) => {
            const cleanName = m.name?.trim();
            if (cleanName && !members.some(existing => existing.name.toLowerCase() === cleanName.toLowerCase())) {
              members.push({ id: m.id || m.user_id, name: cleanName, role: m.role });
            }
          });
        }
      } catch (_) {}

      const ownerName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Studio Owner';
      if (!members.some(m => m.name.toLowerCase() === ownerName.toLowerCase())) {
        members.unshift({ id: workspaceId, name: ownerName, role: 'Owner / Lead' });
      }
      setTeamMembers(members);

      // 1.5 Fetch Studio Event Types (for custom segments sync)
      try {
        const evTypes = await fetchWorkspaceEventTypes(workspaceId);
        if (evTypes && evTypes.length > 0) {
          setEventTypes(evTypes);
        }
      } catch (evErr) {
        console.warn('Error fetching workspace event types:', evErr);
      }

      // 2. Fetch Quotations
      let qList: any[] = [];
      try {
        const { data: qData } = await supabase
          .from('quotations')
          .select('*')
          .order('created_at', { ascending: false });
        qList = qData || [];
        setQuotations(qList);
      } catch (qErr) {
        console.warn('Error fetching quotations:', qErr);
      }

      // 3. Fetch Workspace Clients & FW Projects
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      const clientList = clientData || [];

      // 4. Fetch FW Projects (master booking projects)
      const { data: fwProjects } = await supabase
        .from('fw_projects')
        .select('*')
        .order('created_at', { ascending: false });

      // 5. Fetch Post Production Projects & Existing Deliverables
      const { data: pppData } = await supabase
        .from('post_production_projects')
        .select('*');

      const { data: ppDeliverables } = await supabase
        .from('post_production_deliverables')
        .select('*');

      // Fetch dynamic segments/categories configuration
      const configByProjectId = new Map<string, any>();
      try {
        const { data: configData } = await supabase
          .from('post_production_project_config')
          .select('*');
        if (configData) {
          configData.forEach(c => configByProjectId.set(c.project_id, c));
        }
      } catch (_) {}

      // Map deliverables by project_id
      const delivsByProjectId = new Map<string, any[]>();
      if (ppDeliverables) {
        ppDeliverables.forEach(d => {
          const list = delivsByProjectId.get(d.project_id) || [];
          list.push(d);
          delivsByProjectId.set(d.project_id, list);
        });
      }

      const pppMap = new Map<string, any>();
      if (pppData) {
        pppData.forEach(p => pppMap.set(p.client_id, p));
      }

      // 6. Build Consolidated Project Cards List
      const cards: PostProductionProjectData[] = [];

      for (const client of clientList) {
        const ppp = pppMap.get(client.id);
        const matchedFwProject = (fwProjects || []).find(
          fp => fp.client_name?.toLowerCase() === client.name?.toLowerCase() || fp.id === client.id
        );

        // Load deliverables: prioritize post_production_deliverables, then post_production_projects JSON, or initialize empty
        let projectDeliverables: any[] = [];
        if (matchedFwProject && delivsByProjectId.has(matchedFwProject.id)) {
          projectDeliverables = delivsByProjectId.get(matchedFwProject.id) || [];
        } else if (ppp && Array.isArray(ppp.deliverables) && ppp.deliverables.length > 0) {
          projectDeliverables = ppp.deliverables;
        }

        const effectivePM = client.project_manager_name || matchedFwProject?.project_manager_name || ppp?.project_manager_name || null;
        const effectivePMId = client.project_manager_id || matchedFwProject?.project_manager_id || ppp?.project_manager_id || null;

        let quotationId = ppp?.notes?.includes('quotation_id:') ? ppp.notes.split('quotation_id:')[1]?.split(';')[0] : null;
        let quotationTitle = ppp?.notes?.includes('quotation_title:') ? ppp.notes.split('quotation_title:')[1]?.split(';')[0] : null;

        // Auto-sync deliverables from client's approved / final quotation if none exist
        if (projectDeliverables.length === 0) {
          const syncResult = autoSyncClientDeliverables(client, qList, []);
          if (syncResult.wasSynced && syncResult.deliverables.length > 0) {
            projectDeliverables = syncResult.deliverables;
            quotationId = syncResult.quotationId || null;
            quotationTitle = syncResult.quotationTitle || null;

            // Persist decoupled auto-sync in background
            persistDeliverablesDecoupled({
              workspaceId,
              clientId: client.id,
              projectId: matchedFwProject?.id,
              deliverables: projectDeliverables,
              projectManagerId: effectivePMId,
              projectManagerName: effectivePM,
              overallStatus: ppp?.overall_status || 'active',
              notes: `quotation_id:${quotationId || ''};quotation_title:${quotationTitle || ''};`,
            });
          }
        }

        // Section & Segment Configuration
        const projConfig = matchedFwProject ? configByProjectId.get(matchedFwProject.id) : null;
        let enabledSegments: string[] | undefined = projConfig?.enabled_segments;
        let disabledCategories: Record<string, string[]> | undefined = projConfig?.disabled_categories;

        if (!enabledSegments && ppp?.notes?.includes('pp_config:')) {
          try {
            const raw = ppp.notes.split('pp_config:')[1]?.split(';')[0];
            if (raw) {
              const parsed = JSON.parse(decodeURIComponent(raw));
              enabledSegments = parsed.enabled_segments;
              disabledCategories = parsed.disabled_categories;
            }
          } catch (_) {}
        }

        cards.push({
          id: ppp?.id || `proj_${client.id}`,
          project_id: matchedFwProject?.id || client.id,
          workspace_id: workspaceId,
          client_id: client.id,
          client_name: client.name,
          couple_names: client.notes || null,
          event_date: client.event_date || matchedFwProject?.main_date || client.created_at,
          event_type: client.event_type || 'Wedding',
          project_manager_id: effectivePMId,
          project_manager_name: effectivePM,
          overall_status: ppp?.overall_status || (client.status === 'completed' ? 'completed' : 'active'),
          deliverables: projectDeliverables,
          quotation_id: quotationId,
          quotation_title: quotationTitle,
          enabled_segments: enabledSegments,
          disabled_categories: disabledCategories,
        });
      }

      setProjects(cards);
      if (cards.length > 0) {
        setExpandedCards(new Set([cards[0].id]));
      }
    } catch (e) {
      console.error('Error fetching post production data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (projectId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  // Persist Project Deliverable Updates Decoupled
  const handleUpdateProject = async (projectId: string, updated: Partial<PostProductionProjectData>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const merged = { ...p, ...updated };

        // Save to post_production_projects in background
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const workspaceId = session?.user?.id || 'ws_demo';

            const configEncoded = encodeURIComponent(JSON.stringify({
              enabled_segments: merged.enabled_segments,
              disabled_categories: merged.disabled_categories,
            }));

            const payload: any = {
              client_id: merged.client_id,
              project_manager_id: merged.project_manager_id,
              project_manager_name: merged.project_manager_name,
              overall_status: merged.overall_status,
              deliverables: merged.deliverables,
              notes: `quotation_id:${merged.quotation_id || ''};quotation_title:${merged.quotation_title || ''};pp_config:${configEncoded};`,
              updated_at: new Date().toISOString(),
            };

            const { data } = await supabase
              .from('post_production_projects')
              .update(payload)
              .eq('client_id', merged.client_id)
              .select('id');

            if (!data || data.length === 0) {
              await supabase.from('post_production_projects').insert([{
                user_id: workspaceId,
                workspace_id: workspaceId,
                ...payload,
                created_at: new Date().toISOString(),
              }]);
            }

            // Synchronize with post_production_project_config table
            if (merged.project_id && (updated.enabled_segments !== undefined || updated.disabled_categories !== undefined)) {
              try {
                await supabase
                  .from('post_production_project_config')
                  .upsert({
                    project_id: merged.project_id,
                    enabled_segments: merged.enabled_segments || ['Wedding'],
                    disabled_categories: merged.disabled_categories || {},
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'project_id' });
              } catch (_) {}
            }

            // Also synchronize with post_production_deliverables table if project_id exists
            if (merged.project_id && Array.isArray(merged.deliverables)) {
              for (const deliv of merged.deliverables) {
                if (deliv.id && deliv.title) {
                  await supabase
                    .from('post_production_deliverables')
                    .upsert({
                      id: deliv.id.includes('-') ? deliv.id : undefined,
                      project_id: merged.project_id,
                      segment: deliv.segment || 'Wedding',
                      category: deliv.category || 'Photos',
                      custom_category_name: deliv.custom_category_name || null,
                      title: deliv.title,
                      specs: deliv.specs || deliv.count || null,
                      status: deliv.status || 'Upcoming',
                      assigned_member_id: deliv.assigned_member_id || null,
                      due_date: deliv.due_date || deliv.deadline || null,
                      notes: deliv.notes || null,
                      is_hidden: deliv.is_hidden || false,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'id' });
                }
              }
            }
          } catch (err) {
            console.warn('Error persisting project changes:', err);
          }
        })();

        return merged;
      }
      return p;
    }));
  };

  // Filtered Projects based on Search & Global Filter Modal
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Text Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        p.client_name?.toLowerCase().includes(q) ||
        p.couple_names?.toLowerCase().includes(q) ||
        p.project_manager_name?.toLowerCase().includes(q) ||
        p.event_type?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. PM Filter
      if (filters.pm !== 'all') {
        if (filters.pm === 'unassigned') {
          if (p.project_manager_name && p.project_manager_name !== 'unassigned') return false;
        } else {
          const pmName = (p.project_manager_name || '').toLowerCase();
          const targetPM = filters.pm.toLowerCase();
          if (pmName !== targetPM && p.project_manager_id !== filters.pm) return false;
        }
      }

      // 3. Status Filter
      if (filters.status !== 'all') {
        const hasMatchingDeliverable = (p.deliverables || []).some(d => {
          const s = (d.status || '').toLowerCase();
          const target = filters.status.toLowerCase();
          if (target === 'done' || target === 'completed') return s.includes('done') || s.includes('complete');
          if (target === 'under review') return s.includes('review');
          if (target === 'in progress') return s.includes('progress');
          if (target === 'upcoming') return s.includes('upcoming') || s.includes('pending');
          return s === target;
        });

        if (!hasMatchingDeliverable && p.overall_status !== filters.status.toLowerCase()) {
          return false;
        }
      }

      // 4. Date Scope Filter
      if (filters.dateScopeMode !== 'all') {
        if (!p.event_date) return false;
        const d = new Date(p.event_date);
        if (isNaN(d.getTime())) return false;

        if (filters.dateScopeMode === 'year') {
          if (d.getFullYear() !== filters.dateScopeYear) return false;
        } else if (filters.dateScopeMode === 'month') {
          if (d.getFullYear() !== filters.dateScopeYear) return false;
          if (filters.dateScopeMonth !== 'All' && d.getMonth() !== parseInt(filters.dateScopeMonth, 10)) {
            return false;
          }
        } else if (filters.dateScopeMode === 'custom') {
          const t = d.getTime();
          const start = filters.dateScopeStartDate ? new Date(filters.dateScopeStartDate).getTime() : 0;
          const end = filters.dateScopeEndDate ? new Date(filters.dateScopeEndDate).getTime() + 86400000 : Infinity;
          if (t < start || t > end) return false;
        }
      }

      return true;
    });
  }, [projects, searchQuery, filters]);

  // Dynamic KPI Metrics (Recalculated on Active Filter Results)
  const totalStudioProjects = filteredProjects.length;
  const activePipeline = filteredProjects.filter(p => p.overall_status === 'active').length;
  const delayedProjects = filteredProjects.filter(p => p.overall_status === 'delayed').length;

  const allFilteredDeliverables = useMemo(() => filteredProjects.flatMap(p => p.deliverables || []), [filteredProjects]);
  const totalDeliverablesCount = allFilteredDeliverables.length;
  const completedDeliverablesCount = useMemo(() => {
    return allFilteredDeliverables.filter(d => {
      const s = (d.status || '').toLowerCase();
      return s.includes('done') || s.includes('complete');
    }).length;
  }, [allFilteredDeliverables]);

  const overallDeliverablesPercentage = totalDeliverablesCount > 0
    ? Math.round((completedDeliverablesCount / totalDeliverablesCount) * 100)
    : 0;

  // Active Filter Count for Badge
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.pm !== 'all') c++;
    if (filters.status !== 'all') c++;
    if (filters.dateScopeMode !== 'all') c++;
    return c;
  }, [filters]);

  // Derived PM Options from active projects
  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const pmSet = new Set<string>();
    projects.forEach(p => {
      if (p.project_manager_name && p.project_manager_name !== 'unassigned') {
        pmSet.add(p.project_manager_name);
      }
    });

    return [
      { value: 'all', label: 'All Project Managers' },
      {
        value: 'unassigned',
        label: 'Unassigned (No PM)',
        badge: 'None',
        badgeClassName: 'bg-rose-100 text-rose-700 border border-rose-200',
      },
      ...Array.from(pmSet).map(pm => ({
        value: pm,
        label: pm,
        badge: 'Active PM',
      })),
    ];
  }, [projects]);

  // Open comment / activity drawer
  const handleOpenComments = (itemId: string, title: string) => {
    for (const p of projects) {
      const d = (p.deliverables || []).find(item => item.id === itemId);
      if (d) {
        setActiveDrawerDeliverable(d);
        break;
      }
    }
  };

  // Open drive link in comment drawer
  const handleOpenDrive = (itemId: string, currentLink: string) => {
    for (const p of projects) {
      const d = (p.deliverables || []).find(item => item.id === itemId);
      if (d) {
        setActiveDrawerDeliverable(d);
        break;
      }
    }
  };

  // Update drive link from drawer
  const handleUpdateDriveLink = (deliverableId: string, driveLink: string) => {
    setProjects(prev => prev.map(p => {
      const hasItem = (p.deliverables || []).some(d => d.id === deliverableId);
      if (hasItem) {
        const updated = p.deliverables.map(d => {
          if (d.id === deliverableId) {
            return { ...d, drive_link: driveLink };
          }
          return d;
        });
        handleUpdateProject(p.id, { deliverables: updated });
        return { ...p, deliverables: updated };
      }
      return p;
    }));

    if (activeDrawerDeliverable && activeDrawerDeliverable.id === deliverableId) {
      setActiveDrawerDeliverable(prev => prev ? { ...prev, drive_link: driveLink } : null);
    }
  };

  // Update comment count from drawer
  const handleCommentCountChange = (deliverableId: string, count: number) => {
    setProjects(prev => prev.map(p => {
      const hasItem = (p.deliverables || []).some(d => d.id === deliverableId);
      if (hasItem) {
        const updated = p.deliverables.map(d => {
          if (d.id === deliverableId) {
            return { ...d, comments_count: count };
          }
          return d;
        });
        handleUpdateProject(p.id, { deliverables: updated });
        return { ...p, deliverables: updated };
      }
      return p;
    }));

    if (activeDrawerDeliverable && activeDrawerDeliverable.id === deliverableId) {
      setActiveDrawerDeliverable(prev => prev ? { ...prev, comments_count: count } : null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#121110] text-slate-900 dark:text-stone-100 pb-20 pt-2 px-2 sm:px-4 py-3">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & TOP CONTROLS (3D CREAM STUDIO SUITE)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] dark:bg-[#181614] rounded-2xl p-6 border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-md text-white font-bold">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-stone-100">
                  Post-Production Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Segmented Deliverables Engine
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-stone-400 mt-0.5 font-medium">
                Manage Pre-Wedding &amp; Wedding deliverables with decoupled quotation synchronization, 3D cream floating controls, and active PM filtering.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace/clients"
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-stone-300 bg-amber-50/60 dark:bg-stone-800 hover:bg-amber-100/80 border border-amber-200/80 dark:border-stone-700 rounded-xl transition flex items-center gap-2 shadow-2xs"
            >
              <User className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              Client Directory
            </Link>
            <button
              type="button"
              onClick={fetchPostProductionData}
              className="p-2 text-slate-600 dark:text-stone-300 hover:text-slate-900 bg-amber-50/60 dark:bg-stone-800 hover:bg-amber-100/80 border border-amber-200/80 dark:border-stone-700 rounded-xl transition shadow-2xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            DYNAMIC KPI METRICS DASHBOARD (RECALCULATED ON ACTIVE FILTERS)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFDF9] dark:bg-[#181614] p-5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
                Total Studio Projects
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-stone-100 mt-1">
                {totalStudioProjects} <span className="text-xs font-bold text-slate-500 dark:text-stone-400">Projects</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] dark:bg-[#181614] p-5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
                Overall Deliverables Done
              </p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {overallDeliverablesPercentage}%{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
                  ({completedDeliverablesCount}/{totalDeliverablesCount})
                </span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] dark:bg-[#181614] p-5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
                Active Pipeline
              </p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {activePipeline} <span className="text-xs font-bold text-slate-500 dark:text-stone-400">Active</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#FFFDF9] dark:bg-[#181614] p-5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-rose-300/80 transition-all">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
                Delayed / Overdue
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {delayedProjects} <span className="text-xs font-bold text-slate-500 dark:text-stone-400">Delayed</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH & GLOBAL MULTI-FILTER TRIGGER
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] dark:bg-[#181614] p-4 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name, couple, PM, or event type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-stone-100 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                activeFilterCount > 0
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-200 border-[#EAE5DA] dark:border-stone-700 hover:border-amber-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-amber-700 font-black text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CLIENT POST-PRODUCTION CARDS LIST
        ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <StudioCoreLiquidLoader label="Loading Segmented Production Pipelines..." fullscreen={false} />
        ) : filteredProjects.length === 0 ? (
          <div className="bg-[#FFFDF9] dark:bg-[#181614] p-12 rounded-2xl border border-dashed border-amber-300/80 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Film className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-stone-100">
                No Post-Production Projects Match Filters
              </h3>
              <p className="text-xs text-slate-600 dark:text-stone-400 max-w-md mx-auto mt-1">
                Try adjusting your search criteria or filter settings, or add a new client from the Client Directory.
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters({
                  pm: 'all',
                  status: 'all',
                  dateScopeMode: 'all',
                  dateScopeYear: new Date().getFullYear(),
                  dateScopeMonth: 'All',
                  dateScopeStartDate: '',
                  dateScopeEndDate: '',
                })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 hover:bg-amber-200/80 rounded-xl transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <PostProductionCard
                key={project.id}
                project={project}
                teamMembers={teamMembers}
                quotations={quotations}
                eventTypes={eventTypes}
                isExpanded={expandedCards.has(project.id)}
                onToggleExpand={() => toggleCardExpansion(project.id)}
                onUpdateProject={handleUpdateProject}
                onOpenComments={handleOpenComments}
                onOpenDrive={handleOpenDrive}
              />
            ))}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            GLOBAL MULTI-FILTER DRAWER / MODAL
        ───────────────────────────────────────────────────────────── */}
        <PostProductionFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onChangeFilters={setFilters}
          pmOptions={pmOptions}
          totalProjectsCount={projects.length}
          filteredProjectsCount={filteredProjects.length}
        />

        {/* ─────────────────────────────────────────────────────────────
            DELIVERABLE ACTIVITY & COMMENT SLIDEOUT DRAWER
        ───────────────────────────────────────────────────────────── */}
        <DeliverableCommentDrawer
          isOpen={Boolean(activeDrawerDeliverable)}
          onClose={() => setActiveDrawerDeliverable(null)}
          deliverable={activeDrawerDeliverable}
          onUpdateDriveLink={handleUpdateDriveLink}
          onCommentCountChange={handleCommentCountChange}
        />

      </div>
    </div>
  );
}

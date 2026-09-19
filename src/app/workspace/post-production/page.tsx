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
import PostProductionOverdueModal, { OverdueDeliverableItem } from './components/PostProductionOverdueModal';
import { PostProductionDeliverable } from './components/DeliverableCategorySection';
import { autoSyncClientDeliverables, persistDeliverablesDecoupled, isDemoDeliverables, findClientFinalQuotation, cleanDeliverableTitle } from '@/lib/services/postProductionSyncService';
import { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { fetchWorkspaceEventTypes } from '@/lib/workspace-settings';

export interface PostProductionTeamMember {
  id: string;
  name: string;
  role?: string;
  isInHouse?: boolean;
  hasPMAccess?: boolean;
}

// Module-level in-memory cache for instant 0ms transitions
let memCachedPostProdProjects: PostProductionProjectData[] = [];
let memCachedPostProdTeamMembers: PostProductionTeamMember[] = [];
let memCachedPostProdClients: any[] = [];
let memCachedPostProdQuotations: any[] = [];

export default function PostProductionPage() {
  const [projects, setProjects] = useState<PostProductionProjectData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<PostProductionTeamMember[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded & highlighted cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  // Overdue Center Modal State
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

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
  const [drawerInitialTab, setDrawerInitialTab] = useState<'comments' | 'links'>('comments');

  useEffect(() => {
    setMounted(true);
    if (memCachedPostProdProjects.length > 0) {
      setProjects(memCachedPostProdProjects);
      setLoading(false);
      setExpandedCards(new Set([memCachedPostProdProjects[0].id]));
    } else {
      try {
        const stored = localStorage.getItem('sc_cached_pp_projects');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memCachedPostProdProjects = parsed;
            setProjects(parsed);
            setLoading(false);
            setExpandedCards(new Set([parsed[0].id]));
          }
        }
      } catch (_) {}
    }
    if (memCachedPostProdTeamMembers.length > 0) {
      setTeamMembers(memCachedPostProdTeamMembers);
    }
    fetchPostProductionData();

    const handleSettingsUpdated = () => {
      fetchPostProductionData();
    };
    window.addEventListener('post_production_settings_updated', handleSettingsUpdated);
    window.addEventListener('quotation_finalized', handleSettingsUpdated);
    window.addEventListener('storage', (e) => {
      if (e.key === 'sc_cached_pp_projects' || e.key === 'post_production_updated') {
        fetchPostProductionData();
      }
    });
    return () => {
      window.removeEventListener('post_production_settings_updated', handleSettingsUpdated);
      window.removeEventListener('quotation_finalized', handleSettingsUpdated);
    };
  }, []);

  const fetchPostProductionData = async () => {
    if (memCachedPostProdProjects.length === 0) {
      setLoading(true);
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch Team Members with In-House and PM Access tags
      const members: PostProductionTeamMember[] = [];
      try {
        const { data: fwData } = await supabase
          .from('fw_team_members')
          .select('id, name, primary_role, primary_type, member_types, phone, user_id');

        if (fwData && fwData.length > 0) {
          fwData.forEach((f: any) => {
            const cleanName = f.name?.trim();
            if (cleanName && !members.some(existing => existing.name.toLowerCase() === cleanName.toLowerCase())) {
              const isInHouse = (
                f.primary_type?.toLowerCase() === 'in-house' || 
                f.primary_type?.toLowerCase() === 'in_house' || 
                (Array.isArray(f.member_types) && f.member_types.some((t: any) => String(t).toUpperCase() === 'IN_HOUSE'))
              );
              const roleStr = f.primary_role || '';
              const hasPMAccess = (
                isInHouse ||
                /manager|lead|head|director|owner|producer|supervisor/i.test(roleStr)
              );
              members.push({
                id: f.id,
                name: cleanName,
                role: f.primary_role,
                isInHouse,
                hasPMAccess,
              });
            }
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
              const isLead = /owner|admin|manager|lead/i.test(m.role || '');
              members.push({
                id: m.id || m.user_id,
                name: cleanName,
                role: m.role || (isLead ? 'Studio Manager' : 'Member'),
                isInHouse: true,
                hasPMAccess: true,
              });
            }
          });
        }
      } catch (_) {}

      const ownerName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Studio Owner';
      if (!members.some(m => m.name.toLowerCase() === ownerName.toLowerCase())) {
        members.unshift({
          id: workspaceId,
          name: ownerName,
          role: 'Owner / Lead',
          isInHouse: true,
          hasPMAccess: true,
        });
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

      // 2. Fetch Quotations with strict workspace isolation
      let qList: any[] = [];
      try {
        let qQuery = supabase
          .from('quotations')
          .select('*')
          .order('created_at', { ascending: false });

        if (workspaceId && workspaceId !== 'ws_demo') {
          qQuery = qQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }

        const { data: qData } = await qQuery;

        // Also fetch quotation_documents for this workspace / user
        let qDocQuery = supabase
          .from('quotation_documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (workspaceId && workspaceId !== 'ws_demo') {
          qDocQuery = qDocQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }

        const { data: qDocData } = await qDocQuery;

        const mergedMap = new Map<string, any>();
        (qData || []).forEach((q: any) => mergedMap.set(q.id, q));
        (qDocData || []).forEach((qd: any) => {
          const key = qd.template_id || qd.id;
          if (mergedMap.has(key)) {
            mergedMap.set(key, { ...mergedMap.get(key), ...qd });
          } else {
            mergedMap.set(key, qd);
          }
        });

        qList = Array.from(mergedMap.values());
        setQuotations(qList);
      } catch (qErr) {
        console.warn('Error fetching quotations:', qErr);
      }

      // 3. Fetch Workspace Clients & FW Projects & Booked/Finalized Leads
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      const clientList: any[] = clientData ? [...clientData] : [];

      // Also fetch leads that have final_quotation_id or booked/accepted status
      try {
        let leadsQuery = supabase
          .from('leads')
          .select('*')
          .or('final_quotation_id.not.is.null,status.in.(booked,accepted,closed,converted)')
          .order('created_at', { ascending: false });

        if (workspaceId && workspaceId !== 'ws_demo') {
          leadsQuery = leadsQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
        }

        const { data: leadsData } = await leadsQuery;
        if (leadsData) {
          for (const lead of leadsData) {
            const exists = clientList.some(
              c => c.id === lead.id || c.lead_id === lead.id || (c.name && lead.name && c.name.toLowerCase().trim() === lead.name.toLowerCase().trim())
            );
            if (!exists) {
              clientList.push({
                id: lead.id,
                lead_id: lead.id,
                name: lead.name || 'Untitled Client',
                phone: lead.phone,
                email: lead.email,
                event_date: lead.event_date || lead.created_at,
                event_type: lead.event_type || 'Wedding',
                status: lead.status || 'booked',
                created_at: lead.created_at,
                notes: lead.notes,
                final_quotation_id: lead.final_quotation_id
              });
            }
          }
        }
      } catch (leadErr) {
        console.warn('Error fetching booked leads for post production:', leadErr);
      }

      setClients(clientList);

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
        pppData.forEach(p => {
          if (p.client_id) pppMap.set(p.client_id, p);
          if (p.id) pppMap.set(p.id, p);
        });
      }

      // 6. Build Consolidated Project Cards List
      const cards: PostProductionProjectData[] = [];

      for (const client of clientList) {
        const ppp = pppMap.get(client.id) || (client.lead_id ? pppMap.get(client.lead_id) : null);
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

        // Gracefully normalize legacy deliverables (TitleCase categories, default segments, specs sync)
        projectDeliverables = projectDeliverables.map(d => {
          const rawCat = (d.category || 'Photos').trim().toLowerCase();
          const isCalendar = /calendar/i.test(d.title || '') || /calendar/i.test(d.name || '');
          const normCat = isCalendar ? 'Albums'
            : (rawCat === 'photos' || rawCat === 'photo' || rawCat === 'stills') ? 'Photos'
            : (rawCat === 'videos' || rawCat === 'video' || rawCat === 'films') ? 'Videos'
            : (rawCat === 'albums' || rawCat === 'album' || rawCat === 'photobooks') ? 'Albums'
            : (d.category ? (d.category.charAt(0).toUpperCase() + d.category.slice(1)) : 'Photos');

          const normSeg = d.segment ? d.segment.trim() : 'Wedding';
          const cleanSpecs = d.specs || d.count || null;

          return {
            ...d,
            category: normCat,
            segment: normSeg,
            specs: cleanSpecs,
            count: cleanSpecs,
          };
        });

        // Strict deduplication of deliverables right upon load
        const uniqueDelivs: any[] = [];
        const seenKeys = new Set<string>();
        for (const d of projectDeliverables) {
          const key = `${(d.segment || 'Wedding').toLowerCase()}_${(d.category || 'Photos').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueDelivs.push(d);
          }
        }
        projectDeliverables = uniqueDelivs;

        // Extract project manager from client notes JSON, client columns, or handled_by
        let extractedPMName: string | null = null;
        let extractedPMId: string | null = null;

        if (client.notes) {
          try {
            const rawNotes = client.notes;
            if (typeof rawNotes === 'string' && rawNotes.trim().startsWith('{')) {
              const parsed = JSON.parse(rawNotes);
              if (parsed.project_manager_name) {
                extractedPMName = String(parsed.project_manager_name).trim();
              }
              if (parsed.project_manager_id) {
                extractedPMId = String(parsed.project_manager_id).trim();
              }
              if (!extractedPMName && parsed.notes && typeof parsed.notes === 'string') {
                const hbMatch = parsed.notes.match(/handled_by:\s*([^;,\n]+)/i);
                if (hbMatch) extractedPMName = hbMatch[1].trim();
              }
            } else if (typeof rawNotes === 'string') {
              const hbMatch = rawNotes.match(/handled_by:\s*([^;,\n]+)/i);
              if (hbMatch) extractedPMName = hbMatch[1].trim();
            }
          } catch (_) {}
        }

        if (!extractedPMName && client.handled_by) {
          extractedPMName = client.handled_by.trim();
        }

        // Match against team members by id or name
        let matchedPMName = extractedPMName;
        let matchedPMId: string | null = extractedPMId;

        if (extractedPMId) {
          const m = members.find(tm => tm.id === extractedPMId);
          if (m) {
            matchedPMName = m.name;
          }
        } else if (extractedPMName) {
          const m = members.find(tm => tm.name.toLowerCase() === extractedPMName?.toLowerCase());
          if (m) {
            matchedPMName = m.name;
            matchedPMId = m.id;
          }
        }

        const effectivePM = (ppp && ('project_manager_name' in ppp) && ppp.project_manager_name !== undefined)
          ? ppp.project_manager_name
          : (matchedFwProject?.project_manager_name || client.project_manager_name || matchedPMName || null);
        const effectivePMId = (ppp && ('project_manager_id' in ppp) && ppp.project_manager_id !== undefined)
          ? ppp.project_manager_id
          : (matchedFwProject?.project_manager_id || client.project_manager_id || matchedPMId || null);

        // Reliably match client's true final quotation
        const clientFinalQuote = findClientFinalQuotation(client, qList);
        let quotationId: string | null = clientFinalQuote ? (clientFinalQuote.template_id || clientFinalQuote.id) : null;
        let quotationTitle: string | null = clientFinalQuote ? (clientFinalQuote.title || clientFinalQuote.quotation_number || 'Final Quotation') : null;

        // If client has no matched final quote, only use stored notes if they genuinely belong to this client
        if (!quotationId && ppp?.notes?.includes('quotation_id:')) {
          const storedQId = ppp.notes.split('quotation_id:')[1]?.split(';')[0];
          const storedQTitle = ppp.notes.includes('quotation_title:') ? ppp.notes.split('quotation_title:')[1]?.split(';')[0] : null;
          // Validate stored quote against qList to ensure it doesn't belong to another client
          const foundQuote = qList.find(q => q.id === storedQId || q.template_id === storedQId);
          if (foundQuote && (foundQuote.client_id === client.id || (client.name && foundQuote.client_name && foundQuote.client_name.toLowerCase().trim() === client.name.toLowerCase().trim()))) {
            quotationId = storedQId;
            quotationTitle = storedQTitle;
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

        // Auto-sync deliverables from client's approved / final quotation ONLY if this client legitimately has one
        const hasDemo = isDemoDeliverables(projectDeliverables);
        const shouldSync = (projectDeliverables.length === 0 || hasDemo) && Boolean(clientFinalQuote);

        if (shouldSync) {
          const syncResult = autoSyncClientDeliverables(client, qList, projectDeliverables);
          if (syncResult.wasSynced && syncResult.deliverables.length > 0) {
            projectDeliverables = syncResult.deliverables;
            quotationId = syncResult.quotationId || null;
            quotationTitle = syncResult.quotationTitle || null;

            if (syncResult.enabledSegments && syncResult.enabledSegments.length > 0) {
              enabledSegments = syncResult.enabledSegments;
            }

            const ppNotes = `quotation_id:${quotationId || ''};quotation_title:${quotationTitle || ''};pp_config:${encodeURIComponent(JSON.stringify({ enabled_segments: enabledSegments }))};`;

            // Persist decoupled auto-sync in background to permanently clean up database
            persistDeliverablesDecoupled({
              workspaceId,
              clientId: client.id,
              projectId: matchedFwProject?.id,
              deliverables: projectDeliverables,
              projectManagerId: effectivePMId,
              projectManagerName: effectivePM,
              overallStatus: ppp?.overall_status || 'active',
              notes: ppNotes,
            });

            if (matchedFwProject?.id && enabledSegments) {
              try {
                supabase
                  .from('post_production_project_config')
                  .upsert({
                    project_id: matchedFwProject.id,
                    enabled_segments: enabledSegments,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'project_id' });
              } catch (_) {}
            }
          }
        }


        cards.push({
          id: ppp?.id || `proj_${client.id}`,
          project_id: matchedFwProject?.id || client.id,
          workspace_id: workspaceId,
          client_id: client.id,
          client_name: client.name,
          couple_names: null,
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

      // Include any standalone post_production_projects that may not be linked to a client record yet
      if (pppData) {
        for (const p of pppData) {
          const alreadyAdded = cards.some(c => c.client_id === p.client_id || c.id === p.id);
          if (!alreadyAdded && p.client_id) {
            let pDeliverables: any[] = Array.isArray(p.deliverables) ? p.deliverables : [];
            pDeliverables = pDeliverables.map(d => {
              const rawCat = (d.category || 'Photos').trim().toLowerCase();
              const isCalendar = /calendar/i.test(d.title || '') || /calendar/i.test(d.name || '');
              const normCat = isCalendar ? 'Albums'
                : (rawCat === 'photos' || rawCat === 'photo' || rawCat === 'stills') ? 'Photos'
                : (rawCat === 'videos' || rawCat === 'video' || rawCat === 'films') ? 'Videos'
                : (rawCat === 'albums' || rawCat === 'album' || rawCat === 'photobooks') ? 'Albums'
                : (d.category ? (d.category.charAt(0).toUpperCase() + d.category.slice(1)) : 'Photos');
              return {
                ...d,
                category: normCat,
                segment: d.segment ? d.segment.trim() : 'Wedding',
                specs: d.specs || d.count || null,
                count: d.specs || d.count || null,
              };
            });

            cards.push({
              id: p.id || `proj_${p.client_id}`,
              project_id: p.client_id,
              workspace_id: workspaceId,
              client_id: p.client_id,
              client_name: p.client_name || 'Project Client',
              couple_names: null,
              event_date: p.created_at,
              event_type: 'Wedding',
              project_manager_id: p.project_manager_id || null,
              project_manager_name: p.project_manager_name || null,
              overall_status: p.overall_status || 'active',
              deliverables: pDeliverables,
              quotation_id: null,
              quotation_title: null,
              enabled_segments: ['Wedding'],
              disabled_categories: undefined,
            });
          }
        }
      }

      setProjects(cards);
      memCachedPostProdProjects = cards;
      memCachedPostProdTeamMembers = members;
      memCachedPostProdClients = clients;
      memCachedPostProdQuotations = quotations;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sc_cached_pp_projects', JSON.stringify(cards));
        } catch (_) {}
      }
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
    // 1. Synchronously update in-memory cache and localStorage for instant 0ms transitions
    memCachedPostProdProjects = memCachedPostProdProjects.map(p => {
      if (p.id === projectId) {
        return { ...p, ...updated };
      }
      return p;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sc_cached_pp_projects', JSON.stringify(memCachedPostProdProjects));
      } catch (_) {}
    }

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const merged = { ...p, ...updated };

        // Strict deduplication of deliverables
        let cleanDeliverables: any[] = merged.deliverables || [];
        if (Array.isArray(cleanDeliverables) && cleanDeliverables.length > 0) {
          const uniqueD: any[] = [];
          const seenK = new Set<string>();
          for (const d of cleanDeliverables) {
            const key = `${(d.segment || 'Wedding').toLowerCase()}_${(d.category || 'Photos').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
            if (!seenK.has(key)) {
              seenK.add(key);
              uniqueD.push(d);
            }
          }
          cleanDeliverables = uniqueD;
          merged.deliverables = cleanDeliverables;
        }

        // Save to post_production_projects in background
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const workspaceId = session?.user?.id || 'ws_demo';

            // If PM changed, synchronize immediately to workspace_clients, fw_projects, and leads
            if (updated.project_manager_name !== undefined || updated.project_manager_id !== undefined) {
              const pmName = updated.project_manager_name ?? null;
              const pmId = updated.project_manager_id ?? null;

              if (merged.client_id) {
                try {
                  await supabase
                    .from('workspace_clients')
                    .update({
                      project_manager_name: pmName,
                      project_manager_id: pmId,
                      handled_by: pmName,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', merged.client_id);
                } catch (_) {}

                try {
                  await supabase
                    .from('leads')
                    .update({
                      project_manager_name: pmName,
                      project_manager_id: pmId,
                      handled_by: pmName,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', merged.client_id);
                } catch (_) {}
              }

              if (merged.project_id) {
                try {
                  await supabase
                    .from('fw_projects')
                    .update({
                      project_manager_name: pmName,
                      project_manager_id: pmId,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', merged.project_id);
                } catch (_) {}
              }
            }

            const configEncoded = encodeURIComponent(JSON.stringify({
              enabled_segments: merged.enabled_segments,
              disabled_categories: merged.disabled_categories,
            }));

            const payload: any = {
              client_id: merged.client_id,
              project_manager_id: merged.project_manager_id,
              project_manager_name: merged.project_manager_name,
              overall_status: merged.overall_status,
              deliverables: cleanDeliverables,
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

            // Also synchronize with post_production_deliverables table (delete old rows first to prevent duplicate accumulation)
            if (merged.project_id && Array.isArray(cleanDeliverables)) {
              try {
                await supabase
                  .from('post_production_deliverables')
                  .delete()
                  .eq('project_id', merged.project_id);

                if (cleanDeliverables.length > 0) {
                  const rowsToInsert = cleanDeliverables.map(deliv => ({
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
                    is_custom: deliv.is_custom || false,
                    updated_at: new Date().toISOString(),
                  }));
                  await supabase.from('post_production_deliverables').insert(rowsToInsert);
                }
              } catch (delivErr) {
                console.warn('Error replacing post_production_deliverables:', delivErr);
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

  // Overdue Deliverables & Delayed Calculation
  const isDeliverableOverdue = (dueDateStr: string | null | undefined, status?: string): boolean => {
    if (!dueDateStr) return false;
    const s = (status || '').toLowerCase();
    if (s.includes('done') || s.includes('complete')) return false;

    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  };

  const getDaysOverdue = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - due.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const overdueDeliverablesList = useMemo<OverdueDeliverableItem[]>(() => {
    const list: OverdueDeliverableItem[] = [];

    filteredProjects.forEach(p => {
      (p.deliverables || []).forEach(d => {
        if (isDeliverableOverdue(d.due_date, d.status)) {
          list.push({
            projectId: p.id,
            clientName: p.client_name,
            deliverableId: d.id,
            title: d.title,
            segment: d.segment || 'Wedding',
            category: d.category || 'General',
            specs: d.specs ? String(d.specs) : (d.count ? String(d.count) : null),
            dueDate: d.due_date!,
            daysOverdue: getDaysOverdue(d.due_date!),
            assignedTo: d.assigned_to || 'Unassigned',
            pmName: p.project_manager_name || 'No PM',
          });
        }
      });
    });

    return list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [filteredProjects]);

  // Delayed projects count: either overall_status is delayed or has at least one overdue deliverable
  const delayedProjectsCount = useMemo(() => {
    return filteredProjects.filter(p => {
      if (p.overall_status === 'delayed') return true;
      return (p.deliverables || []).some(d => isDeliverableOverdue(d.due_date, d.status));
    }).length;
  }, [filteredProjects]);

  // Active pipeline: projects that are not completed
  const activePipeline = useMemo(() => {
    return filteredProjects.filter(p => {
      if (p.overall_status === 'completed') return false;
      const total = (p.deliverables || []).length;
      if (total === 0) return true;
      const done = (p.deliverables || []).filter(d => {
        const s = (d.status || '').toLowerCase();
        return s.includes('done') || s.includes('complete');
      }).length;
      return done < total;
    }).length;
  }, [filteredProjects]);

  // Dynamic KPI Metrics (Recalculated on Active Filter Results)
  const totalStudioProjects = filteredProjects.length;

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

  // Jump to project card from Overdue Modal
  const handleSelectOverdueItem = (projectId: string) => {
    setIsOverdueModalOpen(false);
    // Expand target project card
    setExpandedCards(prev => new Set([...Array.from(prev), projectId]));
    // Set highlight indicator
    setHighlightedCardId(projectId);

    // Smooth scroll to card
    setTimeout(() => {
      const el = document.getElementById(`project-card-${projectId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // Clear highlight after 3.5s
    setTimeout(() => {
      setHighlightedCardId(null);
    }, 3500);
  };

  // Re-sync deliverables from Quotation
  const handleResyncQuotation = (projectId: string, clientId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const client = clients.find(c => c.id === clientId) || { id: clientId, name: proj.client_name, lead_id: (proj as any).lead_id };
    const syncResult = autoSyncClientDeliverables(client, quotations, []);

    if (syncResult.wasSynced && syncResult.deliverables.length > 0) {
      const isDemo = isDemoDeliverables(proj.deliverables || []);
      // Preserve existing deliverables progress (status, assigned member, notes, drive links) only if not demo
      const existingMap = new Map<string, PostProductionDeliverable>();
      if (!isDemo) {
        (proj.deliverables || []).forEach(d => {
          const key = `${(d.segment || '').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
          existingMap.set(key, d);
        });
      }

      const mergedDeliverables = syncResult.deliverables.map(newD => {
        const key = `${(newD.segment || '').toLowerCase()}_${cleanDeliverableTitle(newD.title || '').toLowerCase()}`;
        const existing = existingMap.get(key);
        if (existing) {
          return {
            ...newD,
            status: existing.status,
            assigned_member_id: existing.assigned_member_id,
            assigned_to: existing.assigned_to,
            due_date: existing.due_date,
            notes: existing.notes,
            comments_count: existing.comments_count,
            drive_link: (existing as any).drive_link,
          };
        }
        return newD;
      });

      // Retain custom deliverables created manually by user (avoid duplicate insertion)
      if (!isDemo) {
        (proj.deliverables || []).forEach(d => {
          if (d.is_custom) {
            const key = `${(d.segment || '').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
            if (!mergedDeliverables.some(m => `${(m.segment || '').toLowerCase()}_${cleanDeliverableTitle(m.title || '').toLowerCase()}` === key)) {
              mergedDeliverables.push(d);
            }
          }
        });
      }

      // Final strict deduplication by segment + category + cleanTitle
      const finalCleanDelivs: PostProductionDeliverable[] = [];
      const seenSyncKeys = new Set<string>();
      for (const d of mergedDeliverables) {
        const key = `${(d.segment || 'Wedding').toLowerCase()}_${(d.category || 'Photos').toLowerCase()}_${cleanDeliverableTitle(d.title || '').toLowerCase()}`;
        if (!seenSyncKeys.has(key)) {
          seenSyncKeys.add(key);
          finalCleanDelivs.push(d);
        }
      }

      const updatedSegments = syncResult.enabledSegments && syncResult.enabledSegments.length > 0
        ? syncResult.enabledSegments
        : proj.enabled_segments;

      handleUpdateProject(projectId, {
        deliverables: finalCleanDelivs,
        quotation_id: syncResult.quotationId || proj.quotation_id,
        quotation_title: syncResult.quotationTitle || proj.quotation_title,
        enabled_segments: updatedSegments,
      });

      alert('Quotation deliverables successfully re-synced!');
    } else {
      alert('No approved or final quotation with deliverables found for this client.');
    }
  };

  // Open comment / activity drawer strictly on Revision Notes tab
  const handleOpenComments = (itemId: string, title: string) => {
    for (const p of projects) {
      const d = (p.deliverables || []).find(item => item.id === itemId);
      if (d) {
        setDrawerInitialTab('comments');
        setActiveDrawerDeliverable(d);
        break;
      }
    }
  };

  // Open drive link strictly on Resource Links tab
  const handleOpenDrive = (itemId: string, currentLink: string) => {
    for (const p of projects) {
      const d = (p.deliverables || []).find(item => item.id === itemId);
      if (d) {
        setDrawerInitialTab('links');
        setActiveDrawerDeliverable(d);
        break;
      }
    }
  };

  // Comprehensive deliverable update handler (links, comments, specs, etc.)
  const handleUpdateDeliverable = (deliverableId: string, updates: Partial<PostProductionDeliverable>) => {
    setProjects(prev => prev.map(p => {
      const hasItem = (p.deliverables || []).some(d => d.id === deliverableId);
      if (hasItem) {
        const updated = p.deliverables.map(d => {
          if (d.id === deliverableId) {
            return { ...d, ...updates };
          }
          return d;
        });
        handleUpdateProject(p.id, { deliverables: updated });
        return { ...p, deliverables: updated };
      }
      return p;
    }));

    if (activeDrawerDeliverable && activeDrawerDeliverable.id === deliverableId) {
      setActiveDrawerDeliverable(prev => prev ? { ...prev, ...updates } : null);
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
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#121110] text-slate-900 dark:text-stone-100 pb-20 pt-2 px-4 sm:px-6 lg:px-8 py-3">
      <div className="w-full space-y-6">

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
              <RefreshCw className={`w-4 h-4 ${mounted && loading ? 'animate-spin' : ''}`} />
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
              <h3 suppressHydrationWarning className="text-2xl font-black text-slate-900 dark:text-stone-100 mt-1">
                {mounted ? totalStudioProjects : 0} <span className="text-xs font-bold text-slate-500 dark:text-stone-400">Projects</span>
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
              <h3 suppressHydrationWarning className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {mounted ? overallDeliverablesPercentage : 0}%{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
                  ({mounted ? completedDeliverablesCount : 0}/{mounted ? totalDeliverablesCount : 0})
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
              <h3 suppressHydrationWarning className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {mounted ? activePipeline : 0} <span className="text-xs font-bold text-slate-500 dark:text-stone-400">Active</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div 
            onClick={() => setIsOverdueModalOpen(true)}
            className="bg-[#FFFDF9] dark:bg-[#181614] p-5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md transition-all cursor-pointer group select-none"
            title="Click to view all overdue deliverables"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-extrabold text-slate-500 dark:text-stone-400 uppercase tracking-wider">
                  Delayed / Overdue
                </p>
                {mounted && overdueDeliverablesList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
                    View
                  </span>
                )}
              </div>
              <h3 suppressHydrationWarning className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {mounted ? delayedProjectsCount : 0}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-stone-400">
                  Projects ({mounted ? overdueDeliverablesList.length : 0} items)
                </span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
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
        {loading && projects.length === 0 ? (
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
                isHighlighted={highlightedCardId === project.id}
                onToggleExpand={() => toggleCardExpansion(project.id)}
                onUpdateProject={handleUpdateProject}
                onOpenComments={handleOpenComments}
                onOpenDrive={handleOpenDrive}
                onResyncQuotation={() => handleResyncQuotation(project.id, project.client_id)}
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
            OVERDUE & DELAYED DELIVERABLES CENTER MODAL
        ───────────────────────────────────────────────────────────── */}
        <PostProductionOverdueModal
          isOpen={isOverdueModalOpen}
          onClose={() => setIsOverdueModalOpen(false)}
          overdueItems={overdueDeliverablesList}
          onSelectProject={handleSelectOverdueItem}
        />

        {/* ─────────────────────────────────────────────────────────────
            DELIVERABLE ACTIVITY & COMMENT SLIDEOUT DRAWER
        ───────────────────────────────────────────────────────────── */}
        <DeliverableCommentDrawer
          isOpen={Boolean(activeDrawerDeliverable)}
          onClose={() => setActiveDrawerDeliverable(null)}
          deliverable={activeDrawerDeliverable}
          initialTab={drawerInitialTab}
          onUpdateDriveLink={handleUpdateDriveLink}
          onCommentCountChange={handleCommentCountChange}
          onUpdateDeliverable={handleUpdateDeliverable}
        />

      </div>
    </div>
  );
}

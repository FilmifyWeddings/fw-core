'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  ChevronDown,
  Pencil,
  FileText,
  Moon,
  History,
  Check,
  AlertCircle,
  Zap,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { useWorkspaceData } from '@/context/WorkspaceDataContext';
import type { FWProject, FWSubEvent, FWTeamMember, FWAssignment, WorkspaceClient } from '@/types';
import { resolveSubEventAssignments, getGroupedTeamMembers, getMemberDisplayRole, isOwnerMember } from '@/lib/team-helpers';
import UnifiedTeamAssignDropdown from '@/components/team/UnifiedTeamAssignDropdown';
import { isSlotAssigned } from '@/app/team-manager/hooks/useTeamManagerFilter';
import {
  WorkspaceCrewRole,
  getRoleAbbr,
  getRoleShortCode,
  formatRitualNotes,
} from '@/lib/workspace-settings';
import { handleUpdateBookingPM } from '@/app/workspace/bookings/components/ProjectBookingCard';
import { logProjectActivity, logCrewAssignmentChange } from '@/lib/services/projectAuditService';
import { logClientAudit } from '@/lib/client-audit';
import { unassignCrewSlot } from '@/lib/team-finance-sync';
import AddProjectModal from '@/app/team-manager/components/AddProjectModal';
import AddTeamMemberModal from '@/app/team-manager/components/AddTeamMemberModal';
import WhatsAppAssignmentModal from '@/app/team-manager/components/WhatsAppAssignmentModal';
import ProjectHistoryModal from '@/app/team-manager/components/ProjectHistoryModal';
import type { EventBlockData } from '@/app/team-manager/components/EventBlock';

export interface FallbackClientEvent {
  id?: string;
  name: string;
  date?: string;
  venue?: string;
  city?: string;
  time_start?: string;
  time_end?: string;
  assigned_crew?: string;
  crew?: string[];
  roles?: string[];
  notes?: string;
  shift_hours_slot?: string;
  is_overnight?: boolean;
  end_date?: string;
  map_link?: string;
}

export interface ClientBookingEventsSectionProps {
  client: WorkspaceClient;
  initialProject: FWProject | null;
  fallbackEvents: FallbackClientEvent[];
  teamMembers: FWTeamMember[];
  crewRoles: WorkspaceCrewRole[];
  workspaceId: string;
  studioName?: string;
  isReadOnly?: boolean;
  canManage?: boolean;
  hasSyncedFinalQuote?: boolean;
  onClientPmUpdated?: (pmId: string | null, pmName: string | null) => void;
  onCoupleRenamed?: (newName: string) => void;
  onRefreshParent?: () => Promise<void> | void;
}

const getGradientByProjectId = (id: string): string => {
  if (!id) return 'bg-gradient-to-b from-purple-700 via-indigo-700 to-indigo-900';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'bg-gradient-to-b from-purple-700 via-indigo-700 to-indigo-900',
    'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-700',
    'bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900',
    'bg-gradient-to-b from-blue-600 via-indigo-600 to-slate-900',
  ];
  return gradients[hash % gradients.length];
};

const getInitials = (name: string): string => {
  if (!name) return 'TM';
  const parts = name.trim().replace(/\.\.\./g, '').split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] || 'TM').slice(0, 2).toUpperCase();
};

const format12HourTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  if (/am|pm/i.test(timeStr)) return timeStr;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const calculateDropdownPosition = (rect: DOMRect) => {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openAbove = spaceBelow < 330 && spaceAbove > spaceBelow;
  const left = Math.max(10, Math.min(rect.left - 60, window.innerWidth - 270));

  if (openAbove) {
    return {
      bottom: window.innerHeight - rect.top + 6,
      left,
      openAbove: true,
      maxHeight: Math.min(380, rect.top - 16),
    };
  }
  return {
    top: rect.bottom + 6,
    left,
    openAbove: false,
    maxHeight: Math.min(380, spaceBelow - 16),
  };
};

const isValidDateVal = (val?: string | null): boolean => {
  if (!val) return false;
  const low = String(val).toLowerCase().trim();
  if (!low || low.includes('not fix') || low.includes('tbd')) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
};

export default function ClientBookingEventsSection({
  client,
  initialProject,
  fallbackEvents,
  teamMembers: initialTeamMembers,
  crewRoles: initialCrewRoles,
  workspaceId,
  studioName = 'Filmify Weddings',
  isReadOnly = false,
  canManage = true,
  hasSyncedFinalQuote = false,
  onClientPmUpdated,
  onCoupleRenamed,
  onRefreshParent,
}: ClientBookingEventsSectionProps) {
  const { isOwner, activeWorkspace, userId, userEmail, workspaceName } = useWorkspace();
  const { crewRoles: globalCrewRoles } = useWorkspaceData();

  const effectiveWsId = workspaceId || activeWorkspace?.workspaceId || userId || '';
  const customCrewRoles = useMemo(
    () => (initialCrewRoles?.length ? initialCrewRoles : globalCrewRoles || []),
    [initialCrewRoles, globalCrewRoles]
  );

  const [isMounted, setIsMounted] = useState(false);
  const [localProject, setLocalProject] = useState<FWProject | null>(initialProject);
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>(initialTeamMembers || []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setLocalProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    if (Array.isArray(initialTeamMembers) && initialTeamMembers.length > 0) {
      setTeamMembers(initialTeamMembers);
    }
  }, [initialTeamMembers]);

  // PM Dropdown & Modals state
  const [activePmDropdownId, setActivePmDropdownId] = useState<string | null>(null);
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<FWProject | null>(null);
  const [selectedProjectForHistory, setSelectedProjectForHistory] = useState<FWProject | null>(null);

  // Crew Portal Popover State (100% matching team-manager/page.tsx)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openAbove: boolean;
    maxHeight?: number;
  } | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [duplicateAssignmentConfirm, setDuplicateAssignmentConfirm] = useState<{
    assignmentId: string;
    memberId: string;
    memberName: string;
    existingRole: string;
    newRole: string;
  } | null>(null);

  // Add New Team Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [activeAssignmentForMember, setActiveAssignmentForMember] = useState<{
    assignmentId?: string;
    role?: string;
    subEventId?: string;
    projectId?: string;
  } | null>(null);

  // WhatsApp & Commercials Modal State
  const [whatsappModalData, setWhatsappModalData] = useState<{
    isOpen: boolean;
    assignmentId?: string;
    member: FWTeamMember | null;
    role: string;
    project: FWProject | null;
    subEvent: FWSubEvent | null;
    previousMemberName?: string;
    previousRate?: number | string;
  }>({
    isOpen: false,
    assignmentId: undefined,
    member: null,
    role: '',
    project: null,
    subEvent: null,
  });

  const currentMember = useMemo(() => {
    return teamMembers.find(
      (m) =>
        (activeWorkspace?.memberId && m.id === activeWorkspace.memberId) ||
        (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase()) ||
        (userId && m.user_id === userId)
    );
  }, [teamMembers, activeWorkspace, userEmail, userId]);

  // Cleanly split and deduplicate team members into In-House and Freelancer groups
  const { inHouse: groupedInHouse, freelancers: groupedFreelancers } = useMemo(() => {
    return getGroupedTeamMembers(teamMembers);
  }, [teamMembers]);

  // Build displayProject: uses real `fw_projects` row when present, or synthesizes virtual project from fallbackEvents
  const displayProject: FWProject = useMemo(() => {
    const expandEventRoles = (ev: any): string[] => {
      if (Array.isArray(ev?.roles) && ev.roles.length > 0) {
        return ev.roles.map((r: any) => (typeof r === 'string' ? r.trim() : String(r?.name || r?.role || '').trim())).filter(Boolean);
      }
      if (Array.isArray(ev?.crew) && ev.crew.length > 0) {
        return ev.crew.map((r: any) => (typeof r === 'string' ? r.trim() : String(r?.name || r?.role || '').trim())).filter(Boolean);
      }
      if (Array.isArray(ev?.requirements) && ev.requirements.length > 0) {
        const expanded: string[] = [];
        ev.requirements.forEach((req: any) => {
          if (!req) return;
          if (typeof req === 'string') {
            req.split(/[,+\n]/).map((s) => s.trim()).filter(Boolean).forEach((s) => expanded.push(s));
            return;
          }
          const rName = String(req.name || req.role || '').trim();
          if (!rName) return;
          const qty = Math.max(1, Number(req.qty ?? req.quantity ?? req.count ?? 1) || 1);
          if (rName.includes(',') && qty === 1) {
            rName.split(/[,+\n]/).map((s) => s.trim()).filter(Boolean).forEach((s) => expanded.push(s));
          } else {
            for (let i = 0; i < qty; i++) expanded.push(rName);
          }
        });
        if (expanded.length > 0) return expanded;
      }
      if (ev?.assigned_crew) {
        return String(ev.assigned_crew)
          .split(/[,+\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    const normalizeTitle = (s?: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (localProject) {
      const hydratedSubs = (localProject.fw_sub_events || []).map((se: any, idx: number) => {
        const existingRoles = Array.isArray(se.roles) ? se.roles : [];
        const existingAssigns = Array.isArray(se.fw_assignments) ? se.fw_assignments : [];
        if (existingRoles.length > 0 || existingAssigns.length > 0) return se;

        const seNorm = normalizeTitle(se.event_title || se.name);
        const matchedFallback =
          (fallbackEvents || []).find((fe) => {
            const feNorm = normalizeTitle(fe.name || (fe as any).event_title);
            return feNorm && seNorm && (feNorm === seNorm || feNorm.includes(seNorm) || seNorm.includes(feNorm));
          }) || (fallbackEvents || [])[idx];

        const fallbackRoles = matchedFallback ? expandEventRoles(matchedFallback) : [];
        if (fallbackRoles.length === 0) return se;

        return {
          ...se,
          roles: fallbackRoles,
        };
      });

      return {
        ...localProject,
        client_name: localProject.client_name || client.name,
        project_manager_id: localProject.project_manager_id ?? client.project_manager_id ?? null,
        project_manager_name: localProject.project_manager_name ?? client.project_manager_name ?? null,
        fw_sub_events: hydratedSubs,
      };
    }

    const virtualProjId = `virtual_${client.id}`;
    const synthesizedSubs: FWSubEvent[] = (fallbackEvents || []).map((ev, idx) => {
      const rolesFromCrew = expandEventRoles(ev);
      const hasValidDate = isValidDateVal(ev.date);
      return {
        id: ev.id || `${virtualProjId}_se_${idx}`,
        project_id: virtualProjId,
        user_id: effectiveWsId,
        event_title: ev.name || 'Wedding Ceremony',
        event_date: hasValidDate ? String(ev.date) : '',
        is_date_tbd: !hasValidDate,
        is_overnight: Boolean(ev.is_overnight),
        end_date: ev.end_date || undefined,
        roll_call_time: ev.time_start || '',
        dismissal_estimate_time: ev.time_end || '',
        shift_hours_slot: ev.shift_hours_slot || undefined,
        venue_name: [ev.venue, ev.city].filter(Boolean).join(', ') || undefined,
        venue_map_link: ev.map_link || undefined,
        operational_notes: ev.notes || undefined,
        roles: rolesFromCrew,
        fw_assignments: [],
      } as FWSubEvent;
    });

    return {
      id: virtualProjId,
      user_id: effectiveWsId,
      client_id: client.id,
      client_name: client.name,
      main_date: (isValidDateVal(client.event_date) ? client.event_date : '') || '',
      main_venue: synthesizedSubs[0]?.venue_name || '',
      project_manager_id: client.project_manager_id || null,
      project_manager_name: client.project_manager_name || null,
      status: 'active',
      fw_sub_events: synthesizedSubs,
    };
  }, [localProject, client, fallbackEvents, effectiveWsId]);

  const subEvents = useMemo(() => {
    const raw = [...(displayProject.fw_sub_events || [])];
    return raw.sort((a: any, b: any) => {
      const aTbd = Boolean(a.is_date_tbd) || !isValidDateVal(a.event_date);
      const bTbd = Boolean(b.is_date_tbd) || !isValidDateVal(b.event_date);
      if (aTbd && !bTbd) return -1;
      if (!aTbd && bTbd) return 1;
      if (!aTbd && !bTbd) {
        const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        if (diff !== 0) return diff;
      }
      return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
    });
  }, [displayProject.fw_sub_events]);
  const projectGradient = getGradientByProjectId(displayProject.id || displayProject.client_name);

  const emitWorkspaceSyncEvents = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('team_events_updated', { detail: { clientId: client.id } }));
    window.dispatchEvent(new CustomEvent('client_updated', { detail: { clientId: client.id } }));
    window.dispatchEvent(new CustomEvent('post_production_updated', { detail: { clientId: client.id } }));
    try {
      localStorage.setItem('sc_booking_sync_event', Date.now().toString());
    } catch (_) {}
  }, [client.id]);

  // Close PM dropdown on outside click
  useEffect(() => {
    if (!activePmDropdownId) return;
    const handleGlobalClick = () => {
      setActivePmDropdownId(null);
      setPmSearchQuery('');
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activePmDropdownId]);

  // Track scroll / resize for floating crew popover (identical to team-manager/page.tsx)
  useEffect(() => {
    if (!activeDropdownId) return;
    const updatePosition = () => {
      const el = document.querySelector(`[data-assignment-id="${activeDropdownId}"]`);
      if (!el) {
        setActiveDropdownId(null);
        setDropdownPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      } else {
        setDropdownPos(calculateDropdownPosition(rect));
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeDropdownId]);

  /**
   * Materializes a virtual project (synthesized from quotation / legacy client notes) into real
   * `fw_projects`, `fw_sub_events`, and `fw_assignments` rows before DB mutation.
   */
  const materializeVirtualProjectIfNeeded = async (
    sourceProj: FWProject
  ): Promise<{ project: FWProject; subEventIdMap: Map<string, string> }> => {
    const subEventIdMap = new Map<string, string>();
    if (!sourceProj.id.startsWith('virtual_')) {
      return { project: sourceProj, subEventIdMap };
    }

    const firstValid = (sourceProj.fw_sub_events || []).find((se) => isValidDateVal(se.event_date));
    const baseProjPayload: any = {
      client_id: client.id,
      client_name: sourceProj.client_name || client.name,
      main_date: firstValid?.event_date || (isValidDateVal(client.event_date) ? client.event_date : null),
      main_venue: sourceProj.main_venue || (sourceProj.fw_sub_events?.[0]?.venue_name || 'TBD Venue'),
      project_manager_id: sourceProj.project_manager_id || null,
      project_manager_name: sourceProj.project_manager_name || null,
      status: 'active',
      ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
    };

    const linkedLead = (client as any).linkedLeadId || client.lead_id;
    let newProj: any = null;

    if (linkedLead) {
      const resWithLead = await supabase
        .from('fw_projects')
        .insert([{ ...baseProjPayload, lead_id: linkedLead }])
        .select('*')
        .single();
      if (!resWithLead.error && resWithLead.data) {
        newProj = resWithLead.data;
      }
    }

    if (!newProj) {
      const { data: insertedProj, error: projErr } = await supabase
        .from('fw_projects')
        .insert([baseProjPayload])
        .select('*')
        .single();
      if (projErr) throw projErr;
      newProj = insertedProj;
    }

    const createdSubEvents: FWSubEvent[] = [];
    const existingBlocks = sourceProj.fw_sub_events || [];

    for (let i = 0; i < existingBlocks.length; i++) {
      const se = existingBlocks[i];
      const rolesToSave: string[] = Array.isArray((se as any).roles) ? (se as any).roles : [];
      const hasDate = isValidDateVal(se.event_date);
      const subPayload: any = {
        project_id: newProj.id,
        event_title: se.event_title || 'Wedding Ceremony',
        event_date: hasDate ? se.event_date : null,
        is_date_tbd: !hasDate,
        is_overnight: Boolean((se as any).is_overnight),
        end_date: (se as any).end_date || null,
        start_time_12h: se.roll_call_time || '10:00 AM',
        end_time_12h: se.dismissal_estimate_time || '06:00 PM',
        roll_call_time: se.roll_call_time || '10:00 AM',
        dismissal_estimate_time: se.dismissal_estimate_time || '06:00 PM',
        venue_name: se.venue_name || null,
        venue_map_link: se.venue_map_link || null,
        operational_notes: se.operational_notes || null,
        shift_hours_slot: (se as any).shift_hours_slot || null,
        roles: rolesToSave,
        display_order: i,
        ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
      };

      const { data: insertedSe, error: seErr } = await supabase
        .from('fw_sub_events')
        .insert([subPayload])
        .select('*')
        .single();

      if (seErr) throw seErr;

      if (insertedSe) {
        subEventIdMap.set(se.id, insertedSe.id);
        let insertedAssigns: FWAssignment[] = [];
        if (rolesToSave.length > 0) {
          const assignPayload = rolesToSave.map((role) => ({
            project_id: newProj.id,
            sub_event_id: insertedSe.id,
            sub_event_name: insertedSe.event_title,
            sub_event_date: insertedSe.event_date || new Date().toISOString().split('T')[0],
            start_time: insertedSe.roll_call_time || '10:00',
            end_time: insertedSe.dismissal_estimate_time || '18:00',
            required_role: role,
            assigned_member_id: null,
            status: 'pending',
            ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
          }));
          const { data: aRows } = await supabase.from('fw_assignments').insert(assignPayload).select('*');
          insertedAssigns = (aRows || []) as FWAssignment[];
        }
        createdSubEvents.push({
          ...insertedSe,
          fw_assignments: insertedAssigns,
        } as FWSubEvent);
      }
    }

    const fullProj: FWProject = {
      ...newProj,
      fw_sub_events: createdSubEvents,
    };

    setLocalProject(fullProj);
    emitWorkspaceSyncEvents();
    return { project: fullProj, subEventIdMap };
  };

  // PM Assignment Update (Bidirectional Dual-Sync)
  const handleProjectPMChange = async (memberId: string | null, memberName: string | null) => {
    const prevPmName = displayProject.project_manager_name || 'Unassigned';

    // Optimistic update
    setLocalProject((prev) => ({
      ...(prev || displayProject),
      project_manager_id: memberId,
      project_manager_name: memberName,
    }));
    onClientPmUpdated?.(memberId, memberName);

    try {
      const { project: realProject } = await materializeVirtualProjectIfNeeded(displayProject);

      await handleUpdateBookingPM(
        realProject.id,
        client.id,
        realProject.client_name || client.name,
        memberId ? { id: memberId, name: memberName } : null
      );

      const actorName = currentMember?.name || workspaceName || activeWorkspace?.studioName || 'Admin';
      const actorRole = isOwner ? 'Studio Owner' : currentMember?.is_sales_person ? 'Sales Person' : 'Project Manager';

      logProjectActivity({
        projectId: realProject.id,
        actorId: userId || effectiveWsId || undefined,
        actorName,
        actorRole,
        actionType: 'PM_CHANGED',
        description: memberName
          ? `Reassigned Project Manager to ${memberName}`
          : 'Cleared Project Manager assignment',
        previousValue: prevPmName,
        newValue: memberName || 'Unassigned',
        metadata: { pmId: memberId, pmName: memberName },
      }).catch(() => {});

      logClientAudit({
        clientId: client.id,
        workspaceId: effectiveWsId || undefined,
        actorId: userId || undefined,
        actorName,
        actorEmail: userEmail || undefined,
        actorRole,
        module: 'overview',
        actionType: 'STATUS_CHANGE',
        title: memberName ? `Assigned Project Manager: ${memberName}` : 'Cleared Project Manager',
        description: memberName
          ? `Assigned "${memberName}" as Project Manager from Events & Bookings.`
          : 'Cleared Project Manager assignment.',
        oldValue: prevPmName,
        newValue: memberName || 'Unassigned',
        metadata: { crew_name: memberName, crew_role: 'Project Manager' },
      }).catch(() => {});

      emitWorkspaceSyncEvents();
    } catch (err) {
      console.error('[ClientBookingEvents] Error updating PM:', err);
    }
  };

  // Handle Team Member Creation inside Popover
  const handleSaveTeamMember = async (memberData: {
    name: string;
    primary_role: string;
    country_code: string;
    phone_number: string;
    email?: string;
    avatar_url?: string;
    default_daily_rate?: number;
    default_currency?: string;
    roles?: string[];
  }) => {
    try {
      const { roles, ...cleanMemberData } = memberData as any;
      const memberIdToUse =
        cleanMemberData.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

      const payload: any = {
        name: cleanMemberData.name,
        primary_role: cleanMemberData.primary_role,
        roles: roles || [cleanMemberData.primary_role],
        country_code: cleanMemberData.country_code || '+91',
        phone_number: cleanMemberData.phone_number,
        email: cleanMemberData.email || null,
        avatar_url: cleanMemberData.avatar_url || null,
        default_daily_rate: cleanMemberData.default_daily_rate || 0,
        default_currency: cleanMemberData.default_currency || 'INR',
        ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
        ...(memberIdToUse ? { id: memberIdToUse } : {}),
      };

      const { data: insertedMember, error: insertErr } = await supabase
        .from('fw_team_members')
        .upsert([payload], { onConflict: 'id' })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const effectiveMember: FWTeamMember = (insertedMember || payload) as FWTeamMember;
      setTeamMembers((prev) => {
        if (prev.some((m) => m.id === effectiveMember.id)) {
          return prev.map((m) => (m.id === effectiveMember.id ? effectiveMember : m));
        }
        return [...prev, effectiveMember];
      });

      const effectiveMemberId = effectiveMember.id;
      if (activeAssignmentForMember && effectiveMemberId) {
        const { project: realProj, subEventIdMap } = await materializeVirtualProjectIfNeeded(displayProject);
        const mappedSubEventId = activeAssignmentForMember.subEventId
          ? subEventIdMap.get(activeAssignmentForMember.subEventId) || activeAssignmentForMember.subEventId
          : undefined;
        const cleanAssignId = String(activeAssignmentForMember.assignmentId || '');

        let updatedAssignRow: any = null;
        if (cleanAssignId && !cleanAssignId.includes('-role-') && !cleanAssignId.startsWith('virtual_')) {
          const { data } = await supabase
            .from('fw_assignments')
            .update({
              assigned_member_id: effectiveMemberId,
              assigned_member_name: cleanMemberData.name,
              ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
            })
            .eq('id', cleanAssignId)
            .select('*')
            .maybeSingle();
          updatedAssignRow = data;
        } else if (mappedSubEventId && activeAssignmentForMember.role) {
          const { data: unassignedSlot } = await supabase
            .from('fw_assignments')
            .select('*')
            .eq('sub_event_id', mappedSubEventId)
            .eq('required_role', activeAssignmentForMember.role)
            .is('assigned_member_id', null)
            .limit(1)
            .maybeSingle();

          if (unassignedSlot?.id) {
            const { data } = await supabase
              .from('fw_assignments')
              .update({
                assigned_member_id: effectiveMemberId,
                assigned_member_name: cleanMemberData.name,
              })
              .eq('id', unassignedSlot.id)
              .select('*')
              .maybeSingle();
            updatedAssignRow = data;
          } else {
            const { data } = await supabase
              .from('fw_assignments')
              .insert([
                {
                  project_id: realProj.id,
                  sub_event_id: mappedSubEventId,
                  required_role: activeAssignmentForMember.role,
                  assigned_member_id: effectiveMemberId,
                  assigned_member_name: cleanMemberData.name,
                  status: 'assigned',
                  ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
                },
              ])
              .select('*')
              .maybeSingle();
            updatedAssignRow = data;
          }
        }

        if (updatedAssignRow) {
          setLocalProject((prev) => {
            const base = prev || realProj;
            return {
              ...base,
              fw_sub_events: (base.fw_sub_events || []).map((se) => {
                if (se.id !== mappedSubEventId) return se;
                const existing = se.fw_assignments || [];
                const found = existing.some((a) => a.id === updatedAssignRow.id);
                return {
                  ...se,
                  fw_assignments: found
                    ? existing.map((a) =>
                        a.id === updatedAssignRow.id
                          ? { ...a, ...updatedAssignRow, fw_team_members: effectiveMember }
                          : a
                      )
                    : [...existing, { ...updatedAssignRow, fw_team_members: effectiveMember }],
                };
              }),
            };
          });
        }
      }

      setIsAddMemberOpen(false);
      setActiveAssignmentForMember(null);
      emitWorkspaceSyncEvents();
      await onRefreshParent?.();
    } catch (err: any) {
      console.error('[ClientBookingEvents] Save team member failed:', err);
      alert('Failed to save team member: ' + (err?.message || 'Database error'));
    }
  };

  // Assign / Unassign Crew Slot
  const handleAssignMember = async (assignmentId: string, memberId: string | null) => {
    try {
      const currentSubEvents = displayProject.fw_sub_events || [];
      const activeAssign = currentSubEvents
        .flatMap((se) => resolveSubEventAssignments(se, teamMembers))
        .find((a) => a.id === assignmentId);

      if (!activeAssign) return;

      // 1. UNASSIGNMENT
      if (!memberId) {
        setLocalProject((prev) => {
          const base = prev || displayProject;
          return {
            ...base,
            fw_sub_events: (base.fw_sub_events || []).map((se) => {
              if (se.id !== activeAssign.sub_event_id) return se;
              const updatedAssignments = (se.fw_assignments || []).map((a) =>
                a.id === assignmentId
                  ? {
                      ...a,
                      assigned_member_id: null,
                      fw_team_members: null,
                      assigned_member_name: null,
                      assigned_member_phone: null,
                      agreed_amount: 0,
                      paid_amount: 0,
                      advance_amount: 0,
                      balance_amount: 0,
                      payment_status: 'pending',
                      status: 'pending',
                    }
                  : a
              );
              return { ...se, fw_assignments: updatedAssignments };
            }),
          };
        });

        const subEventObj = currentSubEvents.find((se) => se.id === activeAssign.sub_event_id);
        const prevMem = teamMembers.find((m) => m.id === activeAssign.assigned_member_id);
        const prevName = prevMem?.name || (activeAssign as any).assigned_member_name || 'Crew Member';

        if (!displayProject.id.startsWith('virtual_')) {
          const actorName = currentMember?.name || workspaceName || activeWorkspace?.studioName || 'Admin';
          const actorRole = isOwner ? 'Studio Owner' : currentMember?.is_sales_person ? 'Sales Person' : 'Project Manager';

          logCrewAssignmentChange({
            projectId: displayProject.id,
            subEventId: activeAssign.sub_event_id || undefined,
            workspaceId: effectiveWsId || undefined,
            projectName: displayProject.client_name || undefined,
            eventTitle: subEventObj?.event_title || 'event',
            previousMemberName: prevName,
            targetMemberId: prevMem?.id || activeAssign.assigned_member_id || undefined,
            targetMemberAvatar: prevMem?.avatar_url || undefined,
            roleName: activeAssign.required_role || 'Crew',
            isRemoval: true,
          }).catch(() => {});

          logClientAudit({
            clientId: client.id,
            workspaceId: effectiveWsId || undefined,
            actorId: userId || undefined,
            actorName,
            actorEmail: userEmail || undefined,
            actorRole,
            module: 'events',
            actionType: 'UPDATE',
            title: `Unassigned ${prevName} (${activeAssign.required_role || 'Crew'})`,
            description: `Removed ${prevName} from ${activeAssign.required_role || 'Crew'} on ${subEventObj?.event_title || 'event'}.`,
            oldValue: prevName,
            newValue: 'Unassigned',
            metadata: {
              event_title: subEventObj?.event_title || null,
              event_date: subEventObj?.event_date || null,
              is_date_tbd: Boolean((subEventObj as any)?.is_date_tbd),
              crew_name: prevName,
              crew_avatar: prevMem?.avatar_url || null,
              crew_role: activeAssign.required_role || 'Crew',
            },
          }).catch(() => {});

          try {
            const cleanAssignId = String(assignmentId || '');
            if (cleanAssignId && !cleanAssignId.includes('-role-')) {
              await supabase
                .from('fw_assignments')
                .update({
                  assigned_member_id: null,
                  assigned_member_name: null,
                  assigned_member_phone: null,
                  agreed_amount: 0,
                  advance_amount: 0,
                  paid_amount: 0,
                  balance_amount: 0,
                  status: 'pending',
                  payment_status: 'pending',
                  notes: null,
                })
                .eq('id', cleanAssignId);
            } else if (activeAssign.sub_event_id) {
              let q = supabase
                .from('fw_assignments')
                .update({
                  assigned_member_id: null,
                  assigned_member_name: null,
                  assigned_member_phone: null,
                  agreed_amount: 0,
                  advance_amount: 0,
                  paid_amount: 0,
                  balance_amount: 0,
                  status: 'pending',
                  payment_status: 'pending',
                  notes: null,
                })
                .eq('sub_event_id', activeAssign.sub_event_id);

              if (activeAssign.assigned_member_id) {
                q = q.eq('assigned_member_id', activeAssign.assigned_member_id);
              } else if (activeAssign.required_role) {
                q = q.eq('required_role', activeAssign.required_role);
              }
              await q;
            }

            await unassignCrewSlot({
              workspaceId: effectiveWsId,
              eventId: displayProject.id,
              subEventId: activeAssign.sub_event_id || undefined,
              assignmentId,
              roleShortCode: (activeAssign as any).role_short_code || activeAssign.required_role?.slice(0, 4) || '',
              roleName: activeAssign.required_role,
              teamMemberId: activeAssign.assigned_member_id || undefined,
            });
          } catch (err) {
            console.error('[ClientBookingEvents] Unassign error:', err);
          }
          emitWorkspaceSyncEvents();
        }
        return;
      }

      // 2. ASSIGNMENT: Materialize virtual project if needed, then open WhatsApp & Commercials modal
      const matchedMemberObj = teamMembers.find((m) => m.id === memberId) || null;
      if (!matchedMemberObj) return;

      const { project: realProject, subEventIdMap } = await materializeVirtualProjectIfNeeded(displayProject);
      const mappedSubEventId = activeAssign.sub_event_id
        ? subEventIdMap.get(activeAssign.sub_event_id) || activeAssign.sub_event_id
        : undefined;

      const realSubEvent =
        (realProject.fw_sub_events || []).find((se) => se.id === mappedSubEventId) ||
        currentSubEvents.find((se) => se.id === activeAssign.sub_event_id) ||
        null;

      let effectiveAssignmentId = assignmentId;
      if (realSubEvent) {
        const realSlots = resolveSubEventAssignments(realSubEvent, teamMembers);
        const matchedRealSlot =
          realSlots.find((a) => a.id === assignmentId) ||
          realSlots.find(
            (a) =>
              a.required_role?.toLowerCase() === activeAssign.required_role?.toLowerCase() &&
              !isSlotAssigned(a)
          ) ||
          realSlots.find((a) => a.required_role?.toLowerCase() === activeAssign.required_role?.toLowerCase());
        if (matchedRealSlot?.id) {
          effectiveAssignmentId = matchedRealSlot.id;
        }
      }

      const prevMemberId = activeAssign.assigned_member_id;
      const prevMem = prevMemberId ? teamMembers.find((m) => m.id === prevMemberId) : null;

      setWhatsappModalData({
        isOpen: true,
        assignmentId: effectiveAssignmentId,
        member: matchedMemberObj,
        role: activeAssign.required_role || 'Crew',
        project: realProject,
        subEvent: realSubEvent,
        previousMemberName: prevMem?.name,
        previousRate: (activeAssign as any).agreed_amount,
      });
    } catch (err) {
      console.error('[ClientBookingEvents] handleAssignMember Exception:', err);
    }
  };

  // Non-destructive Project & Sub-Event Save (matches team-manager/page.tsx handleSaveProject)
  const handleSaveProjectModal = async (
    couplingName: string,
    blocks: EventBlockData[],
    projectId?: string
  ) => {
    try {
      const isVirtualOrNew = !projectId || projectId.startsWith('virtual_');
      const firstSubEventDate = blocks[0]?.isDateTbd
        ? null
        : blocks[0]?.subEventDate || new Date().toISOString().split('T')[0];
      const firstSubEventVenue = blocks[0]?.venueLocation || 'TBD Venue';

      const actorName = currentMember?.name || workspaceName || activeWorkspace?.studioName || 'Admin';
      const actorRole = isOwner ? 'Studio Owner' : currentMember?.is_sales_person ? 'Sales Person' : 'Project Manager';

      if (!isVirtualOrNew && projectId) {
        const { error: projErr } = await supabase
          .from('fw_projects')
          .update({
            client_id: client.id,
            client_name: couplingName,
            main_date: firstSubEventDate,
            main_venue: firstSubEventVenue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
        if (projErr) throw projErr;

        const { data: existingSubEvents } = await supabase
          .from('fw_sub_events')
          .select('*')
          .eq('project_id', projectId);

        const subEventIds = (existingSubEvents || []).map((se) => se.id).filter(Boolean);
        const { data: allExistingAssignments } =
          subEventIds.length > 0
            ? await supabase.from('fw_assignments').select('*').in('sub_event_id', subEventIds)
            : { data: [] };

        const existingSubEventsList = (existingSubEvents || []).map((se) => ({
          ...se,
          fw_assignments: (allExistingAssignments || []).filter((a) => a.sub_event_id === se.id),
        }));

        if (displayProject.client_name && displayProject.client_name !== couplingName) {
          logProjectActivity({
            projectId,
            actorId: userId || effectiveWsId || undefined,
            actorName,
            actorRole,
            actionType: 'CLIENT_NAME_CHANGED',
            description: `Updated client name from "${displayProject.client_name}" to "${couplingName}"`,
            previousValue: displayProject.client_name,
            newValue: couplingName,
          }).catch(() => {});

          fetch('/api/workspace/sync-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'rename_couple',
              projectId,
              oldName: displayProject.client_name,
              newName: couplingName,
              workspaceId: effectiveWsId,
            }),
          }).catch(console.error);

          onCoupleRenamed?.(couplingName);
        }

        const incomingBlockIds = new Set(blocks.map((b) => b.id));

        for (const oldSe of existingSubEventsList) {
          if (!incomingBlockIds.has(oldSe.id)) {
            await supabase.from('fw_assignments').delete().eq('sub_event_id', oldSe.id);
            await supabase.from('fw_sub_events').delete().eq('id', oldSe.id);

            logProjectActivity({
              projectId,
              actorId: userId || effectiveWsId || undefined,
              actorName,
              actorRole,
              actionType: 'SUB_EVENT_DELETED',
              eventTitle: oldSe.event_title,
              description: `Deleted sub-event "${oldSe.event_title}"`,
            }).catch(() => {});

            logClientAudit({
              clientId: client.id,
              workspaceId: effectiveWsId || undefined,
              actorId: userId || undefined,
              actorName,
              actorEmail: userEmail || undefined,
              actorRole,
              module: 'events',
              actionType: 'DELETE',
              title: `Deleted Event: ${oldSe.event_title}`,
              description: `Removed sub-event "${oldSe.event_title}" from Events & Bookings.`,
              oldValue: oldSe.event_title,
              metadata: {
                event_title: oldSe.event_title,
                event_date: oldSe.event_date || null,
                is_date_tbd: Boolean(oldSe.is_date_tbd),
              },
            }).catch(() => {});
          }
        }

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          const title = block.subEventNames.join(' + ') || 'Wedding Ceremony';
          const rolesToSave = block.roles || [];
          const existing = existingSubEventsList.find((se) => se.id === block.id);

          const combinedNotes = formatRitualNotes(block.notes, block.ritualTypes || []);
          const subEventPayload: any = {
            project_id: projectId,
            event_title: title,
            event_date: block.isDateTbd ? null : block.subEventDate || null,
            is_date_tbd: Boolean(block.isDateTbd),
            is_overnight: Boolean(block.isOvernight),
            end_date: block.endDate || null,
            start_time_12h: block.startTime || '10:00 AM',
            end_time_12h: block.endTime || '06:00 PM',
            venue_name: block.venueLocation || null,
            venue_map_link: block.mapLink || null,
            roll_call_time: block.startTime || '10:00 AM',
            dismissal_estimate_time: block.endTime || '06:00 PM',
            operational_notes: combinedNotes || null,
            shift_hours_slot: block.shiftSlot || null,
            roles: rolesToSave,
            display_order: i,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            await supabase.from('fw_sub_events').update(subEventPayload).eq('id', existing.id);

            const oldDateLabel = existing.is_date_tbd ? 'Date Not Fixed' : (existing.event_date || 'Date Not Fixed');
            const newDateLabel = block.isDateTbd ? 'Date Not Fixed' : (block.subEventDate || 'Date Not Fixed');
            if (existing.event_title !== title || oldDateLabel !== newDateLabel) {
              logClientAudit({
                clientId: client.id,
                workspaceId: effectiveWsId || undefined,
                actorId: userId || undefined,
                actorName,
                actorEmail: userEmail || undefined,
                actorRole,
                module: 'events',
                actionType: 'UPDATE',
                title: existing.event_title !== title ? `Renamed Event: ${title}` : `Updated Event Date: ${title}`,
                description: `Updated "${title}" (${newDateLabel}).`,
                oldValue: existing.event_title !== title ? existing.event_title : oldDateLabel,
                newValue: existing.event_title !== title ? title : newDateLabel,
                metadata: {
                  event_title: title,
                  event_date: block.isDateTbd ? null : (block.subEventDate || null),
                  is_date_tbd: Boolean(block.isDateTbd),
                },
              }).catch(() => {});
            }

            const currentAssignments = existing.fw_assignments || [];
            if (currentAssignments.length > 0) {
              await supabase
                .from('fw_assignments')
                .update({
                  sub_event_name: title,
                  sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                  start_time: block.startTime || '10:00',
                  end_time: block.endTime || '18:00',
                  updated_at: new Date().toISOString(),
                })
                .eq('sub_event_id', existing.id);
            }

            const matchedAssignmentIds = new Set<string>();
            const rolesNeeded: string[] = [];

            const isRoleMatch = (roleA: string, roleB: string) => {
              const a = (roleA || '').trim().toLowerCase();
              const b = (roleB || '').trim().toLowerCase();
              if (!a || !b) return false;
              if (a === b) return true;
              const codeA = getRoleShortCode(a, customCrewRoles);
              const codeB = getRoleShortCode(b, customCrewRoles);
              return Boolean(codeA && codeB && codeA.toLowerCase() === codeB.toLowerCase());
            };

            for (const desiredRole of rolesToSave) {
              const assignedMatch = currentAssignments.find(
                (a: any) =>
                  !matchedAssignmentIds.has(a.id) &&
                  isRoleMatch(a.required_role, desiredRole) &&
                  Boolean(a.assigned_member_id)
              );
              if (assignedMatch) {
                matchedAssignmentIds.add(assignedMatch.id);
              } else {
                const unassignedMatch = currentAssignments.find(
                  (a: any) => !matchedAssignmentIds.has(a.id) && isRoleMatch(a.required_role, desiredRole)
                );
                if (unassignedMatch) {
                  matchedAssignmentIds.add(unassignedMatch.id);
                } else {
                  rolesNeeded.push(desiredRole);
                }
              }
            }

            const excessUnassignedSlots = currentAssignments.filter(
              (a: any) => !matchedAssignmentIds.has(a.id) && !a.assigned_member_id
            );
            if (excessUnassignedSlots.length > 0) {
              await supabase
                .from('fw_assignments')
                .delete()
                .in('id', excessUnassignedSlots.map((a: any) => a.id));
            }

            if (rolesNeeded.length > 0) {
              const newAssignmentsPayload = rolesNeeded.map((role) => ({
                project_id: projectId,
                sub_event_id: existing.id,
                sub_event_name: title,
                sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                start_time: block.startTime || '10:00',
                end_time: block.endTime || '18:00',
                required_role: role,
                assigned_member_id: null,
                status: 'pending',
                ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
              }));
              await supabase.from('fw_assignments').insert(newAssignmentsPayload);
            }
          } else {
            const { data: insertedSubEvent, error: seErr } = await supabase
              .from('fw_sub_events')
              .insert([subEventPayload])
              .select()
              .single();
            if (seErr) throw seErr;

            logClientAudit({
              clientId: client.id,
              workspaceId: effectiveWsId || undefined,
              actorId: userId || undefined,
              actorName,
              actorEmail: userEmail || undefined,
              actorRole,
              module: 'events',
              actionType: 'CREATE',
              title: `Added Event: ${title}`,
              description: `Added sub-event "${title}" (${block.isDateTbd ? 'Date Not Fixed' : block.subEventDate || 'TBD'}).`,
              newValue: title,
              metadata: {
                event_title: title,
                event_date: block.isDateTbd ? null : (block.subEventDate || null),
                is_date_tbd: Boolean(block.isDateTbd),
              },
            }).catch(() => {});

            if (insertedSubEvent && rolesToSave.length > 0) {
              const newAssignmentsPayload = rolesToSave.map((role) => ({
                project_id: projectId,
                sub_event_id: insertedSubEvent.id,
                sub_event_name: title,
                sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                start_time: block.startTime || '10:00',
                end_time: block.endTime || '18:00',
                required_role: role,
                assigned_member_id: null,
                status: 'pending',
                ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
              }));
              await supabase.from('fw_assignments').insert(newAssignmentsPayload);
            }
          }
        }
      } else {
        // Insert new `fw_projects` linked cleanly to this client
        const { data: newProj, error: projErr } = await supabase
          .from('fw_projects')
          .insert([
            {
              client_id: client.id,
              client_name: couplingName || client.name,
              main_date: firstSubEventDate,
              main_venue: firstSubEventVenue,
              project_manager_id: client.project_manager_id || null,
              project_manager_name: client.project_manager_name || null,
              status: 'active',
              ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
            },
          ])
          .select()
          .single();
        if (projErr) throw projErr;

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          const title = block.subEventNames.join(' + ') || 'Wedding Ceremony';
          const rolesToSave = block.roles || [];
          const combinedNotes = formatRitualNotes(block.notes, block.ritualTypes || []);

          const subEventPayload: any = {
            project_id: newProj.id,
            event_title: title,
            event_date: block.isDateTbd ? null : block.subEventDate || null,
            is_date_tbd: Boolean(block.isDateTbd),
            is_overnight: Boolean(block.isOvernight),
            end_date: block.endDate || null,
            start_time_12h: block.startTime || '10:00 AM',
            end_time_12h: block.endTime || '06:00 PM',
            venue_name: block.venueLocation || null,
            venue_map_link: block.mapLink || null,
            roll_call_time: block.startTime || '10:00 AM',
            dismissal_estimate_time: block.endTime || '06:00 PM',
            operational_notes: combinedNotes || null,
            shift_hours_slot: block.shiftSlot || null,
            roles: rolesToSave,
            display_order: i,
            ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
          };

          const { data: insertedSubEvent, error: seErr } = await supabase
            .from('fw_sub_events')
            .insert([subEventPayload])
            .select()
            .single();
          if (seErr) throw seErr;

          logClientAudit({
            clientId: client.id,
            workspaceId: effectiveWsId || undefined,
            actorId: userId || undefined,
            actorName,
            actorEmail: userEmail || undefined,
            actorRole,
            module: 'events',
            actionType: 'CREATE',
            title: `Added Event: ${title}`,
            description: `Added sub-event "${title}" (${block.isDateTbd ? 'Date Not Fixed' : block.subEventDate || 'TBD'}).`,
            newValue: title,
            metadata: {
              event_title: title,
              event_date: block.isDateTbd ? null : (block.subEventDate || null),
              is_date_tbd: Boolean(block.isDateTbd),
            },
          }).catch(() => {});

          if (insertedSubEvent && rolesToSave.length > 0) {
            const assignmentsPayload = rolesToSave.map((role) => ({
              project_id: newProj.id,
              sub_event_id: insertedSubEvent.id,
              sub_event_name: title,
              sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
              start_time: block.startTime || '10:00',
              end_time: block.endTime || '18:00',
              required_role: role,
              assigned_member_id: null,
              status: 'pending',
              ...(effectiveWsId ? { user_id: effectiveWsId } : {}),
            }));
            await supabase.from('fw_assignments').insert(assignmentsPayload);
          }
        }
      }

      setIsAddProjectOpen(false);
      setEditingProject(null);
      emitWorkspaceSyncEvents();
      await onRefreshParent?.();
      return true;
    } catch (err: any) {
      console.error('[ClientBookingEvents] handleSaveProjectModal error:', err);
      alert('Error saving events: ' + (err?.message || err));
      return false;
    }
  };

  // Compute active assignment details for floating Crew Portal Popover
  const activeAssignmentContext = useMemo(() => {
    if (!activeDropdownId) return null;
    for (const se of subEvents) {
      const resolved = resolveSubEventAssignments(se, teamMembers);
      const found = resolved.find((a) => a.id === activeDropdownId);
      if (found) {
        return { subEvent: se, activeAssignment: found, resolved };
      }
    }
    return null;
  }, [activeDropdownId, subEvents, teamMembers]);

  return (
    <div className="space-y-4">
      {/* SECTION ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Multi-Day Wedding Ceremonies &amp; Bookings</span>
          </h3>
          {hasSyncedFinalQuote && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3" />
              Synced with Quotation &amp; Booking Events
            </span>
          )}
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              setEditingProject(displayProject);
              setIsAddProjectOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add / Edit Events
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. DESKTOP VIEW — EXACT `Booking Events` (`team-manager/page.tsx`) CARD UI
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="bg-white border-2 border-slate-300/90 shadow-lg shadow-slate-200/50 rounded-3xl p-6 space-y-4 transition-all duration-300">
          {/* MASTER CLIENT CARD HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-2xl font-black tracking-tight" style={{ color: '#1E1B4B' }}>
                {displayProject.client_name}
              </h3>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-950 text-[11px] font-black tracking-wide border border-indigo-200/80 shadow-2xs">
                {subEvents.length} Sub-Event{subEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* PROJECT MANAGER (PM) DROPDOWN WITH AVATARS */}
              <UnifiedTeamAssignDropdown
                selectedId={displayProject.project_manager_id}
                selectedName={displayProject.project_manager_name}
                teamMembers={teamMembers}
                onSelect={(m) => handleProjectPMChange(m.id, m.name)}
                labelPrefix="PM:"
                placeholder="Assign PM"
                disabled={isReadOnly}
                align="right"
              />

              {/* History Button */}
              {canManage && !displayProject.id.startsWith('virtual_') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedProjectForHistory(displayProject);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-100/90 hover:bg-amber-100/80 text-neutral-600 border border-neutral-200 transition-all cursor-pointer shadow-sm"
                  title="View Project Change History"
                >
                  <History className="w-3.5 h-3.5 text-amber-600" />
                </button>
              )}

              {/* Edit Project Pencil Button */}
              {!isReadOnly && (
                <button
                  type="button"
                  title="Edit Project & Events"
                  onClick={() => {
                    setEditingProject(displayProject);
                    setIsAddProjectOpen(true);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition shadow-xs shrink-0 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* HORIZONTAL MODERN GRADIENT SUB-EVENT CARDS STACK */}
          {subEvents.length === 0 ? (
            <div className="py-10 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
              <Calendar className="w-9 h-9 text-amber-500 mx-auto" />
              <div>
                <p className="text-sm font-black text-slate-900">No Ceremonies or Events Scheduled Yet</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add sub-events (Haldi, Sangeet, Wedding, Reception) to assign photographers and sync with Booking Events.
                </p>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(displayProject);
                    setIsAddProjectOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Ceremony / Event
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {subEvents.map((subEvent) => {
                const isTbd =
                  Boolean((subEvent as any).is_date_tbd) ||
                  !isValidDateVal(subEvent.event_date);
                const isOvernightShoot =
                  Boolean((subEvent as any).is_overnight) &&
                  isValidDateVal((subEvent as any).end_date);

                const startDateObj = !isTbd ? new Date(subEvent.event_date) : null;
                const endDateObj = isOvernightShoot ? new Date((subEvent as any).end_date) : null;

                let dayNumber = 'TBD';
                let dayName = 'DATE';
                let monthAbbr = 'NOT';
                let yearStr = 'FIXED';

                if (!isTbd && startDateObj) {
                  const sDay = startDateObj.getDate().toString().padStart(2, '0');
                  const sDayName = startDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  monthAbbr = startDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  yearStr = startDateObj.getFullYear().toString();

                  if (isOvernightShoot && endDateObj) {
                    const eDay = endDateObj.getDate().toString().padStart(2, '0');
                    const eDayName = endDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    dayNumber = `${sDay}-${eDay}`;
                    dayName = `${sDayName}-${eDayName}`;
                  } else {
                    dayNumber = sDay;
                    dayName = sDayName;
                  }
                }

                const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                const assignedCount = assignments.filter((a: any) => isSlotAssigned(a)).length;
                const totalSlots = assignments.length;

                return (
                  <div
                    key={subEvent.id}
                    className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-row items-stretch overflow-hidden ${
                      isTbd ? 'border-rose-300/90 hover:border-red-400' : 'border-slate-200/90'
                    }`}
                  >
                    {/* LEFT VERTICAL GRADIENT DATE BLOCK */}
                    <div
                      className={`${
                        isTbd ? 'bg-gradient-to-b from-rose-600 via-red-600 to-rose-800' : projectGradient
                      } w-24 sm:w-28 shrink-0 flex flex-col items-center justify-between p-3 sm:p-3.5 text-center text-white select-none`}
                    >
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider block">
                          {dayName}
                        </span>
                        <span className={`font-black text-white leading-none my-1 block ${isTbd ? 'text-base' : 'text-xl sm:text-2xl'}`}>
                          {dayNumber}
                        </span>
                        <span className="text-[10px] sm:text-xs font-extrabold text-white/90 uppercase tracking-wider block">
                          {monthAbbr}
                        </span>
                        <span className="text-[9px] font-semibold text-white/70 tracking-widest mt-0.5 block">
                          {yearStr}
                        </span>
                      </div>

                      <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner mt-2 border border-white/20">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* MAIN RIGHT CONTENT BODY */}
                    <div className="flex-1 p-4 flex flex-col justify-between space-y-3 min-w-0">
                      {/* EVENT TOP DETAILS ROW */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                            {subEvent.event_title}
                          </h4>

                          {isTbd && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px] border border-rose-200 uppercase tracking-wider">
                              Date Not Fixed
                            </span>
                          )}

                          {isOvernightShoot && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[10px] flex items-center gap-1 uppercase tracking-wider">
                              <Moon className="w-3 h-3 text-indigo-600" /> Overnight
                            </span>
                          )}

                          <span className="text-slate-300 select-none">·</span>

                          {/* CREW ALLOCATION STATS PILL */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              assignedCount === totalSlots && totalSlots > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : assignedCount === 0
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {assignedCount}/{totalSlots} Roles Assigned
                          </span>
                        </div>

                        {/* TIME & LOCATION */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
                          {subEvent.roll_call_time && (
                            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              <span>
                                {format12HourTime(subEvent.roll_call_time)}
                                {subEvent.dismissal_estimate_time
                                  ? ` → ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                  : ''}
                              </span>
                            </div>
                          )}

                          {subEvent.venue_name && (
                            <a
                              href={
                                subEvent.venue_map_link ||
                                `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs transition text-slate-600 hover:text-indigo-600 cursor-pointer"
                              title={subEvent.venue_name}
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span className="max-w-[140px] truncate">{subEvent.venue_name}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {subEvent.operational_notes && (
                        <div className="bg-amber-50/80 border-l-4 border-amber-400 p-2.5 rounded-r-xl text-xs text-amber-950 font-medium flex items-center gap-2 my-1">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{subEvent.operational_notes}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-100 my-1.5" />

                      {/* CREW PLACEMENT ROLE BADGES GRID */}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                          Crew Allocations ({assignedCount}/{totalSlots})
                        </span>
                        {assignments.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-1">
                            No crew roles configured for this ceremony yet.{' '}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProject(displayProject);
                                  setIsAddProjectOpen(true);
                                }}
                                className="text-amber-700 font-bold hover:underline cursor-pointer"
                              >
                                Add crew roles →
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start gap-4 flex-wrap">
                            {assignments.map((assignment: any) => {
                              const rawLookupName = String(
                                (assignment as any).assigned_member_name || (assignment as any).member_name || ''
                              )
                                .replace(/\.\.\./g, '')
                                .trim()
                                .toLowerCase();
                              const isLookupPlaceholder =
                                !rawLookupName ||
                                ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(rawLookupName) ||
                                rawLookupName.startsWith('not fixed');
                              const memberObj =
                                assignment.fw_team_members ||
                                teamMembers.find(
                                  (m) =>
                                    (assignment.assigned_member_id &&
                                      (m.id === assignment.assigned_member_id ||
                                        (m as any).auth_user_id === assignment.assigned_member_id)) ||
                                    (!isLookupPlaceholder && String(m.name || '').trim().toLowerCase() === rawLookupName)
                                ) ||
                                null;
                              const cleanName = (
                                memberObj?.name ||
                                (assignment as any).assigned_member_name ||
                                (assignment as any).member_name ||
                                ''
                              )
                                .replace(/\.\.\./g, '')
                                .trim();
                              const isPlaceholderName =
                                !memberObj &&
                                (cleanName.toLowerCase() === 'not fixed' ||
                                  cleanName.toLowerCase().startsWith('not fixed') ||
                                  cleanName.toLowerCase() === 'tbd' ||
                                  cleanName.toLowerCase() === 'unassigned' ||
                                  cleanName.toLowerCase() === 'pending' ||
                                  cleanName.toLowerCase() === 'date not fixed');
                              const isAssigned = Boolean(
                                (memberObj || assignment.assigned_member_id) && !isPlaceholderName
                              );
                              const role = assignment.required_role;
                              const shortRole = getRoleAbbr(role, customCrewRoles);

                              return (
                                <div key={assignment.id} className="relative flex flex-col items-center min-w-[68px]">
                                  <div
                                    data-assignment-id={assignment.id}
                                    onClick={(e) => {
                                      if (isReadOnly) return;
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      if (activeDropdownId === assignment.id) {
                                        setActiveDropdownId(null);
                                        setDropdownPos(null);
                                      } else {
                                        setActiveDropdownId(assignment.id);
                                        setMemberSearchQuery('');
                                        setDropdownPos(calculateDropdownPosition(rect));
                                      }
                                    }}
                                    className={`flex flex-col items-center group min-w-[50px] max-w-[76px] text-center select-none ${
                                      isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                    }`}
                                    title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
                                  >
                                    {isAssigned ? (
                                      <div className="relative mb-1 flex items-center justify-center">
                                        <div className="relative w-10 h-10 rounded-full border-2 p-0.5 flex items-center justify-center shrink-0 transition-all border-emerald-500 bg-emerald-50 shadow-xs">
                                          {memberObj?.avatar_url ? (
                                            <img
                                              src={memberObj.avatar_url}
                                              alt={cleanName}
                                              className="w-full h-full rounded-full object-cover shrink-0"
                                            />
                                          ) : (
                                            <div className="w-full h-full rounded-full font-black text-[10px] flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-emerald-500 to-teal-600">
                                              {getInitials(cleanName || role)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : isReadOnly ? (
                                      <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 bg-slate-100/70 text-slate-400 font-bold mb-1 flex items-center justify-center shadow-2xs shrink-0 cursor-default">
                                        <span className="text-xs font-black">-</span>
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-full border border-dashed border-red-500 bg-red-50/90 text-red-600 group-hover:bg-red-100 font-black mb-1 flex items-center justify-center shadow-2xs transition-colors cursor-pointer shrink-0">
                                        <Plus className="w-4 h-4 stroke-[3] text-red-600" />
                                      </div>
                                    )}

                                    <span className="text-[10px] font-black uppercase tracking-wider leading-tight block text-center text-slate-500">
                                      {shortRole}
                                    </span>

                                    {isAssigned ? (
                                      (() => {
                                        const fullName = cleanName || memberObj?.name?.trim() || '';
                                        const firstSpaceIndex = fullName.indexOf(' ');
                                        const firstName =
                                          firstSpaceIndex !== -1 ? fullName.substring(0, firstSpaceIndex) : fullName;
                                        const remainingName =
                                          firstSpaceIndex !== -1 ? fullName.substring(firstSpaceIndex + 1) : '';

                                        return (
                                          <div className="flex flex-col items-center justify-center leading-tight text-center max-w-[76px] px-0.5 mt-0.5">
                                            <span className="text-xs font-semibold text-neutral-800">{firstName}</span>
                                            {remainingName && (
                                              <span className="text-[10px] font-medium text-neutral-600 tracking-tight line-clamp-1">
                                                {remainingName}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[68px] text-center leading-none mt-0.5 block">
                                        {isReadOnly ? 'Unassigned' : 'Assign'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MOBILE / TABLET VIEW — EXACT `Booking Events` (`team-manager/page.tsx`) COMPACT UI
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-indigo-300 transition duration-200">
          {/* CLIENT CARD HEADER BAR */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-2xs shrink-0">
                  {getInitials(displayProject.client_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate leading-tight">
                      {displayProject.client_name}
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 block leading-tight">
                    {subEvents.length} Sub-Event{subEvents.length === 1 ? '' : 's'} Configured
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {canManage && !displayProject.id.startsWith('virtual_') && (
                  <button
                    type="button"
                    onClick={() => setSelectedProjectForHistory(displayProject)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-amber-300 rounded-lg transition cursor-pointer shrink-0"
                    title="View Project History"
                  >
                    <History className="w-3 h-3" />
                  </button>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(displayProject);
                      setIsAddProjectOpen(true);
                    }}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer shrink-0"
                    title="Edit Project Configuration"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile PM Assignment Row */}
            <div
              className="pt-1.5 border-t border-white/10 flex items-center justify-between relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                <UnifiedTeamAssignDropdown
                  selectedId={displayProject.project_manager_id}
                  selectedName={displayProject.project_manager_name}
                  teamMembers={teamMembers}
                  onSelect={(m) => handleProjectPMChange(m.id, m.name)}
                  labelPrefix="PM:"
                  placeholder="Assign PM"
                  disabled={isReadOnly}
                  align="left"
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* SUB-EVENTS LIST - COMPACT MOBILE CARDS */}
          <div className="p-3 space-y-3 flex-1 bg-slate-50/50">
            {subEvents.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-500 font-medium">No sub-events added yet.</p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject(displayProject);
                      setIsAddProjectOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Event
                  </button>
                )}
              </div>
            ) : (
              subEvents.map((subEvent) => {
                const isDateNotFixed =
                  Boolean((subEvent as any).is_date_tbd) ||
                  !isValidDateVal(subEvent.event_date);
                const isOvernightShoot =
                  Boolean((subEvent as any).is_overnight) &&
                  isValidDateVal((subEvent as any).end_date);

                const startDateObj = !isDateNotFixed ? new Date(subEvent.event_date) : null;
                const endDateObj = isOvernightShoot ? new Date((subEvent as any).end_date) : null;

                let dayNumber = 'TBD';
                let dayName = 'DATE';
                let monthAbbr = 'NOT';
                let yearStr = 'FIXED';

                if (!isDateNotFixed && startDateObj) {
                  const sDay = startDateObj.getDate().toString().padStart(2, '0');
                  const sDayName = startDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  monthAbbr = startDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  yearStr = startDateObj.getFullYear().toString();

                  if (isOvernightShoot && endDateObj) {
                    const eDay = endDateObj.getDate().toString().padStart(2, '0');
                    const eDayName = endDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    dayNumber = `${sDay}-${eDay}`;
                    dayName = `${sDayName}-${eDayName}`;
                  } else {
                    dayNumber = sDay;
                    dayName = sDayName;
                  }
                }

                const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                const assignedCount = assignments.filter((a: any) => isSlotAssigned(a)).length;
                const totalSlots = assignments.length;

                return (
                  <div
                    key={subEvent.id}
                    className={`bg-white rounded-xl border shadow-2xs hover:shadow-xs transition flex flex-col overflow-hidden ${
                      isDateNotFixed ? 'border-rose-300/90' : 'border-slate-200/90'
                    }`}
                  >
                    {/* TOP HORIZONTAL GRADIENT DATE BANNER */}
                    <div
                      className={`${
                        isDateNotFixed ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-800' : projectGradient
                      } w-full px-3 py-1.5 sm:px-3.5 sm:py-2 text-white flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase">
                          {dayName} {dayNumber} {monthAbbr} {yearStr}
                        </span>
                        {isDateNotFixed && (
                          <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded bg-white text-red-700 uppercase tracking-wider shadow-2xs">
                            DATE NOT FIXED
                          </span>
                        )}
                        {isOvernightShoot && (
                          <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-950 flex items-center gap-0.5">
                            <Moon className="w-2.5 h-2.5" /> Overnight
                          </span>
                        )}
                      </div>

                      <div className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold border border-white/20">
                        {assignedCount}/{totalSlots} Roles
                      </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="p-2.5 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <h4 className="font-extrabold text-slate-900 text-xs tracking-tight truncate">
                          {subEvent.event_title}
                        </h4>
                      </div>

                      {/* COMPACT TIMING, SLOT & VENUE */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        {(subEvent.roll_call_time || subEvent.dismissal_estimate_time) && (
                          <div className="flex items-center gap-1 text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                            <span>
                              {format12HourTime(subEvent.roll_call_time)}
                              {subEvent.dismissal_estimate_time
                                ? ` – ${format12HourTime(subEvent.dismissal_estimate_time)}`
                                : ''}
                            </span>
                          </div>
                        )}

                        {(subEvent as any).shift_hours_slot && (
                          <div className="flex items-center gap-0.5 text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9px] font-bold">
                            <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0 fill-amber-400" />
                            <span>{(subEvent as any).shift_hours_slot}</span>
                          </div>
                        )}

                        {subEvent.venue_name && (
                          <a
                            href={
                              subEvent.venue_map_link ||
                              `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                          >
                            <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[120px]">{subEvent.venue_name}</span>
                          </a>
                        )}
                      </div>

                      {subEvent.operational_notes && (
                        <div className="bg-amber-50/90 border-l-2 border-amber-400 px-2 py-1 rounded-r-md text-[10px] text-amber-950 font-medium flex items-center gap-1.5">
                          <FileText className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          <span className="truncate">{subEvent.operational_notes}</span>
                        </div>
                      )}

                      {/* CREW PLACEMENTS */}
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Crew Placements
                        </span>
                        <div className="flex items-start gap-2.5 flex-wrap">
                          {assignments.map((assignment: any) => {
                            const rawLookupName = String(
                              (assignment as any).assigned_member_name || (assignment as any).member_name || ''
                            )
                              .replace(/\.\.\./g, '')
                              .trim()
                              .toLowerCase();
                            const isLookupPlaceholder =
                              !rawLookupName ||
                              ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(rawLookupName) ||
                              rawLookupName.startsWith('not fixed');
                            const memberObj =
                              assignment.fw_team_members ||
                              teamMembers.find(
                                (m) =>
                                  (assignment.assigned_member_id &&
                                    (m.id === assignment.assigned_member_id ||
                                      (m as any).auth_user_id === assignment.assigned_member_id)) ||
                                  (!isLookupPlaceholder && String(m.name || '').trim().toLowerCase() === rawLookupName)
                              ) ||
                              null;
                            const rawName =
                              memberObj?.name ||
                              (assignment as any).assigned_member_name ||
                              (assignment as any).member_name ||
                              '';
                            const cleanName = rawName.replace(/\.\.\./g, '').trim();
                            const isPlaceholderName =
                              !memberObj &&
                              (cleanName.toLowerCase() === 'not fixed' ||
                                cleanName.toLowerCase().startsWith('not fixed') ||
                                cleanName.toLowerCase() === 'tbd' ||
                                cleanName.toLowerCase() === 'unassigned' ||
                                cleanName.toLowerCase() === 'pending' ||
                                cleanName.toLowerCase() === 'date not fixed');
                            const isAssigned = Boolean(
                              (memberObj || assignment.assigned_member_id) && !isPlaceholderName
                            );
                            const role = assignment.required_role;
                            const shortRole = getRoleAbbr(role, customCrewRoles);

                            return (
                              <div key={assignment.id} className="relative flex flex-col items-center">
                                <div
                                  data-assignment-id={assignment.id}
                                  onClick={(e) => {
                                    if (isReadOnly) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    if (activeDropdownId === assignment.id) {
                                      setActiveDropdownId(null);
                                      setDropdownPos(null);
                                    } else {
                                      setActiveDropdownId(assignment.id);
                                      setMemberSearchQuery('');
                                      setDropdownPos(calculateDropdownPosition(rect));
                                    }
                                  }}
                                  className={`flex flex-col items-center group select-none relative min-w-[50px] max-w-[76px] text-center ${
                                    isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                  }`}
                                  title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
                                >
                                  {isAssigned ? (
                                    <div className="relative mb-1 flex items-center justify-center">
                                      <div className="relative w-10 h-10 rounded-full border-2 p-0.5 flex items-center justify-center shrink-0 transition-all border-emerald-500 bg-emerald-50 shadow-xs">
                                        {memberObj?.avatar_url ? (
                                          <img
                                            src={memberObj.avatar_url}
                                            alt={cleanName}
                                            className="w-full h-full rounded-full object-cover shrink-0"
                                          />
                                        ) : (
                                          <div className="w-full h-full rounded-full font-black text-[10px] flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-emerald-500 to-teal-600">
                                            {getInitials(cleanName || role)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : isReadOnly ? (
                                    <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 bg-slate-100/70 text-slate-400 font-bold mb-1 flex items-center justify-center shadow-2xs shrink-0 cursor-default">
                                      <span className="text-xs font-black">-</span>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full border border-dashed border-red-500 bg-red-50/90 text-red-600 group-hover:bg-red-100 font-black mb-1 flex items-center justify-center shadow-2xs transition-colors cursor-pointer shrink-0">
                                      <Plus className="w-4 h-4 stroke-[3] text-red-600" />
                                    </div>
                                  )}

                                  <span className="text-[10px] font-black uppercase tracking-wider leading-tight block text-center text-slate-500">
                                    {shortRole}
                                  </span>

                                  {isAssigned ? (
                                    (() => {
                                      const fullName = cleanName || memberObj?.name?.trim() || '';
                                      const firstSpaceIndex = fullName.indexOf(' ');
                                      const firstName =
                                        firstSpaceIndex !== -1 ? fullName.substring(0, firstSpaceIndex) : fullName;
                                      const remainingName =
                                        firstSpaceIndex !== -1 ? fullName.substring(firstSpaceIndex + 1) : '';

                                      return (
                                        <div className="flex flex-col items-center justify-center leading-tight text-center max-w-[76px] px-0.5 mt-0.5">
                                          <span className="text-xs font-semibold text-neutral-800">{firstName}</span>
                                          {remainingName && (
                                            <span className="text-[10px] font-medium text-neutral-600 tracking-tight line-clamp-1">
                                              {remainingName}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[68px] text-center leading-none mt-0.5 block">
                                      {isReadOnly ? 'Unassigned' : 'Assign'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          FLOATING CREW ASSIGNMENT PORTAL POPOVER (MATCHING `team-manager/page.tsx`)
         ───────────────────────────────────────────────────────────────────────────── */}
      {isMounted &&
        activeDropdownId &&
        dropdownPos &&
        activeAssignmentContext &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const { activeAssignment, resolved } = activeAssignmentContext;
            const otherSlotAssignedMemberMap = new Map<string, string>();
            resolved.forEach((slot: any) => {
              if (slot.id !== activeAssignment.id && slot.assigned_member_id) {
                otherSlotAssignedMemberMap.set(slot.assigned_member_id, slot.required_role);
              }
            });

            const memberObj =
              activeAssignment.fw_team_members ||
              (activeAssignment.assigned_member_id
                ? teamMembers.find((m) => m.id === activeAssignment.assigned_member_id)
                : null);
            const cleanName = (
              memberObj?.name ||
              (activeAssignment as any).assigned_member_name ||
              ''
            )
              .replace(/\.\.\./g, '')
              .trim();
            const isPlaceholderName =
              !memberObj &&
              ['not fixed', 'tbd', 'unassigned', 'pending', 'date not fixed'].includes(cleanName.toLowerCase());
            const isAssigned = Boolean((memberObj || activeAssignment.assigned_member_id) && !isPlaceholderName);

            return (
              <>
                <div
                  className="fixed inset-0 z-[99990]"
                  onClick={() => {
                    setActiveDropdownId(null);
                    setDropdownPos(null);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: dropdownPos.openAbove ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                  style={{
                    position: 'fixed',
                    ...(dropdownPos.openAbove
                      ? { bottom: `${dropdownPos.bottom}px` }
                      : { top: `${dropdownPos.top}px` }),
                    left: `${dropdownPos.left}px`,
                    maxHeight: dropdownPos.maxHeight ? `${dropdownPos.maxHeight}px` : undefined,
                    zIndex: 99999,
                  }}
                  className="w-64 bg-white border border-[#6C5CE7]/20 rounded-[18px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-3 space-y-2 text-left select-none flex flex-col"
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search member or role..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdownId(null);
                      setDropdownPos(null);
                      setActiveAssignmentForMember({
                        assignmentId: activeAssignment.id,
                        role: activeAssignment.required_role,
                        subEventId: activeAssignment.sub_event_id || undefined,
                        projectId: activeAssignment.project_id || undefined,
                      });
                      setIsAddMemberOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#F0EDFF] hover:bg-[#E5E0FF] text-[#6C5CE7] text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add New Team Member
                  </button>

                  <div className="h-px bg-zinc-100 my-1" />

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 flex-1 min-h-0">
                    {/* 1. Option: Unassign / Clear */}
                    <button
                      type="button"
                      onClick={() => {
                        handleAssignMember(activeAssignment.id, null);
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        !isAssigned
                          ? 'bg-rose-100 text-rose-700 border-rose-300 font-black'
                          : 'text-rose-600 bg-rose-50/70 hover:bg-rose-100 hover:text-rose-700 border-rose-200/60'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>• Unassign / Clear</span>
                      </span>
                      {!isAssigned && <Check className="w-3.5 h-3.5 text-rose-600" />}
                    </button>

                    {/* 2. Dedicated CURRENTLY ASSIGNED block */}
                    {isAssigned && (
                      <div className="space-y-1 pt-0.5">
                        <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100/90 rounded-md flex items-center justify-between border border-emerald-200/90">
                          <span className="flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                            <span>Currently Assigned</span>
                          </span>
                          <span className="text-[8px] bg-emerald-200 text-emerald-950 px-1 rounded-full font-black">
                            Active
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {memberObj?.avatar_url ? (
                              <img
                                src={memberObj.avatar_url}
                                alt={cleanName}
                                className="w-6 h-6 rounded-full object-cover shrink-0 border border-emerald-400/40 shadow-xs"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 shadow-xs">
                                {getInitials(cleanName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate">{cleanName}</p>
                              <p className="text-[10px] text-emerald-700 font-semibold truncate">
                                {memberObj ? getMemberDisplayRole(memberObj) : (activeAssignment.required_role || 'Crew')}
                              </p>
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                        </div>
                      </div>
                    )}

                    {/* 3. Filtered In-House & Freelancers with Studio Owner at top of In-House */}
                    {(() => {
                      const q = memberSearchQuery.trim().toLowerCase();
                      const filterMem = (m: any) => {
                        const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                        if (!q) return true;
                        return (
                          cleanMName.toLowerCase().includes(q) ||
                          getMemberDisplayRole(m).toLowerCase().includes(q) ||
                          (m.primary_role && m.primary_role.toLowerCase().includes(q))
                        );
                      };

                      const inHouseFiltered = groupedInHouse.filter(filterMem);
                      const freelancersFiltered = groupedFreelancers.filter(filterMem);

                      if (inHouseFiltered.length === 0 && freelancersFiltered.length === 0) {
                        return (
                          <div className="p-3 text-center text-xs text-slate-400 font-medium">
                            No matching team members found.
                          </div>
                        );
                      }

                      const renderMemberRow = (m: any) => {
                        const isSelected = activeAssignment.assigned_member_id === m.id;
                        const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                        const isRoleMatch =
                          (m.primary_role || '').toLowerCase() ===
                          (activeAssignment.required_role || '').toLowerCase();
                        const alreadyAssignedRole = otherSlotAssignedMemberMap.get(m.id);
                        const isAlreadyAssignedElsewhere = Boolean(alreadyAssignedRole && !isSelected);
                        const isOwner = isOwnerMember(m);
                        const displayRole = getMemberDisplayRole(m);

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (isAlreadyAssignedElsewhere) {
                                setDuplicateAssignmentConfirm({
                                  assignmentId: activeAssignment.id,
                                  memberId: m.id,
                                  memberName: cleanMName,
                                  existingRole: alreadyAssignedRole || 'Crew',
                                  newRole: activeAssignment.required_role || 'Crew',
                                });
                                return;
                              }
                              setActiveDropdownId(null);
                              setDropdownPos(null);
                              handleAssignMember(activeAssignment.id, m.id);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isAlreadyAssignedElsewhere
                                ? 'bg-amber-50/50 hover:bg-amber-100/70 text-slate-800 border border-amber-200/50'
                                : isSelected
                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs'
                                : 'text-[#0B111E] hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  alt={cleanMName}
                                  className={`w-6 h-6 rounded-full object-cover shrink-0 border border-white ${
                                    isSelected ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-6 h-6 rounded-full text-white font-black text-[9px] flex items-center justify-center shrink-0 border border-white ${
                                    isSelected
                                      ? 'bg-emerald-600 ring-2 ring-emerald-500'
                                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-1 ring-indigo-200'
                                  }`}
                                >
                                  {getInitials(cleanMName)}
                                </div>
                              )}
                              <div className="text-left leading-tight min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`block font-black text-xs truncate ${
                                      isSelected ? 'text-emerald-900' : 'text-slate-900'
                                    }`}
                                  >
                                    {cleanMName}
                                  </span>
                                  {isOwner && (
                                    <span className="text-[8.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                                      👑 Owner
                                    </span>
                                  )}
                                  {isAlreadyAssignedElsewhere && (
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                      ⚠️ Assigned ({getRoleAbbr(alreadyAssignedRole, customCrewRoles)})
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-[9.5px] font-semibold ${
                                    isSelected
                                      ? 'text-emerald-700'
                                      : isOwner
                                      ? 'text-amber-800 font-bold'
                                      : isRoleMatch
                                      ? 'text-indigo-600 font-bold'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {displayRole}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 stroke-[3]" />}
                          </button>
                        );
                      };

                      return (
                        <div className="space-y-2">
                          {/* IN-HOUSE TEAM SECTION */}
                          {inHouseFiltered.length > 0 && (
                            <div className="space-y-1">
                              <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/80 rounded-md flex items-center justify-between border border-amber-200/80">
                                <span>In-House Team</span>
                                <span className="text-[8px] bg-amber-200 text-amber-950 px-1 rounded-full font-black">
                                  {inHouseFiltered.length}
                                </span>
                              </div>
                              {inHouseFiltered.map(renderMemberRow)}
                            </div>
                          )}

                          {/* FREELANCERS & EXTERNAL VENDORS SECTION */}
                          {freelancersFiltered.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <div className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 bg-stone-100/90 rounded-md flex items-center justify-between border border-stone-200">
                                <span>Freelancers & External Vendors</span>
                                <span className="text-[8px] bg-stone-200 text-stone-900 px-1 rounded-full font-black">
                                  {freelancersFiltered.length}
                                </span>
                              </div>
                              {freelancersFiltered.map(renderMemberRow)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>

                {duplicateAssignmentConfirm && (
                  <div
                    className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Reassign Crew Member</h3>
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="font-bold text-slate-900">{duplicateAssignmentConfirm.memberName}</span> is
                            currently assigned as{' '}
                            <span className="font-bold text-amber-800">
                              &quot;{duplicateAssignmentConfirm.existingRole}&quot;
                            </span>{' '}
                            in this event.
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Do you want to reassign them to{' '}
                            <span className="font-bold text-indigo-700">
                              &quot;{duplicateAssignmentConfirm.newRole}&quot;
                            </span>
                            ?
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDuplicateAssignmentConfirm(null)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = duplicateAssignmentConfirm;
                            setDuplicateAssignmentConfirm(null);
                            setActiveDropdownId(null);
                            setDropdownPos(null);
                            handleAssignMember(target.assignmentId, target.memberId);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                        >
                          Reassign Member
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })(),
          document.body
        )}

      {/* ADD / EDIT SUB-EVENTS & CREW ROLES MODAL */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => {
          setIsAddProjectOpen(false);
          setEditingProject(null);
        }}
        projectToEdit={editingProject}
        workspaceId={effectiveWsId}
        onSave={handleSaveProjectModal}
      />

      {/* ADD NEW TEAM MEMBER MODAL */}
      <AddTeamMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setActiveAssignmentForMember(null);
        }}
        initialRole={activeAssignmentForMember?.role || ''}
        onSave={handleSaveTeamMember}
      />

      {/* WHATSAPP & COMMERCIALS MODAL */}
      <WhatsAppAssignmentModal
        isOpen={whatsappModalData.isOpen}
        onClose={() => setWhatsappModalData((prev) => ({ ...prev, isOpen: false }))}
        assignmentId={whatsappModalData.assignmentId}
        member={whatsappModalData.member}
        role={whatsappModalData.role}
        project={whatsappModalData.project}
        subEvent={whatsappModalData.subEvent}
        workspaceId={effectiveWsId}
        studioName={studioName}
        projectManagerName={(whatsappModalData.project as any)?.project_manager_name || 'Studio Manager'}
        previousMemberName={whatsappModalData.previousMemberName}
        previousRate={whatsappModalData.previousRate}
        onCommercialsSaved={(savedData) => {
          if (savedData) {
            const actorName = currentMember?.name || workspaceName || activeWorkspace?.studioName || 'Admin';
            const actorRole = isOwner ? 'Studio Owner' : currentMember?.is_sales_person ? 'Sales Person' : 'Project Manager';
            const assignedMemName = whatsappModalData.member?.name || savedData.savedAssignment?.assigned_member_name || 'Crew Member';
            logClientAudit({
              clientId: client.id,
              workspaceId: effectiveWsId || undefined,
              actorId: userId || undefined,
              actorName,
              actorEmail: userEmail || undefined,
              actorRole,
              module: 'events',
              actionType: 'ASSIGN',
              title: `Assigned ${assignedMemName} (${whatsappModalData.role || savedData.role || 'Crew'})`,
              description: `Assigned ${assignedMemName} as ${whatsappModalData.role || savedData.role || 'Crew'} for ${whatsappModalData.subEvent?.event_title || 'event'}${savedData.agreedAmount ? ` (Fee: ₹${Number(savedData.agreedAmount).toLocaleString('en-IN')})` : ''}.`,
              oldValue: whatsappModalData.previousMemberName || 'Unassigned',
              newValue: assignedMemName,
              metadata: {
                event_title: whatsappModalData.subEvent?.event_title || null,
                event_date: whatsappModalData.subEvent?.event_date || null,
                is_date_tbd: Boolean((whatsappModalData.subEvent as any)?.is_date_tbd),
                crew_name: assignedMemName,
                crew_avatar: whatsappModalData.member?.avatar_url || null,
                crew_role: whatsappModalData.role || savedData.role || 'Crew',
                amount: savedData.agreedAmount || 0,
              },
            }).catch(() => {});

            setLocalProject((prev) => {
              const base = prev || whatsappModalData.project || displayProject;
              const targetSubEventId = whatsappModalData.subEvent?.id || savedData.subEventId;

              return {
                ...base,
                fw_sub_events: (base.fw_sub_events || []).map((se) => {
                  if (targetSubEventId && se.id !== targetSubEventId) return se;

                  const existingList = se.fw_assignments || [];
                  let matchedAny = false;
                  const newAssignmentObj: any = {
                    id: savedData.assignmentId || savedData.savedAssignment?.id,
                    project_id: base.id,
                    sub_event_id: se.id,
                    required_role: whatsappModalData.role || savedData.role || 'Crew',
                    assigned_member_id:
                      whatsappModalData.member?.id || savedData.savedAssignment?.assigned_member_id,
                    assigned_member_name:
                      whatsappModalData.member?.name || savedData.savedAssignment?.assigned_member_name,
                    assigned_member_phone:
                      whatsappModalData.member?.phone_number ||
                      (whatsappModalData.member as any)?.phone ||
                      '',
                    fw_team_members: whatsappModalData.member,
                    status: 'assigned',
                    agreed_amount: savedData.agreedAmount,
                    paid_amount: savedData.advancePaid,
                    advance_amount: savedData.advancePaid,
                    balance_amount: savedData.balanceDue,
                    payment_status:
                      savedData.status ||
                      (savedData.balanceDue <= 0 && savedData.agreedAmount > 0
                        ? 'completed'
                        : savedData.advancePaid > 0
                        ? 'partial'
                        : 'pending'),
                    ...(savedData.savedAssignment ? savedData.savedAssignment : {}),
                  };

                  const updated = existingList.map((a) => {
                    const isMatch =
                      (savedData.assignmentId && a.id === savedData.assignmentId) ||
                      (whatsappModalData.assignmentId && a.id === whatsappModalData.assignmentId) ||
                      (whatsappModalData.role &&
                        a.required_role?.toLowerCase() === whatsappModalData.role.toLowerCase()) ||
                      (savedData.role && a.required_role?.toLowerCase() === savedData.role.toLowerCase());

                    if (isMatch) {
                      matchedAny = true;
                      return {
                        ...a,
                        ...newAssignmentObj,
                        id: savedData.assignmentId || a.id,
                      };
                    }
                    return a;
                  });

                  return {
                    ...se,
                    fw_assignments: matchedAny ? updated : [...updated, newAssignmentObj],
                  };
                }),
              };
            });
          }
          emitWorkspaceSyncEvents();
          onRefreshParent?.();
        }}
      />

      {/* PROJECT HISTORY MODAL */}
      {selectedProjectForHistory && (
        <ProjectHistoryModal
          isOpen={Boolean(selectedProjectForHistory)}
          onClose={() => setSelectedProjectForHistory(null)}
          project={selectedProjectForHistory}
        />
      )}
    </div>
  );
}

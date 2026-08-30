'use client';
import OperationsAnalyticsTab from './components/OperationsAnalyticsTab';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, Calendar, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash, ChevronDown, Edit2, TrendingUp, Award, Grid, Menu,
  Database, FileText, Layers, ArrowLeft, SlidersHorizontal, CheckSquare, Folder, Edit3, Pencil, Settings,
  HardDrive, UserPlus, AlertTriangle, Zap, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import AddProjectModal from './components/AddProjectModal';
import AddTeamMemberModal from './components/AddTeamMemberModal';
import TeamSettingsModal from './components/TeamSettingsModal';
import MonthListView from './components/MonthListView';
import Professional3DCalendar from './components/Professional3DCalendar';
import { EventBlockData } from './components/EventBlock';
import { saveOrUpdateEventPayout } from '@/lib/team-finance-sync';
import { WorkspaceCrewRole, fetchWorkspaceCrewRoles, fetchWorkspaceEventTypes, getRoleShortCode, DEFAULT_CREW_ROLES } from '@/lib/workspace-settings';

// 1. Deterministic Client Gradient Consistency based on Project ID / Name Hash
const getGradientByProjectId = (id: string) => {
  if (!id) return 'bg-gradient-to-b from-purple-700 via-indigo-700 to-indigo-900';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'bg-gradient-to-b from-purple-700 via-indigo-700 to-indigo-900', // Deep Royal Purple
    'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-700',   // Vibrant Sunrise Amber
    'bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900', // Ocean Emerald
    'bg-gradient-to-b from-blue-600 via-indigo-600 to-slate-900',    // Cyber Blue
  ];
  return gradients[hash % gradients.length];
};

// 2. Clean Maximum 2-Line Name Justification (No 4-line stacks)
const formatMemberName2Lines = (fullName: string) => {
  if (!fullName) return { line1: '', line2: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { line1: parts[0], line2: '' };
  }
  const line1 = parts[0];
  const line2 = parts.slice(1).join(' ');
  return { line1, line2 };
};

// Helper to extract 2-letter uppercase initials (e.g. "Sushant Nawale" -> "SN")
const getInitials = (name: string): string => {
  if (!name) return 'TM';
  const parts = name.trim().replace(/\.\.\./g, '').split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// 12-Hour AM/PM Time Formatting Utility
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
  const formattedHours = hours.toString().padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
};

// Robust assignment resolver ensuring ALL configured roles remain visible (assigned or unassigned)
const resolveSubEventAssignments = (subEvent: FWSubEvent, teamMembers: FWTeamMember[]): FWAssignment[] => {
  let rawRoles: string[] = [];
  if (Array.isArray((subEvent as any).roles)) {
    rawRoles = (subEvent as any).roles;
  } else if (typeof (subEvent as any).roles === 'string') {
    try { rawRoles = JSON.parse((subEvent as any).roles); } catch (e) {}
  } else if (Array.isArray((subEvent as any).roles_assigned)) {
    rawRoles = (subEvent as any).roles_assigned;
  } else if (Array.isArray((subEvent as any).event_roles)) {
    rawRoles = (subEvent as any).event_roles;
  }

  const existingAssignments = subEvent.fw_assignments || [];
  const assignRoles = existingAssignments.map(a => a.required_role).filter(Boolean);
  const allRoles = Array.from(new Set([...rawRoles, ...assignRoles]));

  if (allRoles.length === 0) {
    return existingAssignments;
  }

  return allRoles.map((role: string, idx: number) => {
    const existing = existingAssignments.find(
      a => a.required_role?.toLowerCase() === role.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    return {
      id: `${subEvent.id}-role-${idx}`,
      sub_event_id: subEvent.id,
      project_id: subEvent.project_id,
      required_role: role,
      assigned_member_id: null,
      fw_team_members: null,
    };
  });
};

export default function TeamManagerPage() {
  const { workspaceId, workspaceName, isOwner, userRole, permissions } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'list' | 'calendar' | 'trash'>('projects');
  
  // Dynamic Time-Based Greeting & Studio Profile Name
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
    if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
    return { text: 'Good Evening', emoji: '🌙' };
  }, []);

  const studioName = useMemo(() => {
    if (workspaceName) return workspaceName;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fw_studio_name');
      if (saved) return saved;
    }
    return 'Studio Admin';
  }, [workspaceName]);
  
  const tmAccess = isOwner ? 'ALL_MANAGE' : (permissions?.team_manager_access || 'ASSIGNED_ONLY_VIEW');
  const isTmReadOnly = !isOwner && tmAccess !== 'ALL_MANAGE' && tmAccess !== 'MANAGE_ALL';
  const isAssignedCardOnly = !isOwner && (tmAccess === 'ASSIGNED_ONLY_VIEW' || tmAccess === 'ASSIGNED_FULL_TEAM_VIEW');
  const isSelfRoleOnly = !isOwner && tmAccess === 'ASSIGNED_ONLY_VIEW';
  
  // Real Data State & Current User Workspace ID
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [projects, setProjects] = useState<FWProject[]>([]);
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Popovers State
  const [isAddProjectOpen, setIsAddProjectOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<FWProject | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<FWTeamMember | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [eventTypesList, setEventTypesList] = useState<string[]>([
    "Wedding Ceremony", "Haldi", "Sangeet", "Mehendi", "Reception", "Pre-Wedding Shoot"
  ]);
  const [customCrewRoles, setCustomCrewRoles] = useState<WorkspaceCrewRole[]>(DEFAULT_CREW_ROLES);
  const [activeAssignmentForMember, setActiveAssignmentForMember] = useState<{
    assignmentId?: string;
    role?: string;
    subEventId?: string;
    projectId?: string;
  } | null>(null);

  // Permanent Delete Confirmation Modal Target State
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<FWProject | null>(null);

  // Active Dropdown Target: assignmentId -> boolean
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [activePmDropdownProjectId, setActivePmDropdownProjectId] = useState<string | null>(null);
  const [pmSearchQuery, setPmSearchQuery] = useState<string>('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [instantAlerts, setInstantAlerts] = useState<boolean>(true);

  // Close popovers on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (activePmDropdownProjectId) {
        setActivePmDropdownProjectId(null);
        setPmSearchQuery('');
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activePmDropdownProjectId]);

  // Handle PM Assignment Update
  const handleProjectPMChange = async (projectId: string, memberId: string | null, memberName: string | null) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return { ...p, project_manager_id: memberId, project_manager_name: memberName };
      }
      return p;
    }));

    try {
      const { error } = await supabase
        .from('fw_projects')
        .update({
          project_manager_id: memberId,
          project_manager_name: memberName,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('[TeamManager] Error updating PM in Supabase:', error);
      }
    } catch (err) {
      console.error('[TeamManager] Error updating PM:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // DYNAMIC SCROLL TRACKING FOR ASSIGNMENT POPOVER
  // ─────────────────────────────────────────────────────────────
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
        setDropdownPos({
          top: Math.min(rect.bottom + 6, window.innerHeight - 280),
          left: Math.max(10, Math.min(rect.left - 100, window.innerWidth - 270)),
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeDropdownId]);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING & HYDRATION FROM SUPABASE (RELATIONAL SCHEMAS + WORKSPACE ISOLATION)
  // ─────────────────────────────────────────────────────────────
  const fetchAllData = async (targetUid?: string) => {
    setLoading(true);
    setError(null);
    const uid = targetUid !== undefined ? targetUid : (workspaceId || currentUserId);

    try {
      try {
        await supabase.storage.createBucket('team-avatars', { public: true });
      } catch (e) {
        // Bucket initialized or skipped
      }

      // 1. Fetch Team Members for active workspace from both workspace_members and fw_team_members
      const combinedMembers: FWTeamMember[] = [];

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/workspace/members?workspace_id=${uid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          json.members.forEach((m: any) => {
            combinedMembers.push({
              id: m.id,
              user_id: uid,
              name: m.name || 'Team Member',
              primary_role: m.primary_role || 'Crew',
              phone_number: m.phone || '',
              email: m.email || '',
              avatar_url: m.avatar_url || '',
              is_active: m.status === 'ACTIVE'
            });
          });
        }
      } catch (_) {}

      let membersQuery = supabase
        .from('fw_team_members')
        .select('*')
        .order('name', { ascending: true });

      if (uid) {
        membersQuery = membersQuery.eq('user_id', uid);
      }

      const { data: membersData, error: membersErr } = await membersQuery;
      if (membersErr) console.warn('[TeamManager] fw_team_members error:', membersErr.message);

      if (membersData && membersData.length > 0) {
        membersData.forEach((f: any) => {
          const exists = combinedMembers.some(c => c.name.toLowerCase() === f.name.toLowerCase());
          if (!exists) {
            combinedMembers.push(f);
          }
        });
      }

      setTeamMembers(combinedMembers);

      // 2. Fetch Projects for active workspace
      let projectsQuery = supabase
        .from('fw_projects')
        .select(`
          *,
          fw_sub_events (
            *,
            fw_assignments (
              *,
              fw_team_members (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (uid) {
        projectsQuery = projectsQuery.eq('user_id', uid);
      }

      const { data: projectsData, error: projectsErr } = await projectsQuery;
      if (projectsErr) console.warn('[TeamManager] fw_projects error:', projectsErr.message);

      let projectsDataToSet: any[] = projectsData || [];

      if (!isOwner && isAssignedCardOnly) {
        const { data: { session } } = await supabase.auth.getSession();
        const uEmail = (session?.user?.email || '').trim().toLowerCase();
        const uName = (session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '').trim().toLowerCase();

        projectsDataToSet = projectsDataToSet
          .map((proj: any) => {
            const filteredSubEvents = (proj.fw_sub_events || []).filter((se: any) => {
              const assignments = se.fw_assignments || [];
              return assignments.some((a: any) => {
                const mem = a.fw_team_members;
                if (!mem) return false;
                const mEmail = (mem.email || '').trim().toLowerCase();
                const mName = (mem.name || '').trim().toLowerCase();
                return (uEmail && mEmail === uEmail) || (uName && mName === uName) || mem.id === session?.user?.id;
              });
            });

            if (filteredSubEvents.length === 0) return null;

            if (isSelfRoleOnly) {
              const processedSubEvents = filteredSubEvents.map((se: any) => {
                const selfAssignments = (se.fw_assignments || []).filter((a: any) => {
                  const mem = a.fw_team_members;
                  if (!mem) return false;
                  const mEmail = (mem.email || '').trim().toLowerCase();
                  const mName = (mem.name || '').trim().toLowerCase();
                  return (uEmail && mEmail === uEmail) || (uName && mName === uName) || mem.id === session?.user?.id;
                });
                return { ...se, fw_assignments: selfAssignments };
              });
              return { ...proj, fw_sub_events: processedSubEvents };
            }

            return { ...proj, fw_sub_events: filteredSubEvents };
          })
          .filter(Boolean);
      }

      setProjects(projectsDataToSet);

      // Fetch Workspace Event Types & Crew Roles for consistent dropdowns & short codes
      try {
        const fetchedRoles = await fetchWorkspaceCrewRoles(uid);
        if (fetchedRoles && fetchedRoles.length > 0) setCustomCrewRoles(fetchedRoles);

        const fetchedEvTypes = await fetchWorkspaceEventTypes(uid);
        if (fetchedEvTypes && fetchedEvTypes.length > 0) setEventTypesList(fetchedEvTypes.map(e => e.name));
      } catch (wsErr) {
        console.warn('[TeamManager] Error fetching workspace event types/roles:', wsErr);
      }
    } catch (err: any) {
      console.error('[TeamManager] fetchAllData Exception:', err);
      setError(err?.message || 'Failed to fetch operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initUserAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || '';
      setCurrentUserId(uid);
      const effectiveWsId = workspaceId || uid;
      await fetchAllData(effectiveWsId);
    }
    initUserAndFetch();
  }, [workspaceId]);

  // Handle Team Member Save (Create / Edit)
  const handleSaveTeamMember = async (memberData: {
    name: string;
    primary_role: string;
    country_code: string;
    phone_number: string;
    email?: string;
    avatar_url?: string;
  }) => {
    try {
      const { permissions, roles, ...cleanMemberData } = memberData as any;
      const payload = {
        name: cleanMemberData.name,
        primary_role: cleanMemberData.primary_role,
        country_code: cleanMemberData.country_code || '+91',
        phone_number: cleanMemberData.phone_number,
        email: cleanMemberData.email || null,
        avatar_url: cleanMemberData.avatar_url || null,
        ...(currentUserId ? { user_id: currentUserId } : {})
      };

      if (editingMember) {
        const { error: updateErr } = await supabase
          .from('fw_team_members')
          .update(payload)
          .eq('id', editingMember.id);
        if (updateErr) throw updateErr;
      } else {
        const { data: insertedMember, error: insertErr } = await supabase
          .from('fw_team_members')
          .insert([payload])
          .select()
          .single();
        if (insertErr) throw insertErr;

        if (activeAssignmentForMember?.assignmentId && insertedMember) {
          await supabase
            .from('fw_assignments')
            .update({ 
              assigned_member_id: insertedMember.id,
              ...(currentUserId ? { user_id: currentUserId } : {})
            })
            .eq('id', activeAssignmentForMember.assignmentId);
        }
      }

      await fetchAllData();
      setIsAddMemberOpen(false);
      setEditingMember(null);
      setActiveAssignmentForMember(null);
    } catch (err: any) {
      console.error('[TeamManager] Save team member failed:', err);
      alert('Failed to save team member: ' + err.message);
    }
  };

  // Handle Assignment Update (Assign / Unassign Team Member to Role INSTANTLY)
  const handleAssignMember = (assignmentId: string, memberId: string | null) => {
    try {
      const activeAssign = projects
        .flatMap(p => p.fw_sub_events || [])
        .flatMap(se => resolveSubEventAssignments(se, teamMembers))
        .find(a => a.id === assignmentId);

      if (activeAssign) {
        const matchedMemberObj = memberId ? teamMembers.find(m => m.id === memberId) || null : null;

        // 1. INSTANT OPTIMISTIC UI STATE UPDATE (NO PAGE RELOAD / NO RE-FETCH)
        setProjects(prevProjects =>
          prevProjects.map(proj => ({
            ...proj,
            fw_sub_events: proj.fw_sub_events?.map(se => {
              if (se.id !== activeAssign.sub_event_id) return se;
              const existingAssignments = se.fw_assignments || [];
              const exists = existingAssignments.some(
                a => a.id === assignmentId || a.required_role === activeAssign.required_role
              );
              const updatedAssignments = exists
                ? existingAssignments.map(a =>
                    (a.id === assignmentId || a.required_role === activeAssign.required_role)
                      ? { ...a, assigned_member_id: memberId, fw_team_members: matchedMemberObj }
                      : a
                  )
                : [
                    ...existingAssignments,
                    {
                      id: assignmentId,
                      project_id: activeAssign.project_id,
                      sub_event_id: activeAssign.sub_event_id,
                      required_role: activeAssign.required_role,
                      assigned_member_id: memberId,
                      fw_team_members: matchedMemberObj,
                    },
                  ];
              return { ...se, fw_assignments: updatedAssignments };
            }),
          }))
        );

        // 2. BACKGROUND SILENT DB PERSISTENCE & FINANCE PAYOUT AUTO-SYNC
        (async () => {
          try {
            const projectObj = projects.find(p => p.id === activeAssign.project_id);
            const subEventObj = projects
              .flatMap(p => p.fw_sub_events || [])
              .find(se => se.id === activeAssign.sub_event_id);

            // Auto sync to Team & Partner Financial Engine
            if (memberId && matchedMemberObj) {
              await saveOrUpdateEventPayout(workspaceId || currentUserId, {
                member_id: memberId,
                member_name: matchedMemberObj.name,
                project_id: activeAssign.project_id || undefined,
                sub_event_id: activeAssign.sub_event_id || undefined,
                client_name: projectObj?.client_name || 'Wedding Client',
                event_name: subEventObj?.event_title || 'Wedding Event',
                event_date: subEventObj?.event_date || new Date().toISOString().split('T')[0],
                role: activeAssign.required_role || 'Crew',
                agreed_amount: 0 // Can be customized in Member Finance Drawer
              });
            }
            if (assignmentId.includes('-role-')) {
              const subEventObj = projects
                .flatMap(p => p.fw_sub_events || [])
                .find(se => se.id === activeAssign.sub_event_id);

              const { error: insertErr } = await supabase
                .from('fw_assignments')
                .insert([{
                  project_id: activeAssign.project_id,
                  sub_event_id: activeAssign.sub_event_id,
                  required_role: activeAssign.required_role,
                  assigned_member_id: memberId,
                  sub_event_name: subEventObj?.event_title || 'Wedding Event',
                  sub_event_date: subEventObj?.event_date || new Date().toISOString().split('T')[0],
                  start_time: subEventObj?.roll_call_time || '10:00',
                  end_time: subEventObj?.dismissal_estimate_time || '18:00',
                  status: 'pending',
                }]);

              if (insertErr) {
                console.error('[TeamManager] Insert assignment error:', insertErr.message);
              }
            } else {
              const { error: assignErr } = await supabase
                .from('fw_assignments')
                .update({ assigned_member_id: memberId })
                .eq('id', assignmentId);

              if (assignErr) {
                console.error('[TeamManager] Assignment update error:', assignErr.message);
              }
            }
          } catch (err) {
            console.error('[TeamManager] Background assignment update error:', err);
          }
        })();
      }
    } catch (err) {
      console.error('[TeamManager] handleAssignMember Exception:', err);
    }
  };

  // Handle Project Creation & Update strictly following Granular Relational Schema
  const handleSaveProject = async (
    couplingName: string,
    blocks: EventBlockData[],
    projectId?: string
  ) => {
    try {
      let targetProjectId = projectId;
      const firstSubEventDate = blocks[0]?.subEventDate || new Date().toISOString().split('T')[0];
      const firstSubEventVenue = blocks[0]?.venueLocation || 'TBD Venue';

      // STEP 1: Insert or Update Project in fw_projects
      if (projectId) {
        const { error: projErr } = await supabase
          .from('fw_projects')
          .update({ 
            client_name: couplingName, 
            main_date: firstSubEventDate,
            main_venue: firstSubEventVenue,
            updated_at: new Date().toISOString() 
          })
          .eq('id', projectId);
        if (projErr) throw projErr;

        // EDIT MODE: Preserve assignments! Fetch existing sub-events WITH their assignments
        const { data: existingSubEvents } = await supabase
          .from('fw_sub_events')
          .select('id, event_title, roles')
          .eq('project_id', projectId);

        // Fetch existing ASSIGNED members so we can preserve them
        const existingAssignedMap: Record<string, string | null> = {};
        if (existingSubEvents && existingSubEvents.length > 0) {
          const subEventIds = existingSubEvents.map(se => se.id);
          const { data: existingAssignments } = await supabase
            .from('fw_assignments')
            .select('sub_event_id, required_role, assigned_member_id')
            .in('sub_event_id', subEventIds)
            .not('assigned_member_id', 'is', null);

          // Build a map: "subEventTitle|role" -> assigned_member_id
          if (existingAssignments) {
            existingAssignments.forEach(a => {
              const se = existingSubEvents.find(e => e.id === a.sub_event_id);
              if (se) {
                const key = `${se.event_title}|${a.required_role}`;
                existingAssignedMap[key] = a.assigned_member_id;
              }
            });
          }

          // Now delete old assignments and sub_events to re-insert updated ones
          await supabase.from('fw_assignments').delete().in('sub_event_id', subEventIds);
          await supabase.from('fw_sub_events').delete().eq('project_id', projectId);
        }

        // Re-insert sub-events and restore assigned members where they were set
        if (blocks.length > 0) {
          for (const block of blocks) {
            const title = block.subEventNames.join(' + ') || 'Wedding Ceremony';
            const rolesToSave = block.roles || [];

            const subEventPayload: any = {
              project_id: targetProjectId,
              event_title: title,
              event_date: block.subEventDate || new Date().toISOString().split('T')[0],
              venue_name: block.venueLocation || null,
              venue_map_link: block.mapLink || null,
              roll_call_time: block.startTime || '10:00',
              dismissal_estimate_time: block.endTime || '18:00',
              operational_notes: block.notes || null,
              shift_hours_slot: block.shiftSlot || null,
              roles: rolesToSave,
            };

            const { data: insertedSubEvent, error: seErr } = await supabase
              .from('fw_sub_events')
              .insert([subEventPayload])
              .select()
              .single();

            if (seErr) throw seErr;

            if (insertedSubEvent && rolesToSave.length > 0) {
              const assignmentsPayload = rolesToSave.map(role => {
                // Restore the previously assigned member if one existed for this role
                const preservedMember = existingAssignedMap[`${title}|${role}`] || null;
                return {
                  project_id: targetProjectId,
                  sub_event_id: insertedSubEvent.id,
                  sub_event_name: title,
                  sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                  start_time: block.startTime || '10:00',
                  end_time: block.endTime || '18:00',
                  required_role: role,
                  assigned_member_id: preservedMember, // PRESERVE EXISTING ASSIGNMENT!
                  status: preservedMember ? 'assigned' : 'pending',
                };
              });

              const { error: assignErr } = await supabase
                .from('fw_assignments')
                .insert(assignmentsPayload);

              if (assignErr) {
                console.error('[TeamManager] Insert fw_assignments error (edit):', assignErr.message);
              }
            }
          }
        }

      } else {
        // NEW PROJECT: insert fresh
        const { data: newProj, error: projErr } = await supabase
          .from('fw_projects')
          .insert([{ 
            client_name: couplingName,
            main_date: firstSubEventDate,
            main_venue: firstSubEventVenue,
            ...(currentUserId ? { user_id: currentUserId } : {})
          }])
          .select()
          .single();
        if (projErr) throw projErr;
        targetProjectId = newProj.id;

        // Insert new sub-events + unassigned roles
        if (blocks.length > 0) {
          for (const block of blocks) {
            const title = block.subEventNames.join(' + ') || 'Wedding Ceremony';
            const rolesToSave = block.roles || [];

            const subEventPayload: any = {
              project_id: targetProjectId,
              event_title: title,
              event_date: block.subEventDate || new Date().toISOString().split('T')[0],
              venue_name: block.venueLocation || null,
              venue_map_link: block.mapLink || null,
              roll_call_time: block.startTime || '10:00',
              dismissal_estimate_time: block.endTime || '18:00',
              operational_notes: block.notes || null,
              shift_hours_slot: block.shiftSlot || null,
              roles: rolesToSave,
              ...(currentUserId ? { user_id: currentUserId } : {})
            };

            const { data: insertedSubEvent, error: seErr } = await supabase
              .from('fw_sub_events')
              .insert([subEventPayload])
              .select()
              .single();

            if (seErr) throw seErr;

            if (insertedSubEvent && rolesToSave.length > 0) {
              const assignmentsPayload = rolesToSave.map(role => ({
                project_id: targetProjectId,
                sub_event_id: insertedSubEvent.id,
                sub_event_name: title,
                sub_event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                start_time: block.startTime || '10:00',
                end_time: block.endTime || '18:00',
                required_role: role,
                assigned_member_id: null,
                status: 'pending',
                ...(currentUserId ? { user_id: currentUserId } : {})
              }));

              const { error: assignErr } = await supabase
                .from('fw_assignments')
                .insert(assignmentsPayload);

              if (assignErr) {
                console.error('[TeamManager] Insert fw_assignments error (new):', assignErr.message);
              }
            }
          }
        }
      }

      // Re-fetch clean relational state
      await fetchAllData();
      setIsAddProjectOpen(false);
      setEditingProject(null);
      return true;
    } catch (err: any) {
      console.error('[TeamManager] handleSaveProject Exception:', err);
      alert("Error saving project: " + (err?.message || err));
      return false;
    }
  };

  // Toggle Soft-Archive Project (Move to Trash / Restore)
  const handleToggleArchiveProject = async (projectId: string, isArchived: boolean) => {
    try {
      await supabase
        .from('fw_projects')
        .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
        .eq('id', projectId);

      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, is_archived: isArchived } : p))
      );
    } catch (err) {
      console.error('[TeamManager] Archive toggle failed:', err);
    }
  };

  // Permanent Hard-Delete Project from Supabase DB
  const handlePermanentDeleteProject = async (projectId: string) => {
    try {
      const { data: subEvents } = await supabase.from('fw_sub_events').select('id').eq('project_id', projectId);
      if (subEvents && subEvents.length > 0) {
        const subEventIds = subEvents.map(se => se.id);
        await supabase.from('fw_assignments').delete().in('sub_event_id', subEventIds);
        await supabase.from('fw_sub_events').delete().eq('project_id', projectId);
      }
      await supabase.from('fw_projects').delete().eq('id', projectId);

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setPermanentDeleteTarget(null);
    } catch (err) {
      console.error('[TeamManager] Permanent delete failed:', err);
    }
  };

  // Helper Countdown Pill Text
  const getCountdownBadge = (dateStr?: string) => {
    if (!dateStr) return 'Upcoming';
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? `In ${days} Days` : days === 0 ? 'Today' : `${Math.abs(days)} Days Ago`;
  };

  // Filtered Projects List
  const filteredProjects = projects.filter(p => {
    if (activeTab === 'trash') return p.is_archived;
    if (p.is_archived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.client_name.toLowerCase().includes(q);
      const matchSub = p.fw_sub_events?.some(se => se.event_title.toLowerCase().includes(q));
      if (!matchName && !matchSub) return false;
    }

    if (selectedRoleFilter !== 'All') {
      const hasRole = p.fw_sub_events?.some(se =>
        se.fw_assignments?.some(a => a.required_role === selectedRoleFilter)
      );
      if (!hasRole) return false;
    }

    return true;
  });

  if (!isOwner && tmAccess === 'NONE') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-zinc-200 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-zinc-900">Bookings &amp; Shoot Schedule Restricted</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Aapke account ko is studio ke Bookings &amp; Shoot Schedule dekhne ki permission nahi hai. Kripya apne studio admin se contact karein.
          </p>
          <Link href="/workspace" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-block transition">
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-100 text-[#0B111E] font-sans antialiased selection:bg-[#6C5CE7]/15 px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20 md:pb-6">
      {/* PC STICKY TOP TOOLBAR WRAPPER */}
        <div className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-md pb-4 pt-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60 shadow-2xs space-y-4">
          {/* Top Responsive Header Block */}
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* BACK TO DASHBOARD / WORKSPACE BUTTON */}
              <Link
                href="/workspace"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition shadow-2xs shrink-0"
                title="Back to Workspace"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0B111E] tracking-tight leading-none">
                    Team Manager
                  </h1>
                  <p className="text-xs font-bold text-[#4F5E74] mt-1 leading-none">
                    {greetingInfo.text}, {studioName} {greetingInfo.emoji}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Desktop action controls + mobile settings only */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search - desktop only */}
              <div className="relative hidden sm:block w-52 lg:w-64">
                <Search className="w-4 h-4 text-[#4F5E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients or sub-events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#6C5CE7]/10 rounded-2xl text-xs font-bold text-[#0B111E] placeholder:text-[#4F5E74]/60 focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
                />
              </div>

              {!isTmReadOnly && (
                <>
                  {/* + Member - desktop only */}
                  <button
                    onClick={() => {
                      setActiveAssignmentForMember(null);
                      setIsAddMemberOpen(true);
                    }}
                    className="hidden sm:flex bg-white border border-[#6C5CE7]/30 text-[#6C5CE7] text-xs font-extrabold py-2.5 px-3 rounded-2xl items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer transition hover:border-[#6C5CE7]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Member</span>
                  </button>

                  {/* + Project - desktop only */}
                  <button
                    onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
                    className="hidden sm:flex bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-black py-2.5 px-4 rounded-2xl transition items-center justify-center gap-1.5 shadow-lg shadow-[#6C5CE7]/20 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Project</span>
                  </button>
                </>
              )}

              {/* Settings - always visible for owner / admin */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl shadow-2xs text-indigo-600 transition-all cursor-pointer shrink-0"
                  title="Team & Operations Settings"
                >
                  <Settings className="w-4 h-4"/>
                </button>
              )}
            </div>
          </div>

          {/* Mobile search bar - full width below header */}
          <div className="sm:hidden relative w-full">
            <Search className="w-4 h-4 text-[#4F5E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients or sub-events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#6C5CE7]/10 rounded-2xl text-xs font-bold text-[#0B111E] placeholder:text-[#4F5E74]/60 focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
            />
          </div>

          {/* ─── VIEW MODE NAVIGATION SWITCHER BAR (DESKTOP) ─── */}
          <div className="hidden md:flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full py-0.5 scrollbar-none">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer select-none shrink-0 ${
                  activeTab === 'projects'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Grid className="w-4 h-4" />
                Cards View (Client-Wise)
              </button>

              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer select-none shrink-0 ${
                  activeTab === 'list'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <List className="w-4 h-4" />
                Month-Wise List View
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer select-none shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('trash')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer select-none shrink-0 ${
                  activeTab === 'trash'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Trash Buffer ({projects.filter(p => p.is_archived).length})
              </button>
            </div>
          </div>
        </div>

        {/* ─── TAB VIEW: CARDS VIEW (SMART DUAL RESPONSIVE LAYOUT: PC DESKTOP + MOBILE APP CARDS) ─── */}
        {activeTab === 'projects' && (
          <div className="space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 space-y-3">
                <Loader2 className="w-8 h-8 text-[#6C5CE7] animate-spin" />
                <span className="text-xs font-bold text-[#4F5E74]">Hydrating Client Operations Workspace...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-2xs">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-[#6C5CE7] flex items-center justify-center mx-auto">
                  <Folder className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0B111E]">No Active Client Projects Found</h3>
                  <p className="text-xs text-[#4F5E74] font-semibold mt-1">Get started by creating a new wedding project.</p>
                </div>
                <button
                  onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
                  className="bg-[#6C5CE7] text-white text-xs font-bold px-5 py-2.5 rounded-2xl inline-flex items-center gap-2 shadow-md shadow-[#6C5CE7]/20 hover:bg-[#5b4cd1] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add First Wedding Project
                </button>
              </div>
            ) : (
              <>
                {/* 1. DESKTOP / PC CARDS VIEW (RESTORED MASTER CLIENT CONTAINER + VERTICAL GRADIENT DATE BLOCK) */}
                <div className="hidden lg:block space-y-8">
                  {filteredProjects.map((project) => {
                    const projectGradient = getGradientByProjectId(project.id || project.client_name);

                    return (
                      <div 
                        key={project.id}
                        className="bg-white border-2 border-slate-300/90 shadow-lg shadow-slate-200/50 rounded-3xl p-6 space-y-4 mb-8"
                      >
                        {/* MASTER CLIENT CARD HEADER */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-3.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-2xl font-black tracking-tight" style={{ color: '#1E1B4B' }}>
                              {project.client_name}
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-950 text-[11px] font-black tracking-wide border border-indigo-200/80 shadow-2xs">
                              {project.fw_sub_events?.length || 0} Sub-Events
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* PROJECT MANAGER (PM) DROPDOWN WITH AVATARS */}
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setActivePmDropdownProjectId(activePmDropdownProjectId === project.id ? null : project.id)}
                                className="px-3 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer group"
                              >
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">PM:</span>
                                {project.project_manager_name ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[9px] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                      {(() => {
                                        const assignedMem = teamMembers.find(m => m.id === project.project_manager_id || m.name === project.project_manager_name);
                                        if (assignedMem?.avatar_url) {
                                          return <img src={assignedMem.avatar_url} alt="" className="w-full h-full object-cover" />;
                                        }
                                        return getInitials(project.project_manager_name);
                                      })()}
                                    </div>
                                    <span className="font-extrabold text-amber-950 max-w-[130px] truncate">{project.project_manager_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-amber-700/80 italic font-semibold">Assign PM</span>
                                )}
                                <ChevronDown className="w-3 h-3 text-amber-700 group-hover:translate-y-0.5 transition-transform" />
                              </button>

                              {/* Popover Dropdown */}
                              {activePmDropdownProjectId === project.id && (
                                <div 
                                  className="absolute right-0 mt-2 z-[9999] w-64 max-h-80 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-slate-800"
                                >
                                  <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                    <span>Assign Project Manager</span>
                                    {project.project_manager_name && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleProjectPMChange(project.id, null, null);
                                          setActivePmDropdownProjectId(null);
                                          setPmSearchQuery('');
                                        }}
                                        className="text-rose-500 hover:underline cursor-pointer font-bold"
                                      >
                                        Clear PM
                                      </button>
                                    )}
                                  </div>

                                  {/* Search Input for PMs */}
                                  <div className="relative px-1 pt-1 pb-0.5">
                                    <input
                                      type="text"
                                      placeholder="Search team member..."
                                      value={pmSearchQuery}
                                      onChange={e => setPmSearchQuery(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                                      autoFocus
                                    />
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                                  </div>

                                  {teamMembers.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                                      No team members found in Directory.
                                    </div>
                                  ) : (
                                    teamMembers
                                      .filter(m => 
                                        !pmSearchQuery.trim() || 
                                        m.name.toLowerCase().includes(pmSearchQuery.toLowerCase()) || 
                                        (m.primary_role || '').toLowerCase().includes(pmSearchQuery.toLowerCase())
                                      )
                                      .map(m => {
                                        const isSelected = project.project_manager_id === m.id || project.project_manager_name === m.name;
                                        return (
                                          <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                              handleProjectPMChange(project.id, m.id, m.name);
                                              setActivePmDropdownProjectId(null);
                                              setPmSearchQuery('');
                                            }}
                                            className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                                              isSelected ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                                                {m.avatar_url ? (
                                                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  getInitials(m.name)
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-black truncate">{m.name}</p>
                                                <p className="text-[10px] text-slate-400 font-semibold truncate">{m.primary_role || 'Team Member'}</p>
                                              </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                                          </button>
                                        );
                                      })
                                  )}
                                </div>
                              )}
                            </div>

                            {!isTmReadOnly && (
                              <button 
                                title="Edit Project"
                                onClick={() => {
                                  setEditingProject(project);
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
                        <div className="space-y-4">
                          {project.fw_sub_events?.map((subEvent) => {
                            const isDateNotFixed = !subEvent.event_date || 
                              subEvent.event_date.toLowerCase().includes('not fix') || 
                              subEvent.event_date.toLowerCase().includes('tbd') || 
                              isNaN(new Date(subEvent.event_date).getTime());

                            const eventDate = new Date(subEvent.event_date);
                            const dayName = isDateNotFixed 
                              ? 'DATE' 
                              : eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                            const monthAbbr = isDateNotFixed 
                              ? 'NOT' 
                              : eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                            const dayNumber = isDateNotFixed 
                              ? 'TBD' 
                              : eventDate.getDate().toString().padStart(2, '0');
                            const yearStr = isDateNotFixed 
                              ? 'FIXED' 
                              : eventDate.getFullYear().toString();

                            // Robust assignment resolver ensuring roles are fetched via fw_assignments relation
                            const assignments = resolveSubEventAssignments(subEvent, teamMembers);

                            return (
                              <div 
                                key={subEvent.id}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-row items-stretch overflow-hidden"
                              >
                                {/* LEFT VERTICAL GRADIENT DATE BLOCK */}
                                <div className={`${projectGradient} w-28 shrink-0 flex flex-col items-center justify-between p-3.5 text-center`}>
                                  <div>
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider block">
                                      {dayName}
                                    </span>
                                    <span className={`font-black text-white leading-none my-1 block ${isDateNotFixed ? 'text-lg' : 'text-2xl'}`}>
                                      {dayNumber}
                                    </span>
                                    <span className="text-xs font-extrabold text-white/90 uppercase tracking-wider block">
                                      {monthAbbr}
                                    </span>
                                    <span className="text-[10px] font-semibold text-white/70 tracking-widest mt-0.5 block">
                                      {yearStr}
                                    </span>
                                  </div>

                                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner mt-2 border border-white/20">
                                    <Calendar className="w-3.5 h-3.5" />
                                  </div>
                                </div>

                                {/* MAIN RIGHT CONTENT BODY */}
                                <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                                  <div>
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-slate-900 text-base tracking-tight" style={{ color: '#1E1B4B' }}>
                                          {subEvent.event_title}
                                        </h4>
                                        {isDateNotFixed && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                            ⚠️ Date Not Fixed (Click Edit to set date)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 flex-wrap">
                                      {subEvent.roll_call_time && (
                                        <div className="flex items-center gap-1.5 text-slate-700">
                                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>
                                            {format12HourTime(subEvent.roll_call_time)}
                                            {subEvent.dismissal_estimate_time ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
                                          </span>
                                          {(subEvent as any).shift_hours_slot && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200/90 ml-1">
                                              <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                                              {(subEvent as any).shift_hours_slot}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {subEvent.roll_call_time && subEvent.venue_name && (
                                        <span className="text-slate-300 font-normal">|</span>
                                      )}

                                      {subEvent.venue_name && (
                                        <div className="relative group/venue">
                                          <a
                                            href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
                                          >
                                            <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                            <span className="truncate max-w-[220px]">{subEvent.venue_name}</span>
                                          </a>
                                        </div>
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
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                                      Assigned Crew Roster (Click avatar to assign role)
                                    </span>
                                    <div className="flex items-start gap-4 flex-wrap">
                                      {assignments.map((assignment: any) => {
                                        const isAssigned = assignment.assigned_member_id !== null;
                                        const memberObj = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                                        const rawName = memberObj?.name || '';
                                        const cleanName = rawName.replace(/\.\.\./g, '').trim();
                                        const role = assignment.required_role;
                                        const dropdownKey = assignment.id;

                                        const { line1, line2 } = formatMemberName2Lines(cleanName);

                                        return (
                                          <div key={assignment.id} className="relative flex flex-col items-center min-w-[68px]">
                                            <div
                                              data-assignment-id={assignment.id}
                                              onClick={(e) => {
                                                if (isTmReadOnly) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                if (activeDropdownId === dropdownKey) {
                                                  setActiveDropdownId(null);
                                                  setDropdownPos(null);
                                                } else {
                                                  setActiveDropdownId(dropdownKey);
                                                  setMemberSearchQuery('');
                                                  setDropdownPos({
                                                    top: Math.min(rect.bottom + 6, window.innerHeight - 280),
                                                    left: Math.max(10, Math.min(rect.left - 100, window.innerWidth - 270)),
                                                  });
                                                }
                                              }}
                                              className="flex flex-col items-center group cursor-pointer"
                                              title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
                                            >
                                              {isAssigned ? (
                                                memberObj?.avatar_url ? (
                                                  // eslint-disable-next-next/no-img-element
                                                  <img 
                                                    src={memberObj.avatar_url} 
                                                    alt={cleanName} 
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-emerald-400 group-hover:scale-105 transition shrink-0" 
                                                  />
                                                ) : (
                                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 group-hover:scale-105 transition shrink-0">
                                                    {getInitials(cleanName || role)}
                                                  </div>
                                                )
                                              ) : (
                                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 bg-red-50/90 text-red-600 font-black flex items-center justify-center shadow-xs group-hover:bg-red-100 transition-colors cursor-pointer shrink-0">
                                                  <span className="text-xs font-black tracking-tight">{getRoleShortCode(role, customCrewRoles)}</span>
                                                </div>
                                              )}

                                              <span className={`font-bold text-[11px] uppercase tracking-wide block text-center mt-1.5 leading-none ${
                                                isAssigned ? 'text-indigo-600' : 'text-red-600 font-extrabold'
                                              }`}>
                                                {isAssigned ? role : getRoleShortCode(role, customCrewRoles)}
                                              </span>

                                              {isAssigned && (
                                                <div className="flex flex-col items-center text-center font-extrabold text-slate-900 text-xs leading-tight max-w-[90px] mt-0.5 min-h-[28px] justify-start">
                                                  <span className="block leading-none truncate max-w-[90px]">{line1}</span>
                                                  {line2 ? <span className="block leading-none truncate max-w-[90px] mt-0.5">{line2}</span> : null}
                                                </div>
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
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. MOBILE / TABLET CARDS VIEW (COMPACT STACKED CLIENT CARDS LAYOUT WITH COMMENTS VISIBLE) */}
                <div className="block lg:hidden grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredProjects.map((project) => {
                    const subEvents = project.fw_sub_events || [];

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 overflow-hidden flex flex-col hover:border-indigo-300 transition duration-200 group"
                      >
                        {/* CLIENT CARD HEADER BAR */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                                {getInitials(project.client_name)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-black text-white tracking-tight truncate">
                                  {project.client_name}
                                </h3>
                                <span className="text-[10px] font-bold text-slate-300">
                                  {subEvents.length} Sub-Event{subEvents.length === 1 ? '' : 's'} Configured
                                </span>
                              </div>
                            </div>

                            {!isTmReadOnly && (
                              <button
                                onClick={() => {
                                  setEditingProject(project);
                                  setIsAddProjectOpen(true);
                                }}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer shrink-0"
                                title="Edit Project Configuration"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Mobile PM Assignment Row */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between relative" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">PM:</span>
                              <button
                                type="button"
                                onClick={() => setActivePmDropdownProjectId(activePmDropdownProjectId === `m_${project.id}` ? null : `m_${project.id}`)}
                                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/15"
                              >
                                {project.project_manager_name ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[8px] flex items-center justify-center overflow-hidden shrink-0">
                                      {(() => {
                                        const assignedMem = teamMembers.find(m => m.id === project.project_manager_id || m.name === project.project_manager_name);
                                        if (assignedMem?.avatar_url) {
                                          return <img src={assignedMem.avatar_url} alt="" className="w-full h-full object-cover" />;
                                        }
                                        return getInitials(project.project_manager_name);
                                      })()}
                                    </div>
                                    <span className="truncate max-w-[140px]">{project.project_manager_name}</span>
                                  </>
                                ) : (
                                  <span className="text-amber-200/80 italic text-[10px]">Assign Project Manager</span>
                                )}
                                <ChevronDown className="w-3 h-3 text-amber-300" />
                              </button>
                            </div>

                            {/* Mobile PM Dropdown Modal/Popover */}
                            {activePmDropdownProjectId === `m_${project.id}` && (
                              <div 
                                className="absolute left-0 right-0 top-full mt-2 z-[9999] max-h-72 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-slate-800"
                              >
                                <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                  <span>Select Project Manager</span>
                                  {project.project_manager_name && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleProjectPMChange(project.id, null, null);
                                        setActivePmDropdownProjectId(null);
                                        setPmSearchQuery('');
                                      }}
                                      className="text-rose-500 hover:underline text-[10px] font-bold cursor-pointer"
                                    >
                                      Clear PM
                                    </button>
                                  )}
                                </div>

                                {/* Search Input for Mobile */}
                                <div className="relative px-1 pt-0.5">
                                  <input
                                    type="text"
                                    placeholder="Search team member..."
                                    value={pmSearchQuery}
                                    onChange={e => setPmSearchQuery(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                                    autoFocus
                                  />
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                </div>

                                {teamMembers
                                  .filter(m => 
                                    !pmSearchQuery.trim() || 
                                    m.name.toLowerCase().includes(pmSearchQuery.toLowerCase()) || 
                                    (m.primary_role || '').toLowerCase().includes(pmSearchQuery.toLowerCase())
                                  )
                                  .map(m => {
                                    const isSelected = project.project_manager_id === m.id || project.project_manager_name === m.name;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                          handleProjectPMChange(project.id, m.id, m.name);
                                          setActivePmDropdownProjectId(null);
                                          setPmSearchQuery('');
                                        }}
                                        className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition ${
                                          isSelected ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200' : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center shrink-0 overflow-hidden">
                                            {m.avatar_url ? (
                                              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              getInitials(m.name)
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-black truncate text-slate-900">{m.name}</p>
                                            <p className="text-[9px] text-slate-400 font-semibold truncate">{m.primary_role || 'Crew'}</p>
                                          </div>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SUB-EVENTS LIST */}
                        <div className="p-4 space-y-4 flex-1 bg-slate-50/40">
                          {subEvents.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 italic">No sub-events added yet.</div>
                          ) : (
                            subEvents.map((subEvent) => {
                              const isDateNotFixed = !subEvent.event_date || 
                                subEvent.event_date.toLowerCase().includes('not fix') || 
                                subEvent.event_date.toLowerCase().includes('tbd') || 
                                isNaN(new Date(subEvent.event_date).getTime());

                              const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                              const assignedCount = assignments.filter((a: any) => a.assigned_member_id !== null).length;
                              const totalSlots = assignments.length;

                              return (
                                <div
                                  key={subEvent.id}
                                  className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div>
                                      <h4 className="font-extrabold text-slate-900 text-xs">
                                        {subEvent.event_title}
                                      </h4>
                                      {isDateNotFixed ? (
                                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-amber-300">
                                          ⚠️ Date Not Fixed (Edit to set)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                                          {subEvent.event_date} ({getCountdownBadge(subEvent.event_date)})
                                        </span>
                                      )}
                                    </div>

                                    <span className="px-2 py-0.5 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-100">
                                      {assignedCount}/{totalSlots} Roles
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
                                    {subEvent.roll_call_time && (
                                      <div className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
                                        <Clock className="w-3 h-3 text-indigo-600" />
                                        <span>
                                          {format12HourTime(subEvent.roll_call_time)}
                                          {subEvent.dismissal_estimate_time ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
                                        </span>
                                      </div>
                                    )}

                                    {(subEvent as any).shift_hours_slot && (
                                      <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-[11px] font-extrabold">
                                        <Zap className="w-3 h-3 text-amber-500 shrink-0 fill-amber-400" />
                                        <span>{(subEvent as any).shift_hours_slot}</span>
                                      </div>
                                    )}

                                    {subEvent.venue_name && (
                                      <div className="flex items-center gap-1 text-emerald-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
                                        <MapPin className="w-3 h-3 text-emerald-600" />
                                        <span className="truncate max-w-[120px]">{subEvent.venue_name}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* MOBILE SUB-EVENT OPERATIONAL NOTES / COMMENTS BANNER */}
                                  {subEvent.operational_notes && (
                                    <div className="bg-amber-50/90 border-l-4 border-amber-400 p-2.5 rounded-r-xl text-[11px] text-amber-950 font-medium flex items-center gap-2 my-1">
                                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span className="break-words">{subEvent.operational_notes}</span>
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                                      Crew Placements
                                    </span>
                                    <div className="flex items-start gap-3 flex-wrap">
                                      {assignments.map((assignment: any) => {
                                        const member = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                                        const isAssigned = member !== undefined && member !== null;
                                        const role = assignment.required_role || 'Crew';
                                        const cleanName = member?.name ? member.name.replace(/\.\.\./g, '').trim() : '';
                                        const { line1, line2 } = formatMemberName2Lines(cleanName);

                                        return (
                                          <div
                                            key={assignment.id}
                                            data-assignment-id={assignment.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setDropdownPos({
                                                top: Math.min(rect.bottom + 6, window.innerHeight - 280),
                                                left: Math.max(10, Math.min(rect.left - 40, window.innerWidth - 270)),
                                              });
                                              setActiveDropdownId(activeDropdownId === assignment.id ? null : assignment.id);
                                            }}
                                            className="flex flex-col items-center group/node cursor-pointer select-none relative w-16 text-center"
                                          >
                                            {/* ANCHORED 40px CIRCLE BASELINE */}
                                            <div className="w-10 h-10 flex items-center justify-center shrink-0 mb-1">
                                              {isAssigned ? (
                                                member.avatar_url ? (
                                                  // eslint-disable-next-next/no-img-element
                                                  <img
                                                    src={member.avatar_url}
                                                    alt={cleanName}
                                                    className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-emerald-400 shrink-0"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 shrink-0">
                                                    {getInitials(cleanName || role)}
                                                  </div>
                                                )
                                              ) : (
                                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-600 font-black flex items-center justify-center shadow-2xs shrink-0">
                                                  <span className="text-[10px] font-black tracking-tight">{getRoleShortCode(role, customCrewRoles)}</span>
                                                </div>
                                              )}
                                            </div>

                                            <span className={`font-bold text-[9px] uppercase tracking-wide block text-center leading-none ${
                                              isAssigned ? 'text-indigo-600' : 'text-red-600 font-extrabold'
                                            }`}>
                                              {isAssigned ? role : getRoleShortCode(role, customCrewRoles)}
                                            </span>

                                            {isAssigned && (
                                              <div className="flex flex-col items-center text-center font-extrabold text-slate-900 text-[10px] leading-tight max-w-[75px] mt-0.5">
                                                <span className="block leading-none truncate max-w-[75px]">{line1}</span>
                                                {line2 ? <span className="block leading-none truncate max-w-[75px] mt-0.5">{line2}</span> : null}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TAB VIEW: OVERVIEW DASHBOARD STATS (3D ADVANCED ANALYTICS) ─── */}
        {activeTab === 'overview' && (
          <OperationsAnalyticsTab
            projects={projects}
            teamMembers={teamMembers}
            format12HourTime={format12HourTime}
            getGradientByProjectId={getGradientByProjectId}
          />
        )}

        {/* ─── TAB VIEW: LIST REGISTER (MONTH-WISE) ─── */}
        {activeTab === 'list' && (
          <MonthListView
            projects={projects}
            teamMembers={teamMembers}
            searchQuery={searchQuery}
            selectedRoleFilter={selectedRoleFilter}
            format12HourTime={format12HourTime}
            getGradientByProjectId={getGradientByProjectId}
            onAssignMember={handleAssignMember}
            onAddNewMember={(info) => {
              setActiveAssignmentForMember(info);
              setIsAddMemberOpen(true);
            }}
          />
        )}

        {/* ─── TAB VIEW: 3D PROFESSIONAL CALENDAR ─── */}
        {activeTab === 'calendar' && (
          <Professional3DCalendar
            projects={projects}
            teamMembers={teamMembers}
            searchQuery={searchQuery}
            selectedRoleFilter={selectedRoleFilter}
            format12HourTime={format12HourTime}
            getGradientByProjectId={getGradientByProjectId}
            onAssignMember={handleAssignMember}
            onAddNewMember={(info) => {
              setActiveAssignmentForMember(info);
              setIsAddMemberOpen(true);
            }}
          />
        )}

        {/* ─── TAB VIEW: TRASH RECOVERY & PERMANENT DELETE ─── */}
        {activeTab === 'trash' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#0B111E]">Soft-Archived Projects (Trash Buffer)</h3>
              <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-200">
                {filteredProjects.length} Archived Project{filteredProjects.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-[#4F5E74] font-bold shadow-2xs">
                Trash buffer is clear. No archived projects found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0B111E]">{p.client_name}</h4>
                      <p className="text-xs text-[#4F5E74] font-semibold mt-0.5">
                        {p.fw_sub_events?.length || 0} Sub-Event(s) • Soft Archived
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleArchiveProject(p.id, false)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs transition flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>

                      <button
                        onClick={() => setPermanentDeleteTarget(p)}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition flex items-center gap-1.5 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Permanent Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* ─── MOBILE STICKY BOTTOM FOOTER NAVIGATION BAR (FLOATING PILL STYLE) ─── */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-300/40 rounded-[2rem] px-4 py-2.5 flex items-center justify-around relative">
          {/* TAB 1: Cards */}
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 ${
              activeTab === 'projects' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`transition-all duration-200 ${
              activeTab === 'projects' ? 'scale-110' : ''
            }`}>
              <Grid className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black transition-all ${
              activeTab === 'projects' ? 'text-[#6C5CE7]' : 'text-slate-400'
            }`}>Cards</span>
            {activeTab === 'projects' && (
              <span className="absolute -top-1 left-1/2 -translate-x-[280%] w-1 h-1 rounded-full bg-[#6C5CE7]" />
            )}
          </button>

          {/* TAB 2: Month List */}
          <button
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 ${
              activeTab === 'list' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`transition-all duration-200 ${
              activeTab === 'list' ? 'scale-110' : ''
            }`}>
              <List className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black transition-all ${
              activeTab === 'list' ? 'text-[#6C5CE7]' : 'text-slate-400'
            }`}>Month</span>
          </button>

          {/* CENTER FLOATING + CREATE PROJECT BUTTON */}
          <div className="relative -mt-6 mx-2">
            <button
              onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
              className="w-14 h-14 rounded-full bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white flex items-center justify-center shadow-xl shadow-[#6C5CE7]/40 border-4 border-white transition-all active:scale-95 cursor-pointer"
              title="Create New Project"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {/* TAB 3: Overview */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 ${
              activeTab === 'overview' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`transition-all duration-200 ${
              activeTab === 'overview' ? 'scale-110' : ''
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black transition-all ${
              activeTab === 'overview' ? 'text-[#6C5CE7]' : 'text-slate-400'
            }`}>Overview</span>
          </button>

          {/* TAB 4: Trash */}
          <button
            onClick={() => setActiveTab('trash')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 ${
              activeTab === 'trash' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`transition-all duration-200 ${
              activeTab === 'trash' ? 'scale-110' : ''
            }`}>
              <Trash2 className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black transition-all ${
              activeTab === 'trash' ? 'text-rose-500' : 'text-slate-400'
            }`}>Trash</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL POPUP MODALS
         ───────────────────────────────────────────────────────────── */}
      
      {/* GLOBAL REACT PORTAL POPOVER FOR TEAM MEMBER ASSIGNMENT */}
      {activeDropdownId && dropdownPos && typeof window !== 'undefined' && (() => {
        const activeAssignment = projects
          .flatMap(p => p.fw_sub_events || [])
          .flatMap(se => resolveSubEventAssignments(se, teamMembers))
          .find(a => a.id === activeDropdownId);

        if (!activeAssignment) return null;
        const isAssigned = activeAssignment.assigned_member_id !== null;

        return createPortal(
          <>
            <div 
              className="fixed inset-0 z-[99998]" 
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
              }} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                zIndex: 99999,
              }}
              className="w-64 bg-white border border-[#6C5CE7]/20 rounded-[18px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-3 space-y-2 text-left"
            >
              {/* SEARCH INPUT BAR */}
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

              {/* TOP PINNED ACTION ROW */}
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

              {/* MEMBER SELECTION LIST */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                {/* UNASSIGN OPTION */}
                <button
                  type="button"
                  onClick={() => {
                    handleAssignMember(activeAssignment.id, null);
                    setDropdownPos(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !isAssigned
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <span>• Unassign / Pending</span>
                  {!isAssigned && <Check className="w-3.5 h-3.5" />}
                </button>

                {teamMembers
                  .filter(m => {
                    const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                    if (!memberSearchQuery.trim()) return true;
                    const q = memberSearchQuery.toLowerCase();
                    return (
                      cleanMName.toLowerCase().includes(q) ||
                      m.primary_role.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => {
                    const isSelected = activeAssignment.assigned_member_id === m.id;
                    const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          handleAssignMember(activeAssignment.id, m.id);
                          setDropdownPos(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                            : 'text-[#0B111E] hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {m.avatar_url ? (
                            // eslint-disable-next-next/no-img-element
                            <img 
                              src={m.avatar_url} 
                              alt={cleanMName} 
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-white ring-1 ring-emerald-400" 
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-[9px] flex items-center justify-center shrink-0 border border-white ring-1 ring-indigo-200">
                              {getInitials(cleanMName)}
                            </div>
                          )}
                          <span className="break-words max-w-[120px] text-left">{cleanMName}</span>
                          <span className="text-[9px] font-semibold text-[#4F5E74]">({m.primary_role})</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6C5CE7]" />}
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </>,
          document.body
        );
      })()}

      {/* 1. Add / Edit Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => {
          setIsAddProjectOpen(false);
          setEditingProject(null);
        }}
        projectToEdit={editingProject}
        onSave={handleSaveProject}
        onDeleteProject={(id) => handleToggleArchiveProject(id, true)}
      />

      {/* 2. Add New Team Member 3D Modal */}
      <AddTeamMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setEditingMember(null);
          setActiveAssignmentForMember(null);
        }}
        memberToEdit={editingMember}
        initialRole={activeAssignmentForMember?.role || 'Ass'}
        onSave={handleSaveTeamMember}
      />

      {/* 3. Global Operations & Team Settings Modal */}
      <TeamSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        eventTypes={eventTypesList}
        teamMembers={teamMembers}
        onUpdateEventTypes={(newTypes) => setEventTypesList(newTypes)}
        onUpdateTeamMembers={fetchAllData}
        onAddMemberClick={() => {
          setEditingMember(null);
          setActiveAssignmentForMember(null);
          setIsAddMemberOpen(true);
        }}
        onEditMember={(member) => {
          setEditingMember(member);
          setActiveAssignmentForMember(null);
          setIsAddMemberOpen(true);
        }}
        onDeleteMember={async (id) => {
          if (confirm('Are you sure you want to remove this team member?')) {
            await supabase.from('fw_team_members').delete().eq('id', id);
            fetchAllData();
          }
        }}
      />

      {/* 4. PERMANENT DELETE CONFIRMATION MODAL POPUP FOR TRASH BUFFER */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#0B111E]">Permanently Delete Project?</h3>
              <p className="text-xs font-semibold text-[#4F5E74]">
                Are you sure you want to permanently delete <span className="font-extrabold text-slate-900">&quot;{permanentDeleteTarget.client_name}&quot;</span>? This action <span className="text-rose-600 font-extrabold">CANNOT be undone</span> and will erase all sub-events and crew assignments.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPermanentDeleteTarget(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDeleteProject(permanentDeleteTarget.id)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition shadow-md shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Permanently Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
'use client';
import OperationsAnalyticsTab from './components/OperationsAnalyticsTab';
import UnifiedTeamFilterModal, { UnifiedFilterState } from './components/UnifiedTeamFilterModal';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, UsersRound, Calendar, Calendar as CalendarIcon, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash, ChevronDown, Edit2, TrendingUp, Award, Grid, Menu,
  Database, FileText, Layers, ArrowLeft, SlidersHorizontal, CheckSquare, Folder, Edit3, Pencil, Settings,
  HardDrive, UserPlus, AlertTriangle, Zap, Lock, IndianRupee, Users2
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
import WhatsAppAssignmentModal from './components/WhatsAppAssignmentModal';
import RoleAssignDropdown from './components/RoleAssignDropdown';
import { EventBlockData } from './components/EventBlock';
import { saveOrUpdateEventPayout, batchFetchWorkspaceTeamFinancials, fetchMemberFinancialSummary, fetchWorkspaceMemberRatesMap, TeamFinancialSummary, unassignCrewSlot } from '@/lib/team-finance-sync';
import TeamMemberFinanceDrawer from '../workspace/team/components/TeamMemberFinanceDrawer';
import DeleteMemberWarningModal from '../workspace/team/components/DeleteMemberWarningModal';
import { WorkspaceCrewRole, fetchWorkspaceCrewRoles, fetchWorkspaceEventTypes, saveAllWorkspaceEventTypes, getRoleShortCode, getRoleAbbr } from '@/lib/workspace-settings';
import { useWorkspaceData } from '@/context/WorkspaceDataContext';

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
      const matched = existing.fw_team_members || (existing.assigned_member_id ? teamMembers.find(m => m.id === existing.assigned_member_id) : null);
      return {
        ...existing,
        fw_team_members: matched || existing.fw_team_members || null
      };
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
  const { crewRoles: globalCrewRoles, eventTypesList: globalEventTypesList } = useWorkspaceData();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'list' | 'calendar' | 'trash'>('projects');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
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
  
  // Team & Partner Financial Engine States
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<any>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [memberFinancials, setMemberFinancials] = useState<Record<string, TeamFinancialSummary>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  const loadFinancialSummaries = async (membersList: FWTeamMember[]) => {
    const effectiveWsId = workspaceId || currentUserId;
    if (!effectiveWsId || membersList.length === 0) return;

    try {
      const memberIds = membersList.map(m => m.id).filter(Boolean);
      const summaryMap = await batchFetchWorkspaceTeamFinancials(effectiveWsId, memberIds);
      setMemberFinancials(summaryMap);
    } catch (err) {
      console.error('[TeamManager] Batch financials error:', err);
    }
  };

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
  const [customCrewRoles, setCustomCrewRoles] = useState<WorkspaceCrewRole[]>([]);
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

  // WhatsApp Assignment Modal State
  const [initialDateForModal, setInitialDateForModal] = useState<string>('');
  const [whatsappModalData, setWhatsappModalData] = useState<{
    isOpen: boolean;
    member: FWTeamMember | null;
    role: string;
    project: FWProject | null;
    subEvent: FWSubEvent | null;
  }>({
    isOpen: false,
    member: null,
    role: '',
    project: null,
    subEvent: null,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [instantAlerts, setInstantAlerts] = useState<boolean>(true);
  const [isUnifiedFilterOpen, setIsUnifiedFilterOpen] = useState<boolean>(false);
  const [isCardViewTbdExpanded, setIsCardViewTbdExpanded] = useState<boolean>(false);
  const [unifiedFilters, setUnifiedFilters] = useState<UnifiedFilterState>({
    monthYear: 'all',
    startDate: '',
    endDate: '',
    eventTypes: [],
    roles: [],
    assignmentStatus: 'all',
    pmId: 'all',
  });
  const [memberToDelete, setMemberToDelete] = useState<FWTeamMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState<boolean>(false);


  useEffect(() => {
    const handleFinanceUpdated = () => {
      loadFinancialSummaries(teamMembers);
    };
    window.addEventListener('team_finance_updated', handleFinanceUpdated);
    return () => window.removeEventListener('team_finance_updated', handleFinanceUpdated);
  }, [teamMembers]);

  // Real-time synchronization of crew roles & event types from Central Cache
  useEffect(() => {
    if (globalCrewRoles && globalCrewRoles.length > 0) {
      setCustomCrewRoles(globalCrewRoles);
    }
  }, [globalCrewRoles]);

  useEffect(() => {
    if (globalEventTypesList && globalEventTypesList.length > 0) {
      setEventTypesList(globalEventTypesList);
    }
  }, [globalEventTypesList]);

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
  const fetchAllData = async (targetUid?: string, silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const uid = targetUid !== undefined ? targetUid : (workspaceId || currentUserId);

    try {
      // 1. Fetch Team Members for active workspace from both workspace_members and fw_team_members
      const combinedMembers: FWTeamMember[] = [];
      const wsRatesMap = await fetchWorkspaceMemberRatesMap(uid).catch(() => ({}));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/workspace/members?workspace_id=${uid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          json.members.forEach((m: any) => {
            const calculatedRate = (wsRatesMap && (wsRatesMap as any)[m.id] != null) 
              ? (wsRatesMap as any)[m.id] 
              : (Number(m.default_daily_rate) || Number(m.daily_rate) || 0);

            combinedMembers.push({
              id: m.id,
              user_id: uid,
              name: m.name || 'Team Member',
              primary_role: m.primary_role || 'Crew',
              phone_number: m.phone || '',
              email: m.email || '',
              avatar_url: m.avatar_url || '',
              default_daily_rate: calculatedRate,
              default_currency: m.default_currency || 'INR',
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
          const calculatedRate = (wsRatesMap && (wsRatesMap as any)[f.id] != null)
            ? (wsRatesMap as any)[f.id]
            : (Number(f.default_daily_rate) || 0);

          const existingIdx = combinedMembers.findIndex(
            c => c.id === f.id || c.name.toLowerCase() === f.name.toLowerCase() || (f.email && c.email?.toLowerCase() === f.email.toLowerCase())
          );
          if (existingIdx >= 0) {
            if (!combinedMembers[existingIdx].default_daily_rate && calculatedRate > 0) {
              combinedMembers[existingIdx].default_daily_rate = calculatedRate;
            }
          } else {
            combinedMembers.push({
              ...f,
              default_daily_rate: calculatedRate,
              default_currency: f.default_currency || 'INR'
            });
          }
        });
      }

      setTeamMembers(combinedMembers);
      loadFinancialSummaries(combinedMembers);

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

      let projectsDataToSet: any[] = (projectsData || []).map((proj: any) => ({
        ...proj,
        fw_sub_events: (proj.fw_sub_events || []).map((se: any) => ({
          ...se,
          fw_assignments: (se.fw_assignments || []).map((a: any) => {
            const matched = a.fw_team_members || (a.assigned_member_id ? combinedMembers.find(m => m.id === a.assigned_member_id) : null);
            return {
              ...a,
              fw_team_members: matched || a.fw_team_members || null
            };
          })
        }))
      }));

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
        roles: roles || [cleanMemberData.primary_role],
        country_code: cleanMemberData.country_code || '+91',
        phone_number: cleanMemberData.phone_number,
        email: cleanMemberData.email || null,
        avatar_url: cleanMemberData.avatar_url || null,
        default_daily_rate: cleanMemberData.default_daily_rate || 0,
        default_currency: cleanMemberData.default_currency || 'INR',
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

      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      await fetchAllData(undefined, true);
      setIsAddMemberOpen(false);
      setEditingMember(null);
      setActiveAssignmentForMember(null);
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
      }
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

        // 2. UNASSIGNMENT CLEANUP (IF MEMBER ID IS NULL)
        if (!memberId) {
          (async () => {
            await unassignCrewSlot({
              workspaceId: workspaceId || currentUserId || '',
              eventId: activeAssign.project_id || undefined,
              subEventId: activeAssign.sub_event_id || undefined,
              assignmentId: assignmentId,
              roleShortCode: (activeAssign as any).role_short_code || activeAssign.required_role?.slice(0, 4) || '',
              roleName: activeAssign.required_role,
              teamMemberId: activeAssign.assigned_member_id || undefined
            });
          })();
          return;
        }

        // 3. TRIGGER WHATSAPP ROSTER DISPATCH MODAL ON MEMBER ASSIGNMENT
        if (matchedMemberObj) {
          const projectObj = projects.find(p => p.id === activeAssign.project_id);
          const subEventObj = projects
            .flatMap(p => p.fw_sub_events || [])
            .find(se => se.id === activeAssign.sub_event_id);

          setWhatsappModalData({
            isOpen: true,
            member: matchedMemberObj,
            role: activeAssign.required_role || 'Crew',
            project: projectObj || null,
            subEvent: subEventObj || null,
          });
        }

        // 4. BACKGROUND SILENT DB PERSISTENCE & FINANCE PAYOUT AUTO-SYNC
        (async () => {
          try {
            const projectObj = projects.find(p => p.id === activeAssign.project_id);
            const subEventObj = projects
              .flatMap(p => p.fw_sub_events || [])
              .find(se => se.id === activeAssign.sub_event_id);

            // 0. Ensure member exists in fw_team_members first to eliminate FK constraint errors
            if (matchedMemberObj) {
              try {
                await supabase.from('fw_team_members').upsert({
                  id: memberId,
                  name: matchedMemberObj.name,
                  phone_number: matchedMemberObj.phone_number || null,
                  email: matchedMemberObj.email || null,
                  primary_role: matchedMemberObj.primary_role || activeAssign.required_role || 'Crew',
                  avatar_url: matchedMemberObj.avatar_url || null,
                  default_daily_rate: matchedMemberObj.default_daily_rate || 0,
                  user_id: currentUserId || undefined,
                  is_active: true,
                }, { onConflict: 'id' });
              } catch (_) {}
            }

            // 1. Auto sync to Team & Partner Financial Engine (0 for In-House, default_daily_rate for Freelancers)
            if (matchedMemberObj) {
              const isInHouse = 
                (matchedMemberObj as any).payout_frequency === 'monthly' ||
                (matchedMemberObj as any).primary_type === 'IN_HOUSE' ||
                (matchedMemberObj as any).primary_type === 'in_house' ||
                (matchedMemberObj as any).type === 'IN_HOUSE' ||
                (matchedMemberObj as any).type === 'in_house' ||
                ((matchedMemberObj as any).member_types && (matchedMemberObj as any).member_types.includes('IN_HOUSE')) ||
                ((matchedMemberObj as any).member_types && (matchedMemberObj as any).member_types.includes('in_house'));

              const defaultAmount = isInHouse ? 0 : (matchedMemberObj.default_daily_rate || 0);

              await saveOrUpdateEventPayout(workspaceId || currentUserId, {
                member_id: memberId,
                member_name: matchedMemberObj.name,
                project_id: activeAssign.project_id || undefined,
                sub_event_id: activeAssign.sub_event_id || undefined,
                client_name: projectObj?.client_name || 'Wedding Client',
                event_name: subEventObj?.event_title || 'Wedding Event',
                event_date: subEventObj?.event_date || new Date().toISOString().split('T')[0],
                role: activeAssign.required_role || 'Crew',
                agreed_amount: defaultAmount
              });
            }
            // 2. Check if assignment record already exists in DB for this sub_event & role
            const { data: existingRow } = await supabase
              .from('fw_assignments')
              .select('id')
              .eq('sub_event_id', activeAssign.sub_event_id)
              .eq('required_role', activeAssign.required_role)
              .maybeSingle();

            if (existingRow?.id) {
              const { error: assignErr } = await supabase
                .from('fw_assignments')
                .update({ 
                  assigned_member_id: memberId,
                  ...(currentUserId ? { user_id: currentUserId, workspace_id: currentUserId } : {})
                })
                .eq('id', existingRow.id);

              if (assignErr) {
                console.error('[TeamManager] Assignment update error:', assignErr.message);
              }
            } else if (!assignmentId.includes('-role-')) {
              const { error: assignErr } = await supabase
                .from('fw_assignments')
                .update({ 
                  assigned_member_id: memberId,
                  ...(currentUserId ? { user_id: currentUserId, workspace_id: currentUserId } : {})
                })
                .eq('id', assignmentId);

              if (assignErr) {
                console.error('[TeamManager] Assignment update error:', assignErr.message);
              }
            } else {
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
                  ...(currentUserId ? { user_id: currentUserId, workspace_id: currentUserId } : {})
                }]);

              if (insertErr) {
                console.error('[TeamManager] Insert assignment error:', insertErr.message);
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
      const firstSubEventDate = blocks[0]?.isDateTbd ? null : (blocks[0]?.subEventDate || new Date().toISOString().split('T')[0]);
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
          const subEventIds = existingSubEvents
            .map(se => se.id)
            .filter(id => Boolean(id) && typeof id === 'string' && id.length === 36);

          if (subEventIds.length > 0) {
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
          }
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
              event_date: block.isDateTbd ? null : (block.subEventDate || null),
              is_date_tbd: Boolean(block.isDateTbd),
              is_overnight: Boolean(block.isOvernight),
              end_date: block.endDate || null,
              start_time_12h: block.startTime || '10:00 AM',
              end_time_12h: block.endTime || '06:00 PM',
              venue_name: block.venueLocation || null,
              venue_map_link: block.mapLink || null,
              roll_call_time: block.startTime || '10:00 AM',
              dismissal_estimate_time: block.endTime || '06:00 PM',
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
              event_date: block.isDateTbd ? null : (block.subEventDate || null),
              is_date_tbd: Boolean(block.isDateTbd),
              is_overnight: Boolean(block.isOvernight),
              end_date: block.endDate || null,
              start_time_12h: block.startTime || '10:00 AM',
              end_time_12h: block.endTime || '06:00 PM',
              venue_name: block.venueLocation || null,
              venue_map_link: block.mapLink || null,
              roll_call_time: block.startTime || '10:00 AM',
              dismissal_estimate_time: block.endTime || '06:00 PM',
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
        const subEventIds = subEvents
          .map(se => se.id)
          .filter(id => Boolean(id) && typeof id === 'string' && id.length === 36);

        if (subEventIds.length > 0) {
          await supabase.from('fw_assignments').delete().in('sub_event_id', subEventIds);
        }
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

  // Extract unique active project managers from current projects
  const assignedPms = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    projects.forEach((p: any) => {
      if (p.is_archived) return;
      if (p.project_manager) {
        if (typeof p.project_manager === 'object') {
          const id = p.project_manager.id || p.project_manager_id || p.project_manager.name;
          const name = p.project_manager.name || p.project_manager_name;
          if (id && name) map.set(String(id), { id: String(id), name: String(name) });
        } else if (typeof p.project_manager === 'string' && p.project_manager.trim()) {
          const val = p.project_manager.trim();
          map.set(val, { id: val, name: val });
        }
      }
      if (p.project_manager_id && p.project_manager_name) {
        map.set(String(p.project_manager_id), { id: String(p.project_manager_id), name: String(p.project_manager_name) });
      } else if (p.project_manager_name && typeof p.project_manager_name === 'string' && p.project_manager_name.trim()) {
        const val = p.project_manager_name.trim();
        map.set(val, { id: val, name: val });
      } else if (p.lead_assigned_to && typeof p.lead_assigned_to === 'string' && p.lead_assigned_to.trim()) {
        const val = p.lead_assigned_to.trim();
        map.set(val, { id: val, name: val });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  // Filtered Projects List with Unified Filter Support
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (activeTab === 'trash') return p.is_archived;
      if (p.is_archived) return false;

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.client_name?.toLowerCase().includes(q);
        const matchSub = p.fw_sub_events?.some(se => se.event_title?.toLowerCase().includes(q));
        if (!matchName && !matchSub) return false;
      }

      // 2. Role Filter (legacy dropdown or unified)
      if (selectedRoleFilter !== 'All') {
        const hasRole = p.fw_sub_events?.some(se =>
          se.fw_assignments?.some(a => a.required_role === selectedRoleFilter)
        );
        if (!hasRole) return false;
      }

      // 3. Unified Month Filter
      if (unifiedFilters?.monthYear && unifiedFilters.monthYear !== 'all') {
        const hasMonth = p.fw_sub_events?.some(se => (se.event_date || '').startsWith(unifiedFilters.monthYear));
        if (!hasMonth) return false;
      }

      // 4. Unified Date Range
      if (unifiedFilters?.startDate) {
        const afterStart = p.fw_sub_events?.some(se => (se.event_date || '') >= unifiedFilters.startDate);
        if (!afterStart) return false;
      }
      if (unifiedFilters?.endDate) {
        const beforeEnd = p.fw_sub_events?.some(se => (se.event_date || '') <= unifiedFilters.endDate);
        if (!beforeEnd) return false;
      }

      // 5. Unified Event Types
      if (unifiedFilters?.eventTypes && unifiedFilters.eventTypes.length > 0) {
        const hasType = p.fw_sub_events?.some(se =>
          unifiedFilters.eventTypes.some(t => se.event_title?.toLowerCase().includes(t.toLowerCase()))
        );
        if (!hasType) return false;
      }

      // 6. Unified Roles Multiselect
      if (unifiedFilters?.roles && unifiedFilters.roles.length > 0) {
        const hasAnyRole = p.fw_sub_events?.some(se =>
          se.fw_assignments?.some(a => unifiedFilters.roles.includes(a.required_role))
        );
        if (!hasAnyRole) return false;
      }

      // 7. Unified Assignment Status
      if (unifiedFilters?.assignmentStatus === 'unassigned') {
        const hasUnassigned = p.fw_sub_events?.some(se =>
          se.fw_assignments?.some(a => !a.assigned_member_id)
        );
        if (!hasUnassigned) return false;
      } else if (unifiedFilters?.assignmentStatus === 'fully_assigned' || unifiedFilters?.assignmentStatus === 'assigned') {
        const allAssigned = (p.fw_sub_events?.length ?? 0) > 0 && p.fw_sub_events.every(se =>
          se.fw_assignments && se.fw_assignments.length > 0 && se.fw_assignments.every(a => Boolean(a.assigned_member_id))
        );
        if (!allAssigned) return false;
      } else if (unifiedFilters?.assignmentStatus === 'partially_assigned' || unifiedFilters?.assignmentStatus === 'partial') {
        let totalSlots = 0;
        let assignedSlots = 0;
        p.fw_sub_events?.forEach(se => {
          se.fw_assignments?.forEach(a => {
            totalSlots++;
            if (a.assigned_member_id) assignedSlots++;
          });
        });
        if (totalSlots === 0 || assignedSlots === 0 || assignedSlots >= totalSlots) return false;
      }

      // 8. Unified Project Manager (PM) Filter
      if (unifiedFilters?.pmId && unifiedFilters.pmId !== 'all') {
        const targetPm = unifiedFilters.pmId.toLowerCase();
        const pObj: any = p;
        const pmId = String(pObj.project_manager_id || pObj.project_manager?.id || '').toLowerCase();
        const pmName = String(
          pObj.project_manager_name ||
          pObj.project_manager?.name ||
          (typeof pObj.project_manager === 'string' ? pObj.project_manager : '') ||
          pObj.lead_assigned_to ||
          ''
        ).toLowerCase();
        if (pmId !== targetPm && pmName !== targetPm) return false;
      }

      return true;
    });
  }, [projects, activeTab, searchQuery, selectedRoleFilter, unifiedFilters]);

  // Flatten TBD / Date Not Fixed shoots for Card View & Month View consistency
  const tbdProjectsShoots = useMemo(() => {
    const list: { project: FWProject; subEvent: FWSubEvent }[] = [];
    projects.forEach((p) => {
      if (p.is_archived) return;
      (p.fw_sub_events || []).forEach((se) => {
        const isTbd = Boolean((se as any).is_date_tbd) || !se.event_date || se.event_date.toLowerCase() === 'tbd';
        const d = se.event_date ? new Date(se.event_date) : null;
        if (isTbd || !d || isNaN(d.getTime())) {
          list.push({ project: p, subEvent: se });
        }
      });
    });
    return list;
  }, [projects]);

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
    <div className="w-full min-h-screen bg-slate-100 text-[#0B111E] font-sans antialiased selection:bg-[#6C5CE7]/15 px-4 sm:px-6 lg:px-8 pt-2 pb-20 md:pb-6 space-y-6">
      {/* PC STICKY TOP TOOLBAR WRAPPER */}
        <div className="sticky top-[54px] lg:top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-2 pb-2 px-3 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-slate-200/60 shadow-2xs space-y-2 transition-all">
          {/* Top Responsive Header Block */}
          <div className="flex flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {/* BACK TO DASHBOARD / WORKSPACE BUTTON */}
              <Link
                href="/workspace"
                className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition shadow-2xs shrink-0"
                title="Back to Workspace"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shadow-2xs shrink-0">
                  <UsersRound className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-none">
                    Team Manager
                  </h1>
                  <p suppressHydrationWarning className="text-[9px] font-medium text-slate-400 mt-0.5 leading-none">
                    {greetingInfo.text}, {studioName} {greetingInfo.emoji}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Desktop action controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Search - desktop only */}
              <div className="relative hidden sm:block w-48 lg:w-60">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients or sub-events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-7.5 pl-7.5 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:text-[11px] focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
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
                    className="hidden sm:flex bg-white border border-[#6C5CE7]/30 text-[#6C5CE7] text-xs font-extrabold h-7.5 px-3 rounded-xl items-center justify-center gap-1 shadow-2xs shrink-0 cursor-pointer transition hover:border-[#6C5CE7]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Member</span>
                  </button>

                  {/* Unified Filter Button */}
                  <button
                    type="button"
                    onClick={() => setIsUnifiedFilterOpen(true)}
                    className="hidden sm:flex bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold h-7.5 px-3 rounded-xl items-center justify-center gap-1 shadow-2xs shrink-0 cursor-pointer transition-all"
                  >
                    <Filter className="w-3 h-3 text-slate-600" />
                    <span>Filter</span>
                    {(unifiedFilters?.monthYear !== 'all' || Boolean(unifiedFilters?.startDate) || (unifiedFilters?.eventTypes?.length ?? 0) > 0 || (unifiedFilters?.roles?.length ?? 0) > 0 || (unifiedFilters?.assignmentStatus && unifiedFilters.assignmentStatus !== 'all') || (unifiedFilters?.pmId && unifiedFilters.pmId !== 'all')) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </button>

                  {/* + Project - desktop only */}
                  <button
                    onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
                    className="hidden sm:flex bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-black h-7.5 px-3.5 rounded-xl transition items-center justify-center gap-1 shadow-md shadow-[#6C5CE7]/20 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Project</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile search bar with unified filter button */}
          <div className="sm:hidden flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients or sub-events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-7.5 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:text-[11px] focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
              />
            </div>
            <button 
              type="button"
              onClick={() => setIsUnifiedFilterOpen(!isUnifiedFilterOpen)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 text-xs font-bold shrink-0 shadow-xs cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500"/>
              <span className="hidden sm:inline">Filter</span>
              {(unifiedFilters?.monthYear !== 'all' || Boolean(unifiedFilters?.startDate) || (unifiedFilters?.eventTypes?.length ?? 0) > 0 || (unifiedFilters?.roles?.length ?? 0) > 0 || (unifiedFilters?.assignmentStatus && unifiedFilters.assignmentStatus !== 'all') || (unifiedFilters?.pmId && unifiedFilters.pmId !== 'all')) && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* ─── VIEW MODE NAVIGATION SWITCHER BAR (DESKTOP) ─── */}
          <div className="hidden md:flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full py-0.5 scrollbar-none">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                  activeTab === 'projects'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:bg-slate-100 bg-transparent border border-transparent'
                }`}
              >
                <Grid className="w-4 h-4" />
                Cards View (Client-Wise)
              </button>

              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                  activeTab === 'list'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:bg-slate-100 bg-transparent border border-transparent'
                }`}
              >
                <List className="w-4 h-4" />
                Month-Wise List View
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                  activeTab === 'calendar'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:bg-slate-100 bg-transparent border border-transparent'
                }`}
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                Calendar View
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                    : 'text-slate-600 hover:bg-slate-100 bg-transparent border border-transparent'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Overview
              </button>

              <button
                onClick={() => setActiveTab('trash')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                  activeTab === 'trash'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 bg-transparent border border-transparent'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Trash Buffer ({projects.filter(p => p.is_archived).length})
              </button>
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
                {/* ─── TOP COLLAPSIBLE REDDISH "DATE NOT FIXED (TBD)" SECTION IN CARDS VIEW ─── */}
                {tbdProjectsShoots.length > 0 && (
                  <div className="bg-[#FFF5F5] rounded-3xl border border-rose-200/90 p-4 md:p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
                    {/* TBD ACCORDION TOGGLE BAR */}
                    <div
                      onClick={() => setIsCardViewTbdExpanded(!isCardViewTbdExpanded)}
                      className="flex items-center justify-between bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 text-white px-5 py-3.5 rounded-2xl border border-rose-800 cursor-pointer hover:border-rose-400/80 transition shadow-md select-none"
                      title="Click to Hide or Unhide Date Not Fixed Shoots"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 text-rose-300 flex items-center justify-center font-black border border-white/10 shadow-inner">
                          <AlertCircle className="w-5 h-5 text-rose-300" />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
                            <span>Date Not Fixed (TBD)</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-xs font-bold border border-rose-400/30">
                              Action Required
                            </span>
                          </h3>
                          <span className="text-xs font-bold text-rose-200/80">
                            {tbdProjectsShoots.length} Shoot{tbdProjectsShoots.length === 1 ? '' : 's'} Pending Date (Click to {isCardViewTbdExpanded ? 'Hide' : 'Show'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-white/10 text-rose-200 text-xs font-black border border-white/10 backdrop-blur-sm">
                          {tbdProjectsShoots.length} Events
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-rose-200 transition-transform duration-200 ${
                            isCardViewTbdExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* EXPANDED TBD CARDS (CLICK FIX DATE TO OPEN MODAL) */}
                    {isCardViewTbdExpanded && (
                      <div className="space-y-4 pt-1">
                        {tbdProjectsShoots.map(({ project, subEvent }) => {
                          const assignments = (subEvent.fw_assignments || []).map((a) => ({
                            ...a,
                            fw_team_members: a.fw_team_members || (a.assigned_member_id ? teamMembers.find((m) => m.id === a.assigned_member_id) : null),
                          }));
                          const assignedCount = assignments.filter((a) => a.assigned_member_id).length;
                          const totalSlots = assignments.length;

                          return (
                            <div
                              key={subEvent.id}
                              className="bg-white rounded-2xl border-2 border-rose-200/90 hover:border-rose-400 shadow-xs hover:shadow-md transition-all p-5 flex flex-col lg:flex-row items-stretch gap-5"
                            >
                              {/* DATE BADGE COLUMN */}
                              <div
                                className="bg-gradient-to-b from-rose-600 via-rose-700 to-rose-900 w-full lg:w-32 rounded-xl p-3.5 shrink-0 flex lg:flex-col items-center justify-between text-center text-white shadow-xs"
                              >
                                <div className="flex lg:flex-col items-center gap-2 lg:gap-0">
                                  <span className="text-xs font-bold text-rose-200/90 uppercase tracking-wider">
                                    DATE
                                  </span>
                                  <span className="text-2xl lg:text-3xl font-black text-white leading-none my-1 tracking-wider">
                                    TBD
                                  </span>
                                  <span className="text-[10px] font-black text-rose-200/90 uppercase tracking-wider">
                                    NOT FIXED
                                  </span>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black border border-white/20 mt-1">
                                  {assignedCount}/{totalSlots} Crew
                                </div>
                              </div>

                              {/* MAIN CONTENT AREA */}
                              <div className="flex-1 space-y-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-rose-950 font-black text-sm md:text-base tracking-tight">
                                      {project.client_name}
                                    </span>

                                    <span className="text-rose-300 text-sm font-light select-none">·</span>

                                    <h4 className="text-sm md:text-base font-bold text-rose-700 tracking-tight">
                                      {subEvent.event_title}
                                    </h4>

                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 font-extrabold text-[10px] flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-rose-600" />
                                      <span>Date Not Fixed</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProject(project);
                                        setIsAddProjectOpen(true);
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Fix Shoot Date</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CREW ALLOCATION AVATARS */}
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                                  <div className="flex items-center gap-4 flex-wrap pt-1">
                                    {assignments.map((assignment) => (
                                      <RoleAssignDropdown
                                        key={assignment.id}
                                        assignment={assignment}
                                        subEventId={subEvent.id}
                                        projectId={project.id}
                                        teamMembers={teamMembers}
                                        onAssignMember={handleAssignMember}
                                        onAddNewMember={(info) => {
                                          setSelectedRoleForNewMember(info.role);
                                          setPendingAssignmentInfo({
                                            assignmentId: info.assignmentId,
                                            subEventId: info.subEventId,
                                            projectId: info.projectId,
                                            role: info.role,
                                          });
                                          setIsAddMemberOpen(true);
                                        }}
                                        variant="avatar"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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
                            const isTbd = Boolean((subEvent as any).is_date_tbd) || !subEvent.event_date || isNaN(new Date(subEvent.event_date).getTime());
                            const isOvernightShoot = Boolean((subEvent as any).is_overnight) && Boolean((subEvent as any).end_date) && !isNaN(new Date((subEvent as any).end_date).getTime());

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

                            // Robust assignment resolver ensuring roles are fetched via fw_assignments relation
                            const assignments = resolveSubEventAssignments(subEvent, teamMembers);
                            const assignedCount = assignments.filter((a: any) => a.assigned_member_id !== null).length;
                            const totalSlots = assignments.length;

                            return (
                              <div 
                                key={subEvent.id}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-row items-stretch overflow-hidden"
                              >
                                {/* LEFT VERTICAL GRADIENT DATE BLOCK (RESTORED FOR PC & TABLET) */}
                                <div className={`${projectGradient} w-24 sm:w-28 shrink-0 flex flex-col items-center justify-between p-3 sm:p-3.5 text-center text-white select-none`}>
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
                                  <div>
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-slate-900 text-base tracking-tight" style={{ color: '#1E1B4B' }}>
                                          {subEvent.event_title}
                                        </h4>
                                        {isTbd && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                            ⚠️ Date: TBD
                                          </span>
                                        )}
                                        {isOvernightShoot && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black">
                                            🌙 Overnight
                                          </span>
                                        )}
                                      </div>

                                      <div className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                                        {assignedCount}/{totalSlots} Roles
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
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Crew</span>
                                    <div className="flex items-start gap-4 flex-wrap">
                                      {assignments.map((assignment: any) => {
                                        const isAssigned = assignment.assigned_member_id !== null;
                                        const memberObj = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                                        const rawName = memberObj?.name || '';
                                        const cleanName = rawName.replace(/\.\.\./g, '').trim();
                                        const role = assignment.required_role;
                                        const dropdownKey = assignment.id;
                                        const shortRole = getRoleAbbr(role);

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
                                                  <img 
                                                    src={memberObj.avatar_url} 
                                                    alt={cleanName} 
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-emerald-400 group-hover:scale-105 transition shrink-0" 
                                                  />
                                                ) : (
                                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 group-hover:scale-105 transition shrink-0">
                                                    {getInitials(cleanName || role)}
                                                  </div>
                                                )
                                              ) : (
                                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-600 flex items-center justify-center font-black group-hover:scale-105 transition shadow-2xs shrink-0">
                                                  <Plus className="w-4 h-4 text-red-600 stroke-[3]" />
                                                </div>
                                              )}

                                              {/* STRICT SHORT ROLE CODE BADGE */}
                                              <span className={`font-black text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border mt-1 select-none leading-none ${
                                                isAssigned 
                                                  ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                                  : 'bg-red-50 text-red-700 border-red-200'
                                              }`}>
                                                {shortRole}
                                              </span>

                                              {/* MEMBER FULL CLEAN NAME (NOT CUT OFF) */}
                                              <span className="font-semibold text-slate-800 text-[10px] truncate max-w-[70px] text-center leading-none mt-1 block" title={cleanName}>
                                                {isAssigned ? (cleanName || 'Assign') : 'Assign'}
                                              </span>
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
                <div className="block lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((project) => {
                    const subEvents = project.fw_sub_events || [];
                    const projectGradient = getGradientByProjectId(project.id || project.client_name);

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-indigo-300 transition duration-200"
                      >
                        {/* CLIENT CARD HEADER BAR - COMPACT */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-2xs shrink-0">
                                {getInitials(project.client_name)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate leading-tight">
                                  {project.client_name}
                                </h3>
                                <span className="text-[9px] font-bold text-slate-300 block leading-tight">
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
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer shrink-0"
                                title="Edit Project Configuration"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Mobile PM Assignment Row */}
                          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between relative" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">PM:</span>
                              <button
                                type="button"
                                onClick={() => setActivePmDropdownProjectId(activePmDropdownProjectId === `m_${project.id}` ? null : `m_${project.id}`)}
                                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border border-white/15"
                              >
                                {project.project_manager_name ? (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[7px] flex items-center justify-center overflow-hidden shrink-0">
                                      {(() => {
                                        const assignedMem = teamMembers.find(m => m.id === project.project_manager_id || m.name === project.project_manager_name);
                                        if (assignedMem?.avatar_url) {
                                          return <img src={assignedMem.avatar_url} alt="" className="w-full h-full object-cover" />;
                                        }
                                        return getInitials(project.project_manager_name);
                                      })()}
                                    </div>
                                    <span className="truncate max-w-[120px]">{project.project_manager_name}</span>
                                  </>
                                ) : (
                                  <span className="text-amber-200/80 italic text-[9px]">Assign PM</span>
                                )}
                                <ChevronDown className="w-2.5 h-2.5 text-amber-300" />
                              </button>
                            </div>

                            {/* Mobile PM Dropdown Modal/Popover */}
                            {activePmDropdownProjectId === `m_${project.id}` && (
                              <div 
                                className="absolute left-0 right-0 top-full mt-2 z-[9999] max-h-64 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 space-y-1.5 text-slate-800"
                              >
                                <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                  <span>Select Project Manager</span>
                                  {project.project_manager_name && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleProjectPMChange(project.id, null, null);
                                        setActivePmDropdownProjectId(null);
                                        setPmSearchQuery('');
                                      }}
                                      className="text-rose-500 hover:underline text-[9px] font-bold cursor-pointer"
                                    >
                                      Clear PM
                                    </button>
                                  )}
                                </div>

                                <div className="relative px-1 pt-0.5">
                                  <input
                                    type="text"
                                    placeholder="Search team member..."
                                    value={pmSearchQuery}
                                    onChange={e => setPmSearchQuery(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                    autoFocus
                                  />
                                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
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
                                        className={`w-full flex items-center justify-between gap-2 p-1.5 rounded-lg text-left transition ${
                                          isSelected ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200' : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[8px] flex items-center justify-center shrink-0 overflow-hidden">
                                            {m.avatar_url ? (
                                              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              getInitials(m.name)
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-black truncate text-slate-900 leading-none">{m.name}</p>
                                            <p className="text-[8px] text-slate-400 font-semibold truncate leading-none mt-0.5">{m.primary_role || 'Crew'}</p>
                                          </div>
                                        </div>
                                        {isSelected && <Check className="w-3 h-3 text-amber-600 shrink-0" />}
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SUB-EVENTS LIST - PC-STYLE COMPACT CARDS WITH LEFT GRADIENT DATE BLOCK */}
                        <div className="p-3 space-y-3 flex-1 bg-slate-50/50">
                          {subEvents.length === 0 ? (
                            <div className="text-center py-3 text-xs text-slate-400 italic">No sub-events added yet.</div>
                          ) : (
                            subEvents.map((subEvent) => {
                              const isDateNotFixed = !subEvent.event_date || 
                                subEvent.event_date.toLowerCase().includes('not fix') || 
                                subEvent.event_date.toLowerCase().includes('tbd') || 
                                isNaN(new Date(subEvent.event_date).getTime());

                              const isOvernightShoot = Boolean((subEvent as any).is_overnight) && Boolean((subEvent as any).end_date) && !isNaN(new Date((subEvent as any).end_date).getTime());

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
                              const assignedCount = assignments.filter((a: any) => a.assigned_member_id !== null).length;
                              const totalSlots = assignments.length;

                              return (
                                <div
                                  key={subEvent.id}
                                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col overflow-hidden"
                                >
                                  {/* TOP HORIZONTAL GRADIENT DATE BANNER (MATCHES MONTH VIEW) */}
                                  <div className={`${projectGradient} w-full px-3 py-1.5 sm:px-3.5 sm:py-2 text-white flex items-center justify-between`}>
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase">
                                        {dayName} {dayNumber} {monthAbbr} {yearStr}
                                      </span>
                                      {isDateNotFixed && (
                                        <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                                          TBD
                                        </span>
                                      )}
                                      {isOvernightShoot && (
                                        <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-950 flex items-center gap-0.5">
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
                                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                        <h4 className="font-extrabold text-slate-900 text-xs tracking-tight truncate">
                                          {subEvent.event_title}
                                        </h4>
                                      </div>
                                    </div>

                                    {/* COMPACT TIMING, SLOT & VENUE */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                      {(subEvent.roll_call_time || subEvent.dismissal_estimate_time) && (
                                        <div className="flex items-center gap-1 text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                          <Clock className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                          <span>
                                            {format12HourTime(subEvent.roll_call_time)}
                                            {subEvent.dismissal_estimate_time ? ` – ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
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
                                          href={subEvent.venue_map_link || `https://maps.google.com/?q=${encodeURIComponent(subEvent.venue_name)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                                        >
                                          <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                          <span className="truncate max-w-[120px]">{subEvent.venue_name}</span>
                                        </a>
                                      )}
                                    </div>

                                    {/* OPERATIONAL COMMENTS */}
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
                                          const isAssigned = assignment.assigned_member_id !== null;
                                          const memberObj = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                                          const rawName = memberObj?.name || '';
                                          const cleanName = rawName.replace(/\.\.\./g, '').trim();
                                          const role = assignment.required_role;
                                          const shortRole = getRoleAbbr(role);

                                          return (
                                            <div
                                              key={assignment.id}
                                              data-assignment-id={assignment.id}
                                              onClick={(e) => {
                                                if (isTmReadOnly) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setDropdownPos({
                                                  top: Math.min(rect.bottom + 6, window.innerHeight - 280),
                                                  left: Math.max(10, Math.min(rect.left - 40, window.innerWidth - 270)),
                                                });
                                                setActiveDropdownId(activeDropdownId === assignment.id ? null : assignment.id);
                                              }}
                                              className="flex flex-col items-center group cursor-pointer select-none relative w-12 text-center"
                                            >
                                              {/* 32px CIRCLE AVATAR */}
                                              <div className="w-8 h-8 rounded-full border border-white shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
                                                {isAssigned ? (
                                                  memberObj?.avatar_url ? (
                                                    <img
                                                      src={memberObj.avatar_url}
                                                      alt={cleanName}
                                                      className="w-8 h-8 rounded-full object-cover shrink-0"
                                                      onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                                                      }}
                                                    />
                                                  ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                                                      {getInitials(cleanName || role)}
                                                    </div>
                                                  )
                                                ) : (
                                                  <div className="w-8 h-8 rounded-full border border-dashed border-red-500 bg-red-50 text-red-600 font-black flex items-center justify-center shadow-2xs shrink-0">
                                                    <Plus className="w-3.5 h-3.5 text-red-600 stroke-[3]" />
                                                  </div>
                                                )}
                                              </div>

                                              {/* Role Pill - STRICT SHORT FORM ONLY */}
                                              <span className={`font-black text-[9px] uppercase tracking-wider block text-center leading-none mt-0.5 ${
                                                isAssigned ? 'text-slate-600' : 'text-red-600 font-extrabold'
                                              }`}>
                                                {shortRole}
                                              </span>

                                              {/* Member Full Name - not cut into first word initials! */}
                                              <span className="text-[9px] font-semibold text-slate-800 truncate max-w-[50px] text-center leading-none mt-0.5 block" title={cleanName}>
                                                {isAssigned ? (cleanName || 'Assign') : 'Assign'}
                                              </span>
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
            projects={filteredProjects}
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
            onAddProject={(initialDate) => {
              setEditingProject(null);
              setInitialDateForModal(initialDate || '');
              setIsAddProjectOpen(true);
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
            onAddProject={(initialDate) => {
              setEditingProject(null);
              setInitialDateForModal(initialDate || '');
              setIsAddProjectOpen(true);
            }}
            onEditProject={(proj) => {
              setEditingProject(proj);
              setIsAddProjectOpen(true);
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
      <div 
        suppressHydrationWarning
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm"
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-300/40 rounded-[2rem] px-2 py-2 flex items-center justify-around relative">
          
          {/* TAB 1: Cards */}
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'projects' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className={`text-[10px] font-semibold transition-all ${
              activeTab === 'projects' ? 'text-[#6C5CE7] font-bold' : 'text-slate-500'
            }`}>Cards</span>
          </button>

          {/* TAB 2: Month */}
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'list' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-4 h-4" />
            <span className={`text-[10px] font-semibold transition-all ${
              activeTab === 'list' ? 'text-[#6C5CE7] font-bold' : 'text-slate-500'
            }`}>Month</span>
          </button>

          {/* CENTER FLOATING + CREATE PROJECT BUTTON */}
          <div className="relative -mt-6 mx-0.5">
            <button
              type="button"
              onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
              className="w-12 h-12 rounded-full bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white flex items-center justify-center shadow-xl shadow-[#6C5CE7]/40 border-3 border-white transition-all active:scale-95 cursor-pointer"
              title="Create New Project"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* TAB 3: Calendar */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'calendar' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className={`text-[10px] font-semibold transition-all ${
              activeTab === 'calendar' ? 'text-[#6C5CE7] font-bold' : 'text-slate-500'
            }`}>Calendar</span>
          </button>

          {/* TAB 4: Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' ? 'text-[#6C5CE7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className={`text-[10px] font-semibold transition-all ${
              activeTab === 'overview' ? 'text-[#6C5CE7] font-bold' : 'text-slate-500'
            }`}>Overview</span>
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
                      (m.primary_role && m.primary_role.toLowerCase().includes(q))
                    );
                  })
                  .sort((a, b) => {
                    // 1. Pinned Assigned Member ALWAYS Position #1 (Top)
                    const isAAssigned = activeAssignment.assigned_member_id === a.id;
                    const isBAssigned = activeAssignment.assigned_member_id === b.id;
                    if (isAAssigned && !isBAssigned) return -1;
                    if (!isAAssigned && isBAssigned) return 1;

                    // 2. Matching role prioritized next
                    const targetRole = (activeAssignment.required_role || '').toLowerCase();
                    const isARole = (a.primary_role || '').toLowerCase() === targetRole;
                    const isBRole = (b.primary_role || '').toLowerCase() === targetRole;
                    if (isARole && !isBRole) return -1;
                    if (!isARole && isBRole) return 1;

                    // 3. Alphabetical fallback
                    return (a.name || '').localeCompare(b.name || '');
                  })
                  .map((m) => {
                    const isSelected = activeAssignment.assigned_member_id === m.id;
                    const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                    const isRoleMatch = (m.primary_role || '').toLowerCase() === (activeAssignment.required_role || '').toLowerCase();

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
                            ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs'
                            : 'text-[#0B111E] hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.avatar_url ? (
                            // eslint-disable-next-next/no-img-element
                            <img 
                              src={m.avatar_url} 
                              alt={cleanMName} 
                              className={`w-6 h-6 rounded-full object-cover shrink-0 border border-white ${
                                isSelected ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200'
                              }`}
                            />
                          ) : (
                            <div className={`w-6 h-6 rounded-full text-white font-black text-[9px] flex items-center justify-center shrink-0 border border-white ${
                              isSelected ? 'bg-emerald-600 ring-2 ring-emerald-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-1 ring-indigo-200'
                            }`}>
                              {getInitials(cleanMName)}
                            </div>
                          )}
                          <div className="text-left leading-tight min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`block font-black text-xs truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                                {cleanMName}
                              </span>
                              {isSelected && (
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ Currently Assigned
                                </span>
                              )}
                            </div>
                            <span className={`text-[9.5px] font-semibold ${isSelected ? 'text-emerald-700' : isRoleMatch ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                              {m.primary_role || 'Crew'}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 stroke-[3]" />}
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
          setInitialDateForModal('');
        }}
        projectToEdit={editingProject}
        initialDate={initialDateForModal}
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
        onUpdateEventTypes={async (newTypes) => {
          setEventTypesList(newTypes);
          const effectiveWsId = workspaceId || currentUserId;
          await saveAllWorkspaceEventTypes(effectiveWsId, newTypes);
        }}
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
        onDeleteMember={(id) => {
          const m = teamMembers.find(t => t.id === id);
          if (m) setMemberToDelete(m);
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

      {/* 5. WhatsApp Roster Assignment Dispatcher Modal */}
      <WhatsAppAssignmentModal
        isOpen={whatsappModalData.isOpen}
        onClose={() => setWhatsappModalData(prev => ({ ...prev, isOpen: false }))}
        member={whatsappModalData.member}
        role={whatsappModalData.role}
        project={whatsappModalData.project}
        subEvent={whatsappModalData.subEvent}
        workspaceId={workspaceId || currentUserId}
        studioName={studioName || 'Filmify Weddings'}
        projectManagerName={(whatsappModalData.project as any)?.project_manager_name || 'Studio Manager'}
        onCommercialsSaved={() => fetchAllData(undefined, true)}
      />

      {/* 3D Tactile Financial Drawer */}
      <TeamMemberFinanceDrawer
        isOpen={isFinanceDrawerOpen}
        onClose={() => {
          setIsFinanceDrawerOpen(false);
          setSelectedFinanceMember(null);
          fetchAllData(undefined, true);
        }}
        workspaceId={workspaceId || currentUserId}
        member={selectedFinanceMember}
        initialSummary={selectedFinanceMember ? memberFinancials[selectedFinanceMember.id] : null}
      />

      {/* 6. Unified Filter Modal */}
      <UnifiedTeamFilterModal
        isOpen={isUnifiedFilterOpen}
        onClose={() => setIsUnifiedFilterOpen(false)}
        filters={unifiedFilters}
        onApplyFilters={(newFilters) => {
          setUnifiedFilters(newFilters);
          setIsUnifiedFilterOpen(false);
        }}
        onResetFilters={() => {
          setUnifiedFilters({
            monthYear: 'all',
            startDate: '',
            endDate: '',
            eventTypes: [],
            roles: [],
            assignmentStatus: 'all',
            pmId: 'all',
          });
        }}
        availableEventTypes={eventTypesList}
        availableRoles={Array.from(new Set([
          'Lead Photographer', 'Candid Photographer', 'Traditional Photographer', 
          'Cinematographer', 'Drone Pilot', 'Assistant / Helper', 'Editor',
          ...customCrewRoles.map(r => r.name)
        ]))}
        assignedPms={assignedPms}
        totalFilteredCount={filteredProjects.length}
      />

      {/* 7. Luxury Red Delete Member Confirmation Warning Modal */}
      <DeleteMemberWarningModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={async () => {
          if (!memberToDelete) return;
          setIsDeletingMember(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const effectiveWsId = workspaceId || currentUserId;
            if (session?.access_token && effectiveWsId) {
              await fetch(`/api/workspace/members?workspace_id=${effectiveWsId}&member_id=${memberToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
              }).catch(() => {});
            }
            await supabase.from('fw_assignments').update({ assigned_member_id: null }).eq('assigned_member_id', memberToDelete.id);
            await supabase.from('workspace_team_member_rates').delete().eq('team_member_id', memberToDelete.id);
            await supabase.from('member_permissions').delete().eq('member_id', memberToDelete.id);
            await supabase.from('fw_team_members').delete().eq('id', memberToDelete.id);
            await supabase.from('workspace_members').delete().eq('id', memberToDelete.id);
            setMemberToDelete(null);
            fetchAllData();
          } catch (err) {
            console.error('[TeamManager] Delete member error:', err);
          } finally {
            setIsDeletingMember(false);
          }
        }}
        member={memberToDelete ? {
          id: memberToDelete.id,
          name: memberToDelete.name,
          primary_role: memberToDelete.primary_role,
          email: memberToDelete.email,
          phone: memberToDelete.phone_number ? `${memberToDelete.country_code || '+91'} ${memberToDelete.phone_number}` : undefined,
          avatar_url: memberToDelete.avatar_url || undefined,
        } : null}
        isDeleting={isDeletingMember}
      />
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, UserPlus, Search, Filter, Mail, Phone, 
  Camera, Film, BookOpen, ShieldCheck, Trash2, Edit3, 
  CheckCircle2, RefreshCw, ChevronRight, ChevronDown, User, MoreVertical,
  ExternalLink, Sparkles, AlertCircle, Building2, Briefcase,
  Target, FileText, IndianRupee, Layers, Check, Activity,
  Clock, Calendar, UserCheck, ShieldAlert,
  Eye, Pencil, Users, DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import AddTeamMemberModal from '@/app/team-manager/components/AddTeamMemberModal';
import TeamMemberCard from './components/TeamMemberCard';
import TeamMemberFinanceDrawer from './components/TeamMemberFinanceDrawer';
import DeleteMemberWarningModal from './components/DeleteMemberWarningModal';
import { 
  batchFetchWorkspaceTeamFinancials,
  fetchMemberFinancialSummary, 
  TeamFinancialSummary, 
  fetchWorkspaceMemberRatesMap, 
  saveWorkspaceMemberRate 
} from '@/lib/team-finance-sync';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country_code?: string;
  phone_number?: string;
  primary_role: string;
  role?: string;
  type?: string;
  roles?: string[];
  member_types?: string[];
  primary_type?: string;
  avatar_url?: string;
  status?: string;
  default_daily_rate?: number;
  default_currency?: string;
  payout_frequency?: string;
  permissions?: {
    leads_access?: string;
    team_manager_access?: string;
    quotations_access?: string;
    post_production_access?: string;
    finance_access?: string;
  };
}

interface ActivityLog {
  id: string;
  workspace_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  module: string;
  action: string;
  description: string;
  details?: any;
  created_at: string;
}

export default function WorkspaceTeamPage() {
  const { workspaceId, workspaceName, isOwner, userEmail, userName } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'directory' | 'activity_logs'>('directory');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedRole, setSelectedRole] = useState('all');
  const selectedRoleFilter = selectedRole;
  const setSelectedRoleFilter = setSelectedRole;
  const [selectedLogModule, setSelectedLogModule] = useState('ALL');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  
  // Team & Partner Financial Engine Drawer States
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<TeamMember | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [memberFinancials, setMemberFinancials] = useState<Record<string, TeamFinancialSummary>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);


  // Instant O(1) Batch Financial Summaries for all members in 1 single pass
  const loadFinancialSummaries = useCallback(async (membersList: TeamMember[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;
    const effectiveWsId = workspaceId || currentUid || userEmail;
    if (!effectiveWsId || membersList.length === 0) return;

    try {
      const memberIds = membersList.map(m => m.id).filter(Boolean);
      const summaryMap = await batchFetchWorkspaceTeamFinancials(effectiveWsId, memberIds);
      setMemberFinancials(summaryMap);
    } catch (err) {
      console.error('[WorkspaceTeamPage] Batch financials error:', err);
    }
  }, [workspaceId, userEmail]);

  // Load team members from database
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;
      if (!currentUid) return;

      const effectiveWsId = workspaceId || currentUid;

      // 1. Fetch isolated workspace member rates
      const wsRatesMap = await fetchWorkspaceMemberRatesMap(effectiveWsId);

      // 2. Fetch from workspace_members API / DB
      let combinedMembers: TeamMember[] = [];

      try {
        const res = await fetch(`/api/workspace/members?workspace_id=${effectiveWsId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members) && json.members.length > 0) {
          combinedMembers = json.members.map((m: any) => ({
            id: m.id,
            name: m.name || 'Team Member',
            email: m.email || '',
            phone: m.phone || '',
            primary_role: m.primary_role || 'FREELANCER',
            roles: m.roles || [m.primary_role || 'FREELANCER'],
            member_types: m.member_types || [m.primary_type || 'IN_HOUSE'],
            primary_type: m.primary_type || 'IN_HOUSE',
            avatar_url: m.avatar_url || '',
            status: m.status || 'ACTIVE',
            default_daily_rate: typeof wsRatesMap[m.id] === 'object' ? wsRatesMap[m.id].rate : (wsRatesMap[m.id] != null ? wsRatesMap[m.id] : (m.default_daily_rate || 0)),
            payout_frequency: typeof wsRatesMap[m.id] === 'object' && wsRatesMap[m.id].frequency ? wsRatesMap[m.id].frequency : (m.payout_frequency || 'daily'),
            default_currency: m.default_currency || 'INR',
            permissions: m.member_permissions?.[0] || m.member_permissions || undefined,
          }));
        }
      } catch (_) {}

      // 3. Also merge from fw_team_members for backwards compatibility
      const { data: fwData } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('user_id', currentUid);

      if (fwData && fwData.length > 0) {
        for (const f of fwData) {
          const exists = combinedMembers.some(
            c => c.id === f.id || 
                 (f.email && c.email && c.email.trim().toLowerCase() === f.email.trim().toLowerCase()) ||
                 (f.name && c.name && c.name.trim().toLowerCase() === f.name.trim().toLowerCase())
          );
          if (!exists) {
            combinedMembers.push({
              id: f.id,
              name: f.name,
              email: f.email || '',
              phone: f.phone_number ? `${f.country_code || '+91'} ${f.phone_number}` : '',
              primary_role: f.primary_role || 'Crew',
              roles: [f.primary_role || 'Crew'],
              member_types: f.member_types || ['IN_HOUSE'],
              primary_type: f.primary_type || 'IN_HOUSE',
              avatar_url: f.avatar_url || '',
              status: 'ACTIVE',
              default_daily_rate: typeof wsRatesMap[f.id] === 'object' ? wsRatesMap[f.id].rate : (wsRatesMap[f.id] != null ? wsRatesMap[f.id] : (f.default_daily_rate || 0)),
              payout_frequency: typeof wsRatesMap[f.id] === 'object' && wsRatesMap[f.id].frequency ? wsRatesMap[f.id].frequency : (f.payout_frequency || 'daily'),
              default_currency: f.default_currency || 'INR',
            });
          }
        }
      }

      setMembers(combinedMembers);
      loadFinancialSummaries(combinedMembers);
    } catch (err) {
      console.error('[WorkspaceTeamPage] Load members error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Load Activity Logs
  const loadActivityLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const effectiveWsId = workspaceId || session?.user?.id;
      if (!token || !effectiveWsId) return;

      const url = `/api/workspace/activity-logs?workspace_id=${effectiveWsId}&module=${selectedLogModule}&limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        setLogs(json.logs);
      }
    } catch (err) {
      console.error('[WorkspaceTeamPage] Load logs error:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [workspaceId, selectedLogModule]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const handleFinanceUpdated = (e?: any) => {
      const detail = e?.detail;
      if (detail?.memberId && detail?.amount) {
        setMemberFinancials(prev => {
          const current = prev[detail.memberId];
          if (current) {
            const newPaid = current.total_paid + Number(detail.amount);
            const newBal = Math.max(0, current.total_balance - Number(detail.amount));
            return {
              ...prev,
              [detail.memberId]: {
                ...current,
                total_paid: newPaid,
                total_balance: newBal
              }
            };
          }
          return prev;
        });
      }
      loadFinancialSummaries(members);
    };
    window.addEventListener('team_finance_updated', handleFinanceUpdated);
    return () => window.removeEventListener('team_finance_updated', handleFinanceUpdated);
  }, [members, loadFinancialSummaries]);

  useEffect(() => {
    if (activeTab === 'activity_logs') {
      loadActivityLogs();
    }
  }, [activeTab, loadActivityLogs]);

  // Instant Millisecond Optimistic Creation & Background Sync
  const handleSaveMember = async (memberData: any) => {
    const tempId = `temp_${Date.now()}`;
    const formattedPhone = `${memberData.country_code || '+91'} ${memberData.phone_number}`.trim();
    const isEdit = !!memberToEdit;
    const editingMemberId = memberToEdit?.id;

    const optimisticMember: TeamMember = {
      id: isEdit && editingMemberId ? editingMemberId : tempId,
      name: memberData.name,
      email: memberData.email,
      phone: formattedPhone,
      country_code: memberData.country_code || '+91',
      phone_number: memberData.phone_number,
      primary_role: memberData.primary_role,
      roles: memberData.roles || [memberData.primary_role],
      member_types: memberData.member_types || [memberData.primary_type || 'IN_HOUSE'],
      primary_type: memberData.primary_type || 'IN_HOUSE',
      avatar_url: memberData.avatar_url,
      default_daily_rate: memberData.default_daily_rate || 0,
      default_currency: memberData.default_currency || 'INR',
      payout_frequency: memberData.payout_frequency || 'daily',
      permissions: memberData.permissions,
      ...({ agreed: 0, paid: 0, balance: 0 } as any)
    };

    // 1. Instant 0ms UI update
    if (!isEdit) {
      setMembers(prev => [optimisticMember, ...prev]);
    } else {
      setMembers(prev => prev.map(m => m.id === editingMemberId ? { ...m, ...optimisticMember } : m));
    }
    setIsAddModalOpen(false);
    setMemberToEdit(null);

    // 2. Background async save
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUid = session?.user?.id;
        if (!currentUid) return;

        const effectiveWsId = workspaceId || currentUid;

        // 1. Insert/Update in fw_team_members for scheduling calendar & attendance
        const fwPayload = {
          name: memberData.name,
          primary_role: memberData.primary_role,
          country_code: memberData.country_code || '+91',
          phone_number: memberData.phone_number,
          email: memberData.email || null,
          avatar_url: memberData.avatar_url || null,
          member_types: memberData.member_types || [memberData.primary_type || 'IN_HOUSE'],
          primary_type: memberData.primary_type || 'IN_HOUSE',
          roles: memberData.roles || [memberData.primary_role || 'IN_HOUSE'],
          default_daily_rate: memberData.default_daily_rate || 0,
          default_currency: memberData.default_currency || 'INR',
          payout_frequency: memberData.payout_frequency || 'daily',
          user_id: currentUid,
        };

        let savedMemberId = editingMemberId;

        if (isEdit && editingMemberId) {
          await supabase
            .from('fw_team_members')
            .update(fwPayload)
            .eq('id', editingMemberId);
        } else {
          const { data: insertedData } = await supabase
            .from('fw_team_members')
            .insert([fwPayload])
            .select('id')
            .maybeSingle();
          if (insertedData?.id) savedMemberId = insertedData.id;
        }

        // Save isolated studio member rate
        if (savedMemberId && memberData.default_daily_rate != null) {
          await saveWorkspaceMemberRate(effectiveWsId, savedMemberId, Number(memberData.default_daily_rate), memberData.default_currency || 'INR', memberData.payout_frequency || 'daily');
        }

        // 2. Insert/Update in workspace_members API for Multi-Tenant RBAC
        if (session?.access_token) {
          const memberRes = await fetch('/api/workspace/members', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              id: memberToEdit?.id || savedMemberId,
              member_id: memberToEdit?.id || savedMemberId,
              workspace_id: effectiveWsId,
              name: memberData.name,
              email: memberData.email || `${memberData.name.toLowerCase().replace(/\s+/g, '')}@partner.studiocore.in`,
              phone: `${memberData.country_code || '+91'} ${memberData.phone_number}`.trim(),
              primary_role: memberData.primary_role,
              roles: memberData.roles || [memberData.primary_role],
              member_types: memberData.member_types || ['IN_HOUSE'],
              primary_type: memberData.primary_type || 'IN_HOUSE',
              avatar_url: memberData.avatar_url || null,
              default_daily_rate: Number(memberData.default_daily_rate) || 0,
              default_currency: memberData.default_currency || 'INR',
              payout_frequency: memberData.payout_frequency || 'daily',
              permissions: memberData.permissions,
            }),
          }).catch(() => null);

          if (memberRes && memberRes.ok) {
            try {
              const resJson = await memberRes.json();
              if (resJson?.savedMember?.id) {
                savedMemberId = resJson.savedMember.id;
              }
            } catch (_) {}
          }

          // Save isolated studio member rate
          if (savedMemberId && memberData.default_daily_rate != null) {
            await saveWorkspaceMemberRate(effectiveWsId, savedMemberId, Number(memberData.default_daily_rate), memberData.default_currency || 'INR', memberData.payout_frequency || 'daily');
          }

          // 3. Log Audit Activity
          await fetch('/api/workspace/activity-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              workspace_id: effectiveWsId,
              module: 'TEAM',
              action: isEdit ? 'MEMBER_PERMISSIONS_UPDATED' : 'MEMBER_INVITED',
              description: `${isEdit ? 'Updated permissions for' : 'Added new team member'} ${memberData.name} (${memberData.primary_role})`,
              details: {
                memberName: memberData.name,
                primaryRole: memberData.primary_role,
                memberTypes: memberData.member_types,
                permissions: memberData.permissions,
              },
              user_name: userName || 'Studio Admin',
              user_role: isOwner ? 'OWNER' : 'ADMIN',
            }),
          }).catch(() => {});
        }

        // Replace optimistic tempId with real DB savedMemberId if newly inserted
        if (!isEdit && savedMemberId) {
          setMembers(prev => prev.map(m => m.id === tempId ? { ...m, id: savedMemberId! } : m));
        }
      } catch (err: any) {
        console.error('[WorkspaceTeamPage] Background save failed:', err);
      }
    })();
  };

  // Execute Member Delete (Cascading delete across permissions, rates, assignments, and team tables)
  const executeDeleteMember = async (memberId: string) => {
    setDeletingId(memberId);
    try {
      const targetMember = members.find(m => m.id === memberId);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;
      const effectiveWsId = workspaceId || currentUid;

      // 1. Trigger complete backend cascading deletion
      if (session?.access_token && effectiveWsId) {
        await fetch(`/api/workspace/members?workspace_id=${effectiveWsId}&member_id=${memberId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }).catch(err => console.warn('[handleDeleteMember] API delete error:', err));
      }

      // 2. Client-side fallback cleanup
      try {
        await supabase.from('fw_assignments').update({ assigned_member_id: null }).eq('assigned_member_id', memberId);
        await supabase.from('workspace_team_member_rates').delete().eq('team_member_id', memberId);
        await supabase.from('member_permissions').delete().eq('member_id', memberId);
        await supabase.from('fw_team_members').delete().eq('id', memberId);
        await supabase.from('workspace_members').delete().eq('id', memberId);
      } catch (_) {}

      // 3. Instant optimistic UI removal
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('team_member_deleted', { detail: { memberId } }));
      }

      // 4. Log Audit Activity
      if (session?.access_token && effectiveWsId) {
        await fetch('/api/workspace/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: effectiveWsId,
            module: 'TEAM',
            action: 'MEMBER_REMOVED',
            description: `Removed team member ${targetMember?.name || memberId}`,
            details: { memberId, memberName: targetMember?.name },
            user_name: userName || 'Studio Admin',
            user_role: isOwner ? 'OWNER' : 'ADMIN',
          }),
        }).catch(() => {});
      }
      setMemberToDelete(null);
    } catch (err) {
      console.error('[WorkspaceTeamPage] Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Direct Member Action Handlers
  const handleOpenDetails = (member: TeamMember) => {
    setSelectedFinanceMember(member);
    setIsFinanceDrawerOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setMemberToEdit(member);
    setIsAddModalOpen(true);
  };

  const handleDeleteMember = (memberIdOrMember: string | TeamMember) => {
    if (typeof memberIdOrMember === 'string') {
      const target = members.find(m => m.id === memberIdOrMember);
      if (target) setMemberToDelete(target);
    } else {
      setMemberToDelete(memberIdOrMember);
    }
  };

  // 2. Populate "All Roles" Dropdown Dynamically
  const availableRoles = useMemo(() => {
    const roleSet = new Set<string>();
    members.forEach((m) => {
      if (Array.isArray(m.roles)) {
        m.roles.forEach((r: string) => r && roleSet.add(r.trim()));
      } else if (m.role) {
        roleSet.add(m.role.trim());
      } else if (m.primary_role) {
        roleSet.add(m.primary_role.trim());
      }
    });
    return Array.from(roleSet).sort();
  }, [members]);

  // 1. Robust Universal Search (Name, Role, Phone, Email) & Multi-Criteria Filtering
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // 1. Tab Classification Filter (All Crew, In-House, Freelancers, Partners)
      const tabKey = (selectedFilter || '').toLowerCase().replace(/[-_\s]/g, '');
      const memType = String(member.type || member.primary_type || '').toLowerCase().replace(/[-_\s]/g, '');
      const memTypes = Array.isArray(member.member_types)
        ? member.member_types.map((t: string) => String(t).toLowerCase().replace(/[-_\s]/g, ''))
        : [];

      const isAll = !tabKey || tabKey === 'all' || tabKey === 'allcrew';
      if (!isAll) {
        const isInHouse = memType === 'inhouse' || memTypes.includes('inhouse');
        const isFreelancer = memType === 'freelancer' || memTypes.includes('freelancer');
        const isPartner = memType === 'partner' || memTypes.includes('partner');

        if ((tabKey === 'inhouse' || tabKey === 'in_house') && !isInHouse) return false;
        if (tabKey === 'freelancers' && !isFreelancer) return false;
        if (tabKey === 'partners' && !isPartner) return false;

        // Specialized sub-filters
        if (tabKey === 'photographers') {
          const isPhoto = String(member.primary_role || member.role || '').toLowerCase().includes('photo') || 
            (Array.isArray(member.roles) && member.roles.some((r: string) => String(r).toLowerCase().includes('photo')));
          if (!isPhoto) return false;
        }
        if (tabKey === 'cinematographers') {
          const isCine = String(member.primary_role || member.role || '').toLowerCase().includes('cine') || 
            (Array.isArray(member.roles) && member.roles.some((r: string) => String(r).toLowerCase().includes('cine')));
          if (!isCine) return false;
        }
        if (tabKey === 'editors') {
          const isEdit = String(member.primary_role || member.role || '').toLowerCase().includes('edit') || 
            (Array.isArray(member.roles) && member.roles.some((r: string) => String(r).toLowerCase().includes('edit')));
          if (!isEdit) return false;
        }
        if (tabKey === 'labs') {
          const isLab = String(member.primary_role || member.role || '').toLowerCase().includes('lab') || 
            String(member.primary_role || member.role || '').toLowerCase().includes('print') || 
            (Array.isArray(member.roles) && member.roles.some((r: string) => String(r).toLowerCase().includes('lab')));
          if (!isLab) return false;
        }
      }

      // 2. Role Dropdown Filter
      if (selectedRole && selectedRole !== 'all' && selectedRole !== 'All Roles') {
        const targetRole = selectedRole.trim().toLowerCase();
        const memberRoles = Array.isArray(member.roles) && member.roles.length > 0
          ? member.roles.map((r: string) => String(r).trim().toLowerCase())
          : [String(member.role || member.primary_role || '').trim().toLowerCase()];
        
        const hasRole = memberRoles.some((r: string) => r === targetRole || r.includes(targetRole));
        if (!hasRole) return false;
      }

      // 3. Universal Search Bar Query
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        
        const nameMatch = (member.name || '').toLowerCase().includes(q);
        const phoneMatch = (member.phone || member.phone_number || '').includes(q);
        const emailMatch = (member.email || '').toLowerCase().includes(q);
        
        // Search inside roles array
        const rolesMatch = Array.isArray(member.roles) && member.roles.length > 0
          ? member.roles.some((r: string) => String(r).toLowerCase().includes(q))
          : String(member.role || member.primary_role || '').toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !emailMatch && !rolesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [members, selectedFilter, selectedRole, searchQuery]);

  // Incremental Batch Scroll (15 Members at a Time)
  const [visibleCount, setVisibleCount] = useState(15);
  const displayedMembers = useMemo(() => filteredMembers.slice(0, visibleCount), [filteredMembers, visibleCount]);

  useEffect(() => {
    setVisibleCount(15);
  }, [selectedFilter, selectedRole, searchQuery]);

  // Metrics
  const totalCount = members.length;
  const inHouseCount = members.filter(m => m.member_types?.includes('IN_HOUSE') || m.primary_type === 'IN_HOUSE').length;
  const freelancerCount = members.filter(m => m.member_types?.includes('FREELANCER') || m.primary_type === 'FREELANCER').length;
  const partnerCount = members.filter(m => m.member_types?.includes('PARTNER') || m.primary_type === 'PARTNER').length;

  // Format Permissions for visual pills
  const formatLeadsBadge = (p?: string) => {
    switch (p) {
      case 'ALL_EDIT': return { label: 'CRM: Full Edit', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ALL_VIEW': return { label: 'CRM: View All', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ASSIGNED_EDIT': return { label: 'CRM: Assigned (Edit)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ASSIGNED_VIEW': return { label: 'CRM: Assigned (View)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default: return { label: 'CRM: Hidden', color: 'bg-zinc-100 text-zinc-400 border-zinc-200' };
    }
  };

  const formatTeamManagerBadge = (p?: string) => {
    switch (p) {
      case 'ALL_MANAGE': return { label: 'Team: Full Manage', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'ALL_VIEW': return { label: 'Team: View All', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ASSIGNED_FULL_TEAM_VIEW': return { label: 'Team: Card (Full Team)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'ASSIGNED_ONLY_VIEW': return { label: 'Team: Card (Self Only)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default: return { label: 'Team: Hidden', color: 'bg-zinc-100 text-zinc-400 border-zinc-200' };
    }
  };

  const formatModuleBadge = (mod: string) => {
    switch (mod) {
      case 'LEADS': return { label: '🎯 Leads CRM', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'TEAM_MANAGER': return { label: '📅 Bookings & Shoots', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'TEAM': return { label: '👥 Team & RBAC', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'FINANCE': return { label: '💰 Finance & Invoices', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'QUOTATIONS': return { label: '📄 Quotations', color: 'bg-sky-50 text-sky-800 border-sky-200' };
      default: return { label: '⚙️ Workspace', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-3 sm:p-5 lg:p-6 space-y-4 w-full font-sans">
      
      {/* 1. TOP HEADER & NAVIGATION TABS */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5" />
              Team Directory &amp; Audit Logs
            </span>
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
              {totalCount} Active Members
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
            Studio Team &amp; Partners
          </h1>
          <p className="hidden md:block text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
            Manage in-house staff, freelance crew, and printing lab partners with granular RBAC permissions and a real-time audit activity log.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-1.5 sm:pt-2">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'directory'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>Team &amp; Partners Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('activity_logs')}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'activity_logs'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>Audit &amp; Activity Logs</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setMemberToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="h-9 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Team Member / Partner</span>
          </button>
        </div>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* 2. STATS OVERVIEW CARDS (WITH IN-HOUSE / FREELANCER / PARTNER BREAKDOWN) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 my-3">
            {[
              { label: 'Total Crew', count: totalCount },
              { label: 'In-House', count: inHouseCount },
              { label: 'Freelancers', count: freelancerCount },
              { label: 'Partners', count: partnerCount },
            ].map((s, idx) => (
              <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{s.label}</span>
                <span className="text-sm font-black text-slate-800">{s.count}</span>
              </div>
            ))}
          </div>

          {/* 3. SEARCH & CLASSIFICATION FILTER BAR */}
          <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs (No More Awkward Horizontal Scroll) */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
              {[
                { id: 'All', label: 'All Crew', count: totalCount },
                { id: 'In-House', label: 'In-House', count: inHouseCount },
                { id: 'Freelancers', label: 'Freelancers', count: freelancerCount },
                { id: 'Partners', label: 'Partners', count: partnerCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedFilter(tab.id);
                    setVisibleCount(15);
                  }}
                  className={`flex-1 sm:flex-initial text-center py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === tab.id ? 'bg-black text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label} <span className="opacity-70 text-[10px]">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Right: Search + Role Filter Dropdown */}
            <div className="flex items-center gap-2 flex-1 max-w-lg md:ml-auto w-full">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email, role..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(15);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 h-9 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Dedicated Role Filter Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setVisibleCount(15); // reset pagination on filter change
                  }}
                  className="h-9 text-xs font-semibold px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Roles ({availableRoles.length})</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. TEAM MEMBERS GRID */}
          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 space-y-4">
              <Users2 className="w-12 h-12 text-zinc-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-800">No Team Members Found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {searchQuery ? 'No members match your search query.' : 'Add your in-house staff, freelance crew, or album printing lab partners.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setMemberToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. Mobile Member Cards (Ultra-Compact Mobile Layout) */}
              <div className="md:hidden space-y-2.5 mt-4">
                {displayedMembers.map((member) => {
                  const fin = memberFinancials[member.id];
                  return (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      agreed={fin?.total_agreed}
                      paid={fin?.total_paid}
                      balance={fin?.total_balance}
                      handleOpenDetails={handleOpenDetails}
                      handleEditMember={handleEditMember}
                      handleDeleteMember={handleDeleteMember}
                    />
                  );
                })}
              </div>

              {/* 2. Desktop Member Table (12-Column Responsive Layout) */}
              <div className="hidden md:block w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mt-4">
                {/* Desktop Table Header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <div className="col-span-4">Member Info</div>
                  <div className="col-span-2">Type & Role</div>
                  <div className="col-span-3">Commercials (Agreed / Paid / Due)</div>
                  <div className="col-span-2">Portal Access</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Row List */}
                <div className="divide-y divide-slate-100">
                  {displayedMembers.map((member) => {
                    const fin = memberFinancials[member.id];
                    const agreedVal = fin?.total_agreed ?? (member as any).agreed ?? 0;
                    const paidVal = fin?.total_paid ?? (member as any).paid ?? 0;
                    const balanceVal = fin?.total_balance ?? (member as any).balance ?? 0;
                    const isFreelancer = member.primary_type === 'FREELANCER' || member.member_types?.includes('FREELANCER') || (member as any).type === 'freelancer';
                    const isPartner = member.primary_type === 'PARTNER' || member.member_types?.includes('PARTNER') || (member as any).type === 'partner';
                    const memberTypeLabel = isPartner ? 'Partner' : isFreelancer ? 'Freelancer' : (member.primary_type || 'In-House');
                    // Safe portal access resolution - eliminates raw DB metadata dump completely
                    const crmAccess = (member as any).crm_access || member.permissions?.leads_access || member.permissions?.crm_access;
                    const teamAccess = (member as any).team_access || member.permissions?.team_manager_access || member.permissions?.team_access;
                    const quotationsAccess = (member as any).quotations_access || member.permissions?.quotations_access;
                    const postProductionAccess = (member as any).post_production_access || member.permissions?.post_production_access;
                    const financeAccess = (member as any).finance_access || member.permissions?.finance_access;
                    const isAdmin = (member as any).is_admin || (member as any).role === 'admin' || (member as any).role === 'owner' || member.primary_type === 'ADMIN' || member.permissions?.is_admin;

                    const isGranted = (val: any) => {
                      if (!val) return false;
                      const s = String(val).trim().toLowerCase();
                      return !['none', 'hidden', 'false', '0', 'undefined', 'null'].includes(s);
                    };

                    const hasAnyAccess = Boolean(
                      isAdmin || 
                      isGranted(crmAccess) || 
                      isGranted(teamAccess) || 
                      isGranted(quotationsAccess) || 
                      isGranted(postProductionAccess) || 
                      isGranted(financeAccess)
                    );

                    return (
                      <div 
                        key={member.id}
                        onClick={() => handleOpenDetails(member)}
                        className="px-4 py-3.5 sm:px-5 hover:bg-slate-50/70 transition-colors grid grid-cols-12 gap-4 items-center cursor-pointer"
                      >
                        {/* 1. Member Profile & Name (Clickable) */}
                        <div className="col-span-4 flex items-center gap-3 w-full">
                          <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover"/>
                            ) : (
                              <span>{member.name?.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs sm:text-sm text-slate-800 hover:text-indigo-600 truncate block transition-colors">
                              {member.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                              {member.phone && <span>{member.phone}</span>}
                              {member.phone && member.email && <span>•</span>}
                              {member.email && <span className="truncate">{member.email}</span>}
                            </div>
                          </div>
                        </div>

                        {/* 2. Type & Role */}
                        <div className="col-span-2 flex flex-wrap items-center gap-1.5 w-full">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isPartner 
                              ? 'bg-purple-100 text-purple-700' 
                              : isFreelancer 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {memberTypeLabel}
                          </span>
                          {(member.roles && member.roles.length > 0 ? member.roles : [member.primary_role]).filter(Boolean).map((r: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                              {r}
                            </span>
                          ))}
                        </div>

                        {/* 3. Commercials (Agreed / Paid / Balance) */}
                        <div className="col-span-3 w-full flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Agreed</span>
                            <span className="font-bold text-slate-700">₹{agreedVal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-5 w-px bg-slate-200"></div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Paid</span>
                            <span className="font-bold text-emerald-600">₹{paidVal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-5 w-px bg-slate-200"></div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Balance</span>
                            <span className="font-bold text-amber-600">₹{balanceVal.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* 4. Portal Access (Clean Distinct Micro-Icon Badges) */}
                        <div className="col-span-2 flex flex-wrap gap-1.5 items-center w-full">
                          {/* Admin / Full Access */}
                          {isAdmin && (
                            <div 
                              title="Admin / Full Access"
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/70 text-[10px] font-bold"
                            >
                              <ShieldCheck className="w-3 h-3 text-indigo-600"/>
                              <span className="hidden lg:inline">Admin</span>
                            </div>
                          )}

                          {/* Leads & CRM Access */}
                          {isGranted(crmAccess) && (
                            <div 
                              title={`Leads / CRM: ${crmAccess}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/70 text-[10px] font-bold"
                            >
                              <UserCheck className="w-3 h-3 text-blue-600"/>
                              <span className="hidden lg:inline">CRM</span>
                            </div>
                          )}

                          {/* Team Portal Access */}
                          {isGranted(teamAccess) && (
                            <div 
                              title={`Team Manager: ${teamAccess}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/70 text-[10px] font-bold"
                            >
                              <Users className="w-3 h-3 text-purple-600"/>
                              <span className="hidden lg:inline">Team</span>
                            </div>
                          )}

                          {/* Quotations Access */}
                          {isGranted(quotationsAccess) && (
                            <div 
                              title={`Quotations: ${quotationsAccess}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/70 text-[10px] font-bold"
                            >
                              <FileText className="w-3 h-3 text-amber-600"/>
                              <span className="hidden lg:inline">Quotes</span>
                            </div>
                          )}

                          {/* Post-Production Access */}
                          {isGranted(postProductionAccess) && (
                            <div 
                              title={`Post Production: ${postProductionAccess}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/70 text-[10px] font-bold"
                            >
                              <Film className="w-3 h-3 text-rose-600"/>
                              <span className="hidden lg:inline">Post</span>
                            </div>
                          )}

                          {/* Finance Access */}
                          {isGranted(financeAccess) && (
                            <div 
                              title={`Finance: ${financeAccess}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/70 text-[10px] font-bold"
                            >
                              <DollarSign className="w-3 h-3 text-emerald-600"/>
                              <span className="hidden lg:inline">Finance</span>
                            </div>
                          )}

                          {!hasAnyAccess && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-400 font-medium border border-slate-200/60">
                              No Access
                            </span>
                          )}
                        </div>

                        {/* 5. Direct Action Icons */}
                        <div className="col-span-1 flex items-center justify-end gap-1.5 w-full md:w-auto">
                          {/* Details Action */}
                          <button
                            type="button"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(member);
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4"/>
                          </button>
                          {/* Edit Action */}
                          <button
                            type="button"
                            title="Edit Member"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMember(member);
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4"/>
                          </button>
                          {/* Delete Action */}
                          <button
                            type="button"
                            title="Delete Member"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMember(member.id);
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Incremental Batch Scroll Sentinel (Loads 15 more on intersect) */}
              {visibleCount < filteredMembers.length && (
                <div 
                  ref={(node) => {
                    if (!node) return;
                    const observer = new IntersectionObserver((entries) => {
                      if (entries[0]?.isIntersecting) {
                        setVisibleCount((prev) => prev + 15);
                      }
                    });
                    observer.observe(node);
                  }} 
                  className="py-4 text-center text-xs text-slate-400 font-bold"
                >
                  Loading more members...
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* ── ACTIVITY & AUDIT LOGS VIEW ── */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <span>Real-Time Audit &amp; Activity Log</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Track every change made across Leads, Shoots, Assignments, and Permissions by timestamp and member.
              </p>
            </div>

            {/* Filter Module */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Activities' },
                { id: 'LEADS', label: '🎯 Leads CRM' },
                { id: 'TEAM_MANAGER', label: '📅 Bookings' },
                { id: 'TEAM', label: '👥 Team & RBAC' },
                { id: 'FINANCE', label: '💰 Finance' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedLogModule(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedLogModule === f.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {logsLoading ? (
            <div className="py-16 text-center text-xs font-bold text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
              Loading Audit Trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-zinc-800">No Activity Logs Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Actions performed by team members (lead edits, status changes, shoot bookings) will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {logs.map((log) => {
                const mb = formatModuleBadge(log.module);
                const d = new Date(log.created_at);
                const formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const formattedTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                  <div key={log.id} className="py-3.5 flex items-start justify-between gap-4 group hover:bg-zinc-50/50 p-2 rounded-2xl transition">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${mb.color}`}>
                          {mb.label}
                        </span>
                        <span className="text-xs font-bold text-zinc-900">
                          {log.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                        <span className="font-bold text-zinc-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-600" />
                          {log.user_name}
                        </span>
                        <span>•</span>
                        <span>{log.user_role}</span>
                        {log.user_email && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-400">{log.user_email}</span>
                          </>
                        )}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-[10px] text-zinc-500 bg-zinc-50 rounded-xl p-2 font-mono border border-zinc-200/60 mt-1 max-w-xl truncate">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-0.5 text-zinc-400">
                      <div className="text-xs font-bold text-zinc-700">{formattedTime}</div>
                      <div className="text-[10px]">{formattedDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Team Member Modal */}
      <AddTeamMemberModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setMemberToEdit(null);
        }}
        memberToEdit={memberToEdit}
        onSave={handleSaveMember}
      />

      {/* 3D Tactile Financial & Event Compensation Drawer */}
      <TeamMemberFinanceDrawer
        isOpen={isFinanceDrawerOpen}
        onClose={() => {
          setIsFinanceDrawerOpen(false);
          setSelectedFinanceMember(null);
          loadMembers();
        }}
        workspaceId={workspaceId || ''}
        member={selectedFinanceMember}
        initialSummary={selectedFinanceMember ? memberFinancials[selectedFinanceMember.id] : null}
      />

      {/* Luxury Red Delete Warning Modal */}
      <DeleteMemberWarningModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => memberToDelete && executeDeleteMember(memberToDelete.id)}
        member={memberToDelete}
        isDeleting={Boolean(deletingId)}
      />
    </div>
  );
}

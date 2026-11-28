'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, UserPlus, Search, Filter, Mail, Phone, 
  Camera, Film, BookOpen, ShieldCheck, Trash2, Edit3, 
  CheckCircle2, RefreshCw, ChevronRight, ChevronDown, User, MoreVertical,
  ExternalLink, Sparkles, AlertCircle, Building2, Briefcase,
  Target, FileText, IndianRupee, Layers, Check, Activity,
  Clock, Calendar, UserCheck, ShieldAlert,
  Eye, EyeOff, Lock, Unlock, X, Pencil, Users, DollarSign, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch, authFetchJson } from '@/lib/client-auth-fetch';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { useWorkspaceData } from '@/context/WorkspaceDataContext';
import AddTeamMemberModal from '@/app/team-manager/components/AddTeamMemberModal';
import TeamMemberCard from './components/TeamMemberCard';
import TeamTableRow from './components/TeamTableRow';
import TeamMemberFinanceDrawer from './components/TeamMemberFinanceDrawer';
import DeleteMemberWarningModal from './components/DeleteMemberWarningModal';
import VendorAlbumDeliverablesModal from '@/components/vendors/VendorAlbumDeliverablesModal';
import TeamRemindersDrawer from '@/components/team/TeamRemindersDrawer';
import { 
  batchFetchWorkspaceTeamFinancials,
  fetchWorkspaceAllTeamAggregateFinancials,
  WorkspaceAggregateFinancialRecord,
  fetchMemberFinancialSummary, 
  TeamFinancialSummary, 
  fetchWorkspaceMemberRatesMap, 
  saveWorkspaceMemberRate 
} from '@/lib/team-finance-sync';
import { saveMemberStudioPermissions } from '@/lib/permissions/rbacRules';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

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
  assignments?: any[];
  payouts?: any[];
  commercial_agreed?: number;
  commercial_paid?: number;
  commercial_balance?: number;
  permissions?: {
    leads_access?: string;
    team_manager_access?: string;
    quotations_access?: string;
    post_production_access?: string;
    finance_access?: string;
  };
  [key: string]: any;
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

// Module-level in-memory cache for instant 0ms millisecond transitions
let memCachedTeamMembers: TeamMember[] = [];
let memCachedLogs: ActivityLog[] = [];
let memCachedFinSummary: Record<string, TeamFinancialSummary> = {};
let memCachedFinRecords: WorkspaceAggregateFinancialRecord[] = [];
let memCachedHiddenIds: string[] = [];
let memCachedHasPin = false;

export default function WorkspaceTeamPage() {
  const router = useRouter();
  const { workspaceId, workspaceName, isOwner, userEmail, userName } = useWorkspace();
  const { workspaceMembers: ctxMembers } = useWorkspaceData();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'activity_logs'>('directory');
  const [members, setMembers] = useState<TeamMember[]>(() => {
    if (memCachedTeamMembers.length > 0) return memCachedTeamMembers;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sc_cached_team_members');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memCachedTeamMembers = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  });
  const [logs, setLogs] = useState<ActivityLog[]>(() => memCachedLogs);
  const [loading, setLoading] = useState(!members.length);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedRole, setSelectedRole] = useState('all');
  const selectedRoleFilter = selectedRole;
  const setSelectedRoleFilter = setSelectedRole;
  const [selectedLogModule, setSelectedLogModule] = useState('ALL');

  // Reminders Notification Drawer States
  const [isRemindersDrawerOpen, setIsRemindersDrawerOpen] = useState(false);
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  
  // Team & Partner Financial Engine Drawer States
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<TeamMember | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [financeInitialTab, setFinanceInitialTab] = useState<'bookings' | 'payroll' | 'analytics' | 'deliverables' | 'album_printing'>('payroll');
  const [memberFinancials, setMemberFinancials] = useState<Record<string, TeamFinancialSummary>>(() => memCachedFinSummary);
  const [financePeriod, setFinancePeriod] = useState<'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [financeViewMode, setFinanceViewMode] = useState<'all' | 'paid_only'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [aggregateRecords, setAggregateRecords] = useState<WorkspaceAggregateFinancialRecord[]>(() => memCachedFinRecords);
  const [financialsLoading, setFinancialsLoading] = useState<boolean>(() => Object.keys(memCachedFinSummary).length === 0);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>(() => memCachedHiddenIds);
  const [hasHidePin, setHasHidePin] = useState<boolean>(() => memCachedHasPin);
  const [hiddenUnlocked, setHiddenUnlocked] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinVerifying, setPinVerifying] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  // Vendor Album Deliverables Hub Modal States
  const [selectedVendorDeliverablesMember, setSelectedVendorDeliverablesMember] = useState<TeamMember | null>(null);
  const [isVendorDeliverablesModalOpen, setIsVendorDeliverablesModalOpen] = useState(false);

  // Hydration sync: initialize cache on client mount (0ms instant display)
  useEffect(() => {
    setMounted(true);
    if (memCachedTeamMembers.length > 0) {
      setMembers(memCachedTeamMembers);
      setLoading(false);
    } else {
      try {
        const stored = localStorage.getItem('sc_cached_team_members');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memCachedTeamMembers = parsed;
            setMembers(parsed);
            setLoading(false);
          }
        }
      } catch (_) {}
    }

    // Instant 0ms hydration for financial overview & hidden list
    try {
      const storedFin = localStorage.getItem('sc_cached_team_financials');
      if (storedFin) {
        const parsedFin = JSON.parse(storedFin);
        if (parsedFin.summaryMap && Object.keys(parsedFin.summaryMap).length > 0) {
          memCachedFinSummary = parsedFin.summaryMap;
          setMemberFinancials(parsedFin.summaryMap);
          setFinancialsLoading(false);
        }
        if (Array.isArray(parsedFin.records) && parsedFin.records.length > 0) {
          memCachedFinRecords = parsedFin.records;
          setAggregateRecords(parsedFin.records);
        }
        if (Array.isArray(parsedFin.hiddenMemberIds)) {
          memCachedHiddenIds = parsedFin.hiddenMemberIds;
          setHiddenMemberIds(parsedFin.hiddenMemberIds);
        }
        if (typeof parsedFin.hasPin === 'boolean') {
          memCachedHasPin = parsedFin.hasPin;
          setHasHidePin(parsedFin.hasPin);
        }
      }
    } catch (_) {}
  }, []);

  // Fetch reminders count
  const fetchPendingReminders = useCallback(async () => {
    try {
      const url = workspaceId ? `/api/team/reminders?workspaceId=${workspaceId}` : '/api/team/reminders';
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.reminders)) {
        setPendingRemindersCount(data.reminders.length);
      }
    } catch (_) {}
  }, [workspaceId]);

  useEffect(() => {
    if (mounted) {
      fetchPendingReminders();
    }
    const handleNewReminder = () => fetchPendingReminders();
    window.addEventListener('studio_reminder_created', handleNewReminder);
    return () => window.removeEventListener('studio_reminder_created', handleNewReminder);
  }, [mounted, fetchPendingReminders]);


  // Single-Pass 0ms SWR Fetcher for Team Directory + Crew Payment Overview + Hide/PIN Status
  const loadMembers = useCallback(async (forceFresh = false) => {
    if (memCachedTeamMembers.length === 0) setLoading(true);
    let resolvedWs = false;
    try {
      let effectiveWsId = workspaceId;
      if (!effectiveWsId) {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed.session;
        }
        effectiveWsId = session?.user?.id || '';
      }
      if (!effectiveWsId) return;
      resolvedWs = true;

      let overview: any = null;
      try {
        overview = await authFetchJson(
          `/api/workspace/team/overview?workspace_id=${encodeURIComponent(effectiveWsId)}${forceFresh ? '&fresh=1' : ''}`
        );
      } catch (ovErr) {
        console.warn('[WorkspaceTeamPage] overview fallback to /api/workspace/members:', ovErr);
        const fb = await authFetchJson(`/api/workspace/members?workspace_id=${encodeURIComponent(effectiveWsId)}`);
        if (fb?.success && Array.isArray(fb.members)) {
          overview = { success: true, members: fb.members, summaryMap: {}, records: [], hiddenMemberIds: [], hasPin: false };
        }
      }
      if (overview?.success && Array.isArray(overview.members)) {
        const nextMembers: TeamMember[] = overview.members;
        const nextSummary = overview.summaryMap || {};
        const nextRecords = Array.isArray(overview.records) ? overview.records : [];
        const nextHidden = Array.isArray(overview.hiddenMemberIds) ? overview.hiddenMemberIds : [];
        const nextHasPin = Boolean(overview.hasPin);

        memCachedTeamMembers = nextMembers;
        memCachedFinSummary = nextSummary;
        memCachedFinRecords = nextRecords;
        memCachedHiddenIds = nextHidden;
        memCachedHasPin = nextHasPin;

        setMembers(nextMembers);
        setMemberFinancials(nextSummary);
        setAggregateRecords(nextRecords);
        setHiddenMemberIds(nextHidden);
        setHasHidePin(nextHasPin);
        setFinancialsLoading(false);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sc_cached_team_members', JSON.stringify(nextMembers));
            localStorage.setItem('sc_cached_team_financials', JSON.stringify({
              summaryMap: nextSummary,
              records: nextRecords,
              hiddenMemberIds: nextHidden,
              hasPin: nextHasPin,
            }));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('[WorkspaceTeamPage] Load overview error:', err);
    } finally {
      if (resolvedWs) {
        setLoading(false);
        setFinancialsLoading(false);
      }
    }
  }, [workspaceId]);

  const loadFinancialSummaries = useCallback(async () => {
    await loadMembers(true);
  }, [loadMembers]);

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

  // Safety net: if members is still empty while WorkspaceDataContext already loaded members, hydrate immediately
  useEffect(() => {
    if (members.length === 0 && Array.isArray(ctxMembers) && ctxMembers.length > 0) {
      setMembers(ctxMembers as any);
      setLoading(false);
    }
  }, [members.length, ctxMembers]);

  useEffect(() => {
    const handleFinanceUpdated = (e?: any) => {
      const detail = e?.detail;
      if (!detail?.memberId) return;

      if (detail?.salaryRecord) {
        setAggregateRecords(prev => [detail.salaryRecord, ...prev.filter(r => r.id !== detail.salaryRecord.id)]);
      }

      if (detail?.summary) {
        setMemberFinancials(prev => {
          const current = prev[detail.memberId] || {
            member_id: detail.memberId,
            total_agreed: 0,
            total_paid: 0,
            total_balance: 0,
            active_events_count: 0,
            paid_events_count: 0,
            pending_events_count: 0,
            monthly_breakdown: []
          };
          const merged = { ...current, ...detail.summary };
          try {
            const stored = localStorage.getItem('sc_cached_team_financials');
            const parsed = stored ? JSON.parse(stored) : { summaryMap: {}, records: [] };
            parsed.summaryMap = parsed.summaryMap || {};
            parsed.summaryMap[detail.memberId] = merged;
            localStorage.setItem('sc_cached_team_financials', JSON.stringify(parsed));
          } catch (_) {}
          return {
            ...prev,
            [detail.memberId]: merged
          };
        });

        setMembers(prev => prev.map(m => m.id === detail.memberId ? {
          ...m,
          commercial_agreed: detail.summary.total_agreed,
          commercial_paid: detail.summary.total_paid,
          commercial_balance: detail.summary.total_balance
        } : m));
      } else if (detail?.amount) {
        setMemberFinancials(prev => {
          const current = prev[detail.memberId];
          if (current) {
            const newPaid = current.total_paid + Number(detail.amount);
            const newBal = Math.max(0, current.total_balance - Number(detail.amount));
            const updated = {
              ...current,
              total_paid: newPaid,
              total_balance: newBal
            };
            try {
              const stored = localStorage.getItem('sc_cached_team_financials');
              const parsed = stored ? JSON.parse(stored) : { summaryMap: {}, records: [] };
              parsed.summaryMap = parsed.summaryMap || {};
              parsed.summaryMap[detail.memberId] = updated;
              localStorage.setItem('sc_cached_team_financials', JSON.stringify(parsed));
            } catch (_) {}
            return {
              ...prev,
              [detail.memberId]: updated
            };
          }
          return prev;
        });
      }

      if (detail.newAgreed !== undefined || detail.newPaid !== undefined) {
        setMembers(prev => prev.map(m => {
          if (m.id === detail.memberId) {
            const updatedAssigns = (m.assignments || []).map((a: any) => {
              if (String(a.id) === String(detail.assignmentId)) {
                return {
                  ...a,
                  agreed_amount: detail.newAgreed !== undefined ? detail.newAgreed : a.agreed_amount,
                  paid_amount: detail.newPaid !== undefined ? detail.newPaid : a.paid_amount,
                  balance_amount: detail.newBalance !== undefined ? detail.newBalance : a.balance_amount
                };
              }
              return a;
            });
            const updatedPayouts = (m.payouts || []).map((p: any) => {
              if (String(p.id) === String(detail.assignmentId)) {
                return {
                  ...p,
                  agreed_amount: detail.newAgreed !== undefined ? detail.newAgreed : p.agreed_amount,
                  paid_amount: detail.newPaid !== undefined ? detail.newPaid : p.paid_amount,
                  balance_amount: detail.newBalance !== undefined ? detail.newBalance : p.balance_amount
                };
              }
              return p;
            });
            return {
              ...m,
              assignments: updatedAssigns,
              payouts: updatedPayouts
            };
          }
          return m;
        }));
      }
    };
    window.addEventListener('team_finance_updated', handleFinanceUpdated);
    return () => window.removeEventListener('team_finance_updated', handleFinanceUpdated);
  }, []);

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

    // 2. Authoritative async save via /api/workspace/members (bypasses RLS/session races)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUid = session?.user?.id || (typeof window !== 'undefined' ? localStorage.getItem('sc_user_id') : null);
        const storedWs = typeof window !== 'undefined' ? localStorage.getItem('sc_active_workspace_id') : null;
        const effectiveWsId = workspaceId || storedWs || currentUid;
        if (!effectiveWsId) {
          throw new Error('Workspace session is missing. Please refresh and sign in again.');
        }

        const canonicalId = (isEdit && editingMemberId)
          ? editingMemberId
          : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : tempId);

        const resJson = await authFetchJson('/api/workspace/members', {
          method: 'POST',
          body: JSON.stringify({
            id: canonicalId,
            member_id: canonicalId,
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
        });

        const savedMemberId = resJson?.savedMember?.id || resJson?.member?.id || canonicalId;
        if (!isEdit && savedMemberId !== tempId) {
          setMembers(prev => prev.map(m => (m.id === tempId ? { ...m, id: savedMemberId } : m)));
        }

        if (savedMemberId && memberData.default_daily_rate != null) {
          await saveWorkspaceMemberRate(effectiveWsId, savedMemberId, Number(memberData.default_daily_rate), memberData.default_currency || 'INR', memberData.payout_frequency || 'daily');
        }

        if (savedMemberId && memberData.permissions) {
          await saveMemberStudioPermissions(effectiveWsId, savedMemberId, memberData.permissions).catch(() => {});
        }

        // 3. Log Audit Activity
        await authFetch('/api/workspace/activity-logs', {
          method: 'POST',
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
      } catch (err: any) {
        console.error('[WorkspaceTeamPage] Background save failed:', err);
        if (!isEdit) {
          setMembers(prev => prev.filter(m => m.id !== tempId));
        }
        alert('Failed to save team member: ' + (err?.message || 'Please check your connection and try again.'));
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

  // Direct Member Action Handlers (Instant 0ms Drawer)
  const handleOpenDetails = (member: TeamMember) => {
    setSelectedFinanceMember(member);
    const isPartnerOrLab = (
      member.primary_type === 'PARTNER' ||
      member.primary_type === 'VENDOR' ||
      member.member_types?.includes('PARTNER') ||
      member.member_types?.includes('VENDOR') ||
      member.type === 'partner' ||
      /lab|print|vendor|partner|press|binder/i.test(member.primary_role || member.role || '')
    );
    setFinanceInitialTab(isPartnerOrLab ? 'album_printing' : 'bookings');
    setIsFinanceDrawerOpen(true);
  };

  const handleOpenVendorDeliverables = (member: TeamMember) => {
    try {
      sessionStorage.setItem(`sc_team_member_${member.id}`, JSON.stringify(member));
    } catch (_) {}
    router.push(`/workspace/team/${member.id}`);
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

  const handleToggleHideMember = async (member: TeamMember) => {
    const currentlyHidden = hiddenMemberIds.includes(member.id);
    const nextHidden = currentlyHidden
      ? hiddenMemberIds.filter(id => id !== member.id)
      : [...hiddenMemberIds, member.id];
    setHiddenMemberIds(nextHidden);
    memCachedHiddenIds = nextHidden;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const effectiveWsId = workspaceId || session?.user?.id;
      await authFetchJson('/api/workspace/team/pin', {
        method: 'POST',
        body: JSON.stringify({
          action: 'toggle_hide_member',
          workspace_id: effectiveWsId,
          memberId: member.id,
          hide: !currentlyHidden,
        }),
      });
    } catch (err) {
      console.error('[HideMember] Error:', err);
      setHiddenMemberIds(hiddenMemberIds);
      memCachedHiddenIds = hiddenMemberIds;
    }
  };

  const handleSelectFilterTab = (tabId: string) => {
    if (tabId === 'Hidden') {
      if (!hiddenUnlocked) {
        setPinInput('');
        setPinError('');
        setShowPinModal(true);
        return;
      }
      setSelectedFilter('Hidden');
      setVisibleCount(15);
      return;
    }
    setSelectedFilter(tabId);
    setVisibleCount(15);
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setPinError('Please enter your 4-6 digit PIN.');
      return;
    }
    setPinVerifying(true);
    setPinError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const effectiveWsId = workspaceId || session?.user?.id;
      if (!hasHidePin) {
        const res = await authFetchJson('/api/workspace/team/pin', {
          method: 'POST',
          body: JSON.stringify({
            action: 'set_initial_pin',
            workspace_id: effectiveWsId,
            pin: pinInput,
          }),
        });
        if (res?.success) {
          setHasHidePin(true);
          memCachedHasPin = true;
          setHiddenUnlocked(true);
          setShowPinModal(false);
          setSelectedFilter('Hidden');
          setVisibleCount(15);
        } else {
          setPinError(res?.error || 'Failed to set PIN.');
        }
      } else {
        const res = await authFetchJson('/api/workspace/team/pin', {
          method: 'POST',
          body: JSON.stringify({
            action: 'verify_pin',
            workspace_id: effectiveWsId,
            pin: pinInput,
          }),
        });
        if (res?.valid) {
          setHiddenUnlocked(true);
          setShowPinModal(false);
          setSelectedFilter('Hidden');
          setVisibleCount(15);
        } else {
          setPinError(res?.error || 'Incorrect PIN.');
        }
      }
    } catch (err: any) {
      setPinError(err?.message || 'Incorrect PIN. Please try again.');
    } finally {
      setPinVerifying(false);
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

  const matchesSelectedPeriod = useCallback((dateStr: string) => {
    if (financePeriod === 'all') return true;
    if (!dateStr) return false;
    const d = dateStr.split('T')[0];
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const yestIso = yest.toISOString().split('T')[0];
    const currentYearMonth = todayIso.substring(0, 7);
    const currentYear = String(now.getFullYear());
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = prevMonthDate.toISOString().substring(0, 7);

    if (financePeriod === 'today') return d === todayIso;
    if (financePeriod === 'yesterday') return d === yestIso;
    if (financePeriod === 'this_month') return d.startsWith(currentYearMonth);
    if (financePeriod === 'last_month') return d.startsWith(prevYearMonth);
    if (financePeriod === 'this_year') return d.startsWith(currentYear);
    if (financePeriod === 'custom') {
      if (customStartDate && d < customStartDate) return false;
      if (customEndDate && d > customEndDate) return false;
      return true;
    }
    return true;
  }, [financePeriod, customStartDate, customEndDate]);

  const periodMemberStats = useMemo(() => {
    if ((financePeriod === 'all' && financeViewMode === 'all') || aggregateRecords.length === 0) return null;
    const statsMap: Record<string, { total_agreed: number; total_paid: number; total_balance: number; count: number }> = {};

    aggregateRecords.forEach((rec: any) => {
      const targetDate = financeViewMode === 'paid_only'
        ? (rec.payment_date || rec.date || '')
        : (rec.date || '');
      const matches = matchesSelectedPeriod(targetDate);
      if (matches && rec.member_id) {
        const agreed = Number(rec.agreed_amount) || 0;
        const paid = Number(rec.paid_amount) || 0;
        if (financeViewMode === 'paid_only' && paid <= 0) return;
        if (!statsMap[rec.member_id]) {
          statsMap[rec.member_id] = { total_agreed: 0, total_paid: 0, total_balance: 0, count: 0 };
        }
        statsMap[rec.member_id].total_agreed += agreed;
        statsMap[rec.member_id].total_paid += paid;
        statsMap[rec.member_id].total_balance += Math.max(0, agreed - paid);
        statsMap[rec.member_id].count += 1;
      }
    });

    return statsMap;
  }, [aggregateRecords, financePeriod, financeViewMode, matchesSelectedPeriod]);

  const paidPaymentsBreakdown = useMemo(() => {
    const hiddenSet = new Set(hiddenMemberIds);
    const items: Array<{ id: string; member_id: string; member_name: string; title: string; date: string; amount: number }> = [];
    for (const rec of aggregateRecords as any[]) {
      if (hiddenSet.has(rec.member_id) && !(selectedFilter === 'Hidden' && hiddenUnlocked)) continue;
      const paidAmt = Number(rec.paid_amount) || 0;
      if (paidAmt <= 0) continue;
      const pDate = String(rec.payment_date || rec.date || '').split('T')[0];
      if (!matchesSelectedPeriod(pDate)) continue;
      items.push({
        id: String(rec.id),
        member_id: rec.member_id,
        member_name: rec.member_name || 'Crew Member',
        title: rec.title || 'Payment',
        date: pDate,
        amount: paidAmt,
      });
    }
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items;
  }, [aggregateRecords, hiddenMemberIds, selectedFilter, hiddenUnlocked, matchesSelectedPeriod]);

  // 1. Robust Universal Search (Name, Role, Phone, Email) & Multi-Criteria Filtering
  const filteredMembers = useMemo(() => {
    const hiddenSet = new Set(hiddenMemberIds);
    return members.filter((member) => {
      const isMemberHidden = hiddenSet.has(member.id);
      if (selectedFilter === 'Hidden') {
        if (!isMemberHidden) return false;
      } else {
        if (isMemberHidden) return false;
      }

      // 1. Tab Classification Filter (All Crew, In-House, Freelancers, Partners, Hidden)
      const tabKey = (selectedFilter || '').toLowerCase().replace(/[-_\s]/g, '');
      const memType = String(member.type || member.primary_type || '').toLowerCase().replace(/[-_\s]/g, '');
      const memTypes = Array.isArray(member.member_types)
        ? member.member_types.map((t: string) => String(t).toLowerCase().replace(/[-_\s]/g, ''))
        : [];

      const isAll = !tabKey || tabKey === 'all' || tabKey === 'allcrew' || tabKey === 'hidden';
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

      // 4. Period Filter: When filtering by a date window, only show members with activity in that period!
      if (periodMemberStats !== null) {
        const stats = periodMemberStats[member.id];
        if (!stats || (stats.total_agreed === 0 && stats.total_paid === 0 && stats.total_balance === 0 && stats.count === 0)) {
          return false;
        }
      }

      return true;
    });
  }, [members, hiddenMemberIds, selectedFilter, selectedRole, searchQuery, periodMemberStats]);

  // Incremental Batch Scroll (15 Members at a Time)
  const [visibleCount, setVisibleCount] = useState(15);
  const displayedMembers = useMemo(() => filteredMembers.slice(0, visibleCount), [filteredMembers, visibleCount]);

  useEffect(() => {
    setVisibleCount(15);
  }, [selectedFilter, selectedRole, searchQuery, financePeriod, customStartDate, customEndDate]);

  // Aggregate Financial Totals (Filterable by All Time, Month, Year, Custom Date)
  // In 'All' (All Crew), include hidden members' amounts in Studio Total while keeping their rows hidden.
  // In 'Hidden', show only hidden members' totals.
  const overviewMembersForTotals = useMemo(() => {
    if (selectedFilter !== 'All') return filteredMembers;
    const hiddenSet = new Set(hiddenMemberIds);
    const hiddenMatching = members.filter((member) => {
      if (!hiddenSet.has(member.id)) return false;
      if (selectedRole && selectedRole !== 'all' && selectedRole !== 'All Roles') {
        const targetRole = selectedRole.trim().toLowerCase();
        const memberRoles = Array.isArray(member.roles) && member.roles.length > 0
          ? member.roles.map((r: string) => String(r).trim().toLowerCase())
          : [String(member.role || member.primary_role || '').trim().toLowerCase()];
        if (!memberRoles.some((r: string) => r === targetRole || r.includes(targetRole))) return false;
      }
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (member.name || '').toLowerCase().includes(q);
        const phoneMatch = (member.phone || member.phone_number || '').includes(q);
        const emailMatch = (member.email || '').toLowerCase().includes(q);
        const rolesMatch = Array.isArray(member.roles) && member.roles.length > 0
          ? member.roles.some((r: string) => String(r).toLowerCase().includes(q))
          : String(member.role || member.primary_role || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !emailMatch && !rolesMatch) return false;
      }
      if (periodMemberStats !== null) {
        const stats = periodMemberStats[member.id];
        if (!stats || (stats.total_agreed === 0 && stats.total_paid === 0 && stats.total_balance === 0 && stats.count === 0)) return false;
      }
      return true;
    });
    return hiddenMatching.length > 0 ? [...filteredMembers, ...hiddenMatching] : filteredMembers;
  }, [selectedFilter, filteredMembers, members, hiddenMemberIds, selectedRole, searchQuery, periodMemberStats]);

  const allTeamFinancialTotals = useMemo(() => {
    // Instant 0ms Fast-Path: When viewing 'all' or before aggregateRecords load from network
    // Computes directly from memberFinancials in memory without waiting or requiring scrolling!
    if ((financePeriod === 'all' && financeViewMode === 'all') || aggregateRecords.length === 0) {
      let totalAgreed = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      let totalCount = 0;
      let settledCount = 0;
      let pendingCount = 0;

      overviewMembersForTotals.forEach((m) => {
        const fin = memberFinancials[m.id];
        const agreed = fin?.total_agreed !== undefined ? Number(fin.total_agreed) : (Number(m.commercial_agreed) || 0);
        const paid = fin?.total_paid !== undefined ? Number(fin.total_paid) : (Number(m.commercial_paid) || 0);
        const bal = Math.max(0, agreed - paid);

        totalAgreed += agreed;
        totalPaid += paid;
        totalBalance += bal;

        if (agreed > 0 || paid > 0 || bal > 0) {
          totalCount += 1;
          if (bal <= 0 && agreed > 0) settledCount += 1;
          else if (bal > 0) pendingCount += 1;
        }
      });

      const percent = totalAgreed > 0 ? Math.min(100, Math.round((totalPaid / totalAgreed) * 100)) : 100;
      return {
        totalAgreed,
        totalPaid,
        totalBalance,
        totalCount,
        settledCount,
        pendingCount,
        percent,
      };
    }

    const now = new Date();
    const currentYearMonth = now.toISOString().substring(0, 7); // e.g. "2026-10"
    const currentYear = String(now.getFullYear()); // e.g. "2026"

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = prevMonthDate.toISOString().substring(0, 7); // e.g. "2026-09"

    // Cross-reference with overview members (includes hidden in All Crew, or hidden-only in Hidden tab)
    const activeMemberIds = new Set(overviewMembersForTotals.map(m => m.id));

    const filtered = aggregateRecords.filter((rec: any) => {
      if (!activeMemberIds.has(rec.member_id)) return false;
      const targetDate = financeViewMode === 'paid_only' ? (rec.payment_date || rec.date || '') : (rec.date || '');
      if (!matchesSelectedPeriod(targetDate)) return false;
      if (financeViewMode === 'paid_only' && (Number(rec.paid_amount) || 0) <= 0) return false;
      return true;
    });

    const totalAgreed = filtered.reduce((acc, r) => acc + (Number(r.agreed_amount) || 0), 0);
    const totalPaid = filtered.reduce((acc, r) => acc + (Number(r.paid_amount) || 0), 0);
    const totalBalance = Math.max(0, totalAgreed - totalPaid);
    const totalCount = filtered.length;
    const settledCount = filtered.filter(r => r.balance_amount <= 0 && r.agreed_amount > 0).length;
    const pendingCount = filtered.filter(r => r.balance_amount > 0).length;
    const percent = totalAgreed > 0 ? Math.min(100, Math.round((totalPaid / totalAgreed) * 100)) : 100;

    return {
      totalAgreed,
      totalPaid,
      totalBalance,
      totalCount,
      settledCount,
      pendingCount,
      percent,
    };
  }, [aggregateRecords, overviewMembersForTotals, memberFinancials, financePeriod, financeViewMode, matchesSelectedPeriod]);

  // Metrics (exclude hidden members from normal tabs)
  const visibleMembersList = members.filter(m => !hiddenMemberIds.includes(m.id));
  const hiddenCount = members.filter(m => hiddenMemberIds.includes(m.id)).length;
  const totalCount = visibleMembersList.length;
  const inHouseCount = visibleMembersList.filter(m => m.member_types?.includes('IN_HOUSE') || m.primary_type === 'IN_HOUSE').length;
  const freelancerCount = visibleMembersList.filter(m => m.member_types?.includes('FREELANCER') || m.primary_type === 'FREELANCER').length;
  const partnerCount = visibleMembersList.filter(m => m.member_types?.includes('PARTNER') || m.primary_type === 'PARTNER').length;

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

  if (!mounted || (loading && members.length === 0)) {
    return <StudioCoreLiquidLoader label="Loading Team & Partners..." />;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-3 sm:p-5 lg:p-6 space-y-4 w-full font-sans">
      
      {/* 1. TOP HEADER & NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-zinc-200/90 shadow-2xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
              Studio Team &amp; Partners
            </h1>
            <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 border border-zinc-200/70 px-2.5 py-0.5 rounded-full">
              {totalCount} Members
            </span>
          </div>
          <p className="hidden md:block text-xs text-zinc-500 font-medium">
            Manage studio crew, in-house staff, and partner labs with granular RBAC permissions.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
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

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center">
          {/* Reminders Bell Notification Button (Icon Only with Badge) */}
          <button
            type="button"
            onClick={() => setIsRemindersDrawerOpen(true)}
            className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-stone-200 hover:bg-amber-50 text-stone-700 transition cursor-pointer shadow-2xs shrink-0"
            title="Team & Shoot Reminders"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            {pendingRemindersCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                {pendingRemindersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setMemberToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="h-9 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member / Partner</span>
          </button>
        </div>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* 1.5. ALL-MEMBERS AGGREGATE FINANCIAL COMMITMENT & PAYOUT SUMMARY (LIGHT LUXURY UI) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs space-y-4 my-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                    <span>Crew &amp; Partner Payment Overview</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-900 font-bold border border-amber-200/60">
                      Studio Total
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Consolidated agreed amounts, advance payouts disbursed, and pending balance across all crew members.
                  </p>
                </div>
              </div>

              {/* Compact Filter Icon Button + Dropdown Popover */}
              <div className="relative flex items-center gap-2">
                {(financePeriod !== 'all' || financeViewMode !== 'all') && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold">
                    {financeViewMode === 'paid_only' ? 'Paid: ' : ''}
                    {financePeriod === 'today' ? 'Today' : financePeriod === 'yesterday' ? 'Yesterday' : financePeriod === 'this_month' ? 'This Month' : financePeriod === 'last_month' ? 'Last Month' : financePeriod === 'this_year' ? 'This Year' : financePeriod === 'custom' ? 'Custom Range' : 'All Time'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(o => !o)}
                  title="Filter Crew Payments & Paid History"
                  className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isFilterOpen || financePeriod !== 'all' || financeViewMode !== 'all'
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 top-11 w-72 sm:w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl p-4 z-50 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Payment Filter</span>
                      <button type="button" onClick={() => setIsFilterOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">View Type</label>
                      <div className="grid grid-cols-2 gap-1.5 bg-zinc-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setFinanceViewMode('all')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${financeViewMode === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600'}`}
                        >
                          All Commitments
                        </button>
                        <button
                          type="button"
                          onClick={() => setFinanceViewMode('paid_only')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${financeViewMode === 'paid_only' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-zinc-600'}`}
                        >
                          Paid Payments
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Date Range</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'all', label: 'All Time' },
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'last_month', label: 'Last Month' },
                          { id: 'this_year', label: 'This Year' },
                          { id: 'custom', label: 'Custom Date' },
                        ].map((period) => (
                          <button
                            key={period.id}
                            type="button"
                            onClick={() => {
                              setFinancePeriod(period.id as any);
                              if (period.id !== 'custom') setIsFilterOpen(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-left transition cursor-pointer border ${
                              financePeriod === period.id
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200/70 hover:bg-zinc-100'
                            }`}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(financePeriod !== 'all' || financeViewMode !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFinancePeriod('all');
                          setFinanceViewMode('all');
                          setCustomStartDate('');
                          setCustomEndDate('');
                          setIsFilterOpen(false);
                        }}
                        className="w-full py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Date Inputs (if custom is selected) */}
            {financePeriod === 'custom' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-amber-900">Filter Range:</span>
                <div className="flex items-center gap-2">
                  <label className="text-zinc-500 font-medium text-[11px]">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-800 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-zinc-500 font-medium text-[11px]">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-800 outline-none focus:border-amber-500"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer ml-auto"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}

            {/* 3 Metric Cards with Instant Studio Core Liquid Loader Sync */}
            {financialsLoading ? (
              <div className="p-8 rounded-xl sm:rounded-2xl bg-zinc-50/80 border border-zinc-200/80 shadow-2xs flex flex-col items-center justify-center min-h-[140px]">
                <StudioCoreLiquidLoader label="Synchronizing payment overview..." fullscreen={false} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Total Agreed */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-zinc-50/80 border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Agreed Amount</span>
                    <IndianRupee className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-zinc-900 font-mono tracking-tight">
                    ₹{allTeamFinancialTotals.totalAgreed.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Commitments:</span>
                    <span className="font-bold text-zinc-700">{allTeamFinancialTotals.totalCount} item(s)</span>
                  </div>
                </div>

                {/* Total Paid */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-zinc-50/80 border border-zinc-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-bold mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Paid</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                    ₹{allTeamFinancialTotals.totalPaid.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Disbursal Progress:</span>
                    <span className="font-bold text-emerald-700">{allTeamFinancialTotals.percent}% Settled</span>
                  </div>
                </div>

                {/* Balance Remaining */}
                <div className="p-4 rounded-xl sm:rounded-2xl bg-amber-50/50 border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Remaining Balance</span>
                    <Clock className="w-4 h-4 text-amber-700" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
                    ₹{allTeamFinancialTotals.totalBalance.toLocaleString('en-IN')}
                  </p>
                  <div className="mt-2 text-[11px] text-amber-900/80 flex items-center justify-between">
                    <span>Pending Payouts:</span>
                    <span className="font-black text-amber-800">
                      {allTeamFinancialTotals.pendingCount > 0 ? `${allTeamFinancialTotals.pendingCount} Pending` : 'All Accounts Settled'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {(financeViewMode === 'paid_only' || financePeriod === 'today' || financePeriod === 'yesterday' || (financePeriod === 'custom' && (customStartDate || customEndDate))) && (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-950">
                      Paid Payments Breakdown ({paidPaymentsBreakdown.length} payouts • ₹{paidPaymentsBreakdown.reduce((s, i) => s + i.amount, 0).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFinanceViewMode('all'); setFinancePeriod('all'); }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
                {paidPaymentsBreakdown.length === 0 ? (
                  <p className="text-xs text-emerald-800/70 font-medium">No paid disbursements recorded in this date range.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {paidPaymentsBreakdown.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl p-2.5 border border-emerald-200/70 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 truncate">{item.member_name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{item.title} • {item.date || 'N/A'}</div>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-700 shrink-0">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
                { id: 'Hidden', label: 'Hidden', count: hiddenCount, locked: hasHidePin && !hiddenUnlocked },
              ].map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectFilterTab(tab.id)}
                  className={`flex-1 sm:flex-initial text-center py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === tab.id ? 'bg-black text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.id === 'Hidden' && (tab.locked ? <Lock className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />)}{tab.label} <span className="opacity-70 text-[10px]">({tab.count})</span>
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
                  const fin = (periodMemberStats && periodMemberStats[member.id]) ? periodMemberStats[member.id] : memberFinancials[member.id];
                  return (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      agreed={fin?.total_agreed}
                      paid={fin?.total_paid}
                      balance={fin?.total_balance}
                      handleOpenDetails={handleOpenDetails}
                      handleOpenVendorDeliverables={handleOpenVendorDeliverables}
                      handleEditMember={handleEditMember}
                      handleDeleteMember={handleDeleteMember}
                      isHidden={hiddenMemberIds.includes(member.id)}
                      handleToggleHideMember={handleToggleHideMember}
                    />
                  );
                })}
              </div>

              {/* 2. Desktop Member Table (12-Column Responsive Layout) */}
              <div className="hidden md:block w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mt-4">
                {/* Desktop Table Header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <div className="col-span-3">Member Info</div>
                  <div className="col-span-2">Type & Role</div>
                  <div className="col-span-3">Commercials (Agreed / Paid / Due)</div>
                  <div className="col-span-2">Portal Access</div>
                  <div className="col-span-2 text-right">•••</div>
                </div>

                {/* Row List */}
                <div className="divide-y divide-slate-100">
                  {displayedMembers.map((member) => {
                    const fin = (periodMemberStats && periodMemberStats[member.id]) ? (periodMemberStats[member.id] as any) : memberFinancials[member.id];
                    return (
                    <TeamTableRow
                      key={member.id}
                      member={member}
                      fin={fin}
                      handleOpenDetails={handleOpenDetails}
                      handleOpenVendorDeliverables={handleOpenVendorDeliverables}
                      handleEditMember={handleEditMember}
                      handleDeleteMember={handleDeleteMember}
                      isHidden={hiddenMemberIds.includes(member.id)}
                      handleToggleHideMember={handleToggleHideMember}
                    />
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
        initialTab={financeInitialTab}
        dateFilter={{
          period: financePeriod,
          startDate: customStartDate,
          endDate: customEndDate
        }}
        onClose={() => {
          setIsFinanceDrawerOpen(false);
          setSelectedFinanceMember(null);
          loadMembers();
        }}
        workspaceId={workspaceId || ''}
        workspaceName={workspaceName || 'Filmify Weddings'}
        member={selectedFinanceMember}
        initialSummary={selectedFinanceMember ? memberFinancials[selectedFinanceMember.id] : null}
        onFinancialUpdate={(mid, updatedSummary) => {
          if (mid && updatedSummary) {
            setMemberFinancials(prev => {
              const current = prev[mid] || {
                member_id: mid,
                total_agreed: 0,
                total_paid: 0,
                total_balance: 0,
                active_events_count: 0,
                paid_events_count: 0,
                pending_events_count: 0,
                monthly_breakdown: []
              };
              const merged = {
                ...current,
                ...updatedSummary
              };
              try {
                const stored = localStorage.getItem('sc_cached_team_financials');
                const parsed = stored ? JSON.parse(stored) : { summaryMap: {}, records: [] };
                parsed.summaryMap = parsed.summaryMap || {};
                parsed.summaryMap[mid] = merged;
                localStorage.setItem('sc_cached_team_financials', JSON.stringify(parsed));
              } catch (_) {}
              return {
                ...prev,
                [mid]: merged
              };
            });

            // Instant 0ms Sync with outside member card:
            setMembers(prev => prev.map(m => m.id === mid ? {
              ...m,
              commercial_agreed: updatedSummary.total_agreed,
              commercial_paid: updatedSummary.total_paid,
              commercial_balance: updatedSummary.total_balance
            } : m));
          }
        }}
      />

      {/* 3D Creamy Vendor & Team Assignments, Operations & Invoicing Modal */}
      {selectedVendorDeliverablesMember && (
        <VendorAlbumDeliverablesModal
          isOpen={isVendorDeliverablesModalOpen}
          onClose={() => {
            setIsVendorDeliverablesModalOpen(false);
            setSelectedVendorDeliverablesMember(null);
            loadMembers();
          }}
          workspaceId={workspaceId || ''}
          vendor={selectedVendorDeliverablesMember}
          studioName={workspaceName || 'StudioCore Partner Studio'}
          onOpenSalaryDrawer={(m) => {
            setSelectedFinanceMember(m);
            setFinanceInitialTab('payroll');
            setIsFinanceDrawerOpen(true);
          }}
        />
      )}

      {/* Luxury Red Delete Warning Modal */}
      <DeleteMemberWarningModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => { if (memberToDelete) executeDeleteMember(memberToDelete.id); }}
        member={memberToDelete}
        isDeleting={Boolean(deletingId)}
      />

      {/* Team & Shoot Reminders Notification Drawer */}
      <TeamRemindersDrawer
        isOpen={isRemindersDrawerOpen}
        onClose={() => setIsRemindersDrawerOpen(false)}
        workspaceId={workspaceId || ''}
        onCountChange={setPendingRemindersCount}
        onNavigateToMember={(recipientIdOrName) => {
          setIsRemindersDrawerOpen(false);
          const target = members.find(m => 
            m.id === recipientIdOrName || 
            (m.name && recipientIdOrName && m.name.toLowerCase() === recipientIdOrName.toLowerCase()) ||
            (m.name && recipientIdOrName && recipientIdOrName.toLowerCase().includes(m.name.toLowerCase()))
          );
          if (target) {
            setSelectedFinanceMember(target);
            setFinanceInitialTab('bookings');
            setIsFinanceDrawerOpen(true);
          }
        }}
      />

      {/* Security PIN Modal for Hidden Team & Partners */}
      {showPinModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-zinc-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    {hasHidePin ? 'Enter Security PIN' : 'Set Security PIN'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {hasHidePin
                      ? 'Unlock hidden team members & commercials'
                      : 'Create a 4–6 digit PIN to lock hidden members'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowPinModal(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleVerifyPinSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-center text-lg font-black tracking-widest font-mono text-zinc-900 focus:outline-none focus:border-amber-500"
              />
              {pinError && <p className="text-xs font-bold text-rose-600 text-center">{pinError}</p>}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    router.push('/workspace/settings?tab=team_partners');
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Forgot PIN? Reset via Email OTP
                </button>
                <button
                  type="submit"
                  disabled={pinVerifying}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {pinVerifying ? (hasHidePin ? 'Verifying...' : 'Saving...') : (hasHidePin ? 'Unlock' : 'Set PIN & Unlock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
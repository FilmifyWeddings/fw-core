'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, UserPlus, Search, Filter, Mail, Phone, 
  Camera, Film, BookOpen, ShieldCheck, Trash2, Edit3, 
  CheckCircle2, RefreshCw, ChevronRight, User, MoreVertical,
  ExternalLink, Sparkles, AlertCircle, Building2, Briefcase,
  Target, FileText, IndianRupee, Layers, Check, Activity,
  Clock, Calendar, UserCheck, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import AddTeamMemberModal from '@/app/team-manager/components/AddTeamMemberModal';
import TeamMemberFinanceDrawer from './components/TeamMemberFinanceDrawer';
import { fetchMemberFinancialSummary, TeamFinancialSummary } from '@/lib/team-finance-sync';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country_code?: string;
  phone_number?: string;
  primary_role: string;
  roles?: string[];
  member_types?: string[];
  primary_type?: string;
  avatar_url?: string;
  status?: string;
  default_daily_rate?: number;
  default_currency?: string;
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
  const [selectedLogModule, setSelectedLogModule] = useState('ALL');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  
  // Team & Partner Financial Engine Drawer States
  const [selectedFinanceMember, setSelectedFinanceMember] = useState<TeamMember | null>(null);
  const [isFinanceDrawerOpen, setIsFinanceDrawerOpen] = useState(false);
  const [memberFinancials, setMemberFinancials] = useState<Record<string, TeamFinancialSummary>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);


  // Load Financial Summaries for all members
  const loadFinancialSummaries = useCallback(async (membersList: TeamMember[]) => {
    const effectiveWsId = workspaceId || userEmail;
    if (!effectiveWsId || membersList.length === 0) return;

    const summaryMap: Record<string, TeamFinancialSummary> = {};
    for (const m of membersList) {
      try {
        const sum = await fetchMemberFinancialSummary(effectiveWsId, m.id, m.primary_type || 'FREELANCER');
        summaryMap[m.id] = sum;
      } catch (_) {}
    }
    setMemberFinancials(summaryMap);
  }, [workspaceId, userEmail]);

  // Load team members from database
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;
      if (!currentUid) return;

      const effectiveWsId = workspaceId || currentUid;

      // 1. Fetch from workspace_members API / DB
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
            default_daily_rate: m.default_daily_rate || 0,
            default_currency: m.default_currency || 'INR',
            permissions: m.member_permissions?.[0] || m.member_permissions || undefined,
          }));
        }
      } catch (_) {}

      // 2. Also merge from fw_team_members for backwards compatibility
      const { data: fwData } = await supabase
        .from('fw_team_members')
        .select('*')
        .eq('user_id', currentUid);

      if (fwData && fwData.length > 0) {
        for (const f of fwData) {
          const exists = combinedMembers.some(
            c => c.name.toLowerCase() === f.name.toLowerCase() || (f.email && c.email?.toLowerCase() === f.email.toLowerCase())
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
              default_daily_rate: f.default_daily_rate || 0,
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
    const handleFinanceUpdated = () => {
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

  // Handle Save (Add or Edit)
  const handleSaveMember = async (memberData: any) => {
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
        default_daily_rate: memberData.default_daily_rate || 0,
        default_currency: memberData.default_currency || 'INR',
        user_id: currentUid,
      };

      if (memberToEdit) {
        await supabase
          .from('fw_team_members')
          .update(fwPayload)
          .eq('id', memberToEdit.id);
      } else {
        await supabase
          .from('fw_team_members')
          .insert([fwPayload]);
      }

      // 2. Insert/Update in workspace_members API for Multi-Tenant RBAC
      if (session?.access_token) {
        await fetch('/api/workspace/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: effectiveWsId,
            name: memberData.name,
            email: memberData.email || `${memberData.name.toLowerCase().replace(/\s+/g, '')}@partner.studiocore.in`,
            phone: `${memberData.country_code || '+91'} ${memberData.phone_number}`.trim(),
            primary_role: memberData.primary_role,
            roles: memberData.roles || [memberData.primary_role],
            member_types: memberData.member_types || ['IN_HOUSE'],
            primary_type: memberData.primary_type || 'IN_HOUSE',
            avatar_url: memberData.avatar_url || null,
            permissions: memberData.permissions,
          }),
        }).catch(() => {});

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
            action: memberToEdit ? 'MEMBER_PERMISSIONS_UPDATED' : 'MEMBER_INVITED',
            description: `${memberToEdit ? 'Updated permissions for' : 'Added new team member'} ${memberData.name} (${memberData.primary_role})`,
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

      await loadMembers();
      setIsAddModalOpen(false);
      setMemberToEdit(null);
    } catch (err: any) {
      console.error('[WorkspaceTeamPage] Save failed:', err);
      alert('Failed to save team member: ' + err.message);
    }
  };

  // Delete Member
  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member / partner?')) return;
    setDeletingId(memberId);
    try {
      const targetMember = members.find(m => m.id === memberId);
      await supabase.from('fw_team_members').delete().eq('id', memberId);
      await supabase.from('workspace_members').delete().eq('id', memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && workspaceId) {
        await fetch('/api/workspace/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            module: 'TEAM',
            action: 'MEMBER_REMOVED',
            description: `Removed team member ${targetMember?.name || memberId}`,
            details: { memberId, memberName: targetMember?.name },
            user_name: userName || 'Studio Admin',
            user_role: isOwner ? 'OWNER' : 'ADMIN',
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[WorkspaceTeamPage] Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.primary_role.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'In-House') return m.member_types?.includes('IN_HOUSE') || m.primary_type === 'IN_HOUSE';
    if (selectedFilter === 'Freelancers') return m.member_types?.includes('FREELANCER') || m.primary_type === 'FREELANCER';
    if (selectedFilter === 'Partners') return m.member_types?.includes('PARTNER') || m.primary_type === 'PARTNER';
    if (selectedFilter === 'Photographers') return m.primary_role.toLowerCase().includes('photo') || m.roles?.some(r => r.toLowerCase().includes('photo'));
    if (selectedFilter === 'Cinematographers') return m.primary_role.toLowerCase().includes('cine') || m.roles?.some(r => r.toLowerCase().includes('cine'));
    if (selectedFilter === 'Editors') return m.primary_role.toLowerCase().includes('edit') || m.roles?.some(r => r.toLowerCase().includes('edit'));
    if (selectedFilter === 'Labs') return m.primary_role.toLowerCase().includes('lab') || m.primary_role.toLowerCase().includes('print') || m.roles?.some(r => r.toLowerCase().includes('lab'));
    return true;
  });

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
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* 1. TOP HEADER & NAVIGATION TABS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
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

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Studio Team &amp; Partner Governance
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
            Manage in-house staff, freelance crew, and printing lab partners with granular RBAC permissions and a real-time audit activity log.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-3">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
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
              if (activeTab === 'directory') loadMembers();
              else loadActivityLogs();
            }}
            className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || logsLoading) ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setMemberToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Team Member / Partner</span>
          </button>
        </div>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* 2. STATS OVERVIEW CARDS (WITH IN-HOUSE / FREELANCER / PARTNER BREAKDOWN) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Crew &amp; Partners</span>
              <div className="text-2xl font-black text-zinc-900">{totalCount}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">🏢 In-House Staff</span>
              <div className="text-2xl font-black text-emerald-900">{inHouseCount}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">📸 Freelancers</span>
              <div className="text-2xl font-black text-sky-900">{freelancerCount}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">🤝 Printing Labs &amp; Partners</span>
              <div className="text-2xl font-black text-purple-900">{partnerCount}</div>
            </div>
          </div>

          {/* 3. SEARCH & CLASSIFICATION FILTER BAR */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'All', label: 'All' },
                { id: 'In-House', label: '🏢 In-House' },
                { id: 'Freelancers', label: '📸 Freelancers' },
                { id: 'Partners', label: '🤝 Partners' },
                { id: 'Photographers', label: 'Photographers' },
                { id: 'Cinematographers', label: 'Cinematographers' },
                { id: 'Editors', label: 'Editors' },
                { id: 'Labs', label: 'Labs' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedFilter === f.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const leadsBadge = formatLeadsBadge(member.permissions?.leads_access);
                const teamBadge = formatTeamManagerBadge(member.permissions?.team_manager_access);

                return (
                  <div
                    key={member.id}
                    className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Top Row: Avatar & Details */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center">
                                {member.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-zinc-900 truncate leading-tight">{member.name}</h3>
                            
                            {/* Member Type Badges */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(member.member_types || [member.primary_type || 'IN_HOUSE']).map((t) => (
                                <span 
                                  key={t}
                                  className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider border ${
                                    t === 'IN_HOUSE'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : t === 'PARTNER'
                                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                                        : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}
                                >
                                  {t === 'IN_HOUSE' ? '🏢 In-House' : t === 'PARTNER' ? '🤝 Partner' : '📸 Freelancer'}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setMemberToEdit(member);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                            title="Edit Member & RBAC Permissions"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={deletingId === member.id}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-xs">
                        {member.email && (
                          <div className="flex items-center gap-2 text-zinc-600 truncate">
                            <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}

                        {member.phone && (
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Multi-Role Tags & Default Rate */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {member.roles && member.roles.length > 0 && member.roles.map((r) => (
                          <span key={r} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {r}
                          </span>
                        ))}
                        {Boolean(member.default_daily_rate && member.default_daily_rate > 0) && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <IndianRupee className="w-2.5 h-2.5" />
                            <span>{Number(member.default_daily_rate).toLocaleString('en-IN')}/day</span>
                          </span>
                        )}
                      </div>

                      {/* Financial Quick Widget */}
                      {(() => {
                        const fin = memberFinancials[member.id];
                        const totalAgreed = fin?.total_agreed || 0;
                        const totalPaid = fin?.total_paid || 0;
                        const totalBal = fin?.total_balance || 0;

                        return (
                          <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/80 grid grid-cols-3 gap-1.5 text-center">
                            <div>
                              <span className="text-[9px] font-bold text-stone-400 block uppercase">Agreed</span>
                              <span className="text-[11px] font-black text-stone-800">
                                ₹{totalAgreed.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-emerald-600 block uppercase">Paid</span>
                              <span className="text-[11px] font-black text-emerald-700">
                                ₹{totalPaid.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-rose-500 block uppercase">Balance</span>
                              <span className="text-[11px] font-black text-rose-700">
                                ₹{totalBal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Permissions & Security Summary */}
                    <div className="pt-3 border-t border-zinc-100 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${leadsBadge.color}`}>
                          {leadsBadge.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${teamBadge.color}`}>
                          {teamBadge.label}
                        </span>
                      </div>

                      {/* Action Row: Open Finance Drawer */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFinanceMember(member);
                          setIsFinanceDrawerOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                      >
                        <IndianRupee className="w-3.5 h-3.5 text-amber-300" />
                        <span>Details / Finance Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
      />
    </div>
  );
}

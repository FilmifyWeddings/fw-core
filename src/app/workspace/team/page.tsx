'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, UserPlus, Search, Filter, Mail, Phone, 
  Camera, Film, BookOpen, ShieldCheck, Trash2, Edit3, 
  CheckCircle2, RefreshCw, ChevronRight, User, MoreVertical,
  ExternalLink, Sparkles, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import AddTeamMemberModal from '@/app/team-manager/components/AddTeamMemberModal';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country_code?: string;
  phone_number?: string;
  primary_role: string;
  roles?: string[];
  avatar_url?: string;
  status?: string;
  permissions?: {
    leads_access?: string;
    quotations_access?: string;
    team_manager_access?: string;
    post_production_access?: string;
    finance_access?: string;
  };
}

export default function WorkspaceTeamPage() {
  const { workspaceId, workspaceName, isOwner } = useWorkspace();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
            avatar_url: m.avatar_url || '',
            status: m.status || 'ACTIVE',
            permissions: m.member_permissions?.[0] || undefined,
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
              avatar_url: f.avatar_url || '',
              status: 'ACTIVE',
            });
          }
        }
      }

      setMembers(combinedMembers);
    } catch (err) {
      console.error('[WorkspaceTeamPage] Load members error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Handle Save (Add or Edit)
  const handleSaveMember = async (memberData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;
      if (!currentUid) return;

      // 1. Insert/Update in fw_team_members for scheduling calendar
      const fwPayload = {
        name: memberData.name,
        primary_role: memberData.primary_role,
        country_code: memberData.country_code || '+91',
        phone_number: memberData.phone_number,
        email: memberData.email || null,
        avatar_url: memberData.avatar_url || null,
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
      if (session.access_token) {
        await fetch('/api/workspace/members', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId || currentUid,
            name: memberData.name,
            email: memberData.email || `${memberData.name.toLowerCase().replace(/\s+/g, '')}@partner.studiocore.in`,
            phone: `${memberData.country_code || '+91'} ${memberData.phone_number}`.trim(),
            primary_role: memberData.primary_role,
            roles: memberData.roles || [memberData.primary_role],
            avatar_url: memberData.avatar_url || null,
            permissions: memberData.permissions,
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
      await supabase.from('fw_team_members').delete().eq('id', memberId);
      await supabase.from('workspace_members').delete().eq('id', memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
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

    if (selectedRoleFilter === 'All') return true;
    if (selectedRoleFilter === 'Photographers') return m.primary_role.toLowerCase().includes('photo') || m.roles?.some(r => r.toLowerCase().includes('photo'));
    if (selectedRoleFilter === 'Cinematographers') return m.primary_role.toLowerCase().includes('cine') || m.roles?.some(r => r.toLowerCase().includes('cine'));
    if (selectedRoleFilter === 'Editors') return m.primary_role.toLowerCase().includes('edit') || m.roles?.some(r => r.toLowerCase().includes('edit'));
    if (selectedRoleFilter === 'Labs') return m.primary_role.toLowerCase().includes('lab') || m.primary_role.toLowerCase().includes('print') || m.roles?.some(r => r.toLowerCase().includes('lab'));
    return true;
  });

  // Metrics
  const totalCount = members.length;
  const photoCount = members.filter(m => m.primary_role.toLowerCase().includes('photo') || m.roles?.some(r => r.toLowerCase().includes('photo'))).length;
  const editCount = members.filter(m => m.primary_role.toLowerCase().includes('edit') || m.roles?.some(r => r.toLowerCase().includes('edit'))).length;
  const labCount = members.filter(m => m.primary_role.toLowerCase().includes('lab') || m.roles?.some(r => r.toLowerCase().includes('lab'))).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* 1. TOP HEADER & ADD MEMBER CTA */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5" />
              Team Directory &amp; RBAC
            </span>
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-0.5 rounded-full">
              {totalCount} Total Members
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Studio Team &amp; Partner Network
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-2xl">
            Manage your crew, freelance cinematographers, video editors, and album printing labs with granular multi-role tags and strict permission isolation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadMembers}
            className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
            title="Refresh Team List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
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

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Crew &amp; Partners</span>
          <div className="text-2xl font-black text-zinc-900">{totalCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">📸 Photographers &amp; Cine</span>
          <div className="text-2xl font-black text-sky-900">{photoCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">🎬 Editors &amp; Designers</span>
          <div className="text-2xl font-black text-rose-900">{editCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">📖 Printing Labs &amp; Vendors</span>
          <div className="text-2xl font-black text-emerald-900">{labCount}</div>
        </div>
      </div>

      {/* 3. SEARCH & ROLE FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by member name, email, phone, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Photographers', 'Cinematographers', 'Editors', 'Labs'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === role
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {role}
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
              {searchQuery ? 'No members match your search query.' : 'Add your first photographer, video editor, or album lab partner.'}
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
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
            >
              {/* Top Row: Avatar & Roles */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
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
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                        {member.primary_role}
                      </span>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setMemberToEdit(member);
                        setIsAddModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                      title="Edit Member"
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

                {/* Multi-Role Tags */}
                {member.roles && member.roles.length > 1 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {member.roles.map((r) => (
                      <span key={r} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-600">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions & Security Summary */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {member.permissions?.leads_access === 'FULL_EDIT' 
                      ? 'Full CRM Access' 
                      : member.permissions?.leads_access === 'ASSIGNED_ONLY'
                        ? 'Assigned Leads Only'
                        : 'Restricted Partner'}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          ))}
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

    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Check, 
  X, 
  Search, 
  Layers, 
  Calendar, 
  Film, 
  Users, 
  CheckSquare, 
  Square, 
  ShieldCheck,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseClientExtended, serializeClientExtended } from '@/components/clients/client-insider-modal';
import { isInHouseMember, getDedupedInHouseMembers, getGroupedTeamMembers, getMemberDisplayRole, isOwnerMember } from '@/lib/team-helpers';

export interface ProjectManagerAssignClient {
  id: string;
  name: string;
  workspace_id?: string | null;
  phone?: string | null;
  event_type?: string | null;
  project_manager_id?: string | null;
  project_manager_name?: string | null;
  notes?: string | null;
}

export interface ProjectManagerAssignMember {
  id: string;
  name: string;
  role?: string | null;
  primary_role?: string | null;
  roles?: string[];
  primary_type?: string | null;
  member_types?: string[];
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface ProjectManagerAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ProjectManagerAssignClient | null;
  teamMembers: ProjectManagerAssignMember[];
  onAssigned?: (result: {
    memberId: string | null;
    memberName: string | null;
    modules: {
      clientDirectory: boolean;
      bookingsEvents: boolean;
      postProduction: boolean;
    };
  }) => void;
}

export const ProjectManagerAssignModal: React.FC<ProjectManagerAssignModalProps> = ({
  isOpen,
  onClose,
  client,
  teamMembers,
  onAssigned
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Module targeting state - Default: ALL CHECKED
  const [targetModules, setTargetModules] = useState({
    all: true,
    clientDirectory: true,
    bookingsEvents: true,
    postProduction: true
  });

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen && client) {
      const ext = parseClientExtended(client as any);
      const effectivePMId = client.project_manager_id || ext.project_manager_id || null;
      const effectivePMName = (client.project_manager_name || ext.project_manager_name || '').trim();

      // Find matching member in teamMembers by ID or Name
      const matchedMember = teamMembers.find(m => 
        (effectivePMId && m.id === effectivePMId) ||
        (effectivePMName && m.name && m.name.toLowerCase().trim() === effectivePMName.toLowerCase())
      );

      if (matchedMember) {
        setSelectedMemberId(matchedMember.id);
        setSelectedMemberName(matchedMember.name);
      } else if (effectivePMId || effectivePMName) {
        setSelectedMemberId(effectivePMId);
        setSelectedMemberName(effectivePMName || null);
      } else {
        setSelectedMemberId(null);
        setSelectedMemberName(null);
      }
      setSearchQuery('');
      setTargetModules({
        all: true,
        clientDirectory: true,
        bookingsEvents: true,
        postProduction: true
      });
    }
  }, [isOpen, client, teamMembers]);

  // Handle master "All" toggle
  const handleToggleAll = () => {
    const nextAll = !targetModules.all;
    setTargetModules({
      all: nextAll,
      clientDirectory: nextAll,
      bookingsEvents: nextAll,
      postProduction: nextAll
    });
  };

  // Handle individual module toggle
  const handleToggleModule = (key: 'clientDirectory' | 'bookingsEvents' | 'postProduction') => {
    const nextState = {
      ...targetModules,
      [key]: !targetModules[key]
    };
    // If all three individual are checked, set all: true, else false
    const allChecked = nextState.clientDirectory && nextState.bookingsEvents && nextState.postProduction;
    setTargetModules({
      ...nextState,
      all: allChecked
    });
  };

  // Group and deduplicate team members into In-House and Freelancers/Vendors
  const { inHouse: inHouseList, freelancers: freelancerList } = useMemo(() => {
    return getGroupedTeamMembers(teamMembers);
  }, [teamMembers]);

  const filteredInHouse = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return inHouseList;
    return inHouseList.filter(m => 
      m.name.toLowerCase().includes(q) || 
      getMemberDisplayRole(m).toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  }, [inHouseList, searchQuery]);

  const filteredFreelancers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return freelancerList;
    return freelancerList.filter(m => 
      m.name.toLowerCase().includes(q) || 
      getMemberDisplayRole(m).toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  }, [freelancerList, searchQuery]);

  // Execute assignment save via robust server-side endpoint
  const handleSaveAssignment = async () => {
    if (!client) return;
    setIsSubmitting(true);

    try {
      const matchedMember = teamMembers.find(m => 
        (selectedMemberId && m.id === selectedMemberId) ||
        (selectedMemberName && m.name && m.name.toLowerCase().trim() === selectedMemberName.toLowerCase().trim())
      );
      const effectivePmId = matchedMember ? matchedMember.id : selectedMemberId;
      const effectivePmName = matchedMember ? matchedMember.name : selectedMemberName;
      const pmEmail = matchedMember?.email || null;
      const pmPhone = matchedMember?.phone || null;

      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id;

      // Call robust server endpoint using supabaseAdmin to guarantee persistence across all 4 modules
      const res = await fetch('/api/workspace/sync-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_pm',
          clientId: client.id,
          projectId: (client as any).project_id || client.id,
          leadId: (client as any).lead_id,
          clientName: client.name,
          pmId: effectivePmId || null,
          pmName: effectivePmName || null,
          pmEmail: pmEmail || null,
          pmPhone: pmPhone || null,
          modules: targetModules,
          workspaceId
        })
      });

      const jsonRes = await res.json();
      if (!jsonRes.success) {
        throw new Error(jsonRes.error || 'Failed to save Project Manager assignment');
      }

      // CRITICAL: Immediately update localStorage & sessionStorage cached clients so outside & inside cards update in 0ms!
      if (typeof window !== 'undefined') {
        try {
          const patchCachedList = (rawJson: string | null) => {
            if (!rawJson) return null;
            const parsed = JSON.parse(rawJson);
            if (!Array.isArray(parsed)) return null;
            return parsed.map((c: any) => {
              if (c.id !== client.id) return c;
              const oldExt = parseClientExtended(c);
              const newExt = {
                ...oldExt,
                project_manager_id: effectivePmId || '',
                project_manager_name: effectivePmName || '',
                project_manager_email: pmEmail || '',
                project_manager_phone: pmPhone || '',
              };
              const updatedClient = {
                ...c,
                project_manager_id: effectivePmId,
                project_manager_name: effectivePmName,
                project_manager_email: pmEmail,
                project_manager_phone: pmPhone,
                notes: serializeClientExtended(newExt),
              };
              try {
                sessionStorage.setItem(`sc_client_snapshot_${client.id}`, JSON.stringify(updatedClient));
              } catch (_) {}
              return updatedClient;
            });
          };

          const legacyPatched = patchCachedList(localStorage.getItem('sc_cached_clients'));
          if (legacyPatched) localStorage.setItem('sc_cached_clients', JSON.stringify(legacyPatched));

          const activeWsId = client.workspace_id || workspaceId || localStorage.getItem('sc_active_workspace_id');
          if (activeWsId) {
            const wsKey = `sc_cached_clients_${activeWsId}`;
            const wsPatched = patchCachedList(localStorage.getItem(wsKey));
            if (wsPatched) localStorage.setItem(wsKey, JSON.stringify(wsPatched));
          }
          localStorage.setItem('sc_booking_sync_event', Date.now().toString());
        } catch (_) {}
      }

      // Dispatch global window events for instant sub-millisecond multi-tab sync
      window.dispatchEvent(new CustomEvent('client_updated', { detail: { pmId: effectivePmId, pmName: effectivePmName } }));
      window.dispatchEvent(new CustomEvent('workspace_client_updated', { detail: { clientId: client.id, pmId: effectivePmId, pmName: effectivePmName } }));
      window.dispatchEvent(new CustomEvent('post_production_updated', { detail: { pmId: effectivePmId, pmName: effectivePmName } }));
      window.dispatchEvent(new CustomEvent('team_events_updated', { detail: { pmId: effectivePmId, pmName: effectivePmName } }));

      onAssigned?.({
        memberId: effectivePmId,
        memberName: effectivePmName,
        modules: {
          clientDirectory: targetModules.clientDirectory,
          bookingsEvents: targetModules.bookingsEvents,
          postProduction: targetModules.postProduction
        }
      });

      onClose();
    } catch (err: any) {
      console.error('[ProjectManagerAssignModal] Save error:', err);
      alert(`Failed to save Project Manager assignment: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = [
    targetModules.clientDirectory,
    targetModules.bookingsEvents,
    targetModules.postProduction
  ].filter(Boolean).length;

  return (
    <AnimatePresence>
      {isOpen && client && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4 relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    Assign Project Manager
                  </h3>
                  <p className="text-xs text-amber-800 font-bold truncate max-w-[220px]">
                    {client.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Modules Granular Checklist (3D Cream Box) */}
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900/80 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Target Workspace Modules
                </span>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition"
                >
                  {targetModules.all ? (
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>All ({selectedCount}/3)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Client Directory */}
                <button
                  type="button"
                  onClick={() => handleToggleModule('clientDirectory')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    targetModules.clientDirectory
                      ? 'bg-white border-amber-400 text-amber-950 shadow-2xs font-black'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Users className={`w-3.5 h-3.5 shrink-0 ${targetModules.clientDirectory ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs truncate">Client Dir</span>
                  </div>
                  {targetModules.clientDirectory && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>

                {/* 2. Bookings & Events */}
                <button
                  type="button"
                  onClick={() => handleToggleModule('bookingsEvents')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    targetModules.bookingsEvents
                      ? 'bg-white border-amber-400 text-amber-950 shadow-2xs font-black'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${targetModules.bookingsEvents ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs truncate">Events</span>
                  </div>
                  {targetModules.bookingsEvents && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>

                {/* 3. Post Production */}
                <button
                  type="button"
                  onClick={() => handleToggleModule('postProduction')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    targetModules.postProduction
                      ? 'bg-white border-amber-400 text-amber-950 shadow-2xs font-black'
                      : 'bg-slate-50/80 border-slate-200 text-slate-400 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Film className={`w-3.5 h-3.5 shrink-0 ${targetModules.postProduction ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs truncate">Post Prod</span>
                  </div>
                  {targetModules.postProduction && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>
              </div>

              {selectedCount < 3 && selectedCount > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold pt-1">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Unselected modules will be unassigned automatically.</span>
                </div>
              )}
            </div>

            {/* In-House PM Selector Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Select Project Manager
                </label>
                {selectedMemberName && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 truncate max-w-[170px]">
                    Active: {selectedMemberName}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search team members by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800 shadow-2xs"
                />
              </div>

              {/* Members Scrollable List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {/* Option: Unassign / Clear */}
                {(() => {
                  const isUnassignedSelected = !selectedMemberId && !selectedMemberName;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(null);
                        setSelectedMemberName(null);
                      }}
                      className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isUnassignedSelected
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-black shadow-2xs'
                          : 'bg-white hover:bg-rose-50/50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center">
                          ✕
                        </span>
                        <span className="text-xs font-bold">Unassigned / Remove PM</span>
                      </div>
                      {isUnassignedSelected && <Check className="w-4 h-4 text-rose-600" />}
                    </button>
                  );
                })()}

                {/* CURRENTLY ASSIGNED SECTION (Immediately below Unassigned / Clear) */}
                {(() => {
                  const isAssigned = Boolean(selectedMemberId || selectedMemberName);
                  if (!isAssigned) return null;
                  const activeMem = teamMembers.find(m => 
                    (selectedMemberId && m.id === selectedMemberId) ||
                    (selectedMemberName && m.name?.toLowerCase().trim() === selectedMemberName.toLowerCase().trim())
                  );
                  const activeName = activeMem?.name || selectedMemberName || 'Assigned Member';
                  const initials = activeName.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const displayRole = activeMem ? getMemberDisplayRole(activeMem) : 'Project Manager';

                  return (
                    <div className="space-y-1 pt-0.5">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100/90 rounded-xl flex items-center justify-between border border-emerald-200">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                          <span>Currently Assigned</span>
                        </span>
                        <span className="text-[9px] font-extrabold bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded-full">
                          Active
                        </span>
                      </div>

                      <div className="w-full p-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-950 font-black shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {activeMem?.avatar_url ? (
                            <img
                              src={activeMem.avatar_url}
                              alt={activeName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-emerald-400/40 shadow-xs"
                            />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-emerald-400 shadow-xs">
                              {initials}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">{activeName}</p>
                            <p className="text-[10px] text-emerald-700 font-semibold truncate">{displayRole}</p>
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })()}

                {/* SECTION 1: IN-HOUSE TEAM (TAGGED) */}
                {filteredInHouse.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/80 rounded-xl flex items-center justify-between border border-amber-200">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-amber-700" />
                        <span>In-House Team</span>
                      </span>
                      <span className="text-[9px] font-extrabold bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded-full">
                        {filteredInHouse.length}
                      </span>
                    </div>

                    {filteredInHouse.map((member) => {
                      const isSelected = Boolean(
                        (selectedMemberId && member.id === selectedMemberId) ||
                        (selectedMemberName && member.name?.toLowerCase().trim() === selectedMemberName.toLowerCase().trim())
                      );
                      const isOwner = isOwnerMember(member);
                      const displayRole = getMemberDisplayRole(member);
                      const initials = member.name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setSelectedMemberName(member.name);
                          }}
                          className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-2xs'
                              : 'bg-white hover:bg-amber-50/40 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-amber-400/40 shadow-xs"
                              />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-amber-400 shadow-xs">
                                {initials}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                {isOwner && (
                                  <span className="text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                                    👑 Owner
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] truncate ${isOwner ? 'text-amber-800 font-bold' : 'text-slate-500 font-medium'}`}>
                                {displayRole}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* SECTION 2: FREELANCERS & VENDORS (TAGGED) */}
                {filteredFreelancers.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-700 bg-stone-100/90 rounded-xl flex items-center justify-between border border-stone-200">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-stone-600" />
                        <span>Freelancers & External Vendors</span>
                      </span>
                      <span className="text-[9px] font-extrabold bg-stone-200 text-stone-800 px-1.5 py-0.2 rounded-full">
                        {filteredFreelancers.length}
                      </span>
                    </div>

                    {filteredFreelancers.map((member) => {
                      const isSelected = Boolean(
                        (selectedMemberId && member.id === selectedMemberId) ||
                        (selectedMemberName && member.name?.toLowerCase().trim() === selectedMemberName.toLowerCase().trim())
                      );
                      const initials = member.name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setSelectedMemberName(member.name);
                          }}
                          className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-2xs'
                              : 'bg-white hover:bg-stone-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-stone-300 shadow-xs"
                              />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 border border-slate-300 shadow-xs">
                                {initials}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">{getMemberDisplayRole(member)}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredInHouse.length === 0 && filteredFreelancers.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No matching team members found
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#EAE5DA] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={isSubmitting || selectedCount === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Apply Assignment</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

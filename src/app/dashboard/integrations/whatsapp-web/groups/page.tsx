'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Plus, Search, MoreVertical, Edit2, Trash2, Eraser,
  FolderOpen, Calendar, HelpCircle, RefreshCw, X, CheckCircle, Lock,
  FileText, UserCheck, ShieldAlert
} from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

interface ContactGroup {
  id: string;
  group_name: string;
  group_description: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  whatsapp_group_id: string | null;
}

function WhatsAppGroupsHubCore() {
  const router = useRouter();
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  // Data States
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Drawer States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  
  // Selected / Editing States
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Contact Groups
      const groupRes = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${tenantId}`);
      const groupData = await groupRes.json();
      const fetchedGroups = groupData.success ? (groupData.results || []) : [];

      // 2. Fetch Leads to calculate dynamic aggregate contact counts
      const { data: fetchedLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('id, name, phone, email, whatsapp_group_id')
        .eq('workspace_id', tenantId);

      setLeads(fetchedLeads || []);
      setGroups(fetchedGroups);
      
      // Sync to local storage for offline sandbox fallbacks
      localStorage.setItem(`wa_contact_groups_${tenantId}`, JSON.stringify(fetchedGroups));
    } catch (err) {
      console.warn('Fallback loading data locally due to offline state');
      const fallbackGroups = localStorage.getItem(`wa_contact_groups_${tenantId}`);
      if (fallbackGroups) setGroups(JSON.parse(fallbackGroups));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  // Click outside menu listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter groups
  const filteredGroups = groups.filter(g =>
    g.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.group_description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get dynamic count of linked contacts per group
  const getLinkedContactsCount = (groupId: string) => {
    return leads.filter(l => l.whatsapp_group_id === groupId).length;
  };

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName.trim(),
          group_description: groupDesc.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setGroupName('');
        setGroupDesc('');
        setShowCreateModal(false);
        setSuccessMessage('Contact group created successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      // Local fallback
      const newGroup: ContactGroup = {
        id: `local-group-${Date.now()}`,
        group_name: groupName.trim(),
        group_description: groupDesc.trim(),
        created_at: new Date().toISOString()
      };
      const updated = [newGroup, ...groups];
      setGroups(updated);
      localStorage.setItem(`wa_contact_groups_${tenantId}`, JSON.stringify(updated));
      setGroupName('');
      setGroupDesc('');
      setShowCreateModal(false);
      setSuccessMessage('Saved to local sandbox database!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Metadata
  const handleEditClick = (group: ContactGroup) => {
    setSelectedGroup(group);
    setGroupName(group.group_name);
    setGroupDesc(group.group_description || '');
    setShowEditModal(true);
    setActiveMenuId(null);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !groupName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${tenantId}&group_id=${selectedGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName.trim(),
          group_description: groupDesc.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedGroup(null);
        setSuccessMessage('Group metadata updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const updated = groups.map(g => g.id === selectedGroup.id ? {
        ...g,
        group_name: groupName.trim(),
        group_description: groupDesc.trim()
      } : g);
      setGroups(updated);
      localStorage.setItem(`wa_contact_groups_${tenantId}`, JSON.stringify(updated));
      setShowEditModal(false);
      setSelectedGroup(null);
      setSuccessMessage('Updated local sandbox metadata!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Clear Group Records (Dissociate leads)
  const handleClearGroup = async (group: ContactGroup) => {
    const count = getLinkedContactsCount(group.id);
    if (count === 0) {
      alert('This group has no linked contacts.');
      setActiveMenuId(null);
      return;
    }
    if (!confirm(`Are you sure you want to dissociate all ${count} contacts from "${group.group_name}"?`)) {
      setActiveMenuId(null);
      return;
    }

    setActionLoading(true);
    try {
      // Set group ID to null for all leads currently in this group
      const groupLeadIds = leads.filter(l => l.whatsapp_group_id === group.id).map(l => l.id);
      
      const { error } = await supabase
        .from('leads')
        .update({ whatsapp_group_id: null })
        .in('id', groupLeadIds);

      if (error) throw error;

      setSuccessMessage('Cleared all group members successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err) {
      // Simulate client-side update
      setLeads(prev => prev.map(l => l.whatsapp_group_id === group.id ? { ...l, whatsapp_group_id: null } : l));
      setSuccessMessage('Cleared group members in sandbox mode.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setActionLoading(false);
      setActiveMenuId(null);
    }
  };

  // Delete Group Container
  const handleDeleteGroup = async (group: ContactGroup) => {
    if (!confirm(`Are you sure you want to delete the group "${group.group_name}"? Members will be unassigned.`)) {
      setActiveMenuId(null);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${tenantId}&group_id=${group.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Group container deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const updated = groups.filter(g => g.id !== group.id);
      setGroups(updated);
      localStorage.setItem(`wa_contact_groups_${tenantId}`, JSON.stringify(updated));
      setSuccessMessage('Deleted from local sandbox database.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setActionLoading(false);
      setActiveMenuId(null);
    }
  };

  // View Members Action
  const handleViewMembers = (group: ContactGroup) => {
    setSelectedGroup(group);
    setShowMembersDrawer(true);
    setActiveMenuId(null);
  };

  // Analytics variables
  const totalGroups = groups.length;
  const segmentedContacts = leads.filter(l => l.whatsapp_group_id !== null).length;
  const avgGroupSize = totalGroups > 0 ? Math.round(segmentedContacts / totalGroups) : 0;

  return (
    <div className="w-full min-h-screen bg-[#070708] text-white flex flex-col overflow-hidden font-sans">
      
      {/* ═══ TOP HEADER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/70 bg-[#070708]/90 backdrop-blur-lg z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/integrations/whatsapp-web')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase block leading-none mb-0.5">Integration Console</span>
              <span className="text-sm font-black text-white tracking-tight leading-none">Contact Groups Management Hub</span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-850 text-[10px] text-zinc-450 font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          RLS Bound · tenant/{tenantId.slice(0, 8)}
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50 transform -translate-x-1/2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ═══ ANALYTICS STATS GRID ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 shadow-md">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Total Groups</span>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1.5">
              <span>{totalGroups}</span>
              <span className="text-zinc-650 text-xs font-medium">containers</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 shadow-md">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Segmented Contacts</span>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1.5">
              <span className="text-emerald-400">{segmentedContacts}</span>
              <span className="text-zinc-650 text-xs font-medium">/ {leads.length} leads</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 shadow-md">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Average Group Size</span>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1.5">
              <span>{avgGroupSize}</span>
              <span className="text-zinc-650 text-xs font-medium">contacts</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 shadow-md">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Unsegmented Leads</span>
            <div className="text-xl font-black mt-1 flex items-baseline gap-1.5">
              <span className="text-amber-400">{leads.length - segmentedContacts}</span>
              <span className="text-zinc-650 text-xs font-medium">pending</span>
            </div>
          </div>
        </div>

        {/* ═══ FILTER & ACTIONS BAR ═══ */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search group name or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-zinc-550 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setGroupName('');
              setGroupDesc('');
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-102 shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Contact Group
          </button>
        </div>

        {/* ═══ DATA TABLE SECTION (UNIVERSAL RESPONSIVENESS LAW) ═══ */}
        <div className="w-full overflow-hidden border border-zinc-900 bg-zinc-950/20 rounded-2xl shadow-xl relative">
          
          <div className="overflow-x-auto scroller-thin w-full">
            <table className="w-full text-left border-collapse text-zinc-350 min-w-[700px] table-fixed">
              
              <colgroup>
                <col className="w-[200px]" />
                <col />
                <col className="w-[140px]" />
                <col className="w-[180px]" />
                <col className="w-[70px]" />
              </colgroup>

              <thead>
                <tr className="border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950/60 select-none">
                  <th className="py-4 px-5">Group Name</th>
                  <th className="py-4 px-4">Description</th>
                  <th className="py-4 px-4 text-center">Linked Contacts</th>
                  <th className="py-4 px-4">Last Modified</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900/50 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Loading contact group segments...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-2.5">
                        <Users className="w-8 h-8 text-zinc-700" />
                        <p className="font-semibold text-xs text-zinc-400">No contact groups segment matches found</p>
                        <p className="text-[10px] text-zinc-650 max-w-xs">Create your first mailing group to automate workflows based on category segments.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map(group => {
                    const count = getLinkedContactsCount(group.id);
                    const formattedDate = new Date(group.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <tr
                        key={group.id}
                        className="hover:bg-zinc-900/20 border-b border-zinc-900/60 transition-colors"
                      >
                        {/* Name */}
                        <td className="py-4 px-5 font-black text-white truncate">
                          {group.group_name}
                        </td>

                        {/* Description */}
                        <td className="py-4 px-4 text-zinc-400 font-medium truncate">
                          {group.group_description || <span className="text-zinc-650 italic text-[11px]">No description</span>}
                        </td>

                        {/* Linked Contacts Count badge */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                            count > 0 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                          }`}>
                            <Users className="w-3 h-3" />
                            {count}
                          </span>
                        </td>

                        {/* Last Modified */}
                        <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">
                          {formattedDate}
                        </td>

                        {/* Actions Menu */}
                        <td className="py-4 px-5 text-right relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === group.id ? null : group.id)}
                            className="p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-550 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === group.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-5 top-11 mt-1 w-48 bg-zinc-950 border border-zinc-850 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 z-40 text-left"
                            >
                              <button
                                onClick={() => handleViewMembers(group)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                View Members
                              </button>

                              <button
                                onClick={() => handleEditClick(group)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                Edit Metadata
                              </button>

                              <button
                                onClick={() => handleClearGroup(group)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                              >
                                <Eraser className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                Clear Group Members
                              </button>

                              <div className="h-[1px] bg-zinc-900 my-0.5" />

                              <button
                                onClick={() => handleDeleteGroup(group)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-450 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                Delete Group Container
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

        </div>

      </div>

      {/* ═══ CREATE GROUP MODAL ═══ */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-[92%] max-w-md h-fit bg-zinc-950 border border-zinc-850 p-6 rounded-3xl shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-emerald-400" />
                  Create Contact Group Segment
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-550 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Pre-Wedding Clients"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="e.g. Automatically tracks target prospects for pre-wedding portfolio followups."
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-855 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-zinc-850 hover:bg-zinc-900 rounded-xl text-zinc-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-500 text-black font-extrabold rounded-xl hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ EDIT GROUP MODAL ═══ */}
      <AnimatePresence>
        {showEditModal && selectedGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-[92%] max-w-md h-fit bg-zinc-950 border border-zinc-855 p-6 rounded-3xl shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Edit Group Metadata
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-550 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wedding Shoots 2026"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Describe group segment..."
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/40 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-zinc-850 hover:bg-zinc-900 rounded-xl text-zinc-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-500 text-black font-extrabold rounded-xl hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ VIEW MEMBERS DRAWER ═══ */}
      <AnimatePresence>
        {showMembersDrawer && selectedGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersDrawer(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[90%] sm:w-[480px] bg-zinc-950 border-l border-zinc-850 z-50 p-6 flex flex-col shadow-2xl text-white"
            >
              <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-zinc-900">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">Segment Membership List</span>
                  <h3 className="text-sm font-black text-white mt-0.5">{selectedGroup.group_name}</h3>
                </div>
                <button
                  onClick={() => setShowMembersDrawer(false)}
                  className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-550 hover:text-white transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 scroller-thin">
                {leads.filter(l => l.whatsapp_group_id === selectedGroup.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-xs italic">
                    <UserCheck className="w-8 h-8 text-zinc-800 mb-2 shrink-0" />
                    No members assigned to this contact group.
                  </div>
                ) : (
                  leads.filter(l => l.whatsapp_group_id === selectedGroup.id).map(member => (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-2xl bg-zinc-900/30 border border-zinc-900/60 hover:border-zinc-800/80 transition-all flex items-start justify-between group"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-450 transition-colors block">
                          {member.name || 'Unspecified Name'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-1">
                          <span>📞 {member.phone}</span>
                          {member.email && <span>• ✉️ {member.email}</span>}
                        </div>
                      </div>

                      {/* Dissociate button */}
                      <button
                        onClick={async () => {
                          if (confirm(`Remove "${member.name || member.phone}" from this group?`)) {
                            try {
                              await supabase
                                .from('leads')
                                .update({ whatsapp_group_id: null })
                                .eq('id', member.id);
                              
                              setLeads(prev => prev.map(l => l.id === member.id ? { ...l, whatsapp_group_id: null } : l));
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="p-1.5 opacity-0 group-hover:opacity-100 bg-zinc-950 border border-zinc-900 hover:border-rose-900 hover:text-rose-450 rounded-lg text-zinc-550 transition-all"
                        title="Remove member"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex-shrink-0 pt-4 border-t border-zinc-900">
                <button
                  onClick={() => setShowMembersDrawer(false)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Close Members Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ FOOTER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-zinc-900 bg-zinc-950/60 text-[9px] text-zinc-600 font-mono">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          BRAHMASTRA LAW 1 — tenant_id relational bounds locked
        </span>
        <span>WhatsApp Hub v2.1</span>
      </div>

    </div>
  );
}

export default function WhatsAppGroupsHubPage() {
  return (
    <BhamstraProvider>
      <WhatsAppGroupsHubCore />
    </BhamstraProvider>
  );
}

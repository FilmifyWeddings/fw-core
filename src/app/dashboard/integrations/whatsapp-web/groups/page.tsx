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

  // Drawer / Add Lead States
  const [selectedLeadIdToAdd, setSelectedLeadIdToAdd] = useState('');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [showLeadSuggestions, setShowLeadSuggestions] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

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

  // Add Member to Group Action
  const handleAddLeadToGroup = async (leadId: string) => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ whatsapp_group_id: selectedGroup.id })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, whatsapp_group_id: selectedGroup.id } : l));
      setLeadSearchQuery('');
      setSelectedLeadIdToAdd('');
      setShowLeadSuggestions(false);
      
      setSuccessMessage('Member added to group successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.warn('Fallback update lead to group in sandbox');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, whatsapp_group_id: selectedGroup.id } : l));
      setLeadSearchQuery('');
      setSelectedLeadIdToAdd('');
      setShowLeadSuggestions(false);
      
      setSuccessMessage('Added member to group in sandbox mode!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } finally {
      setActionLoading(false);
    }
  };

  // Analytics variables
  const totalGroups = groups.length;
  const segmentedContacts = leads.filter(l => l.whatsapp_group_id !== null).length;
  const avgGroupSize = totalGroups > 0 ? Math.round(segmentedContacts / totalGroups) : 0;

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#070708] text-slate-900 dark:text-white flex flex-col overflow-hidden font-sans">
      
      {/* ═══ TOP HEADER (Image 2 style) ═══ */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-zinc-800/70 bg-white dark:bg-[#070708]/90 backdrop-blur-lg z-30 gap-4">
        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-500 font-medium select-none">
            <span className="hover:text-slate-600 dark:hover:text-zinc-350 cursor-pointer" onClick={() => router.push('/dashboard')}>Dashboard</span>
            <span>•</span>
            <span className="hover:text-slate-600 dark:hover:text-zinc-350 cursor-pointer">Group</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-zinc-400 font-semibold">List</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 leading-none">List</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/integrations/whatsapp-web')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <button
            onClick={() => {
              setGroupName('');
              setGroupDesc('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white dark:text-black text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-50 transform -translate-x-1/2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* ═══ ANALYTICS STATS GRID ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider block">Total Groups</span>
            <div className="text-lg font-black mt-1 flex items-baseline gap-1.5 text-slate-800 dark:text-white">
              <span>{totalGroups}</span>
              <span className="text-slate-400 dark:text-zinc-650 text-[10px] font-medium">containers</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider block">Segmented Contacts</span>
            <div className="text-lg font-black mt-1 flex items-baseline gap-1.5 text-slate-800 dark:text-white">
              <span className="text-emerald-600 dark:text-emerald-400">{segmentedContacts}</span>
              <span className="text-slate-400 dark:text-zinc-655 text-[10px] font-medium">/ {leads.length} leads</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider block">Average Group Size</span>
            <div className="text-lg font-black mt-1 flex items-baseline gap-1.5 text-slate-800 dark:text-white">
              <span>{avgGroupSize}</span>
              <span className="text-slate-400 dark:text-zinc-650 text-[10px] font-medium">contacts</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider block">Unsegmented Leads</span>
            <div className="text-lg font-black mt-1 flex items-baseline gap-1.5 text-slate-800 dark:text-white">
              <span className="text-amber-600 dark:text-amber-400">{leads.length - segmentedContacts}</span>
              <span className="text-slate-400 dark:text-zinc-650 text-[10px] font-medium">pending</span>
            </div>
          </div>
        </div>

        {/* ═══ SEARCH FILTER BAR ═══ */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-zinc-550" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40 transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:text-zinc-550 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ═══ TABLE DATA MATRIX (Mirroring Image 2 layout) ═══ */}
        <div className="w-full overflow-hidden border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 rounded-xl shadow-xs relative">
          
          <div className="overflow-x-auto scroller-thin w-full">
            <table className="w-full text-left border-collapse text-slate-600 dark:text-zinc-350 min-w-[700px] table-fixed">
              
              <colgroup>
                <col className="w-[50px]" />
                <col className="w-[200px]" />
                <col />
                <col className="w-[140px]" />
                <col className="w-[180px]" />
                <col className="w-[60px]" />
              </colgroup>

              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-900 text-[11px] font-bold text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-950/60 select-none">
                  <th className="py-3 px-4 text-center">
                    <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer" readOnly checked={false} />
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Linked Contacts</th>
                  <th className="py-3 px-4">Last Modified</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/50 text-xs font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400 dark:text-emerald-400" />
                        <span>Loading contact group segments...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 dark:text-zinc-500">
                      <div className="flex flex-col items-center gap-2.5">
                        <Users className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                        <p className="font-semibold text-xs text-slate-700 dark:text-zinc-400">No contact groups segment matches found</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-650 max-w-xs">Create your first mailing group to automate workflows based on category segments.</p>
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
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 border-b border-slate-100 dark:border-zinc-900/60 transition-colors"
                      >
                        {/* Checkbox column */}
                        <td className="py-4 px-4 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer" readOnly checked={false} />
                        </td>

                        {/* Name */}
                        <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white truncate">
                          <span 
                            onClick={() => handleViewMembers(group)} 
                            className="cursor-pointer hover:underline text-slate-900 dark:text-white"
                          >
                            {group.group_name}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-4 px-4 text-slate-500 dark:text-zinc-400 truncate">
                          {group.group_description || <span className="text-slate-400 dark:text-zinc-650 italic text-[11px]">No description</span>}
                        </td>

                        {/* Linked Contacts Count badge */}
                        <td className="py-4 px-4 text-center">
                          <span 
                            onClick={() => handleViewMembers(group)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:scale-105 transition-transform ${
                              count > 0 
                                ? 'bg-blue-50 dark:bg-emerald-500/10 border-blue-200 dark:border-emerald-500/20 text-blue-600 dark:text-emerald-400' 
                                : 'bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600'
                            }`}
                          >
                            {count}
                          </span>
                        </td>

                        {/* Last Modified */}
                        <td className="py-4 px-4 text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
                          {formattedDate}
                        </td>

                        {/* Actions Menu */}
                        <td className="py-4 px-4 text-right relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === group.id ? null : group.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-lg text-slate-400 dark:text-zinc-550 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === group.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-4 top-10 mt-1 w-48 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-855 rounded-xl p-1 shadow-lg flex flex-col gap-1 z-40 text-left"
                            >
                              <button
                                onClick={() => handleViewMembers(group)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                View Members
                              </button>

                              <button
                                onClick={() => handleEditClick(group)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Edit Metadata
                              </button>

                              <button
                                onClick={() => handleClearGroup(group)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <Eraser className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                Clear Group Members
                              </button>

                              <div className="h-[1px] bg-slate-100 dark:bg-zinc-900 my-0.5" />

                              <button
                                onClick={() => handleDeleteGroup(group)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-450 transition-colors"
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
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-[92%] max-w-md h-fit bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-855 p-6 rounded-2xl shadow-2xl space-y-4 text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-900">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-slate-900 dark:text-emerald-400" />
                  Create Contact Group Segment
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-slate-400 hover:text-slate-900 dark:text-zinc-550 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Pre-Wedding Clients"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="e.g. Automatically tracks target prospects for pre-wedding portfolio followups."
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-slate-500 dark:text-zinc-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-black font-extrabold rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-600 disabled:opacity-50"
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
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-[92%] max-w-md h-fit bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-855 p-6 rounded-2xl shadow-2xl space-y-4 text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-900">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Edit Group Metadata
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-slate-400 hover:text-slate-900 dark:text-zinc-550 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wedding Shoots 2026"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Describe group segment..."
                    value={groupDesc}
                    onChange={e => setGroupDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-850 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl text-slate-500 dark:text-zinc-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-900 dark:bg-emerald-500 text-white dark:text-black font-extrabold rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ VIEW MEMBERS DRAWER (Searchable add & remove) ═══ */}
      <AnimatePresence>
        {showMembersDrawer && selectedGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersDrawer(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[90%] sm:w-[480px] bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-850 z-50 p-6 flex flex-col shadow-2xl text-slate-900 dark:text-white"
            >
              {/* Drawer Header */}
              <div className="flex-shrink-0 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-900">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider">Segment Membership List</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{selectedGroup.group_name}</h3>
                </div>
                <button
                  onClick={() => setShowMembersDrawer(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl text-slate-400 dark:text-zinc-550 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Searchable Add Contact Combobox Section */}
              <div className="flex-shrink-0 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-900 p-4 rounded-2xl space-y-2 mt-4 mb-2 relative">
                <h4 className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> Add Contact to Group
                </h4>
                
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search contact by name or phone..."
                      value={leadSearchQuery}
                      onFocus={() => setShowLeadSuggestions(true)}
                      onChange={(e) => {
                        setLeadSearchQuery(e.target.value);
                        setShowLeadSuggestions(true);
                      }}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40"
                    />
                    {leadSearchQuery && (
                      <button
                        onClick={() => {
                          setLeadSearchQuery('');
                          setShowLeadSuggestions(false);
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions list dropdown */}
                  <AnimatePresence>
                    {showLeadSuggestions && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowLeadSuggestions(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-zinc-900 scroller-thin text-xs text-slate-800 dark:text-zinc-200"
                        >
                          {leads
                            .filter(l => l.whatsapp_group_id !== selectedGroup.id)
                            .filter(l => {
                              if (!leadSearchQuery) return true;
                              const search = leadSearchQuery.toLowerCase();
                              return (
                                (l.name || '').toLowerCase().includes(search) ||
                                l.phone.toLowerCase().includes(search) ||
                                (l.email || '').toLowerCase().includes(search)
                              );
                            })
                            .slice(0, 15) // limit to top 15 matches for speed
                            .map(lead => (
                              <button
                                key={lead.id}
                                type="button"
                                onClick={() => handleAddLeadToGroup(lead.id)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg flex items-center justify-between group transition-colors"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold block truncate text-slate-900 dark:text-white">
                                    {lead.name || 'Unnamed Lead'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                    📞 {lead.phone}
                                  </span>
                                </div>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Add
                                </span>
                              </button>
                            ))}
                          
                          {leads
                            .filter(l => l.whatsapp_group_id !== selectedGroup.id)
                            .filter(l => {
                              if (!leadSearchQuery) return true;
                              const search = leadSearchQuery.toLowerCase();
                              return (
                                (l.name || '').toLowerCase().includes(search) ||
                                l.phone.toLowerCase().includes(search) ||
                                (l.email || '').toLowerCase().includes(search)
                              );
                            }).length === 0 && (
                            <div className="px-3 py-3 text-center text-slate-400 dark:text-zinc-500 italic text-[11px]">
                              No unassigned leads found.
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Member Search filter inside drawer */}
              <div className="flex-shrink-0 relative my-2">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter active members list..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-300 dark:focus:border-emerald-500/40"
                />
                {memberSearchQuery && (
                  <button onClick={() => setMemberSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Members List Container */}
              <div className="flex-1 overflow-y-auto py-2 space-y-2.5 scroller-thin">
                {leads
                  .filter(l => l.whatsapp_group_id === selectedGroup.id)
                  .filter(l => {
                    if (!memberSearchQuery) return true;
                    const search = memberSearchQuery.toLowerCase();
                    return (
                      (l.name || '').toLowerCase().includes(search) ||
                      l.phone.toLowerCase().includes(search) ||
                      (l.email || '').toLowerCase().includes(search)
                    );
                  }).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-zinc-500 text-xs italic">
                    <UserCheck className="w-8 h-8 text-slate-300 dark:text-zinc-800 mb-2 shrink-0" />
                    No matching members in group.
                  </div>
                ) : (
                  leads
                    .filter(l => l.whatsapp_group_id === selectedGroup.id)
                    .filter(l => {
                      if (!memberSearchQuery) return true;
                      const search = memberSearchQuery.toLowerCase();
                      return (
                        (l.name || '').toLowerCase().includes(search) ||
                        l.phone.toLowerCase().includes(search) ||
                        (l.email || '').toLowerCase().includes(search)
                      );
                    })
                    .map(member => (
                      <div
                        key={member.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-900 hover:border-slate-300 dark:hover:border-zinc-800/80 transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-450 transition-colors block">
                            {member.name || 'Unnamed Lead'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                            <span>📞 {member.phone}</span>
                            {member.email && <span>• ✉️ {member.email}</span>}
                          </div>
                        </div>

                        {/* Remove from group member button */}
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
                          className="p-1.5 opacity-60 group-hover:opacity-100 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 hover:border-rose-300 dark:hover:border-rose-900 hover:text-rose-600 dark:hover:text-rose-450 rounded-lg text-slate-400 transition-all"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="flex-shrink-0 pt-4 border-t border-slate-100 dark:border-zinc-900">
                <button
                  onClick={() => setShowMembersDrawer(false)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Close Members Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ STATUS BAR FOOTER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/60 text-[9px] text-slate-400 dark:text-zinc-600 font-mono">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-emerald-600 shrink-0" />
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

'use client';
import OperationsAnalyticsTab from './components/OperationsAnalyticsTab';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Calendar, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash, ChevronDown, Edit2, TrendingUp, Award, Grid, Menu,
  Database, FileText, Layers, ArrowLeft, SlidersHorizontal, CheckSquare, Folder, Edit3, Pencil, Settings,
  HardDrive, UserPlus, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import AddProjectModal from './components/AddProjectModal';
import AddTeamMemberModal from './components/AddTeamMemberModal';
import TeamSettingsModal from './components/TeamSettingsModal';
import MonthListView from './components/MonthListView';
import Professional3DCalendar from './components/Professional3DCalendar';
import { EventBlockData } from './components/EventBlock';

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

const customStyle = `
  body {
    background-color: #F1F5F9 !important;
    color: #0B111E !important;
  }
`;

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

export default function TeamManagerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'list' | 'calendar' | 'trash'>('projects');
  
  // Real Data State
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
    "Pre-wedding", "Haldi", "Sangeet", "Wedding Ceremony", "Reception"
  ]);
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [instantAlerts, setInstantAlerts] = useState<boolean>(true);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING & HYDRATION FROM SUPABASE
  // ─────────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        await supabase.storage.createBucket('team-avatars', { public: true });
      } catch (e) {
        // Bucket initialized or skipped
      }
      // 1. Fetch Team Members
      const { data: membersData, error: membersErr } = await supabase
        .from('fw_team_members')
        .select('*')
        .order('name', { ascending: true });

      if (membersErr) console.warn('[TeamManager] fw_team_members error:', membersErr.message);
      setTeamMembers(membersData || []);

      // 2. Fetch Projects with sub_events & assignments
      const { data: projectsData, error: projectsErr } = await supabase
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

      if (projectsErr) console.warn('[TeamManager] fw_projects error:', projectsErr.message);
      setProjects(projectsData || []);
    } catch (err: any) {
      console.error('[TeamManager] fetchAllData Exception:', err);
      setError(err?.message || 'Failed to fetch operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
      if (editingMember) {
        const { error: updateErr } = await supabase
          .from('fw_team_members')
          .update(memberData)
          .eq('id', editingMember.id);
        if (updateErr) throw updateErr;
      } else {
        const { data: insertedMember, error: insertErr } = await supabase
          .from('fw_team_members')
          .insert([memberData])
          .select()
          .single();
        if (insertErr) throw insertErr;

        if (activeAssignmentForMember?.assignmentId && insertedMember) {
          await supabase
            .from('fw_assignments')
            .update({ assigned_member_id: insertedMember.id })
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

  // Handle Assignment Update (Assign / Unassign Team Member to Role)
  const handleAssignMember = async (assignmentId: string, memberId: string | null) => {
    try {
      setProjects(prev =>
        prev.map(p => ({
          ...p,
          fw_sub_events: p.fw_sub_events?.map(se => ({
            ...se,
            fw_assignments: se.fw_assignments?.map(a =>
              a.id === assignmentId ? { ...a, assigned_member_id: memberId } : a
            ),
          })),
        }))
      );

      const { error: assignErr } = await supabase
        .from('fw_assignments')
        .update({ assigned_member_id: memberId })
        .eq('id', assignmentId);

      if (assignErr) {
        console.error('[TeamManager] Assignment update error:', assignErr.message);
        fetchAllData();
      }
    } catch (err) {
      console.error('[TeamManager] handleAssignMember Exception:', err);
      fetchAllData();
    }
  };

  // Handle Project Creation & Update with Multi-Sub-Event Blocks
  const handleSaveProject = async (
    couplingName: string,
    blocks: EventBlockData[],
    projectId?: string
  ) => {
    try {
      let targetProjectId = projectId;

      if (projectId) {
        const { error: projErr } = await supabase
          .from('fw_projects')
          .update({ client_name: couplingName, updated_at: new Date().toISOString() })
          .eq('id', projectId);
        if (projErr) throw projErr;

        const { data: existingSubEvents } = await supabase
          .from('fw_sub_events')
          .select('id')
          .eq('project_id', projectId);

        if (existingSubEvents && existingSubEvents.length > 0) {
          const subEventIds = existingSubEvents.map(se => se.id);
          await supabase.from('fw_assignments').delete().in('sub_event_id', subEventIds);
          await supabase.from('fw_sub_events').delete().eq('project_id', projectId);
        }
      } else {
        const { data: newProj, error: projErr } = await supabase
          .from('fw_projects')
          .insert([{ client_name: couplingName }])
          .select()
          .single();
        if (projErr) throw projErr;
        targetProjectId = newProj.id;
      }

      if (targetProjectId && blocks.length > 0) {
        for (const block of blocks) {
          const title = block.subEventNames.join(' + ') || 'Wedding Ceremony';
          const { data: insertedSubEvent, error: seErr } = await supabase
            .from('fw_sub_events')
            .insert([
              {
                project_id: targetProjectId,
                event_title: title,
                event_date: block.subEventDate || new Date().toISOString().split('T')[0],
                venue_name: block.venueLocation || null,
                venue_map_link: block.mapLink || null,
                roll_call_time: block.startTime || '10:00',
                dismissal_estimate_time: block.endTime || '18:00',
                operational_notes: block.notes || null,
              },
            ])
            .select()
            .single();

          if (seErr) throw seErr;

          if (insertedSubEvent && block.roles.length > 0) {
            const assignmentsPayload = block.roles.map(role => {
              const matchedMember = teamMembers.find(
                m => m.primary_role.toLowerCase() === role.toLowerCase() || m.name.toLowerCase() === role.toLowerCase()
              );
              return {
                project_id: targetProjectId,
                sub_event_id: insertedSubEvent.id,
                required_role: role,
                assigned_member_id: matchedMember ? matchedMember.id : null,
              };
            });

            await supabase.from('fw_assignments').insert(assignmentsPayload);
          }
        }
      }

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

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-[#0B111E] font-sans antialiased selection:bg-[#6C5CE7]/15">
      <style>{customStyle}</style>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT WORKSPACE AREA (100% FULL WIDTH RESPONSIVE)
         ───────────────────────────────────────────────────────────── */}
      <main className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 bg-slate-100 space-y-6">
        
        {/* Top Responsive Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0B111E] tracking-tight flex items-center gap-2 flex-wrap">
              Welcome back, Studio Admin 👋
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300 shadow-2xs">
                v3.0-mobile-app
              </span>
            </h2>
            <p className="text-xs text-[#4F5E74] font-bold mt-0.5">
              Here&apos;s what&apos;s happening with your wedding operations today.
            </p>
          </div>

          {/* Action controls row */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto justify-start sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#4F5E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search clients or sub-events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#6C5CE7]/10 rounded-2xl text-xs font-bold text-[#0B111E] placeholder:text-[#4F5E74]/60 focus:outline-none focus:border-[#6C5CE7] transition shadow-2xs"
              />
            </div>

            <button
              onClick={() => {
                setActiveAssignmentForMember(null);
                setIsAddMemberOpen(true);
              }}
              className="bg-white border border-[#6C5CE7]/20 hover:border-[#6C5CE7] text-[#6C5CE7] text-xs font-bold px-4 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-2xs shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Add Team Member</span>
              <span className="sm:hidden">+ Member</span>
            </button>

            <button 
              onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
              className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-[#6C5CE7]/20 hover:shadow-[#6C5CE7]/30 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>

            <button 
              type="button" 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl shadow-2xs text-indigo-600 transition-all cursor-pointer shrink-0"
              title="Team & Operations Settings"
            >
              <Settings className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* ─── VIEW MODE NAVIGATION SWITCHER BAR (RESPONSIVE TOUCH SCROLL) ─── */}
        <div className="flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
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
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer select-none shrink-0 ${
                activeTab === 'calendar'
                  ? 'bg-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              3D Professional Calendar
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
              Overview Stats
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

        {/* ─── TAB VIEW: CARDS VIEW (CLIENT-WISE) ─── */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 space-y-3">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const subEvents = project.fw_sub_events || [];

                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md shadow-slate-200/40 overflow-hidden flex flex-col hover:border-indigo-300 transition duration-200 group"
                    >
                      {/* CLIENT CARD HEADER BAR */}
                      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                            {getInitials(project.client_name)}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                              {project.client_name}
                            </h3>
                            <span className="text-[11px] font-bold text-slate-300">
                              {subEvents.length} Sub-Event{subEvents.length === 1 ? '' : 's'} Configured
                            </span>
                          </div>
                        </div>

                        {/* EDIT PROJECT CARD BUTTON */}
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setIsAddProjectOpen(true);
                          }}
                          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                          title="Edit Project Configuration"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>

                      {/* SUB-EVENTS LIST */}
                      <div className="p-5 space-y-5 flex-1 bg-slate-50/40">
                        {subEvents.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400 italic">No sub-events added yet.</div>
                        ) : (
                          subEvents.map((subEvent) => {
                            const assignments = subEvent.fw_assignments || [];
                            const assignedCount = assignments.filter(a => a.assigned_member_id !== null).length;
                            const totalSlots = assignments.length;

                            return (
                              <div
                                key={subEvent.id}
                                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs"
                              >
                                {/* SUB EVENT TITLE & DATE */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <div>
                                    <h4 className="font-extrabold text-slate-900 text-xs">
                                      {subEvent.event_title}
                                    </h4>
                                    <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                                      {subEvent.event_date} ({getCountdownBadge(subEvent.event_date)})
                                    </span>
                                  </div>

                                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-100">
                                    {assignedCount}/{totalSlots} Roles
                                  </span>
                                </div>

                                {/* VENUE & TIMING */}
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
                                  {subEvent.roll_call_time && (
                                    <div className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>
                                        {format12HourTime(subEvent.roll_call_time)}
                                        {subEvent.dismissal_estimate_time ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
                                      </span>
                                    </div>
                                  )}

                                  {subEvent.venue_name && (
                                    <div className="flex items-center gap-1 text-emerald-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="truncate max-w-[140px]">{subEvent.venue_name}</span>
                                    </div>
                                  )}
                                </div>

                                {/* CREW ALLOCATION ROSTER CHIPS (CIRCULAR AVATARS) */}
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                                    Crew Placements
                                  </span>
                                  {assignments.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">No roles configured</span>
                                  ) : (
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {assignments.map((assignment) => {
                                        const member = assignment.fw_team_members || teamMembers.find(m => m.id === assignment.assigned_member_id);
                                        const isAssigned = member !== undefined && member !== null;
                                        const role = assignment.required_role || 'Crew';
                                        const cleanName = member?.name ? member.name.replace(/\.\.\./g, '').trim() : '';
                                        const { line1, line2 } = formatMemberName2Lines(cleanName);
                                        const isDropdownOpen = activeDropdownId === assignment.id;

                                        return (
                                          <div
                                            key={assignment.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setDropdownPos({
                                                top: rect.bottom + 6,
                                                left: Math.min(rect.left, window.innerWidth - 270),
                                              });
                                              setActiveDropdownId(isDropdownOpen ? null : assignment.id);
                                            }}
                                            className="flex flex-col items-center group/node cursor-pointer select-none relative"
                                          >
                                            {/* CIRCULAR NODE AVATAR */}
                                            {isAssigned ? (
                                              member.avatar_url ? (
                                                // eslint-disable-next-next/no-img-element
                                                <img
                                                  src={member.avatar_url}
                                                  alt={cleanName}
                                                  className="w-11 h-11 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-emerald-400 group-hover/node:scale-105 transition shrink-0"
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;
                                                  }}
                                                />
                                              ) : (
                                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 group-hover/node:scale-105 transition shrink-0">
                                                  {getInitials(cleanName || role)}
                                                </div>
                                              )
                                            ) : (
                                              <div className="w-11 h-11 rounded-full border-2 border-dashed border-red-500 bg-red-50 text-red-600 font-black flex items-center justify-center shadow-2xs group-hover/node:bg-red-100 transition cursor-pointer shrink-0">
                                                <Plus className="w-5 h-5 text-red-600 stroke-[3]" />
                                              </div>
                                            )}

                                            {/* ROLE LABEL */}
                                            <span className={`font-bold text-[10px] uppercase tracking-wide block text-center mt-1.5 leading-none ${
                                              isAssigned ? 'text-indigo-600' : 'text-red-600 font-extrabold'
                                            }`}>
                                              {role}
                                            </span>

                                            {/* MEMBER NAME */}
                                            {isAssigned && (
                                              <div className="flex flex-col items-center text-center font-extrabold text-slate-900 text-[11px] leading-tight max-w-[85px] mt-0.5">
                                                <span className="block leading-none truncate max-w-[85px]">{line1}</span>
                                                {line2 ? <span className="block leading-none truncate max-w-[85px] mt-0.5">{line2}</span> : null}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
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

      </main>

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL POPUP MODALS
         ───────────────────────────────────────────────────────────── */}
      
      {/* GLOBAL REACT PORTAL POPOVER FOR TEAM MEMBER ASSIGNMENT */}
      {activeDropdownId && dropdownPos && typeof window !== 'undefined' && (() => {
        const activeAssignment = projects
          .flatMap(p => p.fw_sub_events || [])
          .flatMap(se => se.fw_assignments || [])
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
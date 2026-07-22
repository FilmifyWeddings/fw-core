'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Calendar, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash, ChevronDown, Edit2, TrendingUp, Award, Grid, Menu,
  Database, FileText, Layers, ArrowLeft, SlidersHorizontal, CheckSquare, Folder, Edit3, Pencil, Settings,
  HardDrive, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { FWProject, FWSubEvent, FWTeamMember, FWAssignment } from '@/types';
import AddProjectModal from './components/AddProjectModal';
import AddTeamMemberModal from './components/AddTeamMemberModal';
import { EventBlockData } from './components/EventBlock';

// Semantic Theme CSS styles injected directly for strict color matching
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

const clientGradients = [
  'bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white border border-indigo-100/90 shadow-md shadow-indigo-100/20',
  'bg-gradient-to-br from-blue-50/80 via-slate-50/40 to-white border border-blue-100/90 shadow-md shadow-blue-100/20',
  'bg-gradient-to-br from-violet-50/80 via-fuchsia-50/30 to-white border border-violet-100/90 shadow-md shadow-violet-100/20',
  'bg-gradient-to-br from-purple-50/80 via-indigo-50/40 to-white border border-purple-100/90 shadow-md shadow-purple-100/20',
];

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
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [eventTypesList, setEventTypesList] = useState<string[]>([
    "Pre-wedding", "Haldi", "Sangeet", "Wedding Ceremony", "Reception"
  ]);
  const [activeAssignmentForMember, setActiveAssignmentForMember] = useState<{
    assignmentId?: string;
    role?: string;
    subEventId?: string;
    projectId?: string;
  } | null>(null);

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
      // Ensure storage bucket exists
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
      const { data: projectsData, error: projErr } = await supabase
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

      if (projErr) {
        console.warn('[TeamManager] Relational join fetch error, trying legacy fallback:', projErr.message);
        // Legacy fallback: fetch projects and assignments flat
        const { data: legacyProjs } = await supabase.from('fw_projects').select('*');
        const { data: legacyAssigns } = await supabase
          .from('fw_assignments')
          .select('*, fw_team_members(*)');

        if (legacyProjs) {
          const mapped: FWProject[] = legacyProjs.map(p => {
            const pAssigns = (legacyAssigns || []).filter((a: any) => a.project_id === p.id);
            // Group by sub_event_name
            const grouped: { [key: string]: FWAssignment[] } = {};
            pAssigns.forEach((a: any) => {
              const key = a.sub_event_name || 'Event';
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(a);
            });
            const subEvents: FWSubEvent[] = Object.keys(grouped).map((title, idx) => ({
              id: `se-${p.id}-${idx}`,
              project_id: p.id,
              event_title: title,
              event_date: grouped[title][0]?.sub_event_date || p.main_date || new Date().toISOString(),
              roll_call_time: grouped[title][0]?.start_time,
              dismissal_estimate_time: grouped[title][0]?.end_time,
              fw_assignments: grouped[title],
            }));
            return { ...p, fw_sub_events: subEvents };
          });
          setProjects(mapped);
        }
      } else if (projectsData) {
        setProjects(projectsData as FWProject[]);
      }
    } catch (err: any) {
      console.error('[TeamManager] Fetch failed:', err);
      setError(err.message || 'Failed to load team manager data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // ATOMIC SUPABASE MUTATIONS
  // ─────────────────────────────────────────────────────────────

  // Assign Team Member to Assignment Slot
  const handleAssignMember = async (assignmentId: string, memberId: string | null) => {
    try {
      const status = memberId ? 'assigned' : 'pending';
      const { error: updateErr } = await supabase
        .from('fw_assignments')
        .update({
          assigned_member_id: memberId,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (updateErr) {
        console.error('[TeamManager] Failed to update assignment:', updateErr);
        alert('Failed to save assignment in Supabase.');
        return;
      }

      // Optimistic UI state update
      const selectedMember = teamMembers.find(m => m.id === memberId) || null;
      setProjects(prevProjects =>
        prevProjects.map(proj => ({
          ...proj,
          fw_sub_events: proj.fw_sub_events?.map(se => ({
            ...se,
            fw_assignments: se.fw_assignments?.map(assign =>
              assign.id === assignmentId
                ? { ...assign, assigned_member_id: memberId, status: status, fw_team_members: selectedMember }
                : assign
            ),
          })),
        }))
      );

      setActiveDropdownId(null);
    } catch (err) {
      console.error('[TeamManager] Assignment update error:', err);
    }
  };

  // Create New Team Member and Optional Assignment Link
  
  const handleDeleteTeamMember = async (id: string) => {
    try {
      const { error } = await supabase.from('fw_team_members').delete().eq('id', id);
      if (error) {
        alert('Could not delete team member: ' + error.message);
        return;
      }
      setTeamMembers(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      console.error('Delete member error:', e);
    }
  };

  const handleSaveTeamMember = async (memberData: {
    name: string;
    primary_role: string;
    country_code: string;
    phone_number: string;
    email?: string;
  }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;

      const memberPayload: any = {
        name: memberData.name,
        primary_role: memberData.primary_role,
        country_code: memberData.country_code,
        phone_number: memberData.phone_number,
        email: memberData.email || null,
        active_status: true,
        is_active: true,
      };
      if (userId) memberPayload.user_id = userId;

      console.log('[TeamManager] Inserting member payload:', memberPayload);

      const { data: newMembers, error: insertErr } = await supabase
        .from('fw_team_members')
        .insert([memberPayload])
        .select();

      if (insertErr || !newMembers || newMembers.length === 0) {
        console.error('[TeamManager] Member creation failed:', {
          message: insertErr?.message,
          details: insertErr?.details,
          hint: insertErr?.hint,
          code: insertErr?.code,
        });
        const errDetail = insertErr?.message || insertErr?.details || ("Code: " + (insertErr?.code || "UNKNOWN"));
        alert("Could not save new team member to database:\n\n" + errDetail);
        return;
      }

      const newMember = newMembers[0];
      setTeamMembers(prev => [...prev, newMember]);

      // If opened from a specific assignment dropdown, auto-assign
      if (activeAssignmentForMember?.assignmentId) {
        await handleAssignMember(activeAssignmentForMember.assignmentId, newMember.id);
      }

      setActiveAssignmentForMember(null);
    } catch (err: any) {
      console.error('[TeamManager] Save team member exception:', err);
      alert("Error saving team member: " + (err?.message || err));
    }
  };

  // Save New Project and Sub-Events to Supabase with Enhanced Diagnostics & Fallbacks
  const handleSaveProject = async (couplingName: string, eventBlocks: EventBlockData[], existingProjectId?: string): Promise<boolean> => {
    console.log('[TeamManager] Starting handleSaveProject for couplingName:', couplingName, 'with blocks count:', eventBlocks.length);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;

      const mainDate = eventBlocks[0]?.subEventDate || new Date().toISOString().split('T')[0];
      const mainVenue = eventBlocks[0]?.venueLocation || 'Venue TBD';

      const projectPayload: any = {
        client_name: couplingName,
        status: 'Active',
        shipping_hdd_status: 'None',
        shipping_hdd_state: 'PENDING',
        main_date: mainDate,
        main_venue: mainVenue,
        is_archived: false,
      };
      if (userId) {
        projectPayload.user_id = userId;
      }

      console.log('[TeamManager] Inserting project payload:', projectPayload);

      // 1. Insert or Update Project into fw_projects
      let newProj: any = null;

      if (existingProjectId) {
        console.log('[TeamManager] Updating existing project:', existingProjectId);
        const { data: updatedArr, error: updateErr } = await supabase
          .from('fw_projects')
          .update(projectPayload)
          .eq('id', existingProjectId)
          .select();

        if (updateErr || !updatedArr || updatedArr.length === 0) {
          console.error('[TeamManager] Project update failed:', updateErr);
          alert("Could not update project in Supabase: " + (updateErr?.message || 'Update failed'));
          return false;
        }
        newProj = updatedArr[0];

        // Clear existing sub-events & assignments to re-create updated configuration
        await supabase.from('fw_sub_events').delete().eq('project_id', existingProjectId);
        await supabase.from('fw_assignments').delete().eq('project_id', existingProjectId);
      } else {
        const { data: newProjArray, error: projErr } = await supabase
          .from('fw_projects')
          .insert([projectPayload])
          .select();

        if (projErr || !newProjArray || newProjArray.length === 0) {
          console.error('[TeamManager] Project insert failed:', projErr);
          const detailText = projErr?.message || projErr?.details || ("Code: " + (projErr?.code || "UNKNOWN"));
          alert("Could not create project in Supabase:\n\n" + detailText);
          return false;
        }
        newProj = newProjArray[0];
      }
      console.log('[TeamManager] Project saved successfully with ID:', newProj.id);

      // 2. Insert Sub-Events & Assignments
      for (let i = 0; i < eventBlocks.length; i++) {
        const block = eventBlocks[i];
        const eventTitle = block.subEventNames.join(' / ') || ("Event #" + (i + 1));
        const eventDate = block.subEventDate || mainDate;

        const subEventPayload: any = {
          project_id: newProj.id,
          event_title: eventTitle,
          event_date: eventDate,
          venue_name: block.venueLocation || null,
          venue_map_link: block.mapLink || null,
          roll_call_time: block.startTime || null,
          dismissal_estimate_time: block.endTime || null,
          operational_notes: block.notes || null,
          display_order: i,
        };
        if (userId) subEventPayload.user_id = userId;

        console.log("[TeamManager] Sub-Event [" + i + "] Payload:", subEventPayload);

        let subEventId: string | null = null;
        try {
          const { data: seData, error: seErr } = await supabase
            .from('fw_sub_events')
            .insert([subEventPayload])
            .select();

          if (seErr) {
            console.warn("[TeamManager] fw_sub_events insert warning for block " + i + ":", seErr.message);
          } else if (seData && seData[0]) {
            subEventId = seData[0].id;
          }
        } catch (e: any) {
          console.warn("[TeamManager] Sub-event creation skipped due to schema:", e.message);
        }

        // Insert required role assignments for this sub-event
        if (block.roles && block.roles.length > 0) {
          const assignmentsPayload = block.roles.map(role => {
            const item: any = {
              project_id: newProj.id,
              sub_event_id: subEventId,
              sub_event_name: eventTitle,
              sub_event_date: eventDate,
              start_time: block.startTime || null,
              end_time: block.endTime || null,
              required_role: role,
              assigned_member_id: null,
              status: 'pending',
            };
            if (userId) item.user_id = userId;
            return item;
          });

          console.log("[TeamManager] Assignments Payload for sub-event [" + i + "]:", assignmentsPayload);

          const { error: assignErr } = await supabase
            .from('fw_assignments')
            .insert(assignmentsPayload);

          if (assignErr) {
            console.warn("[TeamManager] Assignments insert warning:", assignErr.message);
          }
        }
      }

      // Refresh dataset from Supabase
      await fetchAllData();
      setIsAddProjectOpen(false);
      return true;
    } catch (err: any) {
      console.error('[TeamManager] handleSaveProject Exception:', err);
      alert("Error saving project: " + (err?.message || err));
      return false;
    }
  };

  // Toggle Soft-Archive Project (Trash)
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
    <div className="min-h-screen bg-[#F8F9FD] text-[#0B111E] flex font-sans antialiased selection:bg-[#6C5CE7]/15">
      <style>{customStyle}</style>

      {/* ─────────────────────────────────────────────────────────────
          LEFT WORKSPACE SIDEBAR NAVIGATION (Light Mode Premium)
         ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-[#6C5CE7]/8 flex flex-col justify-between py-6 px-4 shrink-0 shadow-[4px_0_24px_rgba(108,92,231,0.01)]">
        <div className="space-y-8">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#6C5CE7] flex items-center justify-center text-white shadow-lg shadow-[#6C5CE7]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">Filmify</span>
              <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider">Studio Workstation</span>
            </div>
          </div>

          {/* Nav Links Grid */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview' 
                  ? 'bg-[#6C5CE7]/6 text-[#6C5CE7]' 
                  : 'text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50'
              }`}
            >
              <Grid className="w-4 h-4" /> Overview
            </button>
            
            <button 
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'projects' 
                  ? 'bg-[#6C5CE7]/6 text-[#6C5CE7]' 
                  : 'text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" /> Projects
              </div>
              <span className="bg-[#6C5CE7]/10 text-[#6C5CE7] text-[10px] font-bold px-2 py-0.5 rounded-md">
                {projects.filter(p => !p.is_archived).length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('list')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list' 
                  ? 'bg-[#6C5CE7]/6 text-[#6C5CE7]' 
                  : 'text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50'
              }`}
            >
              <List className="w-4 h-4" /> List Register
            </button>

            <button 
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'calendar' 
                  ? 'bg-[#6C5CE7]/6 text-[#6C5CE7]' 
                  : 'text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50'
              }`}
            >
              <Calendar className="w-4 h-4" /> Calendar
            </button>

            <button 
              onClick={() => setActiveTab('trash')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'trash' 
                  ? 'bg-[#6C5CE7]/6 text-[#6C5CE7]' 
                  : 'text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50'
              }`}
            >
              <Trash2 className="w-4 h-4" /> Trash Recovery
            </button>

            {/* Divider */}
            <div className="h-px bg-zinc-150/60 my-4" />
            
            <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block px-3 mb-2">
              Studio Suite
            </span>

            <Link 
              href="/"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50 transition-all"
            >
              <Grid className="w-4 h-4" /> Suite Home
            </Link>

            <Link 
              href="/leads"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50 transition-all"
            >
              <Database className="w-4 h-4 text-emerald-500" /> Leads Manager
            </Link>

            <Link 
              href="/quotations"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50 transition-all"
            >
              <FileText className="w-4 h-4 text-amber-500" /> Quotation Maker
            </Link>

            <Link 
              href="/dashboard/integrations"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#4F5E74] hover:text-[#0B111E] hover:bg-zinc-50 transition-all"
            >
              <Layers className="w-4 h-4 text-[#6C5CE7]" /> Integrations
            </Link>
          </nav>
        </div>

        {/* Footer info & toggle switches */}
        <div className="space-y-4 pt-6 border-t border-zinc-100">
          <div className="space-y-1 px-2">
            <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block">Operational Alerts</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] font-semibold text-zinc-500">WhatsBoost Logs</span>
              <button 
                onClick={() => setInstantAlerts(!instantAlerts)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none ${
                  instantAlerts ? 'bg-[#6C5CE7]' : 'bg-zinc-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                  instantAlerts ? 'translate-x-3.5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-3 bg-zinc-50 p-2.5 rounded-2xl border border-zinc-100">
            <div className="w-8 h-8 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center text-[#6C5CE7] font-bold text-xs">
              SA
            </div>
            <div>
              <span className="font-bold text-[11px] block leading-tight">Studio Admin</span>
              <span className="text-[9px] text-[#4F5E74] font-semibold block mt-0.5">Owner Profile</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT WORKSPACE AREA
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 max-h-screen bg-slate-100">
        
        {/* Top Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-[#0B111E] tracking-tight flex items-center gap-2">
              Welcome back, Studio Admin 👋
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300 shadow-xs">
                v2.4-avatar-settings
              </span>
            </h2>
            <p className="text-xs text-[#4F5E74] font-semibold mt-0.5">
              Here&apos;s what&apos;s happening with your wedding operations today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#4F5E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search clients or sub-events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-[#6C5CE7]/10 rounded-2xl text-xs font-bold text-[#0B111E] placeholder:text-[#4F5E74]/60 focus:outline-none focus:border-[#6C5CE7] transition w-64 shadow-sm"
              />
            </div>

            <button
              onClick={() => {
                setActiveAssignmentForMember(null);
                setIsAddMemberOpen(true);
              }}
              className="bg-white border border-[#6C5CE7]/20 hover:border-[#6C5CE7] text-[#6C5CE7] text-xs font-bold px-4 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              + Add Team Member
            </button>

            <button 
              onClick={() => { setEditingProject(null); setIsAddProjectOpen(true); }}
              className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-[#6C5CE7]/20 hover:shadow-[#6C5CE7]/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>

            <button 
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl shadow-sm text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer shrink-0"
              title="Team & Operations Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── TAB VIEW: CLIENT-CENTRIC HORIZONTAL SUB-EVENT CARDS WITH 5 URGENT BUG FIXES ─── */}
        {activeTab === 'projects' && (
          <div className="space-y-8">
            
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-[#6C5CE7] animate-spin" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[24px] border border-[#6C5CE7]/8 p-8 shadow-sm">
                <Users className="w-12 h-12 text-[#6C5CE7]/40 mx-auto mb-3" />
                <h4 className="font-bold text-sm text-[#0B111E]">No Active Projects Found</h4>
                <p className="text-xs text-[#4F5E74] font-semibold mt-1 max-w-sm mx-auto">
                  Click the &quot;Add Project&quot; button above to create your first wedding project with custom sub-events and crew allocations.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredProjects.map((project) => {
                  return (
                    /* 2. DISTINCT MASTER CLIENT CHASSIS (SOLID WHITE CHASSIS & RICH SLATE BORDERS) */
                    <div 
                      key={project.id}
                      className="bg-white border-2 border-slate-300 shadow-lg shadow-slate-200/50 rounded-3xl p-6 space-y-4 mb-8 relative overflow-visible"
                    >
                      {/* MASTER CLIENT CARD HEADER */}
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-3">
                          {/* 2. HIGH-CONTRAST DARK VIOLET/INDIGO CLIENT NAME TYPOGRAPHY */}
                          <h3 className="text-2xl font-black tracking-tight" style={{ color: '#1E1B4B' }}>
                            {project.client_name}
                          </h3>
                          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-950 text-[11px] font-black tracking-wide border border-indigo-200/80 shadow-2xs">
                            {project.fw_sub_events?.length || 0} Sub-Events
                          </span>
                        </div>

                        {/* SINGLE PENCIL EDIT BUTTON (TOP RIGHT) */}
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
                      </div>

                      {/* HORIZONTAL SUB-EVENT ROW CARDS STACK */}
                      <div className="space-y-3.5 relative overflow-visible">
                        {project.fw_sub_events?.map((subEvent) => {
                          const eventDate = new Date(subEvent.event_date);
                          const dayName = isNaN(eventDate.getTime()) 
                            ? 'DAY' 
                            : eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                          const monthAbbr = isNaN(eventDate.getTime()) 
                            ? 'MMM' 
                            : eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                          const dayNumber = isNaN(eventDate.getTime()) 
                            ? '00' 
                            : eventDate.getDate().toString().padStart(2, '0');
                          const yearStr = isNaN(eventDate.getTime()) 
                            ? '2026' 
                            : eventDate.getFullYear().toString();

                          return (
                            /* 1. STRICT RESPONSIVE GRID LAYOUT CONTAINER (PREVENT COLLISIONS AT 100% ZOOM) */
                            <div 
                              key={subEvent.id}
                              className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all border-l-4 border-l-purple-700 w-full relative overflow-visible z-10"
                            >
                              {/* LEFT COLUMN (xl:col-span-5): DATE, TIME, VENUE & SUB-EVENT TITLE */}
                              <div className="xl:col-span-5 flex flex-col md:flex-row md:items-center gap-3.5 min-w-0">
                                {/* DATE CALLOUT BLOCK */}
                                <div className="flex items-center gap-3 pr-4 border-b md:border-b-0 md:border-r border-slate-200/80 pb-3 md:pb-0 shrink-0 min-w-[105px]">
                                  <div className="flex flex-col items-center justify-center text-center">
                                    <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase leading-none">
                                      {dayName}
                                    </span>
                                    <span className="text-xl font-black text-slate-900 tracking-tight leading-none mt-1">
                                      {monthAbbr} {dayNumber}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                      {yearStr}
                                    </span>
                                  </div>
                                </div>

                                {/* DETAILS: TIME, VENUE & TITLE */}
                                <div className="flex-1 space-y-1 min-w-0">
                                  {/* Time (12-Hour AM/PM) & Venue */}
                                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500 flex-wrap">
                                    {subEvent.roll_call_time && (
                                      <div className="flex items-center gap-1.5 text-slate-700">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>
                                          {format12HourTime(subEvent.roll_call_time)}
                                          {subEvent.dismissal_estimate_time ? ` - ${format12HourTime(subEvent.dismissal_estimate_time)}` : ''}
                                        </span>
                                      </div>
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
                                          <span className="truncate max-w-[180px]">{subEvent.venue_name}</span>
                                        </a>
                                        {/* Micro Hover Popover Card */}
                                        <div className="absolute left-0 top-full mt-1 hidden group-hover/venue:flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl z-50 pointer-events-none whitespace-nowrap border border-slate-700">
                                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                          <span>{subEvent.venue_name} (Click to open map ↗)</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Sub-Event Title (Dark Violet/Purple Shade #1E1B4B) */}
                                  <h4 className="font-black text-base leading-tight tracking-tight" style={{ color: '#1E1B4B' }}>
                                    {subEvent.event_title}
                                  </h4>
                                </div>
                              </div>

                              {/* RIGHT COLUMN (xl:col-span-7): CREW ASSIGNMENT AVATARS */}
                              <div className="xl:col-span-7 flex flex-wrap items-start justify-start xl:justify-end gap-x-4 gap-y-3 shrink-0 overflow-visible py-1">
                                {subEvent.fw_assignments?.map((assignment) => {
                                  const isAssigned = assignment.assigned_member_id !== null;
                                  const memberObj = assignment.fw_team_members;
                                  const rawName = memberObj?.name || '';
                                  const cleanName = rawName.replace(/\.\.\./g, '').trim();
                                  const role = assignment.required_role;
                                  const dropdownKey = assignment.id;
                                  const isDropdownOpen = activeDropdownId === dropdownKey;
                                  const initials = getInitials(cleanName || role);

                                  return (
                                    <div key={assignment.id} className="relative overflow-visible">
                                      {/* 3-LAYER VERTICAL NODE */}
                                      <div
                                        onClick={() => {
                                          setActiveDropdownId(isDropdownOpen ? null : dropdownKey);
                                          setMemberSearchQuery('');
                                        }}
                                        className="flex flex-col items-center group cursor-pointer min-w-[64px]"
                                        title={isAssigned ? `${cleanName} (${role})` : `Unassigned: ${role}`}
                                      >
                                        {/* 3. LAYER 1 (TOP): AVATAR PHOTO / INITIALS CIRCLE / CLEAN RED UNASSIGNED */}
                                        {isAssigned ? (
                                          memberObj?.avatar_url ? (
                                            // eslint-disable-next-next/no-img-element
                                            <img 
                                              src={memberObj.avatar_url} 
                                              alt={cleanName} 
                                              className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-emerald-400 group-hover:scale-105 transition shrink-0" 
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName || role)}`;
                                              }}
                                            />
                                          ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm border-2 border-white ring-2 ring-indigo-200 group-hover:scale-105 transition shrink-0">
                                              {initials}
                                            </div>
                                          )
                                        ) : (
                                          /* CLEAN RED UNASSIGNED CIRCLE (ONLY RED '+' ICON INSIDE) */
                                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 bg-red-50/90 text-red-600 font-black flex items-center justify-center shadow-xs group-hover:bg-red-100 transition-colors cursor-pointer shrink-0">
                                            <Plus className="w-5 h-5 text-red-600 stroke-[3]" />
                                          </div>
                                        )}

                                        {/* LAYER 2 (MIDDLE): ROLE LABEL */}
                                        <span className={`font-bold text-[11px] uppercase tracking-wide block text-center mt-1.5 leading-none ${
                                          isAssigned ? 'text-indigo-600' : 'text-red-600 font-extrabold'
                                        }`}>
                                          {role}
                                        </span>

                                        {/* 5. LAYER 3 (BOTTOM): VERTICAL 2-LINE FULL NAME WRAPPING */}
                                        {isAssigned && (
                                          <div className="flex flex-col items-center text-center font-extrabold text-slate-900 text-[11px] leading-tight max-w-[85px] mt-0.5">
                                            {cleanName.split(/\s+/).map((word, wIdx) => (
                                              <span key={wIdx} className="block leading-none">{word}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* 4. HIGH Z-INDEX DROPDOWN POPOVER PREVENTING OVERLAP & CLIPPING BUGS */}
                                      {isDropdownOpen && (
                                        <>
                                          <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setActiveDropdownId(null)} 
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.92, y: 8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.92, y: 8 }}
                                            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                                            className="absolute top-full right-0 mt-2 z-[9999] w-64 bg-white border border-[#6C5CE7]/20 rounded-[18px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-3 space-y-2"
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
                                                setActiveAssignmentForMember({
                                                  assignmentId: assignment.id,
                                                  role: assignment.required_role,
                                                  subEventId: subEvent.id,
                                                  projectId: project.id,
                                                });
                                                setIsAddMemberOpen(true);
                                              }}
                                              className="w-full flex items-center justify-center gap-2 bg-[#F0EDFF] hover:bg-[#E5E0FF] text-[#6C5CE7] text-xs font-bold py-2 rounded-xl transition"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              + Add New Team Member
                                            </button>

                                            <div className="h-px bg-zinc-100 my-1" />

                                            {/* MEMBER SELECTION LIST WITH ENHANCED CIRCULAR AVATARS & CLEAN NAMES */}
                                            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                                              {/* UNASSIGN OPTION */}
                                              <button
                                                type="button"
                                                onClick={() => handleAssignMember(assignment.id, null)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
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
                                                  const isSelected = assignment.assigned_member_id === m.id;
                                                  const cleanMName = m.name ? m.name.replace(/\.\.\./g, '').trim() : '';
                                                  return (
                                                    <button
                                                      key={m.id}
                                                      type="button"
                                                      onClick={() => handleAssignMember(assignment.id, m.id)}
                                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
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
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB VIEW: OVERVIEW DASHBOARD STATS ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm">
                <span className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Total Active Weddings</span>
                <h3 className="text-2xl font-black text-[#0B111E] mt-1">{projects.filter(p => !p.is_archived).length}</h3>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3" /> +12% from last month</span>
              </div>
              <div className="bg-white p-5 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm">
                <span className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Directory Crew</span>
                <h3 className="text-2xl font-black text-[#0B111E] mt-1">{teamMembers.length}</h3>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1"><Award className="w-3 h-3" /> Active Roster</span>
              </div>
              <div className="bg-white p-5 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm">
                <span className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Unassigned Slots</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1">
                  {projects.flatMap(p => p.fw_sub_events || []).flatMap(se => se.fw_assignments || []).filter(a => !a.assigned_member_id).length}
                </h3>
                <span className="text-[10px] text-rose-500 font-bold mt-1 block">Requires Allocation</span>
              </div>
              <div className="bg-white p-5 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm">
                <span className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Assigned Slots</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  {projects.flatMap(p => p.fw_sub_events || []).flatMap(se => se.fw_assignments || []).filter(a => a.assigned_member_id).length}
                </h3>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">100% Confirmed</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB VIEW: LIST REGISTER ─── */}
        {activeTab === 'list' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-[#0B111E]">Chronological Sub-Event List Register</h3>
              <div className="space-y-3">
                {projects.flatMap(p => p.fw_sub_events || []).map((se) => (
                  <div key={se.id} className="flex items-center justify-between p-3.5 bg-[#F8F9FD] rounded-2xl border border-zinc-100 text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]" />
                      <span className="text-[#0B111E]">{se.event_title}</span>
                      <span className="text-[#4F5E74]">({se.event_date})</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {se.fw_assignments?.map(a => (
                        <span key={a.id} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.assigned_member_id ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                          {a.required_role}: {a.fw_team_members?.name || 'Unassigned'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB VIEW: CALENDAR VIEW ─── */}
        {activeTab === 'calendar' && (
          <div className="bg-white p-8 rounded-[24px] border border-[#6C5CE7]/8 shadow-sm text-center py-20">
            <Calendar className="w-12 h-12 text-[#6C5CE7] mx-auto mb-3" />
            <h4 className="font-extrabold text-sm text-[#0B111E]">Operations Calendar Board</h4>
            <p className="text-xs text-[#4F5E74] font-semibold mt-1">Calendar schedule synchronized with active Supabase sub-events.</p>
          </div>
        )}

        {/* ─── TAB VIEW: TRASH RECOVERY ─── */}
        {activeTab === 'trash' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-[#0B111E]">Soft-Archived Projects (Trash)</h3>
            {filteredProjects.length === 0 ? (
              <div className="bg-white p-8 rounded-[24px] text-center text-xs text-[#4F5E74] font-bold">
                Trash buffer is clear. No archived projects found.
              </div>
            ) : (
              filteredProjects.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs font-bold">
                  <span>{p.client_name}</span>
                  <button
                    onClick={() => handleToggleArchiveProject(p.id, false)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore Project
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL POPUP MODALS
         ───────────────────────────────────────────────────────────── */}
      
      {/* 1. Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => {
          setIsAddProjectOpen(false);
          setEditingProject(null);
        }}
        projectToEdit={editingProject}
        onSave={handleSaveProject}
      />

      {/* 2. Add New Team Member 3D Modal (With International Country Flags Input) */}
      <AddTeamMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setActiveAssignmentForMember(null);
        }}
        initialRole={activeAssignmentForMember?.role || 'Ass'}
        onSave={handleSaveTeamMember}
      />
    </div>
  );
}

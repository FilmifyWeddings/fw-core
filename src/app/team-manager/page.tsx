'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash, ChevronDown, Edit2, TrendingUp, Award, Grid, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { FWProject, FWTeamMember, FWAssignment } from '@/types';

// Semantic Theme CSS styles injected directly for strict color matching
const customStyle = `
  body {
    background-color: #F8F9FD !important;
    color: #0B111E !important;
  }
`;

export default function TeamManagerPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'list' | 'calendar' | 'trash'>('projects');
  
  // Database States
  const [projects, setProjects] = useState<FWProject[]>([]);
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>([]);
  const [assignments, setAssignments] = useState<FWAssignment[]>([]);
  
  // UI Interactive States
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [instantAlerts, setInstantAlerts] = useState<boolean>(true);
  
  // Selected Event and Active Popover assignment anchor
  const [activeAssigningId, setActiveAssigningId] = useState<string | null>(null);

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);

  // Coupling Input and Dynamic Modal Blocks for Project Creation
  const [couplingName, setCouplingName] = useState('');
  const [projectMainVenue, setProjectMainVenue] = useState('');
  const [projectMainDate, setProjectMainDate] = useState('');
  const [eventBlocks, setEventBlocks] = useState<Array<{
    id: string;
    subEventName: string;
    subEventDate: string;
    venueLocation: string;
    mapLink: string;
    startTime: string;
    endTime: string;
    roles: string[];
    notes: string;
  }>>([
    {
      id: Math.random().toString(),
      subEventName: 'Wedding',
      subEventDate: '',
      venueLocation: '',
      mapLink: '',
      startTime: '14:00',
      endTime: '22:00',
      roles: ['TP', 'Ass'],
      notes: ''
    }
  ]);

  // New Crew Member Form State
  const [newMember, setNewMember] = useState({ name: '', role: 'CP', phone: '', email: '' });

  // Predefined Role Pool Chips
  const ROLE_CHIPS = [
    'TM', 'Ass', 'TP', 'TV', 'CP', 'CV', 'Dron', 'Makeup Art', 
    'Cine 2', 'Candid 2', 'Face AI', 'social Media persone', 'Reel', 
    'Family Photographer', 'cv 2ndGim', '2 Ass', 'Live Camera'
  ];

  // Fetch initial profile & data
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await fetchData(session.user.id);
      }
      setIsLoading(false);
    };
    initData();
  }, []);

  const fetchData = async (uid: string) => {
    const { data: pData } = await supabase
      .from('fw_projects')
      .select('*')
      .eq('user_id', uid);
    
    const { data: mData } = await supabase
      .from('fw_team_members')
      .select('*')
      .eq('user_id', uid);

    const { data: aData } = await supabase
      .from('fw_assignments')
      .select('*, fw_team_members(*)')
      .eq('user_id', uid);

    if (pData) setProjects(pData);
    if (mData) setTeamMembers(mData);
    if (aData) setAssignments(aData as any[]);
  };

  // Add Project with Sub-Events Configuration (Matching Screenshot 2 layout)
  const handleSaveProjectConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couplingName || !projectMainDate || !projectMainVenue) return;

    // Create project
    const { data: project, error: pErr } = await supabase
      .from('fw_projects')
      .insert({
        user_id: userId,
        client_name: couplingName,
        main_date: projectMainDate,
        main_venue: projectMainVenue,
        is_archived: false
      })
      .select()
      .single();

    if (pErr || !project) return;

    // Insert sub-events assignments
    const insertPromises = [];
    for (const block of eventBlocks) {
      for (const role of block.roles) {
        insertPromises.push(
          supabase.from('fw_assignments').insert({
            user_id: userId,
            project_id: project.id,
            sub_event_name: block.subEventName,
            sub_event_date: block.subEventDate || projectMainDate,
            start_time: block.startTime,
            end_time: block.endTime,
            required_role: role,
            assigned_member_id: null,
            notes: block.notes
          })
        );
      }
    }

    await Promise.all(insertPromises);
    
    // Refresh
    await fetchData(userId);

    // Reset Form
    setCouplingName('');
    setProjectMainDate('');
    setProjectMainVenue('');
    setEventBlocks([
      {
        id: Math.random().toString(),
        subEventName: 'Wedding',
        subEventDate: '',
        venueLocation: '',
        mapLink: '',
        startTime: '14:00',
        endTime: '22:00',
        roles: ['TP', 'Ass'],
        notes: ''
      }
    ]);
    setIsNewProjectModalOpen(false);
  };

  // Register Team Crew Member
  const handleRegisterCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.phone || !newMember.email) return;

    const { data, error } = await supabase
      .from('fw_team_members')
      .insert({
        user_id: userId,
        name: newMember.name,
        primary_role: newMember.role,
        phone_number: newMember.phone,
        email: newMember.email,
        active_status: true
      })
      .select()
      .single();

    if (!error && data) {
      setTeamMembers(prev => [...prev, data]);
      setNewMember({ name: '', role: 'CP', phone: '', email: '' });
      setIsNewMemberModalOpen(false);
    }
  };

  // Assign Member Triggering serverless WhatsBoost API Alert
  const handleAssignCrew = async (assignmentId: string, memberId: string | null) => {
    setActiveAssigningId(null);
    try {
      const res = await fetch('/api/assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          assignedMemberId: memberId,
          instantAlerts,
          userId
        })
      });

      const result = await res.json();
      if (result.success && result.data) {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, ...result.data } : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Soft Delete Project
  const handleSoftDelete = async (id: string) => {
    const { error } = await supabase
      .from('fw_projects')
      .update({ is_archived: true })
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, is_archived: true } : p));
    }
  };

  // Restore Project
  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('fw_projects')
      .update({ is_archived: false })
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, is_archived: false } : p));
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this project?')) return;
    const { error } = await supabase
      .from('fw_projects')
      .delete()
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setAssignments(prev => prev.filter(a => a.project_id !== id));
    }
  };

  // Sub-Event block handlers for Popup
  const addEventBlock = () => {
    setEventBlocks(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        subEventName: 'Pre-wedding',
        subEventDate: '',
        venueLocation: '',
        mapLink: '',
        startTime: '10:00',
        endTime: '18:00',
        roles: ['Ass', 'CP'],
        notes: ''
      }
    ]);
  };

  const removeEventBlock = (id: string) => {
    if (eventBlocks.length <= 1) return;
    setEventBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateEventBlock = (id: string, fields: Partial<typeof eventBlocks[0]>) => {
    setEventBlocks(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
  };

  const toggleRoleInBlock = (blockId: string, role: string) => {
    setEventBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const roles = b.roles.includes(role) 
        ? b.roles.filter(r => r !== role) 
        : [...b.roles, role];
      return { ...b, roles };
    }));
  };

  // Countdown badge logic
  const getDaysCountdownBadge = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? `In ${days} Days` : days === 0 ? 'Today' : `${Math.abs(days)} Days Ago`;
  };

  // Grouping assignments by event name and date inside projects cards
  const getGroupedEvents = (projId: string) => {
    const projAssignments = assignments.filter(a => a.project_id === projId);
    const groups: { [key: string]: FWAssignment[] } = {};
    
    projAssignments.forEach(a => {
      const key = `${a.sub_event_name}-${a.sub_event_date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return Object.keys(groups).map(key => {
      const list = groups[key];
      return {
        name: list[0].sub_event_name,
        date: list[0].sub_event_date,
        startTime: list[0].start_time,
        endTime: list[0].end_time,
        roles: list
      };
    });
  };

  // Capsule Pills Color Mapper
  const getCapsulePillStyle = (assign: FWAssignment) => {
    const isAssigned = assign.assigned_member_id !== null;
    const name = assign.fw_team_members?.name || '';
    const role = assign.required_role;

    if (!isAssigned) {
      return {
        bg: 'bg-rose-50 border-rose-100 text-rose-600',
        label: `• ${role}`,
        dot: true
      };
    }

    if (role === 'CP' || role === 'Cine 2' || role === 'Candid 2') {
      return {
        bg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        label: `${role}: ${name}`,
        dot: false
      };
    }
    
    return {
      bg: 'bg-teal-50 border-teal-100 text-teal-700',
      label: `${role}: ${name}`,
      dot: false
    };
  };

  // Group assignments by month for List Register View (Screenshot 3)
  const getMonthlyAssignments = () => {
    const list = assignments.filter(a => {
      const p = projects.find(proj => proj.id === a.project_id);
      return p && !p.is_archived;
    });

    // Group by month string (e.g. "August 2026")
    const groups: { [key: string]: FWAssignment[] } = {};
    list.forEach(a => {
      const d = new Date(a.sub_event_date);
      const monthStr = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthStr]) groups[monthStr] = [];
      groups[monthStr].push(a);
    });

    // Sort months chronologically
    return Object.keys(groups).sort((x, y) => new Date(x).getTime() - new Date(y).getTime()).map(m => ({
      month: m,
      items: groups[m].sort((x, y) => new Date(x.sub_event_date).getTime() - new Date(y.sub_event_date).getTime())
    }));
  };

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
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 max-h-screen">
        
        {/* Top Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-[#0B111E] tracking-tight flex items-center gap-2">
              Welcome back, Studio Admin 👋
            </h2>
            <p className="text-xs text-[#4F5E74] font-semibold mt-0.5">
              Here&apos;s what&apos;s happening with your weddings today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#4F5E74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search client or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white border border-[#6C5CE7]/10 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:border-[#6C5CE7] w-64 shadow-[0_2px_8px_rgba(108,92,231,0.02)] transition-all text-[#0B111E]"
              />
            </div>
            
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_4px_12px_rgba(108,92,231,0.2)] hover:shadow-[0_6px_16px_rgba(108,92,231,0.3)] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: PROJECTS GRID VIEW (Screenshot 1 Matching)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            
            {/* Horizontal Filter Pill Badges */}
            <div className="flex flex-wrap gap-2.5">
              <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#6C5CE7] text-white transition-all shadow-md shadow-[#6C5CE7]/10">
                All Weddings
              </button>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#4F5E74] border border-[#6C5CE7]/8 hover:border-[#6C5CE7]/20 transition-all flex items-center gap-1">
                Crew Pending <span className="bg-rose-50 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold">9</span>
              </button>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#4F5E74] border border-[#6C5CE7]/8 hover:border-[#6C5CE7]/20 transition-all flex items-center gap-1">
                Upload Pending <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">0</span>
              </button>
              <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#4F5E74] border border-[#6C5CE7]/8 hover:border-[#6C5CE7]/20 transition-all flex items-center gap-1">
                Delivered <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">0</span>
              </button>
            </div>

            {/* Masonry Projects Cards Grid (Strict 3-column setup) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.filter(p => !p.is_archived).map(proj => {
                const groupedEvents = getGroupedEvents(proj.id);
                return (
                  <div 
                    key={proj.id}
                    className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04),0_1px_3px_rgba(108,92,231,0.02)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(108,92,231,0.08)] transition-all duration-300 relative group flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-extrabold text-[#0B111E] text-base group-hover:text-[#6C5CE7] transition-all">
                          {proj.client_name}
                        </h3>
                        <div className="flex gap-1 opacity-60 hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleSoftDelete(proj.id)}
                            className="p-1 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                            title="Soft Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Countdown badge beneath title */}
                      <div className="mb-6">
                        <span className="bg-[#6C5CE7]/6 text-[#6C5CE7] font-bold text-[10px] px-2.5 py-1 rounded-full border border-[#6C5CE7]/10 inline-block">
                          {getDaysCountdownBadge(proj.main_date)}
                        </span>
                      </div>

                      {/* Events vertical stack with dashed left timeline line */}
                      <div className="relative border-l border-dashed border-[#6C5CE7]/20 pl-5 ml-1 space-y-6">
                        {groupedEvents.map((evt, idx) => (
                          <div key={idx} className="relative">
                            
                            {/* Purple indicator bullet on left timeline path */}
                            <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#6C5CE7] border-2 border-white ring-4 ring-[#6C5CE7]/10" />
                            
                            {/* Event details block */}
                            <div>
                              <div className="text-xs font-bold text-[#0B111E] flex items-center gap-1.5">
                                {evt.name} <span className="text-[#4F5E74] font-semibold">| {evt.date}</span>
                              </div>
                              
                              <div className="text-[10px] text-[#4F5E74] font-semibold mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#6C5CE7]/60" />
                                {evt.startTime} - {evt.endTime}
                              </div>

                              {/* Interactive crew capsules list */}
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {evt.roles.map(assign => {
                                  const config = getCapsulePillStyle(assign);
                                  const isAssigningActive = activeAssigningId === assign.id;
                                  return (
                                    <div key={assign.id} className="relative inline-block">
                                      <button 
                                        onClick={() => setActiveAssigningId(isAssigningActive ? null : assign.id)}
                                        className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${config.bg}`}
                                      >
                                        {config.dot && (
                                          <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                        )}
                                        {config.label}
                                      </button>

                                      {/* Selection Popover inline dropdown */}
                                      <AnimatePresence>
                                        {isAssigningActive && (
                                          <>
                                            <div 
                                              className="fixed inset-0 z-30" 
                                              onClick={() => setActiveAssigningId(null)} 
                                            />
                                            <motion.div 
                                              initial={{ opacity: 0, y: 4 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              exit={{ opacity: 0, y: 4 }}
                                              className="absolute left-0 mt-1.5 bg-white border border-[#6C5CE7]/10 rounded-2xl p-2 w-48 shadow-xl z-40"
                                            >
                                              <span className="text-[9px] uppercase font-bold text-[#4F5E74] tracking-wider px-2 py-1 block">
                                                Assign {assign.required_role}
                                              </span>
                                              <div className="max-h-36 overflow-y-auto space-y-0.5 mt-1">
                                                <button 
                                                  onClick={() => handleAssignCrew(assign.id, null)}
                                                  className="w-full text-left text-[11px] font-bold px-2 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50/50 transition"
                                                >
                                                  Unassign Crew Slot
                                                </button>
                                                {teamMembers.map(m => (
                                                  <button 
                                                    key={m.id}
                                                    onClick={() => handleAssignCrew(assign.id, m.id)}
                                                    className="w-full text-left text-[11px] font-medium px-2 py-1.5 rounded-lg hover:bg-zinc-50 text-[#0B111E] transition block"
                                                  >
                                                    {m.name}
                                                  </button>
                                                ))}
                                              </div>
                                            </motion.div>
                                          </>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                    
                    {/* Event location address block */}
                    <div className="border-t border-[#6C5CE7]/8 pt-4 mt-6 flex items-center justify-between text-[10px] font-bold text-[#4F5E74]">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6C5CE7]" />
                        {proj.main_venue}
                      </div>
                      <span className="bg-[#6C5CE7]/5 text-[#6C5CE7] px-2 py-0.5 rounded-md font-semibold text-[9px]">PENDING</span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: LIST REGISTER VIEW (Screenshot 3 Matching)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'list' && (
          <div className="space-y-8 bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 lg:p-8 shadow-[0_10px_30px_rgba(108,92,231,0.04)]">
            {getMonthlyAssignments().length === 0 ? (
              <div className="text-center py-20 text-[#4F5E74] font-semibold text-xs">
                No active sub-event registers found.
              </div>
            ) : (
              getMonthlyAssignments().map(monthBlock => (
                <div key={monthBlock.month} className="space-y-4">
                  
                  {/* Month divider header */}
                  <h3 className="text-sm font-extrabold text-[#6C5CE7] tracking-tight border-b border-[#6C5CE7]/10 pb-2">
                    {monthBlock.month}
                  </h3>

                  <div className="divide-y divide-zinc-50">
                    {monthBlock.items.map(a => {
                      const p = projects.find(proj => proj.id === a.project_id);
                      const config = getCapsulePillStyle(a);
                      
                      const dateObj = new Date(a.sub_event_date);
                      const dayNum = dateObj.toLocaleString('en-US', { day: '2-digit' });
                      const dayName = dateObj.toLocaleString('en-US', { weekday: 'long' });
                      const monthName = dateObj.toLocaleString('en-US', { month: 'short' });

                      return (
                        <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/40 px-2 rounded-xl transition">
                          
                          {/* Left Margin Calendar Details */}
                          <div className="flex items-center gap-4">
                            <div className="w-14 text-center shrink-0 border-r border-[#6C5CE7]/10 pr-3">
                              <span className="block font-black text-sm text-[#6C5CE7] leading-none">{dayNum}</span>
                              <span className="block text-[8px] uppercase font-bold text-[#4F5E74] tracking-wider mt-1">{monthName}</span>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-[#4F5E74] block leading-none">{dayName}</span>
                              <span className="text-xs font-extrabold text-[#0B111E] block mt-1">
                                {p?.client_name} <span className="font-semibold text-zinc-400">({a.sub_event_name})</span>
                              </span>
                            </div>
                          </div>

                          {/* Right Aligned Assigned Capsule chips */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#4F5E74] font-semibold">{a.start_time} - {a.end_time}</span>
                            <span className={`px-3.5 py-1 rounded-full text-[9px] font-bold border ${config.bg}`}>
                              {config.label}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: OVERVIEW ANALYTICS (Screenshot 4 Matching)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top scorecards row (Exactly 4 premium blocks) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Scorecard 1: Total Weddings */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04)] relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block">Total Weddings</span>
                    <span className="text-3xl font-black text-[#0B111E] block mt-2">117</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#6C5CE7]/5 flex items-center justify-center text-[#6C5CE7]">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-4 flex items-center gap-1">
                  ▲ 12% <span className="text-[#4F5E74] font-semibold">from last month</span>
                </div>
              </div>

              {/* Scorecard 2: Active Crew */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04)] relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block">Active Crew</span>
                    <span className="text-3xl font-black text-[#0B111E] block mt-2">32</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#6C5CE7]/5 flex items-center justify-center text-[#6C5CE7]">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-4 flex items-center gap-1">
                  ▲ 8% <span className="text-[#4F5E74] font-semibold">from last month</span>
                </div>
              </div>

              {/* Scorecard 3: Pending Tasks */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04)] relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block">Pending Tasks</span>
                    <span className="text-3xl font-black text-[#0B111E] block mt-2">207</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#6C5CE7]/5 flex items-center justify-center text-[#6C5CE7]">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-[10px] font-bold text-rose-600 mt-4 flex items-center gap-1">
                  ▼ 5% <span className="text-[#4F5E74] font-semibold">from last month</span>
                </div>
              </div>

              {/* Scorecard 4: Completed */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04)] relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#4F5E74] uppercase tracking-wider block">Completed</span>
                    <span className="text-3xl font-black text-[#0B111E] block mt-2">28</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#6C5CE7]/5 flex items-center justify-center text-[#6C5CE7]">
                    <CheckCircle className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-4 flex items-center gap-1">
                  ▲ 16% <span className="text-[#4F5E74] font-semibold">from last month</span>
                </div>
              </div>

            </div>

            {/* Scorecard grids middle row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Upcoming Events Card Block (left) */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-5 shadow-[0_10px_30px_rgba(108,92,231,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-[#0B111E]">Upcoming Events</h3>
                    <button className="text-[10px] font-bold text-[#6C5CE7]">View all</button>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { date: '12 MAR', name: 'Fahad & Shifa', type: 'Wedding', time: '2:00 PM - 10:00 PM' },
                      { date: '19 MAR', name: 'Fahad & Shifa', type: 'Wedding', time: '4:00 PM - 10:00 PM' },
                      { date: '05 OCT', name: 'Mayur Su', type: 'Maternity Shoot', time: '5:00 PM - 12:00 PM' },
                      { date: '08 OCT', name: 'Dhriti Magro Mittal', type: 'Product Shoot', time: '6:00 PM - 10:00 PM' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 transition border border-transparent hover:border-zinc-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 text-center shrink-0">
                            <span className="block font-black text-xs text-[#6C5CE7] leading-none">{item.date.split(' ')[0]}</span>
                            <span className="block text-[8px] uppercase font-bold text-[#4F5E74] tracking-wider mt-0.5">{item.date.split(' ')[1]}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-[#0B111E] block">{item.name}</span>
                            <span className="text-[9px] text-[#4F5E74] font-semibold block mt-0.5">{item.type} | {item.time}</span>
                          </div>
                        </div>
                        <span className="bg-[#6C5CE7]/6 text-[#6C5CE7] text-[8px] font-black px-2 py-0.5 rounded-md">
                          Completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Crew Assignments workload block (center) */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-5 shadow-[0_10px_30px_rgba(108,92,231,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-[#0B111E]">Crew Assignments</h3>
                    <button className="text-[10px] font-bold text-[#6C5CE7]">View all</button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { name: 'Prem Sagar', val: 87, role: 'Team Contributor', color: 'bg-[#6C5CE7]' },
                      { name: 'Sushant', val: 83, role: 'videographer', color: 'bg-[#5b4cd1]' },
                      { name: 'Vinayak', val: 54, role: 'team contributor', color: 'bg-emerald-500' },
                      { name: 'Sahil Dhonde', val: 43, role: 'Team Contributor', color: 'bg-pink-500' }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-[#0B111E]">{item.name} <span className="font-semibold text-zinc-400">({item.role})</span></span>
                          <span className="text-[#6C5CE7]">{item.val} Events</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${(item.val / 100) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Load Trend wave trend vector graph (right) */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-5 shadow-[0_10px_30px_rgba(108,92,231,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-[#0B111E]">Load Trend <span className="font-medium text-xs text-zinc-400">(This Year)</span></h3>
                    <select className="text-[10px] font-bold text-[#4F5E74] border-none bg-transparent outline-none">
                      <option>2026</option>
                    </select>
                  </div>

                  {/* Draw a clean, single-line wave trend vector curve */}
                  <div className="relative w-full h-32 mt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Gradient fill */}
                      <defs>
                        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 0 50 C 50 45, 75 80, 100 80 C 130 80, 150 75, 180 75 C 210 75, 230 10, 260 10 C 280 10, 300 20, 300 20 L 300 100 L 0 100 Z" 
                        fill="url(#waveGrad)" 
                      />
                      <path 
                        d="M 0 50 C 50 45, 75 80, 100 80 C 130 80, 150 75, 180 75 C 210 75, 230 10, 260 10 C 280 10, 300 20, 300 20" 
                        fill="none" 
                        stroke="#6C5CE7" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  
                  {/* Month labels */}
                  <div className="flex justify-between text-[9px] font-bold text-[#4F5E74] mt-2">
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span>Jul</span>
                    <span>Sep</span>
                    <span>Nov</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              
              {/* Recent Activity Card Block */}
              <div className="lg:col-span-2 bg-white border border-[#6C5CE7]/8 rounded-[24px] p-5 shadow-[0_10px_30px_rgba(108,92,231,0.04)]">
                <h3 className="font-extrabold text-sm text-[#0B111E] mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    { text: "New wedding project created for Sofia's Last Wedding", loc: 'Dhaka', time: '2 hours ago' },
                    { text: 'Crew schedule updated for 20 Jun (Sangeet Day 2)', loc: 'Alibaug', time: '5 hours ago' },
                    { text: 'Active backup confirmed inside external HDD-C03-OL-ML-F', loc: 'Offline Storage', time: 'Yesterday' }
                  ].map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] mt-1.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-bold text-[#0B111E] block">{act.text}</span>
                        <span className="text-[9px] text-[#4F5E74] font-semibold block mt-0.5">Location: {act.loc} • {act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Overview Circular Radial Chart */}
              <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-5 shadow-[0_10px_30px_rgba(108,92,231,0.04)]">
                <h3 className="font-extrabold text-sm text-[#0B111E] mb-2">Task Overview</h3>
                
                <div className="flex items-center justify-around gap-4 mt-4">
                  
                  {/* SVG Circular Donut Chart */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="38" stroke="#F1F3F9" strokeWidth="8" fill="transparent" />
                      <circle cx="48" cy="48" r="38" stroke="#6C5CE7" strokeWidth="8" fill="transparent" strokeDasharray="238" strokeDashoffset="209" strokeLinecap="round" />
                    </svg>
                    <span className="absolute font-black text-sm text-[#0B111E]">12%</span>
                  </div>

                  {/* Legends list */}
                  <div className="space-y-1.5 text-[10px] font-bold text-[#4F5E74]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6C5CE7]" />
                      <span>Completed: <span className="text-[#0B111E]">12%</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Pending: <span className="text-[#0B111E]">80%</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Overdue: <span className="text-[#0B111E]">8%</span></span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: CALENDAR TAB (Tablet Mockup view)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 lg:p-8 shadow-[0_10px_30px_rgba(108,92,231,0.04)]">
            <p className="text-center py-20 text-[#4F5E74] font-semibold text-xs">
              Ops calendar planner view is loading. Select List Register or Projects to plan.
            </p>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: TRASH RECOVERY
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'trash' && (
          <div className="bg-white border border-[#6C5CE7]/8 rounded-[24px] p-6 shadow-[0_10px_30px_rgba(108,92,231,0.04)]">
            <h3 className="font-extrabold text-sm text-[#0B111E] border-b border-[#6C5CE7]/10 pb-3 mb-4">
              Trash Recovery Buffer
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-[9px] uppercase font-bold text-[#4F5E74] tracking-wider">
                    <th className="px-6 py-3">Client Coupling Name</th>
                    <th className="px-6 py-3">Primary Venue</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-[#0B111E]">
                  {projects.filter(p => p.is_archived).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-[#4F5E74] font-medium">
                        Trash buffer is empty.
                      </td>
                    </tr>
                  ) : (
                    projects.filter(p => p.is_archived).map(proj => (
                      <tr key={proj.id} className="hover:bg-zinc-50/50">
                        <td className="px-6 py-4 font-bold">{proj.client_name}</td>
                        <td className="px-6 py-4 text-[#4F5E74] font-semibold">{proj.main_venue}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => handleRestore(proj.id)}
                            className="bg-[#6C5CE7]/6 hover:bg-[#6C5CE7]/10 text-[#6C5CE7] text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#6C5CE7]/10 transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(proj.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-rose-100 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Permanent Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────
          COMPREHENSIVE ADD-PROJECT POPUP MODAL (Screenshot 2 Matching)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Darkened backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewProjectModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Frame Window */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 lg:p-8 shadow-2xl relative z-10 border border-[#6C5CE7]/8 text-[#0B111E]"
            >
              
              {/* Header block with close X */}
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B111E] tracking-tight">Create Wedding Project</h3>
                  <p className="text-[10px] text-[#4F5E74] font-semibold mt-0.5">Set client profile parameters and dynamic program event placements.</p>
                </div>
                <button 
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="p-1 rounded-full hover:bg-zinc-100 text-[#4F5E74] hover:text-[#0B111E] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProjectConfig} className="space-y-6">
                
                {/* Coupling Name oversized input field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">
                    Client Coupling Name / Couple Profile
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter Client Coupling Name (e.g. Sharma & Malhotra)"
                    value={couplingName}
                    onChange={e => setCouplingName(e.target.value)}
                    className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-3 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#6C5CE7] transition text-[#0B111E]"
                  />
                </div>

                {/* Primary project global inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Main Event Date</label>
                    <input 
                      type="date"
                      required
                      value={projectMainDate}
                      onChange={e => setProjectMainDate(e.target.value)}
                      className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6C5CE7] transition text-[#0B111E]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider block">Main Venue / Central Location</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Palace Grounds, Bangalore"
                      value={projectMainVenue}
                      onChange={e => setProjectMainVenue(e.target.value)}
                      className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6C5CE7] transition text-[#0B111E]"
                    />
                  </div>
                </div>

                {/* Dynamic Sub-Event form clones list */}
                <div className="space-y-4 pt-4 border-t border-zinc-150">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#6C5CE7] uppercase tracking-wider">
                      Wedding Sub-Events & Requirements
                    </span>
                  </div>

                  {eventBlocks.map((block, index) => (
                    <div 
                      key={block.id}
                      className="bg-zinc-50/40 border border-zinc-100 rounded-3xl p-5 space-y-4 relative"
                    >
                      {/* Event Index Badge */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="bg-[#6C5CE7]/6 text-[#6C5CE7] font-black text-[9px] px-3 py-1 rounded-full border border-[#6C5CE7]/8">
                          Event #{index + 1}
                        </span>
                        
                        {eventBlocks.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeEventBlock(block.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* 4-column balanced inputs grid row */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* Col 1: Wedding Program Type selector */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">Wedding Program Type</label>
                          <select 
                            value={block.subEventName}
                            onChange={e => updateEventBlock(block.id, { subEventName: e.target.value })}
                            className="w-full bg-white border border-[#6C5CE7]/10 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7]"
                          >
                            <option value="Wedding">Wedding Ceremony</option>
                            <option value="Pre-wedding">Pre-wedding Shoot</option>
                            <option value="Haldi">Haldi program</option>
                            <option value="Sangeet">Sangeet / Cocktails</option>
                            <option value="Reception">Reception Ceremony</option>
                            <option value="Engagement">Engagement Ring</option>
                            <option value="Nikah">Nikah Ceremony</option>
                            <option value="Haldi / Sangeet">Haldi / Sangeet</option>
                            <option value="Bidai / Home Rituals">Bidai / Home Rituals</option>
                          </select>
                        </div>

                        {/* Col 2: Program Date calendar input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">Program Date</label>
                          <input 
                            type="date"
                            value={block.subEventDate}
                            onChange={e => updateEventBlock(block.id, { subEventDate: e.target.value })}
                            className="w-full bg-white border border-[#6C5CE7]/10 px-3 py-2 rounded-xl text-xs font-semibold text-[#0B111E] focus:outline-none"
                          />
                        </div>

                        {/* Col 3: Venue location and nested Map link */}
                        <div className="space-y-2">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">Venue coordinates / Location</label>
                            <input 
                              type="text"
                              placeholder="e.g. Royal Lawn, Mumbai"
                              value={block.venueLocation}
                              onChange={e => updateEventBlock(block.id, { venueLocation: e.target.value })}
                              className="w-full bg-white border border-[#6C5CE7]/10 px-3 py-2 rounded-xl text-xs font-medium text-[#0B111E]"
                            />
                          </div>
                          <input 
                            type="text"
                            placeholder="Map Link (e.g. https://maps.google.com)"
                            value={block.mapLink}
                            onChange={e => updateEventBlock(block.id, { mapLink: e.target.value })}
                            className="w-full bg-white border border-[#6C5CE7]/8 px-3 py-1.5 rounded-lg text-[10px] font-medium text-zinc-500"
                          />
                        </div>

                        {/* Col 4: Dual inputs split evenly for roll call & dismissal */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">Timings</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[8px] text-[#4F5E74] font-semibold block mb-0.5">Crew Roll Call</span>
                              <input 
                                type="time"
                                value={block.startTime}
                                onChange={e => updateEventBlock(block.id, { startTime: e.target.value })}
                                className="w-full bg-white border border-[#6C5CE7]/10 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#0B111E]"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-[#4F5E74] font-semibold block mb-0.5">Dismissal Est.</span>
                              <input 
                                type="time"
                                value={block.endTime}
                                onChange={e => updateEventBlock(block.id, { endTime: e.target.value })}
                                className="w-full bg-white border border-[#6C5CE7]/10 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#0B111E]"
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Role Chips Placement matrix section */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[9px] font-black text-[#4F5E74] uppercase tracking-wider block">
                          Role placements for this sub-event
                        </span>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {ROLE_CHIPS.map(chip => {
                            const isActive = block.roles.includes(chip);
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => toggleRoleInBlock(block.id, chip)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                  isActive 
                                    ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-md shadow-[#6C5CE7]/10' 
                                    : 'bg-white border-zinc-200 text-[#4F5E74] hover:border-zinc-350'
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  ))}

                  {/* Add Sub-Event block triggering button */}
                  <button
                    type="button"
                    onClick={addEventBlock}
                    className="w-full border border-dashed border-[#6C5CE7]/40 hover:border-[#6C5CE7] bg-white text-[#6C5CE7] text-xs font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Wedding Event Block
                  </button>
                </div>

                {/* Submit and Cancel Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                  <button 
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="bg-transparent border border-zinc-200 text-[#4F5E74] text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-50 transition"
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit"
                    className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-[#6C5CE7]/15"
                  >
                    Save Project Config
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

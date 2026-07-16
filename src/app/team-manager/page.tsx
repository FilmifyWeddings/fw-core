'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, List, Plus, Trash2, RotateCcw, Check, X, 
  Send, AlertCircle, Eye, Search, Filter, Loader2, Sparkles, MapPin, 
  Clock, CheckCircle, Info, Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { FWProject, FWTeamMember, FWAssignment } from '@/types';

export default function TeamManagerPage() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'calendar' | 'trash'>('ledger');
  
  // Real-time operational data states
  const [projects, setProjects] = useState<FWProject[]>([]);
  const [teamMembers, setTeamMembers] = useState<FWTeamMember[]>([]);
  const [assignments, setAssignments] = useState<FWAssignment[]>([]);
  
  // Settings & Filter states
  const [instantAlerts, setInstantAlerts] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // UI Interactive States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  // Modals / Creators
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({ clientName: '', mainDate: '', mainVenue: '' });
  const [newMember, setNewMember] = useState({ name: '', role: 'Lead Photographer', phone: '', email: '' });
  const [newAssignment, setNewAssignment] = useState({
    projectId: '', subEventName: '', subEventDate: '', startTime: '10:00', endTime: '18:00', requiredRole: 'Lead Photographer'
  });

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
    // 1. Fetch active projects
    const { data: pData } = await supabase
      .from('fw_projects')
      .select('*')
      .eq('user_id', uid);
    
    // 2. Fetch team members
    const { data: mData } = await supabase
      .from('fw_team_members')
      .select('*')
      .eq('user_id', uid);

    // 3. Fetch assignments
    const { data: aData } = await supabase
      .from('fw_assignments')
      .select('*, fw_team_members(*)')
      .eq('user_id', uid);

    if (pData) setProjects(pData);
    if (mData) setTeamMembers(mData);
    if (aData) setAssignments(aData as any[]);
  };

  // Add Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.clientName || !newProject.mainDate || !newProject.mainVenue) return;
    
    const { data, error } = await supabase
      .from('fw_projects')
      .insert({
        user_id: userId,
        client_name: newProject.clientName,
        main_date: newProject.mainDate,
        main_venue: newProject.mainVenue,
        is_archived: false
      })
      .select()
      .single();

    if (!error && data) {
      setProjects(prev => [...prev, data]);
      setNewProject({ clientName: '', mainDate: '', mainVenue: '' });
      setIsNewProjectModalOpen(false);
    }
  };

  // Add Team Member
  const handleAddMember = async (e: React.FormEvent) => {
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
      setNewMember({ name: '', role: 'Lead Photographer', phone: '', email: '' });
      setIsNewMemberModalOpen(false);
    }
  };

  // Add Sub-Event Assignment
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.projectId || !newAssignment.subEventName || !newAssignment.subEventDate) return;

    const { data, error } = await supabase
      .from('fw_assignments')
      .insert({
        user_id: userId,
        project_id: newAssignment.projectId,
        sub_event_name: newAssignment.subEventName,
        sub_event_date: newAssignment.subEventDate,
        start_time: newAssignment.startTime,
        end_time: newAssignment.endTime,
        required_role: newAssignment.requiredRole,
        assigned_member_id: null
      })
      .select('*, fw_team_members(*)')
      .single();

    if (!error && data) {
      setAssignments(prev => [...prev, data as any]);
      setNewAssignment({
        projectId: '', subEventName: '', subEventDate: '', startTime: '10:00', endTime: '18:00', requiredRole: 'Lead Photographer'
      });
      setIsNewAssignmentModalOpen(false);
    }
  };

  // Soft-Delete Project (Move to Trash Bin)
  const handleSoftDeleteProject = async (id: string) => {
    const { error } = await supabase
      .from('fw_projects')
      .update({ is_archived: true })
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, is_archived: true } : p));
    }
  };

  // Restore Project from Trash Bin
  const handleRestoreProject = async (id: string) => {
    const { error } = await supabase
      .from('fw_projects')
      .update({ is_archived: false })
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, is_archived: false } : p));
    }
  };

  // Permanent Delete Project (Cascading Triggers)
  const handlePermanentDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this project? All events and crew assignments will be lost.')) return;
    const { error } = await supabase
      .from('fw_projects')
      .delete()
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setAssignments(prev => prev.filter(a => a.project_id !== id));
    }
  };

  // Re-assign Member Endpoint Orchestration
  const handleAssignMember = async (assignmentId: string, assignedMemberId: string | null) => {
    try {
      const res = await fetch('/api/assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          assignedMemberId,
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

  // Calendar event calculations
  const getSubEventColorDot = (role: string) => {
    if (role.toLowerCase().includes('wedding')) return 'bg-yellow-500';
    if (role.toLowerCase().includes('sangeet')) return 'bg-purple-500';
    if (role.toLowerCase().includes('reception')) return 'bg-green-500';
    return 'bg-blue-500';
  };

  // Date selectors helper
  const getDaysInMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Shift index to start Monday-Sunday (index 0 is Monday)
    const shiftedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const days = [];
    for (let i = 0; i < shiftedFirstDay; i++) {
      days.push(null); // empty blocks before month starts
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d).toISOString().split('T')[0]);
    }
    return days;
  };

  // Filters calculations
  const filteredAssignments = assignments.filter(assign => {
    const project = projects.find(p => p.id === assign.project_id);
    if (!project || project.is_archived) return false;

    const matchesSearch = project.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          assign.sub_event_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || assign.required_role === roleFilter;
    
    const isAssigned = assign.assigned_member_id !== null;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'assigned' && isAssigned) || 
                          (statusFilter === 'pending' && !isAssigned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#05070B] text-zinc-100 p-4 lg:p-8 font-sans antialiased">
      
      {/* 1. Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6C5CE7]" />
            FW Team & Operations Workstation
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time crew allocations, calendar planning boards, and WhatsBoost transactional notifications gateway.
          </p>
        </div>

        {/* Global Instant Alert Switch */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 bg-zinc-900/60 px-4 py-2 rounded-xl border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300">WhatsBoost Outbound Alerts</span>
            <button 
              onClick={() => setInstantAlerts(!instantAlerts)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                instantAlerts ? 'bg-[#6C5CE7]' : 'bg-zinc-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                instantAlerts ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
          
          {/* Quick Create Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => setIsNewProjectModalOpen(true)}
              className="bg-[#6C5CE7] hover:bg-[#6C5CE7]/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#6C5CE7]/10"
            >
              <Plus className="w-3.5 h-3.5" /> Project
            </button>
            <button 
              onClick={() => setIsNewMemberModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Crew
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs & Search */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900/40 p-1 rounded-xl border border-zinc-900/60 max-w-sm">
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ledger' ? 'bg-[#6C5CE7] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Assignments Ledger
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'calendar' ? 'bg-[#6C5CE7] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendar Board
          </button>
          <button 
            onClick={() => setActiveTab('trash')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'trash' ? 'bg-[#6C5CE7] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trash className="w-3.5 h-3.5" /> Trash Recovery
          </button>
        </div>

        {/* Ledger view Filters (Desktop layout) */}
        {activeTab === 'ledger' && (
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search clients, events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#121824] border border-zinc-800 pl-9 pr-4 py-2 text-xs rounded-xl text-zinc-200 focus:outline-none focus:border-[#6C5CE7] w-60"
              />
            </div>
            
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-[#121824] border border-zinc-800 px-3 py-2 text-xs rounded-xl text-zinc-300 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="Lead Photographer">Lead Photographer</option>
              <option value="Second Photographer">Second Photographer</option>
              <option value="Cinematographer">Cinematographer</option>
              <option value="Drone Pilot">Drone Pilot</option>
              <option value="Editor">Editor</option>
            </select>

            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#121824] border border-zinc-800 px-3 py-2 text-xs rounded-xl text-zinc-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="assigned">Crew Assigned</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        )}

        {/* Mobile View Filter Trigger (viewport < 992px) */}
        {activeTab === 'ledger' && (
          <div className="lg:hidden flex justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#121824] border border-zinc-800 pl-9 pr-4 py-2.5 text-xs rounded-xl text-zinc-200 focus:outline-none focus:border-[#6C5CE7] w-full"
              />
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="bg-[#121824] border border-zinc-800 p-2.5 rounded-xl text-zinc-300 hover:text-white"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Workspace Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[#6C5CE7] animate-spin" />
          <span className="text-zinc-500 text-xs font-semibold">Loading operations dataset...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* LEDGER LIST VIEW TAB */}
          {activeTab === 'ledger' && (
            <motion.div 
              key="ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#121824]/40 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-900/30 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      <th className="px-6 py-4">Client / Project</th>
                      <th className="px-6 py-4">Sub Event</th>
                      <th className="px-6 py-4">Required Role</th>
                      <th className="px-6 py-4">Scheduled Date & Time</th>
                      <th className="px-6 py-4">Assigned Crew Member</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs text-zinc-300">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-semibold">
                          No crew assignments found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map(assign => {
                        const project = projects.find(p => p.id === assign.project_id);
                        return (
                          <tr key={assign.id} className="hover:bg-zinc-900/20 transition duration-150">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white text-sm">{project?.client_name}</div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#6C5CE7]" />
                                {project?.main_venue}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-zinc-200 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                                {assign.sub_event_name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[11px] font-semibold text-zinc-400">
                                {assign.required_role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-300">{assign.sub_event_date}</div>
                              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {assign.start_time} - {assign.end_time}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={assign.assigned_member_id || ''}
                                onChange={e => handleAssignMember(assign.id, e.target.value || null)}
                                className="bg-[#05070B] border border-zinc-850 px-3 py-1.5 text-xs rounded-xl text-zinc-200 focus:outline-none focus:border-[#6C5CE7] cursor-pointer max-w-[160px]"
                              >
                                <option value="">Pending Allocation</option>
                                {teamMembers
                                  .filter(m => m.active_status && m.primary_role === assign.required_role)
                                  .map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                  ))
                                }
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleSoftDeleteProject(assign.project_id)}
                                className="p-2 hover:bg-rose-950/40 text-rose-500 hover:text-rose-400 rounded-xl transition duration-150"
                                title="Soft Archive Project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TABLET MOCKUP CALENDAR BOARD TAB */}
          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              
              {/* Left Panel: Full Month Grid */}
              <div className="lg:col-span-2 bg-[#121824]/40 border border-zinc-900 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#6C5CE7]" />
                    Event Calendar Grid
                  </h3>
                  <span className="text-[11px] font-bold text-zinc-500">Monday - Sunday Matrix</span>
                </div>
                
                {/* Days Matrix Header */}
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                  <div>Sun</div>
                </div>

                {/* Days Cells */}
                <div className="grid grid-cols-7 gap-2">
                  {getDaysInMonth().map((dayStr, idx) => {
                    if (!dayStr) {
                      return <div key={`empty-${idx}`} className="aspect-square bg-zinc-950/20 border border-transparent rounded-xl" />;
                    }

                    const isSelected = selectedDate === dayStr;
                    const dateNum = new Date(dayStr).getDate();
                    const dayEvents = assignments.filter(a => a.sub_event_date === dayStr);

                    return (
                      <button
                        key={dayStr}
                        onClick={() => setSelectedDate(dayStr)}
                        className={`aspect-square p-2 border rounded-xl flex flex-col justify-between items-start transition duration-150 ${
                          isSelected 
                            ? 'bg-[#6C5CE7]/15 border-[#6C5CE7]' 
                            : 'bg-[#05070B]/50 border-zinc-900/60 hover:border-zinc-800'
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#6C5CE7]' : 'text-zinc-400'}`}>
                          {dateNum}
                        </span>
                        
                        {/* Sub-event Indicator Dots */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <span 
                              key={event.id}
                              className={`w-1.5 h-1.5 rounded-full ${getSubEventColorDot(event.sub_event_name)}`}
                              title={event.sub_event_name}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[8px] text-zinc-500 font-bold leading-none">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Focus Pipeline Area */}
              <div className="bg-[#121824]/40 border border-zinc-900 rounded-2xl p-5 shadow-2xl flex flex-col">
                <div className="border-b border-zinc-900 pb-4 mb-4">
                  <h3 className="text-sm font-bold text-white">Daily Focus Pipeline</h3>
                  <div className="text-[11px] text-[#6C5CE7] font-semibold mt-0.5">
                    Date: {selectedDate}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {(() => {
                    const dayAssignments = assignments.filter(a => a.sub_event_date === selectedDate);
                    if (dayAssignments.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 py-12">
                          <Info className="w-8 h-8 text-zinc-700 mb-2" />
                          <span className="text-xs font-semibold">No operations scheduled on this date.</span>
                        </div>
                      );
                    }

                    return dayAssignments.map(assign => {
                      const project = projects.find(p => p.id === assign.project_id);
                      const crewMember = teamMembers.find(m => m.id === assign.assigned_member_id);

                      return (
                        <div 
                          key={assign.id}
                          className="bg-[#05070B]/50 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:border-zinc-800 transition duration-150"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold text-[#6C5CE7] uppercase tracking-wider">
                                {project?.client_name}
                              </span>
                              <h4 className="text-xs font-bold text-white mt-0.5">{assign.sub_event_name}</h4>
                            </div>
                            <span className={`w-2.5 h-2.5 rounded-full ${getSubEventColorDot(assign.sub_event_name)}`} />
                          </div>

                          <div className="text-[10px] text-zinc-400 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              {assign.start_time} - {assign.end_time}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                              {project?.main_venue}
                            </div>
                          </div>

                          {/* Crew Allocation status in calendar right panel */}
                          <div className="border-t border-zinc-900/60 pt-3 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-500">Crew Member:</span>
                            {crewMember ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {crewMember.name}
                              </span>
                            ) : (
                              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* TRASH RECOVERY TAB */}
          {activeTab === 'trash' && (
            <motion.div 
              key="trash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#121824]/40 border border-zinc-900 rounded-2xl p-5 shadow-2xl"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-900/30 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Event Date</th>
                      <th className="px-6 py-4">Venue</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs text-zinc-300">
                    {projects.filter(p => p.is_archived).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 font-semibold">
                          Trash bin is currently empty.
                        </td>
                      </tr>
                    ) : (
                      projects.filter(p => p.is_archived).map(project => (
                        <tr key={project.id} className="hover:bg-zinc-900/20 transition duration-150">
                          <td className="px-6 py-4 font-bold text-white">{project.client_name}</td>
                          <td className="px-6 py-4 text-zinc-300">{project.main_date}</td>
                          <td className="px-6 py-4 text-zinc-450">{project.main_venue}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleRestoreProject(project.id)}
                              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-850 transition flex items-center gap-1"
                              title="Restore Project"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteProject(project.id)}
                              className="bg-rose-950/40 text-rose-500 hover:bg-rose-950 hover:text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-900/40 transition flex items-center gap-1"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* 4. MODALS & CREATION FLOWS */}

      {/* FILTER BOTTOM-SHEET MODAL (MOBILE) */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterModalOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-[#121824] border-t border-zinc-800 rounded-t-3xl p-6 z-50 lg:hidden"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#6C5CE7]" />
                  Ledger Filters
                </h4>
                <button onClick={() => setIsFilterModalOpen(false)} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Required Role</label>
                  <select 
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="bg-[#05070B] border border-zinc-800 px-3 py-2.5 text-xs rounded-xl text-zinc-300 focus:outline-none w-full"
                  >
                    <option value="all">All Roles</option>
                    <option value="Lead Photographer">Lead Photographer</option>
                    <option value="Second Photographer">Second Photographer</option>
                    <option value="Cinematographer">Cinematographer</option>
                    <option value="Drone Pilot">Drone Pilot</option>
                    <option value="Editor">Editor</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Allocation Status</label>
                  <select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-[#05070B] border border-zinc-800 px-3 py-2.5 text-xs rounded-xl text-zinc-300 focus:outline-none w-full"
                  >
                    <option value="all">All Status</option>
                    <option value="assigned">Crew Assigned</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="bg-[#6C5CE7] hover:bg-[#6C5CE7]/90 text-white text-xs font-bold py-3 rounded-xl w-full mt-4 transition"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NEW PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-zinc-850 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3.5 mb-4">
              <h3 className="text-sm font-bold text-white">Create New Project</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sahil & Priya"
                  value={newProject.clientName}
                  onChange={e => setNewProject(p => ({ ...p, clientName: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Main Event Date</label>
                <input 
                  type="date" 
                  value={newProject.mainDate}
                  onChange={e => setNewProject(p => ({ ...p, mainDate: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Main Venue Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Palace Grounds, Bangalore"
                  value={newProject.mainVenue}
                  onChange={e => setNewProject(p => ({ ...p, mainVenue: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="bg-transparent border border-zinc-800 text-zinc-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#6C5CE7] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#6C5CE7]/90 transition"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MEMBER MODAL */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-zinc-850 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3.5 mb-4">
              <h3 className="text-sm font-bold text-white">Register Crew Member</h3>
              <button onClick={() => setIsNewMemberModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Amit Sharma"
                  value={newMember.name}
                  onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Primary Role</label>
                <select 
                  value={newMember.role}
                  onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                >
                  <option value="Lead Photographer">Lead Photographer</option>
                  <option value="Second Photographer">Second Photographer</option>
                  <option value="Cinematographer">Cinematographer</option>
                  <option value="Drone Pilot">Drone Pilot</option>
                  <option value="Editor">Editor</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone Number (WhatsBoost alert destination)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 919876543210"
                  value={newMember.phone}
                  onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. amit@studio.com"
                  value={newMember.email}
                  onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="bg-transparent border border-zinc-800 text-zinc-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#6C5CE7] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#6C5CE7]/90 transition"
                >
                  Register Crew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW ASSIGNMENT / EVENT SCHEDULE MODAL */}
      {isNewAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-zinc-850 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3.5 mb-4">
              <h3 className="text-sm font-bold text-white">Create Sub-Event Assignment</h3>
              <button onClick={() => setIsNewAssignmentModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Project</label>
                <select 
                  value={newAssignment.projectId}
                  onChange={e => setNewAssignment(p => ({ ...p, projectId: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                >
                  <option value="">Choose Project...</option>
                  {projects.filter(p => !p.is_archived).map(p => (
                    <option key={p.id} value={p.id}>{p.client_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Event Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Wedding, Sangeet, Haldi"
                  value={newAssignment.subEventName}
                  onChange={e => setNewAssignment(p => ({ ...p, subEventName: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Event Date</label>
                <input 
                  type="date" 
                  value={newAssignment.subEventDate}
                  onChange={e => setNewAssignment(p => ({ ...p, subEventDate: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Start Time</label>
                  <input 
                    type="time" 
                    value={newAssignment.startTime}
                    onChange={e => setNewAssignment(p => ({ ...p, startTime: e.target.value }))}
                    className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">End Time</label>
                  <input 
                    type="time" 
                    value={newAssignment.endTime}
                    onChange={e => setNewAssignment(p => ({ ...p, endTime: e.target.value }))}
                    className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Required Role</label>
                <select 
                  value={newAssignment.requiredRole}
                  onChange={e => setNewAssignment(p => ({ ...p, requiredRole: e.target.value }))}
                  className="bg-[#05070B] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#6C5CE7] w-full"
                >
                  <option value="Lead Photographer">Lead Photographer</option>
                  <option value="Second Photographer">Second Photographer</option>
                  <option value="Cinematographer">Cinematographer</option>
                  <option value="Drone Pilot">Drone Pilot</option>
                  <option value="Editor">Editor</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewAssignmentModalOpen(false)}
                  className="bg-transparent border border-zinc-800 text-zinc-400 text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#6C5CE7] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#6C5CE7]/90 transition"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating action button to quickly add sub event */}
      {activeTab === 'ledger' && (
        <button
          onClick={() => setIsNewAssignmentModalOpen(true)}
          className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 bg-[#6C5CE7] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition duration-150 z-30"
          title="Create Sub-Event"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

    </div>
  );
}

// Simple Toast / Message Helper
const showToast = (message: string, type: 'info' | 'success' | 'error') => {
  console.log(`[Toast] (${type}): ${message}`);
};

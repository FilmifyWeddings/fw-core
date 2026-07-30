'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Video, Camera, BookOpen, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, User, Calendar, Plus, Search, Filter, Layers, 
  ChevronDown, ChevronUp, Edit3, MessageSquare, ArrowLeft, RefreshCw, 
  Play, Sparkles, Check, X, ShieldAlert, AlertCircle, FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { 
  PostProductionProject, DeliverableItem, DeliverableCategory, DeliverableStatus, WorkspaceClient 
} from '@/types';

// Category metadata helper
const CATEGORY_META: Record<DeliverableCategory, { label: string; icon: React.ElementType; color: string; badgeBg: string }> = {
  teaser: { label: 'Teaser Film', icon: Play, color: 'text-cyan-400', badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' },
  film: { label: 'Full Film', icon: Video, color: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  reels: { label: 'Reels', icon: Film, color: 'text-pink-400', badgeBg: 'bg-pink-500/10 border-pink-500/30 text-pink-300' },
  photos: { label: 'Edited Photos', icon: Camera, color: 'text-indigo-400', badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' },
  album: { label: 'Print Album', icon: BookOpen, color: 'text-purple-400', badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300' },
};

// Status metadata helper
const STATUS_META: Record<DeliverableStatus, { label: string; bg: string; border: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-zinc-800/80', border: 'border-zinc-700', text: 'text-zinc-400' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' },
  under_review: { label: 'Under Review', bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
};

// Demo initial post-production projects
const INITIAL_PROJECTS: PostProductionProject[] = [
  {
    id: 'proj_1',
    workspace_id: 'ws_demo',
    client_id: 'client_1',
    client: {
      id: 'client_1',
      workspace_id: 'ws_demo',
      name: 'Vinu Bhad & Neha',
      phone: '+919876543210',
      event_type: 'Wedding & Reception',
      event_date: '2026-11-18',
      total_package_amount: 250000,
      paid_amount: 150000,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    project_manager_id: 'pm_1',
    project_manager_name: 'Sushant (Lead Manager)',
    overall_status: 'active',
    deliverables: [
      {
        id: 'deliv_101',
        title: '1-Minute Instagram Teaser',
        category: 'teaser',
        assigned_to: 'Rahul (Video Editor)',
        deadline: '2026-08-05',
        status: 'in_progress',
        drive_link: 'https://drive.google.com/drive/folders/demo_teaser',
        revision_notes: 'Client requested cinematic color grading adjustment in entry scene.'
      },
      {
        id: 'deliv_102',
        title: 'Full Length Wedding Film (25 mins)',
        category: 'film',
        assigned_to: 'Amit (Senior Editor)',
        deadline: '2026-08-20',
        status: 'pending',
        drive_link: '',
        revision_notes: ''
      },
      {
        id: 'deliv_103',
        title: '3 Viral Instagram Reels',
        category: 'reels',
        assigned_to: 'Priya (Reels Specialist)',
        deadline: '2026-07-28', // OVERDUE
        status: 'under_review',
        drive_link: 'https://drive.google.com/drive/folders/demo_reels',
        revision_notes: 'Audio sync updated with trending track.'
      },
      {
        id: 'deliv_104',
        title: 'Master Retouched Photos (500 Shots)',
        category: 'photos',
        assigned_to: 'Vikram (Photo Retoucher)',
        deadline: '2026-08-15',
        status: 'completed',
        drive_link: 'https://drive.google.com/drive/folders/demo_photos',
        revision_notes: 'Delivered via Google Drive.'
      }
    ],
    notes: 'High priority client. Color theme: Warm Cinematic Gold.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'proj_2',
    workspace_id: 'ws_demo',
    client_id: 'client_2',
    client: {
      id: 'client_2',
      workspace_id: 'ws_demo',
      name: 'Mohit Agarwal & Riya',
      phone: '+919812345678',
      event_type: 'Pre-Wedding Shoot',
      event_date: '2026-09-05',
      total_package_amount: 75000,
      paid_amount: 75000,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    project_manager_id: 'pm_2',
    project_manager_name: 'Pooja (Post Manager)',
    overall_status: 'delayed',
    deliverables: [
      {
        id: 'deliv_201',
        title: 'Pre-Wedding Musical Teaser',
        category: 'teaser',
        assigned_to: 'Rahul (Video Editor)',
        deadline: '2026-07-25', // OVERDUE
        status: 'in_progress',
        drive_link: 'https://drive.google.com/drive/folders/prewedding',
        revision_notes: 'Waiting for client drone footage selection.'
      },
      {
        id: 'deliv_202',
        title: 'Retouched Couple Album (40 Pages)',
        category: 'album',
        assigned_to: 'Karan (Album Designer)',
        deadline: '2026-08-10',
        status: 'pending',
        drive_link: '',
        revision_notes: ''
      }
    ],
    notes: 'Shot in Udaipur. Requires slow-mo color grading.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export default function PostProductionPage() {
  const searchParams = useSearchParams();
  const highlightClientId = searchParams?.get('client_id');

  const [projects, setProjects] = useState<PostProductionProject[]>(INITIAL_PROJECTS);
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delayed' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(highlightClientId || null);

  // Edit Deliverable Drawer State
  const [activeDeliverable, setActiveDeliverable] = useState<{ projectId: string; deliverable: DeliverableItem } | null>(null);
  const [editForm, setEditForm] = useState<DeliverableItem | null>(null);

  // New Project / New Deliverable Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjClientId, setNewProjClientId] = useState('');
  const [newProjManager, setNewProjManager] = useState('Sushant (Lead Manager)');

  const [showNewDeliverableModal, setShowNewDeliverableModal] = useState<string | null>(null); // projectId
  const [newDelivForm, setNewDelivForm] = useState<{ title: string; category: DeliverableCategory; assigned_to: string; deadline: string }>({
    title: '', category: 'teaser', assigned_to: '', deadline: ''
  });

  useEffect(() => {
    fetchProjectsAndClients();
  }, []);

  const fetchProjectsAndClients = async () => {
    setLoading(true);
    try {
      // 1. Fetch clients for dropdown options
      const { data: clientsData } = await supabase.from('workspace_clients').select('*');
      if (clientsData && clientsData.length > 0) {
        setClients(clientsData);
      }

      // 2. Fetch post-production projects
      const { data: projectsData, error } = await supabase
        .from('post_production_projects')
        .select('*, client:workspace_clients(*)')
        .order('created_at', { ascending: false });

      if (!error && projectsData && projectsData.length > 0) {
        setProjects(projectsData);
      } else {
        setProjects(INITIAL_PROJECTS);
      }
    } catch (e) {
      console.error('Error fetching post-production data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper: calculate deadline countdown badge
  const renderDeadlineBadge = (deadlineStr?: string | null, status?: DeliverableStatus) => {
    if (status === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }

    if (!deadlineStr) {
      return <span className="text-[10px] text-zinc-500">No deadline</span>;
    }

    const deadlineDate = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysLate = Math.abs(diffDays);
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-xs shadow-rose-500/20 animate-pulse flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> OVERDUE ({daysLate}d late)
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Due Today
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
        <Clock className="w-3 h-3 text-cyan-400" /> Due in {diffDays}d
      </span>
    );
  };

  // Helper: compute project completion percentage
  const calculateCompletionPercentage = (deliverables: DeliverableItem[]) => {
    if (!deliverables || deliverables.length === 0) return 0;
    const completedCount = deliverables.filter(d => d.status === 'completed').length;
    return Math.round((completedCount / deliverables.length) * 100);
  };

  // Save Deliverable Drawer Edits
  const handleSaveDeliverableEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeliverable || !editForm) return;

    const { projectId } = activeDeliverable;

    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId) {
        const updatedDeliverables = proj.deliverables.map(d => 
          d.id === editForm.id ? editForm : d
        );

        // Auto update project overall_status if all completed or any overdue
        const completionPct = calculateCompletionPercentage(updatedDeliverables);
        let newOverallStatus: 'active' | 'delayed' | 'completed' = proj.overall_status;
        if (completionPct === 100) newOverallStatus = 'completed';

        return {
          ...proj,
          deliverables: updatedDeliverables,
          overall_status: newOverallStatus,
        };
      }
      return proj;
    });

    setProjects(updatedProjects);

    // Persist to Supabase
    try {
      const targetProj = updatedProjects.find(p => p.id === projectId);
      if (targetProj) {
        await supabase
          .from('post_production_projects')
          .update({ deliverables: targetProj.deliverables, overall_status: targetProj.overall_status })
          .eq('id', projectId);
      }
    } catch (err) {
      console.error('Error saving deliverable edit:', err);
    }

    setActiveDeliverable(null);
    setEditForm(null);
  };

  // Add New Deliverable to Project
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNewDeliverableModal || !newDelivForm.title) return;

    const projectId = showNewDeliverableModal;
    const newDelivItem: DeliverableItem = {
      id: `deliv_${Date.now()}`,
      title: newDelivForm.title,
      category: newDelivForm.category,
      assigned_to: newDelivForm.assigned_to || 'Unassigned',
      deadline: newDelivForm.deadline || null,
      status: 'pending',
      drive_link: '',
      revision_notes: ''
    };

    const updatedProjects = projects.map(proj => {
      if (proj.id === projectId) {
        return {
          ...proj,
          deliverables: [...proj.deliverables, newDelivItem]
        };
      }
      return proj;
    });

    setProjects(updatedProjects);

    try {
      const targetProj = updatedProjects.find(p => p.id === projectId);
      if (targetProj) {
        await supabase
          .from('post_production_projects')
          .update({ deliverables: targetProj.deliverables })
          .eq('id', projectId);
      }
    } catch (e) {
      console.error('Error adding deliverable:', e);
    }

    setShowNewDeliverableModal(null);
    setNewDelivForm({ title: '', category: 'teaser', assigned_to: '', deadline: '' });
  };

  // Create New Post-Production Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjClientId) {
      alert('Please select a Client for this Post-Production project.');
      return;
    }

    const selectedClient = clients.find(c => c.id === newProjClientId);

    // Preset deliverables template
    const defaultDeliverables: DeliverableItem[] = [
      { id: `deliv_${Date.now()}_1`, title: '1-Minute Instagram Teaser', category: 'teaser', status: 'pending', assigned_to: 'Video Editor' },
      { id: `deliv_${Date.now()}_2`, title: 'Full Length Highlight Film (20-30 mins)', category: 'film', status: 'pending', assigned_to: 'Senior Editor' },
      { id: `deliv_${Date.now()}_3`, title: '3 Instagram Reels / Shorts', category: 'reels', status: 'pending', assigned_to: 'Reels Specialist' },
      { id: `deliv_${Date.now()}_4`, title: 'Master Color Graded Photos (400+)', category: 'photos', status: 'pending', assigned_to: 'Photo Retoucher' },
    ];

    const newProj: PostProductionProject = {
      id: `proj_${Date.now()}`,
      workspace_id: 'ws_demo',
      client_id: newProjClientId,
      client: selectedClient || null,
      project_manager_name: newProjManager || 'Sushant (Lead Manager)',
      overall_status: 'active',
      deliverables: defaultDeliverables,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: inserted, error } = await supabase
        .from('post_production_projects')
        .insert({
          workspace_id: newProj.workspace_id,
          client_id: newProj.client_id,
          project_manager_name: newProj.project_manager_name,
          overall_status: newProj.overall_status,
          deliverables: newProj.deliverables,
        })
        .select()
        .single();

      if (!error && inserted) {
        setProjects(prev => [inserted, ...prev]);
      } else {
        setProjects(prev => [newProj, ...prev]);
      }
    } catch (e) {
      setProjects(prev => [newProj, ...prev]);
    }

    setShowNewProjectModal(false);
    setNewProjClientId('');
  };

  // Filter projects
  const filteredProjects = projects.filter(proj => {
    const clientName = proj.client?.name || '';
    const eventType = proj.client?.event_type || '';
    const matchesSearch = 
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.project_manager_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || proj.overall_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate System High-Level Summary Stats
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter(p => p.overall_status === 'active').length;
  const delayedProjectsCount = projects.filter(p => p.overall_status === 'delayed').length;
  const allDeliverables = projects.flatMap(p => p.deliverables || []);
  const totalDeliverablesCount = allDeliverables.length;
  const completedDeliverablesCount = allDeliverables.filter(d => d.status === 'completed').length;
  const overallSystemCompletionPct = totalDeliverablesCount > 0 ? Math.round((completedDeliverablesCount / totalDeliverablesCount) * 100) : 0;

  return (
    <SidebarLayout>
      {/* ── Dark Cinematic Studio Theme ── */}
      <div className="min-h-screen bg-[#0B0F17] text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans">
        
        {/* Top Header */}
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#121824]/90 p-6 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20 text-white">
                  <Film className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white">Post-Production Tracking</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Dark Cinematic Board
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Track teasers, full films, reels, photo edits, drive links, editor assignees, and real-time deadline countdowns.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/workspace/clients"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-zinc-200 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Clients Directory</span>
              </Link>

              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Post-Prod Project</span>
              </button>
            </div>
          </div>

          {/* Metric Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121824]/90 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Total Studio Projects</p>
                <h3 className="text-xl font-black text-white mt-1">{totalProjectsCount} Projects</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#121824]/90 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Overall Deliverables Done</p>
                <h3 className="text-xl font-black text-emerald-400 mt-1">{overallSystemCompletionPct}% Completed</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#121824]/90 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Active Pipeline</p>
                <h3 className="text-xl font-black text-cyan-400 mt-1">{activeProjectsCount} Active</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#121824]/90 p-5 rounded-2xl border border-slate-800/80 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Delayed / Overdue Projects</p>
                <h3 className="text-xl font-black text-rose-400 mt-1">{delayedProjectsCount} Delayed</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#121824]/90 p-4 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by client, manager, or event type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold hidden sm:inline">Filter Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-xs font-semibold text-zinc-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (🟢)</option>
                <option value="delayed">Delayed (🔴)</option>
                <option value="completed">Completed (🔵)</option>
              </select>

              <button
                onClick={fetchProjectsAndClients}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-zinc-400 hover:text-white transition-colors"
                title="Refresh Projects Board"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Project Board Cards */}
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="bg-[#121824]/90 p-16 rounded-3xl border border-slate-800 text-center text-zinc-400">
                <Film className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                <h3 className="text-base font-bold text-white">No post-production projects match criteria</h3>
                <p className="text-xs text-zinc-500 mt-1">Initialize a project for a client to begin tracking deliverables.</p>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Project
                </button>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const clientName = project.client?.name || 'Unnamed Client';
                const eventType = project.client?.event_type || 'Wedding Event';
                const eventDate = project.client?.event_date;
                const completionPct = calculateCompletionPercentage(project.deliverables || []);
                const isExpanded = expandedProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className="bg-[#121824]/90 rounded-3xl border border-slate-800/80 shadow-xl overflow-hidden transition-all hover:border-slate-700"
                  >
                    {/* Project Card Header */}
                    <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/60">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-black text-white">{clientName}</h2>
                          
                          {project.overall_status === 'active' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                            </span>
                          )}
                          {project.overall_status === 'delayed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Delayed
                            </span>
                          )}
                          {project.overall_status === 'completed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                          <span className="inline-flex items-center gap-1 text-pink-400 font-semibold">
                            <Sparkles className="w-3 h-3" /> {eventType}
                          </span>
                          {eventDate && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-amber-400" /> Event Date: {eventDate}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <User className="w-3 h-3 text-cyan-400" /> PM: {project.project_manager_name}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Toggle Button */}
                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="w-48 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-zinc-400">Progress</span>
                            <span className="text-pink-400 font-mono">{completionPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-500"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Checklist' : 'View Deliverables'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Deliverables Checklist */}
                    {isExpanded && (
                      <div className="p-6 bg-slate-950/60 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-pink-400" />
                            Deliverable Items Checklist ({project.deliverables?.length || 0})
                          </h4>

                          <button
                            onClick={() => setShowNewDeliverableModal(project.id)}
                            className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Deliverable
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {!project.deliverables || project.deliverables.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-4 text-center">No deliverable items added yet.</p>
                          ) : (
                            project.deliverables.map((deliv) => {
                              const catMeta = CATEGORY_META[deliv.category] || CATEGORY_META['teaser'];
                              const CatIcon = catMeta.icon;
                              const statusMeta = STATUS_META[deliv.status] || STATUS_META['pending'];

                              return (
                                <div
                                  key={deliv.id}
                                  className="p-4 rounded-2xl bg-[#121824] border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                                >
                                  {/* Left: Category Icon & Title */}
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl ${catMeta.badgeBg} flex items-center justify-center border shrink-0`}>
                                      <CatIcon className="w-4 h-4" />
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-xs font-bold text-white">{deliv.title}</h5>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.border} ${statusMeta.text}`}>
                                          {statusMeta.label}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 mt-1">
                                        {deliv.assigned_to && (
                                          <span className="inline-flex items-center gap-1 font-medium">
                                            <User className="w-3 h-3 text-indigo-400" /> Editor: {deliv.assigned_to}
                                          </span>
                                        )}
                                        {deliv.revision_notes && (
                                          <span className="inline-flex items-center gap-1 text-amber-300/80 font-medium truncate max-w-xs" title={deliv.revision_notes}>
                                            <MessageSquare className="w-3 h-3 text-amber-400" /> {deliv.revision_notes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Deadline Badge & Action Menu */}
                                  <div className="flex items-center gap-3 self-end sm:self-auto">
                                    {renderDeadlineBadge(deliv.deadline, deliv.status)}

                                    {deliv.drive_link && (
                                      <a
                                        href={deliv.drive_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                                        title="Open Drive Link"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}

                                    <button
                                      onClick={() => {
                                        setActiveDeliverable({ projectId: project.id, deliverable: deliv });
                                        setEditForm(deliv);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 font-bold text-[11px] border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3 text-pink-400" /> Edit
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Deliverable Edit Drawer Modal ── */}
        <AnimatePresence>
          {activeDeliverable && editForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="w-full max-w-lg bg-[#121824] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black">Edit Deliverable Status</h2>
                      <p className="text-xs text-zinc-400">Update deadline, assignee, and Google Drive links.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setActiveDeliverable(null); setEditForm(null); }}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDeliverableEdit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Deliverable Title</label>
                    <input
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Category</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as DeliverableCategory })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none"
                      >
                        <option value="teaser">🎬 Teaser Film</option>
                        <option value="film">🎥 Full Film</option>
                        <option value="reels">📱 Instagram Reels</option>
                        <option value="photos">📷 Edited Photos</option>
                        <option value="album">📖 Print Album</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Current Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DeliverableStatus })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="under_review">Under Review</option>
                        <option value="completed">Completed ✓</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Assigned Editor</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul (Editor)"
                        value={editForm.assigned_to || ''}
                        onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Target Deadline</label>
                      <input
                        type="date"
                        value={editForm.deadline || ''}
                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Google Drive / Dropbox Folder Link</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={editForm.drive_link || ''}
                      onChange={(e) => setEditForm({ ...editForm, drive_link: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Client Revision & Feedback Notes</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Client requested color grading tweaks on couple entry..."
                      value={editForm.revision_notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, revision_notes: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setActiveDeliverable(null); setEditForm(null); }}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20"
                    >
                      Save Deliverable
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Add Deliverable Modal ── */}
        <AnimatePresence>
          {showNewDeliverableModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#121824] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 text-white"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black">Add Deliverable Item</h3>
                  <button onClick={() => setShowNewDeliverableModal(null)} className="text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddDeliverable} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 4K Cinematic Wedding Film"
                      value={newDelivForm.title}
                      onChange={(e) => setNewDelivForm({ ...newDelivForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Category</label>
                      <select
                        value={newDelivForm.category}
                        onChange={(e) => setNewDelivForm({ ...newDelivForm, category: e.target.value as DeliverableCategory })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                      >
                        <option value="teaser">🎬 Teaser Film</option>
                        <option value="film">🎥 Full Film</option>
                        <option value="reels">📱 Instagram Reels</option>
                        <option value="photos">📷 Edited Photos</option>
                        <option value="album">📖 Print Album</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Assigned Editor</label>
                      <input
                        type="text"
                        placeholder="Editor Name"
                        value={newDelivForm.assigned_to}
                        onChange={(e) => setNewDelivForm({ ...newDelivForm, assigned_to: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      value={newDelivForm.deadline}
                      onChange={(e) => setNewDelivForm({ ...newDelivForm, deadline: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowNewDeliverableModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
                    >
                      Add Item
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── New Post-Production Project Modal ── */}
        <AnimatePresence>
          {showNewProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#121824] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4 text-white"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-pink-400" />
                    <h3 className="text-base font-black">Create Post-Production Tracker Project</h3>
                  </div>
                  <button onClick={() => setShowNewProjectModal(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Select Client *</label>
                    <select
                      required
                      value={newProjClientId}
                      onChange={(e) => setNewProjClientId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                    >
                      <option value="">-- Choose client from directory --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.event_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Project Manager Name</label>
                    <input
                      type="text"
                      value={newProjManager}
                      onChange={(e) => setNewProjManager(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-medium"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-zinc-400 space-y-1">
                    <span className="font-bold text-pink-400 block">⚡ Includes Preset Deliverables Template:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
                      <li>🎬 1-Minute Instagram Teaser</li>
                      <li>🎥 Full Length Highlight Film (20-30 mins)</li>
                      <li>📱 3 Instagram Reels / Shorts</li>
                      <li>📷 Master Color Graded Photos (400+)</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowNewProjectModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-zinc-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow-lg shadow-pink-500/25"
                    >
                      Initialize Project
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </SidebarLayout>
  );
}

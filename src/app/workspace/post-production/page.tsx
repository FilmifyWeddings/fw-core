'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Video, Camera, BookOpen, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, User, Calendar, Plus, Search, Filter, Layers, 
  ChevronDown, ChevronUp, Edit3, MessageSquare, ArrowLeft, RefreshCw, 
  Play, Sparkles, Check, X, ShieldAlert, AlertCircle, Trash2, FolderPlus,
  Bell, Send, UserPlus, FileText, CheckSquare, MoreVertical, Link2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { 
  PostProductionProject, DeliverableItem, DeliverableCategory, DeliverableStatus, WorkspaceClient, DeliverableComment 
} from '@/types';

// Category metadata helper
const CATEGORY_META = {
  photos: { label: 'Photos', icon: Camera, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  videos: { label: 'Videos', icon: Video, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  albums: { label: 'Albums', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  teaser: { label: 'Teaser Film', icon: Play, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  film: { label: 'Full Film', icon: Video, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  reels: { label: 'Reels', icon: Film, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  album: { label: 'Print Album', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
};

// Stage / Status options with Light Theme Badges
const STATUS_OPTIONS: { value: DeliverableStatus; label: string; badgeClass: string; dotClass: string }[] = [
  { value: 'pending', label: 'Pending', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' },
  { value: 'upcoming', label: 'Upcoming', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', dotClass: 'bg-sky-500' },
  { value: 'in_progress', label: 'In Progress', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-600' },
  { value: 'under_review', label: 'Under Review', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-600' },
  { value: 'completed', label: 'Done', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-600' },
];

// Initial default Team PMs and Editors
const INITIAL_PMS = [
  'Sushant (Lead Manager)',
  'Pooja (Post Manager)',
  'Rahul Sharma (Production Lead)',
  'Amit Verma (Studio Head)'
];

const INITIAL_EDITORS = [
  'Vikram (Photo Retoucher)',
  'Rahul (Video Editor & Teasers)',
  'Amit (Senior Video Editor)',
  'Priya (Reels Specialist)',
  'Suresh (Traditional Editor)',
  'Rohan (Album Designer)',
  'Kunal (Colorist)'
];

export default function PostProductionPage() {
  const [projects, setProjects] = useState<PostProductionProject[]>([]);
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delayed' | 'completed'>('all');
  
  // Expanded cards set (holds project IDs that are currently expanded)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // PM and Editor lists
  const [pmList, setPmList] = useState<string[]>(INITIAL_PMS);
  const [editorList, setEditorList] = useState<string[]>(INITIAL_EDITORS);

  // Modals state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddPMModal, setShowAddPMModal] = useState<{ open: boolean; projectId?: string }>({ open: false });
  const [newPMName, setNewPMName] = useState('');
  
  const [showAddEditorModal, setShowAddEditorModal] = useState<{ open: boolean; projectId?: string; deliverableId?: string }>({ open: false });
  const [newEditorName, setNewEditorName] = useState('');

  // Comment Modal state
  const [activeCommentModal, setActiveCommentModal] = useState<{
    open: boolean;
    projectId: string;
    deliverableId: string;
    deliverableTitle: string;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Rahul Sharma');
  const [commentAlertFlag, setCommentAlertFlag] = useState(false);
  const [commentFollowupDate, setCommentFollowupDate] = useState('');

  // Drive Link Modal state
  const [activeDriveModal, setActiveDriveModal] = useState<{
    open: boolean;
    projectId: string;
    deliverableId: string;
    currentLink: string;
  } | null>(null);
  const [driveInputLink, setDriveInputLink] = useState('');

  // Helper to generate default 3-category deliverables for a client
  const generateDefaultDeliverables = (eventDateStr?: string | null): DeliverableItem[] => {
    return [
      // 1. Photos
      {
        id: `deliv_photo_1_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Edited Photos',
        category: 'photos',
        count: '500 Photos',
        assigned_to: 'Vikram (Photo Retoucher)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 15 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_photo_2_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Save the Date Photo',
        category: 'photos',
        count: '5 Photos',
        assigned_to: 'Vikram (Photo Retoucher)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() - 10 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_photo_3_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Instagram Posts',
        category: 'photos',
        count: '10 Posts',
        assigned_to: 'Vikram (Photo Retoucher)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 5 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },

      // 2. Videos
      {
        id: `deliv_video_1_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Cinematic Film',
        category: 'videos',
        count: '25 Mins',
        assigned_to: 'Amit (Senior Video Editor)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 30 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_video_2_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Cinematic Teaser',
        category: 'videos',
        count: '1 Min',
        assigned_to: 'Rahul (Video Editor & Teasers)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 7 * 86400000).toISOString().split('T')[0] : '',
        status: 'in_progress',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_video_3_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Traditional Full Video',
        category: 'videos',
        count: '2 Hours',
        assigned_to: 'Suresh (Traditional Editor)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 45 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_video_4_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Viral Instagram Reels',
        category: 'videos',
        count: '3 Reels',
        assigned_to: 'Priya (Reels Specialist)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 10 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },

      // 3. Albums
      {
        id: `deliv_album_1_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Main Wedding Album',
        category: 'albums',
        count: '40 Pages',
        assigned_to: 'Rohan (Album Designer)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_album_2_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Parent / Mini Album',
        category: 'albums',
        count: '20 Pages',
        assigned_to: 'Rohan (Album Designer)',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      }
    ];
  };

  // Fetch projects and clients from Supabase
  useEffect(() => {
    fetchPostProductionData();
  }, []);

  const fetchPostProductionData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Fetch clients for current workspace
      let clientQuery = supabase
        .from('workspace_clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        clientQuery = clientQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: clientData } = await clientQuery;
      const clientList = clientData || [];
      setClients(clientList);

      // If no clients exist in workspace_clients, show empty state
      if (clientList.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // 2. Fetch post production projects
      let projectQuery = supabase
        .from('post_production_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspaceId && workspaceId !== 'ws_demo') {
        projectQuery = projectQuery.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data: projectData } = await projectQuery;
      const projectMap = new Map<string, any>();
      if (projectData) {
        projectData.forEach(p => projectMap.set(p.client_id, p));
      }

      // 3. Ensure EVERY client has a post-production project
      const finalProjects: PostProductionProject[] = [];
      const newProjectsToInsert: any[] = [];

      for (const c of clientList) {
        const existingProj = projectMap.get(c.id);
        if (existingProj) {
          finalProjects.push({
            ...existingProj,
            client: c,
            deliverables: Array.isArray(existingProj.deliverables) && existingProj.deliverables.length > 0 
              ? existingProj.deliverables 
              : generateDefaultDeliverables(c.event_date)
          });
        } else {
          // Auto-generate default deliverables for this client
          const defaultDelivs = generateDefaultDeliverables(c.event_date);
          const newProj: PostProductionProject = {
            id: `proj_${c.id}`,
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            client: c,
            project_manager_name: 'Sushant (Lead Manager)',
            overall_status: 'active',
            deliverables: defaultDelivs,
            created_at: c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          finalProjects.push(newProj);
          newProjectsToInsert.push({
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: c.id,
            project_manager_name: 'Sushant (Lead Manager)',
            overall_status: 'active',
            deliverables: defaultDelivs
          });
        }
      }

      setProjects(finalProjects);
      if (finalProjects.length > 0) {
        setExpandedCards(new Set([finalProjects[0].id]));
      }

      // In background, insert missing project records into Supabase
      if (newProjectsToInsert.length > 0 && workspaceId !== 'ws_demo') {
        (async () => {
          try {
            await supabase.from('post_production_projects').insert(newProjectsToInsert);
          } catch (_) {}
        })();
      }
    } catch (e) {
      console.error('Error fetching post production data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (projectId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Helper to calculate project progress %
  const calculateProgress = (deliverables: DeliverableItem[] = []) => {
    if (!deliverables || deliverables.length === 0) return 0;
    const completedCount = deliverables.filter(d => d.status === 'completed' || d.status === 'done').length;
    return Math.round((completedCount / deliverables.length) * 100);
  };

  // Helper for overdue calculations
  const getDeadlineStatus = (deadlineStr?: string | null, status?: DeliverableStatus) => {
    if (status === 'completed' || status === 'done') {
      return { isCompleted: true, text: 'Completed', isOverdue: false, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (!deadlineStr) {
      return { isCompleted: false, text: 'No Deadline', isOverdue: false, badgeClass: 'bg-slate-50 text-slate-500 border-slate-200' };
    }

    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) {
      return { isCompleted: false, text: 'No Deadline', isOverdue: false, badgeClass: 'bg-slate-50 text-slate-500 border-slate-200' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const pastDays = Math.abs(diffDays);
      return {
        isCompleted: false,
        text: `OVERDUE (${pastDays}d ago)`,
        isOverdue: true,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-300 font-bold animate-pulse'
      };
    } else if (diffDays === 0) {
      return {
        isCompleted: false,
        text: 'Due Today',
        isOverdue: true,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
      };
    } else {
      return {
        isCompleted: false,
        text: `Due in ${diffDays}d`,
        isOverdue: false,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 font-medium'
      };
    }
  };

  // Persist project changes to Supabase
  const updateProjectInDB = async (projectId: string, clientId: string, updatedFields: Partial<PostProductionProject>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 1. Try update by client_id
      const { data } = await supabase
        .from('post_production_projects')
        .update({ ...updatedFields, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .select('id');

      // 2. If record does not exist yet in DB, insert it!
      if (!data || data.length === 0) {
        await supabase
          .from('post_production_projects')
          .insert([{
            user_id: workspaceId,
            workspace_id: workspaceId,
            client_id: clientId,
            ...updatedFields,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }
    } catch (e) {
      console.error('Error updating project in DB:', e);
    }
  };

  // Handle Project Manager Change
  const handlePMChange = (projectId: string, pmName: string) => {
    if (pmName === '__ADD_NEW__') {
      setShowAddPMModal({ open: true, projectId });
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updated = { ...p, project_manager_name: pmName };
        updateProjectInDB(projectId, p.client_id, { project_manager_name: pmName });
        return updated;
      }
      return p;
    }));
  };

  // Handle Deliverable Field Change (Count, Deadline, Assignee, Status)
  const handleDeliverableUpdate = (
    projectId: string, 
    deliverableId: string, 
    field: keyof DeliverableItem, 
    value: any
  ) => {
    if (field === 'assigned_to' && value === '__ADD_NEW__') {
      setShowAddEditorModal({ open: true, projectId, deliverableId });
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = p.deliverables.map(d => {
          if (d.id === deliverableId) {
            return { ...d, [field]: value };
          }
          return d;
        });

        // Recalculate project overall status based on deliverables
        const allCompleted = updatedDeliverables.length > 0 && updatedDeliverables.every(d => d.status === 'completed' || d.status === 'done');
        const hasOverdue = updatedDeliverables.some(d => getDeadlineStatus(d.deadline, d.status).isOverdue);
        const newOverallStatus = allCompleted ? 'completed' : hasOverdue ? 'delayed' : 'active';

        const updatedProject = {
          ...p,
          overall_status: newOverallStatus as any,
          deliverables: updatedDeliverables
        };

        updateProjectInDB(projectId, p.client_id, {
          overall_status: newOverallStatus,
          deliverables: updatedDeliverables
        });

        return updatedProject;
      }
      return p;
    }));
  };

  // Add Custom Deliverable into a specific category (Photos, Videos, Albums)
  const handleAddDeliverable = (projectId: string, category: 'photos' | 'videos' | 'albums') => {
    const titlePrompt = prompt(`Enter title for new ${category === 'photos' ? 'Photo' : category === 'videos' ? 'Video' : 'Album'} deliverable:`);
    if (!titlePrompt || !titlePrompt.trim()) return;

    const countPrompt = prompt(`Enter count / specifications (e.g. 500 Photos, 3 Reels, 40 Pages):`, category === 'photos' ? '100 Photos' : category === 'videos' ? '1 Video' : '30 Pages');

    const newDeliverable: DeliverableItem = {
      id: `deliv_${category}_${Date.now()}`,
      title: titlePrompt.trim(),
      category: category,
      count: countPrompt || '',
      assigned_to: category === 'photos' ? 'Vikram (Photo Retoucher)' : category === 'videos' ? 'Amit (Senior Video Editor)' : 'Rohan (Album Designer)',
      deadline: '',
      status: 'pending',
      drive_link: '',
      comments: []
    };

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = [...p.deliverables, newDeliverable];
        updateProjectInDB(projectId, p.client_id, { deliverables: updatedDeliverables });
        return { ...p, deliverables: updatedDeliverables };
      }
      return p;
    }));
  };

  // Delete deliverable item
  const handleDeleteDeliverable = (projectId: string, deliverableId: string) => {
    if (!confirm('Are you sure you want to delete this deliverable item?')) return;

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = p.deliverables.filter(d => d.id !== deliverableId);
        updateProjectInDB(projectId, p.client_id, { deliverables: updatedDeliverables });
        return { ...p, deliverables: updatedDeliverables };
      }
      return p;
    }));
  };

  // Add Comment with optional reminder alert
  const handleSaveComment = () => {
    if (!activeCommentModal || !commentText.trim()) return;

    const newComment: DeliverableComment = {
      id: `comm_${Date.now()}`,
      text: commentText.trim(),
      authorName: commentAuthor,
      createdAt: new Date().toISOString(),
      alert_flag: commentAlertFlag,
      followup_at: commentFollowupDate || null
    };

    setProjects(prev => prev.map(p => {
      if (p.id === activeCommentModal.projectId) {
        const updatedDeliverables = p.deliverables.map(d => {
          if (d.id === activeCommentModal.deliverableId) {
            const existing = d.comments || [];
            return { ...d, comments: [newComment, ...existing] };
          }
          return d;
        });

        updateProjectInDB(p.id, p.client_id, { deliverables: updatedDeliverables });
        return { ...p, deliverables: updatedDeliverables };
      }
      return p;
    }));

    setCommentText('');
    setCommentAlertFlag(false);
    setCommentFollowupDate('');
  };

  // Save Drive Link
  const handleSaveDriveLink = () => {
    if (!activeDriveModal) return;

    handleDeliverableUpdate(
      activeDriveModal.projectId, 
      activeDriveModal.deliverableId, 
      'drive_link', 
      driveInputLink.trim()
    );

    setActiveDriveModal(null);
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(proj => {
      const clientName = proj.client?.name?.toLowerCase() || '';
      const pmName = proj.project_manager_name?.toLowerCase() || '';
      const eventType = proj.client?.event_type?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = clientName.includes(query) || pmName.includes(query) || eventType.includes(query);
      const matchesStatus = statusFilter === 'all' || proj.overall_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Overall statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.overall_status === 'active').length;
  const delayedProjects = projects.filter(p => p.overall_status === 'delayed').length;
  
  const allDeliverables = projects.flatMap(p => p.deliverables || []);
  const totalDeliverablesCount = allDeliverables.length;
  const completedDeliverablesCount = allDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length;
  const overallPercentage = totalDeliverablesCount > 0 ? Math.round((completedDeliverablesCount / totalDeliverablesCount) * 100) : 0;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F8F9FD] text-slate-900 pb-20 pt-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              HEADER & TOP CONTROLS (LIGHT THEME)
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-md text-white">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Post-Production Tracking</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Light Suite
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deliverables engine with 3-category tracking (Photos, Videos, Albums), interactive PMs, editors, and deadline countdowns.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/workspace/clients"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Client Directory
              </Link>
              <button
                onClick={fetchPostProductionData}
                className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              METRICS DASHBOARD (CLEAN LIGHT CARDS)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Studio Projects</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalProjects} <span className="text-xs font-semibold text-slate-500 font-normal">Projects</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Deliverables Done</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{overallPercentage}% <span className="text-xs font-semibold text-slate-500 font-normal">({completedDeliverablesCount}/{totalDeliverablesCount})</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Pipeline</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">{activeProjects} <span className="text-xs font-semibold text-slate-500 font-normal">Active</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delayed / Overdue Projects</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{delayedProjects} <span className="text-xs font-semibold text-slate-500 font-normal">Delayed</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SEARCH & FILTER CONTROLS
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client, manager, or event type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="delayed">Delayed</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CLIENT POST-PRODUCTION CARDS LIST
          ───────────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-600">Loading Post-Production Projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <Film className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Post-Production Projects Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Mark any lead as &quot;Booked&quot; in the CRM or add a client from the Client Directory to automatically start post-production tracking.
                </p>
              </div>
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
              >
                Go to Leads CRM
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProjects.map((project) => {
                const isExpanded = expandedCards.has(project.id);
                const progress = calculateProgress(project.deliverables);
                const deliverables = project.deliverables || [];

                // Categorize deliverables into 3 groups
                const photoDeliverables = deliverables.filter(d => d.category === 'photos');
                const videoDeliverables = deliverables.filter(d => d.category === 'videos' || d.category === 'film' || d.category === 'teaser' || d.category === 'reels');
                const albumDeliverables = deliverables.filter(d => d.category === 'albums' || d.category === 'album');

                return (
                  <motion.div
                    key={project.id}
                    layout
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* ── CARD HEADER ── */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {project.client?.name || 'Vinu Bhad & Neha'}
                          </h2>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            project.overall_status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : project.overall_status === 'delayed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {project.overall_status === 'completed' ? 'Completed' : project.overall_status === 'delayed' ? 'Delayed' : 'Active'}
                          </span>
                        </div>

                        {/* Event Details & PM Dropdown */}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            {project.client?.event_type || 'Wedding & Reception'}
                          </span>

                          <span className="text-slate-300">•</span>

                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Event Date: {project.client?.event_date ? new Date(project.client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '2026-11-18'}
                          </span>

                          <span className="text-slate-300">•</span>

                          {/* Project Manager Dropdown with Add Option */}
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-slate-500">PM:</span>
                            <select
                              value={project.project_manager_name || 'Sushant (Lead Manager)'}
                              onChange={(e) => handlePMChange(project.id, e.target.value)}
                              className="px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                            >
                              {pmList.map(pm => (
                                <option key={pm} value={pm}>{pm}</option>
                              ))}
                              <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New PM</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress Bar & Toggle Button */}
                      <div className="flex items-center gap-6">
                        <div className="w-48 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-indigo-600">{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => toggleCardExpansion(project.id)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
                            isExpanded 
                              ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' 
                              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm'
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              Hide Checklist
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              View Deliverables
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ── EXPANDED DELIVERABLES ACCORDION (3 CATEGORIES) ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="p-5 sm:p-6 space-y-6 bg-slate-50/40"
                        >
                          {/* 1. 📸 PHOTOS SECTION */}
                          <DeliverableCategorySection
                            categoryTitle="Photos"
                            categoryKey="photos"
                            icon={Camera}
                            accentColor="indigo"
                            badgeText={`${photoDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/${photoDeliverables.length} Done`}
                            items={photoDeliverables}
                            projectId={project.id}
                            editorList={editorList}
                            onUpdate={handleDeliverableUpdate}
                            onAdd={() => handleAddDeliverable(project.id, 'photos')}
                            onDelete={handleDeleteDeliverable}
                            onOpenComment={(item) => setActiveCommentModal({
                              open: true,
                              projectId: project.id,
                              deliverableId: item.id,
                              deliverableTitle: item.title
                            })}
                            onOpenDrive={(item) => {
                              setActiveDriveModal({
                                open: true,
                                projectId: project.id,
                                deliverableId: item.id,
                                currentLink: item.drive_link || ''
                              });
                              setDriveInputLink(item.drive_link || '');
                            }}
                            getDeadlineStatus={getDeadlineStatus}
                          />

                          {/* 2. 🎬 VIDEOS SECTION */}
                          <DeliverableCategorySection
                            categoryTitle="Videos"
                            categoryKey="videos"
                            icon={Video}
                            accentColor="rose"
                            badgeText={`${videoDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/${videoDeliverables.length} Done`}
                            items={videoDeliverables}
                            projectId={project.id}
                            editorList={editorList}
                            onUpdate={handleDeliverableUpdate}
                            onAdd={() => handleAddDeliverable(project.id, 'videos')}
                            onDelete={handleDeleteDeliverable}
                            onOpenComment={(item) => setActiveCommentModal({
                              open: true,
                              projectId: project.id,
                              deliverableId: item.id,
                              deliverableTitle: item.title
                            })}
                            onOpenDrive={(item) => {
                              setActiveDriveModal({
                                open: true,
                                projectId: project.id,
                                deliverableId: item.id,
                                currentLink: item.drive_link || ''
                              });
                              setDriveInputLink(item.drive_link || '');
                            }}
                            getDeadlineStatus={getDeadlineStatus}
                          />

                          {/* 3. 📖 ALBUMS SECTION */}
                          <DeliverableCategorySection
                            categoryTitle="Albums"
                            categoryKey="albums"
                            icon={BookOpen}
                            accentColor="amber"
                            badgeText={`${albumDeliverables.filter(d => d.status === 'completed' || d.status === 'done').length}/${albumDeliverables.length} Done`}
                            items={albumDeliverables}
                            projectId={project.id}
                            editorList={editorList}
                            onUpdate={handleDeliverableUpdate}
                            onAdd={() => handleAddDeliverable(project.id, 'albums')}
                            onDelete={handleDeleteDeliverable}
                            onOpenComment={(item) => setActiveCommentModal({
                              open: true,
                              projectId: project.id,
                              deliverableId: item.id,
                              deliverableTitle: item.title
                            })}
                            onOpenDrive={(item) => {
                              setActiveDriveModal({
                                open: true,
                                projectId: project.id,
                                deliverableId: item.id,
                                currentLink: item.drive_link || ''
                              });
                              setDriveInputLink(item.drive_link || '');
                            }}
                            getDeadlineStatus={getDeadlineStatus}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW PROJECT MANAGER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddPMModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Add New Project Manager</h3>
                </div>
                <button 
                  onClick={() => setShowAddPMModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Project Manager Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Lead Manager)"
                  value={newPMName}
                  onChange={(e) => setNewPMName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddPMModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newPMName.trim()) {
                      const name = newPMName.trim();
                      setPmList(prev => [...prev, name]);
                      if (showAddPMModal.projectId) {
                        handlePMChange(showAddPMModal.projectId, name);
                      }
                      setNewPMName('');
                      setShowAddPMModal({ open: false });
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Save Project Manager
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW EDITOR
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddEditorModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Add New Editor / Artist</h3>
                </div>
                <button 
                  onClick={() => setShowAddEditorModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Editor Name & Role</label>
                <input
                  type="text"
                  placeholder="e.g. Vikas (Colorist & Editor)"
                  value={newEditorName}
                  onChange={(e) => setNewEditorName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddEditorModal({ open: false })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newEditorName.trim()) {
                      const name = newEditorName.trim();
                      setEditorList(prev => [...prev, name]);
                      if (showAddEditorModal.projectId && showAddEditorModal.deliverableId) {
                        handleDeliverableUpdate(
                          showAddEditorModal.projectId,
                          showAddEditorModal.deliverableId,
                          'assigned_to',
                          name
                        );
                      }
                      setNewEditorName('');
                      setShowAddEditorModal({ open: false });
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                >
                  Save Editor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: COMMENTS & REMINDER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeCommentModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeCommentModal.deliverableTitle}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Activity logs, client revisions & follow-up reminders</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveCommentModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List (Scrollable) */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3">
                {(() => {
                  const currentProject = projects.find(p => p.id === activeCommentModal.projectId);
                  const currentItem = currentProject?.deliverables.find(d => d.id === activeCommentModal.deliverableId);
                  const comments = currentItem?.comments || [];

                  if (comments.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 space-y-1">
                        <MessageSquare className="w-6 h-6 mx-auto stroke-1" />
                        <p className="text-xs font-semibold">No comments or reminders logged yet.</p>
                      </div>
                    );
                  }

                  return comments.map(comm => (
                    <div key={comm.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{comm.authorName || 'Lead Editor'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(comm.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">{comm.text}</p>
                      {comm.alert_flag && comm.followup_at && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 w-fit">
                          <Bell className="w-3 h-3" />
                          Reminder Set: {new Date(comm.followup_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Add Comment Input Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <textarea
                  rows={2}
                  placeholder="Type editor revision note or task update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 resize-none font-medium placeholder:text-slate-400"
                />

                {/* Reminder Checkbox & Date Picker */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={commentAlertFlag}
                      onChange={(e) => setCommentAlertFlag(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Set Follow-up Reminder
                  </label>

                  {commentAlertFlag && (
                    <input
                      type="datetime-local"
                      value={commentFollowupDate}
                      onChange={(e) => setCommentFollowupDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  )}

                  <button
                    onClick={handleSaveComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post Log
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DRIVE LINK POPUP
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeDriveModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Google Drive Delivery Link</h3>
                </div>
                <button 
                  onClick={() => setActiveDriveModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Drive Folder URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveInputLink}
                  onChange={(e) => setDriveInputLink(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                {driveInputLink.trim() && (
                  <a
                    href={driveInputLink.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Test Open Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setActiveDriveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDriveLink}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
                  >
                    Save Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </SidebarLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// DELIVERABLE CATEGORY SUB-SECTION COMPONENT
// ─────────────────────────────────────────────────────────────
interface DeliverableCategorySectionProps {
  categoryTitle: string;
  categoryKey: 'photos' | 'videos' | 'albums';
  icon: React.ElementType;
  accentColor: 'indigo' | 'rose' | 'amber';
  badgeText: string;
  items: DeliverableItem[];
  projectId: string;
  editorList: string[];
  onUpdate: (projectId: string, deliverableId: string, field: keyof DeliverableItem, value: any) => void;
  onAdd: () => void;
  onDelete: (projectId: string, deliverableId: string) => void;
  onOpenComment: (item: DeliverableItem) => void;
  onOpenDrive: (item: DeliverableItem) => void;
  getDeadlineStatus: (deadlineStr?: string | null, status?: DeliverableStatus) => any;
}

function DeliverableCategorySection({
  categoryTitle,
  categoryKey,
  icon: Icon,
  accentColor,
  badgeText,
  items,
  projectId,
  editorList,
  onUpdate,
  onAdd,
  onDelete,
  onOpenComment,
  onOpenDrive,
  getDeadlineStatus
}: DeliverableCategorySectionProps) {
  const accentClasses = {
    indigo: {
      bg: 'bg-indigo-50/60',
      border: 'border-indigo-100',
      text: 'text-indigo-700',
      iconBg: 'bg-indigo-100 text-indigo-600',
      buttonBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
    },
    rose: {
      bg: 'bg-rose-50/60',
      border: 'border-rose-100',
      text: 'text-rose-700',
      iconBg: 'bg-rose-100 text-rose-600',
      buttonBg: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
    },
    amber: {
      bg: 'bg-amber-50/60',
      border: 'border-amber-100',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-600',
      buttonBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
    }
  }[accentColor];

  return (
    <div className={`p-4 rounded-2xl border ${accentClasses.border} ${accentClasses.bg} space-y-3`}>
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${accentClasses.iconBg} flex items-center justify-center font-bold`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">{categoryTitle}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border bg-white ${accentClasses.text} ${accentClasses.border}`}>
            {badgeText}
          </span>
        </div>

        <button
          onClick={onAdd}
          className={`px-3 py-1 text-xs font-bold rounded-lg border ${accentClasses.buttonBg} transition flex items-center gap-1.5 shadow-2xs`}
        >
          <Plus className="w-3.5 h-3.5" />
          + Add {categoryTitle.slice(0, -1)}
        </button>
      </div>

      {/* Deliverable Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-medium">
            No {categoryTitle.toLowerCase()} deliverables added yet. Click &quot;+ Add {categoryTitle.slice(0, -1)}&quot; to add one.
          </div>
        ) : (
          items.map(item => {
            const dl = getDeadlineStatus(item.deadline, item.status);
            const commentsCount = item.comments?.length || 0;

            return (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                {/* Left: Title & Count Input */}
                <div className="flex items-center gap-3 min-w-[240px]">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-900 block">{item.title}</span>
                    <input
                      type="text"
                      value={item.count || ''}
                      placeholder="Count (e.g. 500 Photos)"
                      onChange={(e) => onUpdate(projectId, item.id, 'count', e.target.value)}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
                    />
                  </div>
                </div>

                {/* Center: Deadline Picker & Assignee Editor */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Deadline Date */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={item.deadline || ''}
                      onChange={(e) => onUpdate(projectId, item.id, 'deadline', e.target.value)}
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Editor Assignee Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={item.assigned_to || ''}
                      onChange={(e) => onUpdate(projectId, item.id, 'assigned_to', e.target.value)}
                      className="px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {editorList.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                      <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New Editor</option>
                    </select>
                  </div>

                  {/* Stage Dropdown */}
                  <select
                    value={item.status || 'pending'}
                    onChange={(e) => onUpdate(projectId, item.id, 'status', e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* Overdue / Countdown Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] border whitespace-nowrap ${dl.badgeClass}`}>
                    {dl.text}
                  </span>
                </div>

                {/* Right: Drive Link, Comments/Reminders & Delete */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Comments / Activity Button with count badge */}
                  <button
                    onClick={() => onOpenComment(item)}
                    className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg transition flex items-center gap-1"
                    title="View comments & reminders"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {commentsCount > 0 && <span>{commentsCount}</span>}
                  </button>

                  {/* Drive Link Button */}
                  <button
                    onClick={() => onOpenDrive(item)}
                    className={`p-1.5 rounded-lg border transition ${
                      item.drive_link 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                    title={item.drive_link ? 'Open / edit Google Drive link' : 'Attach Google Drive link'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Item Button */}
                  <button
                    onClick={() => onDelete(projectId, item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

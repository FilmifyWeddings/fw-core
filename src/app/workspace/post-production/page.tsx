'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Video, Camera, BookOpen, Clock, AlertTriangle, CheckCircle2, 
  ExternalLink, User, Calendar, Plus, Search, Filter, Layers, 
  ChevronDown, ChevronUp, Edit3, MessageSquare, ArrowLeft, RefreshCw, 
  Play, Sparkles, Check, X, ShieldAlert, AlertCircle, Trash2, FolderPlus,
  Bell, Send, UserPlus, FileText, CheckSquare, MoreVertical, Link2,
  Mic, Palette, Tag, Hash
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AiMicButton from '@/components/AiMicButton';
import type { 
  PostProductionProject, DeliverableItem, DeliverableCategory, DeliverableStatus, WorkspaceClient, DeliverableComment 
} from '@/types';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

// Color Palette Themes for Categories
export type CategoryColorTheme = 'indigo' | 'rose' | 'amber' | 'emerald' | 'purple' | 'cyan' | 'pink' | 'orange';

export interface CategoryDefinition {
  key: string;
  label: string;
  colorTheme: CategoryColorTheme;
  iconName?: string;
}

// Pre-defined / default categories
const DEFAULT_CATEGORY_DEFS: Record<string, { label: string; colorTheme: CategoryColorTheme }> = {
  photos: { label: 'Photos', colorTheme: 'indigo' },
  videos: { label: 'Videos', colorTheme: 'rose' },
  albums: { label: 'Albums', colorTheme: 'amber' },
  reels: { label: 'Reels & Shorts', colorTheme: 'emerald' },
  teasers: { label: 'Teasers & Promos', colorTheme: 'cyan' },
  raw_dump: { label: 'Raw Dumps & Drives', colorTheme: 'purple' },
  drone: { label: 'Drone Footage', colorTheme: 'orange' },
  social: { label: 'Social Media Edits', colorTheme: 'pink' },
};

// Theme classes mapping for cards
const COLOR_THEME_CLASSES: Record<CategoryColorTheme, {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeBorder: string;
  iconBg: string;
  buttonBg: string;
}> = {
  indigo: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200/90',
    text: 'text-indigo-700',
    badgeBg: 'bg-indigo-100/90',
    badgeBorder: 'border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-600',
    buttonBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
  },
  rose: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-200/90',
    text: 'text-rose-700',
    badgeBg: 'bg-rose-100/90',
    badgeBorder: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-600',
    buttonBg: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
  },
  amber: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-200/90',
    text: 'text-amber-800',
    badgeBg: 'bg-amber-100/90',
    badgeBorder: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    buttonBg: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
  },
  emerald: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200/90',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100/90',
    badgeBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
    buttonBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
  },
  purple: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-200/90',
    text: 'text-purple-700',
    badgeBg: 'bg-purple-100/90',
    badgeBorder: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-600',
    buttonBg: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
  },
  cyan: {
    bg: 'bg-cyan-50/70',
    border: 'border-cyan-200/90',
    text: 'text-cyan-700',
    badgeBg: 'bg-cyan-100/90',
    badgeBorder: 'border-cyan-200',
    iconBg: 'bg-cyan-100 text-cyan-600',
    buttonBg: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200'
  },
  pink: {
    bg: 'bg-pink-50/70',
    border: 'border-pink-200/90',
    text: 'text-pink-700',
    badgeBg: 'bg-pink-100/90',
    badgeBorder: 'border-pink-200',
    iconBg: 'bg-pink-100 text-pink-600',
    buttonBg: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200'
  },
  orange: {
    bg: 'bg-orange-50/70',
    border: 'border-orange-200/90',
    text: 'text-orange-700',
    badgeBg: 'bg-orange-100/90',
    badgeBorder: 'border-orange-200',
    iconBg: 'bg-orange-100 text-orange-600',
    buttonBg: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
  },
};

// Stage / Status options with Light Theme Badges
const STATUS_OPTIONS: { value: DeliverableStatus; label: string; badgeClass: string; dotClass: string }[] = [
  { value: 'pending', label: 'Pending', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' },
  { value: 'upcoming', label: 'Upcoming', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', dotClass: 'bg-sky-500' },
  { value: 'in_progress', label: 'In Progress', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-600' },
  { value: 'under_review', label: 'Under Review', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-600' },
  { value: 'completed', label: 'Done', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-600' },
];

// Initial Team PMs and Editors (dynamically populated from Team & Partners)
const INITIAL_PMS: string[] = [];
const INITIAL_EDITORS: string[] = [];

export default function PostProductionPage() {
  const [projects, setProjects] = useState<PostProductionProject[]>([]);
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delayed' | 'completed'>('all');
  
  // Expanded cards set (holds project IDs that are currently expanded)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // PM and Editor lists from Team & Partners
  const [pmList, setPmList] = useState<string[]>([]);
  const [editorList, setEditorList] = useState<string[]>([]);

  // Modals state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddPMModal, setShowAddPMModal] = useState<{ open: boolean; projectId?: string }>({ open: false });
  const [newPMName, setNewPMName] = useState('');
  
  const [showAddEditorModal, setShowAddEditorModal] = useState<{ open: boolean; projectId?: string; deliverableId?: string }>({ open: false });
  const [newEditorName, setNewEditorName] = useState('');

  // Add Dynamic Category Modal state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<{ open: boolean; projectId?: string }>({ open: false });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorTheme>('emerald');

  // Unified Add Deliverable Item UI Modal state (Title + Count + Editor + Deadline in ONE Modal)
  const [showAddDeliverableModal, setShowAddDeliverableModal] = useState<{
    open: boolean;
    projectId?: string;
    categoryKey?: string;
    categoryTitle?: string;
    colorTheme?: CategoryColorTheme;
  }>({ open: false });
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableCount, setNewDeliverableCount] = useState('');
  const [newDeliverableAssignee, setNewDeliverableAssignee] = useState('');
  const [newDeliverableDeadline, setNewDeliverableDeadline] = useState('');

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
        assigned_to: '',
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
        assigned_to: '',
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
        assigned_to: '',
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
        assigned_to: '',
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
        assigned_to: '',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 7 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      },
      {
        id: `deliv_video_3_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: 'Traditional Full Video',
        category: 'videos',
        count: '2 Hours',
        assigned_to: '',
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
        assigned_to: '',
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
        assigned_to: '',
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
        assigned_to: '',
        deadline: eventDateStr ? new Date(new Date(eventDateStr).getTime() + 60 * 86400000).toISOString().split('T')[0] : '',
        status: 'pending',
        drive_link: '',
        comments: []
      }
    ];
  };

  // Fetch projects, clients and real Team & Partners from Supabase
  useEffect(() => {
    fetchPostProductionData();
  }, []);

  const fetchPostProductionData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      // 0. Fetch real Team & Partners from DB / API
      const dynamicTeamNames: string[] = [];

      try {
        const token = session?.access_token;
        const res = await fetch(`/api/workspace/members?workspace_id=${workspaceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.members)) {
          json.members.forEach((m: any) => {
            const cleanName = m.name?.trim();
            if (cleanName && !dynamicTeamNames.includes(cleanName)) {
              dynamicTeamNames.push(cleanName);
            }
          });
        }
      } catch (_) {}

      try {
        const { data: fwData } = await supabase
          .from('fw_team_members')
          .select('name')
          .eq('user_id', workspaceId);

        if (fwData && fwData.length > 0) {
          fwData.forEach((f: any) => {
            const cleanName = f.name?.trim();
            if (cleanName && !dynamicTeamNames.includes(cleanName)) {
              dynamicTeamNames.push(cleanName);
            }
          });
        }
      } catch (_) {}

      // Get workspace owner's name / full name
      const ownerName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Studio Lead';
      if (!dynamicTeamNames.some(t => t.toLowerCase() === ownerName.toLowerCase())) {
        dynamicTeamNames.unshift(ownerName);
      }

      setPmList(dynamicTeamNames);
      setEditorList(dynamicTeamNames);
      const defaultPM = dynamicTeamNames[0] || ownerName;

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
            project_manager_name: existingProj.project_manager_name || defaultPM,
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
            project_manager_name: defaultPM,
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
            project_manager_name: defaultPM,
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

  // Open the Unified Add Deliverable UI Modal
  const openAddDeliverableModal = (
    projectId: string, 
    categoryKey: string, 
    categoryTitle: string, 
    colorTheme?: CategoryColorTheme
  ) => {
    setNewDeliverableTitle('');
    setNewDeliverableCount(
      categoryKey === 'photos' ? '500 Photos' :
      categoryKey === 'videos' ? '25 Mins' :
      categoryKey === 'albums' ? '40 Pages' :
      categoryKey === 'reels' ? '3 Reels' :
      categoryKey === 'teasers' ? '1 Min' : '1 Item'
    );
    setNewDeliverableAssignee(
      categoryKey === 'photos' ? 'Vikram (Photo Retoucher)' :
      categoryKey === 'albums' ? 'Rohan (Album Designer)' : 'Amit (Senior Video Editor)'
    );
    setNewDeliverableDeadline('');
    setShowAddDeliverableModal({
      open: true,
      projectId,
      categoryKey,
      categoryTitle,
      colorTheme: colorTheme || 'indigo',
    });
  };

  // Confirm Add Deliverable Item from UI Modal
  const handleConfirmAddDeliverable = () => {
    if (!newDeliverableTitle.trim() || !showAddDeliverableModal.projectId || !showAddDeliverableModal.categoryKey) return;

    const { projectId, categoryKey, categoryTitle, colorTheme } = showAddDeliverableModal;

    const newDeliverable: DeliverableItem = {
      id: `deliv_${categoryKey}_${Date.now()}`,
      title: newDeliverableTitle.trim(),
      category: categoryKey as any,
      count: newDeliverableCount.trim() || '1 Item',
      assigned_to: newDeliverableAssignee || 'Amit (Senior Video Editor)',
      deadline: newDeliverableDeadline || '',
      status: 'pending',
      drive_link: '',
      comments: []
    };

    if (categoryTitle) (newDeliverable as any).category_name = categoryTitle;
    if (colorTheme) (newDeliverable as any).category_color = colorTheme;

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = [...p.deliverables, newDeliverable];
        updateProjectInDB(projectId, p.client_id, { deliverables: updatedDeliverables });
        return { ...p, deliverables: updatedDeliverables };
      }
      return p;
    }));

    setShowAddDeliverableModal({ open: false });
  };

  // Add a whole new dynamic category card to a project
  const handleCreateCategoryCard = (projectId: string, categoryName: string, colorTheme: CategoryColorTheme) => {
    if (!categoryName.trim()) return;

    const slug = categoryName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const categoryKey = `cat_${slug}_${Date.now()}`;

    // Add first initial item to this new category
    const initialItem: DeliverableItem = {
      id: `deliv_${categoryKey}_1_${Date.now()}`,
      title: `${categoryName.trim()} Item 1`,
      category: categoryKey as any,
      count: '1 Unit',
      assigned_to: 'Amit (Senior Video Editor)',
      deadline: '',
      status: 'pending',
      drive_link: '',
      comments: []
    };

    (initialItem as any).category_name = categoryName.trim();
    (initialItem as any).category_color = colorTheme;

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = [...p.deliverables, initialItem];
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

  // Delete entire category card
  const handleDeleteCategory = (projectId: string, categoryKey: string, categoryTitle: string) => {
    if (!confirm(`Are you sure you want to delete the entire "${categoryTitle}" category card and all its items?`)) return;

    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedDeliverables = p.deliverables.filter(d => d.category !== categoryKey);
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
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-20 pt-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              HEADER & TOP CONTROLS (LUXURY CREAMY & LIGHT YELLOW)
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#FFFDF9] rounded-2xl p-6 border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-md text-white font-bold">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Post-Production Tracking</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                    Studio Suite
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Deliverables engine with dynamic category cards (Photos, Videos, Albums, Custom Cards), AI Voice notes, and deadline countdowns.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/workspace/clients"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition flex items-center gap-2 shadow-2xs"
              >
                <User className="w-4 h-4 text-amber-700" />
                Client Directory
              </Link>
              <button
                onClick={fetchPostProductionData}
                className="p-2 text-slate-600 hover:text-slate-900 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition shadow-2xs cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              METRICS DASHBOARD (WARM LUXURY CREAM & GOLD CARDS)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Studio Projects</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalProjects} <span className="text-xs font-bold text-slate-500">Projects</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Overall Deliverables Done</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{overallPercentage}% <span className="text-xs font-bold text-slate-500">({completedDeliverablesCount}/{totalDeliverablesCount})</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-amber-300/80 transition-all">
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Pipeline</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">{activeProjects} <span className="text-xs font-bold text-slate-500">Active</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#EAE5DA] shadow-xs flex items-center justify-between hover:border-rose-300/80 transition-all">
              <div>
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Delayed / Overdue</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{delayedProjects} <span className="text-xs font-bold text-slate-500">Delayed</span></h3>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SEARCH & FILTER CONTROLS
          ───────────────────────────────────────────────────────────── */}
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by client, manager, or event type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
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
            <StudioCoreLiquidLoader label="Loading Production Pipelines..." fullscreen={false} />
          ) : filteredProjects.length === 0 ? (
            <div className="bg-[#FFFDF9] p-12 rounded-2xl border border-dashed border-amber-300/80 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
                <Film className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Post-Production Projects Found</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Mark any lead as &quot;Booked&quot; in the CRM or add a client from the Client Directory to automatically start post-production tracking.
                </p>
              </div>
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition"
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

                // Extract all unique categories present in this project
                const categoryKeys = Array.from(new Set(deliverables.map(d => d.category)));

                // Always ensure standard 3 categories are visible if empty or present
                const standardKeys = ['photos', 'videos', 'albums'];
                const allKeysToRender = Array.from(new Set([...standardKeys, ...categoryKeys]));

                return (
                  <motion.div
                    key={project.id}
                    layout
                    className="bg-[#FFFDF9] rounded-2xl border border-[#EAE5DA] shadow-xs overflow-hidden transition-all hover:border-amber-300/80"
                  >
                    {/* ── CARD HEADER ── */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50/40 via-[#FFFDF9] to-amber-50/20 border-b border-[#EAE5DA] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                          <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            {project.client?.event_type || 'Wedding & Reception'}
                          </span>

                          <span className="text-slate-300">•</span>

                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Event Date: {project.client?.event_date ? new Date(project.client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '2026-11-18'}
                          </span>

                          <span className="text-slate-300">•</span>

                          {/* Project Manager Dropdown with Add Option */}
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-700" />
                            <span className="text-slate-500 font-bold">PM:</span>
                            <select
                              value={project.project_manager_name || pmList[0] || ''}
                              onChange={(e) => handlePMChange(project.id, e.target.value)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer max-w-[200px]"
                            >
                              {project.project_manager_name && !pmList.includes(project.project_manager_name) && (
                                <option value={project.project_manager_name}>{project.project_manager_name}</option>
                              )}
                              {pmList.map(pm => (
                                <option key={pm} value={pm}>{pm}</option>
                              ))}
                              <option value="__ADD_NEW__" className="font-bold text-amber-800">+ Add Team Member</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress Bar & Toggle View Button */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="space-y-1.5 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs font-extrabold">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-amber-800 font-black">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-yellow-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => toggleCardExpansion(project.id)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                            isExpanded 
                              ? 'bg-amber-100/70 text-amber-900 border-amber-300 hover:bg-amber-200/70' 
                              : 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-2xs'
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

                    {/* ── EXPANDED DELIVERABLES ACCORDION (MULTI-CATEGORY CARDS) ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="p-5 sm:p-6 space-y-6 bg-[#FCFAF6]"
                        >
                          {/* Deliverable Category Sections List */}
                          {allKeysToRender.map((catKey) => {
                            const catItems = deliverables.filter(d => d.category === catKey);
                            const firstItem = catItems[0] as any;

                            // Resolve category meta
                            const def = DEFAULT_CATEGORY_DEFS[catKey];
                            const categoryTitle = firstItem?.category_name || def?.label || catKey.charAt(0).toUpperCase() + catKey.slice(1);
                            const colorTheme: CategoryColorTheme = firstItem?.category_color || def?.colorTheme || 'indigo';

                            // Standard icon resolver
                            const getIcon = () => {
                              if (catKey === 'photos') return Camera;
                              if (catKey === 'videos') return Video;
                              if (catKey === 'albums') return BookOpen;
                              if (catKey === 'reels') return Film;
                              if (catKey === 'teasers') return Play;
                              if (catKey === 'raw_dump') return Layers;
                              return Sparkles;
                            };

                            const doneCount = catItems.filter(d => d.status === 'completed' || d.status === 'done').length;
                            const badgeText = `${doneCount}/${catItems.length} Done`;

                            return (
                              <DeliverableCategorySection
                                key={catKey}
                                categoryTitle={categoryTitle}
                                categoryKey={catKey}
                                icon={getIcon()}
                                colorTheme={colorTheme}
                                badgeText={badgeText}
                                items={catItems}
                                projectId={project.id}
                                editorList={editorList}
                                isStandard={['photos', 'videos', 'albums'].includes(catKey)}
                                onUpdate={handleDeliverableUpdate}
                                onAdd={() => openAddDeliverableModal(project.id, catKey, categoryTitle, colorTheme)}
                                onDeleteItem={handleDeleteDeliverable}
                                onDeleteCategory={() => handleDeleteCategory(project.id, catKey, categoryTitle)}
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
                            );
                          })}

                          {/* ── CREATE NEW CUSTOM CATEGORY CARD BUTTON ── */}
                          <div className="pt-2 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setShowAddCategoryModal({ open: true, projectId: project.id })}
                              className="px-5 py-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border border-amber-300/80 rounded-2xl text-xs font-bold text-amber-900 transition flex items-center gap-2 shadow-2xs cursor-pointer group"
                            >
                              <div className="w-5 h-5 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                              </div>
                              + Add New Category / Deliverable Card (Reels, Teasers, Custom Card)
                            </button>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD DELIVERABLE ITEM (UNIFIED BEAUTIFUL UI DIALOG)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddDeliverableModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-lg w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Add New {showAddDeliverableModal.categoryTitle} Deliverable
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Create a deliverable task with title, quantity, artist & deadline</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddDeliverableModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 pt-1">
                {/* 1. Deliverable Title */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Deliverable Name / Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Candid Wedding Photos, Cinematic Highlight Film, 40 Page Album..."
                    value={newDeliverableTitle}
                    onChange={(e) => setNewDeliverableTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold placeholder:text-slate-400"
                  />
                </div>

                {/* 2. Count / Specifications */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Quantity / Specifications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 Photos, 25 Mins, 40 Pages, 3 Reels, 1 Hard Drive..."
                    value={newDeliverableCount}
                    onChange={(e) => setNewDeliverableCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-semibold placeholder:text-slate-400"
                  />
                </div>

                {/* 3. Assigned Editor & Deadline Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Assigned Editor / Artist
                    </label>
                    <select
                      value={newDeliverableAssignee}
                      onChange={(e) => setNewDeliverableAssignee(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {editorList.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Target Delivery Deadline
                    </label>
                    <input
                      type="date"
                      value={newDeliverableDeadline}
                      onChange={(e) => setNewDeliverableDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE5DA]">
                <button
                  onClick={() => setShowAddDeliverableModal({ open: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddDeliverable}
                  disabled={!newDeliverableTitle.trim()}
                  className="px-5 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Save Deliverable Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD DYNAMIC CUSTOM CATEGORY CARD
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddCategoryModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Add New Category Card</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Create a custom deliverable tracking card</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddCategoryModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category Card Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Reels & Shorts, Raw Footage Drive, Teasers..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Card Color Palette</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['emerald', 'purple', 'cyan', 'pink', 'orange', 'indigo', 'rose', 'amber'] as CategoryColorTheme[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewCategoryColor(col)}
                        className={`p-2 rounded-xl border text-xs font-bold capitalize flex items-center justify-center gap-1 cursor-pointer transition ${
                          newCategoryColor === col 
                            ? 'ring-2 ring-amber-500 font-black ' + COLOR_THEME_CLASSES[col].bg + ' ' + COLOR_THEME_CLASSES[col].text + ' ' + COLOR_THEME_CLASSES[col].border
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${COLOR_THEME_CLASSES[col].bg.replace('50/70', '500')}`} />
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                <button
                  onClick={() => setShowAddCategoryModal({ open: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newCategoryName.trim() && showAddCategoryModal.projectId) {
                      handleCreateCategoryCard(
                        showAddCategoryModal.projectId,
                        newCategoryName.trim(),
                        newCategoryColor
                      );
                      setNewCategoryName('');
                      setShowAddCategoryModal({ open: false });
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-xs transition"
                >
                  Create Card
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Add New Project Manager</h3>
                </div>
                <button 
                  onClick={() => setShowAddPMModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Project Manager Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Lead Manager)"
                  value={newPMName}
                  onChange={(e) => setNewPMName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                <button
                  onClick={() => setShowAddPMModal({ open: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
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
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition"
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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Add New Editor / Artist</h3>
                </div>
                <button 
                  onClick={() => setShowAddEditorModal({ open: false })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Editor Name & Role</label>
                <input
                  type="text"
                  placeholder="e.g. Vikas (Colorist & Editor)"
                  value={newEditorName}
                  onChange={(e) => setNewEditorName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE5DA]">
                <button
                  onClick={() => setShowAddEditorModal({ open: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
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
                  className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition"
                >
                  Save Editor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: COMMENTS & REVISION LOG WITH AI VOICE RECORDER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeCommentModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] rounded-2xl max-w-lg w-full border border-[#EAE5DA] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[#EAE5DA] flex items-center justify-between bg-amber-50/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{activeCommentModal.deliverableTitle}</h3>
                    <p className="text-[11px] text-slate-600 font-medium">Activity logs, client revisions, AI voice notes & follow-ups</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveCommentModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
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
                        <p className="text-xs font-bold text-slate-500">No comments or voice notes logged yet.</p>
                      </div>
                    );
                  }

                  return comments.map(comm => (
                    <div key={comm.id} className="p-3 bg-white border border-[#EAE5DA] rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">{comm.authorName || 'Lead Editor'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(comm.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{comm.text}</p>
                      {comm.alert_flag && comm.followup_at && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 w-fit">
                          <Bell className="w-3 h-3" />
                          Reminder Set: {new Date(comm.followup_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Add Comment Input Footer with AI Voice Mic Button */}
              <div className="p-4 border-t border-[#EAE5DA] bg-amber-50/30 space-y-3">
                <div className="relative">
                  <textarea
                    rows={2}
                    placeholder="Type revision note or click Voice AI to speak..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 resize-none font-medium placeholder:text-slate-400 pr-24"
                  />
                  {/* Embedded Voice AI Mic Button */}
                  <div className="absolute right-2 bottom-2">
                    <AiMicButton
                      size="sm"
                      buttonText="Voice AI"
                      onInsertComment={(cleanedText) => {
                        setCommentText((prev) => (prev ? `${prev} ${cleanedText}` : cleanedText));
                      }}
                    />
                  </div>
                </div>

                {/* Reminder Checkbox & Date Picker */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={commentAlertFlag}
                      onChange={(e) => setCommentAlertFlag(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                    Set Follow-up Reminder
                  </label>

                  {commentAlertFlag && (
                    <input
                      type="datetime-local"
                      value={commentFollowupDate}
                      onChange={(e) => setCommentFollowupDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-[#EAE5DA] rounded-lg text-slate-800 font-medium"
                    />
                  )}

                  <button
                    onClick={handleSaveComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-1.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ml-auto"
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
              className="bg-[#FFFDF9] rounded-2xl p-6 max-w-md w-full border border-[#EAE5DA] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Google Drive Delivery Link</h3>
                </div>
                <button 
                  onClick={() => setActiveDriveModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Drive Folder URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveInputLink}
                  onChange={(e) => setDriveInputLink(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#EAE5DA]">
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
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDriveLink}
                    className="px-4 py-2 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition"
                  >
                    Save Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DELIVERABLE CATEGORY SUB-SECTION COMPONENT (MULTI-CARD)
// ─────────────────────────────────────────────────────────────
interface DeliverableCategorySectionProps {
  categoryTitle: string;
  categoryKey: string;
  icon: React.ElementType;
  colorTheme: CategoryColorTheme;
  badgeText: string;
  items: DeliverableItem[];
  projectId: string;
  editorList: string[];
  isStandard?: boolean;
  onUpdate: (projectId: string, deliverableId: string, field: keyof DeliverableItem, value: any) => void;
  onAdd: () => void;
  onDeleteItem: (projectId: string, deliverableId: string) => void;
  onDeleteCategory?: () => void;
  onOpenComment: (item: DeliverableItem) => void;
  onOpenDrive: (item: DeliverableItem) => void;
  getDeadlineStatus: (deadlineStr?: string | null, status?: DeliverableStatus) => any;
}

function DeliverableCategorySection({
  categoryTitle,
  categoryKey,
  icon: Icon,
  colorTheme,
  badgeText,
  items,
  projectId,
  editorList,
  isStandard = true,
  onUpdate,
  onAdd,
  onDeleteItem,
  onDeleteCategory,
  onOpenComment,
  onOpenDrive,
  getDeadlineStatus
}: DeliverableCategorySectionProps) {
  const theme = COLOR_THEME_CLASSES[colorTheme] || COLOR_THEME_CLASSES.indigo;

  return (
    <div className={`p-4 rounded-2xl border ${theme.border} ${theme.bg} space-y-3 shadow-2xs`}>
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg ${theme.iconBg} flex items-center justify-center font-bold`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">{categoryTitle}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeBg} ${theme.text} ${theme.badgeBorder}`}>
            {badgeText}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className={`px-3 py-1 text-xs font-bold rounded-lg border ${theme.buttonBg} transition flex items-center gap-1.5 shadow-2xs cursor-pointer`}
          >
            <Plus className="w-3.5 h-3.5" />
            + Add {categoryTitle.replace(/s$/, '')}
          </button>

          {/* Delete entire custom category if not standard */}
          {!isStandard && onDeleteCategory && (
            <button
              onClick={onDeleteCategory}
              className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200 rounded-lg transition shadow-2xs cursor-pointer"
              title="Delete Category Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Deliverable Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-4 bg-white/80 rounded-xl border border-slate-200/60 text-center text-xs text-slate-500 font-medium">
            No items in {categoryTitle.toLowerCase()} yet. Click &quot;+ Add {categoryTitle.replace(/s$/, '')}&quot; to add one.
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
                    <span className="text-xs font-black text-slate-900 block">{item.title}</span>
                    <input
                      type="text"
                      value={item.count || ''}
                      placeholder="Count (e.g. 500 Photos)"
                      onChange={(e) => onUpdate(projectId, item.id, 'count', e.target.value)}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36"
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
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Editor Assignee Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={item.assigned_to || ''}
                      onChange={(e) => onUpdate(projectId, item.id, 'assigned_to', e.target.value)}
                      className="px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {editorList.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                      <option value="__ADD_NEW__" className="font-bold text-amber-800">+ Add New Editor</option>
                    </select>
                  </div>

                  {/* Stage Dropdown */}
                  <select
                    value={item.status || 'pending'}
                    onChange={(e) => onUpdate(projectId, item.id, 'status', e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 cursor-pointer"
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

                {/* Right: Drive Link, Comments/Reminders & Light Red Delete Button */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Comments / Activity Button with count badge */}
                  <button
                    onClick={() => onOpenComment(item)}
                    className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-amber-800 bg-amber-50/70 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="View comments, revision logs & AI voice recorder"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {commentsCount > 0 && <span className="font-black text-amber-800">{commentsCount}</span>}
                  </button>

                  {/* Drive Link Button */}
                  <button
                    onClick={() => onOpenDrive(item)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      item.drive_link 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                    title={item.drive_link ? 'Open / edit Google Drive link' : 'Attach Google Drive link'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {/* Soft Light Red Delete Button */}
                  <button
                    onClick={() => onDeleteItem(projectId, item.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition shadow-2xs cursor-pointer"
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

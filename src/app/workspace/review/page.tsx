'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Film, Plus, Search, Filter, HardDrive, Share2, 
  CheckCircle2, Clock, FileEdit, AlertCircle, Sparkles, 
  ChevronRight, Calendar, User, LayoutGrid, List, Video,
  PlaySquare, ArrowUpRight, Copy, Check, Trash2, ShieldCheck
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import NewProjectModal from '@/components/review/NewProjectModal';
import DeleteProjectModal from '@/components/review/DeleteProjectModal';

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export default function ReviewProjectsPage() {
  const router = useRouter();
  const { activeWorkspace, isOwner, loading } = useWorkspace();
  const rawWsId = activeWorkspace?.workspaceId;
  const workspaceId = isValidUUID(rawWsId) ? rawWsId : null;

  const [projects, setProjects] = useState<any[]>(() => {
    if (typeof window !== 'undefined' && workspaceId) {
      try {
        const stored = sessionStorage.getItem(`sc_review_projects_${workspaceId}`);
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });
  const [quota, setQuota] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!projects.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_review' | 'changes_requested' | 'approved' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

  // Instant 0ms hydration from workspace cache on workspaceId change
  useEffect(() => {
    if (!workspaceId) {
      setProjects([]);
      setIsLoading(loading);
      return;
    }
    try {
      const stored = sessionStorage.getItem(`sc_review_projects_${workspaceId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
          setIsLoading(false);
        }
      } else {
        setProjects([]);
        setIsLoading(true);
      }
    } catch (_) {}
  }, [workspaceId, loading]);

  const loadData = async () => {
    if (loading || !workspaceId) return;

    try {
      const queryParam = `workspace_id=${workspaceId}`;
      const statusParam = statusFilter ? `status=${statusFilter}` : '';
      const qs = [queryParam, statusParam].filter(Boolean).join('&');

      const [projRes, quotaRes] = await Promise.all([
        fetch(`/api/review/projects?${qs}`),
        fetch(`/api/review/quotas?workspace_id=${workspaceId}`),
      ]);

      const projData = await projRes.json();
      const quotaData = await quotaRes.json();

      if (projData.success && Array.isArray(projData.projects)) {
        setProjects(projData.projects);
        try {
          sessionStorage.setItem(`sc_review_projects_${workspaceId}`, JSON.stringify(projData.projects));
        } catch (_) {}
      }
      if (quotaData.success) {
        setQuota(quotaData.quota);
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && workspaceId) {
      loadData();
    }
  }, [workspaceId, statusFilter, loading]);

  const filteredProjects = projects.filter(p => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <FileEdit className="w-3 h-3 text-amber-500" /> Changes Requested
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" /> In Client Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] p-4 sm:p-8 space-y-6 select-none font-sans">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E7E2D8] shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-[11px] font-black tracking-wider uppercase border border-amber-500/20">
              Workflows · Video Review
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-400 font-medium">FreeFrame / Frame.io Native Integration</span>
          </div>

          <h1 
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
            className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight"
          >
            StudioCore Video Review
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl">
            Frame-accurate video proofing, timecode comments, on-frame pencil drawings, Backblaze B2 storage & 1-click approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Review Project</span>
          </button>
        </div>
      </div>

      {/* 2. Light Theme: Storage Quota & Usage Card (Aligned with Reference Image) */}
      {quota && (() => {
        const availableBytes = Number(quota.available_bytes) || 0;
        const formattedRemaining = availableBytes >= 1024 * 1024 * 1024
          ? `${(availableBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
          : `${Math.max(0, availableBytes / (1024 * 1024)).toFixed(1)} MB`;
        
        const isNearFull = quota.percentage_used >= 85;
        const freePercentage = Math.max(0, 100 - quota.percentage_used);
        const projectsCapacityPercent = Math.min(100, Math.max(5, (projects.length / 25) * 100));

        // SVG circle circumference for r=24 is 2 * PI * 24 ≈ 150.8
        const circumference = 150.8;

        return (
          <div className="bg-white rounded-3xl border border-[#E7E2D8] p-5 sm:p-7 shadow-xs space-y-5 select-none transition-all duration-200">
            
            {/* Header: Title & Quota Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>Quota & Usage</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Backblaze B2 Active
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Monitor your review storage and cloud allocation in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                  quota.is_trial
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {quota.tier_name}
                </span>
              </div>
            </div>

            {/* Usage Panels Stack (Exact Light Style with Progress Bar + Circular Gauges) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Row 1: Cloud Storage Used */}
              <div className="bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8] p-4.5 flex items-center justify-between gap-4 transition hover:border-amber-300 hover:shadow-2xs">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <span className="truncate">Cloud Storage Used</span>
                    <span className="font-mono text-zinc-500">{quota.percentage_used}%</span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                    <div 
                      style={{ width: `${Math.min(100, Math.max(3, quota.percentage_used))}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isNearFull ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 font-medium">
                    <span className="truncate">{quota.formatted_used} used</span>
                    <span className="truncate font-mono">Limit: {quota.formatted_total}</span>
                  </div>
                </div>

                {/* Circular Gauge */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" stroke="#E5E7EB" strokeWidth="4.5" fill="none" />
                    <circle 
                      cx="30" cy="30" r="24" 
                      stroke={isNearFull ? '#EF4444' : '#2563EB'} 
                      strokeWidth="4.5" 
                      fill="none" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - (circumference * Math.min(100, quota.percentage_used)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-black text-zinc-900 leading-none">
                      {quota.percentage_used}%
                    </span>
                    <span className="text-[8px] text-zinc-400 font-semibold leading-none mt-0.5">used</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Active Review Projects */}
              <div className="bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8] p-4.5 flex items-center justify-between gap-4 transition hover:border-amber-300 hover:shadow-2xs">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <span className="truncate">Projects Uploaded</span>
                    <span className="font-mono text-amber-700">{projects.length} Active</span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                    <div 
                      style={{ width: `${projectsCapacityPercent}%` }}
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 font-medium">
                    <span className="truncate">{projects.length} {projects.length === 1 ? 'Project' : 'Projects'}</span>
                    <span className="truncate">Live Review Hubs</span>
                  </div>
                </div>

                {/* Circular Gauge */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" stroke="#E5E7EB" strokeWidth="4.5" fill="none" />
                    <circle 
                      cx="30" cy="30" r="24" 
                      stroke="#F59E0B" 
                      strokeWidth="4.5" 
                      fill="none" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - (circumference * projectsCapacityPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[13px] font-black text-zinc-900 leading-none">
                      {projects.length}
                    </span>
                    <span className="text-[8px] text-zinc-400 font-semibold leading-none mt-0.5">projects</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Remaining Free Space */}
              <div className="bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8] p-4.5 flex items-center justify-between gap-4 transition hover:border-amber-300 hover:shadow-2xs">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <span className="truncate">Remaining Space</span>
                    <span className="font-mono text-emerald-700">{formattedRemaining}</span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                    <div 
                      style={{ width: `${Math.min(100, Math.max(3, freePercentage))}%` }}
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 font-medium">
                    <span className="truncate">{freePercentage}% capacity free</span>
                    <span className="truncate">1080p Optimized</span>
                  </div>
                </div>

                {/* Circular Gauge */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" stroke="#E5E7EB" strokeWidth="4.5" fill="none" />
                    <circle 
                      cx="30" cy="30" r="24" 
                      stroke="#10B981" 
                      strokeWidth="4.5" 
                      fill="none" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - (circumference * Math.min(100, freePercentage)) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-black text-emerald-700 leading-none">
                      {freePercentage}%
                    </span>
                    <span className="text-[8px] text-zinc-400 font-semibold leading-none mt-0.5">free</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or client..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E7E2D8] text-xs font-medium placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-white border border-[#E7E2D8] rounded-xl p-1 shadow-2xs text-xs font-bold">
            {(['all', 'in_review', 'changes_requested', 'approved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition capitalize cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white border border-[#E7E2D8] rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-50 text-amber-600' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'bg-amber-50 text-amber-600' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Projects Grid / List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <StudioCoreLiquidLoader label="Loading video review projects..." />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Video className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-zinc-900">No Review Projects Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Create your first project to share video revisions with clients, collect frame-accurate notes, and manage sign-offs.
            </p>
          </div>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-2xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Review Project</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/workspace/video-review/${project.id}`)}
              className="group bg-white rounded-2xl border border-[#E7E2D8] overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all duration-200 cursor-pointer flex flex-col justify-between relative"
            >
              {/* Compact Card Thumbnail */}
              <div className="relative aspect-[16/9] bg-zinc-900 overflow-hidden">
                {project.cover_thumbnail_url ? (
                  <img
                    src={project.cover_thumbnail_url}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-gradient-to-br from-zinc-800 to-zinc-900 p-3 text-center">
                    <Film className="w-7 h-7 mb-1.5 text-amber-500/70" />
                    <span className="text-[11px] font-bold text-zinc-300 truncate max-w-full px-2">
                      {project.name}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 scale-90 origin-top-left">
                  {getStatusBadge(project.status)}
                </div>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project);
                  }}
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-white/80 hover:text-white transition backdrop-blur-sm opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                  title="Delete Project & Purge Storage"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Bottom title */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                  <h3 className="font-bold text-xs truncate drop-shadow-xs">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-[10px] text-zinc-300 truncate flex items-center gap-1 mt-0.5 font-medium drop-shadow-xs">
                      <User className="w-2.5 h-2.5 text-amber-400" />
                      <span>{project.client_name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Compact Card Footer */}
              <div className="py-2.5 px-3 border-t border-[#E7E2D8] bg-[#FAF9F5] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
                  <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{project.event_date ? new Date(project.event_date).toLocaleDateString() : 'No date'}</span>
                </div>

                <div className="flex items-center gap-0.5 font-bold text-[11px] text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                  <span>Open</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-3xl border border-[#E7E2D8] shadow-2xs divide-y divide-zinc-100 overflow-hidden">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/workspace/video-review/${project.id}`)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAF9F5] transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-zinc-900 truncate">{project.name}</h4>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {project.client_name ? `Client: ${project.client_name}` : 'No client specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {getStatusBadge(project.status)}
                <div className="text-[11px] text-zinc-400 hidden sm:block">
                  {project.event_date ? new Date(project.event_date).toLocaleDateString() : '—'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Project & Purge Storage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        workspaceId={workspaceId || ''}
        onProjectCreated={(newProj) => {
          setProjects(prev => [newProj, ...prev]);
          if (workspaceId) {
            try {
              sessionStorage.setItem(`sc_review_projects_${workspaceId}`, JSON.stringify([newProj, ...projects]));
            } catch (_) {}
          }
          router.push(`/workspace/video-review/${newProj.id}`);
        }}
      />

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        isOpen={Boolean(projectToDelete)}
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onDeleted={() => {
          if (projectToDelete) {
            const remaining = projects.filter(p => p.id !== projectToDelete.id);
            setProjects(remaining);
            if (workspaceId) {
              try {
                sessionStorage.setItem(`sc_review_projects_${workspaceId}`, JSON.stringify(remaining));
              } catch (_) {}
            }
            setProjectToDelete(null);
            loadData();
          }
        }}
      />
    </div>
  );
}

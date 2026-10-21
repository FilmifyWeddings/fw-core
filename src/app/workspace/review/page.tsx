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

  const [projects, setProjects] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_review' | 'changes_requested' | 'approved' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParam = workspaceId ? `workspace_id=${workspaceId}` : '';
      const statusParam = statusFilter ? `status=${statusFilter}` : '';
      const qs = [queryParam, statusParam].filter(Boolean).join('&');

      const [projRes, quotaRes] = await Promise.all([
        fetch(`/api/review/projects${qs ? `?${qs}` : ''}`),
        fetch(`/api/review/quotas${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),
      ]);

      const projData = await projRes.json();
      const quotaData = await quotaRes.json();

      if (projData.success) {
        setProjects(projData.projects || []);
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
    loadData();
  }, [workspaceId, statusFilter]);

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

      {/* 2. Storage Quota Banner (1 GB Free Trial Limit Enforced) */}
      {quota && (
        <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-800 flex items-center gap-2">
                <span>Storage Quota: {quota.tier_name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  quota.percentage_used > 85 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {quota.percentage_used}% used
                </span>
                {quota.is_trial && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                    1 GB Free Trial Limit
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400">
                {quota.formatted_used} used of {quota.formatted_total} on Backblaze B2 Storage
              </div>
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-1">
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div 
                style={{ width: `${quota.percentage_used}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  quota.percentage_used > 85 ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
            </div>
            <div className="text-[10px] text-right text-zinc-400">
              {quota.available_bytes > 0 ? `${(quota.available_bytes / (1024*1024)).toFixed(0)} MB free space` : 'Storage full'}
            </div>
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/workspace/video-review/${project.id}`)}
              className="group bg-white rounded-3xl border border-[#E7E2D8] overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all duration-300 cursor-pointer flex flex-col justify-between relative"
            >
              {/* Card Thumbnail / Header */}
              <div className="relative aspect-[16/10] bg-zinc-900 overflow-hidden">
                {project.cover_thumbnail_url ? (
                  <img
                    src={project.cover_thumbnail_url}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 text-center">
                    <Film className="w-10 h-10 mb-2 text-amber-500/70" />
                    <span className="text-xs font-bold text-zinc-300 truncate max-w-full">
                      {project.name}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(project.status)}
                </div>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/60 hover:bg-rose-600 text-white/80 hover:text-white transition backdrop-blur-sm opacity-0 group-hover:opacity-100 z-10"
                  title="Delete Project & Purge Storage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Bottom title */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-sm truncate">{project.name}</h3>
                  {project.client_name && (
                    <p className="text-[11px] text-zinc-300 truncate flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-amber-400" />
                      <span>{project.client_name}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-[#E7E2D8] bg-[#FAF9F5] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{project.event_date ? new Date(project.event_date).toLocaleDateString() : 'No date'}</span>
                </div>

                <div className="flex items-center gap-1 font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setProjectToDelete(null);
            loadData();
          }
        }}
      />
    </div>
  );
}

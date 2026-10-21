'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Film, Plus, Search, Filter, HardDrive, Share2, 
  CheckCircle2, Clock, FileEdit, AlertCircle, Sparkles, 
  ChevronRight, Calendar, User, LayoutGrid, List, Video,
  PlaySquare, ArrowUpRight, Copy, Check 
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import NewProjectModal from '@/components/review/NewProjectModal';

export default function ReviewProjectsPage() {
  const router = useRouter();
  const { activeWorkspace, isOwner, loading } = useWorkspace();
  const workspaceId = activeWorkspace?.workspaceId || 'default';

  const [projects, setProjects] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_review' | 'changes_requested' | 'approved' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [projRes, quotaRes] = await Promise.all([
        fetch(`/api/review/projects?workspace_id=${workspaceId}&status=${statusFilter}`),
        fetch(`/api/review/quotas?workspace_id=${workspaceId}`),
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
              Workflows · Review
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-xs text-zinc-400 font-medium">FreeFrame / Frame.io Architecture</span>
          </div>

          <h1 
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
            className="text-2xl sm:text-3xl font-medium text-zinc-900 tracking-tight"
          >
            StudioCore Review
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl">
            Frame-accurate video review, real-time client feedback, canvas drawings & version approval workflow.
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

      {/* 2. Storage Quota Banner */}
      {quota && (
        <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-800 flex items-center gap-2">
                <span>Review Storage: {quota.tier_name}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {quota.percentage_used}% used
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {quota.formatted_used} used of {quota.formatted_total} available
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
              {((quota.available_bytes) / (1024 * 1024 * 1024)).toFixed(1)} GB free
            </div>
          </div>
        </div>
      )}

      {/* 3. Search and Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'in_review', 'changes_requested', 'approved', 'draft'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition capitalize cursor-pointer shrink-0 ${
                statusFilter === tab 
                  ? 'bg-amber-500 text-white shadow-2xs' 
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-[#E7E2D8]'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or clients..."
              className="pl-8 pr-3 py-1.5 bg-white border border-[#E7E2D8] rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:border-amber-400 w-52 sm:w-64 shadow-2xs"
            />
          </div>

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
              onClick={() => router.push(`/workspace/review/${project.id}`)}
              className="group bg-white rounded-3xl border border-[#E7E2D8] overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all duration-300 cursor-pointer flex flex-col justify-between"
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

                {/* Category Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white border border-white/10">
                    {project.tags[0]}
                  </div>
                )}

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
                  <span>Open Studio</span>
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
              onClick={() => router.push(`/workspace/review/${project.id}`)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAF9F5] transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 truncate">{project.name}</h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    {project.client_name && <span>Client: {project.client_name}</span>}
                    {project.event_date && <span>Date: {new Date(project.event_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  Review Studio <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        workspaceId={workspaceId}
        onProjectCreated={(newProj) => {
          setProjects(prev => [newProj, ...prev]);
          router.push(`/workspace/review/${newProj.id}`);
        }}
      />
    </div>
  );
}

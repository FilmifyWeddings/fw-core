'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Film, Plus, Share2, CheckCircle2, Clock, 
  FileEdit, Sparkles, ChevronDown, PenTool, Users, 
  Calendar, GitCommit, Trash2, Check 
} from 'lucide-react';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import VideoPlayer, { formatTimecode } from '@/components/review/VideoPlayer';
import CommentsPanel from '@/components/review/CommentsPanel';
import AddVideoModal from '@/components/review/AddVideoModal';
import NewVersionModal from '@/components/review/NewVersionModal';
import ShareModal from '@/components/review/ShareModal';
import ApprovalModal from '@/components/review/ApprovalModal';
import DeleteProjectModal from '@/components/review/DeleteProjectModal';

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export default function ReviewStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();
  const { activeWorkspace, isOwner } = useWorkspace();
  const rawWsId = activeWorkspace?.workspaceId;
  const workspaceId = isValidUUID(rawWsId) ? rawWsId : null;

  const [project, setProject] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active selections
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Drawing state
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);

  // Modals
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load project details
  const loadProject = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/review/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        setVideos(data.videos || []);
        setVersions(data.versions || []);
        setShares(data.shares || []);

        if (data.videos && data.videos.length > 0) {
          // If no active video or current active video not in list, select first
          setActiveVideoId(prev => {
            const exists = data.videos.some((v: any) => v.id === prev);
            return exists ? prev : data.videos[0].id;
          });
          setActiveVersionId(prev => {
            const exists = data.versions.some((ver: any) => ver.id === prev);
            return exists ? prev : (data.videos[0].current_version_id || null);
          });
        }
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Reactive listener for background drawer upload completion
  useEffect(() => {
    const handleVideoUploaded = (e: any) => {
      const detail = e.detail;
      if (detail?.projectId === projectId) {
        loadProject();
      }
    };

    window.addEventListener('studiocore-review-video-ready', handleVideoUploaded);
    return () => window.removeEventListener('studiocore-review-video-ready', handleVideoUploaded);
  }, [projectId]);

  // Load comments for active version
  const loadComments = async (versionId: string) => {
    try {
      const res = await fetch(`/api/review/comments?version_id=${versionId}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (activeVersionId) {
      loadComments(activeVersionId);
    } else {
      setComments([]);
    }
  }, [activeVersionId]);

  const activeVideo = videos.find(v => v.id === activeVideoId);
  const activeVersion = versions.find(v => v.id === activeVersionId) || (
    versions.filter(v => v.video_id === activeVideoId).pop()
  );

  const currentVideoVersions = versions.filter(v => v.video_id === activeVideoId);

  // Handle adding new comment
  const handleAddComment = async ({
    content,
    timestamp_seconds,
    is_internal,
    parent_comment_id,
  }: {
    content: string;
    timestamp_seconds: number;
    is_internal: boolean;
    parent_comment_id?: string | null;
  }) => {
    if (!activeVersion) return;

    const res = await fetch('/api/review/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version_id: activeVersion.id,
        video_id: activeVideo?.id || null,
        project_id: projectId,
        parent_comment_id: parent_comment_id || null,
        timestamp_seconds,
        author_name: isOwner ? 'Studio Owner' : 'Reviewer',
        author_role: isOwner ? 'owner' : 'editor',
        content,
        is_internal,
        has_annotation: Boolean(currentAnnotation),
        annotation_data: currentAnnotation || {},
      }),
    });

    const data = await res.json();
    if (data.success) {
      setComments(prev => [...prev, data.comment]);
      setCurrentAnnotation(null);
      setIsDrawMode(false);
    }
  };

  // Toggle resolve status
  const handleToggleResolve = async (id: string, isResolved: boolean) => {
    const res = await fetch('/api/review/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_resolved: isResolved }),
    });
    const data = await res.json();
    if (data.success) {
      setComments(prev => prev.map(c => c.id === id ? { ...c, is_resolved: isResolved } : c));
    }
  };

  // Delete comment
  const handleDeleteComment = async (id: string) => {
    const res = await fetch(`/api/review/comments?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setComments(prev => prev.filter(c => c.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6">
        <StudioCoreLiquidLoader label="Opening Video Review Studio..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] p-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-zinc-800">Project Not Found</h2>
        <Link href="/workspace/video-review" className="inline-block text-amber-600 font-bold text-xs underline">
          ← Back to Video Review Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col select-none font-sans">
      
      {/* 1. Studio Top Command Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E2D8] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/workspace/video-review"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition cursor-pointer shrink-0"
            title="Back to Review Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-zinc-900 truncate">
                {project.name}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                project.status === 'approved' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : project.status === 'changes_requested'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {project.status === 'approved' ? '✓ Approved' : project.status === 'changes_requested' ? 'Changes Needed' : 'In Review'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
              {project.client_name && <span>Client: <strong className="text-zinc-600">{project.client_name}</strong></span>}
              {project.event_date && (
                <>
                  <span>·</span>
                  <span>{new Date(project.event_date).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions: Approval Status, Share, Add Video, Delete */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Approval Sign-off Trigger */}
          <button
            onClick={() => setIsApprovalModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              activeVersion?.status === 'approved' || project?.status === 'approved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : activeVersion?.status === 'changes_requested' || project?.status === 'changes_requested'
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-zinc-700 border-[#E7E2D8] hover:border-amber-400'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${
              (activeVersion?.status === 'approved' || project?.status === 'approved') 
                ? 'text-emerald-600' 
                : 'text-zinc-400'
            }`} />
            <span>
              {activeVersion?.status === 'approved' || project?.status === 'approved'
                ? 'Approved' 
                : activeVersion?.status === 'changes_requested' || project?.status === 'changes_requested'
                ? 'Changes Needed'
                : 'Sign-off / Status'}
            </span>
          </button>

          {/* Share Review Link */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share with Client</span>
          </button>

          {/* Add Video Button */}
          <button
            onClick={() => setIsAddVideoModalOpen(true)}
            className="p-2 sm:px-3.5 sm:py-1.5 rounded-full border border-[#E7E2D8] hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Video</span>
          </button>

          {/* Delete Project Button */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Delete Project & Purge Storage"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Video Switcher Tabs & Modern Version Bar */}
      <div className="bg-white border-b border-[#E7E2D8] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        
        {/* Video selector horizontal tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {videos.length === 0 ? (
            <span className="text-xs text-zinc-400">No videos in this project yet</span>
          ) : (
            videos.map(v => {
              const isSelected = v.id === activeVideoId;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setActiveVideoId(v.id);
                    setActiveVersionId(v.current_version_id || null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-[#FAF9F5] text-zinc-600 hover:bg-zinc-100 border border-[#E7E2D8]'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>{v.title}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Modern Version Switcher Pills for Active Video */}
        {activeVideo && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cuts / Revisions:</span>
            
            <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E7E2D8]">
              {currentVideoVersions.map(ver => {
                const isCurrent = ver.id === activeVersionId;
                const isApproved = ver.status === 'approved';
                const isChanges = ver.status === 'changes_requested';

                return (
                  <button
                    key={ver.id}
                    onClick={() => setActiveVersionId(ver.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isCurrent
                        ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>{ver.version_label || `V${ver.version_number}`}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isApproved ? 'bg-emerald-500' : isChanges ? 'bg-amber-500' : 'bg-blue-400'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* "+ New Version" button */}
            <button
              onClick={() => setIsNewVersionModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E7E2D8] hover:border-amber-400 text-zinc-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              <GitCommit className="w-3 h-3 text-amber-600" />
              <span>+ New Cut</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Split View (Player + Comments Panel) */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* Left Column (Player & Version Notes) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {activeVersion ? (
            <VideoPlayer
              sourceType={activeVersion.source_type}
              videoUrl={activeVersion.video_url}
              youtubeVideoId={activeVersion.youtube_video_id}
              comments={comments}
              activeCommentId={activeCommentId}
              currentTime={currentTime}
              onTimeUpdate={(t) => setCurrentTime(t)}
              isDrawMode={isDrawMode}
              setIsDrawMode={setIsDrawMode}
              currentAnnotation={currentAnnotation}
              setCurrentAnnotation={setCurrentAnnotation}
            />
          ) : (
            <div className="aspect-video bg-zinc-900 rounded-3xl flex flex-col items-center justify-center text-center p-8 text-zinc-400 space-y-3">
              <Film className="w-12 h-12 text-zinc-600" />
              <div>
                <h3 className="font-bold text-white text-base">No Video Selected</h3>
                <p className="text-xs text-zinc-400 mt-1">Upload a video or add an unlisted YouTube video link to start reviewing.</p>
              </div>
              <button
                onClick={() => setIsAddVideoModalOpen(true)}
                className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Video to Project
              </button>
            </div>
          )}

          {/* Revision Changelog Notes Banner */}
          {activeVersion && (
            <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {activeVersion.version_label || `Version ${activeVersion.version_number}`} Changelog / Cut Notes
                </span>
                <span className="text-[10px] text-zinc-400">
                  {new Date(activeVersion.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-mono">
                {activeVersion.changelog_notes || 'Initial cut uploaded.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Timecoded Feedback & Client Notes Panel */}
        <div className="lg:col-span-4 h-[calc(100vh-160px)] min-h-[500px]">
          <CommentsPanel
            comments={comments}
            currentTime={currentTime}
            activeCommentId={activeCommentId}
            onSelectComment={(comment) => {
              setActiveCommentId(comment.id);
              setCurrentTime(comment.timestamp_seconds);
            }}
            onAddComment={handleAddComment}
            onToggleResolve={handleToggleResolve}
            onDeleteComment={handleDeleteComment}
            isDrawMode={isDrawMode}
            setIsDrawMode={setIsDrawMode}
            hasCurrentAnnotation={Boolean(currentAnnotation)}
            currentUserRole={isOwner ? 'owner' : 'editor'}
          />
        </div>
      </main>

      {/* Modals */}
      <AddVideoModal
        isOpen={isAddVideoModalOpen}
        onClose={() => setIsAddVideoModalOpen(false)}
        projectId={projectId}
        workspaceId={workspaceId || ''}
        projectTitle={project.name}
        onVideoAdded={(newVid, newVer) => {
          setVideos(prev => [...prev, newVid]);
          setVersions(prev => [...prev, newVer]);
          setActiveVideoId(newVid.id);
          setActiveVersionId(newVer.id);
        }}
      />

      <NewVersionModal
        isOpen={isNewVersionModalOpen}
        onClose={() => setIsNewVersionModalOpen(false)}
        video={activeVideo}
        projectId={projectId}
        workspaceId={workspaceId || ''}
        onVersionAdded={(newVer) => {
          setVersions(prev => [...prev, newVer]);
          setActiveVersionId(newVer.id);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        project={project}
        shares={shares}
        workspaceId={workspaceId || ''}
        onShareCreated={(newShare) => setShares(prev => [newShare, ...prev])}
      />

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        project={project}
        video={activeVideo}
        version={activeVersion}
        workspaceId={workspaceId || ''}
        currentStatus={activeVersion?.status || project?.status || 'in_review'}
        onStatusUpdated={(status) => {
          setVersions(prev => prev.map(v => v.id === activeVersion?.id ? { ...v, status } : v));
          setProject((prev: any) => ({ ...prev, status }));
        }}
      />

      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        project={project}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={() => {
          router.push('/workspace/video-review');
        }}
      />
    </div>
  );
}

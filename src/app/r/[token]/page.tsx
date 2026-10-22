'use client';

import React, { useState, useEffect, use } from 'react';
import { 
  Film, CheckCircle2, FileEdit, Lock, Key, 
  MessageSquare, ExternalLink, AlertCircle, Sparkles, 
  Clock, Check, Play, User, X 
} from 'lucide-react';
import VideoPlayer, { formatTimecode } from '@/components/review/VideoPlayer';
import CommentsPanel from '@/components/review/CommentsPanel';
import ApprovalModal from '@/components/review/ApprovalModal';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function ClientReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [shareData, setShareData] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passcode state
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingCommentData, setPendingCommentData] = useState<any>(null);

  // Active selections
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Drawing state
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);

  // Client info modal / state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'changes_requested'>('approved');

  // Load saved client info from localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('studiocore_review_client_name') || '';
      const savedEmail = localStorage.getItem('studiocore_review_client_email') || '';
      if (savedName) setClientName(savedName);
      if (savedEmail) setClientEmail(savedEmail);
    } catch (_) {}
  }, []);

  const loadReviewData = async (codeToTry?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setPasscodeError('');

      const url = codeToTry 
        ? `/api/review/shares?token=${token}&passcode=${encodeURIComponent(codeToTry)}`
        : `/api/review/shares?token=${token}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.status === 401 && data.requires_passcode) {
        setRequiresPasscode(true);
        setIsLoading(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to load review project');
      }

      setRequiresPasscode(false);
      setShareData(data.share);
      setProject(data.project);
      setVideos(data.videos || []);
      setVersions(data.versions || []);

      if (data.project?.client_name && !clientName) {
        setClientName(data.project.client_name);
      }

      // Version targeting: check if link specifies ?v=version_id
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const targetVersionId = urlParams ? urlParams.get('v') : null;

      if (targetVersionId && data.versions && data.versions.length > 0) {
        const matchedVer = data.versions.find((ver: any) => ver.id === targetVersionId);
        if (matchedVer) {
          setActiveVideoId(matchedVer.video_id);
          setActiveVersionId(matchedVer.id);
        } else if (data.videos && data.videos.length > 0) {
          const firstVid = data.videos[0];
          setActiveVideoId(firstVid.id);
          setActiveVersionId(firstVid.current_version_id || null);
        }
      } else if (data.videos && data.videos.length > 0) {
        const firstVid = data.videos[0];
        setActiveVideoId(firstVid.id);
        setActiveVersionId(firstVid.current_version_id || null);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading project');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviewData();
  }, [token]);

  // Load comments when active version changes
  useEffect(() => {
    if (!activeVersionId) return;
    fetch(`/api/review/comments?version_id=${activeVersionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setComments(data.comments || []);
      })
      .catch(() => {});
  }, [activeVersionId]);

  const activeVideo = videos.find(v => v.id === activeVideoId);
  const activeVersion = versions.find(v => v.id === activeVersionId) || (
    versions.filter(v => v.video_id === activeVideoId).pop()
  );

  const currentVideoVersions = versions.filter(v => v.video_id === activeVideoId);

  // Execute comment post with verified author name
  const postCommentWithAuthor = async (
    payload: { content: string; timestamp_seconds: number; parent_comment_id?: string | null },
    author: string
  ) => {
    if (!activeVersion) return;
    try {
      const res = await fetch('/api/review/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: activeVersion.id,
          video_id: activeVideo?.id || null,
          project_id: project?.id,
          parent_comment_id: payload.parent_comment_id || null,
          timestamp_seconds: payload.timestamp_seconds,
          author_name: author,
          author_email: clientEmail.trim() || null,
          author_role: 'client',
          content: payload.content,
          is_internal: false,
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
    } catch (_) {}
  };

  // Client add comment - triggers luxury modal if name not provided
  const handleClientAddComment = async (payload: {
    content: string;
    timestamp_seconds: number;
    parent_comment_id?: string | null;
  }) => {
    if (!activeVersion) return;

    const author = clientName.trim();
    if (!author) {
      setPendingCommentData(payload);
      setNameInput('');
      setIsNameModalOpen(true);
      return;
    }

    await postCommentWithAuthor(payload, author);
  };

  const handleSaveClientName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const finalName = nameInput.trim();
    setClientName(finalName);
    try {
      localStorage.setItem('studiocore_review_client_name', finalName);
    } catch (_) {}
    setIsNameModalOpen(false);

    if (pendingCommentData) {
      const data = pendingCommentData;
      setPendingCommentData(null);
      postCommentWithAuthor(data, finalName);
    }
  };

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

  // Passcode Gate Screen
  if (requiresPasscode) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E7E2D8] p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="font-bold text-lg text-zinc-900">Protected Video Review</h2>
            <p className="text-xs text-zinc-500 mt-1">This proofing link is protected by a studio passcode.</p>
          </div>

          {passcodeError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {passcodeError}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            loadReviewData(passcode);
          }} className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full text-center px-4 py-2.5 rounded-xl border border-[#E7E2D8] text-sm text-zinc-800 tracking-widest focus:outline-hidden focus:border-amber-500"
              autoFocus
              required
            />

            <button
              type="submit"
              disabled={isLoading || !passcode}
              className="w-full py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition shadow-2xs"
            >
              Unlock Review Studio
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 max-w-md shadow-2xs space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="font-bold text-base text-zinc-800">Review Link Unavailable</h2>
          <p className="text-xs text-zinc-500">{error || 'This project review link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col font-sans select-none">
      
      {/* 1. Luxury Client Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E2D8] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-amber-600 tracking-wider uppercase">
              STUDIOCORE REVIEW
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-xs text-zinc-400 font-medium">Client Proofing Portal</span>
          </div>

          <h1 
            style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" }}
            className="text-xl sm:text-2xl font-medium text-zinc-900 tracking-tight"
          >
            {project.name}
          </h1>
        </div>

        {/* Client Actions: Approve & Revisions */}
        {shareData?.allow_approvals && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setApprovalDecision('changes_requested');
                setIsApprovalModalOpen(true);
              }}
              className="px-4 py-2 rounded-full border border-[#E7E2D8] hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <FileEdit className="w-3.5 h-3.5 text-amber-600" />
              <span>Request Changes</span>
            </button>

            <button
              onClick={() => {
                setApprovalDecision('approved');
                setIsApprovalModalOpen(true);
              }}
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Video</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Video Selector Bar */}
      <div className="bg-white border-b border-[#E7E2D8] px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        
        {/* Videos list pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {videos.map(v => (
            <button
              key={v.id}
              onClick={() => {
                setActiveVideoId(v.id);
                setActiveVersionId(v.current_version_id || null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                v.id === activeVideoId
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-[#FAF9F5] text-zinc-600 hover:bg-zinc-100 border border-[#E7E2D8]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{v.title}</span>
            </button>
          ))}
        </div>

        {/* Active Version Pills */}
        <div className="flex items-center gap-2">
          {activeVersion && (
            <div className="flex items-center gap-2">
              {activeVersion.file_size_bytes > 0 && activeVersion.source_type === 'upload' && (
                <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-xl border border-zinc-200">
                  Master: {(activeVersion.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
              <span className="text-xs font-bold text-zinc-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                Revision {activeVersion.version_label || `V${activeVersion.version_number}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Content: Video Player + Comments */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* Left Column: Player */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {activeVersion ? (
            <VideoPlayer
              sourceType={activeVersion.source_type}
              videoUrl={activeVersion.video_url}
              storageKey={activeVersion.storage_key}
              youtubeVideoId={activeVersion.youtube_video_id}
              comments={comments}
              activeCommentId={activeCommentId}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isDrawMode={isDrawMode}
              setIsDrawMode={setIsDrawMode}
              currentAnnotation={currentAnnotation}
              setCurrentAnnotation={setCurrentAnnotation}
            />
          ) : (
            <div className="w-full aspect-video bg-white rounded-3xl border border-[#E7E2D8] p-8 flex items-center justify-center text-zinc-400">
              No video available for review
            </div>
          )}

          {/* Revision Changelog Banner */}
          {activeVersion?.changelog_notes && (
            <div className="bg-white rounded-2xl border border-[#E7E2D8] p-4 shadow-2xs text-xs space-y-1">
              <span className="font-bold text-zinc-800">Editor Notes for this Revision:</span>
              <p className="text-zinc-600">{activeVersion.changelog_notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Comments & Feedback */}
        <div className="lg:col-span-4 h-[650px] lg:h-auto flex flex-col">
          <CommentsPanel
            comments={comments}
            currentTime={currentTime}
            activeCommentId={activeCommentId}
            onSelectComment={(comm) => {
              setActiveCommentId(comm.id);
              setCurrentTime(comm.timestamp_seconds);
            }}
            onAddComment={handleClientAddComment}
            onToggleResolve={handleToggleResolve}
            isDrawMode={isDrawMode}
            setIsDrawMode={setIsDrawMode}
            hasCurrentAnnotation={Boolean(currentAnnotation)}
            currentUserRole="client"
            currentUserName={clientName}
          />
        </div>
      </main>

      {/* Luxury Client Name Collection Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-[#E7E2D8] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 font-sans select-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Your Reviewer Name</h3>
                  <p className="text-[11px] text-zinc-400">Identify yourself for video feedback</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNameModalOpen(false);
                  setPendingCommentData(null);
                }}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Please enter your name so the video editor knows who left this revision note.
            </p>

            <form onSubmit={handleSaveClientName} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E7E2D8] text-xs font-bold text-zinc-800 placeholder:font-normal focus:outline-hidden focus:border-amber-500 shadow-2xs"
              />

              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition shadow-2xs"
              >
                Continue & Post Feedback
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        project={project}
        video={activeVideo}
        version={activeVersion}
        initialDecision={approvalDecision}
        onApprovalSubmitted={(approval) => {
          alert(
            approval.decision === 'approved' 
              ? 'Thank you! Your video approval has been recorded and the studio has been notified.' 
              : 'Your change request has been sent to the editor with all timestamped notes.'
          );
          if (activeVersion) {
            setVersions(prev => prev.map(v => v.id === activeVersion.id ? { ...v, status: approval.decision } : v));
          }
        }}
      />
    </div>
  );
}

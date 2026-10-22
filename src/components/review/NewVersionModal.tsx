'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, GitCommit, FileVideo } from 'lucide-react';
import { useReviewUpload } from '@/context/ReviewUploadContext';

const YouTubeIcon = ({ className = "w-3.5 h-3.5 text-red-600" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface NewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  projectId: string;
  workspaceId: string;
  onVersionAdded: (version: any) => void;
}

export default function NewVersionModal({
  isOpen,
  onClose,
  video,
  projectId,
  workspaceId,
  onVersionAdded,
}: NewVersionModalProps) {
  const { enqueueVersionUpload } = useReviewUpload();

  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>(video?.source_type || 'upload');
  const [versionLabel, setVersionLabel] = useState('');
  const [changelogNotes, setChangelogNotes] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !video) return null;

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      if (sourceType === 'youtube') {
        const ytId = extractYouTubeId(youtubeUrl);
        if (!ytId) {
          setErrorMessage('Please enter a valid YouTube video URL');
          return;
        }

        setIsSubmitting(true);
        const res = await fetch('/api/review/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: video.id,
            project_id: projectId,
            workspace_id: workspaceId,
            source_type: 'youtube',
            youtube_url: youtubeUrl,
            version_label: versionLabel,
            changelog_notes: changelogNotes,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to add version');
        onVersionAdded(data.version);
        onClose();
      } else {
        if (!file) {
          setErrorMessage('Please choose a video file');
          return;
        }

        // Enqueue version upload in the floating drawer
        enqueueVersionUpload({
          projectId,
          workspaceId,
          videoId: video.id,
          videoTitle: video.title,
          versionLabel: versionLabel.trim() || undefined,
          file,
          changelogNotes,
          onCompleted: (newVer) => {
            onVersionAdded(newVer);
          },
        });

        // Close modal immediately so the user can work in background!
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process new version');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">Upload New Revision Cut</h2>
              <p className="text-xs text-zinc-400">Target Video: {video?.title || 'Video'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Mode Tabs */}
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF9F5] rounded-2xl border border-[#E7E2D8]">
            <button
              type="button"
              onClick={() => setSourceType('upload')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                sourceType === 'upload' 
                  ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Video File Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('youtube')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                sourceType === 'youtube' 
                  ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <YouTubeIcon />
              <span>YouTube Link</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Upload */}
          {sourceType === 'upload' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-[#E7E2D8] hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition bg-[#FAF9F5] relative group">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setErrorMessage('');
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileVideo className="w-8 h-8 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-zinc-800">
                  {file ? file.name : 'Choose or Drag & Drop Revision Cut Video'}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'MP4, MOV, WebM (Runs in background upload drawer)'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: YouTube */}
          {sourceType === 'youtube' && (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">New YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          )}

          {/* Version Label */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Version Label (Optional)</label>
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g. V2 - Color Graded or Cut 2"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Changelog Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Changelog Notes (What changed?)</label>
            <textarea
              rows={2}
              value={changelogNotes}
              onChange={(e) => setChangelogNotes(e.target.value)}
              placeholder="e.g. Swapped bride entrance music and corrected color grade at 01:23"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E2D8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-[#E7E2D8] text-zinc-600 hover:bg-zinc-50 font-bold text-xs cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-2xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Adding...' : sourceType === 'upload' ? 'Upload in Background' : 'Add New Cut'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

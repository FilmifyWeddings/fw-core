'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, GitCommit } from 'lucide-react';

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
  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>(video?.source_type || 'upload');
  const [versionLabel, setVersionLabel] = useState('');
  const [changelogNotes, setChangelogNotes] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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
      setIsUploading(true);

      if (sourceType === 'youtube') {
        const ytId = extractYouTubeId(youtubeUrl);
        if (!ytId) {
          setErrorMessage('Please enter a valid YouTube video URL');
          setIsUploading(false);
          return;
        }

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
          setIsUploading(false);
          return;
        }

        setUploadProgress(15);
        const presignRes = await fetch('/api/review/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || 'video/mp4',
            file_size_bytes: file.size,
            workspace_id: workspaceId,
            project_id: projectId,
          }),
        });

        const presignData = await presignRes.json();
        if (!presignData.success) throw new Error(presignData.error || 'Upload initialization failed');

        setUploadProgress(40);

        // Direct upload to storage bucket via PUT with auto-retry
        const doPutUpload = (targetUrl: string) => new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', targetUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = Math.round(40 + (evt.loaded / evt.total) * 50);
              setUploadProgress(percent);
            }
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)));
          xhr.onerror = () => reject(new Error('Network error during version upload'));
          xhr.send(file);
        });

        if (presignData.upload_url.startsWith('http')) {
          try {
            await doPutUpload(presignData.upload_url);
          } catch (firstErr) {
            console.warn('[Version Upload] First upload attempt failed, retrying once...', firstErr);
            await new Promise(r => setTimeout(r, 800));
            await doPutUpload(presignData.upload_url);
          }
        }

        setUploadProgress(95);

        const versionRes = await fetch('/api/review/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: video.id,
            project_id: projectId,
            workspace_id: workspaceId,
            source_type: 'upload',
            video_url: presignData.public_url || URL.createObjectURL(file),
            original_file_url: presignData.public_url || null,
            storage_key: presignData.key || null,
            file_size_bytes: file.size,
            version_label: versionLabel,
            changelog_notes: changelogNotes,
          }),
        });

        const verData = await versionRes.json();
        if (!verData.success) throw new Error(verData.error || 'Failed to register version');

        setUploadProgress(100);
        onVersionAdded(verData.version);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add revision');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">Upload New Revision</h2>
              <p className="text-xs text-zinc-400">For {video.title}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Source Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9F5] rounded-xl border border-[#E7E2D8]">
            <button
              type="button"
              onClick={() => setSourceType('upload')}
              className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sourceType === 'upload' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>Upload Video</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceType('youtube')}
              className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                sourceType === 'youtube' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
              }`}
            >
              <YouTubeIcon />
              <span>YouTube URL</span>
            </button>
          </div>

          {sourceType === 'upload' ? (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">New Video File</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
              />
              {isUploading && (
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden mt-2">
                  <div style={{ width: `${uploadProgress}%` }} className="h-full bg-amber-500 transition-all duration-200" />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Version Label (Optional)</label>
            <input
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g. V2 (Audio Fixed), V3 Final Grade"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">What changed in this revision?</label>
            <textarea
              rows={2}
              value={changelogNotes}
              onChange={(e) => setChangelogNotes(e.target.value)}
              placeholder="e.g. Trimmed scene at 02:15, adjusted color contrast on bride close-up"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E2D8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-full border border-[#E7E2D8] text-zinc-600 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isUploading ? 'Uploading...' : 'Save Revision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

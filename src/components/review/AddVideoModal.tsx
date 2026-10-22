'use client';

import React, { useState } from 'react';
import { 
  X, Upload, Film, FileVideo, CheckCircle2, 
  AlertCircle, Sparkles, Loader2 
} from 'lucide-react';

const YouTubeIcon = ({ className = "w-4 h-4 text-red-600" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  workspaceId: string;
  onVideoAdded: (video: any, version: any) => void;
}

const CATEGORIES = [
  'Highlight Film',
  'Wedding Teaser',
  'Full Wedding Film',
  'Pre-Wedding Shoot',
  'Ceremony Film',
  'Reception & Sangeet',
  'Raw Footage',
  'Final Delivery',
];

export default function AddVideoModal({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  onVideoAdded,
}: AddVideoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Highlight Film');
  const [changelogNotes, setChangelogNotes] = useState('Initial cut uploaded for review');
  
  // YouTube State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const id = extractYouTubeId(url);
    setYoutubeId(id);
    setErrorMessage('');
    if (id && !title) {
      setTitle(`YouTube Video (${id})`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please enter a video title');
      return;
    }

    if (activeTab === 'youtube') {
      if (!youtubeId) {
        setErrorMessage('Please enter a valid YouTube video URL');
        return;
      }

      try {
        setIsUploading(true);
        const res = await fetch('/api/review/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            workspace_id: workspaceId,
            title: title.trim(),
            category,
            source_type: 'youtube',
            youtube_url: youtubeUrl,
            changelog_notes: changelogNotes,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to add video');

        onVideoAdded(data.video, data.version);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Something went wrong');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Upload Tab
      if (!file) {
        setErrorMessage('Please choose a video file to upload');
        return;
      }

      try {
        setIsUploading(true);
        setUploadProgress(10);

        // 1. Request presigned upload URL
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
        if (!presignData.success) throw new Error(presignData.error || 'Upload request failed');

        setUploadProgress(30);

        // 2. Direct upload to storage bucket via PUT with auto-retry
        const doPutUpload = (targetUrl: string) => new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', targetUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = Math.round(30 + (evt.loaded / evt.total) * 60);
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload rejected with status ${xhr.status}: ${xhr.statusText}`));
          };
          xhr.onerror = () => reject(new Error('Network error during video upload. Please check your internet connection or Backblaze bucket configuration.'));
          xhr.send(file);
        });

        if (presignData.upload_url.startsWith('http')) {
          try {
            await doPutUpload(presignData.upload_url);
          } catch (firstErr) {
            console.warn('[Video Upload] First upload attempt failed, retrying once...', firstErr);
            await new Promise(r => setTimeout(r, 800));
            await doPutUpload(presignData.upload_url);
          }
        }

        setUploadProgress(95);

        // 3. Register video record in StudioCore Review
        const registerRes = await fetch('/api/review/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            workspace_id: workspaceId,
            title: title.trim(),
            category,
            source_type: 'upload',
            video_url: presignData.public_url || URL.createObjectURL(file),
            original_file_url: presignData.public_url || null,
            storage_key: presignData.key || null,
            file_size_bytes: file.size,
            changelog_notes: changelogNotes,
          }),
        });

        const regData = await registerRes.json();
        if (!regData.success) throw new Error(regData.error || 'Failed to register video');

        setUploadProgress(100);
        onVideoAdded(regData.video, regData.version);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to upload video');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">Add Video for Review</h2>
              <p className="text-xs text-zinc-400">Upload high-res footage or embed a YouTube link</p>
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
              onClick={() => setActiveTab('upload')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'upload' 
                  ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Upload Video</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'youtube' 
                  ? 'bg-white text-zinc-900 shadow-2xs border border-[#E7E2D8]' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <YouTubeIcon />
              <span>YouTube URL</span>
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

          {/* TAB 1: Upload Video */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-[#E7E2D8] hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition bg-[#FAF9F5] relative group">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileVideo className="w-8 h-8 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-zinc-800">
                  {file ? file.name : 'Choose or Drag & Drop Video File'}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'MP4, MOV, WebM (Original quality preserved)'}
                </p>
              </div>

              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-zinc-600 font-bold">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${uploadProgress}%` }}
                      className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YouTube URL */}
          {activeTab === 'youtube' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">YouTube Video Link</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* YouTube Thumbnail Preview */}
              {youtubeId && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E7E2D8] bg-black">
                  <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt="YouTube Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Valid YouTube ID</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Common Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Wedding Teaser (Director's Cut)"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500 bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Initial Version Notes</label>
            <textarea
              rows={2}
              value={changelogNotes}
              onChange={(e) => setChangelogNotes(e.target.value)}
              placeholder="e.g. Initial draft edit with licensed soundtrack"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E2D8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-full border border-[#E7E2D8] text-zinc-600 hover:bg-zinc-50 font-bold text-xs cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-2xs"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isUploading ? 'Processing...' : 'Add Video to Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

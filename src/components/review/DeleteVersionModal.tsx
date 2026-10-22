'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2, HardDrive, GitCommit } from 'lucide-react';
import { formatFileSize } from '@/context/ReviewUploadContext';

interface DeleteVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: {
    id: string;
    version_label?: string;
    version_number?: number;
    file_size_bytes?: number;
    video_url?: string;
    source_type?: string;
  } | null;
  videoTitle?: string;
  onDeleted: (deletedVersionId: string, nextActiveVersionId: string | null) => void;
}

export default function DeleteVersionModal({
  isOpen,
  onClose,
  version,
  videoTitle,
  onDeleted,
}: DeleteVersionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !version) return null;

  const versionTag = version.version_label || `V${version.version_number || 1}`;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const res = await fetch(`/api/review/versions?id=${encodeURIComponent(version.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete version cut');
      }

      onDeleted(version.id, data.next_active_version_id || null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while deleting version cut');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-950/60 space-y-5 animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Delete Version Cut ({versionTag})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                This revision and its media will be permanently purged
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version info card */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Target Revision</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <GitCommit className="w-3.5 h-3.5" />
              {versionTag}
            </span>
          </div>
          <div className="text-sm font-bold truncate">
            {videoTitle || 'Active Video'}
          </div>
          {version.file_size_bytes && Number(version.file_size_bytes) > 0 ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 pt-1">
              <span>Recoverable Storage:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatFileSize(Number(version.file_size_bytes))}
              </span>
            </div>
          ) : null}
        </div>

        {/* Storage purge notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-medium">
            <span className="font-bold">Permanent Cloud Purge:</span> The video file and its storyboard frames will be completely deleted from your Backblaze B2 storage bucket, and all timestamps and annotations on this cut will be removed.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Version...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete & Purge Storage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

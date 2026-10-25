'use client';

import React from 'react';
import { Download, X, CheckCircle2, AlertCircle, RefreshCw, FileArchive } from 'lucide-react';
import { ZipDownloadProgress } from '@/lib/gallery/clientZipDownloader';

interface ZipDownloadModalProps {
  isOpen: boolean;
  albumTitle: string;
  progress: ZipDownloadProgress | null;
  onCancel: () => void;
  accentColor?: string;
}

export function ZipDownloadModal({
  isOpen,
  albumTitle,
  progress,
  onCancel,
  accentColor = '#D97706',
}: ZipDownloadModalProps) {
  if (!isOpen || !progress) return null;

  const isDone = progress.status === 'done';
  const isCompressing = progress.status === 'compressing';
  const isSaving = progress.status === 'saving';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl space-y-6 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <FileArchive className="w-5 h-5 text-white animate-bounce" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">
                {isDone ? 'Download Ready!' : 'Downloading Original Photos'}
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-[220px] sm:max-w-[260px]">
                {albumTitle}
              </p>
            </div>
          </div>

          {!isDone && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
              title="Cancel Download"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-600">
              {isDone
                ? 'All photos archived and saved!'
                : isSaving
                ? 'Saving ZIP to device...'
                : isCompressing
                ? 'Packaging high-res archive...'
                : `Fetching photo ${progress.current} of ${progress.total}`}
            </span>
            <span className="font-mono text-zinc-900">{progress.percent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200/80">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress.percent}%`,
                backgroundColor: isDone ? '#10B981' : accentColor,
              }}
            />
          </div>

          {/* Current File / Status Subtitle */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="truncate max-w-[260px] font-mono">
              {progress.currentFile || 'Processing high-res photos...'}
            </span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
        </div>

        {/* Info Note & Close Button */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-[11px] text-zinc-400 leading-tight">
            Original full quality • Zero cloud wait
          </p>

          {isDone ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition cursor-pointer hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

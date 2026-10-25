'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle2, FileArchive } from 'lucide-react';
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
  const isDone = progress?.status === 'done';

  // Automatically dismiss floating widget 4 seconds after download completes
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        onCancel();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isDone, onCancel]);

  if (!isOpen || !progress) return null;

  const isCompressing = progress.status === 'compressing';
  const isSaving = progress.status === 'saving';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.18)] space-y-3 animate-in slide-in-from-bottom-5 duration-300"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ backgroundColor: isDone ? '#10B981' : accentColor }}
          >
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <FileArchive className="w-4 h-4 text-white animate-bounce" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 leading-tight truncate">
              {isDone ? 'Download Complete!' : 'Downloading Photos'}
            </h3>
            <p className="text-[11px] text-zinc-500 truncate max-w-[200px] sm:max-w-[220px]">
              {albumTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
          title={isDone ? 'Close' : 'Cancel Download'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-zinc-600 truncate max-w-[240px]">
            {isDone
              ? 'ZIP archive saved to your device!'
              : isSaving
              ? 'Saving to your device...'
              : isCompressing
              ? 'Packaging ZIP file...'
              : `Downloading photo ${progress.current} of ${progress.total}`}
          </span>
          <span className="font-mono text-zinc-900 shrink-0 ml-2">{progress.percent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200/80">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress.percent}%`,
              backgroundColor: isDone ? '#10B981' : accentColor,
            }}
          />
        </div>

        {/* Current File */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="truncate max-w-[240px] font-mono">
            {progress.currentFile || 'Downloading photos...'}
          </span>
          <span className="shrink-0 font-mono">
            {progress.current} / {progress.total}
          </span>
        </div>
      </div>
    </div>
  );
}

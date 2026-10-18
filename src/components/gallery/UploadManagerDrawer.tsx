'use client';

import React from 'react';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useUploadQueue, UploadJob } from '@/context/UploadQueueContext';

interface UploadManagerDrawerProps {
  onResumeInterrupted?: (galleryId: string, collectionId?: string) => void;
}

export function UploadManagerDrawer({ onResumeInterrupted }: UploadManagerDrawerProps) {
  const {
    jobs,
    activeJobCount,
    isDrawerOpen,
    setIsDrawerOpen,
    isMinimized,
    setIsMinimized,
    interruptedJob,
    dismissInterrupted,
    cancelJob,
    clearCompleted,
  } = useUploadQueue();

  if (!isDrawerOpen && jobs.length === 0 && !interruptedJob) {
    return null;
  }

  // Calculate overall progress across all jobs
  const totalPhotos = jobs.reduce((acc, j) => acc + j.totalCount, 0);
  const completedPhotos = jobs.reduce((acc, j) => acc + j.completedCount, 0);
  const overallPercentage = totalPhotos > 0 ? Math.round((completedPhotos / totalPhotos) * 100) : 0;
  const isAnyUploading = jobs.some((j) => j.status === 'uploading');

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-zinc-950/95 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/80 rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 text-white transition-all duration-200 cursor-pointer backdrop-blur-xl group"
        >
          <div className="relative flex items-center justify-center">
            {isAnyUploading ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : activeJobCount > 0 ? (
              <Clock className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            {isAnyUploading ? (
              <span>
                Uploading {completedPhotos}/{totalPhotos} ({overallPercentage}%)
              </span>
            ) : activeJobCount > 0 ? (
              <span>{activeJobCount} queued upload{activeJobCount > 1 ? 's' : ''}</span>
            ) : (
              <span>Uploads complete ({completedPhotos} photos)</span>
            )}
          </div>

          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition">
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded Floating Drawer Mode
  return (
    <div className="fixed bottom-5 right-5 z-50 w-88 sm:w-96 max-h-[520px] bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-4 px-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide text-zinc-100">Upload Manager</h4>
            <p className="text-[10px] text-zinc-400">
              {activeJobCount > 0
                ? `${activeJobCount} active folder${activeJobCount > 1 ? 's' : ''}`
                : 'All uploads finished'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {jobs.some((j) => j.status === 'completed') && (
            <button
              onClick={clearCompleted}
              title="Clear completed"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {activeJobCount === 0 && (
            <button
              onClick={() => setIsDrawerOpen(false)}
              title="Close"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interrupted Session Recovery Banner */}
      {interruptedJob && (
        <div className="p-3.5 m-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Interrupted Upload Detected</span>
            </div>
            <button
              onClick={dismissInterrupted}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-300">
            {interruptedJob.completedCount} of {interruptedJob.totalCount} photos were uploaded for &ldquo;{interruptedJob.collectionName}&rdquo;.
          </p>
          {onResumeInterrupted && (
            <button
              onClick={() => onResumeInterrupted(interruptedJob.galleryId, interruptedJob.collectionId)}
              className="self-start px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Select Folder &amp; Resume Upload</span>
            </button>
          )}
        </div>
      )}

      {/* Jobs Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[320px] scrollbar-thin scrollbar-thumb-zinc-800">
        {jobs.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">No uploads running right now</p>
          </div>
        ) : (
          jobs.map((job) => <JobItem key={job.id} job={job} onCancel={() => cancelJob(job.id)} />)
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 px-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>StudioCore Cloud • Auto Face AI</span>
        </span>
        <span>{totalPhotos > 0 ? `${completedPhotos}/${totalPhotos} photos` : ''}</span>
      </div>
    </div>
  );
}

function JobItem({ job, onCancel }: { job: UploadJob; onCancel: () => void }) {
  const isUploading = job.status === 'uploading';
  const isCompleted = job.status === 'completed';
  const isQueued = job.status === 'queued';
  const isPaused = job.status === 'paused';
  const isFailed = job.status === 'failed';

  return (
    <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] font-black text-zinc-200 truncate max-w-[170px]">
            📁 {job.collectionName}
          </span>
          <span
            className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isUploading
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : isQueued
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {isUploading ? `${job.percentage}%` : job.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(isUploading || isQueued) && (
            <button
              onClick={onCancel}
              title="Cancel Upload"
              className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{ width: `${job.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span>
            {job.completedCount} of {job.totalCount} uploaded
          </span>
          <span className="truncate max-w-[140px] text-[9.5px] text-zinc-500">
            {job.currentFileName || ''}
          </span>
        </div>
      </div>
    </div>
  );
}

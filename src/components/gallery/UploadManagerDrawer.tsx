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

  // Minimized Floating Pill Mode - Luxury Creamy Theme
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-[#FAF9F5]/95 hover:bg-white border border-[#E7E2D8] hover:border-amber-400/80 rounded-full px-4 py-2.5 shadow-xl flex items-center gap-3 text-zinc-900 transition-all duration-200 cursor-pointer backdrop-blur-xl group"
        >
          <div className="relative flex items-center justify-center">
            {isAnyUploading ? (
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            ) : activeJobCount > 0 ? (
              <Clock className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
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

          <div className="w-6 h-6 rounded-full bg-[#EAE5D9] flex items-center justify-center text-zinc-600 group-hover:text-zinc-900 group-hover:bg-[#DFD9CB] transition">
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded Floating Drawer Mode - Luxury Creamy Theme
  return (
    <div className="fixed bottom-5 right-5 z-50 w-88 sm:w-96 max-h-[520px] bg-[#FAF9F5]/98 border border-[#E7E2D8] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-800 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-4 px-5 border-b border-[#E7E2D8] flex items-center justify-between bg-white/90">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shadow-2xs">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide text-zinc-900">Upload Manager</h4>
            <p className="text-[10px] text-zinc-500 font-medium">
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
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-[#F2EFE9] transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-[#F2EFE9] transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {activeJobCount === 0 && (
            <button
              onClick={() => setIsDrawerOpen(false)}
              title="Close"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-[#F2EFE9] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interrupted Session Recovery Banner */}
      {interruptedJob && (
        <div className="p-3.5 m-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Interrupted Upload Detected</span>
            </div>
            <button
              onClick={dismissInterrupted}
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
            {interruptedJob.completedCount} of {interruptedJob.totalCount} photos were uploaded for &ldquo;{interruptedJob.collectionName}&rdquo;.
          </p>
          {onResumeInterrupted && (
            <button
              onClick={() => onResumeInterrupted(interruptedJob.galleryId, interruptedJob.collectionId)}
              className="self-start px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Select Folder &amp; Resume Upload</span>
            </button>
          )}
        </div>
      )}

      {/* Jobs Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[320px] scrollbar-thin scrollbar-thumb-[#E7E2D8]">
        {jobs.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F4F1EA] border border-[#E7E2D8] flex items-center justify-center mx-auto text-zinc-400">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">No uploads running right now</p>
          </div>
        ) : (
          jobs.map((job) => <JobItem key={job.id} job={job} onCancel={() => cancelJob(job.id)} />)
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 px-4 border-t border-[#E7E2D8] bg-[#F7F4EE] flex items-center justify-between text-[10px] text-zinc-500 font-medium">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>StudioCore Cloud • Auto Face AI</span>
        </span>
        <span className="font-mono">{totalPhotos > 0 ? `${completedPhotos}/${totalPhotos} photos` : ''}</span>
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
    <div className="p-3 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] font-black text-zinc-900 truncate max-w-[170px]">
            📁 {job.collectionName}
          </span>
          <span
            className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isUploading
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : isQueued
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
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
              className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-[#EAE5D9] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 to-amber-600'
            }`}
            style={{ width: `${job.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            {job.completedCount} of {job.totalCount} uploaded
          </span>
          <span className="truncate max-w-[140px] text-[9.5px] text-zinc-400">
            {job.currentFileName || ''}
          </span>
        </div>
      </div>
    </div>
  );
}

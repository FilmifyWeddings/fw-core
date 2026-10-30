'use client';

import React, { useState } from 'react';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
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
    retryJob,
    clearCompleted,
  } = useUploadQueue();

  const [showCancelModal, setShowCancelModal] = useState(false);

  // If drawer is closed or if there are no jobs and no interrupted job, do not render
  if (!isDrawerOpen || (jobs.length === 0 && !interruptedJob)) {
    return null;
  }

  // Calculate overall progress across all jobs
  const totalPhotos = jobs.reduce((acc, j) => acc + j.totalCount, 0);
  const completedPhotos = jobs.reduce((acc, j) => acc + j.completedCount, 0);
  const overallPercentage = totalPhotos > 0 ? Math.round((completedPhotos / totalPhotos) * 100) : 0;
  const isAnyUploading = jobs.some((j) => j.status === 'uploading');
  const hasAnyErrors = jobs.some((j) => (Array.isArray(j.errors) && j.errors.length > 0) || j.status === 'failed');

  const handleCloseClick = () => {
    if (activeJobCount > 0 || isAnyUploading) {
      setShowCancelModal(true);
    } else {
      clearCompleted();
      setIsDrawerOpen(false);
    }
  };

  const handleConfirmCancelUploads = () => {
    // Cancel all active and queued jobs
    jobs.forEach((j) => {
      if (j.status === 'uploading' || j.status === 'queued') {
        cancelJob(j.id);
      }
    });
    clearCompleted();
    setShowCancelModal(false);
    setIsDrawerOpen(false);
  };

  // Minimized Floating Pill Mode - Luxury Creamy Theme
  if (isMinimized) {
    return (
      <>
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 bg-[#FAF9F5]/95 border border-[#E7E2D8] rounded-full p-1.5 pl-3.5 shadow-2xl backdrop-blur-xl group">
            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-3 text-zinc-900 transition-all duration-200 cursor-pointer"
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
                    Uploading {completedPhotos === 0 ? '1' : completedPhotos}/{totalPhotos} ({Math.max(overallPercentage, 5)}%)
                  </span>
                ) : activeJobCount > 0 ? (
                  <span>{activeJobCount} queued upload{activeJobCount > 1 ? 's' : ''}</span>
                ) : hasAnyErrors && totalPhotos > completedPhotos ? (
                  <span className="text-amber-800">{completedPhotos} of {totalPhotos} uploaded ({totalPhotos - completedPhotos} failed)</span>
                ) : (
                  <span>Uploads complete ({completedPhotos} photos)</span>
                )}
              </div>

              <div className="w-6 h-6 rounded-full bg-[#EAE5D9] flex items-center justify-center text-zinc-600 group-hover:text-zinc-900 group-hover:bg-[#DFD9CB] transition">
                <ChevronUp className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={handleCloseClick}
              title="Close"
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-[#EAE5D9] transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Confirmation Modal when minimizing/cancelling */}
        {showCancelModal && (
          <CancelConfirmationModal
            onContinue={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancelUploads}
          />
        )}
      </>
    );
  }

  // Expanded Floating Drawer Mode - Luxury Creamy Theme
  return (
    <>
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
            <button
              onClick={() => setIsMinimized(true)}
              title="Minimize"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-[#F2EFE9] transition cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            <button
              onClick={handleCloseClick}
              title="Close"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-[#F2EFE9] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
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
            jobs.map((job) => (
              <JobItem
                key={job.id}
                job={job}
                onCancel={() => cancelJob(job.id)}
                onRetry={() => retryJob(job.id)}
              />
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 px-4 border-t border-[#E7E2D8] bg-[#F7F4EE] flex items-center justify-between text-[10px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1.5 font-bold text-zinc-700">
            <Upload className="w-3 h-3 text-amber-600" />
            <span>Upload Vault</span>
          </span>
          <span className="font-mono font-bold text-zinc-700">{totalPhotos > 0 ? `${completedPhotos}/${totalPhotos} photos` : ''}</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showCancelModal && (
        <CancelConfirmationModal
          onContinue={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancelUploads}
        />
      )}
    </>
  );
}

function CancelConfirmationModal({
  onContinue,
  onConfirm,
}: {
  onContinue: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF9F5] border border-[#E7E2D8] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-base font-black text-zinc-900 tracking-tight">Cancel Active Uploads?</h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Closing the Upload Manager will cancel all ongoing photo uploads. Are you sure you want to stop uploading?
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onContinue}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
          >
            Continue Uploading
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 border border-[#E7E2D8] hover:border-rose-200 text-rose-600 font-bold text-xs transition cursor-pointer active:scale-[0.98]"
          >
            Cancel Uploads &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

function JobItem({
  job,
  onCancel,
  onRetry,
}: {
  job: UploadJob;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const isUploading = job.status === 'uploading';
  const isCompleted = job.status === 'completed';
  const isQueued = job.status === 'queued';
  const isPaused = job.status === 'paused';
  const isFailed = job.status === 'failed';
  const hasErrors = Array.isArray(job.errors) && job.errors.length > 0;
  const isPartial = (isCompleted || isFailed) && hasErrors && job.completedCount < job.totalCount;

  return (
    <div className="p-3 rounded-2xl bg-white border border-[#E7E2D8] shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[11px] font-black text-zinc-900 truncate max-w-[140px]">
            📁 {job.collectionName}
          </span>
          {job.includeOriginals ? (
            <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              Master + 4K
            </span>
          ) : (
            <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              {job.qualityLevel || 100}% 4K
            </span>
          )}
          <span
            className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isPartial
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isUploading
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : isQueued
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}
          >
            {isUploading ? `${job.percentage}%` : isPartial ? 'Partially Completed' : job.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(isPartial || isFailed || (hasErrors && job.totalCount > job.completedCount)) && (
            <button
              onClick={onRetry}
              title="Retry Failed Photos"
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-amber-700" />
              <span>Retry</span>
            </button>
          )}
          {(isUploading || isQueued) && (
            <button
              onClick={onCancel}
              title="Cancel Upload"
              className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isCompleted && !hasErrors && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {isPartial && <AlertCircle className="w-4 h-4 text-amber-600" />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-[#EAE5D9] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCompleted && !hasErrors
                ? 'bg-emerald-500'
                : isPartial
                ? 'bg-amber-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse'
            }`}
            style={{ width: `${isUploading ? Math.max(job.percentage, 5) : job.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>
            {isUploading && job.completedCount === 0
              ? `Uploading 1 of ${job.totalCount}...`
              : `${job.completedCount} of ${job.totalCount} uploaded`}
            {(isCompleted || isFailed) && hasErrors && job.totalCount > job.completedCount && ` (${job.totalCount - job.completedCount} skipped/failed)`}
          </span>
          <span className="truncate max-w-[140px] text-[9.5px] text-zinc-500 font-medium">
            {job.currentFileName || (isUploading ? 'Transferring...' : '')}
          </span>
        </div>

        {hasErrors && (
          <div className="text-[9.5px] text-amber-800 bg-amber-50 rounded-lg p-1.5 border border-amber-200 leading-tight">
            ⚠️ {job.errors[0]}
          </div>
        )}
      </div>
    </div>
  );
}

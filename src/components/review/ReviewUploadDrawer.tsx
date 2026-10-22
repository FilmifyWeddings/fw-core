'use client';

import React, { useState } from 'react';
import { 
  Film, X, ChevronDown, ChevronUp, Loader2, 
  CheckCircle2, AlertCircle, Trash2, ArrowUpRight 
} from 'lucide-react';
import { useReviewUpload, ReviewUploadTask } from '@/context/ReviewUploadContext';

export function ReviewUploadDrawer() {
  const {
    tasks,
    activeCount,
    isDrawerOpen,
    setIsDrawerOpen,
    isMinimized,
    setIsMinimized,
    cancelUpload,
    clearCompleted,
  } = useReviewUpload();

  if (!isDrawerOpen || tasks.length === 0) {
    return null;
  }

  const isAnyActive = tasks.some(t => t.status === 'uploading' || t.status === 'saving' || t.status === 'queued');
  const activeTask = tasks.find(t => t.status === 'uploading' || t.status === 'saving') || tasks[0];

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[99999] animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2.5 bg-[#FAF9F5]/95 border border-[#E7E2D8] rounded-full p-2 pl-4 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 text-zinc-900 transition cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              {isAnyActive ? (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
              {isAnyActive ? (
                <span>
                  Uploading: {activeTask?.videoTitle} ({activeTask?.progress || 0}%)
                </span>
              ) : (
                <span>Video review uploads complete</span>
              )}
            </div>

            <ChevronUp className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700" />
          </button>

          <button
            onClick={() => {
              if (!isAnyActive) {
                clearCompleted();
                setIsDrawerOpen(false);
              } else {
                setIsMinimized(false);
              }
            }}
            className="p-1 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Drawer Mode
  return (
    <div className="fixed bottom-5 right-5 z-[99999] w-[92vw] sm:w-[420px] max-h-[520px] bg-white/95 backdrop-blur-xl rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans">
      
      {/* Header */}
      <div className="p-4 border-b border-[#E7E2D8] bg-[#FAF9F5] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-zinc-900">
              Video Review Uploads
            </h4>
            <p className="text-[10px] text-zinc-400 font-medium">
              {isAnyActive ? `${activeCount} uploading in background` : 'All uploads completed'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
            title="Minimize to floating pill"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (!isAnyActive) {
                clearCompleted();
                setIsDrawerOpen(false);
              } else {
                if (confirm('An upload is in progress. Minimize drawer instead?')) {
                  setIsMinimized(true);
                }
              }
            }}
            className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-zinc-100 max-h-[360px]">
        {tasks.map((task) => {
          const isUploading = task.status === 'uploading' || task.status === 'saving' || task.status === 'queued';
          const isComplete = task.status === 'completed';
          const isError = task.status === 'error';

          return (
            <div key={task.id} className="pt-3 first:pt-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-zinc-900 truncate">
                      {task.videoTitle}
                    </span>
                    {task.versionLabel && (
                      <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 border border-zinc-200">
                        {task.versionLabel}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                    <span>Original: <strong className="text-zinc-600">{task.formattedSize}</strong></span>
                    <span>·</span>
                    <span className="font-mono">{task.speed}</span>
                  </div>
                </div>

                {/* Status Indicator & Cancel button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isUploading && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      {task.status === 'saving' ? 'Saving...' : `${task.progress}%`}
                    </span>
                  )}

                  {isComplete && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Ready
                    </span>
                  )}

                  {isError && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full" title={task.errorMessage}>
                      <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                      Error
                    </span>
                  )}

                  {isUploading && (
                    <button
                      onClick={() => cancelUpload(task.id)}
                      className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-100 transition"
                      title="Cancel Upload"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="relative w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${task.progress}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                  />
                </div>
              )}

              {/* Error Detail */}
              {isError && task.errorMessage && (
                <p className="text-[11px] text-rose-600 leading-tight">
                  {task.errorMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#E7E2D8] bg-[#FAF9F5] flex items-center justify-between text-[11px] text-zinc-500">
        <span className="text-[10px] text-zinc-400">
          Uploads run safely in background
        </span>

        {!isAnyActive && (
          <button
            onClick={clearCompleted}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer transition"
          >
            Clear Finished
          </button>
        )}
      </div>
    </div>
  );
}

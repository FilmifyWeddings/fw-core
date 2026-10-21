'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2, HardDrive } from 'lucide-react';

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    client_name?: string | null;
  } | null;
  onDeleted: () => void;
}

export default function DeleteProjectModal({
  isOpen,
  onClose,
  project,
  onDeleted,
}: DeleteProjectModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const res = await fetch(`/api/review/projects/${project.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete project');
      }

      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while deleting project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Delete Review Project
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                This action is permanent and cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project info card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Project To Delete
          </div>
          <div className="text-sm font-bold text-slate-900">
            {project.name}
          </div>
          {project.client_name && (
            <div className="text-xs text-slate-500 font-medium">
              Client: {project.client_name}
            </div>
          )}
        </div>

        {/* Storage purge notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-medium">
            <span className="font-bold">Instant Storage Recovery:</span> All video files, revisions, and frame sketches will be permanently purged from your Backblaze B2 storage bucket to free up your quota immediately.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
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
                Purging Files...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Delete & Purge Storage
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

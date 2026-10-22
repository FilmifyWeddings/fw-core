'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, FileEdit, Clock, Loader2 } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any;
  projectId?: string;
  video?: any;
  videoId?: string;
  version?: any;
  versionId?: string;
  workspaceId?: string;
  currentStatus?: string;
  onApprovalSubmitted?: (approval: any) => void;
  onStatusUpdated?: (status: string) => void;
  initialDecision?: 'approved' | 'changes_requested' | 'in_review';
}

export default function ApprovalModal({
  isOpen,
  onClose,
  project,
  projectId,
  video,
  videoId,
  version,
  versionId,
  workspaceId,
  currentStatus = 'in_review',
  onApprovalSubmitted,
  onStatusUpdated,
  initialDecision,
}: ApprovalModalProps) {
  const resolvedProjectId = project?.id || projectId || '';
  const resolvedVideoId = video?.id || videoId || null;
  const resolvedVersionId = version?.id || versionId || null;
  const resolvedWsId = project?.workspace_id || workspaceId || null;

  const [decision, setDecision] = useState<'approved' | 'changes_requested' | 'in_review'>(
    initialDecision || (currentStatus as any) || 'approved'
  );
  const [clientName, setClientName] = useState(project?.client_name || 'Studio Owner');
  const [clientEmail, setClientEmail] = useState(project?.client_email || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (project?.client_name) setClientName(project.client_name);
    if (project?.client_email) setClientEmail(project.client_email);
    if (currentStatus) setDecision(currentStatus as any);
  }, [project, currentStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setErrorMessage('Please enter a name for the status change record');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // 1. Submit approval / sign-off record if version is present
      if (resolvedVersionId) {
        const res = await fetch('/api/review/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: resolvedProjectId,
            video_id: resolvedVideoId,
            version_id: resolvedVersionId,
            workspace_id: resolvedWsId,
            client_name: clientName.trim(),
            client_email: clientEmail.trim(),
            decision,
            notes: notes.trim(),
          }),
        });

        const data = await res.json();
        if (data.success && onApprovalSubmitted) {
          onApprovalSubmitted(data.approval);
        }
      }

      // 2. Persist project status
      if (resolvedProjectId) {
        await fetch(`/api/review/projects/${resolvedProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: decision }),
        });
      }

      if (onStatusUpdated) {
        onStatusUpdated(decision);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Status update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              decision === 'approved' 
                ? 'bg-emerald-100 text-emerald-600' 
                : decision === 'changes_requested'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}>
              {decision === 'approved' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : decision === 'changes_requested' ? (
                <FileEdit className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">
                {decision === 'approved' 
                  ? 'Sign-off: Approve Project' 
                  : decision === 'changes_requested' 
                  ? 'Request Revisions' 
                  : 'Set Status to In Review'}
              </h2>
              <p className="text-xs text-zinc-400">
                {video?.title || 'Review Studio'} ({version?.version_label || 'Current Cut'})
              </p>
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

          {/* 3-Way Status Radio Selector */}
          <div className="grid grid-cols-3 gap-2">
            <label className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center gap-1.5 ${
              decision === 'approved'
                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300'
                : 'bg-white border-[#E7E2D8] text-zinc-600 hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                name="decision"
                value="approved"
                checked={decision === 'approved'}
                onChange={() => setDecision('approved')}
                className="hidden"
              />
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold">Approved</span>
              <span className="text-[9px] text-zinc-400 leading-tight">Ready to deliver</span>
            </label>

            <label className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center gap-1.5 ${
              decision === 'changes_requested'
                ? 'bg-amber-50/90 border-amber-400 text-amber-950 ring-2 ring-amber-300'
                : 'bg-white border-[#E7E2D8] text-zinc-600 hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                name="decision"
                value="changes_requested"
                checked={decision === 'changes_requested'}
                onChange={() => setDecision('changes_requested')}
                className="hidden"
              />
              <FileEdit className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold">Changes</span>
              <span className="text-[9px] text-zinc-400 leading-tight">Needs edits</span>
            </label>

            <label className={`p-2.5 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center gap-1.5 ${
              decision === 'in_review'
                ? 'bg-blue-50/90 border-blue-400 text-blue-950 ring-2 ring-blue-300'
                : 'bg-white border-[#E7E2D8] text-zinc-600 hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                name="decision"
                value="in_review"
                checked={decision === 'in_review'}
                onChange={() => setDecision('in_review')}
                className="hidden"
              />
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold">In Review</span>
              <span className="text-[9px] text-zinc-400 leading-tight">Pending check</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Sign-off / Actor Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Studio Owner or Client Name"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="e.g. client@example.com"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Sign-off Notes / Revision Summary (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decision === 'approved' 
                  ? 'e.g. Client loved the cut and approved delivery.' 
                  : decision === 'changes_requested'
                  ? 'e.g. Please check comments at 01:23.' 
                  : 'e.g. Reviewing with team.'
              }
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E2D8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-[#E7E2D8] text-zinc-600 font-bold text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-full text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition ${
                decision === 'approved' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : decision === 'changes_requested'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

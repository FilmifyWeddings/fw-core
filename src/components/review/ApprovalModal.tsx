'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, FileEdit, Loader2 } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  video: any;
  version: any;
  onApprovalSubmitted: (approval: any) => void;
  initialDecision?: 'approved' | 'changes_requested';
}

export default function ApprovalModal({
  isOpen,
  onClose,
  project,
  video,
  version,
  onApprovalSubmitted,
  initialDecision = 'approved',
}: ApprovalModalProps) {
  const [decision, setDecision] = useState<'approved' | 'changes_requested'>(initialDecision);
  const [clientName, setClientName] = useState(project?.client_name || '');
  const [clientEmail, setClientEmail] = useState(project?.client_email || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !project || !version) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const res = await fetch('/api/review/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          video_id: video?.id || null,
          version_id: version.id,
          workspace_id: project.workspace_id,
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          decision,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit decision');

      onApprovalSubmitted(data.approval);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              decision === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {decision === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <FileEdit className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">
                {decision === 'approved' ? 'Approve Video Version' : 'Request Revisions'}
              </h2>
              <p className="text-xs text-zinc-400">
                {video?.title || 'Video'} ({version?.version_label || 'Current'})
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

          {/* Decision Radio Selector */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center gap-1.5 ${
              decision === 'approved'
                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300'
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold">Approve Video</span>
              <span className="text-[10px] text-zinc-400 leading-tight">Ready for final delivery</span>
            </label>

            <label className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center gap-1.5 ${
              decision === 'changes_requested'
                ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-2 ring-amber-300'
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
              <FileEdit className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-bold">Changes Needed</span>
              <span className="text-[10px] text-zinc-400 leading-tight">Send notes to editor</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Your Full Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              {decision === 'approved' ? 'Approval Sign-off Notes (Optional)' : 'Summary of Revisions Required'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={decision === 'approved' ? 'e.g. We love the film! Approved for final delivery.' : 'e.g. Please check timestamped comments at 01:24 and 02:40.'}
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
                decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{decision === 'approved' ? 'Confirm Approval' : 'Submit Change Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

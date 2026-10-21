'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Sparkles, Calendar, Users, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onProjectCreated: (project: any) => void;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  workspaceId,
  onProjectCreated,
}: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('Highlight Film');
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // Load existing clients for easy autocomplete
    fetch(`/api/leads?workspace_id=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.leads && Array.isArray(data.leads)) {
          setExistingClients(data.leads);
        }
      })
      .catch(() => {});
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Project name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const res = await fetch('/api/review/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: name.trim(),
          description: description.trim(),
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          event_date: eventDate || null,
          tags: [selectedTag],
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create review project');

      onProjectCreated(data.project);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project');
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">New Review Project</h2>
              <p className="text-xs text-zinc-400">Create a collaborative video review workspace</p>
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

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Siddharth & Kiara Wedding Films"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Kiara Advani"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Client Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="e.g. client@gmail.com"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Primary Category</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E2D8] text-xs text-zinc-800 focus:outline-hidden focus:border-amber-500 bg-white"
              >
                <option value="Highlight Film">Highlight Film</option>
                <option value="Wedding Teaser">Wedding Teaser</option>
                <option value="Full Wedding Film">Full Wedding Film</option>
                <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                <option value="Ceremony Film">Ceremony Film</option>
                <option value="Commercial & Brand">Commercial & Brand</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Project Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 3-day royal palace wedding in Udaipur with 4K drone cinematography."
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
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

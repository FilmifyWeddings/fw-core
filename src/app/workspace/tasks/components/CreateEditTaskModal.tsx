'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Lock,
  Building,
  Folder,
  Sparkles,
  Users,
  Check,
  ChevronDown,
  Search,
  Crown,
} from 'lucide-react';
import {
  TaskItem,
  TaskFolder,
  TaskCategory,
} from '@/lib/services/taskService';
import {
  WorkspaceMemberOption,
  getGroupedTeamMembers,
  getMemberDisplayRole,
  isOwnerMember
} from '@/lib/team-helpers';

interface CreateEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<TaskItem>) => Promise<void>;
  editingTask?: TaskItem | null;
  folders: TaskFolder[];
  clients: Array<{ id: string; name: string; event_type?: string }>;
  teamMembers?: WorkspaceMemberOption[];
  defaultFolderId?: string;
  defaultClientId?: string;
}

export function CreateEditTaskModal({
  isOpen,
  onClose,
  onSave,
  editingTask,
  folders,
  clients,
  teamMembers = [],
  defaultFolderId,
  defaultClientId,
}: CreateEditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('POST_PRODUCTION');
  const [isPersonal, setIsPersonal] = useState<boolean>(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Multi-select dropdown state
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setFolderId(editingTask.folder_id || '');
      setClientId(editingTask.client_id || '');
      setCategory(editingTask.category || 'POST_PRODUCTION');
      setIsPersonal(editingTask.is_personal || false);
      setSelectedMemberIds(
        editingTask.assigned_members || (editingTask.assigned_to ? [editingTask.assigned_to] : [])
      );
    } else {
      setTitle('');
      setDescription('');
      setFolderId(defaultFolderId || (folders.length > 0 ? folders[0].id : ''));
      setClientId(defaultClientId || '');
      setCategory('POST_PRODUCTION');
      setIsPersonal(false);
      setSelectedMemberIds([]);
    }
  }, [editingTask, isOpen, defaultFolderId, defaultClientId, folders]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Separate team members: In-House on top (with Studio Owner at index 0), followed by other crew
  const { inHouseMembers, otherMembers } = useMemo(() => {
    const { inHouse, freelancers } = getGroupedTeamMembers(teamMembers);
    const query = memberSearch.trim().toLowerCase();
    const filterFn = (m: any) =>
      !query ||
      m.name.toLowerCase().includes(query) ||
      getMemberDisplayRole(m).toLowerCase().includes(query) ||
      (m.email && m.email.toLowerCase().includes(query));

    return {
      inHouseMembers: inHouse.filter(filterFn),
      otherMembers: freelancers.filter(filterFn)
    };
  }, [teamMembers, memberSearch]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const removeMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Task title is required');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        id: editingTask?.id,
        title: title.trim(),
        description: description.trim() || null,
        folder_id: folderId || null,
        client_id: clientId || null,
        category,
        is_personal: isPersonal,
        assigned_members: selectedMemberIds,
        assigned_to: selectedMemberIds[0] || null,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save task:', err);
      alert(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFDF9] dark:bg-[#1C1A17] border border-[#EAE5DA] dark:border-[#2C2824] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEBE4] dark:border-[#2C2824] bg-[#FAF8F2]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
              ✍️
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingTask ? 'Edit Task / Note' : 'Create New Task'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Add title, client, folder, and assign team members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Color Grade Wedding Film, Deliver Teaser..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-2xs transition"
            />
          </div>

          {/* Client & Folder Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Linked Client */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-amber-600" /> Linked Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="">— No Client Linked —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.event_type ? `(${c.event_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Folder / Group */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-amber-600" /> Folder / Group
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="">— General / No Folder —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} {f.is_personal ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            >
              <option value="POST_PRODUCTION">🎬 Post-Production</option>
              <option value="DELIVERABLE">📦 Deliverable</option>
              <option value="SHOOT_PREP">📸 Shoot Prep</option>
              <option value="PAYMENT">💰 Payment</option>
              <option value="GENERAL">📋 General</option>
            </select>
          </div>

          {/* Multi-Team Member Assignment (In-House on Top) */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" /> Assign Team Members (In-House First)
            </label>

            {/* Selected Member Chips & Trigger */}
            <div
              onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
              className="min-h-[44px] p-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-2xl shadow-2xs cursor-pointer flex items-center justify-between gap-2 flex-wrap"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedMemberIds.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium px-2">
                    Click to assign team members...
                  </span>
                ) : (
                  selectedMemberIds.map((id) => {
                    const member = teamMembers.find((m) => m.id === id);
                    if (!member) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black">
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>{member.name}</span>
                        <button
                          type="button"
                          onClick={(e) => removeMember(id, e)}
                          className="hover:text-rose-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Dropdown Menu */}
            {isMemberDropdownOpen && (
              <div className="mt-1 p-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-2xl shadow-xl space-y-2 max-h-60 overflow-y-auto z-20">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-stone-800 rounded-xl border border-slate-200 dark:border-stone-700 outline-none"
                  />
                </div>

                {/* Currently Assigned Summary Block */}
                {selectedMemberIds.length > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      <span className="flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                        <span>Currently Assigned</span>
                      </span>
                      <span className="text-[8px] bg-emerald-200 text-emerald-950 px-1 rounded-full font-black">
                        {selectedMemberIds.length} Active
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedMemberIds.map((id) => {
                        const mem = teamMembers.find((m) => m.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold bg-white dark:bg-stone-800 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                          >
                            <span>{mem?.name || id}</span>
                            <button
                              type="button"
                              onClick={(e) => removeMember(id, e)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer text-[10px]"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 1: In-House Team */}
                {inHouseMembers.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 flex items-center justify-between rounded-lg border border-amber-200">
                      <span className="flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-700" />
                        <span>In-House Team</span>
                      </span>
                      <span className="text-[8px] bg-amber-200 text-amber-950 px-1 rounded-full font-black">
                        {inHouseMembers.length}
                      </span>
                    </div>
                    {inHouseMembers.map((m) => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      const isOwner = isOwnerMember(m);
                      const displayRole = getMemberDisplayRole(m);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-100 text-amber-950 font-black'
                              : 'hover:bg-slate-50 dark:hover:bg-stone-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{m.name}</span>
                                {isOwner && (
                                  <span className="text-[8.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                                    👑 Owner
                                  </span>
                                )}
                              </div>
                              <div className={`text-[10px] truncate ${isOwner ? 'text-amber-800 font-bold' : 'text-slate-400 font-normal'}`}>
                                {displayRole}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-700" />}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Section 2: Other Crew Members */}
                {otherMembers.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-stone-800">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 py-0.5">
                      Crew & External Members
                    </div>
                    {otherMembers.map((m) => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-100 text-amber-950 font-black'
                              : 'hover:bg-slate-50 dark:hover:bg-stone-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <div>{m.name}</div>
                              {m.role && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {m.role}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-700" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {inHouseMembers.length === 0 && otherMembers.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No team members found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description (Optional Notes) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add key deliverables, audio notes, client feedback, or special requests..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs font-medium resize-none"
            />
          </div>

          {/* Personal Task Privacy Toggle */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
            <input
              type="checkbox"
              id="isPersonalToggle"
              checked={isPersonal}
              onChange={(e) => setIsPersonal(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
            <label htmlFor="isPersonalToggle" className="cursor-pointer space-y-0.5 flex-1">
              <span className="text-xs font-black text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Make this a Private / Personal Task
              </span>
              <p className="text-[11px] text-purple-800/90 dark:text-purple-300 font-medium">
                When enabled, this task is stored in your personal vault. Only you can see it; it is
                strictly hidden from workspace owners and other crew members.
              </p>
            </label>
          </div>

          {/* Footer CTA */}
          <div className="pt-3 border-t border-[#EFEBE4] dark:border-[#2C2824] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-stone-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

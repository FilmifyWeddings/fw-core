'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Users,
  ChevronDown,
  Search,
  Check,
  Sparkles,
  Folder,
} from 'lucide-react';
import { TaskFolder, TaskColorTheme, PASTEL_NOTE_COLORS } from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderData: Partial<TaskFolder>) => Promise<void>;
  teamMembers?: WorkspaceMemberOption[];
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onSave,
  teamMembers = [],
}: CreateFolderModalProps) {
  const [title, setTitle] = useState('');
  const [colorTheme, setColorTheme] = useState<TaskColorTheme>('amber');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredMembers = teamMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const removeMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Folder name is required');
      return;
    }

    try {
      setSaving(true);
      const finalAssignedMembers: string[] = [];
      selectedMemberIds.forEach((id) => {
        finalAssignedMembers.push(id);
        const member = teamMembers.find((m) => m.id === id);
        if (member?.email) {
          finalAssignedMembers.push(member.email.toLowerCase().trim());
        }
        if ((member as any)?.auth_user_id) {
          finalAssignedMembers.push((member as any).auth_user_id);
        }
        if ((member as any)?.user_id) {
          finalAssignedMembers.push((member as any).user_id);
        }
      });
      const uniqueAssigned = Array.from(new Set(finalAssignedMembers));

      await onSave({
        title: title.trim(),
        color_theme: colorTheme,
        assigned_members: uniqueAssigned,
        is_personal: false,
      });
      setTitle('');
      setSelectedMemberIds([]);
      onClose();
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      alert(err.message || 'Failed to create folder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFDF9] dark:bg-[#1C1A17] border border-[#EAE5DA] dark:border-[#2C2824] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEBE4] dark:border-[#2C2824] bg-[#FAF8F2]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
              <Folder className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                New Folder / Group
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Create a card group and assign team members
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* 1. Folder Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Folder / Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Navnath Task or Post Production Work"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          {/* 2. Folder Pastel Color */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Card Color
            </label>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {PASTEL_NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorTheme(c.id as any)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full border border-black/10 transition-all cursor-pointer flex items-center justify-center ${c.bg} ${
                    colorTheme === c.id
                      ? 'ring-2 ring-offset-2 ring-amber-500 scale-110 shadow-sm'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  {colorTheme === c.id && <Check className="w-3.5 h-3.5 text-slate-800 dark:text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Team Members Access with Profile Photos */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" /> Team Members Access
            </label>

            {/* Selected Chips & Trigger */}
            <div
              onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
              className="min-h-[44px] p-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-2xl shadow-2xs cursor-pointer flex items-center justify-between gap-2 flex-wrap"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedMemberIds.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium px-2">
                    Select team members to assign access...
                  </span>
                ) : (
                  selectedMemberIds.map((id) => {
                    const member = teamMembers.find((m) => m.id === id);
                    if (!member) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[8px] font-black">
                            {member.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
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

            {/* Floating Dropdown List with Profile Photos */}
            {isMemberDropdownOpen && (
              <div className="mt-1 p-2 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-2xl shadow-xl space-y-2 max-h-52 overflow-y-auto z-20">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search studio team..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-stone-800 rounded-xl border border-slate-200 dark:border-stone-700 outline-none"
                  />
                </div>

                {/* Team Members List */}
                <div className="space-y-1">
                  {filteredMembers.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMemberSelection(m.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Profile Photo / Avatar */}
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {m.name}
                            </div>
                            {m.role && (
                              <div className="text-[10px] text-slate-400">{m.role}</div>
                            )}
                          </div>
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-amber-400 border-amber-500 text-slate-950'
                              : 'border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No team members found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="pt-3 border-t border-[#EFEBE4] dark:border-[#2C2824] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-300 dark:border-stone-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? 'Creating...' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

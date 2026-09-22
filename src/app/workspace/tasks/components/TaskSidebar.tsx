'use client';

import React, { useState } from 'react';
import {
  Folder,
  AlertTriangle,
  UserCheck,
  Plus,
  Trash2,
  FolderOpen,
  CheckSquare,
  Clock,
  Calendar,
  CheckCircle,
  Pin,
  FileText,
  Tag,
  Star,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { TaskFolder, TaskSummaryMetrics, PRESET_LABELS } from '@/lib/services/taskService';
import { WorkspaceMemberOption } from '@/lib/team-helpers';

interface TaskSidebarProps {
  folders: TaskFolder[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
  selectedLabel: string;
  onSelectLabel: (label: string) => void;
  customLabels: string[];
  onAddCustomLabel: (label: string) => void;
  metrics: TaskSummaryMetrics;
  teamMembers?: WorkspaceMemberOption[];
  onOpenNewFolderModal: () => void;
  onDeleteFolder?: (folderId: string) => void;
}

const THEME_DOTS: Record<string, string> = {
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  emerald: 'bg-emerald-400',
  sky: 'bg-sky-400',
  indigo: 'bg-indigo-400',
  neutral: 'bg-slate-400',
};

export function TaskSidebar({
  folders,
  activeFolderId,
  onSelectFolder,
  selectedLabel,
  onSelectLabel,
  customLabels,
  onAddCustomLabel,
  metrics,
  teamMembers = [],
  onOpenNewFolderModal,
  onDeleteFolder,
}: TaskSidebarProps) {
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

  const primaryNavItems = [
    {
      id: 'all',
      label: 'All Tasks',
      icon: CheckSquare,
      count: metrics.total,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
    },
    {
      id: 'assigned_me',
      label: 'My Tasks',
      icon: UserCheck,
      count: null,
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-200',
    },
    {
      id: 'today_overdue',
      label: 'Today',
      icon: Clock,
      count: metrics.todayDue,
      highlight: metrics.todayDue > 0,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: Calendar,
      count: metrics.upcoming,
      badgeColor: 'bg-emerald-100 text-emerald-900',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: AlertTriangle,
      count: metrics.overdue,
      highlight: metrics.overdue > 0,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle,
      count: metrics.completed,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'starred',
      label: 'Starred / Pinned',
      icon: Pin,
      count: null,
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: FileText,
      count: null,
      badgeColor: 'bg-purple-100 text-purple-900',
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: Trash2,
      count: null,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
  ];

  const allLabels = Array.from(new Set([...PRESET_LABELS, ...customLabels]));

  const handleCreateLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newLabelText.trim()) {
      e.preventDefault();
      onAddCustomLabel(newLabelText.trim());
      setNewLabelText('');
      setIsAddingLabel(false);
    } else if (e.key === 'Escape') {
      setIsAddingLabel(false);
      setNewLabelText('');
    }
  };

  return (
    <aside className="w-60 sm:w-64 flex-shrink-0 flex flex-col bg-[#FAF8F5] dark:bg-[#1A1816] border-r border-[#EFEBE4] dark:border-[#2C2824] h-full overflow-y-auto select-none p-3 space-y-4">
      {/* ── Main Task Views ── */}
      <div className="space-y-1">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-0.5">
          Tasks & Views
        </div>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFolderId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectFolder(item.id);
                onSelectLabel('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-stone-800/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    item.highlight && !isActive
                      ? 'text-rose-600'
                      : isActive
                      ? 'text-slate-950'
                      : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== null && item.count > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border border-black/5 ${
                    isActive ? 'bg-slate-900 text-white' : item.badgeColor
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Labels Section ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2.5 py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Labels
          </span>
          <button
            type="button"
            onClick={() => setIsAddingLabel(!isAddingLabel)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-stone-800 rounded-lg text-amber-800 dark:text-amber-300 transition cursor-pointer"
            title="Add custom label"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add Label Input */}
        {isAddingLabel && (
          <div className="px-2.5 py-1">
            <input
              type="text"
              placeholder="New label name (press Enter)..."
              value={newLabelText}
              onChange={(e) => setNewLabelText(e.target.value)}
              onKeyDown={handleCreateLabel}
              autoFocus
              className="w-full bg-white dark:bg-stone-800 border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
            />
          </div>
        )}

        <div className="space-y-0.5">
          {allLabels.map((lbl) => {
            const isSelected = selectedLabel === lbl;
            return (
              <button
                key={lbl}
                onClick={() => onSelectLabel(isSelected ? 'all' : lbl)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-100 text-amber-950 font-bold dark:bg-amber-950/60 dark:text-amber-200'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className={`w-3 h-3 ${isSelected ? 'text-amber-600 fill-current' : 'text-slate-400'}`} />
                  <span className="truncate">{lbl}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Folders & Client Pipelines ── */}
      <div className="space-y-1 flex-1 min-h-0">
        <div className="flex items-center justify-between px-2.5 py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Folders ({folders.length})
          </span>
          <button
            onClick={onOpenNewFolderModal}
            className="p-1 hover:bg-amber-100 dark:hover:bg-stone-800 rounded-lg text-amber-800 dark:text-amber-300 transition cursor-pointer"
            title="Create New Folder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="p-3 text-center rounded-xl border border-dashed border-[#EAE5DA] bg-white/40 dark:bg-stone-900/30 space-y-1">
            <Folder className="w-4 h-4 text-slate-300 mx-auto" />
            <p className="text-[10px] text-slate-500 font-medium">No folders created yet.</p>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto max-h-48">
            {folders.map((folder) => {
              const isActive = activeFolderId === folder.id;
              const dotColor = THEME_DOTS[folder.color_theme] || THEME_DOTS.amber;
              const total = folder.tasks_count || 0;
              const completed = folder.completed_count || 0;

              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    onSelectFolder(folder.id);
                    onSelectLabel('all');
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-stone-800 border-amber-400 shadow-xs'
                      : 'bg-[#FDFBF7] dark:bg-[#1E1B18] border-[#EFEBE4] dark:border-[#2C2824] hover:bg-white dark:hover:bg-stone-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-amber-950 dark:text-amber-100' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {folder.title}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {completed}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

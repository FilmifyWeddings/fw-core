'use client';

import React, { useState } from 'react';
import { 
  Camera, Video, BookOpen, Plus, Sparkles, Trash2, X
} from 'lucide-react';
import DeliverableRowItem from './DeliverableRowItem';
import PostProductionConfirmModal from './PostProductionConfirmModal';

export interface PostProductionDeliverable {
  id: string;
  project_id?: string;
  segment: string;
  category: string;
  custom_category_name?: string;
  title: string;
  status: 'Upcoming' | 'In Progress' | 'Under Review' | 'Done' | string;
  assigned_member_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  notes?: string | null;
  drive_link?: string | null;
  comments?: any[];
  comments_count?: number;
  count?: string | number | null;
  specs?: string | number | null;
  is_custom?: boolean;
  is_hidden?: boolean;
  segment_order?: number;
}

interface DeliverableCategorySectionProps {
  segment: string;
  category: string;
  items: PostProductionDeliverable[];
  teamMembers: { id: string; name: string; role?: string }[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (segment: string, category: string, title: string) => void;
  onRemoveCategory?: (segment: string, category: string) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive?: (itemId: string, currentLink: string) => void;
}

export default function DeliverableCategorySection({
  segment,
  category,
  items,
  teamMembers,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onRemoveCategory,
  onOpenComments,
  onOpenDrive,
}: DeliverableCategorySectionProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showDeleteCatConfirm, setShowDeleteCatConfirm] = useState(false);

  // Category Theme Icons & Colors
  const getCategoryConfig = () => {
    switch (category) {
      case 'Photos':
        return {
          icon: <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          title: 'Photos Deliverables',
          badge: 'Stills, Color Grading & Retouching',
          accent: 'border-indigo-200 bg-indigo-50/60 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'Videos':
        return {
          icon: <Video className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          title: 'Videos Deliverables',
          badge: 'Teasers, Highlight Films & Reels',
          accent: 'border-rose-200 bg-rose-50/60 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        };
      case 'Albums':
        return {
          icon: <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          title: 'Albums Deliverables',
          badge: 'Photobooks, Designing & Printing',
          accent: 'border-amber-200 bg-amber-50/60 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          title: `${category} Deliverables`,
          badge: 'Special Deliverables',
          accent: 'border-purple-200 bg-purple-50/60 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        };
    }
  };

  const config = getCategoryConfig();

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddItem(segment, category, newTitle.trim());
    setNewTitle('');
    setIsAddingItem(false);
  };

  return (
    <div className="w-full bg-[#FCFAF7] dark:bg-[#1C1A17] rounded-2xl border border-[#EAE5DA] dark:border-stone-800/80 p-4 space-y-3 shadow-xs">
      {/* ── Category Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DA] dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-800 shadow-2xs shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-slate-800 dark:text-stone-100 uppercase tracking-wider">
                {config.title}
              </h4>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${config.accent}`}>
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-stone-400 font-medium mt-0.5">
              {config.badge}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Add Deliverable button */}
          <button
            type="button"
            onClick={() => setIsAddingItem(true)}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/50 hover:bg-amber-200/80 border border-amber-300 dark:border-amber-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deliverable</span>
          </button>

          {/* Remove Category button */}
          {onRemoveCategory && (
            <button
              type="button"
              onClick={() => setShowDeleteCatConfirm(true)}
              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-[#EAE5DA] dark:border-stone-800 hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer shadow-2xs"
              title={`Remove ${category} from ${segment}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-600 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* ── Add Deliverable Inline Form ── */}
      {isAddingItem && (
        <form onSubmit={handleCreateNew} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              New {segment} {category} Deliverable
            </span>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder={`e.g. Traditional ${category} edit, Cinematic Highlights, etc...`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#FDFBF7] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-lg text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition cursor-pointer shadow-xs"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* ── Deliverable Items List ── */}
      {items.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[#EAE5DA] dark:border-stone-800 text-center bg-white/40 dark:bg-stone-900/30 space-y-2">
          <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
            No {category.toLowerCase()} deliverables currently set for {segment}.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddingItem(true)}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Create First {category} Item</span>
            </button>
            {onRemoveCategory && (
              <span className="text-slate-300 dark:text-stone-700">•</span>
            )}
            {onRemoveCategory && (
              <button
                type="button"
                onClick={() => setShowDeleteCatConfirm(true)}
                className="text-xs font-bold text-stone-500 hover:text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Remove Empty Category</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <DeliverableRowItem
              key={item.id}
              item={item}
              teamMembers={teamMembers}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onOpenComments={onOpenComments}
              onOpenDrive={onOpenDrive}
            />
          ))}
        </div>
      )}

      {/* Category Deletion 3D Confirmation Modal */}
      <PostProductionConfirmModal
        isOpen={showDeleteCatConfirm}
        onClose={() => setShowDeleteCatConfirm(false)}
        onConfirm={() => {
          if (onRemoveCategory) {
            onRemoveCategory(segment, category);
          }
        }}
        title={`Remove "${category}" Category?`}
        message={
          items.length > 0
            ? `Are you sure you want to remove the "${category}" category and hide its ${items.length} deliverable(s) for ${segment}? You can restore this category anytime.`
            : `Are you sure you want to remove the empty "${category}" category from ${segment}?`
        }
        confirmText="Remove Category"
      />
    </div>
  );
}

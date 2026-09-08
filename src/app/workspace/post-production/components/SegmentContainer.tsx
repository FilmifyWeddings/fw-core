'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, X, ChevronDown, Sparkles, FolderPlus, Layers
} from 'lucide-react';
import DeliverableCategorySection, { PostProductionDeliverable } from './DeliverableCategorySection';
import PostProductionConfirmModal from './PostProductionConfirmModal';

interface SegmentContainerProps {
  segmentName: string;
  deliverables: PostProductionDeliverable[];
  teamMembers: { id: string; name: string; role?: string }[];
  disabledCategories?: string[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (segment: string, category: string, title: string) => void;
  onRemoveCategory: (segment: string, category: string) => void;
  onAddCategory: (segment: string, category: string) => void;
  onRemoveSegment?: (segmentName: string) => void;
  onOpenComments: (itemId: string, title: string) => void;
  onOpenDrive?: (itemId: string, currentLink: string) => void;
}

const DEFAULT_CATEGORIES = ['Photos', 'Videos', 'Albums'];

export default function SegmentContainer({
  segmentName,
  deliverables,
  teamMembers,
  disabledCategories = [],
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onRemoveCategory,
  onAddCategory,
  onRemoveSegment,
  onOpenComments,
  onOpenDrive,
}: SegmentContainerProps) {
  const [showAddCatPopover, setShowAddCatPopover] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [showDeleteSegConfirm, setShowDeleteSegConfirm] = useState(false);

  // Segment styling & emoji
  const segmentConfig = useMemo(() => {
    const s = segmentName.toLowerCase();
    if (s.includes('pre-wedding') || s.includes('prewedding')) {
      return {
        emoji: '💍',
        title: `${segmentName} Segment`,
        containerBorder: 'border-amber-200/80 dark:border-amber-900/40',
        headerText: 'text-amber-900 dark:text-amber-200',
        badgeBg: 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    }
    if (s.includes('wedding')) {
      return {
        emoji: '💒',
        title: `${segmentName} Segment`,
        containerBorder: 'border-indigo-200/80 dark:border-indigo-900/40',
        headerText: 'text-indigo-900 dark:text-indigo-200',
        badgeBg: 'bg-indigo-100/70 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
    }
    return {
      emoji: '✨',
      title: `${segmentName} Segment`,
      containerBorder: 'border-purple-200/80 dark:border-purple-900/40',
      headerText: 'text-purple-900 dark:text-purple-200',
      badgeBg: 'bg-purple-100/70 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    };
  }, [segmentName]);

  // Compute active categories for this segment
  const activeCategories = useMemo(() => {
    const catSet = new Set<string>();

    // Add default categories unless disabled
    DEFAULT_CATEGORIES.forEach(cat => {
      if (!disabledCategories.includes(cat)) {
        catSet.add(cat);
      }
    });

    // Add any category from existing deliverables in this segment (unless explicitly disabled)
    deliverables.forEach(d => {
      if (d.category && !disabledCategories.includes(d.category)) {
        catSet.add(d.category);
      }
    });

    return Array.from(catSet);
  }, [deliverables, disabledCategories]);

  // Missing standard categories that can be re-added
  const availableToAdd = useMemo(() => {
    return DEFAULT_CATEGORIES.filter(c => !activeCategories.includes(c));
  }, [activeCategories]);

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCatInput.trim();
    if (!trimmed) return;
    onAddCategory(segmentName, trimmed);
    setCustomCatInput('');
    setIsAddingCustomCat(false);
    setShowAddCatPopover(false);
  };

  return (
    <div className={`space-y-4 bg-[#FFFDF9] dark:bg-[#1A1816] p-4 sm:p-5 rounded-2xl border ${segmentConfig.containerBorder} shadow-xs`}>
      {/* ── SEGMENT HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DA] dark:border-stone-800">
        <div className="flex items-center gap-3">
          <span className="text-xl p-1.5 rounded-xl bg-[#F8F6F0] dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 shadow-2xs">
            {segmentConfig.emoji}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-black uppercase tracking-wider ${segmentConfig.headerText}`}>
                {segmentConfig.title}
              </h3>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${segmentConfig.badgeBg}`}>
                {deliverables.length} {deliverables.length === 1 ? 'Deliverable' : 'Deliverables'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-stone-400 font-medium mt-0.5">
              {activeCategories.length} active {activeCategories.length === 1 ? 'category' : 'categories'} configured
            </p>
          </div>
        </div>

        {/* Right Segment Controls: Remove Segment */}
        {onRemoveSegment && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowDeleteSegConfirm(true)}
              className="px-2.5 py-1.5 text-xs font-bold text-stone-500 hover:text-rose-600 bg-white dark:bg-stone-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-[#EAE5DA] dark:border-stone-800 hover:border-rose-300 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title={`Remove ${segmentName} segment`}
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove Segment</span>
            </button>
          </div>
        )}
      </div>

      {/* ── STACKED FULL-WIDTH CATEGORY SECTIONS ── */}
      {activeCategories.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800 text-center bg-white/40 dark:bg-stone-900/30 space-y-3">
          <Layers className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-stone-300">
              No Active Categories In {segmentName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-stone-400 mt-0.5">
              Add Photos, Videos, Albums, or Custom categories to begin tracking deliverables.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {DEFAULT_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => onAddCategory(segmentName, cat)}
                className="px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 rounded-xl transition cursor-pointer"
              >
                + Add {cat}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCategories.map(cat => {
            const catDeliverables = deliverables.filter(d => d.category === cat);
            return (
              <DeliverableCategorySection
                key={`${segmentName}_${cat}`}
                segment={segmentName}
                category={cat}
                items={catDeliverables}
                teamMembers={teamMembers}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onAddItem={onAddItem}
                onRemoveCategory={onRemoveCategory}
                onOpenComments={onOpenComments}
                onOpenDrive={onOpenDrive}
              />
            );
          })}

          {/* ── LIGHT-YELLOW "+ ADD CATEGORY" BUTTON (UNDERNEATH LAST CATEGORY CARD) ── */}
          <div className="pt-2">
            {showAddCatPopover ? (
              <div className="p-4 bg-white dark:bg-stone-900 border border-amber-300/80 dark:border-amber-700/80 rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-amber-600" />
                    Add Category to {segmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCatPopover(false);
                      setIsAddingCustomCat(false);
                    }}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-bold cursor-pointer p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Standard Categories to re-add */}
                {availableToAdd.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-400">
                      Standard Categories
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableToAdd.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            onAddCategory(segmentName, cat);
                            setShowAddCatPopover(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          <span>{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Category Input */}
                <div className="pt-1 border-t border-[#EAE5DA] dark:border-stone-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Custom Category
                  </span>
                  <form onSubmit={handleAddCustomCategory} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Drone Raw Cuts, Reels & Shorts, Candid Stills..."
                      value={customCatInput}
                      onChange={(e) => setCustomCatInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-[#FAF9F5] dark:bg-stone-800 border border-amber-300/80 dark:border-amber-700 rounded-xl text-slate-800 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddCatPopover(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-300/60 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300 text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>+ Add Category</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Segment Deletion 3D Confirmation Modal */}
      {onRemoveSegment && (
        <PostProductionConfirmModal
          isOpen={showDeleteSegConfirm}
          onClose={() => setShowDeleteSegConfirm(false)}
          onConfirm={() => onRemoveSegment(segmentName)}
          title={`Remove "${segmentName}" Segment?`}
          message={
            deliverables.length > 0
              ? `Are you sure you want to remove the "${segmentName}" segment and all its ${deliverables.length} deliverable(s)? This action cannot be undone.`
              : `Are you sure you want to remove the empty "${segmentName}" segment?`
          }
          confirmText="Remove Segment"
        />
      )}
    </div>
  );
}

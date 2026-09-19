'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, X, ChevronDown, Sparkles, FolderPlus, Layers
} from 'lucide-react';
import DeliverableCategorySection, { PostProductionDeliverable } from './DeliverableCategorySection';
import PostProductionConfirmModal from './PostProductionConfirmModal';
import { fetchPostProductionSettings } from '@/lib/post-production-settings';

export function normalizeCategoryName(cat: string): string {
  if (!cat) return 'Photos';
  const c = cat.trim().toLowerCase();
  if (c === 'photos' || c === 'photo' || c === 'stills') return 'Photos';
  if (c === 'videos' || c === 'video' || c === 'films') return 'Videos';
  if (c === 'albums' || c === 'album' || c === 'photobooks') return 'Albums';
  return cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1);
}

interface SegmentContainerProps {
  segmentName: string;
  deliverables: PostProductionDeliverable[];
  teamMembers: { id: string; name: string; role?: string }[];
  disabledCategories?: string[];
  onUpdateItem: (itemId: string, field: keyof PostProductionDeliverable, value: any) => void;
  onUpdateItemFields?: (itemId: string, fields: Partial<PostProductionDeliverable>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (segment: string, category: string, title: string, specs?: string) => void;
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
  onUpdateItemFields,
  onDeleteItem,
  onAddItem,
  onRemoveCategory,
  onAddCategory,
  onRemoveSegment,
  onOpenComments,
  onOpenDrive,
}: SegmentContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddCatPopover, setShowAddCatPopover] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [showDeleteSegConfirm, setShowDeleteSegConfirm] = useState(false);
  const [studioCategories, setStudioCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    const loadCategories = () => {
      fetchPostProductionSettings().then(settings => {
        if (settings && settings.categories && settings.categories.length > 0) {
          const names = settings.categories.map(c => c.name);
          setStudioCategories(names);
        }
      }).catch(() => {});
    };

    loadCategories();
    window.addEventListener('post_production_settings_updated', loadCategories);
    return () => window.removeEventListener('post_production_settings_updated', loadCategories);
  }, []);

  // Segment styling & emoji with distinct minimal pastel backgrounds
  const segmentConfig = useMemo(() => {
    const s = segmentName.toLowerCase();
    if (s.includes('pre-wedding') || s.includes('prewedding')) {
      return {
        emoji: '💍',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#F2F8FA] dark:bg-[#141A1C]',
        containerBorder: 'border-[#D1E8EE] dark:border-cyan-900/50',
        headerText: 'text-[#164E63] dark:text-cyan-200',
        badgeBg: 'bg-[#E0F2F7] text-[#164E63] border-[#C3E4ED] dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      };
    }
    if (s.includes('wedding')) {
      return {
        emoji: '💒',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#FAF7F2] dark:bg-[#1C1814]',
        containerBorder: 'border-[#EEDFC6] dark:border-amber-900/50',
        headerText: 'text-[#6A4B23] dark:text-amber-200',
        badgeBg: 'bg-[#F4E9D5] text-[#6A4B23] border-[#E3D1B4] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      };
    }
    if (s.includes('reception')) {
      return {
        emoji: '🥂',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#F6F4FA] dark:bg-[#18151D]',
        containerBorder: 'border-[#DFDAEE] dark:border-indigo-900/50',
        headerText: 'text-[#3730A3] dark:text-indigo-200',
        badgeBg: 'bg-[#EDE9FE] text-[#3730A3] border-[#DDD6FE] dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    }
    if (s.includes('haldi')) {
      return {
        emoji: '🌼',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#FEFAF0] dark:bg-[#1D1B12]',
        containerBorder: 'border-[#F8E7BE] dark:border-yellow-900/50',
        headerText: 'text-[#78350F] dark:text-yellow-200',
        badgeBg: 'bg-[#FEF3C7] text-[#78350F] border-[#FDE68A] dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800',
      };
    }
    if (s.includes('sangeet')) {
      return {
        emoji: '💃',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#FAF3F6] dark:bg-[#1D1418]',
        containerBorder: 'border-[#EED3DE] dark:border-rose-900/50',
        headerText: 'text-[#831843] dark:text-rose-200',
        badgeBg: 'bg-[#FCE7F3] text-[#831843] border-[#FBCFE8] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      };
    }
    if (s.includes('mehendi') || s.includes('mehndi')) {
      return {
        emoji: '🌿',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#F2F8F4] dark:bg-[#131B15]',
        containerBorder: 'border-[#CCE5D4] dark:border-emerald-900/50',
        headerText: 'text-[#065F46] dark:text-emerald-200',
        badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      };
    }
    if (s.includes('engagement') || s.includes('roka')) {
      return {
        emoji: '💍',
        title: `${segmentName} Segment`,
        containerBg: 'bg-[#FAF6F0] dark:bg-[#1C1713]',
        containerBorder: 'border-[#EEDDC8] dark:border-amber-900/50',
        headerText: 'text-[#713F12] dark:text-amber-200',
        badgeBg: 'bg-[#FEF3C7] text-[#713F12] border-[#FDE68A] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      };
    }
    return {
      emoji: '✨',
      title: `${segmentName} Segment`,
      containerBg: 'bg-[#FAF8F5] dark:bg-[#181614]',
      containerBorder: 'border-[#EAE5DA] dark:border-stone-800',
      headerText: 'text-[#292524] dark:text-stone-200',
      badgeBg: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
    };
  }, [segmentName]);

  // Compute active categories for this segment (Canonical, Case-Insensitive, No Duplication)
  const activeCategories = useMemo(() => {
    const disabledLower = new Set(disabledCategories.map(c => c.toLowerCase()));
    const discovered = new Set<string>();

    DEFAULT_CATEGORIES.forEach(c => {
      if (!disabledLower.has(c.toLowerCase())) {
        discovered.add(c);
      }
    });

    deliverables.forEach(d => {
      if (d.category) {
        const norm = normalizeCategoryName(d.category);
        if (!disabledLower.has(norm.toLowerCase()) && !disabledLower.has(d.category.toLowerCase())) {
          discovered.add(norm);
        }
      }
    });

    return Array.from(discovered);
  }, [deliverables, disabledCategories]);

  // Categories configured in settings that are not yet active in this segment
  const availableToAdd = useMemo(() => {
    const activeLower = new Set(activeCategories.map(c => c.toLowerCase()));
    const allKnown = Array.from(new Set([...DEFAULT_CATEGORIES, ...studioCategories]));
    return allKnown.filter(c => !activeLower.has(c.toLowerCase()));
  }, [activeCategories, studioCategories]);

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
    <div className={`space-y-4 ${segmentConfig.containerBg} p-4 sm:p-5 rounded-2xl border ${segmentConfig.containerBorder} shadow-xs`}>
      {/* ── SEGMENT HEADER (CLICKABLE ACCORDION TRIGGER) ── */}
      <div 
        onClick={() => setIsCollapsed(prev => !prev)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE5DA] dark:border-stone-800 cursor-pointer select-none group/header hover:bg-amber-50/20 -mx-1 px-1 rounded-xl transition"
        title={isCollapsed ? `Click to expand ${segmentName}` : `Click to collapse ${segmentName}`}
      >
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

        {/* Right Segment Controls: Remove Segment & Accordion Arrow */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 self-end sm:self-auto"
        >
          {onRemoveSegment && (
            <button
              type="button"
              onClick={() => setShowDeleteSegConfirm(true)}
              className="px-2.5 py-1.5 text-xs font-bold text-stone-500 hover:text-rose-600 bg-white dark:bg-stone-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-[#EAE5DA] dark:border-stone-800 hover:border-rose-300 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title={`Remove ${segmentName} segment`}
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove Segment</span>
            </button>
          )}

          {/* Accordion Toggle Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(prev => !prev);
            }}
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 text-slate-500 hover:text-amber-600 dark:text-stone-400 hover:border-amber-300 transition cursor-pointer shadow-2xs"
            title={isCollapsed ? `Expand ${segmentName}` : `Collapse ${segmentName}`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-stone-400' : 'rotate-0 text-amber-600 dark:text-amber-400'}`} />
          </button>
        </div>
      </div>

      {/* ── STACKED FULL-WIDTH CATEGORY SECTIONS (ACCORDION COLLAPSIBLE) ── */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 pt-1"
          >
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
            const catDeliverables = deliverables.filter(d => normalizeCategoryName(d.category) === cat);
            return (
              <DeliverableCategorySection
                key={`${segmentName}_${cat}`}
                segment={segmentName}
                category={cat}
                items={catDeliverables}
                teamMembers={teamMembers}
                onUpdateItem={onUpdateItem}
                onUpdateItemFields={onUpdateItemFields}
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
                      Configured Categories
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
          </motion.div>
        )}
      </AnimatePresence>

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

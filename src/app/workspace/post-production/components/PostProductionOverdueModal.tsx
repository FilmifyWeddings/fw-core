'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, X, Search, ChevronRight, Calendar, User, Film, CheckCircle2, Clock
} from 'lucide-react';

export interface OverdueDeliverableItem {
  projectId: string;
  clientName: string;
  deliverableId: string;
  title: string;
  segment: string;
  category: string;
  specs: string | number | null;
  dueDate: string;
  daysOverdue: number;
  assignedTo: string;
  pmName: string;
}

export interface PostProductionOverdueModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueItems: OverdueDeliverableItem[];
  onSelectProject: (projectId: string) => void;
}

export default function PostProductionOverdueModal({
  isOpen,
  onClose,
  overdueItems,
  onSelectProject,
}: PostProductionOverdueModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return overdueItems;
    const q = searchQuery.toLowerCase().trim();
    return overdueItems.filter(item => 
      item.clientName.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.segment.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.assignedTo.toLowerCase().includes(q) ||
      item.pmName.toLowerCase().includes(q)
    );
  }, [overdueItems, searchQuery]);

  // Unique affected projects count
  const affectedProjectsCount = useMemo(() => {
    const set = new Set(overdueItems.map(i => i.projectId));
    return set.size;
  }, [overdueItems]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 font-sans select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          {/* 3D Cream Center Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#FFFDF9] dark:bg-[#181614] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-[#EAE5DA] dark:border-stone-800 overflow-hidden"
          >
            {/* Top Accent Strip */}
            <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

            {/* Modal Header */}
            <div className="p-6 border-b border-[#EAE5DA] dark:border-stone-800 flex items-start justify-between gap-4 bg-gradient-to-r from-rose-50/40 via-[#FFFDF9] to-amber-50/30 dark:from-stone-900 dark:via-[#181614] dark:to-stone-900">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-black text-slate-900 dark:text-stone-100 tracking-tight">
                      Delayed &amp; Overdue Deliverables
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      {overdueItems.length} {overdueItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-stone-400 mt-0.5 font-medium">
                    {affectedProjectsCount} {affectedProjectsCount === 1 ? 'project' : 'projects'} with deliverables past their target due date. Click any item to jump directly to it.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search Bar */}
            {overdueItems.length > 3 && (
              <div className="px-6 py-3 border-b border-[#EAE5DA] dark:border-stone-800 bg-[#FAF7F0] dark:bg-stone-900/60 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by client, deliverable title, PM, or editor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 dark:text-stone-200 placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Modal Body - Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[55vh]">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                  {overdueItems.length === 0 ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h4 className="text-base font-black text-slate-900 dark:text-stone-100">
                        All Deliverables Are On Track!
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-stone-400 max-w-sm">
                        Great job! There are currently no deliverables past their target due date.
                      </p>
                    </>
                  ) : (
                    <>
                      <Search className="w-8 h-8 text-slate-400" />
                      <p className="text-xs text-slate-500 font-semibold">No overdue items match "{searchQuery}"</p>
                    </>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const formattedDate = (() => {
                    try {
                      const d = new Date(item.dueDate);
                      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                    } catch (_) {
                      return item.dueDate;
                    }
                  })();

                  return (
                    <div
                      key={`${item.projectId}-${item.deliverableId}`}
                      onClick={() => onSelectProject(item.projectId)}
                      className="group p-4 rounded-2xl bg-white dark:bg-[#1A1816] border border-[#EAE5DA] dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left Item Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Client Name */}
                          <span className="text-sm font-black text-slate-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.clientName}
                          </span>

                          {/* Segment Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            item.segment === 'Pre-Wedding'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                          }`}>
                            {item.segment}
                          </span>

                          {/* Category Badge */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-400 border border-slate-200 dark:border-stone-700">
                            {item.category}
                          </span>
                        </div>

                        {/* Deliverable Title & Specs */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-stone-200">
                          <span className="truncate">{item.title}</span>
                          {item.specs && (
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 shrink-0">
                              {item.specs}
                            </span>
                          )}
                        </div>

                        {/* Metadata Row: PM & Editor */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-stone-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-amber-600" />
                            <span>PM: <strong className="text-slate-700 dark:text-stone-300 font-bold">{item.pmName}</strong></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Film className="w-3.5 h-3.5 text-slate-400" />
                            <span>Assigned: <strong className="text-slate-700 dark:text-stone-300 font-bold">{item.assignedTo}</strong></span>
                          </span>
                        </div>
                      </div>

                      {/* Right Overdue Pill & Jump Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE5DA] dark:border-stone-800">
                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span className="text-xs font-black whitespace-nowrap">
                            {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} late
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-stone-500 font-medium">
                          Due: {formattedDate}
                        </span>

                        <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                          <span>View Card</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EAE5DA] dark:border-stone-800 bg-[#FAF7F0] dark:bg-[#151412] flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-stone-400 font-medium">
                Showing {filteredItems.length} of {overdueItems.length} overdue deliverables
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-slate-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-slate-100 dark:hover:bg-stone-700 border border-[#EAE5DA] dark:border-stone-700 shadow-2xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

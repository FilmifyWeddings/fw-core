'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, X, Sparkles } from 'lucide-react';
import { 
  PostProductionStatusSetting, 
  fetchPostProductionSettings, 
  savePostProductionSettings,
  DEFAULT_POST_PRODUCTION_STATUSES
} from '@/lib/post-production-settings';

interface ThreeDStatusSelectProps {
  currentStatus: string;
  statuses?: PostProductionStatusSetting[];
  workspaceId: string;
  onChange: (statusName: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const STATUS_PALETTE = [
  '#f59e0b', // Amber
  '#0ea5e9', // Sky Blue
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#64748b', // Slate
];

export default function ThreeDStatusSelect({
  currentStatus,
  statuses,
  workspaceId,
  onChange,
  className = '',
  size = 'sm',
}: ThreeDStatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allStatuses, setAllStatuses] = useState<PostProductionStatusSetting[]>(() => {
    return statuses && statuses.length > 0 ? statuses : DEFAULT_POST_PRODUCTION_STATUSES;
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(STATUS_PALETTE[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (statuses && statuses.length > 0) {
      setAllStatuses(statuses);
    }
  }, [statuses]);

  // Floating coordinates calculator for portal
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = isAddingNew ? 290 : 230;
    const dropdownWidth = 224; // w-56 is 14rem = 224px

    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlipAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const top = shouldFlipAbove 
      ? Math.max(10, rect.top - dropdownHeight - 6)
      : Math.min(window.innerHeight - dropdownHeight - 10, rect.bottom + 6);

    const left = Math.max(10, Math.min(rect.left, window.innerWidth - dropdownWidth - 10));

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
    });
  }, [isAddingNew]);

  // Recalculate coordinates when opened or when adding new status
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleResizeOrScroll = () => {
        updateCoords();
      };
      window.addEventListener('resize', handleResizeOrScroll, { passive: true });
      window.addEventListener('scroll', handleResizeOrScroll, { passive: true });
      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    }
  }, [isOpen, updateCoords]);

  // Click outside to close (handles portal safely)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && triggerRef.current.contains(target)
      ) {
        return;
      }
      if (
        portalRef.current && portalRef.current.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setIsAddingNew(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isNone = !currentStatus || currentStatus.trim() === '' || currentStatus.toLowerCase() === 'none' || currentStatus.toLowerCase() === 'unset';

  const activeSetting = isNone
    ? { id: 'none', name: 'None', color: '#78716c' }
    : allStatuses.find(
        s => s.name.toLowerCase() === (currentStatus || '').toLowerCase()
      ) || {
        id: 'unknown',
        name: currentStatus,
        color: '#f59e0b',
      };

  const handleSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(name);
    setIsOpen(false);
    setIsAddingNew(false);
  };

  const handleAddNewStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clean = newStatusName.trim();
    if (!clean) return;

    setIsSaving(true);
    try {
      const currentData = await fetchPostProductionSettings(workspaceId);
      const newStatusObj: PostProductionStatusSetting = {
        id: 'st_' + Date.now(),
        name: clean,
        color: newStatusColor,
      };

      const updatedStatuses = [...(currentData.statuses || []), newStatusObj];
      const updatedData = {
        ...currentData,
        statuses: updatedStatuses,
      };

      await savePostProductionSettings(workspaceId, updatedData);
      setAllStatuses(updatedStatuses);
      onChange(clean);
      setNewStatusName('');
      setIsAddingNew(false);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={portalRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="w-56 bg-[#FFFDF9] rounded-2xl border-2 border-amber-300 shadow-2xl overflow-hidden text-stone-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-2.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Workflow Status</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Statuses List */}
          <div className="p-1.5 max-h-48 overflow-y-auto space-y-0.5">
            {/* None / Unset Option */}
            <button
              type="button"
              onClick={(e) => handleSelect('', e)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                isNone
                  ? 'bg-stone-100 text-stone-900 font-black shadow-2xs'
                  : 'hover:bg-white text-stone-600'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-stone-400 bg-stone-200" />
                <span className="truncate italic text-stone-500">None</span>
              </div>
              {isNone && (
                <Check className="w-3.5 h-3.5 text-stone-700 stroke-[3] shrink-0" />
              )}
            </button>

            {allStatuses.map(status => {
              const isSelected = !isNone && status.name.toLowerCase() === (currentStatus || '').toLowerCase();
              return (
                <button
                  key={status.id || status.name}
                  type="button"
                  onClick={(e) => handleSelect(status.name, e)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100/70 text-amber-950 font-black shadow-2xs'
                      : 'hover:bg-white text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="truncate">{status.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-700 stroke-[3] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Inline "+ Add New Status" Engine */}
          <div className="p-2 bg-white border-t border-amber-200/60">
            {isAddingNew ? (
              <form onSubmit={handleAddNewStatus} className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="New status name..."
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-500"
                />

                {/* Color Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STATUS_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStatusColor(c)}
                      className={`w-4 h-4 rounded-full transition cursor-pointer shrink-0 ${
                        newStatusColor === c ? 'ring-2 ring-amber-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-[10px] font-bold text-stone-500 hover:text-stone-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !newStatusName.trim()}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Add Status'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(true);
                  setTimeout(updateCoords, 50);
                }}
                className="w-full py-1.5 px-2 bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 border border-dashed border-amber-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>+ Add New Status</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button with Dynamic Status Color */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-black tracking-tight transition cursor-pointer select-none shadow-2xs hover:shadow-xs border ${
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        style={{
          backgroundColor: isNone ? '#f5f5f4' : `${activeSetting.color}15`,
          color: isNone ? '#78716c' : activeSetting.color,
          borderColor: isNone ? '#d6d3d1' : `${activeSetting.color}50`,
          borderStyle: isNone ? 'dashed' : 'solid',
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: isNone ? '#a8a29e' : activeSetting.color }}
        />
        <span className="truncate max-w-[130px] font-bold">{isNone ? 'None' : activeSetting.name}</span>
        <ChevronDown className="w-3 h-3 opacity-70 ml-0.5 shrink-0" />
      </button>

      {/* Portal Popover: Mounted into document.body to escape any container clipping */}
      {isMounted && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </div>
  );
}

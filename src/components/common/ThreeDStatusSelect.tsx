'use client';

import React, { useState, useRef, useEffect } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statuses && statuses.length > 0) {
      setAllStatuses(statuses);
    }
  }, [statuses]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeSetting = allStatuses.find(
    s => s.name.toLowerCase() === (currentStatus || '').toLowerCase()
  ) || {
    id: 'unknown',
    name: currentStatus || 'Pending',
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

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button with Dynamic Status Color */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full font-black tracking-tight transition cursor-pointer select-none shadow-2xs hover:shadow-xs border ${
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        style={{
          backgroundColor: `${activeSetting.color}15`,
          color: activeSetting.color,
          borderColor: `${activeSetting.color}50`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: activeSetting.color }}
        />
        <span className="truncate max-w-[130px] font-extrabold">{activeSetting.name}</span>
        <ChevronDown className="w-3 h-3 opacity-70 ml-0.5 shrink-0" />
      </button>

      {/* 3D Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 w-56 bg-[#FFFDF9] rounded-2xl border-2 border-amber-300 shadow-xl z-50 overflow-hidden text-stone-900"
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
              {allStatuses.map(status => {
                const isSelected = status.name.toLowerCase() === (currentStatus || '').toLowerCase();
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
                  onClick={() => setIsAddingNew(true)}
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
    </div>
  );
}

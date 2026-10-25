'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, FolderArchive, Layers, Download, CheckSquare, Square } from 'lucide-react';

export interface GalleryCollection {
  id: string;
  name: string;
  photo_count?: number;
  [key: string]: any;
}

interface DownloadSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumTitle: string;
  totalPhotosCount: number;
  collections: GalleryCollection[];
  onConfirmDownload: (selection: { mode: 'all' | 'custom'; collectionIds: string[] }) => void;
  accentColor?: string;
}

export function DownloadSelectionModal({
  isOpen,
  onClose,
  albumTitle,
  totalPhotosCount,
  collections,
  onConfirmDownload,
  accentColor = '#D97706',
}: DownloadSelectionModalProps) {
  const [downloadMode, setDownloadMode] = useState<'all' | 'custom'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selected collections with all collections when opening or switching to custom
  useEffect(() => {
    if (isOpen) {
      setDownloadMode('all');
      setSelectedIds(new Set(collections.map((c) => c.id)));
    }
  }, [isOpen, collections]);

  if (!isOpen) return null;

  const toggleCollection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllCollections = () => {
    setSelectedIds(new Set(collections.map((c) => c.id)));
  };

  const deselectAllCollections = () => {
    setSelectedIds(new Set());
  };

  const calculateSelectedCount = () => {
    if (downloadMode === 'all') return totalPhotosCount;
    let count = 0;
    collections.forEach((col) => {
      if (selectedIds.has(col.id)) {
        count += col.photo_count || 0;
      }
    });
    // Fallback if photo_count is 0 or undefined on sub-events
    return count > 0 ? count : totalPhotosCount;
  };

  const selectedCount = calculateSelectedCount();

  const handleDownloadClick = () => {
    if (downloadMode === 'custom' && selectedIds.size === 0) {
      alert('Please select at least one sub-event to download.');
      return;
    }
    onConfirmDownload({
      mode: downloadMode,
      collectionIds: downloadMode === 'all' ? [] : Array.from(selectedIds),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              <FolderArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-tight">
                Download Photos
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-[240px] sm:max-w-xs">
                {albumTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option Selection: All vs Sub-Events */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDownloadMode('all')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                downloadMode === 'all'
                  ? 'border-2 shadow-xs'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
              }`}
              style={
                downloadMode === 'all'
                  ? { borderColor: accentColor, backgroundColor: `${accentColor}0D` }
                  : {}
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">All Photos</span>
                {downloadMode === 'all' && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {totalPhotosCount} Photos
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDownloadMode('custom');
                if (selectedIds.size === 0) selectAllCollections();
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                downloadMode === 'custom'
                  ? 'border-2 shadow-xs'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
              }`}
              style={
                downloadMode === 'custom'
                  ? { borderColor: accentColor, backgroundColor: `${accentColor}0D` }
                  : {}
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">Sub-Events</span>
                {downloadMode === 'custom' && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {collections.length} Categories
              </span>
            </button>
          </div>

          {/* Sub-Events List (Shown when custom is selected) */}
          {downloadMode === 'custom' && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <span>Select Categories to Include:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllCollections}
                    className="font-bold underline hover:text-zinc-800 cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={deselectAllCollections}
                    className="hover:text-zinc-800 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {collections.map((col) => {
                  const isChecked = selectedIds.has(col.id);
                  return (
                    <label
                      key={col.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'border-zinc-300 bg-zinc-50'
                          : 'border-zinc-100 hover:bg-zinc-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCollection(col.id)}
                          className="w-4 h-4 rounded-md accent-amber-600 text-amber-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-zinc-800">{col.name}</span>
                      </div>
                      {col.photo_count !== undefined && col.photo_count > 0 && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-200">
                          {col.photo_count} photos
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold text-xs transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownloadClick}
            disabled={downloadMode === 'custom' && selectedIds.size === 0}
            className="flex-1 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP ({selectedCount} Photos)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

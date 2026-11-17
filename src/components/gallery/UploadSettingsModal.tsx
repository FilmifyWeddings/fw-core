'use client';

import React, { useRef } from 'react';
import {
  Upload,
  X,
  Check,
  CheckCircle2,
  Info,
} from 'lucide-react';

export type QualityLevel = 30 | 50 | 100;

export interface UploadSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Array<{ id: string; name: string }>;
  targetCollection: string;
  setTargetCollection: (colId: string) => void;
  files: File[];
  onSelectFiles: (files: File[]) => void;
  onClearFiles: () => void;
  onStartUpload: (options?: { qualityLevel?: QualityLevel; includeOriginals?: boolean }) => void;
  isDesktopEngineActive?: boolean;
  duplicateFiles?: File[];
  showDuplicatePrompt?: boolean;
  onSkipDuplicates?: () => void;
  onUploadAllAnyway?: () => void;
}

export function UploadSettingsModal({
  isOpen,
  onClose,
  collections,
  targetCollection,
  setTargetCollection,
  files,
  onSelectFiles,
  onClearFiles,
  onStartUpload,
  duplicateFiles = [],
  showDuplicatePrompt = false,
  onSkipDuplicates,
  onUploadAllAnyway,
}: UploadSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileCount = files.length;

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (files.length === 0) return;
    onStartUpload({
      qualityLevel: 100,
      includeOriginals: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-[#EAE5DA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#EAE5DA]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Upload Photos</h3>
              <p className="text-[11px] text-zinc-500 font-medium">Add photos to your event collection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-[#F2EFE9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Album Selection */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
            Target Collection / Album
          </label>
          <select
            value={targetCollection}
            onChange={(e) => setTargetCollection(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#FAF9F5] rounded-xl border border-[#EAE5DA] text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none focus:border-amber-500 transition"
          >
            <option value="all">Default / Main Album</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onSelectFiles(Array.from(e.dataTransfer.files));
            }
          }}
          className="border-2 border-dashed border-[#D5CFBE] hover:border-amber-500 bg-[#FAF9F5] rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2.5 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mx-auto group-hover:scale-105 transition shadow-2xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-800">
              Click or drag photos here to upload
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Supports high-res JPG, PNG, WebP up to 100MB per file
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onSelectFiles(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />
        </div>

        {/* Duplicate Prompt if any */}
        {showDuplicatePrompt && duplicateFiles.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{duplicateFiles.length} duplicate file{duplicateFiles.length > 1 ? 's' : ''} detected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkipDuplicates}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Skip Duplicates ({duplicateFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={onUploadAllAnyway}
                className="py-1.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs transition cursor-pointer"
              >
                <span>Upload Anyway</span>
              </button>
            </div>
          </div>
        )}

        {/* Selected Photos Count Badge */}
        {fileCount > 0 && (
          <div className="p-2.5 px-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fileCount} {fileCount === 1 ? 'photo' : 'photos'} selected</span>
            </div>
            <button
              type="button"
              onClick={onClearFiles}
              className="text-[10px] text-rose-600 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            disabled={fileCount === 0}
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
          >
            <Upload className="w-4 h-4" />
            <span>
              Start Upload ({fileCount} {fileCount === 1 ? 'Photo' : 'Photos'})
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-full bg-[#FAF7F2] hover:bg-[#F2EFE9] border border-[#EAE5DA] text-zinc-700 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}

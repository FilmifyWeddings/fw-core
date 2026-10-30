'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  X,
  Check,
  CheckCircle2,
  HardDrive,
  Sparkles,
  Zap,
  Info,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Laptop,
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
  onStartUpload: (options: { qualityLevel: QualityLevel; includeOriginals: boolean }) => void;
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
  isDesktopEngineActive = false,
  duplicateFiles = [],
  showDuplicatePrompt = false,
  onSkipDuplicates,
  onUploadAllAnyway,
}: UploadSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quality Slider state: 30 | 50 | 100 (Default is 100% 4K Ultra Sharp)
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>(100);

  // Checkbox for uploading heavy original camera master files (Default is false to save 96% storage & turbo speed)
  const [includeOriginals, setIncludeOriginals] = useState<boolean>(false);

  // Dynamic calculations based on photo count
  const fileCount = files.length;

  const stats = useMemo(() => {
    // Average camera raw/jpg master size ~20 MB
    const totalOriginalBytes = files.reduce((acc, f) => acc + f.size, 0) || (fileCount * 20 * 1024 * 1024);
    const avgOriginalMb = totalOriginalBytes > 0 ? totalOriginalBytes / (1024 * 1024) : fileCount * 20;

    let perPhotoCompressedKb = 650; // 100% 4K WebP
    let qualityTitle = '4K Ultra HD Sharpness';
    let resolutionDesc = '3840px (Ultra 4K UHD)';
    let visualDesc = 'Same resolution as camera sensor. Retains full sharpness, eyelashes & fabric details with 85% reduced size.';

    if (qualityLevel === 30) {
      perPhotoCompressedKb = 180;
      qualityTitle = 'Web Fast / Proofing';
      resolutionDesc = '1600px (Light HD)';
      visualDesc = 'Ultra-light previews for instant WhatsApp sharing and quick mobile client proofing. Lowest cloud storage.';
    } else if (qualityLevel === 50) {
      perPhotoCompressedKb = 380;
      qualityTitle = 'HD Balanced';
      resolutionDesc = '2560px (2.5K QHD)';
      visualDesc = 'Balanced clarity for laptops, social media, and client tablets with fast streaming.';
    }

    const compressedMb = (fileCount * perPhotoCompressedKb) / 1024;
    const finalUploadMb = includeOriginals ? (avgOriginalMb + compressedMb) : compressedMb;
    const storageSavedPercent = includeOriginals ? 0 : Math.round(((avgOriginalMb - compressedMb) / Math.max(avgOriginalMb, 1)) * 100);

    // Assume 12.5 MB/s (100 Mbps broadband upload)
    const estimatedSeconds = Math.max(2, Math.round(finalUploadMb / 12.5));
    const estimatedTimeStr = estimatedSeconds < 60 
      ? `~${estimatedSeconds} sec`
      : `~${Math.round(estimatedSeconds / 60)} min`;

    return {
      qualityTitle,
      resolutionDesc,
      visualDesc,
      perPhotoCompressedKb,
      compressedMb: compressedMb.toFixed(1),
      finalUploadMb: finalUploadMb > 1024 ? `${(finalUploadMb / 1024).toFixed(1)} GB` : `${finalUploadMb.toFixed(1)} MB`,
      storageSavedPercent,
      estimatedTimeStr,
    };
  }, [fileCount, files, qualityLevel, includeOriginals]);

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val <= 40) setQualityLevel(30);
    else if (val <= 75) setQualityLevel(50);
    else setQualityLevel(100);
  };

  const handleSubmit = () => {
    if (files.length === 0) return;
    onStartUpload({
      qualityLevel,
      includeOriginals,
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
              <h3 className="text-sm font-black text-zinc-900 tracking-tight">Upload &amp; Storage Optimization</h3>
              <p className="text-[11px] text-zinc-500 font-medium">Add photos with smart 4K compression and zero PC load</p>
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
          className="border-2 border-dashed border-[#D5CFBE] hover:border-amber-500 bg-[#FAF9F5] rounded-2xl p-5 text-center cursor-pointer transition-all space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center mx-auto group-hover:scale-105 transition">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-800">
              Click or drag photos here to upload
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
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
              <span>{fileCount} photos selected</span>
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

        {/* ── 4K QUALITY & COMPRESSION STUDIO (SLIDER + PRESETS) ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#FAF7F2] to-[#F5EFE6] border border-[#EAE5DA] space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Photo Compression &amp; Quality
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] font-black tracking-wide">
              {qualityLevel === 100 ? '100% (4K Ultra)' : `${qualityLevel}% Preset`}
            </span>
          </div>

          {/* 3-Step Slider Track */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <input
                type="range"
                min="30"
                max="100"
                step="1"
                value={qualityLevel}
                onChange={handleSliderChange}
                className="w-full h-2 bg-[#EAE5DA] rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 pt-1.5 px-1">
                <button
                  type="button"
                  onClick={() => setQualityLevel(30)}
                  className={`cursor-pointer transition ${qualityLevel === 30 ? 'text-amber-700 font-black scale-105' : 'hover:text-zinc-800'}`}
                >
                  30% (Web Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setQualityLevel(50)}
                  className={`cursor-pointer transition ${qualityLevel === 50 ? 'text-amber-700 font-black scale-105' : 'hover:text-zinc-800'}`}
                >
                  50% (HD Balanced)
                </button>
                <button
                  type="button"
                  onClick={() => setQualityLevel(100)}
                  className={`cursor-pointer transition ${qualityLevel === 100 ? 'text-amber-700 font-black scale-105' : 'hover:text-zinc-800'}`}
                >
                  ★ 100% (4K Ultra Sharp)
                </button>
              </div>
            </div>

            {/* Quality Summary Box */}
            <div className="p-3 rounded-xl bg-white/90 border border-[#EAE5DA] flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 font-black text-xs">
                {qualityLevel}%
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900">{stats.qualityTitle}</span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">~{stats.perPhotoCompressedKb} KB / photo</span>
                </div>
                <p className="text-[10.5px] text-zinc-600 leading-snug">
                  {stats.visualDesc}
                </p>
                <p className="text-[10px] font-mono text-amber-800 pt-0.5">
                  Resolution: {stats.resolutionDesc}
                </p>
              </div>
            </div>
          </div>

          {/* ── ORIGINAL CAMERA MASTER FILES CHECKBOX ── */}
          <div className="pt-2 border-t border-[#EAE5DA]/80">
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={includeOriginals}
                onChange={(e) => setIncludeOriginals(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 border-zinc-300 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
              />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900 group-hover:text-amber-800 transition">
                    Upload Original Camera Master Files (15–25 MB / photo)
                  </span>
                  {includeOriginals && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[9px] font-black uppercase">
                      Heavy Master Sync
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-zinc-500 leading-tight">
                  {includeOriginals
                    ? 'Original camera master files will be uploaded alongside 4K previews for large 30×40 inch album printing. Takes more time & storage.'
                    : 'Unchecked: Saves ~96% cloud storage! Only pristine 4K Web photos will be stored. Perfect for client galleries, mobile downloads & social sharing.'}
                </p>
              </div>
            </label>
          </div>

          {/* Live Data & Speed Estimation Bar */}
          {fileCount > 0 && (
            <div className="p-2.5 px-3 rounded-xl bg-white/70 border border-[#EAE5DA] flex items-center justify-between text-[11px] font-medium text-zinc-700">
              <div className="flex items-center gap-1.5 font-bold">
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span>Estimated Upload: <strong className="text-zinc-900">{stats.finalUploadMb}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>{stats.estimatedTimeStr} on 100 Mbps</span>
              </div>
            </div>
          )}
        </div>

        {/* Zero PC Load Assurance */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 font-medium">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span>0% PC Load • GPU/Web Worker Thread</span>
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Direct-to-B2 Presigned Upload</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={fileCount === 0}
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 disabled:from-zinc-300 disabled:to-zinc-300 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
          >
            <Upload className="w-4 h-4" />
            <span>
              {includeOriginals
                ? `Start Master Upload (${fileCount} Photos)`
                : `Start Turbo 4K Upload (${fileCount} Photos)`}
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

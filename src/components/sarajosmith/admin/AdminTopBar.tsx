'use client';

import React from 'react';
import Link from 'next/link';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';

export const AdminTopBar: React.FC = () => {
  const {
    isEditModeActive,
    setIsEditModeActive,
    saveConfig,
    resetToDefaults,
    isSavedToastVisible,
  } = useSaraJoSmith();

  return (
    <>
      {/* Fixed Top Bar */}
      <div className="sticky top-0 left-0 right-0 z-50 bg-[#292421] text-[#EFECE3] border-b border-amber-500/30 px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-sjs-body">
        {/* Left: Brand Badge & Edit Mode Switch */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-amber-950/80 px-2.5 py-1 rounded-sm border border-amber-600/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-amber-200 text-[11px]">
              CMS Admin Mode
            </span>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer select-none bg-black/30 px-2.5 py-1 rounded-sm border border-white/10 hover:border-white/20">
            <input
              type="checkbox"
              checked={isEditModeActive}
              onChange={(e) => setIsEditModeActive(e.target.checked)}
              className="accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px] tracking-wide text-zinc-300">
              Visual Edit Highlights: <strong className={isEditModeActive ? 'text-amber-400' : 'text-zinc-400'}>{isEditModeActive ? 'ON' : 'OFF'}</strong>
            </span>
          </label>
        </div>

        {/* Center Helper Guide */}
        <div className="hidden md:flex items-center space-x-2 text-[11px] text-zinc-400">
          <span>💡</span>
          <span>Click any <strong>Text</strong> to edit & change font size | Hover <strong>Images</strong> to replace photo</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all customized text, font sizes, and photos to original defaults?')) {
                resetToDefaults();
              }
            }}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xs transition-colors text-[11px] cursor-pointer"
          >
            Reset to Defaults
          </button>

          <button
            type="button"
            onClick={saveConfig}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xs font-bold transition-all shadow-xs text-[11px] tracking-wide flex items-center space-x-1.5 cursor-pointer"
          >
            <span>💾</span>
            <span>Save Changes</span>
          </button>

          <Link
            href="/sarajosmith"
            target="_blank"
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xs transition-colors text-[11px] flex items-center space-x-1"
            title="Open the clean public view in a new tab"
          >
            <span>Public Site</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Floating Save Notification Toast */}
      {isSavedToastVisible && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#292421] text-emerald-400 border border-emerald-500/50 shadow-2xl px-5 py-3 rounded-xs flex items-center space-x-3 font-sjs-body text-xs animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-base">✓</span>
          <div>
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">
              Changes Saved Successfully!
            </p>
            <p className="text-zinc-300 text-[10px]">
              Your customized text, font sizes, and photos are saved and updated live on the public site.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

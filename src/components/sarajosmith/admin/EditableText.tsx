'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSaraJoSmith, getDeep, DeviceType } from '@/context/SaraJoSmithContext';

interface EditableTextProps {
  path: string; // e.g. 'intro.heading' or 'services.storyHeading'
  elementKey: string; // e.g. 'intro-heading' for unique font size tracking
  fallbackText?: string;
  defaultSizePx?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
  path,
  elementKey,
  fallbackText = '',
  defaultSizePx,
  as: Component = 'p',
  className = '',
  style = {},
  multiline = false,
}) => {
  const {
    config,
    isAdmin,
    isEditModeActive,
    selectedElement,
    setSelectedElement,
    updateText,
    updateFontSize,
    getEffectiveFontSize,
    targetEditDevice,
    setTargetEditDevice,
  } = useSaraJoSmith();

  const [isEditing, setIsEditing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rawValue = getDeep(config, path, fallbackText);
  const textValue = typeof rawValue === 'string' ? rawValue : fallbackText;
  const currentFontSize = getEffectiveFontSize(elementKey, defaultSizePx);

  const [draftText, setDraftText] = useState(textValue);
  const [draftSize, setDraftSize] = useState<number>(currentFontSize || defaultSizePx || 16);

  useEffect(() => {
    setDraftText(textValue);
  }, [textValue]);

  useEffect(() => {
    if (currentFontSize) {
      setDraftSize(currentFontSize);
    }
  }, [currentFontSize]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement({
      path,
      elementKey,
      label: path.split('.').pop() || 'Text Element',
      text: textValue,
      defaultSizePx: currentFontSize || defaultSizePx || 16,
      multiline,
    });
    setIsEditing(true);
  };

  const handleTextChange = (val: string) => {
    setDraftText(val);
    updateText(path, val);
  };

  const handleSizeChange = (newSize: number) => {
    setDraftSize(newSize);
    updateFontSize(elementKey, newSize, targetEditDevice);
  };

  const handleApply = () => {
    updateText(path, draftText);
    if (draftSize) {
      updateFontSize(elementKey, draftSize, targetEditDevice);
    }
    setIsEditing(false);
  };

  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(currentFontSize ? { fontSize: `${currentFontSize}px` } : {}),
  };

  // 1. PUBLIC VISITOR VIEW (100% clean, no edit borders or buttons)
  if (!isAdmin || !isEditModeActive) {
    return (
      <Component className={className} style={dynamicStyle}>
        {textValue}
      </Component>
    );
  }

  const isSelected = selectedElement?.elementKey === elementKey;

  // 2. ADMIN EDIT VIEW (Interactive on click/hover with studio sync)
  return (
    <div className="relative inline-block w-full group/edit">
      <Component
        onClick={handleSelect}
        className={`${className} cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'outline-2 outline-amber-600 bg-amber-500/15 ring-2 ring-amber-500/80 rounded-2xs'
            : 'outline-1 outline-dashed outline-transparent group-hover/edit:outline-amber-600/70 group-hover/edit:bg-amber-500/10 rounded-2xs'
        }`}
        style={dynamicStyle}
        title="Click to edit text & font size (synced with Left Studio Inspector)"
      >
        {textValue}
      </Component>

      {/* Subtle Edit Badge icon on hover */}
      <button
        onClick={handleSelect}
        className="absolute -top-3 -right-3 z-30 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-amber-700 text-white p-1 rounded-full shadow-md hover:bg-amber-800 text-[10px] flex items-center justify-center w-5 h-5 cursor-pointer"
        title="Edit text in Inspector"
        aria-label="Edit text"
      >
        ✏️
      </button>

      {/* Floating Popover Editor for quick inline changes */}
      {isEditing && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[#FAF8F5] border-2 border-amber-600/50 shadow-2xl rounded-sm p-4 text-[#292421] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#292421]/15">
            <span className="font-sjs-body text-xs uppercase tracking-wider font-bold text-amber-900 flex items-center space-x-1.5">
              <span>✏️</span>
              <span>Edit Text & Font Size</span>
            </span>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-[#292421]/60 hover:text-[#292421] font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Device Targeting Selector inside popover */}
          <div className="mb-3 bg-amber-100/50 p-2 rounded-xs border border-amber-600/20 flex items-center justify-between text-[11px] font-sjs-body">
            <span className="text-[#292421]/80 font-semibold">Target Device:</span>
            <select
              value={targetEditDevice}
              onChange={(e) => setTargetEditDevice(e.target.value as DeviceType)}
              className="bg-white border border-amber-600/40 text-amber-950 font-semibold rounded-xs px-2 py-0.5 text-[10px] focus:outline-none cursor-pointer"
            >
              <option value="all">🌐 All Devices</option>
              <option value="desktop">💻 Desktop Only</option>
              <option value="tablet">📱 Tablet Only</option>
              <option value="mobile">📱 Mobile Only</option>
            </select>
          </div>

          {/* Text Editor Input */}
          <div className="mb-4">
            <label className="block font-sjs-body text-[10px] uppercase tracking-wider text-[#292421]/70 mb-1 font-semibold">
              Text Content:
            </label>
            {multiline ? (
              <textarea
                rows={3}
                value={draftText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full bg-white border border-[#292421]/20 rounded-xs p-2 text-xs font-sjs-body text-[#292421] focus:outline-none focus:border-amber-600 resize-y"
              />
            ) : (
              <input
                type="text"
                value={draftText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full bg-white border border-[#292421]/20 rounded-xs px-2.5 py-1.5 text-xs font-sjs-body text-[#292421] focus:outline-none focus:border-amber-600"
              />
            )}
          </div>

          {/* Font Size Adjuster (+ / - and Slider) */}
          <div className="mb-4 bg-white/80 p-2.5 rounded-xs border border-[#292421]/10">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-sjs-body text-[10px] uppercase tracking-wider text-[#292421]/70 font-semibold">
                Font Size ({targetEditDevice.toUpperCase()}):
              </label>
              <span className="font-sjs-body text-xs font-bold text-amber-900">
                {draftSize}px
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSizeChange(Math.max(9, draftSize - 1))}
                className="w-7 h-7 rounded-xs border border-[#292421]/20 bg-zinc-100 hover:bg-zinc-200 text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <input
                type="range"
                min={10}
                max={72}
                value={draftSize}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="flex-1 accent-amber-700 h-1.5 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleSizeChange(Math.min(96, draftSize + 1))}
                className="w-7 h-7 rounded-xs border border-[#292421]/20 bg-zinc-100 hover:bg-zinc-200 text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs font-sjs-body text-[#292421]/70 hover:text-[#292421] rounded-xs border border-transparent cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-sjs-body uppercase tracking-wider bg-amber-800 text-white rounded-xs hover:bg-amber-900 font-medium shadow-xs cursor-pointer"
            >
              Apply Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

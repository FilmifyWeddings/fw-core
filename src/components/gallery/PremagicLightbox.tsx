'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Star,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';

export interface LightboxPhoto {
  id: string;
  original_key?: string;
  preview_key?: string;
  preview_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  face_count?: number;
  confidencePercent?: number;
}

interface PremagicLightboxProps {
  photos: LightboxPhoto[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload?: (photo: LightboxPhoto) => Promise<void> | void;
  onToggleSelect?: (photoId: string) => void;
  isSelected?: boolean;
  onSetCover?: (photo: LightboxPhoto) => void;
  isCover?: boolean;
  onDelete?: (photoId: string) => void;
  allowDownloads?: boolean;
}

export function PremagicLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDownload,
  onToggleSelect,
  isSelected = false,
  onSetCover,
  isCover = false,
  onDelete,
  allowDownloads = true,
}: PremagicLightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = currentIndex !== null && photos[currentIndex] ? photos[currentIndex] : null;

  // Reset zoom on slide change
  useEffect(() => {
    setIsZoomed(false);
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex === null || photos.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    onNavigate(prevIdx);
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex === null || photos.length === 0) return;
    const nextIdx = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    onNavigate(nextIdx);
  }, [currentIndex, photos.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'z' || e.key === 'Z') {
        setIsZoomed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handlePrev, handleNext, onClose]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || isZoomed) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    setTouchDeltaX(deltaX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || isZoomed) return;
    const currentY = e.changedTouches[0].clientY;
    const deltaY = currentY - (touchStartY || 0);

    // Swipe down to close
    if (deltaY > 120 && Math.abs(touchDeltaX) < 80) {
      onClose();
      setTouchStartX(null);
      setTouchStartY(null);
      setTouchDeltaX(0);
      return;
    }

    // Horizontal swipe threshold: 50px
    if (touchDeltaX < -50) {
      handleNext();
    } else if (touchDeltaX > 50) {
      handlePrev();
    }

    setTouchStartX(null);
    setTouchStartY(null);
    setTouchDeltaX(0);
  };

  const handleDownloadClick = async () => {
    if (!currentPhoto || !onDownload || isDownloading) return;
    setIsDownloading(true);
    try {
      await onDownload(currentPhoto);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleZoom = () => {
    setIsZoomed((prev) => !prev);
  };

  if (currentIndex === null || !currentPhoto) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP ACTION BAR */}
      <div className="flex items-center justify-between p-3 sm:p-5 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Counter & Selection */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
            {currentIndex + 1} / {photos.length}
          </span>

          {onToggleSelect && (
            <button
              onClick={() => onToggleSelect(currentPhoto.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-white/10 text-zinc-300 hover:bg-white/20 border-white/10'
              }`}
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>{isSelected ? 'Selected' : 'Select'}</span>
            </button>
          )}

          {currentPhoto.confidencePercent && (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-950/80 text-[11px] font-black text-emerald-300 border border-emerald-500/40">
              ✓ {currentPhoto.confidencePercent}% Match
            </span>
          )}
        </div>

        {/* Right: Actions (Zoom, Download, Cover, Delete, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Toggle */}
          <button
            onClick={toggleZoom}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isZoomed
                ? 'bg-amber-500 text-white border-amber-400'
                : 'bg-white/10 text-zinc-300 hover:bg-white/20 border-white/10'
            }`}
            title="Toggle Smart HD Zoom (Z)"
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            <span className="hidden sm:inline">{isZoomed ? 'Reset Zoom' : 'Zoom HD'}</span>
          </button>

          {/* Set Cover Action */}
          {onSetCover && (
            <button
              onClick={() => onSetCover(currentPhoto)}
              className={`p-2 rounded-xl transition cursor-pointer border ${
                isCover
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-white/10 text-zinc-300 hover:bg-white/20 border-white/10'
              }`}
              title={isCover ? 'Cover Photo' : 'Set as Event Cover'}
            >
              <Star className={`w-4 h-4 ${isCover ? 'fill-white' : ''}`} />
            </button>
          )}

          {/* High-Res Download */}
          {allowDownloads && onDownload && (
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="Download Original High-Res"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download HD</span>
            </button>
          )}

          {/* Delete Photo Action */}
          {onDelete && (
            <button
              onClick={() => onDelete(currentPhoto.id)}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-zinc-300 hover:text-white transition cursor-pointer border border-white/10"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer border border-white/10 ml-1"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN VIEWPORT WITH TOUCH SLIDER */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Left Arrow (Desktop) */}
        <button
          onClick={handlePrev}
          className="hidden md:flex absolute left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white items-center justify-center backdrop-blur-md transition cursor-pointer hover:scale-105 active:scale-95"
          title="Previous Photo (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Photo Canvas */}
        <div
          className="relative max-h-[82vh] max-w-full flex items-center justify-center transition-transform duration-300 overflow-hidden"
          style={{
            transform: `translateX(${touchDeltaX * 0.4}px)`,
          }}
          onDoubleClick={toggleZoom}
        >
          <img
            src={currentPhoto.preview_url}
            alt="Full Preview"
            draggable={false}
            className={`max-h-[82vh] max-w-[95vw] sm:max-w-[85vw] object-contain rounded-2xl transition-all duration-300 ${
              isZoomed ? 'scale-[2.2] cursor-grab active:cursor-grabbing shadow-2xl' : 'cursor-zoom-in shadow-xl'
            }`}
          />
        </div>

        {/* Right Arrow (Desktop) */}
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white items-center justify-center backdrop-blur-md transition cursor-pointer hover:scale-105 active:scale-95"
          title="Next Photo (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* 3. BOTTOM THUMBNAIL FILMSTRIP */}
      <div className="p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20">
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-4xl mx-auto scrollbar-thin">
          {photos.map((p, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={p.id}
                onClick={() => onNavigate(idx)}
                className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-amber-500 scale-105 ring-2 ring-amber-400/50 opacity-100'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={p.thumbnail_url || p.preview_url}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

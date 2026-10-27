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
  Heart,
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
  isSelectionMode?: boolean;
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
  isSelectionMode = false,
  onSetCover,
  isCover = false,
  onDelete,
  allowDownloads = true,
}: PremagicLightboxProps) {
  // Multi-level zoom scale (1 = normal, up to 3.5x)
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isDownloading, setIsDownloading] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentPhoto = currentIndex !== null && photos[currentIndex] ? photos[currentIndex] : null;

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Prevent background gallery scroll while lightbox is open
  useEffect(() => {
    if (currentIndex !== null) {
      const origOverflow = document.body.style.overflow;
      const origTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = origOverflow;
        document.body.style.touchAction = origTouchAction;
      };
    }
  }, [currentIndex]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex]);

  // Reset zoom & pan when navigating to another slide
  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [currentIndex]);

  // Aggressive Next/Prev Image Preloading for instant millisecond transitions
  useEffect(() => {
    if (currentIndex === null || photos.length === 0) return;
    const preload = (url?: string) => {
      if (!url) return;
      const img = new Image();
      img.src = url;
    };
    if (currentIndex < photos.length - 1) {
      preload(photos[currentIndex + 1].preview_url);
      if (currentIndex < photos.length - 2) preload(photos[currentIndex + 2].preview_url);
    }
    if (currentIndex > 0) {
      preload(photos[currentIndex - 1].preview_url);
      if (currentIndex > 1) preload(photos[currentIndex - 2].preview_url);
    }
  }, [currentIndex, photos]);

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

  // Zoom controls
  const handleZoomIn = () => {
    setZoomScale((prev) => {
      if (prev < 1.75) return 1.75;
      if (prev < 2.5) return 2.5;
      return 3.5;
    });
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      if (prev > 2.5) return 2.5;
      if (prev > 1.75) return 1.75;
      setPanOffset({ x: 0, y: 0 });
      return 1;
    });
  };

  const toggleZoom = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (zoomScale === 1) handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (zoomScale === 1) handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, zoomScale, handlePrev, handleNext, onClose]);

  // Mouse Pan when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for swipe (at 1x) & pan (at >1x)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (zoomScale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y,
        };
      } else {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
        setTouchDeltaX(0);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (zoomScale > 1 && isDragging) {
        setPanOffset({
          x: e.touches[0].clientX - dragStartRef.current.x,
          y: e.touches[0].clientY - dragStartRef.current.y,
        });
      } else if (touchStartX !== null && zoomScale === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        setTouchDeltaX(deltaX);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoomScale > 1) {
      setIsDragging(false);
      return;
    }

    if (touchStartX === null) return;
    const currentY = e.changedTouches[0]?.clientY || 0;
    const deltaY = currentY - (touchStartY || 0);

    // Swipe down to close
    if (deltaY > 120 && Math.abs(touchDeltaX) < 80) {
      onClose();
      setTouchStartX(null);
      setTouchStartY(null);
      setTouchDeltaX(0);
      return;
    }

    // Horizontal swipe threshold: 45px for ultra-responsive feel
    if (touchDeltaX < -35) {
      handleNext();
    } else if (touchDeltaX > 35) {
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

  if (currentIndex === null || !currentPhoto) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-150"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP ACTION BAR (Clean Icon-Only Buttons, Counter, Close) */}
      <div className="flex items-center justify-between p-3 sm:p-5 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-zinc-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        {/* Right: Actions (Zoom In, Zoom Out, Cover, Download, Close - ALL ICON ONLY) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out Button (Icon Only) */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 1}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Zoom In Button (Icon Only) */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 3.5}
            className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer border ${
              zoomScale > 1
                ? 'bg-amber-500 text-white border-amber-400'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Set Cover Action */}
          {onSetCover && (
            <button
              type="button"
              onClick={() => onSetCover(currentPhoto)}
              className={`p-2 sm:p-2.5 rounded-full transition cursor-pointer border ${
                isCover
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-white/10 text-zinc-300 hover:bg-white/20 border-white/15'
              }`}
              title={isCover ? 'Cover Photo' : 'Set as Event Cover'}
            >
              <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${isCover ? 'fill-white' : ''}`} />
            </button>
          )}

          {/* High-Res Original Download (Icon Only, No text) */}
          {allowDownloads && onDownload && (
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="p-2 sm:p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center justify-center cursor-pointer shadow-md disabled:opacity-50"
              title="Download Original High-Res Photo"
            >
              {isDownloading ? (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}

          {/* Delete Photo Action */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(currentPhoto.id)}
              className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-rose-600 text-zinc-300 hover:text-white transition cursor-pointer border border-white/15"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition cursor-pointer border border-white/15 ml-1"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN VIEWPORT WITH HARDWARE-ACCELERATED PAN & ZOOM */}
      <div
        className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Left Arrow (Desktop) */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="flex absolute left-2 sm:left-6 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white items-center justify-center backdrop-blur-md transition cursor-pointer active:scale-90 shadow-xl"
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Photo Canvas Container */}
        <div
          className={`relative max-h-[85vh] max-w-full flex items-center justify-center select-none ${
            zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
          style={{
            transform: zoomScale > 1
              ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`
              : `translate3d(${touchDeltaX * 0.4}px, 0, 0)`,
            transition: isDragging ? 'none' : 'transform 200ms ease-out',
          }}
          onDoubleClick={toggleZoom}
        >
          {/* Main Photo with High-Priority Decoding for Millisecond Display */}
          <img
            key={currentPhoto.id}
            src={currentPhoto.preview_url}
            alt="Full Preview"
            draggable={false}
            decoding="async"
            className="max-h-[84vh] max-w-[96vw] sm:max-w-[88vw] object-contain rounded-2xl shadow-2xl pointer-events-none"
          />
        </div>

        {/* Right Arrow (Desktop) */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="flex absolute right-2 sm:right-6 z-30 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white items-center justify-center backdrop-blur-md transition cursor-pointer active:scale-90 shadow-xl"
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* 3. BOTTOM THUMBNAIL STRIP & SELECTION CONTROL (Mobile & Desktop) */}
      <div className="z-30 w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-2 pb-3 px-3 flex flex-col items-center gap-2 select-none">
        {/* Heart Selection Button in Album Selection Mode */}
        {isSelectionMode && onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(currentPhoto.id);
            }}
            className="px-5 py-2 rounded-full bg-black/80 hover:bg-black border border-white/25 transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl cursor-pointer flex items-center gap-2 text-white"
            title={isSelected ? 'Remove from Selection' : 'Select for Album'}
          >
            <Heart
              className={`w-4 h-4 transition-transform duration-200 ${
                isSelected
                  ? 'fill-[#DC2626] text-[#DC2626] scale-110 drop-shadow-[0_2px_8px_rgba(220,38,38,0.9)]'
                  : 'fill-transparent text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
              }`}
            />
            <span className="text-xs font-bold tracking-wide">
              {isSelected ? 'Selected for Album' : 'Select Photo'}
            </span>
          </button>
        )}

        {/* Horizontal Thumbnail Carousel Strip */}
        {photos.length > 1 && (
          <div
            ref={thumbnailContainerRef}
            className="flex items-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto no-scrollbar py-1 px-2 select-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {photos.map((p, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={p.id || idx}
                  ref={isActive ? activeThumbRef : null}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(idx);
                  }}
                  className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'w-11 h-11 sm:w-14 sm:h-14 ring-2 ring-amber-400 border-2 border-white scale-105 opacity-100 z-10 shadow-lg'
                      : 'w-9 h-9 sm:w-12 sm:h-12 opacity-45 hover:opacity-80 border border-white/20'
                  }`}
                  title={`Photo ${idx + 1}`}
                >
                  <img
                    src={p.thumbnail_url || p.preview_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

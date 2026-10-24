'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Heart, Download } from 'lucide-react';
import { ProgressiveSmoothImage } from './ProgressiveSmoothImage';

export interface PhotoItem {
  id: string;
  gallery_id?: string;
  collection_id?: string | null;
  original_key?: string;
  preview_key?: string;
  thumbnail_key?: string;
  preview_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  face_count?: number;
  [key: string]: any;
}

interface JustifiedGalleryProps {
  photos: PhotoItem[];
  layoutConfig: {
    style: 'justified' | 'masonry';
    gap: number;
    cornerRadius: number;
  };
  isSelectionMode?: boolean;
  selectedForAlbum?: Set<string>;
  isSelectionSubmitted?: boolean;
  effectiveMaxSelectionLimit?: number | null;
  selectorEmail?: string;
  onPhotoClick: (photo: PhotoItem, index: number) => void | Promise<void>;
  onToggleSelect?: (photo: PhotoItem) => void | Promise<void>;
  onDownloadPhoto: (photo: PhotoItem) => void | Promise<void>;
  onRequestSelectorModal?: () => void;
}

interface JustifiedRowItem {
  photo: PhotoItem;
  originalIndex: number;
  width: number;
  height: number;
}

interface JustifiedRow {
  items: JustifiedRowItem[];
  height: number;
}

export function JustifiedGalleryLayout({
  photos,
  layoutConfig,
  isSelectionMode = false,
  selectedForAlbum = new Set(),
  isSelectionSubmitted = false,
  effectiveMaxSelectionLimit = null,
  selectorEmail = '',
  onPhotoClick,
  onToggleSelect,
  onDownloadPhoto,
  onRequestSelectorModal,
}: JustifiedGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setContainerWidth(w);
      }
    };

    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateWidth();
      });
      observer.observe(containerRef.current);
    } else {
      window.addEventListener('resize', updateWidth);
    }

    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const gap = layoutConfig.gap ?? 12;
  const cornerRadius = layoutConfig.cornerRadius ?? 12;

  // Responsive target row height for Justified Gallery algorithm
  const targetRowHeight = useMemo(() => {
    if (containerWidth < 640) return 175; // Mobile: 2-3 photos per row
    if (containerWidth < 1024) return 230; // Tablet: 3-4 photos per row
    return 290; // Desktop: balanced, elegant, never oversized
  }, [containerWidth]);

  // Justified Gallery Algorithm (miromannino / Google Photos style)
  const justifiedRows = useMemo(() => {
    if (layoutConfig.style !== 'justified' || photos.length === 0 || containerWidth <= 0) {
      return [];
    }

    const rows: JustifiedRow[] = [];
    let currentRow: Array<{ photo: PhotoItem; originalIndex: number; aspectRatio: number }> = [];
    let currentRowAspectSum = 0;

    photos.forEach((photo, idx) => {
      // Calculate or default aspect ratio (width / height)
      let ar = 1.33; // default landscape 4:3
      if (photo.width && photo.height && photo.height > 0) {
        ar = photo.width / photo.height;
        // Clamp extreme panoramas or extreme tall crops between 0.5 (tall vertical) and 2.5 (wide pano)
        ar = Math.max(0.5, Math.min(2.5, ar));
      }

      currentRow.push({ photo, originalIndex: idx, aspectRatio: ar });
      currentRowAspectSum += ar;

      // Available width when this row is filled
      const rowGapTotal = (currentRow.length - 1) * gap;
      const expectedTotalWidth = currentRowAspectSum * targetRowHeight + rowGapTotal;

      // If this batch meets or exceeds container width, lock the row and calculate exact height
      if (expectedTotalWidth >= containerWidth) {
        const availableWidth = containerWidth - rowGapTotal;
        const exactHeight = Math.max(120, Math.round(availableWidth / currentRowAspectSum));

        // Assign exact widths
        const rowItems: JustifiedRowItem[] = currentRow.map((item) => ({
          photo: item.photo,
          originalIndex: item.originalIndex,
          width: Math.round(item.aspectRatio * exactHeight),
          height: exactHeight,
        }));

        rows.push({ items: rowItems, height: exactHeight });

        currentRow = [];
        currentRowAspectSum = 0;
      }
    });

    // Handle remaining photos in the last row
    if (currentRow.length > 0) {
      // For the last incomplete row, keep targetRowHeight so images don't stretch unnaturally
      const lastRowItems: JustifiedRowItem[] = currentRow.map((item) => ({
        photo: item.photo,
        originalIndex: item.originalIndex,
        width: Math.round(item.aspectRatio * targetRowHeight),
        height: targetRowHeight,
      }));
      rows.push({ items: lastRowItems, height: targetRowHeight });
    }

    return rows;
  }, [photos, layoutConfig.style, containerWidth, targetRowHeight, gap]);

  const handleSelectClick = (e: React.MouseEvent, photo: PhotoItem) => {
    e.stopPropagation();
    if (isSelectionSubmitted) return;
    if (!selectorEmail && onRequestSelectorModal) {
      onRequestSelectorModal();
      return;
    }
    if (onToggleSelect) {
      onToggleSelect(photo);
    }
  };

  return (
    <div ref={containerRef} className="w-full transition-all duration-300">
      {/* ─────────────────────────────────────────────────────────────
          MODE A: TRUE JUSTIFIED GALLERY (Flickr / Google Photos style)
          Rows are 100% flush, heights are balanced, never gigantic
      ───────────────────────────────────────────────────────────── */}
      {layoutConfig.style === 'justified' ? (
        <div className="flex flex-col w-full" style={{ gap: `${gap}px` }}>
          {justifiedRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center w-full overflow-hidden"
              style={{
                gap: `${gap}px`,
                height: `${row.height}px`,
              }}
            >
              {row.items.map((item) => {
                const isSelected = selectedForAlbum.has(item.photo.id);
                return (
                  <div
                    key={item.photo.id}
                    onClick={() => onPhotoClick(item.photo, item.originalIndex)}
                    className={`group relative overflow-hidden bg-zinc-100 border transition-all duration-300 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'border-rose-500 ring-4 ring-rose-500/25 shadow-xl'
                        : 'border-[#E7E2D8] hover:shadow-lg'
                    }`}
                    style={{
                      width: `${item.width}px`,
                      height: `${row.height}px`,
                      borderRadius: `${cornerRadius}px`,
                    }}
                  >
                    <ProgressiveSmoothImage
                      src={item.photo.preview_url || item.photo.thumbnail_url || ''}
                      thumbnailSrc={item.photo.thumbnail_url}
                      alt={item.photo.title || 'Wedding photo'}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />

                    {/* Animated Heart Icon Button for Photo Selection */}
                    {isSelectionMode && (
                      <button
                        type="button"
                        disabled={isSelectionSubmitted}
                        onClick={(e) => handleSelectClick(e, item.photo)}
                        className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isSelectionSubmitted
                            ? isSelected
                              ? 'bg-rose-600 text-white ring-2 ring-white cursor-not-allowed opacity-90'
                              : 'hidden'
                            : isSelected
                            ? 'bg-rose-600 text-white ring-2 ring-white shadow-lg shadow-rose-600/50 scale-105 active:scale-95 animate-in zoom-in-90'
                            : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md active:scale-90 hover:scale-105'
                        }`}
                        title={isSelected ? 'Remove from selection' : 'Select for album'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected ? 'fill-white text-white scale-110' : 'text-white'
                          }`}
                        />
                      </button>
                    )}

                    {/* Hover Vignette & Download Action (No Face Count Badge) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadPhoto(item.photo);
                        }}
                        className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                        title="Download Photo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           MODE B: MASONRY COLUMNS (Pinterest Style)
           Mobile: strictly 2 columns (never 1 giant photo covering the screen)
           Tablet: 3 columns | Desktop: 4 balanced columns
        ───────────────────────────────────────────────────────────── */
        <div
          className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-4"
          style={{ columnGap: `${gap}px` }}
        >
          {photos.map((photo, idx) => {
            const isSelected = selectedForAlbum.has(photo.id);
            return (
              <div
                key={photo.id}
                onClick={() => onPhotoClick(photo, idx)}
                className={`break-inside-avoid group relative overflow-hidden bg-zinc-100 border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 ring-4 ring-rose-500/25 shadow-xl'
                    : 'border-[#E7E2D8] hover:shadow-lg'
                }`}
                style={{
                  borderRadius: `${cornerRadius}px`,
                  marginBottom: `${gap}px`,
                }}
              >
                <ProgressiveSmoothImage
                  src={photo.preview_url || photo.thumbnail_url || ''}
                  thumbnailSrc={photo.thumbnail_url}
                  alt={photo.title || 'Wedding photo'}
                  aspectRatio={photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined}
                  className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />

                {/* Animated Heart Icon Button for Photo Selection */}
                {isSelectionMode && (
                  <button
                    type="button"
                    disabled={isSelectionSubmitted}
                    onClick={(e) => handleSelectClick(e, photo)}
                    className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isSelectionSubmitted
                        ? isSelected
                          ? 'bg-rose-600 text-white ring-2 ring-white cursor-not-allowed opacity-90'
                          : 'hidden'
                        : isSelected
                        ? 'bg-rose-600 text-white ring-2 ring-white shadow-lg shadow-rose-600/50 scale-105 active:scale-95 animate-in zoom-in-90'
                        : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md active:scale-90 hover:scale-105'
                    }`}
                    title={isSelected ? 'Remove from selection' : 'Select for album'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'fill-white text-white scale-110' : 'text-white'
                      }`}
                    />
                  </button>
                )}

                {/* Hover Vignette & Download Action (No Face Count Badge) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadPhoto(photo);
                    }}
                    className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                    title="Download Photo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

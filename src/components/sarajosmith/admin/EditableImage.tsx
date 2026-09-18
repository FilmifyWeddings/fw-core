'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith, getDeep } from '@/context/SaraJoSmithContext';

interface EditableImageProps {
  path: string; // dot path in config, e.g. 'intro.mainImage.url'
  fallbackSrc: string;
  alt: string;
  label?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  priority?: boolean;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  path,
  fallbackSrc,
  alt,
  label,
  fill = true,
  width,
  height,
  className = 'object-cover',
  style,
  sizes,
  priority = false,
}) => {
  const { config, isAdmin, isEditModeActive, setActiveImageEdit } = useSaraJoSmith();

  const currentSrc = getDeep(config, path, fallbackSrc) || fallbackSrc;

  // 1. PUBLIC VIEW (100% clean Next.js Image, no edit overlays)
  if (!isAdmin || !isEditModeActive) {
    if (fill) {
      return (
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={className}
          style={style}
          sizes={sizes}
          priority={priority}
        />
      );
    }
    return (
      <Image
        src={currentSrc}
        alt={alt}
        width={width || 300}
        height={height || 300}
        className={className}
        style={style}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  // 2. ADMIN EDIT VIEW (Allows replacing image on hover/click)
  return (
    <div className="relative w-full h-full group/img cursor-pointer">
      {fill ? (
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={`${className} transition-opacity duration-200 group-hover/img:opacity-85`}
          style={style}
          sizes={sizes}
          priority={priority}
        />
      ) : (
        <Image
          src={currentSrc}
          alt={alt}
          width={width || 300}
          height={height || 300}
          className={`${className} transition-opacity duration-200 group-hover/img:opacity-85`}
          style={style}
          sizes={sizes}
          priority={priority}
        />
      )}

      {/* Admin Replace Button Overlay */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveImageEdit({
            path,
            currentUrl: currentSrc,
            label: label || alt || 'Photograph',
          });
        }}
        className="absolute inset-0 m-auto w-max h-max px-3 py-1.5 bg-black/80 hover:bg-amber-900 text-white rounded-full text-[11px] font-sjs-body tracking-wider uppercase opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 shadow-xl flex items-center space-x-1.5 z-30 cursor-pointer border border-white/30"
        title="Click to replace image"
      >
        <span>📷</span>
        <span>Replace Photo</span>
      </button>
    </div>
  );
};

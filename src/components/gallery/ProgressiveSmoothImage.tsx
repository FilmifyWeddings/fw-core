'use client';

import React, { useState } from 'react';

interface ProgressiveSmoothImageProps {
  src: string;
  thumbnailSrc?: string;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  aspectRatio?: string | number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export function ProgressiveSmoothImage({
  src,
  thumbnailSrc,
  alt = 'Wedding Photo',
  className = '',
  wrapperClassName = '',
  aspectRatio,
  onClick,
  onError,
}: ProgressiveSmoothImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
      className={`relative w-full overflow-hidden bg-zinc-900/10 ${wrapperClassName}`}
    >
      {/* 1. Subtle Shimmer Pulse Skeleton while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200/60 via-zinc-100/40 to-zinc-200/60 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 animate-pulse z-0 pointer-events-none" />
      )}

      {/* 2. Micro Blurred Preview while Full Res Loads */}
      {thumbnailSrc && !isLoaded && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-105 opacity-60 pointer-events-none transition-opacity duration-300"
        />
      )}

      {/* 3. Main Image with Millisecond Smooth Blur-Up / Fade-In Transition */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setIsLoaded(true);
          if (onError) onError(e);
        }}
        className={`${className} transition-all duration-700 ease-out ${
          isLoaded
            ? 'opacity-100 filter blur-0 scale-100'
            : 'opacity-0 filter blur-xl scale-105'
        }`}
      />
    </div>
  );
}

export default ProgressiveSmoothImage;

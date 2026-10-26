'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GalleryShareCenterPage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;

  useEffect(() => {
    if (galleryId) {
      router.replace(`/workspace/gallery/${galleryId}?modal=share`);
    }
  }, [galleryId, router]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-zinc-500 text-xs font-bold">
      Redirecting to Gallery Share Center...
    </div>
  );
}

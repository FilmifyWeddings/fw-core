'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import GalleryDesignStudio from '@/components/gallery/GalleryDesignStudio';
import { useWorkspace } from '@/lib/context/BhamstraContext';

export default function GalleryDesignStandalonePage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;
  const { workspaceId } = useWorkspace();

  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGalleryAndPhotos() {
      if (!galleryId) return;
      setLoading(true);
      try {
        // 1. Fetch gallery details
        const galRes = await fetch(`/api/gallery/events?id=${encodeURIComponent(galleryId)}`);
        const galJson = await galRes.json();
        const gal = galJson?.gallery || (Array.isArray(galJson?.events) ? galJson.events[0] : null);

        if (!gal) {
          setError('Event gallery not found.');
          setLoading(false);
          return;
        }

        setGallery(gal);

        // 2. Fetch event photos for cover selection
        try {
          const pRes = await fetch(`/api/gallery/photos?gallery_id=${encodeURIComponent(galleryId)}&limit=50`);
          const pJson = await pRes.json();
          if (Array.isArray(pJson?.photos)) {
            setPhotos(pJson.photos);
          }
        } catch (_) {}
      } catch (err: any) {
        setError(err.message || 'Failed to load design studio');
      } finally {
        setLoading(false);
      }
    }

    fetchGalleryAndPhotos();
  }, [galleryId]);

  if (loading) {
    return <StudioCoreLiquidLoader label="Loading Visual Design Studio..." fullscreen={true} />;
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-black text-zinc-900">Design Studio Unavailable</h2>
        <p className="text-sm text-zinc-500 max-w-md">{error || 'Could not find gallery event.'}</p>
        <button
          onClick={() => router.push(`/workspace/gallery/${galleryId}`)}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold"
        >
          Return to Gallery Overview
        </button>
      </div>
    );
  }

  return (
    <GalleryDesignStudio
      gallery={gallery}
      photos={photos}
      isStandalonePage={true}
      onUpdateGallery={(updated) => setGallery(updated)}
    />
  );
}

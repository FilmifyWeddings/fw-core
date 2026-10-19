'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function GallerySettingsSubpage() {
  const params = useParams();
  const router = useRouter();
  const galleryId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) as string;

  useEffect(() => {
    if (galleryId) {
      router.replace(`/workspace/gallery/${galleryId}?tab=settings`);
    }
  }, [galleryId, router]);

  return <StudioCoreLiquidLoader label="Opening Gallery Settings..." fullscreen={true} />;
}

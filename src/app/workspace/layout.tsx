'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { UploadQueueProvider } from '@/context/UploadQueueContext';
import { UploadManagerDrawer } from '@/components/gallery/UploadManagerDrawer';
import { ReviewUploadProvider } from '@/context/ReviewUploadContext';
import { ReviewUploadDrawer } from '@/components/review/ReviewUploadDrawer';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const { isOwner, activeWorkspace, loading } = useWorkspace();

  useEffect(() => {
    if (loading) return;

    // Strict Partner / Crew Member Lockdown
    if (!isOwner) {
      // Normal studio dashboard /workspace or owner-only routes must be completely inaccessible to non-owners
      const currentPath = pathname || '';
      const isOwnerOnlyWorkspaceRoute = 
        currentPath === '/workspace' || 
        currentPath === '/workspace/' ||
        currentPath.startsWith('/workspace/team') ||
        currentPath.startsWith('/workspace/finance') ||
        currentPath.startsWith('/workspace/settings') ||
        currentPath.startsWith('/workspace/integrations') ||
        currentPath.startsWith('/workspace/clients');

      if (isOwnerOnlyWorkspaceRoute) {
        const studioCode = activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || '';
        const targetUrl = studioCode 
          ? `/assigned-shoots?studio=${encodeURIComponent(studioCode)}`
          : '/assigned-shoots';
        router.replace(targetUrl);
      }
    }
  }, [isOwner, loading, pathname, activeWorkspace, router]);

  // If non-owner on a restricted route, show loader while redirecting
  if (!loading && !isOwner) {
    const currentPath = pathname || '';
    const isOwnerOnlyWorkspaceRoute = 
      currentPath === '/workspace' || 
      currentPath === '/workspace/' ||
      currentPath.startsWith('/workspace/team') ||
      currentPath.startsWith('/workspace/finance') ||
      currentPath.startsWith('/workspace/settings') ||
      currentPath.startsWith('/workspace/integrations') ||
      currentPath.startsWith('/workspace/clients');

    if (isOwnerOnlyWorkspaceRoute) {
      return <StudioCoreLiquidLoader label="Redirecting to your workspace..." />;
    }
  }

  return (
    <UploadQueueProvider>
      <ReviewUploadProvider>
        {children}
        <UploadManagerDrawer />
        <ReviewUploadDrawer />
      </ReviewUploadProvider>
    </UploadQueueProvider>
  );
}

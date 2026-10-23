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
  const { isOwner, activeWorkspace, loading, permissions } = useWorkspace();

  const userPerms = permissions || activeWorkspace?.permissions;
  const hasClientsAccess = Boolean(userPerms?.clients_access && userPerms.clients_access !== 'NONE');
  const hasFinanceAccess = Boolean(userPerms?.finance_access && userPerms.finance_access !== 'NONE');

  const checkIsOwnerOnlyRoute = (currentPath: string) => {
    if (currentPath === '/workspace' || currentPath === '/workspace/') return true;
    if (currentPath.startsWith('/workspace/team')) return true;
    if (currentPath.startsWith('/workspace/settings')) return true;
    if (currentPath.startsWith('/workspace/integrations')) return true;
    if (currentPath.startsWith('/workspace/finance') && !hasFinanceAccess) return true;
    if (currentPath.startsWith('/workspace/clients') && !hasClientsAccess) return true;
    return false;
  };

  useEffect(() => {
    if (loading) return;

    // Strict Partner / Crew Member Lockdown
    if (!isOwner) {
      // Normal studio dashboard /workspace or owner-only routes must be completely inaccessible to non-owners
      const currentPath = pathname || '';
      const isOwnerOnlyWorkspaceRoute = checkIsOwnerOnlyRoute(currentPath);

      if (isOwnerOnlyWorkspaceRoute) {
        const studioCode = activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || '';
        const targetUrl = studioCode 
          ? `/assigned-shoots?studio=${encodeURIComponent(studioCode)}`
          : '/assigned-shoots';
        router.replace(targetUrl);
      }
    }
  }, [isOwner, loading, pathname, activeWorkspace, router, hasClientsAccess, hasFinanceAccess]);

  // If non-owner on a restricted route, show loader while redirecting
  if (!loading && !isOwner) {
    const currentPath = pathname || '';
    const isOwnerOnlyWorkspaceRoute = checkIsOwnerOnlyRoute(currentPath);

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

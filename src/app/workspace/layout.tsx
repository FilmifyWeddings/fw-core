'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import { UploadQueueProvider } from '@/context/UploadQueueContext';
import { UploadManagerDrawer } from '@/components/gallery/UploadManagerDrawer';
import { ReviewUploadProvider } from '@/context/ReviewUploadContext';
import { ReviewUploadDrawer } from '@/components/review/ReviewUploadDrawer';
import { WorkspaceHydrationGate } from '@/components/auth/WorkspaceHydrationGate';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const { isOwner, activeWorkspace, loading, permissions, userId } = useWorkspace();

  const userPerms = permissions || activeWorkspace?.permissions;
  const hasClientsAccess = Boolean(userPerms?.clients_access && userPerms.clients_access !== 'NONE');
  const hasFinanceAccess = Boolean(userPerms?.finance_access && userPerms.finance_access !== 'NONE');

  const checkIsOwnerOnlyRoute = (currentPath: string) => {
    if (currentPath === '/workspace' || currentPath === '/workspace/') return true;
    if (currentPath.startsWith('/workspace/team')) return true;
    if (currentPath.startsWith('/workspace/settings')) return true;
    if (currentPath.startsWith('/workspace/integrations')) return true;
    if (currentPath.startsWith('/workspace/gallery')) return true;
    if (currentPath.startsWith('/workspace/storage')) return true;
    if (currentPath.startsWith('/workspace/attendance')) return true;
    if (currentPath.startsWith('/workspace/finance') && !hasFinanceAccess) return true;
    if (currentPath.startsWith('/workspace/clients') && !hasClientsAccess) return true;
    return false;
  };

  useEffect(() => {
    if (loading) return;

    let isCancelled = false;
    const verifyAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isCancelled) return;
        if (!session?.user) {
          router.replace('/login?redirectTo=' + encodeURIComponent(pathname || '/workspace'));
        }
      } catch (_) {}
    };

    if (!activeWorkspace && !userId) {
      verifyAuth();
    }

    // Strict Partner / Crew Member Lockdown
    if (!isOwner) {
      // Normal studio dashboard /workspace or owner-only routes must be completely inaccessible to non-owners
      const currentPath = pathname || '';
      const isOwnerOnlyWorkspaceRoute = checkIsOwnerOnlyRoute(currentPath);

      if (isOwnerOnlyWorkspaceRoute) {
        const studioCode = activeWorkspace?.studioSlug || activeWorkspace?.workspaceId || '';
        let targetUrl = '/team/dashboard';
        if (currentPath.startsWith('/workspace/attendance')) {
          targetUrl = studioCode ? `/team/attendance?studio=${encodeURIComponent(studioCode)}` : '/team/attendance';
        } else {
          targetUrl = studioCode ? `/team/dashboard?studio=${encodeURIComponent(studioCode)}` : '/team/dashboard';
        }
        router.replace(targetUrl);
      }
    }
  }, [isOwner, loading, pathname, activeWorkspace, router, hasClientsAccess, hasFinanceAccess]);

  // If non-owner on a restricted route, show loader while redirecting
  if (!loading && activeWorkspace && !isOwner) {
    const currentPath = pathname || '';
    const isOwnerOnlyWorkspaceRoute = checkIsOwnerOnlyRoute(currentPath);

    if (isOwnerOnlyWorkspaceRoute) {
      return <StudioCoreLiquidLoader label="Redirecting to your workspace..." />;
    }
  }

  return (
    <UploadQueueProvider>
      <ReviewUploadProvider>
        <WorkspaceHydrationGate>
          {children}
        </WorkspaceHydrationGate>
        <UploadManagerDrawer />
        <ReviewUploadDrawer />
      </ReviewUploadProvider>
    </UploadQueueProvider>
  );
}

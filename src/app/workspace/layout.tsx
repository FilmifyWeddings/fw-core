'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOwner, activeWorkspace, loading } = useWorkspace();

  useEffect(() => {
    if (loading) return;

    // Strict Partner / Crew Member Lockdown
    if (!isOwner) {
      // Normal studio dashboard /workspace or owner-only routes must be completely inaccessible to non-owners
      const isOwnerOnlyWorkspaceRoute = 
        pathname === '/workspace' || 
        pathname === '/workspace/' ||
        pathname.startsWith('/workspace/team') ||
        pathname.startsWith('/workspace/finance') ||
        pathname.startsWith('/workspace/settings') ||
        pathname.startsWith('/workspace/integrations') ||
        pathname.startsWith('/workspace/clients');

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
    const isOwnerOnlyWorkspaceRoute = 
      pathname === '/workspace' || 
      pathname === '/workspace/' ||
      pathname.startsWith('/workspace/team') ||
      pathname.startsWith('/workspace/finance') ||
      pathname.startsWith('/workspace/settings') ||
      pathname.startsWith('/workspace/integrations') ||
      pathname.startsWith('/workspace/clients');

    if (isOwnerOnlyWorkspaceRoute) {
      return <StudioCoreLiquidLoader label="Redirecting to your partner portal..." />;
    }
  }

 return <>{children}</>;
}

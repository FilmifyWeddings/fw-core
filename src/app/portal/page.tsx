'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

function PortalRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const studio = searchParams?.get('studio') || searchParams?.get('ws') || '';
    const query = studio ? `?studio=${encodeURIComponent(studio)}` : '';
    router.replace(`/workspace/partner-portal${query}`);
  }, [router, searchParams]);

  return <StudioCoreLiquidLoader label="Redirecting to Partner Portal..." />;
}

export default function PortalRedirectPage() {
  return (
    <Suspense fallback={<StudioCoreLiquidLoader label="Loading Partner Portal..." />}>
      <PortalRedirectContent />
    </Suspense>
  );
}

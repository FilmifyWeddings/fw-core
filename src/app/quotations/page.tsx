'use client';

import React, { Suspense } from 'react';
import WorkspaceQuotationsGalleryPage from '../workspace/quotations/page';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function QuotationsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#FBFCEB] flex items-center justify-center p-4">
        <StudioCoreLiquidLoader />
      </div>
    }>
      <WorkspaceQuotationsGalleryPage />
    </Suspense>
  );
}

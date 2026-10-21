'use client';

import React, { Suspense } from 'react';
import ReviewProjectsPage from '@/app/workspace/review/page';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function WorkflowsVideoReviewPage(props: any) {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0E0F12] flex items-center justify-center p-4">
        <StudioCoreLiquidLoader />
      </div>
    }>
      <ReviewProjectsPage {...props} />
    </Suspense>
  );
}

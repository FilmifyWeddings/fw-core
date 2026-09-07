'use client';

import React, { Suspense } from 'react';
import TeamManagerPage from '@/app/team-manager/page';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function AssignedShootsPage() {
  return (
    <Suspense fallback={<StudioCoreLiquidLoader label="Loading Assigned Shoots..." />}>
      <TeamManagerPage />
    </Suspense>
  );
}

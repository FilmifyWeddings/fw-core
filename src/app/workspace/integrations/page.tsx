'use client';

import React, { Suspense } from 'react';
import DashboardIntegrationsPage from '@/app/dashboard/integrations/page';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';

export default function WorkspaceIntegrationsPage() {
  return (
    <Suspense fallback={<StudioCoreLiquidLoader label="Loading Integrations..." />}>
      <DashboardIntegrationsPage />
    </Suspense>
  );
}

'use client';

import React, { Suspense } from 'react';
import DashboardIntegrationsPage from '@/app/dashboard/integrations/page';

export default function WorkspaceIntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
        Loading Integrations Center...
      </div>
    }>
      <DashboardIntegrationsPage />
    </Suspense>
  );
}

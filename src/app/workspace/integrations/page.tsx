'use client';

import React, { Suspense } from 'react';
import IntegrationsPage from '@/app/integrations/page';

export default function WorkspaceIntegrationsWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121110] flex items-center justify-center text-white text-xs font-bold">
        Loading Integrations...
      </div>
    }>
      <IntegrationsPage />
    </Suspense>
  );
}

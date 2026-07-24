import IntegrationsPage from '@/app/integrations/page';
import { Suspense } from 'react';

export default function WorkspaceIntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
        Loading Integrations Hub...
      </div>
    }>
      <IntegrationsPage />
    </Suspense>
  );
}

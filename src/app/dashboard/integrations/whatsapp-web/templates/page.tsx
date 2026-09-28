'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { WhatsappTemplates } from '@/components/integrations/whatsapp-templates';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WhatsAppTemplatesPage() {
  const { workspaceId, userId } = useBhamstra();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'all';

  // Synchronous client-side check so it never flashes or defaults to 0 on page refresh
  const [localWsId, setLocalWsId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sc_active_workspace_id') || localStorage.getItem('active_workspace_id') || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sc_active_workspace_id') || localStorage.getItem('active_workspace_id');
      if (stored && stored !== localWsId) {
        setLocalWsId(stored);
      }
    }
  }, [workspaceId, localWsId]);

  const effectiveWorkspaceId = (workspaceId && workspaceId !== 'all') 
    ? workspaceId 
    : (localWsId || userId || MOCK_WORKSPACE_ID);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <WhatsappTemplates workspaceId={effectiveWorkspaceId} shootType={category} />
    </div>
  );
}

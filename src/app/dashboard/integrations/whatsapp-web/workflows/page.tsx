'use client';

import React from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { WhatsappWorkflowBuilder } from '@/components/integrations/whatsapp-workflow-builder';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WhatsAppWorkflowsHubPage() {
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <WhatsappWorkflowBuilder workspaceId={tenantId} />
    </div>
  );
}

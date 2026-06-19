'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { WhatsappTemplates } from '@/components/integrations/whatsapp-templates';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WhatsAppTemplatesPage() {
  const { userId } = useBhamstra();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'all';

  return (
    <div className="max-w-7xl mx-auto p-6">
      <WhatsappTemplates workspaceId={userId || MOCK_WORKSPACE_ID} shootType={category} />
    </div>
  );
}

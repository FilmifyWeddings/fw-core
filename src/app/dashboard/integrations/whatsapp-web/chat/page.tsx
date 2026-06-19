'use client';

import React from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { BaileysWhatsappWeb } from '@/components/integrations/baileys/baileys-whatsapp-web';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WhatsAppChatPage() {
  const { userId } = useBhamstra();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <BaileysWhatsappWeb workspaceId={userId || MOCK_WORKSPACE_ID} />
    </div>
  );
}

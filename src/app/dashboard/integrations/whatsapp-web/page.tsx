'use client';

import React from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { BaileysQrConnect } from '@/components/integrations/baileys/baileys-qr-connect';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export default function WhatsAppDevicePage() {
  const { userId } = useBhamstra();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <BaileysQrConnect workspaceId={userId || MOCK_WORKSPACE_ID} />
    </div>
  );
}

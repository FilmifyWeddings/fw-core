'use client';

import React from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { BaileysQrConnect } from '@/components/integrations/baileys/baileys-qr-connect';

export default function WhatsAppDevicePage() {
  const { userId, workspaceId, loading } = useBhamstra();

  if (loading || (!userId && !workspaceId)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]"></div>
      </div>
    );
  }

  const activeWs = (workspaceId && workspaceId !== 'all') ? workspaceId : userId;

  return (
    <BaileysQrConnect workspaceId={activeWs!} />
  );
}

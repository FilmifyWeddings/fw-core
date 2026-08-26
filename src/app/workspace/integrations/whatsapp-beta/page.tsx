'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function WhatsAppBetaRedirect() {
  const router = useRouter();

  // Redirect to official stable Baileys WhatsApp integration
  useEffect(() => {
    router.replace('/dashboard/integrations/whatsapp-web');
  }, [router]);

  return (
    <div className="h-screen bg-[#0b141a] flex flex-col items-center justify-center text-white space-y-4 p-6">
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-sm font-semibold text-zinc-300">Redirecting to WhatsApp Web Integration...</p>
      <Link 
        href="/dashboard/integrations/whatsapp-web"
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl transition-all"
      >
        Click here if not redirected
      </Link>
    </div>
  );
}

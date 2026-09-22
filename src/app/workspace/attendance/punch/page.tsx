'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function WorkspacePunchRedirect() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonalLink();
  }, []);

  const fetchPersonalLink = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        // Fallback for demo
        window.location.href = '/attendance/demo_staff_token';
        return;
      }

      // Call /api/team/attendance/me to resolve personal link for logged-in crew/owner
      const res = await fetch('/api/team/attendance/me');
      const data = await res.json();

      if (data?.success && data.secureToken) {
        window.location.href = `/attendance/${data.secureToken}`;
        return;
      }

      // If no direct personal link, check if owner
      window.location.href = '/team/attendance';
    } catch (err: any) {
      setError(err.message || 'Unable to resolve personal punch token');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <RefreshCw className="w-8 h-8 text-[#C89435] animate-spin mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#211B17]">Redirecting to Smart Punch...</h2>
        <p className="text-xs text-[#746E67] mt-1">Connecting to your personal selfie & geo-attendance portal.</p>

        {error && (
          <div className="mt-4 p-3 bg-[#FFEBEE] text-[#C62828] text-xs rounded-[10px]">
            {error}
            <div className="mt-2">
              <Link href="/workspace/attendance" className="font-bold underline">
                Return to Workforce Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

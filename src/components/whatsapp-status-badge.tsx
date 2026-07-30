'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  workspaceId: string;
  className?: string;
  showLabel?: boolean;
}

export function WhatsappStatusBadge({ workspaceId, className = '', showLabel = true }: Props) {
  const [state, setState] = useState<'open' | 'connecting' | 'disconnected' | 'expired' | 'loading'>('loading');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch('/api/integrations/baileys/qr-status', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const d = await res.json();
            if (isMounted) {
              if (d.isConnected || d.conn_state === 'open' || d.status === 'CONNECTED') {
                setState('open');
              } else if (d.conn_state) {
                setState(d.conn_state as any);
              } else {
                setState('disconnected');
              }
            }
          }
        } else if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
          const { data } = await supabase
            .from('baileys_sessions')
            .select('conn_state')
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          if (data?.conn_state && isMounted) setState(data.conn_state as any);
          else if (isMounted) setState('disconnected');
        }
      } catch {
        if (isMounted) setState('disconnected');
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);

    const channel = supabase
      .channel(`wa-status-badge-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baileys_sessions', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const payloadWsId = (payload.new as any)?.workspace_id;
          if (payloadWsId && workspaceId && payloadWsId !== workspaceId) return;

          const newState = (payload.new as any)?.conn_state;
          if (newState && isMounted) setState(newState as any);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  if (state === 'loading') return null;

  const isConnected = state === 'open';
  const isConnecting = state === 'connecting';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={`WhatsApp: ${state.toUpperCase()}`}>
      <span
        className={`relative inline-flex w-2 h-2 rounded-full ${
          isConnected ? 'bg-emerald-400' : isConnecting ? 'bg-amber-400' : 'bg-red-500'
        }`}
      >
        {isConnected && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
        )}
        {isConnecting && (
          <span className="absolute inset-0 rounded-full bg-amber-400 animate-pulse opacity-60" />
        )}
      </span>
      {showLabel && (
        <span className={`text-[10px] font-bold tracking-wider ${
          isConnected ? 'text-emerald-400' : isConnecting ? 'text-amber-400' : 'text-red-400'
        }`}>
          {isConnected ? 'WA Connected' : isConnecting ? 'Connecting...' : 'WA Offline'}
        </span>
      )}
    </span>
  );
}

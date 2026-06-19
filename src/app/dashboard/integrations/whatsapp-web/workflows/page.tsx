'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layers, Lock, ShieldCheck } from 'lucide-react';
import { BhamstraProvider, useBhamstra } from '@/lib/context/BhamstraContext';
import { WhatsappWorkflowBuilder } from '@/components/integrations/whatsapp-workflow-builder';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

function WhatsAppWorkflowsHubCore() {
  const router = useRouter();
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  return (
    <div className="w-full min-h-screen bg-[#070708] text-white flex flex-col overflow-hidden font-sans">
      
      {/* ═══ TOP HEADER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/70 bg-[#070708]/90 backdrop-blur-lg z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/integrations/whatsapp-web')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase block leading-none mb-0.5">Automation Console</span>
              <span className="text-sm font-black text-white tracking-tight leading-none">Workflow Drip Sequences Builder</span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-850 text-[10px] text-zinc-455 font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          RLS Bound · tenant/{tenantId.slice(0, 8)}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-1/3 w-[600px] h-[400px] bg-emerald-500/4 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <WhatsappWorkflowBuilder workspaceId={tenantId} />
        </div>
      </div>

      {/* ═══ STATUS BAR FOOTER ═══ */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-zinc-900 bg-zinc-950/60 text-[9px] text-zinc-600 font-mono">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          BRAHMASTRA LAW 1 — tenant_id RLS bounds enforced
        </span>
        <span>Workflow Engine v2.5</span>
      </div>

    </div>
  );
}

export default function WhatsAppWorkflowsHubPage() {
  return (
    <BhamstraProvider>
      <WhatsAppWorkflowsHubCore />
    </BhamstraProvider>
  );
}

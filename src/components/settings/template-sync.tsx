'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, ChevronRight, FileCode2, Play } from 'lucide-react';
import { SequenceStep } from '@/types';

interface TemplateSyncProps {
  workspaceId: string;
  steps: SequenceStep[];
  onSync: () => Promise<void>;
}

export function TemplateSync({ workspaceId, steps, onSync }: TemplateSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSuccess(false);
    try {
      await onSync();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5 mb-5">
        <div>
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-400" />
            WhatsApp Drip Template Synchronization
          </h4>
          <p className="text-xs text-zinc-400">Manage campaign templates synced with WhastBoost</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.15)]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync WhastBoost Templates'}
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2 mb-5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Templates synchronized successfully! Drip sequences updated.</span>
        </div>
      )}

      {/* Sync sequence steps preview */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Drip Campaigns Preview</h5>
        
        {steps.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-xl">
            No active templates synced. Click Sync to pull templates.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <div 
                key={step.id}
                className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 hover:bg-zinc-950 transition-all flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400 shrink-0">
                  #{step.step_number}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Step {step.step_number}: Delay {step.delay_days} {step.delay_days === 1 ? 'day' : 'days'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-0.5">
                      <Play className="w-2.5 h-2.5 fill-zinc-500 stroke-none" />
                      Preserves timestamp
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed whitespace-pre-line p-3 rounded-lg bg-black/40 border border-zinc-900/60">
                    {step.message_template}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

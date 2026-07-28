'use client';

import { useState } from 'react';
import { X, Shield, AlertTriangle } from 'lucide-react';

interface AntiBanConfig {
  delayBetweenMs: number;
  batchSize: number;
  skipReadMessages: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: AntiBanConfig) => void;
  defaultConfig?: Partial<AntiBanConfig>;
}

export function AntiBanConfigModal({ open, onClose, onConfirm, defaultConfig }: Props) {
  const [delay, setDelay] = useState(defaultConfig?.delayBetweenMs ?? 3000);
  const [batchSize, setBatchSize] = useState(defaultConfig?.batchSize ?? 1);
  const [skipRead, setSkipRead] = useState(defaultConfig?.skipReadMessages ?? true);
  const [showWarning, setShowWarning] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    if (delay < 1000) {
      setShowWarning(true);
      return;
    }
    onConfirm({ delayBetweenMs: delay, batchSize, skipReadMessages: skipRead });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white">Anti-Ban Configuration</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Configure delays to avoid WhatsApp flagging your account for bulk messaging.
            Longer delays = safer but slower delivery.
          </p>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Delay Between Messages (ms)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={500} max={10000} step={500}
                value={delay}
                onChange={e => { setDelay(Number(e.target.value)); setShowWarning(false); }}
                className="flex-1 accent-amber-500 h-1.5"
              />
              <span className="text-xs font-bold text-amber-400 font-mono w-16 text-right">{delay}ms</span>
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
              <span>0.5s (Risky)</span>
              <span>5s (Safe)</span>
              <span>10s (Paranoid)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Batch Size</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={10} step={1}
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5"
              />
              <span className="text-xs font-bold text-amber-400 font-mono w-8 text-right">{batchSize}</span>
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
              <span>1 (Safest)</span>
              <span>5</span>
              <span>10 (Fastest)</span>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-900 transition-colors">
            <input
              type="checkbox"
              checked={skipRead}
              onChange={e => setSkipRead(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500/30 bg-zinc-900"
            />
            <div>
              <div className="text-xs font-bold text-zinc-200">Skip already-read messages</div>
              <div className="text-[9px] text-zinc-500">Messages with status=read will be excluded</div>
            </div>
          </label>

          {showWarning && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-[10px] text-red-400">Delay below 1000ms is risky and may trigger WhatsApp's anti-spam. Continue at your own risk.</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/60 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer">
            Confirm & Resend
          </button>
        </div>
      </div>
    </div>
  );
}

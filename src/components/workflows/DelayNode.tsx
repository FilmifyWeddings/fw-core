import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Timer, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DelayNodeProps {
  data: {
    label: string;
    config?: {
      delay_value?: number | string;
      delay_unit?: string;
    };
    status?: 'idle' | 'running' | 'success' | 'failed';
  };
  selected?: boolean;
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  const value = data.config?.delay_value ?? 1;
  const unit = data.config?.delay_unit ?? 'minutes';
  const displayDelay = `${value} ${unit.toLowerCase()}`;

  return (
    <div className="flex flex-col items-center group">
      {/* Node Container */}
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-700/5 border-2 border-amber-500/40 flex items-center justify-center relative shadow-lg transition-all duration-300 ${
          selected ? 'scale-105 border-orange-500 ring-2 ring-orange-500/20' : 'group-hover:scale-105 group-hover:border-zinc-500'
        }`}
      >
        {/* Status Badge */}
        {data.status && data.status !== 'idle' && (
          <div className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-md">
            {data.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />}
            {data.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {data.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
          </div>
        )}

        {/* Input handle (left) */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
        />

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center shadow-inner">
          <Timer className="w-5 h-5 text-amber-400" />
        </div>

        {/* Delay Badge */}
        <div className="absolute -bottom-1 bg-amber-500/20 border border-amber-500/30 text-[8px] font-black uppercase text-amber-400 px-1 rounded-full tracking-wider whitespace-nowrap">
          {displayDelay}
        </div>

        {/* Output handle (right) */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
        />
      </div>

      {/* Label */}
      <div className="mt-2 text-center max-w-[120px]">
        <p className="text-[11px] font-extrabold text-white truncate">{data.label || 'Wait'}</p>
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Delay</p>
      </div>
    </div>
  );
}

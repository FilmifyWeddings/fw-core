import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Webhook, Users, MousePointer, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const appIcons: Record<string, React.ReactNode> = {
  facebook_lead: <FacebookIcon />,
  webhook: <Webhook className="w-5 h-5 text-purple-400" />,
  crm_entry: <Users className="w-5 h-5 text-emerald-400" />,
  manual: <MousePointer className="w-5 h-5 text-zinc-400" />,
};

const appColors: Record<string, string> = {
  facebook_lead: 'from-blue-500/20 to-indigo-500/5 border-blue-500/40 shadow-blue-500/10',
  webhook: 'from-purple-500/20 to-violet-500/5 border-purple-500/40 shadow-purple-500/10',
  crm_entry: 'from-emerald-500/20 to-green-500/5 border-emerald-500/40 shadow-emerald-500/10',
  manual: 'from-zinc-600/20 to-zinc-800/5 border-zinc-700 shadow-zinc-800/10',
};

interface TriggerNodeProps {
  data: {
    type: string;
    label: string;
    status?: 'idle' | 'running' | 'success' | 'failed';
  };
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  const icon = appIcons[data.type] || <Zap className="w-5 h-5 text-orange-400" />;
  const colorClass = appColors[data.type] || 'from-orange-500/20 to-amber-500/5 border-orange-500/40 shadow-orange-500/10';

  return (
    <div className="flex flex-col items-center group">
      {/* Node Container */}
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-b ${colorClass} border-2 flex items-center justify-center relative shadow-lg transition-all duration-300 ${
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

        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center shadow-inner">
          {icon}
        </div>

        {/* Trigger Badge */}
        <div className="absolute -bottom-1 bg-orange-500/20 border border-orange-500/30 text-[8px] font-black uppercase text-orange-400 px-1 rounded-full tracking-wider">
          Trigger
        </div>

        {/* Source handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
        />
      </div>

      {/* Label */}
      <div className="mt-2 text-center max-w-[120px]">
        <p className="text-[11px] font-extrabold text-white truncate">{data.label}</p>
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
          {data.type.replace('_', ' ')}
        </p>
      </div>
    </div>
  );
}

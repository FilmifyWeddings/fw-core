import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Table2, Contact, Globe, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';

const appIcons: Record<string, React.ReactNode> = {
  whatsapp_send: <MessageSquare className="w-5 h-5 text-emerald-400" />,
  whatsapp_group_alert: <MessageSquare className="w-5 h-5 text-teal-400" />,
  google_sheet_append: <Table2 className="w-5 h-5 text-green-400" />,
  google_contact_create: <Contact className="w-5 h-5 text-blue-400" />,
  http_request: <Globe className="w-5 h-5 text-violet-400" />,
};

const appColors: Record<string, string> = {
  whatsapp_send: 'from-emerald-500/20 to-emerald-700/5 border-emerald-500/40 shadow-emerald-500/10',
  whatsapp_group_alert: 'from-teal-500/20 to-teal-700/5 border-teal-500/40 shadow-teal-500/10',
  google_sheet_append: 'from-green-500/20 to-green-700/5 border-green-500/40 shadow-green-500/10',
  google_contact_create: 'from-blue-500/20 to-blue-700/5 border-blue-500/40 shadow-blue-500/10',
  http_request: 'from-violet-500/20 to-violet-700/5 border-violet-500/40 shadow-violet-500/10',
};

interface ActionNodeProps {
  id: string;
  data: {
    type: string;
    label: string;
    status?: 'idle' | 'running' | 'success' | 'failed';
    onAddNode?: (e: React.MouseEvent, parentId: string) => void;
  };
  selected?: boolean;
}

export function ActionNode({ id, data, selected }: ActionNodeProps) {
  const icon = appIcons[data.type] || <MessageSquare className="w-5 h-5 text-orange-400" />;
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

        {/* Input handle (left) */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
        />

        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center shadow-inner">
          {icon}
        </div>

        {/* Output handle (right) */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-orange-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
        />

        {/* Floating Add Child Node Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddNode?.(e, id);
          }}
          className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-500 border border-zinc-950 flex items-center justify-center text-black hover:scale-125 transition-all z-35 shadow"
          title="Add child node"
        >
          <Plus className="w-3 h-3 stroke-[3]" />
        </button>
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

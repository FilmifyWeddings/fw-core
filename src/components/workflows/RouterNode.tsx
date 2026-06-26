import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BranchConfig {
  id: string;
  label: string;
  condition: string;
}

interface RouterNodeProps {
  data: {
    label: string;
    branches?: BranchConfig[];
    status?: 'idle' | 'running' | 'success' | 'failed';
  };
  selected?: boolean;
}

export function RouterNode({ data, selected }: RouterNodeProps) {
  const branches = data.branches || [
    { id: 'branch-1', label: 'Branch 1', condition: '' },
    { id: 'branch-2', label: 'Branch 2', condition: '' },
  ];

  return (
    <div className="flex flex-col items-center group">
      {/* Node Container */}
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-b from-indigo-500/20 to-violet-700/5 border-2 border-indigo-500/40 flex items-center justify-center relative shadow-lg transition-all duration-300 ${
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
          <GitBranch className="w-5 h-5 text-indigo-400" />
        </div>

        {/* Output handles on the right (one per branch) */}
        {branches.map((branch, index) => {
          const total = branches.length;
          const percentage = total > 1 ? `${((index) / (total - 1)) * 70 + 15}%` : '50%';
          return (
            <div key={branch.id}>
              <Handle
                type="source"
                position={Position.Right}
                id={branch.id}
                style={{ top: percentage }}
                className="w-3 h-3 !bg-indigo-500 !border-2 !border-zinc-950 hover:scale-125 transition-transform"
              />
              {/* Optional tiny branch label tooltip on hover */}
              <div
                className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-zinc-850 px-1 py-0.5 rounded text-[8px] text-zinc-400 pointer-events-none whitespace-nowrap"
                style={{ top: `calc(${percentage} - 8px)` }}
              >
                {branch.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Label */}
      <div className="mt-2 text-center max-w-[120px]">
        <p className="text-[11px] font-extrabold text-white truncate">{data.label || 'Router'}</p>
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
          {branches.length} branches
        </p>
      </div>
    </div>
  );
}

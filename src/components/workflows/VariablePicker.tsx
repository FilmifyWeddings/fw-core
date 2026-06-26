import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';

interface UpstreamNode {
  id: string;
  label: string;
  type: string;
}

interface VariablePickerProps {
  upstreamNodes: UpstreamNode[];
  onSelect: (token: string) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

const NODE_OUTPUT_VARS: Record<string, { field: string; description: string }[]> = {
  facebook_lead: [
    { field: 'name', description: 'Lead Full Name' },
    { field: 'phone', description: 'Phone Number' },
    { field: 'email', description: 'Email Address' },
    { field: 'city', description: 'City' },
    { field: 'form_id', description: 'Facebook Form ID' },
    { field: 'ad_name', description: 'Facebook Ad Name' },
  ],
  webhook: [
    { field: 'name', description: 'Sender Name' },
    { field: 'phone', description: 'Sender Phone' },
    { field: 'email', description: 'Sender Email' },
    { field: 'data', description: 'Raw Webhook JSON' },
  ],
  manual: [
    { field: 'name', description: 'Test User Name' },
    { field: 'phone', description: 'Test Phone' },
  ],
  crm_entry: [
    { field: 'name', description: 'CRM Contact Name' },
    { field: 'phone', description: 'CRM Contact Phone' },
    { field: 'email', description: 'CRM Contact Email' },
    { field: 'status', description: 'CRM Status' },
    { field: 'source', description: 'Lead Source' },
  ],
  whatsapp_send: [
    { field: 'waMessageId', description: 'WhatsApp Message ID' },
  ],
  whatsapp_group_alert: [
    { field: 'waMessageId', description: 'WhatsApp Message ID' },
  ],
  google_sheet_append: [
    { field: 'updatedRange', description: 'Updated Range' },
    { field: 'updatedRows', description: 'Rows Appended Count' },
  ],
  google_contact_create: [
    { field: 'resourceName', description: 'Google Contact ID' },
  ],
  http_request: [
    { field: 'status', description: 'HTTP Status Code' },
    { field: 'response', description: 'JSON Response' },
  ],
  delay: [
    { field: 'scheduled_at', description: 'Resume timestamp' },
  ]
};

export function VariablePicker({ upstreamNodes, onSelect, onClose, anchorRect }: VariablePickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  // Calculate positioning relative to the anchorRect
  // The picker has width 320px (w-80)
  const pickerWidth = 320;
  const gap = 4;

  let top = anchorRect.bottom + gap;
  // If it overflows the bottom of the viewport, position it above the anchor instead
  if (top + 260 > window.innerHeight) {
    top = anchorRect.top - 260 - gap;
  }

  // Align right edge of the picker with the right edge of the anchor, keeping it within screen bounds
  let left = anchorRect.right - pickerWidth;
  if (left < 10) left = 10;
  if (left + pickerWidth > window.innerWidth - 10) {
    left = window.innerWidth - pickerWidth - 10;
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${pickerWidth}px`,
    zIndex: 99999, // Ensure it is on top of all other layout layers
  };

  const pickerContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      style={dropdownStyle}
      className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden select-none"
    >
      <div className="px-3 py-2 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/55">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-orange-400" /> Insert Variable
        </span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto p-2 space-y-3">
        {upstreamNodes.length === 0 ? (
          <div className="text-center py-6 text-zinc-650 text-xs">
            No parent/upstream nodes connected yet.
          </div>
        ) : (
          upstreamNodes.map(node => {
            const vars = NODE_OUTPUT_VARS[node.type] || [];
            if (vars.length === 0) return null;

            return (
              <div key={node.id} className="space-y-1">
                <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850/40 text-[9px] font-bold text-orange-400/90 truncate uppercase tracking-wider">
                  {node.label || node.type} ({node.id})
                </div>

                <div className="space-y-0.5 pl-1">
                  {vars.map(v => {
                    const token = `{{${node.id}.${v.field}}}`;
                    return (
                      <button
                        key={v.field}
                        type="button"
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-mono text-zinc-300 hover:bg-zinc-850/60 hover:text-orange-300 transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">{`{{${node.id}.${v.field}}}`}</span>
                        <span className="text-[9px] text-zinc-600 group-hover:text-orange-400/50 transition-colors truncate pl-2">
                          {v.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );

  return createPortal(pickerContent, document.body);
}

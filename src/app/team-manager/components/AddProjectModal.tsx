'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, User, Sparkles } from 'lucide-react';
import EventBlock, { EventBlockData } from './EventBlock';

const DEFAULT_BLOCK: EventBlockData = {
  id: '',
  subEventNames: ['Wedding Ceremony'],
  subEventDate: '',
  venueLocation: '',
  mapLink: '',
  startTime: '14:00',
  endTime: '22:00',
  roles: ['TP', 'Ass'],
  notes: '',
};

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (couplingName: string, blocks: EventBlockData[]) => void;
}

export default function AddProjectModal({ isOpen, onClose, onSave }: AddProjectModalProps) {
  const [couplingName, setCouplingName] = useState('');
  const [eventBlocks, setEventBlocks] = useState<EventBlockData[]>([
    { ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) },
  ]);
  const [customPrograms, setCustomPrograms] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!couplingName.trim()) return;
    onSave(couplingName, eventBlocks);
    setCouplingName('');
    setEventBlocks([{ ...DEFAULT_BLOCK, id: Math.random().toString(36).slice(2) }]);
  };

  const addEventBlock = () => {
    setEventBlocks(prev => [
      ...prev,
      {
        ...DEFAULT_BLOCK,
        id: Math.random().toString(36).slice(2),
        subEventNames: ['Pre-wedding Shoot'],
        startTime: '10:00',
        endTime: '18:00',
        roles: ['Ass', 'CP'],
      },
    ]);
  };

  const removeEventBlock = (id: string) => {
    setEventBlocks(prev => prev.filter(b => b.id !== id));
  };

  const duplicateEventBlock = (block: EventBlockData) => {
    setEventBlocks(prev => [
      ...prev,
      { ...block, id: Math.random().toString(36).slice(2) },
    ]);
  };

  const updateEventBlock = (id: string, fields: Partial<EventBlockData>) => {
    setEventBlocks(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
  };

  const toggleRoleInBlock = (blockId: string, role: string) => {
    setEventBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const roles = b.roles.includes(role)
        ? b.roles.filter(r => r !== role)
        : [...b.roles, role];
      return { ...b, roles };
    }));
  };

  const handleAddCustomProgram = (name: string) => {
    setCustomPrograms(prev => prev.includes(name) ? prev : [...prev, name]);
  };

  const handleAddCustomRole = (role: string) => {
    setCustomRoles(prev => prev.includes(role) ? prev : [...prev, role]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* ─── GLASS-MORPHISM OVERLAY ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />

          {/* ─── 3D MODAL CHASSIS ─── */}
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto
                rounded-[24px] border border-[#6C5CE7]/8 text-[#0B111E]"
              style={{
                boxShadow: '0 30px 70px rgba(0,0,0,0.25), 0 12px 30px rgba(108, 92, 231, 0.05)',
              }}
            >
              {/* ─── MODAL HEADER ─── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#6C5CE7] flex items-center justify-center text-white shadow-lg shadow-[#6C5CE7]/20">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B111E] tracking-tight">Create Wedding Project</h3>
                    <p className="text-[10px] text-[#4F5E74] font-semibold mt-0.5">Configure client profile and program event blocks.</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-[#4F5E74] hover:text-[#0B111E] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ─── SCROLLABLE BODY ─── */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                {/* ─── OVERSIZED COUPLE NAME INPUT ─── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#4F5E74] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#6C5CE7]" />
                    Client Coupling Name / Couple Profile
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma & Malhotra"
                    value={couplingName}
                    onChange={(e) => setCouplingName(e.target.value)}
                    className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 px-5 py-4 rounded-2xl text-base font-bold focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/10 transition text-[#0B111E] placeholder:text-zinc-400"
                  />
                </div>

                {/* ─── DYNAMIC SUB-EVENT BLOCKS ─── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#6C5CE7] uppercase tracking-wider">
                      Wedding Sub-Events & Requirements
                    </span>
                    <span className="text-[9px] font-bold text-[#4F5E74]">
                      {eventBlocks.length} block(s)
                    </span>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {eventBlocks.map((block, index) => (
                      <EventBlock
                        key={block.id}
                        block={block}
                        index={index}
                        totalBlocks={eventBlocks.length}
                        onUpdate={updateEventBlock}
                        onRemove={removeEventBlock}
                        onDuplicate={duplicateEventBlock}
                        onAddCustomProgram={handleAddCustomProgram}
                        onAddCustomRole={handleAddCustomRole}
                        onToggleRole={toggleRoleInBlock}
                      />
                    ))}
                  </AnimatePresence>

                  {/* ─── ADD EVENT BLOCK BUTTON ─── */}
                  <motion.button
                    type="button"
                    onClick={addEventBlock}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full border-2 border-dashed border-[#6C5CE7]/25 hover:border-[#6C5CE7]/50 bg-white text-[#6C5CE7] text-xs font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-[#6C5CE7]/5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Wedding Event Block
                  </motion.button>
                </div>
              </div>

              {/* ─── MODAL FOOTER ─── */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 shrink-0 bg-white/80 backdrop-blur-sm rounded-b-[24px]">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-transparent border border-zinc-200 text-[#4F5E74] text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-[#6C5CE7]/15 hover:shadow-[#6C5CE7]/25"
                >
                  Save Project Config
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

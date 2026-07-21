'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, ArrowUp, ArrowDown, Plus, Trash2, Edit2, GripVertical, User, Camera, Loader2, Check } from 'lucide-react';
import { FWTeamMember } from '@/types';
import { supabase } from '@/lib/supabase';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: string[];
  teamMembers: FWTeamMember[];
  onUpdateEventTypes: (newTypes: string[]) => void;
  onUpdateTeamMembers: () => void;
  onEditMember: (member: FWTeamMember) => void;
  onDeleteMember: (id: string) => void;
}

export default function TeamSettingsModal({
  isOpen,
  onClose,
  eventTypes,
  teamMembers,
  onUpdateEventTypes,
  onUpdateTeamMembers,
  onEditMember,
  onDeleteMember,
}: TeamSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'directory'>('events');

  // Event Type State
  const [localEvents, setLocalEvents] = useState<string[]>(eventTypes);
  const [newEventName, setNewEventName] = useState('');
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editingEventText, setEditingEventText] = useState('');

  // Sync localEvents if props change
  React.useEffect(() => {
    setLocalEvents(eventTypes);
  }, [eventTypes]);

  // Event Reordering & Operations
  const moveEvent = (from: number, to: number) => {
    if (to < 0 || to >= localEvents.length) return;
    const copy = [...localEvents];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    setLocalEvents(copy);
    onUpdateEventTypes(copy);
  };

  const handleAddEvent = () => {
    if (!newEventName.trim()) return;
    const updated = [...localEvents, newEventName.trim()];
    setLocalEvents(updated);
    onUpdateEventTypes(updated);
    setNewEventName('');
  };

  const handleSaveEditEvent = (idx: number) => {
    if (!editingEventText.trim()) return;
    const updated = [...localEvents];
    updated[idx] = editingEventText.trim();
    setLocalEvents(updated);
    onUpdateEventTypes(updated);
    setEditingEventIdx(null);
  };

  const handleDeleteEvent = (idx: number) => {
    const updated = localEvents.filter((_, i) => i !== idx);
    setLocalEvents(updated);
    onUpdateEventTypes(updated);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* 3D Modal Chassis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-5xl w-full h-[85vh] rounded-3xl bg-white/95 backdrop-blur-xl border border-[#6C5CE7]/15 shadow-2xl overflow-hidden flex flex-col p-2sm p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6C5CE7] flex items-center justify-center text-white shadow-lg shadow-[#6C5CE7]/20">
                  <Settings className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0B111E] tracking-tight">Team & Operations Settings</h3>
                  <p className="text-[10px] text-[#4F5E74] font-semibold">Manage global event types and directory members</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-[#4F5E74] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-zinc-100 bg-[#F8F9FD]/60 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'events'
                    ? 'border-[#6C5CE7] text-[#6C5CE7] bg-white'
                    : 'border-transparent text-[#4F5E74] hover:text-[#0B111E]'
                }`}
              >
                Event Types ({localEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'directory'
                    ? 'border-[#6C5CE7] text-[#6C5CE7] bg-white'
                    : 'border-transparent text-[#4F5E74] hover:text-[#0B111E]'
                }`}
              >
                Team Directory ({teamMembers.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: EVENT TYPES MANAGER */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  {/* Add Event Type Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Sangeet / Engagement"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className="flex-1 bg-[#F8F9FD] border border-[#6C5CE7]/10 px-4 py-2.5 rounded-xl text-xs font-bold text-[#0B111E] placeholder:text-zinc-400 focus:outline-none focus:border-[#6C5CE7]"
                    />
                    <button
                      type="button"
                      onClick={handleAddEvent}
                      className="px-4 py-2.5 bg-[#6C5CE7] hover:bg-[#5b4cd1] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Event
                    </button>
                  </div>

                  {/* Reorderable Events List */}
                  <div className="space-y-2 pt-2">
                    {localEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-zinc-50 border border-zinc-150 p-3 rounded-2xl transition hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Up/Down Arrow Reorder Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveEvent(idx, idx - 1)}
                              className="p-1 rounded-md bg-white border border-zinc-200 text-zinc-500 hover:text-[#6C5CE7] disabled:opacity-30 transition"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === localEvents.length - 1}
                              onClick={() => moveEvent(idx, idx + 1)}
                              className="p-1 rounded-md bg-white border border-zinc-200 text-zinc-500 hover:text-[#6C5CE7] disabled:opacity-30 transition"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {editingEventIdx === idx ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingEventText}
                                onChange={(e) => setEditingEventText(e.target.value)}
                                className="flex-1 bg-white border border-[#6C5CE7] px-3 py-1 rounded-lg text-xs font-bold text-[#0B111E]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditEvent(idx)}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-extrabold text-[#0B111E]">{evt}</span>
                          )}
                        </div>

                        {/* Edit / Delete Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventIdx(idx);
                              setEditingEventText(evt);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-[#6C5CE7] transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(idx)}
                            className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: TEAM DIRECTORY MANAGER */}
              {activeTab === 'directory' && (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-zinc-50 border border-zinc-150 p-3 rounded-2xl transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {/* Member Avatar */}
                        {member.avatar_url ? (
                          // eslint-disable-next-next/no-img-element
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-xs flex items-center justify-center border-2 border-white ring-2 ring-emerald-400 shrink-0">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-extrabold text-[#0B111E] block">{member.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#4F5E74] mt-0.5">
                            <span className="text-[#6C5CE7]">{member.primary_role}</span>
                            <span>•</span>
                            <span>{member.country_code || '+91'} {member.phone_number}</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditMember(member)}
                          className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-[#6C5CE7] transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMember(member.id)}
                          className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 flex justify-end shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#6C5CE7] text-white text-xs font-bold shadow-md hover:bg-[#5b4cd1] transition"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

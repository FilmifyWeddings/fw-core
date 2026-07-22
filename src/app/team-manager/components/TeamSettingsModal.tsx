'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, ArrowUp, ArrowDown, Plus, Trash2, Edit2, GripVertical, User, Camera, Loader2, Check, Sparkles, SlidersHorizontal, Layers, ShieldCheck, Clock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'events' | 'directory' | 'presets'>('events');

  // Event Type State
  const [localEvents, setLocalEvents] = useState<string[]>(eventTypes);
  const [newEventName, setNewEventName] = useState('');
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editingEventText, setEditingEventText] = useState('');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Sync localEvents if props change
  React.useEffect(() => {
    setLocalEvents(eventTypes);
  }, [eventTypes]);

  // Drag and Drop Reordering Handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const copy = [...localEvents];
    const [draggedItem] = copy.splice(draggedIdx, 1);
    copy.splice(idx, 0, draggedItem);
    
    setDraggedIdx(idx);
    setLocalEvents(copy);
    onUpdateEventTypes(copy);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Glass Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-lg"
          />

          {/* Advanced 3D Studio Settings Modal Chassis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-5xl w-full h-[85vh] rounded-3xl bg-white/95 backdrop-blur-2xl border border-indigo-100 shadow-[0_35px_90px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Studio Operations & Config Manager
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black tracking-wide border border-indigo-200">
                      PRO
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Configure sub-event type presets, team directory profiles, and operational parameters.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Navigation Tab Bar */}
            <div className="flex items-center gap-3 px-6 pt-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'events'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                Event Type Presets ({localEvents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'directory'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                Team Directory Roster ({teamMembers.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'presets'
                    ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Studio Defaults & Roles
              </button>
            </div>

            {/* Modal Body Viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: EVENT TYPE PRESETS WITH HOLD-TO-DRAG REORDERING */}
              {activeTab === 'events' && (
                <div className="space-y-5">
                  <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-indigo-950">Drag & Drop Sub-Event Reordering</h4>
                        <p className="text-[11px] font-semibold text-indigo-700">
                          Hold the grip handle <GripVertical className="w-3 h-3 inline text-indigo-500" /> to drag and reorder sub-event types globally.
                        </p>
                      </div>
                    </div>

                    {/* Add Event Input Bar */}
                    <div className="flex items-center gap-2 w-full max-w-md">
                      <input
                        type="text"
                        placeholder="New Event Type (e.g. Sangeet / Reception)"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <button
                        type="button"
                        onClick={handleAddEvent}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Event
                      </button>
                    </div>
                  </div>

                  {/* Interactive Hold-to-Drag Reorderable List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {localEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between bg-white border p-3.5 rounded-2xl transition shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing ${
                          draggedIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/30' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Drag Grip Handle */}
                          <div className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 transition shrink-0 cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {editingEventIdx === idx ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingEventText}
                                onChange={(e) => setEditingEventText(e.target.value)}
                                className="flex-1 bg-slate-50 border border-indigo-500 px-3 py-1 rounded-lg text-xs font-bold text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditEvent(idx)}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-extrabold text-slate-900 truncate">{evt}</span>
                          )}
                        </div>

                        {/* Edit / Delete Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventIdx(idx);
                              setEditingEventText(evt);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(idx)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: TEAM DIRECTORY ROSTER */}
              {activeTab === 'directory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-xs font-extrabold text-slate-800">
                      Total Directory Members: {teamMembers.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-white border border-slate-200 p-3.5 rounded-2xl transition hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Member Profile Photo */}
                          {member.avatar_url ? (
                            // eslint-disable-next-next/no-img-element
                            <img
                              src={member.avatar_url}
                              alt={member.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-white ring-2 ring-emerald-400 shrink-0 shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center border-2 border-white ring-2 ring-indigo-200 shrink-0 shadow-xs">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{member.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-0.5">
                              <span className="text-indigo-600 uppercase tracking-wide">{member.primary_role}</span>
                              <span>•</span>
                              <span>{member.country_code || '+91'} {member.phone_number}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => onEditMember(member)}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                            title="Edit Member Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMember(member.id)}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: STUDIO DEFAULTS & ROLE CONFIGURATIONS */}
              {activeTab === 'presets' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Default Operational Parameters
                    </h4>
                    <p className="text-xs text-slate-600 font-semibold">
                      Configure standard operational shift timings, default required roles per sub-event, and auto-dispatch rules.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Roll-Call Time</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>10:00 AM (Default)</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Crew Roles</span>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-black text-indigo-700">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">TP</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">CP</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">DO</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">DR</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">Ass</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md hover:bg-indigo-700 transition cursor-pointer"
              >
                Done / Save Configuration
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

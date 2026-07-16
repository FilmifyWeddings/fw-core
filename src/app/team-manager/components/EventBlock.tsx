'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Trash2, MapPin, Link as LinkIcon, MessageSquare } from 'lucide-react';
import ProgramTypeSelect from './ProgramTypeSelect';
import CalendarPicker from './CalendarPicker';
import SmartTimePicker from './SmartTimePicker';
import RoleGrid from './RoleGrid';

export interface EventBlockData {
  id: string;
  subEventNames: string[];
  subEventDate: string;
  venueLocation: string;
  mapLink: string;
  startTime: string;
  endTime: string;
  roles: string[];
  notes: string;
}

interface EventBlockProps {
  block: EventBlockData;
  index: number;
  totalBlocks: number;
  onUpdate: (id: string, fields: Partial<EventBlockData>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (block: EventBlockData) => void;
  onAddCustomProgram: (name: string) => void;
  onAddCustomRole: (role: string) => void;
  onToggleRole: (blockId: string, role: string) => void;
}

export default function EventBlock({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onDuplicate,
  onAddCustomProgram,
  onAddCustomRole,
  onToggleRole,
}: EventBlockProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [block.notes]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-[#6C5CE7]/8 rounded-3xl p-5 space-y-4 relative group hover:shadow-[0_8px_30px_rgba(108,92,231,0.06)] hover:-translate-y-0.5 transition-all duration-300"
      style={{
        boxShadow: '0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(108,92,231,0.03)',
      }}
    >
      {/* Header with event badge and manipulation controls */}
      <div className="flex justify-between items-center">
        <span className="bg-[#6C5CE7]/6 text-[#6C5CE7] font-black text-[9px] px-3 py-1 rounded-full border border-[#6C5CE7]/8">
          Event #{index + 1}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onDuplicate(block)}
            className="p-1.5 text-[#6C5CE7]/60 hover:text-[#6C5CE7] hover:bg-[#6C5CE7]/8 rounded-lg transition"
            title="Duplicate event block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {totalBlocks > 1 && (
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Remove event block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Wedding Program Type Multi-select */}
      <ProgramTypeSelect
        selected={block.subEventNames}
        onChange={(names) => onUpdate(block.id, { subEventNames: names })}
        onAddCustom={onAddCustomProgram}
      />

      {/* 2. Program Date Custom Calendar */}
      <CalendarPicker
        value={block.subEventDate}
        onChange={(date) => onUpdate(block.id, { subEventDate: date })}
      />

      {/* 3. Venue Coordinates / Location */}
      <div className="space-y-2">
        <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">
          Venue Coordinates / Location
        </label>
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#4F5E74]/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="e.g. Royal Lawn Room, Mumbai"
            value={block.venueLocation}
            onChange={(e) => onUpdate(block.id, { venueLocation: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-[#6C5CE7]/10 pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-[#0B111E] focus:outline-none focus:border-[#6C5CE7] transition"
          />
        </div>
        <div className="relative">
          <LinkIcon className="w-3 h-3 text-[#4F5E74]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            placeholder="Map Link (e.g. https://maps.google.com/...)"
            value={block.mapLink}
            onChange={(e) => onUpdate(block.id, { mapLink: e.target.value })}
            className="w-full bg-white border border-[#6C5CE7]/8 pl-9 pr-3 py-1.5 rounded-lg text-[10px] font-medium text-[#4F5E74] focus:outline-none focus:border-[#6C5CE7]/30 transition placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 4. Crew Timing & Smart Hourly Slots */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider block">
          Crew Timing & Shift Slots
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SmartTimePicker
            label="Crew Roll Call Time"
            value={block.startTime}
            onChange={(time) => onUpdate(block.id, { startTime: time })}
          />
          <SmartTimePicker
            label="Dismissal Estimate"
            value={block.endTime}
            onChange={(time) => onUpdate(block.id, { endTime: time })}
            showSlots
            slotReferenceTime={block.startTime}
          />
        </div>
      </div>

      {/* 5. Role Placements Grid */}
      <RoleGrid
        selectedRoles={block.roles}
        onToggle={(role) => onToggleRole(block.id, role)}
        onAddCustom={onAddCustomRole}
      />

      {/* 6. Core Operational Notes */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-extrabold text-[#4F5E74] uppercase tracking-wider flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Core Operational Notes / Instructions
        </label>
        <textarea
          ref={notesRef}
          value={block.notes}
          onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
          placeholder="On-field directives, special instructions, VIP handling notes..."
          rows={2}
          className="w-full bg-[#F8F9FD] border-none px-3 py-2.5 rounded-xl text-xs font-medium text-[#0B111E] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/15 transition resize-none placeholder:text-zinc-400 min-h-[60px]"
        />
      </div>
    </motion.div>
  );
}

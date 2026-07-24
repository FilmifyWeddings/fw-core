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

  const blockTitle = block.subEventNames.length > 0 ? block.subEventNames.join(' + ') : 'New Sub-Event';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 relative group shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* CLEAN MINIMAL SUB-EVENT CARD HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-indigo-50 text-[#6C5CE7] font-bold text-xs px-3 py-1 rounded-xl border border-indigo-100">
            Event #{index + 1}
          </span>
          <span className="text-xs font-bold text-[#0B111E] truncate max-w-[200px] sm:max-w-[300px]">
            {blockTitle}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={() => onDuplicate(block)}
            className="p-1.5 text-[#4F5E74] hover:text-[#6C5CE7] hover:bg-indigo-50 rounded-lg transition cursor-pointer"
            title="Duplicate event block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {totalBlocks > 1 && (
            <button
              type="button"
              onClick={() => onRemove(block.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
        <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider block">
          Venue Coordinates / Location
        </label>
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#4F5E74] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="e.g. Royal Lawn Room, Mumbai"
            value={block.venueLocation}
            onChange={(e) => onUpdate(block.id, { venueLocation: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-[#0B111E] placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
          />
        </div>
        <div className="relative">
          <LinkIcon className="w-3.5 h-3.5 text-[#4F5E74] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            placeholder="Map Link (e.g. https://maps.google.com/...)"
            value={block.mapLink}
            onChange={(e) => onUpdate(block.id, { mapLink: e.target.value })}
            className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white pl-9 pr-3 py-2 rounded-xl text-xs font-medium text-[#4F5E74] placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Crew Timing & Smart Hourly Slots */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider block">
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
        <label className="text-[11px] font-bold text-[#0B111E] uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-[#6C5CE7]" />
          Core Operational Notes / Instructions
        </label>
        <textarea
          ref={notesRef}
          value={block.notes}
          onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
          placeholder="On-field directives, special instructions, VIP handling notes..."
          rows={2}
          className="w-full bg-[#F8F9FD] border border-slate-200 focus:border-[#6C5CE7] focus:bg-white px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#0B111E] focus:outline-none transition resize-none placeholder:text-slate-400 min-h-[60px] shadow-2xs"
        />
      </div>
    </motion.div>
  );
}

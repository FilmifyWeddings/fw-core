'use client';

import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Image as ImageIcon,
  Palette,
  Pin,
  Search,
  Trash2,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  TaskItem,
  TaskChecklistItem,
  PASTEL_NOTE_COLORS,
} from '@/lib/services/taskService';

interface NotesSectionProps {
  notes: TaskItem[];
  onAddNote: (noteData: { title: string; description: string; color: string; checklist_items?: TaskChecklistItem[] }) => Promise<void>;
  onUpdateNote: (noteId: string, updates: Partial<TaskItem>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNoteDetail: (note: TaskItem) => void;
}

export function NotesSection({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onOpenNoteDetail,
}: NotesSectionProps) {
  // Quick note bar state
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('white');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklistText, setChecklistText] = useState('');
  const [checklists, setChecklists] = useState<TaskChecklistItem[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Filter pinned vs others
  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const otherNotes = notes.filter((n) => !n.is_pinned);

  // Handle Add Note from quick bar
  const handleSaveQuickNote = async () => {
    if (!title.trim() && !description.trim() && checklists.length === 0) {
      setIsExpanded(false);
      return;
    }

    await onAddNote({
      title: title.trim(),
      description: description.trim(),
      color: selectedColor,
      checklist_items: checklists,
    });

    setTitle('');
    setDescription('');
    setSelectedColor('white');
    setChecklists([]);
    setChecklistText('');
    setIsChecklistMode(false);
    setIsExpanded(false);
  };

  const handleAddChecklistEntry = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && checklistText.trim()) {
      e.preventDefault();
      setChecklists((prev) => [
        ...prev,
        { id: 'item-' + Date.now(), text: checklistText.trim(), done: false },
      ]);
      setChecklistText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Google Keep Style "Take a Note..." Bar ── */}
      <div className="max-w-2xl mx-auto">
        <div
          className={`rounded-2xl border transition-all duration-200 shadow-sm ${
            PASTEL_NOTE_COLORS.find((c) => c.id === selectedColor)?.bg || 'bg-white dark:bg-stone-900'
          } ${
            PASTEL_NOTE_COLORS.find((c) => c.id === selectedColor)?.border || 'border-slate-200 dark:border-stone-800'
          }`}
        >
          {!isExpanded ? (
            <div
              onClick={() => setIsExpanded(true)}
              className="px-4 py-3 flex items-center justify-between gap-3 cursor-text text-slate-400 dark:text-stone-500"
            >
              <span className="text-xs font-semibold">Take a note or capture an idea...</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChecklistMode(true);
                    setIsExpanded(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                  title="New checklist note"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Note Title */}
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
              />

              {/* Note Body or Checklist */}
              {!isChecklistMode ? (
                <textarea
                  placeholder="Take a note..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400 resize-none font-normal leading-relaxed"
                />
              ) : (
                <div className="space-y-1.5">
                  {checklists.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-stone-600 flex items-center justify-center shrink-0">
                        {item.done && <Check className="w-2.5 h-2.5 text-amber-600" />}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">{item.text}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="List item (press Enter)..."
                      value={checklistText}
                      onChange={(e) => setChecklistText(e.target.value)}
                      onKeyDown={handleAddChecklistEntry}
                      className="w-full bg-transparent text-xs text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Quick Bar Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5">
                  {/* Color Palette Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 transition"
                      title="Change color"
                    >
                      <Palette className="w-4 h-4" />
                    </button>

                    {showColorPicker && (
                      <div className="absolute left-0 top-full mt-1 p-1.5 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl shadow-lg flex items-center gap-1.5 z-20">
                        {PASTEL_NOTE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedColor(c.id);
                              setShowColorPicker(false);
                            }}
                            className={`w-5 h-5 rounded-full border border-black/10 transition hover:scale-110 ${c.bg} ${
                              selectedColor === c.id ? 'ring-2 ring-amber-500' : ''
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsChecklistMode(!isChecklistMode)}
                    className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition ${
                      isChecklistMode ? 'text-amber-600' : 'text-slate-400'
                    }`}
                    title="Toggle checklist"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      setTitle('');
                      setDescription('');
                    }}
                    className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickNote}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pinned Notes Section ── */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-500 px-1">
            Pinned ({pinnedNotes.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => onOpenNoteDetail(note)}
                onTogglePin={() => onUpdateNote(note.id, { is_pinned: !note.is_pinned })}
                onDelete={() => onDeleteNote(note.id)}
                onUpdateColor={(c) => onUpdateNote(note.id, { color: c })}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Other Notes Section ── */}
      <div className="space-y-3">
        {pinnedNotes.length > 0 && (
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-500 px-1">
            Others ({otherNotes.length})
          </span>
        )}

        {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto text-xl">
              💡
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">No Notes Yet</h3>
            <p className="text-xs text-slate-500 font-medium">Capture shoot ideas, moodboards, or client notes above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {otherNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => onOpenNoteDetail(note)}
                onTogglePin={() => onUpdateNote(note.id, { is_pinned: !note.is_pinned })}
                onDelete={() => onDeleteNote(note.id)}
                onUpdateColor={(c) => onUpdateNote(note.id, { color: c })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component: Individual Note Card
function NoteCard({
  note,
  onOpen,
  onTogglePin,
  onDelete,
  onUpdateColor,
}: {
  note: TaskItem;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onUpdateColor: (color: string) => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const colorObj = PASTEL_NOTE_COLORS.find((c) => c.id === note.color) || PASTEL_NOTE_COLORS[0];
  const checklist = note.checklist_items || [];

  return (
    <div
      onClick={onOpen}
      className={`group relative rounded-2xl border ${colorObj.bg} ${colorObj.border} p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between select-none`}
    >
      <div>
        {/* Top Header: Pin & Color */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.isArray(note.labels) &&
              note.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  {lbl}
                </span>
              ))}
          </div>

          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition ${
                note.is_pinned ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Body */}
        {note.title && (
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1">
            {note.title}
          </h4>
        )}
        {note.description && (
          <p className="text-xs text-slate-700 dark:text-slate-300 font-normal leading-relaxed whitespace-pre-wrap line-clamp-6 mb-2">
            {note.description}
          </p>
        )}

        {/* Checklist Preview if any */}
        {checklist.length > 0 && (
          <div className="space-y-1 mb-2">
            {checklist.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded border border-slate-300 dark:border-stone-600 flex items-center justify-center shrink-0">
                  {item.done && <Check className="w-2 h-2 text-amber-600" />}
                </span>
                <span className={`truncate ${item.done ? 'line-through text-slate-400' : ''}`}>{item.text}</span>
              </div>
            ))}
            {checklist.length > 5 && (
              <span className="text-[10px] font-bold text-slate-400 block pt-0.5">
                +{checklist.length - 5} more items
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <span>{new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

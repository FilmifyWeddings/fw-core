'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Clock, Calendar, CheckCircle2, X, AlertCircle, 
  Check, Loader2, User, Sparkles, ArrowRight, ExternalLink 
} from 'lucide-react';

export interface StudioReminder {
  id: string;
  workspace_id?: string;
  deliverable_id: string;
  project_id?: string;
  recipient_id?: string;
  recipient_name?: string;
  title?: string;
  reminder_text?: string;
  reminder_at: string;
  status: string;
  created_at?: string;
}

interface TeamRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onCountChange?: (count: number) => void;
  onNavigateToMember?: (recipientIdOrName: string, deliverableId?: string, reminder?: StudioReminder) => void;
}

interface ParsedReminder {
  category: 'shoot' | 'video_editing' | 'photo_editing' | 'album' | 'album_printing';
  categoryLabel: string;
  categoryIcon: string;
  badgeStyle: string;
  personName: string;
  coupleName: string;
  eventName: string;
  noteText: string;
}

let memCachedReminders: StudioReminder[] = [];

function parseReminder(rem: StudioReminder): ParsedReminder {
  let fullText = (rem.reminder_text || rem.title || '').trim();
  let category: 'shoot' | 'video_editing' | 'photo_editing' | 'album' | 'album_printing' = 'shoot';
  let coupleName = '';
  let eventName = '';
  let noteText = fullText;

  // Check explicit category tag like [Video Editing] or [Photo Editing] or [Shoot] or [Album]
  const tagMatch = fullText.match(/^\[([^\]]+)\]\s*(.*)$/);
  let explicitTag = '';
  if (tagMatch) {
    explicitTag = tagMatch[1].toLowerCase();
    fullText = tagMatch[2].trim();
    noteText = fullText;
  }

  const lower = (explicitTag + ' ' + fullText).toLowerCase();

  if (
    explicitTag.includes('video') ||
    lower.includes('video') ||
    lower.includes('teaser') ||
    lower.includes('highlight') ||
    lower.includes('trailer') ||
    lower.includes('wedding film') ||
    lower.includes('cinematic') ||
    lower.includes('reel') ||
    lower.includes('sde') ||
    lower.includes('raw footage') ||
    lower.includes('video edit')
  ) {
    category = 'video_editing';
  } else if (
    explicitTag.includes('photo') ||
    lower.includes('photo edit') ||
    lower.includes('retouch') ||
    lower.includes('color grade') ||
    lower.includes('stills')
  ) {
    category = 'photo_editing';
  } else if (
    lower.includes('printing') ||
    lower.includes('print') ||
    lower.includes('binding') ||
    lower.includes('lab')
  ) {
    category = 'album_printing';
  } else if (
    explicitTag.includes('album') ||
    lower.includes('album') ||
    lower.includes('photobook') ||
    lower.includes('design')
  ) {
    category = 'album';
  } else {
    category = 'shoot';
  }

  let taskTitle = '';

  // Strip [Category Tag] prefix if present to parse header & note cleanly
  const textWithoutTag = fullText.replace(/^\[[^\]]+\]\s*/i, '').trim();

  // Check pattern: "Reminder for [Couple / Item]: [Note]"
  const matchColon = textWithoutTag.match(/^reminder\s*(?:for)?\s*([^:]+):\s*(.+)$/i);
  if (matchColon) {
    const header = matchColon[1].trim();
    noteText = matchColon[2].trim();

    // Check if header has (Task / Deliverable): e.g. "Rahul & Pooja (Pre-Wedding Edited Photos)"
    const matchParen = header.match(/^([^(]+)\s*\((.*?)\)$/);
    if (matchParen) {
      coupleName = matchParen[1].trim();
      taskTitle = matchParen[2].trim();
    } else if (header.includes('-')) {
      const parts = header.split('-');
      coupleName = parts[0].trim();
      eventName = parts.slice(1).join('-').trim();
    } else {
      coupleName = header;
    }
  } else if (textWithoutTag.includes(' - ')) {
    const parts = textWithoutTag.split(' - ');
    if (parts.length >= 2) {
      coupleName = parts[0].replace(/^reminder\s*:/i, '').trim();
      noteText = parts.slice(1).join(' - ').trim();
    }
  }

  const categoryConfigs = {
    shoot: {
      label: 'Shoot',
      icon: '📸',
      badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    video_editing: {
      label: 'Video Editing',
      icon: '🎬',
      badgeStyle: 'bg-rose-100 text-rose-900 border-rose-300'
    },
    photo_editing: {
      label: 'Photo Editing',
      icon: '✨',
      badgeStyle: 'bg-purple-100 text-purple-900 border-purple-300'
    },
    album_printing: {
      label: 'Album Printing',
      icon: '📖',
      badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300'
    },
    album: {
      label: 'Album Designing',
      icon: '🎨',
      badgeStyle: 'bg-sky-100 text-sky-900 border-sky-300'
    },
  };

  const conf = categoryConfigs[category] || categoryConfigs.shoot;

  return {
    category,
    categoryLabel: conf.label,
    categoryIcon: conf.icon,
    badgeStyle: conf.badgeStyle,
    personName: rem.recipient_name || '',
    coupleName,
    eventName: taskTitle || eventName,
    noteText: noteText || textWithoutTag || fullText,
  };
}

export default function TeamRemindersDrawer({
  isOpen,
  onClose,
  workspaceId,
  onCountChange,
  onNavigateToMember
}: TeamRemindersDrawerProps) {
  // Synchronous cache read for 0ms instant display
  const [reminders, setReminders] = useState<StudioReminder[]>(() => {
    if (memCachedReminders.length > 0) return memCachedReminders;
    if (typeof window !== 'undefined' && workspaceId) {
      try {
        const stored = localStorage.getItem(`sc_cached_reminders_${workspaceId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memCachedReminders = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<StudioReminder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Keep ref to onCountChange to prevent calling it during render
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const notifyCount = useCallback((count: number) => {
    setTimeout(() => {
      onCountChangeRef.current?.(count);
    }, 0);
  }, []);

  const fetchReminders = useCallback(async (silent = false) => {
    if (!silent && reminders.length === 0) {
      setLoading(true);
    }
    try {
      const url = workspaceId ? `/api/team/reminders?workspaceId=${workspaceId}` : '/api/team/reminders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.reminders)) {
        setReminders(data.reminders);
        memCachedReminders = data.reminders;
        if (typeof window !== 'undefined' && workspaceId) {
          try {
            localStorage.setItem(`sc_cached_reminders_${workspaceId}`, JSON.stringify(data.reminders));
          } catch (_) {}
        }
        notifyCount(data.reminders.length);
      }
    } catch (err) {
      console.warn('[TeamRemindersDrawer] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, notifyCount, reminders.length]);

  useEffect(() => {
    if (isOpen) {
      if (memCachedReminders.length > 0) {
        setReminders(memCachedReminders);
      }
      fetchReminders(memCachedReminders.length > 0);
    }
  }, [isOpen, fetchReminders]);

  // Listen for real-time reminder created events
  useEffect(() => {
    const handleNewReminder = () => {
      fetchReminders(false);
    };
    window.addEventListener('studio_reminder_created', handleNewReminder);
    return () => {
      window.removeEventListener('studio_reminder_created', handleNewReminder);
    };
  }, [fetchReminders]);

  const handleMarkDone = async (reminder: StudioReminder) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/team/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id, status: 'completed' })
      });
      const data = await res.json();
      if (data.success) {
        const nextReminders = reminders.filter(r => r.id !== reminder.id);
        setReminders(nextReminders);
        memCachedReminders = nextReminders;
        if (typeof window !== 'undefined' && workspaceId) {
          try {
            localStorage.setItem(`sc_cached_reminders_${workspaceId}`, JSON.stringify(nextReminders));
          } catch (_) {}
        }
        notifyCount(nextReminders.length);
        setConfirmTarget(null);
      }
    } catch (err) {
      console.warn('Failed to mark reminder done:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatReminderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return dateStr;
    }
  };

  const isOverdue = (dateStr: string) => {
    try {
      return new Date(dateStr).getTime() < Date.now();
    } catch (_) {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex justify-end bg-black/50 backdrop-blur-2xs">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-[#FAF9F6] h-full shadow-2xl border-l border-amber-200/80 flex flex-col text-stone-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shadow-2xs">
                <Bell className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
                  <span>Team &amp; Shoot Reminders</span>
                  {reminders.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-2xs">
                      {reminders.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Click card to view partner details • Mark done to complete
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && reminders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-bold">Loading reminders...</span>
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-stone-800">All Reminders Cleared!</h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  You have no pending reminders or follow-ups. Schedule alerts from the notes drawer inside any shoot or deliverable card.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const overdue = isOverdue(rem.reminder_at);
                const parsed = parseReminder(rem);

                return (
                  <motion.div
                    key={rem.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => {
                      if (onNavigateToMember) {
                        onNavigateToMember(rem.recipient_id || rem.recipient_name || '', rem.deliverable_id, rem);
                      }
                    }}
                    className="p-3.5 bg-white rounded-2xl border-2 border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 transition cursor-pointer space-y-2.5 group relative"
                    title="Click to view partner details & assignments"
                  >
                    {/* Top Row: Category Badge + Status Pill + Time + Done Action */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Badge */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border shadow-2xs ${parsed.badgeStyle}`}>
                          <span>{parsed.categoryIcon}</span>
                          <span>{parsed.categoryLabel}</span>
                        </span>

                        {/* Scheduled / Overdue Pill */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 font-mono shadow-2xs ${
                          overdue
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{overdue ? '⚠️ Overdue' : '⏰ Scheduled'}</span>
                        </span>

                        <span className="text-[11px] font-mono text-stone-500 font-bold">
                          {formatReminderDate(rem.reminder_at)}
                        </span>
                      </div>
                    </div>

                    {/* Person / Assignee & Couple/Event Information */}
                    <div className="space-y-1">
                      {parsed.personName && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                            <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Assignee: <strong className="text-stone-900 font-black">{parsed.personName}</strong></span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                            <span>Open details</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}

                      {(parsed.coupleName || parsed.eventName) && (
                        <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5 flex-wrap">
                          {parsed.coupleName && <span>{parsed.coupleName}</span>}
                          {parsed.coupleName && parsed.eventName && <span className="text-stone-300">•</span>}
                          {parsed.eventName && <span className="text-stone-600 font-semibold">{parsed.eventName}</span>}
                        </div>
                      )}
                    </div>

                    {/* Note Box with Green Done Checkmark Button on Right */}
                    <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-amber-200/70 text-xs font-medium text-stone-800 leading-relaxed italic flex items-center justify-between gap-3">
                      <div className="flex-1">
                        "{parsed.noteText}"
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmTarget(rem);
                        }}
                        className="shrink-0 p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-300 hover:border-emerald-400 transition cursor-pointer shadow-2xs flex items-center gap-1 group/done"
                        title="Mark comment reminder done"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover/done:scale-110 transition-transform" />
                        <span className="text-[10px] font-black not-italic text-emerald-700">Done</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-white border-t border-stone-200 text-center">
            <span className="text-[11px] text-stone-400 font-medium">
              Click any card to open partner view • Reminders stay synced
            </span>
          </div>
        </motion.div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmTarget && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-5 rounded-3xl shadow-xl border-2 border-amber-300 max-w-sm w-full space-y-3.5 text-stone-900"
              >
                <div className="flex items-center gap-2.5 text-amber-900">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black">Mark Reminder as Done?</h4>
                    <p className="text-xs text-stone-500 font-medium">
                      This reminder will be marked complete and removed from active alerts.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800">
                  {confirmTarget.reminder_text || confirmTarget.title}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmTarget(null)}
                    className="px-3.5 py-1.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleMarkDone(confirmTarget)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Confirm &amp; Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

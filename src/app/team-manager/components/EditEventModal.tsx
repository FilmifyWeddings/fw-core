'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Clock, FileText, AlertCircle, Save } from 'lucide-react';
import { FWSubEvent, FWProject } from '@/types';
import { supabase } from '@/lib/supabase';
import { logProjectActivity } from '@/lib/services/projectAuditService';

export interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FWProject | null;
  subEvent: FWSubEvent | null;
  actorName?: string;
  actorRole?: string;
  actorId?: string;
  onEventUpdated?: (updatedSubEvent: FWSubEvent) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  project,
  subEvent,
  actorName = 'Admin',
  actorRole = 'Studio Owner',
  actorId,
  onEventUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isDateTbd, setIsDateTbd] = useState(false);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [rollCall, setRollCall] = useState('10:00 AM');
  const [dismissal, setDismissal] = useState('06:00 PM');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subEvent) {
      setTitle(subEvent.event_title || '');
      setDate(subEvent.event_date || '');
      setIsDateTbd(Boolean((subEvent as any).is_date_tbd) || !subEvent.event_date);
      setVenue(subEvent.venue_name || '');
      setCity(subEvent.location_city || '');
      setRollCall(subEvent.roll_call_time || '10:00 AM');
      setDismissal(subEvent.dismissal_estimate_time || '06:00 PM');
      setNotes(subEvent.operational_notes || '');
    }
  }, [subEvent]);

  if (!isOpen || !subEvent || !project) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEvent || !project) return;
    setSaving(true);

    try {
      const oldTitle = subEvent.event_title;
      const oldDate = subEvent.event_date;
      const oldVenue = subEvent.venue_name || '';
      const oldTbd = Boolean((subEvent as any).is_date_tbd);
      const oldNotes = subEvent.operational_notes || '';

      const updatedPayload: any = {
        event_title: title.trim() || oldTitle,
        event_date: isDateTbd ? null : (date || null),
        is_date_tbd: isDateTbd,
        venue_name: venue.trim() || null,
        location_city: city.trim() || null,
        roll_call_time: rollCall,
        dismissal_estimate_time: dismissal,
        operational_notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fw_sub_events')
        .update(updatedPayload)
        .eq('id', subEvent.id);

      if (error) {
        console.error('[EditEventModal] update error:', error);
      }

      // Log granular changes to Audit Ledger
      if (oldVenue !== (venue.trim() || '')) {
        await logProjectActivity({
          projectId: project.id,
          subEventId: subEvent.id,
          actionType: 'VENUE_UPDATED',
          eventTitle: title,
          description: `Updated venue for ${title} to "${venue.trim() || 'TBD'}"`,
          previousValue: oldVenue || 'TBD',
          newValue: venue.trim() || 'TBD',
        });
      }

      const oldDateTimeStr = [oldDate || 'TBD', subEvent.roll_call_time].filter(Boolean).join(' ');
      const newDateTimeStr = [isDateTbd ? 'TBD' : (date || 'TBD'), rollCall].filter(Boolean).join(' ');

      if (isDateTbd !== oldTbd && isDateTbd) {
        await logProjectActivity({
          projectId: project.id,
          subEventId: subEvent.id,
          actionType: 'DATE_TBD_TOGGLED',
          eventTitle: title,
          description: `Marked ${title} date as Not Fixed`,
          previousValue: oldDate || 'Fixed',
          newValue: 'Not Fixed',
        });
      } else if (oldDate !== (isDateTbd ? null : date) || (subEvent.roll_call_time && rollCall && subEvent.roll_call_time !== rollCall)) {
        await logProjectActivity({
          projectId: project.id,
          subEventId: subEvent.id,
          actionType: 'SCHEDULE_SHIFTED',
          eventTitle: title,
          description: `Shifted schedule for ${title} from ${oldDateTimeStr || 'TBD'} to ${newDateTimeStr || 'TBD'}`,
          previousValue: oldDateTimeStr || 'TBD',
          newValue: newDateTimeStr || 'TBD',
        });
      }

      if (oldNotes !== (notes.trim() || '')) {
        await logProjectActivity({
          projectId: project.id,
          subEventId: subEvent.id,
          actionType: 'NOTES_UPDATED',
          eventTitle: title,
          description: `Updated shoot notes/instructions for ${title}`,
        });
      }

      const updatedSubEventObj: FWSubEvent = {
        ...subEvent,
        ...updatedPayload,
      };

      onEventUpdated?.(updatedSubEventObj);
      onClose();
    } catch (err) {
      console.error('Error saving sub event:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg bg-[#FDFBF7] dark:bg-[#1A1816] rounded-3xl border border-amber-900/15 shadow-2xl p-6 z-10 space-y-4 text-slate-800 dark:text-neutral-200"
        >
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                {project.client_name}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Edit Event Details</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-rose-100 transition"
            >
              <X className="w-4 h-4 text-slate-600 dark:text-neutral-300" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                Event Title / Function Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                  Event Date
                </label>
                <input
                  type="date"
                  disabled={isDateTbd}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-40"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDateTbd}
                    onChange={(e) => setIsDateTbd(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                    Date Not Fixed (TBD)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                Venue Location
              </label>
              <input
                type="text"
                value={venue}
                placeholder="e.g. Taj Lands End, Mumbai"
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                  Roll Call Time
                </label>
                <input
                  type="text"
                  value={rollCall}
                  onChange={(e) => setRollCall(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                  Dismissal Time
                </label>
                <input
                  type="text"
                  value={dismissal}
                  onChange={(e) => setDismissal(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-neutral-400 mb-1">
                Operational Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                placeholder="Specific instructions or reminders for crew..."
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#25221E] border border-amber-900/15 rounded-xl font-semibold"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-amber-900/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save & Log'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditEventModal;

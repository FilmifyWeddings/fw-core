'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Plus, Trash2, Edit3, Sparkles, RefreshCw, 
  Check, Sun, Star, AlertCircle, Info, Heart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CompanyHoliday } from '@/types';

interface CompanyHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHolidayUpdated?: () => void;
}

const DEFAULT_INDIAN_HOLIDAYS_PRESETS = [
  { name: 'Republic Day', date: '2026-01-26', note: 'National Holiday' },
  { name: 'Holi (Festival of Colors)', date: '2026-03-04', note: 'Mandatory Festival Holiday' },
  { name: 'Gudi Padwa / Ugadi', date: '2026-03-20', note: 'Regional New Year' },
  { name: 'Eid ul-Fitr', date: '2026-03-21', note: 'Festive Holiday' },
  { name: 'Independence Day', date: '2026-08-15', note: 'National Holiday' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14', note: 'Grand Festival Off' },
  { name: 'Gandhi Jayanti', date: '2026-10-02', note: 'National Holiday' },
  { name: 'Dussehra (Vijayadashami)', date: '2026-10-20', note: 'Festive Off' },
  { name: 'Diwali (Laxmi Pujan)', date: '2026-11-08', note: 'Mandatory Festival Holiday' },
  { name: 'Christmas Day', date: '2026-12-25', note: 'Year-End Festive Holiday' }
];

export default function CompanyHolidayModal({
  isOpen,
  onClose,
  onHolidayUpdated
}: CompanyHolidayModalProps) {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayNote, setHolidayNote] = useState('');
  const [isOptional, setIsOptional] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCompanyHolidays();
    }
  }, [isOpen]);

  const fetchCompanyHolidays = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      let query = supabase.from('company_holidays').select('*').order('holiday_date', { ascending: true });
      if (workspaceId !== 'ws_demo') {
        query = query.or(`user_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setHolidays(data);
      } else {
        // Check secondary table attendance_holidays
        const { data: altHolidays } = await supabase.from('attendance_holidays').select('*').order('date', { ascending: true });
        if (altHolidays && altHolidays.length > 0) {
          setHolidays(altHolidays.map(h => ({
            id: h.id,
            workspace_id: h.workspace_id || workspaceId,
            holiday_date: h.date,
            name: h.name,
            note: h.is_optional ? 'Optional' : 'Paid Holiday',
            is_optional: h.is_optional
          })));
        } else {
          setHolidays([]);
        }
      }
    } catch (e) {
      console.warn('Error fetching holidays:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const payload = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        holiday_date: holidayDate,
        name: holidayName.trim(),
        note: holidayNote.trim() || null,
        is_optional: isOptional,
        created_at: new Date().toISOString()
      };

      const { data: newHoli, error: insErr } = await supabase
        .from('company_holidays')
        .insert([payload])
        .select('*')
        .maybeSingle();

      if (insErr) {
        // Fallback to attendance_holidays
        await supabase.from('attendance_holidays').insert([{
          user_id: workspaceId,
          workspace_id: workspaceId,
          name: holidayName.trim(),
          date: holidayDate,
          is_optional: isOptional
        }]);
      }

      setHolidays(prev => [...prev, newHoli || (payload as any)].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
      setHolidayName('');
      setHolidayDate('');
      setHolidayNote('');
      setIsOptional(false);
      setShowAddForm(false);
      if (onHolidayUpdated) onHolidayUpdated();
    } catch (err: any) {
      console.error('Error adding holiday:', err);
      alert('Failed to add holiday.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string, date: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await supabase.from('company_holidays').delete().eq('id', id);
      await supabase.from('attendance_holidays').delete().eq('date', date);
      setHolidays(prev => prev.filter(h => h.id !== id && h.holiday_date !== date));
      if (onHolidayUpdated) onHolidayUpdated();
    } catch (e) {
      console.error('Delete holiday error:', e);
    }
  };

  const handleApplyIndianPresets = async () => {
    if (!confirm('Import standard festive & national holidays for 2026?')) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const inserts = DEFAULT_INDIAN_HOLIDAYS_PRESETS.map(h => ({
        user_id: workspaceId,
        workspace_id: workspaceId,
        holiday_date: h.date,
        name: h.name,
        note: h.note,
        is_optional: false,
        created_at: new Date().toISOString()
      }));

      await supabase.from('company_holidays').upsert(inserts, { onConflict: 'workspace_id,holiday_date' });
      fetchCompanyHolidays();
      if (onHolidayUpdated) onHolidayUpdated();
    } catch (e) {
      console.error('Preset import error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-sans overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-[#EAE5DA] shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto text-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-xs border border-purple-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Holidays & Company Leaves Calendar</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Configured holidays are automatically marked as <span className="font-bold text-purple-700">Paid Holiday</span> on staff attendance logs.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Holiday / Festival
              </button>
              <button
                type="button"
                onClick={handleApplyIndianPresets}
                disabled={submitting}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Load 2026 Festive Presets
              </button>
            </div>

            <span className="text-xs font-bold text-slate-500">
              {holidays.length} Holidays Configured
            </span>
          </div>

          {/* Add Holiday Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddHoliday}
                className="p-5 bg-white rounded-2xl border border-purple-200 shadow-2xs space-y-3 text-xs"
              >
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-900">
                  <Star className="w-4 h-4 text-purple-600" />
                  Add New Festive Holiday
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Holiday / Festival Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diwali / Laxmi Pujan"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Holiday Date *</label>
                    <input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Optional Note / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Studio closed for Laxmi Pujan celebrations"
                    value={holidayNote}
                    onChange={(e) => setHolidayNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#EAE5DA] rounded-xl font-medium text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Holiday
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Holidays List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-purple-600" />
              <p className="text-xs font-bold">Loading holiday calendar...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-[#EAE5DA] space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-purple-400" />
              <h4 className="text-sm font-bold text-slate-800">No Holidays Configured</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Load 2026 Festive Presets&quot; or &quot;+ Add Holiday&quot; above to add annual studio off-days.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {holidays.map((h) => {
                const dateObj = new Date(h.holiday_date);
                const isPast = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={h.id || h.holiday_date}
                    className={`p-4 bg-white rounded-2xl border transition-all flex items-center justify-between gap-4 shadow-2xs ${
                      isPast ? 'border-slate-200 opacity-70' : 'border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 flex flex-col items-center justify-center font-bold font-mono text-xs shrink-0">
                        <span>{dateObj.toLocaleDateString('en-IN', { day: '2-digit' })}</span>
                        <span className="text-[9px] uppercase text-purple-700">{dateObj.toLocaleDateString('en-IN', { month: 'short' })}</span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black text-slate-900">{h.name}</h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
                            Paid Holiday
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          {h.note ? ` • ${h.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteHoliday(h.id, h.holiday_date)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Note */}
          <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <p className="text-[11px] font-medium">
              Staff attendance engine automatically cross-references this calendar to grant full attendance credits without marking absents on festive days.
            </p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

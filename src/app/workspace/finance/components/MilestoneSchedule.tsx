'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  MoreVertical,
  MessageSquare,
  X
} from 'lucide-react';
import MilestoneStepDropdown from '@/components/finance/MilestoneStepDropdown';
import type { ClientFinanceRecord, FinanceMilestoneItem } from '@/types';

export interface MilestoneScheduleProps {
  record: ClientFinanceRecord;
  todayStr: string;
  paymentMilestoneTemplates: string[];
  onAddMilestoneStep: (recordId: string) => void;
  onMilestoneChange: (recordId: string, milestoneId: string, field: string, value: any) => void;
  onOpenCompletePaymentModal: (record: ClientFinanceRecord, milestone: FinanceMilestoneItem) => void;
  onOpenEditMilestone: (recordId: string, milestone: FinanceMilestoneItem) => void;
  onDeleteMilestone: (recordId: string, milestoneId: string) => void;
  onSaveNewTemplate?: (name: string) => void;
}

export function MilestoneSchedule({
  record,
  todayStr,
  paymentMilestoneTemplates,
  onAddMilestoneStep,
  onMilestoneChange,
  onOpenCompletePaymentModal,
  onOpenEditMilestone,
  onDeleteMilestone,
  onSaveNewTemplate,
}: MilestoneScheduleProps) {
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingRemarkMilestoneId, setEditingRemarkMilestoneId] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState<string>('');
  const milestoneMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (milestoneMenuRef.current && !milestoneMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    }

    if (openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openActionMenuId]);

  const milestones = record.milestones || [];

  return (
    <div className="space-y-3">
      {/* Header with Add Step */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Payment Terms & Schedule
          </h4>
          <p className="text-[11px] text-slate-400 font-medium">Installment milestones and completion records</p>
        </div>

        <button
          type="button"
          onClick={() => onAddMilestoneStep(record.id)}
          className="h-7 px-2.5 text-xs font-bold text-slate-800 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 rounded-md flex items-center gap-1 cursor-pointer transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-700" /> Add Step
        </button>
      </div>

      {/* Milestone Schedule List */}
      {milestones.length === 0 ? (
        <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-600">No installments scheduled yet.</p>
          <p className="text-[11px]">Click "+ Add Step" to schedule installment milestones.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Tablet & Desktop Column Headers (>= sm) */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 px-2.5">
            <span className="w-32 sm:w-36 shrink-0">Date</span>
            <span className="flex-1 min-w-[120px]">Step Title</span>
            <span className="w-24 sm:w-28 text-right shrink-0">Amount (₹)</span>
            <span className="w-24 sm:w-28 text-center shrink-0">Status</span>
            <span className="w-6 text-right shrink-0"></span>
          </div>

          {/* Milestone Rows */}
          {milestones.map((ms) => {
            const isPaid = ms.status === 'completed' || ms.status === 'paid' || (ms.status as string) === 'Completed';
            const isOverdue = !isPaid && ms.due_date && ms.due_date < todayStr;
            const overdueDays = isOverdue 
              ? Math.max(1, Math.floor((new Date(todayStr).getTime() - new Date(ms.due_date!).getTime()) / (1000 * 60 * 60 * 24)))
              : 0;

            return (
              <div key={ms.id}>
                {/* 💻 Tablet & Desktop Row (>= sm) */}
                <div
                  className={`hidden sm:flex items-center gap-2 p-1.5 sm:p-2 rounded-xl transition border text-xs ${
                    isPaid
                      ? 'bg-emerald-50/30 border-emerald-100'
                      : isOverdue
                      ? 'bg-rose-50/30 border-rose-200'
                      : 'hover:bg-slate-50/80 border-slate-100'
                  }`}
                >
                  {/* Date Picker */}
                  <div className="w-32 sm:w-36 shrink-0">
                    <input
                      type="date"
                      value={ms.due_date || ''}
                      onChange={(e) => onMilestoneChange(record.id, ms.id, 'due_date', e.target.value)}
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded-lg text-xs font-sans font-bold [font-variant-numeric:normal] text-slate-700 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Milestone Dropdown */}
                  <div className="flex-1 min-w-[120px]">
                    <MilestoneStepDropdown
                      value={ms.step_name || ms.title || ''}
                      onChange={(newVal) => onMilestoneChange(record.id, ms.id, 'step_name', newVal)}
                      templates={paymentMilestoneTemplates}
                      onAddTemplate={onSaveNewTemplate || (() => {})}
                      placeholder="Select Milestone"
                    />
                  </div>

                  {/* Rupee Amount */}
                  <div className="w-24 sm:w-28 shrink-0 relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={ms.amount || 0}
                      onChange={(e) => onMilestoneChange(record.id, ms.id, 'amount', Number(e.target.value))}
                      className="w-full h-7 pl-4.5 pr-2 bg-white border border-slate-200 rounded-lg text-xs font-sans font-bold [font-variant-numeric:normal] text-slate-900 text-right focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Status Button & Quick Note Trigger */}
                  <div className="w-28 sm:w-32 shrink-0 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenCompletePaymentModal(record, ms)}
                      className={`flex-1 h-7 sm:h-7.5 px-2 text-[10px] font-extrabold uppercase rounded-md border transition cursor-pointer flex items-center justify-center truncate ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {isPaid ? '✓ Paid' : isOverdue ? `${overdueDays}d Late` : 'Pending'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (editingRemarkMilestoneId === ms.id) {
                          setEditingRemarkMilestoneId(null);
                        } else {
                          setEditingRemarkMilestoneId(ms.id);
                          setRemarkDraft(ms.remarks || ms.notes || '');
                        }
                      }}
                      className={`w-7 h-7 sm:h-7.5 flex items-center justify-center rounded-md border transition cursor-pointer shrink-0 ${
                        ms.remarks || ms.notes
                          ? 'bg-amber-100/80 text-amber-700 border-amber-200 hover:bg-amber-200/80'
                          : 'text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={ms.remarks || ms.notes ? `Note: ${ms.remarks || ms.notes}` : 'Add Remark / Note'}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions Menu */}
                  <div className="w-6 shrink-0 flex items-center justify-end relative" ref={openActionMenuId === ms.id ? milestoneMenuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId(openActionMenuId === ms.id ? null : ms.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {openActionMenuId === ms.id && (
                      <div className="absolute right-0 top-7 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 w-44 z-30 space-y-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            onOpenCompletePaymentModal(record, ms);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-bold text-emerald-700 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            setEditingRemarkMilestoneId(ms.id);
                            setRemarkDraft(ms.remarks || ms.notes || '');
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-amber-50 font-bold text-amber-700 flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> {ms.remarks || ms.notes ? 'Edit Remark/Note' : 'Add Note'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            onOpenEditMilestone(record.id, ms);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Step
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            onDeleteMilestone(record.id, ms.id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 font-bold text-rose-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Remark Display / Editable Field (Desktop) */}
                {editingRemarkMilestoneId === ms.id ? (
                  <div className="hidden sm:flex mt-1 items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs animate-in fade-in duration-150">
                    <span className="text-xs">💬</span>
                    <input
                      type="text"
                      autoFocus
                      value={remarkDraft}
                      placeholder="Add note (e.g. Received via GPay on sangeet night)..."
                      onChange={(e) => setRemarkDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                          setEditingRemarkMilestoneId(null);
                        } else if (e.key === 'Escape') {
                          setEditingRemarkMilestoneId(null);
                        }
                      }}
                      onBlur={() => {
                        onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                        setEditingRemarkMilestoneId(null);
                      }}
                      className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                        setEditingRemarkMilestoneId(null);
                      }}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded cursor-pointer transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRemarkMilestoneId(null)}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  (ms.remarks || ms.notes) && (
                    <div
                      onClick={() => {
                        setEditingRemarkMilestoneId(ms.id);
                        setRemarkDraft(ms.remarks || ms.notes || '');
                      }}
                      className="hidden sm:flex text-[11px] text-neutral-500 dark:text-neutral-400 italic pl-1 items-center gap-1.5 mt-0.5 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 group/remark transition-colors"
                      title="Click to edit remark"
                    >
                      <span>💬</span>
                      <span className="font-medium">{ms.remarks || ms.notes}</span>
                      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/remark:opacity-100 transition-opacity ml-1 text-slate-400" />
                    </div>
                  )
                )}

                {/* 📱 Mobile Sleek 2-Line Milestone Card (< sm) */}
                <div className="block sm:hidden p-2 mb-1.5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-1.5">
                  {/* Row 1: Step Dropdown & Actions */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <MilestoneStepDropdown
                        value={ms.step_name || ms.title || ''}
                        onChange={(newVal) => onMilestoneChange(record.id, ms.id, 'step_name', newVal)}
                        templates={paymentMilestoneTemplates}
                        onAddTemplate={onSaveNewTemplate || (() => {})}
                        placeholder="Select Milestone"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingRemarkMilestoneId === ms.id) {
                            setEditingRemarkMilestoneId(null);
                          } else {
                            setEditingRemarkMilestoneId(ms.id);
                            setRemarkDraft(ms.remarks || ms.notes || '');
                          }
                        }}
                        className={`p-1 rounded-md border transition cursor-pointer ${
                          ms.remarks || ms.notes
                            ? 'bg-amber-100/80 text-amber-700 border-amber-200'
                            : 'text-slate-400 hover:text-slate-600 border-slate-200'
                        }`}
                        title="Add / Edit Note"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMilestone(record.id, ms.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 shrink-0 transition cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Date, Amount, Status (Compact & Balanced 12-col Grid) */}
                  <div className="grid grid-cols-12 gap-1.5 items-center pt-1 border-t border-slate-100">
                    {/* Clean Date without cutoff (col-span-5) */}
                    <div className="col-span-5">
                      <input
                        type="date"
                        value={ms.due_date || ''}
                        onChange={(e) => onMilestoneChange(record.id, ms.id, 'due_date', e.target.value)}
                        className="w-full h-7 px-1.5 text-xs font-sans font-bold [font-variant-numeric:normal] text-slate-700 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-amber-500"
                      />
                    </div>

                    {/* Compact Amount (col-span-4) */}
                    <div className="col-span-4 relative">
                      <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={ms.amount || ''}
                        onChange={(e) => onMilestoneChange(record.id, ms.id, 'amount', Number(e.target.value))}
                        className="w-full h-7 pl-4 pr-1.5 text-xs font-sans font-bold [font-variant-numeric:normal] text-slate-900 bg-slate-50 border border-slate-200 rounded-md outline-none text-right focus:bg-white focus:border-amber-500"
                      />
                    </div>

                    {/* Status Badge / Button (col-span-3) */}
                    <div className="col-span-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenCompletePaymentModal(record, ms)}
                        className={`w-full h-6 text-[10px] font-extrabold uppercase px-1 py-0.5 rounded-md border transition flex items-center justify-center truncate cursor-pointer ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {isPaid ? '✓ Paid' : isOverdue ? `${overdueDays}d Late` : 'Pending'}
                      </button>
                    </div>
                  </div>

                  {/* Mobile Inline Remark Display / Editable Field */}
                  {editingRemarkMilestoneId === ms.id ? (
                    <div className="pt-1 flex items-center gap-1.5 px-2 py-1 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs animate-in fade-in duration-150">
                      <span className="text-xs">💬</span>
                      <input
                        type="text"
                        autoFocus
                        value={remarkDraft}
                        placeholder="Add note..."
                        onChange={(e) => setRemarkDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                            setEditingRemarkMilestoneId(null);
                          } else if (e.key === 'Escape') {
                            setEditingRemarkMilestoneId(null);
                          }
                        }}
                        onBlur={() => {
                          onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                          setEditingRemarkMilestoneId(null);
                        }}
                        className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onMilestoneChange(record.id, ms.id, 'remarks', remarkDraft.trim());
                          setEditingRemarkMilestoneId(null);
                        }}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded cursor-pointer transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRemarkMilestoneId(null)}
                        className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    (ms.remarks || ms.notes) && (
                      <div
                        onClick={() => {
                          setEditingRemarkMilestoneId(ms.id);
                          setRemarkDraft(ms.remarks || ms.notes || '');
                        }}
                        className="text-[10px] text-neutral-500 dark:text-neutral-400 italic pl-1 flex items-center gap-1 mt-0.5 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 group/remark transition-colors"
                        title="Click to edit remark"
                      >
                        <span>💬</span>
                        <span className="font-medium truncate">{ms.remarks || ms.notes}</span>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/remark:opacity-100 transition-opacity ml-1 text-slate-400" />
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MilestoneSchedule;

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Check, AlertCircle, Plus } from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { supabase } from '@/lib/supabase';
import type { WorkspaceClient } from '@/types';

export interface ExpenseFormData {
  id?: string;
  expense_type?: 'project_expense' | 'team_payout' | 'other_expense';
  category: string;
  title: string;
  amount: string | number;
  paid_to: string;
  team_member_id?: string;
  payment_mode: string;
  payment_date: string;
  client_id?: string;
  notes?: string;
  reference_id?: string;
}

export interface RecordExpenseModalProps {
  isOpen: boolean;
  mode?: 'add' | 'edit';
  initialData?: Partial<ExpenseFormData>;
  clients: WorkspaceClient[];
  teamMembers?: Array<{ id?: string; name: string; role?: string; avatar_url?: string; email?: string }>;
  teamMembersList?: string[];
  currentWorkspaceId?: string;
  categories: string[];
  onCategoryCreated?: (newCategory: string) => void;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => Promise<void> | void;
}

function getMemberInitials(name: string): string {
  if (!name) return 'TM';
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'TM';
}

function cleanMemberName(raw: string): string {
  return raw.replace(/\s*\([^)]*\)/g, '').trim();
}

function extractRoleFromRaw(raw: string): string | undefined {
  const match = raw.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : undefined;
}

export default function RecordExpenseModal({
  isOpen,
  mode = 'add',
  initialData,
  clients,
  teamMembers = [],
  teamMembersList = [],
  currentWorkspaceId,
  categories,
  onCategoryCreated,
  onClose,
  onSave,
}: RecordExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_type: 'project_expense',
    category: categories[0] || 'Photographer Payout',
    title: '',
    amount: '',
    paid_to: '',
    team_member_id: '',
    payment_mode: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    client_id: '',
    notes: '',
    reference_id: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Inline Category Creation State
  const [isInlineAddCategoryOpen, setIsInlineAddCategoryOpen] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState<string[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          expense_type: initialData.expense_type || 'project_expense',
          category: initialData.category || categories[0] || 'Photographer Payout',
          title: initialData.title || '',
          amount: initialData.amount !== undefined ? String(initialData.amount) : '',
          paid_to: initialData.paid_to || '',
          team_member_id: initialData.team_member_id || '',
          payment_mode: initialData.payment_mode || 'UPI',
          payment_date: initialData.payment_date || new Date().toISOString().split('T')[0],
          client_id: initialData.client_id || '',
          notes: initialData.notes || '',
          reference_id: initialData.reference_id || '',
        });
      } else {
        setFormData({
          expense_type: 'project_expense',
          category: categories[0] || 'Photographer Payout',
          title: '',
          amount: '',
          paid_to: '',
          team_member_id: '',
          payment_mode: 'UPI',
          payment_date: new Date().toISOString().split('T')[0],
          client_id: '',
          notes: '',
          reference_id: '',
        });
      }
      setErrorMessage('');
      setIsInlineAddCategoryOpen(false);
      setInlineCategoryInput('');
    }
  }, [isOpen, initialData, categories]);

  // 1. Client Options for 3D Cream Dropdown
  const clientOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts: Searchable3DCreamSelectOption[] = [
      {
        value: '',
        label: 'None / General Studio Expense',
        badge: 'STUDIO',
        badgeClassName: 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300',
        subLabel: 'Non-shoot related operational cost',
      },
    ];

    clients.forEach((c) => {
      const shootDate = c.event_date
        ? new Date(c.event_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Date TBD';
      const shortId = (c.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();

      opts.push({
        value: c.id,
        label: c.name,
        badge: shortId ? '#' + shortId : undefined,
        badgeClassName: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono',
        subLabel: (c.event_type || 'Event Shoot') + ' • ' + shootDate,
      });
    });

    return opts;
  }, [clients]);

  // 2. Team Member / Crew Options for 3D Cream Dropdown
  const crewOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts: Searchable3DCreamSelectOption[] = [
      {
        value: '',
        label: 'Select Crew Member or Payee...',
        badge: 'OPTIONAL',
        badgeClassName: 'bg-stone-100 dark:bg-stone-800 text-stone-500',
      },
    ];

    const seenNames = new Set<string>();

    // A. From workspaceMembers (has full structured objects)
    teamMembers.forEach((m) => {
      const name = m.name?.trim();
      if (!name || seenNames.has(name.toLowerCase())) return;
      seenNames.add(name.toLowerCase());

      opts.push({
        value: m.id || name,
        label: name,
        initials: getMemberInitials(name),
        roleTag: m.role || 'Crew Member',
        subLabel: m.email || undefined,
      });
    });

    // B. From teamMembersList (strings, e.g. "Rahul Sharma (Lead Photo)")
    teamMembersList.forEach((raw) => {
      const cName = cleanMemberName(raw);
      if (!cName || seenNames.has(cName.toLowerCase())) return;
      seenNames.add(cName.toLowerCase());

      const role = extractRoleFromRaw(raw) || 'Crew Member';
      opts.push({
        value: cName,
        label: cName,
        initials: getMemberInitials(cName),
        roleTag: role,
      });
    });

    return opts;
  }, [teamMembers, teamMembersList]);

  // 3. Category Options for 3D Cream Dropdown
  const categoryOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return localCategories.map((cat) => ({
      value: cat,
      label: cat,
    }));
  }, [localCategories]);

  // Handle Crew Selection: Auto-fill paid_to and team_member_id
  const handleCrewSelect = (val: string) => {
    if (!val) {
      setFormData((prev) => ({
        ...prev,
        paid_to: '',
        team_member_id: '',
      }));
      return;
    }

    const foundMember = teamMembers.find((m) => m.id === val || m.name === val);
    const memberName = foundMember ? foundMember.name : cleanMemberName(val);

    setFormData((prev) => ({
      ...prev,
      paid_to: memberName,
      team_member_id: foundMember?.id || val,
    }));
  };

  // Handle Inline Category Creation (Studio Isolated via Supabase)
  const handleSaveNewCategory = async () => {
    const trimmed = inlineCategoryInput.trim();
    if (!trimmed) return;

    if (localCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setFormData((prev) => ({ ...prev, category: trimmed }));
      setIsInlineAddCategoryOpen(false);
      setInlineCategoryInput('');
      return;
    }

    setIsSavingCategory(true);
    try {
      let wsId = currentWorkspaceId;
      if (!wsId || wsId === 'ws_demo') {
        const { data: { session } } = await supabase.auth.getSession();
        wsId = session?.user?.id || 'ws_demo';
      }

      if (wsId && wsId !== 'ws_demo') {
        // Insert into studio_expense_categories (user_id = wsId)
        await supabase.from('studio_expense_categories').insert({
          user_id: wsId,
          name: trimmed,
          is_custom: true,
        });

        // Also into workspace_expense_categories for dual table resilience
        try {
          await supabase.from('workspace_expense_categories').insert({
            workspace_id: wsId,
            category_name: trimmed,
            is_default: false,
          });
        } catch (_) {}
      }

      const updated = Array.from(new Set([...localCategories, trimmed]));
      setLocalCategories(updated);
      setFormData((prev) => ({ ...prev, category: trimmed }));
      onCategoryCreated?.(trimmed);

      setIsInlineAddCategoryOpen(false);
      setInlineCategoryInput('');
    } catch (err) {
      console.error('Error saving custom category:', err);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const amt = Math.round(parseFloat(String(formData.amount)) || 0);
    if (!formData.title.trim()) {
      setErrorMessage('Please enter an expense title or description.');
      return;
    }
    if (amt <= 0) {
      setErrorMessage('Please enter a valid expense amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        amount: amt,
        title: formData.title.trim(),
        paid_to: formData.paid_to.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      setErrorMessage(err?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.custom-dropdown-portal')) {
          e.stopPropagation();
          return;
        }
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-[#FFFDF9] dark:bg-[#181614] rounded-3xl p-6 sm:p-7 pb-28 max-w-lg w-full border border-[#EAE5DA] dark:border-stone-800 shadow-2xl space-y-5 font-sans max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-stone-100">
                {mode === 'edit' ? 'Edit Logged Expense' : 'Record Team Payout / Expense'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
                Assign shoot, pick crew payee, and categorize ledger entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Field 1: Select Client (3D Luxury Cream Dropdown) */}
          <div className="space-y-1.5 relative z-30">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
              1. Select Client / Shoot Project (Optional)
            </label>
            <Searchable3DCreamSelect
              value={formData.client_id || ''}
              onChange={(val) => setFormData((prev) => ({ ...prev, client_id: val }))}
              options={clientOptions}
              searchable={true}
              searchPlaceholder="🔍 Search client name or ID..."
              placeholder="🏢 None / General Studio Expense"
            />
          </div>

          {/* Field 2: Team Member / Crew (3D Luxury Cream Dropdown with Avatar & Role Tag) */}
          <div className="space-y-1.5 relative z-20">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
              2. Team Member / Crew Payee
            </label>
            <Searchable3DCreamSelect
              value={formData.team_member_id || formData.paid_to || ''}
              onChange={handleCrewSelect}
              options={crewOptions}
              searchable={true}
              searchPlaceholder="🔍 Search crew member or role..."
              placeholder="Select Crew / Payee..."
            />
          </div>

          {/* Field 3: Expense Category (3D Luxury Cream Dropdown with + Add New Category Trigger) */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                3. Expense Category
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInlineAddCategoryOpen(true);
                }}
                className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Category</span>
              </button>
            </div>
            <Searchable3DCreamSelect
              value={formData.category}
              onChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
              options={categoryOptions}
              searchable={true}
              searchPlaceholder="🔍 Search category..."
              placeholder="Select Category..."
              headerAction={{
                label: 'Add New Category',
                onClick: () => setIsInlineAddCategoryOpen(true),
              }}
              inlineAdd={{
                isOpen: isInlineAddCategoryOpen,
                value: inlineCategoryInput,
                onChange: setInlineCategoryInput,
                onSave: handleSaveNewCategory,
                onCancel: () => setIsInlineAddCategoryOpen(false),
                placeholder: 'e.g. Drone License / Hotel Stay',
                isSaving: isSavingCategory,
              }}
            />
          </div>

          {/* Field 4: Title / Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
              4. Title / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lead Photographer Advance / Hotel Stay"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-bold text-slate-900 dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-2xs"
            />
          </div>

          {/* Field 5: Amount & Paid To Payee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Amount (₹) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-bold text-slate-400 dark:text-stone-500">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="25000"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full pl-7 pr-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-mono font-black text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Paid To / Payee
              </label>
              <input
                type="text"
                placeholder="e.g. Amit Sharma / Vendor"
                value={formData.paid_to}
                onChange={(e) => setFormData((prev) => ({ ...prev, paid_to: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-bold text-slate-900 dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
              />
            </div>
          </div>

          {/* Field 6: Payment Mode & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Payment Mode
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData((prev) => ({ ...prev, payment_mode: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-bold text-slate-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs cursor-pointer"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-bold text-slate-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* Field 7: Notes & UTR / Reference ID */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
              Notes & UTR / Ref (Optional)
            </label>
            <input
              type="text"
              placeholder="UTR # / Invoice # / shoot milestone notes..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-semibold text-slate-800 dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE5DA] dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-700 dark:text-stone-300 font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] font-black text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{mode === 'edit' ? 'Save Changes' : 'Record Expense'}</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

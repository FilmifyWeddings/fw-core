'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Check, Users, Sparkles } from 'lucide-react';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import type { Lead } from '@/types';
import type { WorkspaceMemberOption } from '@/lib/team-helpers';

export interface AddClientFormData {
  name: string;
  phone: string;
  email: string;
  event_type: string;
  event_date: string;
  total_package_amount: string;
  is_full_payment_received: boolean;
  advance_amount: string;
  is_advance_received: boolean;
  payment_date: string;
  payment_mode: string;
  whatsapp_group_link: string;
  project_manager_id: string;
  notes: string;
}

export interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  teamMembers: WorkspaceMemberOption[];
  eventTypes: string[];
  onAddCustomEventType: (newType: string) => void;
  onSubmit: (formData: AddClientFormData, selectedLeadId?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

function getMemberInitials(name: string): string {
  if (!name) return 'PM';
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'PM';
}

export default function AddClientModal({
  isOpen,
  onClose,
  leads,
  teamMembers,
  eventTypes,
  onAddCustomEventType,
  onSubmit,
  isSubmitting = false,
}: AddClientModalProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [formData, setFormData] = useState<AddClientFormData>({
    name: '',
    phone: '',
    email: '',
    event_type: eventTypes[0] || 'Wedding Photography',
    event_date: '',
    total_package_amount: '',
    is_full_payment_received: false,
    advance_amount: '',
    is_advance_received: false,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    whatsapp_group_link: '',
    project_manager_id: '',
    notes: '',
  });

  const [isInlineAddTypeOpen, setIsInlineAddTypeOpen] = useState(false);
  const [inlineTypeInput, setInlineTypeInput] = useState('');

  // 1. CRM Leads Options
  const leadOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts: Searchable3DCreamSelectOption[] = [
      {
        value: '',
        label: 'None / New Direct Client (Do not link CRM Lead)',
        badge: 'NEW',
        badgeClassName: 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300',
      },
    ];

    leads.forEach((lead) => {
      const leadId = lead.id || '';
      if (!leadId) return;
      const shortId = leadId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      opts.push({
        value: leadId,
        label: lead.name || 'Unnamed Lead',
        badge: shortId ? '#' + shortId : undefined,
        badgeClassName: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono',
        subLabel: (lead.phone || 'No phone') + ' • ' + (lead.event_type || 'Event Lead'),
      });
    });

    return opts;
  }, [leads]);

  // 2. Event Types Options
  const eventTypeOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return eventTypes.map((type) => ({
      value: type,
      label: type,
    }));
  }, [eventTypes]);

  // 3. Project Manager Options
  const pmOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts: Searchable3DCreamSelectOption[] = [
      {
        value: '',
        label: 'No PM Assigned (Unassigned)',
        badge: 'UNASSIGNED',
        badgeClassName: 'bg-stone-100 dark:bg-stone-800 text-stone-500',
      },
    ];

    teamMembers.forEach((member) => {
      opts.push({
        value: member.id,
        label: member.name,
        initials: getMemberInitials(member.name),
        roleTag: member.role || 'Project Manager',
        subLabel: member.email || undefined,
      });
    });

    return opts;
  }, [teamMembers]);

  // Auto-fill when CRM lead is selected
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      let leadPkg = '';
      let leadPaid = '';
      if (lead.raw_payload) {
        const raw = lead.raw_payload;
        leadPkg = String(raw.package_amount || raw.budget || raw.amount || '').replace(/[^0-9.]/g, '');
        leadPaid = String(raw.paid_amount || raw.advance || raw.token || '').replace(/[^0-9.]/g, '');
      }

      setFormData((prev) => ({
        ...prev,
        name: lead.name || prev.name,
        phone: lead.phone || prev.phone,
        email: lead.email || prev.email,
        event_type: lead.event_type || prev.event_type,
        event_date: lead.event_date ? lead.event_date.split('T')[0] : prev.event_date,
        total_package_amount: leadPkg || prev.total_package_amount,
        advance_amount: leadPaid || prev.advance_amount,
        is_advance_received: Boolean(leadPaid && parseFloat(leadPaid) > 0),
        notes: (lead as any).notes || prev.notes,
        whatsapp_group_link: lead.whatsapp_group_id
          ? 'https://chat.whatsapp.com/' + lead.whatsapp_group_id
          : prev.whatsapp_group_link,
      }));
    }
  };

  const handleSaveInlineType = () => {
    const trimmed = inlineTypeInput.trim();
    if (!trimmed) return;
    onAddCustomEventType(trimmed);
    setFormData((prev) => ({ ...prev, event_type: trimmed }));
    setIsInlineAddTypeOpen(false);
    setInlineTypeInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Client Name and Mobile Phone are required.');
      return;
    }
    await onSubmit(formData, selectedLeadId || undefined);
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
        className="bg-[#FFFDF9] dark:bg-[#181614] rounded-3xl p-6 sm:p-7 pb-28 max-w-lg w-full border border-[#EAE5DA] dark:border-stone-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE5DA] dark:border-stone-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-stone-100">
                Add New Client Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-stone-400 font-medium">
                Create client workspace & sync studio billing
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Convert CRM Lead */}
          <div className="space-y-1.5 relative z-40">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
              Convert Existing CRM Lead (Optional)
            </label>
            <Searchable3DCreamSelect
              value={selectedLeadId}
              onChange={handleLeadSelect}
              options={leadOptions}
              searchable={true}
              searchPlaceholder="🔍 Search CRM lead name or phone..."
              placeholder="-- Select a Lead from CRM to Auto-Fill --"
            />
          </div>

          {/* Client Name & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Client / Couple Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul & Sneha"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Mobile Phone *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Email & Event Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Event Date
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, event_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* 2. Event Category / Type (Dynamic from Studio Settings) */}
          <div className="space-y-1.5 relative z-30">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                Event Category / Type
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInlineAddTypeOpen(true);
                }}
                className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+ Add Custom Type</span>
              </button>
            </div>
            <Searchable3DCreamSelect
              value={formData.event_type}
              onChange={(val) => setFormData((prev) => ({ ...prev, event_type: val }))}
              options={eventTypeOptions}
              searchable={true}
              searchPlaceholder="🔍 Search event category..."
              placeholder="Select Event Category..."
              headerAction={{
                label: 'Add Custom Type',
                onClick: () => setIsInlineAddTypeOpen(true),
              }}
              inlineAdd={{
                isOpen: isInlineAddTypeOpen,
                value: inlineTypeInput,
                onChange: setInlineTypeInput,
                onSave: handleSaveInlineType,
                onCancel: () => setIsInlineAddTypeOpen(false),
                placeholder: 'e.g. Destination Wedding / Baby Shower',
              }}
            />
          </div>

          {/* 3. Assign Project Manager (PM) */}
          <div className="space-y-1.5 relative z-20">
            <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Assign Project Manager (PM)</span>
            </label>
            <Searchable3DCreamSelect
              value={formData.project_manager_id}
              onChange={(val) => setFormData((prev) => ({ ...prev, project_manager_id: val }))}
              options={pmOptions}
              searchable={true}
              searchPlaceholder="🔍 Search project manager..."
              placeholder="-- No PM Assigned (Unassigned) --"
            />
            <p className="text-[10px] text-slate-400 dark:text-stone-500">
              Assign a team member responsible for this wedding project management.
            </p>
          </div>

          {/* 4. Financial Inputs */}
          <div className="relative z-10 p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-300/60 dark:border-amber-700/40 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                  Total Package (₹)
                </label>
                <input
                  type="number"
                  placeholder="150000"
                  value={formData.total_package_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, total_package_amount: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-mono font-bold text-slate-900 dark:text-stone-100 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider block">
                  Advance Token (₹)
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={formData.advance_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      advance_amount: e.target.value,
                      is_advance_received: true,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl font-mono font-bold text-slate-900 dark:text-stone-100 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={formData.is_advance_received}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_advance_received: e.target.checked }))}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Advance Token Received</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-emerald-700 dark:text-emerald-400">
                <input
                  type="checkbox"
                  checked={formData.is_full_payment_received}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_full_payment_received: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>100% Full Payment Paid</span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="relative z-0 flex items-center justify-end gap-3 pt-3 border-t border-[#EAE5DA] dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-700 dark:text-stone-300 font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Create Client Workspace</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

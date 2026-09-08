'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Search, Users, Sparkles, RefreshCw, AlertCircle, CheckCircle2, CheckSquare, Square
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isMemberSalesPerson } from '@/app/workspace/leads/components/LeadOwnerSelect';

export interface DistributionMember {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  role?: string;
  primary_role?: string;
  roles?: string[];
  role_code?: string;
  role_codes?: string[];
  avatar_url?: string;
  is_sales_person?: boolean;
}

export interface MetaLeadFormItem {
  form_id: string;
  form_name?: string;
  name?: string;
  page_id?: string;
  distribution_config?: {
    enabled: boolean;
    owners: string[];
  };
}

export interface MetaAdsLeadDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  form?: MetaLeadFormItem | null;
  forms?: MetaLeadFormItem[];
  initialConfig?: {
    enabled: boolean;
    owners: string[];
  } | null;
  onSaveSuccess?: (formId: string, enabled: boolean, owners: string[]) => void;
}

export default function MetaAdsLeadDistributionModal({
  isOpen,
  onClose,
  workspaceId,
  form: propForm,
  forms = [],
  initialConfig,
  onSaveSuccess,
}: MetaAdsLeadDistributionModalProps) {
  // Selected Form
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<DistributionMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Active form calculation
  const activeForm = useMemo(() => {
    if (propForm) return propForm;
    if (selectedFormId && forms.length > 0) {
      return forms.find(f => f.form_id === selectedFormId) || forms[0];
    }
    return forms[0] || null;
  }, [propForm, selectedFormId, forms]);

  // Sync initial form
  useEffect(() => {
    if (propForm?.form_id) {
      setSelectedFormId(propForm.form_id);
    } else if (forms.length > 0 && !selectedFormId) {
      setSelectedFormId(forms[0].form_id);
    }
  }, [propForm, forms, selectedFormId]);

  // Sync initial config
  useEffect(() => {
    if (initialConfig) {
      setEnabled(initialConfig.enabled);
      setSelectedOwners(initialConfig.owners || []);
    } else if (activeForm?.distribution_config) {
      setEnabled(activeForm.distribution_config.enabled ?? false);
      setSelectedOwners(activeForm.distribution_config.owners || []);
    } else {
      setEnabled(false);
      setSelectedOwners([]);
    }
    setSearchQuery('');
  }, [activeForm, initialConfig, isOpen]);

  // Fetch Team Members with role detection (Sales Persons first)
  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const wsId = workspaceId || session?.user?.id || '';

        const memberMap = new Map<string, DistributionMember>();

        // 1. Fetch from fw_team_members strictly querying actual DB columns (no 'role', no 'phone')
        if (wsId) {
          const { data: fwData } = await supabase
            .from('fw_team_members')
            .select('id, user_id, name, roles, role_code, is_sales_person, avatar_url, phone_number')
            .eq('user_id', wsId);

          if (fwData && fwData.length > 0) {
            fwData.forEach((c: any) => {
              if (c.name) {
                const rolesArr = Array.isArray(c.roles) ? [...c.roles] : [];
                memberMap.set(c.name.toLowerCase().trim(), {
                  id: c.id,
                  user_id: c.user_id,
                  name: c.name.trim(),
                  primary_role: c.primary_role || rolesArr[0] || 'Sales Rep',
                  roles: rolesArr,
                  role_code: c.role_code,
                  avatar_url: c.avatar_url,
                  is_sales_person: isMemberSalesPerson(c),
                });
              }
            });
          }
        }

        // 2. Fetch from profiles
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, email, role, avatar_url')
          .limit(30);

        if (profs && profs.length > 0) {
          profs.forEach((p: any) => {
            const cleanName = (p.name || p.email?.split('@')[0] || '').trim();
            if (cleanName && !memberMap.has(cleanName.toLowerCase())) {
              const isSales = (p.role || '').toLowerCase().includes('sales') || (p.role || '').toUpperCase() === 'SP';
              memberMap.set(cleanName.toLowerCase(), {
                id: p.id,
                name: cleanName,
                email: p.email,
                role: p.role || 'Member',
                roles: [p.role || 'Member'],
                primary_role: p.role || 'Member',
                avatar_url: p.avatar_url,
                is_sales_person: isSales,
              });
            }
          });
        }

        // 3. Fallback defaults if no team members returned
        if (memberMap.size === 0) {
          memberMap.set('sales lead', { id: 'def_1', name: 'Sales Lead', role: 'Sales Person', roles: ['Sales Person'], role_code: 'SP', is_sales_person: true });
          memberMap.set('studio admin', { id: 'def_2', name: 'Studio Admin', role: 'Admin', roles: ['Admin'], is_sales_person: false });
        }

        setTeamMembers(Array.from(memberMap.values()));
      } catch (err) {
        console.warn('Failed to fetch distribution members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [isOpen, workspaceId]);

  // ── STRICT WHITELIST FILTER: ONLY MEMBERS WITH 'SALES PERSON' (SP) ROLE ──
  const salesPersonMembers = useMemo(() => {
    return (teamMembers || [])
      .filter(isMemberSalesPerson)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Search filtering strictly within salesPersonMembers
  const q = searchQuery.toLowerCase().trim();
  const filteredSales = useMemo(() => {
    if (!q) return salesPersonMembers;
    return salesPersonMembers.filter(m => {
      const matchName = m.name.toLowerCase().includes(q);
      const matchRole = Array.isArray(m.roles) && m.roles.some((r: string) => r.toLowerCase().includes(q));
      const matchPrimary = m.primary_role && m.primary_role.toLowerCase().includes(q);
      return matchName || matchRole || matchPrimary;
    });
  }, [salesPersonMembers, q]);

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners(prev =>
      prev.includes(ownerName)
        ? prev.filter(n => n !== ownerName)
        : [...prev, ownerName]
    );
  };

  const handleSelectAll = () => {
    setSelectedOwners(salesPersonMembers.map(m => m.name));
  };

  const handleDeselectAll = () => {
    setSelectedOwners([]);
  };

  const handleSave = async () => {
    if (!activeForm) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = {
        workspace_id: workspaceId || session?.user?.id || '',
        form_id: activeForm.form_id,
        form_name: activeForm.form_name || activeForm.name || `Form ${activeForm.form_id}`,
        enabled,
        owners: selectedOwners,
      };

      // 1. Save to /api/meta/forms/distribution
      const res = await fetch('/api/meta/forms/distribution', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save lead distribution strategy');
      }

      setSuccessMsg(`✅ Lead Auto-Distribution saved for "${activeForm.form_name || activeForm.name || 'Form'}"!`);
      if (onSaveSuccess) {
        onSaveSuccess(activeForm.form_id, enabled, selectedOwners);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving distribution settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#FFFDF9] dark:bg-[#181614] border border-[#EAE5DA] dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#EAE5DA] dark:border-stone-800 flex items-start justify-between bg-gradient-to-r from-amber-50/50 via-[#FFFDF9] to-transparent dark:from-stone-900">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800 shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-stone-100">
                    Lead Auto-Distribution Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-stone-400 font-medium truncate max-w-xs">
                    {activeForm?.form_name || activeForm?.name || 'Instant Lead Form'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-stone-300 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Multiple forms selector if provided */}
            {forms.length > 1 && !propForm && (
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-stone-300">
                  Select Lead Form
                </label>
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 focus:outline-none"
                >
                  {forms.map(f => (
                    <option key={f.form_id} value={f.form_id}>
                      {f.form_name || f.name || f.form_id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Master Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-[#FAF8F5] dark:bg-stone-900/60 border border-[#EAE5DA] dark:border-stone-800 rounded-2xl shadow-2xs">
              <div>
                <label className="text-xs font-black text-slate-900 dark:text-stone-100 block">
                  Auto-Distribute Meta Leads
                </label>
                <span className="text-[11px] text-slate-500 dark:text-stone-400 font-medium">
                  {enabled ? 'Active — Rotating incoming leads among checked owners' : 'Paused — Leads stay unassigned'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* When Auto-Distribute is ON */}
            {enabled && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="🔍 Search member to include..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Available Sales Representatives ({salesPersonMembers.length})
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-stone-700">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:underline cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Checklist Container (STRICTLY SALES PERSONS ONLY) */}
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Loading sales representatives...</span>
                  </div>
                ) : salesPersonMembers.length === 0 ? (
                  <div className="p-5 text-center space-y-2 bg-amber-50/50 dark:bg-stone-800/40 rounded-2xl border border-dashed border-amber-200 dark:border-stone-700 my-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                    <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                      No team members assigned as Sales Person
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-stone-400">
                      Assign the &quot;Sales Person (SP)&quot; role to team members in Team Manager to enable Meta Ads lead distribution.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredSales.map(member => {
                      const isChecked = selectedOwners.includes(member.name);
                      return (
                        <div
                          key={member.id || member.name}
                          onClick={() => toggleOwner(member.name)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                            isChecked
                              ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-800 text-slate-900 dark:text-stone-100 shadow-2xs'
                              : 'bg-white dark:bg-stone-900 border-[#EAE5DA] dark:border-stone-800 text-slate-600 dark:text-stone-300 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="truncate min-w-0">
                              <p className="text-xs font-black truncate">{member.name}</p>
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
                                Sales Person
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                              Sales Person
                            </span>
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                              isChecked 
                                ? 'bg-amber-500 border-amber-600 text-white' 
                                : 'border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredSales.length === 0 && searchQuery && (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No matching sales representatives found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#EAE5DA] dark:border-stone-800 bg-[#FAF8F5] dark:bg-stone-900/90 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-stone-300 hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Lead Distribution</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

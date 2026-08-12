'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, Users, CheckCircle2, RefreshCw, Sparkles,
  Zap, AlertCircle, ChevronRight, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MetaFormItem {
  form_id: string;
  form_name: string;
  page_id?: string;
  distribution_config?: {
    enabled: boolean;
    strategy: string;
    owners: string[];
    last_assigned_index: number;
  };
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

interface MetaLeadDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  forms: MetaFormItem[];
  onSaveSuccess?: () => void;
}

export function MetaLeadDistributionModal({
  isOpen,
  onClose,
  workspaceId,
  forms = [],
  onSaveSuccess,
}: MetaLeadDistributionModalProps) {
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Fetch team members (Lead Owners)
  useEffect(() => {
    if (!isOpen) return;

    const fetchTeamMembers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, role')
          .eq('workspace_id', workspaceId);

        if (!error && data && data.length > 0) {
          setTeamMembers(data.map(d => ({
            id: d.id,
            name: d.name || d.email || 'Team Member',
            email: d.email,
            role: d.role || 'Lead Owner',
            avatar_url: d.avatar_url,
          })));
        } else {
          // Fallback team members if profiles table doesn't have workspace_id set
          const { data: allProfiles } = await supabase.from('profiles').select('id, name, email, avatar_url, role').limit(10);
          if (allProfiles && allProfiles.length > 0) {
            setTeamMembers(allProfiles.map(d => ({
              id: d.id,
              name: d.name || d.email || 'Team Member',
              email: d.email,
              role: d.role || 'Lead Owner',
              avatar_url: d.avatar_url,
            })));
          } else {
            // Default Studio Team Members
            setTeamMembers([
              { id: '1', name: 'Sushant', role: 'Studio Admin' },
              { id: '2', name: 'Kajal', role: 'Lead Owner' },
              { id: '3', name: 'Rahul', role: 'Sales Manager' },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch team members for distribution:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [isOpen, workspaceId]);

  // Set default selected form when forms load or change
  useEffect(() => {
    if (forms.length > 0 && !selectedFormId) {
      setSelectedFormId(forms[0].form_id);
    }
  }, [forms, selectedFormId]);

  // Sync selected form's current distribution config
  useEffect(() => {
    if (!selectedFormId) return;
    const currentForm = forms.find(f => f.form_id === selectedFormId);
    if (currentForm && currentForm.distribution_config) {
      setEnabled(currentForm.distribution_config.enabled ?? false);
      setSelectedOwners(currentForm.distribution_config.owners || []);
    } else {
      setEnabled(false);
      setSelectedOwners([]);
    }
  }, [selectedFormId, forms]);

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners(prev =>
      prev.includes(ownerName)
        ? prev.filter(o => o !== ownerName)
        : [...prev, ownerName]
    );
  };

  const handleSave = async () => {
    if (!selectedFormId) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const currentForm = forms.find(f => f.form_id === selectedFormId);

      const res = await fetch('/api/facebook/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          page_id: currentForm?.page_id || 'page_default',
          form_id: selectedFormId,
          form_name: currentForm?.form_name || `Form ${selectedFormId}`,
          distribution_config: {
            enabled,
            strategy: 'round_robin',
            owners: selectedOwners,
            last_assigned_index: -1,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save lead distribution strategy');
      }

      setSuccessMsg(`✅ Distribution Strategy saved! Leads will rotate among ${selectedOwners.length} owners.`);
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-xl bg-[#121110] border border-[#2C2926] rounded-3xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-[#2C2926] bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Meta Form Lead Distribution
                </h3>
                <p className="text-xs text-zinc-400">
                  Round-Robin equal load balancing per Facebook Ad Form
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Form Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Select Meta Lead Form
              </label>
              {forms.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 italic">
                  No Meta Lead Forms available. Connect a Meta Facebook Page first.
                </div>
              ) : (
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full bg-[#1C1A18] border border-[#2C2926] text-sm text-zinc-100 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  {forms.map((f) => (
                    <option key={f.form_id} value={f.form_id}>
                      {f.form_name} ({f.form_id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Toggle Enable Auto-Distribution */}
            <div className="p-4 rounded-2xl bg-[#1C1A18] border border-[#2C2926] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Automatic Lead Distribution</span>
                  {enabled && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  Automatically set Lead Owner when new lead arrives from this form
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                  enabled ? 'bg-orange-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Round Robin Strategy Badge */}
            {enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Strategy: <strong>Equal Round-Robin Rotation</strong></span>
                </div>
                <span className="text-[11px] bg-orange-500/20 px-2.5 py-0.5 rounded-md font-mono font-bold">
                  {selectedOwners.length} Owners Selected
                </span>
              </motion.div>
            )}

            {/* Lead Owners Selection Grid with Circular Checkboxes */}
            {enabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Select Lead Owners (Check circle to assign)
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    A ka B ko nahi dikhega (Role Scoped)
                  </span>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading team members...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {teamMembers.map((member) => {
                      const isSelected = selectedOwners.includes(member.name);
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleOwner(member.name)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500/40 text-white'
                              : 'bg-[#1C1A18] border-[#2C2926] text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Avatar */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shrink-0">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                member.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold truncate text-white">{member.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono truncate">{member.role}</div>
                            </div>
                          </div>

                          {/* Circular Checkbox Icon */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-orange-500 text-black font-black scale-105'
                                : 'border-2 border-zinc-700 bg-zinc-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[#2C2926] bg-[#121110] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedFormId}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs shadow-lg hover:opacity-95 transition-all inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Strategy'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

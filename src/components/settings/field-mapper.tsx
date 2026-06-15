'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Trash2, HelpCircle, ArrowRightLeft, Sparkles } from 'lucide-react';
import { FieldMapping } from '@/types';

interface FieldMapperProps {
  mappings: FieldMapping[];
  onSaveMappings: (newMappings: Array<{ meta_field_key: string; system_field_key: string }>) => Promise<void>;
}

export function FieldMapper({ mappings, onSaveMappings }: FieldMapperProps) {
  const [localMappings, setLocalMappings] = useState<Array<{ meta_field_key: string; system_field_key: string }>>(
    mappings.map(m => ({ meta_field_key: m.meta_field_key, system_field_key: m.system_field_key }))
  );
  
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newSystemKey, setNewSystemKey] = useState('name');
  const [saving, setSaving] = useState(false);

  // Available standard system fields
  const systemFields = [
    { key: 'name', label: 'Client Full Name' },
    { key: 'phone', label: 'Primary Contact (Phone)' },
    { key: 'email', label: 'Email Address' },
    { key: 'budget', label: 'Wedding Budget' },
    { key: 'venue', label: 'Event Venue/Location' },
    { key: 'event_date', label: 'Event Date' },
    { key: 'functions', label: 'Number of Days/Functions' },
  ];

  // Mock Meta form templates to auto-populate
  const autoDetectTemplate = () => {
    const defaultMetaKeys = [
      { meta_field_key: 'full_name', system_field_key: 'name' },
      { meta_field_key: 'phone_number', system_field_key: 'phone' },
      { meta_field_key: 'email', system_field_key: 'email' },
      { meta_field_key: 'wedding_location', system_field_key: 'venue' },
      { meta_field_key: 'budget_limit', system_field_key: 'budget' },
      { meta_field_key: 'date_of_wedding', system_field_key: 'event_date' },
      { meta_field_key: 'total_functions', system_field_key: 'functions' },
    ];
    setLocalMappings(defaultMetaKeys);
  };

  const addMapping = () => {
    if (!newMetaKey.trim()) return;
    // Check duplicates
    if (localMappings.some(m => m.meta_field_key === newMetaKey.trim())) return;

    setLocalMappings([...localMappings, {
      meta_field_key: newMetaKey.trim(),
      system_field_key: newSystemKey
    }]);
    setNewMetaKey('');
  };

  const removeMapping = (idx: number) => {
    setLocalMappings(localMappings.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveMappings(localMappings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-orange-400" />
            Meta Ads Field Mapping Engine
          </h4>
          <p className="text-xs text-zinc-400">Map Facebook Form keys to FW Core system database columns</p>
        </div>
        <button
          onClick={autoDetectTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400 text-xs font-semibold hover:bg-orange-500/20 transition-all shadow-[0_0_15px_-3px_rgba(249,115,22,0.1)]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto-Detect Fields
        </button>
      </div>

      {/* Adding Row Form */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 mb-6 items-end sm:items-center justify-between">
        <div className="w-full sm:w-1/2">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">Meta Form Key</label>
          <input
            type="text"
            placeholder="e.g. wedding_budget_estimate"
            value={newMetaKey}
            onChange={(e) => setNewMetaKey(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700 font-mono"
          />
        </div>
        <div className="w-full sm:w-1/3">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">Map to Database</label>
          <select
            value={newSystemKey}
            onChange={(e) => setNewSystemKey(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
          >
            {systemFields.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addMapping}
          className="w-full sm:w-auto p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white rounded-lg flex items-center justify-center transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Mapping list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {localMappings.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-900 rounded-xl">
            No active field mappings set. Use Auto-Detect to start mapping fields.
          </div>
        ) : (
          localMappings.map((mapping, idx) => {
            const sys = systemFields.find(s => s.key === mapping.system_field_key);
            return (
              <motion.div
                key={`${mapping.meta_field_key}-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-850 transition-all"
              >
                <div className="flex items-center gap-4 shrink-0 min-w-0">
                  <span className="font-mono text-xs text-orange-400 bg-orange-950/20 border border-orange-950/30 px-2 py-0.5 rounded-md truncate max-w-[150px] sm:max-w-[200px]">
                    {mapping.meta_field_key}
                  </span>
                  <span className="text-zinc-500 text-xs">→</span>
                  <span className="text-xs font-semibold text-white">{sys?.label || mapping.system_field_key}</span>
                </div>
                <button
                  onClick={() => removeMapping(idx)}
                  className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Save Button */}
      {localMappings.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
            {!saving && <Check className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

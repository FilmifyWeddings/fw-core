'use client';

/**
 * ══════════════════════════════════════════════════════════════════
 * AUTOMATION BUILDER — Visual step-stack workflow editor
 * Route: /dashboard/workflows/[id]  (id = 'new' for creation)
 * ══════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Plus, Save, Play, ArrowLeft, Trash2, ChevronDown,
  MessageSquare, Table2, Contact, Timer, Globe, Zap, AlertCircle,
  CheckCircle2, X, GripVertical, Webhook, MousePointer,
  Users, RefreshCw, Eye, Settings2, ChevronRight, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = 'facebook_lead' | 'webhook' | 'manual' | 'crm_entry';
type StepType = 'whatsapp_send' | 'whatsapp_group_alert' | 'google_sheet_append' | 'google_contact_create' | 'whatsapp_delay_sequence' | 'http_request';

interface StepDefinition {
  id: string;
  type: StepType;
  label: string;
  config: Record<string, unknown>;
}

interface WorkflowState {
  name: string;
  description: string;
  is_enabled: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  steps: StepDefinition[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TRIGGERS: { type: TriggerType; label: string; icon: React.ReactNode; color: string; description: string; fields: { key: string; label: string; placeholder: string; required?: boolean }[] }[] = [
  {
    type: 'facebook_lead',
    label: 'Facebook Lead',
    icon: <FacebookIcon className="w-4 h-4" />,
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    description: 'Fires when a new lead submits your Facebook Lead Ad form',
    fields: [{ key: 'form_id', label: 'Form ID (optional)', placeholder: 'e.g. 1234567890 — leave blank to match any form' }],
  },
  {
    type: 'webhook',
    label: 'Webhook / HTTP',
    icon: <Webhook className="w-4 h-4" />,
    color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
    description: 'Receives an HTTP POST from any external system',
    fields: [{ key: 'secret', label: 'Webhook Secret (optional)', placeholder: 'Optional secret to validate payloads' }],
  },
  {
    type: 'manual',
    label: 'Manual / Test',
    icon: <MousePointer className="w-4 h-4" />,
    color: 'from-zinc-500/20 to-zinc-400/10 border-zinc-500/30',
    description: 'Triggered only by clicking "Test Run" — great for testing',
    fields: [],
  },
  {
    type: 'crm_entry',
    label: 'New CRM Lead',
    icon: <Users className="w-4 h-4" />,
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    description: 'Fires when a new lead is added to the CRM',
    fields: [{ key: 'status_filter', label: 'Status Filter (optional)', placeholder: 'e.g. new — leave blank for any status' }],
  },
];

const ACTION_TYPES: { type: StepType; label: string; icon: React.ReactNode; color: string; description: string; fields: { key: string; label: string; placeholder: string; type?: string; required?: boolean }[] }[] = [
  {
    type: 'whatsapp_send',
    label: 'Send WhatsApp Message',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    description: 'Send a text or template message via WhatsApp',
    fields: [
      { key: 'to', label: 'To (phone / JID)', placeholder: '{{trigger.phone}} or 919876543210', required: true },
      { key: 'message', label: 'Message Text', placeholder: 'Hello {{trigger.name}}, welcome!', type: 'textarea' },
      { key: 'template_id', label: 'Template ID (optional)', placeholder: 'Leave blank to send plain text message' },
    ],
  },
  {
    type: 'whatsapp_group_alert',
    label: 'WhatsApp Group Alert',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30',
    description: 'Send an alert message to a WhatsApp Group JID',
    fields: [
      { key: 'group_jid', label: 'Group JID', placeholder: '120363xxxxxxxxx@g.us', required: true },
      { key: 'message', label: 'Message', placeholder: 'New lead: {{trigger.name}} ({{trigger.phone}})', type: 'textarea', required: true },
    ],
  },
  {
    type: 'google_sheet_append',
    label: 'Google Sheets: Append Row',
    icon: <Table2 className="w-4 h-4" />,
    color: 'from-green-500/20 to-lime-500/10 border-green-500/30',
    description: 'Append a new row to a Google Spreadsheet',
    fields: [
      { key: 'spreadsheet_id', label: 'Spreadsheet ID', placeholder: 'Paste the spreadsheet ID from the URL', required: true },
      { key: 'range', label: 'Sheet Range', placeholder: 'Sheet1!A:Z' },
      { key: 'values_csv', label: 'Row Values (comma separated)', placeholder: '{{trigger.name}},{{trigger.phone}},{{trigger.email}}', required: true },
    ],
  },
  {
    type: 'google_contact_create',
    label: 'Google Contacts: Create',
    icon: <Contact className="w-4 h-4" />,
    color: 'from-blue-500/20 to-sky-500/10 border-blue-500/30',
    description: 'Create a new contact in Google Contacts',
    fields: [
      { key: 'name', label: 'Full Name', placeholder: '{{trigger.name}}', required: true },
      { key: 'phone', label: 'Phone Number', placeholder: '{{trigger.phone}}' },
      { key: 'email', label: 'Email Address', placeholder: '{{trigger.email}}' },
    ],
  },
  {
    type: 'whatsapp_delay_sequence',
    label: 'Delayed WhatsApp Follow-up',
    icon: <Timer className="w-4 h-4" />,
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
    description: 'Schedule a WhatsApp template message after N days',
    fields: [
      { key: 'to', label: 'To (phone / JID)', placeholder: '{{trigger.phone}}', required: true },
      { key: 'delay_days', label: 'Delay (days)', placeholder: '5', required: true },
      { key: 'template_id', label: 'Template ID', placeholder: 'The template to send after the delay', required: true },
    ],
  },
  {
    type: 'http_request',
    label: 'HTTP Request (Webhook Out)',
    icon: <Globe className="w-4 h-4" />,
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
    description: 'Send an HTTP request to any external URL',
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://your-api.com/webhook', required: true },
      { key: 'method', label: 'Method', placeholder: 'POST' },
      { key: 'body_json', label: 'Body (JSON)', placeholder: '{"name": "{{trigger.name}}", "phone": "{{trigger.phone}}"}', type: 'textarea' },
    ],
  },
];

const TRIGGER_TOKENS: Record<TriggerType, string[]> = {
  facebook_lead: ['{{trigger.name}}', '{{trigger.phone}}', '{{trigger.email}}', '{{trigger.city}}', '{{trigger.form_id}}', '{{trigger.ad_name}}'],
  webhook:       ['{{trigger.name}}', '{{trigger.phone}}', '{{trigger.email}}', '{{trigger.data}}'],
  manual:        ['{{trigger.name}}', '{{trigger.phone}}'],
  crm_entry:     ['{{trigger.name}}', '{{trigger.phone}}', '{{trigger.email}}', '{{trigger.status}}', '{{trigger.source}}'],
};

const STEP_OUTPUT_TOKENS: Record<StepType, string[]> = {
  whatsapp_send:           ['waMessageId'],
  whatsapp_group_alert:    ['waMessageId'],
  google_sheet_append:     ['updatedRange', 'updatedRows'],
  google_contact_create:   ['resourceName'],
  whatsapp_delay_sequence: ['scheduled_at', 'delay_days'],
  http_request:            ['status', 'response'],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TokenPicker({
  tokens,
  onSelect,
  onClose,
}: {
  tokens: string[];
  onSelect: (t: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      className="absolute top-full left-0 mt-1 z-50 w-72 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Insert Variable</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="max-h-52 overflow-y-auto p-2 space-y-0.5">
        {tokens.map(token => (
          <button
            key={token}
            onClick={() => { onSelect(token); onClose(); }}
            className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-mono text-orange-300 hover:bg-zinc-800 hover:text-orange-200 transition-colors"
          >
            {token}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function FieldInput({
  fieldKey,
  label,
  placeholder,
  value,
  onChange,
  type,
  availableTokens,
  required,
}: {
  fieldKey: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  availableTokens: string[];
  required?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const insertToken = (token: string) => {
    onChange(value ? `${value} ${token}` : token);
  };

  const baseInputClass = "w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:bg-zinc-800 transition-all resize-none";

  return (
    <div className="space-y-1" ref={ref}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {availableTokens.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker(v => !v)}
              className="flex items-center gap-1 text-[9px] font-bold text-orange-400/70 hover:text-orange-400 transition-colors px-1.5 py-0.5 rounded bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/20"
            >
              <Zap className="w-2.5 h-2.5" /> + Variable
            </button>
            <AnimatePresence>
              {showPicker && (
                <TokenPicker tokens={availableTokens} onSelect={insertToken} onClose={() => setShowPicker(false)} />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={baseInputClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseInputClass}
        />
      )}
    </div>
  );
}

function StepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onDelete,
  availableTokens,
}: {
  step: StepDefinition;
  index: number;
  totalSteps: number;
  onUpdate: (id: string, config: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  availableTokens: string[];
}) {
  const [expanded, setExpanded] = useState(true);
  const actionDef = ACTION_TYPES.find(a => a.type === step.type);
  if (!actionDef) return null;

  return (
    <div className="relative">
      {/* Connector line */}
      {index < totalSteps - 1 && (
        <div className="absolute left-6 top-full h-4 w-0.5 bg-gradient-to-b from-zinc-700 to-transparent z-10" />
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className={`relative rounded-2xl border bg-gradient-to-br ${actionDef.color} overflow-hidden`}
      >
        {/* Step header */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="w-7 h-7 rounded-xl bg-zinc-900/60 flex items-center justify-center flex-shrink-0">
            {actionDef.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Step {index + 1}</span>
            </div>
            <p className="text-xs font-bold text-white truncate">{step.label || actionDef.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(step.id); }}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Step fields */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3 border-t border-zinc-800/40"
            >
              <div className="pt-3 space-y-3">
                {/* Custom label */}
                <FieldInput
                  fieldKey="label"
                  label="Step Label"
                  placeholder={actionDef.label}
                  value={step.label}
                  onChange={v => onUpdate(step.id, { ...step.config, _label: v })}
                  availableTokens={[]}
                />
                {/* Action-specific fields */}
                {actionDef.fields.map(field => (
                  <FieldInput
                    key={field.key}
                    fieldKey={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={String(step.config[field.key] || '')}
                    onChange={v => onUpdate(step.id, { ...step.config, [field.key]: v })}
                    type={field.type}
                    availableTokens={availableTokens}
                    required={field.required}
                  />
                ))}

                {/* Output tokens hint */}
                {STEP_OUTPUT_TOKENS[step.type]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wide mr-1">Output vars:</span>
                    {STEP_OUTPUT_TOKENS[step.type].map(token => (
                      <span key={token} className="text-[9px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                        {`{{step_${index}.${token}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params?.id as string;
  const isNew = workflowId === 'new';

  const [workflow, setWorkflow] = useState<WorkflowState>({
    name: '',
    description: '',
    is_enabled: true,
    trigger_type: 'facebook_lead',
    trigger_config: {},
    steps: [],
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing workflow
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const res = await fetch(`/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const wf = json.workflow;
        setWorkflow({
          name: wf.name,
          description: wf.description || '',
          is_enabled: wf.is_enabled,
          trigger_type: wf.trigger_type,
          trigger_config: wf.trigger_config || {},
          steps: wf.steps || [],
        });
      }
      setLoading(false);
    };
    load();
  }, [workflowId, isNew, router]);

  const addStep = (type: StepType) => {
    const def = ACTION_TYPES.find(a => a.type === type)!;
    const newStep: StepDefinition = {
      id: `step_${Date.now()}`,
      type,
      label: def.label,
      config: {},
    };
    setWorkflow(w => ({ ...w, steps: [...w.steps, newStep] }));
    setShowActionPicker(false);
  };

  const updateStepConfig = (stepId: string, newConfig: Record<string, unknown>) => {
    setWorkflow(w => ({
      ...w,
      steps: w.steps.map(s => {
        if (s.id !== stepId) return s;
        const label = (newConfig._label as string) || s.label;
        const { _label, ...cleanConfig } = newConfig;
        return { ...s, label, config: cleanConfig };
      }),
    }));
  };

  const deleteStep = (stepId: string) => {
    setWorkflow(w => ({ ...w, steps: w.steps.filter(s => s.id !== stepId) }));
  };

  const getAvailableTokensForStep = (stepIndex: number): string[] => {
    const tokens = [...(TRIGGER_TOKENS[workflow.trigger_type] || [])];
    for (let i = 0; i < stepIndex; i++) {
      const step = workflow.steps[i];
      for (const token of STEP_OUTPUT_TOKENS[step.type] || []) {
        tokens.push(`{{step_${i}.${token}}}`);
      }
    }
    return tokens;
  };

  const handleSave = async () => {
    if (!workflow.name.trim()) { alert('Please enter a workflow name'); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      name: workflow.name,
      description: workflow.description,
      is_enabled: workflow.is_enabled,
      trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config,
      steps: workflow.steps,
    };

    const res = await fetch(isNew ? '/api/workflows' : `/api/workflows/${workflowId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    setSaving(false);

    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      if (isNew && json.workflow?.id) {
        router.replace(`/dashboard/workflows/${json.workflow.id}`);
      }
    } else {
      alert(`Save failed: ${json.error}`);
    }
  };

  const handleTestRun = async () => {
    if (isNew) { alert('Save the workflow first before running a test.'); return; }
    setRunningTest(true);
    setTestResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setRunningTest(false);
    setTestResult({
      success: json.success,
      message: json.success
        ? `✅ ${json.stepsCompleted} step(s) completed successfully`
        : `⚠️ ${json.stepsFailed} step(s) failed — check run logs`,
    });
  };

  const triggerDef = TRIGGERS.find(t => t.type === workflow.trigger_type)!;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center text-zinc-600">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Loading workflow...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white font-sans">
      {/* ── Top Toolbar ── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60 bg-[#070708]/90 backdrop-blur-lg">
        <button
          onClick={() => router.push('/dashboard/workflows')}
          className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={workflow.name}
            onChange={e => setWorkflow(w => ({ ...w, name: e.target.value }))}
            placeholder="Workflow name..."
            className="bg-transparent text-base font-extrabold text-white placeholder-zinc-700 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Enable toggle */}
          <button
            onClick={() => setWorkflow(w => ({ ...w, is_enabled: !w.is_enabled }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              workflow.is_enabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
            }`}
          >
            {workflow.is_enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {workflow.is_enabled ? 'Enabled' : 'Disabled'}
          </button>

          {/* View runs */}
          {!isNew && (
            <button
              onClick={() => router.push(`/dashboard/workflows/${workflowId}/runs`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white text-[11px] font-bold transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Runs
            </button>
          )}

          {/* Test Run */}
          <button
            onClick={handleTestRun}
            disabled={runningTest || isNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {runningTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Test Run
          </button>

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-black text-[11px] font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
          </motion.button>
        </div>
      </div>

      {/* ── Test Result Banner ── */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-5 py-3 border-b text-sm font-semibold flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            <span>{testResult.message}</span>
            <button onClick={() => setTestResult(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Canvas ── */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Description */}
        <div className="mb-2">
          <input
            type="text"
            value={workflow.description}
            onChange={e => setWorkflow(w => ({ ...w, description: e.target.value }))}
            placeholder="Add a description (optional)..."
            className="w-full bg-transparent text-sm text-zinc-500 placeholder-zinc-700 focus:outline-none focus:text-zinc-300 transition-colors"
          />
        </div>

        {/* ── TRIGGER CARD ── */}
        <div className="relative">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-orange-400" />
          </div>

          <div className={`rounded-2xl border bg-gradient-to-br ${triggerDef.color} overflow-hidden`}>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Trigger</span>
              </div>
              <p className="text-sm font-extrabold text-white mb-0.5">When this happens…</p>
              <p className="text-[11px] text-zinc-400">{triggerDef.description}</p>
            </div>

            <div className="px-5 pb-4 space-y-3">
              {/* Trigger type selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Trigger Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGERS.map(t => (
                    <button
                      key={t.type}
                      onClick={() => setWorkflow(w => ({ ...w, trigger_type: t.type, trigger_config: {} }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        workflow.trigger_type === t.type
                          ? 'bg-zinc-800 border-orange-500/40 text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger config fields */}
              {triggerDef.fields.map(field => (
                <FieldInput
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={String(workflow.trigger_config[field.key] || '')}
                  onChange={v => setWorkflow(w => ({ ...w, trigger_config: { ...w.trigger_config, [field.key]: v } }))}
                  availableTokens={[]}
                />
              ))}

              {/* Available trigger tokens hint */}
              <div>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide">Available variables from this trigger: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {TRIGGER_TOKENS[workflow.trigger_type].map(t => (
                    <span key={t} className="text-[9px] font-mono bg-zinc-800/80 text-orange-300/70 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connector to first step */}
          {workflow.steps.length > 0 && (
            <div className="absolute left-6 top-full h-4 w-0.5 bg-gradient-to-b from-zinc-700 to-zinc-800 z-10" />
          )}
        </div>

        {/* ── STEPS ── */}
        <AnimatePresence>
          {workflow.steps.map((step, i) => (
            <div key={step.id} className="relative pl-3">
              {/* Step number badge */}
              <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                <span className="text-[9px] font-black text-zinc-400">{i + 1}</span>
              </div>

              <StepCard
                step={step}
                index={i}
                totalSteps={workflow.steps.length}
                onUpdate={updateStepConfig}
                onDelete={deleteStep}
                availableTokens={getAvailableTokensForStep(i)}
              />
            </div>
          ))}
        </AnimatePresence>

        {/* ── ADD STEP BUTTON ── */}
        <div className="relative pl-3">
          {workflow.steps.length > 0 && (
            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-zinc-800/60 rounded-full" />
          )}

          <AnimatePresence>
            {showActionPicker ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-zinc-900/80 border border-zinc-700/60 rounded-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <span className="text-xs font-extrabold text-white">Add an Action Step</span>
                  <button onClick={() => setShowActionPicker(false)}><X className="w-4 h-4 text-zinc-500" /></button>
                </div>
                <div className="p-3 grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto">
                  {ACTION_TYPES.map(action => (
                    <button
                      key={action.type}
                      onClick={() => addStep(action.type)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-zinc-800/60 transition-all group border border-transparent hover:border-zinc-700/60"
                    >
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">{action.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{action.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowActionPicker(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-orange-500/30 hover:bg-orange-500/5 text-zinc-600 hover:text-orange-400 text-xs font-bold transition-all group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                Add Action Step
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Help Panel ── */}
        {workflow.steps.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40"
          >
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-400">How it works</p>
                <ul className="text-[11px] text-zinc-600 space-y-0.5 list-disc list-inside">
                  <li>Choose a <span className="text-zinc-400 font-semibold">Trigger</span> — when the workflow fires</li>
                  <li>Add <span className="text-zinc-400 font-semibold">Action Steps</span> — what happens in sequence</li>
                  <li>Use <span className="text-orange-400/70 font-mono text-[10px]">{'{{trigger.phone}}'}</span> tokens to pass data between steps</li>
                  <li>Click <span className="text-zinc-400 font-semibold">Test Run</span> to validate with sample data</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

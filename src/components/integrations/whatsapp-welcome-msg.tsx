'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Plus, Trash2, Clock, Send, CheckCircle2, 
  AlertTriangle, RefreshCw, Smartphone, ArrowDown, HelpCircle,
  Search, ShieldAlert, Sparkles, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Template {
  id: string;
  name: string;
  type: string;
}

interface Step {
  template_name: string;
  delay_seconds: number;
}

interface LogEntry {
  id: string;
  lead_name?: string;
  lead_id: string;
  phone: string;
  step_number: number;
  template_name: string;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
}

interface WhatsappWelcomeMsgProps {
  workspaceId: string;
}

export function WhatsappWelcomeMsg({ workspaceId }: WhatsappWelcomeMsgProps) {
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    { template_name: 'welcome_intro', delay_seconds: 0 },
    { template_name: 'brochure_share', delay_seconds: 60 }
  ]);
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: 'welcome_intro', type: 'text' },
    { id: '2', name: 'brochure_share', type: 'media' },
    { id: '3', name: 'discount_offer', type: 'text' },
    { id: '4', name: 'followup_call', type: 'text' }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDemo, setIsDemo] = useState(false);

  // Load Automation settings & logs
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Load templates
        const { data: dbTemplates, error: tempErr } = await supabase
          .from('whatsapp_templates')
          .select('id, name, type')
          .eq('workspace_id', workspaceId)
          .eq('status', 'approved');

        if (!tempErr && dbTemplates && dbTemplates.length > 0) {
          setTemplates(dbTemplates);
        }

        // 2. Load Welcome Automation Setting
        const { data: config, error: configErr } = await supabase
          .from('whatsapp_automations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('automation_type', 'welcome')
          .maybeSingle();

        if (config) {
          setIsActive(config.is_active);
          if (Array.isArray(config.steps) && config.steps.length > 0) {
            setSteps(config.steps as Step[]);
          }
        }

        // 3. Load execution logs
        const { data: dbLogs, error: logsErr } = await supabase
          .from('whatsapp_automation_logs')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('automation_type', 'welcome')
          .order('scheduled_for', { ascending: false });

        if (!logsErr && dbLogs) {
          // Fetch lead names for logs
          const leadIds = dbLogs.map(l => l.lead_id);
          const { data: leads } = await supabase
            .from('leads')
            .select('id, name')
            .in('id', leadIds);

          const leadMap = new Map(leads?.map(l => [l.id, l.name]) || []);
          const enrichedLogs = dbLogs.map(log => ({
            ...log,
            lead_name: leadMap.get(log.lead_id) || 'Unknown Lead'
          }));

          setLogs(enrichedLogs);
        } else if (logsErr) {
          // If query fails, it means tables might not exist - fallback to demo mode
          throw new Error('Supabase tables missing, entering demo mode.');
        }

      } catch (err) {
        console.warn('Welcome automation error fallback to localStorage:', err);
        setIsDemo(true);
        loadDemoData();
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadData();
    }
  }, [workspaceId]);

  // Load Demo Data from localStorage
  const loadDemoData = () => {
    const localConfig = localStorage.getItem(`wa_config_welcome_${workspaceId}`);
    if (localConfig) {
      const parsed = JSON.parse(localConfig);
      setIsActive(parsed.isActive);
      setSteps(parsed.steps);
    }

    const localLogs = localStorage.getItem(`wa_logs_welcome_${workspaceId}`);
    if (localLogs) {
      setLogs(JSON.parse(localLogs));
    } else {
      // Seed some mock logs
      const seedLogs: LogEntry[] = [
        {
          id: 'log-1',
          lead_id: 'lead-101',
          lead_name: 'Rahul Sharma',
          phone: '919988776655',
          step_number: 1,
          template_name: 'welcome_intro',
          scheduled_for: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          sent_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          status: 'sent',
          error_message: null
        },
        {
          id: 'log-2',
          lead_id: 'lead-101',
          lead_name: 'Rahul Sharma',
          phone: '919988776655',
          step_number: 2,
          template_name: 'brochure_share',
          scheduled_for: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
          sent_at: null,
          status: 'failed',
          error_message: 'WhatsBoost API Error: Device session disconnected (mock fallback trigger).'
        },
        {
          id: 'log-3',
          lead_id: 'lead-102',
          lead_name: 'Sneha Patel',
          phone: '918877665544',
          step_number: 1,
          template_name: 'welcome_intro',
          scheduled_for: new Date(Date.now() - 1000 * 10).toISOString(),
          sent_at: null,
          status: 'pending',
          error_message: null
        }
      ];
      setLogs(seedLogs);
      localStorage.setItem(`wa_logs_welcome_${workspaceId}`, JSON.stringify(seedLogs));
    }
  };

  // Add Step
  const addStep = () => {
    setSteps([...steps, { template_name: templates[0]?.name || '', delay_seconds: 30 }]);
  };

  // Update Step fields
  const updateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  // Delete Step
  const deleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  // Save Settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      if (isDemo) {
        localStorage.setItem(`wa_config_welcome_${workspaceId}`, JSON.stringify({ isActive, steps }));
        alert('Welcome settings saved successfully (Demo Mode)!');
      } else {
        const { error } = await supabase
          .from('whatsapp_automations')
          .upsert({
            workspace_id: workspaceId,
            automation_type: 'welcome',
            steps: steps,
            is_active: isActive,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id, automation_type' });

        if (error) throw error;
        alert('Welcome Message settings saved successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error saving settings: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Trigger manually resending a message
  const handleResend = async (logId: string) => {
    setResendingId(logId);
    try {
      if (isDemo) {
        // Simulate retry success after 1.5 seconds
        await new Promise(resolve => setTimeout(resolve, 1500));
        const updatedLogs = logs.map(log => {
          if (log.id === logId) {
            return {
              ...log,
              status: 'sent' as const,
              sent_at: new Date().toISOString(),
              error_message: null
            };
          }
          return log;
        });
        setLogs(updatedLogs);
        localStorage.setItem(`wa_logs_welcome_${workspaceId}`, JSON.stringify(updatedLogs));
      } else {
        const res = await fetch('/api/whatsapp/resend-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId })
        });

        const data = await res.json();
        if (data.success) {
          const updatedLogs = logs.map(log => {
            if (log.id === logId) {
              return {
                ...log,
                status: 'sent' as const,
                sent_at: new Date().toISOString(),
                error_message: null
              };
            }
            return log;
          });
          setLogs(updatedLogs);
        } else {
          alert(`Resend failed: ${data.error || 'Unknown error occurred.'}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error resending message: ${err.message || err}`);
    } finally {
      setResendingId(null);
    }
  };

  // Filter and search logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.lead_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phone.includes(searchQuery) ||
      log.template_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Configuration Header Card */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-orange-500/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Welcome flow
            </span>
            {isDemo && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Demo Sim
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            Instant Welcome Message Engine
          </h3>
          <p className="text-xs text-zinc-550 dark:text-zinc-400">
            जैसे ही Facebook Leads Ingest होंगी या Manual Lead Add होगी, उन्हें तुरंत WhatsApp Sequences deliver होंगे।
          </p>
        </div>

        {/* Master Active Toggle Switch */}
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md ${
              isActive 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-black shadow-emerald-500/20' 
                : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400'
            }`}
          >
            {isActive ? <Play className="w-3.5 h-3.5 stroke-[3]" /> : <Pause className="w-3.5 h-3.5 stroke-[3]" />}
            {isActive ? 'ACTIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* 3D Workflow Builder Node Space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Node Setup Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/70 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/60 pb-4 mb-6">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Drip Automation Nodes
              </h4>
              <button
                onClick={addStep}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30">
                <Smartphone className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
                <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-300">No automation steps configured</h5>
                <p className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-1">Add your first template node step to configure the delay flow.</p>
              </div>
            ) : (
              <div className="space-y-0 relative flex flex-col items-center">
                {steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    {/* Node Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full relative group perspective-1000"
                    >
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-all shadow-lg hover:shadow-xl relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        
                        {/* Left Side Info */}
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          {/* Step Badge */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-black font-black text-sm shadow-md shadow-orange-500/10 shrink-0 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                            {idx + 1}
                          </div>

                          <div className="space-y-1.5 w-full sm:w-[240px]">
                            <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Select Message Template</label>
                            <select
                              value={step.template_name}
                              onChange={(e) => updateStep(idx, 'template_name', e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-orange-500/50"
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.name}>{t.name} ({t.type})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Right Side Options / Trash */}
                        <div className="flex items-center justify-end gap-3 w-full sm:w-auto self-end sm:self-center">
                          {idx > 0 && (
                            <button
                              onClick={() => deleteStep(idx)}
                              className="p-2 text-zinc-450 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/20 rounded-xl transition-all"
                              title="Delete Step"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                      </div>
                    </motion.div>

                    {/* Node Link / Delay Gap Indicator */}
                    {idx < steps.length - 1 && (
                      <div className="w-full flex flex-col items-center justify-center py-4 relative">
                        {/* Animated connector line */}
                        <div className="absolute top-0 bottom-0 w-[2px] bg-dashed-line pointer-events-none" />
                        
                        {/* Delay config orb */}
                        <div className="relative z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 backdrop-blur-md shadow-md text-[10px] text-zinc-700 dark:text-zinc-300 font-bold group">
                          <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                          <span>Delay:</span>
                          <input
                            type="number"
                            value={steps[idx + 1].delay_seconds}
                            onChange={(e) => updateStep(idx + 1, 'delay_seconds', parseInt(e.target.value, 10) || 0)}
                            className="w-12 bg-transparent text-center border-b border-zinc-300 dark:border-zinc-700 focus:border-orange-500 text-xs text-orange-400 font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                          <span className="text-zinc-500">Secs</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {steps.length > 0 && (
              <div className="mt-8 border-t border-zinc-100 dark:border-zinc-900/60 pt-4 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Save Workflow Flow
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Side Panel: Node Logic Explanation */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-950/20 backdrop-blur-md shadow-lg space-y-4">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-orange-400" /> How It Works
            </h4>
            <div className="text-xs space-y-3.5 text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono">
              <p>
                <strong className="text-zinc-900 dark:text-white">1. Real-Time Trigger:</strong> जैसे ही Meta API/Webhook से new lead fetch होगी, या UI में manual lead details submit होंगी, welcome flow schedule होगा।
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-white">2. Cumulative Delays:</strong> Timing gaps seconds में set होते हैं। 
                <br />
                - Step 1 (Instantly or step 1 delay)
                <br />
                - Step 2 (Step 1 + Step 2 Delay)
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-white">3. Sender Mapping:</strong> जो user logged-in है, उसने WhatsApp setup panel में जो number link किया है, message उसी number से deliver होगा।
              </p>
            </div>
            
            <div className="p-4 rounded-2xl border border-amber-500/10 bg-amber-500/5 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Quota Warning</p>
                <p className="text-[10px] text-zinc-650 dark:text-zinc-400 leading-normal">
                  WhatsApp templates send करने के लिए सुनिश्चित करें कि आपका WhatsApp Gateway online connected state में हो।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Logs list section */}
      <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-900/60 pb-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-orange-400" />
              Welcome Sequence logs
            </h4>
            <p className="text-[10px] text-zinc-500">Real-time status updates of template messages sent</p>
          </div>

          {/* Logs Filter bar */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white outline-none focus:border-orange-500/50 transition-all font-mono"
              />
            </div>

            {/* Status Select dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:border-orange-500/50"
            >
              <option value="all">All Logs</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Logs Table Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No matching welcome automation logs found.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-900 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Lead Name / Number</th>
                  <th className="pb-3">Step</th>
                  <th className="pb-3">Template Name</th>
                  <th className="pb-3">Scheduled For</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Error Info</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all">
                    {/* Name / Phone */}
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-zinc-900 dark:text-white">{log.lead_name}</div>
                      <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono">+{log.phone}</div>
                    </td>
                    
                    {/* Step */}
                    <td className="py-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                        Step {log.step_number}
                      </span>
                    </td>

                    {/* Template */}
                    <td className="py-3.5 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {log.template_name}
                    </td>

                    {/* Date scheduled */}
                    <td className="py-3.5 font-mono text-zinc-550 dark:text-zinc-400">
                      <div>{new Date(log.scheduled_for).toLocaleDateString()}</div>
                      <div className="text-[10px] text-zinc-400">{new Date(log.scheduled_for).toLocaleTimeString()}</div>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'sent' 
                          ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' 
                          : log.status === 'failed' 
                          ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20' 
                          : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.status === 'sent' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        {log.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Error info */}
                    <td className="py-3.5 text-[10px] font-semibold text-rose-550 dark:text-rose-400 max-w-[180px] truncate" title={log.error_message || ''}>
                      {log.error_message || '--'}
                    </td>

                    {/* Actions button */}
                    <td className="py-3.5 pr-2 text-right">
                      {log.status === 'failed' && (
                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={resendingId === log.id}
                          className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20 disabled:opacity-50 text-black text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ml-auto"
                        >
                          {resendingId === log.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Resend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Custom Global Dash Stylesheet to construct dotted lines */}
      <style jsx global>{`
        .bg-dashed-line {
          background-image: linear-gradient(to bottom, #f97316 40%, transparent 40%);
          background-position: center;
          background-size: 1px 10px;
          background-repeat: repeat-y;
        }
      `}</style>
    </div>
  );
}

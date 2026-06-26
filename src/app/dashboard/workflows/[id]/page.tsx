'use client';

/**
 * ══════════════════════════════════════════════════════════════════
 * AUTOMATION CANVAS — Infinite Visual Node-Graph Builder
 * Route: /dashboard/workflows/[id]  (id = 'new' for creation)
 * Uses React Flow (@xyflow/react)
 * ══════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Connection,
  Edge,
  Node,
  MarkerType,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  GitBranch, Save, Play, ArrowLeft, Eye, CheckCircle2,
  X, Zap, AlertCircle, RefreshCw, LayoutTemplate, Trash2, Search, Webhook, Users, MousePointer, MessageSquare, Table2, Contact, Timer, Globe, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Custom nodes
import { TriggerNode } from '@/components/workflows/TriggerNode';
import { ActionNode } from '@/components/workflows/ActionNode';
import { DelayNode } from '@/components/workflows/DelayNode';
import { RouterNode } from '@/components/workflows/RouterNode';
import NodeConfigPanel from '@/components/workflows/NodeConfigPanel';

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  delayNode: DelayNode,
  routerNode: RouterNode,
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const TRIGGERS = [
  { type: 'facebook_lead', label: 'Facebook Lead', desc: 'Fires on Facebook Lead Ad form submissions' },
  { type: 'webhook', label: 'Webhook / HTTP', desc: 'Fires when an external API posts here' },
  { type: 'manual', label: 'Manual / Test', desc: 'Triggered manually by clicking Test Run' },
  { type: 'crm_entry', label: 'New CRM Lead', desc: 'Fires when a new lead is added to CRM' },
];

const ACTIONS = [
  { type: 'whatsapp_send', label: 'Send WhatsApp Message', desc: 'Send text or template messages' },
  { type: 'whatsapp_group_alert', label: 'WhatsApp Group Alert', desc: 'Alert message to a WhatsApp Group' },
  { type: 'google_sheet_append', label: 'Google Sheets: Append Row', desc: 'Append rows to a spreadsheet' },
  { type: 'google_contact_create', label: 'Google Contacts: Create', desc: 'Create Google Contact card' },
  { type: 'http_request', label: 'HTTP Request', desc: 'Send webhooks to external API endpoints' },
  { type: 'delay', label: 'Delay / Wait', desc: 'Wait seconds, minutes, hours, or days' },
  { type: 'router', label: 'Conditional Router', desc: 'Route executions along distinct branches' },
];

// Helper to trace upstream parent nodes recursively
function getUpstreamNodesList(nodeId: string, nodes: Node[], edges: Edge[]): { id: string; label: string; type: string }[] {
  const list: { id: string; label: string; type: string }[] = [];
  const visited = new Set<string>();

  const trace = (currId: string) => {
    if (visited.has(currId)) return;
    visited.add(currId);

    const incoming = edges.filter(e => e.target === currId);
    for (const edge of incoming) {
      const parent = nodes.find(n => n.id === edge.source);
      if (parent) {
        list.push({
          id: parent.id,
          label: (parent.data?.label as string) || parent.id,
          type: (parent.data?.type as string) || (parent.type === 'triggerNode' ? parent.data?.type as string : parent.type || ''),
        });
        trace(parent.id);
      }
    }
  };

  trace(nodeId);
  return list;
}

function WorkflowBuilderCanvasInner() {
  const router = useRouter();
  const params = useParams();
  const { screenToFlowPosition } = useReactFlow();
  const workflowId = params?.id as string;
  const isNew = workflowId === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Editor states
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Active configuration drawer
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Floating Context Menu state
  const [floatingMenu, setFloatingMenu] = useState<{
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
    parentId: string | null;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Handle "+" trigger button click inside nodes
  const handleAddNodeClick = useCallback((event: React.MouseEvent, parentId: string) => {
    event.preventDefault();
    setFloatingMenu({
      screenX: event.clientX,
      screenY: event.clientY,
      canvasX: 0,
      canvasY: 0,
      parentId,
    });
    setSearchQuery('');
  }, []);

  // Pane double click triggers node spawning context menu
  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as Element;
    if (target.classList.contains('react-flow__pane')) {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setFloatingMenu({
        screenX: event.clientX,
        screenY: event.clientY,
        canvasX: flowPos.x,
        canvasY: flowPos.y,
        parentId: null,
      });
      setSearchQuery('');
    }
  }, [screenToFlowPosition]);

  // Bind dynamic event handlers to loaded nodes
  const bindCallbacks = useCallback((nodesList: Node[]) => {
    return nodesList.map(n => ({
      ...n,
      data: {
        ...n.data,
        onAddNode: handleAddNodeClick,
      }
    }));
  }, [handleAddNodeClick]);

  // Get active config panel node metadata
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // Derive upstream nodes for variables picking
  const upstreamNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    return getUpstreamNodesList(selectedNodeId, nodes, edges);
  }, [selectedNodeId, nodes, edges]);

  // Convert old step-stack arrays to sequential horizontal graph layouts (backwards compatibility)
  const loadLegacyWorkflowSteps = useCallback((legacySteps: any[], triggerType: string, triggerConfig: any) => {
    const layoutNodes: Node[] = [];
    const layoutEdges: Edge[] = [];

    const triggerId = 'trigger_root';
    layoutNodes.push({
      id: triggerId,
      type: 'triggerNode',
      position: { x: 100, y: 250 },
      data: {
        type: triggerType || 'manual',
        label: 'Trigger Node',
        config: triggerConfig || {},
        status: 'idle',
        onAddNode: handleAddNodeClick,
      },
    });

    let lastId = triggerId;
    legacySteps.forEach((step, idx) => {
      const nodeId = step.id || `step_${idx}_${Date.now()}`;
      const isDelay = step.type === 'whatsapp_delay_sequence';
      const nodeType = isDelay ? 'delayNode' : 'actionNode';

      let stepConfig = step.config || {};
      if (isDelay) {
        stepConfig = {
          delay_value: stepConfig.delay_days || 1,
          delay_unit: 'days',
        };
      }

      layoutNodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: 100 + (idx + 1) * 250, y: 250 },
        data: {
          type: step.type === 'whatsapp_delay_sequence' ? 'delay' : step.type,
          label: step.label || step.type,
          config: stepConfig,
          status: 'idle',
          onAddNode: handleAddNodeClick,
        },
      });

      layoutEdges.push({
        id: `edge_${lastId}_${nodeId}`,
        source: lastId,
        target: nodeId,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
        style: { stroke: '#f97316', strokeWidth: 2 },
      });

      lastId = nodeId;
    });

    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [setNodes, setEdges, handleAddNodeClick]);

  // Load existing workflow
  useEffect(() => {
    if (isNew) {
      setNodes([
        {
          id: 'trigger_root',
          type: 'triggerNode',
          position: { x: 150, y: 250 },
          data: {
            type: 'manual',
            label: 'Trigger Start',
            config: {},
            status: 'idle',
            onAddNode: handleAddNodeClick,
          },
        }
      ]);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const res = await fetch(`/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const wf = json.workflow;
        setName(wf.name);
        setDescription(wf.description || '');
        setIsEnabled(wf.is_enabled);

        const stepsData = wf.steps || {};
        if (stepsData.nodes && Array.isArray(stepsData.nodes)) {
          setNodes(bindCallbacks(stepsData.nodes));
          setEdges(stepsData.edges || []);
        } else if (Array.isArray(stepsData)) {
          loadLegacyWorkflowSteps(stepsData, wf.trigger_type, wf.trigger_config);
        } else {
          setNodes([
            {
              id: 'trigger_root',
              type: 'triggerNode',
              position: { x: 150, y: 250 },
              data: {
                type: wf.trigger_type || 'manual',
                label: 'Trigger Start',
                config: wf.trigger_config || {},
                status: 'idle',
                onAddNode: handleAddNodeClick,
              },
            }
          ]);
        }
      }
      setLoading(false);
    };
    load();
  }, [workflowId, isNew, router, loadLegacyWorkflowSteps, setNodes, bindCallbacks, handleAddNodeClick]);

  // Connect handler
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      id: `edge_${connection.source}_${connection.target}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
      style: { stroke: '#f97316', strokeWidth: 2 }
    } as Edge;
    setEdges(eds => addEdge(newEdge, eds));
  }, [setEdges]);

  // Node selection handler opens panel
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Floating Context Menu selection handler
  const selectAppFromMenu = (appType: string) => {
    if (!floatingMenu) return;

    const id = `${appType}_${Date.now()}`;
    const isTrigger = appType === 'facebook_lead' || appType === 'webhook' || appType === 'crm_entry' || appType === 'manual';
    const type = isTrigger
      ? 'triggerNode'
      : appType === 'delay'
      ? 'delayNode'
      : appType === 'router'
      ? 'routerNode'
      : 'actionNode';

    const defaultLabel = TRIGGERS.find(t => t.type === appType)?.label || ACTIONS.find(a => a.type === appType)?.label || 'Node';

    const defaultConfigs: Record<string, any> = {};
    if (appType === 'router') {
      defaultConfigs.branches = [
        { id: `branch_1_${Date.now()}`, label: 'Branch 1', condition: '' },
        { id: `branch_2_${Date.now()}`, label: 'Branch 2', condition: '' }
      ];
    } else if (appType === 'delay') {
      defaultConfigs.delay_value = 5;
      defaultConfigs.delay_unit = 'minutes';
    }

    let position = { x: floatingMenu.canvasX, y: floatingMenu.canvasY };

    // Smart drop coordinates relative to parent: x + 250, y
    if (floatingMenu.parentId) {
      const parentNode = nodes.find(n => n.id === floatingMenu.parentId);
      if (parentNode) {
        position = {
          x: parentNode.position.x + 250,
          y: parentNode.position.y,
        };
      }
    }

    const newNode: Node = {
      id,
      type,
      position,
      data: {
        type: appType,
        label: defaultLabel,
        config: defaultConfigs,
        status: 'idle',
        onAddNode: handleAddNodeClick,
      },
    };

    setNodes(nds => [...nds, newNode]);

    // Draw edge automatically if child node is attached to parent
    if (floatingMenu.parentId) {
      const newEdge: Edge = {
        id: `edge_${floatingMenu.parentId}_${id}`,
        source: floatingMenu.parentId,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
        style: { stroke: '#f97316', strokeWidth: 2 }
      };
      setEdges(eds => [...eds, newEdge]);
    }

    setSelectedNodeId(id);
    setFloatingMenu(null);
  };

  // Update configuration inside a node
  const updateNodeConfig = useCallback((nodeId: string, newConfig: Record<string, any>, customLabel?: string) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            config: newConfig,
            label: customLabel || n.data.label,
          },
        };
      })
    );
  }, [setNodes]);

  // Delete node from canvas
  const deleteSelectedNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  // Auto layout helper: aligns nodes in horizontal lanes starting from triggers
  const autoAlignLayout = useCallback(() => {
    const paddingX = 250;
    const paddingY = 150;

    const triggerNodes = nodes.filter(n => n.type === 'triggerNode');
    if (triggerNodes.length === 0) return;

    const positioned = new Set<string>();
    const nextNodes = [...nodes];

    const arrangeChildren = (parentId: string, parentX: number, parentY: number, laneIndex: number) => {
      const childEdges = edges.filter(e => e.source === parentId);
      childEdges.forEach((edge, idx) => {
        const child = nextNodes.find(n => n.id === edge.target);
        if (child && !positioned.has(child.id)) {
          child.position = {
            x: parentX + paddingX,
            y: parentY + (idx * paddingY) - ((childEdges.length - 1) * paddingY) / 2,
          };
          positioned.add(child.id);
          arrangeChildren(child.id, child.position.x, child.position.y, laneIndex + idx);
        }
      });
    };

    triggerNodes.forEach((trg, idx) => {
      trg.position = { x: 150, y: 150 + idx * 300 };
      positioned.add(trg.id);
      arrangeChildren(trg.id, trg.position.x, trg.position.y, idx);
    });

    setNodes(nextNodes);
  }, [nodes, edges, setNodes]);

  // Save the full React Flow JSON graph object schema to custom_workflows table
  const handleSave = async () => {
    if (!name.trim()) { alert('Please enter a workflow name'); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const triggerNode = nodes.find(n => n.type === 'triggerNode');
    const triggerType = triggerNode ? (triggerNode.data.type as string) : 'manual';
    const triggerConfig = triggerNode ? (triggerNode.data.config as Record<string, any>) : {};

    const payload = {
      name,
      description,
      is_enabled: isEnabled,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      steps: {
        nodes,
        edges,
      },
    };

    const res = await fetch(isNew ? '/api/workflows' : `/api/workflows/${workflowId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
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

  // Run test execution on the graph
  const handleTestRun = async () => {
    if (isNew) { alert('Save the workflow first before running a test.'); return; }
    setRunningTest(true);
    setTestResult(null);

    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setRunningTest(false);

    if (res.ok) {
      setTestResult({
        success: json.success,
        message: json.success
          ? `✅ Test execution completed successfully`
          : `⚠️ Test execution failed — check runs history log`,
      });
      if (json.runId) {
        const { data: stepLogs } = await supabase
          .from('workflow_step_logs')
          .select('step_id, status')
          .eq('run_id', json.runId);

        if (stepLogs && stepLogs.length > 0) {
          setNodes(nds =>
            nds.map(n => {
              const log = stepLogs.find(l => l.step_id === n.id);
              return log ? { ...n, data: { ...n.data, status: log.status } } : n;
            })
          );
        }
      }
    } else {
      setTestResult({
        success: false,
        message: `⚠️ Connection failed: ${json.error || 'Server error'}`,
      });
    }
  };

  const filteredTriggers = useMemo(() => {
    return TRIGGERS.filter(t =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredActions = useMemo(() => {
    return ACTIONS.filter(a =>
      a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Floating Context Menu positioning limits
  const floatingMenuStyle = useMemo<React.CSSProperties | null>(() => {
    if (!floatingMenu) return null;
    const width = 270;
    const height = 380;
    let top = floatingMenu.screenY;
    let left = floatingMenu.screenX;

    if (top + height > window.innerHeight) top = window.innerHeight - height - 10;
    if (left + width > window.innerWidth) left = window.innerWidth - width - 10;
    if (top < 10) top = 10;
    if (left < 10) left = 10;

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${height}px`,
      zIndex: 50,
    };
  }, [floatingMenu]);

  // Brand icons for the search list
  const getAppIcon = (appType: string) => {
    switch (appType) {
      case 'facebook_lead':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        );
      case 'webhook':
        return <Webhook className="w-4 h-4 text-purple-400" />;
      case 'manual':
        return <MousePointer className="w-4 h-4 text-zinc-400" />;
      case 'crm_entry':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'whatsapp_send':
      case 'whatsapp_group_alert':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'google_sheet_append':
        return <Table2 className="w-4 h-4 text-green-400" />;
      case 'google_contact_create':
        return <Contact className="w-4 h-4 text-blue-400" />;
      case 'http_request':
        return <Globe className="w-4 h-4 text-violet-400" />;
      case 'delay':
        return <Timer className="w-4 h-4 text-amber-400" />;
      case 'router':
        return <GitBranch className="w-4 h-4 text-indigo-400" />;
      default:
        return <Zap className="w-4 h-4 text-orange-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center text-zinc-650">
        <RefreshCw className="w-5 h-5 animate-spin mr-3 text-orange-500" /> Loading canvas editor...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#070708] text-white font-sans flex flex-col overflow-hidden relative select-none">
      {/* ── Top Toolbar ── */}
      <div className="h-14 border-b border-zinc-800/60 bg-[#070708]/90 backdrop-blur-lg flex items-center justify-between px-5 z-25 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push('/dashboard/workflows')}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name..."
              className="bg-transparent text-sm font-extrabold text-white placeholder-zinc-700 focus:outline-none w-full border-b border-transparent focus:border-zinc-800 py-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={autoAlignLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white text-[11px] font-bold transition-all"
            title="Auto-align canvas node layout"
          >
            <LayoutTemplate className="w-3.5 h-3.5" /> Auto Align
          </button>

          <button
            onClick={() => setIsEnabled(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              isEnabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
            }`}
          >
            {isEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>

          {!isNew && (
            <button
              onClick={() => router.push(`/dashboard/workflows/${workflowId}/runs`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white text-[11px] font-bold transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Runs
            </button>
          )}

          <button
            onClick={handleTestRun}
            disabled={runningTest || isNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {runningTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Test Run
          </button>

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
            className={`px-5 py-2.5 border-b text-xs font-semibold flex items-center justify-between z-20 flex-shrink-0 ${
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

      {/* ── Main Workspace Body ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Full-width Infinite React Flow Canvas */}
        <div className="flex-1 h-full bg-[#09090b] relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onDoubleClick={onPaneDoubleClick}
            zoomOnDoubleClick={false}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            defaultEdgeOptions={{
              style: { stroke: '#52525b', strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed }
            }}
          >
            <Background color="#1f1f23" gap={24} size={1} />
            <Controls className="!bg-zinc-950 !border !border-zinc-800 !text-white" />
            <MiniMap
              nodeColor={node => {
                if (node.type === 'triggerNode') return '#f97316';
                if (node.type === 'routerNode') return '#6366f1';
                if (node.type === 'delayNode') return '#f59e0b';
                return '#10b981';
              }}
              maskColor="rgba(7, 7, 8, 0.7)"
              className="!bg-zinc-950/80 !border !border-zinc-850"
            />
            
            {/* Panel delete help */}
            {activeNode && (
              <Panel position="bottom-center" className="bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-bold">Selected: <b>{String(activeNode.data.label)}</b> ({activeNode.id})</span>
                <button
                  onClick={() => deleteSelectedNode(activeNode.id)}
                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                  title="Delete selected node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Floating Context Add Menu Backdrop */}
        {floatingMenu && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setFloatingMenu(null)}
          />
        )}

        {/* Floating Context Add Menu */}
        <AnimatePresence>
          {floatingMenu && floatingMenuStyle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={floatingMenuStyle}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-3 flex flex-col overflow-hidden"
            >
              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search app or trigger..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-zinc-650 focus:outline-none focus:border-orange-500/40"
                  autoFocus
                />
              </div>

              {/* Scrollable App list */}
              <div className="flex-1 overflow-y-auto mt-3 pr-0.5 space-y-3">
                {/* Triggers Category (Only if parentId is null, or query matches) */}
                {(!floatingMenu.parentId || searchQuery) && filteredTriggers.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Triggers</span>
                    {filteredTriggers.map(trg => (
                      <button
                        key={trg.type}
                        onClick={() => selectAppFromMenu(trg.type)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/35 hover:bg-orange-500/5 border border-zinc-900/60 hover:border-orange-500/20 text-left transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          {getAppIcon(trg.type)}
                        </div>
                        <div className="truncate">
                          <p className="text-[11px] font-bold text-white group-hover:text-orange-400 transition-colors">{trg.label}</p>
                          <p className="text-[8px] text-zinc-500 truncate">{trg.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions Category */}
                {filteredActions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Actions</span>
                    {filteredActions.map(act => (
                      <button
                        key={act.type}
                        onClick={() => selectAppFromMenu(act.type)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/35 hover:bg-orange-500/5 border border-zinc-900/60 hover:border-orange-500/20 text-left transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          {getAppIcon(act.type)}
                        </div>
                        <div className="truncate">
                          <p className="text-[11px] font-bold text-white group-hover:text-orange-400 transition-colors">{act.label}</p>
                          <p className="text-[8px] text-zinc-500 truncate">{act.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredTriggers.length === 0 && filteredActions.length === 0 && (
                  <div className="text-center py-6 text-zinc-650 text-xs">
                    No matching integrations found.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configuration Drawer (Positioned absolutely over canvas on the right edge) */}
        <AnimatePresence>
          {activeNode && (
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full z-30 shadow-2xl flex-shrink-0"
            >
              <NodeConfigPanel
                nodeId={activeNode.id}
                nodeType={activeNode.data.type as string}
                nodeLabel={activeNode.data.label as string}
                config={activeNode.data.config as Record<string, any>}
                upstreamNodes={upstreamNodes}
                onUpdate={(cfg, label) => updateNodeConfig(activeNode.id, cfg, label)}
                onClose={() => setSelectedNodeId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WorkflowBuilderCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvasInner />
    </ReactFlowProvider>
  );
}

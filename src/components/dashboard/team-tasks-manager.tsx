'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Square, AlertTriangle, AlertCircle, Plus, Clock, 
  User, Check, Calendar, Filter, Trash2, Edit2, Play, CheckCircle2,
  FileText, Shield, UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  tenant_id: string;
  client_id: string;
  assigned_to_user_id: string | null;
  title: string;
  description: string | null;
  due_timestamp: string | null;
  task_status: 'Completed' | 'Active/In-Field' | 'Overdue';
  overdue_alert: boolean;
  created_at: string;
  // Join fields
  client_name?: string;
  assigned_name?: string;
}

interface TeamTasksManagerProps {
  clientId?: string | null; // Filter to single client if passed
  workspaceId: string;
  userEmail?: string | null;
}

const DEFAULT_MEMBERS = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'Rahul Sharma (Lead Photo)' },
  { id: '11111111-1111-1111-1111-111111111111', name: 'Karan Singh (Cinematographer)' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Sneha Reddy (Lead Editor)' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Amit Patel (Drone Operator)' }
];

export function TeamTasksManager({ clientId, workspaceId, userEmail }: TeamTasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>(DEFAULT_MEMBERS);
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering states
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'overdue'>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('all');
  
  // New Task Form Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  
  // Form Inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskStatusField, setTaskStatusField] = useState<'Active/In-Field' | 'Completed'>('Active/In-Field');

  useEffect(() => {
    loadMetadata();
    loadTasks();
  }, [clientId, workspaceId]);

  const loadMetadata = async () => {
    try {
      // 1. Fetch leads for dropdown mapping
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('id, name, phone, client_id')
        .eq('workspace_id', workspaceId);
      
      if (dbLeads) {
        setLeadsList(dbLeads);
        if (clientId) {
          const match = dbLeads.find(l => (l.client_id === clientId || l.id === clientId));
          if (match) setTaskClient(match.id);
        }
      }

      // 2. Fetch workspace members profiles
      const { data: members } = await supabase
        .from('profiles')
        .select('id, workspace_name');
      
      if (members && members.length > 0) {
        setTeamMembers(members.map(m => ({ id: m.id, name: m.workspace_name })));
      }
    } catch (err) {
      console.error('Error loading tasks metadata:', err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('team_tasks')
        .select('*')
        .eq('tenant_id', workspaceId);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: dbErr } = await query.order('due_timestamp', { ascending: true });

      if (dbErr) throw dbErr;

      if (data) {
        // Enforce trigger checking locally too in case DB cron has a slight latency
        const updatedTasks = data.map((t: any) => {
          let currentStatus = t.task_status;
          let overdueAlert = t.overdue_alert;
          
          if (t.task_status !== 'Completed' && t.due_timestamp && new Date(t.due_timestamp).getTime() < Date.now()) {
            currentStatus = 'Overdue';
            overdueAlert = true;
          }

          return {
            ...t,
            task_status: currentStatus,
            overdue_alert: overdueAlert
          };
        });
        setTasks(updatedTasks);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const currentClientKey = clientId || taskClient;
    if (!currentClientKey) {
      alert('Please select or link a client workspace record.');
      return;
    }

    let dueTimestamp = null;
    if (taskDueDate && taskDueTime) {
      dueTimestamp = new Date(`${taskDueDate}T${taskDueTime}`).toISOString();
    }

    // Determine default assignee if empty (assigns to creator/current user)
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || workspaceId;
    const finalAssignee = taskAssignee || currentUserId;

    const taskPayload = {
      tenant_id: workspaceId,
      client_id: currentClientKey,
      assigned_to: finalAssignee,
      assigned_to_user_id: finalAssignee,
      title: taskTitle.trim(),
      description: taskDesc.trim() || null,
      deadline: dueTimestamp,
      due_timestamp: dueTimestamp,
      status: taskStatusField === 'Completed' ? 'completed' : 'in_progress',
      task_status: taskStatusField,
    };

    try {
      if (editTaskId) {
        const { error } = await supabase
          .from('team_tasks')
          .update(taskPayload)
          .eq('id', editTaskId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('team_tasks')
          .insert(taskPayload);
        if (error) throw error;
      }

      setFormOpen(false);
      resetForm();
      await loadTasks();

      // Log in live_logs
      await supabase.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'task_managed',
        message: editTaskId 
          ? `Team task '${taskTitle}' updated in workspace.`
          : `New Team task '${taskTitle}' successfully deployed to crew agenda.`,
        metadata: { client_id: currentClientKey }
      });
    } catch (err: any) {
      alert('Save task failed: ' + err.message);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.task_status === 'Completed' ? 'Active/In-Field' : 'Completed';
    try {
      // Optimistic state
      setTasks(prev => prev.map(t => t.id === task.id ? { 
        ...t, 
        task_status: nextStatus,
        status: nextStatus === 'Completed' ? 'completed' : 'in_progress',
        overdue_alert: nextStatus === 'Completed' ? false : t.overdue_alert
      } : t));

      const { error } = await supabase
        .from('team_tasks')
        .update({
          task_status: nextStatus,
          status: nextStatus === 'Completed' ? 'completed' : 'in_progress',
          overdue_alert: nextStatus === 'Completed' ? false : (task.due_timestamp ? new Date(task.due_timestamp).getTime() < Date.now() : false),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      await loadTasks();
    } catch (err: any) {
      console.error('Toggle status error:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase
        .from('team_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadTasks();
    } catch (err: any) {
      console.error('Delete task error:', err);
    }
  };

  const handleEditTaskTrigger = (task: Task) => {
    setEditTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskClient(task.client_id);
    setTaskAssignee(task.assigned_to_user_id || '');
    
    if (task.due_timestamp) {
      const dateObj = new Date(task.due_timestamp);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      setTaskDueDate(`${yyyy}-${mm}-${dd}`);
      setTaskDueTime(`${hh}:${min}`);
    } else {
      setTaskDueDate('');
      setTaskDueTime('');
    }
    setTaskStatusField(task.task_status === 'Completed' ? 'Completed' : 'Active/In-Field');
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditTaskId(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskAssignee('');
    setTaskDueDate('');
    setTaskDueTime('');
    setTaskStatusField('Active/In-Field');
    if (!clientId) setTaskClient('');
  };

  // Filter tasks based on vectors
  const filteredTasks = tasks.filter(task => {
    // Lead filtering
    if (!clientId && selectedLeadId !== 'all' && task.client_id !== selectedLeadId) {
      return false;
    }
    // Tab vectors
    if (activeTab === 'personal') {
      const currentUserId = supabase.auth.getUser(); // or compare with userEmail
      return task.assigned_to_user_id === workspaceId; // simple match to workspace owner for demo
    }
    if (activeTab === 'overdue') {
      return task.task_status === 'Overdue' || task.overdue_alert;
    }
    return true;
  });

  const overdueCount = tasks.filter(t => t.task_status === 'Overdue' || t.overdue_alert).length;
  const activeCount = tasks.filter(t => t.task_status === 'Active/In-Field').length;
  const completedCount = tasks.filter(t => t.task_status === 'Completed').length;

  return (
    <div className="space-y-6 text-xs">
      
      {/* Analytics stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Tasks</div>
            <div className="text-xl font-black text-blue-500 mt-1">{activeCount}</div>
          </div>
          <Play className="w-5 h-5 text-blue-500 opacity-60" />
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-900 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Completed</div>
            <div className="text-xl font-black text-emerald-500 mt-1">{completedCount}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-60" />
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
          overdueCount > 0 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
            : 'bg-zinc-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-900'
        }`}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Overdue Alerts</div>
            <div className={`text-xl font-black mt-1 ${overdueCount > 0 ? 'text-rose-500 animate-pulse' : 'text-zinc-500'}`}>
              {overdueCount}
            </div>
          </div>
          <AlertTriangle className={`w-5 h-5 opacity-60 ${overdueCount > 0 ? 'text-rose-500 animate-bounce' : 'text-zinc-500'}`} />
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-zinc-900">
        
        {/* Vectors tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-900">
          {[
            { id: 'all', label: 'All Crew Tasks' },
            { id: 'personal', label: 'My Responsibilities' },
            { id: 'overdue', label: `Overdue Warnings (${overdueCount})` }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                activeTab === t.id
                  ? 'bg-white dark:bg-zinc-900 text-orange-500 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          
          {/* Client select filter */}
          {!clientId && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-zinc-350 focus:outline-none cursor-pointer border-none"
              >
                <option value="all">Clients: All</option>
                {leadsList.map(l => (
                  <option key={l.id} value={l.id}>{l.name || l.phone}</option>
                ))}
              </select>
            </div>
          )}

          {/* Add task button */}
          <button
            onClick={() => { resetForm(); setFormOpen(true); }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-250 text-white dark:text-black font-extrabold rounded-xl transition-all flex items-center gap-1 hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Task
          </button>
        </div>
      </div>

      {/* Tasks Table/Grid */}
      <div className="overflow-hidden border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 rounded-2xl shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-zinc-500">Loading active tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 italic bg-slate-50/50 dark:bg-[#0c0c0e]/30">
            No tasks currently scheduled under this vector category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/40 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-[60px] text-center">Done</th>
                  <th className="py-3 px-4">Task Details</th>
                  {!clientId && <th className="py-3 px-4">Project / Lead</th>}
                  <th className="py-3 px-4">Assigned Crew</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {filteredTasks.map(task => {
                  const clientObj = leadsList.find(l => l.id === task.client_id);
                  const clientName = clientObj?.name || 'Manual Project';
                  const assigneeObj = teamMembers.find(m => m.id === task.assigned_to_user_id);
                  const assigneeName = assigneeObj?.name || 'Workspace Owner';

                  const isTaskOverdue = task.task_status === 'Overdue';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleToggleStatus(task)}
                          className="text-zinc-500 hover:text-orange-500 transition-colors mx-auto block"
                        >
                          {task.task_status === 'Completed' ? (
                            <CheckSquare className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-zinc-700" />
                          )}
                        </button>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-xs">{task.description}</div>
                        )}
                      </td>

                      {!clientId && (
                        <td className="py-3 px-4 text-slate-800 dark:text-zinc-350 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            {clientName}
                          </span>
                        </td>
                      )}

                      <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          {assigneeName}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-500">
                        {task.due_timestamp ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            {new Date(task.due_timestamp).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="italic text-zinc-700">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isTaskOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500/15 border border-rose-500/30 text-rose-500 uppercase tracking-wide animate-pulse">
                            Overdue Alert ⚠️
                          </span>
                        ) : task.task_status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wide">
                            Active/In-Field
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e)=>e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditTaskTrigger(task)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Creation & Editing Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-md h-fit bg-zinc-950 border border-zinc-850 p-5 rounded-2xl shadow-2xl space-y-4 text-white"
            >
              <h4 className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-orange-500" />
                {editTaskId ? 'Modify Task Details' : 'Deploy New Crew Task'}
              </h4>

              <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
                
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Task Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Back up Raw Wedding Cards SD"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Description</label>
                  <textarea 
                    placeholder="Provide description guidelines for shooter..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none resize-none"
                  />
                </div>

                {/* Client Link Selector if not locked */}
                {!clientId && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-500">Link Project/Client *</label>
                    <select
                      value={taskClient}
                      onChange={(e) => setTaskClient(e.target.value)}
                      required
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="">Select project...</option>
                      {leadsList.map(l => (
                        <option key={l.id} value={l.id}>{l.name || l.phone}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Assigned Team Member</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="">Assign to myself (Workspace owner)</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-500">Due Date</label>
                    <input 
                      type="date" 
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-500">Due Time</label>
                    <input 
                      type="time" 
                      value={taskDueTime}
                      onChange={(e) => setTaskDueTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Current Status</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'Active/In-Field', label: 'Active/In-Field' },
                      { id: 'Completed', label: 'Completed' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setTaskStatusField(st.id as any)}
                        className={`flex-1 py-2 font-bold border rounded-xl transition-all ${
                          taskStatusField === st.id
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black font-extrabold rounded-lg"
                  >
                    {editTaskId ? 'Save Changes' : 'Deploy Task'}
                  </button>
                </div>

              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

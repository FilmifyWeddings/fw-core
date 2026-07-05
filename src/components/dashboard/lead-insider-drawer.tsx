'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, User, DollarSign, FileText, Lock, Users, Briefcase, Plus, Calendar, Tag, Mail, Phone,
  FileIcon, ChevronRight, CheckSquare, AlarmClock, Trash2, Edit2, Clock, Shield,
  CornerDownRight, CheckCircle2, MessageSquare, Reply, AlertCircle
} from 'lucide-react';
import { Lead, LeadStatus, LeadScore } from '@/types';
import { supabase } from '@/lib/supabase';
import { QuotationBuilder } from './quotation-builder';
import { TeamTasksManager } from './team-tasks-manager';

interface LeadInsiderDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdate?: (leadId: string, updatedFields: Partial<Lead>) => void;
  stages?: any[];
  customSources?: string[];
  userEmail?: string | null;
  commentsOnlyMode?: boolean;
}

const MOCK_TEAM_MEMBERS = [
  { id: 't1', name: 'Rahul Sharma', role: 'Lead Photographer' },
  { id: 't2', name: 'Karan Singh', role: 'Cinematographer' },
  { id: 't3', name: 'Sneha Reddy', role: 'Main Editor' },
  { id: 't4', name: 'Amit Patel', role: 'Drone Operator' }
];

const SIMULATED_USERS = [
  { name: 'Sushant Nawale', role: 'Super Admin', avatar: 'SN', color: 'from-amber-500 to-amber-600' },
  { name: 'Rahul Sharma', role: 'Lead Photographer', avatar: 'RS', color: 'from-blue-500 to-indigo-600' },
  { name: 'Sneha Reddy', role: 'Main Editor', avatar: 'SR', color: 'from-emerald-500 to-teal-600' },
  { name: 'Karan Singh', role: 'Cinematographer', avatar: 'KS', color: 'from-rose-500 to-pink-600' }
];

interface CommentThread {
  text: string;
  authorName: string;
  authorRole: string;
  resolved: boolean;
  replies: Array<{
    id: string;
    text: string;
    authorName: string;
    authorRole: string;
    createdAt: string;
  }>;
}

const parseCommentText = (rawText: string, createdByEmail?: string | null): CommentThread => {
  try {
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return {
          text: parsed.text || '',
          authorName: parsed.authorName || 'Rahul Sharma',
          authorRole: parsed.authorRole || 'Lead Photographer',
          resolved: !!parsed.resolved,
          replies: Array.isArray(parsed.replies) ? parsed.replies : []
        };
      }
    }
  } catch (_) {}

  return {
    text: rawText,
    authorName: createdByEmail === 'sushantnawale700@gmail.com' ? 'Sushant Nawale' : 'Rahul Sharma',
    authorRole: createdByEmail === 'sushantnawale700@gmail.com' ? 'Super Admin' : 'Lead Photographer',
    resolved: false,
    replies: []
  };
};

export function LeadInsiderDrawer({
  lead,
  onClose,
  onLeadUpdate,
  stages = [],
  customSources = [],
  userEmail,
  commentsOnlyMode = false
}: LeadInsiderDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'quotes' | 'finance' | 'assets'>('overview');
  const [isMounted, setIsMounted] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Audited Comments State
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [enableFollowup, setEnableFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');

  // Simulated User Access
  const [currentUserSim, setCurrentUserSim] = useState(SIMULATED_USERS[0]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'resolved' | 'reminders'>('all');

  // Check role
  const isAdmin = userEmail === 'sushantnawale700@gmail.com' || userEmail?.includes('admin') || userEmail?.includes('owner');
  const isShooter = !isAdmin && userEmail?.includes('shooter');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch comments when lead changes or mounts
  useEffect(() => {
    if (lead) {
      fetchComments();
    }
  }, [lead?.id]);

  if (!lead) return null;

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const clientId = lead.client_id || lead.id;
      const tenantId = lead.tenant_id || lead.workspace_id;
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCommentsList(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleFieldChange = (fields: Partial<Lead>) => {
    if (onLeadUpdate) {
      onLeadUpdate(lead.id, fields);
    }
  };

  const handleRawPayloadChange = (key: string, val: any) => {
    const updatedPayload = { ...lead.raw_payload, [key]: val };
    handleFieldChange({ raw_payload: updatedPayload });
  };

  // Add structured Comment Thread
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const clientId = lead.client_id || lead.id;
    const tenantId = lead.tenant_id || lead.workspace_id;

    const threadObj: CommentThread = {
      text: commentText.trim(),
      authorName: currentUserSim.name,
      authorRole: currentUserSim.role,
      resolved: false,
      replies: []
    };

    let alertFlag = false;
    let followupAt = null;
    if (enableFollowup && followupDate && followupTime) {
      alertFlag = true;
      followupAt = new Date(`${followupDate}T${followupTime}`).toISOString();
    }

    try {
      const { error } = await supabase
        .from('client_comments')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          comment_text: JSON.stringify(threadObj),
          alert_flag: alertFlag,
          followup_at: followupAt
        });

      if (!error) {
        setCommentText('');
        setEnableFollowup(false);
        setFollowupDate('');
        setFollowupTime('');
        await fetchComments();

        // Push notification queue simulation
        if (alertFlag && followupAt) {
          await supabase.from('live_logs').insert({
            workspace_id: tenantId,
            lead_id: lead.id,
            event_type: 'comment_followup_reminder',
            message: `Automated voice reminder scheduled for client '${lead.name || lead.phone}' on ${new Date(followupAt).toLocaleString('en-IN')}.`,
            metadata: { followup_at: followupAt }
          });
        }
      }
    } catch (err) {
      console.error('Add comment exception:', err);
    }
  };

  // Edit Comment Text
  const handleUpdateComment = async (commentId: string, currentThread: CommentThread) => {
    if (!editingCommentText.trim()) return;
    const updatedThread: CommentThread = {
      ...currentThread,
      text: editingCommentText.trim()
    };

    try {
      const { error } = await supabase
        .from('client_comments')
        .update({ comment_text: JSON.stringify(updatedThread) })
        .eq('id', commentId);

      if (!error) {
        setEditingCommentId(null);
        setEditingCommentText('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Update comment error:', err);
    }
  };

  // Delete Comment Thread
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment thread?')) return;
    try {
      const { error } = await supabase
        .from('client_comments')
        .delete()
        .eq('id', commentId);

      if (!error) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  // Resolve Comment Thread
  const handleResolveThread = async (commentId: string, currentThread: CommentThread) => {
    const updatedThread: CommentThread = {
      ...currentThread,
      resolved: !currentThread.resolved
    };

    try {
      const { error } = await supabase
        .from('client_comments')
        .update({ comment_text: JSON.stringify(updatedThread) })
        .eq('id', commentId);

      if (!error) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Resolve thread error:', err);
    }
  };

  // Add Reply to Thread
  const handleAddReply = async (commentId: string, currentThread: CommentThread) => {
    const replyText = replyTexts[commentId]?.trim();
    if (!replyText) return;

    const updatedThread: CommentThread = {
      ...currentThread,
      replies: [
        ...currentThread.replies,
        {
          id: 'rep_' + Date.now(),
          text: replyText,
          authorName: currentUserSim.name,
          authorRole: currentUserSim.role,
          createdAt: new Date().toISOString()
        }
      ]
    };

    try {
      const { error } = await supabase
        .from('client_comments')
        .update({ comment_text: JSON.stringify(updatedThread) })
        .eq('id', commentId);

      if (!error) {
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        await fetchComments();
      }
    } catch (err) {
      console.error('Reply thread error:', err);
    }
  };

  // Delete Reply from Thread
  const handleDeleteReply = async (commentId: string, currentThread: CommentThread, replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    const updatedThread: CommentThread = {
      ...currentThread,
      replies: currentThread.replies.filter(r => r.id !== replyId)
    };

    try {
      const { error } = await supabase
        .from('client_comments')
        .update({ comment_text: JSON.stringify(updatedThread) })
        .eq('id', commentId);

      if (!error) {
        await fetchComments();
      }
    } catch (err) {
      console.error('Delete reply error:', err);
    }
  };

  const toggleAssignee = (memberId: string) => {
    const currentAssignees = lead.raw_payload?.assigned_team_ids || [];
    let updated: string[];
    if (currentAssignees.includes(memberId)) {
      updated = currentAssignees.filter((id: string) => id !== memberId);
    } else {
      updated = [...currentAssignees, memberId];
    }
    handleRawPayloadChange('assigned_team_ids', updated);
  };

  // Formatted Local Date-Time helper
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Upgraded Google Sheets Style Comments View
  const renderCommentsTimeline = () => {
    const parsedComments = commentsList.map(c => ({
      ...c,
      thread: parseCommentText(c.comment_text, c.created_by_user_email)
    }));

    // Filter threads
    const filteredComments = parsedComments.filter(c => {
      if (filterMode === 'active') return !c.thread.resolved;
      if (filterMode === 'resolved') return c.thread.resolved;
      if (filterMode === 'reminders') return c.alert_flag && c.followup_at;
      return true;
    });

    return (
      <div className="space-y-5">
        {/* Simulated Team Member Switcher for Workspace Collaboration */}
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/60 border border-[#E8E5DF] dark:border-zinc-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 bg-gradient-to-tr ${currentUserSim.color} shadow-sm`}>
              {currentUserSim.avatar}
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold text-slate-800 dark:text-zinc-200">{currentUserSim.name}</span>
              <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{currentUserSim.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Posting As:</span>
            <select
              value={currentUserSim.name}
              onChange={(e) => {
                const selected = SIMULATED_USERS.find(u => u.name === e.target.value);
                if (selected) setCurrentUserSim(selected);
              }}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-black rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer text-slate-700 dark:text-zinc-350 shadow-xs"
            >
              {SIMULATED_USERS.map(u => (
                <option key={u.name} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Toolbar Mode */}
        <div className="flex border border-slate-250/60 dark:border-zinc-900 bg-slate-50/60 dark:bg-zinc-950/40 p-1 rounded-xl gap-1 shrink-0">
          {[
            { id: 'all', label: 'All Threads' },
            { id: 'active', label: 'Active' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'reminders', label: 'Reminders' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id as any)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                filterMode === f.id 
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-350'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Comments Feed list */}
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {loadingComments ? (
            <div className="text-center py-6">
              <span className="text-xs text-slate-400 italic">Syncing Google Sheets comments...</span>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl bg-slate-50/20 dark:bg-zinc-950/20">
              <MessageSquare className="w-6 h-6 text-slate-400 dark:text-zinc-650 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-400 font-medium">No {filterMode !== 'all' ? filterMode : ''} comment threads found.</p>
            </div>
          ) : (
            filteredComments.map((comm) => {
              const thread = comm.thread;
              const parentAvatar = SIMULATED_USERS.find(u => u.name === thread.authorName)?.avatar || 'RS';
              const parentColor = SIMULATED_USERS.find(u => u.name === thread.authorName)?.color || 'from-indigo-500 to-purple-600';

              return (
                <div 
                  key={comm.id} 
                  className={`border border-[#E8E5DF] dark:border-zinc-900/60 p-4 rounded-2xl space-y-3 relative group/card transition-all ${
                    thread.resolved 
                      ? 'bg-slate-100/50 dark:bg-zinc-950/40 opacity-70' 
                      : 'bg-white dark:bg-zinc-950/80 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Parent Comment Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 bg-gradient-to-tr ${parentColor} shadow-xs`}>
                        {parentAvatar}
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 dark:text-zinc-200">{thread.authorName}</span>
                        <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{thread.authorRole}</span>
                      </div>
                    </div>
                    
                    {/* Timestamp & Action Toolbar */}
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] text-slate-400 font-semibold font-mono">
                        {formatDateTime(comm.created_at)}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {/* Resolve Checkmark (Google Sheets Style) */}
                        <button
                          onClick={() => handleResolveThread(comm.id, thread)}
                          title={thread.resolved ? "Re-open Thread" : "Resolve Thread"}
                          className={`p-1 rounded-md transition-colors ${
                            thread.resolved 
                              ? 'text-emerald-500 hover:bg-emerald-500/10' 
                              : 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/5'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        
                        {/* Edit Action */}
                        <button
                          onClick={() => {
                            setEditingCommentId(comm.id);
                            setEditingCommentText(thread.text);
                          }}
                          className="p-1 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/5 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Action */}
                        <button
                          onClick={() => handleDeleteComment(comm.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Parent Comment Text Body */}
                  <div className="pl-11">
                    {editingCommentId === comm.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                          type="text"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="flex-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleUpdateComment(comm.id, thread)}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingCommentId(null)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className={`text-slate-800 dark:text-zinc-200 text-xs font-bold leading-relaxed ${thread.resolved ? 'line-through text-slate-400 dark:text-zinc-500' : ''}`}>
                        {thread.text}
                      </p>
                    )}

                    {/* Alert / Reminder Hook Banner */}
                    {comm.alert_flag && comm.followup_at && (
                      <div className="mt-2.5 p-2 bg-[#D4AF37]/5 dark:bg-[#C5A059]/5 border border-[#D4AF37]/20 dark:border-[#C5A059]/20 rounded-xl flex items-center justify-between text-[10px] text-[#D4AF37] font-semibold">
                        <span className="flex items-center gap-1">
                          <AlarmClock className="w-3.5 h-3.5 animate-bounce shrink-0" />
                          Follow-up Scheduled: {formatDateTime(comm.followup_at)}
                        </span>
                        <span className="text-[8px] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Active Alert</span>
                      </div>
                    )}
                  </div>

                  {/* Replies (Google Sheets Thread Style) */}
                  {thread.replies && thread.replies.length > 0 && (
                    <div className="pl-11 space-y-3 pt-2.5 border-t border-slate-100 dark:border-zinc-900/60">
                      {thread.replies.map((reply: any) => {
                        const replyAvatar = SIMULATED_USERS.find(u => u.name === reply.authorName)?.avatar || 'RS';
                        const replyColor = SIMULATED_USERS.find(u => u.name === reply.authorName)?.color || 'from-indigo-500 to-purple-600';
                        return (
                          <div key={reply.id} className="flex items-start justify-between gap-2.5 group/reply">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <CornerDownRight className="w-4 h-4 text-slate-300 dark:text-zinc-700 shrink-0 mt-2" />
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-gradient-to-tr ${replyColor} shadow-xs mt-0.5`}>
                                {replyAvatar}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-350">{reply.authorName}</span>
                                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-900 px-1 rounded">{reply.authorRole}</span>
                                </div>
                                <p className="text-slate-800 dark:text-zinc-200 text-xs font-semibold leading-relaxed mt-1">{reply.text}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 text-right shrink-0">
                              <span className="text-[9px] text-slate-400 font-medium font-mono">{formatDateTime(reply.createdAt)}</span>
                              <button
                                onClick={() => handleDeleteReply(comm.id, thread, reply.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500 rounded opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                title="Delete Reply"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Reply Input (Only show if not resolved) */}
                  {!thread.resolved && (
                    <div className="pl-11 pt-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Reply to this thread..."
                          value={replyTexts[comm.id] || ''}
                          onChange={(e) => setReplyTexts(prev => ({ ...prev, [comm.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comm.id, thread)}
                          className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2 rounded-xl text-xs focus:outline-none placeholder-slate-400 dark:placeholder-zinc-650"
                        />
                        <button
                          onClick={() => handleAddReply(comm.id, thread)}
                          className="p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:text-orange-500 rounded-xl transition-all"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* New Comment Thread Creator Box */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-900 space-y-3">
          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block text-left">Start New Discussion Thread</span>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type a comments logger..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-3 rounded-xl text-xs focus:outline-none placeholder-slate-400 dark:placeholder-zinc-650"
              />
              <button
                onClick={() => setEnableFollowup(!enableFollowup)}
                title="Set Follow-up Reminder"
                className={`p-3 rounded-xl border transition-colors ${
                  enableFollowup 
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 font-bold animate-pulse' 
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 text-slate-500'
                }`}
              >
                <AlarmClock className="w-4 h-4" />
              </button>
              <button 
                onClick={handleAddComment}
                className="px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-250 text-white dark:text-black font-black rounded-xl text-xs transition-colors shadow-xs"
              >
                Log Thread
              </button>
            </div>

            {enableFollowup && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-2.5"
              >
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlarmClock className="w-3.5 h-3.5" />
                  Voice Reminder Scheduling (Alert Hook)
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input 
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded-xl p-2 text-center font-mono font-bold text-xs"
                  />
                  <input 
                    type="time"
                    value={followupTime}
                    onChange={(e) => setFollowupTime(e.target.value)}
                    className="bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded-xl p-2 text-center font-mono font-bold text-xs"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 220 }}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full ${commentsOnlyMode ? 'max-w-lg' : 'max-w-md'} bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 shadow-2xl flex flex-col text-slate-800 dark:text-white`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-900 shrink-0 bg-slate-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {commentsOnlyMode ? 'Comments & Reminders Workspace' : 'Lead Workspace'}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {commentsOnlyMode ? `Client: ${lead.name || lead.phone}` : `Project ID: ${lead.id.slice(0, 8)}...`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (Hidden in Comments Only Mode) */}
        {!commentsOnlyMode && (
          <div className="flex border-b border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/30 p-1.5 gap-1 shrink-0">
            {[
              { id: 'overview', label: 'Overview', icon: Briefcase },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare },
              { id: 'quotes', label: 'Quotations', icon: FileText },
              { id: 'finance', label: 'Financials', icon: DollarSign },
              { id: 'assets', label: 'Assets', icon: FileIcon }
            ].map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-xl transition-all ${
                    active 
                      ? 'bg-white dark:bg-zinc-900 text-orange-500 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-sm' 
                      : 'text-slate-500 dark:text-zinc-550 hover:text-slate-855 dark:hover:text-zinc-350'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* If Comments Only Mode, render comments directly */}
            {commentsOnlyMode ? (
              <motion.div
                key="comments-only"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="space-y-6 text-xs"
              >
                {renderCommentsTimeline()}
              </motion.div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW & ASSIGNEES */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-6 text-xs"
                  >
                    {/* Standard fields */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 dark:text-zinc-550 font-bold uppercase tracking-wider block">Lead Name</label>
                        <input 
                          type="text" 
                          value={lead.name || ''} 
                          onChange={(e) => handleFieldChange({ name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-orange-500/40"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Mobile Phone</label>
                        <input 
                          type="text" 
                          value={lead.phone} 
                          onChange={(e) => handleFieldChange({ phone: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Email Address</label>
                        <input 
                          type="text" 
                          value={lead.email || ''} 
                          onChange={(e) => handleFieldChange({ email: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 p-2.5 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Team Allocations & Assignees */}
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-900">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-orange-500" />
                        Team Allocations & Assignees
                      </h4>
                      <div className="space-y-2">
                        {MOCK_TEAM_MEMBERS.map(member => {
                          const isAssigned = (lead.raw_payload?.assigned_team_ids || []).includes(member.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleAssignee(member.id)}
                              className={`w-full flex items-center justify-between p-2.5 border rounded-xl transition-all ${
                                isAssigned 
                                  ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold' 
                                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-850 text-slate-600 dark:text-zinc-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="text-left">
                                  <div className="text-xs font-semibold">{member.name}</div>
                                  <div className="text-[9px] text-slate-500">{member.role}</div>
                                </div>
                              </div>
                              <Check className={`w-3.5 h-3.5 ${isAssigned ? 'opacity-100' : 'opacity-0'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upgraded Comments Timeline (Direct Database Persistence) */}
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-900">
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-550 tracking-wider">Comments & Reminders Timeline</h4>
                      {renderCommentsTimeline()}
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: TEAM TASKS WORKSPACE */}
                {activeTab === 'tasks' && (
                  <motion.div
                    key="tasks"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[10px] font-bold leading-normal flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Client-Specific Tasks workspace. RLS permissions applied based on workspace owner context.</span>
                    </div>
                    <TeamTasksManager
                      clientId={lead.client_id || lead.id}
                      workspaceId={lead.workspace_id || lead.tenant_id || ''}
                      userEmail={userEmail}
                    />
                  </motion.div>
                )}

                {/* TAB 3: QUOTATION BUILDER */}
                {activeTab === 'quotes' && (
                  <motion.div
                    key="quotes"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-6"
                  >
                    <QuotationBuilder
                      lead={lead}
                      onLeadUpdate={handleFieldChange}
                      userEmail={userEmail}
                    />
                  </motion.div>
                )}

                {/* TAB 4: FINANCIAL MATRIX */}
                {activeTab === 'finance' && (
                  <motion.div
                    key="finance"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-6"
                  >
                    {isShooter ? (
                      <div className="p-6 rounded-2xl border border-rose-500/10 bg-rose-500/5 text-center space-y-4 py-16">
                        <Lock className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                        <h3 className="text-sm font-black text-rose-400 uppercase tracking-wide">Access Token Mismatch</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Standard Shooter accounts do not possess authentication clearances to view financial billing matrix structures.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-400 text-[10px] font-bold leading-normal flex items-start gap-2">
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Financial clearance granted. Only administrators or workspace owners can edit these billing registry matrix values.</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Total Deal Cost (₹)</label>
                          <input 
                            type="number" 
                            value={lead.raw_payload?.total_deal_cost || ''} 
                            onChange={(e) => handleRawPayloadChange('total_deal_cost', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                            placeholder="e.g. 250000"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Retainer Payment (₹)</label>
                          <input 
                            type="number" 
                            value={lead.raw_payload?.retainer_payment || ''} 
                            onChange={(e) => handleRawPayloadChange('retainer_payment', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                            placeholder="e.g. 50000"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Balance Outstanding (₹)</label>
                          <div className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs font-black">
                            ₹{Math.max(0, (Number(lead.raw_payload?.total_deal_cost || 0) - Number(lead.raw_payload?.retainer_payment || 0))).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider block">Tracking Token Keys</label>
                          <input 
                            type="text" 
                            value={lead.raw_payload?.tracking_token || ''} 
                            onChange={(e) => handleRawPayloadChange('tracking_token', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                            placeholder="e.g. FT-998822-LOCK"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB 5: WORKSPACE ASSETS */}
                {activeTab === 'assets' && (
                  <motion.div
                    key="assets"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="space-y-4 text-xs"
                  >
                    <div className="text-[10px] text-slate-500 dark:text-zinc-555 font-bold uppercase tracking-wider">Photography Documents</div>
                    
                    <div className="space-y-3">
                      {[
                        { name: 'Quotation_Taj_Lake_Palace.pdf', size: '1.4 MB', type: 'proposal', status: 'Approved' },
                        { name: 'Invoice_Retainer_50k.pdf', size: '320 KB', type: 'invoice', status: 'Paid' },
                        { name: 'Wedding_Photography_Contract.pdf', size: '780 KB', type: 'contract', status: 'Signed' }
                      ].map((asset, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/40 rounded-xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{asset.name}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">{asset.size} • {asset.type.toUpperCase()}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono ${
                            asset.status === 'Paid' || asset.status === 'Signed' || asset.status === 'Approved'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                          }`}>
                            {asset.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => alert('Supabase Object Storage direct browser upload triggered.')}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Upload New Asset Proposal
                    </button>
                  </motion.div>
                )}
              </>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

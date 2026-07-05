'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, User, DollarSign, FileText, Lock, Users, Briefcase, Plus, Calendar, Tag, Mail, Phone,
  FileIcon, ChevronRight, CheckSquare, AlarmClock, Trash2, Edit2, Clock, Shield,
  CornerDownRight, CheckCircle2, MessageSquare, Reply, AlertCircle, ArrowLeft, ArrowRight
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

interface LeadComment {
  id: string;
  text: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  alert_flag?: boolean;
  followup_at?: string | null;
  replies?: Array<{
    id: string;
    text: string;
    authorName: string;
    authorRole: string;
    createdAt: string;
  }>;
}

const parseLeadComment = (comm: any, createdByEmail?: string | null): LeadComment => {
  if (comm && typeof comm === 'object') {
    return {
      id: comm.id || 'comm_' + Math.random().toString(36).substring(7),
      text: comm.text || comm.comment_text || '',
      authorName: comm.authorName || (createdByEmail === 'sushantnawale700@gmail.com' ? 'Sushant Nawale' : 'Rahul Sharma'),
      authorRole: comm.authorRole || (createdByEmail === 'sushantnawale700@gmail.com' ? 'Super Admin' : 'Lead Photographer'),
      createdAt: comm.createdAt || comm.created_at || new Date().toISOString(),
      alert_flag: comm.alert_flag !== undefined ? !!comm.alert_flag : false,
      followup_at: comm.followup_at || null,
      replies: Array.isArray(comm.replies) ? comm.replies : []
    };
  }

  try {
    const rawText = String(comm);
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      const parsed = JSON.parse(rawText);
      return parseLeadComment(parsed, createdByEmail);
    }
  } catch (_) {}

  return {
    id: 'comm_' + Math.random().toString(36).substring(7),
    text: String(comm),
    authorName: createdByEmail === 'sushantnawale700@gmail.com' ? 'Sushant Nawale' : 'Rahul Sharma',
    authorRole: createdByEmail === 'sushantnawale700@gmail.com' ? 'Super Admin' : 'Lead Photographer',
    createdAt: new Date().toISOString(),
    alert_flag: false,
    followup_at: null,
    replies: []
  };
};

const getAuthorFromEmail = (email: string | null | undefined) => {
  if (!email) {
    return {
      name: 'Sushant Nawale',
      role: 'Super Admin',
      avatar: 'SN',
      color: 'from-amber-500 to-amber-600'
    };
  }
  
  const emailLower = email.toLowerCase();
  if (emailLower === 'sushantnawale700@gmail.com') {
    return {
      name: 'Sushant Nawale',
      role: 'Super Admin',
      avatar: 'SN',
      color: 'from-amber-500 to-amber-600'
    };
  }
  if (emailLower.startsWith('rahul')) {
    return {
      name: 'Rahul Sharma',
      role: 'Lead Photographer',
      avatar: 'RS',
      color: 'from-blue-500 to-indigo-600'
    };
  }
  if (emailLower.startsWith('sneha')) {
    return {
      name: 'Sneha Reddy',
      role: 'Main Editor',
      avatar: 'SR',
      color: 'from-emerald-500 to-teal-600'
    };
  }
  if (emailLower.startsWith('karan')) {
    return {
      name: 'Karan Singh',
      role: 'Cinematographer',
      avatar: 'KS',
      color: 'from-rose-500 to-pink-600'
    };
  }

  const prefix = email.split('@')[0];
  const name = prefix.split(/[\._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const avatar = prefix.slice(0, 2).toUpperCase();
  return {
    name,
    role: 'Team Member',
    avatar,
    color: 'from-slate-500 to-zinc-600'
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
  const [commentsList, setCommentsList] = useState<LeadComment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [enableFollowup, setEnableFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('');

  // Date and Time typing values
  const [followupDateInput, setFollowupDateInput] = useState('');
  const [followupTimeInput, setFollowupTimeInput] = useState('');

  // Custom 3D Reminder Date & Time selection states
  const [showRemDatePicker, setShowRemDatePicker] = useState(false);
  const [showRemTimePicker, setShowRemTimePicker] = useState(false);
  const [remMonth, setRemMonth] = useState(new Date().getMonth());
  const [remYear, setRemYear] = useState(new Date().getFullYear());

  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('PM');

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'comments' | 'reminders'>('all');

  // Resolve user profile automatically based on auth email
  const authorProfile = getAuthorFromEmail(userEmail);

  // Check role
  const isAdmin = userEmail === 'sushantnawale700@gmail.com' || userEmail?.includes('admin') || userEmail?.includes('owner');
  const isShooter = !isAdmin && userEmail?.includes('shooter');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync comments directly from the lead prop
  useEffect(() => {
    if (lead) {
      const parsed = (lead.comments || []).map((c: any) => parseLeadComment(c, userEmail));
      parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCommentsList(parsed);

      // Pre-fill today's date & time
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      setFollowupDateInput(`${dd}/${mm}/${yyyy}`);
      setFollowupDate(`${yyyy}-${mm}-${dd}`);

      setFollowupTimeInput('12:00 PM');
      setSelectedHour('12');
      setSelectedMinute('00');
      setSelectedPeriod('PM');
      setFollowupTime('12:00');
    }
  }, [lead?.comments, lead?.id]);

  if (!lead) return null;

  const fetchComments = () => {
    if (lead) {
      const parsed = (lead.comments || []).map((c: any) => parseLeadComment(c, userEmail));
      parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCommentsList(parsed);
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

  // 24 Hour Time conversion
  const get24HourTime = (hour: string, minute: string, period: string) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  const updateFollowupTime = (h: string, m: string, p: string) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    const time24 = get24HourTime(h, m, p);
    setFollowupTime(time24);
    setFollowupTimeInput(`${h}:${m} ${p}`);
  };

  // Manual date typing parse
  const handleDateTyping = (val: string) => {
    setFollowupDateInput(val);
    const parts = val.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
        const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        setFollowupDate(formatted);
      }
    }
  };

  // Manual time typing parse
  const handleTimeTyping = (val: string) => {
    setFollowupTimeInput(val);
    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      const hStr = match[1];
      const mStr = match[2];
      const period = match[3]?.toUpperCase();

      const h = parseInt(hStr, 10);
      const min = parseInt(mStr, 10);
      if (h >= 1 && h <= 12 && min >= 0 && min <= 59 && (period === 'AM' || period === 'PM')) {
        setSelectedHour(hStr.padStart(2, '0'));
        setSelectedMinute(mStr);
        setSelectedPeriod(period);
        const time24 = get24HourTime(hStr.padStart(2, '0'), mStr, period);
        setFollowupTime(time24);
      } else if (h >= 0 && h <= 23 && min >= 0 && min <= 59 && !period) {
        let displayHour = h;
        let p = 'AM';
        if (h >= 12) {
          p = 'PM';
          if (h > 12) displayHour = h - 12;
        }
        if (h === 0) displayHour = 12;
        setSelectedHour(String(displayHour).padStart(2, '0'));
        setSelectedMinute(mStr);
        setSelectedPeriod(p);
        setFollowupTime(`${hStr.padStart(2, '0')}:${mStr}`);
      }
    }
  };

  // Add structured Comment
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    const newComment: LeadComment = {
      id: 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: commentText.trim(),
      authorName: authorProfile.name,
      authorRole: authorProfile.role,
      createdAt: new Date().toISOString(),
      alert_flag: enableFollowup && followupDate && followupTime ? true : false,
      followup_at: enableFollowup && followupDate && followupTime ? new Date(`${followupDate}T${followupTime}`).toISOString() : null,
      replies: []
    };

    const updatedComments = [...commentsList, newComment];
    handleFieldChange({ comments: updatedComments as any });
    setCommentsList(updatedComments);

    setCommentText('');
    setEnableFollowup(false);

    try {
      const tenantId = lead.tenant_id || lead.workspace_id;
      // Log comment event inside live_logs table
      await supabase.from('live_logs').insert({
        workspace_id: tenantId,
        lead_id: lead.id,
        event_type: 'comment_added',
        message: `${authorProfile.name} added comment for client '${lead.name || lead.phone}'`,
        metadata: { text: newComment.text, alert_flag: newComment.alert_flag, followup_at: newComment.followup_at }
      });
    } catch (err) {
      console.error('Error logging comment:', err);
    }
  };

  // Edit Comment Text
  const handleUpdateComment = async (commentId: string, currentThread: LeadComment) => {
    if (!editingCommentText.trim()) return;
    
    const updatedComments = commentsList.map(c => {
      if (c.id === commentId) {
        return { ...c, text: editingCommentText.trim() };
      }
      return c;
    });

    handleFieldChange({ comments: updatedComments as any });
    setCommentsList(updatedComments);
    setEditingCommentId(null);
    setEditingCommentText('');

    try {
      const tenantId = lead.tenant_id || lead.workspace_id;
      await supabase.from('live_logs').insert({
        workspace_id: tenantId,
        lead_id: lead.id,
        event_type: 'comment_edited',
        message: `${authorProfile.name} edited comment for client '${lead.name || lead.phone}'`,
        metadata: { comment_id: commentId }
      });
    } catch (_) {}
  };

  // Delete Comment Thread
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    const updatedComments = commentsList.filter(c => c.id !== commentId);
    handleFieldChange({ comments: updatedComments as any });
    setCommentsList(updatedComments);

    try {
      const tenantId = lead.tenant_id || lead.workspace_id;
      await supabase.from('live_logs').insert({
        workspace_id: tenantId,
        lead_id: lead.id,
        event_type: 'comment_deleted',
        message: `${authorProfile.name} deleted comment for client '${lead.name || lead.phone}'`,
        metadata: { comment_id: commentId }
      });
    } catch (_) {}
  };

  // Add Reply to Thread
  const handleAddReply = async (commentId: string, currentThread: LeadComment) => {
    const replyText = replyTexts[commentId]?.trim();
    if (!replyText) return;

    const newReply = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: replyText,
      authorName: authorProfile.name,
      authorRole: authorProfile.role,
      authorEmail: userEmail,
      createdAt: new Date().toISOString()
    };

    const updatedComments = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    handleFieldChange({ comments: updatedComments as any });
    setCommentsList(updatedComments);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));

    try {
      const tenantId = lead.tenant_id || lead.workspace_id;
      await supabase.from('live_logs').insert({
        workspace_id: tenantId,
        lead_id: lead.id,
        event_type: 'comment_reply_added',
        message: `${authorProfile.name} replied to comment for client '${lead.name || lead.phone}'`,
        metadata: { comment_id: commentId }
      });
    } catch (_) {}
  };

  // Delete Reply from Thread
  const handleDeleteReply = async (commentId: string, currentThread: LeadComment, replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    
    const updatedComments = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: (c.replies || []).filter((r: any) => r.id !== replyId)
        };
      }
      return c;
    });

    handleFieldChange({ comments: updatedComments as any });
    setCommentsList(updatedComments);
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

  // Upgraded Comments View (Simple Google Sheets style feed)
  const renderCommentsTimeline = () => {
    const filteredComments = commentsList.filter(c => {
      if (filterMode === 'comments') return !c.alert_flag;
      if (filterMode === 'reminders') return !!c.alert_flag;
      return true;
    });

    return (
      <div className="space-y-5">
        {/* Commenting Credentials Badge */}
        <div className="p-3 bg-slate-50/60 dark:bg-zinc-900/40 border border-[#E8E5DF] dark:border-zinc-900 rounded-2xl flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2.5">
            <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 bg-gradient-to-tr ${authorProfile.color} shadow-xs`}>
              {authorProfile.avatar}
            </div>
            <div className="text-left">
              <span className="block text-xs font-extrabold text-slate-800 dark:text-zinc-200">Commenting as: {authorProfile.name}</span>
              <span className="block text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">{authorProfile.role}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded text-[9px] font-extrabold tracking-wide uppercase select-none">
            Active Session
          </span>
        </div>

        {/* Comment Filter Tabs (All / Comments / Reminders) */}
        <div className="flex border border-slate-200 dark:border-zinc-900 bg-[#FAF8F5] dark:bg-zinc-950/40 p-1 rounded-xl gap-1 shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'comments', label: 'Comments Only' },
            { id: 'reminders', label: 'Reminders Only' }
          ].map(f => {
            const active = filterMode === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id as any)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  active 
                    ? 'bg-white dark:bg-zinc-900 text-[#D4AF37] border border-slate-200 dark:border-zinc-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-350'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Comments Feed list */}
        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
          {filteredComments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl bg-slate-50/20 dark:bg-zinc-950/20">
              <MessageSquare className="w-6 h-6 text-slate-400 dark:text-zinc-650 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-400 font-medium">No comments found.</p>
            </div>
          ) : (
            filteredComments.map((comm) => {
              const replies = comm.replies || [];
              const parentAvatar = getAuthorFromEmail(comm.authorName === 'Sushant Nawale' ? 'sushantnawale700@gmail.com' : 'rahul@gmail.com').avatar;
              const parentColor = getAuthorFromEmail(comm.authorName === 'Sushant Nawale' ? 'sushantnawale700@gmail.com' : 'rahul@gmail.com').color;

              return (
                <div 
                  key={comm.id} 
                  className="border border-[#E8E5DF] dark:border-zinc-900/60 p-4 rounded-2xl space-y-3 bg-white dark:bg-zinc-950/80 shadow-xs hover:shadow-md transition-all relative group"
                >
                  {/* Parent Comment Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 bg-gradient-to-tr ${parentColor} shadow-xs`}>
                        {parentAvatar}
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-black text-slate-800 dark:text-zinc-200">{comm.authorName}</span>
                        <span className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{comm.authorRole}</span>
                      </div>
                    </div>
                    
                    {/* Timestamp & Actions */}
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10.5px] text-slate-900 dark:text-zinc-150 font-bold font-sans">
                        {formatDateTime(comm.createdAt)}
                      </span>
                      
                      <div className="flex items-center gap-0.5">
                        {/* Edit Action Icon */}
                        <button
                          onClick={() => {
                            setEditingCommentId(comm.id);
                            setEditingCommentText(comm.text);
                          }}
                          className="p-1 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/5 rounded-md transition-colors"
                          title="Edit Comment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Action Icon */}
                        <button
                          onClick={() => handleDeleteComment(comm.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-md transition-colors"
                          title="Delete Comment"
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
                          onClick={() => handleUpdateComment(comm.id, comm)}
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
                      <p className="text-slate-800 dark:text-zinc-200 text-xs font-bold leading-relaxed text-left font-sans">
                        {comm.text}
                      </p>
                    )}

                    {/* Alert / Reminder Hook Banner */}
                    {comm.alert_flag && comm.followup_at && (
                      <div className="mt-2.5 p-2 bg-[#D4AF37]/5 dark:bg-[#C5A059]/5 border border-[#D4AF37]/20 dark:border-[#C5A059]/20 rounded-xl flex items-center justify-between text-[10px] text-[#D4AF37] font-semibold">
                        <span className="flex items-center gap-1">
                          <AlarmClock className="w-3.5 h-3.5 animate-bounce shrink-0" />
                          Follow-up Reminder: {formatDateTime(comm.followup_at)}
                        </span>
                        <span className="text-[8px] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Scheduled</span>
                      </div>
                    )}
                  </div>

                  {/* Replies (Google Sheets Thread Style) */}
                  {replies.length > 0 && (
                    <div className="pl-11 space-y-3 pt-2.5 border-t border-slate-100 dark:border-zinc-900/60">
                      {replies.map((reply: any) => {
                        const replyAvatar = getAuthorFromEmail(reply.authorEmail).avatar;
                        const replyColor = getAuthorFromEmail(reply.authorEmail).color;
                        return (
                          <div key={reply.id} className="flex items-start justify-between gap-2.5 group/reply">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <CornerDownRight className="w-4 h-4 text-slate-300 dark:text-zinc-755 shrink-0 mt-2" />
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-gradient-to-tr ${replyColor} shadow-xs mt-0.5`}>
                                {replyAvatar}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-350">{reply.authorName}</span>
                                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-900 px-1 rounded">{reply.authorRole}</span>
                                </div>
                                <p className="text-slate-800 dark:text-zinc-200 text-xs font-semibold leading-relaxed mt-1 text-left font-sans">{reply.text}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 text-right shrink-0">
                              <span className="text-[10px] text-slate-700 dark:text-zinc-250 font-bold font-sans">{formatDateTime(reply.createdAt)}</span>
                              <button
                                onClick={() => handleDeleteReply(comm.id, comm, reply.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500 rounded opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                title="Delete Reply"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Reply Input */}
                  <div className="pl-11 pt-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reply to this thread..."
                        value={replyTexts[comm.id] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [comm.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comm.id, comm)}
                        className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-855 p-2 rounded-xl text-xs focus:outline-none placeholder-slate-400 dark:placeholder-zinc-650"
                      />
                      <button
                        onClick={() => handleAddReply(comm.id, comm)}
                        className="p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:text-orange-500 rounded-xl transition-all"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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

            {/* Custom 3D Reminder Date & Time Selection Component */}
            {enableFollowup && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-3.5 shadow-sm text-[#1A1A1A] dark:text-[#F5F5F5] select-none"
              >
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlarmClock className="w-3.5 h-3.5" />
                  Voice Reminder Scheduling (Alert Hook)
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Custom 3D Date Input Trigger */}
                  <div className="relative">
                    <label className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block text-left mb-1">Date (DD/MM/YYYY)</label>
                    <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-[#D4AF37] transition-all">
                      <input
                        type="text"
                        placeholder="e.g. 05/07/2026"
                        value={followupDateInput}
                        onChange={(e) => handleDateTyping(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowRemDatePicker(!showRemDatePicker);
                          setShowRemTimePicker(false);
                        }}
                        className="px-2.5 hover:bg-slate-50 dark:hover:bg-zinc-850 text-[#D4AF37] border-l border-slate-200 dark:border-zinc-800"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Custom 3D Date Picker Calendar Dropdown */}
                    {showRemDatePicker && (
                      <div className="absolute left-0 mt-2 z-50 p-3.5 bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] rounded-2xl shadow-xl space-y-3 w-[260px]">
                        {/* Month Select Headers */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DF] dark:border-[#2C2926]">
                          <button
                            type="button"
                            onClick={() => {
                              if (remMonth === 0) {
                                setRemMonth(11);
                                setRemYear(remYear - 1);
                              } else {
                                setRemMonth(remMonth - 1);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-650"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][remMonth]} {remYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (remMonth === 11) {
                                setRemMonth(0);
                                setRemYear(remYear + 1);
                              } else {
                                setRemMonth(remMonth + 1);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-650"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Calendar Day Header */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <span key={d} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-555 uppercase">{d}</span>
                          ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {(() => {
                            const daysInM = new Date(remYear, remMonth + 1, 0).getDate();
                            const startIdx = new Date(remYear, remMonth, 1).getDay();
                            const cells = [];
                            for (let i = 0; i < startIdx; i++) {
                              cells.push(<div key={`empty-${i}`} className="w-7 h-7" />);
                            }
                            for (let d = 1; d <= daysInM; d++) {
                              const curDateS = `${remYear}-${String(remMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                              const isSelected = followupDate === curDateS;
                              cells.push(
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => {
                                    setFollowupDate(curDateS);
                                    const dd = String(d).padStart(2, '0');
                                    const mm = String(remMonth + 1).padStart(2, '0');
                                    setFollowupDateInput(`${dd}/${mm}/${remYear}`);
                                    setShowRemDatePicker(false);
                                  }}
                                  className={`w-7 h-7 text-[11px] font-bold rounded-lg flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-[#D4AF37] text-white rounded-full font-black shadow-md' 
                                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  {d}
                                </button>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom 3D Time Input Trigger */}
                  <div className="relative">
                    <label className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-555 block text-left mb-1">Time (HH:MM AM/PM)</label>
                    <div className="flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-[#D4AF37] transition-all">
                      <input
                        type="text"
                        placeholder="e.g. 02:59 PM"
                        value={followupTimeInput}
                        onChange={(e) => handleTimeTyping(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-2 text-xs font-mono font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowRemTimePicker(!showRemTimePicker);
                          setShowRemDatePicker(false);
                        }}
                        className="px-2.5 hover:bg-slate-50 dark:hover:bg-zinc-850 text-[#D4AF37] border-l border-slate-200 dark:border-zinc-800"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Custom 3D Time Picker Dropdown Card */}
                    {showRemTimePicker && (
                      <div className="absolute right-0 mt-2 z-50 p-4 bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] rounded-2xl shadow-xl space-y-4 w-[280px]">
                        <div className="text-center font-mono font-black text-slate-800 dark:text-zinc-200 text-sm border-b border-[#E8E5DF] dark:border-[#2C2926] pb-2 flex justify-center gap-1.5 items-center">
                          <span className="text-[#D4AF37]">{selectedHour}</span>
                          <span>:</span>
                          <span className="text-[#D4AF37]">{selectedMinute}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-sans uppercase font-bold text-slate-650">{selectedPeriod}</span>
                        </div>

                        {/* Hours Selector Grid */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-555 block text-left">Hours</span>
                          <div className="grid grid-cols-6 gap-1">
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => updateFollowupTime(h, selectedMinute, selectedPeriod)}
                                className={`py-1 text-[10px] font-bold rounded ${
                                  selectedHour === h 
                                    ? 'bg-[#D4AF37] text-white font-black shadow-xs' 
                                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-350 hover:bg-slate-100 dark:hover:bg-zinc-850'
                                }`}
                              >
                                {parseInt(h, 10)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Minutes Selector Grid */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-555 block text-left">Minutes</span>
                          <div className="grid grid-cols-4 gap-1">
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => updateFollowupTime(selectedHour, m, selectedPeriod)}
                                className={`py-1 text-[10px] font-bold rounded ${
                                  selectedMinute === m 
                                    ? 'bg-[#D4AF37] text-white font-black shadow-xs' 
                                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-350 hover:bg-slate-100 dark:hover:bg-zinc-855'
                                }`}
                              >
                                :{m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* AM/PM Toggle */}
                        <div className="flex border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl p-1 bg-slate-50 dark:bg-zinc-950">
                          {['AM', 'PM'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                updateFollowupTime(selectedHour, selectedMinute, p);
                                setShowRemTimePicker(false);
                              }}
                              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                                selectedPeriod === p 
                                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 shadow-xs' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
        className="fixed inset-0 z-[999998] bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 220 }}
        className={`fixed top-0 right-0 bottom-0 z-[999999] w-full ${commentsOnlyMode ? 'max-w-lg' : 'max-w-md'} bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-900 shadow-2xl flex flex-col text-slate-800 dark:text-white`}
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
                      <h4 className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-555 tracking-wider flex items-center gap-1.5">
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
                                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-855 text-slate-600 dark:text-zinc-400'
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
                          Standard Shooter accounts do not possess authentication clearances to view financial billing registry structures.
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
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
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
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-2.5 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
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

'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, CheckCircle2, Circle, Clock, CornerDownRight, 
  Send, PenTool, ShieldAlert, Trash2, Filter, Reply, Check 
} from 'lucide-react';
import { formatTimecode } from './VideoPlayer';

interface CommentItem {
  id: string;
  version_id: string;
  parent_comment_id?: string | null;
  timestamp_seconds: number;
  author_name: string;
  author_email?: string;
  author_role?: string;
  content: string;
  is_resolved?: boolean;
  is_internal?: boolean;
  has_annotation?: boolean;
  annotation_data?: any;
  created_at: string;
}

interface CommentsPanelProps {
  comments: CommentItem[];
  currentTime: number;
  activeCommentId: string | null;
  onSelectComment: (comment: CommentItem) => void;
  onAddComment: (data: {
    content: string;
    timestamp_seconds: number;
    is_internal: boolean;
    parent_comment_id?: string | null;
  }) => Promise<void>;
  onToggleResolve: (id: string, isResolved: boolean) => Promise<void>;
  onDeleteComment?: (id: string) => Promise<void>;
  isDrawMode: boolean;
  setIsDrawMode: (val: boolean) => void;
  hasCurrentAnnotation: boolean;
  currentUserRole?: string; // 'owner' | 'editor' | 'client'
  currentUserName?: string;
}

export default function CommentsPanel({
  comments,
  currentTime,
  activeCommentId,
  onSelectComment,
  onAddComment,
  onToggleResolve,
  onDeleteComment,
  isDrawMode,
  setIsDrawMode,
  hasCurrentAnnotation,
  currentUserRole = 'owner',
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Top-level comments and replies mapping
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {} as Record<string, CommentItem[]>);

  const filteredComments = topLevelComments.filter(c => {
    if (filter === 'unresolved') return !c.is_resolved;
    if (filter === 'resolved') return c.is_resolved;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddComment({
        content: newCommentText.trim(),
        timestamp_seconds: currentTime,
        is_internal: isInternal,
      });
      setNewCommentText('');
      setIsInternal(false);
      setIsDrawMode(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string, parentTimestamp: number) => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddComment({
        content: replyText.trim(),
        timestamp_seconds: parentTimestamp,
        is_internal: false,
        parent_comment_id: parentId,
      });
      setReplyText('');
      setReplyingToId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#E7E2D8] shadow-2xs overflow-hidden select-none">
      
      {/* 1. Header with Stats & Filter Pills */}
      <div className="p-4 border-b border-[#E7E2D8] bg-[#FAF9F5] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Feedback & Notes</h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                {comments.length} total comments · {comments.filter(c => !c.is_resolved).length} unresolved
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E7E2D8]">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'all' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            All ({topLevelComments.length})
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'unresolved' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Unresolved ({topLevelComments.filter(c => !c.is_resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'resolved' ? 'bg-amber-500 text-white shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Resolved ({topLevelComments.filter(c => c.is_resolved).length})
          </button>
        </div>
      </div>

      {/* 2. Scrollable Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-zinc-100">
        {filteredComments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
            <Clock className="w-8 h-8 text-zinc-300" />
            <p className="text-xs font-medium">No feedback matching this filter</p>
            <p className="text-[11px] text-zinc-400 max-w-[200px]">
              Pause the video at any frame to pin a timestamped note or drawing.
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isActive = activeCommentId === comment.id;
            const replies = repliesMap[comment.id] || [];

            return (
              <div 
                key={comment.id}
                onClick={() => onSelectComment(comment)}
                className={`pt-3.5 first:pt-0 group/comment cursor-pointer transition-all rounded-2xl p-2.5 ${
                  isActive 
                    ? 'bg-amber-50/70 ring-1 ring-amber-300/80 shadow-2xs' 
                    : comment.is_resolved 
                    ? 'bg-emerald-50/20 hover:bg-emerald-50/40 border border-emerald-100/50' 
                    : 'hover:bg-zinc-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  
                  {/* Timestamp Pill & Resolve Checkbox */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleResolve(comment.id, !comment.is_resolved);
                      }}
                      className="cursor-pointer transition"
                      title={comment.is_resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    >
                      {comment.is_resolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300 hover:text-emerald-600" />
                      )}
                    </button>

                    <span className="font-mono text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {formatTimecode(comment.timestamp_seconds)}
                    </span>

                    {comment.is_resolved && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" /> Resolved
                      </span>
                    )}

                    {comment.has_annotation && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-purple-200">
                        <PenTool className="w-2.5 h-2.5" /> Drawing
                      </span>
                    )}

                    {comment.is_internal && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                        Internal Team
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  {onDeleteComment && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this comment?')) onDeleteComment(comment.id);
                      }}
                      className="opacity-0 group-hover/comment:opacity-100 text-zinc-300 hover:text-red-500 p-1 rounded-md transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Body - No strikethrough, clean and readable! */}
                <div className="mt-2 text-xs leading-relaxed pl-6">
                  <p className={comment.is_resolved ? 'text-zinc-600' : 'text-zinc-900 font-medium'}>
                    {comment.content}
                  </p>
                </div>

                {/* Author & Actions Footer */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pl-6">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-zinc-700">{comment.author_name}</span>
                    <span>·</span>
                    <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingToId(replyingToId === comment.id ? null : comment.id);
                    }}
                    className="flex items-center gap-1 text-zinc-400 hover:text-amber-600 cursor-pointer transition font-medium"
                  >
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                </div>

                {/* Threaded Replies List */}
                {replies.length > 0 && (
                  <div className="mt-3 pl-6 space-y-2 border-l-2 border-amber-200/60 ml-2">
                    {replies.map(reply => (
                      <div key={reply.id} className="text-xs bg-white rounded-xl p-2 border border-[#E7E2D8]">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                          <span className="font-bold text-zinc-700">{reply.author_name}</span>
                          <span>{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-zinc-800">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Input Box */}
                {replyingToId === comment.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="mt-3 pl-6 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center gap-1.5 bg-white border border-amber-400 rounded-xl p-1.5 shadow-2xs">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.author_name}...`}
                        className="flex-1 text-xs outline-hidden px-2 text-zinc-800 bg-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleReplySubmit(comment.id, comment.timestamp_seconds);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleReplySubmit(comment.id, comment.timestamp_seconds)}
                        disabled={isSubmitting || !replyText.trim()}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Sticky Comment Composer */}
      <form onSubmit={handleSubmit} className="p-3.5 border-t border-[#E7E2D8] bg-[#FAF9F5] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          
          {/* Active Timestamp Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">At Time:</span>
            <span className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              📍 {formatTimecode(currentTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Draw on Frame Toggle */}
            <button
              type="button"
              onClick={() => setIsDrawMode(!isDrawMode)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                isDrawMode || hasCurrentAnnotation 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                  : 'text-zinc-500 hover:text-zinc-800 bg-white border border-[#E7E2D8]'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>{hasCurrentAnnotation ? 'Drawing Attached' : 'Draw'}</span>
            </button>

            {/* Internal Team Only Toggle (for editors / studio owners) */}
            {currentUserRole !== 'client' && (
              <label className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Internal</span>
              </label>
            )}
          </div>
        </div>

        {/* Comment Input & Submit */}
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-[#E7E2D8] p-1.5 shadow-2xs focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={`Add note at ${formatTimecode(currentTime)}...`}
            className="flex-1 px-3 py-1.5 text-xs text-zinc-800 outline-hidden bg-transparent"
          />

          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}

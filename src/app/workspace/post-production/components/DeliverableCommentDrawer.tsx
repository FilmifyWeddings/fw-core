'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Send, Link2, ExternalLink, 
  Check
} from 'lucide-react';
import { PostProductionDeliverable } from './DeliverableCategorySection';
import { 
  fetchDeliverableComments, 
  addDeliverableComment, 
  PostProductionComment 
} from '@/lib/services/postProductionSyncService';
import { supabase } from '@/lib/supabase';

interface DeliverableCommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deliverable: PostProductionDeliverable | null;
  onUpdateDriveLink?: (deliverableId: string, driveLink: string) => void;
  onCommentCountChange?: (deliverableId: string, count: number) => void;
}

export default function DeliverableCommentDrawer({
  isOpen,
  onClose,
  deliverable,
  onUpdateDriveLink,
  onCommentCountChange,
}: DeliverableCommentDrawerProps) {
  const [comments, setComments] = useState<PostProductionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkSavedToast, setLinkSavedToast] = useState(false);

  useEffect(() => {
    if (deliverable && isOpen) {
      setDriveUrl(deliverable.drive_link || '');
      loadComments(deliverable.id);
    }
  }, [deliverable, isOpen]);

  const loadComments = async (deliverableId: string) => {
    const list = await fetchDeliverableComments(deliverableId);
    setComments(list);
    if (onCommentCountChange) {
      onCommentCountChange(deliverableId, list.length);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !deliverable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Studio Manager';
      const userId = session?.user?.id;

      const created = await addDeliverableComment({
        deliverableId: deliverable.id,
        authorName: userName,
        commentText: newComment.trim(),
        userId,
      });

      if (created) {
        const updated = [...comments, created];
        setComments(updated);
        setNewComment('');
        if (onCommentCountChange) {
          onCommentCountChange(deliverable.id, updated.length);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDriveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverable) return;
    setIsSavingLink(true);
    try {
      onUpdateDriveLink?.(deliverable.id, driveUrl.trim());
      setLinkSavedToast(true);
      setTimeout(() => setLinkSavedToast(false), 2000);
    } finally {
      setIsSavingLink(false);
    }
  };

  if (!isOpen || !deliverable) return null;

  const statusColor = (() => {
    const s = (deliverable.status || '').toLowerCase();
    if (s.includes('done')) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    if (s.includes('review')) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    if (s.includes('progress')) return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
  })();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-md bg-[#FFFDF9] dark:bg-[#181614] border-l border-[#EAE5DA] dark:border-stone-800 h-full shadow-2xl z-10 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#EAE5DA] dark:border-stone-800 flex items-start justify-between bg-gradient-to-r from-amber-50/40 to-transparent dark:from-stone-900">
            <div className="space-y-1.5 pr-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                  {deliverable.segment}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300">
                  {deliverable.category}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                  {deliverable.status || 'Upcoming'}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-stone-100 leading-snug">
                {deliverable.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Drive / Asset Storage Link Section */}
            <div className="bg-[#FAF8F5] dark:bg-stone-900/60 p-3.5 rounded-2xl border border-[#EAE5DA] dark:border-stone-800 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Deliverable Drive / Review Link</span>
                </label>
                {driveUrl && (
                  <a
                    href={driveUrl.startsWith('http') ? driveUrl : `https://${driveUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <form onSubmit={handleSaveDriveLink} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <button
                  type="submit"
                  disabled={isSavingLink}
                  className="px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {linkSavedToast ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </form>
            </div>

            {/* Comments & Activity Stream */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-stone-200">
                    Activity &amp; Revision Log
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-stone-400">
                  {comments.length} {comments.length === 1 ? 'Note' : 'Notes'}
                </span>
              </div>

              {/* List */}
              {comments.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800 space-y-1.5 bg-white/40 dark:bg-stone-900/30">
                  <p className="text-xs font-bold text-slate-600 dark:text-stone-400">
                    No revision notes yet
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-stone-500">
                    Log client feedback, editor handoff notes, or revision cuts here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {comments.map((cm) => (
                    <div
                      key={cm.id}
                      className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#EAE5DA] dark:border-stone-800/80 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-black text-[9px] flex items-center justify-center border border-amber-300/60">
                            {cm.author_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-stone-100">
                            {cm.author_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(cm.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-stone-300 whitespace-pre-wrap pl-7">
                        {cm.comment_text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Comment Input */}
          <div className="p-4 border-t border-[#EAE5DA] dark:border-stone-800 bg-[#FFFDF9] dark:bg-[#181614]">
            <form onSubmit={handleAddComment} className="flex items-end gap-2">
              <textarea
                rows={2}
                placeholder="Type a revision note or update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment(e);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="h-10 px-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs shrink-0"
                title="Send Note"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

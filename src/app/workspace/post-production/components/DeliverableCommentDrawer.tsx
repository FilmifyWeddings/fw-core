'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Send, Link2, ExternalLink, 
  Check, Copy, Trash2, Plus, Globe, Sparkles, Bell, Clock, Calendar, AlertCircle
} from 'lucide-react';
import { 
  PostProductionDeliverable, 
  DeliverableDriveLink, 
  DeliverableCommentItem 
} from './DeliverableCategorySection';
import { supabase } from '@/lib/supabase';
import { addDeliverableComment, fetchDeliverableComments } from '@/lib/services/postProductionSyncService';

interface DeliverableCommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deliverable: PostProductionDeliverable | null;
  initialTab?: 'comments' | 'links';
  onUpdateDriveLink?: (deliverableId: string, driveLink: string) => void;
  onCommentCountChange?: (deliverableId: string, count: number) => void;
  onUpdateDeliverable?: (deliverableId: string, updates: Partial<PostProductionDeliverable>) => void;
}

const PRESET_LINK_LABELS = [
  'Raw Footage',
  'Selection Photos',
  'Final Master Film',
  'Album Soft Proof',
  'Social Reel / Teaser',
  'Color Grade / LUTs',
];

export default function DeliverableCommentDrawer({
  isOpen,
  onClose,
  deliverable,
  initialTab = 'comments',
  onUpdateDriveLink,
  onCommentCountChange,
  onUpdateDeliverable,
}: DeliverableCommentDrawerProps) {
  // Comments Tab First by default or guided by initialTab
  const [activeTab, setActiveTab] = useState<'comments' | 'links'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  
  // Comments state
  const [comments, setComments] = useState<DeliverableCommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Reminder state for new comment
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderAt, setReminderAt] = useState('');

  // Links state
  const [driveLinks, setDriveLinks] = useState<DeliverableDriveLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state with incoming deliverable prop
  useEffect(() => {
    if (deliverable && isOpen) {
      // 1. Initialize Comments (Primary tab)
      if (Array.isArray(deliverable.comments) && deliverable.comments.length > 0) {
        setComments(deliverable.comments);
      } else {
        fetchDeliverableComments(deliverable.id).then(fetched => {
          if (fetched && fetched.length > 0) {
            setComments(fetched);
          } else {
            setComments([]);
          }
        }).catch(() => setComments([]));
      }

      // 2. Initialize Drive Links
      let initialLinks: DeliverableDriveLink[] = [];
      if (Array.isArray(deliverable.drive_links) && deliverable.drive_links.length > 0) {
        initialLinks = deliverable.drive_links;
      } else if (deliverable.drive_link && deliverable.drive_link.trim()) {
        initialLinks = [{
          id: 'dl_' + Date.now(),
          title: 'Primary Drive Folder',
          label: 'Primary Drive Folder',
          url: deliverable.drive_link.trim(),
        }];
      }
      setDriveLinks(initialLinks);
    }
  }, [deliverable, isOpen]);

  // Clean formatted URL
  const formatUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;
  };

  // Quick preset dates for reminder
  const setQuickReminder = (type: 'tomorrow_morning' | 'in_2_days' | 'in_3_days') => {
    const now = new Date();
    if (type === 'tomorrow_morning') {
      now.setDate(now.getDate() + 1);
      now.setHours(10, 0, 0, 0);
    } else if (type === 'in_2_days') {
      now.setDate(now.getDate() + 2);
      now.setHours(10, 0, 0, 0);
    } else if (type === 'in_3_days') {
      now.setDate(now.getDate() + 3);
      now.setHours(10, 0, 0, 0);
    }

    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setReminderAt(isoLocal);
  };

  // ─────────────────────────────────────────────────────────────
  // COMMENTS & REVISION NOTES HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !deliverable || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userName = session?.user?.user_metadata?.full_name || 
                       session?.user?.email?.split('@')[0] || 
                       'Studio Lead';
      const userId = session?.user?.id;
      const recipientName = deliverable.assigned_to || 'Assigned Editor & Studio Lead';

      const commentItem: DeliverableCommentItem = {
        id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        author_name: userName,
        comment_text: newComment.trim(),
        created_at: new Date().toISOString(),
        user_id: userId,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : undefined,
        reminder_for: reminderAt ? recipientName : undefined,
      };

      const updatedComments = [...comments, commentItem];
      setComments(updatedComments);
      setNewComment('');
      setReminderAt('');
      setShowReminderPicker(false);

      // 1. Direct persist in deliverable JSON in post_production_projects
      if (onUpdateDeliverable) {
        onUpdateDeliverable(deliverable.id, {
          comments: updatedComments,
          comments_count: updatedComments.length,
        });
      }

      if (onCommentCountChange) {
        onCommentCountChange(deliverable.id, updatedComments.length);
      }

      // 2. Schedule in post_production_reminders and post_production_comments if tables exist
      if (reminderAt) {
        try {
          await supabase.from('post_production_reminders').insert([{
            deliverable_id: deliverable.id,
            project_id: deliverable.project_id || undefined,
            recipient_id: deliverable.assigned_member_id || undefined,
            recipient_name: recipientName,
            title: `Reminder for ${deliverable.title}: ${commentItem.comment_text.slice(0, 80)}`,
            reminder_at: new Date(reminderAt).toISOString(),
            status: 'pending',
          }]);
        } catch (_) {}

        // Emit browser event for in-app alert feeds
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studio_reminder_created', {
            detail: {
              title: `Reminder: ${deliverable.title}`,
              reminder_at: reminderAt,
              recipient: recipientName,
              deliverable_id: deliverable.id,
            }
          }));
        }
      }

      // 3. Background persist via sync service
      addDeliverableComment({
        deliverableId: deliverable.id,
        authorName: userName,
        commentText: commentItem.comment_text,
        userId,
      }).catch(() => {});
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!deliverable) return;
    const updatedComments = comments.filter(c => c.id !== commentId);
    setComments(updatedComments);

    if (onUpdateDeliverable) {
      onUpdateDeliverable(deliverable.id, {
        comments: updatedComments,
        comments_count: updatedComments.length,
      });
    }

    if (onCommentCountChange) {
      onCommentCountChange(deliverable.id, updatedComments.length);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RESOURCE & DRIVE LINKS HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deliverable || !newLinkUrl.trim()) return;

    const formatted = formatUrl(newLinkUrl);
    const label = newLinkLabel.trim() || 'Resource Link';

    const newEntry: DeliverableDriveLink = {
      id: 'link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: label,
      label,
      url: formatted,
    };

    const updatedLinks = [...driveLinks, newEntry];
    setDriveLinks(updatedLinks);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setIsAddingLink(false);

    const primaryUrl = updatedLinks[0]?.url || '';

    if (onUpdateDeliverable) {
      onUpdateDeliverable(deliverable.id, {
        drive_links: updatedLinks,
        drive_link: primaryUrl,
      });
    } else if (onUpdateDriveLink) {
      onUpdateDriveLink(deliverable.id, primaryUrl);
    }
  };

  const handleDeleteLink = (linkId: string) => {
    if (!deliverable) return;
    const updatedLinks = driveLinks.filter(l => l.id !== linkId);
    setDriveLinks(updatedLinks);

    const primaryUrl = updatedLinks[0]?.url || '';

    if (onUpdateDeliverable) {
      onUpdateDeliverable(deliverable.id, {
        drive_links: updatedLinks,
        drive_link: primaryUrl,
      });
    } else if (onUpdateDriveLink) {
      onUpdateDriveLink(deliverable.id, primaryUrl);
    }
  };

  const handleCopyLink = (linkId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
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

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="relative w-full max-w-lg bg-[#FFFDF9] dark:bg-[#181614] border-l border-[#EAE5DA] dark:border-stone-800 h-full shadow-2xl z-10 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#EAE5DA] dark:border-stone-800 bg-gradient-to-r from-amber-50/50 via-white to-transparent dark:from-stone-900 dark:via-stone-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                    {deliverable.segment}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700">
                    {deliverable.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                    {deliverable.status || 'Upcoming'}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-stone-100 leading-snug">
                  {deliverable.title}
                </h3>
                {deliverable.assigned_to && (
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <span>Assigned Editor:</span>
                    <span className="underline">{deliverable.assigned_to}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 rounded-xl hover:bg-slate-100 dark:hover:bg-stone-800 transition cursor-pointer shrink-0 border border-transparent hover:border-[#EAE5DA] dark:hover:border-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Switcher (Comments FIRST, Links SECOND) */}
            <div className="flex items-center p-1 mt-4 bg-[#F4EFEA] dark:bg-stone-900/90 rounded-xl border border-[#E8E2D8] dark:border-stone-800">
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'comments'
                    ? 'bg-white dark:bg-stone-800 text-slate-900 dark:text-stone-100 shadow-xs border border-[#EAE5DA] dark:border-stone-700'
                    : 'text-slate-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-stone-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Revision Notes</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'comments' 
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' 
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {comments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'links'
                    ? 'bg-white dark:bg-stone-800 text-slate-900 dark:text-stone-100 shadow-xs border border-[#EAE5DA] dark:border-stone-700'
                    : 'text-slate-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-stone-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Resource Links</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'links' 
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300' 
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {driveLinks.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* ═══════════════════════════════════════════════════════════════
                TAB 1: REVISION NOTES & ACTIVITY LOG (WITH REMINDERS)
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    Deliverable Revisions &amp; Reminders
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-stone-400 mt-0.5">
                    Logged client change requests, editor notes, and scheduled alert reminders.
                  </p>
                </div>

                {/* List of Comments */}
                {comments.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800 space-y-1.5 bg-white/40 dark:bg-stone-900/30">
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-stone-400">
                      No revision notes or reminders yet
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-stone-500 max-w-xs mx-auto">
                      Log client review comments, timestamped instructions, or schedule a reminder for your editor below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {comments.map((cm) => (
                      <div
                        key={cm.id}
                        className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#EAE5DA] dark:border-stone-800/80 shadow-2xs space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center border border-amber-300/60">
                              {(cm.author_name || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-stone-100 block">
                                {cm.author_name || 'Team Member'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(cm.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cm.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Comment Text */}
                        <p className="text-xs text-slate-700 dark:text-stone-300 whitespace-pre-wrap pl-8 leading-relaxed">
                          {cm.comment_text}
                        </p>

                        {/* Scheduled Reminder Badge (if set) */}
                        {cm.reminder_at && (
                          <div className="ml-8 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800 text-[10px] font-black text-amber-900 dark:text-amber-200">
                            <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>
                              Reminder Scheduled: {new Date(cm.reminder_at).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {cm.reminder_for && (
                              <span className="text-amber-700 dark:text-amber-400 font-bold ml-1">
                                • For: {cm.reminder_for}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB 2: RESOURCE / DRIVE LINKS
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'links' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-600" />
                      Attached Drive &amp; Review Links
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-stone-400 mt-0.5">
                      Add multiple links for raw footage, selection galleries, album proofs, or final videos.
                    </p>
                  </div>
                  {!isAddingLink && (
                    <button
                      type="button"
                      onClick={() => setIsAddingLink(true)}
                      className="px-2.5 py-1 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Link</span>
                    </button>
                  )}
                </div>

                {/* Add Link Form */}
                {isAddingLink && (
                  <form
                    onSubmit={handleAddLink}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-stone-900 border border-sky-300 dark:border-sky-800/80 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        Attach New Resource Link
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingLink(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Quick Preset Labels */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Quick Label Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_LINK_LABELS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setNewLinkLabel(preset)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              newLinkLabel === preset
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-white dark:bg-stone-800 text-slate-600 dark:text-stone-300 border-[#EAE5DA] dark:border-stone-700 hover:border-sky-400'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Label Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300">
                        Link Label / Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Raw Footage Drive, Final 4K Master"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>

                    {/* URL Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-stone-300">
                        URL / Link <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://drive.google.com/... or https://wetransfer.com/..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-[#EAE5DA] dark:border-stone-700 rounded-xl text-slate-900 dark:text-stone-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingLink(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-stone-400 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newLinkUrl.trim()}
                        className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Save Link
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Links */}
                {driveLinks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[#EAE5DA] dark:border-stone-800 space-y-2 bg-white/40 dark:bg-stone-900/30">
                    <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mx-auto border border-sky-200 dark:border-sky-800">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-stone-300">
                      No resource links added yet
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-stone-500 max-w-xs mx-auto">
                      Attach Google Drive folders, WeTransfer drops, or final video review links for your team and clients.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddingLink(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Link</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {driveLinks.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-[#EAE5DA] dark:border-stone-800 shadow-2xs hover:shadow-xs transition group flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-stone-100 truncate">
                              {item.label || 'Resource Link'}
                            </span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-stone-500 truncate font-mono">
                            {item.url}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-[#FAF8F5] dark:bg-stone-800 text-slate-600 dark:text-stone-300 hover:text-sky-600 hover:border-sky-300 transition cursor-pointer"
                            title="Open Link in New Tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.id, item.url)}
                            className="p-1.5 rounded-lg border border-[#EAE5DA] dark:border-stone-700 bg-[#FAF8F5] dark:bg-stone-800 text-slate-600 dark:text-stone-300 hover:text-sky-600 hover:border-sky-300 transition cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLink(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Remove link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Only shown for Comments Tab */}
          {activeTab === 'comments' && (
            <div className="p-4 border-t border-[#EAE5DA] dark:border-stone-800 bg-[#FFFDF9] dark:bg-[#181614] space-y-2.5">
              {/* Reminder Scheduling Popover */}
              <AnimatePresence>
                {showReminderPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="p-3 rounded-xl bg-amber-50/80 dark:bg-stone-900 border border-amber-300/80 dark:border-amber-800/80 space-y-2 text-xs shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Set Alert Notification Date &amp; Time:
                      </span>
                      {reminderAt && (
                        <button
                          type="button"
                          onClick={() => setReminderAt('')}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Clear Reminder
                        </button>
                      )}
                    </div>

                    {/* Quick Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setQuickReminder('tomorrow_morning')}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-[10px] font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                      >
                        Tomorrow 10 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickReminder('in_2_days')}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-[10px] font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                      >
                        In 2 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickReminder('in_3_days')}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-[10px] font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                      >
                        In 3 Days
                      </button>
                    </div>

                    {/* Datetime Picker Input */}
                    <input
                      type="datetime-local"
                      value={reminderAt}
                      onChange={(e) => setReminderAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    {deliverable.assigned_to && (
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                        Alerts editor: <strong>{deliverable.assigned_to}</strong>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Textarea & Actions Form */}
              <form onSubmit={handleAddComment} className="flex items-end gap-1.5">
                <textarea
                  rows={2}
                  placeholder="Type a revision note or client feedback... (Press Enter to post)"
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

                {/* Reminder Clock Icon Button right before Send */}
                <button
                  type="button"
                  onClick={() => setShowReminderPicker(prev => !prev)}
                  title={reminderAt ? `Reminder: ${reminderAt}` : 'Schedule Reminder Alert'}
                  className={`h-10 w-10 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
                    reminderAt
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/30'
                      : showReminderPicker
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300'
                      : 'bg-[#FDFBF7] dark:bg-stone-800 text-slate-500 dark:text-stone-400 border-[#EAE5DA] dark:border-stone-700 hover:text-amber-600 hover:border-amber-400'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="h-10 px-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs shrink-0"
                  title="Send Note"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

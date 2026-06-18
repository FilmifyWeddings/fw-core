'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, Paperclip, Smile, Phone, Video, MoreVertical,
  Check, CheckCheck, Clock, Image, FileText, Users,
  ChevronLeft, X, Mic, MessageSquare, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Chat {
  id: string;
  jid: string;
  display_name: string | null;
  phone_number: string | null;
  is_group: boolean;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  profile_pic_url: string | null;
}

interface Message {
  id: string;
  wa_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_text: string | null;
  media_url: string | null;
  media_type: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  delivered_at: string | null;
  read_at: string | null;
  sent_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatChatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return formatTime(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string | null, jid: string): string {
  if (name) return name.slice(0, 2).toUpperCase();
  return jid.split('@')[0].slice(-2).toUpperCase();
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'queued') return <Clock className="w-3 h-3 text-zinc-500" />;
  if (status === 'sent') return <Check className="w-3 h-3 text-zinc-400" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-zinc-400" />;
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-sky-400" />;
  if (status === 'failed') return <X className="w-3 h-3 text-red-400" />;
  return null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ chat, size = 'md' }: { chat: Chat; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' };
  const colors = [
    'from-emerald-500 to-green-600',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-teal-600',
  ];
  const colorIdx = chat.jid.charCodeAt(0) % colors.length;

  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg`}>
      {chat.is_group ? (
        <Users className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
      ) : (
        getInitials(chat.display_name, chat.jid)
      )}
    </div>
  );
}

// ─── Chat List Item ───────────────────────────────────────────────────────────
function ChatItem({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(39,39,42,0.6)' }}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left relative ${
        active ? 'bg-zinc-800/80 border-l-2 border-emerald-500' : 'border-l-2 border-transparent hover:bg-zinc-800/40'
      }`}
    >
      <Avatar chat={chat} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white truncate max-w-[130px]">
            {chat.display_name ?? chat.jid.split('@')[0]}
          </span>
          <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-1">
            {formatChatTime(chat.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">
            {chat.last_message ?? 'No messages yet'}
          </p>
          {chat.unread_count > 0 && (
            <span className="flex-shrink-0 ml-1 w-5 h-5 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
              {chat.unread_count > 9 ? '9+' : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'outbound';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div
        className={`max-w-[70%] px-3 py-2 rounded-2xl shadow-md relative ${
          isOut
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-br-sm'
            : 'bg-zinc-800 text-white rounded-bl-sm'
        }`}
      >
        {/* Media preview */}
        {msg.media_url && msg.media_type === 'image' && (
          <img
            src={msg.media_url}
            alt="media"
            className="rounded-xl mb-1 max-w-full"
          />
        )}
        {msg.media_url && msg.media_type !== 'image' && (
          <div className="flex items-center gap-2 mb-1 p-2 bg-black/20 rounded-xl">
            <FileText className="w-4 h-4 text-zinc-300" />
            <span className="text-xs text-zinc-300 truncate">
              {msg.media_url.split('/').pop()}
            </span>
          </div>
        )}

        {/* Message text */}
        {msg.message_text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.message_text}
          </p>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOut ? 'text-emerald-200/70' : 'text-zinc-600'}`}>
            {formatTime(msg.sent_at)}
          </span>
          {isOut && <StatusIcon status={msg.status} />}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Media Upload Modal ───────────────────────────────────────────────────────
function MediaUploadModal({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (url: string, mimeType: string, caption: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const MAX_MB = 16;

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_MB}MB allowed.`);
      return;
    }
    setUploading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/integrations/baileys/upload-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      onUpload(data.url, data.mimeType, caption);
      onClose();
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Attach Media</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <label className="block border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-colors">
          <input
            type="file"
            className="hidden"
            accept="image/*,video/mp4,audio/*,application/pdf,.docx,.xlsx"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="space-y-1">
              <Image className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-white font-medium truncate">{file.name}</p>
              <p className="text-[10px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Paperclip className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-500">Click to select file (max 16MB)</p>
            </div>
          )}
        </label>

        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading...' : 'Send Media'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main WhatsApp Web Clone ──────────────────────────────────────────────────
interface BaileysWhatsappWebProps {
  workspaceId: string;
}

export function BaileysWhatsappWeb({ workspaceId }: BaileysWhatsappWebProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // ── Load Chats ────────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const params = new URLSearchParams({ limit: '50' });
    if (searchQuery) params.set('search', searchQuery);

    const res = await fetch(`/api/integrations/baileys/chats?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats ?? []);
    setLoadingChats(false);
  }, [searchQuery]);

  // ── Load Messages for selected chat ──────────────────────────────────────
  const loadMessages = useCallback(async (jid: string) => {
    const token = await getToken();
    if (!token) return;

    const res = await fetch(`/api/integrations/baileys/messages?jid=${encodeURIComponent(jid)}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, []);

  // ── Send Message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!selectedChat || !inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic UI
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      wa_message_id: null,
      direction: 'outbound',
      message_text: text,
      media_url: null,
      media_type: null,
      status: 'queued',
      delivered_at: null,
      read_at: null,
      sent_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const token = await getToken();
      await fetch('/api/integrations/baileys/send-message', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedChat.jid,
          type: 'text',
          text,
        }),
      });
    } finally {
      setSending(false);
      // Reload messages to get real status
      setTimeout(() => loadMessages(selectedChat.jid), 2000);
    }
  };

  const handleMediaSend = async (mediaUrl: string, mimeType: string, caption: string) => {
    if (!selectedChat) return;
    const token = await getToken();
    await fetch('/api/integrations/baileys/send-message', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: selectedChat.jid,
        type: 'media',
        mediaUrl,
        mimeType,
        caption,
      }),
    });
    setTimeout(() => loadMessages(selectedChat.jid), 2000);
  };

  // ── Handle Enter Key ──────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Poll messages every 5s when chat selected ─────────────────────────────
  useEffect(() => {
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    if (selectedChat) {
      setLoadingMessages(true);
      loadMessages(selectedChat.jid).finally(() => setLoadingMessages(false));
      msgPollRef.current = setInterval(() => loadMessages(selectedChat.jid), 5000);
    }
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, [selectedChat, loadMessages]);

  // ── Load chats on mount + search change ──────────────────────────────────
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] max-h-[800px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#111b21]">

      {/* ── LEFT: Chat List Sidebar ── */}
      <div className={`${selectedChat && isMobileView ? 'hidden' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-zinc-800/80 bg-[#111b21]`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">WhatsApp Gateway</h3>
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Live
              </p>
            </div>
          </div>
          <button onClick={loadChats} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="flex items-center gap-2 bg-[#202c33] rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none"
            />
          </div>
        </div>

        {/* Chat Items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {loadingChats ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <MessageSquare className="w-10 h-10 text-zinc-700" />
              <p className="text-xs text-zinc-600">No chats yet. Connect WhatsApp to sync your contacts.</p>
            </div>
          ) : (
            chats.map(chat => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={selectedChat?.id === chat.id}
                onClick={() => {
                  setSelectedChat(chat);
                  setIsMobileView(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Window ── */}
      <div className={`${!selectedChat && isMobileView ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#0b141a]`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-zinc-800/50">
              <button
                onClick={() => { setSelectedChat(null); setIsMobileView(false); }}
                className="md:hidden p-1 text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Avatar chat={selectedChat} size="md" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">
                  {selectedChat.display_name ?? selectedChat.jid.split('@')[0]}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {selectedChat.is_group ? 'Group' : selectedChat.phone_number ?? selectedChat.jid.split('@')[0]}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages Area ── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1' fill='rgba(255,255,255,0.02)'/%3E%3C/svg%3E")`,
              }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <MessageSquare className="w-10 h-10 text-zinc-700" />
                  <p className="text-xs text-zinc-600">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Message Input ── */}
            <div className="px-3 py-3 bg-[#202c33] border-t border-zinc-800/50">
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowMediaModal(true)}
                  className="p-2.5 text-zinc-500 hover:text-emerald-400 rounded-xl hover:bg-zinc-700/50 transition-colors flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2.5 text-zinc-500 hover:text-emerald-400 rounded-xl hover:bg-zinc-700/50 transition-colors flex-shrink-0">
                  <Smile className="w-4 h-4" />
                </button>

                <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2.5 flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none resize-none max-h-28 scrollbar-none"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                </div>

                <motion.button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 text-black animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-black" />
                  )}
                </motion.button>
              </div>
              <p className="text-[9px] text-zinc-700 mt-1.5 ml-2">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-emerald-500/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">WhatsApp Live Chat</h3>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Left sidebar se koi bhi contact select karo aur real-time messaging shuru karo.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['End-to-End Encrypted', 'Blue Tick Tracking', 'Media Support'].map(f => (
                <span key={f} className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Media Upload Modal */}
      <AnimatePresence>
        {showMediaModal && (
          <MediaUploadModal
            onClose={() => setShowMediaModal(false)}
            onUpload={handleMediaSend}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

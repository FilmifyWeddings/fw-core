'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Paperclip, Smile, MoreVertical, Phone, Video, 
  Check, CheckCheck, Clock, Image as ImageIcon, FileText, Music, 
  User, Users, ExternalLink, ArrowLeft, RefreshCw, Sparkles, Zap,
  ChevronRight, ShieldCheck, Download, Plus, X, MessageSquare, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WhatsAppBetaConnectModal } from '@/components/integrations/whatsapp-beta-connect-modal';

interface ChatThread {
  jid: string;
  name: string;
  push_name?: string;
  phone: string;
  profile_pic_url?: string | null;
  unread_count: number;
  last_message?: any;
  last_message_time?: string;
  is_group?: boolean;
  is_lead?: boolean;
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (isNaN(date.getTime())) return 'Recent';
  
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSidebarTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  if (isNaN(date.getTime())) return '';
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getInitials(name: string): string {
  if (!name || name.startsWith('+') || name === 'WhatsApp Contact' || name === 'WhatsApp Group') return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBg(name: string): string {
  const gradients = [
    'from-emerald-600 to-teal-800',
    'from-teal-600 to-cyan-800',
    'from-blue-600 to-indigo-800',
    'from-violet-600 to-purple-800',
    'from-amber-600 to-orange-800',
    'from-rose-600 to-pink-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

interface MessageItem {
  id?: string;
  message_id: string;
  workspace_id: string;
  remote_jid: string;
  from_me: boolean;
  message_type: string;
  content: string;
  media_url?: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
  raw_payload?: any;
}

const QUICK_EMOJIS = ['👍', '❤️', '🙏', '😂', '🔥', '📸', '💍', '🥂', '🎉', '✨'];

export default function WhatsAppWebBetaInbox() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatStarting, setNewChatStarting] = useState(false);
  const [profileName, setProfileName] = useState('My WhatsApp');
  const [phoneNumber, setPhoneNumber] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 1. Initial Load: Workspace & Connection Status
  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let wsId = session?.user?.id;

        if (!wsId) {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (ws?.id) wsId = ws.id;
        }

        if (wsId) {
          setWorkspaceId(wsId);
          await checkConnection(wsId);
          await loadChats(wsId);
        }
      } catch (err) {
        console.error('[Chat Init Error]:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Real-time Subscription to messages and chats
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`evolution_chat_${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evolution_messages',
        },
        (payload: any) => {
          const newOrUpdatedMsg = payload.new as MessageItem;
          if (!newOrUpdatedMsg) return;

          if (selectedChat && (newOrUpdatedMsg.remote_jid === selectedChat.jid || selectedChat.jid.includes(newOrUpdatedMsg.remote_jid.replace(/[^0-9]/g, '')))) {
            setMessages(prev => {
              const existingIdx = prev.findIndex(m => m.message_id === newOrUpdatedMsg.message_id);
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = newOrUpdatedMsg;
                return copy;
              }
              return [...prev, newOrUpdatedMsg];
            });
            scrollToBottom();
          }

          loadChats(workspaceId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'baileys_chats',
        },
        () => {
          loadChats(workspaceId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'baileys_messages',
        },
        () => {
          if (selectedChat) {
            selectChat(selectedChat);
          }
          loadChats(workspaceId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, selectedChat]);

  // 3. Live 3.5s background polling interval for instant no-refresh syncing
  useEffect(() => {
    if (!workspaceId) return;

    const timer = setInterval(() => {
      loadChats(workspaceId);
      if (selectedChat) {
        fetch(`/api/whatsapp-beta/messages?workspace_id=${workspaceId}&remote_jid=${encodeURIComponent(selectedChat.jid)}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && Array.isArray(data.messages)) {
              setMessages(prev => {
                if (data.messages.length !== prev.length || (data.messages[data.messages.length - 1]?.message_id !== prev[prev.length - 1]?.message_id)) {
                  scrollToBottom();
                  return data.messages;
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [workspaceId, selectedChat?.jid]);

  // 4. Scroll helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const checkConnection = async (wsId: string) => {
    try {
      const res = await fetch(`/api/whatsapp-beta/instance?workspace_id=${wsId}`);
      const data = await res.json();
      if (data.success) {
        setConnectionStatus(data.connection_status || 'DISCONNECTED');
        if (data.phone_number) setPhoneNumber(data.phone_number);
        if (data.profile_name) setProfileName(data.profile_name);
      }
    } catch (_) {}
  };

  const loadChats = async (wsId: string, search?: string) => {
    try {
      const url = `/api/whatsapp-beta/chats?workspace_id=${wsId}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.chats)) {
        setChats(data.chats);
        // Auto select first chat if none selected and on desktop
        if (!selectedChat && data.chats.length > 0 && typeof window !== 'undefined' && window.innerWidth > 768) {
          selectChat(data.chats[0]);
        }
      }
    } catch (err) {
      console.error('[Load Chats Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (chat: ChatThread) => {
    setSelectedChat(chat);
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/whatsapp-beta/messages?workspace_id=${workspaceId}&remote_jid=${encodeURIComponent(chat.jid)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error('[Load Messages Error]:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedChat || !workspaceId || sending) return;

    setSending(true);
    setInputText('');
    setShowEmojiPicker(false);

    // Optimistic UI push
    const optimisticMsg: MessageItem = {
      message_id: 'opt_' + Date.now(),
      workspace_id: workspaceId,
      remote_jid: selectedChat.jid,
      from_me: true,
      message_type: 'text',
      content: textToSend.trim(),
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const targetRecipient = selectedChat.phone || selectedChat.jid;
      const res = await fetch('/api/whatsapp-beta/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          recipient: targetRecipient,
          content: textToSend.trim(),
          message_type: 'text',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => 
          m.message_id === optimisticMsg.message_id ? { ...m, message_id: data.message_id, status: 'SENT' } : m
        ));
      }
    } catch (err) {
      console.error('[Send Message Error]:', err);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Start new chat
  const handleStartNewChat = () => {
    if (!newChatPhone.trim()) return;
    const cleanDigits = newChatPhone.replace(/[^0-9]/g, '');
    const newJid = `${cleanDigits}@s.whatsapp.net`;

    const newThread: ChatThread = {
      jid: newJid,
      name: newChatName.trim() || `+${cleanDigits}`,
      phone: cleanDigits,
      unread_count: 0,
      last_message_time: new Date().toISOString(),
    };

    setChats(prev => [newThread, ...prev.filter(c => c.jid !== newJid)]);
    setSelectedChat(newThread);
    setMessages([]);
    setNewChatModalOpen(false);
    setNewChatPhone('');
    setNewChatName('');
  };

  const isConnected = connectionStatus === 'CONNECTED';

  return (
    <div className="h-screen w-full flex flex-col bg-[#111b21] text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* Top Banner if disconnected */}
      {!isConnected && (
        <div className="bg-amber-600/90 text-white px-4 py-2 text-xs flex items-center justify-between z-20 shadow-md">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp Web (Beta) session is disconnected. Connect to enable live 2-way sync.</span>
          </div>
          <button 
            onClick={() => setConnectModalOpen(true)}
            className="px-3 py-1 bg-white text-zinc-900 font-bold rounded-lg text-xs hover:bg-zinc-100 shadow transition-all"
          >
            Connect QR Code
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: CHATS LIST ────────────────────────────────────────── */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-[#111b21] border-r border-[#222d34] flex flex-col shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header */}
          <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">Live Web Inbox</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    BETA
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isConnected ? (phoneNumber ? `+${phoneNumber} • Live` : 'Connected (● Live)') : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setNewChatModalOpen(true)}
                title="Start New Chat"
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#374248] transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setConnectModalOpen(true)}
                title="Evolution Settings"
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#374248] transition-all"
              >
                <Zap className="w-5 h-5 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2.5 bg-[#111b21] border-b border-[#222d34]">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (workspaceId) loadChats(workspaceId, e.target.value);
                }}
                className="w-full pl-9 pr-4 py-1.5 bg-[#202c33] text-xs text-white placeholder-zinc-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Chat List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/60 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="py-20 px-6 text-center text-zinc-400 space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto text-zinc-600" />
                <p className="text-xs font-medium">No synced chats found yet.</p>
                <button 
                  onClick={() => setNewChatModalOpen(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow transition-all"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              chats.map(chat => {
                const isSelected = selectedChat?.jid === chat.jid;
                const lastMsg = chat.last_message;
                const timeStr = formatSidebarTime(lastMsg?.timestamp || chat.last_message_time);
                const isMediaMsg = lastMsg?.content === '[media]' || lastMsg?.content === '[image]' || lastMsg?.message_type === 'image';

                return (
                  <div
                    key={chat.jid}
                    onClick={() => selectChat(chat)}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-b border-[#222d34]/40 ${
                      isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`relative w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden shadow-sm ${
                      chat.is_group 
                        ? 'bg-teal-600/20 border border-teal-500/30 text-teal-400' 
                        : (getInitials(chat.name) ? `bg-gradient-to-tr ${getAvatarBg(chat.name)} text-white font-bold text-sm shadow` : 'bg-[#374248] text-zinc-400')
                    }`}>
                      {chat.profile_pic_url ? (
                        <img src={chat.profile_pic_url} alt={chat.name} className="w-full h-full object-cover" />
                      ) : chat.is_group ? (
                        <Users className="w-6 h-6" />
                      ) : getInitials(chat.name) ? (
                        <span>{getInitials(chat.name)}</span>
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                          {chat.name}
                          {chat.is_lead && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                              LEAD
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-medium ml-2">
                          {timeStr}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                          {lastMsg?.from_me && (
                            <CheckCheck className={`w-3.5 h-3.5 shrink-0 ${lastMsg.status === 'READ' ? 'text-sky-400' : 'text-zinc-400'}`} />
                          )}
                          {isMediaMsg ? (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Photo
                            </span>
                          ) : (
                            <span>{lastMsg?.content || (lastMsg?.message_type ? `[${lastMsg.message_type}]` : 'Tap to chat')}</span>
                          )}
                        </p>

                        {chat.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#00a884] text-black font-bold text-[10px] flex items-center justify-center shrink-0">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: CONVERSATION VIEW ───────────────────────────────── */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col bg-[#0b141a] relative overflow-hidden">
            
            {/* WhatsApp Web Classic Doodle Background Overlay */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Conversation Header */}
            <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34] z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden text-zinc-400 hover:text-white mr-1 shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden shadow-sm ${
                  selectedChat.is_group 
                    ? 'bg-teal-600/20 border border-teal-500/30 text-teal-400' 
                    : (getInitials(selectedChat.name) ? `bg-gradient-to-tr ${getAvatarBg(selectedChat.name)} text-white font-bold text-xs shadow` : 'bg-[#374248] text-zinc-400')
                }`}>
                  {selectedChat.profile_pic_url ? (
                    <img src={selectedChat.profile_pic_url} alt={selectedChat.name} className="w-full h-full object-cover" />
                  ) : selectedChat.is_group ? (
                    <Users className="w-5 h-5" />
                  ) : getInitials(selectedChat.name) ? (
                    <span>{getInitials(selectedChat.name)}</span>
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-md">
                    {selectedChat.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {selectedChat.is_group 
                      ? 'WhatsApp Group • Live Web Sync Active' 
                      : (selectedChat.phone ? `+${selectedChat.phone}` : 'WhatsApp Contact')}
                  </p>
                </div>
              </div>

              {/* CRM Quick Links */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedChat.phone && (
                  <Link
                    href={`/workspace/clients?search=${selectedChat.phone}`}
                    target="_blank"
                    className="px-2.5 py-1 bg-[#111b21] hover:bg-[#2a3942] border border-[#222d34] text-xs font-semibold rounded-lg text-emerald-400 flex items-center gap-1 transition-all"
                    title="Open Client Profile"
                  >
                    Client Card <ExternalLink className="w-3 h-3" />
                  </Link>
                )}

                <Link
                  href={`/workspace/quotations?client=${encodeURIComponent(selectedChat.name)}`}
                  target="_blank"
                  className="px-2.5 py-1 bg-[#111b21] hover:bg-[#2a3942] border border-[#222d34] text-xs font-semibold rounded-lg text-amber-400 flex items-center gap-1 transition-all"
                  title="Create Quotation"
                >
                  Quote <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar z-10">
              {messagesLoading ? (
                <div className="py-20 flex justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 space-y-2">
                  <p className="text-xs">No message history yet.</p>
                  <p className="text-[11px] text-zinc-600">Send a message below to start chatting!</p>
                </div>
              ) : (
                (() => {
                  let lastDateDivider = '';
                  return messages.map((msg, idx) => {
                    const isOut = msg.from_me;
                    const dateStr = msg.timestamp ? new Date(msg.timestamp).toDateString() : '';
                    const showDateDivider = dateStr && dateStr !== lastDateDivider;
                    if (showDateDivider) lastDateDivider = dateStr;

                    const time = msg.timestamp 
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : '';
                    const isMediaPlaceholder = msg.content === '[media]' || msg.content === '[image]' || (msg.message_type === 'image' && !msg.media_url);

                    return (
                      <React.Fragment key={msg.message_id || idx}>
                        {showDateDivider && (
                          <div className="flex justify-center my-3 sticky top-2 z-10">
                            <span className="bg-[#182229]/95 backdrop-blur-sm border border-[#222d34] text-zinc-400 text-[10.5px] font-semibold px-3 py-1 rounded-lg shadow-sm">
                              {formatDateDivider(msg.timestamp)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm relative group ${
                            isOut ? 'bg-[#005c4b] text-white rounded-tr-none border border-emerald-500/10' : 'bg-[#202c33] text-zinc-100 rounded-tl-none border border-white/5'
                          }`}>
                            
                            {/* Media rendering if available */}
                            {msg.media_url ? (
                              <div className="mb-1.5 rounded-xl overflow-hidden max-w-sm">
                                {msg.message_type === 'image' ? (
                                  <img 
                                    src={msg.media_url} 
                                    alt="Attachment" 
                                    className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => window.open(msg.media_url || '', '_blank')}
                                  />
                                ) : msg.message_type === 'audio' ? (
                                  <audio controls src={msg.media_url} className="w-full my-1" />
                                ) : (
                                  <a 
                                    href={msg.media_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-2 p-2 bg-black/20 rounded-lg text-xs hover:underline"
                                  >
                                    <FileText className="w-4 h-4" /> View Document
                                  </a>
                                )}
                              </div>
                            ) : isMediaPlaceholder ? (
                              <div className="flex items-center gap-2.5 p-2 bg-black/25 rounded-xl my-1 border border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-200">Photo Attachment</p>
                                  <p className="text-[10px] text-zinc-400">Encrypted WhatsApp Media</p>
                                </div>
                              </div>
                            ) : null}

                            {/* Text content */}
                            {msg.content && !isMediaPlaceholder && (
                              <p className="text-xs leading-relaxed whitespace-pre-wrap select-text break-words">
                                {msg.content}
                              </p>
                            )}

                            {/* Message status footer */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-400">
                              <span>{time}</span>
                              {isOut && (
                                msg.status === 'PENDING' ? (
                                  <Clock className="w-3 h-3 text-zinc-400" />
                                ) : msg.status === 'SENT' ? (
                                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                                ) : msg.status === 'DELIVERED' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
                                ) : msg.status === 'READ' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar */}
            {showEmojiPicker && (
              <div className="px-4 py-2 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 overflow-x-auto z-10">
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setInputText(prev => prev + e);
                      textareaRef.current?.focus();
                    }}
                    className="text-lg hover:scale-125 transition-transform p-1"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Input Footer */}
            <div className="min-h-[62px] px-4 py-2.5 bg-[#202c33] border-t border-[#222d34] flex items-end gap-2.5 z-10">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                <Smile className="w-6 h-6" />
              </button>

              <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2 flex items-center min-h-[42px] max-h-32">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type a message"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || sending}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-50 text-black flex items-center justify-center transition-all shrink-0 shadow"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>

          </div>
        ) : (
          /* Empty State (WhatsApp Web style) */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] text-center p-8 border-b-8 border-[#00a884]">
            <div className="w-48 h-48 rounded-full bg-[#111b21] flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="w-24 h-24 text-[#00a884]" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">WhatsApp Web (Beta)</h2>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              Send and receive WhatsApp messages directly from StudioCore CRM without keeping your phone online.
            </p>
            <div className="flex items-center gap-2 mt-8 text-[11px] text-zinc-500 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> End-to-end encrypted session
            </div>
          </div>
        )}

      </div>

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Start New Chat</h3>
              <button onClick={() => setNewChatModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400">Phone Number (with Country Code)</label>
                <input
                  type="text"
                  placeholder="e.g. 919876543210"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#202c33] border border-[#222d34] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400">Contact / Client Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#202c33] border border-[#222d34] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleStartNewChat}
                disabled={!newChatPhone.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow"
              >
                Open Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect QR Modal */}
      {workspaceId && (
        <WhatsAppBetaConnectModal
          isOpen={connectModalOpen}
          onClose={() => { 
            setConnectModalOpen(false); 
            checkConnection(workspaceId); 
            loadChats(workspaceId);
          }}
          workspaceId={workspaceId}
          onConnectionChange={(status) => {
            setConnectionStatus(status);
            checkConnection(workspaceId);
            loadChats(workspaceId);
          }}
        />
      )}

    </div>
  );
}

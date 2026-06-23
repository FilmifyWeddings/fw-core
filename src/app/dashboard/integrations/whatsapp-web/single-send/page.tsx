'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBhamstra } from '@/lib/context/BhamstraContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, RefreshCw, Bold, Italic, Type, Code, Upload,
  AlertCircle, CheckCircle, FileText, Smartphone, Laptop
} from 'lucide-react';

const MOCK_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

interface Template {
  id: string;
  name: string;
  category: string;
  type: string;
  payload?: {
    body?: string;
    mediaUrl?: string;
    mediaMime?: string;
  };
}

export default function WhatsAppSingleSendPage() {
  const { userId } = useBhamstra();
  const tenantId = userId || MOCK_WORKSPACE_ID;

  // Connection and templates lists states
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [deviceState, setDeviceState] = useState<{ conn_state: string; phone_number: string | null }>({
    conn_state: 'disconnected',
    phone_number: null
  });
  const [templates, setTemplates] = useState<Template[]>([]);

  // Form states
  const [activeMode, setActiveMode] = useState<'plain' | 'template'>('plain');
  const [receiver, setReceiver] = useState('');
  
  // Plain text mode states
  const [messageText, setMessageText] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Template message mode states
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [mediaUrlOverride, setMediaUrlOverride] = useState('');
  const [mediaMimeOverride, setMediaMimeOverride] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template variable states — auto-detected from template body
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // UI state
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch device session and templates
  const loadConfigData = async () => {
    setLoadingConfig(true);
    try {
      // 1. Fetch connection details
      const { data: session } = await supabase
        .from('baileys_sessions')
        .select('conn_state, phone_number')
        .eq('workspace_id', tenantId)
        .maybeSingle();

      if (session) {
        setDeviceState({
          conn_state: session.conn_state,
          phone_number: session.phone_number
        });
      }

      // 2. Fetch templates
      const tempRes = await fetch(`/api/templates?workspace_id=${tenantId}`);
      const tempData = await tempRes.json();
      if (tempData.success) {
        setTemplates(tempData.results || []);
      }
    } catch (err) {
      console.error('Error loading config details:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadConfigData();
    }
  }, [tenantId]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Extract template variable placeholders like {{Name}}, {{1}}, {Name}, {1}
  const extractTemplatePlaceholders = (bodyText: string): string[] => {
    const doubleBrace = [...bodyText.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim());
    const singleBrace = [...bodyText.matchAll(/\{([^{}]+)\}/g)].map(m => m[1].trim());
    // Deduplicate preserving order
    const seen = new Set<string>();
    return [...doubleBrace, ...singleBrace].filter(v => { if (seen.has(v)) return false; seen.add(v); return true; });
  };

  const detectedVariables = selectedTemplate?.payload?.body
    ? extractTemplatePlaceholders(selectedTemplate.payload.body)
    : [];

  // When template changes, reset variable values
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    
    // Auto-populate default template media override states if present
    if (tmpl?.payload?.mediaUrl) {
      setMediaUrlOverride(tmpl.payload.mediaUrl);
      setMediaMimeOverride(tmpl.payload.mediaMime || 'image/jpeg');
    } else {
      setMediaUrlOverride('');
      setMediaMimeOverride('');
    }

    if (tmpl?.payload?.body) {
      const keys = extractTemplatePlaceholders(tmpl.payload.body);
      const defaults: Record<string, string> = {};
      keys.forEach(k => { defaults[k] = ''; });
      setTemplateVariables(defaults);
    } else {
      setTemplateVariables({});
    }
  };

  // Get rendered template body with variables substituted
  const getRenderedBody = () => {
    if (!selectedTemplate?.payload?.body) return '';
    let body = selectedTemplate.payload.body;
    for (const [k, v] of Object.entries(templateVariables)) {
      body = body.replaceAll(`{{${k}}}`, v || `{{${k}}}`).replaceAll(`{${k}}`, v || `{${k}}`);
    }
    return body;
  };

  // Format helper for text insertion in Plain Text mode
  const applyTextFormat = (formatSymbol: string) => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (start === undefined || end === undefined) return;

    const selectedText = text.substring(start, end);
    const replacement = formatSymbol === '```' 
      ? `\`\`\`${selectedText}\`\`\`` 
      : `${formatSymbol}${selectedText}${formatSymbol}`;

    setMessageText(text.substring(0, start) + replacement + text.substring(end));
    
    // Reset focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatSymbol.length, end + formatSymbol.length);
    }, 10);
  };

  // Media file upload handler
  const handleMediaUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload media');
      }

      setMediaUrlOverride(data.url);
      setMediaMimeOverride(data.mimeType);
      setSuccessMsg('Media uploaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Media upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Generate payload preview
  const generatePayloadPreview = () => {
    if (activeMode === 'plain') {
      return JSON.stringify({
        to: receiver || '',
        type: 'text',
        mode: 'direct',
        text: messageText || ''
      }, null, 2);
    } else {
      return JSON.stringify({
        to: receiver || '',
        type: 'template',
        mode: 'direct',
        templateId: selectedTemplateId || '',
        templateName: selectedTemplate?.name || '',
        variables: templateVariables,
        ...(mediaUrlOverride ? { mediaUrl: mediaUrlOverride, mimeType: mediaMimeOverride } : {})
      }, null, 2);
    }
  };

  // Submit Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiver.trim()) {
      setErrorMsg('Receiver phone number is required.');
      return;
    }

    if (activeMode === 'plain' && !messageText.trim()) {
      setErrorMsg('Message body cannot be empty.');
      return;
    }

    if (activeMode === 'template' && !selectedTemplateId) {
      setErrorMsg('Please select a template.');
      return;
    }

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Auth session not found.');

      // 1. Optionally save plain text as template
      if (activeMode === 'plain' && saveAsTemplate) {
        const templateName = `Quick Template - ${new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        await fetch(`/api/templates?workspace_id=${tenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            category: 'custom',
            language: 'en_US',
            type: 'text',
            payload: { body: messageText }
          })
        });
      }

      // 2. Prepare message sending request
      let payload: any = {
        to: receiver.trim(),
        mode: 'direct'
      };

      if (activeMode === 'plain') {
        payload.type = 'text';
        payload.text = messageText;
      } else {
        payload.type = 'template';
        payload.templateId = selectedTemplateId;
        payload.variables = templateVariables;
        if (mediaUrlOverride) {
          payload.mediaUrl = mediaUrlOverride;
          
          let mime = mediaMimeOverride;
          if (!mime) {
            // Auto-detect mimetype from override URL extension or default to image/jpeg
            const lowerUrl = mediaUrlOverride.toLowerCase().split('?')[0];
            if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('video')) {
              mime = 'video/mp4';
            } else if (lowerUrl.endsWith('.png')) {
              mime = 'image/png';
            } else if (lowerUrl.endsWith('.webp')) {
              mime = 'image/webp';
            } else if (lowerUrl.endsWith('.gif')) {
              mime = 'image/gif';
            } else if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('pdf')) {
              mime = 'application/pdf';
            } else {
              mime = 'image/jpeg';
            }
          }
          payload.mimeType = mime;
        }
      }

      const sendRes = await fetch('/api/integrations/baileys/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await sendRes.json();
      if (sendRes.ok && data.success) {
        setSuccessMsg('Message sent successfully!');
        if (activeMode === 'plain') {
          setMessageText('');
        }
        setReceiver('');
        loadConfigData();
      } else {
        throw new Error(data.error || 'Failed to dispatch message.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while sending.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full text-zinc-900 dark:text-white flex flex-col font-sans p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Heading Header */}
      <div className="flex-shrink-0 relative select-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 leading-none">Single Send</h2>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">
          Send a direct WhatsApp message from a connected device without opening the inbox.
        </p>
      </div>

      {/* Notifications Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-sm backdrop-blur-md"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 shadow-sm backdrop-blur-md"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Builder Card Container */}
      <div className="border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-zinc-900">
          Send Custom Message
        </h3>

        {/* Tab switch container */}
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => { setActiveMode('plain'); setErrorMsg(''); }}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'plain'
                ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            Plain Text
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('template'); setErrorMsg(''); }}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'template'
                ? 'bg-white dark:bg-zinc-850 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            Template Message
          </button>
        </div>

        {/* Main Form Fields */}
        <form onSubmit={handleSendMessage} className="space-y-6">
          
          {/* Row 1: Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Select Device
              </label>
              <select
                disabled={loadingConfig}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-300 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40 cursor-pointer"
              >
                {loadingConfig ? (
                  <option>Loading Device Status...</option>
                ) : deviceState.conn_state === 'open' ? (
                  <option value="gateway">WhatsApp Web Gateway - Active (+{deviceState.phone_number})</option>
                ) : (
                  <option value="gateway">WhatsApp Web Gateway - Offline / Disconnected</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Message To (Receiver)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 919876543210 (Country code first)"
                value={receiver}
                onChange={e => setReceiver(e.target.value.replace(/[^0-9+]/g, ''))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Conditional Layout Split */}
          {activeMode === 'plain' ? (
            
            /* PLAIN TEXT MODE */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/20 space-y-3">
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Message
                  </span>
                  
                  {/* Text Formatting Toolbar */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 p-1 rounded-lg border border-slate-200 dark:border-zinc-850">
                    <button
                      type="button"
                      onClick={() => applyTextFormat('*')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat('_')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat('~')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded"
                      title="Strikethrough"
                    >
                      <Type className="w-3.5 h-3.5 line-through" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextFormat('```')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded"
                      title="Monospace Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  ref={messageInputRef}
                  placeholder="Write your message here"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-3 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40 resize-none font-sans"
                />

                <span className="text-[10px] text-slate-400 dark:text-zinc-550 block font-mono">
                  WhatsApp formatting: *bold* _italic_ ~strike~ ```mono```
                </span>
              </div>

              {/* Toggle switch template save */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSaveAsTemplate(!saveAsTemplate)}
                  className={`relative w-8.5 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    saveAsTemplate ? 'bg-slate-900 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white dark:bg-black shadow-md transition-transform ${
                    saveAsTemplate ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-xs text-slate-600 dark:text-zinc-400 font-semibold select-none">
                  Save this as a template?
                </span>
              </div>

              {/* Bottom Send Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-900 flex justify-end">
                <button
                  type="submit"
                  disabled={sending || deviceState.conn_state !== 'open'}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white dark:text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102"
                >
                  {sending ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Send Message</>
                  )}
                </button>
              </div>

            </div>

          ) : (
            
            /* TEMPLATE MESSAGE MODE (Layout Split grid) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Form Settings */}
              <div className="space-y-4">
                
                {/* Template Setup Card */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/20 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300">
                    Template Setup
                  </h4>
                  <select
                    value={selectedTemplateId}
                    required
                    onChange={e => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-zinc-300 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40 cursor-pointer"
                  >
                    <option value="">Select Template</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category} - {t.type})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-550 block leading-none">
                    Choose a template to send
                  </span>

                  {/* Dynamic Variable Inputs */}
                  {detectedVariables.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider block">
                        ✦ Template Variables ({detectedVariables.length} found)
                      </span>
                      <div className="space-y-2">
                        {detectedVariables.map(varKey => (
                          <div key={varKey} className="flex items-center gap-2">
                            <span className="shrink-0 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-mono text-amber-600 dark:text-amber-400 min-w-[80px] text-center">
                              {`{{${varKey}}}`}
                            </span>
                            <input
                              type="text"
                              placeholder={`Value for ${varKey}`}
                              value={templateVariables[varKey] || ''}
                              onChange={e => setTemplateVariables(prev => ({ ...prev, [varKey]: e.target.value }))}
                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500/40"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Override (Optional) Card */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/20 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300">
                    Media Override (Optional)
                  </h4>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleMediaUploadClick}
                      className="px-3.5 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {uploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      Upload Media
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <input
                      type="text"
                      placeholder="Media URL Override"
                      value={mediaUrlOverride}
                      onChange={e => setMediaUrlOverride(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40"
                    />

                    <input
                      type="text"
                      placeholder="MIME / Type"
                      value={mediaMimeOverride}
                      onChange={e => setMediaMimeOverride(e.target.value)}
                      className="w-28 px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-655 focus:outline-none focus:border-slate-350 dark:focus:border-emerald-500/40 text-center"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-550 block">
                    If no override is provided, template default media is used automatically.
                  </span>
                </div>

                {/* Left side button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending || deviceState.conn_state !== 'open'}
                    className="w-full px-6 py-2.5 bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white dark:text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Send Message</>
                    )}
                  </button>
                </div>

              </div>

              {/* Right Column: Previews */}
              <div className="space-y-4">
                
                {/* Meta Payload Preview */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/20 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-300">
                    Meta Payload Preview
                  </h4>
                  <pre className="p-3 bg-[#0a0a0c] border border-zinc-850 rounded-xl text-[10px] text-emerald-450 font-mono overflow-x-auto max-h-48 scroller-thin leading-normal select-text">
                    {generatePayloadPreview()}
                  </pre>
                </div>

                {/* Render Template preview layout */}
                <div className="p-5 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/20 min-h-[160px] flex flex-col justify-between">
                  {selectedTemplate ? (
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                          {selectedTemplate.category}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-550 font-mono">
                          {selectedTemplate.type} template
                        </span>
                      </div>
                      
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {selectedTemplate.name}
                      </div>

                      {/* Default Media Preview if exists */}
                      {(selectedTemplate.payload?.mediaUrl || mediaUrlOverride) && (
                        <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-2 bg-white dark:bg-zinc-950 flex items-center gap-2">
                          <img
                            src={mediaUrlOverride || selectedTemplate.payload?.mediaUrl}
                            alt="media-preview"
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase block">Media Attachment</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate block">
                              {mediaUrlOverride || selectedTemplate.payload?.mediaUrl}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 rounded-xl text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                        {getRenderedBody() || 'Empty template body text.'}
                      </div>
                      {detectedVariables.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="text-[9px] text-amber-500 dark:text-amber-400 font-mono">
                            {Object.values(templateVariables).filter(Boolean).length}/{detectedVariables.length} variables filled
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Placeholder */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-zinc-900/60 flex items-center justify-center border border-slate-300/30 dark:border-zinc-800">
                        <FileText className="w-5 h-5 text-slate-400 dark:text-zinc-650" />
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-zinc-400 mt-1">No template selected</div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-550 max-w-xs leading-normal">
                        Pick a template to preview and send it.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </form>
      </div>

    </div>
  );
}

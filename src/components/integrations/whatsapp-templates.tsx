'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, MoreVertical, CheckCircle2, XCircle, Clock, Timer, 
  Trash2, ShieldCheck, FileText, Image as ImageIcon, 
  Vote, HelpCircle, PhoneCall, Link2, X, PlusCircle, Check, RefreshCw,
  Edit, Copy, ChevronDown, Users, Bell, Send, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WhatsappTemplatesProps {
  workspaceId: string;
  shootType?: string; // 'all' | 'wedding' | 'commercial'
}

interface TemplateRow {
  id: string;
  name: string;
  type: 'text' | 'media' | 'list' | 'poll';
  category: string;
  language: string;
  status: 'approved' | 'rejected' | 'pending';
  created_at: string;
  updated_at: string;
  payload: any;
  buttons: any[];
  meta_approval_required: boolean;
}

export function WhatsappTemplates({ workspaceId, shootType = 'all' }: WhatsappTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top-level section toggle
  const [activeSection, setActiveSection] = useState<'templates' | 'group-alerts'>('templates');

  // Group Lead Alerts state
  const [alertGroupId, setAlertGroupId] = useState('');
  const [alertGroupIdManual, setAlertGroupIdManual] = useState('');
  const [alertTemplate, setAlertTemplate] = useState(
    '*🚨 New Lead Alert! 🚨*\n\n' +
    '1. Created Time : *{{created_time}}*\n' +
    '2. Full Name : *{{full_name}}*\n' +
    '3. Kind of Shoot : *{{shoot_type}}*\n' +
    '4. Location : *{{location}}*\n' +
    '5. Max Budget : *{{budget}}*\n' +
    '6. Phone Number : *{{phone}}*'
  );
  const [savedAlertGroupId, setSavedAlertGroupId] = useState('');
  const [savedAlertTemplate, setSavedAlertTemplate] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertTestSending, setAlertTestSending] = useState(false);
  const [syncedGroups, setSyncedGroups] = useState<Array<{ jid: string; display_name: string | null; participant_count?: number }>>([]);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [copiedJid, setCopiedJid] = useState<string | null>(null);

  // Builder form states
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [category, setCategory] = useState<'utility' | 'marketing' | 'authentication'>('utility');
  const [language, setLanguage] = useState('en_US');
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'poll'>('text');
  
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaMime, setMediaMime] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Custom states for Dynamic Fields insert
  const [showShortcodeDropdown, setShowShortcodeDropdown] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTextBody(prev => prev + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    setTextBody(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limits: Images = 50MB, Videos = 50MB, Other documents = 100MB
    let maxLimit = 100 * 1024 * 1024; // Default 100MB
    let typeName = "file";
    if (file.type.startsWith('image/')) {
      maxLimit = 50 * 1024 * 1024; // 50MB
      typeName = "image";
    } else if (file.type.startsWith('video/')) {
      maxLimit = 50 * 1024 * 1024; // 50MB
      typeName = "video";
    }

    if (file.size > maxLimit) {
      const maxLimitMb = maxLimit / (1024 * 1024);
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File size exceeds the limit. Selected ${typeName} is ${fileSizeMb}MB, but the maximum allowed size is ${maxLimitMb}MB.`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${workspaceId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp_templates_media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp_templates_media')
        .getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      setMediaMime(file.type);
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(`File upload failed: ${err.message || err}. You can enter a public URL manually.`);
    } finally {
      setUploading(false);
    }
  };
  
  // Text Body state
  const [textBody, setTextBody] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Poll states
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollOptions, setPollOptions] = useState<Array<{ id: string; text: string }>>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);

  // Actions / Buttons states
  const [buttons, setButtons] = useState<Array<{ id: string; type: 'url' | 'phone'; text: string; value: string }>>([]);
  const [metaApprovalRequired, setMetaApprovalRequired] = useState(false);

  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);

  const handleEditClick = (template: TemplateRow) => {
    setEditTemplateId(template.id);
    setName(template.name);
    setCategory(template.category as any);
    setLanguage(template.language);
    setActiveTab(template.type as 'text' | 'media' | 'poll');
    
    const payload = template.payload || {};
    setTextBody(payload.body || payload.question || '');
    setMediaUrl(payload.mediaUrl || payload.default_send_media_url || '');
    setMediaMime(payload.mediaMime || payload.default_send_media_mime || '');
    setPollQuestion(payload.question || '');
    setPollAllowMultiple(!!payload.allowMultiple || !!payload.multipleAnswers);
    setPollOptions(payload.options || [{ id: '1', text: '' }, { id: '2', text: '' }]);
    
    setButtons(template.buttons || []);
    setMetaApprovalRequired(template.meta_approval_required || false);
    setShowBuilder(true);
  };

  const handleDuplicateClick = (template: TemplateRow) => {
    setEditTemplateId(null);
    setName(`${template.name}_copy`);
    setCategory(template.category as any);
    setLanguage(template.language);
    setActiveTab(template.type as 'text' | 'media' | 'poll');
    
    const payload = template.payload || {};
    setTextBody(payload.body || payload.question || '');
    setMediaUrl(payload.mediaUrl || payload.default_send_media_url || '');
    setMediaMime(payload.mediaMime || payload.default_send_media_mime || '');
    setPollQuestion(payload.question || '');
    setPollAllowMultiple(!!payload.allowMultiple || !!payload.multipleAnswers);
    setPollOptions(payload.options || [{ id: '1', text: '' }, { id: '2', text: '' }]);
    
    setButtons(template.buttons || []);
    setMetaApprovalRequired(template.meta_approval_required || false);
    setShowBuilder(true);
  };

  const handleAddNewClick = () => {
    setEditTemplateId(null);
    setName('');
    setNameError(false);
    setCategory('utility');
    setLanguage('en_US');
    setActiveTab('text');
    setTextBody('');
    setMediaUrl('');
    setMediaMime('');
    setPollQuestion('');
    setPollAllowMultiple(false);
    setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
    setButtons([]);
    setMetaApprovalRequired(false);
    setShowBuilder(true);
  };

  // Load templates
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?workspace_id=${workspaceId}&shoot_type=${shootType}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.results);
      } else {
        setError(data.error || 'Failed to retrieve templates.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error fetching templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadTemplates();
    }
  }, [workspaceId, shootType]);

  // Load synced WhatsApp groups for the group selector
  const loadSyncedGroups = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/integrations/baileys/group-dispatch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.groups) {
        setSyncedGroups(data.groups);
      }
    } catch (err) {
      console.error('Failed to load synced groups:', err);
    }
  };

  useEffect(() => {
    if (activeSection === 'group-alerts' && workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadSyncedGroups();
    }
  }, [activeSection, workspaceId]);

  // Force-fetch all groups from the Baileys socket via worker endpoint
  const handleFetchGroups = async () => {
    setFetchingGroups(true);
    try {
      const WORKER_PORT = '3002';
      const res = await fetch(`http://localhost:${WORKER_PORT}/fetch-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.groups) {
        setSyncedGroups(data.groups);
      } else {
        alert('Failed to fetch groups: ' + (data.error || 'Worker returned error'));
      }
    } catch (err: any) {
      alert('Could not reach Baileys worker: ' + (err.message || 'Network error'));
    } finally {
      setFetchingGroups(false);
    }
  };

  // Copy JID to clipboard
  const handleCopyJid = (jid: string) => {
    navigator.clipboard.writeText(jid);
    setCopiedJid(jid);
    setTimeout(() => setCopiedJid(null), 1500);
  };

  // Save alert configuration to localStorage (and optionally to DB)
  const handleSaveAlertConfig = async () => {
    setAlertSaving(true);
    try {
      const effectiveGroupId = alertGroupId === '__manual__' ? alertGroupIdManual.trim() : alertGroupId;
      if (!effectiveGroupId) {
        alert('Please select or enter a WhatsApp Group JID.');
        setAlertSaving(false);
        return;
      }
      if (!alertTemplate.trim()) {
        alert('Please enter an alert template message.');
        setAlertSaving(false);
        return;
      }

      // Persist to localStorage as workspace-scoped config
      const configKey = `wa_group_alert_config_${workspaceId}`;
      const config = { groupId: effectiveGroupId, template: alertTemplate };
      localStorage.setItem(configKey, JSON.stringify(config));

      setSavedAlertGroupId(effectiveGroupId);
      setSavedAlertTemplate(alertTemplate);
      alert('Group Lead Alert configuration saved successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setAlertSaving(false);
    }
  };

  // Load saved alert config on mount
  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      try {
        const configKey = `wa_group_alert_config_${workspaceId}`;
        const raw = localStorage.getItem(configKey);
        if (raw) {
          const config = JSON.parse(raw);
          if (config.groupId) {
            // Check if it matches a synced group or is a manual entry
            setSavedAlertGroupId(config.groupId);
            setAlertGroupId(config.groupId);
          }
          if (config.template) {
            setSavedAlertTemplate(config.template);
            setAlertTemplate(config.template);
          }
        }
      } catch {}
    }
  }, [workspaceId]);

  // Send a test alert to the configured group
  const handleSendTestAlert = async () => {
    const effectiveGroupId = alertGroupId === '__manual__' ? alertGroupIdManual.trim() : alertGroupId;
    if (!effectiveGroupId) {
      alert('Please select or enter a WhatsApp Group JID first.');
      return;
    }
    if (!alertTemplate.trim()) {
      alert('Please enter a template message first.');
      return;
    }

    setAlertTestSending(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert('Not authenticated. Please refresh and try again.');
        return;
      }

      const mockLeadData = {
        name: 'Riya Sharma',
        phone: '+91 98765 43210',
        email: 'riya@example.com',
        source: 'Facebook Ads',
        shoot_type: 'Wedding',
        location: 'Mumbai, Maharashtra',
        budget: '₹2,50,000',
        created_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      };

      const res = await fetch('/api/integrations/baileys/group-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupJid: effectiveGroupId,
          leadData: mockLeadData,
          templateStr: alertTemplate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Test alert sent successfully to the group!');
      } else {
        alert('Failed to send test alert: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network error: ' + (err.message || 'Failed to send'));
    } finally {
      setAlertTestSending(false);
    }
  };

  // Live preview: replace placeholders with mock data
  const getAlertPreview = () => {
    const mockData: Record<string, string> = {
      created_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      full_name: 'Riya Sharma',
      phone: '+91 98765 43210',
      email: 'riya@example.com',
      source: 'Facebook Ads',
      shoot_type: 'Wedding',
      location: 'Mumbai, Maharashtra',
      budget: '₹2,50,000',
      score: 'High-Value',
      status: 'New',
    };

    return alertTemplate.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const normalizedKey = key.trim().toLowerCase();
      const found = Object.keys(mockData).find(k => k.toLowerCase() === normalizedKey);
      return found ? mockData[found] : `[${key}]`;
    });
  };

  // Form Submit Handler
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.trim().length < 3) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setLoading(true);

    // Build specific payload based on selected Tab type
    let payload: any = {};
    if (activeTab === 'text') {
      payload = { body: textBody };
    } else if (activeTab === 'media') {
      payload = { body: textBody, mediaUrl, mediaMime };
    } else if (activeTab === 'poll') {
      payload = { question: pollQuestion, allowMultiple: pollAllowMultiple, options: pollOptions.filter(o => o.text.trim()) };
    }

    try {
      const url = editTemplateId 
        ? `/api/templates?workspace_id=${workspaceId}&template_id=${editTemplateId}`
        : `/api/templates?workspace_id=${workspaceId}`;
      const method = editTemplateId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toLowerCase().replace(/\s+/g, '_'),
          category,
          language,
          type: activeTab,
          payload,
          buttons,
          meta_approval_required: metaApprovalRequired
        })
      });

      const data = await res.json();
      if (data.success) {
        // Reset builder form states
        setName('');
        setCategory('utility');
        setActiveTab('text');
        setTextBody('');
        setMediaUrl('');
        setMediaMime('');
        setPollQuestion('');
        setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
        setButtons([]);
        setMetaApprovalRequired(false);
        setEditTemplateId(null);
        setShowBuilder(false);
        
        // Reload list
        loadTemplates();
      } else {
        alert(data.error || 'Failed to create template.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred during template creation.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Handler
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    setLoading(true);
    try {
      const { error: deleteErr } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (deleteErr) throw deleteErr;
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Delete operation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Formatting toolbar helper for textareas
  const renderFormattingToolbar = () => {
    const renderOption = (item: { label: string, tag: string }) => (
      <button
        key={item.tag}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          insertAtCursor(item.tag);
          setShowShortcodeDropdown(false);
        }}
        className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors font-sans flex justify-between items-center cursor-pointer"
      >
        <span>{item.label}</span>
        <span className="text-[10px] text-zinc-400 font-mono">{item.tag}</span>
      </button>
    );

    return (
      <div className="flex items-center gap-1.5 pb-2 border-b border-zinc-150 dark:border-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 font-mono mb-2 w-full">
        <button 
          type="button" 
          onClick={() => insertAtCursor('*bold*')} 
          className="w-7 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          title="Bold"
        >
          B
        </button>
        <button 
          type="button" 
          onClick={() => insertAtCursor('_italic_')} 
          className="w-7 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 italic rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          title="Italic"
        >
          I
        </button>
        <button 
          type="button" 
          onClick={() => insertAtCursor('~strike~')} 
          className="w-7 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </button>
        <button 
          type="button" 
          onClick={() => insertAtCursor('`code`')} 
          className="w-7 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          title="Code"
        >
          {"</>"}
        </button>
        <button 
          type="button" 
          onClick={() => insertAtCursor('{{1}}')} 
          className="w-7 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          title="Variable"
        >
          {"{x}"}
        </button>

        {/* Dynamic Fields Dropdown */}
        <div className="relative inline-block text-left z-30">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowShortcodeDropdown(!showShortcodeDropdown);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 font-sans cursor-pointer h-7 ${
              isTextareaFocused 
                ? 'text-zinc-950 dark:text-white border-zinc-950 dark:border-white bg-white/5 dark:bg-zinc-900/40 shadow-sm opacity-100 font-bold' 
                : 'text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-850 bg-transparent opacity-60 hover:opacity-100 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span>Insert Dynamic Field</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showShortcodeDropdown && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShortcodeDropdown(false);
                }}
              />
              <div className="absolute left-0 mt-1 w-64 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-40 overflow-y-auto max-h-80 py-1.5 font-sans">
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Client Info</div>
                {[
                  { label: 'First Name', tag: '{{first_name}}' },
                  { label: 'Last Name', tag: '{{last_name}}' },
                  { label: 'Full Name', tag: '{{full_name}}' },
                  { label: 'Phone Number', tag: '{{phone_number}}' },
                ].map(renderOption)}
                
                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">System / Time</div>
                {[
                  { label: 'Timestamp', tag: '{{timestamp}}' },
                  { label: 'Current Date', tag: '{{current_date}}' },
                ].map(renderOption)}

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Meta / Campaign</div>
                {[
                  { label: 'Facebook Lead ID', tag: '{{facebook_lead_id}}' },
                  { label: 'Form Name', tag: '{{form_name}}' },
                  { label: 'Campaign Name', tag: '{{campaign_name}}' },
                  { label: 'Platform', tag: '{{platform}}' },
                ].map(renderOption)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Add Button Modifier
  const handleAddButton = (type: 'url' | 'phone') => {
    if (buttons.length >= 3) {
      alert('Maximum of 3 action links allowed.');
      return;
    }
    const label = type === 'url' ? 'Link URL' : 'Call Number';
    
    setButtons(prev => [...prev, {
      id: String(Date.now()),
      type,
      text: label,
      value: ''
    }]);
  };

  const handleRemoveButton = (id: string) => {
    setButtons(prev => prev.filter(b => b.id !== id));
  };

  // Add Poll Option
  const handleAddPollOption = () => {
    if (pollOptions.length >= 6) {
      alert('WhatsApp polls support a maximum of 6 options.');
      return;
    }
    setPollOptions(prev => [...prev, { id: String(prev.length + 1), text: '' }]);
  };

  const handleRemovePollOption = (id: string) => {
    if (pollOptions.length <= 2) {
      alert('WhatsApp polls require at least 2 options.');
      return;
    }
    setPollOptions(prev => prev.filter(o => o.id !== id));
  };

  // Filter templates by query
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const approvedCount = templates.filter(t => t.status === 'approved').length;
  const pendingCount = templates.filter(t => t.status === 'pending').length;
  const rejectedCount = templates.filter(t => t.status === 'rejected').length;
  const totalCount = templates.length;

  return (
    <div className="space-y-6">
      {/* Top-level Section Tabs */}
      <div className="border border-zinc-200 dark:border-zinc-900 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 p-1 flex gap-1.5 max-w-md">
        <button
          type="button"
          onClick={() => setActiveSection('templates')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSection === 'templates'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('group-alerts')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSection === 'group-alerts'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Group Lead Alerts
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Templates (existing content)                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'templates' && (<>
      {/* 1. KPI Stats Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* USED Card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Used</span>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="w-10 h-10 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="20" cy="20" r="16" className="stroke-zinc-150 dark:stroke-zinc-800 fill-none" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" className="stroke-emerald-500 fill-none" strokeWidth="3" 
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (totalCount > 0 ? (totalCount / 50) : 0))}`}
              />
            </svg>
            <div className="absolute text-[8px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
              {Math.round((totalCount / 50) * 100)}%
            </div>
          </div>
        </div>

        {/* REMAINING Card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">Remaining</span>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{Math.max(0, 50 - totalCount)}</p>
          </div>
          <div className="w-10 h-10 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="20" cy="20" r="16" className="stroke-zinc-150 dark:stroke-zinc-800 fill-none" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" className="stroke-amber-500 fill-none" strokeWidth="3" 
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - (Math.max(0, 50 - totalCount) / 50))}`}
              />
            </svg>
            <div className="absolute text-[8px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
              {Math.round((Math.max(0, 50 - totalCount) / 50) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-300 rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 font-medium"
          />
        </div>

        <button
          onClick={handleAddNewClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Template
        </button>
      </div>

      {/* 3. Data Table Grid */}
      <div className="border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/20 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5 w-12">
                  <input type="checkbox" className="rounded bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-orange-500 focus:ring-0" />
                </th>
                <th className="py-4 px-5">Name</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Last Modified</th>
                <th className="py-4 px-5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No templates found matching filters or criteria.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={template.id} className="border-b border-zinc-100 dark:border-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="py-4 px-5">
                      <input type="checkbox" className="rounded bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-orange-500 focus:ring-0" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <span className="font-semibold text-zinc-900 dark:text-white">{template.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-500 font-mono">
                          <span>ID: {template.id.slice(0, 8)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(template.id)}
                            className="text-zinc-500 hover:text-zinc-850 dark:text-zinc-600 dark:hover:text-zinc-400 p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                            title="Copy Template ID"
                          >
                            {copiedId === template.id ? (
                              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-zinc-700 dark:text-zinc-400 capitalize">{template.type}</td>
                    <td className="py-4 px-5 text-zinc-700 dark:text-zinc-400 capitalize">{template.category}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        template.status === 'approved' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                        template.status === 'rejected' ? 'bg-rose-500/5 text-rose-400 border-rose-500/10' :
                        'bg-amber-500/5 text-amber-400 border-amber-500/10'
                      }`}>
                        {template.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-zinc-500">
                      {new Date(template.updated_at || template.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-5 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(template)}
                          className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Edit Template"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDuplicateClick(template)}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors"
                          title="Duplicate Template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Template Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-900 p-5">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {editTemplateId ? `Edit template: ${name}` : 'Create a new template'}
                  </h3>
                  <p className="text-[10px] text-zinc-550 dark:text-zinc-500">Configure parameters, dynamic contents, and submit for validation</p>
                </div>
                <button 
                  onClick={() => setShowBuilder(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateTemplate} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Core configuration parameters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Template name</label>
                    <input 
                      type="text"
                      placeholder="e.g. welcome_drip"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border ${nameError ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-800'} text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700`}
                    />
                    {nameError && <p className="text-[10px] text-rose-450 dark:text-rose-400">Invalid input</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Template category</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                    >
                      <option value="utility">Utility</option>
                      <option value="marketing">Marketing</option>
                      <option value="authentication">Authentication</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Template Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                    >
                      <option value="en_US">English (US)</option>
                      <option value="hi_IN">Hindi (India)</option>
                      <option value="es_ES">Spanish (Spain)</option>
                    </select>
                  </div>
                </div>

                {/* Media Url & Mime (always at the top as per image) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Default Send Media URL</label>
                    <input 
                      type="text"
                      placeholder="https://example.com/media.jpg"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Default Send Media MIME / Type</label>
                    <input 
                      type="text"
                      placeholder="image/jpeg"
                      value={mediaMime}
                      onChange={(e) => setMediaMime(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                    />
                  </div>
                </div>

                {/* Content Tabs header */}
                <div className="border border-zinc-200 dark:border-zinc-900 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 p-1 flex gap-1.5">
                  {(['text', 'media', 'poll'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === tab 
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      {tab === 'text' && <FileText className="w-3.5 h-3.5" />}
                      {tab === 'media' && <ImageIcon className="w-3.5 h-3.5" />}
                      {tab === 'poll' && <Vote className="w-3.5 h-3.5" />}
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content panels */}
                <div className="border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/60 p-5 space-y-4">
                  {activeTab === 'text' && (
                    <div className="space-y-4">
                      {/* Editor bar */}
                      {renderFormattingToolbar()}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-400">Template body</label>
                        <textarea
                          ref={textareaRef}
                          placeholder="Write template message here..."
                          value={textBody}
                          onChange={(e) => setTextBody(e.target.value)}
                          onFocus={() => setIsTextareaFocused(true)}
                          onBlur={() => setTimeout(() => setIsTextareaFocused(false), 200)}
                          rows={6}
                          className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'media' && (
                    <div className="space-y-4">
                      {/* Drag Zone */}
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-zinc-250 dark:border-zinc-800 rounded-xl p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/20 space-y-1 cursor-pointer hover:border-zinc-455 dark:hover:border-zinc-700 transition-colors"
                      >
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {uploading ? (
                          <div className="space-y-2 py-2">
                            <RefreshCw className="w-8 h-8 text-orange-400 mx-auto animate-spin" />
                            <p className="text-xs text-zinc-600 dark:text-zinc-350 font-semibold">Uploading file...</p>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
                              {mediaUrl ? 'File selected (Click to replace)' : 'Drop files here or click to browse'}
                            </p>
                             <p className="text-[10px] text-zinc-500">
                               {mediaUrl ? `MIME: ${mediaMime}` : 'Single file only (Max: Image 50MB, Video 50MB, Document 100MB)'}
                             </p>
                          </>
                        )}
                      </div>

                      {/* Live Media Preview Thumbnail */}
                      {mediaUrl && (
                        <div className="relative border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950/40 backdrop-blur-md flex flex-col items-center justify-center group overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMediaUrl('');
                              setMediaMime('');
                            }}
                            className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-450 hover:border-rose-200 dark:hover:border-rose-950/20 transition-all z-10"
                            title="Remove media"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-full flex flex-col items-center gap-3">
                            {mediaMime.startsWith('image/') || (!mediaMime && mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
                              <img 
                                src={mediaUrl} 
                                alt="Media preview" 
                                className="max-h-36 object-contain rounded-lg border border-zinc-200 dark:border-zinc-800/80 shadow-md"
                              />
                            ) : mediaMime.startsWith('video/') || (!mediaMime && mediaUrl.match(/\.(mp4|webm|ogg)/i)) ? (
                              <video 
                                src={mediaUrl} 
                                controls 
                                className="max-h-36 w-full object-contain rounded-lg border border-zinc-200 dark:border-zinc-800/80 shadow-md"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                              </div>
                            )}

                            <div className="text-center space-y-0.5 w-full px-4">
                              <p className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate max-w-full font-mono">{mediaUrl}</p>
                              <p className="text-[8px] text-zinc-500 dark:text-zinc-500 uppercase font-bold tracking-wider">
                                {mediaMime || 'Unknown MIME'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Text editor for media body */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-400">Template body</label>
                        {renderFormattingToolbar()}
                        <textarea
                          ref={textareaRef}
                          placeholder="Write body text accompanying the media..."
                          value={textBody}
                          onChange={(e) => setTextBody(e.target.value)}
                          onFocus={() => setIsTextareaFocused(true)}
                          onBlur={() => setTimeout(() => setIsTextareaFocused(false), 200)}
                          rows={4}
                          className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'poll' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Interactive Poll Configuration</h5>
                          <p className="text-[9px] text-zinc-500">Min 2 options, max 6 options.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] text-zinc-550 dark:text-zinc-400 font-semibold flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pollAllowMultiple}
                              onChange={(e) => setPollAllowMultiple(e.target.checked)}
                              className="rounded bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-orange-500 focus:ring-0 w-3 h-3"
                            />
                            Allow multiple answers
                          </label>
                          <button
                            type="button"
                            onClick={handleAddPollOption}
                            className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-500">Question</label>
                        <input
                          type="text"
                          placeholder="e.g. Choose your photoshoot theme"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                        />
                      </div>

                      <div className="space-y-2">
                        {pollOptions.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/20 p-2 border border-zinc-150 dark:border-zinc-900 rounded-xl">
                            <span className="text-[10px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">
                              Option #{idx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder="Option text"
                              value={opt.text}
                              onChange={(e) => {
                                  setPollOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o));
                              }}
                              className="flex-1 bg-transparent text-xs text-zinc-800 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-900 focus:outline-none focus:border-zinc-455 dark:focus:border-zinc-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(opt.id)}
                              className="text-[10px] text-zinc-500 hover:text-rose-500 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-500 italic">Tip: WhatsApp polls perform best with short, clear options.</p>
                    </div>
                  )}
                </div>

                {/* Action Interactive buttons row modifiers */}
                <div className="p-5 border border-zinc-250 dark:border-zinc-900 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Quick Action Links (100% Reliable Delivery)</h4>
                      <p className="text-[9px] text-zinc-550 dark:text-zinc-500">Add URL links or telephone click actions — delivered as text (max 3)</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleAddButton('url')}
                        className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg"
                      >
                        + URL Link
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleAddButton('phone')}
                        className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg"
                      >
                        + Telephone
                      </button>
                    </div>
                  </div>

                  {/* Action links list */}
                  {buttons.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-600 italic">No action links added yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {buttons.map((btn, bIdx) => (
                        <div key={btn.id} className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-2.5 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                          <div className="flex gap-2 items-center">
                            <span className="text-[9px] font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded capitalize text-zinc-500 dark:text-zinc-400 font-bold shrink-0">
                              {btn.type === 'url' ? '🔗 URL' : '📞 Call'}
                            </span>
                            <input 
                              type="text"
                              value={btn.text}
                              onChange={(e) => {
                                setButtons(prev => prev.map(b => b.id === btn.id ? { ...b, text: e.target.value } : b));
                              }}
                              placeholder="Link label (shown on phone)"
                              className="bg-transparent text-xs text-zinc-900 dark:text-white border-b border-zinc-250 dark:border-zinc-800 focus:outline-none flex-1"
                            />
                            <button 
                              type="button"
                              onClick={() => handleRemoveButton(btn.id)}
                              className="text-zinc-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              {btn.type === 'url' ? 'Destination URL' : 'Phone Number'}
                            </label>
                            <input 
                              type="text"
                              value={btn.value}
                              onChange={(e) => {
                                setButtons(prev => prev.map(b => b.id === btn.id ? { ...b, value: e.target.value } : b));
                              }}
                              placeholder={
                                btn.type === 'url' ? 'https://example.com/page' 
                                : '+919876543210'
                              }
                              className="bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/30 dark:focus:ring-blue-500/30 w-full font-mono px-2.5 py-1.5 rounded-lg"
                            />
                            <p className="text-[8px] text-zinc-400 dark:text-zinc-600 italic">
                              {btn.type === 'url' ? 'Full URL — appears as a tappable text link in the message' 
                                : 'Phone number to dial (include country code, e.g. +91...)'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta approval and create buttons */}
                <div className="border-t border-zinc-200 dark:border-zinc-900 pt-5 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer font-medium selection:bg-transparent">
                    <input
                      type="checkbox"
                      checked={metaApprovalRequired}
                      onChange={(e) => setMetaApprovalRequired(e.target.checked)}
                      className="rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-orange-500 focus:ring-0 w-4 h-4"
                    />
                    Required Meta Approval?
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : editTemplateId ? 'Update Template' : 'Create Template'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Group Lead Alerts & Mapping                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'group-alerts' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Bell className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Group Lead Alerts & Mapping</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Configure automatic WhatsApp group notifications when new leads arrive
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column — Configuration */}
            <div className="space-y-5">
              {/* Group Selector */}
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Target WhatsApp Group</h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                    Select from synced groups
                  </label>
                  <select
                    value={alertGroupId}
                    onChange={(e) => setAlertGroupId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none"
                  >
                    <option value="">-- Choose a synced group --</option>
                    {syncedGroups.map((g) => (
                      <option key={g.jid} value={g.jid}>
                        {g.display_name || g.jid}
                      </option>
                    ))}
                    <option value="__manual__">Enter JID manually...</option>
                  </select>
                </div>

                {alertGroupId === '__manual__' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                      Group JID (e.g. 1203630249481@g.us)
                    </label>
                    <input
                      type="text"
                      placeholder="1203630249481@g.us"
                      value={alertGroupIdManual}
                      onChange={(e) => setAlertGroupIdManual(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-xs rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                )}

                {savedAlertGroupId && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active group: <span className="font-mono font-bold">{savedAlertGroupId}</span></span>
                  </div>
                )}
              </div>

              {/* Fetch & List All Groups Sub-section */}
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">All WhatsApp Groups</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchGroups}
                    disabled={fetchingGroups}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-600 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingGroups ? 'animate-spin' : ''}`} />
                    {fetchingGroups ? 'Syncing...' : 'Fetch Active Groups'}
                  </button>
                </div>

                {syncedGroups.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <Users className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                      {fetchingGroups ? 'Fetching groups from WhatsApp...' : 'No groups loaded yet. Click "Fetch Active Groups" to sync.'}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-900 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    {syncedGroups.map((g) => (
                      <div
                        key={g.jid}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/5 flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                              {g.display_name || 'Unnamed Group'}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                              {g.jid}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {typeof g.participant_count === 'number' && g.participant_count > 0 && (
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                              {g.participant_count} members
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyJid(g.jid)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all opacity-60 group-hover:opacity-100"
                            title="Copy JID"
                          >
                            {copiedJid === g.jid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {syncedGroups.length > 0 && (
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-600 italic">
                    {syncedGroups.length} group{syncedGroups.length !== 1 ? 's' : ''} synced. Click "Fetch Active Groups" to force-refresh from WhatsApp.
                  </p>
                )}
              </div>

              {/* Template Editor */}
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Alert Message Template</h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                    Use dynamic placeholders
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Created Time', tag: '{{created_time}}' },
                      { label: 'Full Name', tag: '{{full_name}}' },
                      { label: 'Shoot Type', tag: '{{shoot_type}}' },
                      { label: 'Location', tag: '{{location}}' },
                      { label: 'Budget', tag: '{{budget}}' },
                      { label: 'Phone', tag: '{{phone}}' },
                      { label: 'Email', tag: '{{email}}' },
                      { label: 'Source', tag: '{{source}}' },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => {
                          setAlertTemplate(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + item.label + ' : *' + item.tag + '*\n');
                        }}
                        className="px-2 py-1 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:border-orange-300 dark:hover:border-orange-600 hover:text-orange-500 transition-colors cursor-pointer"
                        title={`Insert ${item.label} placeholder`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                    Template message
                  </label>
                  <textarea
                    placeholder="Write your alert template here using {{placeholders}}..."
                    value={alertTemplate}
                    onChange={(e) => setAlertTemplate(e.target.value)}
                    rows={12}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 font-mono leading-relaxed"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAlertConfig}
                    disabled={alertSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    {alertSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Save Configuration
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={alertTestSending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 disabled:opacity-50 transition-all"
                  >
                    {alertTestSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Test Alert
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column — Live Preview */}
            <div className="space-y-5">
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md space-y-4 sticky top-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Live Preview</h4>
                </div>

                {/* WhatsApp-style message bubble */}
                <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-xl p-4 max-w-sm shadow-md">
                  <div className="bg-white dark:bg-[#1F2C33] rounded-lg p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <pre className="whitespace-pre-wrap text-xs text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed">
                      {getAlertPreview()}
                    </pre>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
                    <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  </div>
                </div>

                {/* Placeholders Reference */}
                <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                    Available Placeholders
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { tag: '{{created_time}}', desc: 'Alert timestamp' },
                      { tag: '{{full_name}}', desc: 'Lead full name' },
                      { tag: '{{shoot_type}}', desc: 'Type of shoot' },
                      { tag: '{{location}}', desc: 'City / area' },
                      { tag: '{{budget}}', desc: 'Max budget' },
                      { tag: '{{phone}}', desc: 'Phone number' },
                      { tag: '{{email}}', desc: 'Email address' },
                      { tag: '{{source}}', desc: 'Lead source' },
                      { tag: '{{score}}', desc: 'Lead score' },
                      { tag: '{{status}}', desc: 'Lead status' },
                    ].map((item) => (
                      <div key={item.tag} className="flex flex-col">
                        <span className="text-[10px] font-mono text-orange-500 dark:text-orange-400 font-bold">{item.tag}</span>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-500">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/30 dark:border-orange-900/20">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">
                    How it works
                  </h5>
                  <ol className="text-[10px] text-zinc-600 dark:text-zinc-400 space-y-1.5 list-decimal list-inside">
                    <li>Select or enter your WhatsApp Group JID above</li>
                    <li>Design the alert message using dynamic placeholders</li>
                    <li>Click <strong>Save Configuration</strong> to persist settings</li>
                    <li>When a new lead arrives, the system auto-fires the formatted alert to your group</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

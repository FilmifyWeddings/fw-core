'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, MoreVertical, CheckCircle2, XCircle, Clock, Timer, 
  Trash2, ShieldCheck, FileText, Image as ImageIcon, 
  Vote, HelpCircle, PhoneCall, Link2, Reply, X, PlusCircle, Check, RefreshCw,
  Edit, Copy, ChevronDown, Users, Bell, Send, MessageSquare, HardDrive, AlertTriangle, Folder,
  UserCheck, Sparkles, Globe, Calendar, Type, CheckSquare, Upload, Video, ExternalLink, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  getWhatsAppTemplateStorageUsage, 
  checkWhatsAppStorageQuotaGuard, 
  StorageQuotaStats 
} from '@/lib/whatsapp-template-media-manager';
import { WhatsAppTemplateMediaModal } from '@/components/integrations/whatsapp-template-media-modal';

interface WhatsappTemplatesProps {
  workspaceId: string;
  shootType?: string; // 'all' | 'wedding' | 'commercial'
}

export interface TemplateButton {
  id: string;
  type: 'cta_url' | 'quick_reply' | 'cta_call' | 'url' | 'phone';
  text: string;
  value: string;
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
  buttons: TemplateButton[];
  meta_approval_required: boolean;
}

export function WhatsappTemplates({ workspaceId, shootType = 'all' }: WhatsappTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dedicated WhatsApp Template Storage Quota state (Strict 500 MB Limit)
  const [storageStats, setStorageStats] = useState<StorageQuotaStats>({
    totalBytes: 0,
    totalMB: 0,
    maxMB: 500,
    usagePercentage: 0,
    filesCount: 0,
  });
  const [showMediaGalleryModal, setShowMediaGalleryModal] = useState(false);
  const [quotaWarningModal, setQuotaWarningModal] = useState<string | null>(null);

  const loadStorageStats = async () => {
    if (!workspaceId) return;
    try {
      const statsData = await getWhatsAppTemplateStorageUsage(workspaceId);
      setStorageStats(statsData);
    } catch (err) {
      console.warn('[WhatsappTemplates] Storage stats error:', err);
    }
  };

  useEffect(() => {
    loadStorageStats();
    const handleUpdate = () => loadStorageStats();
    if (typeof window !== 'undefined') {
      window.addEventListener('wa_template_media_updated', handleUpdate);
      return () => window.removeEventListener('wa_template_media_updated', handleUpdate);
    }
  }, [workspaceId]);

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

  // Delete confirmation state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Builder form states
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [category, setCategory] = useState<'utility' | 'marketing' | 'authentication' | 'group_alert' | 'group_workflow'>('utility');
  const [language, setLanguage] = useState('en_US');
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'poll'>('text');
  
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaMime, setMediaMime] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Live Preview Dynamic Token Evaluator
  const getLivePreviewText = (text: string) => {
    const sampleData: Record<string, string> = {
      first_name: 'Riya',
      last_name: 'Sharma',
      full_name: 'Riya Sharma',
      phone_number: '+91 98765 43210',
      phone: '+91 98765 43210',
      email: 'riya.sharma@example.com',
      city: 'Mumbai',
      location: 'Mumbai, Maharashtra',
      address: 'Bandra West, Mumbai',
      lead_owner: 'Sahil Dhonde',
      status: 'In Discussion',
      score: '85 (Hot Lead)',
      event_date: '15 Dec 2026',
      wedding_date: '15 Dec 2026',
      groom_name: 'Rohit Verma',
      bride_name: 'Riya Sharma',
      shoot_type: 'Wedding & Reception',
      kind_of_shoot: 'Wedding',
      what_kind_of_shoot: 'Wedding Shoot',
      which_city: 'Mumbai',
      venue: 'Taj Lands End, Bandra',
      event_venue: 'Taj Lands End',
      budget: '₹2,50,000',
      max_budget: '₹2,50,000',
      approximate_budget: '₹2,50,000',
      expected_guests: '450 Guests',
      call_time: '09:00 AM',
      form_name: 'Wedding Photography Lead Form',
      campaign_name: 'Weddings 2026 Season Campaign',
      ad_name: 'Cinematic Teaser Ad #1',
      adset_name: 'Mumbai Brides 22-30',
      platform: 'Instagram / Facebook',
      facebook_lead_id: 'fb_lead_982348912',
      instagram_handle: '@riyasharma_official',
      wedding_events: 'Sangeet, Haldi, Wedding, Reception',
      notes: 'Couple looking for premium cinematic video & traditional photo package.',
      created_time: '21 Aug 2026, 02:49 am',
      current_date: '21/08/2026',
      timestamp: new Date().toISOString(),
    };

    if (!text) return 'Start typing your template message...';

    return text.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
      const cleanKey = key.trim().toLowerCase();
      return sampleData[cleanKey] || `[${key}]`;
    });
  };

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

    // 1. WhatsApp Template Storage Quota Guard (Strict 500 MB Limit)
    const quotaCheck = await checkWhatsAppStorageQuotaGuard(workspaceId, file.size);
    if (!quotaCheck.allowed) {
      setQuotaWarningModal(quotaCheck.message || 'Storage Quota Exceeded (500 MB Limit Reached). Please upgrade your plan or delete existing media to continue uploading.');
      if (e.target) e.target.value = '';
      return;
    }

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
      const { uploadMasterImage } = await import('@/lib/master-image-manager');
      const uploadResult = await uploadMasterImage(supabase, file, {
        bucket: 'whatsapp_templates_media',
        folder: workspaceId,
        cacheControl: '31536000'
      });

      if (uploadResult.error) throw new Error(uploadResult.error);

      setMediaUrl(uploadResult.url);
      const detectedMime = file.type || (file.name.match(/\.(mp4|webm|mov|mkv)$/i) ? 'video/mp4' : (file.name.match(/\.(pdf)$/i) ? 'application/pdf' : 'image/jpeg'));
      setMediaMime(detectedMime);
      // Instantly refresh template storage stats meter
      loadStorageStats();
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
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
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
    
    setButtons((template.buttons || []).map((b: any, idx: number) => ({
      id: b.id || String(Date.now() + idx),
      type: b.type === 'url' ? 'cta_url' : (b.type === 'phone' || b.type === 'call') ? 'cta_call' : (b.type || 'quick_reply'),
      text: b.text || b.display_text || '',
      value: b.value || b.url || b.phone_number || ''
    })));
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
    
    setButtons((template.buttons || []).map((b: any, idx: number) => ({
      id: b.id || String(Date.now() + idx),
      type: b.type === 'url' ? 'cta_url' : (b.type === 'phone' || b.type === 'call') ? 'cta_call' : (b.type || 'quick_reply'),
      text: b.text || b.display_text || '',
      value: b.value || b.url || b.phone_number || ''
    })));
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

  const handleAddNewGroupTemplateClick = () => {
    setEditTemplateId(null);
    setName('group_lead_alert');
    setNameError(false);
    setCategory('group_alert');
    setLanguage('en_US');
    setActiveTab('text');
    setTextBody(
      '*🚨 New Lead Alert! 🚨*\n\n' +
      '1. Created Time : *{{created_time}}*\n' +
      '2. Full Name : *{{full_name}}*\n' +
      '3. Kind of Shoot : *{{shoot_type}}*\n' +
      '4. Location : *{{location}}*\n' +
      '5. Max Budget : *{{budget}}*\n' +
      '6. Phone Number : *{{phone}}*\n' +
      '7. Source : *{{source}}*'
    );
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
      if (syncedGroups.length === 0 && !fetchingGroups) {
        handleFetchGroups();
      }
    }
  }, [activeSection, workspaceId]);

  // Force-fetch all groups from the Baileys socket via server-side API proxy
  const handleFetchGroups = async () => {
    setFetchingGroups(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/integrations/baileys/fetch-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = await res.json();
      if (data.success && data.groups) {
        setSyncedGroups(data.groups);
      } else {
        console.warn('Failed to fetch groups:', data.error);
        if (data.error && !data.error.includes('not connected')) {
          alert('Failed to fetch groups: ' + (data.error || 'Worker returned error'));
        }
      }
    } catch (err: any) {
      console.warn('Could not reach Baileys worker:', err.message);
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
  const handleDeleteTemplate = (template: TemplateRow) => {
    setDeleteConfirmTarget(template.id);
    setDeleteConfirmName(template.name);
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirmTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?workspace_id=${workspaceId}&template_id=${deleteConfirmTarget}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmTarget(null);
        setDeleteConfirmName('');
        loadTemplates();
      } else {
        alert(data.error || 'Delete operation failed.');
      }
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
              <div className="absolute left-0 mt-1 w-72 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 overflow-y-auto max-h-96 py-2 font-sans">
                {/* 1. Client & Lead Info */}
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Client & Contact Info
                </div>
                {[
                  { label: 'Full Name', tag: '{{full_name}}' },
                  { label: 'First Name', tag: '{{first_name}}' },
                  { label: 'Last Name', tag: '{{last_name}}' },
                  { label: 'Phone Number', tag: '{{phone_number}}' },
                  { label: 'Phone (Short)', tag: '{{phone}}' },
                  { label: 'Email Address', tag: '{{email}}' },
                  { label: 'City', tag: '{{city}}' },
                  { label: 'Full Location', tag: '{{location}}' },
                  { label: 'Address', tag: '{{address}}' },
                  { label: 'Lead Owner', tag: '{{lead_owner}}' },
                  { label: 'Lead Status', tag: '{{status}}' },
                  { label: 'Lead Score', tag: '{{score}}' },
                ].map(renderOption)}

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />

                {/* 2. Wedding & Event Specifications */}
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-rose-500 dark:text-rose-400 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Wedding & Event Details
                </div>
                {[
                  { label: 'Event Date', tag: '{{event_date}}' },
                  { label: 'Wedding Date', tag: '{{wedding_date}}' },
                  { label: 'Groom Name', tag: '{{groom_name}}' },
                  { label: 'Bride Name', tag: '{{bride_name}}' },
                  { label: 'Shoot Type', tag: '{{shoot_type}}' },
                  { label: 'Venue', tag: '{{venue}}' },
                  { label: 'Max Budget', tag: '{{budget}}' },
                  { label: 'Budget Range', tag: '{{max_budget}}' },
                  { label: 'Expected Guests', tag: '{{expected_guests}}' },
                  { label: 'Call Time', tag: '{{call_time}}' },
                ].map(renderOption)}

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />

                {/* 3. Meta Custom Form Questions */}
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-purple-500 dark:text-purple-400 tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Meta Form Custom Questions
                </div>
                {[
                  { label: 'Kind of Shoot', tag: '{{kind_of_shoot}}' },
                  { label: 'What Kind of Shoot', tag: '{{what_kind_of_shoot}}' },
                  { label: 'Which City', tag: '{{which_city}}' },
                  { label: 'Approx Budget', tag: '{{approximate_budget}}' },
                  { label: 'Event Venue', tag: '{{event_venue}}' },
                  { label: 'Wedding Events', tag: '{{wedding_events}}' },
                  { label: 'Instagram Handle', tag: '{{instagram_handle}}' },
                  { label: 'Notes', tag: '{{notes}}' },
                ].map(renderOption)}

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />

                {/* 4. Meta & Campaign Metadata */}
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-blue-500 dark:text-blue-400 tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Meta & Campaign Info
                </div>
                {[
                  { label: 'Form Name', tag: '{{form_name}}' },
                  { label: 'Campaign Name', tag: '{{campaign_name}}' },
                  { label: 'Ad Name', tag: '{{ad_name}}' },
                  { label: 'Adset Name', tag: '{{adset_name}}' },
                  { label: 'Platform Source', tag: '{{platform}}' },
                  { label: 'Facebook Lead ID', tag: '{{facebook_lead_id}}' },
                ].map(renderOption)}

                <div className="border-t border-zinc-100 dark:border-zinc-900 my-1.5" />

                {/* 5. System & Dates */}
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-amber-500 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> System Dates & Times
                </div>
                {[
                  { label: 'Created Time', tag: '{{created_time}}' },
                  { label: 'Current Date', tag: '{{current_date}}' },
                  { label: 'Timestamp (ISO)', tag: '{{timestamp}}' },
                ].map(renderOption)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Add Interactive Button Modifier (Max 3 Allowed by WhatsApp)
  const handleAddButton = (type: 'cta_url' | 'quick_reply' | 'cta_call') => {
    if (buttons.length >= 3) {
      alert('Maximum of 3 interactive buttons allowed by WhatsApp.');
      return;
    }
    let defaultLabel = 'Visit Website';
    let defaultValue = 'https://';
    if (type === 'quick_reply') {
      defaultLabel = 'Confirm Booking';
      defaultValue = 'confirm_booking';
    } else if (type === 'cta_call') {
      defaultLabel = 'Call Studio';
      defaultValue = '+91';
    }
    
    setButtons(prev => [...prev, {
      id: String(Date.now() + Math.random()),
      type,
      text: defaultLabel,
      value: defaultValue
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

  // Helper to distinguish Group Templates from Client Templates
  const isGroupTemplate = (t: TemplateRow) => {
    const cat = (t.category || '').toLowerCase();
    const nm = (t.name || '').toLowerCase();
    return cat === 'group_alert' || cat === 'group_workflow' || cat === 'group' || nm.startsWith('group_') || nm.includes('group_alert');
  };

  // Client Templates (Tab 1) — Excludes Group Templates
  const clientTemplates = templates.filter(t => !isGroupTemplate(t));

  // Filter templates by query for Client tab
  const filteredClientTemplates = clientTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group Templates (Tab 2) — Only Group Templates
  const groupTemplates = templates.filter(t => isGroupTemplate(t));

  // Statistics calculation for Client tab
  const approvedCount = clientTemplates.filter(t => t.status === 'approved').length;
  const pendingCount = clientTemplates.filter(t => t.status === 'pending').length;
  const rejectedCount = clientTemplates.filter(t => t.status === 'rejected').length;
  const totalCount = clientTemplates.length;

  return (
    <div className="space-y-6">
      {/* Top-level Section Tabs */}
      <div className="border border-zinc-200 dark:border-zinc-900 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 p-1 flex gap-1.5 max-w-lg shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSection('templates')}
          className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'templates'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm font-bold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          Client & Drip Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('group-alerts')}
          className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'group-alerts'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm font-bold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-orange-500" />
          Group Templates & Automation
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Templates (existing content)                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'templates' && (<>
      {/* 1. KPI Stats & Template Storage Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
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

        {/* TEMPLATE STORAGE METER CARD (500 MB Limit) */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-green-500" />
                Template Storage
              </span>
              <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
                {storageStats.totalMB} MB <span className="text-xs text-zinc-400 font-normal">/ 500 MB</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMediaGalleryModal(true)}
              className="px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-[11px] font-bold border border-green-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Folder className="w-3 h-3" /> View Media Assets
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                storageStats.usagePercentage >= 90 ? 'bg-rose-500' : 'bg-green-500'
              }`}
              style={{ width: `${storageStats.usagePercentage}%` }}
            />
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
                <th className="py-4 px-5 text-right font-mono text-[10px] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientTemplates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No client templates found matching filters or criteria.
                  </td>
                </tr>
              ) : (
                filteredClientTemplates.map((template) => (
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
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          type="button"
                          onClick={() => handleEditClick(template)}
                          className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDuplicateClick(template)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                          title="Duplicate Template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteTemplate(template)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
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
      </>
      )}

      {/* 4. Template Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-900 p-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                      WhatsApp Template Designer
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">• Live Simulator</span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {editTemplateId ? `Edit Template: ${name}` : 'Create a New Template'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowBuilder(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content in 2-Column Split */}
              <form onSubmit={handleCreateTemplate} className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Form Configuration (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">
                    
                    {/* Core configuration parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <option value="utility">Utility (Client Drip & Welcome)</option>
                          <option value="marketing">Marketing (Offers & Promotions)</option>
                          <option value="group_alert">Group Alert (Lead Alert to Team)</option>
                          <option value="group_workflow">Group Workflow (Anniversary / Pre-Event)</option>
                          <option value="authentication">Authentication (OTP / Verify)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Language</label>
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

                    {/* Media Url & Mime */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Media MIME Type</label>
                        <input 
                          type="text"
                          placeholder="image/jpeg or video/mp4"
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
                          {tab === 'text' && <Type className="w-3.5 h-3.5" />}
                          {tab === 'media' && <ImageIcon className="w-3.5 h-3.5" />}
                          {tab === 'poll' && <CheckSquare className="w-3.5 h-3.5" />}
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Tabs Content */}
                    <div className="space-y-4">
                      {activeTab === 'text' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Message Body</label>
                            {renderFormattingToolbar()}
                          </div>
                          <textarea 
                            ref={textareaRef}
                            rows={8}
                            value={textBody}
                            onChange={(e) => setTextBody(e.target.value)}
                            onFocus={() => setIsTextareaFocused(true)}
                            onBlur={() => setIsTextareaFocused(false)}
                            placeholder="Type your message with {{full_name}}, {{shoot_type}}, {{budget}}..."
                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 font-mono leading-relaxed"
                          />
                        </div>
                      )}

                      {activeTab === 'media' && (
                        <div className="space-y-4">
                          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Media Header Attachment</label>
                            <div className="flex gap-3">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*,application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {uploading ? 'Uploading...' : 'Upload Media File'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Media Caption Text</label>
                              {renderFormattingToolbar()}
                            </div>
                            <textarea 
                              ref={textareaRef}
                              rows={6}
                              value={textBody}
                              onChange={(e) => setTextBody(e.target.value)}
                              onFocus={() => setIsTextareaFocused(true)}
                              onBlur={() => setIsTextareaFocused(false)}
                              placeholder="Caption text displayed beneath the media..."
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 font-mono leading-relaxed"
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === 'poll' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Poll Question</label>
                            <input
                              type="text"
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="e.g. Which photography package do you prefer?"
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-200 text-xs rounded-xl focus:outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">Poll Options</label>
                              <button
                                type="button"
                                onClick={handleAddPollOption}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400"
                              >
                                + Add Option
                              </button>
                            </div>
                            <div className="space-y-2">
                              {pollOptions.map((opt, oIdx) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-zinc-400 w-4">{oIdx + 1}.</span>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => {
                                      setPollOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o));
                                    }}
                                    placeholder={`Option ${oIdx + 1}`}
                                    className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-none"
                                  />
                                  {pollOptions.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePollOption(opt.id)}
                                      className="text-zinc-400 hover:text-rose-500 p-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Native Flow Buttons Builder */}
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3.5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">⚡</span>
                            <h4 className="text-xs font-black text-zinc-900 dark:text-white">Interactive Native Flow Buttons</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60">
                              {buttons.length}/3 Added
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Add clickable URL links, quick reply choices, or direct call buttons (Max 3 supported by WhatsApp)
                          </p>
                        </div>

                        {/* Add Button Dropdown / Triggers */}
                        {buttons.length < 3 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAddButton('cta_url')}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 text-[11px] font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shadow-2xs"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>+ URL Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddButton('quick_reply')}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800 text-[11px] font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shadow-2xs"
                            >
                              <Reply className="w-3 h-3" />
                              <span>+ Quick Reply</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddButton('cta_call')}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 text-[11px] font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shadow-2xs"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>+ Call Button</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Empty state */}
                      {buttons.length === 0 && (
                        <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                            No interactive buttons added yet
                          </p>
                          <p className="text-[9.5px] text-zinc-400">
                            Click above to add up to 3 URL, Quick Reply, or Phone Call buttons
                          </p>
                        </div>
                      )}

                      {/* Buttons List */}
                      <div className="space-y-2">
                        {buttons.map((btn, index) => {
                          const isUrl = btn.type === 'cta_url' || btn.type === 'url';
                          const isCall = btn.type === 'cta_call' || btn.type === 'phone';
                          const isQuick = btn.type === 'quick_reply';

                          return (
                            <div 
                              key={btn.id} 
                              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black text-zinc-400 font-mono">#{index + 1}</span>
                                  {isUrl && (
                                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                      <Link2 className="w-2.5 h-2.5" /> URL Link
                                    </span>
                                  )}
                                  {isQuick && (
                                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                      <Reply className="w-2.5 h-2.5" /> Quick Reply
                                    </span>
                                  )}
                                  {isCall && (
                                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                      <PhoneCall className="w-2.5 h-2.5" /> Call Button
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveButton(btn.id)}
                                  className="text-zinc-400 hover:text-rose-500 p-1 transition cursor-pointer"
                                  title="Remove button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 mb-0.5 block">Button Label *</label>
                                  <input
                                    type="text"
                                    value={btn.text}
                                    onChange={e => setButtons(prev => prev.map(b => b.id === btn.id ? { ...b, text: e.target.value } : b))}
                                    placeholder={isUrl ? 'e.g. View Quotation' : isQuick ? 'e.g. Confirm Booking' : 'e.g. Call Studio'}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-semibold focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-500 mb-0.5 block">
                                    {isUrl ? 'Target URL *' : isQuick ? 'Payload / Button ID *' : 'Phone Number (with country code) *'}
                                  </label>
                                  <input
                                    type="text"
                                    value={btn.value}
                                    onChange={e => setButtons(prev => prev.map(b => b.id === btn.id ? { ...b, value: e.target.value } : b))}
                                    placeholder={isUrl ? 'https://example.com/quotation' : isQuick ? 'confirm_booking' : '+919876543210'}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Live Interactive WhatsApp Simulator (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="sticky top-0 bg-[#0B141A] rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                      
                      {/* WhatsApp Phone Top Header */}
                      <div className="bg-[#202C33] px-3.5 py-2.5 flex items-center justify-between text-white border-b border-zinc-800/80">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white font-black text-xs shadow-sm">
                            FW
                          </div>
                          <div>
                            <div className="font-bold text-xs leading-tight">Filmify Weddings</div>
                            <div className="text-[9px] text-[#00A884] font-mono">online • WhatsApp Business</div>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-[#00A884] animate-ping" />
                      </div>

                      {/* WhatsApp Chat Body Wallpaper */}
                      <div className="p-4 min-h-[380px] flex flex-col justify-end bg-[radial-gradient(#202C33_1px,transparent_1px)] [background-size:16px_16px] bg-[#0B141A]">
                        
                        {/* WhatsApp Message Bubble */}
                        <div className="max-w-[90%] self-end bg-[#005C4B] text-[#E9EDEF] rounded-2xl rounded-tr-sm p-3.5 shadow-lg space-y-2.5 relative">
                          
                          {/* Media Header Preview (Video, Photo, PDF, Audio) */}
                          {activeTab === 'media' && mediaUrl && (
                            <div className="rounded-xl overflow-hidden bg-black/60 border border-white/10 w-full relative">
                              {mediaMime?.includes('video') || mediaUrl.match(/\.(mp4|webm|mov|mkv)$/i) ? (
                                <div className="relative group/vid">
                                  <video
                                    src={mediaUrl}
                                    controls
                                    playsInline
                                    className="w-full max-h-52 object-cover rounded-lg bg-black"
                                  />
                                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono text-white flex items-center gap-1 pointer-events-none">
                                    <Video className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>VIDEO</span>
                                  </div>
                                </div>
                              ) : mediaMime?.includes('pdf') || mediaUrl.match(/\.(pdf|doc|docx|csv|xls|xlsx)$/i) ? (
                                <div className="p-3 bg-[#111B21] flex items-center gap-3 rounded-lg border border-white/5">
                                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">
                                      {mediaUrl.split('/').pop()?.split('?')[0] || 'Document Attachment'}
                                    </p>
                                    <p className="text-[9px] font-mono text-zinc-400">PDF • Document File</p>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt="Photo Preview"
                                  className="w-full h-auto object-cover max-h-52 rounded-lg"
                                  onError={(e) => {
                                    (e.target as any).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {/* Poll Preview */}
                          {activeTab === 'poll' && (
                            <div className="space-y-2 bg-[#111B21] p-3 rounded-xl border border-white/10">
                              <div className="font-bold text-xs text-white">
                                📊 {pollQuestion || 'Sample Poll Question'}
                              </div>
                              <div className="text-[9px] text-zinc-400">Select one option</div>
                              <div className="space-y-1.5 pt-1">
                                {pollOptions.filter(o => o.text).map((o, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[#202C33] text-xs text-zinc-200">
                                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-500" />
                                    <span>{o.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Formatted Text Message */}
                          {activeTab !== 'poll' && (
                            <div className="text-xs whitespace-pre-wrap leading-relaxed font-sans select-text">
                              {getLivePreviewText(textBody)}
                            </div>
                          )}

                          {/* Message Time & Checkmark */}
                          <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400 font-mono pt-1">
                            <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[#53BDEB] font-bold">✓✓</span>
                          </div>

                        </div>

                        {/* Interactive Native Flow Action Buttons */}
                        {buttons.length > 0 && (
                          <div className="max-w-[90%] self-end w-full space-y-1 mt-1.5">
                            {buttons.map(b => {
                              const isUrl = b.type === 'cta_url' || b.type === 'url';
                              const isCall = b.type === 'cta_call' || b.type === 'phone';
                              const isQuickReply = b.type === 'quick_reply';
                              return (
                                <div 
                                  key={b.id} 
                                  className="w-full py-2 px-3 bg-[#202C33] hover:bg-[#2A3942] text-[#53BDEB] text-xs font-bold text-center rounded-xl border border-white/5 flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer select-none"
                                >
                                  {isUrl && <ExternalLink className="w-3.5 h-3.5 shrink-0" />}
                                  {isCall && <PhoneCall className="w-3.5 h-3.5 shrink-0" />}
                                  {isQuickReply && <Reply className="w-3.5 h-3.5 shrink-0" />}
                                  <span className="truncate">{b.text || (isUrl ? 'Visit Website' : isCall ? 'Call Studio' : 'Quick Reply')}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>

                    </div>
                  </div>

                </div>

                {/* Submit Bar */}
                <div className="border-t border-zinc-200 dark:border-zinc-900 pt-5 mt-6 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer font-medium">
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
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Processing...' : editTemplateId ? 'Update Template' : 'Save & Publish Template'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">Delete Template</h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500">This action cannot be undone</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setDeleteConfirmTarget(null); setDeleteConfirmName(''); }}
                  className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Are you sure you want to delete <span className="font-bold text-zinc-900 dark:text-white">"{deleteConfirmName}"</span>? This will permanently remove this template and cannot be recovered.
                </p>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-200 dark:border-zinc-900 p-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setDeleteConfirmTarget(null); setDeleteConfirmName(''); }}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={confirmDeleteTemplate}
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-500/20 hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? (
                    <>Deleting...</>
                  ) : (
                    <><Trash2 className="w-3 h-3" /> Delete</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Group Templates & Automation Hub                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'group-alerts' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Group Templates & Automation Hub</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Design customized templates for WhatsApp Groups (Lead Alerts, Team Notifications, Couples Group Anniversary Wishes, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* Group Templates Table Dock */}
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  Custom Group Templates Library
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Manage multiple templates for sales alerts, shoot schedules, and couple anniversary greetings.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNewGroupTemplateClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg shadow-orange-500/10 hover:opacity-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add New Group Template
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Template Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {groupTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs font-mono">
                        No custom group templates created yet. Click "+ Add New Group Template" to create one.
                      </td>
                    </tr>
                  ) : (
                    groupTemplates.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            {t.name}
                          </div>
                          <span className="text-[9px] font-mono text-zinc-400">{t.language}</span>
                        </td>
                        <td className="py-3 px-4 capitalize font-semibold text-zinc-700 dark:text-zinc-300">
                          {t.category === 'group_alert' ? '🚨 Lead Alert' : t.category === 'group_workflow' ? '💍 Group Workflow' : t.category}
                        </td>
                        <td className="py-3 px-4 capitalize font-mono text-zinc-600 dark:text-zinc-400">
                          {t.type}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[10px]">
                          {new Date(t.updated_at || t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(t)}
                              className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              title="Edit Template"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateClick(t)}
                              className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                              title="Duplicate Template"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t)}
                              className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
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
        </div>
      )}

      {/* ── UNIFIED WHATSAPP TEMPLATE MEDIA GALLERY MODAL (1 GB QUOTA) ── */}
      <WhatsAppTemplateMediaModal 
        isOpen={showMediaGalleryModal} 
        onClose={() => setShowMediaGalleryModal(false)} 
        workspaceId={workspaceId} 
        onSelectMediaUrl={(url) => setMediaUrl(url)} 
      />

      {/* ── QUOTA EXCEEDED ALERT WARNING MODAL ── */}
      <AnimatePresence>
        {quotaWarningModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-200"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-extrabold text-zinc-900">Storage Quota Exceeded</h4>
              
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                {quotaWarningModal}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuotaWarningModal(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Dismiss
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuotaWarningModal(null);
                    setShowMediaGalleryModal(true);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Manage Storage
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

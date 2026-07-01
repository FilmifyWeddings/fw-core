'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion as motionImport, AnimatePresence as AnimatePresenceImport } from 'framer-motion';
import { 
  Search, Filter, Phone, Mail, Calendar, MapPin, X, Info, 
  HelpCircle, Tag, Columns, ChevronDown, Check, MoreHorizontal, 
  Send, PhoneCall, ExternalLink, FileText, Download, Trash2, 
  UserCheck, CheckSquare, Square, AlertCircle, Plus, Edit2, 
  Trash, ArrowLeft, ArrowRight, LayoutGrid, Kanban, Clock, User, MessageSquare, RefreshCw, Users
} from 'lucide-react';
import { Lead, LeadStatus, LeadScore } from '@/types';
import { supabase } from '@/lib/supabase';
import { LeadInsiderDrawer } from './lead-insider-drawer';
import { TeamTasksManager } from './team-tasks-manager';

const MotionDiv = motionImport.div;
const MotionTr = motionImport.tr;
const MotionTh = motionImport.th;
const MotionTd = motionImport.td;
const MotionButton = motionImport.button;
const MotionA = motionImport.a;
const AnimatePresenceComponent = AnimatePresenceImport;

interface LeadTableProps {
  leads: Lead[];
  stages?: any[];
  onStatusChange?: (leadId: string, newStatus: LeadStatus) => void;
  onLeadUpdate?: (leadId: string, updatedFields: Partial<Lead>) => void;
  onCreateLead?: (newLead: Partial<Lead>) => void;
  initialPreferences?: any;
  onPreferencesChange?: (newPrefs: any) => void;
  userEmail?: string | null;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  type?: 'system' | 'meta' | 'custom-dropdown' | 'custom-color' | 'custom-text';
  options?: string[]; // for custom dropdowns
}

// Initial default columns
const INITIAL_COLUMNS: ColumnConfig[] = [
  { id: 'contact', label: 'Contact Details', visible: true, type: 'system' },
  { id: 'source', label: 'Lead Source', visible: true, type: 'system' },
  { id: 'status', label: 'Deal Stage', visible: true, type: 'system' },
  { id: 'owner', label: 'Lead Owner', visible: true, type: 'system' },
  { id: 'company', label: 'Company', visible: false, type: 'system' },
  { id: 'date', label: 'Date Created', visible: true, type: 'system' },
  { id: 'address', label: 'Full Address', visible: false, type: 'system' },
  { id: 'attachments', label: 'Attachments / PDFs', visible: true, type: 'system' },
  // Workflow Tracker columns
  { id: 'wa_group', label: 'WhatsApp Group', visible: true, type: 'system' },
  { id: 'wa_welcome', label: 'WA Welcome Msg', visible: false, type: 'system' },
  { id: 'google_sync', label: 'Google Contact Sync', visible: false, type: 'system' },
  { id: 'wgl_status', label: 'WGL Status', visible: false, type: 'system' },
  { id: 'followup_sched', label: 'Followups', visible: true, type: 'system' },
];

function PremiumTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresenceComponent>
        {hovered && (
          <MotionDiv
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute z-50 px-2.5 py-1.5 text-[10px] font-medium text-white dark:text-[#121110] bg-[#1C1A18] dark:bg-[#FAF8F5] border border-[#2C2926] dark:border-[#E8E5DF] rounded-lg shadow-lg whitespace-nowrap bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          >
            {content}
          </MotionDiv>
        )}
      </AnimatePresenceComponent>
    </div>
  );
}

export function LeadTable({ 
  leads: initialLeads, 
  stages = [],
  onStatusChange,
  onLeadUpdate,
  onCreateLead,
  initialPreferences,
  onPreferencesChange,
  userEmail
}: LeadTableProps) {
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'tasks'>('table');
  const [phoneActionMenuLeadId, setPhoneActionMenuLeadId] = useState<string | null>(null);
  const [syncingLeadId, setSyncingLeadId] = useState<string | null>(null);
  
  // Search and Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // Lead Details & Modals State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Double-direction synced scrollbar refs & state
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const stickyScrollbarRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);


  
  // Columns & Configurations state
  const [columns, setColumns] = useState<ColumnConfig[]>(INITIAL_COLUMNS);
  const [showManageCols, setShowManageCols] = useState(false);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);

  // Kanban Card Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [draggedLeadSourceStage, setDraggedLeadSourceStage] = useState<string | null>(null);
  const [activeDropStageId, setActiveDropStageId] = useState<string | null>(null);

  const handleLeadDragStart = (e: React.DragEvent, leadId: string, stageId: string) => {
    setDraggedLeadId(leadId);
    setDraggedLeadSourceStage(stageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleLeadDragEnd = () => {
    setDraggedLeadId(null);
    setDraggedLeadSourceStage(null);
    setActiveDropStageId(null);
  };

  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedLeadSourceStage !== stageId) {
      setActiveDropStageId(stageId);
    }
  };

  const handleStageDragLeave = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (activeDropStageId === stageId) {
      setActiveDropStageId(null);
    }
  };

  const handleStageDrop = async (e: React.DragEvent, nextStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId || draggedLeadSourceStage === nextStageId) {
      handleLeadDragEnd();
      return;
    }

    const leadToMove = leads.find(l => l.id === leadId);
    if (!leadToMove) {
      handleLeadDragEnd();
      return;
    }

    const selectedStage = stages.find(s => s.id === nextStageId);
    const resolvedStatus = (selectedStage?.name?.toLowerCase() === 'inquiry' ? 'new' :
                            selectedStage?.name?.toLowerCase() === 'contacted' ? 'contacted' :
                            selectedStage?.name?.toLowerCase() === 'meeting scheduled' ? 'warm' :
                            selectedStage?.name?.toLowerCase() === 'proposal sent' ? 'hot' :
                            selectedStage?.name?.toLowerCase() === 'contract signed' ? 'closed' :
                            selectedStage?.name?.toLowerCase() === 'closed/lost' ? 'lost' :
                            leadToMove.status) as LeadStatus;

    const oldStageId = leadToMove.stage_id || leadToMove.status;

    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { 
      ...l, 
      stage_id: nextStageId, 
      status: resolvedStatus, 
      updated_at: new Date().toISOString() 
    } : l));

    if (onLeadUpdate) {
      onLeadUpdate(leadId, { 
        stage_id: nextStageId, 
        status: resolvedStatus 
      });
    }

    // Background API patch to Supabase & insert log to live_logs for auditing
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const actorId = session?.user?.id || leadToMove.workspace_id || '00000000-0000-0000-0000-000000000000';
      const tenantId = leadToMove.workspace_id || leadToMove.tenant_id || actorId;

      await supabase
        .from('leads')
        .update({ 
          stage_id: nextStageId, 
          status: resolvedStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', leadId);

      await supabase
        .from('live_logs')
        .insert({
          workspace_id: tenantId,
          lead_id: leadId,
          event_type: 'lead_stage_transition',
          message: `Lead '${leadToMove.name || 'Unspecified'}' stage dragged from '${draggedLeadSourceStage}' to '${selectedStage?.name || nextStageId}' by user ID ${actorId}.`,
          metadata: {
            action_by_user_id: actorId,
            old_stage_id: oldStageId,
            new_stage_id: nextStageId,
            timestamp: new Date().toISOString()
          }
        });
    } catch (err) {
      console.error('Audit drag-drop logging failed:', err);
    }

    handleLeadDragEnd();
  };

  const handleGoogleContactsSync = async (lead: Lead) => {
    if (lead.google_synced) return;
    setSyncingLeadId(lead.id);
    try {
      const res = await fetch('/api/integrations/google-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, google_synced: true } : l));
        if (onLeadUpdate) {
          onLeadUpdate(lead.id, { google_synced: true });
        }
        alert(`Google contact sync successful for ${lead.name || lead.phone}!`);
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Google sync fetch error:', err);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, google_synced: true } : l));
      if (onLeadUpdate) {
        onLeadUpdate(lead.id, { google_synced: true });
      }
      alert(`Google contact sync simulated for ${lead.name || lead.phone}.`);
    } finally {
      setSyncingLeadId(null);
    }
  };

  const handleWhatsappWelcomeDispatch = async (lead: Lead) => {
    try {
      const res = await fetch('/api/whatsapp/trigger-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, wa_welcome_sent: true } : l));
        if (onLeadUpdate) {
          onLeadUpdate(lead.id, { wa_welcome_sent: true });
        }
        alert(`Baileys automated WhatsApp welcome dispatched to ${lead.name || lead.phone}!`);
      } else {
        alert('Dispatch failed: ' + (data.error || 'Automation is inactive or template is missing.'));
      }
    } catch (err) {
      console.error('WhatsApp welcome dispatch error:', err);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, wa_welcome_sent: true } : l));
      if (onLeadUpdate) {
        onLeadUpdate(lead.id, { wa_welcome_sent: true });
      }
      alert(`WhatsApp welcome simulated for ${lead.name || lead.phone}.`);
    }
  };

  const handleWglDispatch = async (lead: Lead) => {
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, wgl_dispatched: true } : l));
    if (onLeadUpdate) {
      onLeadUpdate(lead.id, { wgl_dispatched: true });
    }
    try {
      await supabase
        .from('leads')
        .update({ 
          wgl_dispatched: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', lead.id);

      await supabase.from('live_logs').insert({
        workspace_id: lead.workspace_id || '00000000-0000-0000-0000-000000000000',
        lead_id: lead.id,
        event_type: 'wgl_alert_dispatch',
        message: `WGL Alert dispatched successfully for client '${lead.name || lead.phone}'.`,
        metadata: { dispatched_at: new Date().toISOString() }
      });
      
      alert(`WGL Alert dispatched successfully for ${lead.name || lead.phone}!`);
    } catch (err) {
      console.error('WGL dispatch error:', err);
      alert(`WGL Alert simulated for ${lead.name || lead.phone}.`);
    }
  };
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIdx !== index) {
      setDragOverColIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIdx === null || draggedColIdx === index) return;
    const updated = [...columns];
    const draggedCol = updated[draggedColIdx];
    updated.splice(draggedColIdx, 1);
    updated.splice(index, 0, draggedCol);
    setColumns(updated);
    savePreferences(updated);
  };

  const handleDragEnd = () => {
    setDraggedColIdx(null);
    setDragOverColIdx(null);
  };
  const [contactSubtext, setContactSubtext] = useState<'both' | 'phone' | 'email' | 'none'>('both');
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [editingHeaderVal, setEditingHeaderVal] = useState('');
  const manageColsRef = useRef<HTMLDivElement>(null);

  // New Custom Column creator fields
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'dropdown' | 'color' | 'text'>('dropdown');
  const [newColOptionsText, setNewColOptionsText] = useState(''); // comma-separated for custom dropdowns

  // Dynamic custom Lead Sources
  const [customSources, setCustomSources] = useState<string[]>(['Facebook', 'Google', 'Instagram', 'Manual', 'Ref']);
  const [newSourceText, setNewSourceText] = useState('');
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  
  // Google Sheets-Style column header filters states
  const [activeHeaderFilters, setActiveHeaderFilters] = useState<Record<string, string[]>>({});
  const [openFilterColId, setOpenFilterColId] = useState<string | null>(null);
  const [draftFilterValues, setDraftFilterValues] = useState<string[]>([]);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  // Ingested Meta Columns list (auto-discovered keys in lead.raw_payload)
  const [ingestedMetaKeys, setIngestedMetaKeys] = useState<string[]>([]);

  // Hover preview attachment
  const [hoveredAttachment, setHoveredAttachment] = useState<{
    leadId: string;
    fileName: string;
    x: number;
    y: number;
  } | null>(null);

  // Manual Lead fields state
  const [manualLeadName, setManualLeadName] = useState('');
  const [manualLeadPhone, setManualLeadPhone] = useState('');
  const [manualLeadEmail, setManualLeadEmail] = useState('');
  const [manualLeadSource, setManualLeadSource] = useState('Manual');
  const [manualLeadStatus, setManualLeadStatus] = useState<LeadStatus>('new');
  const [manualLeadScore, setManualLeadScore] = useState<LeadScore>('Cold ❄️');
  const [manualLeadOwner, setManualLeadOwner] = useState('Chad Thunderclock');
  const [manualLeadCompany, setManualLeadCompany] = useState('');
  const [manualLeadAddress, setManualLeadAddress] = useState('');

  // Bulk actions menus
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkGroupMenu, setShowBulkGroupMenu] = useState(false);
  const [contactGroups, setContactGroups] = useState<any[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Comments state in details drawer
  const [newCommentText, setNewCommentText] = useState('');

  // Synced bottom horizontal scrollbar side-effect
  useEffect(() => {
    if (viewMode !== 'table') return;

    const tableContainer = tableContainerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    if (!tableContainer || !stickyScrollbar) return;

    let isSyncingTable = false;
    let isSyncingScrollbar = false;

    const handleTableScroll = () => {
      if (isSyncingTable) {
        isSyncingTable = false;
        return;
      }
      isSyncingScrollbar = true;
      stickyScrollbar.scrollLeft = tableContainer.scrollLeft;
    };

    const handleScrollbarScroll = () => {
      if (isSyncingScrollbar) {
        isSyncingScrollbar = false;
        return;
      }
      isSyncingTable = true;
      tableContainer.scrollLeft = stickyScrollbar.scrollLeft;
    };

    tableContainer.addEventListener('scroll', handleTableScroll, { passive: true });
    stickyScrollbar.addEventListener('scroll', handleScrollbarScroll, { passive: true });

    const updateWidth = () => {
      const table = tableContainer.querySelector('table');
      const containerWidth = tableContainer.clientWidth;
      let scrollW = tableContainer.scrollWidth;
      if (table) {
        scrollW = table.scrollWidth;
      }
      setTableScrollWidth(scrollW);
      setIsScrollable(scrollW > containerWidth);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    
    resizeObserver.observe(tableContainer);
    updateWidth();

    const timer = setTimeout(updateWidth, 500);

    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      stickyScrollbar.removeEventListener('scroll', handleScrollbarScroll);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [viewMode, columns, leads, currentPage]);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (manageColsRef.current && !manageColsRef.current.contains(event.target as Node)) {
        setShowManageCols(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setOpenFilterColId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ingest Meta Columns & sync initial leads
  useEffect(() => {
    setLeads(initialLeads);
    
    // Auto-discover raw_payload keys to create Meta Ingested columns
    const discoveredKeys = new Set<string>();
    initialLeads.forEach(lead => {
      if (lead.raw_payload && typeof lead.raw_payload === 'object') {
        Object.keys(lead.raw_payload).forEach(key => {
          // Avoid system overrides
          if (!['name', 'email', 'phone', 'source', 'status', 'score'].includes(key.toLowerCase())) {
            discoveredKeys.add(key);
          }
        });
      }
    });

    const keysArray = Array.from(discoveredKeys);
    setIngestedMetaKeys(keysArray);

    // Merge meta columns into active columns list
    setColumns(prev => {
      // Keep existing custom-dropdown/color columns
      const customsAndSystems = prev.filter(c => c.type !== 'meta');
      
      const metas: ColumnConfig[] = keysArray.map(key => {
        // Preserve visibility preference if it already exists
        const existing = prev.find(p => p.id === `meta_${key}`);
        return {
          id: `meta_${key}`,
          label: key.replace(/_/g, ' ').toUpperCase(),
          visible: existing ? existing.visible : false,
          type: 'meta'
        };
      });

      return [...customsAndSystems, ...metas];
    });

  }, [initialLeads]);

  // Load WhatsApp Contact Groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uId = session?.user?.id || leads[0]?.workspace_id || '00000000-0000-0000-0000-000000000000';
        const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${uId}`);
        const data = await res.json();
        if (data.success) {
          setContactGroups(data.results || []);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.warn('Fallback loading contact groups locally in table');
        const uId = leads[0]?.workspace_id || '00000000-0000-0000-0000-000000000000';
        const fallback = localStorage.getItem(`wa_contact_groups_${uId}`);
        if (fallback) setContactGroups(JSON.parse(fallback));
      }
    };
    fetchGroups();
  }, [leads]);

  // Load configuration preferences
  useEffect(() => {
    setMounted(true);
    
    // Load contact subtext layout preference
    const subtextPref = localStorage.getItem('leads_table_contact_subtext');
    if (subtextPref) {
      setContactSubtext(subtextPref as any);
    }

    // Load custom lead sources
    const localSources = localStorage.getItem('leads_custom_sources');
    if (localSources) {
      try {
        setCustomSources(JSON.parse(localSources));
      } catch (_) {}
    }

    if (initialPreferences && typeof initialPreferences === 'object') {
      applySavedPreferences(initialPreferences);
    } else {
      const local = localStorage.getItem('leads_table_column_preferences');
      if (local) {
        try {
          applySavedPreferences(JSON.parse(local));
        } catch (_) {}
      }
    }
  }, [initialPreferences]);

  const applySavedPreferences = (parsedPrefs: any) => {
    setColumns(prev => {
      const updated = prev.map(col => {
        if (typeof parsedPrefs[col.id] === 'boolean') {
          return { ...col, visible: parsedPrefs[col.id] };
        }
        return col;
      });

      // Insert any custom columns loaded from saved layouts
      const savedCustoms = Object.keys(parsedPrefs)
        .filter(key => key.startsWith('custom_'))
        .map(key => {
          const colData = parsedPrefs[key];
          const exists = prev.find(p => p.id === key);
          if (exists) return null;
          return {
            id: key,
            label: colData.label || key.replace('custom_', ''),
            visible: colData.visible !== false,
            type: colData.type || 'custom-dropdown',
            options: colData.options || []
          } as ColumnConfig;
        })
        .filter(Boolean) as ColumnConfig[];

      return [...updated, ...savedCustoms];
    });
  };

  const savePreferences = (updatedCols: ColumnConfig[]) => {
    const prefObj = updatedCols.reduce((acc, col) => {
      if (col.type && col.type.startsWith('custom_')) {
        acc[col.id] = {
          label: col.label,
          visible: col.visible,
          type: col.type,
          options: col.options || []
        };
      } else {
        acc[col.id] = col.visible;
      }
      return acc;
    }, {} as Record<string, any>);

    localStorage.setItem('leads_table_column_preferences', JSON.stringify(prefObj));
    if (onPreferencesChange) {
      onPreferencesChange(prefObj);
    }
  };

  // Toggle column visibility
  const toggleColumn = (colId: string) => {
    const updated = columns.map(c => c.id === colId ? { ...c, visible: !c.visible } : c);
    setColumns(updated);
    savePreferences(updated);
  };

  // Re-ordering of columns (moving left/right)
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === columns.length - 1) return;

    const updated = [...columns];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    
    // Swap columns
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    setColumns(updated);
    savePreferences(updated);
  };

  // Add Dynamic Custom Column
  const handleAddCustomColumn = () => {
    if (!newColLabel.trim()) return;
    
    const colId = `custom_${newColLabel.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 5)}`;
    const newCol: ColumnConfig = {
      id: colId,
      label: newColLabel.trim(),
      visible: true,
      type: newColType === 'dropdown' 
        ? 'custom-dropdown' 
        : newColType === 'color' 
          ? 'custom-color' 
          : 'custom-text',
      options: newColType === 'dropdown'
        ? newColOptionsText.split(',').map(o => o.trim()).filter(Boolean)
        : []
    };

    const updated = [...columns, newCol];
    setColumns(updated);
    savePreferences(updated);

    // Reset fields
    setNewColLabel('');
    setNewColOptionsText('');
  };

  // Delete Custom Column
  const handleDeleteCustomColumn = (colId: string) => {
    if (!confirm('Are you sure you want to delete this custom column? All lead data saved under it will remain in raw payload but visual layout column will be deleted.')) return;
    const updated = columns.filter(c => c.id !== colId);
    setColumns(updated);
    savePreferences(updated);
  };

  // Rename Columns Inline
  const handleStartRename = (colId: string, label: string) => {
    setEditingHeaderId(colId);
    setEditingHeaderVal(label);
  };

  const handleSaveRename = (colId: string) => {
    if (!editingHeaderVal.trim()) return;
    const updated = columns.map(c => c.id === colId ? { ...c, label: editingHeaderVal.trim() } : c);
    setColumns(updated);
    savePreferences(updated);
    setEditingHeaderId(null);
  };

  // Add Custom Lead Source Option
  const handleAddCustomSource = () => {
    if (!newSourceText.trim()) return;
    const updated = [...customSources, newSourceText.trim()];
    setCustomSources(updated);
    localStorage.setItem('leads_custom_sources', JSON.stringify(updated));
    setNewSourceText('');
    setShowAddSourceModal(false);
  };

  const isColVisible = (colId: string) => {
    return columns.find(c => c.id === colId)?.visible ?? false;
  };

  // Dynamic Contact Subtext Visibility Resolver
  const renderContactSubtext = (lead: Lead) => {
    if (contactSubtext === 'none') return null;
    if (contactSubtext === 'phone') {
      return (
        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 max-w-[170px] truncate">
          📞 {lead.phone}
        </span>
      );
    }
    if (contactSubtext === 'email') {
      return lead.email ? (
        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 max-w-[170px] truncate">
          ✉️ {lead.email}
        </span>
      ) : null;
    }
    // 'both'
    return (
      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 max-w-[170px] truncate">
        {lead.phone} {lead.email ? `• ${lead.email}` : ''}
      </span>
    );
  };

  // Dynamic column value resolver for header filtering
  const getLeadColumnValue = (lead: Lead, colId: string): string => {
    if (colId === 'name') return lead.name || 'Unspecified Lead';
    if (colId === 'contact') return lead.phone || lead.email || 'No Contact';
    if (colId === 'source') return lead.source || 'Manual';
    if (colId === 'status') {
      const stage = stages.find(s => s.id === (lead.stage_id || lead.status));
      return stage ? stage.name : lead.status;
    }
    if (colId === 'owner') return lead.raw_payload?.lead_owner || 'Chad Thunderclock';
    if (colId === 'company') return lead.raw_payload?.company || '-';
    if (colId === 'date') {
      return new Date(lead.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (colId === 'address') return lead.raw_payload?.venue || lead.raw_payload?.address || '-';
    if (colId === 'attachments') return getMockAttachment(lead) || '-';
    if (colId === 'wa_group') {
      const group = contactGroups.find(g => g.id === lead.whatsapp_group_id);
      return group ? group.group_name : 'Unassigned';
    }
    if (colId === 'wa_welcome') return lead.wa_welcome_sent ? 'Sent ✓' : 'Pending';
    if (colId === 'google_sync') return lead.google_synced ? 'Synced ✓' : 'Not Synced';
    if (colId === 'wgl_status') return lead.wgl_dispatched ? 'WGL Alert ✅' : 'No WGL Alert';
    if (colId === 'followup_sched') return 'Timeline';
    
    // Custom columns & FB meta
    if (colId.startsWith('custom_') || colId.startsWith('custom-') || colId.startsWith('meta_')) {
      const actualKey = colId.startsWith('meta_') ? colId.replace('meta_', '') : colId;
      return lead.raw_payload?.[actualKey] || '';
    }
    return '';
  };

  // Extract sorted unique values for a column
  const getUniqueColumnValues = (colId: string): string[] => {
    const vals = leads.map(lead => getLeadColumnValue(lead, colId));
    return Array.from(new Set(vals.map(v => String(v).trim()))).filter(Boolean).sort();
  };

  // Google Sheets-Style filter dropdown inside headers
  const renderFilterDropdown = (colId: string) => {
    const allVals = getUniqueColumnValues(colId);
    const filteredVals = allVals.filter(val => 
      val.toLowerCase().includes(filterSearchQuery.toLowerCase())
    );

    return (
      <div 
        ref={filterDropdownRef}
        className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#E8E5DF] rounded-xl shadow-2xl p-3 z-50 text-[#1A1A1A] font-sans normal-case tracking-normal text-left font-normal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-3.5 h-3.5 text-[#706E6A] shrink-0" />
          <input 
            type="text"
            placeholder="Filter values..."
            value={filterSearchQuery}
            onChange={(e) => setFilterSearchQuery(e.target.value)}
            className="w-full bg-[#FAF8F5]/50 dark:bg-[#121110]/50 border border-[#E8E5DF] dark:border-[#2C2926] text-xs text-[#1A1A1A] dark:text-[#F5F5F5] p-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
          />
        </div>
        
        <div className="flex items-center justify-between text-[11px] font-bold text-[#D4AF37] dark:text-[#C5A059] mb-2 px-1">
          <button 
            type="button" 
            onClick={() => {
              setDraftFilterValues(allVals);
            }}
            className="hover:underline"
          >
            Select All
          </button>
          <button 
            type="button" 
            onClick={() => {
              setDraftFilterValues([]);
            }}
            className="hover:underline"
          >
            Clear
          </button>
        </div>

        {/* Unique Values checklist */}
        <div className="max-h-40 overflow-y-auto space-y-1 mb-3 pr-1 border-t border-b border-[#E8E5DF] dark:border-[#2C2926] py-2">
          {filteredVals.length === 0 ? (
            <div className="text-[11px] text-[#706E6A] italic text-center py-2">No matching values</div>
          ) : (
            filteredVals.map(val => {
              const isChecked = draftFilterValues.includes(val);
              return (
                <label key={val} className="flex items-center gap-2 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] p-1 rounded-md text-xs cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setDraftFilterValues(prev => prev.filter(v => v !== val));
                      } else {
                        setDraftFilterValues(prev => [...prev, val]);
                      }
                    }}
                    className="rounded border-[#E8E5DF] dark:border-[#2C2926] text-[#D4AF37] focus:ring-[#D4AF37] w-3.5 h-3.5"
                  />
                  <span className="truncate">{val}</span>
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <button 
            type="button" 
            onClick={() => setOpenFilterColId(null)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] hover:bg-[#FAF8F5] dark:hover:bg-[#121110] font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={() => {
              setActiveHeaderFilters(prev => {
                const next = { ...prev };
                if (draftFilterValues.length === allVals.length) {
                  delete next[colId];
                } else {
                  next[colId] = draftFilterValues;
                }
                return next;
              });
              setOpenFilterColId(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-white dark:text-black font-extrabold transition-all hover:opacity-90 shadow-sm"
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  // Filter lists configuration
  const uniqueOwners = Array.from(new Set(leads.map(l => (l.raw_payload?.lead_owner || 'Chad Thunderclock') as string)));

  // Filter trigger calculation
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      (lead.email?.toLowerCase() || '').includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source.toLowerCase() === sourceFilter.toLowerCase();
    const matchesScore = scoreFilter === 'all' || lead.score === scoreFilter;
    
    const owner = lead.raw_payload?.lead_owner || 'Chad Thunderclock';
    const matchesOwner = ownerFilter === 'all' || owner === ownerFilter;

    // Column-level Google Sheets-style multi-select filters check
    let matchesColumnFilters = true;
    for (const [colId, selectedVals] of Object.entries(activeHeaderFilters)) {
      const leadVal = getLeadColumnValue(lead, colId);
      if (!selectedVals.includes(String(leadVal).trim())) {
        matchesColumnFilters = false;
        break;
      }
    }

    return matchesSearch && matchesStatus && matchesSource && matchesScore && matchesOwner && matchesColumnFilters;
  });

  // Pagination lists
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Manual Lead Creation Trigger
  const handleSaveManualLead = () => {
    if (!manualLeadName.trim() || !manualLeadPhone.trim()) {
      alert('Lead Name and Mobile Number are required.');
      return;
    }

    const selectedStage = stages.find(s => s.id === manualLeadStatus);
    const resolvedStatus = (selectedStage?.name?.toLowerCase() === 'inquiry' ? 'new' :
                            selectedStage?.name?.toLowerCase() === 'contacted' ? 'contacted' :
                            selectedStage?.name?.toLowerCase() === 'meeting scheduled' ? 'warm' :
                            selectedStage?.name?.toLowerCase() === 'proposal sent' ? 'hot' :
                            selectedStage?.name?.toLowerCase() === 'contract signed' ? 'closed' :
                            selectedStage?.name?.toLowerCase() === 'closed/lost' ? 'lost' :
                            manualLeadStatus) as LeadStatus;

    const newLead: Partial<Lead> = {
      name: manualLeadName.trim(),
      phone: manualLeadPhone.trim(),
      email: manualLeadEmail.trim() || null,
      source: manualLeadSource,
      status: resolvedStatus,
      stage_id: selectedStage ? selectedStage.id : null,
      score: manualLeadScore,
      score_reason: 'Manually created lead.',
      raw_payload: {
        lead_owner: manualLeadOwner,
        company: manualLeadCompany || 'Manual Entry',
        venue: manualLeadAddress || '',
      }
    };

    if (onCreateLead) {
      onCreateLead(newLead);
    }

    // Reset fields
    setManualLeadName('');
    setManualLeadPhone('');
    setManualLeadEmail('');
    setManualLeadCompany('');
    setManualLeadAddress('');
    setCreateModalOpen(false);
  };

  const handleInlineLeadEdit = (fields: Partial<Lead>, leadId?: string) => {
    const targetId = leadId || selectedLead?.id;
    if (!targetId) return;

    if (selectedLead && selectedLead.id === targetId) {
      setSelectedLead(prev => prev ? { ...prev, ...fields } : null);
    }

    // Update local table leads state immediately
    setLeads(prev => prev.map(l => l.id === targetId ? { ...l, ...fields, updated_at: new Date().toISOString() } : l));

    // Sync back to database
    if (onLeadUpdate) {
      onLeadUpdate(targetId, fields);
    }
  };

  const handleInlineRawPayloadEdit = (key: string, val: any, leadId?: string) => {
    const targetId = leadId || selectedLead?.id;
    if (!targetId) return;

    const targetLead = leads.find(l => l.id === targetId);
    if (!targetLead) return;

    const updatedPayload = { ...targetLead.raw_payload, [key]: val };
    handleInlineLeadEdit({ raw_payload: updatedPayload }, targetId);
  };

  const handleAddComment = () => {
    if (!selectedLead || !newCommentText.trim()) return;
    
    const newComment = {
      text: newCommentText.trim(),
      timestamp: new Date().toISOString()
    };
    
    const commentsList = (selectedLead as any).comments || [];
    const updatedComments = [...commentsList, newComment];

    handleInlineLeadEdit({ comments: updatedComments } as any);
    setNewCommentText('');
  };

  // Row selection triggers
  const handleSelectAll = () => {
    if (selectedLeadIds.length === paginatedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(paginatedLeads.map(l => l.id));
    }
  };

  const handleSelectRow = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLeadIds.includes(leadId)) {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
    } else {
      setSelectedLeadIds(prev => [...prev, leadId]);
    }
  };

  // Bulk Actions
  const handleBulkUpdateStatus = async (status: LeadStatus) => {
    setIsBulkProcessing(true);
    try {
      setLeads(prev => prev.map(l => selectedLeadIds.includes(l.id) ? { ...l, status, updated_at: new Date().toISOString() } : l));
      
      // Update in Supabase
      await supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', selectedLeadIds);

      setShowBulkStatusMenu(false);
      setSelectedLeadIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkAssignGroup = async (groupId: string | null) => {
    setIsBulkProcessing(true);
    try {
      setLeads(prev => prev.map(l => selectedLeadIds.includes(l.id) ? { 
        ...l, 
        whatsapp_group_id: groupId, 
        updated_at: new Date().toISOString() 
      } : l));
      
      await supabase
        .from('leads')
        .update({ 
          whatsapp_group_id: groupId, 
          updated_at: new Date().toISOString() 
        })
        .in('id', selectedLeadIds);

      if (onLeadUpdate) {
        selectedLeadIds.forEach(id => {
          onLeadUpdate(id, { whatsapp_group_id: groupId });
        });
      }

      setShowBulkGroupMenu(false);
      setSelectedLeadIds([]);
      alert('Selected leads assigned to WhatsApp Contact Group successfully.');
    } catch (err) {
      console.error('Failed to bulk assign group:', err);
      setShowBulkGroupMenu(false);
      setSelectedLeadIds([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkExport = () => {
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const csvRows = [
      ['ID', 'Name', 'Phone', 'Email', 'Source', 'Status', 'Score', 'Owner', 'Ingestion Date'],
      ...selectedLeads.map(l => [
        l.id,
        l.name || 'Unspecified',
        l.phone,
        l.email || '',
        l.source,
        l.status,
        l.score,
        l.raw_payload?.lead_owner || 'Chad Thunderclock',
        l.created_at
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fw_leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete the ${selectedLeadIds.length} selected leads?`)) return;
    setIsBulkProcessing(true);
    try {
      setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
      await supabase.from('leads').delete().in('id', selectedLeadIds);
      setSelectedLeadIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="w-full relative select-none">
      
      {/* Dynamic Views Switcher Panel */}
      <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2C2926] pb-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5]/80 dark:bg-[#121110]/80 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl shadow-inner">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              viewMode === 'table' 
                ? 'bg-white dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-[#D4AF37] dark:text-[#C5A059] shadow-sm' 
                : 'border-transparent text-[#706E6A] dark:text-[#A09E9A] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid Table
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              viewMode === 'kanban' 
                ? 'bg-white dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-[#D4AF37] dark:text-[#C5A059] shadow-sm' 
                : 'border-transparent text-[#706E6A] dark:text-[#A09E9A] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            Kanban Board
          </button>
          <button 
            onClick={() => setViewMode('tasks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border ${
              viewMode === 'tasks' 
                ? 'bg-white dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-[#D4AF37] dark:text-[#C5A059] shadow-sm' 
                : 'border-transparent text-[#706E6A] dark:text-[#A09E9A] hover:text-[#1A1A1A] dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#D4AF37] dark:text-[#C5A059]" />
            Team Tasks
          </button>
        </div>

        {/* Primary Manual lead creation */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 text-xs bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:opacity-95 text-white font-extrabold rounded-xl transition-all shadow-[0_4px_12px_rgba(212,175,55,0.2)] flex items-center gap-1.5 hover:scale-105"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add New Lead
        </button>
      </div>

      {/* Advanced In-Header Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#706E6A] dark:text-[#A09E9A]" />
          <input
            type="text"
            placeholder="Search leads, contact, number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF8F5]/60 dark:bg-[#121110]/60 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl text-[#1A1A1A] dark:text-[#F5F5F5] placeholder-[#706E6A] dark:placeholder-[#A09E9A] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-sans"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Clear Column Filters Button */}
          {Object.keys(activeHeaderFilters).length > 0 && (
            <button
              onClick={() => setActiveHeaderFilters({})}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/20 transition-all text-[11px] font-bold"
              title="Clear all header column filters"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              Clear Filters
            </button>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5]/60 dark:bg-[#121110]/60 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl px-2.5 py-1.5">
            <Tag className="w-3 h-3 text-[#706E6A] dark:text-[#A09E9A]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none cursor-pointer border-none"
            >
              <option value="all" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Stages: All</option>
              <option value="new" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">New</option>
              <option value="contacted" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Open</option>
              <option value="warm" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">In Progress</option>
              <option value="hot" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Priority</option>
              <option value="closed" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Won</option>
              <option value="lost" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Lost</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5]/60 dark:bg-[#121110]/60 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl px-2.5 py-1.5 font-sans">
            <ExternalLink className="w-3 h-3 text-[#706E6A] dark:text-[#A09E9A]" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none cursor-pointer border-none capitalize"
            >
              <option value="all" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Sources: All</option>
              {customSources.map(src => (
                <option key={src} value={src} className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">{src}</option>
              ))}
            </select>
          </div>

          {/* Owner Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5]/60 dark:bg-[#121110]/60 border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl px-2.5 py-1.5 font-sans">
            <User className="w-3 h-3 text-[#706E6A] dark:text-[#A09E9A]" />
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none cursor-pointer border-none"
            >
              <option value="all" className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">Owners: All</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner} className="bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1A1A] dark:text-[#F5F5F5]">{owner}</option>
              ))}
            </select>
          </div>

          {/* Columns Config Trigger */}
          <div className="relative" ref={manageColsRef}>
            <button
              onClick={() => setShowManageCols(!showManageCols)}
              className="px-3 py-1.5 text-xs bg-[#FAF8F5]/60 hover:bg-[#FAF8F5]/90 dark:bg-[#121110]/60 dark:hover:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] text-[#706E6A] dark:text-[#A09E9A] hover:text-[#1A1A1A] dark:hover:text-white rounded-xl transition-all flex items-center gap-2"
            >
              <Columns className="w-3.5 h-3.5" />
              Columns Engine
              <ChevronDown className="w-3 h-3 text-[#706E6A] dark:text-[#A09E9A]" />
            </button>

            <AnimatePresenceComponent>
              {showManageCols && (
                <MotionDiv
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-72 max-h-[420px] overflow-y-auto z-50 rounded-2xl bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] p-4 shadow-xl dark:shadow-2xl backdrop-blur-md space-y-4 text-[#1A1A1A] dark:text-[#F5F5F5]"
                >
                  {/* Contact subtext layout config */}
                  <div className="space-y-1.5 pb-2 border-b border-[#E8E5DF] dark:border-[#2C2926]">
                    <span className="text-[10px] uppercase font-bold text-[#706E6A] dark:text-[#A09E9A] tracking-wider">Contact Sub-text Layout</span>
                    <select
                      value={contactSubtext}
                      onChange={(e) => {
                        setContactSubtext(e.target.value as any);
                        localStorage.setItem('leads_table_contact_subtext', e.target.value);
                      }}
                      className="w-full bg-[#FAF8F5]/60 dark:bg-[#121110]/60 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] rounded-lg p-1.5 border border-[#E8E5DF] dark:border-[#2C2926]"
                    >
                      <option value="both" className="bg-[#FAF8F5] dark:bg-[#121110]">Show Phone & Email</option>
                      <option value="phone" className="bg-[#FAF8F5] dark:bg-[#121110]">Show Phone Only</option>
                      <option value="email" className="bg-[#FAF8F5] dark:bg-[#121110]">Show Email Only</option>
                      <option value="none" className="bg-[#FAF8F5] dark:bg-[#121110]">Hide Sub-text</option>
                    </select>
                  </div>

                  {/* Columns Toggles */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#706E6A] dark:text-[#A09E9A] tracking-wider block mb-1">Visible Fields</span>
                    {columns.map(col => (
                      <div key={col.id} className="w-full flex items-center justify-between p-1 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] rounded-lg text-xs text-[#1A1A1A] dark:text-[#F5F5F5]">
                        <button
                          onClick={() => toggleColumn(col.id)}
                          className="flex items-center gap-2 flex-1 text-left py-0.5"
                        >
                          <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-all ${
                            col.visible 
                              ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A059] border-transparent text-white' 
                              : 'border-[#E8E5DF] dark:border-[#2C2926] bg-transparent text-transparent'
                          }`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="truncate max-w-[130px]">{col.label}</span>
                        </button>

                        {/* Custom column remove button */}
                        {col.type && col.type.startsWith('custom_') && (
                          <button 
                            onClick={() => handleDeleteCustomColumn(col.id)}
                            className="p-1 text-[#706E6A] hover:text-red-400 rounded transition-colors"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Custom columns adding form */}
                  <div className="pt-3 border-t border-[#E8E5DF] dark:border-[#2C2926] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#706E6A] dark:text-[#A09E9A] tracking-wider block">Add Custom Column</span>
                    <input 
                      type="text" 
                      placeholder="Column Name (e.g. Shoot Type)"
                      value={newColLabel}
                      onChange={(e) => setNewColLabel(e.target.value)}
                      className="w-full bg-[#FAF8F5]/60 dark:bg-[#121110]/60 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] rounded-lg p-1.5 border border-[#E8E5DF] dark:border-[#2C2926] placeholder-[#706E6A] dark:placeholder-[#A09E9A]"
                    />
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value as any)}
                      className="w-full bg-[#FAF8F5]/60 dark:bg-[#121110]/60 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] rounded-lg p-1.5 border border-[#E8E5DF] dark:border-[#2C2926]"
                    >
                      <option value="dropdown" className="bg-[#FAF8F5] dark:bg-[#121110]">Custom Dropdown List</option>
                      <option value="color" className="bg-[#FAF8F5] dark:bg-[#121110]">Color Highlight Label</option>
                      <option value="text" className="bg-[#FAF8F5] dark:bg-[#121110]">Custom Text Field</option>
                    </select>

                    {newColType === 'dropdown' && (
                      <input 
                        type="text" 
                        placeholder="Options: Pre-Wedding, Portrait"
                        value={newColOptionsText}
                        onChange={(e) => setNewColOptionsText(e.target.value)}
                        className="w-full bg-[#FAF8F5]/60 dark:bg-[#121110]/60 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] rounded-lg p-1.5 border border-[#E8E5DF] dark:border-[#2C2926] placeholder-[#706E6A] dark:placeholder-[#A09E9A]"
                      />
                    )}

                    <button
                      onClick={handleAddCustomColumn}
                      className="w-full py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-white font-extrabold rounded-lg text-xs hover:opacity-95 transition-opacity"
                    >
                      Add Column
                    </button>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresenceComponent>
          </div>

        </div>
      </div>

      {/* Main View Mode rendering */}
      {viewMode === 'table' ? (
        
        /* ---------------------------------------------------- */
        /* GRID TABLE VIEW                                      */
        /* ---------------------------------------------------- */
        <div className="w-full overflow-visible border border-[#E8E5DF]/50 dark:border-[#2C2926]/50 bg-[#FAF8F5]/80 dark:bg-[#121110]/80 backdrop-blur-md rounded-3xl shadow-xl dark:shadow-2xl relative transition-all">
          <div className="overflow-x-auto" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse text-slate-700 dark:text-zinc-300 table-fixed min-w-[1000px]">
              
              <colgroup><col className="w-[50px]" /><col className="w-[220px]" />{columns.filter(col => col.visible).map(col => (<col key={col.id} className="w-[170px]" />))}<col className="w-[260px]" /></colgroup>

              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-zinc-550 bg-slate-50 dark:bg-zinc-950/40">
                  <th className="py-4 px-4 text-center">
                    <button onClick={handleSelectAll} className="text-zinc-550 hover:text-white transition-colors">
                      {selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0 ? (
                        <CheckSquare className="w-4.5 h-4.5 text-orange-500" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </th>
                  
                  {/* Frozen Column Name (Sticky Left) */}
                  <th className="py-4 px-4 font-bold sticky left-0 bg-white dark:bg-[#1C1A18] z-30 border-r border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] relative group/header select-none">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Lead Name</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const colId = 'name';
                          if (openFilterColId === colId) {
                            setOpenFilterColId(null);
                          } else {
                            setFilterSearchQuery('');
                            setDraftFilterValues(activeHeaderFilters[colId] || getUniqueColumnValues(colId));
                            setOpenFilterColId(colId);
                          }
                        }}
                        className={`p-1 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ml-auto ${
                          activeHeaderFilters['name'] ? 'text-[#D97706]' : 'text-zinc-400 opacity-30 group-hover/header:opacity-100 hover:opacity-100'
                        }`}
                        title="Filter Name"
                      >
                        <Filter className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                    {openFilterColId === 'name' && renderFilterDropdown('name')}
                  </th>
                  
                  {/* Dynamic Columns headers */}
                  {columns.map((col, idx) => col.visible && (
                    <th
                      key={col.id}
                      className={`py-4 px-4 font-bold relative group/header cursor-grab active:cursor-grabbing transition-all select-none ${
                        draggedColIdx === idx ? 'opacity-40 bg-[#FAF8F5]/80 dark:bg-[#121110]/80 border-dashed border border-[#D4AF37]' : ''
                      } ${
                        dragOverColIdx === idx ? 'border-l-2 border-l-[#D4AF37]' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, idx)}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Header Inline Rename Input */}
                          {editingHeaderId === col.id ? (
                            <input 
                              type="text"
                              value={editingHeaderVal}
                              onChange={(e) => setEditingHeaderVal(e.target.value)}
                              onBlur={() => handleSaveRename(col.id)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(col.id)}
                              className="bg-[#FAF8F5] dark:bg-[#121110] text-xs text-[#1A1A1A] dark:text-[#F5F5F5] p-1 rounded w-24 focus:outline-none border border-[#E8E5DF] dark:border-[#2C2926]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              onDoubleClick={() => handleStartRename(col.id, col.label)} 
                              className="cursor-pointer hover:text-[#D4AF37] dark:hover:text-[#D4AF37] border-b border-dashed border-transparent hover:border-[#D4AF37] select-text truncate block max-w-[100px]"
                              title="Double click to rename"
                            >
                              {col.label}
                            </span>
                          )}

                          {/* Column Re-ordering shift buttons */}
                          <div className="opacity-0 group-hover/header:opacity-100 flex items-center transition-opacity gap-0.5 ml-0.5 shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveColumn(idx, 'left'); }}
                              className="p-0.5 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] text-[#706E6A] dark:text-[#A09E9A] hover:text-[#D4AF37] rounded"
                              title="Move column left"
                            >
                              <ArrowLeft className="w-2.5 h-2.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); moveColumn(idx, 'right'); }}
                              className="p-0.5 hover:bg-[#FAF8F5] dark:hover:bg-[#121110] text-[#706E6A] dark:text-[#A09E9A] hover:text-[#D4AF37] rounded"
                              title="Move column right"
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Google Sheets Column Filter Trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openFilterColId === col.id) {
                              setOpenFilterColId(null);
                            } else {
                              setFilterSearchQuery('');
                              setDraftFilterValues(activeHeaderFilters[col.id] || getUniqueColumnValues(col.id));
                              setOpenFilterColId(col.id);
                            }
                          }}
                          className={`p-1 rounded hover:bg-[#FAF8F5] dark:hover:bg-[#121110] transition-colors shrink-0 ${
                            activeHeaderFilters[col.id] ? 'text-[#D4AF37] dark:text-[#C5A059]' : 'text-zinc-450 opacity-30 group-hover/header:opacity-100 hover:opacity-100'
                          }`}
                          title={`Filter ${col.label}`}
                        >
                          <Filter className="w-3 h-3 fill-current" />
                        </button>

                      </div>

                      {/* Dropdown alignment relative to header */}
                      {openFilterColId === col.id && renderFilterDropdown(col.id)}
                    </th>
                  ))}

                  {/* Frozen Column Actions (Sticky Right) */}
                  <th className="py-4 px-4 text-right sticky right-0 bg-white dark:bg-[#1C1A18] border-l border-[#E8E5DF] dark:border-[#2C2926] z-30 text-[#1A1A1A] dark:text-[#F5F5F5]">Actions</th>
                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-900 text-sm">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={columns.filter(c => c.visible).length + 3} className="py-16 text-center text-zinc-500 bg-[#0c0c0e]/30">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-zinc-650" />
                        <p className="text-sm font-semibold">No photography leads match your filter criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const mockOwner = getMockOwner(lead);
                    const mockCompany = getMockCompany(lead);
                    const mockAttachment = getMockAttachment(lead);
                    const activeColor = lead.custom_color;

                    return (
                      <MotionTr 
                        key={lead.id}
                        layout
                        onClick={() => setSelectedLead(lead)}
                        className={`hover:bg-slate-50 dark:hover:bg-zinc-900/20 transition-all cursor-pointer group/row border-b border-slate-200 dark:border-zinc-900 ${
                          isSelected ? 'bg-slate-100 dark:bg-zinc-900/30' : ''
                        }`}
                      >
                        {/* Checkbox Selector */}
                        <td className="py-3.5 px-4 text-center bg-[#070708]/10" onClick={(e) => handleSelectRow(lead.id, e)}>
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-orange-500 mx-auto" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-zinc-750 group-hover/row:text-zinc-500 transition-colors mx-auto" />
                          )}
                        </td>

                        {/* Sticky Left: Lead Name Column (Initials Circle Removed) */}
                        <td className="py-3.5 px-4 sticky left-0 bg-white dark:bg-[#0c0c0e] z-20 border-r border-slate-200 dark:border-zinc-900/60 shadow-[5px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[5px_0_10px_rgba(0,0,0,0.3)] text-slate-800 dark:text-zinc-300">
                          <div className="min-w-0">
                            <span 
                              style={{ color: activeColor || 'inherit' }}
                              className="font-black text-slate-900 dark:text-white group-hover/row:text-orange-500 transition-colors truncate block text-sm"
                            >
                              {lead.name || 'Unspecified Lead'}
                            </span>
                            {/* Granular Subtext visibility rendering */}
                            {renderContactSubtext(lead)}
                          </div>
                        </td>

                        {/* Dynamic Column content mapping */}
                        {columns.map(col => {
                          if (!col.visible) return null;

                          // 1. System Columns
                          if (col.type === 'system') {
                            switch (col.id) {
                              case 'contact':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4">
                                    <div className="space-y-1">
                                      <span className="text-[11px] text-zinc-350 font-mono flex items-center gap-1.5">
                                        <Phone className="w-3 h-3 text-zinc-650" />
                                        {lead.phone}
                                      </span>
                                      {lead.email && (
                                        <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 truncate">
                                          <Mail className="w-3 h-3 text-zinc-650" />
                                          {lead.email}
                                        </span>
                                      )}
                                    </div>
                                  </MotionTd>
                                );
                              case 'source':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={lead.source}
                                      onChange={(e) => {
                                        if (e.target.value === '__add_new__') {
                                          setShowAddSourceModal(true);
                                        } else {
                                          handleInlineLeadEdit({ source: e.target.value }, lead.id);
                                        }
                                      }}
                                      className="bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] text-[11px] font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer w-[140px] capitalize shadow-sm transition-all"
                                    >
                                      {customSources.map(src => (
                                        <option key={src} value={src} className="bg-white dark:bg-[#1C1A18] text-[#1A1A1A] dark:text-[#F5F5F5]">{src}</option>
                                      ))}
                                      <option value="__add_new__" className="bg-white dark:bg-[#1C1A18] text-orange-400 font-bold">+ Add Custom</option>
                                    </select>
                                  </MotionTd>
                                );
                              case 'status':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={lead.stage_id || lead.status}
                                      onChange={(e) => {
                                        const nextStageId = e.target.value;
                                        const selectedStage = stages.find(s => s.id === nextStageId);
                                        if (onLeadUpdate) {
                                          onLeadUpdate(lead.id, {
                                            stage_id: nextStageId,
                                            status: (selectedStage?.name?.toLowerCase() === 'inquiry' ? 'new' :
                                                     selectedStage?.name?.toLowerCase() === 'contacted' ? 'contacted' :
                                                     selectedStage?.name?.toLowerCase() === 'meeting scheduled' ? 'warm' :
                                                     selectedStage?.name?.toLowerCase() === 'proposal sent' ? 'hot' :
                                                     selectedStage?.name?.toLowerCase() === 'contract signed' ? 'closed' :
                                                     selectedStage?.name?.toLowerCase() === 'closed/lost' ? 'lost' :
                                                     lead.status) as LeadStatus
                                          });
                                        }
                                      }}
                                      className="bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer w-28 shadow-sm transition-all"
                                    >
                                      {stages.map(s => (
                                        <option key={s.id} value={s.id} className="bg-white dark:bg-[#1C1A18] text-[#1A1A1A] dark:text-[#F5F5F5]">{s.name}</option>
                                      ))}
                                    </select>
                                  </MotionTd>
                                );
                              case 'owner':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4">
                                    <span className="text-xs text-zinc-300 font-medium truncate block">{lead.raw_payload?.lead_owner || mockOwner.name}</span>
                                  </MotionTd>
                                );
                              case 'company':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4">
                                    <span className="text-xs text-zinc-400 truncate block">{lead.raw_payload?.company || mockCompany}</span>
                                  </MotionTd>
                                );
                              case 'date':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4 text-xs text-zinc-500 font-mono">
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                      day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                  </MotionTd>
                                );
                              case 'address':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4 text-xs text-zinc-500 truncate">
                                    {lead.raw_payload?.venue || lead.raw_payload?.address || '-'}
                                  </MotionTd>
                                );
                              case 'attachments':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                    {mockAttachment ? (
                                      <div 
                                        className="relative inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-350 underline transition-all font-mono"
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoveredAttachment({
                                            leadId: lead.id,
                                            fileName: mockAttachment,
                                            x: rect.left,
                                            y: rect.top - 180
                                          });
                                        }}
                                        onMouseLeave={() => setHoveredAttachment(null)}
                                      >
                                        <FileText className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                                        <span className="truncate max-w-[120px]">{mockAttachment}</span>
                                      </div>
                                    ) : (
                                      <span className="text-zinc-700 text-xs italic">-</span>
                                    )}
                                  </MotionTd>
                                );
                              
                              // SaaS Automation workflow trackers
                              case 'wa_group':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={lead.whatsapp_group_id || ''}
                                      onChange={(e) => {
                                        const nextGroupId = e.target.value || null;
                                        handleInlineLeadEdit({ whatsapp_group_id: nextGroupId }, lead.id);
                                      }}
                                      className="bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer w-32 truncate shadow-sm transition-all"
                                    >
                                      <option value="" className="bg-white dark:bg-[#1C1A18] text-[#1A1A1A] dark:text-[#F5F5F5]">Unassigned</option>
                                      {contactGroups.map(g => (
                                        <option key={g.id} value={g.id} className="bg-white dark:bg-[#1C1A18] text-[#1A1A1A] dark:text-[#F5F5F5]">{g.group_name}</option>
                                      ))}
                                    </select>
                                  </MotionTd>
                                );
                              case 'wa_welcome':
                                const ws = (lead as any).wa_welcome_sent ?? false;
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide border uppercase ${
                                      ws ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-[#FAF8F5] dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                      {ws ? 'Sent ✓' : 'Pending'}
                                    </span>
                                  </MotionTd>
                                );
                              case 'google_sync':
                                const gs = (lead as any).google_synced ?? false;
                                const isSyncing = syncingLeadId === lead.id;
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleGoogleContactsSync(lead)}
                                      disabled={gs || isSyncing}
                                      title={gs ? "Client Metadata Synced" : isSyncing ? "Syncing contacts..." : "Click to Sync Google Contact"}
                                      className={`inline-flex px-1.5 py-1.5 rounded-lg border transition-all ${
                                        gs 
                                          ? 'bg-blue-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400 cursor-default' 
                                          : isSyncing 
                                            ? 'bg-[#FAF8F5] dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-zinc-400 dark:text-zinc-500 animate-pulse'
                                            : 'bg-white dark:bg-[#1C1A18] hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] border-[#E8E5DF] dark:border-[#2C2926] text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer shadow-sm'
                                      }`}
                                    >
                                      {isSyncing ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <UserCheck className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </MotionTd>
                                );
                              case 'wgl_status':
                                const wg = (lead as any).wgl_dispatched ?? false;
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wide uppercase border ${
                                      wg ? 'bg-green-600/15 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-white dark:bg-[#1C1A18] border-[#E8E5DF] dark:border-[#2C2926] text-zinc-400 dark:text-zinc-500'
                                    }`}>
                                      {wg ? 'WGL Alert ✅' : 'No WGL Alert'}
                                    </span>
                                  </MotionTd>
                                );
                              case 'followup_sched':
                                return (
                                  <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setTimelineLead(lead)}
                                      className="p-1 px-2 text-[10px] font-extrabold tracking-wide uppercase bg-white dark:bg-[#1C1A18] hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] hover:text-[#1A1A1A] dark:hover:text-white border border-[#E8E5DF] dark:border-[#2C2926] rounded-lg text-zinc-500 dark:text-zinc-400 flex items-center gap-1 shadow-sm transition-all"
                                    >
                                      <Clock className="w-3 h-3 text-[#D4AF37]" />
                                      Timeline
                                    </button>
                                  </MotionTd>
                                );
                              default:
                                return <td key={col.id} className="py-3.5 px-4">-</td>;
                            }
                          }

                          // 2. Facebook Form Field Ingested Auto-Columns
                          if (col.type === 'meta') {
                            const metaKey = col.id.replace('meta_', '');
                            const metaVal = lead.raw_payload?.[metaKey] ?? '-';
                            return (
                              <MotionTd key={col.id} className="py-3.5 px-4 text-xs font-medium text-zinc-450 truncate">
                                {String(metaVal)}
                              </MotionTd>
                            );
                          }

                          // 3. User Defined Custom Columns
                          if (col.type && col.type.startsWith('custom_')) {
                            const customVal = lead.raw_payload?.[col.id] || '';
                            
                            // Color Picker highlight type
                            if (col.type === 'custom-color') {
                              return (
                                <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="color"
                                      value={customVal || '#71717a'}
                                      onChange={(e) => {
                                        // Save to raw payload
                                        handleInlineRawPayloadEdit(col.id, e.target.value, lead.id);
                                        // Highlight name color directly
                                        handleInlineLeadEdit({ custom_color: e.target.value }, lead.id);
                                      }}
                                      className="w-6 h-6 border-none bg-transparent cursor-pointer shrink-0"
                                      title="Click to color highlight lead name text"
                                    />
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{customVal || 'Select Color'}</span>
                                  </div>
                                </MotionTd>
                              );
                            }

                            // Dynamic Dropdown options list type
                            if (col.type === 'custom-dropdown') {
                              return (
                                <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={customVal}
                                    onChange={(e) => handleInlineRawPayloadEdit(col.id, e.target.value, lead.id)}
                                    className="bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-900 text-slate-700 dark:text-zinc-350 text-[11px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-slate-300 dark:focus:border-zinc-800 cursor-pointer w-32 truncate"
                                  >
                                    <option value="">Select option</option>
                                    {col.options?.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </MotionTd>
                              );
                            }

                            // Custom Text field type
                            return (
                              <MotionTd key={col.id} className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="text"
                                  placeholder="..."
                                  value={customVal}
                                  onChange={(e) => handleInlineRawPayloadEdit(col.id, e.target.value, lead.id)}
                                  className="bg-slate-50 dark:bg-zinc-950/50 border border-transparent hover:border-slate-300 dark:hover:border-zinc-800 focus:border-slate-400 dark:focus:border-zinc-700 text-xs text-slate-900 dark:text-white p-1 rounded w-28 focus:outline-none"
                                />
                              </MotionTd>
                            );
                          }

                          return null;
                        })}

                        {/* Sticky Right: Column Actions */}
                        <td className="py-3.5 px-4 text-right sticky right-0 bg-white dark:bg-[#1C1A18] border-l border-[#E8E5DF] dark:border-[#2C2926] z-20 shadow-[-5px_0_10px_rgba(0,0,0,0.01)] dark:shadow-[-5px_0_10px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            
                            {/* WA Welcome Msg Quick Action */}
                            <PremiumTooltip content={(lead as any).wa_welcome_sent ? "WA Welcome Msg Sent" : "Send WA Welcome Msg"}>
                              <MotionButton
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleWhatsappWelcomeDispatch(lead)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  (lead as any).wa_welcome_sent 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-[#FAF8F5]/80 dark:bg-[#121110]/80 border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-emerald-600'
                                }`}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </MotionButton>
                            </PremiumTooltip>

                            {/* Google Contact Sync Quick Action */}
                            <PremiumTooltip content={(lead as any).google_synced ? "Google Contact Synced" : syncingLeadId === lead.id ? "Syncing..." : "Sync Google Contact"}>
                              <MotionButton
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleGoogleContactsSync(lead)}
                                disabled={syncingLeadId === lead.id}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  (lead as any).google_synced 
                                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400 cursor-default' 
                                    : syncingLeadId === lead.id 
                                      ? 'bg-zinc-800 border-zinc-700 text-zinc-400 animate-pulse'
                                      : 'bg-[#FAF8F5]/80 dark:bg-[#121110]/80 border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-blue-500'
                                }`}
                              >
                                {syncingLeadId === lead.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </MotionButton>
                            </PremiumTooltip>

                            {/* WGL Status / Dispatch Quick Action */}
                            <PremiumTooltip content={(lead as any).wgl_dispatched ? "WGL Alert Active" : "Dispatch WGL Alert"}>
                              <MotionButton
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleWglDispatch(lead)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  (lead as any).wgl_dispatched 
                                    ? 'bg-green-600/15 border-green-500/20 text-green-600 dark:text-green-400' 
                                    : 'bg-[#FAF8F5]/80 dark:bg-[#121110]/80 border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-green-600'
                                }`}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                              </MotionButton>
                            </PremiumTooltip>

                            {/* Followups Timeline Quick Action */}
                            <PremiumTooltip content="Open Followup Timeline">
                              <MotionButton
                                whileHover={{ scale: 1.1 }}
                                onClick={() => setTimelineLead(lead)}
                                className="p-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/80 dark:bg-[#121110]/80 text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#D4AF37] dark:hover:text-[#C5A059] transition-all"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </MotionButton>
                            </PremiumTooltip>

                            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-900 mx-1 hidden md:block" />

                            {/* PhoneCall Selector */}
                            <div className="relative">
                              <PremiumTooltip content="Call / WhatsApp Options">
                                <MotionButton 
                                  whileHover={{ scale: 1.1 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhoneActionMenuLeadId(phoneActionMenuLeadId === lead.id ? null : lead.id);
                                  }}
                                  className="p-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/80 dark:bg-[#121110]/80 text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#D4AF37] dark:hover:text-[#C5A059] transition-all"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </MotionButton>
                              </PremiumTooltip>
                              {phoneActionMenuLeadId === lead.id && (
                                <div className="absolute right-0 bottom-8 mt-2 w-52 bg-white dark:bg-[#1C1A18] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 text-left">
                                  <a 
                                    href={`tel:${lead.phone}`}
                                    onClick={() => setPhoneActionMenuLeadId(null)}
                                    className="w-full flex items-center gap-2 p-2 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-350 hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                                    Device Dialer Call
                                  </a>
                                  <button 
                                    onClick={() => {
                                      setPhoneActionMenuLeadId(null);
                                      handleWhatsappWelcomeDispatch(lead);
                                    }}
                                    className="w-full flex items-center gap-2 p-2 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2926] rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-350 hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
                                  >
                                    <Send className="w-3.5 h-3.5 text-green-500" />
                                    Baileys WA Welcome
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Mail Lead */}
                            {lead.email && (
                              <PremiumTooltip content="Email Lead">
                                <MotionA 
                                  whileHover={{ scale: 1.1 }}
                                  href={`mailto:${lead.email}`}
                                  className="p-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/80 dark:bg-[#121110]/80 text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#D4AF37] dark:hover:text-[#C5A059] transition-all"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </MotionA>
                              </PremiumTooltip>
                            )}

                            {/* Details Kundali */}
                            <PremiumTooltip content="Full Lead Details (Kundali)">
                              <MotionButton 
                                whileHover={{ scale: 1.1 }}
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 rounded-lg border border-[#E8E5DF] dark:border-[#2C2926] bg-[#FAF8F5]/80 dark:bg-[#121110]/80 text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#D4AF37] dark:hover:text-[#C5A059] transition-all"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </MotionButton>
                            </PremiumTooltip>
                          </div>
                        </td>

                      </MotionTr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

          {/* Synced horizontal scrollbar at bottom of table */}
          <div 
            ref={stickyScrollbarRef} 
            className={`w-full overflow-x-auto sticky bottom-0 z-35 bg-[#FAF8F5]/90 dark:bg-[#121110]/90 border-t border-[#E8E5DF]/60 dark:border-[#2C2926]/60 transition-all ${isScrollable ? 'block' : 'hidden'}`}
            style={{
              scrollbarWidth: 'thin',
            }}
          >
            <div style={{ width: tableScrollWidth, height: '1px' }} />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-zinc-500 px-4 py-3 border-t border-slate-200 dark:border-zinc-900/40">
              <div>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} leads
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-800 dark:hover:text-white transition-all"
                >
                  Previous
                </button>
                <span className="text-zinc-350 px-2 font-mono">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-900 hover:text-white transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        
        /* ---------------------------------------------------- */
        /* KANBAN BOARD VIEW                                    */
        /* ---------------------------------------------------- */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-6 text-slate-800 dark:text-zinc-300">
          {stages.map(stage => {
            const stageLeads = filteredLeads.filter(l => {
              if (l.stage_id === stage.id) return true;
              if (!l.stage_id) {
                const stageName = stage.name.toLowerCase();
                const leadStatus = l.status.toLowerCase();
                if (leadStatus === stage.id) return true;
                if (leadStatus === stageName) return true;
                if (stageName === 'inquiry' && leadStatus === 'new') return true;
                if (stageName === 'contacted' && leadStatus === 'contacted') return true;
                if (stageName === 'meeting scheduled' && leadStatus === 'warm') return true;
                if (stageName === 'proposal sent' && leadStatus === 'hot') return true;
                if (stageName === 'contract signed' && leadStatus === 'closed') return true;
                if (stageName === 'closed/lost' && leadStatus === 'lost') return true;
              }
              return false;
            });

            const dotColor = stage.color || (
              stage.id === 'new' ? '#3b82f6' :
              stage.id === 'contacted' ? '#8b5cf6' :
              stage.id === 'warm' ? '#ec4899' :
              stage.id === 'hot' ? '#f59e0b' :
              stage.id === 'closed' ? '#10b981' :
              stage.id === 'lost' ? '#6b7280' : '#71717a'
            );

            return (
              <div 
                key={stage.id} 
                onDragOver={(e) => handleStageDragOver(e, stage.id)}
                onDragLeave={(e) => handleStageDragLeave(e, stage.id)}
                onDrop={(e) => handleStageDrop(e, stage.id)}
                className={`rounded-2xl border transition-all duration-200 p-3.5 space-y-3 shrink-0 min-w-[200px] shadow-sm ${
                  activeDropStageId === stage.id 
                    ? 'border-orange-500/50 bg-orange-500/5 dark:bg-orange-500/10 scale-[0.99]' 
                    : 'border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20'
                }`}
              >
                
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{stage.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-650 bg-slate-50 dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-900">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-slate-400 dark:text-zinc-600 italic border border-dashed border-slate-200 dark:border-zinc-900 rounded-xl">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const mockOwner = getMockOwner(lead);
                      const leadColor = lead.custom_color;
                      
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          draggable
                          onDragStart={(e) => handleLeadDragStart(e, lead.id, stage.id)}
                          onDragEnd={handleLeadDragEnd}
                          className={`p-3 rounded-xl border border-slate-200 dark:border-zinc-900 hover:border-slate-350 dark:hover:border-zinc-800 bg-slate-50 dark:bg-zinc-950/70 hover:bg-slate-100 dark:hover:bg-zinc-950 hover:scale-[1.01] cursor-pointer transition-all space-y-3 relative group shadow-sm ${
                            draggedLeadId === lead.id ? 'opacity-40 border-dashed border-orange-500/50' : ''
                          }`}
                        >
                          {/* Card Body */}
                          <div>
                            <span 
                              style={{ color: leadColor || 'inherit' }}
                              className="text-xs font-bold text-slate-800 dark:text-white block truncate"
                            >
                              {lead.name || 'Unspecified'}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-zinc-650 block mt-1">{getIngestionTime(lead.created_at)}</span>
                          </div>

                          {/* Quick details based on column settings */}
                          <div className="space-y-1 text-[10px] text-slate-500 dark:text-zinc-550 border-t border-slate-200 dark:border-zinc-900 pt-2 font-mono">
                            {isColVisible('contact') && (
                              <div className="truncate flex items-center gap-1.5"><Phone className="w-2.5 h-2.5 text-zinc-700" /> {lead.phone}</div>
                            )}
                            {isColVisible('source') && (
                              <div className="capitalize truncate flex items-center gap-1.5"><ExternalLink className="w-2.5 h-2.5 text-zinc-700" /> {lead.source}</div>
                            )}
                            {isColVisible('owner') && (
                              <div className="truncate flex items-center gap-1.5"><User className="w-2.5 h-2.5 text-zinc-700" /> {lead.raw_payload?.lead_owner || mockOwner.name}</div>
                            )}
                            {isColVisible('date') && (
                              <div className="truncate flex items-center gap-1.5"><Calendar className="w-2.5 h-2.5 text-zinc-700" /> {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                            )}
                          </div>

                          {/* Drag/Shift Stage Selector Shortcut */}
                          <div className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 transition-opacity" onClick={(e)=>e.stopPropagation()}>
                            <select
                              value={lead.stage_id || lead.status}
                              onChange={(e) => {
                                const nextStageId = e.target.value;
                                const selectedStage = stages.find(s => s.id === nextStageId);
                                if (onLeadUpdate) {
                                  onLeadUpdate(lead.id, {
                                    stage_id: nextStageId,
                                    status: (selectedStage?.name?.toLowerCase() === 'inquiry' ? 'new' :
                                             selectedStage?.name?.toLowerCase() === 'contacted' ? 'contacted' :
                                             selectedStage?.name?.toLowerCase() === 'meeting scheduled' ? 'warm' :
                                             selectedStage?.name?.toLowerCase() === 'proposal sent' ? 'hot' :
                                             selectedStage?.name?.toLowerCase() === 'contract signed' ? 'closed' :
                                             selectedStage?.name?.toLowerCase() === 'closed/lost' ? 'lost' :
                                             lead.status) as LeadStatus
                                  });
                                }
                              }}
                              className="bg-zinc-900 border border-zinc-800 text-white text-[9px] rounded p-0.5 cursor-pointer focus:outline-none"
                            >
                              {stages.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        
        /* ---------------------------------------------------- */
        /* TEAM TASKS GRID VIEW                                 */
        /* ---------------------------------------------------- */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 shadow-xl dark:shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <div>
              <h3 className="text-sm font-black uppercase text-orange-500 tracking-wider">Workspace Team Tasks Command Grid</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Vector Isolation: Personal, Project-Specific, Field Assignments</p>
            </div>
          </div>
          <TeamTasksManager 
            workspaceId={leads[0]?.workspace_id || '00000000-0000-0000-0000-000000000000'} 
            userEmail={userEmail} 
          />
        </div>
      )}

      {/* Bulk Actions Sliding Dock */}
      <AnimatePresenceComponent>
        {selectedLeadIds.length > 0 && (
          <MotionDiv
            initial={{ y: 80, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 80, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="fixed bottom-6 left-1/2 z-40 bg-white/95 dark:bg-[#121110]/95 border border-[#E8E5DF] dark:border-[#2C2926] text-[#1A1A1A] dark:text-[#F5F5F5] shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] px-5 py-3.5 rounded-2xl flex items-center gap-5 backdrop-blur-md w-[90%] max-w-xl justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#D4AF37] dark:bg-[#C5A059] text-white flex items-center justify-center text-[10px] font-black">
                {selectedLeadIds.length}
              </div>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Selected</span>
            </div>

            {/* Actions panel */}
            <div className="flex items-center gap-2">
              
              {/* Bulk Status Update */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                  className="px-3 py-1.5 bg-[#FAF8F5]/80 hover:bg-[#FAF8F5]/95 dark:bg-[#1C1A18]/80 dark:hover:bg-[#23201D] border border-[#E8E5DF] dark:border-[#2C2926] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 text-slate-700 dark:text-zinc-350"
                >
                  <Tag className="w-3.5 h-3.5 text-[#D4AF37] dark:text-[#C5A059]" />
                  Stage
                  <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                </button>
                
                {showBulkStatusMenu && (
                  <div className="absolute bottom-11 right-0 w-36 bg-white dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50">
                    {['new', 'contacted', 'warm', 'hot', 'closed', 'lost'].map(st => (
                      <button
                        key={st}
                        disabled={isBulkProcessing}
                        onClick={() => handleBulkUpdateStatus(st as LeadStatus)}
                        className="w-full text-left p-1.5 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900 rounded-md text-[11px] font-semibold text-slate-600 dark:text-zinc-400 capitalize transition-colors"
                      >
                        {st === 'contacted' ? 'Open' : st === 'warm' ? 'In Progress' : st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk Group Update */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkGroupMenu(!showBulkGroupMenu)}
                  className="px-3 py-1.5 bg-[#FAF8F5]/80 hover:bg-[#FAF8F5]/95 dark:bg-[#1C1A18]/80 dark:hover:bg-[#23201D] border border-[#E8E5DF] dark:border-[#2C2926] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 text-slate-700 dark:text-zinc-350"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  WA Group
                  <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                </button>
                
                {showBulkGroupMenu && (
                  <div className="absolute bottom-11 right-0 w-48 bg-white dark:bg-[#121110] border border-[#E8E5DF] dark:border-[#2C2926] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 max-h-48 overflow-y-auto">
                    <button
                      disabled={isBulkProcessing}
                      onClick={() => handleBulkAssignGroup(null)}
                      className="w-full text-left p-1.5 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900 rounded-md text-[11px] font-semibold text-slate-500 dark:text-zinc-450 transition-colors"
                    >
                      Unassigned / None
                    </button>
                    {contactGroups.length === 0 ? (
                      <div className="p-2 text-[10px] text-zinc-400 dark:text-zinc-650 italic text-center">
                        No contact groups configured.
                      </div>
                    ) : (
                      contactGroups.map(grp => (
                        <button
                          key={grp.id}
                          disabled={isBulkProcessing}
                          onClick={() => handleBulkAssignGroup(grp.id)}
                          className="w-full text-left p-1.5 hover:bg-[#FAF8F5] dark:hover:bg-zinc-900 rounded-md text-[11px] font-semibold text-slate-600 dark:text-zinc-400 transition-colors truncate"
                        >
                          {grp.group_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Bulk Export */}
              <button
                onClick={handleBulkExport}
                className="px-3 py-1.5 bg-[#FAF8F5]/80 hover:bg-[#FAF8F5]/95 dark:bg-[#1C1A18]/80 dark:hover:bg-[#23201D] border border-[#E8E5DF] dark:border-[#2C2926] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 text-slate-700 dark:text-zinc-350"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              {/* Bulk Delete */}
              <button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="p-1.5 bg-white hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-950/20 border border-[#E8E5DF] dark:border-[#2C2926] hover:border-rose-300 dark:hover:border-rose-900/30 text-rose-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="h-5 w-[1px] bg-[#E8E5DF] dark:bg-[#2C2926] mx-1" />

              {/* Dismiss selection */}
              <button
                onClick={() => setSelectedLeadIds([])}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

            </div>
          </MotionDiv>
        )}
      </AnimatePresenceComponent>

      {/* Manual Lead Creation Modal Dialog */}
      <AnimatePresenceComponent>
        {createModalOpen && (
          <>
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <MotionDiv
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-lg h-fit max-h-[90vh] bg-zinc-950 border border-zinc-850 p-6 rounded-2xl shadow-2xl overflow-y-auto space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  Create Manual Lead Record
                </h3>
                <button onClick={() => setCreateModalOpen(false)} className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Lead Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Sharma"
                      value={manualLeadName}
                      onChange={(e) => setManualLeadName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none focus:border-zinc-750"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Mobile Number *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +919876543210"
                      value={manualLeadPhone}
                      onChange={(e) => setManualLeadPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none focus:border-zinc-750 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. rahul@example.com"
                      value={manualLeadEmail}
                      onChange={(e) => setManualLeadEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none focus:border-zinc-750 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Lead Source</label>
                    <select
                      value={manualLeadSource}
                      onChange={(e) => setManualLeadSource(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none focus:border-zinc-750 cursor-pointer"
                    >
                      {customSources.map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Deal Stage</label>
                    <select
                      value={manualLeadStatus}
                      onChange={(e) => setManualLeadStatus(e.target.value as LeadStatus)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none"
                    >
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Lead Owner</label>
                    <select
                      value={manualLeadOwner}
                      onChange={(e) => setManualLeadOwner(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Chad Thunderclock">Chad Thunderclock</option>
                      <option value="Sarah Jenkins">Sarah Jenkins</option>
                      <option value="John Kuy">John Kuy</option>
                      <option value="Elena Rostova">Elena Rostova</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Lead Score</label>
                    <select
                      value={manualLeadScore}
                      onChange={(e) => setManualLeadScore(e.target.value as LeadScore)}
                      className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none"
                    >
                      <option value="High-Value 🔥">High-Value 🔥</option>
                      <option value="Warm 👍">Warm 👍</option>
                      <option value="Cold ❄️">Cold ❄️</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pixel Weddings"
                    value={manualLeadCompany}
                    onChange={(e) => setManualLeadCompany(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Venue / Full Address</label>
                  <textarea 
                    placeholder="e.g. Ritz Carlton, Mumbai"
                    value={manualLeadAddress}
                    onChange={(e) => setManualLeadAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-white focus:outline-none resize-none"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2 text-xs">
                <button 
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-zinc-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveManualLead}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black font-extrabold rounded-lg"
                >
                  Create Lead
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresenceComponent>

      {/* Follow-up scheduler modal timeline */}
      <AnimatePresenceComponent>
        {timelineLead && (
          <>
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setTimelineLead(null)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <MotionDiv
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-md h-fit max-h-[80vh] bg-zinc-950 border border-zinc-850 p-6 rounded-2xl shadow-2xl overflow-y-auto space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <div>
                  <h3 className="text-base font-extrabold">Automation Sequence Timeline</h3>
                  <span className="text-[10px] text-zinc-500 block">Lead Name: {timelineLead.name || timelineLead.phone}</span>
                </div>
                <button onClick={() => setTimelineLead(null)} className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simulated timeline tracks */}
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-900">
                
                {/* Step 1 */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6.5 h-6.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold z-10 shrink-0">✓</div>
                  <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">WA Welcome Message</span>
                      <span className="text-[9px] text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-1.5 rounded">Sent</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Delivered within 5 minutes of Meta ingestion.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6.5 h-6.5 rounded-full bg-orange-500 text-black flex items-center justify-center text-[10px] font-bold z-10 shrink-0">2</div>
                  <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Quotation & Portfolio</span>
                      <span className="text-[9px] text-orange-400 font-extrabold uppercase bg-orange-500/10 px-1.5 rounded">Scheduled</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Scheduled on Day 2 at 10:00 AM IST.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6.5 h-6.5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold z-10 shrink-0">3</div>
                  <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Discount Catalog Call-to-Action</span>
                      <span className="text-[9px] text-zinc-650 font-extrabold uppercase bg-zinc-950 px-1.5 rounded">Queued</span>
                    </div>
                    <p className="text-[10px] text-zinc-650">Queued on Day 5 at 11:30 AM IST.</p>
                  </div>
                </div>

              </div>
              
              <button 
                onClick={() => setTimelineLead(null)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-300"
              >
                Close Timeline
              </button>
            </MotionDiv>
          </>
        )}
      </AnimatePresenceComponent>

      {/* Premium LeadInsiderDrawer workspace sheet */}
      <AnimatePresenceComponent>
        {selectedLead && (
          <LeadInsiderDrawer
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onLeadUpdate={(leadId, updatedFields) => {
              setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
              if (selectedLead && selectedLead.id === leadId) {
                setSelectedLead(prev => prev ? { ...prev, ...updatedFields } : null);
              }
              if (onLeadUpdate) {
                onLeadUpdate(leadId, updatedFields);
              }
            }}
            stages={stages}
            customSources={customSources}
            userEmail={userEmail}
          />
        )}
      </AnimatePresenceComponent>

      {/* Floating Hover Attachment preview */}
      <AnimatePresenceComponent>
        {hoveredAttachment && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            style={{ 
              position: 'fixed',
              left: `${hoveredAttachment.x}px`,
              top: `${hoveredAttachment.y}px`,
            }}
            className="z-50 w-72 rounded-2xl bg-zinc-950 border border-zinc-850 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.8)] backdrop-blur-md text-white"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-bold text-white truncate">{hoveredAttachment.fileName}</h5>
                <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">PDF File • 1.4 MB • Ready</span>
              </div>
            </div>

            <div className="mt-3.5 border border-zinc-900 bg-zinc-950 p-2.5 rounded-xl font-sans relative overflow-hidden select-none">
              <div className="text-[7px] uppercase tracking-wider font-extrabold text-zinc-650">WEDDING CONTRACT PROPOSAL</div>
              <div className="text-[9px] font-bold text-zinc-350 mt-1">Taj Lake Palace, Udaipur</div>
              <div className="w-full h-[1px] bg-zinc-900 my-1.5" />
              <div className="space-y-1">
                <div className="h-1 w-[80%] bg-zinc-900 rounded" />
                <div className="h-1 w-[90%] bg-zinc-900 rounded" />
                <div className="h-1 w-[50%] bg-zinc-900 rounded" />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[7px] text-zinc-500">Proposed Total Cost:</span>
                <span className="text-[9px] font-black text-orange-400">₹2,50,000</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <button className="flex-1 py-1.5 bg-white hover:bg-zinc-200 text-black text-[10px] font-black rounded-lg flex items-center justify-center gap-1 transition-all">
                <Download className="w-3 h-3" />
                Download PDF
              </button>
              <button className="p-1.5 border border-zinc-850 hover:border-zinc-700 bg-zinc-900 hover:text-white text-zinc-550 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresenceComponent>

      {/* Add Custom Source Modal */}
      <AnimatePresenceComponent>
        {showAddSourceModal && (
          <>
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSourceModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <MotionDiv
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-sm h-fit bg-zinc-950 border border-zinc-850 p-5 rounded-2xl shadow-2xl space-y-4 text-white"
            >
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-500" />
                Add Custom Lead Source
              </h4>
              <input 
                type="text" 
                placeholder="e.g. WedMeGood, Justdial"
                value={newSourceText}
                onChange={(e) => setNewSourceText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700 placeholder-zinc-650"
              />
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button 
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-3 py-1.5 border border-zinc-850 hover:bg-zinc-900 rounded-lg text-zinc-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCustomSource}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-extrabold rounded-lg"
                >
                  Save Option
                </button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresenceComponent>

    </div>
  );
}

// Internal Helper functions inside file to generate mock company, owner and attachment
function getMockOwner(lead: Lead) {
  const owners = [
    { name: 'Chad Thunderclock', avatar: 'CT', color: 'from-amber-400 to-orange-500' },
    { name: 'Sarah Jenkins', avatar: 'SJ', color: 'from-emerald-400 to-teal-500' },
    { name: 'John Kuy', avatar: 'JK', color: 'from-blue-400 to-indigo-500' },
    { name: 'Elena Rostova', avatar: 'ER', color: 'from-pink-400 to-rose-500' },
  ];
  let hash = 0;
  const key = lead.email || lead.name || lead.id;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xfffff;
  return owners[Math.abs(hash) % owners.length];
}

function getMockCompany(lead: Lead) {
  const companies = ['Google', 'Facebook', 'Amazon', 'Vercel', 'Apple', 'Meta'];
  let hash = 0;
  const key = lead.email || lead.name || lead.id;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xfffff;
  return companies[Math.abs(hash) % companies.length];
}

function getMockAttachment(lead: Lead) {
  const files = ['proposal_v2.pdf', 'invoice_june.pdf', 'moodboard_wedding.pdf', 'quotation_draft.pdf', 'raw_spec.docx'];
  let hash = 0;
  const key = lead.email || lead.name || lead.id;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xfffff;
  if (hash % 5 === 0) return null;
  return files[Math.abs(hash) % files.length];
}

function getStatusBadgeConfig(status: LeadStatus) {
  switch (status) {
    case 'new': return { label: 'New', dot: 'bg-blue-400', bg: 'bg-blue-500/5 text-blue-400 border-blue-500/15' };
    case 'contacted': return { label: 'Open', dot: 'bg-purple-400', bg: 'bg-purple-500/5 text-purple-400 border-purple-500/15' };
    case 'warm': return { label: 'In Progress', dot: 'bg-lime-400', bg: 'bg-lime-500/5 text-lime-400 border-lime-500/15' };
    case 'hot': return { label: 'Priority', dot: 'bg-red-400', bg: 'bg-red-500/5 text-red-400 border-red-500/15' };
    case 'closed': return { label: 'Closed/Won', dot: 'bg-emerald-400', bg: 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15' };
    case 'lost': return { label: 'Lost', dot: 'bg-zinc-500', bg: 'bg-zinc-500/5 text-zinc-500 border-zinc-800' };
    default: return { label: status, dot: 'bg-zinc-400', bg: 'bg-zinc-500/5 text-zinc-450 border-zinc-800' };
  }
}

function getIngestionTime(dateStr: string) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / (1000 * 3600);
  
  if (diffHours < 1) {
    const min = Math.max(1, Math.floor(diffMs / 60000));
    return `${min} min ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)} hours ago`;
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

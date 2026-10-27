'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Plus, DollarSign, Calendar, Phone, Mail, 
  Film, Edit3, Trash2, CheckCircle2, Clock, AlertCircle, ArrowRight, X, 
  Sparkles, Check, ChevronRight, RefreshCw, FolderPlus, MessageCircle,
  Share2, Key, Tag, Layers, ExternalLink, ChevronDown, CreditCard, ShieldCheck,
  CheckSquare, Square, Upload, Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/context/BhamstraContext';
import { 
  ClientInsiderModal, parseClientExtended, serializeClientExtended 
} from '@/components/clients/client-insider-modal';
import { ExcelMigrationModal } from '@/components/finance/excel-migration-modal';
import { fetchWorkspaceTeamMembers, isInHouseMember, getDedupedInHouseMembers, type WorkspaceMemberOption } from '@/lib/team-helpers';
import { fetchWorkspaceEventTypes } from '@/lib/workspace-settings';
import AddClientModal, { AddClientFormData } from './components/AddClientModal';
import { handleAssignClientPM } from './components/ClientRow';
import { ProjectManagerAssignModal } from '@/components/modals/ProjectManagerAssignModal';
import ClientStatusDropdown from './components/ClientStatusDropdown';
import type { WorkspaceClient, Lead, ClientFinanceRecord, FinanceMilestoneItem } from '@/types';
import StudioCoreLiquidLoader from '@/components/ui/StudioCoreLiquidLoader';
import Searchable3DCreamSelect, { Searchable3DCreamSelectOption } from '@/components/ui/Searchable3DCreamSelect';
import { safeParseCurrencyOrBudget } from '@/lib/budget-helpers';
import { extractFinancialsFromQuotation, extractCoupleNameFromQuotation } from '@/lib/quotation-finance-sync';

const DEFAULT_EVENT_TYPES = [
  'Wedding Photography',
  'Pre-Wedding Shoot',
  'Engagement & Roka',
  'Reception & Dinner',
  'Haldi & Mehndi',
  'Sangeet & Cocktail',
  'Corporate & Commercial',
  'Birthday & Anniversary',
  'Maternity & Baby Shower'
];

// Module-level in-memory cache scoped by workspace ID for instant 0ms millisecond transitions without cross-workspace bleed
const memCachedClientsByWorkspace = new Map<string, WorkspaceClient[]>();
const memCachedFinanceByWorkspace = new Map<string, Map<string, ClientFinanceRecord>>();
const memCachedQuoteFinanceByWorkspace = new Map<string, Map<string, { total: number; paid: number; due: number }>>();
const memCachedTeamByWorkspace = new Map<string, WorkspaceMemberOption[]>();

export default function ClientsPage() {
  const router = useRouter();
  const { isOwner, permissions, activeWorkspace, userEmail, userId, userName, loading: wsLoading, workspaceId: contextWsId } = useWorkspace();
  const effectiveWsId = activeWorkspace?.workspaceId || contextWsId || userId || '';

  const actualIsOwner = Boolean(
    activeWorkspace ? activeWorkspace.isOwner : isOwner
  );
  const clientsAccess = actualIsOwner 
    ? 'ALL_MANAGE' 
    : (permissions?.clients_access || (activeWorkspace?.permissions as any)?.clients_access || 'NONE');
  const isReadOnly = !actualIsOwner && (clientsAccess === 'ASSIGNED_VIEW' || clientsAccess === 'ALL_VIEW');
  const isAssignedOnly = !actualIsOwner && (clientsAccess === 'ASSIGNED_VIEW' || clientsAccess === 'ASSIGNED_EDIT');

  const rawModules = permissions?.client_modules_access || (activeWorkspace?.permissions as any)?.client_modules_access;
  const parsedClientModules: string[] | null = useMemo(() => {
    if (!rawModules) return null;
    let list: any = rawModules;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) {}
    }
    return Array.isArray(list) ? list : null;
  }, [rawModules]);

  const hasFinanceAccess = Boolean(
    actualIsOwner || (
      (permissions?.finance_access && permissions.finance_access !== 'NONE') &&
      (!parsedClientModules || parsedClientModules.includes('finance'))
    )
  );

  // Workspace-scoped states (SSR-safe, initialized from cache for effectiveWsId)
  const [clients, setClients] = useState<WorkspaceClient[]>(() => {
    return effectiveWsId ? (memCachedClientsByWorkspace.get(effectiveWsId) || []) : [];
  });
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(effectiveWsId);
  const [financeRecordsMap, setFinanceRecordsMap] = useState<Map<string, ClientFinanceRecord>>(() => {
    return effectiveWsId ? (memCachedFinanceByWorkspace.get(effectiveWsId) || new Map()) : new Map();
  });
  const [quoteFinanceMap, setQuoteFinanceMap] = useState<Map<string, { total: number; paid: number; due: number }>>(() => {
    return effectiveWsId ? (memCachedQuoteFinanceByWorkspace.get(effectiveWsId) || new Map()) : new Map();
  });
  const [isExcelMigrationModalOpen, setIsExcelMigrationModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<WorkspaceMemberOption[]>(() => {
    return effectiveWsId ? (memCachedTeamByWorkspace.get(effectiveWsId) || []) : [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!effectiveWsId) return true;
    const cached = memCachedClientsByWorkspace.get(effectiveWsId);
    return !cached || cached.length === 0;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived' | 'trash'>('all');
  const [clientToDelete, setClientToDelete] = useState<WorkspaceClient | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [pmFilter, setPmFilter] = useState<string>('all');
  const [quickAssignClient, setQuickAssignClient] = useState<WorkspaceClient | null>(null);
  const [quickPmSearch, setQuickPmSearch] = useState<string>('');

  // Filter team members strictly to In-House only for Project Manager selection
  const inHouseTeamMembers = useMemo(() => {
    return teamMembers.filter(isInHouseMember);
  }, [teamMembers]);

  const filteredQuickMembers = useMemo(() => {
    if (!quickPmSearch.trim()) return inHouseTeamMembers;
    return inHouseTeamMembers.filter(m => m.name.toLowerCase().includes(quickPmSearch.toLowerCase()));
  }, [inHouseTeamMembers, quickPmSearch]);

  // Consolidated Filter Drawer & Date Scope State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [dateScopeMode, setDateScopeMode] = useState<'all' | 'year' | 'month' | 'custom'>('all');
  const [dateScopeYear, setDateScopeYear] = useState<number>(new Date().getFullYear());
  const [dateScopeMonth, setDateScopeMonth] = useState<string>('All');
  const [dateScopeStartDate, setDateScopeStartDate] = useState<string>('');
  const [dateScopeEndDate, setDateScopeEndDate] = useState<string>('');
  
  // Event Types & Searchable Dropdown State
  const [eventTypes, setEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [isEventTypeDropdownOpen, setIsEventTypeDropdownOpen] = useState(false);
  const [eventTypeSearch, setEventTypeSearch] = useState('');
  const [showCustomEventInput, setShowCustomEventInput] = useState(false);
  const [newCustomEventType, setNewCustomEventType] = useState('');
  const eventTypeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Selected Client for 360 Workspace Window Modal
  const [selectedClient, setSelectedClient] = useState<WorkspaceClient | null>(null);

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    event_type: 'Wedding Photography',
    event_date: '',
    total_package_amount: '',
    is_full_payment_received: false,
    advance_amount: '',
    is_advance_received: false,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    whatsapp_group_link: '',
    project_manager_id: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize workspace cache and fetch fresh authoritative clients whenever effectiveWsId changes
  useEffect(() => {
    if (!effectiveWsId || effectiveWsId === 'ws_demo') return;

    setCurrentWorkspaceId(effectiveWsId);

    // 1. Immediately hydrate this workspace's cache to eliminate cross-workspace flash/lag
    const cachedClients = memCachedClientsByWorkspace.get(effectiveWsId);
    if (cachedClients && cachedClients.length > 0) {
      setClients(cachedClients);
      if (memCachedFinanceByWorkspace.has(effectiveWsId)) {
        setFinanceRecordsMap(memCachedFinanceByWorkspace.get(effectiveWsId)!);
      }
      if (memCachedQuoteFinanceByWorkspace.has(effectiveWsId)) {
        setQuoteFinanceMap(memCachedQuoteFinanceByWorkspace.get(effectiveWsId)!);
      }
      if (memCachedTeamByWorkspace.has(effectiveWsId)) {
        setTeamMembers(memCachedTeamByWorkspace.get(effectiveWsId)!);
      }
      setLoading(false);
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`sc_cached_clients_${effectiveWsId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memCachedClientsByWorkspace.set(effectiveWsId, parsed);
            setClients(parsed);
            setLoading(false);
          } else {
            // No valid cache for this workspace: clear immediately so previous workspace cards NEVER flash!
            setClients([]);
            setLoading(true);
          }
        } else {
          setClients([]);
          setLoading(true);
        }
      } catch (_) {
        setClients([]);
        setLoading(true);
      }
    } else {
      setClients([]);
      setLoading(true);
    }

    // 2. Fetch fresh clients from API for this specific workspace
    fetchClientsAndSyncBookedLeads(false, effectiveWsId);
  }, [effectiveWsId]);

  // Event listeners for cache invalidation & storage sync
  useEffect(() => {
    const handleDataRefresh = () => {
      if (effectiveWsId) {
        memCachedClientsByWorkspace.delete(effectiveWsId);
        try {
          localStorage.removeItem(`sc_cached_clients_${effectiveWsId}`);
        } catch (_) {}
        fetchClientsAndSyncBookedLeads(true, effectiveWsId);
      }
    };
    window.addEventListener('quotation_finalized', handleDataRefresh);
    window.addEventListener('finance_updated', handleDataRefresh);
    window.addEventListener('client_created', handleDataRefresh);
    window.addEventListener('client_updated', handleDataRefresh);
    window.addEventListener('post_production_updated', handleDataRefresh);
    window.addEventListener('team_events_updated', handleDataRefresh);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `sc_cached_clients_${effectiveWsId}` || e.key === 'sc_booking_sync_event' || e.key === 'client_created') {
        handleDataRefresh();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('quotation_finalized', handleDataRefresh);
      window.removeEventListener('finance_updated', handleDataRefresh);
      window.removeEventListener('client_created', handleDataRefresh);
      window.removeEventListener('client_updated', handleDataRefresh);
      window.removeEventListener('post_production_updated', handleDataRefresh);
      window.removeEventListener('team_events_updated', handleDataRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [effectiveWsId]);

  const fetchClientsAndSyncBookedLeads = async (silent: boolean = false, targetWsId?: string) => {
    const wsIdToFetch = targetWsId || effectiveWsId;
    if (!wsIdToFetch || wsIdToFetch === 'ws_demo') return;

    if (!silent) {
      const hasCached = (memCachedClientsByWorkspace.get(wsIdToFetch)?.length || 0) > 0;
      if (!hasCached) setLoading(true);
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      setCurrentWorkspaceId(wsIdToFetch);

      let existingClientList: WorkspaceClient[] = [];
      const fMap = new Map<string, ClientFinanceRecord>();
      const qFinMap = new Map<string, { total: number; paid: number; due: number }>();
      let leadList: Lead[] = [];
      let apiSuccess = false;

      // 1. Fetch authoritative workspace clients from enterprise API route (bypasses RLS for invited members)
      try {
        const res = await fetch(`/api/workspace/clients?workspace_id=${encodeURIComponent(wsIdToFetch)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            apiSuccess = true;
            existingClientList = json.clients || [];
            if (Array.isArray(json.financeRecords)) {
              json.financeRecords.forEach((f: any) => {
                if (f.client_id) fMap.set(f.client_id, f);
              });
            }
            if (Array.isArray(json.leads)) {
              leadList = json.leads;
              setLeads(leadList);
            }
            if (Array.isArray(json.teamMembers) && json.teamMembers.length > 0) {
              setTeamMembers(json.teamMembers);
              memCachedTeamByWorkspace.set(wsIdToFetch, json.teamMembers);
            }

            // Parse quotations for financials
            if (Array.isArray(json.quotations)) {
              for (const q of json.quotations) {
                const tot = Number(q.financials?.total_amount || (q as any).total_amount || 0);
                const paid = Number(q.financials?.received_amount || 0);
                const due = Math.max(0, tot - paid);
                if (tot > 0) {
                  const data = { total: tot, paid, due };
                  if (q.client_id) qFinMap.set(q.client_id, data);
                  if (q.quotation_number) qFinMap.set(q.quotation_number, data);
                  const qName = q.couple_names || q.client_name;
                  if (qName) {
                    qFinMap.set(String(qName).toLowerCase().trim(), data);
                    qFinMap.set(String(qName).toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim(), data);
                  }
                }
              }
            }
          }
        }
      } catch (apiErr) {
        console.warn('[ClientsPage] API fetch error, falling back to direct query:', apiErr);
      }

      // 2. Direct client fallback if API route failed
      if (!apiSuccess) {
        let clientQuery = supabase
          .from('workspace_clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (wsIdToFetch && wsIdToFetch !== 'ws_demo') {
          clientQuery = clientQuery.or(`user_id.eq.${wsIdToFetch},workspace_id.eq.${wsIdToFetch}`);
        }

        const { data: clientData } = await clientQuery;
        existingClientList = clientData || [];

        let finQuery = supabase.from('client_finance_records').select('*');
        if (wsIdToFetch && wsIdToFetch !== 'ws_demo') {
          finQuery = finQuery.or(`user_id.eq.${wsIdToFetch},workspace_id.eq.${wsIdToFetch}`);
        }
        const { data: finData } = await finQuery;
        if (finData) {
          finData.forEach(f => {
            if (f.client_id) fMap.set(f.client_id, f);
          });
        }

        let leadsQuery = supabase
          .from('leads')
          .select('id, name, full_name, phone, phone_number, email, event_date, status, raw_payload, final_quotation_id, client_id, workspace_id, notes')
          .order('created_at', { ascending: false })
          .limit(100);

        if (wsIdToFetch && wsIdToFetch !== 'ws_demo') {
          leadsQuery = leadsQuery.eq('workspace_id', wsIdToFetch);
        }

        const { data: leadsData } = await leadsQuery;
        leadList = leadsData || [];
        setLeads(leadList);
      }

      setFinanceRecordsMap(fMap);
      setQuoteFinanceMap(qFinMap);

      // 3. Auto-Sync: For every lead with status 'booked' / 'Booked' that is NOT yet in workspace_clients, create a client record!
      const bookedLeads = leadList.filter(l => {
        const stage = (l.status || (l as any).stage || '').toLowerCase();
        return stage === 'booked' || stage === 'closed' || stage === 'converted';
      });

      const existingLeadIds = new Set(existingClientList.map(c => c.lead_id).filter(Boolean));
      const existingClientIds = new Set(existingClientList.map(c => c.id).filter(Boolean));
      const existingClientPhones = new Set(existingClientList.map(c => c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '').filter(Boolean));
      const existingClientNames = new Set(existingClientList.map(c => c.name ? c.name.toLowerCase().trim() : '').filter(Boolean));

      for (const bookedLead of bookedLeads) {
        const leadPhoneDigits = bookedLead.phone ? bookedLead.phone.replace(/\D/g, '').slice(-10) : '';
        const clientName = bookedLead.raw_payload?.couple_name || (bookedLead as any).couple_names || (bookedLead as any).client_name || bookedLead.name || 'Booked Client';
        const nameClean = clientName.toLowerCase().trim();

        const alreadyLinked = 
          existingLeadIds.has(bookedLead.id) || 
          existingClientIds.has(bookedLead.id) ||
          Boolean(bookedLead.client_id && existingClientIds.has(bookedLead.client_id)) ||
          Boolean(leadPhoneDigits && existingClientPhones.has(leadPhoneDigits)) ||
          Boolean(nameClean && existingClientNames.has(nameClean)) ||
          Boolean(bookedLead.name && existingClientNames.has(bookedLead.name.toLowerCase().trim())) ||
          Boolean((bookedLead as any).full_name && existingClientNames.has(String((bookedLead as any).full_name).toLowerCase().trim()));

        if (alreadyLinked) {
          const matched = existingClientList.find(c => 
            c.id === bookedLead.client_id || 
            c.lead_id === bookedLead.id || 
            (c.name && nameClean && c.name.toLowerCase().trim() === nameClean)
          );
          if (matched && !matched.lead_id) {
            matched.lead_id = bookedLead.id;
          }
        }

        if (!alreadyLinked && bookedLead.name) {
          let packageAmt = 0;
          let paidAmt = 0;
          if (bookedLead.raw_payload) {
            const raw = bookedLead.raw_payload;
            packageAmt = safeParseCurrencyOrBudget(raw.package_amount || raw.amount || raw.budget || 0);
            paidAmt = safeParseCurrencyOrBudget(raw.paid_amount || raw.advance || raw.token || 0);
          }
          const quoteFin = qFinMap.get(bookedLead.id) || (nameClean ? qFinMap.get(nameClean) : null);
          if (quoteFin?.total && quoteFin.total > packageAmt) {
            packageAmt = quoteFin.total;
            paidAmt = quoteFin.paid || 0;
          }

          const leadPmId = (bookedLead as any).project_manager_id || bookedLead.raw_payload?.project_manager_id || null;
          const rawLeadPm = (bookedLead as any).project_manager_name || bookedLead.raw_payload?.project_manager_name || null;
          const validLeadPm = (rawLeadPm && rawLeadPm.toLowerCase() !== 'unassigned') ? rawLeadPm : null;

          const newClientPayload: any = {
            user_id: wsIdToFetch,
            workspace_id: wsIdToFetch,
            lead_id: bookedLead.id,
            name: clientName,
            phone: bookedLead.phone || '',
            email: bookedLead.email || null,
            event_type: (bookedLead as any).event_type || 'Wedding Photography',
            event_date: bookedLead.event_date || null,
            total_package_amount: packageAmt,
            paid_amount: paidAmt,
            status: paidAmt >= packageAmt && packageAmt > 0 ? 'completed' : 'active',
            project_manager_id: leadPmId,
            project_manager_name: validLeadPm,
            handled_by: validLeadPm,
            notes: serializeClientExtended({
              client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
              whatsapp_group_link: bookedLead.whatsapp_group_id ? `https://chat.whatsapp.com/${bookedLead.whatsapp_group_id}` : '',
              portal_token: `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`,
              portal_pin: '123456',
              project_manager_id: leadPmId || '',
              project_manager_name: validLeadPm || '',
              plain_notes: `Auto-synced from Booked CRM Lead (${clientName})`,
              events: bookedLead.event_date ? [
                {
                  id: `ev_${Date.now()}`,
                  name: (bookedLead as any).event_type || 'Wedding Event',
                  date: bookedLead.event_date,
                  time_start: '',
                  time_end: '',
                  venue: (bookedLead as any).venue || (bookedLead as any).location || '',
                  city: (bookedLead as any).city || '',
                  assigned_crew: ''
                }
              ] : []
            })
          };

          try {
            const { data: createdClient, error: insertErr } = await supabase
              .from('workspace_clients')
              .insert([newClientPayload])
              .select('*')
              .single();

            if (!insertErr && createdClient) {
              existingClientList = [createdClient, ...existingClientList];
              existingLeadIds.add(bookedLead.id);
              existingClientIds.add(createdClient.id);
              if (leadPhoneDigits) existingClientPhones.add(leadPhoneDigits);
              if (nameClean) existingClientNames.add(nameClean);
            }
          } catch (autoSyncErr) {
            console.warn('Auto-sync client insert notice:', autoSyncErr);
          }
        }
      }

      // Sort strictly by created_at DESC so newly created clients always appear at the very top!
      existingClientList.sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      // Deduplicate clients list before saving state
      const seenClientKeys = new Set<string>();
      const dedupedClients: WorkspaceClient[] = [];
      for (const cl of existingClientList) {
        const cPhone = cl.phone ? cl.phone.replace(/\D/g, '').slice(-10) : '';
        const idKey = cl.id ? `id:${cl.id}` : null;
        const leadKey = cl.lead_id ? `lead:${cl.lead_id}` : null;
        const phoneKey = cPhone && cPhone.length >= 7 ? `phone:${cPhone}` : null;
        const nameKey = cl.name ? `name:${cl.name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()}` : null;

        if (
          (idKey && seenClientKeys.has(idKey)) ||
          (leadKey && seenClientKeys.has(leadKey)) ||
          (phoneKey && seenClientKeys.has(phoneKey)) ||
          (nameKey && seenClientKeys.has(nameKey))
        ) {
          continue;
        }
        if (idKey) seenClientKeys.add(idKey);
        if (leadKey) seenClientKeys.add(leadKey);
        if (phoneKey) seenClientKeys.add(phoneKey);
        if (nameKey) seenClientKeys.add(nameKey);
        dedupedClients.push(cl);
      }
      existingClientList = dedupedClients;

      // Fetch team members fallback if not populated by API
      if (teamMembers.length === 0) {
        try {
          const members = await fetchWorkspaceTeamMembers(wsIdToFetch);
          if (members && members.length > 0) {
            setTeamMembers(members);
            memCachedTeamByWorkspace.set(wsIdToFetch, members);
          }
        } catch (memErr) {
          console.warn('Could not load team members:', memErr);
        }
      }

      setClients(existingClientList);
      memCachedClientsByWorkspace.set(wsIdToFetch, existingClientList);
      memCachedFinanceByWorkspace.set(wsIdToFetch, fMap);
      memCachedQuoteFinanceByWorkspace.set(wsIdToFetch, qFinMap);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`sc_cached_clients_${wsIdToFetch}`, JSON.stringify(existingClientList));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Error fetching clients and syncing leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick Assign Project Manager (PM) to a client with Bidirectional Dual-Sync
  const handleAssignProjectManager = async (targetClient: WorkspaceClient, member: WorkspaceMemberOption | null) => {
    try {
      const ext = parseClientExtended(targetClient);
      const updatedExt = {
        ...ext,
        project_manager_id: member ? member.id : '',
        project_manager_name: member ? member.name : '',
        project_manager_email: member ? (member.email || '') : '',
        project_manager_phone: member ? (member.phone || '') : '',
      };
      const serializedNotes = serializeClientExtended(updatedExt);

      const updatedFields: Partial<WorkspaceClient> = {
        project_manager_id: member ? member.id : null,
        project_manager_name: member ? member.name : null,
        project_manager_email: member ? (member.email || null) : null,
        project_manager_phone: member ? (member.phone || null) : null,
        notes: serializedNotes,
        updated_at: new Date().toISOString(),
      };

      // Optimistically update UI
      setClients((prev) => {
        const next = prev.map((c) => (c.id === targetClient.id ? { ...c, ...updatedFields } : c));
        if (effectiveWsId) {
          memCachedClientsByWorkspace.set(effectiveWsId, next);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`sc_cached_clients_${effectiveWsId}`, JSON.stringify(next));
              localStorage.setItem('sc_booking_sync_event', Date.now().toString());
            } catch (_) {}
          }
        }
        return next;
      });
      setQuickAssignClient(null);

      // Concurrently execute dual-sync to workspace_clients and fw_projects
      await handleAssignClientPM(targetClient.id, targetClient.name, member);
    } catch (err: any) {
      console.error('Error assigning PM:', err);
      alert(`Failed to assign Project Manager: ${err.message || 'Database error'}`);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eventTypeDropdownRef.current && !eventTypeDropdownRef.current.contains(event.target as Node)) {
        setIsEventTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered event types for modal searchable selector
  const filteredEventTypes = useMemo(() => {
    return eventTypes.filter(t => 
      t.toLowerCase().includes(eventTypeSearch.toLowerCase())
    );
  }, [eventTypes, eventTypeSearch]);

  // Handle adding new custom event type
  const handleAddCustomEventType = () => {
    if (newCustomEventType.trim() && !eventTypes.includes(newCustomEventType.trim())) {
      const updated = [newCustomEventType.trim(), ...eventTypes];
      setEventTypes(updated);
      setFormData(prev => ({ ...prev, event_type: newCustomEventType.trim() }));
      setNewCustomEventType('');
      setShowCustomEventInput(false);
      setIsEventTypeDropdownOpen(false);
    }
  };

  // Lead selection from dropdown (auto-fills form fields)
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      let leadPkg = '';
      let leadPaid = '';
      let leadEvent = lead.event_type || 'Wedding Photography';
      let leadDate = lead.event_date || '';

      if (lead.raw_payload) {
        const raw = lead.raw_payload;
        if (raw.package_amount || raw.budget || raw.amount) {
          leadPkg = String(raw.package_amount || raw.budget || raw.amount).replace(/[^0-9]/g, '');
        }
        if (raw.paid_amount || raw.advance || raw.token) {
          leadPaid = String(raw.paid_amount || raw.advance || raw.token).replace(/[^0-9]/g, '');
        }
      }

      setFormData(prev => ({
        ...prev,
        name: lead.name || prev.name,
        phone: lead.phone || prev.phone,
        email: lead.email || prev.email,
        event_type: leadEvent,
        event_date: leadDate || prev.event_date,
        total_package_amount: leadPkg || prev.total_package_amount,
        advance_amount: leadPaid || prev.advance_amount,
        is_advance_received: Boolean(leadPaid && parseFloat(leadPaid) > 0),
        notes: `Converted from CRM Lead: ${lead.name || 'Lead'}`
      }));
    }
  };

  // Create Client Form Submit
  const handleCreateClient = async (submittedData?: AddClientFormData, leadId?: string) => {
    const dataToUse: AddClientFormData = submittedData || formData;
    const leadIdToUse = leadId !== undefined ? leadId : selectedLeadId;

    if (!dataToUse.name.trim() || !dataToUse.phone.trim()) {
      alert('Please provide Client Name and Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || 'ws_demo';

      const totalPackage = parseFloat(dataToUse.total_package_amount) || 0;
      const advanceAmt = parseFloat(dataToUse.advance_amount) || 0;

      let finalPaidAmount = 0;
      if (dataToUse.is_full_payment_received) {
        finalPaidAmount = totalPackage;
      } else if (dataToUse.is_advance_received && advanceAmt > 0) {
        finalPaidAmount = advanceAmt;
      }

      const clientCode = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
      const portalToken = `tok_${Date.now()}_${Math.random().toString(36).substring(5)}`;
      const portalPin = '123456';

      // Find assigned PM from team members
      const assignedPm = teamMembers.find(m => m.id === dataToUse.project_manager_id);

      // ─── STRICT ZERO DUMMY DATA ENFORCEMENT ───
      let initialMilestones: FinanceMilestoneItem[] = [];
      const paymentDate = dataToUse.payment_date || new Date().toISOString().split('T')[0];

      if (dataToUse.is_full_payment_received && totalPackage > 0) {
        initialMilestones = [
          {
            id: `ms_${Date.now()}_1`,
            step_name: 'Full Contract Payment',
            title: 'Full Contract Payment',
            due_date: paymentDate,
            paid_date: paymentDate,
            amount: totalPackage,
            status: 'completed',
            payment_mode: dataToUse.payment_mode || 'UPI'
          }
        ];
      } else if (advanceAmt > 0) {
        initialMilestones = [
          {
            id: `ms_${Date.now()}_1`,
            step_name: 'Token Booking Amount',
            title: 'Token Booking Amount',
            due_date: paymentDate,
            paid_date: dataToUse.is_advance_received ? paymentDate : null,
            amount: advanceAmt,
            status: dataToUse.is_advance_received ? 'completed' : 'pending',
            payment_mode: dataToUse.payment_mode || 'UPI'
          }
        ];
      } else {
        initialMilestones = [];
      }

      const serializedNotes = serializeClientExtended({
        client_code: clientCode,
        whatsapp_group_link: dataToUse.whatsapp_group_link,
        portal_token: portalToken,
        portal_pin: portalPin,
        plain_notes: dataToUse.notes,
        project_manager_id: assignedPm ? assignedPm.id : undefined,
        project_manager_name: assignedPm ? assignedPm.name : undefined,
        project_manager_email: assignedPm ? assignedPm.email : undefined,
        project_manager_phone: assignedPm ? assignedPm.phone : undefined,
        events: dataToUse.event_date ? [
          {
            id: `ev_${Date.now()}`,
            name: dataToUse.event_type || 'Wedding',
            date: dataToUse.event_date,
            time_start: '',
            time_end: '',
            venue: '',
            city: '',
            assigned_crew: ''
          }
        ] : []
      });

      const clientPayload: any = {
        user_id: workspaceId,
        workspace_id: workspaceId,
        lead_id: leadIdToUse || null,
        name: dataToUse.name,
        phone: dataToUse.phone,
        email: dataToUse.email.trim() || null,
        event_type: dataToUse.event_type,
        event_date: dataToUse.event_date || null,
        total_package_amount: totalPackage,
        paid_amount: finalPaidAmount,
        status: finalPaidAmount >= totalPackage && totalPackage > 0 ? 'completed' : 'active',
        project_manager_id: assignedPm ? assignedPm.id : null,
        project_manager_name: assignedPm ? assignedPm.name : null,
        project_manager_email: assignedPm ? (assignedPm.email || null) : null,
        project_manager_phone: assignedPm ? (assignedPm.phone || null) : null,
        notes: serializedNotes
      };

      const { data: newClient, error } = await supabase
        .from('workspace_clients')
        .insert([clientPayload])
        .select('*')
        .single();

      if (error) {
        // Fallback without direct columns if table doesn't have them
        delete clientPayload.project_manager_id;
        delete clientPayload.project_manager_name;
        delete clientPayload.project_manager_email;
        delete clientPayload.project_manager_phone;
        const { data: fallbackClient, error: fallbackErr } = await supabase
          .from('workspace_clients')
          .insert([clientPayload])
          .select('*')
          .single();
        if (fallbackErr) throw fallbackErr;
        if (fallbackClient) {
          setClients(prev => [fallbackClient, ...prev]);
        }
      } else if (newClient) {
        setClients(prev => [newClient, ...prev]);
        if (assignedPm) {
          handleAssignClientPM(newClient.id, newClient.name, assignedPm).catch(() => {});
        }
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        event_type: 'Wedding Photography',
        event_date: '',
        total_package_amount: '',
        is_full_payment_received: false,
        advance_amount: '',
        is_advance_received: false,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'UPI',
        whatsapp_group_link: '',
        project_manager_id: '',
        notes: '',
      });
      setSelectedLeadId('');
    } catch (err: any) {
      console.error('Error creating client:', err);
      alert(`Failed to create client: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Active / Completed status directly from directory card dropdown
  const handleUpdateClientStatus = async (clientId: string, newStatus: 'active' | 'completed') => {
    // Optimistic local state update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));

    try {
      const { error } = await supabase
        .from('workspace_clients')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) {
        console.error('Error updating client status in Supabase:', error);
      }
    } catch (err) {
      console.error('Error updating client status:', err);
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    try {
      const clientId = clientToDelete.id;
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || currentWorkspaceId || 'ws_demo';

      if (workspaceId !== 'ws_demo') {
        const trashedNotes = (clientToDelete.notes || '') + ' [status:trash]';
        await supabase
          .from('workspace_clients')
          .update({
            status: 'archived',
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            notes: trashedNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        await supabase
          .from('client_finance_records')
          .update({
            status: 'trash',
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        await supabase
          .from('post_production_projects')
          .update({
            overall_status: 'trash',
            notes: `[status:trash]`,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);
      }

      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            status: 'trash' as any,
            is_deleted: true,
            notes: (c.notes || '') + ' [status:trash]'
          };
        }
        return c;
      }));

      if (effectiveWsId) {
        const currentList = memCachedClientsByWorkspace.get(effectiveWsId) || [];
        const updatedList = currentList.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              status: 'trash' as any,
              is_deleted: true,
              notes: (c.notes || '') + ' [status:trash]'
            };
          }
          return c;
        });
        memCachedClientsByWorkspace.set(effectiveWsId, updatedList);
        try {
          localStorage.setItem(`sc_cached_clients_${effectiveWsId}`, JSON.stringify(updatedList));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('client_updated'));
      window.dispatchEvent(new CustomEvent('finance_updated'));
      window.dispatchEvent(new CustomEvent('post_production_updated'));

      setClientToDelete(null);
    } catch (err) {
      console.error('Error soft-deleting client:', err);
      alert('Failed to move client to trash.');
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleRestoreClient = async (client: WorkspaceClient) => {
    try {
      const clientId = client.id;
      const cleanNotes = (client.notes || '').replace(/\[status:trash\]/g, '').trim();
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.id || currentWorkspaceId || 'ws_demo';

      if (workspaceId !== 'ws_demo') {
        await supabase
          .from('workspace_clients')
          .update({
            status: 'active',
            is_deleted: false,
            deleted_at: null,
            notes: cleanNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);

        await supabase
          .from('client_finance_records')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        await supabase
          .from('post_production_projects')
          .update({
            overall_status: 'active',
            notes: cleanNotes,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId);

        try {
          await supabase
            .from('fw_projects')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .or(`client_id.eq.${clientId},client_name.ilike.%${client.name.trim()}%`);
        } catch (_) {}
      }

      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            status: 'active' as any,
            is_deleted: false,
            notes: cleanNotes
          };
        }
        return c;
      }));

      if (effectiveWsId) {
        const currentList = memCachedClientsByWorkspace.get(effectiveWsId) || [];
        const updatedList = currentList.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              status: 'active' as any,
              is_deleted: false,
              notes: cleanNotes
            };
          }
          return c;
        });
        memCachedClientsByWorkspace.set(effectiveWsId, updatedList);
        try {
          localStorage.setItem(`sc_cached_clients_${effectiveWsId}`, JSON.stringify(updatedList));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('client_updated'));
      window.dispatchEvent(new CustomEvent('finance_updated'));
      window.dispatchEvent(new CustomEvent('post_production_updated'));
    } catch (err) {
      console.error('Error restoring client:', err);
      alert('Failed to restore client.');
    }
  };

  // 3D Cream Filter Dropdown Options (Strictly In-House Team Members Only, Deduplicated by Name)
  const pmFilterOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const inHouseList = getDedupedInHouseMembers(teamMembers);

    return [
      { value: 'all', label: 'All Managers' },
      {
        value: 'unassigned',
        label: 'Unassigned (No PM)',
        badge: 'None',
        badgeClassName: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      },
      ...inHouseList.map(pm => ({
        value: pm.name.toLowerCase().trim(),
        label: pm.name,
        badge: 'In-House PM',
      })),
    ];
  }, [teamMembers]);

  const statusFilterOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    const opts = [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active', badge: 'Live' },
      { value: 'completed', label: 'Done', badge: 'Done' },
      { value: 'archived', label: 'Archived' },
    ];
    if (isOwner || clientsAccess === 'ALL_MANAGE') {
      opts.push({ value: 'trash', label: 'Trash 🗑️', badge: 'Trash' });
    }
    return opts;
  }, [isOwner, clientsAccess]);

  const eventTypeFilterOptions: Searchable3DCreamSelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'All Event Types' },
      ...eventTypes.map(t => ({
        value: t,
        label: t,
      })),
    ];
  }, [eventTypes]);

  // Scope clients by PM, Date Scope, Event Type & Search (excluding status filter)
  const scopedNonTrashedClients = useMemo(() => {
    return (clients || []).filter(client => {
      // STRICT WORKSPACE ISOLATION: Never display clients across workspaces
      if (effectiveWsId && effectiveWsId !== 'all') {
        const cWs = client.workspace_id || client.user_id;
        if (cWs && cWs !== effectiveWsId) return false;
      }

      const ext = parseClientExtended(client);
      const pmName = (client.project_manager_name || ext.project_manager_name || '').trim();
      const pmId = (client.project_manager_id || ext.project_manager_id || '').trim();

      const isClientTrashed = Boolean(
        (client.status as string) === 'trash' || 
        (client as any).status === 'trashed' || 
        (client as any).is_deleted === true || 
        (client.notes && typeof client.notes === 'string' && client.notes.includes('[status:trash]'))
      );

      if (isClientTrashed) return false;

      // Granular RBAC: If ASSIGNED_VIEW or ASSIGNED_EDIT, strictly restrict to clients where user is assigned as Project Manager (PM)
      if (isAssignedOnly) {
        const myMemberId = String(activeWorkspace?.memberId || '').toLowerCase().trim();
        const myUserId = String(userId || '').toLowerCase().trim();
        const myEmail = String(userEmail || (activeWorkspace as any)?.memberEmail || '').toLowerCase().trim();
        const myName = String(userName || (activeWorkspace as any)?.memberName || '').toLowerCase().trim();
        const myPhone = String((activeWorkspace as any)?.memberPhone || '').replace(/\D/g, '').slice(-10);

        const isNameMatch = (cand?: string | null) => {
          if (!cand || !myName) return false;
          const c = cand.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
          const m = myName.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
          if (!c || !m) return false;
          if (c === m || c.includes(m) || m.includes(c)) return true;
          const cParts = c.split(' ').filter(Boolean);
          const mParts = m.split(' ').filter(Boolean);
          return cParts.some(cp => mParts.some(mp => cp.length > 2 && cp === mp));
        };

        // Collect all possible candidate IDs for myself in this workspace
        const myCandidateIds = new Set<string>();
        if (myMemberId) myCandidateIds.add(myMemberId);
        if (myUserId) myCandidateIds.add(myUserId);

        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
          teamMembers.forEach(m => {
            const mId = String(m.id || '').toLowerCase().trim();
            const mAuth = String((m as any).auth_user_id || '').toLowerCase().trim();
            const mEmail = String(m.email || '').toLowerCase().trim();
            const mPhone = String(m.phone || '').replace(/\D/g, '').slice(-10);
            const mName = String(m.name || '');

            const isMe = 
              (mId && (mId === myMemberId || mId === myUserId)) ||
              (mAuth && (mAuth === myUserId || mAuth === myMemberId)) ||
              (myEmail && mEmail && mEmail === myEmail) ||
              (myPhone && mPhone && mPhone === myPhone) ||
              isNameMatch(mName);

            if (isMe) {
              if (mId) myCandidateIds.add(mId);
              if (mAuth) myCandidateIds.add(mAuth);
            }
          });
        }

        const cPmId = String(client.project_manager_id || ext.project_manager_id || '').toLowerCase().trim();
        const cPmEmail = String(client.project_manager_email || ext.project_manager_email || '').toLowerCase().trim();
        const cPmName = String(client.project_manager_name || ext.project_manager_name || '');
        const handledBy = String((client as any).handled_by || (client as any).custom_data?.handled_by || '');

        const isClientPM = 
          (cPmId && (myCandidateIds.has(cPmId) || cPmId === myMemberId || cPmId === myUserId)) ||
          (cPmEmail && myEmail && cPmEmail === myEmail) ||
          isNameMatch(cPmName) ||
          (handledBy && isNameMatch(handledBy));

        if (!isClientPM) return false;
      }

      const matchesSearch = 
        !searchQuery ||
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pmName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEventType = eventTypeFilter === 'all' || client.event_type === eventTypeFilter;

      const matchesPm =
        pmFilter === 'all'
          ? true
          : pmFilter === 'unassigned'
          ? (!pmId && !pmName)
          : (
              (pmName && pmName.toLowerCase() === pmFilter.toLowerCase()) ||
              (pmId && pmId.toLowerCase() === pmFilter.toLowerCase())
            );

      let matchesDate = true;
      if (dateScopeMode !== 'all') {
        const rawDate = client.event_date || client.created_at;
        if (!rawDate) {
          matchesDate = false;
        } else {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) {
            matchesDate = false;
          } else if (dateScopeMode === 'year') {
            matchesDate = d.getFullYear() === dateScopeYear;
          } else if (dateScopeMode === 'month') {
            matchesDate = d.getFullYear() === dateScopeYear && (dateScopeMonth === 'All' || d.getMonth() === parseInt(dateScopeMonth, 10));
          } else if (dateScopeMode === 'custom') {
            const t = d.getTime();
            const start = dateScopeStartDate ? new Date(dateScopeStartDate).getTime() : 0;
            const end = dateScopeEndDate ? new Date(dateScopeEndDate).getTime() + 86400000 : Infinity;
            matchesDate = t >= start && t <= end;
          }
        }
      }

      return matchesSearch && matchesEventType && matchesPm && matchesDate;
    });
  }, [clients, searchQuery, eventTypeFilter, pmFilter, dateScopeMode, dateScopeYear, dateScopeMonth, dateScopeStartDate, dateScopeEndDate, isAssignedOnly, activeWorkspace, userId, userEmail, userName, teamMembers]);

  // Scoped Trashed Clients count (updates with PM & Search filter)
  const scopedTrashedClientsCount = useMemo(() => {
    if (isAssignedOnly || isReadOnly) return 0;
    return (clients || []).filter(client => {
      const ext = parseClientExtended(client);
      const pmName = (client.project_manager_name || ext.project_manager_name || '').trim();
      const pmId = (client.project_manager_id || ext.project_manager_id || '').trim();

      const isClientTrashed = Boolean(
        (client.status as string) === 'trash' || 
        (client as any).status === 'trashed' || 
        (client as any).is_deleted === true || 
        (client.notes && typeof client.notes === 'string' && client.notes.includes('[status:trash]'))
      );

      if (!isClientTrashed) return false;

      const matchesSearch = 
        !searchQuery ||
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pmName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEventType = eventTypeFilter === 'all' || client.event_type === eventTypeFilter;

      const matchesPm =
        pmFilter === 'all'
          ? true
          : pmFilter === 'unassigned'
          ? (!pmId && !pmName)
          : (
              (pmName && pmName.toLowerCase() === pmFilter.toLowerCase()) ||
              (pmId && pmId.toLowerCase() === pmFilter.toLowerCase())
            );

      return matchesSearch && matchesEventType && matchesPm;
    }).length;
  }, [clients, searchQuery, eventTypeFilter, pmFilter]);

  // Filtered Clients List with PM Search, Status, Event Type & Date Scope
  const filteredClients = useMemo(() => {
    if (statusFilter === 'trash') {
      return (clients || []).filter(client => {
        const ext = parseClientExtended(client);
        const pmName = (client.project_manager_name || ext.project_manager_name || '').trim();
        const pmId = (client.project_manager_id || ext.project_manager_id || '').trim();

        const isClientTrashed = Boolean(
          (client.status as string) === 'trash' || 
          (client as any).status === 'trashed' || 
          (client as any).is_deleted === true || 
          (client.notes && typeof client.notes === 'string' && client.notes.includes('[status:trash]'))
        );
        if (!isClientTrashed) return false;

        const matchesSearch = 
          !searchQuery ||
          client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone?.includes(searchQuery) ||
          client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ext.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pmName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesEventType = eventTypeFilter === 'all' || client.event_type === eventTypeFilter;
        const matchesPm =
          pmFilter === 'all'
            ? true
            : pmFilter === 'unassigned'
            ? !pmId && !pmName
            : (pmName.toLowerCase() === pmFilter.toLowerCase() || pmId === pmFilter);

        return matchesSearch && matchesEventType && matchesPm;
      });
    }

    return scopedNonTrashedClients.filter(client => {
      if (statusFilter === 'active') return client.status !== 'completed';
      if (statusFilter === 'completed') return client.status === 'completed';
      return true;
    });
  }, [scopedNonTrashedClients, clients, searchQuery, statusFilter, eventTypeFilter, pmFilter]);

  // Active Filter Count & Reset
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (pmFilter !== 'all') count++;
    if (eventTypeFilter !== 'all') count++;
    if (dateScopeMode !== 'all') count++;
    return count;
  }, [statusFilter, pmFilter, eventTypeFilter, dateScopeMode]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPmFilter('all');
    setEventTypeFilter('all');
    setDateScopeMode('all');
    setDateScopeYear(new Date().getFullYear());
    setDateScopeMonth('All');
    setDateScopeStartDate('');
    setDateScopeEndDate('');
  };

  // Dynamically recalculate top stats cards from filtered scope
  const totalClientsCount = scopedNonTrashedClients.length;
  const activeClientsCount = scopedNonTrashedClients.filter(c => c.status !== 'completed').length;
  const completedClientsCount = scopedNonTrashedClients.filter(c => c.status === 'completed').length;
  const trashedClientsCount = scopedTrashedClientsCount;
  const totalInvoicesCount = filteredClients.reduce((sum, c) => {
    const fin = financeRecordsMap.get(c.id) || (c.lead_id ? financeRecordsMap.get(c.lead_id) : undefined);
    const cName = (c.name || '').toLowerCase().trim();
    const cNameNorm = (c.name || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    const qFin = (c.lead_id ? quoteFinanceMap.get(c.lead_id) : undefined) 
      || quoteFinanceMap.get(c.id) 
      || (cName ? quoteFinanceMap.get(cName) : undefined)
      || (cNameNorm ? quoteFinanceMap.get(cNameNorm) : undefined);
    const amt = (fin && Number(fin.final_total_amount) > 0 ? Number(fin.final_total_amount) : Number(c.total_package_amount)) || qFin?.total || 0;
    return sum + amt;
  }, 0);

  const cashRevenueTotal = filteredClients.reduce((sum, c) => {
    const fin = financeRecordsMap.get(c.id) || (c.lead_id ? financeRecordsMap.get(c.lead_id) : undefined);
    const cName = (c.name || '').toLowerCase().trim();
    const cNameNorm = (c.name || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    const qFin = (c.lead_id ? quoteFinanceMap.get(c.lead_id) : undefined) 
      || quoteFinanceMap.get(c.id)
      || (cName ? quoteFinanceMap.get(cName) : undefined)
      || (cNameNorm ? quoteFinanceMap.get(cNameNorm) : undefined);
    const amt = (fin && Number(fin.received_amount) > 0 ? Number(fin.received_amount) : Number(c.paid_amount)) || qFin?.paid || 0;
    return sum + amt;
  }, 0);
  const pendingBalanceTotal = Math.max(0, totalInvoicesCount - cashRevenueTotal);

  if (!loading && !wsLoading && activeWorkspace && !isOwner && clientsAccess === 'NONE') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#EAE5DA] shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have permission to view the Clients Directory for this workspace. Please contact your studio administrator to grant Client Directory access.
          </p>
          <button
            onClick={() => router.push('/assigned-shoots')}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Go to Assigned Shoots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-28 pt-4 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="w-full space-y-6">

        {/* ─────────────────────────────────────────────────────────────
            HEADER & ACTIONS
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE5DA] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Clients Directory
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Manage client workspaces, deliverables, multi-event schedules, and automated WhatsApp delivery portals.
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExcelMigrationModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs transition cursor-pointer"
                title="Import Legacy Excel / CSV Spreadsheet"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>Import Excel / CSV</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm hover:brightness-105 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Client</span>
              </button>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TOP STATS CARDS: TOTAL, ACTIVE, COMPLETED, TRASH
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Total Clients */}
          <div 
            onClick={() => setStatusFilter('all')}
            className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              statusFilter === 'all' ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20' : 'bg-[#FFFDF9] hover:bg-slate-50/80 border-[#EAE5DA]'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Clients
              </span>
              <h3 suppressHydrationWarning className="text-2xl font-black text-slate-900 tracking-tight">
                {totalClientsCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Active Clients */}
          <div 
            onClick={() => setStatusFilter('active')}
            className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              statusFilter === 'active' ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/20' : 'bg-[#FFFDF9] hover:bg-slate-50/80 border-[#EAE5DA]'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Active Clients
              </span>
              <h3 suppressHydrationWarning className="text-2xl font-black text-slate-900 tracking-tight">
                {activeClientsCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>

          {/* Completed Clients */}
          <div 
            onClick={() => setStatusFilter('completed')}
            className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
              statusFilter === 'completed' ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-400/20' : 'bg-[#FFFDF9] hover:bg-slate-50/80 border-[#EAE5DA]'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Completed Clients
              </span>
              <h3 suppressHydrationWarning className="text-2xl font-black text-slate-900 tracking-tight">
                {completedClientsCount}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </div>

          {/* Trashed Clients (Owner/Manage Only) */}
          {!isReadOnly && !isAssignedOnly && (
            <div 
              onClick={() => setStatusFilter(statusFilter === 'trash' ? 'all' : 'trash')}
              className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition ${
                statusFilter === 'trash' 
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20' 
                  : trashedClientsCount > 0 
                    ? 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-200' 
                    : 'bg-[#FFFDF9] hover:bg-slate-50/80 border-[#EAE5DA]'
              }`}
            >
              <div className="space-y-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${trashedClientsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Trash Directory
                </span>
                <h3 suppressHydrationWarning className={`text-2xl font-black tracking-tight ${trashedClientsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                  {trashedClientsCount}
                </h3>
              </div>
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                trashedClientsCount > 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}>
                <Trash2 className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            VIEW TABS (ACTIVE, COMPLETED, ALL, TRASH)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5DA] pb-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#EAE5DA]'
              }`}
            >
              <span>Active Clients</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'active' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeClientsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#EAE5DA]'
              }`}
            >
              <span>Completed</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {completedClientsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-[#EAE5DA]'
              }`}
            >
              <span>All Clients</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {totalClientsCount}
              </span>
            </button>

            {!isReadOnly && !isAssignedOnly && (
              <button
                type="button"
                onClick={() => setStatusFilter('trash')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'trash'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : trashedClientsCount > 0
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                      : 'bg-white hover:bg-slate-100 text-slate-500 border border-[#EAE5DA]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trash</span>
                {trashedClientsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === 'trash' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {trashedClientsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── TRASH BANNER ── */}
        {statusFilter === 'trash' && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                  Trash Directory ({trashedClientsCount} {trashedClientsCount === 1 ? 'client' : 'clients'})
                </h4>
                <p className="text-xs text-rose-700 font-medium">
                  Deleted clients are safely kept here. Click &quot;Restore Client&quot; on any card below to recover it back to the active directory!
                </p>
              </div>
            </div>
            {trashedClientsCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const trashed = clients.filter(c => (c.status as string) === 'trash' || (c.notes && c.notes.includes('[status:trash]')) || (c as any).is_deleted);
                  for (const cl of trashed) {
                    await handleRestoreClient(cl);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore All ({trashedClientsCount})</span>
              </button>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SEARCH & UNIFIED FILTERS TRIGGER
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#EAE5DA] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client by name, card #, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#EAE5DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-rose-50"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear ({activeFilterCount})</span>
              </button>
            )}

            <button
              onClick={() => setIsFilterDrawerOpen(prev => !prev)}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition cursor-pointer shadow-2xs ${
                activeFilterCount > 0 || isFilterDrawerOpen
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-[#EAE5DA]'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-amber-700 font-black text-[10px] flex items-center justify-center shadow-xs">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterDrawerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            UNIFIED FILTER DRAWER
        ───────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-30 overflow-visible rounded-2xl border border-[#EAE5DA] bg-[#FFFDF9] p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAE5DA] pb-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Filter Clients Directory
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                  <span suppressHydrationWarning className="text-[11px] font-bold text-slate-500">
                    {filteredClients.length} of {clients.length} Clients
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-20 overflow-visible">
                {/* 1. PM FILTER */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Project Manager (PM)
                  </label>
                  <Searchable3DCreamSelect
                    value={pmFilter}
                    onChange={(val) => setPmFilter(val)}
                    options={pmFilterOptions}
                    searchable={true}
                    searchPlaceholder="🔍 Search PM..."
                    placeholder="All Managers"
                  />
                </div>

                {/* 2. STATUS FILTER */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Client Status
                  </label>
                  <Searchable3DCreamSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val as any)}
                    options={statusFilterOptions}
                    searchable={false}
                    placeholder="All Statuses"
                  />
                </div>

                {/* 3. EVENT TYPE FILTER */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Event Type
                  </label>
                  <Searchable3DCreamSelect
                    value={eventTypeFilter}
                    onChange={(val) => setEventTypeFilter(val)}
                    options={eventTypeFilterOptions}
                    searchable={true}
                    searchPlaceholder="🔍 Search event type..."
                    placeholder="All Event Types"
                  />
                </div>

                {/* 4. DATE SCOPE PICKER */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Date Scope
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-center">
                    {(['all', 'year', 'month', 'custom'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDateScopeMode(mode)}
                        className={`py-1 text-[10px] font-black rounded-lg transition capitalize cursor-pointer ${
                          dateScopeMode === mode
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DATE SCOPE SUB-CONTROLS */}
              {dateScopeMode !== 'all' && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-wrap items-center gap-4 text-xs">
                  {(dateScopeMode === 'year' || dateScopeMode === 'month') && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Year:</span>
                      <select
                        value={dateScopeYear}
                        onChange={(e) => setDateScopeYear(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-800 cursor-pointer"
                      >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>
                  )}

                  {dateScopeMode === 'month' && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Month:</span>
                      <select
                        value={dateScopeMonth}
                        onChange={(e) => setDateScopeMonth(e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-800 cursor-pointer"
                      >
                        <option value="All">All Months</option>
                        <option value="0">January</option>
                        <option value="1">February</option>
                        <option value="2">March</option>
                        <option value="3">April</option>
                        <option value="4">May</option>
                        <option value="5">June</option>
                        <option value="6">July</option>
                        <option value="7">August</option>
                        <option value="8">September</option>
                        <option value="9">October</option>
                        <option value="10">November</option>
                        <option value="11">December</option>
                      </select>
                    </div>
                  )}

                  {dateScopeMode === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs">From:</span>
                        <input
                          type="date"
                          value={dateScopeStartDate}
                          onChange={(e) => setDateScopeStartDate(e.target.value)}
                          className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs">To:</span>
                        <input
                          type="date"
                          value={dateScopeEndDate}
                          onChange={(e) => setDateScopeEndDate(e.target.value)}
                          className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────
            CLIENT CARDS / TABLE LIST (CLICKABLE FOR 360 WORKSPACE)
        ───────────────────────────────────────────────────────────── */}
        {(loading && clients.length === 0) || wsLoading || currentWorkspaceId !== effectiveWsId ? (
          <StudioCoreLiquidLoader label="Loading Clients Directory..." fullscreen={false} />
        ) : filteredClients.length === 0 ? (
          <div className="bg-[#FFFDF9] p-12 rounded-2xl border border-dashed border-amber-300/80 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Clients Found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                {isOwner 
                  ? 'Mark any lead as "Booked" in the CRM or click "+ Add New Client" above to create a client workspace.'
                  : 'No clients are currently assigned to you in this workspace.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const ext = parseClientExtended(client);
              const fin = financeRecordsMap.get(client.id) || (client.lead_id ? financeRecordsMap.get(client.lead_id) : undefined);
              const clName = (client.name || '').toLowerCase().trim();
              const clNameNorm = (client.name || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
              const quoteFin = (client.lead_id ? quoteFinanceMap.get(client.lead_id) : undefined) 
                || quoteFinanceMap.get(client.id)
                || (clName ? quoteFinanceMap.get(clName) : undefined)
                || (clNameNorm ? quoteFinanceMap.get(clNameNorm) : undefined);

              let totalPkg = 0;
              if (fin && Number(fin.final_total_amount) > 0) {
                totalPkg = Number(fin.final_total_amount);
              } else if (Number(client.total_package_amount) > 0) {
                totalPkg = Number(client.total_package_amount);
              } else if (quoteFin?.total) {
                totalPkg = quoteFin.total;
              }

              let paidAmt = 0;
              if (fin && Number(fin.received_amount) > 0) {
                paidAmt = Number(fin.received_amount);
              } else if (Number(client.paid_amount) > 0) {
                paidAmt = Number(client.paid_amount);
              } else if (quoteFin?.paid) {
                paidAmt = quoteFin.paid;
              }

              const dueAmount = (fin && Number(fin.final_total_amount) > 0 && fin.pending_amount !== undefined && Number(fin.pending_amount) > 0)
                ? Number(fin.pending_amount)
                : Math.max(0, totalPkg - paidAmt);
              const isPaidFull = paidAmt >= totalPkg && totalPkg > 0;
              const isClientTrashed = (client.status as string) === 'trash' || (client as any).status === 'trashed' || (client as any).is_deleted === true || (client.notes && typeof client.notes === 'string' && client.notes.includes('[status:trash]'));

              return (
                <motion.div
                  key={client.id}
                  layout
                  onClick={() => router.push(`/workspace/clients/${client.id}`)}
                  className={`rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-4 items-center group ${
                    isClientTrashed
                      ? 'bg-rose-50/20 hover:bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : 'bg-[#FFFDF9] hover:bg-[#FFFBF2] border-[#EAE5DA] hover:border-amber-400/80'
                  }`}
                >
                  {/* Left (Col 1-5): Client Initials Avatar + Name + Contacts + Overdue Badge */}
                  <div className="lg:col-span-5 flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform border border-amber-300">
                      {client.name ? (client.name.replace(/&/g, ' ').trim().split(/\s+/).filter(Boolean).length === 1 ? client.name.slice(0, 2).toUpperCase() : (client.name.replace(/&/g, ' ').trim().split(/\s+/)[0][0] + client.name.replace(/&/g, ' ').trim().split(/\s+/).slice(-1)[0][0]).toUpperCase()) : 'CL'}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-amber-900 transition-colors truncate">
                          {client.name}
                        </h3>

                        {/* ⏱️ OVERDUE DAYS COUNTER BADGE */}
                        {(() => {
                          const fin = financeRecordsMap.get(client.id) || (client.lead_id ? financeRecordsMap.get(client.lead_id) : undefined);
                          if (!fin || !Array.isArray(fin.milestones)) return null;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = today.toISOString().split('T')[0];

                          const overdueMilestones = fin.milestones.filter(
                            m => m.due_date && m.due_date < todayStr && m.status !== 'completed' && m.status !== 'paid'
                          );

                          if (overdueMilestones.length === 0) return null;

                          const totalOverdueAmt = overdueMilestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
                          const maxOverdueDays = overdueMilestones.reduce((max, m) => {
                            const d = new Date(m.due_date!);
                            d.setHours(0, 0, 0, 0);
                            const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                            return Math.max(max, diff);
                          }, 0);

                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1 shadow-2xs whitespace-nowrap">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>⚠️ Due Since <strong>{maxOverdueDays} Days</strong> (₹{totalOverdueAmt.toLocaleString('en-IN')})</span>
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        {client.phone && (
                          <span className="flex items-center gap-1 text-slate-700 font-bold shrink-0">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="flex items-center gap-1 text-slate-500 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 6-7 (Span 2): Event Type Badge (Strict Horizontal Start) */}
                  <div className="lg:col-span-2 flex items-center">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block truncate max-w-full">
                      {client.event_type || 'Wedding & Reception'}
                    </span>
                  </div>

                  {/* Col 8-9 (Span 2): Project Manager (PM) Badge / Quick Assign (Strict Horizontal Start) */}
                  <div className="lg:col-span-2 flex items-center">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isReadOnly) return;
                        const clientExt = parseClientExtended(client);
                        setQuickAssignClient({
                          ...client,
                          project_manager_id: client.project_manager_id || clientExt.project_manager_id || null,
                          project_manager_name: client.project_manager_name || clientExt.project_manager_name || null,
                        });
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EAE5DA] hover:border-indigo-300 bg-white hover:bg-indigo-50/50 transition-all cursor-pointer shadow-2xs group/pm max-w-full"
                      title="Click to Assign or Change Project Manager"
                    >
                      {(() => {
                        const pmName = client.project_manager_name || ext.project_manager_name;
                        if (pmName) {
                          const initials = pmName.split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs shrink-0">
                                {initials}
                              </span>
                              <span className="text-xs font-black text-slate-900 group-hover/pm:text-indigo-700 truncate max-w-[110px]">
                                {pmName}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 text-slate-400 group-hover/pm:text-indigo-600">
                            <UserPlus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-600 group-hover/pm:text-indigo-600 whitespace-nowrap">+ Assign PM</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Col 10-12 (Span 3): Billing Summary + Status Dropdown + Arrow (Aligned Right) */}
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3.5 w-full pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {hasFinanceAccess && (
                      <div className="text-left lg:text-right space-y-0.5">
                        <span className="font-mono font-black text-sm text-slate-900 block">
                          ₹{totalPkg.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[11px] font-bold">
                          {isPaidFull ? (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-1 lg:justify-end">
                              <Check className="w-3 h-3" /> Paid in Full
                            </span>
                          ) : (
                            <span>
                              <span className="text-emerald-600 font-extrabold">Paid: ₹{paidAmt.toLocaleString('en-IN')}</span>
                              <span className="text-stone-400 mx-1.5 font-bold">•</span>
                              <span className="text-rose-600 font-extrabold">Due: ₹{dueAmount.toLocaleString('en-IN')}</span>
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Trashed Badge or Active/Completed Interactive Dropdown */}
                    {isClientTrashed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        Trash
                      </span>
                    ) : (
                      <ClientStatusDropdown
                        status={client.status}
                        clientId={client.id}
                        disabled={isReadOnly}
                        onStatusChange={(newStatus) => handleUpdateClientStatus(client.id, newStatus)}
                      />
                    )}

                    {/* Soft Delete / Restore Action */}
                    {isClientTrashed ? (
                      (!isReadOnly && !isAssignedOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClient(client);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs border border-emerald-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                          title="Restore Client back to Active Directory"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-white" />
                          <span>Restore Client</span>
                        </button>
                      ))
                    ) : (
                      (!isReadOnly && !isAssignedOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client);
                          }}
                          className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ))
                    )}

                    {/* Open Arrow */}
                    <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-400 text-amber-800 group-hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      <ExcelMigrationModal
        isOpen={isExcelMigrationModalOpen}
        onClose={() => setIsExcelMigrationModalOpen(false)}
        workspaceId={currentWorkspaceId || (typeof window !== 'undefined' ? (sessionStorage.getItem('workspace_id') || '00000000-0000-0000-0000-000000000000') : '00000000-0000-0000-0000-000000000000')}
        onSuccess={async () => {
          await fetchClientsAndSyncBookedLeads();
        }}
      />

      {/* ── ADD NEW CLIENT MODAL (3D LUXURY CREAM MODAL) ── */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        leads={leads}
        teamMembers={inHouseTeamMembers}
        eventTypes={eventTypes}
        onAddCustomEventType={handleAddCustomEventType}
        onSubmit={handleCreateClient}
        isSubmitting={isSubmitting}
      />

      {/* ── 3D CREAM PROJECT MANAGER (PM) GRANULAR ASSIGNMENT MODAL ── */}
      <ProjectManagerAssignModal
        isOpen={Boolean(quickAssignClient)}
        onClose={() => setQuickAssignClient(null)}
        client={quickAssignClient}
        teamMembers={inHouseTeamMembers}
        onAssigned={({ memberId, memberName }) => {
          if (quickAssignClient) {
            setClients(prev => {
              const updated = prev.map(c => {
                if (c.id === quickAssignClient.id) {
                  const oldExt = parseClientExtended(c);
                  const updatedExt = {
                    ...oldExt,
                    project_manager_id: memberId || '',
                    project_manager_name: memberName || '',
                  };
                  const updatedNotes = serializeClientExtended(updatedExt);
                  return {
                    ...c,
                    project_manager_id: memberId,
                    project_manager_name: memberName,
                    handled_by: memberName,
                    notes: updatedNotes
                  };
                }
                return c;
              });
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('sc_cached_clients', JSON.stringify(updated));
                  localStorage.setItem('sc_booking_sync_event', Date.now().toString());
                } catch (_) {}
              }
              return updated;
            });
          }
          setQuickAssignClient(null);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          CLIENT DELETE TO TRASH CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Move Client to Trash?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to move <strong>{clientToDelete.name}</strong> to trash?
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-800 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Total Package:</span>
                <span>₹{(Number(clientToDelete.total_package_amount) || 0).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-amber-700">
                This client will be hidden from active lists and finance revenue stats. You can restore them anytime from the Trash tab.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={isDeletingClient}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                disabled={isDeletingClient}
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                {isDeletingClient ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Moving to Trash...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Move to Trash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

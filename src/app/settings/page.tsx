'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2,
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, Plus, Trash2, Phone, Mail, MessageSquare, Send,
  UserCheck, AlertCircle, ChevronDown, GripVertical, CheckCircle2, Table, ArrowUp, ArrowDown,
  QrCode, Sparkles, Upload, Image as ImageIcon, Building2, CreditCard, Lock, Unlock, ShieldCheck, Key,
  Pencil, X, PackageCheck, Gift, Layers, ListPlus, SlidersHorizontal, Edit2, Edit3, MoveUp, MoveDown,
  Search, FileCheck, Calendar, MapPin, Sliders, Shield, Tag, ChevronRight, CheckSquare, Square,
  Film, HardDrive, User, PhoneCall, Camera, Cpu, Server, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImageToDataUrl } from '@/lib/image-compression';
import CountryPhoneInput from '@/components/ui/CountryPhoneInput';
import { 
  WorkspaceEventType, 
  WorkspaceCrewRole, 
  WorkspaceQuotationDeliverable,
  WorkspaceQuotationSpecialAddon,
  WorkspaceQuotationPaidAddon,
  WorkspaceQuotationDefaultFunction,
  WorkspaceQuotationSettings,
  fetchWorkspaceEventTypes, 
  fetchWorkspaceCrewRoles, 
  fetchWorkspaceQuotationSettings,
  saveWorkspaceEventType, 
  updateWorkspaceEventType,
  deleteWorkspaceEventType, 
  saveWorkspaceCrewRole, 
  updateWorkspaceCrewRole,
  deleteWorkspaceCrewRole, 
  saveWorkspaceQuotationDeliverable,
  updateWorkspaceQuotationDeliverable,
  deleteWorkspaceQuotationDeliverable,
  reorderWorkspaceQuotationDeliverables,
  saveWorkspaceQuotationSpecialAddon,
  updateWorkspaceQuotationSpecialAddon,
  deleteWorkspaceQuotationSpecialAddon,
  reorderWorkspaceQuotationSpecialAddons,
  saveWorkspaceQuotationPaidAddon,
  updateWorkspaceQuotationPaidAddon,
  deleteWorkspaceQuotationPaidAddon,
  reorderWorkspaceQuotationPaidAddons,
  saveWorkspaceQuotationDefaultFunction,
  updateWorkspaceQuotationDefaultFunction,
  deleteWorkspaceQuotationDefaultFunction,
  saveWorkspacePaymentStepName,
  updateWorkspacePaymentStepName,
  deleteWorkspacePaymentStepName,
  reorderWorkspacePaymentStepNames,
  saveAllWorkspaceQuotationSettings,
  DEFAULT_EVENT_TYPES, 
  DEFAULT_WORKSPACE_QUOTATION_SETTINGS,
  DEFAULT_DURATION_SLOTS,
  DEFAULT_QUOTATION_PAYMENT_STEPS,
  getRoleShortCode 
} from '@/lib/workspace-settings';
import CrewRolesSettings from '@/app/workspace/settings/components/CrewRolesSettings';
import PostProductionSettingsTab from '@/app/workspace/settings/components/PostProductionSettingsTab';

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

// 💾 Realistic SD Card Icon (Recognizable cut-corner bevel & metal contact pins)
const SDCardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
    <line x1="8" y1="5.5" x2="8" y2="8.5" />
    <line x1="11" y1="5.5" x2="11" y2="8.5" />
    <line x1="14" y1="5.5" x2="14" y2="8.5" />
    <line x1="17" y1="6.5" x2="17" y2="8.5" />
  </svg>
);

// 💽 High-End SSD / External Drive Icon
const SSDIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="8" x2="7" y2="10" />
    <line x1="10" y1="8" x2="10" y2="10" />
    <line x1="13" y1="8" x2="13" y2="10" />
    <circle cx="17" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const DRIVE_TYPES = [
  { id: 'EXTERNAL_SSD', label: 'SSD', desc: 'USB 3.2 / Thunderbolt NVMe', badge: 'Fastest' },
  { id: 'HDD_RACK', label: 'HDD Rack', desc: 'High-Capacity Cold Storage', badge: 'Archive' },
  { id: 'INTERNAL_DRIVE', label: 'Internal Drive', desc: 'Workstation PCIe / SATA', badge: 'Local' },
  { id: 'NVME_SSD', label: 'NVMe SSD', desc: '4K/8K Editing Scratch Disk', badge: 'Ultra' },
  { id: 'NAS', label: 'NAS', desc: 'Central Multi-User Studio Storage', badge: 'Network' },
  { id: 'OTHER', label: 'Other / Pen Drive', desc: 'Portable Transfer Media', badge: 'Media' },
];

type SettingsTab = 'profile' | 'leads' | 'functions' | 'crew_roles' | 'post_production' | 'quotations' | 'storage' | 'finance';
type QuoteSubTab = 'deliverables' | 'special_addons' | 'paid_addons' | 'default_functions' | 'payment_steps' | 'theme_terms';

interface DropdownItem {
  id: string;
  name: string;
  color: string;
}

// 9 Exact Colors matching user's screenshot
const GOOGLE_PRESET_COLORS = [
  '#3b82f6', // 1. Sky Blue
  '#06b6d4', // 2. Cyan / Turquoise
  '#10b981', // 3. Teal / Mint Green
  '#84cc16', // 4. Lime Green
  '#f43f5e', // 5. Red / Coral
  '#f59e0b', // 6. Yellow / Gold
  '#8b5cf6', // 7. Purple
  '#ec4899', // 8. Pink / Magenta
  '#f97316', // 9. Bright Orange
];

// 💽 Tactile 3D Capacity Input with Integrated GB / TB Dropdown
const CapacityInputWith3DDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  unit: 'GB' | 'TB';
  onUnitChange: (unit: 'GB' | 'TB') => void;
  theme?: 'amber' | 'emerald';
  placeholder?: string;
  required?: boolean;
}> = ({
  value,
  onChange,
  unit,
  onUnitChange,
  theme = 'amber',
  placeholder = '128',
  required = true,
}) => {
  const [open, setOpen] = useState(false);
  const isAmber = theme === 'amber';

  return (
    <div className={`relative flex items-center w-full rounded-xl border bg-white shadow-2xs transition-all ${
      isAmber 
        ? 'border-amber-300 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500' 
        : 'border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500'
    }`}>
      <input
        type="number"
        min="1"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 px-3 py-2 bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
      />
      <div className="relative shrink-0 pr-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black shadow-xs border transition-all cursor-pointer select-none active:translate-y-0.5 whitespace-nowrap ${
            isAmber
              ? 'bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/90 hover:from-amber-100 hover:to-amber-300/90 border-amber-300/90 text-amber-950 shadow-amber-600/10'
              : 'bg-gradient-to-b from-emerald-50 via-emerald-100/90 to-emerald-200/90 hover:from-emerald-100 hover:to-emerald-300/90 border-emerald-300/90 text-emerald-950 shadow-emerald-600/10'
          }`}
          title="Click to toggle between GB and TB"
        >
          <span>{unit}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${isAmber ? 'text-amber-800' : 'text-emerald-800'}`} />
        </button>

        {open && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            <div className={`absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border shadow-xl z-50 p-1 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
              isAmber ? 'border-amber-300' : 'border-emerald-300'
            }`}>
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Storage Unit
              </div>
              <button
                type="button"
                onClick={() => {
                  onUnitChange('GB');
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-black text-left flex items-center justify-between transition cursor-pointer ${
                  unit === 'GB'
                    ? (isAmber ? 'bg-amber-500 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs')
                    : (isAmber ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-emerald-50 text-slate-800')
                }`}
              >
                <span>Gigabytes (GB)</span>
                {unit === 'GB' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUnitChange('TB');
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-black text-left flex items-center justify-between transition cursor-pointer ${
                  unit === 'TB'
                    ? (isAmber ? 'bg-amber-500 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs')
                    : (isAmber ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-emerald-50 text-slate-800')
                }`}
              >
                <span>Terabytes (TB)</span>
                {unit === 'TB' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Module-level in-memory cache for instant 0ms millisecond transitions
let memCachedEventTypes: WorkspaceEventType[] = [];
let memCachedCrewRoles: WorkspaceCrewRole[] = [];
let memCachedHasLoadedSettings = false;

const SETTINGS_NAV_ITEMS: {
  id: SettingsTab;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Studio identity, logo, owner avatar, contact, and social presence.',
    icon: User,
  },
  {
    id: 'leads',
    title: 'Leads & CRM',
    subtitle: 'Lead sources, pipeline stages, and action column controls.',
    icon: Target,
  },
  {
    id: 'functions',
    title: 'Functions & Events',
    subtitle: 'Event types, default times, and sub-event templates.',
    icon: Sparkles,
  },
  {
    id: 'crew_roles',
    title: 'Crew Roles & Codes',
    subtitle: 'Shooter roles, short codes, and gear designations.',
    icon: Users,
  },
  {
    id: 'post_production',
    title: 'Post-Production',
    subtitle: 'Pipeline workflows, edit stages, and client delivery presets.',
    icon: Film,
  },
  {
    id: 'quotations',
    title: 'Quotations & Proposals',
    subtitle: 'Deliverables, addons, payment milestones, and terms.',
    icon: FileText,
  },
  {
    id: 'storage',
    title: 'Studio Storage',
    subtitle: 'Physical memory cards inventory, hard drives, SSDs & NAS arrays.',
    icon: HardDrive,
  },
  {
    id: 'finance',
    title: 'Finance & Invoices',
    subtitle: 'Bank details, UPI QR, tax percentages, and accounts.',
    icon: Coins,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [navSearch, setNavSearch] = useState('');
  const [loading, setLoading] = useState(() => !memCachedHasLoadedSettings);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);

  // Profile Settings States
  const [profileFullName, setProfileFullName] = useState('');
  const [profileStudioName, setProfileStudioName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileInstagram, setProfileInstagram] = useState('');
  const [profileYoutube, setProfileYoutube] = useState('');
  const [profileFacebook, setProfileFacebook] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileLogoUrl, setProfileLogoUrl] = useState('');
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingAvatar(true);
        const compressed = await compressImageToDataUrl(file, 450, 0.85);
        setProfileAvatarUrl(compressed);
      } catch (err) {
        console.error('Avatar error:', err);
      } finally {
        setIsCompressingAvatar(false);
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressingLogo(true);
        const compressed = await compressImageToDataUrl(file, 450, 0.88);
        setProfileLogoUrl(compressed);
      } catch (err) {
        console.error('Logo error:', err);
      } finally {
        setIsCompressingLogo(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const targetUserId = session?.user?.id || workspaceId;

      const payload = {
        userId: targetUserId,
        fullName: profileFullName.trim(),
        studioName: profileStudioName.trim() || 'My Studio',
        phone: profilePhone.trim(),
        address: profileAddress.trim(),
        instagram: profileInstagram.trim(),
        youtube: profileYoutube.trim(),
        facebook: profileFacebook.trim(),
        avatarUrl: profileAvatarUrl,
        logoUrl: profileLogoUrl,
      };

      // 0ms Optimistic Local Update
      if (typeof window !== 'undefined') {
        if (payload.studioName) {
          localStorage.setItem('sc_studio_name', payload.studioName);
          localStorage.setItem('fw_studio_name', payload.studioName);
        }
        if (payload.avatarUrl) localStorage.setItem('sc_avatar_url', payload.avatarUrl);
        if (payload.logoUrl) localStorage.setItem('sc_logo_url', payload.logoUrl);
        if (payload.fullName) localStorage.setItem('sc_user_name', payload.fullName);
        window.dispatchEvent(new CustomEvent('sc_profile_updated', { detail: payload }));
      }

      const res = await fetch('/api/user/profile-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveToast('Profile details saved & synced live across studio!');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert('Failed to save profile: ' + (errJson.error || 'Unknown server error'));
      }
    } catch (err: any) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Functions & Crew Roles States
  const [eventTypes, setEventTypes] = useState<WorkspaceEventType[]>(() => memCachedEventTypes.length > 0 ? memCachedEventTypes : DEFAULT_EVENT_TYPES);
  const [crewRoles, setCrewRoles] = useState<WorkspaceCrewRole[]>(() => memCachedCrewRoles);
  const [loadingCrewRoles, setLoadingCrewRoles] = useState<boolean>(() => !memCachedHasLoadedSettings);
  const [newEventName, setNewEventName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  // Editing Modals State
  const [editingFunction, setEditingFunction] = useState<WorkspaceEventType | null>(null);
  const [editFunctionName, setEditFunctionName] = useState('');
  const [editingCrewRole, setEditingCrewRole] = useState<WorkspaceCrewRole | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('');

  // Quotation Settings Suite States
  // Payment Steps states
  const [newStepName, setNewStepName] = useState('');
  const [stepSearch, setStepSearch] = useState('');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepText, setEditStepText] = useState('');

  // Reorder Handlers for Quotation Deliverables, Add-Ons & Payment Steps
  const moveDeliverable = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.deliverables];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationDeliverables(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, deliverables: reordered }));
  };

  const moveSpecialAddon = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.specialAddons];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationSpecialAddons(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, specialAddons: reordered }));
  };

  const movePaidAddon = async (idx: number, direction: 'up' | 'down') => {
    const list = [...quotationSettings.paidAddons];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = await reorderWorkspaceQuotationPaidAddons(list, workspaceId);
    setQuotationSettings(prev => ({ ...prev, paidAddons: reordered }));
  };

  const movePaymentStep = async (idx: number, direction: 'up' | 'down') => {
    const steps = [...(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS)];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const temp = steps[idx];
    steps[idx] = steps[targetIdx];
    steps[targetIdx] = temp;
    const reordered = await reorderWorkspacePaymentStepNames(steps, workspaceId);
    setQuotationSettings(prev => ({ ...prev, paymentSteps: reordered }));
  };

  const [quoteSubTab, setQuoteSubTab] = useState<QuoteSubTab>('deliverables');
  const [quotationSettings, setQuotationSettings] = useState<WorkspaceQuotationSettings>(DEFAULT_WORKSPACE_QUOTATION_SETTINGS);
  
  // Deliverables states
  const [newDelivTitle, setNewDelivTitle] = useState('');
  const [newDelivCat, setNewDelivCat] = useState('Video');
  const [delivSearch, setDelivSearch] = useState('');
  const [editingDeliv, setEditingDeliv] = useState<WorkspaceQuotationDeliverable | null>(null);
  const [editDelivTitle, setEditDelivTitle] = useState('');
  const [editDelivCat, setEditDelivCat] = useState('Video');

  // Special Addons states
  const [newSpecialTitle, setNewSpecialTitle] = useState('');
  const [newSpecialCat, setNewSpecialCat] = useState('Shoots');
  const [specialSearch, setSpecialSearch] = useState('');
  const [editingSpecial, setEditingSpecial] = useState<WorkspaceQuotationSpecialAddon | null>(null);
  const [editSpecialTitle, setEditSpecialTitle] = useState('');
  const [editSpecialCat, setEditSpecialCat] = useState('Shoots');

  // Paid Addons states
  const [newPaidTitle, setNewPaidTitle] = useState('');
  const [newPaidPrice, setNewPaidPrice] = useState('10000');
  const [newPaidCat, setNewPaidCat] = useState('Photography');
  const [paidSearch, setPaidSearch] = useState('');
  const [editingPaid, setEditingPaid] = useState<WorkspaceQuotationPaidAddon | null>(null);
  const [editPaidTitle, setEditPaidTitle] = useState('');
  const [editPaidPrice, setEditPaidPrice] = useState('10000');
  const [editPaidCat, setEditPaidCat] = useState('Photography');

  // Default Functions states
  const [newDefaultFuncName, setNewDefaultFuncName] = useState('');
  const [newDefaultFuncDuration, setNewDefaultFuncDuration] = useState('7 Hours');
  const [newDefaultFuncNotes, setNewDefaultFuncNotes] = useState('');
  const [newDefaultFuncLocation, setNewDefaultFuncLocation] = useState('VENUE / HOTEL NAME');
  const [defaultFuncSearch, setDefaultFuncSearch] = useState('');
  const [editingDefaultFunc, setEditingDefaultFunc] = useState<WorkspaceQuotationDefaultFunction | null>(null);
  const [editDefaultFuncName, setEditDefaultFuncName] = useState('');
  const [editDefaultFuncDuration, setEditDefaultFuncDuration] = useState('7 Hours');
  const [editDefaultFuncNotes, setEditDefaultFuncNotes] = useState('');
  const [editDefaultFuncLocation, setEditDefaultFuncLocation] = useState('');
  const [editDefaultFuncReqs, setEditDefaultFuncReqs] = useState<Array<{ name: string; qty: number }>>([]);

  // Studio Storage (Memory Cards & Physical Drives) States
  const [storageCards, setStorageCards] = useState<any[]>([]);
  const [storageDisks, setStorageDisks] = useState<any[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [showAddDiskForm, setShowAddDiskForm] = useState(false);

  // Card Form
  const [newCardName, setNewCardName] = useState('');
  const [newCardCapacity, setNewCardCapacity] = useState('128');
  const [newCardCapacityUnit, setNewCardCapacityUnit] = useState<'GB' | 'TB'>('GB');
  const [newCardType, setNewCardType] = useState('SDXC V90');
  const [newCardSpeed, setNewCardSpeed] = useState('V90 300MB/s');
  const [newCardColor, setNewCardColor] = useState('#F59E0B');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  // Disk Form
  const [newDiskName, setNewDiskName] = useState('');
  const [newDiskType, setNewDiskType] = useState('EXTERNAL_SSD');
  const [isDriveTypeDropdownOpen, setIsDriveTypeDropdownOpen] = useState(false);
  const [newDiskCapacity, setNewDiskCapacity] = useState('2000');
  const [newDiskCapacityUnit, setNewDiskCapacityUnit] = useState<'GB' | 'TB'>('GB');
  const [newDiskLocation, setNewDiskLocation] = useState('Studio Desk 1');
  const [newDiskColor, setNewDiskColor] = useState('#3B82F6');
  const [newDiskNotes, setNewDiskNotes] = useState('');
  const [editingDiskId, setEditingDiskId] = useState<string | null>(null);
  const [savingDisk, setSavingDisk] = useState(false);

  // 3D Popups for Editing Card & Drive
  const [editingCardModal, setEditingCardModal] = useState<any | null>(null);
  const [editingDiskModal, setEditingDiskModal] = useState<any | null>(null);
  const [isModalDriveTypeDropdownOpen, setIsModalDriveTypeDropdownOpen] = useState(false);
  const [savingModalCard, setSavingModalCard] = useState(false);
  const [savingModalDisk, setSavingModalDisk] = useState(false);

  const fetchStorageHardware = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoadingStorage(true);
      const [cRes, dRes] = await Promise.all([
        fetch(`/api/storage/cards?workspace_id=${workspaceId}`).then(r => r.json()).catch(() => ({ cards: [] })),
        fetch(`/api/storage/disks?workspace_id=${workspaceId}`).then(r => r.json()).catch(() => ({ disks: [] }))
      ]);
      if (cRes.success) setStorageCards(cRes.cards || []);
      if (dRes.success) setStorageDisks(dRes.disks || []);
    } catch (err) {
      console.warn('Error fetching storage:', err);
    } finally {
      setLoadingStorage(false);
    }
  }, [workspaceId]);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;
    setSavingCard(true);
    try {
      const capGb = newCardCapacityUnit === 'TB' ? Number(newCardCapacity) * 1000 : Number(newCardCapacity);
      const payload: any = {
        workspace_id: workspaceId,
        card_name: newCardName.trim(),
        card_type: newCardType || 'SDXC V90',
        capacity_gb: capGb || 128,
        speed_class: newCardSpeed,
        color_tag: newCardColor,
        notes: newCardNotes.trim(),
      };
      if (editingCardId) {
        payload.id = editingCardId;
      }
      const res = await fetch('/api/storage/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.card) {
        if (editingCardId) {
          setStorageCards(prev => prev.map(c => c.id === editingCardId ? data.card : c));
          setEditingCardId(null);
        } else {
          setStorageCards(prev => [...prev.filter(c => c.id !== data.card.id), data.card]);
        }
        setNewCardName('');
        setNewCardCapacity('128');
        setNewCardCapacityUnit('GB');
        setNewCardNotes('');
        setSaveToast('Memory Card saved successfully!');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      alert('Failed to save card: ' + err.message);
    } finally {
      setSavingCard(false);
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCardId(card.id);
    setNewCardName(card.card_name);
    let capVal = String(card.capacity_gb || 128);
    let capUnit: 'GB' | 'TB' = 'GB';
    if (card.capacity_gb >= 1000 && card.capacity_gb % 1000 === 0) {
      capVal = String(card.capacity_gb / 1000);
      capUnit = 'TB';
    }
    setNewCardCapacity(capVal);
    setNewCardCapacityUnit(capUnit);
    setNewCardType(card.card_type || 'SDXC V90');
    setNewCardSpeed(card.speed_class || 'V90 300MB/s');
    setNewCardColor(card.color_tag || '#F59E0B');
    setNewCardNotes(card.notes || '');

    // Open 3D Edit Modal Popup
    setEditingCardModal({
      ...card,
      capacity_val: capVal,
      capacity_unit: capUnit,
    });
  };

  const handleSaveModalCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardModal || !editingCardModal.card_name?.trim()) return;
    setSavingModalCard(true);
    try {
      const capGb = editingCardModal.capacity_unit === 'TB' 
        ? Number(editingCardModal.capacity_val) * 1000 
        : Number(editingCardModal.capacity_val);
      const payload: any = {
        id: editingCardModal.id,
        workspace_id: workspaceId,
        card_name: editingCardModal.card_name.trim(),
        card_type: editingCardModal.card_type || 'SDXC V90',
        capacity_gb: capGb || 128,
        speed_class: editingCardModal.speed_class || '',
        color_tag: editingCardModal.color_tag || '#F59E0B',
        notes: (editingCardModal.notes || '').trim(),
      };
      const res = await fetch('/api/storage/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.card) {
        setStorageCards(prev => prev.map(c => c.id === editingCardModal.id ? data.card : c));
        setEditingCardModal(null);
        setSaveToast('Memory Card updated successfully!');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      alert('Failed to update card: ' + err.message);
    } finally {
      setSavingModalCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory card?')) return;
    try {
      const res = await fetch(`/api/storage/cards?id=${id}&workspace_id=${workspaceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStorageCards(prev => prev.filter(c => c.id !== id));
        if (editingCardId === id) {
          setEditingCardId(null);
          setNewCardName('');
        }
      }
    } catch (err: any) {
      alert('Failed to delete card: ' + err.message);
    }
  };

  const handleSaveDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiskName.trim()) return;
    setSavingDisk(true);
    try {
      const capGb = newDiskCapacityUnit === 'TB' ? Number(newDiskCapacity) * 1000 : Number(newDiskCapacity);
      const payload: any = {
        workspace_id: workspaceId,
        disk_name: newDiskName.trim(),
        disk_type: newDiskType,
        total_capacity_gb: capGb || 2000,
        free_capacity_gb: Math.round((capGb || 2000) * 0.8),
        physical_location: newDiskLocation.trim() || 'Studio Desk 1',
        color_tag: newDiskColor,
        notes: newDiskNotes.trim(),
      };
      if (editingDiskId) {
        payload.id = editingDiskId;
      }
      const res = await fetch('/api/storage/disks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.disk) {
        if (editingDiskId) {
          setStorageDisks(prev => prev.map(d => d.id === editingDiskId ? data.disk : d));
          setEditingDiskId(null);
        } else {
          setStorageDisks(prev => [...prev.filter(d => d.id !== data.disk.id), data.disk]);
        }
        setNewDiskName('');
        setNewDiskCapacity('2000');
        setNewDiskCapacityUnit('GB');
        setNewDiskNotes('');
        setSaveToast('Storage drive saved successfully!');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      alert('Failed to save drive: ' + err.message);
    } finally {
      setSavingDisk(false);
    }
  };

  const handleEditDisk = (disk: any) => {
    setEditingDiskId(disk.id);
    setNewDiskName(disk.disk_name);
    let capVal = String(disk.total_capacity_gb || 2000);
    let capUnit: 'GB' | 'TB' = 'GB';
    if (disk.total_capacity_gb >= 1000 && disk.total_capacity_gb % 1000 === 0) {
      capVal = String(disk.total_capacity_gb / 1000);
      capUnit = 'TB';
    }
    setNewDiskCapacity(capVal);
    setNewDiskCapacityUnit(capUnit);
    setNewDiskType(disk.disk_type || 'EXTERNAL_SSD');
    setNewDiskLocation(disk.physical_location || 'Studio Desk 1');
    setNewDiskColor(disk.color_tag || '#3B82F6');
    setNewDiskNotes(disk.notes || '');

    // Open 3D Edit Modal Popup
    setEditingDiskModal({
      ...disk,
      capacity_val: capVal,
      capacity_unit: capUnit,
    });
  };

  const handleSaveModalDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiskModal || !editingDiskModal.disk_name?.trim()) return;
    setSavingModalDisk(true);
    try {
      const capGb = editingDiskModal.capacity_unit === 'TB' 
        ? Number(editingDiskModal.capacity_val) * 1000 
        : Number(editingDiskModal.capacity_val);
      const payload: any = {
        id: editingDiskModal.id,
        workspace_id: workspaceId,
        disk_name: editingDiskModal.disk_name.trim(),
        disk_type: editingDiskModal.disk_type || 'EXTERNAL_SSD',
        total_capacity_gb: capGb || 2000,
        free_capacity_gb: Math.round((capGb || 2000) * 0.8),
        physical_location: (editingDiskModal.physical_location || '').trim() || 'Studio Desk 1',
        color_tag: editingDiskModal.color_tag || '#3B82F6',
        notes: (editingDiskModal.notes || '').trim(),
      };
      const res = await fetch('/api/storage/disks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.disk) {
        setStorageDisks(prev => prev.map(d => d.id === editingDiskModal.id ? data.disk : d));
        setEditingDiskModal(null);
        setSaveToast('Storage drive updated successfully!');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err: any) {
      alert('Failed to update storage drive: ' + err.message);
    } finally {
      setSavingModalDisk(false);
    }
  };

  const handleDeleteDisk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this storage drive?')) return;
    try {
      const res = await fetch(`/api/storage/disks?id=${id}&workspace_id=${workspaceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStorageDisks(prev => prev.filter(d => d.id !== id));
        if (editingDiskId === id) {
          setEditingDiskId(null);
          setNewDiskName('');
        }
      }
    } catch (err: any) {
      alert('Failed to delete drive: ' + err.message);
    }
  };

  // 1. Leads Page Settings
  const [leadOwners, setLeadOwners] = useState<DropdownItem[]>([
    { id: '1', name: 'Unassigned', color: '#10b981' },
    { id: '2', name: 'Sahil Dhonde', color: '#3b82f6' },
    { id: '3', name: 'Sushant Nawale', color: '#8b5cf6' },
    { id: '4', name: 'Production Team', color: '#f43f5e' },
  ]);

  const [leadSources, setLeadSources] = useState<DropdownItem[]>([
    { id: 's1', name: 'Facebook Ads', color: '#3b82f6' },
    { id: 's2', name: 'Instagram Ads', color: '#ec4899' },
    { id: 's3', name: 'Google Ads', color: '#f43f5e' },
    { id: 's4', name: 'Website', color: '#10b981' },
    { id: 's5', name: 'Referral', color: '#f59e0b' },
    { id: 's6', name: 'WhatsApp Welcome Message', color: '#84cc16' },
  ]);

  const [leadStages, setLeadStages] = useState<DropdownItem[]>([
    { id: 'new', name: 'Inquiry / New', color: '#3b82f6' },
    { id: 'contacted', name: 'Contacted', color: '#8b5cf6' },
    { id: 'cool', name: 'Cool / Warm', color: '#06b6d4' },
    { id: 'hot', name: 'Hot Lead', color: '#f43f5e' },
    { id: 'booked', name: 'Booked', color: '#84cc16' },
    { id: 'lost', name: 'Lost / Closed', color: '#f43f5e' },
  ]);

  const [budgetRanges, setBudgetRanges] = useState<DropdownItem[]>([
    { id: 'b1', name: '50k - 1L', color: '#10b981' },
    { id: 'b2', name: '1L - 2.5L', color: '#3b82f6' },
    { id: 'b3', name: '2.5L - 5L', color: '#f59e0b' },
    { id: 'b4', name: '5L+', color: '#f43f5e' },
  ]);

  // Lead Action Buttons Checkboxes (Default for new users: quotation, call, mail, comments)
  const [quickActions, setQuickActions] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('leads_quick_actions');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) {}
      }
    }
    return {
      quotation: true,
      call: true,
      mail: true,
      comments: true,
      google_contact: false,
      wgl_alert: false,
      whatsapp: false,
      followup: false,
    };
  });

  // 2. Quotations Page Settings
  const [pdfTheme, setPdfTheme] = useState('royal_gold');
  const [quoteTerms, setQuoteTerms] = useState('Deliverables will be compiled and sent within 45 days of wedding event completion.');
  const [quoteExpiryDays, setQuoteExpiryDays] = useState(14);
  const [currency, setCurrency] = useState('INR');
  const [contractClauses, setContractClauses] = useState('1. Standard contract terms apply for all assignments.\n2. Final deliverables delivered post clearance.');

  // 3. Finance & Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('FILMIFY WEDDINGS');
  const [invoiceTagline, setInvoiceTagline] = useState('Luxury Wedding Photography & Cinematography');
  const [invoiceGstin, setInvoiceGstin] = useState('27AABCF1234F1ZP');
  const [invoiceAddress, setInvoiceAddress] = useState('Mumbai, Maharashtra, India');
  const [invoicePhone, setInvoicePhone] = useState('+91 98765 43210');
  const [invoiceEmail, setInvoiceEmail] = useState('info@filmifyweddings.com');
  const [invoiceBankName, setInvoiceBankName] = useState('HDFC Bank');
  const [invoiceAccountNo, setInvoiceAccountNo] = useState('50200012345678');
  const [invoiceIfsc, setInvoiceIfsc] = useState('HDFC0001234');
  const [invoiceAccountHolder, setInvoiceAccountHolder] = useState('Filmify Weddings LLP');
  const [invoiceTerms, setInvoiceTerms] = useState('1. Advance payment is non-refundable upon client cancellation.\n2. Final deliverables delivered post clearance of balance.');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('Thank you for choosing Filmify Weddings! This is a computer-generated invoice.');
  const [invoiceFont, setInvoiceFont] = useState('Cormorant Garamond');
  const [invoiceThemePalette, setInvoiceThemePalette] = useState('auto');
  const [invoiceQrImageUrl, setInvoiceQrImageUrl] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('PRJ-2026-');
  const [gstPercent, setGstPercent] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('50% Retainer for booking lock, 50% on Event Date');
  const [upiId, setUpiId] = useState('studio@upi');
  const [bankDetails, setBankDetails] = useState('HDFC Bank, Acc: 50100987654321, IFSC: HDFC0001234');
  const [expenseCategories, setExpenseCategories] = useState<DropdownItem[]>([
    { id: 'e1', name: 'Marketing', color: '#3b82f6' },
    { id: 'e2', name: 'Crew Travel', color: '#f97316' },
    { id: 'e3', name: 'Equipment', color: '#8b5cf6' },
    { id: 'e4', name: 'Editor Pay', color: '#10b981' },
  ]);

  // 3.1 Finance Vault & PIN Security Settings
  const [financePinLocked, setFinancePinLocked] = useState(false);
  const [financePinCode, setFinancePinCode] = useState('123456');
  const [financeAdminEmail, setFinanceAdminEmail] = useState('');
  const [financeMasterPassword, setFinanceMasterPassword] = useState('');
  const [financeTimeoutMins, setFinanceTimeoutMins] = useState(60);

  // 4. Attendance Settings
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [shiftStart, setShiftStart] = useState('09:30');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [breakLimitMinutes, setBreakLimitMinutes] = useState(60);

  // 5. Meta Settings
  const [metaAutoSync, setMetaAutoSync] = useState(true);

  // Get Auth Headers helper
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Sync settings to localStorage
  const syncToLocalStorage = (wId: string, settingsObj: any) => {
    try {
      const ownerNames = (settingsObj.lead_owners || []).map((o: any) => typeof o === 'string' ? o : o.name);
      localStorage.setItem(`settings_owners_${wId}`, JSON.stringify(ownerNames));
      localStorage.setItem(`settings_owners_full_${wId}`, JSON.stringify(leadOwners));
      localStorage.setItem('leads_workspace_team_members', JSON.stringify(
        leadOwners.map((o, idx) => ({ id: o.id || String(idx + 1), name: o.name, email: '', role: 'Lead Owner', color: o.color }))
      ));

      // Sync Sources
      localStorage.setItem(`settings_sources_${wId}`, JSON.stringify(leadSources));
      localStorage.setItem('leads_workspace_sources', JSON.stringify(leadSources));

      // Sync Stages
      localStorage.setItem(`settings_stages_${wId}`, JSON.stringify(leadStages));
      localStorage.setItem('leads_workspace_stages', JSON.stringify(leadStages.map((st, pos) => ({
        id: st.id || st.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: st.name,
        color: st.color,
        position: pos
      }))));

      // Sync Quick Actions
      if (settingsObj.lead_quick_actions && typeof settingsObj.lead_quick_actions === 'object') {
        localStorage.setItem('leads_quick_actions', JSON.stringify(settingsObj.lead_quick_actions));
        localStorage.setItem(`settings_quick_actions_${wId}`, JSON.stringify(settingsObj.lead_quick_actions));
      }

      localStorage.setItem(`settings_currency_${wId}`, settingsObj.quotation_currency || currency);
      localStorage.setItem(`settings_gst_${wId}`, String(settingsObj.invoice_gst_percent ?? gstPercent));
      localStorage.setItem(`settings_upi_${wId}`, settingsObj.invoice_upi_id || upiId);
      localStorage.setItem(`settings_geofence_${wId}`, String(settingsObj.geofence_radius_meters || geofenceRadius));
      localStorage.setItem('studio_invoice_template_config', JSON.stringify({
        companyName: settingsObj.invoice_company_name || invoiceCompanyName,
        tagline: settingsObj.invoice_tagline || invoiceTagline,
        gstin: settingsObj.invoice_gstin || invoiceGstin,
        address: settingsObj.invoice_address || invoiceAddress,
        phone: settingsObj.invoice_phone || invoicePhone,
        email: settingsObj.invoice_email || invoiceEmail,
        invoiceTitle: 'TAX INVOICE',
        prefix: settingsObj.sequence_invoices_prefix || invoicePrefix,
        bankName: settingsObj.invoice_bank_name || invoiceBankName,
        accountNo: settingsObj.invoice_account_no || invoiceAccountNo,
        ifsc: settingsObj.invoice_ifsc || invoiceIfsc,
        accountHolder: settingsObj.invoice_account_holder || invoiceAccountHolder,
        upiId: settingsObj.invoice_upi_id || upiId,
        showUpiQr: true,
        terms: settingsObj.invoice_terms || invoiceTerms,
        footerNote: settingsObj.invoice_footer_note || invoiceFooterNote,
        logoUrl: '',
        qrCodeImageUrl: settingsObj.invoice_qr_image_url || invoiceQrImageUrl,
        fontFamily: settingsObj.invoice_font || invoiceFont,
        themePreset: settingsObj.invoice_theme_palette || invoiceThemePalette,
        themeColor: '#D4AF37',
      }));
    } catch (_) {}
  };

  // Load Settings from Supabase
  const loadWorkspaceSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const wId = session.user.id;
      setWorkspaceId(wId);

      const headers = await getAuthHeaders();

      // Fetch studio & account profile details
      try {
        const profRes = await fetch('/api/user/profile-setup', { headers });
        if (profRes.ok) {
          const pData = await profRes.json();
          if (pData?.profile) {
            const p = pData.profile;
            setProfileFullName(p.fullName || '');
            setProfileStudioName(p.studioName || '');
            setProfilePhone(p.phone || '');
            setProfileEmail(p.email || '');
            setProfileAddress(p.address || '');
            setProfileInstagram(p.instagram || '');
            setProfileYoutube(p.youtube || '');
            setProfileFacebook(p.facebook || '');
            setProfileAvatarUrl(p.avatarUrl || '');
            setProfileLogoUrl(p.logoUrl || '');
          }
        }
      } catch (profErr) {
        console.warn('Profile load error:', profErr);
      }

      const res = await fetch(`/api/settings?workspace_id=${wId}`, { headers });

      // Fetch full workspace quotation settings
      const qSettings = await fetchWorkspaceQuotationSettings(wId);
      setQuotationSettings(qSettings);

      // Fetch Studio Storage Hardware (Cards & Physical Disks)
      try {
        const [cRes, dRes] = await Promise.all([
          fetch(`/api/storage/cards?workspace_id=${wId}`).then(r => r.json()).catch(() => ({ cards: [] })),
          fetch(`/api/storage/disks?workspace_id=${wId}`).then(r => r.json()).catch(() => ({ disks: [] }))
        ]);
        if (cRes.success) setStorageCards(cRes.cards || []);
        if (dRes.success) setStorageDisks(dRes.disks || []);
      } catch (stErr) {
        console.warn('Storage load error:', stErr);
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;

          // Leads Owners
          if (Array.isArray(s.lead_owners) && s.lead_owners.length > 0) {
            setLeadOwners(s.lead_owners.map((o: any, idx: number) => {
              if (typeof o === 'string') {
                return { id: String(idx + 1), name: o, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return o;
            }));
          }

          // Lead Sources
          if (Array.isArray(s.lead_sources) && s.lead_sources.length > 0) {
            setLeadSources(s.lead_sources.map((src: any, idx: number) => {
              if (typeof src === 'string') {
                return { id: `src_${idx}`, name: src, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return src;
            }));
          }

          // Lead Stages
          if (Array.isArray(s.lead_stages) && s.lead_stages.length > 0) {
            const sanitized = s.lead_stages
              .filter((st: any) => {
                const id = String(st?.id || (typeof st === 'string' ? st : '')).toLowerCase().trim();
                const name = String(st?.name || (typeof st === 'string' ? st : '')).toLowerCase().trim();
                if (id === 'won' || id === 'win') return false;
                if (name === 'won' || name.startsWith('won ') || name.includes('won 🎉') || name.includes('won /') || name.includes('win')) return false;
                return true;
              })
              .map((st: any, idx: number) => {
                if (typeof st === 'string') {
                  return { id: `st_${idx}`, name: st, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
                }
                return st;
              });

            const hasBooked = sanitized.some((st: any) => st.id === 'booked' || String(st.name || '').toLowerCase().trim() === 'booked');
            if (!hasBooked) {
              const lostIdx = sanitized.findIndex((st: any) => st.id === 'lost' || String(st.name || '').toLowerCase().includes('lost'));
              const bookedStage = { id: 'booked', name: 'Booked', color: '#84cc16' };
              if (lostIdx !== -1) {
                sanitized.splice(lostIdx, 0, bookedStage);
              } else {
                sanitized.push(bookedStage);
              }
            }
            setLeadStages(sanitized);
          }

          // Budget Ranges
          if (Array.isArray(s.lead_budget_ranges)) {
            setBudgetRanges(s.lead_budget_ranges.map((b: any, idx: number) => {
              if (typeof b === 'string') {
                return { id: `b_${idx}`, name: b, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return b;
            }));
          }

          // Quick Actions
          if (s.lead_quick_actions && typeof s.lead_quick_actions === 'object') {
            setQuickActions(s.lead_quick_actions);
            localStorage.setItem('leads_quick_actions', JSON.stringify(s.lead_quick_actions));
            localStorage.setItem(`settings_quick_actions_${wId}`, JSON.stringify(s.lead_quick_actions));
          }

          // Quotes
          setPdfTheme(s.quotation_pdf_theme || 'royal_gold');
          setQuoteTerms(s.quotation_pdf_terms || '');
          setQuoteExpiryDays(s.quotation_default_expiry_days || 14);
          setCurrency(s.quotation_currency || 'INR');
          setContractClauses(s.contract_clauses || '');

          // Finance
          setInvoicePrefix(s.sequence_invoices_prefix || 'INV-2026-');
          if (s.invoice_company_name) setInvoiceCompanyName(s.invoice_company_name);
          if (s.invoice_tagline) setInvoiceTagline(s.invoice_tagline);
          if (s.invoice_gstin) setInvoiceGstin(s.invoice_gstin);
          if (s.invoice_address) setInvoiceAddress(s.invoice_address);
          if (s.invoice_phone) setInvoicePhone(s.invoice_phone);
          if (s.invoice_email) setInvoiceEmail(s.invoice_email);
          if (s.invoice_bank_name) setInvoiceBankName(s.invoice_bank_name);
          if (s.invoice_account_no) setInvoiceAccountNo(s.invoice_account_no);
          if (s.invoice_ifsc) setInvoiceIfsc(s.invoice_ifsc);
          if (s.invoice_account_holder) setInvoiceAccountHolder(s.invoice_account_holder);

          // Load Finance Vault Security Settings
          try {
            const { data: secData } = await supabase
              .from('finance_security_settings')
              .select('*')
              .eq('workspace_id', wId)
              .maybeSingle();

            if (secData) {
              setFinancePinLocked(Boolean(secData.is_locked));
              if (secData.pin_hash) setFinancePinCode(secData.pin_hash);
              if (secData.admin_email) setFinanceAdminEmail(secData.admin_email);
              if (secData.master_password_hash) setFinanceMasterPassword(secData.master_password_hash);
              if (secData.session_timeout_minutes) setFinanceTimeoutMins(secData.session_timeout_minutes);
            }
          } catch (_) {}
          if (s.invoice_terms) setInvoiceTerms(s.invoice_terms);
          if (s.invoice_footer_note) setInvoiceFooterNote(s.invoice_footer_note);
          if (s.invoice_font) setInvoiceFont(s.invoice_font);
          if (s.invoice_theme_palette) setInvoiceThemePalette(s.invoice_theme_palette);
          if (s.invoice_qr_image_url) setInvoiceQrImageUrl(s.invoice_qr_image_url);
          setProjectPrefix(s.sequence_projects_prefix || 'PRJ-2026-');
          setGstPercent(s.invoice_gst_percent ?? 18);
          setPaymentTerms(s.invoice_payment_terms || '');
          setUpiId(s.invoice_upi_id || '');
          setBankDetails(s.invoice_bank_details || '');
          if (Array.isArray(s.expense_categories)) {
            setExpenseCategories(s.expense_categories.map((c: any, idx: number) => {
              if (typeof c === 'string') {
                return { id: `e_${idx}`, name: c, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return c;
            }));
          }

          // Attendance
          setGeofenceRadius(s.geofence_radius_meters || 100);
          setShiftStart(s.shift_start_time || '09:30');
          setGraceMinutes(s.grace_period_minutes || 15);
          setBreakLimitMinutes(s.break_limit_minutes || 60);

          // Integrations
          setMetaAutoSync(s.meta_auto_sync_enabled !== false);

          syncToLocalStorage(wId, s);
        }
      }

      // Fetch Workspace Event Types and Crew Roles
      if (wId) {
        const ev = await fetchWorkspaceEventTypes(wId);
        if (ev && ev.length > 0) {
          setEventTypes(ev);
          memCachedEventTypes = ev;
        }
        setLoadingCrewRoles(true);
        const cr = await fetchWorkspaceCrewRoles(wId);
        setCrewRoles(cr || []);
        memCachedCrewRoles = cr || [];
        setLoadingCrewRoles(false);
        memCachedHasLoadedSettings = true;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
      setLoadingCrewRoles(false);
      memCachedHasLoadedSettings = true;
    }
  }, [router, getAuthHeaders]);

  useEffect(() => {
    loadWorkspaceSettings();
  }, [loadWorkspaceSettings]);

  // Live 2-way sync: Refresh event types on any cross-module update
  useEffect(() => {
    const handleEventsUpdated = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const wId = session?.user?.id || workspaceId;
      if (wId) {
        const ev = await fetchWorkspaceEventTypes(wId);
        if (ev && ev.length > 0) setEventTypes(ev);
      }
    };
    window.addEventListener('workspace_event_types_updated', handleEventsUpdated);
    return () => window.removeEventListener('workspace_event_types_updated', handleEventsUpdated);
  }, [workspaceId]);

  // Save Settings Handler
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wId = session?.user?.id || workspaceId;
      const headers = await getAuthHeaders();

      const payloadSettings = {
        lead_owners: leadOwners.map(o => ({ id: o.id, name: o.name, color: o.color })),
        lead_sources: leadSources.map(s => ({ id: s.id, name: s.name, color: s.color })),
        lead_stages: leadStages.map((st, idx) => ({ id: st.id || `st_${idx}`, name: st.name, color: st.color, position: idx })),
        lead_budget_ranges: budgetRanges.map(b => b.name),
        lead_quick_actions: quickActions,

        quotation_pdf_theme: pdfTheme,
        quotation_pdf_terms: quoteTerms,
        quotation_default_expiry_days: quoteExpiryDays,
        quotation_currency: currency,
        contract_clauses: contractClauses,

        sequence_invoices_prefix: invoicePrefix,
        invoice_company_name: invoiceCompanyName,
        invoice_tagline: invoiceTagline,
        invoice_gstin: invoiceGstin,
        invoice_address: invoiceAddress,
        invoice_phone: invoicePhone,
        invoice_email: invoiceEmail,
        invoice_bank_name: invoiceBankName,
        invoice_account_no: invoiceAccountNo,
        invoice_ifsc: invoiceIfsc,
        invoice_account_holder: invoiceAccountHolder,
        invoice_terms: invoiceTerms,
        invoice_footer_note: invoiceFooterNote,
        invoice_font: invoiceFont,
        invoice_theme_palette: invoiceThemePalette,
        invoice_qr_image_url: invoiceQrImageUrl,
        sequence_projects_prefix: projectPrefix,
        invoice_gst_percent: gstPercent,
        invoice_payment_terms: paymentTerms,
        invoice_upi_id: upiId,
        invoice_bank_details: bankDetails,
        expense_categories: expenseCategories.map(c => c.name),

        geofence_radius_meters: geofenceRadius,
        shift_start_time: shiftStart,
        grace_period_minutes: graceMinutes,
        break_limit_minutes: breakLimitMinutes,

        meta_auto_sync_enabled: metaAutoSync,
      };

      // 0ms Optimistic Local Updates & Event Dispatch
      syncToLocalStorage(wId, payloadSettings);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('settings_updated'));
      }

      const profPayload = {
        userId: wId,
        fullName: profileFullName.trim(),
        studioName: profileStudioName.trim() || 'My Studio',
        phone: profilePhone.trim(),
        address: profileAddress.trim(),
        instagram: profileInstagram.trim(),
        youtube: profileYoutube.trim(),
        facebook: profileFacebook.trim(),
        avatarUrl: profileAvatarUrl,
        logoUrl: profileLogoUrl,
      };

      if (typeof window !== 'undefined') {
        if (profPayload.studioName) {
          localStorage.setItem('sc_studio_name', profPayload.studioName);
          localStorage.setItem('fw_studio_name', profPayload.studioName);
        }
        if (profPayload.avatarUrl) localStorage.setItem('sc_avatar_url', profPayload.avatarUrl);
        if (profPayload.logoUrl) localStorage.setItem('sc_logo_url', profPayload.logoUrl);
        if (profPayload.fullName) localStorage.setItem('sc_user_name', profPayload.fullName);
        window.dispatchEvent(new CustomEvent('sc_profile_updated', { detail: profPayload }));
      }

      try {
        localStorage.setItem('sc_finance_pin_required', financePinLocked ? 'true' : 'false');
        if (financePinLocked) {
          sessionStorage.removeItem(`finance_unlocked_${wId}`);
        }
      } catch (_) {}

      // Parallel Concurrent Execution of Network Mutations (Sub-Second Save)
      const [settingsRes, financeRes, quoteRes, profileRes] = await Promise.allSettled([
        fetch('/api/settings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            workspace_id: wId,
            settings: payloadSettings,
          }),
        }),

        supabase
          .from('finance_security_settings')
          .upsert([{
            workspace_id: wId,
            user_id: wId,
            is_locked: financePinLocked,
            pin_hash: financePinCode || '123456',
            admin_email: financeAdminEmail || '',
            master_password_hash: financeMasterPassword || '',
            session_timeout_minutes: Number(financeTimeoutMins) || 60,
            updated_at: new Date().toISOString()
          }], { onConflict: 'workspace_id' }),

        saveAllWorkspaceQuotationSettings(wId, {
          ...quotationSettings,
          pdfTheme,
          quoteTerms,
          contractClauses,
          quoteExpiryDays,
          currency
        }),

        fetch('/api/user/profile-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify(profPayload),
        }),
      ]);

      const isSettingsOk = settingsRes.status === 'fulfilled' && (settingsRes.value as Response)?.ok;

      if (isSettingsOk) {
        setSaveToast('Settings saved & synchronized live across all pages!');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        const errJson = settingsRes.status === 'fulfilled' ? await (settingsRes.value as Response).json().catch(() => ({})) : {};
        alert('Save Failed: ' + (errJson.error || 'Unknown server error'));
      }
    } catch (err: any) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Google Sheets Option Item Handlers
  const handleUpdateItemName = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string,
    newName: string
  ) => {
    setList(list.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const handleUpdateItemColor = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string,
    newColor: string
  ) => {
    setList(list.map(item => item.id === id ? { ...item, color: newColor } : item));
    setActiveColorPickerId(null);
  };

  const handleRemoveItem = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    id: string
  ) => {
    if (id === 'booked') {
      alert('The "Booked" stage cannot be deleted because it is required to automatically synchronize leads with Team Manager, Finance, and Post-Production.');
      return;
    }
    setList(list.filter(item => item.id !== id));
  };

  const handleAddItem = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    prefix: string
  ) => {
    const nextIdx = list.length + 1;
    const newColor = GOOGLE_PRESET_COLORS[(list.length) % GOOGLE_PRESET_COLORS.length];
    setList([...list, { id: `${prefix}_${Date.now()}`, name: `Option ${nextIdx}`, color: newColor }]);
  };

  const handleMoveItemUp = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    index: number
  ) => {
    if (index <= 0) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    setList(copy);
  };

  const handleMoveItemDown = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    index: number
  ) => {
    if (index >= list.length - 1) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    setList(copy);
  };

  // Render Google Sheets Style Dropdown Item List Component matching image palette
  const renderGoogleOptionList = (
    list: DropdownItem[],
    setList: React.Dispatch<React.SetStateAction<DropdownItem[]>>,
    prefix: string,
    addLabel: string = "Add another item"
  ) => (
    <div className="space-y-2.5 pt-2">
      {list.map((item, index) => {
        const isBookedStage = prefix === 'stage' && (item.id === 'booked' || item.name.toLowerCase().trim() === 'booked');
        return (
        <div key={item.id} className="flex items-center gap-2 sm:gap-3 group relative">
          {/* Grip Handle */}
          <div className="cursor-grab text-slate-300 hover:text-zinc-500 transition-colors p-1">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Up / Down Reorder Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleMoveItemUp(list, setList, index)}
              disabled={index === 0}
              className="p-1 text-slate-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveItemDown(list, setList, index)}
              disabled={index === list.length - 1}
              className="p-1 text-slate-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Picker Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveColorPickerId(activeColorPickerId === item.id ? null : item.id)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-amber-200/90 rounded-xl hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            >
              <span className="w-4 h-4 rounded-md shadow-inner" style={{ backgroundColor: item.color }} />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Exact Color Palette Popover matching image */}
            {activeColorPickerId === item.id && (
              <div className="absolute left-0 top-11 z-50 p-3 bg-white border border-amber-200/90 rounded-2xl shadow-2xl space-y-2 min-w-[280px]">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Select Color</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {GOOGLE_PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateItemColor(list, setList, item.id, c)}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-xs border border-black/10 relative"
                      style={{ backgroundColor: c }}
                    >
                      {item.color.toLowerCase() === c.toLowerCase() && (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Input Box */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={item.name}
              onChange={e => handleUpdateItemName(list, setList, item.id, e.target.value)}
              className={`w-full px-4 py-2 bg-white border rounded-xl text-sm font-medium text-amber-950 focus:outline-none focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] shadow-xs ${
                isBookedStage ? 'border-emerald-300/90 pr-28 font-semibold text-emerald-950' : 'border-amber-200/90'
              }`}
              placeholder="Option Name..."
            />
            {isBookedStage && (
              <span className="absolute right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 select-none pointer-events-none">
                <Lock className="w-3 h-3 text-emerald-600" /> Core Sync
              </span>
            )}
          </div>

          {/* Trash Icon Button or Locked Icon */}
          {isBookedStage ? (
            <div
              className="p-2 text-slate-300 cursor-not-allowed flex items-center justify-center"
              title="System Stage: Required for Team Manager, Finance & Post-Production sync (Cannot be deleted)"
            >
              <Lock className="w-4 h-4 text-emerald-600/70" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleRemoveItem(list, setList, item.id)}
              className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete option"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      );
      })}

      {/* Add another item button */}
      <button
        type="button"
        onClick={() => handleAddItem(list, setList, prefix)}
        className="mt-2 px-4 py-2 bg-white border border-amber-200/90 hover:bg-[#FEFDF8] text-[#0F9D58] font-bold text-xs rounded-xl transition-all shadow-xs border-dashed flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>{addLabel}</span>
      </button>
    </div>
  );

  const activeNav = SETTINGS_NAV_ITEMS.find(item => item.id === activeTab) || SETTINGS_NAV_ITEMS[0];
  const filteredNavItems = SETTINGS_NAV_ITEMS.filter(item => 
    item.title.toLowerCase().includes(navSearch.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(navSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#090C11] text-zinc-900 dark:text-zinc-100 relative selection:bg-amber-100 selection:text-amber-950 font-sans pb-16">
      {/* Warm golden luxury ambient blur in top right */}
      <div className="absolute top-0 right-0 w-[550px] h-[450px] bg-gradient-to-bl from-amber-200/30 via-orange-100/15 to-transparent pointer-events-none blur-3xl -z-0" />
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F9D58] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Top Header Row: ACCOUNT & Studio settings on Left, Search & Save on Right */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-1 -ml-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                ACCOUNT
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
              Studio settings
            </h1>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Search Input matching screenshot */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search..."
                className="w-40 sm:w-56 pl-8 pr-3 py-1.5 bg-white/90 dark:bg-zinc-800/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700 rounded-full text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 shadow-2xs transition-all"
              />
              {navSearch && (
                <button
                  onClick={() => setNavSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Save All Changes Button */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Section */}
        <div className="flex flex-col lg:flex-row items-start gap-8 pt-2">
          {/* Left Column: Vertical Nav Cards */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-none">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
              {filteredNavItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3.5 ${
                      isActive
                        ? 'bg-[#EBF0F5] dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-2xs border border-zinc-200/90 dark:border-zinc-700/80 font-bold'
                        : 'hover:bg-white/70 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border border-transparent font-medium'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Active Tab Content */}
          <main className="flex-1 min-w-0 w-full space-y-4">
            {/* Active Tab Heading & Subtitle */}
            <div className="space-y-0.5">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {activeNav.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {activeNav.subtitle}
              </p>
            </div>

            {/* Content Panel */}
            {loading && !memCachedHasLoadedSettings ? (
              <div className="py-20 text-center text-zinc-500 space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F9D58]" />
                <p className="text-sm font-semibold">Loading user settings from Supabase Database...</p>
              </div>
            ) : (
              <div className="space-y-6">

            {/* 0. STUDIO & ACCOUNT PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-[#FEFDF9] dark:bg-stone-900/60 border border-[#EAE5DA] dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DA] dark:border-zinc-800 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center font-bold shadow-xs">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Studio Profile & Branding</h2>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Manage your official studio identity, owner photo, contact details, and social links.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {profileSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />

                {/* Visual Identity Row: Logo & Owner Avatar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Studio Logo Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Official Studio Logo
                      </span>
                      {profileLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileLogoUrl('')}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-[#F7F5F0] dark:bg-zinc-800 border-2 border-dashed border-[#EAE5DA] dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                        {isCompressingLogo ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        ) : profileLogoUrl ? (
                          <img src={profileLogoUrl} alt="Studio Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isCompressingLogo}
                          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 border border-[#EAE5DA] dark:border-zinc-600 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{profileLogoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                        </button>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                          Recommended 400×400px (PNG / JPG). Synchronized to PDF quotations and tax invoices.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Personal Avatar Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/60 border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Personal / Owner Photo
                      </span>
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarUrl('')}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-[#F7F5F0] dark:bg-zinc-800 border-2 border-[#EAE5DA] dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                        {isCompressingAvatar ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        ) : profileAvatarUrl ? (
                          <img src={profileAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isCompressingAvatar}
                          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 border border-[#EAE5DA] dark:border-zinc-600 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{profileAvatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                          Personal portrait for crew management, WhatsApp signatures, and notifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Information Fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Studio & Contact Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Studio Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Studio Brand Name</span>
                      </label>
                      <input
                        type="text"
                        value={profileStudioName}
                        onChange={e => setProfileStudioName(e.target.value)}
                        placeholder="e.g. Filmify Weddings"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Owner Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Owner / Manager Full Name</span>
                      </label>
                      <input
                        type="text"
                        value={profileFullName}
                        onChange={e => setProfileFullName(e.target.value)}
                        placeholder="e.g. Sushant Nawale"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Studio Phone / WhatsApp</span>
                      </label>
                      <CountryPhoneInput
                        value={profilePhone}
                        onChange={(fullPhone) => setProfilePhone(fullPhone)}
                        placeholder="98765 43210"
                      />
                    </div>

                    {/* Email (Readonly) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Account Email (Verified)</span>
                      </label>
                      <input
                        type="email"
                        value={profileEmail}
                        readOnly
                        disabled
                        placeholder="user@studio.com"
                        className="w-full px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/40 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 cursor-not-allowed shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Studio Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Studio Physical Address</span>
                    </label>
                    <textarea
                      rows={2}
                      value={profileAddress}
                      onChange={e => setProfileAddress(e.target.value)}
                      placeholder="e.g. Suite 402, Signature Plaza, Mumbai, Maharashtra 400001"
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Social Media Presence */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Social Media & Portfolio Links
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <InstagramIcon className="w-3.5 h-3.5 text-[#E4405F]" />
                        <span>Instagram Handle / URL</span>
                      </label>
                      <input
                        type="text"
                        value={profileInstagram}
                        onChange={e => setProfileInstagram(e.target.value)}
                        placeholder="@filmifyweddings"
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <YoutubeIcon className="w-3.5 h-3.5 text-[#FF0000]" />
                        <span>YouTube Channel</span>
                      </label>
                      <input
                        type="text"
                        value={profileYoutube}
                        onChange={e => setProfileYoutube(e.target.value)}
                        placeholder="youtube.com/@filmify"
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>

                    {/* Facebook */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>Facebook Page</span>
                      </label>
                      <input
                        type="text"
                        value={profileFacebook}
                        onChange={e => setProfileFacebook(e.target.value)}
                        placeholder="facebook.com/filmify"
                        className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-[#EAE5DA] dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Save Bar */}
                <div className="pt-4 border-t border-[#EAE5DA] dark:border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {profileSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 1. LEADS & CRM SETTINGS */}
            {activeTab === 'leads' && (
              <div className="bg-[#FEFDF9] dark:bg-stone-900/60 border border-[#EAE5DA] dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DA] dark:border-zinc-800 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F9D58] border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center font-bold shadow-xs">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Leads & CRM Settings</h2>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Configure Lead Action column controls, lead sources, and Kanban pipeline stages.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lead Action Buttons Cards with Big CRM Icons */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                      Manage Lead Action Column Buttons (Visible on `/leads` Page)
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Choose which quick-action buttons are visible in the CRM Action column for fast client outreach.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
                    {[
                      { 
                        key: 'quotation', 
                        label: 'Quotation / Proposal', 
                        icon: FileText, 
                        desc: 'Generate, send PDF quotes & view versions', 
                        isDefault: true,
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                        iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      },
                      { 
                        key: 'call', 
                        label: 'Device Dialer Call', 
                        icon: PhoneCall, 
                        desc: '1-click direct device dialer for phone numbers', 
                        isDefault: true,
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                        iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      },
                      { 
                        key: 'mail', 
                        label: 'Direct Email Lead', 
                        icon: Mail, 
                        desc: 'Send fast pre-addressed email to client', 
                        isDefault: true,
                        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
                        iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      },
                      { 
                        key: 'comments', 
                        label: 'Comments & Reminders', 
                        icon: MessageSquare, 
                        desc: 'Open discussion drawer & follow-up log', 
                        isDefault: true,
                        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
                        iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      },
                      { 
                        key: 'google_contact', 
                        label: 'Google Contacts Sync', 
                        icon: UserCheck, 
                        desc: 'Sync client profile & number to Google Contacts', 
                        isDefault: false,
                        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
                        iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300'
                      },
                      { 
                        key: 'whatsapp', 
                        label: 'WhatsApp Welcome', 
                        icon: Send, 
                        desc: 'Send WhatsApp welcome template & timeline', 
                        isDefault: false,
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                        iconBg: 'bg-[#25D366]/20 text-[#128C7E] dark:bg-[#25D366]/30 dark:text-[#25D366]'
                      },
                      { 
                        key: 'followup', 
                        label: 'WhatsApp Follow-up', 
                        icon: Clock, 
                        desc: 'Automated multi-step followups & reminders', 
                        isDefault: false,
                        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
                        iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                      },
                    ].map(item => {
                      const isChecked = !!quickActions[item.key];
                      const IconComp = item.icon;
                      return (
                        <div
                          key={item.key}
                          onClick={() => setQuickActions({ ...quickActions, [item.key]: !isChecked })}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between select-none ${
                            isChecked
                              ? 'bg-white dark:bg-zinc-800 border-emerald-400 dark:border-emerald-600 shadow-xs ring-1 ring-emerald-400/30'
                              : 'bg-white/60 dark:bg-zinc-800/40 border-[#EAE5DA] dark:border-zinc-700/80 hover:bg-white dark:hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={`w-11 h-11 rounded-2xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                              <IconComp className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {item.isDefault && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  Default
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  e.stopPropagation();
                                  setQuickActions({ ...quickActions, [item.key]: e.target.checked });
                                }}
                                className="w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] border-zinc-300 dark:border-zinc-600 cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="mt-3 min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {item.label}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between text-[10px]">
                            <span className={isChecked ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400'}>
                              {isChecked ? '● Visible on Leads' : '○ Hidden'}
                            </span>
                            <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 font-medium">
                              Toggle
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lead Sources Dropdown Options Card */}
                <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/60 rounded-2xl border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700/60 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Manage Lead Sources (Dropdown Options in Leads Page)
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Custom channels for lead attribution, analytics, and marketing tracking.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-200/60 dark:border-amber-800/60">
                      {leadSources.length} Sources
                    </span>
                  </div>
                  {renderGoogleOptionList(leadSources, setLeadSources, 'source', 'Add another item')}
                </div>

                {/* Pipeline Stages Dropdown Options Card */}
                <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/60 rounded-2xl border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700/60 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Manage Pipeline Stages (Kanban Columns in Leads Page)
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Reorder or add pipeline lifecycle stages. Stage &quot;Booked&quot; syncs automatically with Bookings & Team Manager.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                      {leadStages.length} Stages
                    </span>
                  </div>
                  {renderGoogleOptionList(leadStages, setLeadStages, 'stage', 'Add another item')}
                </div>

                {/* Lead Budget Filter Options Card */}
                <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/60 rounded-2xl border border-[#EAE5DA] dark:border-zinc-700/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700/60 pb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                        Lead Budget Filter Options
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Filter brackets used to qualify client wedding budgets on the CRM board.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200/60 dark:border-blue-800/60">
                      {budgetRanges.length} Brackets
                    </span>
                  </div>
                  {renderGoogleOptionList(budgetRanges, setBudgetRanges, 'budget', 'Add another item')}
                </div>
              </div>
            )}

            {/* 1.5 FUNCTIONS & WEDDING EVENTS SETTINGS */}
            {activeTab === 'functions' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">Functions & Wedding Events Settings</h2>
                      <p className="text-xs font-medium text-zinc-500">
                        Manage standardized wedding event names. Synced automatically across Quotations and Team Manager.
                      </p>
                    </div>
                  </div>

                  <div className="relative min-w-[220px]">
                    <input
                      type="text"
                      placeholder="Search functions..."
                      value={eventSearch}
                      onChange={e => setEventSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F9D58]"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Add New Function Form */}
                <div className="p-4 bg-[#FEFDF8] border border-amber-200/90 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
                    + Add New Function
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      placeholder="Event Name (e.g. Ring Ceremony, Cocktail, Pool Party)..."
                      value={newEventName}
                      onChange={e => setNewEventName(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && newEventName.trim()) {
                          const clean = newEventName.trim();
                          const created = await saveWorkspaceEventType(workspaceId, clean, 'General');
                          if (created) {
                            setEventTypes(prev => [...prev.filter(ev => ev.name.toLowerCase() !== clean.toLowerCase()), created]);
                            setNewEventName('');
                            setSaveToast(`Function "${clean}" added & synced!`);
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newEventName.trim()) return;
                        const clean = newEventName.trim();
                        const created = await saveWorkspaceEventType(workspaceId, clean, 'General');
                        if (created) {
                          setEventTypes(prev => [...prev.filter(ev => ev.name.toLowerCase() !== clean.toLowerCase()), created]);
                          setNewEventName('');
                          setSaveToast(`Function "${clean}" added & synced!`);
                          setTimeout(() => setSaveToast(null), 3000);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Function</span>
                    </button>
                  </div>
                </div>

                {/* Event Types List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {eventTypes
                    .filter(e => e.name.toLowerCase().includes(eventSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-white border border-amber-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-amber-950 block truncate">{item.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category || 'General'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.is_default && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-50 text-zinc-500 rounded-md">
                              Default
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFunction(item);
                              setEditFunctionName(item.name);
                            }}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
                            title="Edit Function"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Delete function "${item.name}"?`)) return;
                              await deleteWorkspaceEventType(item.id, workspaceId, item.name);
                              setEventTypes(prev => prev.filter(e => e.id !== item.id && e.name.toLowerCase() !== item.name.toLowerCase()));
                              setSaveToast(`Function "${item.name}" removed`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer shadow-2xs"
                            title="Delete Function"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Edit Function Modal */}
                {editingFunction && (
                  <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-amber-200/90 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Function Name</h3>
                        <button
                          onClick={() => setEditingFunction(null)}
                          className="p-1 text-slate-400 hover:text-zinc-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editFunctionName}
                        onChange={e => setEditFunctionName(e.target.value)}
                        placeholder="Function Name..."
                        className="w-full px-3 py-2 border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingFunction(null)}
                          className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-amber-50 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!editFunctionName.trim()) return;
                            const clean = editFunctionName.trim();
                            const updated = await updateWorkspaceEventType(editingFunction.id, clean, editingFunction.category, workspaceId);
                            if (updated) {
                              setEventTypes(prev => prev.map(ev => ev.id === editingFunction.id ? { ...ev, name: clean } : ev));
                              setSaveToast(`Function updated to "${clean}"!`);
                              setTimeout(() => setSaveToast(null), 3000);
                            }
                            setEditingFunction(null);
                          }}
                          className="px-4 py-1.5 bg-[#0F9D58] hover:bg-[#0B8043] text-white text-xs font-extrabold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1.6 CREW ROLES & SHORT CODES SETTINGS */}
            {activeTab === 'crew_roles' && (
              <CrewRolesSettings
                workspaceId={workspaceId}
                crewRoles={crewRoles}
                loading={loadingCrewRoles}
                onRolesChange={setCrewRoles}
                onShowToast={(msg) => {
                  setSaveToast(msg);
                  setTimeout(() => setSaveToast(null), 3000);
                }}
              />
            )}

            {/* 1.7 POST-PRODUCTION DELIVERABLES & STATUSES SETTINGS */}
            {activeTab === 'post_production' && (
              <PostProductionSettingsTab
                workspaceId={workspaceId}
                onShowToast={(msg) => {
                  setSaveToast(msg);
                  setTimeout(() => setSaveToast(null), 3000);
                }}
              />
            )}


            {/* 2. QUOTATIONS PAGE SETTINGS */}
            {activeTab === 'quotations' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-amber-950">Quotations & Proposals Suite (`/workspace/quotations`)</h2>
                      <p className="text-xs font-medium text-zinc-500">Manage Deliverables, Special Add-ons, Extra Paid Add-ons, Default Functions, and Themes with 2-Way Sync</p>
                    </div>
                  </div>

                  {/* Quotation Sub-Tabs Navigation Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-amber-50/80 rounded-xl overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('deliverables')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'deliverables' ? 'bg-white text-blue-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Deliverables</span>
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-black">
                        {quotationSettings.deliverables.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('special_addons')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'special_addons' ? 'bg-white text-purple-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Special Add-ons</span>
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] rounded-full font-black">
                        {quotationSettings.specialAddons.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('paid_addons')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'paid_addons' ? 'bg-white text-emerald-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Extra Paid Add-ons</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
                        {quotationSettings.paidAddons.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('default_functions')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'default_functions' ? 'bg-white text-amber-700 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Default Functions</span>
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-black">
                        {quotationSettings.defaultFunctions.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteSubTab('theme_terms')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        quoteSubTab === 'theme_terms' ? 'bg-white text-amber-950 shadow-xs' : 'text-zinc-600 hover:text-amber-950'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Theme & Terms</span>
                    </button>
                  </div>
                </div>

                {/* SUBTAB 1: OUTPUT DELIVERABLES */}
                {quoteSubTab === 'deliverables' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider"> Output Deliverables Catalog</h3>
                        <p className="text-[11px] text-blue-800 font-medium">Deliverables managed here sync automatically with the Quotation Builder dropdowns and client proposals.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-blue-200 text-blue-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.deliverables.length} Deliverables Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Deliverable title (e.g. 10 Drone 4K Highlight Clips)..."
                        value={newDelivTitle}
                        onChange={e => setNewDelivTitle(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newDelivTitle.trim()) {
                            await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, newDelivCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewDelivTitle('');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      <select
                        value={newDelivCat}
                        onChange={e => setNewDelivCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Video">Video</option>
                        <option value="Photo">Photo</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Album">Album</option>
                        <option value="Data">Data</option>
                        <option value="General">General</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newDelivTitle.trim()) {
                            await saveWorkspaceQuotationDeliverable(workspaceId, newDelivTitle, newDelivCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewDelivTitle('');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white font-black shadow-[0_4px_14px_rgba(245,158,11,0.3)] active:translate-y-0.5 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Deliverable</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search deliverables..."
                          value={delivSearch}
                          onChange={e => setDelivSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.deliverables.filter(d => d.title.toLowerCase().includes(delivSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.deliverables
                          .filter(d => d.title.toLowerCase().includes(delivSearch.toLowerCase()))
                          .map((d, idx) => (
                            <div
                              key={d.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-blue-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{d.title}</p>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-amber-50 text-zinc-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                                    {d.category || 'General'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeliv(d);
                                    setEditDelivTitle(d.title);
                                    setEditDelivCat(d.category || 'General');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Deliverable"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationDeliverable(d.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Deliverable"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: SPECIAL VALUE ADDITIONS (COMPLIMENTARY) */}
                {quoteSubTab === 'special_addons' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider"> Special Value Additions (Complimentary)</h3>
                        <p className="text-[11px] text-purple-800 font-medium">Free perks and value-added services offered to entice clients in proposals.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-purple-200 text-purple-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.specialAddons.length} Special Addons
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Special Addon title (e.g. Free Drone Coverage for Sangeet)..."
                        value={newSpecialTitle}
                        onChange={e => setNewSpecialTitle(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newSpecialTitle.trim()) {
                            await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, newSpecialCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewSpecialTitle('');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
                      />
                      <select
                        value={newSpecialCat}
                        onChange={e => setNewSpecialCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Shoots">Shoots</option>
                        <option value="Album">Album</option>
                        <option value="Drone">Drone</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Data">Data</option>
                        <option value="Live Output">Live Output</option>
                        <option value="Complimentary">Complimentary</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newSpecialTitle.trim()) {
                            await saveWorkspaceQuotationSpecialAddon(workspaceId, newSpecialTitle, newSpecialCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewSpecialTitle('');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Special Addon</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search special addons..."
                          value={specialSearch}
                          onChange={e => setSpecialSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.specialAddons.filter(s => s.title.toLowerCase().includes(specialSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.specialAddons
                          .filter(s => s.title.toLowerCase().includes(specialSearch.toLowerCase()))
                          .map((s, idx) => (
                            <div
                              key={s.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-purple-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{s.title}</p>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-black rounded-md uppercase tracking-wider">
                                    {s.category || 'Complimentary'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSpecial(s);
                                    setEditSpecialTitle(s.title);
                                    setEditSpecialCat(s.category || 'Complimentary');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Special Addon"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationSpecialAddon(s.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Special Addon"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: PAID ADD-ONS & UPGRADES */}
                {quoteSubTab === 'paid_addons' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider"> Extra Paid Add-ons & Upgrades</h3>
                        <p className="text-[11px] text-emerald-800 font-medium">Additional billable crew, services & upgrades that clients can opt for with standard base pricing.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-emerald-200 text-emerald-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.paidAddons.length} Paid Add-ons Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add-on Title (e.g. FPV Drone Pilot)..."
                        value={newPaidTitle}
                        onChange={e => setNewPaidTitle(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                      />
                      <div className="relative flex items-center w-36">
                        <span className="absolute left-2.5 text-xs font-bold text-emerald-700"></span>
                        <input
                          type="number"
                          placeholder="Price ()"
                          value={newPaidPrice}
                          onChange={e => setNewPaidPrice(e.target.value)}
                          className="w-full pl-6 pr-2 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <select
                        value={newPaidCat}
                        onChange={e => setNewPaidCat(e.target.value)}
                        className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <option value="Photography">Photography</option>
                        <option value="Cinematography">Cinematography</option>
                        <option value="Drone">Drone</option>
                        <option value="Live Tech">Live Tech</option>
                        <option value="Album">Album</option>
                        <option value="Post-Production">Post-Production</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Equipment">Equipment</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (newPaidTitle.trim()) {
                            await saveWorkspaceQuotationPaidAddon(workspaceId, newPaidTitle, Number(newPaidPrice) || 0, newPaidCat);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewPaidTitle('');
                            setNewPaidPrice('10000');
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Paid Add-on</span>
                      </button>
                    </div>

                    {/* Search & List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search paid add-ons..."
                          value={paidSearch}
                          onChange={e => setPaidSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          Showing {quotationSettings.paidAddons.filter(p => p.title.toLowerCase().includes(paidSearch.toLowerCase())).length} items
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {quotationSettings.paidAddons
                          .filter(p => p.title.toLowerCase().includes(paidSearch.toLowerCase()))
                          .map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="p-3 bg-white border border-amber-200/90 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-amber-950 truncate">{p.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-extrabold text-emerald-700">
                                      {Number(p.price || 0).toLocaleString('en-IN')}
                                    </span>
                                    <span className="px-2 py-0.5 bg-amber-50 text-zinc-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                                      {p.category || 'Extra Service'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPaid(p);
                                    setEditPaidTitle(p.title);
                                    setEditPaidPrice(String(p.price || 0));
                                    setEditPaidCat(p.category || 'Extra Service');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Paid Add-on"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteWorkspaceQuotationPaidAddon(p.id, workspaceId);
                                    const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                    setQuotationSettings(updated);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Paid Add-on"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: DEFAULT WEDDING FUNCTIONS & COVERAGE */}
                {quoteSubTab === 'default_functions' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider"> Default Quotation Functions & Events</h3>
                        <p className="text-[11px] text-amber-800 font-medium">Pre-configure standard wedding functions with default crew counts, duration, and notes. When creating a new Quotation Proposal, these functions will load automatically!</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-amber-200 text-amber-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {quotationSettings.defaultFunctions.length} Default Functions Active
                      </span>
                    </div>

                    {/* Quick Add Function Bar */}
                    <div className="p-3 bg-[#FEFDF8] border border-amber-200/90 rounded-xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Function Name (e.g. Sangeet & Cocktail)..."
                          value={newDefaultFuncName}
                          onChange={e => setNewDefaultFuncName(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                        <select
                          value={newDefaultFuncDuration}
                          onChange={e => setNewDefaultFuncDuration(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-700 cursor-pointer"
                        >
                          {DEFAULT_DURATION_SLOTS.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Default Venue / City..."
                          value={newDefaultFuncLocation}
                          onChange={e => setNewDefaultFuncLocation(e.target.value)}
                          className="px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs font-medium text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          placeholder="Optional notes (e.g. Includes stage performances & couple entry coverage)..."
                          value={newDefaultFuncNotes}
                          onChange={e => setNewDefaultFuncNotes(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-amber-200/90 rounded-lg text-xs text-amber-950 placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (newDefaultFuncName.trim()) {
                              await saveWorkspaceQuotationDefaultFunction(workspaceId, {
                                name: newDefaultFuncName,
                                durationSlot: newDefaultFuncDuration,
                                location: newDefaultFuncLocation,
                                notes: newDefaultFuncNotes,
                                requirements: [
                                  { name: 'Candid Photography', qty: 2 },
                                  { name: 'Cinematography', qty: 2 },
                                  { name: 'Drone', qty: 1 }
                                ]
                              });
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setNewDefaultFuncName('');
                              setNewDefaultFuncNotes('');
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Default Function</span>
                        </button>
                      </div>
                    </div>

                    {/* Functions List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <input
                          type="text"
                          placeholder=" Search default functions..."
                          value={defaultFuncSearch}
                          onChange={e => setDefaultFuncSearch(e.target.value)}
                          className="px-3 py-1.5 bg-[#FEFDF8] border border-amber-200/90 rounded-lg text-xs font-medium text-zinc-850 w-64 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400">
                          {quotationSettings.defaultFunctions.length} Functions configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quotationSettings.defaultFunctions
                          .filter(f => f.name.toLowerCase().includes(defaultFuncSearch.toLowerCase()))
                          .map((f, idx) => (
                            <div
                              key={f.id || idx}
                              className="p-4 bg-white border border-amber-200/90 hover:border-amber-300 rounded-2xl shadow-2xs space-y-2.5 transition-all group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <h4 className="text-sm font-extrabold text-amber-950">{f.name}</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold rounded-full">
                                     {f.durationSlot || '7 Hours'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDefaultFunc(f);
                                      setEditDefaultFuncName(f.name);
                                      setEditDefaultFuncDuration(f.durationSlot || '7 Hours');
                                      setEditDefaultFuncLocation(f.location || '');
                                      setEditDefaultFuncNotes(f.notes || '');
                                      setEditDefaultFuncReqs(f.requirements || []);
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await deleteWorkspaceQuotationDefaultFunction(f.id, workspaceId);
                                      const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                      setQuotationSettings(updated);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Crew requirements tags */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(f.requirements || []).map((req, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="px-2 py-0.5 bg-amber-50 border border-amber-200/90 text-zinc-850 text-[10px] font-extrabold rounded-md flex items-center gap-1"
                                  >
                                    <span>{req.qty}x</span>
                                    <span>{req.name}</span>
                                    <span className="px-1 py-0.2 bg-blue-100 text-blue-800 text-[8px] font-black rounded">
                                      {getRoleShortCode(req.name)}
                                    </span>
                                  </span>
                                ))}
                              </div>

                              {f.notes && (
                                <p className="text-[11px] text-zinc-500 italic bg-[#FEFDF8] p-2 rounded-lg border border-amber-100">
                                  "{f.notes}"
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 5: THEME, EXPIRY & TERMS */}
                                {/* SUBTAB 5: PAYMENT SCHEDULE STEP NAMES */}
                {quoteSubTab === 'payment_steps' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span>Payment Terms & Schedule Step Names</span>
                        </h3>
                        <p className="text-[11px] text-amber-900 font-medium">Default installment step presets. These populate the Step Name dropdown in Quotation Builder with live 2-way sync.</p>
                      </div>
                      <span className="px-3 py-1 bg-white border border-amber-300 text-amber-900 text-xs font-extrabold rounded-full shadow-2xs">
                        {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS).length} Presets Available
                      </span>
                    </div>

                    {/* Quick Add Bar */}
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Step Name (e.g. Token Amount, Advance Amount, On Wedding Day, After Event)..."
                        value={newStepName}
                        onChange={e => setNewStepName(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newStepName.trim()) {
                            await saveWorkspacePaymentStepName(workspaceId, newStepName);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewStepName('');
                            setSaveToast('Step Name added!');
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }}
                        className="flex-1 w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (newStepName.trim()) {
                            await saveWorkspacePaymentStepName(workspaceId, newStepName);
                            const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                            setQuotationSettings(updated);
                            setNewStepName('');
                            setSaveToast('Step Name added!');
                            setTimeout(() => setSaveToast(null), 3000);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Step Name</span>
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search step names..."
                        value={stepSearch}
                        onChange={e => setStepSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FEFDF8] border border-amber-200/80 rounded-lg text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Step Names List with Reorder Controls */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {(quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS)
                        .filter(s => s.toLowerCase().includes(stepSearch.toLowerCase()))
                        .map((step, idx) => {
                          const isEditing = editingStepIndex === idx;
                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-[#FEFDF8] hover:bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2 transition group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => movePaymentStep(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <MoveUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePaymentStep(idx, 'down')}
                                    disabled={idx === (quotationSettings.paymentSteps || DEFAULT_QUOTATION_PAYMENT_STEPS).length - 1}
                                    className="p-0.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <MoveDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md shrink-0">
                                  #{idx + 1}
                                </span>

                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editStepText}
                                    onChange={e => setEditStepText(e.target.value)}
                                    autoFocus
                                    className="flex-1 px-2 py-1 bg-white border border-amber-400 rounded-md text-xs font-bold text-zinc-900 focus:outline-none"
                                  />
                                ) : (
                                  <p className="text-xs font-bold text-zinc-900 truncate flex-1">{step}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (editStepText.trim()) {
                                        await updateWorkspacePaymentStepName(step, editStepText, workspaceId);
                                        const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                        setQuotationSettings(updated);
                                        setEditingStepIndex(null);
                                        setSaveToast('Step Name updated!');
                                        setTimeout(() => setSaveToast(null), 3000);
                                      }
                                    }}
                                    className="px-2 py-1 bg-amber-500 text-white text-[10px] font-black rounded-md cursor-pointer"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStepIndex(idx);
                                      setEditStepText(step);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Delete step name "${step}"?`)) {
                                      await deleteWorkspacePaymentStepName(step, workspaceId);
                                      const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                                      setQuotationSettings(updated);
                                      setSaveToast('Step Name removed!');
                                      setTimeout(() => setSaveToast(null), 3000);
                                    }
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {quoteSubTab === 'theme_terms' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* PDF Theme Dropdown */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          PDF Document Theme
                        </label>
                        <div className="relative">
                          <select
                            value={pdfTheme}
                            onChange={e => setPdfTheme(e.target.value)}
                            className="w-full appearance-none px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                          >
                            <option value="royal_gold"> Royal Gold & Obsidian</option>
                            <option value="minimal_dark"> Minimal Dark Studio</option>
                            <option value="airy_clean"> Airy Clean White</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      {/* Expiry Days */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          Quotation Validity (Days)
                        </label>
                        <input
                          type="number"
                          value={quoteExpiryDays}
                          onChange={e => setQuoteExpiryDays(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                        />
                      </div>

                      {/* Currency Dropdown */}
                      <div>
                        <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                          Default Currency
                        </label>
                        <div className="relative">
                          <select
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                            className="w-full appearance-none px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                          >
                            <option value="INR"> INR (Indian Rupee)</option>
                            <option value="USD">$ USD (US Dollar)</option>
                            <option value="AED">AED (UAE Dirham)</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Terms */}
                    <div>
                      <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                        Default Quotation Terms & Conditions
                      </label>
                      <textarea
                        rows={3}
                        value={quoteTerms}
                        onChange={e => setQuoteTerms(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-medium text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>

                    {/* Contract Clauses */}
                    <div>
                      <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1.5">
                        Standard Contract Clauses
                      </label>
                      <textarea
                        rows={4}
                        value={contractClauses}
                        onChange={e => setContractClauses(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>
                )}

                {/* EDITING MODALS */}
                {/* 1. Edit Deliverable Modal */}
                {editingDeliv && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Deliverable</h3>
                        <button type="button" onClick={() => setEditingDeliv(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Deliverable Title</label>
                          <input
                            type="text"
                            value={editDelivTitle}
                            onChange={e => setEditDelivTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editDelivCat}
                            onChange={e => setEditDelivCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Video">Video</option>
                            <option value="Photo">Photo</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Album">Album</option>
                            <option value="Data">Data</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingDeliv(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editDelivTitle.trim()) {
                              await updateWorkspaceQuotationDeliverable(editingDeliv.id, editDelivTitle, editDelivCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingDeliv(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white font-black shadow-[0_4px_14px_rgba(245,158,11,0.3)] active:translate-y-0.5 hover:from-amber-500 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Edit Special Addon Modal */}
                {editingSpecial && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Special Addon</h3>
                        <button type="button" onClick={() => setEditingSpecial(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Special Addon Title</label>
                          <input
                            type="text"
                            value={editSpecialTitle}
                            onChange={e => setEditSpecialTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editSpecialCat}
                            onChange={e => setEditSpecialCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Shoots">Shoots</option>
                            <option value="Album">Album</option>
                            <option value="Drone">Drone</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Data">Data</option>
                            <option value="Live Output">Live Output</option>
                            <option value="Complimentary">Complimentary</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingSpecial(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editSpecialTitle.trim()) {
                              await updateWorkspaceQuotationSpecialAddon(editingSpecial.id, editSpecialTitle, editSpecialCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingSpecial(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Edit Paid Addon Modal */}
                {editingPaid && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-amber-200/90">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Paid Add-on Service</h3>
                        <button type="button" onClick={() => setEditingPaid(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Add-on Title</label>
                          <input
                            type="text"
                            value={editPaidTitle}
                            onChange={e => setEditPaidTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Price ()</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-bold text-emerald-700"></span>
                            <input
                              type="number"
                              value={editPaidPrice}
                              onChange={e => setEditPaidPrice(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Category</label>
                          <select
                            value={editPaidCat}
                            onChange={e => setEditPaidCat(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                          >
                            <option value="Photography">Photography</option>
                            <option value="Cinematography">Cinematography</option>
                            <option value="Drone">Drone</option>
                            <option value="Live Tech">Live Tech</option>
                            <option value="Album">Album</option>
                            <option value="Post-Production">Post-Production</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Equipment">Equipment</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingPaid(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editPaidTitle.trim()) {
                              await updateWorkspaceQuotationPaidAddon(editingPaid.id, editPaidTitle, Number(editPaidPrice) || 0, editPaidCat, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingPaid(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Edit Default Function Modal */}
                {editingDefaultFunc && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-amber-200/90 max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <h3 className="text-sm font-extrabold text-amber-950">Edit Default Function Template</h3>
                        <button type="button" onClick={() => setEditingDefaultFunc(null)} className="text-slate-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Function Name</label>
                          <input
                            type="text"
                            value={editDefaultFuncName}
                            onChange={e => setEditDefaultFuncName(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-bold text-zinc-700 block mb-1">Duration Slot</label>
                            <select
                              value={editDefaultFuncDuration}
                              onChange={e => setEditDefaultFuncDuration(e.target.value)}
                              className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 cursor-pointer"
                            >
                              {DEFAULT_DURATION_SLOTS.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 block mb-1">Default Venue / Location</label>
                            <input
                              type="text"
                              value={editDefaultFuncLocation}
                              onChange={e => setEditDefaultFuncLocation(e.target.value)}
                              className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950"
                            />
                          </div>
                        </div>

                        {/* Crew allocations editor */}
                        <div className="space-y-2 pt-2 border-t border-amber-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-zinc-850 uppercase tracking-wider">Default Crew Requirements</label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditDefaultFuncReqs([
                                  ...editDefaultFuncReqs,
                                  { name: 'Candid Photography', qty: 1 }
                                ]);
                              }}
                              className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200"
                            >
                              + Add Crew Role
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {editDefaultFuncReqs.map((req, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-2 p-2 bg-[#FEFDF8] rounded-xl border border-amber-200/90">
                                <select
                                  value={req.name}
                                  onChange={e => {
                                    const updated = [...editDefaultFuncReqs];
                                    updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                                    setEditDefaultFuncReqs(updated);
                                  }}
                                  className="flex-1 px-2 py-1 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-zinc-850"
                                >
                                  {crewRoles.map(cr => (
                                    <option key={cr.id} value={cr.name}>{cr.name} ({cr.short_code})</option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-zinc-500">Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={req.qty}
                                    onChange={e => {
                                      const updated = [...editDefaultFuncReqs];
                                      updated[rIdx] = { ...updated[rIdx], qty: Math.max(1, Number(e.target.value) || 1) };
                                      setEditDefaultFuncReqs(updated);
                                    }}
                                    className="w-14 px-2 py-1 bg-white border border-amber-200/90 rounded-lg text-xs font-bold text-amber-950 text-center"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDefaultFuncReqs(editDefaultFuncReqs.filter((_, i) => i !== rIdx));
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">Coverage Notes</label>
                          <textarea
                            rows={2}
                            value={editDefaultFuncNotes}
                            onChange={e => setEditDefaultFuncNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-medium text-amber-950"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100">
                        <button
                          type="button"
                          onClick={() => setEditingDefaultFunc(null)}
                          className="px-3 py-1.5 bg-amber-50 text-zinc-700 text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (editDefaultFuncName.trim()) {
                              await updateWorkspaceQuotationDefaultFunction(editingDefaultFunc.id, {
                                name: editDefaultFuncName,
                                durationSlot: editDefaultFuncDuration,
                                location: editDefaultFuncLocation,
                                notes: editDefaultFuncNotes,
                                requirements: editDefaultFuncReqs
                              }, workspaceId);
                              const updated = await fetchWorkspaceQuotationSettings(workspaceId);
                              setQuotationSettings(updated);
                              setEditingDefaultFunc(null);
                            }
                          }}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2.5 STUDIO STORAGE SETTINGS (MEMORY CARDS & PHYSICAL DRIVES INVENTORY) */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-white border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Studio Storage & Hardware Inventory</span>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Hardware Sync
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage physical memory cards inventory, external SSDs, hard drive racks, and NAS arrays.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchStorageHardware}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold"
                    title="Refresh Inventory"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStorage ? 'animate-spin text-amber-600' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* ── LEFT COLUMN: MEMORY CARDS (SD / CFexpress) ── */}
                  <div className="bg-white border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 flex flex-col">
                    <div className="flex flex-col gap-3 border-b border-amber-100 pb-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold shrink-0">
                            <SDCardIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-slate-900 leading-snug">
                              Memory Cards (SD / CFexpress)
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-normal mt-0.5">
                              Register shooter cards for ingest & offload tracking
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap shrink-0">
                          {storageCards.length} Registered
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddCardForm(prev => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {showAddCardForm ? (
                            <>
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Close Form</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add Memory Card</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card Add Form (Shown ONLY when Add button is clicked) */}
                    {showAddCardForm && (
                      <form onSubmit={async (e) => {
                        await handleSaveCard(e);
                        setShowAddCardForm(false);
                      }} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center justify-between">
                          <span>➕ Register New Memory Card</span>
                          <button
                            type="button"
                            onClick={() => setShowAddCardForm(false)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Name */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Name / Label *</label>
                            <input
                              type="text"
                              required
                              value={newCardName}
                              onChange={e => setNewCardName(e.target.value)}
                              placeholder="e.g. Sony Tough G 128GB #1"
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>

                          {/* Card Type (Manual Text Input) */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Type *</label>
                            <input
                              type="text"
                              required
                              value={newCardType}
                              onChange={e => setNewCardType(e.target.value)}
                              placeholder="e.g. SDXC V90, CFexpress Type A, MicroSD..."
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Storage Capacity with 3D GB / TB Dropdown */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Capacity *</label>
                            <CapacityInputWith3DDropdown
                              value={newCardCapacity}
                              onChange={setNewCardCapacity}
                              unit={newCardCapacityUnit}
                              onUnitChange={setNewCardCapacityUnit}
                              theme="amber"
                              placeholder="128"
                            />
                          </div>

                          {/* Speed Class */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Speed Class / Rating</label>
                            <input
                              type="text"
                              value={newCardSpeed}
                              onChange={e => setNewCardSpeed(e.target.value)}
                              placeholder="e.g. V90 300MB/s, 1700MB/s"
                              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        {/* Color Label with Custom Color Picker */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Color Label / Sticker Tag</span>
                            <span className="font-mono text-[10px] text-slate-400">{newCardColor}</span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {GOOGLE_PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewCardColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  newCardColor === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-amber-200">
                              <input
                                type="color"
                                value={newCardColor}
                                onChange={e => setNewCardColor(e.target.value)}
                                className="w-7 h-7 rounded-lg cursor-pointer border border-amber-300 p-0.5 bg-white"
                                title="Pick custom color from color wheel"
                              />
                              <span className="text-[10px] font-bold text-amber-900">Custom Color</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Location (Optional)</label>
                          <input
                            type="text"
                            value={newCardNotes}
                            onChange={e => setNewCardNotes(e.target.value)}
                            placeholder="e.g. Sony FX3 A-Cam primary card"
                            className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddCardForm(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingCard || !newCardName.trim()}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {savingCard && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>+ Add Memory Card to Studio</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Cards Inventory List (3D Visual Cards) */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                      {storageCards.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <SDCardIcon className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-600">No memory cards registered yet</p>
                          <p className="text-[11px] text-slate-400">Add your SD and CFexpress cards above.</p>
                        </div>
                      ) : (
                        storageCards.map(card => {
                          const formattedCap = card.capacity_gb >= 1000 
                            ? `${(card.capacity_gb / 1000).toFixed(1)} TB`
                            : `${card.capacity_gb} GB`;

                          return (
                            <div
                              key={card.id}
                              className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-md transition-all flex items-center justify-between gap-3 group relative overflow-hidden shadow-2xs"
                              style={{ borderLeftWidth: '5px', borderLeftColor: card.color_tag || '#F59E0B' }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* 3D Memory Card Visual Badge */}
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm relative overflow-hidden"
                                  style={{ backgroundColor: card.color_tag || '#F59E0B' }}
                                >
                                  <div className="absolute top-0 right-0 w-3 h-3 bg-white/30 transform rotate-45 translate-x-1 -translate-y-1" />
                                  <SDCardIcon className="w-5 h-5 text-white drop-shadow-xs" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-black text-slate-900 truncate" title={card.card_name}>
                                      {card.card_name}
                                    </h4>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                      {formattedCap}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{card.card_type?.replace(/_/g, ' ')}</span>
                                    {card.speed_class && <span>⚡ {card.speed_class}</span>}
                                    {card.notes && <span className="text-slate-400 truncate max-w-[150px]">• {card.notes}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditCard(card)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition cursor-pointer shadow-2xs"
                                  title="Edit Card (Open 3D Modal)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shadow-2xs"
                                  title="Delete Card"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT COLUMN: PHYSICAL DRIVES (HDDs, SSDs, NAS) ── */}
                  <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 flex flex-col">
                    <div className="flex flex-col gap-3 border-b border-emerald-100 pb-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                            <SSDIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-slate-900 leading-snug">
                              Physical Hard Drives & SSDs
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-normal mt-0.5">
                              Manage editing SSDs, external hard drives, racks & NAS arrays
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 whitespace-nowrap shrink-0">
                          {storageDisks.length} Registered
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddDiskForm(prev => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {showAddDiskForm ? (
                            <>
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Close Form</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add Hard Drive / SSD</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Drive Add Form (Shown ONLY when Add button is clicked) */}
                    {showAddDiskForm && (
                      <form onSubmit={async (e) => {
                        await handleSaveDisk(e);
                        setShowAddDiskForm(false);
                      }} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center justify-between">
                          <span>➕ Register New Hard Drive / SSD</span>
                          <button
                            type="button"
                            onClick={() => setShowAddDiskForm(false)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Name */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Name / Model *</label>
                            <input
                              type="text"
                              required
                              value={newDiskName}
                              onChange={e => setNewDiskName(e.target.value)}
                              placeholder="e.g. Samsung T7 Shield 2TB"
                              className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>

                          {/* Drive Type (3D Dropdown with clean labels - NO parentheses) */}
                          <div className="relative">
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Type *</label>
                            <button
                              type="button"
                              onClick={() => setIsDriveTypeDropdownOpen(prev => !prev)}
                              className="w-full px-3 py-2 bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-2xs"
                            >
                              <span className="truncate">
                                {DRIVE_TYPES.find(t => t.id === newDiskType)?.label || newDiskType}
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDriveTypeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDriveTypeDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-emerald-200 shadow-xl z-30 p-2 space-y-1">
                                {DRIVE_TYPES.map(type => (
                                  <div
                                    key={type.id}
                                    onClick={() => {
                                      setNewDiskType(type.id);
                                      setIsDriveTypeDropdownOpen(false);
                                    }}
                                    className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                                      newDiskType === type.id
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                        : 'hover:bg-slate-50 border-transparent text-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">{type.label}</div>
                                      <div className="text-[10px] text-slate-400">{type.desc}</div>
                                    </div>
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                      {type.badge}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Storage Capacity with 3D GB / TB Dropdown */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Total Storage Capacity *</label>
                            <CapacityInputWith3DDropdown
                              value={newDiskCapacity}
                              onChange={setNewDiskCapacity}
                              unit={newDiskCapacityUnit}
                              onUnitChange={setNewDiskCapacityUnit}
                              theme="emerald"
                              placeholder="2000"
                            />
                          </div>

                          {/* Physical Location */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Physical Location / Shelf</label>
                            <input
                              type="text"
                              value={newDiskLocation}
                              onChange={e => setNewDiskLocation(e.target.value)}
                              placeholder="e.g. Studio Desk 1, Safe, Edit Rig 2"
                              className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>

                        {/* Color Label with Custom Color Picker */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Color Label / Sticker Tag</span>
                            <span className="font-mono text-[10px] text-slate-400">{newDiskColor}</span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {GOOGLE_PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewDiskColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  newDiskColor === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-emerald-200">
                              <input
                                type="color"
                                value={newDiskColor}
                                onChange={e => setNewDiskColor(e.target.value)}
                                className="w-7 h-7 rounded-lg cursor-pointer border border-emerald-300 p-0.5 bg-white"
                                title="Pick custom color from color wheel"
                              />
                              <span className="text-[10px] font-bold text-emerald-900">Custom Color</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Purpose (Optional)</label>
                          <input
                            type="text"
                            value={newDiskNotes}
                            onChange={e => setNewDiskNotes(e.target.value)}
                            placeholder="e.g. Primary wedding raw footage archive"
                            className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddDiskForm(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingDisk || !newDiskName.trim()}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {savingDisk && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>+ Add Storage Drive to Studio</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Drives Inventory List (3D Visual Cards) */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                      {storageDisks.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <SSDIcon className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="text-xs font-bold text-slate-600">No storage drives registered yet</p>
                          <p className="text-[11px] text-slate-400">Add external SSDs and hard drives above.</p>
                        </div>
                      ) : (
                        storageDisks.map(disk => {
                          const formattedCap = disk.total_capacity_gb >= 1000 
                            ? `${(disk.total_capacity_gb / 1000).toFixed(1)} TB`
                            : `${disk.total_capacity_gb} GB`;

                          return (
                            <div
                              key={disk.id}
                              className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between gap-3 group relative overflow-hidden shadow-2xs"
                              style={{ borderLeftWidth: '5px', borderLeftColor: disk.color_tag || '#3B82F6' }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* 3D Drive Visual Badge */}
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm relative"
                                  style={{ backgroundColor: disk.color_tag || '#3B82F6' }}
                                >
                                  {disk.disk_type === 'NAS' ? (
                                    <Server className="w-5 h-5 text-white drop-shadow-xs" />
                                  ) : disk.disk_type === 'EXTERNAL_SSD' || disk.disk_type === 'NVME_SSD' ? (
                                    <SSDIcon className="w-5 h-5 text-white drop-shadow-xs" />
                                  ) : (
                                    <HardDrive className="w-5 h-5 text-white drop-shadow-xs" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-black text-slate-900 truncate" title={disk.disk_name}>
                                      {disk.disk_name}
                                    </h4>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      {formattedCap}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{disk.disk_type?.replace(/_/g, ' ')}</span>
                                    {disk.physical_location && <span>• 📍 {disk.physical_location}</span>}
                                    {disk.notes && <span className="text-slate-400 truncate max-w-[150px]">• {disk.notes}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditDisk(disk)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition cursor-pointer shadow-2xs"
                                  title="Edit Drive (Open 3D Modal)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDisk(disk.id)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shadow-2xs"
                                  title="Delete Drive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 3D POPUP MODAL: EDIT MEMORY CARD ── */}
                {editingCardModal && (
                  <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-amber-300/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
                            <SDCardIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900">Edit Memory Card</h3>
                            <p className="text-xs text-slate-500 font-medium">Update memory card specifications in studio inventory</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingCardModal(null)}
                          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveModalCard} className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Name / Label *</label>
                            <input
                              type="text"
                              required
                              value={editingCardModal.card_name || ''}
                              onChange={e => setEditingCardModal({ ...editingCardModal, card_name: e.target.value })}
                              placeholder="e.g. Sony Tough G 128GB #1"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Card Type *</label>
                            <input
                              type="text"
                              required
                              value={editingCardModal.card_type || ''}
                              onChange={e => setEditingCardModal({ ...editingCardModal, card_type: e.target.value })}
                              placeholder="e.g. SDXC V90, CFexpress Type A..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Storage Capacity *</label>
                            <CapacityInputWith3DDropdown
                              value={editingCardModal.capacity_val || '128'}
                              onChange={val => setEditingCardModal({ ...editingCardModal, capacity_val: val })}
                              unit={editingCardModal.capacity_unit || 'GB'}
                              onUnitChange={unit => setEditingCardModal({ ...editingCardModal, capacity_unit: unit })}
                              theme="amber"
                              placeholder="128"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Speed Class / Rating</label>
                            <input
                              type="text"
                              value={editingCardModal.speed_class || ''}
                              onChange={e => setEditingCardModal({ ...editingCardModal, speed_class: e.target.value })}
                              placeholder="e.g. V90 300MB/s, 1700MB/s"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        {/* Color Picker Swatches */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Color Sticker / Hardware Tag</span>
                            <span className="font-mono text-[10px] text-slate-400">{editingCardModal.color_tag}</span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {GOOGLE_PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditingCardModal({ ...editingCardModal, color_tag: c })}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  editingCardModal.color_tag === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                              <input
                                type="color"
                                value={editingCardModal.color_tag || '#F59E0B'}
                                onChange={e => setEditingCardModal({ ...editingCardModal, color_tag: e.target.value })}
                                className="w-7 h-7 rounded-lg cursor-pointer border border-amber-300 p-0.5 bg-white"
                              />
                              <span className="text-[10px] font-bold text-slate-700">Custom</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Assigned Camera (Optional)</label>
                          <input
                            type="text"
                            value={editingCardModal.notes || ''}
                            onChange={e => setEditingCardModal({ ...editingCardModal, notes: e.target.value })}
                            placeholder="e.g. Primary FX3 A-Cam card, kept in Pelican case 1"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingCardModal(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingModalCard}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                          >
                            {savingModalCard && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── 3D POPUP MODAL: EDIT HARD DRIVE / SSD ── */}
                {editingDiskModal && (
                  <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 border border-emerald-300/80 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-bold">
                            <SSDIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900">Edit Storage Drive / SSD</h3>
                            <p className="text-xs text-slate-500 font-medium">Update physical drive specifications & shelf location</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingDiskModal(null)}
                          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveModalDisk} className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Name / Model *</label>
                            <input
                              type="text"
                              required
                              value={editingDiskModal.disk_name || ''}
                              onChange={e => setEditingDiskModal({ ...editingDiskModal, disk_name: e.target.value })}
                              placeholder="e.g. Samsung T7 Shield 2TB"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>

                          <div className="relative">
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Drive Type *</label>
                            <button
                              type="button"
                              onClick={() => setIsModalDriveTypeDropdownOpen(prev => !prev)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-2xs"
                            >
                              <span className="truncate">
                                {DRIVE_TYPES.find(t => t.id === editingDiskModal.disk_type)?.label || editingDiskModal.disk_type}
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isModalDriveTypeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isModalDriveTypeDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-emerald-200 shadow-xl z-50 p-2 space-y-1 max-h-48 overflow-y-auto">
                                {DRIVE_TYPES.map(type => (
                                  <div
                                    key={type.id}
                                    onClick={() => {
                                      setEditingDiskModal({ ...editingDiskModal, disk_type: type.id });
                                      setIsModalDriveTypeDropdownOpen(false);
                                    }}
                                    className={`p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                                      editingDiskModal.disk_type === type.id
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                        : 'hover:bg-slate-50 border-transparent text-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">{type.label}</div>
                                      <div className="text-[10px] text-slate-400">{type.desc}</div>
                                    </div>
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                      {type.badge}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Storage Capacity *</label>
                            <CapacityInputWith3DDropdown
                              value={editingDiskModal.capacity_val || '2000'}
                              onChange={val => setEditingDiskModal({ ...editingDiskModal, capacity_val: val })}
                              unit={editingDiskModal.capacity_unit || 'GB'}
                              onUnitChange={unit => setEditingDiskModal({ ...editingDiskModal, capacity_unit: unit })}
                              theme="emerald"
                              placeholder="2000"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 mb-1 block">Physical Location / Shelf</label>
                            <input
                              type="text"
                              value={editingDiskModal.physical_location || ''}
                              onChange={e => setEditingDiskModal({ ...editingDiskModal, physical_location: e.target.value })}
                              placeholder="e.g. Studio Desk 1, Safe, Edit Rig 2"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>

                        {/* Color Picker Swatches */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                            <span>Color Label / Sticker Tag</span>
                            <span className="font-mono text-[10px] text-slate-400">{editingDiskModal.color_tag}</span>
                          </label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {GOOGLE_PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditingDiskModal({ ...editingDiskModal, color_tag: c })}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  editingDiskModal.color_tag === c ? 'scale-125 border-slate-900 shadow-xs' : 'border-white hover:scale-110 shadow-2xs'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                              <input
                                type="color"
                                value={editingDiskModal.color_tag || '#3B82F6'}
                                onChange={e => setEditingDiskModal({ ...editingDiskModal, color_tag: e.target.value })}
                                className="w-7 h-7 rounded-lg cursor-pointer border border-emerald-300 p-0.5 bg-white"
                              />
                              <span className="text-[10px] font-bold text-slate-700">Custom</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 mb-1 block">Notes / Purpose (Optional)</label>
                          <input
                            type="text"
                            value={editingDiskModal.notes || ''}
                            onChange={e => setEditingDiskModal({ ...editingDiskModal, notes: e.target.value })}
                            placeholder="e.g. Primary wedding raw footage archive"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                          />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingDiskModal(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingModalDisk}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                          >
                            {savingModalDisk && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. FINANCE & INVOICES SETTINGS */}
            {activeTab === 'finance' && (
              <div className="bg-white border border-amber-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-amber-950">Finance & Invoices Settings (`/workspace/finance`)</h2>
                    <p className="text-xs font-medium text-zinc-500">Configure Invoice branding, GSTIN, Bank Transfer credentials, and Expense Categories</p>
                  </div>
                </div>

                {/* Studio & Brand Identity on Invoices */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-zinc-850 uppercase tracking-wider"> Studio Identity & Header on Invoices</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Company / Studio Name</label>
                      <input
                        type="text"
                        value={invoiceCompanyName}
                        onChange={e => setInvoiceCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={invoiceTagline}
                        onChange={e => setInvoiceTagline(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={invoiceGstin}
                        onChange={e => setInvoiceGstin(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={invoicePhone}
                        onChange={e => setInvoicePhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={invoiceEmail}
                        onChange={e => setInvoiceEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Studio Physical Address</label>
                    <input
                      type="text"
                      value={invoiceAddress}
                      onChange={e => setInvoiceAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/* Bank Transfer & UPI Details */}
                <div className="space-y-4 pt-4 border-t border-amber-100">
                  <h3 className="text-xs font-black text-zinc-850 uppercase tracking-wider"> Bank Account & UPI Payment Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={invoiceBankName}
                        onChange={e => setInvoiceBankName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={invoiceAccountHolder}
                        onChange={e => setInvoiceAccountHolder(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">Account Number</label>
                      <input
                        type="text"
                        value={invoiceAccountNo}
                        onChange={e => setInvoiceAccountNo(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={invoiceIfsc}
                        onChange={e => setInvoiceIfsc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 block mb-1">UPI ID (e.g. name@bank)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  {/* QR Code Upload Section */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-zinc-700 block mb-1.5">Official Payment QR Code Image (Custom Upload)</label>
                    <div className="flex flex-wrap items-center gap-3 bg-[#FEFDF8] p-3 rounded-xl border border-amber-200/90">
                      {invoiceQrImageUrl ? (
                        <img src={invoiceQrImageUrl} alt="QR Code" className="w-12 h-12 object-contain rounded-lg border bg-white p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <QrCode className="w-6 h-6" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setInvoiceQrImageUrl(previewUrl);

                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const userId = session?.user?.id || 'default_user';
                              const ext = file.name.split('.').pop() || 'png';
                              const filePath = `qr_codes/${userId}/invoice_qr_${Date.now()}.${ext}`;

                              const { error: uploadError } = await supabase.storage
                                .from('workspace-assets')
                                .upload(filePath, file, { upsert: true });

                              if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage
                                  .from('workspace-assets')
                                  .getPublicUrl(filePath);
                                setInvoiceQrImageUrl(publicUrl);
                              }
                            } catch (uploadErr) {
                              console.warn('[Supabase Settings QR Upload Notice]:', uploadErr);
                            }
                          }
                        }}
                        className="text-xs text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0F9D58] file:text-white hover:file:bg-[#0B8043] cursor-pointer"
                      />
                      {invoiceQrImageUrl && (
                        <button
                          type="button"
                          onClick={() => setInvoiceQrImageUrl('')}
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Remove QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Number Prefix & Font Theme */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-amber-100">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice ID Prefix</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={e => setInvoicePrefix(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-mono font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Default GST Rate (%)</label>
                    <input
                      type="number"
                      value={gstPercent}
                      onChange={e => setGstPercent(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice Color Palette (Quotation Themes)</label>
                    <select
                      value={invoiceThemePalette}
                      onChange={e => setInvoiceThemePalette(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto"> Auto-Sync with Default Quotation Theme</option>
                      <option value="cyprus-sand-dune">Cyprus & Sand Dune (#004643 / #F0EDE5)</option>
                      <option value="sand-dune-cyprus">Sand Dune & Cyprus (#F0EDE5 / #004643)</option>
                      <option value="cherry-red-cream">Cherry Red & Cream (#750505 / #FBFCEB)</option>
                      <option value="cream-cherry-red">Cream & Cherry Red (#FBFCEB / #750505)</option>
                      <option value="plum-milk">Plum & Milk (#381932 / #FFF3E6)</option>
                      <option value="milk-plum">Milk & Plum (#FFF3E6 / #381932)</option>
                      <option value="sand-chocolate">Sand & Chocolate (#3E000C / #FFECD1)</option>
                      <option value="chocolate-sand">Chocolate & Sand (#FFECD1 / #3E000C)</option>
                      <option value="feldgrau-wheat">Feldgrau & Wheat (#3A4B41 / #E6CFA7)</option>
                      <option value="wheat-feldgrau">Wheat & Feldgrau (#E6CFA7 / #3A4B41)</option>
                      <option value="noctis-marigold">Noctis & Marigold (#1F2235 / #E3A419)</option>
                      <option value="marigold-noctis">Marigold & Noctis (#E3A419 / #1F2235)</option>
                      <option value="champagne-obsidian">Champagne & Obsidian (#111111 / #F7F4EF)</option>
                      <option value="royal-gold">Royal Gold & Luxury Sand (#D4AF37 / #FAF7F2)</option>
                      <option value="minimal-charcoal">Minimal Charcoal & White (#262626 / #FFFFFF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Invoice Typography / Font</label>
                    <select
                      value={invoiceFont}
                      onChange={e => setInvoiceFont(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs font-bold text-amber-950 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto"> Auto-Sync with Default Quotation Font</option>
                      <option value="Cormorant Garamond">Cormorant Garamond (Quotation Luxury Serif)</option>
                      <option value="Cinzel">Cinzel (Royal Classical)</option>
                      <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean Sans)</option>
                      <option value="Montserrat">Montserrat (Geometric Sans)</option>
                      <option value="Inter">Inter (SaaS Minimal)</option>
                      <option value="Outfit">Outfit (Contemporary Clean)</option>
                      <option value="Prata">Prata (Romantic Editorial)</option>
                      <option value="Bodoni Moda">Bodoni Moda (High Fashion)</option>
                    </select>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="space-y-4 pt-4 border-t border-amber-100">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Standard Invoice Terms & Conditions</label>
                    <textarea
                      rows={2}
                      value={invoiceTerms}
                      onChange={e => setInvoiceTerms(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 block mb-1">Footer Note / Disclaimer</label>
                    <input
                      type="text"
                      value={invoiceFooterNote}
                      onChange={e => setInvoiceFooterNote(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FEFDF8] border border-amber-200/90 rounded-xl text-xs text-amber-950 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/*  FINANCE VAULT SECURITY & PIN PROTECTION */}
                <div className="pt-5 border-t border-amber-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                          Finance Vault Security & PIN Gate
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Protect financial figures, quotations revenue, and payouts behind a 6-digit PIN screen
                        </p>
                      </div>
                    </div>

                    {/* Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={financePinLocked}
                        onChange={e => setFinancePinLocked(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {financePinLocked && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            6-Digit Master PIN <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            maxLength={6}
                            value={financePinCode}
                            onChange={e => setFinancePinCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="123456"
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-center text-base font-black tracking-widest text-amber-950 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Auto-Lock Session Timeout
                          </label>
                          <select
                            value={financeTimeoutMins}
                            onChange={e => setFinanceTimeoutMins(Number(e.target.value))}
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-950 focus:outline-none"
                          >
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={60}>1 Hour (Standard)</option>
                            <option value={240}>4 Hours</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Admin Recovery Email
                          </label>
                          <input
                            type="email"
                            value={financeAdminEmail}
                            onChange={e => setFinanceAdminEmail(e.target.value)}
                            placeholder="admin@studio.com"
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-amber-950 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-700 block mb-1">
                            Master Admin Password
                          </label>
                          <input
                            type="password"
                            value={financeMasterPassword}
                            onChange={e => setFinanceMasterPassword(e.target.value)}
                            placeholder=""
                            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-amber-950 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Once enabled, anyone navigating to <code>/workspace/finance</code> must enter the PIN to unlock metrics.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expense Categories Google Sheets Option Builder */}
                <div className="pt-4 border-t border-amber-100 space-y-2">
                  <label className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider block mb-1">
                    Expense Categories Options
                  </label>
                  {renderGoogleOptionList(expenseCategories, setExpenseCategories, 'expense', 'Add another item')}
                </div>
              </div>
            )}
              </div>
            )}
          </main>
        </div>

      </div>
    </div>
  );
}

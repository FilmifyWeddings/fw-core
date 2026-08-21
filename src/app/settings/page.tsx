'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, RefreshCw, Check, Save, ArrowLeft, Target,
  FileText, Coins, Clock, Globe, Users, Plus, Trash2, Phone, Mail, MessageSquare, Send,
  UserCheck, AlertCircle, ChevronDown, GripVertical, CheckCircle2, Table, ArrowUp, ArrowDown,
  QrCode, Sparkles, Upload, Image as ImageIcon, Building2, CreditCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SettingsTab = 'leads' | 'quotations' | 'finance' | 'attendance' | 'integrations' | 'team';

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

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('leads');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);

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
    { id: 's6', name: 'WhatsApp Direct', color: '#84cc16' },
  ]);

  const [leadStages, setLeadStages] = useState<DropdownItem[]>([
    { id: 'new', name: 'Inquiry / New', color: '#3b82f6' },
    { id: 'contacted', name: 'Contacted', color: '#8b5cf6' },
    { id: 'cool', name: 'Cool / Warm', color: '#06b6d4' },
    { id: 'hot', name: 'Hot 🔥', color: '#f43f5e' },
    { id: 'booked', name: 'Booked', color: '#84cc16' },
    { id: 'won', name: 'Won 🎉', color: '#10b981' },
    { id: 'lost', name: 'Lost ❌', color: '#f43f5e' },
  ]);

  const [budgetRanges, setBudgetRanges] = useState<DropdownItem[]>([
    { id: 'b1', name: '₹50k - ₹1L', color: '#10b981' },
    { id: 'b2', name: '₹1L - ₹2.5L', color: '#3b82f6' },
    { id: 'b3', name: '₹2.5L - ₹5L', color: '#f59e0b' },
    { id: 'b4', name: '₹5L+', color: '#f43f5e' },
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
      const res = await fetch(`/api/settings?workspace_id=${wId}`, { headers });

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
            setLeadStages(s.lead_stages.map((st: any, idx: number) => {
              if (typeof st === 'string') {
                return { id: `st_${idx}`, name: st, color: GOOGLE_PRESET_COLORS[idx % GOOGLE_PRESET_COLORS.length] };
              }
              return st;
            }));
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
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [router, getAuthHeaders]);

  useEffect(() => {
    loadWorkspaceSettings();
  }, [loadWorkspaceSettings]);

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

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspace_id: wId,
          settings: payloadSettings,
        }),
      });

      if (res.ok) {
        syncToLocalStorage(wId, payloadSettings);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('settings_updated'));
        }
        setSaveToast('Settings saved & synchronized live across all pages! ✓');
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        const errJson = await res.json().catch(() => ({}));
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
      {list.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 sm:gap-3 group relative">
          {/* Grip Handle */}
          <div className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors p-1">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Up / Down Reorder Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleMoveItemUp(list, setList, index)}
              disabled={index === 0}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveItemDown(list, setList, index)}
              disabled={index === list.length - 1}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
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
              className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            >
              <span className="w-4 h-4 rounded-md shadow-inner" style={{ backgroundColor: item.color }} />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Exact Color Palette Popover matching image */}
            {activeColorPickerId === item.id && (
              <div className="absolute left-0 top-11 z-50 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xl space-y-2 min-w-[280px]">
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
          <input
            type="text"
            value={item.name}
            onChange={e => handleUpdateItemName(list, setList, item.id, e.target.value)}
            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] shadow-xs"
            placeholder="Option Name..."
          />

          {/* Trash Icon Button */}
          <button
            type="button"
            onClick={() => handleRemoveItem(list, setList, item.id)}
            className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete option"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add another item button */}
      <button
        type="button"
        onClick={() => handleAddItem(list, setList, prefix)}
        className="mt-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-[#0F9D58] font-bold text-xs rounded-xl transition-all shadow-xs border-dashed flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>{addLabel}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 p-4 sm:p-6 md:p-8 font-sans">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F9D58] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#0F9D58] uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Table className="w-3 h-3" /> GOOGLE SHEETS DYNAMIC SYNC
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
                Master Page-Wise Settings Dashboard
              </h1>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Saving to Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Page-Wise Settings Tabs Header */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
          {[
            { id: 'leads', label: '🎯 Leads & Pipeline', icon: Target },
            { id: 'quotations', label: '📄 Quotations & Proposals', icon: FileText },
            { id: 'finance', label: '💰 Finance & Invoices', icon: Coins },
            { id: 'attendance', label: '⏰ Attendance & Geofence', icon: Clock },
            { id: 'integrations', label: '🔌 Meta & Integrations', icon: Globe },
            { id: 'team', label: '👥 Team & Owners', icon: Users },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-[#0F9D58] text-white shadow-xs border border-[#0B8043]' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F9D58]" />
            <p className="text-sm font-semibold">Loading user settings from Supabase Database...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. LEADS PAGE SETTINGS */}
            {activeTab === 'leads' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F9D58] flex items-center justify-center font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Leads Page Settings (`/leads`)</h2>
                    <p className="text-xs font-medium text-slate-500">Manage Lead Owners, Lead Sources, Pipeline Stages, and Action Buttons</p>
                  </div>
                </div>

                {/* Lead Action Buttons Checkboxes */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                      Manage Lead Action Column Buttons (Visible on `/leads` Page)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">Select which action buttons appear in the Action column (New users get Quotation, Call, Mail & Comments by default)</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {[
                      { key: 'quotation', label: 'Quotation / Proposal', icon: FileText, desc: 'Generate & send PDF quotes', isDefault: true },
                      { key: 'call', label: 'Device Dialer Call', icon: Phone, desc: 'Click-to-call lead phone number', isDefault: true },
                      { key: 'mail', label: 'Email Lead', icon: Mail, desc: 'Send email to lead', isDefault: true },
                      { key: 'comments', label: 'Comments & Reminders', icon: MessageSquare, desc: 'Open discussion timeline drawer', isDefault: true },
                      { key: 'google_contact', label: 'Google Contact Sync', icon: UserCheck, desc: 'Sync lead to Google Contacts', isDefault: false },
                      { key: 'wgl_alert', label: 'WGL Alert Dispatch', icon: AlertCircle, desc: 'Dispatch WGL team notification', isDefault: false },
                      { key: 'whatsapp', label: 'WhatsApp Direct', icon: Send, desc: 'Send WhatsApp welcome message', isDefault: false },
                      { key: 'followup', label: 'Followup Calendar', icon: Clock, desc: 'Schedule followups & tasks', isDefault: false },
                    ].map(item => (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          quickActions[item.key] 
                            ? 'bg-emerald-50/60 border-emerald-300 text-slate-900 shadow-2xs' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!quickActions[item.key]}
                          onChange={e => setQuickActions({ ...quickActions, [item.key]: e.target.checked })}
                          className="mt-0.5 w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] border-slate-300 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <item.icon className="w-3.5 h-3.5 text-[#0F9D58]" />
                            {item.label}
                            {item.isDefault && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-[#0F9D58] px-1.5 py-0.2 rounded-md">Default</span>
                            )}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Lead Owners Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Manage Lead Owners (Dropdown Options in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadOwners, setLeadOwners, 'owner', 'Add another item')}
                </div>

                {/* Lead Sources Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Manage Lead Sources (Dropdown Options in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadSources, setLeadSources, 'source', 'Add another item')}
                </div>

                {/* Lead Stages Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Manage Pipeline Stages (Kanban Columns in Leads Page)
                  </label>
                  {renderGoogleOptionList(leadStages, setLeadStages, 'stage', 'Add another item')}
                </div>

                {/* Lead Budget Ranges Google Sheets Style Dropdown Builder */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Lead Budget Filter Options
                  </label>
                  {renderGoogleOptionList(budgetRanges, setBudgetRanges, 'budget', 'Add another item')}
                </div>
              </div>
            )}

            {/* 2. QUOTATIONS PAGE SETTINGS */}
            {activeTab === 'quotations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Quotations & Proposals Settings (`/workspace/quotations`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure PDF themes, default terms, expiry duration, and contract clauses</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* PDF Theme Dropdown */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      PDF Document Theme
                    </label>
                    <div className="relative">
                      <select
                        value={pdfTheme}
                        onChange={e => setPdfTheme(e.target.value)}
                        className="w-full appearance-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                      >
                        <option value="royal_gold">👑 Royal Gold & Obsidian</option>
                        <option value="minimal_dark">🖤 Minimal Dark Studio</option>
                        <option value="airy_clean">✨ Airy Clean White</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Expiry Days */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Quotation Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={quoteExpiryDays}
                      onChange={e => setQuoteExpiryDays(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Currency Dropdown */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Default Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full appearance-none px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                      >
                        <option value="INR">₹ INR (Indian Rupee)</option>
                        <option value="USD">$ USD (US Dollar)</option>
                        <option value="AED">AED (UAE Dirham)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Default Quotation Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={quoteTerms}
                    onChange={e => setQuoteTerms(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                  />
                </div>

                {/* Contract Clauses */}
                <div>
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Standard Contract Clauses
                  </label>
                  <textarea
                    rows={4}
                    value={contractClauses}
                    onChange={e => setContractClauses(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                  />
                </div>
              </div>
            )}

            {/* 3. FINANCE & INVOICES SETTINGS */}
            {activeTab === 'finance' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Finance & Invoices Settings (`/workspace/finance`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Invoice branding, GSTIN, Bank Transfer credentials, and Expense Categories</p>
                  </div>
                </div>

                {/* Studio & Brand Identity on Invoices */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">🏢 Studio Identity & Header on Invoices</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Company / Studio Name</label>
                      <input
                        type="text"
                        value={invoiceCompanyName}
                        onChange={e => setInvoiceCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tagline / Subtitle</label>
                      <input
                        type="text"
                        value={invoiceTagline}
                        onChange={e => setInvoiceTagline(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={invoiceGstin}
                        onChange={e => setInvoiceGstin(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={invoicePhone}
                        onChange={e => setInvoicePhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={invoiceEmail}
                        onChange={e => setInvoiceEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Studio Physical Address</label>
                    <input
                      type="text"
                      value={invoiceAddress}
                      onChange={e => setInvoiceAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/* Bank Transfer & UPI Details */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">💳 Bank Account & UPI Payment Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={invoiceBankName}
                        onChange={e => setInvoiceBankName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={invoiceAccountHolder}
                        onChange={e => setInvoiceAccountHolder(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                      <input
                        type="text"
                        value={invoiceAccountNo}
                        onChange={e => setInvoiceAccountNo(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={invoiceIfsc}
                        onChange={e => setInvoiceIfsc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">UPI ID (e.g. name@bank)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                      />
                    </div>
                  </div>

                  {/* QR Code Upload Section */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Official Payment QR Code Image (Custom Upload)</label>
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onload = () => setInvoiceQrImageUrl(r.result as string);
                            r.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0F9D58] file:text-white hover:file:bg-[#0B8043] cursor-pointer"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Invoice ID Prefix</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={e => setInvoicePrefix(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Default GST Rate (%)</label>
                    <input
                      type="number"
                      value={gstPercent}
                      onChange={e => setGstPercent(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Invoice Color Palette (Quotation Themes)</label>
                    <select
                      value={invoiceThemePalette}
                      onChange={e => setInvoiceThemePalette(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto">⚡ Auto-Sync with Default Quotation Theme</option>
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
                    <label className="text-xs font-bold text-slate-700 block mb-1">Invoice Typography / Font</label>
                    <select
                      value={invoiceFont}
                      onChange={e => setInvoiceFont(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58] cursor-pointer"
                    >
                      <option value="auto">⚡ Auto-Sync with Default Quotation Font</option>
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
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Standard Invoice Terms & Conditions</label>
                    <textarea
                      rows={2}
                      value={invoiceTerms}
                      onChange={e => setInvoiceTerms(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Footer Note / Disclaimer</label>
                    <input
                      type="text"
                      value={invoiceFooterNote}
                      onChange={e => setInvoiceFooterNote(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>

                {/* Expense Categories Google Sheets Option Builder */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Expense Categories Options
                  </label>
                  {renderGoogleOptionList(expenseCategories, setExpenseCategories, 'expense', 'Add another item')}
                </div>
              </div>
            )}

            {/* 4. ATTENDANCE & GEOFENCE SETTINGS */}
            {activeTab === 'attendance' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Attendance & Geofence Settings (`/workspace/attendance`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Geofence radius, Shift start time, and break limits</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Geofence Radius */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Geofence Radius (Meters)
                    </label>
                    <input
                      type="number"
                      value={geofenceRadius}
                      onChange={e => setGeofenceRadius(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Shift Start */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Default Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Grace Period (Minutes)
                    </label>
                    <input
                      type="number"
                      value={graceMinutes}
                      onChange={e => setGraceMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>

                  {/* Break Limit */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Break Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={breakLimitMinutes}
                      onChange={e => setBreakLimitMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0F9D58]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. META & INTEGRATIONS SETTINGS */}
            {activeTab === 'integrations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866FF] flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Meta & Integrations Settings (`/workspace/integrations/meta`)</h2>
                    <p className="text-xs font-medium text-slate-500">Configure Meta auto-sync interval and default WhatsApp triggers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Real-Time Meta Lead Webhook Sync</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Automatically ingest Facebook Instant Leads into CRM instantly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMetaAutoSync(!metaAutoSync)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      metaAutoSync ? 'bg-[#0F9D58] text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {metaAutoSync ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            )}

            {/* 6. TEAM & OWNERS SETTINGS */}
            {activeTab === 'team' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Team & Access Control Settings (`/workspace/team`)</h2>
                    <p className="text-xs font-medium text-slate-500">Manage team members, roles, and access rules</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0F9D58] flex items-center justify-center font-bold text-sm">
                        WS
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Workspace User Account</h4>
                        <p className="text-xs text-slate-500">Active Supabase Workspace ID: {workspaceId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#0F9D58] border border-emerald-200 text-xs font-bold">
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

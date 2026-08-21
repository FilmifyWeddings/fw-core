'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Download, Printer, X, Settings2, Check, Sparkles, Building2, 
  CreditCard, QrCode, FileText, RefreshCw, Eye, ShieldCheck, Phone, Mail, 
  MapPin, Upload, Image as ImageIcon, Calendar, CheckCircle2, Clock, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportInvoiceToPDF } from '@/lib/invoice-pdf-export';
import { COLOR_THEMES } from '@/lib/quotation-theme';
import type { WorkspaceClient, ClientFinanceRecord } from '@/types';

export interface InvoiceTemplateConfig {
  companyName: string;
  tagline: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  invoiceTitle: string;
  prefix: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  accountHolder: string;
  upiId: string;
  showUpiQr: boolean;
  qrCodeImageUrl: string;
  terms: string;
  footerNote: string;
  logoUrl: string;
  fontFamily: string;
  themePreset: string;
  themeColor: string;
}

const DEFAULT_INVOICE_CONFIG: InvoiceTemplateConfig = {
  companyName: 'FILMIFY WEDDINGS',
  tagline: 'Luxury Wedding Photography & Cinematography',
  gstin: '27AABCF1234F1ZP',
  address: 'Mumbai, Maharashtra, India',
  phone: '+91 98765 43210',
  email: 'info@filmifyweddings.com',
  invoiceTitle: 'TAX INVOICE',
  prefix: 'INV-',
  bankName: 'HDFC Bank',
  accountNo: '50200012345678',
  ifsc: 'HDFC0001234',
  accountHolder: 'Filmify Weddings LLP',
  upiId: 'filmifyweddings@hdfcbank',
  showUpiQr: true,
  qrCodeImageUrl: '',
  terms: '1. Advance payment is non-refundable upon client cancellation.\n2. Final deliverables delivered post clearance of balance.\n3. Raw footage retained for 60 days post event.',
  footerNote: 'Thank you for choosing Filmify Weddings! This is a computer-generated invoice.',
  logoUrl: '',
  fontFamily: 'Cormorant Garamond',
  themePreset: 'auto',
  themeColor: '#D4AF37',
};

interface InvoiceModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: WorkspaceClient | null;
  financeRecord: ClientFinanceRecord | null;
  defaultQuotationTemplate?: any;
}

export function InvoiceModalDialog({
  isOpen,
  onClose,
  client,
  financeRecord,
  defaultQuotationTemplate,
}: InvoiceModalDialogProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [config, setConfig] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_CONFIG);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Resolve Theme & Typography from Default Quotation Template
  const resolvedQuotationTheme = React.useMemo(() => {
    if (!defaultQuotationTemplate) return null;
    const themeId = defaultQuotationTemplate.theme || defaultQuotationTemplate.look || 'cyprus-sand-dune';
    const themeObj = COLOR_THEMES[themeId] || COLOR_THEMES['cyprus-sand-dune'];
    const pFont = defaultQuotationTemplate.primaryFont || defaultQuotationTemplate.cover?.primaryFont || 'Cormorant Garamond';
    const sFont = defaultQuotationTemplate.secondaryFont || defaultQuotationTemplate.cover?.secondaryFont || 'Plus Jakarta Sans';
    const brandName = defaultQuotationTemplate.cover?.brandName || defaultQuotationTemplate.brandName;
    const brandLogo = defaultQuotationTemplate.cover?.brandLogoUrl || defaultQuotationTemplate.brandLogoUrl;

    return {
      themeId,
      themeObj,
      primaryFont: pFont,
      secondaryFont: sFont,
      brandName,
      brandLogo,
    };
  }, [defaultQuotationTemplate]);

  // 2. Load settings on open
  useEffect(() => {
    if (!isOpen) return;

    const savedConfigStr = localStorage.getItem('studio_invoice_template_config');
    let loadedConfig = { ...DEFAULT_INVOICE_CONFIG };
    if (savedConfigStr) {
      try {
        const parsed = JSON.parse(savedConfigStr);
        if (parsed && typeof parsed === 'object') {
          loadedConfig = { ...DEFAULT_INVOICE_CONFIG, ...parsed };
        }
      } catch (_) {}
    }

    // If quotation template is resolved and user has auto theme preset
    if (resolvedQuotationTheme) {
      if (!savedConfigStr) {
        if (resolvedQuotationTheme.primaryFont) loadedConfig.fontFamily = resolvedQuotationTheme.primaryFont;
        if (resolvedQuotationTheme.brandLogo) loadedConfig.logoUrl = resolvedQuotationTheme.brandLogo;
        if (resolvedQuotationTheme.brandName) loadedConfig.companyName = resolvedQuotationTheme.brandName;
        if (resolvedQuotationTheme.themeObj?.primary) loadedConfig.themeColor = resolvedQuotationTheme.themeObj.primary;
      }
    }

    fetchSettingsFromAPI().then(apiSettings => {
      if (apiSettings) {
        setConfig(prev => ({ ...prev, ...apiSettings }));
      } else {
        setConfig(loadedConfig);
      }
    });
  }, [isOpen, resolvedQuotationTheme]);

  const fetchSettingsFromAPI = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await fetch(`/api/settings?workspace_id=${session.user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          const patch: Partial<InvoiceTemplateConfig> = {};
          if (s.invoice_company_name) patch.companyName = s.invoice_company_name;
          if (s.invoice_tagline) patch.tagline = s.invoice_tagline;
          if (s.invoice_gstin) patch.gstin = s.invoice_gstin;
          if (s.invoice_address) patch.address = s.invoice_address;
          if (s.invoice_phone) patch.phone = s.invoice_phone;
          if (s.invoice_email) patch.email = s.invoice_email;
          if (s.invoice_bank_name) patch.bankName = s.invoice_bank_name;
          if (s.invoice_account_no) patch.accountNo = s.invoice_account_no;
          if (s.invoice_ifsc) patch.ifsc = s.invoice_ifsc;
          if (s.invoice_account_holder) patch.accountHolder = s.invoice_account_holder;
          if (s.invoice_upi_id) patch.upiId = s.invoice_upi_id;
          if (s.sequence_invoices_prefix) patch.prefix = s.sequence_invoices_prefix;
          if (s.invoice_terms) patch.terms = s.invoice_terms;
          if (s.invoice_footer_note) patch.footerNote = s.invoice_footer_note;
          if (s.invoice_logo_url) patch.logoUrl = s.invoice_logo_url;
          if (s.invoice_qr_image_url) patch.qrCodeImageUrl = s.invoice_qr_image_url;
          if (s.invoice_font) patch.fontFamily = s.invoice_font;
          if (s.invoice_theme_color) patch.themeColor = s.invoice_theme_color;
          return patch;
        }
      }
    } catch (_) {}
    return null;
  };

  const handleSaveTemplateSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      localStorage.setItem('studio_invoice_template_config', JSON.stringify(config));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            workspace_id: session.user.id,
            settings: {
              invoice_company_name: config.companyName,
              invoice_tagline: config.tagline,
              invoice_gstin: config.gstin,
              invoice_address: config.address,
              invoice_phone: config.phone,
              invoice_email: config.email,
              invoice_bank_name: config.bankName,
              invoice_account_no: config.accountNo,
              invoice_ifsc: config.ifsc,
              invoice_account_holder: config.accountHolder,
              invoice_upi_id: config.upiId,
              sequence_invoices_prefix: config.prefix,
              invoice_terms: config.terms,
              invoice_footer_note: config.footerNote,
              invoice_logo_url: config.logoUrl,
              invoice_qr_image_url: config.qrCodeImageUrl,
              invoice_font: config.fontFamily,
              invoice_theme_color: config.themeColor,
            }
          })
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('preview');
      }, 1000);
    } catch (err) {
      console.error('Failed to save invoice settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle QR image file upload
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('QR Image file is too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setConfig(prev => ({ ...prev, qrCodeImageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Logo file upload
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo Image file is too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setConfig(prev => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPdf = async () => {
    if (!financeRecord || !client) return;
    setExportingPdf(true);
    setExportProgress('Preparing A4 PDF document...');
    try {
      const invNo = `${config.prefix}${financeRecord.id.slice(0, 8).toUpperCase()}`;
      const clientNameSafe = (client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      await exportInvoiceToPDF({
        elementId: 'invoice-printable-document',
        filename: `Invoice-${clientNameSafe}-${invNo}.pdf`,
        onProgress: (msg) => setExportProgress(msg)
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Could not export PDF automatically. You can also use the "Print" button.');
    } finally {
      setExportingPdf(false);
      setExportProgress('');
    }
  };

  if (!isOpen || !client || !financeRecord) return null;

  const invoiceNumber = `${config.prefix}${financeRecord.id.slice(0, 8).toUpperCase()}`;
  const formattedToday = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const eventDateFormatted = client.event_date 
    ? new Date(client.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Date TBD';

  const milestones = financeRecord.milestones || [];
  const progressPct = financeRecord.final_total_amount > 0 
    ? Math.min(100, Math.round((financeRecord.received_amount / financeRecord.final_total_amount) * 100)) 
    : 0;

  // Active theme tokens
  const activeThemeObj = React.useMemo(() => {
    if (config.themePreset && config.themePreset !== 'auto' && COLOR_THEMES[config.themePreset]) {
      return COLOR_THEMES[config.themePreset];
    }
    return resolvedQuotationTheme?.themeObj || COLOR_THEMES['cyprus-sand-dune'] || {
      primary: '#004643',
      background: '#F0EDE5',
      text: '#004643',
      kicker: '#004643',
      borderColor: 'rgba(0, 70, 67, 0.2)',
      boxBgColor: 'rgba(0, 70, 67, 0.06)',
    };
  }, [config.themePreset, resolvedQuotationTheme]);

  const activeFont = (config.fontFamily && config.fontFamily !== 'auto') 
    ? config.fontFamily 
    : (resolvedQuotationTheme?.primaryFont || 'Cormorant Garamond');

  const activeAccentColor = activeThemeObj?.primary || config.themeColor || '#D4AF37';
  const activeBoxBg = activeThemeObj?.boxBgColor || '#FAF7F2';
  const activeBorder = activeThemeObj?.borderColor || '#EDE4D5';

  // Dynamic UPI URL if no custom QR image uploaded
  const upiPayUrl = config.upiId && financeRecord.pending_amount > 0
    ? `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.companyName)}&am=${financeRecord.pending_amount}&cu=INR&tn=Invoice_${invoiceNumber}`
    : '';

  const dynamicUpiQrUrl = upiPayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUrl)}`
    : '';

  const displayQrCodeUrl = config.qrCodeImageUrl || dynamicUpiQrUrl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] rounded-3xl max-w-4xl w-full border border-[#EBE3D5] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]"
        >
          {/* ── TOP CONTROL BAR ── */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6ED] to-[#FFFDF9] border-b border-[#EFE8DA] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: activeAccentColor }}
              >
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1E170E] tracking-tight">Invoice & Payment Schedule</h3>
                <p className="text-[11px] text-[#7A6950] font-medium">{client.name} • {invoiceNumber}</p>
              </div>
            </div>

            {/* View & Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* Tab Toggle: Preview / Settings */}
              <div className="p-1 bg-[#F5EEDC] border border-[#E5DAC4] rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white text-[#221B10] shadow-xs'
                      : 'text-[#7A6950] hover:text-[#221B10]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Invoice Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-white text-[#221B10] shadow-xs'
                      : 'text-[#7A6950] hover:text-[#221B10]'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Customize Template
                </button>
              </div>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#1E7E45] hover:bg-[#166536] active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Download High-Resolution A4 PDF"
              >
                <Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
                <span>{exportingPdf ? (exportProgress || 'Exporting...') : 'Download PDF'}</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-[#503E1A] bg-[#FAF3E0] hover:bg-[#F5EBD0] border border-[#E3D3AC] active:scale-95 rounded-xl shadow-2xs transition items-center gap-1.5 cursor-pointer"
                title="Print Document"
              >
                <Printer className="w-3.5 h-3.5 text-[#8C6D28]" />
                Print
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[#7A6950] hover:text-[#221B10] hover:bg-[#F5EEDC] rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── MODAL SCROLLABLE BODY ── */}
          <div className="overflow-y-auto p-3 sm:p-8 flex-1">

            {/* ── TAB 1: INVOICE PREVIEW & PRINTABLE A4 DOCUMENT ── */}
            {activeTab === 'preview' && (
              <div 
                id="invoice-printable-document" 
                className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 space-y-6 shadow-xs text-slate-900 max-w-3xl mx-auto"
                style={{ fontFamily: `${activeFont}, sans-serif` }}
              >
                {/* 1. Brand Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-200">
                  <div className="space-y-1.5">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt={config.companyName} className="h-11 w-auto object-contain mb-2" />
                    )}
                    <h2 
                      className="text-2xl sm:text-3xl font-black tracking-tight"
                      style={{ color: activeAccentColor }}
                    >
                      {config.companyName}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">{config.tagline}</p>
                    <div className="text-[11px] text-slate-500 font-normal space-y-0.5 pt-1 font-sans">
                      {config.gstin && <p className="font-semibold text-slate-700">GSTIN: <span className="font-mono">{config.gstin}</span></p>}
                      <p>{config.address}</p>
                      <p className="text-slate-400">{config.phone} • {config.email}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right space-y-1.5 shrink-0">
                    <span 
                      className="inline-block px-3.5 py-1 text-xs font-black uppercase tracking-widest rounded-lg"
                      style={{ backgroundColor: '#FAF3E0', color: activeAccentColor, border: '1px solid #E3D3AC' }}
                    >
                      {config.invoiceTitle}
                    </span>
                    <p className="text-sm font-black font-sans tabular-nums text-slate-900 mt-2">{invoiceNumber}</p>
                    <p className="text-[11px] text-slate-500 font-sans">Issue Date: {formattedToday}</p>
                  </div>
                </div>

                {/* 2. Client & Status Banner */}
                <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] flex flex-col sm:flex-row justify-between items-start gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[#8C7654] tracking-wider">BILLED TO (CLIENT)</p>
                    <h4 className="text-base font-black text-slate-900">{client.name}</h4>
                    <p className="text-slate-600 font-medium">{client.phone} • {client.email || 'client@studio.com'}</p>
                    <p className="text-slate-700 font-semibold pt-0.5">
                      ✨ {client.event_type} • Event Date: {eventDateFormatted}
                    </p>
                  </div>

                  <div className="text-left sm:text-right space-y-1 self-start sm:self-auto">
                    <p className="text-[10px] font-black uppercase text-[#8C7654] tracking-wider">PAYMENT STATUS</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border shadow-2xs ${
                      financeRecord.payment_status === 'paid'
                        ? 'bg-[#EAF7EE] text-[#1E7E45] border-[#BCE7CB]'
                        : financeRecord.payment_status === 'partially_paid'
                        ? 'bg-[#FDF4DC] text-[#8C6D28] border-[#E8D6A7]'
                        : 'bg-[#FFF1E3] text-[#C4611A] border-[#FCD2B3]'
                    }`}>
                      {financeRecord.payment_status === 'paid' ? '✓ Fully Paid' : financeRecord.payment_status === 'partially_paid' ? 'Partially Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* 3. HERO INVESTMENT REALIZATION HIGHLIGHT BOX (BIG AMOUNT DISPLAY) */}
                <div 
                  className="p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-5 font-sans shadow-xs"
                  style={{ backgroundColor: '#FAF7F2', borderColor: '#EDE4D5' }}
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#8C7654]">Total Net Project Investment</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      ₹{financeRecord.final_total_amount.toLocaleString('en-IN')}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">All Taxes & Services Included</p>
                  </div>

                  {/* Realized vs Pending Badges & Progress Bar */}
                  <div className="flex flex-col items-center sm:items-end space-y-2 min-w-[220px]">
                    <div className="flex items-center gap-4 text-xs font-black tabular-nums">
                      <span className="text-[#1E7E45] bg-[#EAF7EE] px-3 py-1 rounded-xl border border-[#BCE7CB]">
                        Paid: ₹{financeRecord.received_amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[#C4611A] bg-[#FFF1E3] px-3 py-1 rounded-xl border border-[#FCD2B3]">
                        Pending: ₹{financeRecord.pending_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#EFE8DC] rounded-full overflow-hidden border border-[#E5DAC8]">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, backgroundColor: activeAccentColor }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#8C7A60]">{progressPct}% Realized</span>
                  </div>
                </div>

                {/* 4. Itemized Pricing Table */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-[#634E23] flex items-center gap-1.5 font-sans">
                    <FileText className="w-3.5 h-3.5" style={{ color: activeAccentColor }} /> Package Pricing Breakdown
                  </h5>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-[#FAF7F2] border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="py-2.5 px-4 font-black">Description / Service Item</th>
                          <th className="py-2.5 px-4 text-right font-black">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            Base Wedding Coverage Package ({client.event_type})
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                            ₹{financeRecord.base_package_price.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        {financeRecord.discount_amount > 0 && (
                          <tr>
                            <td className="py-2 px-4 font-bold text-rose-600">
                              Discount / Special Promotional Benefit
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-rose-600 tabular-nums">
                              -₹{financeRecord.discount_amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}
                        {financeRecord.accommodation_charges > 0 && (
                          <tr>
                            <td className="py-2 px-4 text-slate-700 font-medium">Accommodation Charges</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-900 tabular-nums">
                              ₹{financeRecord.accommodation_charges.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}
                        {financeRecord.travel_charges > 0 && (
                          <tr>
                            <td className="py-2 px-4 text-slate-700 font-medium">Travel & Conveyance Charges</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-900 tabular-nums">
                              ₹{financeRecord.travel_charges.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}
                        {financeRecord.additional_charges > 0 && (
                          <tr>
                            <td className="py-2 px-4 text-slate-700 font-medium">Additional Shoots & Equipment Add-Ons</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-900 tabular-nums">
                              ₹{financeRecord.additional_charges.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )}

                        <tr className="border-t border-slate-200 font-black bg-[#FAF7F2]/50">
                          <td className="py-2.5 px-4 text-slate-800">SUBTOTAL (GROSS TOTAL)</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-slate-900 font-black">
                            ₹{financeRecord.subtotal_amount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        <tr className="text-slate-600 font-semibold">
                          <td className="py-2 px-4">GST ({financeRecord.gst_rate}%)</td>
                          <td className="py-2 px-4 text-right tabular-nums">
                            ₹{financeRecord.gst_amount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        <tr className="border-t-2 border-slate-900 font-black text-sm bg-[#FAF7F2]">
                          <td className="py-3 px-4 text-slate-900 font-black">NET GRAND TOTAL</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-900 text-base font-black">
                            ₹{financeRecord.final_total_amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. PAYMENT INSTALLMENTS & MILESTONES SCHEDULE TABLE */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-[#634E23] flex items-center gap-1.5 font-sans">
                    <Calendar className="w-3.5 h-3.5" style={{ color: activeAccentColor }} /> Milestone Payment Schedule & Terms
                  </h5>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-[#FAF7F2] border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="py-2.5 px-4 font-black">Step Name</th>
                          <th className="py-2.5 px-3 font-black">Due Date</th>
                          <th className="py-2.5 px-3 text-right font-black">Amount</th>
                          <th className="py-2.5 px-4 text-center font-black">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {milestones.map((m, idx) => (
                          <tr key={m.id || idx} className="hover:bg-[#FAF7F2]/50 transition">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {idx + 1}. {m.step_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                              {m.due_date ? new Date(m.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black tabular-nums text-slate-900 whitespace-nowrap">
                              ₹{Math.round(m.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 text-center whitespace-nowrap">
                              {m.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7EE] text-[#1E7E45] border border-[#BCE7CB]">
                                  <CheckCircle2 className="w-3 h-3" /> Paid ({m.payment_mode || 'UPI'})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FDF4DC] text-[#8C6D28] border border-[#E8D6A7]">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Direct Bank Details & Custom Uploaded QR Code */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-4 border-t border-slate-200 text-xs font-sans items-center">
                  <div className="sm:col-span-8 space-y-1.5">
                    <p className="font-black text-slate-800 uppercase tracking-wider text-[10px]">BANK PAYMENT DETAILS</p>
                    <p className="font-semibold text-slate-700">Bank: {config.bankName} • Acc: <span className="font-mono font-bold">{config.accountNo}</span></p>
                    <p className="text-slate-600">IFSC: <span className="font-mono font-bold">{config.ifsc}</span> • A/C Name: {config.accountHolder}</p>
                    <p className="font-bold" style={{ color: activeAccentColor }}>UPI ID: <span className="font-mono">{config.upiId}</span></p>
                  </div>

                  {/* QR Code Display (Uploaded Custom QR or Generated UPI QR) */}
                  {config.showUpiQr && displayQrCodeUrl && financeRecord.pending_amount > 0 && (
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] text-center space-y-1.5">
                      <img 
                        src={displayQrCodeUrl} 
                        alt="Payment QR Code" 
                        className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs" 
                      />
                      <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: activeAccentColor }}>
                        Scan to Pay via Any UPI App
                      </span>
                    </div>
                  )}
                </div>

                {/* 7. Terms & Footer Disclaimer */}
                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-2 font-sans">
                  {config.terms && (
                    <div>
                      <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px] mb-0.5">Terms & Conditions:</p>
                      <p className="whitespace-pre-line leading-relaxed">{config.terms}</p>
                    </div>
                  )}
                  <p className="italic text-slate-400 pt-1 text-center">{config.footerNote}</p>
                </div>
              </div>
            )}

            {/* ── TAB 2: INVOICE TEMPLATE CUSTOMIZER & QR UPLOAD ── */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="p-4 bg-[#F5EEDC] rounded-2xl border border-[#E3D3AC] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    <div>
                      <h4 className="text-xs font-black text-[#221B10]">Enterprise Invoice Template Customizer</h4>
                      <p className="text-[11px] text-[#7A6950]">Changes saved here will automatically apply to all client invoices.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#EBE3D5] p-6 shadow-xs space-y-5 text-xs">
                  {/* Brand & Identity */}
                  <div className="space-y-3">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Studio & Brand Information
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Company / Studio Name</label>
                        <input
                          type="text"
                          value={config.companyName}
                          onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 text-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tagline / Subtitle</label>
                        <input
                          type="text"
                          value={config.tagline}
                          onChange={(e) => setConfig(prev => ({ ...prev, tagline: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
                        <input
                          type="text"
                          value={config.gstin}
                          onChange={(e) => setConfig(prev => ({ ...prev, gstin: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={config.phone}
                          onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Email</label>
                        <input
                          type="email"
                          value={config.email}
                          onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Studio Address</label>
                      <input
                        type="text"
                        value={config.address}
                        onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  {/* QR Code Upload Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" /> UPI Payment QR Code (Custom Upload)
                    </h5>

                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] flex flex-col sm:flex-row items-center gap-4">
                      {config.qrCodeImageUrl ? (
                        <div className="relative w-20 h-20 bg-white rounded-xl border border-slate-200 p-1 shrink-0">
                          <img src={config.qrCodeImageUrl} alt="Uploaded QR" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, qrCodeImageUrl: '' }))}
                            className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700"
                            title="Remove QR Image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <QrCode className="w-8 h-8" />
                          <span className="text-[9px]">Auto QR</span>
                        </div>
                      )}

                      <div className="space-y-1.5 text-center sm:text-left flex-1">
                        <p className="font-bold text-slate-800">Upload Official Studio Payment QR Code</p>
                        <p className="text-[11px] text-slate-500">Upload your Google Pay, PhonePe, Paytm or Bank QR code image to print directly on invoices.</p>
                        
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <input
                            type="file"
                            ref={qrFileInputRef}
                            accept="image/*"
                            onChange={handleQrFileUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-bold text-[#4E3B15] bg-[#F7EFCF] hover:bg-[#F2E5B8] border border-[#DFCFA0] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#8C6D28]" />
                            {config.qrCodeImageUrl ? 'Change QR Image' : 'Upload QR Image'}
                          </button>

                          {config.qrCodeImageUrl && (
                            <span className="text-[11px] text-[#1E7E45] font-bold">✓ Custom QR Code Loaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank & Payment Credentials */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" /> Bank Transfer & UPI Credentials
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={config.bankName}
                          onChange={(e) => setConfig(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={config.accountHolder}
                          onChange={(e) => setConfig(prev => ({ ...prev, accountHolder: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Account Number</label>
                        <input
                          type="text"
                          value={config.accountNo}
                          onChange={(e) => setConfig(prev => ({ ...prev, accountNo: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={config.ifsc}
                          onChange={(e) => setConfig(prev => ({ ...prev, ifsc: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">UPI ID (e.g. name@bank)</label>
                        <input
                          type="text"
                          value={config.upiId}
                          onChange={(e) => setConfig(prev => ({ ...prev, upiId: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono font-bold"
                        />
                      </div>

                      <div className="pt-4">
                        <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.showUpiQr}
                            onChange={(e) => setConfig(prev => ({ ...prev, showUpiQr: e.target.checked }))}
                            className="w-4 h-4 text-[#D4AF37] rounded focus:ring-0"
                          />
                          <span>Show QR Code on Invoices</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Typography & Quotation Theme Match */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Quotation Color Palette & Typography Match
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Quotation Color Palette</label>
                        <select
                          value={config.themePreset || 'auto'}
                          onChange={(e) => setConfig(prev => ({ ...prev, themePreset: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none font-bold text-slate-800 cursor-pointer text-xs"
                        >
                          <option value="auto">⚡ Auto-Sync Default Quotation</option>
                          <option value="cyprus-sand-dune">Cyprus & Sand Dune (#004643)</option>
                          <option value="sand-dune-cyprus">Sand Dune & Cyprus (#F0EDE5)</option>
                          <option value="cherry-red-cream">Cherry Red & Cream (#750505)</option>
                          <option value="cream-cherry-red">Cream & Cherry Red (#FBFCEB)</option>
                          <option value="plum-milk">Plum & Milk (#381932)</option>
                          <option value="milk-plum">Milk & Plum (#FFF3E6)</option>
                          <option value="sand-chocolate">Sand & Chocolate (#3E000C)</option>
                          <option value="chocolate-sand">Chocolate & Sand (#FFECD1)</option>
                          <option value="feldgrau-wheat">Feldgrau & Wheat (#3A4B41)</option>
                          <option value="wheat-feldgrau">Wheat & Feldgrau (#E6CFA7)</option>
                          <option value="noctis-marigold">Noctis & Marigold (#1F2235)</option>
                          <option value="marigold-noctis">Marigold & Noctis (#E3A419)</option>
                          <option value="champagne-obsidian">Champagne & Obsidian (#111111)</option>
                          <option value="royal-gold">Royal Gold & Sand (#D4AF37)</option>
                          <option value="minimal-charcoal">Minimal Charcoal (#262626)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Invoice Font Family</label>
                        <select
                          value={config.fontFamily}
                          onChange={(e) => setConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none font-bold text-slate-800 cursor-pointer text-xs"
                        >
                          <option value="auto">⚡ Auto-Sync Default Font</option>
                          <option value="Cormorant Garamond">Cormorant Garamond (Quotation Luxury Serif)</option>
                          <option value="Cinzel">Cinzel (Royal Classical)</option>
                          <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                          <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                          <option value="Montserrat">Montserrat (Geometric Sans)</option>
                          <option value="Inter">Inter (SaaS Minimal)</option>
                          <option value="Outfit">Outfit (Contemporary Clean)</option>
                          <option value="Prata">Prata (Romantic Editorial)</option>
                          <option value="Bodoni Moda">Bodoni Moda (High Fashion)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Invoice ID Prefix</label>
                        <input
                          type="text"
                          value={config.prefix}
                          onChange={(e) => setConfig(prev => ({ ...prev, prefix: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms & Footer Note */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Terms & Conditions</label>
                      <textarea
                        rows={3}
                        value={config.terms}
                        onChange={(e) => setConfig(prev => ({ ...prev, terms: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Footer Note / Disclaimer</label>
                      <input
                        type="text"
                        value={config.footerNote}
                        onChange={(e) => setConfig(prev => ({ ...prev, footerNote: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    {saveSuccess && (
                      <span className="text-xs font-bold text-[#1E7E45] flex items-center gap-1">
                        <Check className="w-4 h-4" /> Template Saved Successfully!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplateSettings}
                      disabled={savingSettings}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#D4AF37] to-[#B38728] hover:brightness-105 active:scale-95 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Save Template
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

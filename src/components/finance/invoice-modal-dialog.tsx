'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Receipt, Download, Printer, X, Settings2, Check, Sparkles, Building2, 
  CreditCard, QrCode, FileText, RefreshCw, Eye, ShieldCheck, Phone, Mail, MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportInvoiceToPDF } from '@/lib/invoice-pdf-export';
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
  terms: string;
  footerNote: string;
  logoUrl: string;
  fontFamily: string;
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
  terms: '1. Advance payment is non-refundable upon client cancellation.\n2. Final deliverables delivered post clearance of balance.\n3. Raw footage retained for 60 days post event.',
  footerNote: 'Thank you for choosing Filmify Weddings! This is a computer-generated invoice.',
  logoUrl: '',
  fontFamily: 'Cormorant Garamond',
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

  // 1. Load settings & sync with default quotation template
  useEffect(() => {
    if (!isOpen) return;

    // Load from local storage
    const savedConfigStr = localStorage.getItem('studio_invoice_template_config');
    let loadedConfig = DEFAULT_INVOICE_CONFIG;
    if (savedConfigStr) {
      try {
        const parsed = JSON.parse(savedConfigStr);
        if (parsed && typeof parsed === 'object') {
          loadedConfig = { ...DEFAULT_INVOICE_CONFIG, ...parsed };
        }
      } catch (_) {}
    }

    // Sync with default quotation template if available
    if (defaultQuotationTemplate) {
      const qFont = defaultQuotationTemplate.primaryFont || defaultQuotationTemplate.cover?.primaryFont;
      const qLogo = defaultQuotationTemplate.cover?.brandLogoUrl;
      const qBrand = defaultQuotationTemplate.cover?.brandName;

      if (!savedConfigStr) {
        if (qFont) loadedConfig.fontFamily = qFont;
        if (qLogo) loadedConfig.logoUrl = qLogo;
        if (qBrand) loadedConfig.companyName = qBrand;
      }
    }

    // Try fetching from Supabase /api/settings
    fetchSettingsFromAPI().then(apiSettings => {
      if (apiSettings) {
        setConfig(prev => ({ ...prev, ...apiSettings }));
      } else {
        setConfig(loadedConfig);
      }
    });
  }, [isOpen, defaultQuotationTemplate]);

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
      // Save locally
      localStorage.setItem('studio_invoice_template_config', JSON.stringify(config));

      // Save to Supabase API
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

  const handleDownloadPdf = async () => {
    if (!financeRecord || !client) return;
    setExportingPdf(true);
    setExportProgress('Preparing PDF document...');
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
      alert('Could not export PDF automatically. You can also use the "Print / Save PDF" button.');
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

  // Dynamic UPI payment URL for QR code
  const upiPayUrl = config.upiId && financeRecord.pending_amount > 0
    ? `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.companyName)}&am=${financeRecord.pending_amount}&cu=INR&tn=Invoice_${invoiceNumber}`
    : '';

  const upiQrImageUrl = upiPayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiPayUrl)}`
    : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-[#FFFDF9] rounded-3xl max-w-3xl w-full border border-[#EBE3D5] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* ── TOP CONTROL BAR ── */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6ED] to-[#FFFDF9] border-b border-[#EFE8DA] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E2B857] via-[#D4AF37] to-[#B38728] flex items-center justify-center text-white shadow-sm">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#1E170E] tracking-tight">Invoice & Payment Receipt</h3>
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
                  Preview
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
                title="Download High-Resolution PDF on this device"
              >
                <Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
                <span>{exportingPdf ? (exportProgress || 'Exporting...') : 'Download PDF'}</span>
              </button>

              {/* Print / Save Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-[#503E1A] bg-[#FAF3E0] hover:bg-[#F5EBD0] border border-[#E3D3AC] active:scale-95 rounded-xl shadow-2xs transition items-center gap-1.5 cursor-pointer"
                title="Print Document or Save as PDF"
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
          <div className="overflow-y-auto p-4 sm:p-8 flex-1">

            {/* ── TAB 1: INVOICE PREVIEW & PRINTABLE DOCUMENT ── */}
            {activeTab === 'preview' && (
              <div 
                id="invoice-printable-document" 
                className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 space-y-7 shadow-xs text-slate-900 max-w-2xl mx-auto"
                style={{ fontFamily: config.fontFamily ? `${config.fontFamily}, sans-serif` : 'inherit' }}
              >
                {/* 1. Header & Brand Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-200">
                  <div className="space-y-1.5">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt={config.companyName} className="h-10 w-auto object-contain mb-2" />
                    )}
                    <h2 
                      className="text-2xl sm:text-3xl font-black tracking-tight"
                      style={{ color: '#1E170E' }}
                    >
                      {config.companyName}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">{config.tagline}</p>
                    <div className="text-[11px] text-slate-500 font-normal space-y-0.5 pt-1">
                      {config.gstin && <p className="font-semibold text-slate-700">GSTIN: <span className="font-mono">{config.gstin}</span></p>}
                      <p>{config.address}</p>
                      <p className="text-slate-400">{config.phone} • {config.email}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right space-y-1.5">
                    <span 
                      className="inline-block px-3.5 py-1 text-xs font-black uppercase tracking-widest rounded-lg"
                      style={{ backgroundColor: '#FAF3E0', color: '#8C6D28', border: '1px solid #E3D3AC' }}
                    >
                      {config.invoiceTitle}
                    </span>
                    <p className="text-sm font-black font-sans tabular-nums text-slate-900 mt-2">{invoiceNumber}</p>
                    <p className="text-[11px] text-slate-500 font-sans">Date: {formattedToday}</p>
                  </div>
                </div>

                {/* 2. Billed To & Status Box */}
                <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] flex flex-col sm:flex-row justify-between items-start gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[#8C7654] tracking-wider">BILLED TO (CLIENT)</p>
                    <h4 className="text-base font-black text-slate-900">{client.name}</h4>
                    <p className="text-slate-600 font-medium font-sans">{client.phone} • {client.email || 'client@studio.com'}</p>
                    <p className="text-slate-600 font-semibold pt-0.5">
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

                {/* 3. Itemized Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="pb-3 font-black">Description / Service Item</th>
                        <th className="pb-3 text-right font-black">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">
                          Base Wedding Coverage Package ({client.event_type})
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                          ₹{financeRecord.base_package_price.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      {financeRecord.discount_amount > 0 && (
                        <tr>
                          <td className="py-2.5 font-bold text-rose-600">
                            Discount / Special Promotional Benefit
                          </td>
                          <td className="py-2.5 text-right font-bold text-rose-600 tabular-nums">
                            -₹{financeRecord.discount_amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                      {financeRecord.accommodation_charges > 0 && (
                        <tr>
                          <td className="py-2.5 text-slate-700 font-medium">Accommodation Charges</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                            ₹{financeRecord.accommodation_charges.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                      {financeRecord.travel_charges > 0 && (
                        <tr>
                          <td className="py-2.5 text-slate-700 font-medium">Travel & Conveyance Charges</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                            ₹{financeRecord.travel_charges.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}
                      {financeRecord.additional_charges > 0 && (
                        <tr>
                          <td className="py-2.5 text-slate-700 font-medium">Additional Shoots & Equipment Add-Ons</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                            ₹{financeRecord.additional_charges.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}

                      {/* Subtotal */}
                      <tr className="border-t border-slate-200 font-black">
                        <td className="py-2.5 text-slate-800">SUBTOTAL (GROSS TOTAL)</td>
                        <td className="py-2.5 text-right tabular-nums text-slate-900">
                          ₹{financeRecord.subtotal_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* GST */}
                      <tr className="text-slate-600 font-semibold">
                        <td className="py-2">GST ({financeRecord.gst_rate}%)</td>
                        <td className="py-2 text-right tabular-nums">
                          ₹{financeRecord.gst_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Grand Total */}
                      <tr className="border-t-2 border-slate-900 font-black text-sm">
                        <td className="py-3.5 text-slate-900">NET GRAND TOTAL</td>
                        <td className="py-3.5 text-right tabular-nums text-slate-900 text-base">
                          ₹{financeRecord.final_total_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Payment Realization Box (Received vs Pending) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-gradient-to-r from-[#FAF7F2] to-[#FFFDF9] rounded-2xl border border-[#EDE4D5] text-xs font-sans">
                  <div>
                    <span className="font-bold text-[#1E7E45] uppercase tracking-wider text-[10px] block">TOTAL AMOUNT RECEIVED</span>
                    <span className="text-xl font-black tabular-nums text-[#1E7E45] mt-0.5 block">
                      ₹{financeRecord.received_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="sm:text-right">
                    <span className="font-bold text-[#C4611A] uppercase tracking-wider text-[10px] block">BALANCE PENDING RECEIVABLE</span>
                    <span className="text-xl font-black tabular-nums text-[#C4611A] mt-0.5 block">
                      ₹{financeRecord.pending_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 5. Direct Bank Details & Dynamic UPI QR Code */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-4 border-t border-slate-200 text-xs font-sans items-center">
                  <div className="sm:col-span-8 space-y-1.5">
                    <p className="font-black text-slate-800 uppercase tracking-wider text-[10px]">BANK PAYMENT DETAILS</p>
                    <p className="font-semibold text-slate-700">Bank: {config.bankName} • Acc: <span className="font-mono">{config.accountNo}</span></p>
                    <p className="text-slate-600">IFSC: <span className="font-mono font-bold">{config.ifsc}</span> • A/C Name: {config.accountHolder}</p>
                    <p className="text-[#8C6D28] font-bold">UPI ID: <span className="font-mono">{config.upiId}</span></p>
                  </div>

                  {/* UPI QR Code */}
                  {config.showUpiQr && upiQrImageUrl && financeRecord.pending_amount > 0 && (
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-[#FAF7F2] rounded-2xl border border-[#EDE4D5] text-center space-y-1.5">
                      <img src={upiQrImageUrl} alt="UPI Payment QR Code" className="w-24 h-24 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs" />
                      <span className="text-[9px] font-extrabold uppercase text-[#8C6D28] tracking-wider">Scan to Pay via UPI</span>
                    </div>
                  )}
                </div>

                {/* 6. Terms & Footer */}
                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
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

            {/* ── TAB 2: INVOICE TEMPLATE CUSTOMIZER ── */}
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

                  {/* Bank & Payment Information */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" /> Bank Transfer & UPI Settings
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={config.bankName}
                          onChange={(e) => setConfig(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={config.accountHolder}
                          onChange={(e) => setConfig(prev => ({ ...prev, accountHolder: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900"
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
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={config.ifsc}
                          onChange={(e) => setConfig(prev => ({ ...prev, ifsc: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono"
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
                          <span>Show Dynamic UPI QR Code on Invoices</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Typography & Styling */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Typography & Quotation Theme Match
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Font Family</label>
                        <select
                          value={config.fontFamily}
                          onChange={(e) => setConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="Cormorant Garamond">Cormorant Garamond (Luxury Serif)</option>
                          <option value="Cinzel">Cinzel (Royal Classical)</option>
                          <option value="Playfair Display">Playfair Display (Editorial)</option>
                          <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                          <option value="Inter">Inter (SaaS Minimal)</option>
                          <option value="Montserrat">Montserrat (Geometric Sans)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Invoice ID Prefix</label>
                        <input
                          type="text"
                          value={config.prefix}
                          onChange={(e) => setConfig(prev => ({ ...prev, prefix: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#EDE4D5] rounded-xl focus:outline-none text-slate-900 font-mono font-bold"
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

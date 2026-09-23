'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, FileText, CheckCircle2, Building2, User, Loader2 } from 'lucide-react';

export interface VendorInvoiceItem {
  order_id?: string;
  client_name: string;
  album_type: string;
  sheet_count: number;
  page_count?: number;
  rate_per_sheet?: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  order_status: string;
  payment_status: string;
  due_date?: string;
}

export interface VendorStatementInvoicePdfTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  statementNumber?: string;
  statementDate?: string;
  vendor: {
    id?: string;
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    bank_name?: string;
    account_no?: string;
    ifsc?: string;
    upi_id?: string;
  };
  studioName?: string;
  studioPhone?: string;
  studioEmail?: string;
  studioAddress?: string;
  items: VendorInvoiceItem[];
  notes?: string;
}

export default function VendorStatementInvoicePdfTemplate({
  isOpen,
  onClose,
  statementNumber,
  statementDate,
  vendor,
  studioName = 'StudioCore Wedding Films & Photography',
  studioPhone = '+91 98765 43210',
  studioEmail = 'accounts@filmifyweddings.com',
  studioAddress = 'StudioCore Hub, Creative District, Mumbai',
  items,
  notes = 'Thank you for your creative partnership and excellence in album craftsmanship.'
}: VendorStatementInvoicePdfTemplateProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const invoiceNo = statementNumber || `INV-${Date.now().toString().slice(-6)}`;
  const displayDate = statementDate || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const totalSheets = items.reduce((sum, i) => sum + (Number(i.sheet_count) || 0), 0);
  const subtotal = items.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const totalPaid = items.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const balanceDue = Math.max(0, subtotal - totalPaid);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Vendor_Invoice_${vendor.name.replace(/\s+/g, '_')}_${invoiceNo}.pdf`);
    } catch (err) {
      console.error('[Vendor Invoice PDF] Download error:', err);
      // Fallback to browser print if canvas fails
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#FAF8F5] rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden z-10"
        >
          {/* Top Floating Control Bar */}
          <div className="px-6 py-3.5 bg-gradient-to-r from-[#2A241F] via-[#3D342C] to-[#2A241F] text-amber-50 flex items-center justify-between border-b border-amber-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-white">
                  Vendor Tax Statement &amp; Invoice
                </h3>
                <p className="text-[10px] text-amber-200/70 font-medium">
                  {invoiceNo} • {vendor.name} ({items.length} {items.length === 1 ? 'Job' : 'Jobs'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition ml-1"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Printable Document Area */}
          <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-[#FAF8F5]">
            <div
              ref={printRef}
              className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-stone-200/90 text-stone-900 max-w-[780px] mx-auto space-y-6 print:m-0 print:p-0 print:shadow-none print:border-none"
            >
              {/* Header: Studio Brand & Invoice Meta */}
              <div className="flex items-start justify-between border-b-2 border-amber-900/10 pb-6 flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 block">
                    Vendor Commercial Statement
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                    {studioName}
                  </h1>
                  <p className="text-xs text-stone-500 font-medium mt-1">
                    {studioAddress}
                  </p>
                  <p className="text-xs text-stone-500 font-medium">
                    Phone: {studioPhone} • Email: {studioEmail}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-black text-amber-950 font-mono">
                    {invoiceNo}
                  </div>
                  <p className="text-[11px] text-stone-500 font-bold mt-1.5">
                    Date: <span className="text-stone-900 font-mono">{displayDate}</span>
                  </p>
                  <p className="text-[11px] text-stone-500 font-bold">
                    Terms: <span className="text-stone-900">Per Delivery Agreement</span>
                  </p>
                </div>
              </div>

              {/* Vendor & Billed Details Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-amber-200/60">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">
                    Vendor / Partner Details
                  </span>
                  <h3 className="text-sm font-black text-stone-900 mt-0.5">
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-stone-600 font-medium">
                    Specialization: <span className="font-bold text-amber-950">{vendor.role || 'Album Designer & Print Partner'}</span>
                  </p>
                  {vendor.phone && <p className="text-xs text-stone-500">Phone: {vendor.phone}</p>}
                  {vendor.email && <p className="text-xs text-stone-500">Email: {vendor.email}</p>}
                </div>

                <div className="sm:text-right">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">
                    Statement Summary
                  </span>
                  <p className="text-xs text-stone-700 font-semibold mt-0.5">
                    Total Album Jobs: <span className="font-bold text-stone-900 font-mono">{items.length}</span>
                  </p>
                  <p className="text-xs text-stone-700 font-semibold">
                    Total Craft Sheets: <span className="font-bold text-stone-900 font-mono">{totalSheets} Sheets</span>
                  </p>
                  <p className="text-xs text-stone-700 font-semibold">
                    Payment Status:{' '}
                    <span className={`font-bold font-mono ${balanceDue === 0 ? 'text-emerald-700' : totalPaid > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {balanceDue === 0 ? 'SETTLED IN FULL' : totalPaid > 0 ? 'PARTIALLY SETTLED' : 'PAYMENT PENDING'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-stone-200 text-[10px] font-black uppercase tracking-wider text-stone-500">
                      <th className="py-2.5 px-2">#</th>
                      <th className="py-2.5 px-3">Client Couple</th>
                      <th className="py-2.5 px-3">Album Title &amp; Specs</th>
                      <th className="py-2.5 px-2 text-center">Sheets</th>
                      <th className="py-2.5 px-2 text-right">Agreed Fee</th>
                      <th className="py-2.5 px-2 text-right">Paid</th>
                      <th className="py-2.5 px-2 text-right">Balance</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30 transition">
                        <td className="py-2.5 px-2 font-mono text-stone-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-stone-900">{item.client_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-stone-800 block">{item.album_type}</span>
                          {item.due_date && (
                            <span className="text-[10px] text-stone-400 block font-medium">Due: {item.due_date}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-stone-700">
                          {item.sheet_count}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-stone-900">
                          ₹{Number(item.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-700">
                          ₹{Number(item.paid_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-black text-rose-700">
                          ₹{Number(item.balance_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            item.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.paid_amount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {item.order_status || item.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Net Payable Block */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-2 border-t-2 border-amber-900/10 pt-3">
                  <div className="flex justify-between text-xs text-stone-600 font-medium">
                    <span>Subtotal ({items.length} Albums):</span>
                    <span className="font-mono font-bold text-stone-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>Amount Cleared / Paid:</span>
                    <span className="font-mono font-bold">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-stone-900 border-t border-stone-200 pt-2 bg-amber-50/80 p-2 rounded-lg">
                    <span className="text-amber-950">Net Balance Due:</span>
                    <span className="font-mono text-rose-700 font-black">₹{balanceDue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Bank Details & Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
                <div className="text-xs text-stone-600 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Remittance &amp; Banking Info
                  </span>
                  <p className="font-medium">
                    Beneficiary: <span className="font-bold text-stone-900">{vendor.name}</span>
                  </p>
                  {vendor.bank_name && <p>Bank: {vendor.bank_name}</p>}
                  {vendor.account_no && <p className="font-mono">A/C: {vendor.account_no}</p>}
                  {vendor.ifsc && <p className="font-mono">IFSC: {vendor.ifsc}</p>}
                  {vendor.upi_id && <p className="font-mono font-bold text-amber-950">UPI ID: {vendor.upi_id}</p>}
                  <p className="text-[10px] text-stone-400 italic pt-1">{notes}</p>
                </div>

                <div className="flex flex-col justify-end items-end text-right pt-6 sm:pt-0">
                  <div className="w-40 border-b border-stone-400 mb-1"></div>
                  <span className="text-[10px] font-black uppercase text-stone-800 tracking-wider">
                    Authorized Studio Signatory
                  </span>
                  <span className="text-[9px] text-stone-400 font-medium">
                    {studioName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

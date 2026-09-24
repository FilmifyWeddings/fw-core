'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, FileText, CheckCircle2, Building2, User, Loader2 } from 'lucide-react';
import { detectDeliverableSegment, detectDeliverableCategory } from '@/lib/services/vendorDeliverablesService';

function getInvoiceCategoryDisplay(item: VendorInvoiceItem, defaultCat?: string): { label: string; badgeClass: string } {
  const detected = detectDeliverableCategory(item.category || defaultCat, item.item_title || item.album_type, item.role);
  if (detected === 'video_editing') {
    return { label: 'Video Editing', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' };
  }
  if (detected === 'photo_editing') {
    return { label: 'Photo Editing', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' };
  }
  if (detected === 'album_printing') {
    return { label: 'Album Printing', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }
  if (detected === 'shoot') {
    return { label: 'Shoot', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
  return { label: 'Album Designing', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
}

export interface VendorInvoiceItem {
  order_id?: string;
  client_name: string;
  segment?: string;
  album_type: string;
  item_title?: string;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  role?: string;
  category?: string;
  specs?: string;
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
  specialization?: string;
  category?: string;
  items: VendorInvoiceItem[];
  notes?: string;
}

const formatStatementDate = (rawDate?: string): string => {
  if (!rawDate) return '';
  try {
    const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d} ${monthName} ${y}`;
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return rawDate;
  } catch (_) {
    return rawDate;
  }
};

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
  specialization,
  category,
  items,
  notes = 'Thank you for your creative partnership and excellence in craftsmanship.'
}: VendorStatementInvoicePdfTemplateProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Group items by Client/Couple, and inside each Couple by Segment
  const groupedByClient = useMemo(() => {
    const map = new Map<string, VendorInvoiceItem[]>();
    items.forEach(item => {
      const c = item.client_name || 'Client Project';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(item);
    });

    return Array.from(map.entries()).map(([clientName, clientItems]) => {
      const cAgreed = clientItems.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
      const cPaid = clientItems.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
      const cBal = Math.max(0, cAgreed - cPaid);

      // Group inside each couple by detected Segment
      const segmentMap = new Map<string, VendorInvoiceItem[]>();
      clientItems.forEach(item => {
        const s = detectDeliverableSegment(item.segment, item.item_title || item.album_type, item.event_name);
        if (!segmentMap.has(s)) segmentMap.set(s, []);
        segmentMap.get(s)!.push(item);
      });

      const segments = Array.from(segmentMap.entries()).map(([segmentName, segItems]) => {
        const segAgreed = segItems.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
        const segPaid = segItems.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
        const segBal = Math.max(0, segAgreed - segPaid);
        return {
          segmentName,
          items: segItems,
          segAgreed,
          segPaid,
          segBal,
        };
      });

      return {
        clientName,
        clientItems,
        segments,
        cAgreed,
        cPaid,
        cBal
      };
    });
  }, [items]);

  if (!isOpen) return null;

  const specializationDisplay = specialization || (
    category === 'video_editing' ? 'Video Editing' :
    category === 'photo_editing' ? 'Photo Editing' :
    category === 'album_design' ? 'Album Designing' :
    category === 'album_printing' ? 'Album Printing' :
    items.length > 0 && items.every(i => i.category === 'shoot') ? (vendor.role || 'Shoot Specialist') :
    items.some(i => i.category === 'video_editing') ? 'Video Editing' :
    (vendor.role || 'Creative Partner')
  );

  // Real studio name fallback if "My Studio" or empty
  const cleanStudioName = (!studioName || studioName.trim() === '' || studioName.trim() === 'My Studio' || studioName.trim() === 'StudioCore Partner Studio')
    ? 'Filmify Weddings Studio'
    : studioName.trim();

  const isAllShoots = items.length > 0 && items.every(i => i.category === 'shoot');
  const isAlbumCategory = items.some(i => i.category === 'album_design' || i.category === 'album_printing');
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
        scale: 3, // Ultra-sharp HD 3x DPI
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 1000
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
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
                  {invoiceNo} • {vendor.name} ({items.length} {isAllShoots ? (items.length === 1 ? 'Shoot' : 'Shoots') : (items.length === 1 ? 'Job' : 'Jobs')})
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
              className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-stone-200/90 text-stone-900 max-w-[780px] mx-auto space-y-6 print:m-0 print:p-0 print:shadow-none print:border-none font-sans"
            >
              {/* Header: Studio Brand & Invoice Meta */}
              <div className="flex items-start justify-between border-b-2 border-amber-900/10 pb-6 flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 block">
                    Vendor Commercial Statement
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                    {cleanStudioName}
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
                    Specialization: <span className="font-bold text-amber-950">{specializationDisplay}</span>
                  </p>
                  {vendor.phone && <p className="text-xs text-stone-500">Phone: {vendor.phone}</p>}
                  {vendor.email && <p className="text-xs text-stone-500">Email: {vendor.email}</p>}
                </div>

                <div className="sm:text-right">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">
                    Statement Summary
                  </span>
                  <p className="text-xs text-stone-700 font-semibold mt-0.5">
                    Total Assigned Tasks:{' '}
                    <span className="font-bold text-stone-900 font-mono">
                      {items.length} {isAllShoots ? (items.length === 1 ? 'Shoot' : 'Shoots') : (items.length === 1 ? 'Job' : 'Jobs')}
                    </span>
                  </p>
                  {/* Total Output Specs ONLY shown for Album orders */}
                  {isAlbumCategory && totalSheets > 0 && (
                    <p className="text-xs text-stone-700 font-semibold">
                      Total Output Specs: <span className="font-bold text-stone-900 font-mono">{totalSheets} Sheets / Units</span>
                    </p>
                  )}
                  <p className="text-xs text-stone-700 font-semibold">
                    Payment Status:{' '}
                    <span className={`font-bold font-mono ${subtotal === 0 && totalPaid === 0 ? 'text-stone-600' : balanceDue === 0 ? 'text-emerald-700' : totalPaid > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {subtotal === 0 && totalPaid === 0 ? 'UNSETTLED' : balanceDue === 0 ? 'FULL PAID' : totalPaid > 0 ? 'PARTIALLY SETTLED' : 'PAYMENT PENDING'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Itemized Deliverables Table Grouped Client-Wise */}
              <div className="overflow-x-auto space-y-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-stone-300 text-[10px] font-black uppercase tracking-wider text-stone-500 bg-stone-50/50">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-3">Deliverable / Task &amp; Specs</th>
                      <th className="py-2 px-2 text-center">Category</th>
                      <th className="py-2 px-2 text-right">Agreed Fee</th>
                      <th className="py-2 px-2 text-right">Paid</th>
                      <th className="py-2 px-2 text-right">Balance</th>
                      {!isAllShoots && <th className="py-2 px-2 text-center">Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByClient.map((group, gIdx) => (
                      <React.Fragment key={group.clientName || gIdx}>
                        {/* Client Group Header Banner */}
                        <tr className="bg-amber-100/60 border-t-2 border-b border-amber-200">
                          <td colSpan={isAllShoots ? 6 : 7} className="py-2 px-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                                <span className="text-xs font-black text-amber-950 uppercase tracking-tight">
                                  {group.clientName}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white text-stone-700 border border-amber-300 shadow-2xs font-mono">
                                  {group.clientItems.length} {group.clientItems.length === 1 ? 'Deliverable' : 'Deliverables'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-amber-950">
                                <span>Fee: ₹{group.cAgreed.toLocaleString('en-IN')}</span>
                                <span className="text-amber-400">•</span>
                                <span className="text-emerald-800">Paid: ₹{group.cPaid.toLocaleString('en-IN')}</span>
                                <span className="text-amber-400">•</span>
                                <span className={group.cBal > 0 ? 'text-rose-800 font-black' : 'text-emerald-800 font-black'}>
                                  Bal: ₹{group.cBal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Deliverables Grouped Segment-Wise */}
                        {isAllShoots ? (
                          group.clientItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/30 transition border-b border-stone-100">
                              <td className="py-2.5 px-2 font-mono text-stone-400 font-bold text-center">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-stone-900 block">
                                  {item.event_name || item.album_type}
                                </span>
                                <span className="text-[10px] text-stone-500 block font-mono font-medium">
                                  {item.event_date ? formatStatementDate(item.event_date) : item.due_date ? `Due: ${formatStatementDate(item.due_date)}` : ''}
                                  {item.event_time ? ` • ${item.event_time}` : ''}
                                  {item.role ? ` • ${item.role}` : ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-stone-100 text-stone-700 border border-stone-200 font-mono">
                                  Shoot
                                </span>
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
                            </tr>
                          ))
                        ) : (
                          group.segments.map((seg, sIdx) => (
                            <React.Fragment key={`${group.clientName}_${seg.segmentName}_${sIdx}`}>
                              {/* Segment Subheading */}
                              <tr className="bg-[#FAF6F0] border-b border-amber-200/80">
                                <td colSpan={7} className="py-1.5 px-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-black text-amber-950 uppercase tracking-wide">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-700 font-bold">❖</span>
                                      <span>Segment: {seg.segmentName}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-white border border-amber-200 text-stone-600 font-mono">
                                        {seg.items.length} {seg.items.length === 1 ? 'Deliverable' : 'Deliverables'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[10px] font-mono text-stone-600">
                                      <span>Subtotal: ₹{seg.segAgreed.toLocaleString('en-IN')}</span>
                                      {seg.segPaid > 0 && <span className="text-emerald-700">• Paid: ₹{seg.segPaid.toLocaleString('en-IN')}</span>}
                                      {seg.segBal > 0 && <span className="text-rose-700 font-bold">• Bal: ₹{seg.segBal.toLocaleString('en-IN')}</span>}
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {seg.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-amber-50/30 transition border-b border-stone-100">
                                  <td className="py-2.5 px-2 font-mono text-stone-400 font-bold text-center">{idx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-bold text-stone-900 block">
                                      {item.item_title || item.album_type || item.event_name}
                                    </span>
                                    <span className="text-[10px] text-stone-500 block font-medium">
                                      {item.specs ? item.specs : (item.category === 'album_design' || item.category === 'album_printing') && item.sheet_count > 1 ? `${item.sheet_count} Sheets` : ''}
                                      {item.due_date ? ` • Due: ${formatStatementDate(item.due_date)}` : ''}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    {(() => {
                                      const catInfo = getInvoiceCategoryDisplay(item, category);
                                      return (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border font-mono ${catInfo.badgeClass}`}>
                                          {catInfo.label}
                                        </span>
                                      );
                                    })()}
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
                                      {item.order_status || item.payment_status || 'None'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Net Payable Block */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-2 border-t-2 border-amber-900/10 pt-3">
                  <div className="flex justify-between text-xs text-stone-600 font-medium">
                    <span>Subtotal ({items.length} {isAllShoots ? (items.length === 1 ? 'Shoot' : 'Shoots') : 'Tasks'}):</span>
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

              {/* Signatures & Verification */}
              <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                <div className="text-xs text-stone-500 italic max-w-sm">
                  {notes}
                </div>

                <div className="flex flex-col justify-end items-end text-right">
                  <div className="w-44 border-b border-stone-400 mb-1"></div>
                  <span className="text-[10px] font-black uppercase text-stone-800 tracking-wider">
                    Authorized Studio Signatory
                  </span>
                  <span className="text-[9px] text-stone-500 font-bold">
                    {cleanStudioName}
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

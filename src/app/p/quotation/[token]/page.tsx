'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Download, Check, AlertTriangle, X, ShieldCheck, DollarSign, RefreshCw, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';
import { paginateDeliverablesPageItems, paginateSpecialValueAdditionsPageItems } from '@/lib/deliverables-paginator';
import { paginateFunctionsPageItems } from '@/lib/functions-paginator';

// Color Themes Registry
const COLOR_THEMES: Record<string, any> = {
  'cherry-red-cream': { primary: '#750505', background: '#FBFCEB', text: '#750505', kicker: '#750505', borderColor: 'rgba(117, 5, 5, 0.2)', boxBgColor: 'rgba(117, 5, 5, 0.06)' },
  'cream-cherry-red': { primary: '#FBFCEB', background: '#750505', text: '#FBFCEB', kicker: '#FFECD1', borderColor: 'rgba(251, 252, 235, 0.25)', boxBgColor: 'rgba(251, 252, 235, 0.08)' },
  'cyprus-sand-dune': { primary: '#004643', background: '#F0EDE5', text: '#004643', kicker: '#004643', borderColor: 'rgba(0, 70, 67, 0.2)', boxBgColor: 'rgba(0, 70, 67, 0.06)' },
  'sand-dune-cyprus': { primary: '#F0EDE5', background: '#004643', text: '#F0EDE5', kicker: '#E6CFA7', borderColor: 'rgba(240, 237, 229, 0.25)', boxBgColor: 'rgba(240, 237, 229, 0.08)' },
  'plum-milk': { primary: '#381932', background: '#FFF3E6', text: '#381932', kicker: '#381932', borderColor: 'rgba(56, 25, 50, 0.2)', boxBgColor: 'rgba(56, 25, 50, 0.06)' },
  'milk-plum': { primary: '#FFF3E6', background: '#381932', text: '#FFF3E6', kicker: '#FFECD1', borderColor: 'rgba(255, 243, 230, 0.25)', boxBgColor: 'rgba(255, 243, 230, 0.08)' },
  'sand-chocolate': { primary: '#3E000C', background: '#FFECD1', text: '#3E000C', kicker: '#3E000C', borderColor: 'rgba(62, 0, 12, 0.2)', boxBgColor: 'rgba(62, 0, 12, 0.06)' },
  'chocolate-sand': { primary: '#FFECD1', background: '#3E000C', text: '#FFECD1', kicker: '#FFECD1', borderColor: 'rgba(255, 236, 209, 0.25)', boxBgColor: 'rgba(255, 236, 209, 0.08)' },
  'feldgrau-wheat': { primary: '#3A4B41', background: '#E6CFA7', text: '#3A4B41', kicker: '#3A4B41', borderColor: 'rgba(58, 75, 65, 0.2)', boxBgColor: 'rgba(58, 75, 65, 0.06)' },
  'wheat-feldgrau': { primary: '#E6CFA7', background: '#3A4B41', text: '#E6CFA7', kicker: '#E6CFA7', borderColor: 'rgba(230, 207, 167, 0.25)', boxBgColor: 'rgba(230, 207, 167, 0.08)' },
  'noctis-marigold': { primary: '#1F2235', background: '#E3A419', text: '#1F2235', kicker: '#1F2235', borderColor: 'rgba(31, 34, 53, 0.2)', boxBgColor: 'rgba(31, 34, 53, 0.08)' },
  'marigold-noctis': { primary: '#E3A419', background: '#1F2235', text: '#E3A419', kicker: '#E3A419', borderColor: 'rgba(227, 164, 25, 0.25)', boxBgColor: 'rgba(227, 164, 25, 0.08)' },
  'champagne-obsidian': { primary: '#111111', background: '#F7F4EF', text: '#111111', kicker: '#71717A', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'obsidian-champagne': { primary: '#F7F4EF', background: '#111111', text: '#F7F4EF', kicker: '#D4D4D8', borderColor: 'rgba(247, 244, 239, 0.25)', boxBgColor: 'rgba(247, 244, 239, 0.08)' },
  'forest-olive-ivory': { primary: '#2C352E', background: '#F2EFE9', text: '#2C352E', kicker: '#58695C', borderColor: 'rgba(44, 53, 46, 0.2)', boxBgColor: 'rgba(44, 53, 46, 0.06)' },
  'ivory-forest-olive': { primary: '#F2EFE9', background: '#2C352E', text: '#F2EFE9', kicker: '#E2DFD9', borderColor: 'rgba(242, 239, 233, 0.25)', boxBgColor: 'rgba(242, 239, 233, 0.08)' },
  'airy-white': { primary: '#27272A', background: '#FFFFFF', text: '#27272A', kicker: '#A1A1AA', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'royal-gold': { primary: '#8A6D2F', background: '#FFF8EA', text: '#8A6D2F', kicker: '#8A6D2F', borderColor: 'rgba(138, 109, 47, 0.25)', boxBgColor: 'rgba(138, 109, 47, 0.08)' },
  'dark-studio': { primary: '#F3F4F6', background: '#141622', text: '#F3F4F6', kicker: '#E5C365', borderColor: '#232634', boxBgColor: '#0F1017' }
};

const DEFAULT_PAGE_SEQUENCE = [
  { id: 'cover', type: 'cover', label: 'Cover Page' },
  { id: 'aboutUs', type: 'aboutUs', label: 'About Us' },
  { id: 'shootDetails', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
  { id: 'functionsPage', type: 'functionsPage', label: 'Functions & Coverage' },
  { id: 'deliverablesPage', type: 'deliverablesPage', label: 'Deliverables' },
  { id: 'specialValueAdditions', type: 'specialValueAdditions', label: 'Special Value Additions' },
  { id: 'pricingPage', type: 'pricingPage', label: 'Pricing Details' },
  { id: 'paymentTermsPage', type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
  { id: 'addOnsPage', type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
  { id: 'termsPage', type: 'termsPage', label: 'Terms & Conditions' },
  { id: 'thankYouPage', type: 'thankYouPage', label: 'Thank You Page' }
];

export default function PublicProposalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [documentData, setDocumentData] = useState<any>(null);
  const [quoteMeta, setQuoteMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Client Status States
  const [accepted, setAccepted] = useState(false);
  const [budgetRequested, setBudgetRequested] = useState<number | null>(null);

  // Modals & Action States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // PDF Export Progress Overlay State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');

  useEffect(() => {
    fetchPublicProposal();
  }, [token]);

  const fetchPublicProposal = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!token) {
        setErrorMsg('Invalid quotation token');
        setLoading(false);
        return;
      }

      // 1. Fetch quotation metadata row by public_token
      const { data: quoteRow, error: quoteErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('public_token', token)
        .maybeSingle();

      if (quoteErr || !quoteRow) {
        console.error('[Public Preview] Quotation metadata record not found:', quoteErr);
        setErrorMsg('Quotation preview is temporarily unavailable.');
        setLoading(false);
        return;
      }

      setQuoteMeta(quoteRow);
      if (quoteRow.status === 'accepted') setAccepted(true);

      const qNum = quoteRow.quotation_number || quoteRow.id;

      // 2. Fetch authoritative document content_json snapshot from quotation_documents
      const { data: docRow } = await supabase
        .from('quotation_documents')
        .select('content_json')
        .eq('template_id', qNum)
        .maybeSingle();

      const docContent = docRow?.content_json || quoteRow.canvas_data;

      if (!docContent || Object.keys(docContent).length === 0) {
        console.error('[Public Preview] Document content snapshot missing for template_id:', qNum);
        setErrorMsg('Quotation preview is temporarily unavailable.');
        setLoading(false);
        return;
      }

      setDocumentData(docContent);
      setLoading(false);
    } catch (e: any) {
      console.error('[Public Preview] Unexpected error loading document:', e);
      setErrorMsg('Quotation preview is temporarily unavailable.');
      setLoading(false);
    }
  };

  const handleAcceptSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotations/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          responseType: 'accepted',
          clientName: documentData?.cover?.coupleName || quoteMeta?.client_name || 'Client'
        })
      });

      const json = await res.json();
      if (json.success) {
        setAccepted(true);
        setShowAcceptModal(false);
        setActionSuccessMsg('Thank you! Quotation accepted successfully.');
      } else {
        alert(json.error || 'Failed to accept quotation.');
      }
    } catch (e) {
      console.error('Accept proposal error:', e);
      alert('Network error submitting response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBudgetSubmit = async () => {
    if (!budgetValue || isNaN(Number(budgetValue))) {
      alert('Please enter a valid budget amount');
      return;
    }
    setSubmitting(true);
    try {
      const amountNum = Number(budgetValue);
      const res = await fetch('/api/quotations/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          responseType: 'budget_discussion',
          budgetAmount: amountNum,
          clientNotes: budgetNotes
        })
      });

      const json = await res.json();
      if (json.success) {
        setBudgetRequested(amountNum);
        setShowBudgetModal(false);
        setActionSuccessMsg(`Budget discussion request submitted for ₹${amountNum.toLocaleString('en-IN')}`);
      } else {
        alert(json.error || 'Failed to submit budget discussion.');
      }
    } catch (e) {
      console.error('Budget proposal error:', e);
      alert('Network error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (isExportingPdf || !quoteMeta) return;

    setIsExportingPdf(true);
    setExportProgress(15);
    setExportStatusText('Optimizing document snapshot...');

    const progressTimer = setInterval(() => {
      setExportProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const templateId = quoteMeta.quotation_number || quoteMeta.id;
      const res = await fetch('/api/quotations/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          filename: `${quoteMeta.title || 'Quotation'}.pdf`,
          content_json: documentData
        })
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to export PDF (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      setExportProgress(100);
      setExportStatusText('100% Complete! Downloading PDF...');

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${quoteMeta.title || 'Quotation'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 15000);
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('[Download PDF Error]:', err);
      alert(err.message || 'Network error while exporting PDF.');
    } finally {
      setTimeout(() => {
        setIsExportingPdf(false);
        setExportProgress(0);
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EDE5] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#004643] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-[#004643] tracking-widest uppercase">Loading Quotation Document...</p>
      </div>
    );
  }

  if (errorMsg || !documentData) {
    return (
      <div className="min-h-screen bg-[#F0EDE5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Quotation Preview Unavailable</h2>
        <p className="text-xs font-medium text-zinc-600 max-w-sm">{errorMsg || 'Quotation preview is temporarily unavailable.'}</p>
      </div>
    );
  }

  // Hydrate Exact Document Theme & Fonts from Saved Snapshot
  const themeKey = documentData.look || documentData.theme || 'cyprus-sand-dune';
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES['cyprus-sand-dune'];
  const primaryFont = documentData.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = documentData.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  const pageSequence = (documentData.pageSequence && documentData.pageSequence.length > 0)
    ? documentData.pageSequence
    : DEFAULT_PAGE_SEQUENCE;

  const cover = documentData.cover || {};
  const coupleName = cover.coupleName || (cover.groomName ? `${cover.groomName} & ${cover.brideName}` : quoteMeta?.client_name || 'RAHUL & NEHA');
  const eventType = (cover.eventType || 'WEDDING').toUpperCase();
  const sideOption = cover.sideOption || 'BOTH SIDES';
  const locationName = cover.locationName || cover.location || 'MUMBAI';
  const brandName = cover.brandName || 'FILMIFY WEDDINGS';
  const brandLogoUrl = cover.brandLogoUrl || '';
  const coverPhoto = cover.photoUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80';

  const aboutUs = documentData.aboutUs || documentData.about || {
    kicker: 'INTRODUCTION',
    heading: 'ABOUT US',
    text: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever'
  };

  const shootDetails = documentData.shootDetails || {
    kicker: 'WHAT WE DO',
    heading: 'Pre-Wedding Shoot',
    daysText: '1 Day Shoot\nCandid Photography\nCinematography\nPortable Changing Room',
    crewText: 'Full Ultra HD Super-Fine Raw Photos\nApprox 50 High Resolution Edited Images\n3 Save The Dates Photos\n1 count Down Reel\n1 video Reel'
  };

  const functionsPage = documentData.functionsPage || { items: [] };
  const deliverablesPage = documentData.deliverablesPage || { selectedItems: [] };
  const specialValueAdditions = documentData.specialValueAdditions || { items: [] };
  const pricingPage = documentData.pricingPage || { basePrice: 0, discountAmount: 0 };
  const paymentTermsPage = documentData.paymentTermsPage || { steps: [] };
  const addOnsPage = documentData.addOnsPage || { items: [] };
  const termsPage = documentData.termsPage || { text: '' };
  const thankYouPage = documentData.thankYouPage || { heading: 'THANK YOU' };

  return (
    <div className="min-h-screen bg-[#111111] text-zinc-100 flex flex-col items-center pb-28 select-none font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .primary-font { font-family: ${primaryFont} !important; }
        .secondary-font { font-family: ${secondaryFont} !important; }
        .public-a4-page {
          width: 100%;
          max-width: 794px;
          min-height: 1123px;
          padding: 48px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          background-color: ${theme.background};
          color: ${theme.text};
        }
      `}</style>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 z-[10000] px-5 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Quotation Document Container (Renders exact 11 A4 Pages) */}
      <main className="w-full max-w-[794px] my-6 space-y-6 shadow-2xl rounded-3xl overflow-hidden border border-zinc-800">
        {pageSequence.map((pageItem: any, idx: number) => {
          const pageType = pageItem.type || pageItem.id;

          return (
            <React.Fragment key={pageItem.id || idx}>
              {/* 1. COVER PAGE */}
              {pageType === 'cover' && (
                <section className="public-a4-page flex flex-col justify-between items-center text-center">
                  <div className="w-full flex flex-col items-center space-y-4 pt-6">
                    <BirdsSVG textColor={theme.primary} />
                    <div className="space-y-3">
                      <h1 className="primary-font text-4xl sm:text-5xl tracking-[0.18em] uppercase font-black leading-tight drop-shadow-xs" style={{ color: theme.text }}>
                        {coupleName}
                      </h1>
                      <h3 className="primary-font text-sm sm:text-base tracking-[0.2em] uppercase font-bold pt-1" style={{ color: theme.text }}>
                        {eventType} QUOTATION
                      </h3>
                    </div>
                  </div>

                  {coverPhoto && (
                    <div className="w-full h-[400px] sm:h-[450px] rounded-2xl overflow-hidden shadow-sm my-6">
                      <img 
                        src={coverPhoto} 
                        alt="Cover Photo" 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  <div className="w-full flex flex-col items-center space-y-3 pb-4">
                    {(sideOption || locationName) && (
                      <p className="text-xs uppercase font-extrabold tracking-widest text-center" style={{ color: theme.text }}>
                        {[sideOption, locationName].filter(Boolean).join(' • ')}
                      </p>
                    )}

                    {(brandLogoUrl || brandName) && (
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        {brandLogoUrl && (
                          <img 
                            src={brandLogoUrl} 
                            alt="Brand Logo" 
                            crossOrigin="anonymous"
                            className="h-12 w-auto object-contain bg-transparent"
                          />
                        )}
                        {brandName && (
                          <p className="text-[11px] uppercase tracking-[0.25em] font-black text-center" style={{ color: theme.kicker }}>
                            {brandName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 2. ABOUT US */}
              {pageType === 'aboutUs' && (
                <section className="public-a4-page flex flex-col justify-between items-center text-center">
                  <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                    <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                      {aboutUs.kicker || 'INTRODUCTION'}
                    </span>
                    <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                      {aboutUs.heading || 'ABOUT US'}
                    </h2>
                    <p className="text-sm leading-relaxed opacity-90 font-normal pt-2 whitespace-pre-line text-center">
                      {aboutUs.text}
                    </p>
                    <div className="pt-4 flex justify-center">
                      <MonogramSVG textColor={theme.text} className="opacity-80 h-12 w-auto" />
                    </div>
                  </div>
                </section>
              )}

              {/* 3. PRE-WEDDING SHOOT */}
              {pageType === 'shootDetails' && (
                <section className="public-a4-page flex flex-col justify-between items-center text-center">
                  <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                    <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                      {shootDetails.kicker || 'WHAT WE DO'}
                    </span>
                    <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                      {shootDetails.heading || 'Pre-Wedding Shoot'}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                      <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                        <span className="text-[10px] font-bold uppercase opacity-75" style={{ color: theme.kicker }}>Duration &amp; Days</span>
                        <p className="text-xs font-bold whitespace-pre-line">{shootDetails.daysText}</p>
                      </div>
                      <div className="p-4 rounded-xl border space-y-1" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                        <span className="text-[10px] font-bold uppercase opacity-75" style={{ color: theme.kicker }}>Crew &amp; Equipment</span>
                        <p className="text-xs font-bold whitespace-pre-line">{shootDetails.crewText}</p>
                      </div>
                    </div>

                    {shootDetails.showExclusionsNote && (
                      <div 
                        className="w-full p-3 rounded-xl border text-center text-xs font-semibold shadow-2xs"
                        style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}
                      >
                        <span className="opacity-90 font-medium">
                          {shootDetails.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4. FUNCTIONS & COVERAGE */}
              {pageType === 'functionsPage' && (() => {
                const items = functionsPage.items || [];
                const hasPhoto = !!(functionsPage.photo && functionsPage.frameShape !== 'background');
                const photoHeight = functionsPage.photoHeight || 200;
                const chunks = paginateFunctionsPageItems(items, hasPhoto, photoHeight);
                return chunks.map((chunkItems, chunkIdx) => (
                  <section key={`pub-func-${chunkIdx}`} className="public-a4-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {functionsPage.kicker || 'EVENT SCHEDULE'} {chunks.length > 1 ? `(${chunkIdx + 1}/${chunks.length})` : ''}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {functionsPage.heading || 'Functions & Coverage'}
                      </h2>

                      <div className="grid grid-cols-1 gap-3 text-left pt-2">
                        {chunkItems.map((item: any, fIdx: number) => (
                          <div key={item.id || fIdx} className="p-4 rounded-xl border space-y-1.5" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <h4 className="primary-font text-sm font-extrabold uppercase">{item.title || item.name}</h4>
                            {item.dateTime && <p className="text-[11px] font-semibold opacity-80">{item.dateTime}</p>}
                            {item.venue && <p className="text-[11px] font-medium opacity-75">{item.venue}</p>}
                            {item.team && <p className="text-[10px] font-mono font-bold pt-1 opacity-90" style={{ color: theme.kicker }}>{item.team}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ));
              })()}

              {/* 5. DELIVERABLES */}
              {pageType === 'deliverablesPage' && (() => {
                const delivItems = deliverablesPage.selectedItems || deliverablesPage.items || [];
                const delivChunks = paginateDeliverablesPageItems(
                  delivItems,
                  deliverablesPage.photo,
                  deliverablesPage.frameShape || 'arch',
                  deliverablesPage.photoHeight || 200
                );
                return delivChunks.map((chunkItems, chunkIdx) => (
                  <section key={`pub-deliv-${chunkIdx}`} className="public-a4-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {deliverablesPage.kicker || 'WHAT WE DELIVER'} {delivChunks.length > 1 ? `(${chunkIdx + 1}/${delivChunks.length})` : ''}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {deliverablesPage.heading || 'DELIVERABLES'}
                      </h2>

                      <div className="space-y-2 text-left pt-2">
                        {chunkItems.map((item: any, dIdx: number) => (
                          <div key={dIdx} className="p-3.5 rounded-xl border flex items-center gap-3" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <div className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0" style={{ borderColor: theme.kicker, color: theme.kicker }}>✓</div>
                            <span className="text-xs font-bold whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">{typeof item === 'string' ? item : item.title || item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ));
              })()}

              {/* 6. SPECIAL VALUE ADDITIONS */}
              {pageType === 'specialValueAdditions' && (() => {
                const addValItems = specialValueAdditions.selectedItems || specialValueAdditions.items || [];
                const addValChunks = paginateSpecialValueAdditionsPageItems(addValItems);
                return addValChunks.map((chunkItems, chunkIdx) => {
                  const isLastChunk = chunkIdx === addValChunks.length - 1;
                  return (
                    <section key={`pub-addval-${chunkIdx}`} className="public-a4-page flex flex-col justify-between items-center text-center">
                      <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                        <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                          {specialValueAdditions.kicker || 'COMPLIMENTARY GIFTS & BONUSES'} {addValChunks.length > 1 ? `(${chunkIdx + 1}/${addValChunks.length})` : ''}
                        </span>
                        <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                          {specialValueAdditions.heading || 'SPECIAL VALUE ADDITIONS'}
                        </h2>

                        <div className="space-y-3 text-left pt-2 max-w-xl mx-auto">
                          {chunkItems.map((item: any, sIdx: number) => (
                            <div 
                              key={sIdx}
                              className="p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all"
                              style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className="text-xs font-bold leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">{typeof item === 'string' ? item : item.title || item.name || item.text}</span>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: theme.text }}>
                                FREE
                              </span>
                            </div>
                          ))}

                          {isLastChunk && specialValueAdditions?.note && (
                            <p className="text-xs italic leading-relaxed opacity-85 mt-4 pt-3 border-t max-w-xl text-center mx-auto" style={{ color: theme.text, borderColor: theme.borderColor }}>
                              "{specialValueAdditions.note}"
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  );
                });
              })()}

              {/* 7. PRICING DETAILS */}
              {pageType === 'pricingPage' && (() => {
                const base = Number(pricingPage?.basePrice ?? pricingPage?.base ?? 0);
                const disc = Number(pricingPage?.discountAmount ?? pricingPage?.discount ?? 0);
                const accom = Number(pricingPage?.accommodationCharges ?? pricingPage?.accommodation ?? 0);
                const travel = Number(pricingPage?.travelCharges ?? pricingPage?.travel ?? 0);
                const addl = Number(pricingPage?.additionalCharges ?? pricingPage?.additional ?? 0);
                const gross = Math.max(0, base - disc + accom + travel + addl);
                const gstPct = Number(pricingPage?.gstPct ?? pricingPage?.gstPercent ?? 18);
                const gstAmount = Math.round(gross * (gstPct / 100));
                const netTotal = gross + gstAmount;

                return (
                  <section className="public-a4-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {pricingPage.kicker || 'INVESTMENT & BREAKDOWN'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {pricingPage.heading || 'PRICING DETAILS'}
                      </h2>

                      <div className="w-full max-w-xl mx-auto space-y-4 my-0">
                        <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor: theme.borderColor }}>
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="text-[10px] uppercase font-bold border-b" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.kicker }}>
                              <tr>
                                <th className="py-3.5 px-5">Financial Item / Particulars</th>
                                <th className="py-3.5 px-5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-semibold" style={{ color: theme.text, borderColor: theme.borderColor }}>
                              <tr style={{ borderColor: theme.borderColor }}>
                                <td className="py-3 px-5">Base Package Price</td>
                                <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{base.toLocaleString('en-IN')}</td>
                              </tr>
                              {disc > 0 && (
                                <tr style={{ borderColor: theme.borderColor, backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                                  <td className="py-3 px-5 font-bold" style={{ color: theme.text }}>Discount (Complimentary)</td>
                                  <td className="py-3 px-5 text-right font-sans font-bold tracking-tight">-₹{disc.toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              {accom > 0 && (
                                <tr style={{ borderColor: theme.borderColor }}>
                                  <td className="py-3 px-5">Accommodation Charges</td>
                                  <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{accom.toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              {travel > 0 && (
                                <tr style={{ borderColor: theme.borderColor }}>
                                  <td className="py-3 px-5">Travel Charges</td>
                                  <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{travel.toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              {addl > 0 && (
                                <tr style={{ borderColor: theme.borderColor }}>
                                  <td className="py-3 px-5">Additional Charges</td>
                                  <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{addl.toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                              <tr className="border-t font-bold" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor }}>
                                <td className="py-3 px-5 uppercase text-[11px] font-black">Subtotal (Gross Total)</td>
                                <td className="py-3 px-5 text-right font-sans font-black tracking-tight">₹{gross.toLocaleString('en-IN')}</td>
                              </tr>
                              {gstPct > 0 && (
                                <tr style={{ borderColor: theme.borderColor }}>
                                  <td className="py-3 px-5">GST ({gstPct}%)</td>
                                  <td className="py-3 px-5 text-right font-sans font-medium tracking-tight">₹{gstAmount.toLocaleString('en-IN')}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="w-full p-5 rounded-2xl border flex items-center justify-between shadow-md" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor }}>
                          <div className="text-left">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest block" style={{ color: theme.kicker }}>FINAL NET INVESTMENT</span>
                            <span className="text-xs font-medium opacity-80" style={{ color: theme.text }}>Inclusive of all Taxes &amp; Fees</span>
                          </div>
                          <div className="text-2xl sm:text-3xl font-black font-sans tracking-tight" style={{ color: theme.text }}>
                            ₹{netTotal.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {pricingPage?.showExclusionsNote && (
                          <div 
                            className="w-full p-3 rounded-xl border text-center text-xs font-semibold shadow-2xs"
                            style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}
                          >
                            <span className="opacity-90 font-medium">
                              {pricingPage.exclusionsNote || 'This excludes travel, accommodation, food & any add-on services.'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* 8. PAYMENT TERMS */}
              {pageType === 'paymentTermsPage' && (() => {
                const base = Number(pricingPage?.basePrice ?? pricingPage?.base ?? 0);
                const disc = Number(pricingPage?.discountAmount ?? pricingPage?.discount ?? 0);
                const accom = Number(pricingPage?.accommodationCharges ?? pricingPage?.accommodation ?? 0);
                const travel = Number(pricingPage?.travelCharges ?? pricingPage?.travel ?? 0);
                const addl = Number(pricingPage?.additionalCharges ?? pricingPage?.additional ?? 0);
                const gross = Math.max(0, base - disc + accom + travel + addl);
                const gstPct = Number(pricingPage?.gstPct ?? pricingPage?.gstPercent ?? 18);
                const gstAmount = Math.round(gross * (gstPct / 100));
                const netTotal = gross + gstAmount;

                const steps = Array.isArray(paymentTermsPage?.steps) ? paymentTermsPage.steps : [];
                const received = steps
                  .filter((s: any) => s && (s.status === 'Completed' || s.status === 'COMPLETED'))
                  .reduce((sum: number, s: any) => sum + Number(s?.amount || 0), 0);
                const pending = Math.max(0, netTotal - received);

                return (
                  <section className="public-a4-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {paymentTermsPage.kicker || 'SCHEDULE'}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {paymentTermsPage.heading || 'PAYMENT TERMS & SCHEDULE'}
                      </h2>

                      <div className="w-full max-w-xl mx-auto space-y-4 my-0">
                        <div className="w-full rounded-2xl overflow-hidden border shadow-xs" style={{ borderColor: theme.borderColor }}>
                          <table className="w-full text-left border-collapse">
                            <thead className="text-[11px] uppercase tracking-wider font-extrabold border-b" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.kicker }}>
                              <tr>
                                <th className="py-3.5 px-4 w-[24%]">DATE</th>
                                <th className="py-3.5 px-4 w-[38%]">STEPS</th>
                                <th className="py-3.5 px-4 w-[20%] text-right">AMOUNT</th>
                                <th className="py-3.5 px-4 w-[18%] text-center">STATUS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-xs font-semibold" style={{ borderColor: theme.borderColor, color: theme.text }}>
                              {steps.map((step: any, stIdx: number) => {
                                const isCompleted = step.status === 'Completed' || step.status === 'COMPLETED';
                                return (
                                  <tr key={step.id || stIdx} style={{ borderColor: theme.borderColor }}>
                                    <td className="py-3 px-4 font-sans font-medium tracking-tight uppercase">{step.date}</td>
                                    <td className="py-3 px-4 font-bold">{step.stepName}</td>
                                    <td className="py-3 px-4 text-right font-sans font-medium tracking-tight">₹{Number(step.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="py-3 px-4 text-center">
                                      <span 
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border"
                                        style={{
                                          backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                          borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                                          color: theme.text
                                        }}
                                      >
                                        <span>{step.status || 'Pending'}</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid grid-cols-3 gap-3 w-full text-center pt-1">
                          <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: theme.kicker }}>FIXED AMOUNT</span>
                            <span className="text-sm sm:text-base font-black font-sans tracking-tight">₹{netTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: theme.text }}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: theme.kicker }}>RECEIVED</span>
                            <span className="text-sm sm:text-base font-black font-sans tracking-tight">₹{received.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl border shadow-2xs" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: theme.text }}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: theme.kicker }}>PENDING</span>
                            <span className="text-sm sm:text-base font-black font-sans tracking-tight">₹{pending.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* 9. ADD-ONS */}
              {pageType === 'addOnsPage' && (() => {
                const items = (addOnsPage.items || []).filter((item: any) => item.selected !== false);
                const subText = addOnsPage.subText || addOnsPage.subHeading;

                return (
                  <section className="public-a4-page flex flex-col justify-between items-center text-center">
                    <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                      <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                        {addOnsPage.kicker || "EMBRACE YOUR DAY — YOU'RE IN CONTROL"}
                      </span>
                      <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                        {addOnsPage.heading || 'ADD-ONS & UPGRADES'}
                      </h2>
                      {subText && (
                        <p className="text-xs font-medium opacity-80" style={{ color: theme.text }}>
                          {subText}
                        </p>
                      )}

                      <div className="space-y-3 text-left pt-2 max-w-xl mx-auto">
                        {items.map((item: any, aIdx: number) => (
                          <div key={aIdx} className="p-4 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: theme.boxBgColor, borderColor: theme.borderColor, color: theme.text }}>
                            <span className="text-xs font-bold">{item.title || item.name}</span>
                            <span className="text-xs font-black font-sans">₹{Number(item.price || item.rate || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* 10. TERMS & CONDITIONS */}
              {pageType === 'termsPage' && (
                <section className="public-a4-page flex flex-col justify-between items-center text-center">
                  <div className="w-full max-w-xl mx-auto space-y-4 pt-4">
                    <span className="text-xs tracking-[0.25em] font-bold uppercase block" style={{ color: theme.kicker }}>
                      {termsPage.kicker || 'POLICIES & RULES'}
                    </span>
                    <h2 className="primary-font text-3xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                      {termsPage.heading || 'TERMS & CONDITIONS'}
                    </h2>
                    <p className="text-xs leading-relaxed opacity-90 font-medium whitespace-pre-line text-left pt-3">
                      {termsPage.text}
                    </p>
                  </div>
                </section>
              )}

              {/* 11. THANK YOU PAGE */}
              {pageType === 'thankYouPage' && (
                <section className="public-a4-page flex flex-col justify-between items-center text-center">
                  <div className="w-full max-w-xl mx-auto space-y-4 my-auto">
                    <h2 className="primary-font text-4xl uppercase tracking-widest font-normal" style={{ color: theme.text }}>
                      {thankYouPage.heading || 'THANK YOU'}
                    </h2>
                    <p className="text-xs tracking-[0.2em] font-bold uppercase" style={{ color: theme.kicker }}>
                      {thankYouPage.subHeading || 'LOOKING FORWARD TO CREATING MAGIC'}
                    </p>
                    <p className="text-xs opacity-90 max-w-md mx-auto pt-2">
                      {thankYouPage.message}
                    </p>
                  </div>
                </section>
              )}
            </React.Fragment>
          );
        })}
      </main>

      {/* Floating Bottom Client Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[9000] p-4 bg-black/90 backdrop-blur-md border-t border-zinc-800 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isExportingPdf}
          className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBudgetModal(true)}
          disabled={accepted}
          className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span>{budgetRequested ? `Budget: ₹${budgetRequested.toLocaleString('en-IN')}` : 'Discuss Budget'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAcceptModal(true)}
          disabled={accepted}
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4 text-black" />
          <span>{accepted ? '✓ Proposal Accepted' : 'Accept Proposal'}</span>
        </button>
      </div>

      {/* Accept Confirmation Modal */}
      <AnimatePresence>
        {showAcceptModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#161412] rounded-3xl p-6 shadow-2xl border border-emerald-500/30 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Accept this quotation?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Confirm your details — we block your dates for you, and your confirmation arrives by email.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={handleAcceptSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Yes, accept</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Discuss Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#161412] rounded-3xl p-6 shadow-2xl border border-amber-500/30 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Tell us your budget</h3>
              <p className="text-xs text-zinc-400">We will see what we can do to accommodate your vision.</p>
              <div className="space-y-2 text-left">
                <input
                  type="number"
                  placeholder="Enter your budget (₹)"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-amber-400 font-bold text-sm outline-none focus:border-amber-500"
                />
                <textarea
                  placeholder="Additional notes / requirement changes (optional)"
                  rows={2}
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium text-xs outline-none focus:border-amber-500"
                />
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-800 text-zinc-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBudgetSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Export Progress Overlay Modal */}
      <AnimatePresence>
        {isExportingPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="w-full max-w-sm bg-[#141210] rounded-3xl p-6 border border-amber-500/30 shadow-[0_20px_60px_rgba(245,158,11,0.2)] text-center space-y-5"
            >
              <div className="flex items-center justify-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Generating StudioCore Vector PDF...</span>
              </div>

              <p className="text-xs text-zinc-400 font-medium h-5">
                {exportStatusText}
              </p>

              {/* 4-Pill Segmented Progress Bar */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4].map((segmentIndex) => {
                  const segmentProgress = Math.min(100, Math.max(0, (exportProgress - (segmentIndex - 1) * 25) * 4));
                  return (
                    <div
                      key={segmentIndex}
                      className="flex-1 h-3 rounded-full bg-zinc-800 overflow-hidden relative border border-zinc-700/40 shadow-inner"
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${segmentProgress}%` }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
                <span>Progress</span>
                <span className="text-amber-500 font-extrabold text-sm">{exportProgress}%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

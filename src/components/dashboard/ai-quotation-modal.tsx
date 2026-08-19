'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Check, AlertTriangle, ArrowRight, Loader2, 
  FileText, Calendar, MapPin, Users, DollarSign, Camera, Video, MessageSquare
} from 'lucide-react';
import { Lead } from '@/types';
import { supabase } from '@/lib/supabase';
import AiMicButton from '@/components/AiMicButton';

interface AiQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  quotationId?: string | null;
  selectedTemplateId?: string | null;
  currentDocumentData?: any;
  onApplied?: (updatedDoc: any, targetQuotationId: string) => void;
}

export function AiQuotationModal({
  isOpen,
  onClose,
  lead,
  quotationId,
  selectedTemplateId,
  currentDocumentData,
  onApplied
}: AiQuotationModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Extracted Result State
  const [extractedDoc, setExtractedDoc] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  if (!isOpen) return null;

  const effectiveLead: any = lead || {
    id: quotationId || 'draft',
    name: currentDocumentData?.cover?.coupleName || 'Client',
    phone: '',
    email: '',
    raw_payload: {},
    comments: []
  };

  const handleCopySystemPrompt = () => {
    const masterPrompt = `You are StudioCore AI Quotation Assistant for Professional Wedding & Event Photography Studios.

==================================================
🎯 YOUR TASK:
Analyze the client requirements, notes, or conversation below and convert them into a 100% structured StudioCore Quotation JSON document.

==================================================
📋 PAGE-BY-PAGE RULES & MAPPING:

1. COVER PAGE (cover):
- coupleName: Exact couple name requested by user. Format nicely (e.g. "Sagar & Vruddhi").
- groomName: Extracted groom name (e.g. "Sagar").
- brideName: Extracted bride name (e.g. "Vruddhi").
- eventType: Title of event (e.g. "Wedding", "Pre-Wedding", "Pre-Wedding & Wedding", "Engagement", "Reception", "Maternity", "Corporate Event").
- locationName: Exact city/venue if mentioned. If NOT mentioned, keep it EMPTY string "" (DO NOT hallucinate or put fake cities like Mumbai!).

2. ABOUT US (aboutUs):
- KEEP DEFAULT TEMPLATE AS IS (No changes).

3. PRE-WEDDING SHOOT (shootDetails):
- If pre-wedding is requested/included:
  - visible: true
  - daysText: e.g. "1 Day Shoot" (Default if not specified) or "2 Days Shoot", "3 Days Shoot".
  - crewText: Requirements/crew (e.g. "Candid Photography\\nCinematography\\nDrone Pilot\\nReel Creator").
  - deliverablesText: Expected deliverables (e.g. "1 Minute Teaser Reel\\n50+ Color Graded Photos\\nSave the Date Video").
  - showExclusionsNote: true (Default ON).

4. FUNCTIONS & COVERAGE (functionsPage):
- items: Array of event objects:
  - id: Unique string "func_1", "func_2", etc.
  - name: Function title. If multiple functions occur in the same slot/day, combine them with " + " (e.g. "Haldi + Sangeet", "Ring Ceremony + Cocktail").
  - date: Exact date string if specified (e.g. "14 Dec 2026"). If user says date not fixed or no date is given, set date: "Date Not Fixed" and dateNotFixed: true.
  - startTime / endTime: Exact time if specified (e.g. "09:00 AM" / "02:00 PM"). If NO time specified, keep EMPTY string ""!
  - location: Venue or location if specified. If NO location specified, keep EMPTY string ""!
  - notes: Special event notes if specified. If none, keep EMPTY string ""!
  - requirements: Array of { name: string, qty: number } using the Standardized Crew Normalization Dictionary:
    * "Cinematographer" (CV, Cinematography, Cinematic Video, Cine Video, Cinematic)
    * "Traditional Photographer" (TP, Traditional Photography, Traditional Photo)
    * "Candid Photographer" (CP, Candid Photography, Candid Photo, Candid Photos)
    * "Traditional Videographer" (TV, Traditional Video, Traditional Videography, Tred Video)
    * "Social Media Person" (Story Creator, Social Media Manager)
    * "Semi Cinematic" (Semi-Cine, Semi Cinematic Video)
    * "Reel Creator" (Reels, Reel Person, Reel Maker, Instagram Reel)
    * "Live Videography" (Live Streaming, LED Live Setup, Live TV)
    * "Drone Pilot" (Drone, Drone Videography, Aerial Drone)
    * "Assistant" (Ass, Helper, Light Boy)
    * "Team Manager" (TM, Event Coordinator, Shoot Manager)
    * "Makeup Artist" (MUA, Bridal Makeup)
    * "Family Photographer" (Family Photos, Family Photography)
    * If any new/custom crew role is mentioned, add it directly with its exact name and qty!

5. DELIVERABLES (deliverablesPage):
- selectedItems: Array of exact deliverables requested by user (e.g. "Full Ultra HD Super-Fine Raw Photos", "High Resolution Edited Photos (300+)", "Cinematic Teaser (3-5 Mins)", "Traditional Wedding Film (30-45 Mins)", "Instagram Reels Package (5 Reels)"). Custom deliverables will be added seamlessly.

6. SPECIAL VALUE ADDITIONS (specialValueAdditions):
- selectedItems: Array of complimentary/free bonus items (e.g. "Complimentary Drone Coverage", "Complimentary 1 Day Pre-Wedding Teaser", "Complimentary Wooden USB Box"). If none, keep empty array [].

7. PRICING DETAILS (pricingPage):
- basePrice: Total package amount / base price (Number, e.g. 150000).
- discountAmount: Discount amount if specified (Number, e.g. 10000), else 0.
- gstPct: GST percentage if specified (Number, e.g. 18), else 0.
- travelCharges: Travel cost if specified (Number), else 0.
- accommodationCharges: Stay/Hotel cost if specified (Number), else 0.
- additionalCharges: Any extra costs (Number), else 0.
- showExclusionsNote: true (Default ON).

8. PAYMENT TERMS & SCHEDULE (paymentTermsPage):
- steps: Array of payment milestones with custom percentages & amounts:
  - e.g. [
      { "name": "Advance Token", "pct": "30%", "amount": 45000, "status": "Pending" },
      { "name": "On Event Day", "pct": "50%", "amount": 75000, "status": "Pending" },
      { "name": "On Final Delivery", "pct": "20%", "amount": 30000, "status": "Pending" }
    ]
  - If user mentions specific ratio (e.g. 50%/50% or 30%/50%/20% or 20%/40%/40%), calculate accordingly.

==================================================
OUTPUT FORMAT:
Respond ONLY with valid JSON matching the schema below (No Markdown formatting around JSON, just pure JSON or standard JSON block):
{
  "cover": {
    "coupleName": "${lead.name || 'Client Name'}",
    "groomName": "${lead.name?.split('&')[0]?.trim() || 'Groom'}",
    "brideName": "${lead.name?.split('&')[1]?.trim() || 'Bride'}",
    "eventType": "Wedding",
    "locationName": ""
  },
  "shootDetails": {
    "visible": false,
    "daysText": "1 Day Shoot",
    "crewText": "Candid Photography\\nCinematography\\nDrone Pilot",
    "deliverablesText": "Full Ultra HD Raw Photos\\nApprox. 50 Edited Photos\\n1 Teaser Video Reel",
    "showExclusionsNote": true
  },
  "functionsPage": {
    "items": [
      {
        "id": "func-1",
        "name": "Wedding",
        "date": "Date Not Fixed",
        "dateNotFixed": true,
        "startTime": "",
        "endTime": "",
        "location": "",
        "requirements": [
          { "name": "Candid Photographer", "qty": 1 },
          { "name": "Cinematographer", "qty": 1 }
        ],
        "notes": ""
      }
    ]
  },
  "deliverablesPage": {
    "selectedItems": [
      "Full Ultra HD Super-Fine Raw Photos",
      "High Resolution Edited Photos (300+)",
      "Cinematic Teaser (3-5 Mins)",
      "Traditional Wedding Film (30-45 Mins)"
    ]
  },
  "specialValueAdditions": {
    "selectedItems": [],
    "note": ""
  },
  "pricingPage": {
    "basePrice": 150000,
    "discountAmount": 0,
    "gstPct": 0,
    "travelCharges": 0,
    "accommodationCharges": 0,
    "additionalCharges": 0,
    "showExclusionsNote": true,
    "note": ""
  },
  "paymentTermsPage": {
    "steps": [
      { "name": "Advance Token", "pct": "30%", "amount": 45000, "status": "Pending" },
      { "name": "On Event Day", "pct": "50%", "amount": 75000, "status": "Pending" },
      { "name": "On Final Delivery", "pct": "20%", "amount": 30000, "status": "Pending" }
    ]
  }
}

==================================================
LEAD & CLIENT CONTEXT:
- Lead Name: ${effectiveLead.name || 'N/A'}
- Phone: ${effectiveLead.phone || 'N/A'}
- Email: ${effectiveLead.email || 'N/A'}
- Lead Form Payload: ${JSON.stringify(effectiveLead.raw_payload || {}, null, 2)}
- Lead Comments & Notes: ${Array.isArray(effectiveLead.comments) ? effectiveLead.comments.map((c: any) => c.text).join('\n') : 'N/A'}
- Additional Notes: ${additionalNotes || 'N/A'}`;

    navigator.clipboard.writeText(masterPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/quotations/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: effectiveLead.id,
          quotationId: quotationId || null,
          explicitTemplateId: selectedTemplateId || null,
          currentDocument: currentDocumentData || null,
          additionalNotes: additionalNotes.trim()
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI could not generate quotation.');
      }

      setExtractedDoc(json.extractedDocument);
      setSummary(json.summary);
      setMissingInfo(json.missingInformation || []);
      setConflicts(json.conflicts || []);
      setStep('preview');
    } catch (err: any) {
      console.error('[AI Modal Generation Error]:', err);
      setErrorMsg(err.message || "AI couldn't generate the quotation. Your existing quotation has not been changed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!extractedDoc) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // If no quotationId exists and we have a real lead, first create one for lead using selectedTemplateId
      let targetQId = quotationId;
      if (!targetQId && effectiveLead.id && effectiveLead.id !== 'draft') {
        const createRes = await fetch('/api/quotations/create-for-lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            leadId: effectiveLead.id,
            clientName: effectiveLead.name,
            explicitTemplateId: selectedTemplateId || undefined
          })
        });
        const createJson = await createRes.json();
        if (!createRes.ok || !createJson.success) {
          throw new Error(createJson.error || 'Failed to initialize quotation draft for lead');
        }
        targetQId = createJson.quotationId || createJson.templateId;
      }

      // Apply extracted document directly to current draft if targetQId exists
      if (targetQId && targetQId !== 'draft') {
        const applyRes = await fetch('/api/quotations/ai-apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            quotationId: targetQId,
            document: extractedDoc
          })
        });

        const applyJson = await applyRes.json();
        if (!applyRes.ok || !applyJson.success) {
          throw new Error(applyJson.error || 'Failed to apply AI data to quotation');
        }

        // Prime local indexedDB and sessionStorage cache for instant builder hydration
        try {
          const { cacheDocumentLocal } = await import('@/lib/indexeddb-cache');
          cacheDocumentLocal(targetQId, applyJson.document || extractedDoc, 1);
          if (effectiveLead.id && effectiveLead.id !== 'draft') {
            sessionStorage.removeItem(`lead_quotes_cache_${effectiveLead.id}`);
          }
        } catch (e) {}
      }

      if (onApplied) {
        onApplied(extractedDoc, targetQId || quotationId || 'draft');
      } else if (targetQId && targetQId !== 'draft') {
        router.push(`/workspace/quotations/builder/templet/${targetQId}`);
        onClose();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('[AI Apply Error]:', err);
      setErrorMsg(err.message || 'Failed to apply quotation changes.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-white dark:bg-[#1A1816] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 dark:border-amber-500/10 flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                  ✨ Create Quotation with AI
                </h3>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {step === 'input' ? "AI will use this lead's information to prepare your quotation." : "Review AI generated proposal before applying."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === 'input' ? (
              <div className="space-y-4">
                {/* Lead Summary Overview */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 dark:bg-zinc-900/60 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Lead Information
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      Ready for Extraction
                    </span>
                  </div>

                  <div className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>{lead.name || 'Valued Client'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Client details</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Event & date info</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lead notes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{quotationId ? 'Current quotation draft' : 'Default template schema'}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Additional Notes Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                      <span>Add anything else for AI (Optional)</span>
                    </label>
                    <AiMicButton
                      size="sm"
                      buttonText="Voice AI Note"
                      onInsertComment={(text) =>
                        setAdditionalNotes((prev) => (prev ? `${prev}\n${text}` : text))
                      }
                    />
                  </div>
                  <textarea
                    rows={4}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Paste WhatsApp messages, client requirements, additional notes, pricing, functions, or deliverables..."
                    className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    StudioCore automatically includes all existing lead details. You don&apos;t have to re-paste saved data.
                  </p>
                </div>
              </div>
            ) : (
              /* PREVIEW STEP */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Quotation Summary
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Couple Name</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.coupleName || 'Rahul & Neha'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Wedding Date</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.weddingDate || 'TBD'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Location / Venue</span>
                      <span className="font-extrabold text-zinc-900 dark:text-white truncate block">
                        {summary?.location || 'MUMBAI'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Investment</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
                        {summary?.totalInvestment || '₹1,50,000'}
                      </span>
                    </div>
                  </div>

                  {/* Functions List */}
                  {summary?.functionsList && summary.functionsList.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">Functions Identified ({summary.functionsCount})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.functionsList.map((fn: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            ✓ {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conflicts Alert */}
                {conflicts.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Data Conflict Detected</span>
                    </div>
                    {conflicts.map((conf: any, idx: number) => (
                      <div key={idx} className="text-xs text-amber-900 dark:text-amber-200 pl-6">
                        • {conf.message || `${conf.field}: ${conf.values?.join(' vs ')}`}
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing Details Warning */}
                {missingInfo.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>⚠ {missingInfo.length} detail{missingInfo.length > 1 ? 's' : ''} need your attention</span>
                    </div>
                    <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4 list-disc">
                      {missingInfo.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            {step === 'input' ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={generating}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySystemPrompt}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copy complete multi-page AI system prompt with client metadata"
                  >
                    {promptCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span>Copy AI Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Context...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Quotation</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  disabled={applying}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to Input
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Applying Data...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{missingInfo.length > 0 ? 'Apply Anyway' : 'Apply to Quotation'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

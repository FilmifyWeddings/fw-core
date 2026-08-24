'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, 
  X, RefreshCw, ArrowRight, Table, Layers, Trash2, Check, FileText,
  DollarSign, MapPin, Calendar, Sparkles, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  parseExcelRows, downloadSampleExcelTemplate, executeBatchClientFinanceImport,
  ParsedClientFinanceRow 
} from '@/lib/excel-finance-migration';

interface ExcelMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
}

export function ExcelMigrationModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess
}: ExcelMigrationModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedClientFinanceRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'cleared' | 'pending'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle File Upload & Parsing
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsProcessing(true);
    setParseErrors([]);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) {
        throw new Error('The selected workbook is empty or has no readable sheets.');
      }

      // Convert to JSON objects
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        throw new Error('No data rows found in the uploaded spreadsheet.');
      }

      // Parse structured rows
      const rows = parseExcelRows(rawJson);
      setParsedRows(rows);

      const invalidCount = rows.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
        setParseErrors([`${invalidCount} rows have validation issues and will be flagged in preview.`]);
      }

      setStep('preview');
    } catch (err: any) {
      console.error('Error parsing excel file:', err);
      setParseErrors([err.message || 'Failed to parse Excel/CSV file. Please check format.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Execute Batch Import
  const handleConfirmImport = async () => {
    setStep('importing');
    setIsProcessing(true);

    try {
      const result = await executeBatchClientFinanceImport(parsedRows, workspaceId);
      setImportResult(result);
      setStep('completed');
      onSuccess();
    } catch (err: any) {
      console.error('Batch import failed:', err);
      setImportResult({
        successCount: 0,
        errorCount: parsedRows.length,
        errors: [err.message || 'Database transaction error occurred.']
      });
      setStep('completed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculations for preview stats
  const totalVolume = parsedRows.reduce((sum, r) => sum + r.calculatedTotal, 0);
  const totalReceived = parsedRows.reduce((sum, r) => sum + r.calculatedReceived, 0);
  const totalPending = parsedRows.reduce((sum, r) => sum + r.calculatedPending, 0);
  const clearedCount = parsedRows.filter(r => r.isAllClear || r.calculatedPending === 0).length;
  const pendingCount = parsedRows.length - clearedCount;
  const validCount = parsedRows.filter(r => r.isValid).length;

  const filteredPreviewRows = parsedRows.filter(row => {
    if (previewFilter === 'valid') return row.isValid;
    if (previewFilter === 'invalid') return !row.isValid;
    if (previewFilter === 'cleared') return row.isAllClear || row.calculatedPending === 0;
    if (previewFilter === 'pending') return !row.isAllClear && row.calculatedPending > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md font-sans">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-5xl w-full border border-slate-100 shadow-2xl space-y-6 max-h-[90vh] flex flex-col justify-between overflow-hidden"
      >
        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Excel / CSV Client & Finance Importer
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                  Legacy 2025 Matcher
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Migrate legacy spreadsheets into structured client directories & milestone finance accounts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── STEP 1: UPLOAD & TEMPLATE DOWNLOAD ─── */}
        {step === 'upload' && (
          <div className="space-y-6 overflow-y-auto py-2">
            
            {/* Download Sample Template Banner */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Need a Pre-Formatted Template?
                  </h4>
                  <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                    Download our ready-to-use sample sheet with exact legacy columns (Token, Adv Pay, 1st Step, All Clear).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadSampleExcelTemplate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 font-black text-white text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Sample Excel (.xlsx)
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 sm:p-12 text-center bg-slate-50/60 hover:bg-emerald-50/20 transition cursor-pointer space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.value && e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-md text-emerald-600 flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Drop your Excel or CSV spreadsheet here
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Supports <strong className="text-slate-700">.xlsx, .xls, .csv</strong> files up to 25MB
                </p>
              </div>

              <button
                type="button"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Browse Files
              </button>
            </div>

            {/* Error Message */}
            {parseErrors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                {parseErrors.map((err, idx) => (
                  <p key={idx} className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Supported Legacy Columns Reference */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Recognized Sheet Columns (Auto-Mapped):
              </h5>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                {[
                  'Client Name', 'Client Location', 'Shoot / Event Type', 'Date',
                  'Fix Amount', 'Token Amount', 'Add On', 'Adv Pay', '1st Step',
                  'After Shoot', 'After Deliverables', 'Remaining', 'All Clear'
                ].map(col => (
                  <span key={col} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono">
                    {col}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ─── STEP 2: LIVE DATA PREVIEW & VALIDATION ─── */}
        {step === 'preview' && (
          <div className="space-y-4 overflow-hidden flex flex-col flex-1">
            
            {/* Top Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Total Rows</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">{parsedRows.length}</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">All Clear (Paid)</span>
                <span className="text-base font-black text-emerald-700 mt-0.5 block">{clearedCount}</span>
              </div>

              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-center">
                <span className="text-[10px] font-black text-orange-800 uppercase block">Pending Balance</span>
                <span className="text-base font-black text-orange-700 mt-0.5 block">{pendingCount}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Total Volume</span>
                <span className="text-base font-mono font-black text-slate-900 mt-0.5 block">₹{totalVolume.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">Realized Cash</span>
                <span className="text-base font-mono font-black text-emerald-700 mt-0.5 block">₹{totalReceived.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Show:</span>
                <button
                  onClick={() => setPreviewFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${previewFilter === 'all' ? 'bg-slate-900 text-white font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  onClick={() => setPreviewFilter('cleared')}
                  className={`px-2.5 py-1 rounded-lg transition ${previewFilter === 'cleared' ? 'bg-emerald-600 text-white font-black' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                >
                  🟢 Cleared ({clearedCount})
                </button>
                <button
                  onClick={() => setPreviewFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition ${previewFilter === 'pending' ? 'bg-orange-600 text-white font-black' : 'bg-orange-50 text-orange-800 hover:bg-orange-100'}`}
                >
                  ⏳ Pending ({pendingCount})
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                File: <strong className="text-slate-800">{fileName}</strong>
              </span>
            </div>

            {/* Live Data Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-72 border border-slate-200 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <tr className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Client Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Shoot Type</th>
                    <th className="py-2.5 px-3">Event Date</th>
                    <th className="py-2.5 px-3 text-right">Fix Amount</th>
                    <th className="py-2.5 px-3 text-right">Add On</th>
                    <th className="py-2.5 px-3 text-right">Received</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                    <th className="py-2.5 px-3 text-center">All Clear</th>
                    <th className="py-2.5 px-3 text-center">Milestones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewRows.map((row) => (
                    <tr 
                      key={row.rawIndex}
                      className={`hover:bg-slate-50/80 transition ${
                        row.isAllClear || row.calculatedPending === 0
                          ? 'bg-emerald-50/20'
                          : row.calculatedPending > 0
                          ? 'bg-orange-50/15'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{row.rawIndex}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {row.clientName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {row.location || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold">
                          {row.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {row.eventDate || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{row.fixAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {row.addOnAmount > 0 ? `₹${row.addOnAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{row.calculatedReceived.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                        ₹{row.calculatedPending.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.isAllClear || row.calculatedPending === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Cleared
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold">
                          {row.milestones.length} Steps
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ─── STEP 3: IMPORTING PROGRESS ─── */}
        {step === 'importing' && (
          <div className="py-16 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                Importing {parsedRows.length} Clients & Finance Accounts...
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Generating client directories, pricing breakdowns, and milestone schedules in Supabase.
              </p>
            </div>
          </div>
        )}

        {/* ─── STEP 4: COMPLETED ─── */}
        {step === 'completed' && importResult && (
          <div className="py-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Migration Successfully Completed! 🎉
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Successfully processed and created <strong className="text-emerald-700 font-bold">{importResult.successCount} client accounts</strong> in your workspace.
              </p>
            </div>

            {importResult.errorCount > 0 && (
              <div className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-2xl text-left space-y-1">
                <span className="text-xs font-black text-rose-800 block">Errors ({importResult.errorCount}):</span>
                {importResult.errors.map((e, idx) => (
                  <p key={idx} className="text-[11px] text-rose-700">{e}</p>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer"
            >
              Done & View Finance Suite
            </button>
          </div>
        )}

        {/* ─── FOOTER ACTIONS ─── */}
        {step !== 'importing' && step !== 'completed' && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {step === 'preview' ? (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ← Back to Upload
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Step 1 of 2: Upload Sheet</span>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              {step === 'preview' && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={parsedRows.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Confirm & Import {parsedRows.length} Clients
                </button>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}

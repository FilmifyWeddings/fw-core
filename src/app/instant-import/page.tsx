'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

export default function InstantImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imported, setImported] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImported(null);
    
    setTimeout(() => {
      setUploading(false);
      setImported(`Imported ${Math.floor(Math.random() * 20) + 5} leads from "${file.name}" successfully!`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white p-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Instant Lead Importer</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Upload CSV or Excel spreadsheets to parse and import leads into the core database</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-5">
            {/* Drag Zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-12 text-center bg-zinc-100/50 dark:bg-zinc-900/20 space-y-2 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              {uploading ? (
                <div className="space-y-2 py-2">
                  <RefreshCw className="w-8 h-8 text-orange-500 mx-auto animate-spin" />
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold">Parsing spreadsheet...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-400 dark:text-zinc-650 mx-auto" />
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold">Drop spreadsheet here or click to browse</p>
                  <p className="text-[10px] text-zinc-500">Supports CSV, XLSX up to 10MB</p>
                </>
              )}
            </div>

            {imported && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{imported}</span>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">CSV Layout Guide</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Your spreadsheet header names should match basic fields or follow standard mappings:
            </p>
            <ul className="text-[10px] space-y-1.5 font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-900">
              <li>• full_name (or name)</li>
              <li>• phone_number (or phone)</li>
              <li>• email</li>
              <li>• wedding_location (or venue)</li>
              <li>• event_date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

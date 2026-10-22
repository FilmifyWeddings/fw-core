'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Share2, Copy, Check, MessageSquare, 
  ShieldCheck, Film, Sparkles 
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  shares: any[];
  workspaceId: string;
  videos?: any[];
  versions?: any[];
  activeVersionId?: string | null;
  onShareCreated: (share: any) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  project,
  shares = [],
  workspaceId,
  videos = [],
  versions = [],
  activeVersionId,
  onShareCreated,
}: ShareModalProps) {
  const [allowComments, setAllowComments] = useState(true);
  const [allowApprovals, setAllowApprovals] = useState(true);
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Version-Specific Target Selection
  const [selectedVersionId, setSelectedVersionId] = useState<string>(activeVersionId || 'all');

  // Active share link
  const existingShare = shares && shares.length > 0 ? shares[0] : null;
  const [activeShare, setActiveShare] = useState<any>(existingShare);

  useEffect(() => {
    if (shares && shares.length > 0) {
      setActiveShare(shares[0]);
    }
  }, [shares]);

  useEffect(() => {
    if (activeVersionId) {
      setSelectedVersionId(activeVersionId);
    }
  }, [activeVersionId]);

  if (!isOpen || !project) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://studiocore.in';
  
  // Construct Version-Specific Link if user targets a specific version
  const baseTokenUrl = activeShare ? `${origin}/r/${activeShare.token}` : '';
  const shareUrl = baseTokenUrl 
    ? (selectedVersionId && selectedVersionId !== 'all' ? `${baseTokenUrl}?v=${selectedVersionId}` : baseTokenUrl)
    : '';

  const selectedVersionObj = versions.find(v => v.id === selectedVersionId);
  const selectedVideoObj = selectedVersionObj ? videos.find(v => v.id === selectedVersionObj.video_id) : null;

  const handleCreateShare = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/review/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          workspace_id: workspaceId,
          allow_comments: allowComments,
          allow_approvals: allowApprovals,
          allow_downloads: false, // Permanently disabled as requested
          require_passcode: requirePasscode,
          passcode: passcode,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update share permissions');

      setActiveShare(data.share);
      onShareCreated(data.share);
      alert('Link permissions updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Error creating share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const versionLabel = selectedVersionObj ? (selectedVersionObj.version_label || `Revision ${selectedVersionObj.version_number}`) : 'Latest Cut';
    const text = `Hello ${project.client_name || 'Client'}!\n\nYour video review project for *${project.name}* (${versionLabel}) is ready for your review.\n\n🎬 Watch & Review here:\n${shareUrl}\n\nYou can pause at any second to leave timestamped feedback or annotations, and approve when satisfied!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E7E2D8] shadow-2xl overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E2D8] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900">Share Review Link</h2>
              <p className="text-xs text-zinc-400">Send custom client review link with version lock</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* 1. Version Selection Box (Specific Version Target) */}
          {versions.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-[#E7E2D8] space-y-2">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Select Target Cut / Version to Share:</span>
              </label>

              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E7E2D8] text-xs font-bold text-zinc-800 focus:outline-hidden focus:border-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="all">⚡ All Versions (Open Latest Active Cut)</option>
                {versions.map((ver) => {
                  const vid = videos.find(v => v.id === ver.video_id);
                  const title = vid ? `${vid.title} - ` : '';
                  const label = ver.version_label || `Version ${ver.version_number}`;
                  const isCurrent = ver.id === activeVersionId;
                  return (
                    <option key={ver.id} value={ver.id}>
                      {title}{label} {isCurrent ? '(Currently Active)' : ''}
                    </option>
                  );
                })}
              </select>

              {selectedVersionObj && (
                <p className="text-[10px] text-zinc-500 font-medium">
                  Client opening this link will immediately load <span className="font-bold text-amber-700">{selectedVideoObj?.title || 'Video'} ({selectedVersionObj.version_label || `V${selectedVersionObj.version_number}`})</span>.
                </p>
              )}
            </div>
          )}
          
          {/* 2. Active Link Box */}
          {activeShare ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Client Review Portal URL</span>
                  <span className="text-[10px] text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-md font-mono">
                    Token: {activeShare.token.slice(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-amber-300">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs text-zinc-800 bg-transparent outline-hidden font-mono truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Single WhatsApp Share Action */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs active:scale-98"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share Review Link on WhatsApp</span>
              </button>
            </div>
          ) : (
            <div className="text-center p-4 bg-zinc-50 rounded-2xl border border-dashed border-[#E7E2D8]">
              <p className="text-xs font-medium text-zinc-600">No active review link created yet.</p>
              <button
                onClick={handleCreateShare}
                disabled={isGenerating}
                className="mt-3 px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs cursor-pointer transition"
              >
                {isGenerating ? 'Generating...' : 'Generate Review Link'}
              </button>
            </div>
          )}

          {/* 3. Review Permissions Configuration */}
          <div className="border-t border-[#E7E2D8] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Reviewer Permissions</h4>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-[#E7E2D8] bg-white cursor-pointer hover:border-amber-400 transition">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-800">Allow Timestamped Comments</div>
                  <div className="text-[10px] text-zinc-400">Reviewers can pause and leave feedback & drawings</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-[#E7E2D8] bg-white cursor-pointer hover:border-amber-400 transition">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-800">Allow Final Approval</div>
                  <div className="text-[10px] text-zinc-400">Reviewers can mark video version as Approved or Request Changes</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowApprovals}
                  onChange={(e) => setAllowApprovals(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </label>

              {/* PIN Code Security */}
              <div className="p-2.5 rounded-xl border border-[#E7E2D8] bg-white space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-zinc-800">PIN Passcode Protection</div>
                    <div className="text-[10px] text-zinc-400">Require 4-6 digit passcode before viewing</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requirePasscode}
                    onChange={(e) => setRequirePasscode(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                </label>

                {requirePasscode && (
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter Passcode (e.g. 2026)"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E7E2D8] text-xs font-mono text-zinc-800 focus:border-amber-500"
                  />
                )}
              </div>
            </div>

            {/* Prominent, Beautifully Positioned Update Permissions Button */}
            {activeShare && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer active:scale-98"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isGenerating ? 'Saving...' : 'Update Link Permissions'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

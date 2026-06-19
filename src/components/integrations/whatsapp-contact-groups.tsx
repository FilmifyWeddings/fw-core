'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Trash2, CheckCircle2, ShieldCheck, 
  HelpCircle, RefreshCw, FolderPlus, FileText, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WhatsappContactGroupsProps {
  workspaceId: string;
}

interface ContactGroup {
  id: string;
  group_name: string;
  group_description: string | null;
  created_at: string;
}

export function WhatsappContactGroups({ workspaceId }: WhatsappContactGroupsProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load Groups
  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${workspaceId}`);
      const data = await res.json();
      if (data.success) {
        setGroups(data.results || []);
      }
    } catch (err) {
      console.warn('Fallback loading groups locally due to offline state');
      const fallback = localStorage.getItem(`wa_contact_groups_${workspaceId}`);
      if (fallback) setGroups(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      loadGroups();
    }
  }, [workspaceId]);

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName.trim(),
          group_description: groupDesc.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setGroupName('');
        setGroupDesc('');
        setSuccessMsg('Contact Group created successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        loadGroups();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      // Local Fallback
      const newGroup: ContactGroup = {
        id: `local-group-${Date.now()}`,
        group_name: groupName.trim(),
        group_description: groupDesc.trim(),
        created_at: new Date().toISOString()
      };
      const updated = [newGroup, ...groups];
      setGroups(updated);
      localStorage.setItem(`wa_contact_groups_${workspaceId}`, JSON.stringify(updated));
      setGroupName('');
      setGroupDesc('');
      setSuccessMsg('Contact Group saved successfully (Local Sandbox Mode)!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Leads in this group will be unassigned.')) return;

    try {
      const res = await fetch(`/api/integrations/whatsapp/groups?tenant_id=${workspaceId}&group_id=${groupId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadGroups();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      const updated = groups.filter(g => g.id !== groupId);
      setGroups(updated);
      localStorage.setItem(`wa_contact_groups_${workspaceId}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-1">
      
      {/* Create Group Form */}
      <div className="lg:col-span-1 p-5 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-900">
          <FolderPlus className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Create New Group</h3>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Group Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Wedding Shoots 2026"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="e.g. High-value pre-wedding and main shoot clients"
              value={groupDesc}
              onChange={e => setGroupDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Plus className="w-3.5 h-3.5" /> Add Contact Group</>
            )}
          </button>
        </form>

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </div>

      {/* Contact Groups List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Active Contact Groups</h2>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">{groups.length} groups total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading contact groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs border border-zinc-900 rounded-2xl bg-zinc-950/20">
            <Users className="w-8 h-8 text-zinc-700 mb-2" />
            No contact groups configured. Create your first group above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-extrabold text-white">{group.group_name}</h4>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-normal line-clamp-2">
                    {group.group_description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-900 mt-4 text-[9px] text-zinc-500 font-mono">
                  <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-0.5 text-emerald-400 hover:underline cursor-pointer">
                    View Leads <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

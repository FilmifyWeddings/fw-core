'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ClientFinanceRecord } from '@/types';

export interface PricingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ClientFinanceRecord | null | undefined;
  onSave: (values: {
    base_package_price: number;
    discount_amount: number;
    accommodation_charges: number;
    travel_charges: number;
    additional_charges: number;
    gst_rate: number;
  }) => void;
}

export default function PricingEditModal({
  isOpen,
  onClose,
  record,
  onSave,
}: PricingEditModalProps) {
  const [formData, setFormData] = useState({
    base_package_price: '',
    discount_amount: '',
    accommodation_charges: '',
    travel_charges: '',
    additional_charges: '',
    gst_rate: 0,
  });

  useEffect(() => {
    if (record && isOpen) {
      setFormData({
        base_package_price: String(record.base_package_price ?? 0),
        discount_amount: String(record.discount_amount ?? 0),
        accommodation_charges: String(record.accommodation_charges ?? 0),
        travel_charges: String(record.travel_charges ?? 0),
        additional_charges: String(record.additional_charges ?? 0),
        gst_rate: Number(record.gst_rate ?? 0),
      });
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const b = Math.max(0, Math.round(parseFloat(formData.base_package_price) || 0));
  const d = Math.max(0, Math.round(parseFloat(formData.discount_amount) || 0));
  const ac = Math.max(0, Math.round(parseFloat(formData.accommodation_charges) || 0));
  const tr = Math.max(0, Math.round(parseFloat(formData.travel_charges) || 0));
  const ad = Math.max(0, Math.round(parseFloat(formData.additional_charges) || 0));
  const sub = Math.max(0, b - d + ac + tr + ad);
  const gst = Math.round((sub * Number(formData.gst_rate || 0)) / 100);
  const tot = sub + gst;

  const handleSave = () => {
    onSave({
      base_package_price: b,
      discount_amount: d,
      accommodation_charges: ac,
      travel_charges: tr,
      additional_charges: ad,
      gst_rate: Math.max(0, Number(formData.gst_rate || 0)),
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-3.5 font-sans max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Edit Pricing Breakdown</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[240px]">
                Client: {record.client?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Subtotal & Total Preview */}
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Base Package (₹)</label>
                <input
                  type="number"
                  value={formData.base_package_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_package_price: e.target.value }))}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-rose-600 block mb-1">Discount (₹)</label>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                  className="w-full h-9 px-2.5 bg-rose-50/50 border border-rose-200 rounded-lg font-mono font-bold text-rose-600 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-rose-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Accommodation (₹)</label>
                <input
                  type="number"
                  value={formData.accommodation_charges}
                  onChange={(e) => setFormData(prev => ({ ...prev, accommodation_charges: e.target.value }))}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Travel Charges (₹)</label>
                <input
                  type="number"
                  value={formData.travel_charges}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel_charges: e.target.value }))}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Additional (₹)</label>
                <input
                  type="number"
                  value={formData.additional_charges}
                  onChange={(e) => setFormData(prev => ({ ...prev, additional_charges: e.target.value }))}
                  className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GST Rate</label>
                <select
                  value={formData.gst_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, gst_rate: Number(e.target.value) }))}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 transition"
                >
                  <option value={0}>0% (No GST)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST (Standard)</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>
            </div>

            {/* Live Calculated Highlight Card */}
            <div className="p-3 bg-orange-50/80 border border-orange-200/80 rounded-xl space-y-1 mt-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">₹{sub.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">GST Amount ({formData.gst_rate}%):</span>
                <span className="font-mono font-bold text-slate-900">₹{gst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-orange-950 font-black text-xs sm:text-sm pt-1 border-t border-orange-200">
                <span>Final Net Investment:</span>
                <span className="font-mono text-orange-700">₹{tot.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 font-black text-white text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Pricing Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React from 'react';
import { HelpCircle, Mail, MessageSquare, ExternalLink } from 'lucide-react';

export default function SupportPage() {
  const faqs = [
    { q: 'How do I add a new WhatsApp device?', a: 'Go to Integrations -> select WhatsApp, click "Add Device" tab, and scan the QR code using WhatsApp Link Devices option on your phone.' },
    { q: 'Why are my templates pending approval?', a: 'Template approval is managed by Meta. This normally takes between 2 minutes to 24 hours depending on template structure.' },
    { q: 'What size limits apply to media templates?', a: 'Supabase storage permits up to 5MB for images, 16MB for videos, and 100MB for other document files.' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white p-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Help Desk & Support Center</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Get immediate answers, browse documentation guides, or open a conversation with support specialists</p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Email Help Desk</h3>
              <p className="text-[10px] text-zinc-500">Response within 12 hours</p>
              <a href="mailto:support@fwcore.com" className="text-xs font-semibold text-orange-500 hover:underline flex items-center gap-1">
                support@fwcore.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 backdrop-blur-md shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">WhatsApp Live Chat</h3>
              <p className="text-[10px] text-zinc-500">Available 9 AM - 6 PM IST</p>
              <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1">
                Chat on WhatsApp
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-890 bg-white dark:bg-zinc-900/20">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 pl-6 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

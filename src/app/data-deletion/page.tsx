import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Trash2, ShieldCheck, Mail, Phone, Globe, ArrowLeft, ExternalLink, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'User Data Deletion Instructions | Studio Core',
  description: 'Instructions on how to request data deletion and disconnect Meta / Facebook permissions from Studio Core.',
  alternates: {
    canonical: 'https://studiocore.in/data-deletion',
  },
  openGraph: {
    title: 'User Data Deletion Instructions | Studio Core',
    description: 'Instructions on how to request data deletion and disconnect Meta / Facebook permissions from Studio Core.',
    url: 'https://studiocore.in/data-deletion',
    siteName: 'Studio Core',
    type: 'website',
  },
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#070708] text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation / Header */}
        <div className="border-b border-amber-200/80 dark:border-zinc-800 pb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 transition mb-6 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio Core Home</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white font-serif">
                User Data Deletion Instructions
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <strong>Studio Core</strong> • Meta Platform & User Account Data Deletion Policy
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-amber-50/60 dark:bg-zinc-900/60 p-3 rounded-xl border border-amber-100 dark:border-zinc-800">
            <span><strong>Effective Date:</strong> August 21, 2026</span>
            <span>•</span>
            <span><strong>Compliance:</strong> Meta Platform Terms 4.a & User Data Protection</span>
            <span>•</span>
            <span><strong>Website:</strong> <a href="https://studiocore.in" className="text-amber-700 dark:text-amber-400 hover:underline">https://studiocore.in</a></span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
          
          {/* Overview */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Overview</span>
            </h2>
            <p>
              According to the Meta Platform terms and international data protection standards, users have the right to request the deletion of their personal data and any data obtained through Facebook / Meta integrations. <strong>Studio Core</strong> provides full control over your data, and we ensure prompt deletion upon request.
            </p>
          </section>

          {/* Option 1: Disconnecting Meta Integration */}
          <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">1</span>
              <span>How to Remove Studio Core Access from Facebook</span>
            </h2>
            <p>
              If you wish to remove Studio Core's access to your Facebook Page and Lead Ad data, you can do so directly from your Facebook settings:
            </p>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-xs">
              <li>Log in to your Facebook account and go to your <strong>Settings & Privacy → Settings</strong>.</li>
              <li>In the left sidebar, click on <strong>Business Integrations</strong> or navigate directly to{' '}
                <a 
                  href="https://www.facebook.com/settings?tab=business_tools" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-amber-700 dark:text-amber-400 font-bold underline inline-flex items-center gap-1"
                >
                  Facebook Business Integrations <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
              <li>Find <strong>Studio Core</strong> in the list of active apps.</li>
              <li>Click <strong>Remove</strong> to revoke all access tokens and permissions.</li>
              <li>Check the box to delete posts, videos, or events if prompted, and confirm the removal.</li>
            </ol>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Once removed, Studio Core can no longer access your Facebook account, Pages, or new Lead Ad submissions.
            </p>
          </section>

          {/* Option 2: In-App Disconnection */}
          <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">2</span>
              <span>Disconnecting from Studio Core Workspace</span>
            </h2>
            <p>
              To disconnect your Meta integration and immediately purge stored access tokens from within your Studio Core workspace:
            </p>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-xs">
              <li>Log in to your Studio Core workspace at <a href="https://studiocore.in" className="text-amber-700 dark:text-amber-400 font-semibold hover:underline">https://studiocore.in</a>.</li>
              <li>Navigate to <strong>Integrations → Meta Ads</strong>.</li>
              <li>Click the <strong>Disconnect</strong> or <strong>Remove Integration</strong> button.</li>
              <li>Confirm the action. All stored Facebook Page access tokens and webhook subscriptions for your account will be immediately deleted from our database.</li>
            </ol>
          </section>

          {/* Option 3: Full Data & Account Deletion Request */}
          <section className="space-y-4 p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border-2 border-red-200 dark:border-red-900/40 shadow-xs">
            <h2 className="text-base font-bold text-red-950 dark:text-red-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs">3</span>
              <span>Request Full Deletion of All Workspace & Lead Data</span>
            </h2>
            <p>
              If you want permanent deletion of your Studio Core workspace, including all historical leads, client records, quotation documents, team profiles, and stored credentials:
            </p>
            
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-red-900 dark:text-red-300">
                Email Deletion Request:
              </h3>
              <p className="text-xs">
                Please send an email to <a href="mailto:support@studiocore.com" className="text-red-700 dark:text-red-400 font-bold underline">support@studiocore.com</a> with:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Subject:</strong> Data Deletion Request - [Your Studio Name]</li>
                <li><strong>Registered Email:</strong> The email address associated with your Studio Core account.</li>
                <li><strong>Scope of Deletion:</strong> Whether you wish to delete Meta integration data only, or your entire Studio Core account and all database records.</li>
              </ul>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-zinc-900 dark:text-white">Deletion Processing Timeline:</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Our data protection team will verify your request and permanently delete your data within <strong>48 to 72 business hours</strong>. You will receive a written confirmation email once the deletion process is complete.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/80 dark:border-amber-900/40 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              <span>Contact Support for Assistance</span>
            </h2>
            <p>
              If you have any questions or require immediate assistance with data deletion, contact us:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white text-xs">
                  <Globe className="w-3.5 h-3.5 text-amber-600" />
                  <span>Platform</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Studio Core</p>
                <a href="https://studiocore.in" className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline block truncate">
                  https://studiocore.in
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white text-xs">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Support Email</span>
                </div>
                <a href="mailto:support@studiocore.com" className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline block truncate">
                  support@studiocore.com
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white text-xs">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contact Phone</span>
                </div>
                <a href="tel:+918169159784" className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline block truncate">
                  +91 81691 59784
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            © {new Date().getFullYear()} Studio Core. All rights reserved.
          </div>
          <div className="flex items-center gap-4 font-medium">
            <Link href="/privacy-policy" className="hover:text-zinc-900 dark:hover:text-white transition">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/data-deletion" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
              Data Deletion Instructions
            </Link>
            <span>•</span>
            <Link href="/terms-of-service" className="hover:text-zinc-900 dark:hover:text-white transition">
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

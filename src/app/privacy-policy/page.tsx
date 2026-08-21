import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield, Lock, Eye, Server, RefreshCw, Mail, Phone, Globe, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Studio Core',
  description: 'Official Privacy Policy for Studio Core - Photography & Studio Management CRM. Learn how we handle Meta Platform data, lead ad information, and user privacy.',
  alternates: {
    canonical: 'https://studiocore.in/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | Studio Core',
    description: 'Official Privacy Policy for Studio Core. Learn how we handle Meta Platform data, lead ad information, and user privacy.',
    url: 'https://studiocore.in/privacy-policy',
    siteName: 'Studio Core',
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
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
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white font-serif">
                Privacy Policy
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <strong>Studio Core</strong> • Official Platform Privacy Document
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-amber-50/60 dark:bg-zinc-900/60 p-3 rounded-xl border border-amber-100 dark:border-zinc-800">
            <span><strong>Effective Date:</strong> August 21, 2026</span>
            <span>•</span>
            <span><strong>Last Updated:</strong> August 21, 2026</span>
            <span>•</span>
            <span><strong>Website:</strong> <a href="https://studiocore.in" className="text-amber-700 dark:text-amber-400 hover:underline">https://studiocore.in</a></span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
          
          {/* Section 1: Introduction */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">1</span>
              <h2>Introduction</h2>
            </div>
            <p>
              Welcome to <strong>Studio Core</strong> ("we," "our," or "us"), accessible at <a href="https://studiocore.in" className="text-amber-700 dark:text-amber-400 font-semibold hover:underline">https://studiocore.in</a>. Studio Core provides studio management, workflow automation, lead generation synchronization, quotation generation, payment milestone tracking, and client relationship management (CRM) software for creative studios, photographers, cinematographers, and event production businesses.
            </p>
            <p>
              We respect your privacy and are deeply committed to protecting the personal data and platform data of our workspace owners, their team members, and their prospective clients. This Privacy Policy explains our practices regarding the collection, use, storage, processing, and protection of information when you interact with our website, application, integrations, and services.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">2</span>
              <h2>Information We Collect</h2>
            </div>
            <p>
              Studio Core only collects and processes information necessary to deliver our studio management services. The categories of information we may collect include:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2">
              <li>
                <strong>Account & Profile Information:</strong> Your full name, email address, phone number, password hash, studio business name, studio logo, and business preferences provided during registration and profile configuration.
              </li>
              <li>
                <strong>Meta / Facebook Integration Data:</strong> When you connect your Facebook or Meta business account, we collect your authorized Facebook User ID, connected Facebook Page IDs, Page names, and secure Page Access Tokens required to query and sync your Lead Ad campaigns.
              </li>
              <li>
                <strong>Lead Ad Form Information:</strong> Contact and inquiry details submitted by potential clients through your connected Meta Lead Forms (such as full name, phone number, email address, wedding/event date, event city/location, budget preferences, and custom questionnaire responses).
              </li>
              <li>
                <strong>Client & Quotation Data:</strong> Client contact details, quotation versions, pricing items, discounts, deliverables, venue details, and payment milestone records created within your private workspace.
              </li>
              <li>
                <strong>Google Account Information (Optional):</strong> When you explicitly authorize the Google Contacts integration, we receive access tokens to sync authorized client contact records directly to your Google Contacts directory.
              </li>
              <li>
                <strong>WhatsApp Messaging Data (Optional):</strong> Where you configure automated messaging or client notifications, we process contact numbers and message templates sent through your authorized communication channels.
              </li>
              <li>
                <strong>Technical & Log Data:</strong> Internet Protocol (IP) addresses, browser user-agent strings, device operating system details, access timestamps, and error diagnostic logs to ensure security, prevent fraud, and maintain platform uptime.
              </li>
            </ul>
          </section>

          {/* Section 3: Meta Platform Data (Dedicated Section) */}
          <section className="space-y-4 p-6 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 shadow-xs">
            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">3</span>
              <h2>Meta Platform Data & Compliance</h2>
            </div>
            <p>
              Studio Core integrates with Meta Developer APIs (including Facebook Login for Business, Graph API, and Webhooks) to enable real-time synchronization of Meta Lead Ads into your Studio Core CRM dashboard.
            </p>
            
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                A. What Meta Data We Access:
              </h3>
              <ul className="list-disc list-outside ml-5 space-y-1.5">
                <li>Your Facebook User ID and public profile name to authenticate your account.</li>
                <li>List of Facebook Pages you manage (Page ID, Page Name, Page Category) to let you select which pages to connect.</li>
                <li>Page Access Tokens to subscribe webhooks for lead notification delivery.</li>
                <li>Lead Ad Form metadata (Form IDs, Form Names, Question fields) and leadgen webhook payloads containing user-submitted form entries.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                B. How Meta Platform Data Is Used:
              </h3>
              <p>
                Meta Platform data is utilized <strong>strictly and exclusively</strong> to provide the core functionality requested by the studio owner:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1.5">
                <li>Instantly importing incoming prospective client leads into your CRM pipeline.</li>
                <li>Triggering automated follow-up workflows configured by you (e.g. sending team notifications, assigning photographers, or scheduling reminder alerts).</li>
                <li>Displaying lead submission statistics on your private workspace dashboard.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Strict Non-Sale & Data Protection Guarantees:</span>
              </div>
              <ul className="list-disc list-outside ml-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Studio Core does not sell, trade, rent, or lease Meta Platform data to any third parties or data brokers.</strong></li>
                <li>We do not use Meta Platform data for cross-site tracking, behavioral profiling, or advertising targeting.</li>
                <li>We do not use Meta Platform data to build, train, or improve generalized AI models for third parties.</li>
                <li>Access to Meta data is granted only after explicit OAuth consent by the studio administrator and can be revoked at any time.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                C. Disconnecting Meta Integrations:
              </h3>
              <p>
                You can disconnect your Facebook Pages or revoke Meta access at any time directly in your Studio Core dashboard under <strong>Integrations → Meta Ads Settings → Disconnect</strong>, or by managing your Business Integrations in your Facebook Account Settings (<a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-400 underline">https://www.facebook.com/settings?tab=business_tools</a>). Upon disconnection, your stored Page access tokens are immediately invalidated and deleted from our database.
              </p>
            </div>
          </section>

          {/* Section 4: Lead Ad Data Processing */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">4</span>
              <h2>Processing of Lead Ad Data</h2>
            </div>
            <p>
              When a consumer submits a lead form on a Meta advertisement run by your studio, Studio Core acts as a <strong>Data Processor</strong> (or service provider) operating on your behalf. The connected studio business is the <strong>Data Controller</strong> responsible for the advertising campaign and the collection of consent.
            </p>
            <p>
              Studio Core ingests the lead submission via secure encrypted webhooks, stores the lead details within your isolated workspace database, and facilitates your business communication with the lead. We do not use these lead contacts for our own marketing, nor do we transfer them to other studio accounts.
            </p>
          </section>

          {/* Section 5: Database and Hosting Infrastructure */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">5</span>
              <h2>Database, Hosting & Infrastructure Providers</h2>
            </div>
            <p>
              To maintain high security, data isolation, and reliable availability, Studio Core utilizes reputable, enterprise-grade cloud infrastructure:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2">
              <li>
                <strong>Supabase (Database & Authentication):</strong> User accounts, workspace configurations, client records, and access tokens are stored in secure Supabase PostgreSQL databases with Row-Level Security (RLS) policies enforced. All database connections and data at rest are encrypted using AES-256 and TLS.
              </li>
              <li>
                <strong>Oracle Cloud Infrastructure (OCI VPS):</strong> Application server instances, webhook listeners, and background processing workers are hosted in dedicated, secure virtual private server environments on Oracle Cloud Infrastructure (OCI).
              </li>
            </ul>
          </section>

          {/* Section 6: Third-Party Integrations */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">6</span>
              <h2>Third-Party Services & Integrations</h2>
            </div>
            <p>
              Studio Core only connects with third-party service providers that are strictly necessary to deliver the features enabled in your workspace:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li><strong>Meta Platforms, Inc.:</strong> For Facebook OAuth authentication, Page management, and Lead Ads webhook synchronization.</li>
              <li><strong>Google LLC (Google Contacts API):</strong> For optional one-click syncing of client contacts when authorized.</li>
              <li><strong>WhatsApp / Messaging Gateways:</strong> For dispatching workspace booking updates and team notifications.</li>
              <li><strong>Supabase & Oracle Cloud:</strong> For data storage and computing infrastructure.</li>
            </ul>
          </section>

          {/* Section 7: Data Sharing */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">7</span>
              <h2>Data Sharing and Disclosures</h2>
            </div>
            <p>
              We do not sell, rent, monetize, or disclose your personal data or Meta Platform data to third parties, except in the following limited circumstances:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li><strong>With Authorized Service Providers:</strong> Trusted cloud infrastructure vendors (such as Supabase and OCI) who process data strictly under confidentiality and data protection obligations on our behalf.</li>
              <li><strong>With Integrations Explicitly Authorized by You:</strong> Third-party platforms (like Google Contacts or WhatsApp) that you choose to connect.</li>
              <li><strong>For Legal and Safety Compliance:</strong> Where required by applicable law, regulation, subpoena, or valid legal process, or to protect the safety, security, and rights of our users or the public.</li>
            </ul>
          </section>

          {/* Section 8: Data Retention */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">8</span>
              <h2>Data Retention Policy</h2>
            </div>
            <p>
              We retain personal data, lead records, and integration access credentials only for as long as your Studio Core workspace account is active or as necessary to fulfill the purposes outlined in this policy.
            </p>
            <p>
              When an integration is disconnected, access tokens are immediately purged. When an account deletion is requested, all associated leads, client records, quotations, and profile data are permanently deleted from active databases within 48 to 72 hours, and purged from secure backup archives in accordance with standard backup rotation schedules.
            </p>
          </section>

          {/* Section 9: Data Deletion (Dedicated Section) */}
          <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs">9</span>
              <h2>Data Deletion & User Rights</h2>
            </div>
            <p>
              Studio Core respects your right to access, rectify, export, and permanently delete your personal information and any connected Meta Platform data.
            </p>
            
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                How to Request Account & Data Deletion:
              </h3>
              <p className="text-xs">
                To request permanent deletion of your Studio Core account, lead data, or Meta integration records, you can submit a deletion request through any of the following channels:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-1.5 text-xs">
                <li>
                  <strong>Public Deletion Page:</strong> Visit our dedicated data deletion instructions page at{' '}
                  <Link href="/data-deletion" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
                    https://studiocore.in/data-deletion
                  </Link>.
                </li>
                <li>
                  <strong>Email:</strong> Send a deletion request to{' '}
                  <a href="mailto:support@studiocore.com" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
                    support@studiocore.com
                  </a>{' '}
                  with the subject line "Data Deletion Request".
                </li>
                <li>
                  <strong>Phone / WhatsApp:</strong> Contact our support desk at{' '}
                  <a href="tel:+918169159784" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
                    +91 81691 59784
                  </a>.
                </li>
              </ul>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                All deletion requests are verified and processed within <strong>48 to 72 business hours</strong>, with a confirmation email sent upon completion.
              </p>
            </div>
          </section>

          {/* Section 10: Security Measures */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">10</span>
              <h2>Security & Encryption</h2>
            </div>
            <p>
              We implement comprehensive technical and organizational safeguards to protect your personal information against unauthorized access, loss, misuse, or alteration. These measures include:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>Full HTTPS/TLS 1.3 encryption across all website and API endpoints.</li>
              <li>Encrypted storage of sensitive third-party access tokens and API credentials.</li>
              <li>Row-Level Security (RLS) in database tables ensuring strict tenant and workspace isolation.</li>
              <li>Regular software dependency patching, firewalls, and server vulnerability scanning.</li>
            </ul>
            <p className="text-xs text-zinc-500 italic">
              While we employ industry-standard practices, no internet transmission or electronic storage method can be guaranteed 100% immune from risks.
            </p>
          </section>

          {/* Section 11: Cookies & Local Storage */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">11</span>
              <h2>Cookies and Local Storage</h2>
            </div>
            <p>
              Studio Core uses essential cookies and browser LocalStorage solely to maintain secure authenticated sessions, preserve user theme preferences (light/dark mode), and remember workspace navigation states. We do not use tracking cookies for third-party behavioral advertising.
            </p>
          </section>

          {/* Section 12: Children's Privacy */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">12</span>
              <h2>Children's Privacy</h2>
            </div>
            <p>
              Studio Core is designed strictly for professional business owners, studios, and adults. We do not knowingly solicit or collect personal information from individuals under the age of 18. If we become aware that personal information of a child has been collected, we will promptly take steps to delete it.
            </p>
          </section>

          {/* Section 13: Changes to this Policy */}
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs">13</span>
              <h2>Changes to this Privacy Policy</h2>
            </div>
            <p>
              We may update this Privacy Policy periodically to reflect new features, operational changes, or legal requirements. Any modifications will be published on this page with an updated "Last Updated" date. We encourage users to review this page periodically.
            </p>
          </section>

          {/* Section 14: Contact Information */}
          <section className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/80 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-bold text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">14</span>
              <h2>Contact Information</h2>
            </div>
            <p>
              If you have any questions, inquiries, concerns, or requests regarding this Privacy Policy or your data, please contact our dedicated support team:
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
                <p className="text-[10px] text-zinc-400">Response within 24 hours</p>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white text-xs">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contact Phone</span>
                </div>
                <a href="tel:+918169159784" className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline block truncate">
                  +91 81691 59784
                </a>
                <p className="text-[10px] text-zinc-400">Mon - Sat, 10 AM - 7 PM IST</p>
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
            <Link href="/privacy-policy" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/data-deletion" className="hover:text-zinc-900 dark:hover:text-white transition">
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

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, Shield, ArrowLeft, Mail, Phone, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Studio Core',
  description: 'Terms of Service and Platform Usage Conditions for Studio Core - Photography & Studio Management CRM.',
  alternates: {
    canonical: 'https://studiocore.in/terms-of-service',
  },
  openGraph: {
    title: 'Terms of Service | Studio Core',
    description: 'Terms of Service for Studio Core.',
    url: 'https://studiocore.in/terms-of-service',
    siteName: 'Studio Core',
    type: 'website',
  },
};

export default function TermsOfServicePage() {
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
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white font-serif">
                Terms of Service
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                <strong>Studio Core</strong> • Platform Terms of Service & User Agreement
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
          
          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">1. Agreement to Terms</h2>
            <p>
              By accessing or using <strong>Studio Core</strong> ("Service," "we," "our," or "us"), available at <a href="https://studiocore.in" className="text-amber-700 dark:text-amber-400 font-semibold hover:underline">https://studiocore.in</a>, you agree to be legally bound by these Terms of Service. If you do not agree to all terms and conditions, you must not access or use our Service.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">2. Description of Service</h2>
            <p>
              Studio Core is a comprehensive business operating system and CRM built for photography studios, cinematographers, and event management professionals. Key features include lead management, Meta Lead Ads synchronization, quotation generation, payment schedule tracking, client records, and team attendance operations.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">3. User Accounts and Responsibilities</h2>
            <p>
              You are responsible for safeguarding your login credentials, API tokens, and workspace data. You agree to notify us immediately of any unauthorized access or security breach. You agree not to use the Service for any unlawful activities or in violation of third-party platform policies.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">4. Meta Platform Policies & Third-Party Integrations</h2>
            <p>
              When integrating Meta / Facebook Lead Ads or other third-party services into Studio Core:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-xs">
              <li>You agree to comply with all applicable Meta Platform Terms, Developer Policies, and advertising guidelines.</li>
              <li>You warrant that you have full authorization to manage the Facebook Pages and Ad Accounts you connect.</li>
              <li>You are solely responsible for maintaining your own compliant privacy policy disclosing your lead generation and marketing practices to consumers.</li>
            </ul>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">5. Intellectual Property</h2>
            <p>
              All software, source code, visual interfaces, designs, trademarks, and documentation of Studio Core are the exclusive intellectual property of Studio Core and its licensors. You are granted a limited, non-exclusive license to use the platform for your legitimate business operations.
            </p>
          </section>

          <section className="space-y-3 p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Studio Core and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption arising from your use of or inability to use the Service.
            </p>
          </section>

          <section className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/80 dark:border-amber-900/40 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">7. Contact Information</h2>
            <p>
              If you have questions regarding these Terms of Service, please contact us:
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
            <Link href="/data-deletion" className="hover:text-zinc-900 dark:hover:text-white transition">
              Data Deletion Instructions
            </Link>
            <span>•</span>
            <Link href="/terms-of-service" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

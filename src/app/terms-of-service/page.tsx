import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <Link href="/" className="text-xs font-bold text-orange-500 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mt-4">Terms of Service</h1>
          <p className="text-xs text-zinc-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-zinc-700 dark:text-zinc-355 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">1. Agreement to Terms</h2>
            <p>
              By accessing or using **FW Automation CRM** ("Service," "we," "our," or "us") located at `https://fw-core.vercel.app`, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not access or use our Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">2. Description of Service</h2>
            <p>
              FW Automation CRM is a cloud-based marketing and lead management platform. It allows users to link their Meta/Facebook Lead Ad accounts, subscribe webhooks for real-time lead ingestion, score/rank leads, configure automated WhatsApp template notifications, and sync contacts to Google Contacts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">3. Accounts and Registration</h2>
            <p>
              To use most features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your credentials (including API keys and OAuth tokens) and are fully responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">4. User Responsibilities & Meta Platform Policy</h2>
            <p>
              By integrating Meta Facebook Lead Ads, you agree to:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Comply with all Meta Platform Policies, Developer Terms, and advertising guidelines.</li>
              <li>Only connect Facebook Pages and Ad Accounts that you have authorized administrative roles to manage.</li>
              <li>Maintain and publish your own valid privacy policy explaining how you handle lead data collected from consumers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">5. Intellectual Property</h2>
            <p>
              All software, layout, designs, features, and assets belonging to FW Automation CRM are the exclusive intellectual property of the platform. You may not copy, modify, distribute, or reverse engineer any part of the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at our discretion, without notice, for conduct that we believe violates these Terms of Service or Meta Platform Policies, or is otherwise harmful to other users or our business interests.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, FW Automation CRM shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, goodwill, or other intangible losses resulting from your access to or use of the Service.
            </p>
          </section>

          <section className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at **support@fw-automation.example.com**.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

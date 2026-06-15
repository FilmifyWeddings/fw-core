import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <Link href="/" className="text-xs font-bold text-orange-500 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mt-4">Privacy Policy</h1>
          <p className="text-xs text-zinc-500 mt-2">Last updated: June 13, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-zinc-700 dark:text-zinc-355 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">1. Introduction</h2>
            <p>
              Welcome to **FW Automation CRM** ("we," "our," or "us"). We respect your privacy and are committed to protecting the personal data of our users. This Privacy Policy describes how we collect, use, store, and share your information when you use our website `https://fw-core.vercel.app` and our Meta/Facebook Lead Ads Integration services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">2. Information We Collect</h2>
            <p>
              When you authenticate with Facebook and link your Facebook Pages and Lead Forms to FW Automation CRM, we collect:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>**Facebook Profile Information**: Your name, profile picture, and Facebook user ID.</li>
              <li>**Page Access Tokens**: Secure credentials required to access and monitor Page events on your behalf.</li>
              <li>**Lead Ad Data**: Contact details (such as names, phone numbers, email addresses) submitted by users on your active Meta Lead Forms.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">3. How We Use Your Information</h2>
            <p>
              We use the collected information solely to provide and improve our CRM automation services, including:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Retrieving your Meta Lead Ad forms and listing them on your dashboard.</li>
              <li>Subscribing webhook handlers to automatically ingest leads in real-time.</li>
              <li>Running classification algorithms (lead scoring) to identify high-quality deals.</li>
              <li>Syncing ingested leads to your connected accounts (e.g., Google Contacts or WhatsApp Drips) per your request.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">4. Data Sharing and Third-Party Disclosures</h2>
            <p>
              **FW Automation CRM does not sell or rent your personal data or your leads' data to third parties.**
              Data is only shared under your explicit command, such as:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Syncing contact data to your Google Account when you authorize the Google Contacts integration.</li>
              <li>Sending WhatsApp messages on your behalf via our partner gateways.</li>
              <li>Complying with legal processes or government requests as required by law.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">5. Data Retention and Deletion</h2>
            <p>
              We retain your credentials and imported leads only as long as your workspace account is active. 
              You can disconnect Facebook or delete your connected pages at any time via the **Integrations Settings** tab. 
              To request permanent deletion of your account and all associated lead databases, please contact us at **support@fw-automation.example.com**. We will process deletion requests within 48 hours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">6. Security</h2>
            <p>
              We use industry-standard encryption protocols (HTTPS/SSL) to protect your access tokens and lead data in transit and at rest. Security reviews and updates are performed regularly to safeguard database systems.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Contact Us</h2>
            <p>
              If you have any questions or feedback regarding our privacy practices, please contact us at **support@fw-automation.example.com**.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

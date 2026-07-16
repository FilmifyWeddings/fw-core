import type { Metadata } from "next";
import "./globals.css";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Suspense } from "react";

import { VersionGuard } from "@/components/VersionGuard";

export const metadata: Metadata = {
  title: "FW Studio Suite - Lead Management & WhatsApp Drip Automation Platform",
  description: "Elite multi-application suite for wedding photography studio operations. Manage leads, quotations, and team operations from a unified workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="antialiased"
      suppressHydrationWarning
    >
      <body className="bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white transition-colors duration-200" suppressHydrationWarning>
        <Suspense fallback={<div className="min-h-screen w-full bg-zinc-50 dark:bg-[#070708]" />}>
          <VersionGuard>
            <SidebarLayout>{children}</SidebarLayout>
          </VersionGuard>
        </Suspense>
      </body>
    </html>
  );
}

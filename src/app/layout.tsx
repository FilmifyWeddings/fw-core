import type { Metadata } from "next";
import "./globals.css";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Suspense } from "react";

import { VersionGuard } from "@/components/VersionGuard";
import { AuthRedirectGuard } from "@/components/AuthRedirectGuard";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Italiana&family=Josefin+Sans:ital,wght@0,300;0,400;0,600;1,400&family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Prata&family=Tenor+Sans&display=swap" 
        />
      </head>
      <body className="bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white transition-colors duration-200" suppressHydrationWarning>
        <AuthRedirectGuard />
        <Suspense fallback={<div className="min-h-screen w-full bg-zinc-50 dark:bg-[#070708]" />}>
          <VersionGuard>
            <SidebarLayout>{children}</SidebarLayout>
          </VersionGuard>
        </Suspense>
      </body>
    </html>
  );
}

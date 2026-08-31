import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Suspense } from "react";
import { VersionGuard } from "@/components/VersionGuard";
import { AuthRedirectGuard } from "@/components/AuthRedirectGuard";
import { WorkspaceProvider } from "@/lib/context/BhamstraContext";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://studiocore.in'),
  title: {
    default: 'Studio Core - Operating System & CRM for Creative Studios',
    template: '%s | Studio Core',
  },
  description: 'Comprehensive business operating system and CRM for photography studios, cinematographers, and event management professionals. Manage leads, quotations, and team operations.',
  alternates: {
    canonical: 'https://studiocore.in',
  },
  openGraph: {
    title: 'Studio Core - Operating System & CRM for Creative Studios',
    description: 'Comprehensive business operating system and CRM for photography studios, cinematographers, and event management professionals.',
    url: 'https://studiocore.in',
    siteName: 'Studio Core',
    type: 'website',
  },
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
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Caveat:wght@400;500;600;700&family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Serif+Display:ital@0;1&family=Great+Vibes&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Italiana&family=Josefin+Sans:ital,wght@0,300;0,400;0,600;1,400&family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Prata&family=Tenor+Sans&display=swap" 
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 1. Chunk load error & deployment mismatch auto-recovery
                  window.addEventListener('error', function(e) {
                    var target = e.target || e.srcElement;
                    var isAsset = target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK');
                    var src = (target && (target.src || target.href)) || '';
                    if (isAsset && src.indexOf('/_next/static/') !== -1) {
                      console.warn('[StudioCore Recovery]: Stale chunk detected after deployment update. Refreshing...');
                      var lastReload = sessionStorage.getItem('sc_chunk_reload');
                      var now = Date.now();
                      if (!lastReload || (now - parseInt(lastReload, 10)) > 8000) {
                        sessionStorage.setItem('sc_chunk_reload', now.toString());
                        window.location.reload();
                      }
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(e) {
                    var reason = e.reason;
                    var msg = (reason && (reason.message || reason.name || '')) || '';
                    if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1 || msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
                      console.warn('[StudioCore Recovery]: ChunkLoadError caught. Refreshing to get latest app version...');
                      var lastReload = sessionStorage.getItem('sc_chunk_reload');
                      var now = Date.now();
                      if (!lastReload || (now - parseInt(lastReload, 10)) > 8000) {
                        sessionStorage.setItem('sc_chunk_reload', now.toString());
                        window.location.reload();
                      }
                    }
                  });
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white transition-colors duration-200" suppressHydrationWarning>
        <AuthRedirectGuard />
        <WorkspaceProvider>
          <Suspense fallback={<div className="min-h-screen w-full bg-zinc-50 dark:bg-[#070708]" />}>
            <VersionGuard>
              <SidebarLayout>{children}</SidebarLayout>
            </VersionGuard>
          </Suspense>
        </WorkspaceProvider>
      </body>
    </html>
  );
}

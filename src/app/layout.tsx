import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Suspense } from "react";
import { VersionGuard } from "@/components/VersionGuard";
import { AuthRedirectGuard } from "@/components/AuthRedirectGuard";
import { WorkspaceProvider } from "@/lib/context/BhamstraContext";
import { WorkspaceDataProvider } from "@/context/WorkspaceDataContext";

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
  other: {
    fast2sms: 'Hy9cjH1qDSJsW6QZlSv4d2ketD4hGR0Y',
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
        <meta name="fast2sms" content="Hy9cjH1qDSJsW6QZlSv4d2ketD4hGR0Y" />
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
                  function safeGet(k) {
                    try { return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage.getItem(k) : null; } catch(_) { return null; }
                  }
                  function safeSet(k, v) {
                    try { if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.setItem(k, v); } catch(_) {}
                  }

                  // 1. Suppress runtime errors from third-party browser extensions (e.g. Urban VPN, ad-blockers)
                  window.addEventListener('error', function(e) {
                    try {
                      var src = (e && (e.filename || (e.error && e.error.stack))) || '';
                      var msg = (e && e.message) || '';
                      if (
                        src.indexOf('chrome-extension://') !== -1 ||
                        src.indexOf('moz-extension://') !== -1 ||
                        msg.indexOf('M_ID') !== -1 ||
                        msg.indexOf('bis_skin_checked') !== -1
                      ) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        return true;
                      }

                      // Production Chunk load error & deployment mismatch auto-recovery
                      var target = e.target || e.srcElement;
                      var isAsset = target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK');
                      var assetSrc = (target && (target.src || target.href)) || '';
                      if (isAsset && assetSrc.indexOf('/_next/static/') !== -1) {
                        var lastReload = safeGet('sc_chunk_reload');
                        var now = Date.now();
                        if (!lastReload || (now - parseInt(lastReload, 10)) > 8000) {
                          safeSet('sc_chunk_reload', now.toString());
                          window.location.reload();
                        }
                      }
                    } catch (_) {}
                  }, true);

                  window.addEventListener('unhandledrejection', function(e) {
                    try {
                      var reason = (e && (e.reason && (e.reason.stack || e.reason.message))) || '';
                      if (
                        reason.indexOf('chrome-extension://') !== -1 ||
                        reason.indexOf('moz-extension://') !== -1 ||
                        reason.indexOf('M_ID') !== -1
                      ) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        return true;
                      }

                      // Production Chunk load error recovery
                      var msg = (e.reason && (e.reason.message || e.reason.name || '')) || '';
                      if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1 || msg.indexOf('Failed to fetch dynamically imported module') !== -1) {
                        var lastReload = safeGet('sc_chunk_reload');
                        var now = Date.now();
                        if (!lastReload || (now - parseInt(lastReload, 10)) > 8000) {
                          safeSet('sc_chunk_reload', now.toString());
                          window.location.reload();
                        }
                      }
                    } catch (_) {}
                  }, true);

                  // 2. Suppress false-positive hydration warnings caused by browser extensions injecting bis_skin_checked into DOM
                  var origConsoleError = console.error;
                  console.error = function() {
                    var args = Array.prototype.slice.call(arguments);
                    var fullText = args.map(function(a) {
                      return (typeof a === 'string' ? a : (a && a.message) || '');
                    }).join(' ');
                    if (
                      fullText.indexOf('bis_skin_checked') !== -1 ||
                      fullText.indexOf('chrome-extension://') !== -1 ||
                      fullText.indexOf("Cannot read properties of undefined (reading 'M_ID')") !== -1
                    ) {
                      return;
                    }
                    return origConsoleError.apply(console, args);
                  };

                  var origConsoleWarn = console.warn;
                  console.warn = function() {
                    var args = Array.prototype.slice.call(arguments);
                    var fullText = args.map(function(a) {
                      return (typeof a === 'string' ? a : (a && a.message) || '');
                    }).join(' ');
                    if (
                      fullText.indexOf('bis_skin_checked') !== -1 ||
                      fullText.indexOf('chrome-extension://') !== -1
                    ) {
                      return;
                    }
                    return origConsoleWarn.apply(console, args);
                  };
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-zinc-50 dark:bg-[#070708] text-zinc-900 dark:text-white transition-colors duration-200" suppressHydrationWarning>
        <AuthRedirectGuard />
        <WorkspaceProvider>
          <WorkspaceDataProvider>
            <Suspense fallback={<div className="min-h-screen w-full bg-zinc-50 dark:bg-[#070708]" />}>
              {process.env.NODE_ENV === 'production' ? (
                <VersionGuard>
                  <SidebarLayout>{children}</SidebarLayout>
                </VersionGuard>
              ) : (
                <SidebarLayout>{children}</SidebarLayout>
              )}
            </Suspense>
          </WorkspaceDataProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}

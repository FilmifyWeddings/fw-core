'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    __startRouteProgress?: () => void;
    __stopRouteProgress?: () => void;
  }
}

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeNavigationRef = useRef<boolean>(false);

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    activeNavigationRef.current = true;
    setIsVisible(true);
    setProgress(28); // 0ms instant tactile visual feedback

    // Trickle progress smoothly
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + Math.random() * 12 + 6;
        if (prev < 80) return prev + Math.random() * 5 + 2;
        if (prev < 92) return prev + Math.random() * 2 + 0.5;
        return prev;
      });
    }, 180);

    // Safety timeout: auto-finish if navigation takes > 8 seconds
    safetyTimeoutRef.current = setTimeout(() => {
      completeProgress();
    }, 8000);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    activeNavigationRef.current = false;

    setProgress(100);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 250);
    }, 200);
  };

  // When pathname or searchParams changes, navigation completed!
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Global listeners for instant click feedback on internal links
  useEffect(() => {
    window.__startRouteProgress = startProgress;
    window.__stopRouteProgress = completeProgress;

    const handleAnchorClick = (event: MouseEvent) => {
      // Ignore modified clicks (cmd/ctrl click for new tab, middle click, etc.)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      // Only handle internal relative or same-origin links
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        (targetAttr && targetAttr !== '_self')
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Don't trigger if it's the exact same URL + hash
        if (url.origin === currentUrl.origin && url.pathname === currentUrl.pathname && url.search === currentUrl.search) {
          return;
        }

        // Only trigger for same origin navigations
        if (url.origin === currentUrl.origin) {
          startProgress();
        }
      } catch (_) {}
    };

    const handleCustomRouteStart = () => {
      startProgress();
    };

    document.addEventListener('click', handleAnchorClick, { capture: true, passive: true });
    window.addEventListener('sc_route_start', handleCustomRouteStart);

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      window.removeEventListener('sc_route_start', handleCustomRouteStart);
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      delete window.__startRouteProgress;
      delete window.__stopRouteProgress;
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[3px] z-[999999] pointer-events-none overflow-hidden transition-opacity duration-200"
      style={{
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 shadow-[0_0_10px_#f59e0b,0_0_5px_#d97706] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}

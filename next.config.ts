import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  
  allowedDevOrigins: ['*.loca.lt', 'loca.lt', '*.lhr.life', 'lhr.life', '*.ngrok-free.dev', 'ngrok-free.dev'],
  
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/_next/image/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
        { key: 'Pragma', value: 'no-cache' },
      ],
    },
  ],

  // Server-side Node.js runtime external packages
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'bufferutil',
    'utf-8-validate',
    'pino',
    '@hapi/boom',
    '@sparticuz/chromium',
    'puppeteer-core',
    'puppeteer',
    'pdf-lib',
    'pdfkit',
    'chromium-bidi',
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@supabase/supabase-js',
      'canvas-confetti',
    ],
  },

  turbopack: {},
};

export default nextConfig;

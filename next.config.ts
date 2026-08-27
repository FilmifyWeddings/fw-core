import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  
  allowedDevOrigins: ['*.loca.lt', 'loca.lt', '*.lhr.life', 'lhr.life', '*.ngrok-free.dev', 'ngrok-free.dev'],
  


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

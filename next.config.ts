import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  
  // External packages must NOT be bundled by Webpack to prevent build hanging
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
};

export default nextConfig;

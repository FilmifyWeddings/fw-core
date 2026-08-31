import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  compress: true,
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    '@sparticuz/chromium',
    'puppeteer-core',
    'sharp',
    'pdf-lib',
    'jspdf',
    'nodemailer',
    'xlsx',
    'pg',
    'pino',
    'bufferutil',
    'utf-8-validate',
  ],
  outputFileTracingRoot: process.cwd(),
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@supabase/supabase-js',
      'recharts',
      'clsx',
      'tailwind-merge',
    ],
  },
};

export default nextConfig;

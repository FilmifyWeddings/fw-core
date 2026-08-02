import type { NextConfig } from "next";

const nextConfig: any = {
  allowedDevOrigins: ['*.loca.lt', 'loca.lt', '*.lhr.life', 'lhr.life', '*.ngrok-free.dev', 'ngrok-free.dev'],
  
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
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
  ],

  turbopack: {},
};

export default nextConfig;

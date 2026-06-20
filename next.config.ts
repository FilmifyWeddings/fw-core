import type { NextConfig } from "next";

const nextConfig: any = {
  allowedDevOrigins: ['*.loca.lt', 'loca.lt', '*.lhr.life', 'lhr.life', '*.ngrok-free.dev', 'ngrok-free.dev'],
  
  // Baileys must run server-side only (Node.js runtime, not Edge/browser)
  // serverExternalPackages tells Next.js NOT to bundle these for SSR —
  // they will be required at runtime from node_modules instead
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'bufferutil',
    'utf-8-validate',
    'pino',
    '@hapi/boom',
  ],


  // Turbopack config (Next.js 16+ default bundler)
  // Mirrors the serverExternalPackages behavior for Turbopack
  turbopack: {},
};

export default nextConfig;


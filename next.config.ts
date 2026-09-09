import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Build ke waqt Type-checking skip (Time 70% bachega)
  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. Heavy Source Maps band (Disk write fast hogi)
  productionBrowserSourceMaps: false,

  // 3. Static Page Generation Fast karne ke liye (Static bailout / skip heavy prerender)
  experimental: {
    // Prevent memory exhaustion on VPS
    cpus: 1, 
  },

  // 4. Images build-time render skip
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

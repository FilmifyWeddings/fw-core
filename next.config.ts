import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Build ke waqt Type-checking aur Linting skip (Time 70% bachega)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Heavy Source Maps band (Disk write fast hogi)
  productionBrowserSourceMaps: false,

  // 3. Static Page Generation Fast karne ke liye (Static bailout / skip heavy prerender)
  experimental: {
    // Multi-core CPU ka full use karega local PC par
    cpus: 4, 
  },

  // 4. Standalone output
  output: "standalone",

  // 5. Images build-time render skip
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

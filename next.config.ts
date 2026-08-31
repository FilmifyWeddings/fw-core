import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {},
  outputFileTracingExcludes: {
    '*': ['**/*proxy*'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@supabase/supabase-js'],
  },
};

export default nextConfig;

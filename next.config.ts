import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
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
    serverActions: {
      bodySizeLimit: '100mb',
    },
    proxyClientMaxBodySize: '100mb',
  },

  // 4. Images build-time render skip
  images: {
    unoptimized: true,
  },

  // 5. Cache prevention for HTML pages to eliminate stale chunk errors across deployments
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/:studioSlug((?!workspace|api|dashboard|admin|login|signup|auth|g|_next)[^/]+)/:coupleSlug/guest-access/:slug',
        destination: '/g/:slug',
      },
      {
        source: '/:studioSlug((?!workspace|api|dashboard|admin|login|signup|auth|g|_next)[^/]+)/:coupleSlug/full-access/:slug',
        destination: '/g/:slug?access=all',
      },
      {
        source: '/:studioSlug((?!workspace|api|dashboard|admin|login|signup|auth|g|_next)[^/]+)/:coupleSlug/selection/:slug',
        destination: '/g/:slug?album_selection=true',
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/terms-of-service',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

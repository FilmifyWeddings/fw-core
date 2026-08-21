import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/privacy-policy',
          '/terms-of-service',
          '/data-deletion',
          '/features',
          '/pricing',
          '/book-demo',
          '/free-trial',
        ],
        disallow: ['/workspace/', '/dashboard/', '/admin/', '/api/'],
      },
      {
        userAgent: ['facebookexternalhit', 'Facebot', 'Meta-ExternalAgent'],
        allow: ['/privacy-policy', '/terms-of-service', '/data-deletion', '/'],
      },
    ],
    sitemap: 'https://studiocore.in/sitemap.xml',
  };
}

import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolvePublicQuotation } from '@/lib/public-quotation';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  if (!id) {
    return {
      title: 'Quotation & Service Proposal | Studio Core',
      description: 'Personalized wedding quotation, packages, deliverables, and event schedule.',
    };
  }

  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'studiocore.in';
    const proto = headersList.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const quote = await resolvePublicQuotation(id);

    const clientName = quote?.clientName || 'Valued Client';
    const eventType = quote?.eventType || 'Wedding';
    const studioName = quote?.studioName || 'Filmify Weddings';
    const title = quote?.title || `${clientName} - ${eventType} Quotation`;
    const description =
      quote?.description ||
      `Personalized ${eventType} Quotation & Service Proposal for ${clientName} crafted by ${studioName}. Review customized packages, deliverables, event schedule, and transparent pricing.`;
    const coverPhoto = quote?.coverPhoto || '';

    const ogImageUrl = `${baseUrl}/workspace/quotations/builder/templet/${id}/opengraph-image`;
    const pageUrl = `${baseUrl}/workspace/quotations/builder/templet/${id}`;

    return {
      title: `${title} | ${studioName}`,
      description,
      alternates: {
        canonical: pageUrl,
      },
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: studioName,
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${title} - Quotation Preview`,
          },
          ...(coverPhoto
            ? [
                {
                  url: coverPhoto,
                  width: 1200,
                  height: 630,
                  alt: `${title} - Cover Photo`,
                },
              ]
            : []),
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl, ...(coverPhoto ? [coverPhoto] : [])],
      },
    };
  } catch (err) {
    console.error('[generateMetadata error in template builder]:', err);
    return {
      title: 'Wedding Quotation & Service Proposal',
      description: 'Personalized wedding quotation, packages, deliverables, and event schedule.',
    };
  }
}

export default function TemplateLayout({ children }: LayoutProps) {
  return <>{children}</>;
}

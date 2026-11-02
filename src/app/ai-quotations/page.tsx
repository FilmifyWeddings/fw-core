import type { Metadata } from 'next';
import { QuotationLandingPage } from '@/components/quotation-landing/QuotationLandingPage';

export const metadata: Metadata = {
  title: 'AI Quotation Studio | StudioCore - Wedding Quotations in 1 Minute',
  description: 'AI-powered, editable and beautifully designed quotations for wedding photographers. Create custom packages, luxury branded designs, and edit & share instantly.',
  openGraph: {
    title: 'StudioCore AI Quotation Studio - Create Wedding Quotations in 1 Minute',
    description: 'AI-powered, editable and beautifully designed wedding photography quotations in 60 seconds.',
    url: 'https://studiocore.in/ai-quotations',
    siteName: 'StudioCore',
    images: [
      {
        url: '/assets/quotation/hero_photographer.png',
        width: 800,
        height: 1000,
        alt: 'StudioCore AI Quotation Studio',
      },
    ],
  },
};

export default function AiQuotationsPage() {
  return <QuotationLandingPage />;
}

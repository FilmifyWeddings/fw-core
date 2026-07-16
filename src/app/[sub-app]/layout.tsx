import type { Metadata } from 'next';
import { SUITE_REGISTRY, type SubAppSlug } from '@/types';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUITE_REGISTRY.apps.map((app) => ({
    'sub-app': app.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ 'sub-app': string }> }): Promise<Metadata> {
  const { 'sub-app': slug } = await params;
  const app = SUITE_REGISTRY.apps.find(a => a.slug === (slug as SubAppSlug));
  
  if (!app) {
    return { title: 'FW Suite' };
  }

  return {
    title: `${app.title} - FW Studio Suite`,
    description: app.description,
  };
}

export default function SubAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

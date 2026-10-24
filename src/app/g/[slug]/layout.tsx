import type { Metadata, ResolvingMetadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  let title = 'Online Gallery';
  let coverImage = 'https://studiocore.in/logo.png';

  try {
    if (slug) {
      let { data: gallery } = await supabaseAdmin
        .from('event_galleries')
        .select('title, cover_url')
        .eq('slug', slug)
        .maybeSingle();

      if (!gallery && slug.includes('-')) {
        const parts = slug.split('-');
        const code = parts[parts.length - 1];
        const couple = parts.slice(0, -1).join('-');
        const { data: gByCouple } = await supabaseAdmin
          .from('event_galleries')
          .select('id, title, cover_url')
          .eq('slug', couple)
          .order('created_at', { ascending: false });
        if (gByCouple && gByCouple.length > 0) {
          gallery = gByCouple.find((e: any) =>
            e.id.replace(/-/g, '').toLowerCase().startsWith(code.toLowerCase())
          ) || gByCouple[0];
        }
      }

      if (!gallery) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUuid) {
          const { data: gById } = await supabaseAdmin
            .from('event_galleries')
            .select('title, cover_url')
            .eq('id', slug)
            .maybeSingle();
          gallery = gById;
        }
      }

      if (gallery) {
        title = gallery.title || 'Online Gallery';
        if (gallery.cover_url) {
          const rawCover = gallery.cover_url.split('#')[0];
          coverImage = rawCover.startsWith('http')
            ? rawCover
            : `https://studiocore.in${rawCover.startsWith('/') ? '' : '/'}${rawCover}`;
        }
      }
    }
  } catch (_) {}

  const description = `Browse the photos from ${title} Online Gallery and Get your photos...`;

  return {
    title: `${title} | Online Gallery`,
    description,
    openGraph: {
      title,
      description,
      siteName: 'studiocore.in',
      url: `https://studiocore.in/g/${slug}`,
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverImage],
    },
  };
}

export default function GuestGalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

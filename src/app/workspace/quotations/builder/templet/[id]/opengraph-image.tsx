import { ImageResponse } from 'next/og';
import { resolvePublicQuotation } from '@/lib/public-quotation';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const alt = 'Quotation Preview';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: ImageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  const quote = id ? await resolvePublicQuotation(id) : null;

  const clientName = quote?.clientName || 'Valued Client';
  const eventType = quote?.eventType || 'Wedding';
  const studioName = quote?.studioName || 'Filmify Weddings';
  const coverPhoto = quote?.coverPhoto || '';
  const eventDate = quote?.eventDate || '';
  const location = quote?.location || '';

  // Safe image pre-fetch and normalize to standard JPEG buffer/data URI using sharp
  let imageSrc: string | null = null;
  if (coverPhoto) {
    try {
      let buffer: Buffer | null = null;
      if (coverPhoto.startsWith('data:image/')) {
        const base64Data = coverPhoto.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        let optimizedPhotoUrl = coverPhoto;
        if (optimizedPhotoUrl.includes('images.unsplash.com')) {
          optimizedPhotoUrl = optimizedPhotoUrl.replace(/&w=\d+/, '') + '&w=600&q=75';
        }
        const res = await fetch(optimizedPhotoUrl, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          buffer = Buffer.from(ab);
        }
      }

      if (buffer && buffer.length > 0) {
        // Convert any format (WebP, HEIC, PNG, etc.) to optimized JPEG for Satori
        const jpgBuffer = await sharp(buffer)
          .resize(500, null, { withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        imageSrc = `data:image/jpeg;base64,${jpgBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('[opengraph-image] Failed to process coverPhoto with sharp:', e);
      imageSrc = null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0F0D0C',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #2A211B 0%, #0F0D0C 75%)',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Luxury Gold Double Border */}
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid rgba(200, 168, 107, 0.45)',
            padding: '32px 48px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Corner Accents */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '16px',
              height: '16px',
              borderTop: '2px solid #C8A86B',
              borderLeft: '2px solid #C8A86B',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '16px',
              height: '16px',
              borderTop: '2px solid #C8A86B',
              borderRight: '2px solid #C8A86B',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              width: '16px',
              height: '16px',
              borderBottom: '2px solid #C8A86B',
              borderLeft: '2px solid #C8A86B',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              width: '16px',
              height: '16px',
              borderBottom: '2px solid #C8A86B',
              borderRight: '2px solid #C8A86B',
              display: 'flex',
            }}
          />

          {/* Left Content Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: imageSrc ? 'flex-start' : 'center',
              width: imageSrc ? '640px' : '100%',
              textAlign: imageSrc ? 'left' : 'center',
            }}
          >
            {/* Event Type Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                border: '1px solid rgba(200, 168, 107, 0.6)',
                backgroundColor: 'rgba(200, 168, 107, 0.12)',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#E8C582',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
              >
                {`${eventType.toUpperCase()} QUOTATION`}
              </span>
            </div>

            {/* Couple / Client Name */}
            <div
              style={{
                display: 'flex',
                fontSize: clientName.length > 25 ? '40px' : '48px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '3px',
                lineHeight: 1.15,
                textTransform: 'uppercase',
                marginBottom: '16px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
              }}
            >
              <span>{clientName}</span>
            </div>

            {/* Studio Branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#C8A86B',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
              >
                {`Crafted by ${studioName}`}
              </span>
            </div>

            {/* Event Details (Date & Location) */}
            {(eventDate || location) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  color: '#A8A29E',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: '24px',
                }}
              >
                {eventDate && <span>{eventDate}</span>}
                {eventDate && location && <span>•</span>}
                {location && <span>{location}</span>}
              </div>
            )}

            {/* Call to action bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 22px',
                borderRadius: '12px',
                backgroundColor: 'rgba(200, 168, 107, 0.18)',
                border: '1px solid rgba(200, 168, 107, 0.4)',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#E8C582',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                View Personalized Proposal & Pricing
              </span>
            </div>
          </div>

          {/* Right Area: Quotation First Page Photo / Arch Preview */}
          {imageSrc ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                width: '380px',
                height: '490px',
              }}
            >
              {/* Arch Frame */}
              <div
                style={{
                  width: '360px',
                  height: '470px',
                  borderRadius: '180px 180px 18px 18px',
                  border: '3px solid #C8A86B',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1E1916',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 20px rgba(200, 168, 107, 0.3)',
                  position: 'relative',
                }}
              >
                <img
                  src={imageSrc}
                  alt={clientName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                border: '2px solid rgba(200, 168, 107, 0.5)',
                backgroundColor: 'rgba(200, 168, 107, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#E8C582',
                  fontWeight: 800,
                  letterSpacing: '4px',
                }}
              >
                <span>{`${clientName.split(' ')[0]?.[0] || 'W'} & ${clientName.split('&')?.[1]?.trim()?.[0] || 'Q'}`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  );
}

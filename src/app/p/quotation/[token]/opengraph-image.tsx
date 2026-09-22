import { ImageResponse } from 'next/og';
import { resolvePublicQuotation } from '@/lib/public-quotation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const alt = 'Quotation Preview';
export const size = {
  width: 800,
  height: 800,
};
export const contentType = 'image/png';

interface ImageProps {
  params: Promise<{ token: string }>;
}

async function getSharp(): Promise<any> {
  try {
    // Prefer Next's internal sharp instance to prevent dual libvips DLL conflicts on Windows
    return (await import('next/node_modules/sharp')).default;
  } catch {
    return (await import('sharp')).default;
  }
}

export default async function Image({ params }: ImageProps) {
  const resolvedParams = await Promise.resolve(params);
  const token = resolvedParams?.token;

  const quote = token ? await resolvePublicQuotation(token) : null;

  const coupleName = (quote?.coupleName || quote?.clientName || 'Valued Client').toUpperCase();
  const eventType = (quote?.eventType || 'Wedding').toUpperCase();
  const brandName = (quote?.brandName || quote?.studioName || 'Filmify Weddings').toUpperCase();
  const brandLogoUrl = quote?.brandLogoUrl || '';
  const brandLogoSize = quote?.brandLogoSize || 64;
  const subtitleText = quote?.subtitleText || '';
  const coverPhoto = quote?.coverPhoto || '';
  const frameShape = quote?.frameShape || 'arch';
  const photoWidth = quote?.photoWidth || 92;
  const photoFocalY = quote?.photoFocalY !== undefined ? quote.photoFocalY : 50;
  const bgOpacity = quote?.bgOpacity !== undefined ? quote.bgOpacity : 25;
  const pageBgColor = quote?.pageBgColor || '#F0EDE5';
  const textColor = quote?.textColor || '#004643';
  const kickerColor = quote?.kickerColor || quote?.textColor || '#004643';

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
          optimizedPhotoUrl = optimizedPhotoUrl.replace(/&w=\d+/, '') + '&w=800&q=80';
        }
        const res = await fetch(optimizedPhotoUrl, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          buffer = Buffer.from(ab);
        }
      }

      if (buffer && buffer.length > 0) {
        const sharpInstance = await getSharp();
        const jpgBuffer = await sharpInstance(buffer)
          .flatten({ background: pageBgColor })
          .resize(800, null, { withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        imageSrc = `data:image/jpeg;base64,${jpgBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('[opengraph-image] Failed to process coverPhoto with sharp:', e);
      imageSrc = null;
    }
  }

  // Safe brand logo pre-fetch and normalize using sharp
  let brandLogoSrc: string | null = null;
  if (brandLogoUrl) {
    try {
      let logoBuffer: Buffer | null = null;
      if (brandLogoUrl.startsWith('data:image/')) {
        const base64Data = brandLogoUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        logoBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const res = await fetch(brandLogoUrl, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          logoBuffer = Buffer.from(ab);
        }
      }
      if (logoBuffer && logoBuffer.length > 0) {
        const sharpInstance = await getSharp();
        const pngBuffer = await sharpInstance(logoBuffer)
          .resize(null, 80, { withoutEnlargement: true })
          .png()
          .toBuffer();
        brandLogoSrc = `data:image/png;base64,${pngBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('[opengraph-image] Failed to process brandLogoUrl:', e);
      brandLogoSrc = null;
    }
  }

  const calculatedPhotoWidth = Math.round(800 * (Math.min(photoWidth, 100) / 100));
  const archRadius = `${Math.round(calculatedPhotoWidth / 2)}px`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '800px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: imageSrc && frameShape !== 'background' ? 'space-between' : 'center',
          backgroundColor: pageBgColor,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '50px',
          fontFamily: 'serif',
        }}
      >
        {/* If frameShape === 'background', render full background photo */}
        {imageSrc && frameShape === 'background' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '800px',
              height: '800px',
              display: 'flex',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            <img
              src={imageSrc}
              alt="Cover Background"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `50% ${photoFocalY}%`,
                opacity: (bgOpacity || 25) / 100,
              }}
            />
          </div>
        )}

        {/* Top Text / Typography Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            paddingLeft: '32px',
            paddingRight: '32px',
            boxSizing: 'border-box',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          {/* Couple Name */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                color: textColor,
                fontSize: coupleName.length > 20 ? '36px' : '48px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 900,
                textAlign: 'center',
              }}
            >
              {coupleName}
            </span>
          </div>

          {/* Event Type Quotation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <span
              style={{
                color: textColor,
                fontSize: '16px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {`${eventType} QUOTATION`}
            </span>
          </div>

          {/* Brand Name or Logo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            {brandLogoSrc ? (
              <img
                src={brandLogoSrc}
                alt={brandName}
                style={{
                  height: `${Math.min(brandLogoSize || 48, 56)}px`,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <span
                style={{
                  color: textColor,
                  fontSize: '18px',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  textAlign: 'center',
                }}
              >
                {brandName}
              </span>
            )}
          </div>

          {/* Subtitle (Side Option & Location) */}
          {subtitleText ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  color: kickerColor,
                  fontSize: '13px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  opacity: 0.9,
                  textAlign: 'center',
                }}
              >
                {subtitleText}
              </span>
            </div>
          ) : null}
        </div>

        {/* Bottom Photo (when not background) */}
        {imageSrc && frameShape !== 'background' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              width: '100%',
              marginTop: '12px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: frameShape === 'full-width' ? '800px' : `${calculatedPhotoWidth}px`,
                height: '490px',
                overflow: 'hidden',
                borderTopLeftRadius: frameShape === 'arch' ? archRadius : frameShape === 'rounded' ? '28px' : '0px',
                borderTopRightRadius: frameShape === 'arch' ? archRadius : frameShape === 'rounded' ? '28px' : '0px',
                borderBottomLeftRadius: '0px',
                borderBottomRightRadius: '0px',
                backgroundColor: 'transparent',
              }}
            >
              <img
                src={imageSrc}
                alt="Wedding Couple"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: `50% ${photoFocalY}%`,
                }}
              />
            </div>
          </div>
        )}
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

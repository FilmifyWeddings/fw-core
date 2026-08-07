import React from 'react';
import { BirdsSVG, MonogramSVG } from '@/components/QuotationSVGs';

export const COLOR_THEMES: Record<string, any> = {
  'cream-cherry-red': { id: 'cream-cherry-red', name: 'Cream & Cherry Red (Inverted)', primary: '#FBFCEB', background: '#750505', text: '#FBFCEB', kicker: '#FFECD1', borderColor: 'rgba(251, 252, 235, 0.25)', boxBgColor: 'rgba(251, 252, 235, 0.08)', isDark: true },
  'cyprus-sand-dune': { id: 'cyprus-sand-dune', name: 'Cyprus & Sand Dune', primary: '#004643', background: '#F0EDE5', text: '#004643', kicker: '#004643', borderColor: 'rgba(0, 70, 67, 0.2)', boxBgColor: 'rgba(0, 70, 67, 0.06)' },
  'sand-dune-cyprus': { id: 'sand-dune-cyprus', name: 'Sand Dune & Cyprus (Inverted)', primary: '#F0EDE5', background: '#004643', text: '#F0EDE5', kicker: '#E6CFA7', borderColor: 'rgba(240, 237, 229, 0.25)', boxBgColor: 'rgba(240, 237, 229, 0.08)', isDark: true },
  'plum-milk': { id: 'plum-milk', name: 'Plum & Milk', primary: '#381932', background: '#FFF3E6', text: '#381932', kicker: '#381932', borderColor: 'rgba(56, 25, 50, 0.2)', boxBgColor: 'rgba(56, 25, 50, 0.06)' },
  'milk-plum': { id: 'milk-plum', name: 'Milk & Plum (Inverted)', primary: '#FFF3E6', background: '#381932', text: '#FFF3E6', kicker: '#FFECD1', borderColor: 'rgba(255, 243, 230, 0.25)', boxBgColor: 'rgba(255, 243, 230, 0.08)', isDark: true },
  'sand-chocolate': { id: 'sand-chocolate', name: 'Sand & Chocolate', primary: '#3E000C', background: '#FFECD1', text: '#3E000C', kicker: '#3E000C', borderColor: 'rgba(62, 0, 12, 0.2)', boxBgColor: 'rgba(62, 0, 12, 0.06)' },
  'chocolate-sand': { id: 'chocolate-sand', name: 'Chocolate & Sand (Inverted)', primary: '#FFECD1', background: '#3E000C', text: '#FFECD1', kicker: '#FFECD1', borderColor: 'rgba(255, 236, 209, 0.25)', boxBgColor: 'rgba(255, 236, 209, 0.08)', isDark: true },
  'feldgrau-wheat': { id: 'feldgrau-wheat', name: 'Feldgrau & Wheat', primary: '#3A4B41', background: '#E6CFA7', text: '#3A4B41', kicker: '#3A4B41', borderColor: 'rgba(58, 75, 65, 0.2)', boxBgColor: 'rgba(58, 75, 65, 0.06)' },
  'wheat-feldgrau': { id: 'wheat-feldgrau', name: 'Wheat & Feldgrau (Inverted)', primary: '#E6CFA7', background: '#3A4B41', text: '#E6CFA7', kicker: '#E6CFA7', borderColor: 'rgba(230, 207, 167, 0.25)', boxBgColor: 'rgba(230, 207, 167, 0.08)', isDark: true },
  'noctis-marigold': { id: 'noctis-marigold', name: 'Noctis & Marigold', primary: '#1F2235', background: '#E3A419', text: '#1F2235', kicker: '#1F2235', borderColor: 'rgba(31, 34, 53, 0.2)', boxBgColor: 'rgba(31, 34, 53, 0.08)' },
  'marigold-noctis': { id: 'marigold-noctis', name: 'Marigold & Noctis (Inverted)', primary: '#E3A419', background: '#1F2235', text: '#E3A419', kicker: '#E3A419', borderColor: 'rgba(227, 164, 25, 0.25)', boxBgColor: 'rgba(227, 164, 25, 0.08)', isDark: true },
  'champagne-obsidian': { id: 'champagne-obsidian', name: 'Champagne & Obsidian', primary: '#111111', background: '#F7F4EF', text: '#111111', kicker: '#71717A', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'obsidian-champagne': { id: 'obsidian-champagne', name: 'Obsidian & Champagne (Inverted)', primary: '#F7F4EF', background: '#111111', text: '#F7F4EF', kicker: '#D4D4D8', borderColor: 'rgba(247, 244, 239, 0.25)', boxBgColor: 'rgba(247, 244, 239, 0.08)', isDark: true },
  'forest-olive-ivory': { id: 'forest-olive-ivory', name: 'Forest Olive & Ivory', primary: '#2C352E', background: '#F2EFE9', text: '#2C352E', kicker: '#58695C', borderColor: 'rgba(44, 53, 46, 0.2)', boxBgColor: 'rgba(44, 53, 46, 0.06)' },
  'ivory-forest-olive': { id: 'ivory-forest-olive', name: 'Ivory & Forest Olive (Inverted)', primary: '#F2EFE9', background: '#2C352E', text: '#F2EFE9', kicker: '#E2DFD9', borderColor: 'rgba(242, 239, 233, 0.25)', boxBgColor: 'rgba(242, 239, 233, 0.08)', isDark: true },
  'airy-white': { id: 'airy-white', name: 'Airy White Minimalist', primary: '#27272A', background: '#FFFFFF', text: '#27272A', kicker: '#A1A1AA', borderColor: 'rgba(228, 228, 231, 1)', boxBgColor: 'rgba(244, 244, 245, 1)' },
  'royal-gold': { id: 'royal-gold', name: 'Royal Gold & Cream', primary: '#8A6D2F', background: '#FFF8EA', text: '#8A6D2F', kicker: '#8A6D2F', borderColor: 'rgba(138, 109, 47, 0.25)', boxBgColor: 'rgba(138, 109, 47, 0.08)' },
  'dark-studio': { id: 'dark-studio', name: 'Dark Studio Gold', primary: '#F3F4F6', background: '#141622', text: '#F3F4F6', kicker: '#E5C365', borderColor: '#232634', boxBgColor: '#0F1017', isDark: true }
};

export function getThemeFromKey(key: any) {
  if (!key) return COLOR_THEMES['cyprus-sand-dune'];
  if (typeof key === 'object') {
    if (key.primary && key.background) return key;
    key = key.name || key.id || '';
  }
  const strKey = String(key).trim();
  if (COLOR_THEMES[strKey]) return COLOR_THEMES[strKey];
  const lowerKey = strKey.toLowerCase();
  for (const val of Object.values(COLOR_THEMES)) {
    if (val.id.toLowerCase() === lowerKey || val.name.toLowerCase() === lowerKey) {
      return val;
    }
  }
  return COLOR_THEMES['cyprus-sand-dune'];
}

function chunkArray<T>(arr: T[] | undefined | null, size: number): T[][] {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function SectionImageRenderer({
  photo,
  frameShape,
  photoHeight,
  photoWidth,
  photoFocalY,
  bgOpacity,
  pageBgColor,
  altText = 'Section Photo'
}: any) {
  if (!photo) return null;

  const focalY = photoFocalY !== undefined ? photoFocalY : 50;
  const heightPx = photoHeight || 450;
  const widthPercent = photoWidth || 75;

  if (frameShape === 'background') {
    const opacityVal = (bgOpacity !== undefined ? bgOpacity : 40) / 100;
    return (
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          backgroundColor: pageBgColor || '#FFFFFF'
        }}
      >
        <img 
          src={photo} 
          alt={altText} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `50% ${focalY}%`,
            display: 'block',
            opacity: opacityVal,
            position: 'absolute',
            inset: 0,
            zIndex: 0
          }} 
        />
      </div>
    );
  }

  if (frameShape === 'full-width') {
    return (
      <div style={{ width: '100%', overflow: 'visible', margin: '24px 0 16px 0' }}>
        <img 
          src={photo} 
          alt={altText} 
          style={{
            width: '100%',
            height: `${heightPx}px`,
            objectFit: 'cover',
            objectPosition: `50% ${focalY}%`,
            display: 'block',
            border: 'none'
          }} 
        />
      </div>
    );
  }

  let borderRadius = '12px';
  if (frameShape === 'pill') borderRadius = '9999px';
  if (frameShape === 'arch') borderRadius = '999px 999px 0 0';
  if (frameShape === 'oval') borderRadius = '50%';
  if (frameShape === 'rectangle') borderRadius = '0px';

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
      <div 
        style={{
          width: `${widthPercent}%`,
          height: `${heightPx}px`,
          overflow: 'hidden',
          borderRadius
        }}
      >
        <img 
          src={photo} 
          alt={altText} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `50% ${focalY}%`,
            display: 'block',
            border: 'none'
          }} 
        />
      </div>
    </div>
  );
}

export default function QuotationDocumentCanvas({ documentData }: { documentData: any }) {
  const data = documentData || {};
  const activeTheme = getThemeFromKey(data.theme);
  const pageBgColor = activeTheme.background;
  const textColor = activeTheme.text;
  const primaryFont = data.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = data.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  const defaultSequence = [
    { id: 'cover', type: 'cover', label: 'Cover Page' },
    { id: 'aboutUs', type: 'aboutUs', label: 'About Us' },
    { id: 'shootDetails', type: 'shootDetails', label: 'Pre-Wedding Shoot' },
    { id: 'functionsPage', type: 'functionsPage', label: 'Functions & Coverage' },
    { id: 'deliverablesPage', type: 'deliverablesPage', label: 'Deliverables' },
    { id: 'specialValueAdditions', type: 'specialValueAdditions', label: 'Special Value Additions' },
    { id: 'pricingPage', type: 'pricingPage', label: 'Pricing Details' },
    { id: 'paymentTermsPage', type: 'paymentTermsPage', label: 'Payment Terms & Schedule' },
    { id: 'addOnsPage', type: 'addOnsPage', label: 'Add-Ons & Upgrades' },
    { id: 'termsPage', type: 'termsPage', label: 'Terms & Conditions' },
    { id: 'thankYouPage', type: 'thankYouPage', label: 'Thank You Page' }
  ];

  const pageSequence = data.pageSequence || defaultSequence;

  return (
    <div id="quotation-full-canvas" style={{ width: '794px', minWidth: '794px', maxWidth: '794px', background: '#ffffff', margin: '0 auto' }}>
      {pageSequence.map((pageItem: any, pIdx: number) => {
        const isLastPage = pIdx === pageSequence.length - 1;

        return (
          <React.Fragment key={pageItem.id || pIdx}>
            {pageItem.type === 'cover' && data.cover && (
              <section 
                className="quotation-page quotation-canvas-page"
                style={{
                  width: '794px', minWidth: '794px', maxWidth: '794px',
                  height: '1123px', minHeight: '1123px', maxHeight: '1123px',
                  boxSizing: 'border-box', position: 'relative', overflow: 'hidden', margin: '0 auto',
                  backgroundColor: pageBgColor, color: textColor, fontFamily: secondaryFont,
                  pageBreakAfter: isLastPage ? 'avoid' : 'always', breakAfter: isLastPage ? 'avoid' : 'always'
                }}
              >
                {data.cover.photoUrl && data.cover.frameShape === 'background' && (
                  <SectionImageRenderer
                    photo={data.cover.photoUrl} frameShape="background"
                    photoHeight={data.cover.photoHeight} photoWidth={data.cover.photoWidth}
                    photoFocalY={data.cover.photoFocalY} bgOpacity={data.cover.bgOpacity}
                    pageBgColor={pageBgColor} altText="Cover Background"
                  />
                )}

                <div 
                  style={{
                    position: 'relative', zIndex: 10, margin: '0 auto', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
                    paddingTop: '56px', paddingBottom: '56px',
                    paddingLeft: data.cover.frameShape === 'full-width' || data.cover.imagePosition === 'full' ? '0px' : '48px',
                    paddingRight: data.cover.frameShape === 'full-width' || data.cover.imagePosition === 'full' ? '0px' : '48px',
                    justifyContent: !data.cover.photoUrl ? 'center' : 'space-between', alignItems: 'center'
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto 0' }}>
                    {data.cover.photoUrl && data.cover.frameShape !== 'background' && data.cover.imagePosition === 'top' && (
                      <SectionImageRenderer
                        photo={data.cover.photoUrl} frameShape={data.cover.frameShape}
                        photoHeight={data.cover.photoHeight} photoWidth={data.cover.photoWidth}
                        photoFocalY={data.cover.photoFocalY} altText="Wedding Couple"
                      />
                    )}

                    <div style={{ paddingLeft: data.cover.frameShape === 'full-width' ? '48px' : '0px', paddingRight: data.cover.frameShape === 'full-width' ? '48px' : '0px' }}>
                      <h1 style={{ fontSize: '48px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 900, lineHeight: 1.2, color: textColor, fontFamily: primaryFont, margin: 0 }}>
                        {data.cover.coupleName !== undefined ? data.cover.coupleName : (data.cover.groomName ? `${data.cover.groomName} & ${data.cover.brideName}` : 'YASH & TWINKLE')}
                      </h1>
                      <h3 style={{ fontSize: '16px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: textColor, fontFamily: primaryFont, marginTop: '12px', marginBottom: 0 }}>
                        {`${(data.cover.eventType || 'WEDDING').toUpperCase()} QUOTATION`}
                      </h3>
                    </div>

                    {data.cover.photoUrl && data.cover.frameShape !== 'background' && (data.cover.imagePosition === 'center' || !data.cover.imagePosition) && (
                      <SectionImageRenderer
                        photo={data.cover.photoUrl} frameShape={data.cover.frameShape}
                        photoHeight={data.cover.photoHeight} photoWidth={data.cover.photoWidth}
                        photoFocalY={data.cover.photoFocalY} altText="Wedding Couple"
                      />
                    )}

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }}>
                      {data.cover.brandLogoUrl ? (
                        <img src={data.cover.brandLogoUrl} alt="Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block' }} />
                      ) : (
                        <BirdsSVG textColor={textColor} />
                      )}
                      <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: textColor, margin: '8px 0 0 0' }}>
                        {data.cover.brandName || 'FILMIFY WEDDINGS'}
                      </p>
                      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8, color: textColor, margin: '4px 0 0 0' }}>
                        {`${data.cover.eventDate || 'DECEMBER 2026'} • ${data.cover.location || 'MUMBAI'}`}
                      </p>
                    </div>

                    {data.cover.photoUrl && data.cover.frameShape !== 'background' && data.cover.imagePosition === 'bottom' && (
                      <SectionImageRenderer
                        photo={data.cover.photoUrl} frameShape={data.cover.frameShape}
                        photoHeight={data.cover.photoHeight} photoWidth={data.cover.photoWidth}
                        photoFocalY={data.cover.photoFocalY} altText="Wedding Couple"
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ABOUT US SECTION */}
            {pageItem.type === 'aboutUs' && data.aboutUs && (
              <section 
                className="quotation-page quotation-canvas-page"
                style={{
                  width: '794px', minWidth: '794px', maxWidth: '794px',
                  height: '1123px', minHeight: '1123px', maxHeight: '1123px',
                  boxSizing: 'border-box', position: 'relative', overflow: 'hidden', margin: '0 auto',
                  padding: '56px 48px', backgroundColor: pageBgColor, color: textColor, fontFamily: secondaryFont,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  pageBreakAfter: isLastPage ? 'avoid' : 'always', breakAfter: isLastPage ? 'avoid' : 'always'
                }}
              >
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: textColor, margin: 0 }}>
                      {data.aboutUs.kicker || 'CREATIVE FILMMAKERS'}
                    </p>
                    <h2 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: primaryFont, color: textColor, marginTop: '8px', marginBottom: 0 }}>
                      {data.aboutUs.heading || 'ABOUT US'}
                    </h2>
                  </div>

                  <p style={{ fontSize: '14px', lineHeight: 1.8, opacity: 0.9, textAlign: 'center', maxWidth: '640px', margin: '0 auto 24px auto', color: textColor }}>
                    {data.aboutUs.text || 'We capture stories that move hearts. Every smile, every tear, and every timeless moment.'}
                  </p>

                  {data.aboutUs.photoUrl && (
                    <SectionImageRenderer
                      photo={data.aboutUs.photoUrl} frameShape={data.aboutUs.frameShape || 'pill'}
                      photoHeight={data.aboutUs.photoHeight || 420} photoWidth={data.aboutUs.photoWidth || 75}
                      photoFocalY={data.aboutUs.photoFocalY} altText="About Us Studio"
                    />
                  )}
                </div>

                <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: `1px solid ${activeTheme.borderColor || 'rgba(0,0,0,0.1)'}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: textColor, margin: 0 }}>
                    {data.cover?.brandName || 'FILMIFY WEDDINGS'}
                  </p>
                </div>
              </section>
            )}

            {/* THANK YOU PAGE */}
            {pageItem.type === 'thankYouPage' && (
              <section 
                className="quotation-page quotation-canvas-page"
                style={{
                  width: '794px', minWidth: '794px', maxWidth: '794px',
                  height: '1123px', minHeight: '1123px', maxHeight: '1123px',
                  boxSizing: 'border-box', position: 'relative', overflow: 'hidden', margin: '0 auto',
                  padding: '56px 48px', backgroundColor: pageBgColor, color: textColor, fontFamily: secondaryFont,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                  pageBreakAfter: isLastPage ? 'avoid' : 'always', breakAfter: isLastPage ? 'avoid' : 'always'
                }}
              >
                <div style={{ margin: 'auto 0' }}>
                  <BirdsSVG textColor={textColor} />
                  <h2 style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: primaryFont, color: textColor, marginTop: '24px', marginBottom: '12px' }}>
                    {data.thankYouPage?.heading || 'THANK YOU'}
                  </h2>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, opacity: 0.9, maxWidth: '560px', margin: '0 auto 24px auto', color: textColor }}>
                    {data.thankYouPage?.message || 'We would be honored to document your wedding day.'}
                  </p>

                  {data.thankYouPage?.contactEmail && (
                    <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', color: textColor, margin: '6px 0' }}>
                      {data.thankYouPage.contactEmail}
                    </p>
                  )}
                  {data.thankYouPage?.contactPhone && (
                    <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.15em', color: textColor, margin: '6px 0' }}>
                      {data.thankYouPage.contactPhone}
                    </p>
                  )}
                </div>
              </section>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

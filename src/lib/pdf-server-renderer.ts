import React from 'react';
import QuotationDocumentCanvas from '@/components/QuotationDocumentCanvas';
import { getThemeFromKey } from '@/lib/quotation-theme';

/**
 * Next.js 16 Compliant Server Renderer.
 * Uses dynamic runtime require('react-dom/server') to render QuotationDocumentCanvas to static HTML markup
 * without triggering Turbopack static import restrictions during build time.
 */
export function renderQuotationReactComponentToHTML(documentData: any): string {
  const data = documentData || {};
  const activeTheme = getThemeFromKey(data.theme);
  const primaryFont = data.primaryFont || "'Cormorant Garamond', serif";
  const secondaryFont = data.secondaryFont || "'Plus Jakarta Sans', sans-serif";

  let bodyMarkup = '';
  try {
    const reactDomServer = eval("require('react-dom/server')");
    bodyMarkup = reactDomServer.renderToStaticMarkup(
      React.createElement(QuotationDocumentCanvas, { documentData: data })
    );
  } catch (e) {
    console.error('[Next.js 16 Server Renderer Error]:', e);
  }

  let embeddedFontsCSS = '';
  try {
    const nodeReq = eval('require');
    const fs = nodeReq('fs');
    const path = nodeReq('path');
    const customFontsDir = path.join(process.cwd(), 'public', 'custom-fonts');
    if (fs.existsSync(customFontsDir)) {
      const files = fs.readdirSync(customFontsDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        let mime = 'font/ttf';
        let format = 'truetype';
        if (ext === '.otf') { mime = 'font/otf'; format = 'opentype'; }
        else if (ext === '.woff2') { mime = 'font/woff2'; format = 'woff2'; }
        else if (ext === '.woff') { mime = 'font/woff'; format = 'woff'; }

        const fontPath = path.join(customFontsDir, file);
        const fileBuf = fs.readFileSync(fontPath);
        const base64 = fileBuf.toString('base64');
        const dataUri = `data:${mime};charset=utf-8;base64,${base64}`;

        const baseName = file.replace(/\.[^/.]+$/, '');
        embeddedFontsCSS += `
          @font-face {
            font-family: '${baseName}';
            src: url('${dataUri}') format('${format}');
            font-weight: normal;
            font-style: normal;
            font-display: block;
          }
        `;
      }
    }
  } catch (e) {}

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=794, initial-scale=1" />
    <title>${data.designName || 'Quotation Export'} - PDF</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cinzel:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Italiana&family=Josefin+Sans:wght@300;400;600;700&family=Marcellus&family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Prata&family=Tenor+Sans&display=swap" rel="stylesheet" />
    <style>
      ${embeddedFontsCSS}

      @page {
        size: 794px 1123px;
        margin: 0;
      }

      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body, html {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 794px !important;
      }

      #quotation-full-canvas {
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        margin: 0 auto !important;
        background: #ffffff !important;
      }

      .pdf-page, .quotation-page, .quotation-canvas-page, section {
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        height: 1123px !important;
        min-height: 1123px !important;
        max-height: 1123px !important;
        position: relative !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        page-break-after: always !important;
        break-after: always !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .pdf-page:last-child, .quotation-page:last-child, .quotation-canvas-page:last-child, section:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      img {
        display: block !important;
        max-width: 100% !important;
        object-fit: cover !important;
      }
    </style>
  </head>
  <body>
    ${bodyMarkup}
  </body>
</html>`;
}

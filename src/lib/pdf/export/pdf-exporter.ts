import { PDFDocumentPayload } from '../types';
import { assembleSinglePageHtml } from '../renderer/html-assembler';
import { launchPDFBrowser, renderSinglePageToBuffer } from '../renderer/puppeteer-renderer';
import { sanitizeHtmlText } from '../utils/css-sanitizer';

/**
 * Assembles a unified multi-page HTML document when all pages share uniform dimensions.
 */
function assembleMultiPageHtml(payload: PDFDocumentPayload): string {
  const cleanTitle = sanitizeHtmlText(payload.title || 'Document');
  const pages = payload.pages;
  const firstPage = pages[0] || { width: 794, height: 1123 };

  const pageCssRules = pages.map((p, idx) => `
    @page :nth(${idx + 1}) {
      size: ${p.width}px ${p.height}px;
      margin: 0;
    }
  `).join('\n');

  const pagesMarkup = pages.map((p) => `
    <div class="pdf-page-container" style="width: ${p.width}px; height: ${p.height}px; page-break-after: always; break-after: page; overflow: hidden; margin: 0 auto;">
      ${sanitizeHtmlText(p.html)}
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${cleanTitle}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

      ${pageCssRules}

      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff;
      }

      .pdf-page-container {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }

      img, svg {
        max-width: 100%;
        transform-box: fill-box !important;
      }

      .no-print, button {
        display: none !important;
      }
    </style>
  </head>
  <body>
    ${pagesMarkup}
  </body>
</html>`;
}

/**
 * High-level export service to generate PDF buffer for any document payload.
 */
export async function exportPDFDocument(payload: PDFDocumentPayload): Promise<Uint8Array> {
  if (!payload.pages || !payload.pages.length) {
    throw new Error('PDF Export Payload contains zero pages');
  }

  const browser = await launchPDFBrowser();
  try {
    // Single page document export
    if (payload.pages.length === 1) {
      const pagePayload = payload.pages[0];
      const singlePageHtml = assembleSinglePageHtml(pagePayload, payload.title);
      return await renderSinglePageToBuffer(
        browser,
        singlePageHtml,
        pagePayload.width || 794,
        pagePayload.height || 1123
      );
    }

    // Multi-page document export
    const multiPageHtml = assembleMultiPageHtml(payload);
    const page = await browser.newPage();

    const firstPage = payload.pages[0];
    await page.setViewport({
      width: firstPage.width || 794,
      height: firstPage.height || 1123,
      deviceScaleFactor: 2,
    });

    await page.setContent(multiPageHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for fonts and images
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    await page.close();
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

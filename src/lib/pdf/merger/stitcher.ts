import { PDFDocumentPayload } from '../types';
import { FontManager } from '../fonts/manager';
import { AssetPreloader } from '../assets/preloader';
import { PDF_ENGINE_CONFIG } from '../config';
import { PDFLogger } from '../utils/logger';

export class PDFStitcher {
  static async renderMultiPageDocument(
    browserWrapper: any,
    payload: PDFDocumentPayload
  ): Promise<Uint8Array> {
    const browser = browserWrapper.browser;
    const pages = payload.pages;

    PDFLogger.info(`Beginning single continuous PDF canvas rendering for ${pages.length} section(s)...`);

    const combinedPagesHtml = pages
      .map(
        (pageData, idx) => `
      <section id="section-${idx + 1}">
        ${pageData.html}
      </section>`
      )
      .join('\n');

    const fullDocumentHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${payload.title || 'Quotation Document'}</title>
    <style>
      ${FontManager.getFontEmbedCss()}

      @page {
        margin: 0;
      }

      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
        width: 794px !important;
        height: auto !important;
        min-height: 0 !important;
      }

      #quotation-document {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 794px !important;
      }

      #quotation-document section {
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        overflow: visible !important;
        display: block !important;
        page-break-after: unset !important;
        break-after: auto !important;
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
    <div id="quotation-document">
      ${combinedPagesHtml}
    </div>
  </body>
</html>`;

    const page = await browser.newPage();
    try {
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: PDF_ENGINE_CONFIG.deviceScaleFactor,
      });

      await page.setContent(fullDocumentHtml, {
        waitUntil: 'networkidle0',
        timeout: PDF_ENGINE_CONFIG.renderTimeoutMs,
      });

      await FontManager.synchronizeFontReadiness(page);
      await AssetPreloader.preloadAllPageAssets(page);

      await page.evaluate(async () => {
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      const { totalWidth, totalHeight } = await page.evaluate(() => {
        const doc = document.querySelector('#quotation-document') || document.body;
        const rect = doc.getBoundingClientRect();
        return {
          totalWidth: Math.ceil(rect.width) || 794,
          totalHeight: Math.ceil(rect.height) || 1123,
        };
      });

      PDFLogger.info(`[Single PDF Canvas Metrics] Measured Total Document Width=${totalWidth}px, Height=${totalHeight}px`);

      const continuousPdfBuffer = await page.pdf({
        printBackground: true,
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        preferCSSPageSize: false,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      return continuousPdfBuffer;
    } finally {
      await page.close();
    }
  }
}

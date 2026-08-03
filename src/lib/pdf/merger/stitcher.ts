import { PDFDocumentPayload, PDFPagePayload } from '../types';
import { HTMLAssembler } from '../renderer/assembler';
import { FontManager } from '../fonts/manager';
import { AssetPreloader } from '../assets/preloader';
import { PDF_ENGINE_CONFIG } from '../config';

export class PDFStitcher {
  static async renderMultiPageDocument(
    browserWrapper: any,
    payload: PDFDocumentPayload
  ): Promise<Uint8Array> {
    const browser = browserWrapper.browser;
    const pages = payload.pages;

    if (pages.length === 1) {
      const pageData = pages[0];
      const html = HTMLAssembler.assemblePageHTML(pageData, payload.title);
      return await PDFStitcher.renderSinglePageBuffer(browser, html, pageData.width || 794, pageData.height || 1123);
    }

    // Build unified multi-page document matching per-page distinct scroll dimensions
    const pageCssRules = pages.map((p, idx) => `
      @page :nth(${idx + 1}) {
        size: ${p.width || 794}px ${p.height || 1123}px;
        margin: 0;
      }
    `).join('\n');

    const pagesMarkup = pages.map((p) => `
      <div class="pdf-page-container" style="width: ${p.width || 794}px; height: ${p.height || 1123}px; page-break-after: always; break-after: page; overflow: hidden; margin: 0 auto;">
        ${p.html}
      </div>
    `).join('\n');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${payload.title || 'Document'}</title>
    <style>
      ${FontManager.getFontEmbedCss()}
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

    const page = await browser.newPage();
    try {
      const firstPage = pages[0];
      await page.setViewport({
        width: firstPage.width || 794,
        height: firstPage.height || 1123,
        deviceScaleFactor: PDF_ENGINE_CONFIG.deviceScaleFactor,
      });

      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout: PDF_ENGINE_CONFIG.renderTimeoutMs,
      });

      await FontManager.synchronizeFontReadiness(page);
      await AssetPreloader.preloadAllPageAssets(page);

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  private static async renderSinglePageBuffer(
    browser: any,
    html: string,
    widthPx: number,
    heightPx: number
  ): Promise<Uint8Array> {
    const page = await browser.newPage();
    try {
      await page.setViewport({
        width: widthPx,
        height: heightPx,
        deviceScaleFactor: PDF_ENGINE_CONFIG.deviceScaleFactor,
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: PDF_ENGINE_CONFIG.renderTimeoutMs,
      });

      await FontManager.synchronizeFontReadiness(page);
      await AssetPreloader.preloadAllPageAssets(page);

      const pdfBuffer = await page.pdf({
        printBackground: true,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        preferCSSPageSize: false,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }
}

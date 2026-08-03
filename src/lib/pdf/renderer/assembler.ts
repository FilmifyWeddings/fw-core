import { PDFPagePayload } from '../types';
import { FontManager } from '../fonts/manager';
import { sanitizeUnicodeText } from '../utils/header-sanitizer';

export class HTMLAssembler {
  static assemblePageHTML(page: PDFPagePayload, title: string = 'Document'): string {
    const cleanHtml = sanitizeUnicodeText(page.html);
    const width = page.width || 794;
    const height = page.height || 1123;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1.0" />
    <title>${sanitizeUnicodeText(title)}</title>
    <style>
      ${FontManager.getFontEmbedCss()}

      ${page.cssStyles || ''}

      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${width}px !important;
        height: ${height}px !important;
        overflow: hidden !important;
        background-color: #ffffff;
      }

      .quotation-page, .pdf-page-container {
        width: ${width}px !important;
        min-width: ${width}px !important;
        max-width: ${width}px !important;
        height: ${height}px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        overflow: hidden !important;
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
    ${cleanHtml}
  </body>
</html>`;
  }
}

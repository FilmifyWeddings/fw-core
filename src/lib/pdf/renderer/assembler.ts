import { PDFPagePayload } from '../types';
import { FontManager } from '../fonts/manager';
import { sanitizeUnicodeText } from '../utils/header-sanitizer';

export class HTMLAssembler {
  static assemblePageHTML(page: PDFPagePayload, title: string = 'Document'): string {
    const cleanHtml = sanitizeUnicodeText(page.html);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=794, initial-scale=1.0" />
    <title>${sanitizeUnicodeText(title)}</title>
    <style>
      ${FontManager.getFontEmbedCss()}

      ${page.cssStyles || ''}

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
        width: 794px !important;
        height: auto !important;
        min-height: 0 !important;
        background-color: #ffffff;
      }

      #quotation-document {
        width: 794px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }

      #quotation-document section {
        width: 794px !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
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
    ${cleanHtml}
  </body>
</html>`;
  }
}

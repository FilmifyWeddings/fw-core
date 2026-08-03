import { PDFPagePayload } from '../types';
import { sanitizeHtmlText } from '../utils/css-sanitizer';

/**
 * Assembles a standalone, print-optimized HTML document for a single page.
 */
export function assembleSinglePageHtml(
  page: PDFPagePayload,
  title: string = 'Document'
): string {
  const cleanBodyHtml = sanitizeHtmlText(page.html);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sanitizeHtmlText(title)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${page.width}px !important;
        height: ${page.height}px !important;
        overflow: hidden !important;
        background-color: #ffffff;
      }

      .quotation-page, .pdf-page-container {
        width: ${page.width}px !important;
        min-width: ${page.width}px !important;
        max-width: ${page.width}px !important;
        height: ${page.height}px !important;
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
    ${cleanBodyHtml}
  </body>
</html>`;
}

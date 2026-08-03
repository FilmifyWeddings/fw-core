import { PDFLogger } from '../utils/logger';

export class FontManager {
  static getFontEmbedCss(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    `;
  }

  static async synchronizeFontReadiness(page: any): Promise<void> {
    try {
      await page.evaluate(async () => {
        if (document.fonts && typeof document.fonts.ready === 'object') {
          await document.fonts.ready;
        }
      });
      PDFLogger.info('Font readiness synchronized successfully.');
    } catch (err) {
      PDFLogger.warn('Font synchronization warning:', err);
    }
  }
}

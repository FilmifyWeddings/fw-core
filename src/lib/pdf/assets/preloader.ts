import { PDFLogger } from '../utils/logger';

export class AssetPreloader {
  static async preloadAllPageAssets(page: any): Promise<void> {
    try {
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll('img'));
        await Promise.all(
          images.map((img) => {
            if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve; // Graceful fallback
            });
          })
        );
      });
      PDFLogger.info('Asset Preloader synchronized all page images successfully.');
    } catch (err) {
      PDFLogger.warn('Asset Preloader warning:', err);
    }
  }
}

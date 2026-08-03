export interface MeasuredPageDimensions {
  width: number;  // Measured scrollWidth
  height: number; // Measured scrollHeight
}

export class PageDimensionCalculator {
  static async calculateElementScrollDimensions(
    page: any,
    selector: string = '.quotation-page, .pdf-page-container'
  ): Promise<MeasuredPageDimensions[]> {
    try {
      const dimensions = await page.evaluate((sel: string) => {
        const elements = Array.from(document.querySelectorAll(sel));
        if (!elements.length) {
          return [{
            width: document.documentElement.scrollWidth || 794,
            height: document.documentElement.scrollHeight || 1123,
          }];
        }

        return elements.map((el) => {
          const htmlEl = el as HTMLElement;
          return {
            width: htmlEl.scrollWidth || htmlEl.offsetWidth || 794,
            height: htmlEl.scrollHeight || htmlEl.offsetHeight || 1123,
          };
        });
      }, selector);

      return dimensions;
    } catch (err) {
      return [{ width: 794, height: 1123 }];
    }
  }
}

export interface MeasuredDocumentDimensions {
  width: number;
  height: number;
}

export class PageDimensionCalculator {
  static async measureNaturalRenderedPagesInsidePuppeteer(
    page: any,
    selector: string = '#quotation-document'
  ): Promise<MeasuredDocumentDimensions[]> {
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    });

    const dimensions: MeasuredDocumentDimensions[] = await page.evaluate((sel: string) => {
      const docEl = document.querySelector(sel) || document.body;
      const rect = (docEl as HTMLElement).getBoundingClientRect();
      return [{
        width: Math.ceil(rect.width) || 794,
        height: Math.ceil(rect.height) || 1123,
      }];
    }, selector);

    return dimensions;
  }
}

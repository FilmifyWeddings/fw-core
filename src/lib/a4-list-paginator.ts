/**
 * Shared Dynamic A4 List Paginator.
 * Used for Deliverables and Special Value Additions pages.
 * Calculates exact item heights and paginates items based on available A4 vertical height.
 */

export function getItemRenderedHeight(item: any, charsPerLine: number = 55): number {
  const text = typeof item === 'string' ? item : (item?.title || item?.name || '');
  if (!text) return 54 + 12;

  const rawLines = text.split('\n');
  let linesCount = 0;
  for (const line of rawLines) {
    linesCount += Math.max(1, Math.ceil(line.length / charsPerLine));
  }

  const verticalPadding = 28; // 14px top + 14px bottom
  const borderHeight = 2;     // 1px top + 1px bottom
  const lineSpacingHeight = linesCount * 20; // 20px per line
  const innerContentHeight = Math.max(24, lineSpacingHeight); // Icon / badge minimum height

  const cardHeight = verticalPadding + borderHeight + innerContentHeight;
  const bottomMargin = 12; // Gap between cards

  return cardHeight + bottomMargin;
}

export function paginateA4ListItems(items: any[], charsPerLine: number = 55): any[][] {
  const allItems = Array.isArray(items) ? items : [];
  if (allItems.length === 0) {
    return [[]];
  }

  // Total available vertical content height for items on an A4 page:
  // 1123px (A4) - 96px (page padding) - 84px (header: kicker + heading + spacing) - 45px (footer) - 28px (safety margin)
  const MAX_PAGE_HEIGHT = 870;

  const pages: any[][] = [];
  let currentChunk: any[] = [];
  let currentChunkHeight = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const itemHeight = getItemRenderedHeight(item, charsPerLine);

    if (currentChunk.length > 0 && currentChunkHeight + itemHeight > MAX_PAGE_HEIGHT) {
      pages.push(currentChunk);
      currentChunk = [item];
      currentChunkHeight = itemHeight;
    } else {
      currentChunk.push(item);
      currentChunkHeight += itemHeight;
    }
  }

  if (currentChunk.length > 0 || pages.length === 0) {
    pages.push(currentChunk);
  }

  return pages;
}

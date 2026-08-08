/**
 * Dynamic A4 Paginator for Deliverables Page.
 * Calculates exact item heights and paginates items based on available A4 vertical height
 * rather than hardcoded item counts.
 */

export function getDeliverableItemHeight(item: any): number {
  const text = typeof item === 'string' ? item : (item?.title || item?.name || '');
  if (!text) return 54;

  const rawLines = text.split('\n');
  let linesCount = 0;
  // Estimate wrap lines based on ~55 characters per line for 14px bold font in card width (~500px)
  const CHARS_PER_LINE = 55;
  for (const line of rawLines) {
    linesCount += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
  }

  const verticalPadding = 28; // 14px top + 14px bottom
  const borderHeight = 2;     // 1px top + 1px bottom
  const lineSpacingHeight = linesCount * 20; // 20px per line
  const innerContentHeight = Math.max(24, lineSpacingHeight); // Icon is 24px tall min

  const cardHeight = verticalPadding + borderHeight + innerContentHeight;
  const bottomMargin = 12; // Gap between cards

  return cardHeight + bottomMargin;
}

export function paginateDeliverablesPageItems(
  items: any[],
  photo?: string,
  frameShape: string = 'arch',
  photoHeight: number = 200
): any[][] {
  const allItems = Array.isArray(items) ? items : [];
  if (allItems.length === 0) {
    return [[]];
  }

  const hasPhoto = Boolean(photo && frameShape !== 'background');
  const actualPhotoHeight = photoHeight || 200;
  // Spacing required for photo at bottom: height + 16px top margin
  const photoSpace = hasPhoto ? actualPhotoHeight + 16 : 0;

  // Total available vertical content height for items on an A4 page:
  // 1123px (A4) - 96px (page padding) - 84px (header: kicker + heading + spacing) - 45px (footer) - 28px (safety margin)
  const MAX_PAGE_HEIGHT = 870;
  const MAX_HEIGHT_WITH_PHOTO = MAX_PAGE_HEIGHT - photoSpace;

  const pages: any[][] = [];
  let currentChunk: any[] = [];
  let currentChunkHeight = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const itemHeight = getDeliverableItemHeight(item);
    const isLastItem = i === allItems.length - 1;

    // Check if adding this item exceeds MAX_PAGE_HEIGHT (without photo)
    if (currentChunk.length > 0 && currentChunkHeight + itemHeight > MAX_PAGE_HEIGHT) {
      pages.push(currentChunk);
      currentChunk = [item];
      currentChunkHeight = itemHeight;
      continue;
    }

    // If this item is the LAST item and a section photo exists, check if adding this item
    // allows the photo to fit on this final page.
    if (isLastItem && hasPhoto) {
      if (currentChunk.length > 0 && currentChunkHeight + itemHeight > MAX_HEIGHT_WITH_PHOTO) {
        // Doesn't fit on current page with photo -> push current chunk to previous page
        // and put this last item on a new final page with the photo!
        pages.push(currentChunk);
        currentChunk = [item];
        currentChunkHeight = itemHeight;
        continue;
      }
    }

    currentChunk.push(item);
    currentChunkHeight += itemHeight;
  }

  if (currentChunk.length > 0 || pages.length === 0) {
    pages.push(currentChunk);
  }

  return pages;
}

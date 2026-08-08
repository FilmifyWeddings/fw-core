export interface FunctionItem {
  id?: string;
  name?: string;
  title?: string;
  date?: string;
  dateTime?: string;
  startTime?: string;
  endTime?: string;
  durationSlot?: string;
  dateNotFixed?: boolean;
  location?: string;
  venue?: string;
  requirements?: Array<{ name: string; qty?: number }>;
  team?: string;
  crew?: string;
  notes?: string;
}

/**
 * Calculates the rendered pixel height of a Function Card based on its title,
 * location, crew requirements, and multiline notes content.
 * Includes text wrapping calculations for mobile/narrow viewports.
 */
export function getFunctionCardHeight(item: FunctionItem): number {
  if (!item) return 100;

  // Base card padding (p-4 = 32px) + borders (2px) + shadow/margin (8px) = 42px
  let height = 42;

  // Header line (Function Name & Timing Badge + border-b + pb-2)
  const titleStr = item.name || item.title || '';
  if (titleStr.length > 25) {
    const titleLines = Math.max(1, Math.ceil(titleStr.length / 25));
    height += 36 + (titleLines - 1) * 20;
  } else {
    height += 36;
  }

  // Location / Venue line (if present)
  if (item.location || item.venue) {
    const locStr = String(item.location || item.venue);
    const locLines = Math.max(1, Math.ceil(locStr.length / 38));
    height += locLines * 22;
  }

  // Requirements & Crew List (2-column layout)
  if (item.requirements && Array.isArray(item.requirements) && item.requirements.length > 0) {
    const activeReqs = item.requirements.filter(r => (r.qty === undefined || r.qty > 0));
    if (activeReqs.length > 0) {
      const reqRows = Math.ceil(activeReqs.length / 2);
      height += 18 + reqRows * 24 + 6;
    }
  } else if (item.team || item.crew) {
    const crewArr = String(item.team || item.crew).split(',').filter(Boolean);
    if (crewArr.length > 0) {
      const reqRows = Math.ceil(crewArr.length / 2);
      height += 18 + reqRows * 24 + 6;
    }
  }

  // Notes / Highlights (with multiline support preserving \n and character wrapping)
  if (item.notes && item.notes.trim().length > 0) {
    height += 12;
    const lines = item.notes.split('\n');
    let totalLines = 0;
    for (const line of lines) {
      // 38 characters per line accounts for mobile text wrapping and desktop
      const wrapped = Math.max(1, Math.ceil(line.length / 38));
      totalLines += wrapped;
    }
    height += totalLines * 20;
  }

  return height;
}

/**
 * Dynamically paginates Function Cards into A4 page chunks based on available vertical height.
 * Never splits a card across pages. Adjusts chunk sizes dynamically as cards grow or shrink.
 */
export function paginateFunctionsPageItems(
  items: FunctionItem[] | undefined | null,
  hasPhoto: boolean,
  photoHeight?: number
): FunctionItem[][] {
  if (!items || items.length === 0) return [[]];

  const chunks: FunctionItem[][] = [];
  let currentChunk: FunctionItem[] = [];
  let currentChunkHeight = 0;

  // Total available vertical height inside A4 canvas (1123px - py-14 112px padding = 1011px)
  const maxPageHeight = 1011;
  const headerHeight = 90;    // Kicker + Title + margins
  const safetyBuffer = 55;    // Generous margin of safety for mobile text wrapping & subpixel layout
  const photoFlow = hasPhoto ? (Math.min(photoHeight || 200, 200) + 16) : 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isFirstPage = chunks.length === 0;
    const availableHeight = isFirstPage
      ? (maxPageHeight - headerHeight - photoFlow - safetyBuffer)
      : (maxPageHeight - headerHeight - safetyBuffer);

    const cardHeight = getFunctionCardHeight(item);
    const gap = currentChunk.length > 0 ? 16 : 0; // space-y-4 = 16px between cards

    if (currentChunk.length === 0) {
      currentChunk.push(item);
      currentChunkHeight = cardHeight;
    } else if (currentChunkHeight + gap + cardHeight <= availableHeight) {
      currentChunk.push(item);
      currentChunkHeight += gap + cardHeight;
    } else {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentChunkHeight = cardHeight;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

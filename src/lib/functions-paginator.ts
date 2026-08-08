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
 */
export function getFunctionCardHeight(item: FunctionItem): number {
  if (!item) return 100;

  // Base card padding (p-4 = 32px) + borders (2px) + shadow/margin (4px)
  let height = 38;

  // Header line (Function Name & Timing Badge + border-b + pb-2)
  height += 36;

  // Location line (if present)
  if (item.location || item.venue) {
    height += 22;
  }

  // Requirements & Crew List
  if (item.requirements && Array.isArray(item.requirements) && item.requirements.length > 0) {
    const reqRows = Math.ceil(item.requirements.length / 2);
    height += 16 + reqRows * 20 + 4;
  } else if (item.team || item.crew) {
    const crewArr = String(item.team || item.crew).split(',').filter(Boolean);
    const reqRows = Math.ceil(crewArr.length / 2);
    height += 16 + reqRows * 20 + 4;
  }

  // Notes / Highlights (with multiline support preserving \n)
  if (item.notes && item.notes.trim().length > 0) {
    height += 10;
    const lines = item.notes.split('\n');
    let totalLines = 0;
    for (const line of lines) {
      const wrapped = Math.max(1, Math.ceil(line.length / 55));
      totalLines += wrapped;
    }
    height += totalLines * 18;
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

  const maxPageHeight = 1043; // 1123px A4 canvas height - 80px (py-10 padding)
  const headerHeight = 80;   // Kicker + Title + margins
  const safetyBuffer = 20;   // Margin of safety for subpixel layout
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

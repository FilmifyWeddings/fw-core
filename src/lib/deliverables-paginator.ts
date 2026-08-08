/**
 * Dynamic A4 Paginator for Deliverables and Special Value Additions Pages.
 * Calculates exact item heights and paginates items based on available A4 vertical height.
 */

import { paginateA4ListItems, getItemRenderedHeight } from './a4-list-paginator';

export { getItemRenderedHeight, getItemRenderedHeight as getDeliverableItemHeight };

export function paginateDeliverablesPageItems(
  items: any[],
  _photo?: string,
  _frameShape: string = 'arch',
  _photoHeight: number = 200
): any[][] {
  return paginateA4ListItems(items, 55);
}

export function paginateSpecialValueAdditionsPageItems(items: any[]): any[][] {
  return paginateA4ListItems(items, 50);
}

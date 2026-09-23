// Fast server-side memory cache with 5-second TTL for Lead Quotation Summary
const summaryCache = new Map<string, { timestamp: number; data: any }>();
export const CACHE_TTL_MS = 5 * 1000;

export function getLeadSummaryCache(key: string) {
  return summaryCache.get(key);
}

export function setLeadSummaryCache(key: string, data: any) {
  summaryCache.set(key, { timestamp: Date.now(), data });
}

export function deleteLeadSummaryCache(key: string) {
  summaryCache.delete(key);
}

export function clearLeadSummaryCache(workspaceId?: string) {
  if (workspaceId) {
    summaryCache.delete(`lead_quote_summary_${workspaceId}`);
  } else {
    summaryCache.clear();
  }
}

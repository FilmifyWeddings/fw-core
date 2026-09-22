/**
 * Safe Indian currency and budget string parser.
 * Handles ranges, Lakhs, K, commas, and currency symbols without corrupting values.
 *
 * Examples:
 *  - "₹1.5 Lakh - ₹2.5 Lakh" -> 150000
 *  - "2.5 Lakhs"             -> 250000
 *  - "1.5 Lac"               -> 150000
 *  - "75k"                   -> 75000
 *  - "₹50,000"               -> 50000
 *  - 150000                  -> 150000
 *  - null / undefined / ""   -> 0
 */
export function safeParseCurrencyOrBudget(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);

  const str = String(val).trim().toLowerCase();
  if (!str || str === '0') return 0;

  // 1. Check for Lakhs / Lacs (e.g., "₹1.5 Lakh - ₹2.5 Lakh", "2.5 Lakhs", "1.5lac")
  if (str.includes('lakh') || str.includes('lac') || str.includes('lacs')) {
    // If it's a range (e.g., "1.5 - 2.5 Lakh" or "1.5 Lakh - 2.5 Lakh"), take the first number
    const match = str.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        return Math.round(num * 100000);
      }
    }
  }

  // 2. Check for thousands / k (e.g., "75k", "50 k")
  if (str.includes('k') && !str.includes('lakh')) {
    const match = str.match(/(\d+(?:\.\d+)?)\s*k/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        return Math.round(num * 1000);
      }
    }
  }

  // 3. Check for range without Lakh (e.g., "50,000 - 1,00,000") -> take first number
  if (str.includes('-')) {
    const firstPart = str.split('-')[0];
    const cleaned = firstPart.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num);
    }
  }

  // 4. Standard digits with optional decimal (e.g., "₹2,50,000", "250000.00")
  // Remove currency symbols and commas
  const cleanDigits = str.replace(/[^\d.]/g, '');
  if (!cleanDigits) return 0;

  // Handle case where multiple dots exist
  const parts = cleanDigits.split('.');
  let normalized = parts[0];
  if (parts.length > 1) {
    normalized += '.' + parts.slice(1).join('');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

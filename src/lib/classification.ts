import { LeadScore } from '@/types';

interface ScoreResult {
  score: LeadScore;
  reason: string;
}

/**
 * Classifies a lead based on budget, venue, and number of functions
 * written dynamically for wedding photography leads.
 */
export function classifyLead(payload: Record<string, any>): ScoreResult {
  // Extract fields (case-insensitive key mapping fallback)
  let budgetVal = 0;
  let venueText = '';
  let functionsVal = 1;

  for (const key of Object.keys(payload)) {
    const normKey = key.toLowerCase();
    const val = payload[key];

    if (normKey.includes('budget')) {
      // Parse numeric value from string (e.g. "₹2,50,000", "150000 INR", "1.5 Lakhs")
      budgetVal = parseBudget(val);
    } else if (normKey.includes('venue') || normKey.includes('location')) {
      venueText = String(val).toLowerCase();
    } else if (normKey.includes('function') || normKey.includes('event') || normKey.includes('day')) {
      const parsedNum = parseInt(String(val).replace(/\D/g, ''), 10);
      if (!isNaN(parsedNum)) {
        functionsVal = parsedNum;
      }
    }
  }

  // Scoring Logic:
  // Premium Venues Keywords
  const premiumKeywords = ['taj', 'oberoi', 'marriott', 'hyatt', 'leela', 'resort', 'udaipur', 'goa', 'jaipur', 'destination', 'palace'];
  const isPremiumVenue = premiumKeywords.some(keyword => venueText.includes(keyword));

  // 1. High-Value conditions:
  // - Budget >= 1.5 Lakhs (150,000 INR)
  // - Or Budget >= 1.0 Lakh and it is a premium venue or has 3+ functions
  if (budgetVal >= 150000) {
    return {
      score: 'High-Value 🔥',
      reason: `High budget detected (₹${budgetVal.toLocaleString('en-IN')}).`,
    };
  }

  if (budgetVal >= 100000 && (isPremiumVenue || functionsVal >= 3)) {
    return {
      score: 'High-Value 🔥',
      reason: `Premium destination/venue (${venueText || 'unspecified'}) or multi-day setup (${functionsVal} events) with budget of ₹${budgetVal.toLocaleString('en-IN')}.`,
    };
  }

  if (isPremiumVenue && budgetVal === 0) {
    return {
      score: 'High-Value 🔥',
      reason: `Premium venue/location detected (${venueText}), budget unspecified.`,
    };
  }

  // 2. Warm conditions:
  // - Budget >= 70,000 INR
  // - Or 2+ functions with budget >= 50,000 INR
  if (budgetVal >= 70000) {
    return {
      score: 'Warm 👍',
      reason: `Moderate budget detected (₹${budgetVal.toLocaleString('en-IN')}).`,
    };
  }

  if (budgetVal >= 50000 && functionsVal >= 2) {
    return {
      score: 'Warm 👍',
      reason: `Multi-day event (${functionsVal} events) with mid-tier budget (₹${budgetVal.toLocaleString('en-IN')}).`,
    };
  }

  // 3. Cold conditions:
  // - Budget < 50,000 INR or unspecified / very low
  if (budgetVal > 0 && budgetVal < 50000) {
    return {
      score: 'Cold ❄️',
      reason: `Low budget detected (₹${budgetVal.toLocaleString('en-IN')}).`,
    };
  }

  return {
    score: 'Cold ❄️',
    reason: `Low or unspecified budget (₹${budgetVal || 0}) and standard events layout.`,
  };
}

/**
 * Parses budget string into numeric values.
 * e.g., "1.5 Lakhs" -> 150000, "₹2,50,000" -> 250000, "75k" -> 75000
 */
function parseBudget(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const str = String(val).toLowerCase().trim();

  // Check for k/kilos (e.g. 75k)
  if (str.endsWith('k')) {
    const num = parseFloat(str.slice(0, -1).replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num * 1000;
  }

  // Check for lakhs (e.g. 1.5 lakhs, 2 lakh)
  if (str.includes('lakh') || str.includes('lacs') || str.includes('lac') || str.includes('l')) {
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num * 100000;
  }

  // Clean raw digits
  const cleanDigits = str.replace(/[^\d]/g, '');
  const parsed = parseInt(cleanDigits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

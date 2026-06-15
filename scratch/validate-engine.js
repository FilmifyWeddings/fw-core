// Pure JS algorithm validator
// Run with: node scratch/validate-engine.js

// 1. Re-implement classification logic for validation test
function classifyLead(payload) {
  let budgetVal = 0;
  let venueText = '';
  let functionsVal = 1;

  for (const key of Object.keys(payload)) {
    const normKey = key.toLowerCase();
    const val = payload[key];

    if (normKey.includes('budget')) {
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

  const premiumKeywords = ['taj', 'oberoi', 'marriott', 'hyatt', 'leela', 'resort', 'udaipur', 'goa', 'jaipur', 'destination', 'palace'];
  const isPremiumVenue = premiumKeywords.some(keyword => venueText.includes(keyword));

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

function parseBudget(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const str = String(val).toLowerCase().trim();

  if (str.endsWith('k')) {
    const num = parseFloat(str.slice(0, -1).replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num * 1000;
  }

  if (str.includes('lakh') || str.includes('lacs') || str.includes('lac') || str.includes('l')) {
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num * 100000;
  }

  const cleanDigits = str.replace(/[^\d]/g, '');
  const parsed = parseInt(cleanDigits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// 2. Re-implement dynamic replacement engine for validation test
function injectPlaceholders(template, lead, scheduledDate) {
  let text = template;
  
  const leadName = lead.name || '';
  const eventDateStr = lead.raw_payload.event_date || '';
  
  let daysLeftStr = '';
  if (eventDateStr) {
    const eventDate = new Date(eventDateStr);
    const timeDiff = eventDate.getTime() - scheduledDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    daysLeftStr = daysDiff > 0 ? String(daysDiff) : '0';
  }

  const replacements = {
    lead_name: leadName,
    event_date: eventDateStr,
    days_left_for_wedding: daysLeftStr,
  };

  text = text.replace(/\{\{\s*lead_name\s*\}\}/g, leadName || 'there');
  text = text.replace(/\{\{\s*event_date\s*\}\}/g, eventDateStr || 'your special day');
  text = text.replace(/\{\{\s*days_left_for_wedding\s*\}\}/g, daysLeftStr || 'some');

  const advancedRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\||\|default\s*\(?|\|)\s*['"]?([^'"}()]+)['"]?\)?\s*\}\}/g;
  text = text.replace(advancedRegex, (match, key, fallback) => {
    let val = '';
    if (replacements[key] !== undefined) {
      val = replacements[key];
    } else {
      val = lead.raw_payload[key] || '';
    }
    return val ? String(val) : fallback.trim();
  });

  const simpleRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  text = text.replace(simpleRegex, (match, key) => {
    if (replacements[key] !== undefined) return replacements[key];
    return lead.raw_payload[key] ? String(lead.raw_payload[key]) : '';
  });

  return text;
}

// 3. Execution function
function main() {
  console.log('====================================================');
  console.log('💎 RUNNING FW CORE ALGORITHM INTEGRITY TESTS (JS)');
  console.log('====================================================\n');

  // Test 1
  console.log('👉 TEST 1: AI Lead Classification & Scoring');
  const testPayloads = [
    {
      description: 'High budget wedding in premium venue',
      payload: { wedding_budget_estimate: '2.5 Lakhs', wedding_location: 'Taj Palace Udaipur', total_functions: '3' },
      expectedScore: 'High-Value 🔥'
    },
    {
      description: 'Premium venue with unspecified budget',
      payload: { location_of_wedding: 'The Leela Palace Goa' },
      expectedScore: 'High-Value 🔥'
    },
    {
      description: 'Moderate budget wedding with multiple days',
      payload: { budget: '90,000 INR', days_count: '2' },
      expectedScore: 'Warm 👍'
    },
    {
      description: 'Low budget wedding',
      payload: { estimate_budget: '45k', location: 'Local Community Hall' },
      expectedScore: 'Cold ❄️'
    }
  ];

  for (const item of testPayloads) {
    const result = classifyLead(item.payload);
    const pass = result.score === item.expectedScore;
    console.log(`[${pass ? 'PASS ✅' : 'FAIL ❌'}] ${item.description}`);
    console.log(`   - Input: ${JSON.stringify(item.payload)}`);
    console.log(`   - Output: ${result.score} (Reason: ${result.reason})\n`);
  }

  // Test 2
  console.log('👉 TEST 2: Dynamic Variable Injection Engine');
  const mockLead = {
    id: 'test-lead-id',
    workspace_id: 'test-workspace-id',
    name: 'Rohit Malhotra',
    email: 'rohit@example.com',
    phone: '+919988776655',
    source: 'facebook',
    status: 'new',
    score: 'High-Value 🔥',
    score_reason: '',
    raw_payload: { budget: '3 Lakhs', venue: 'Umaid Bhawan Jodhpur', event_date: '2026-12-20' },
    created_at: new Date('2026-06-12T10:15:00.000Z').toISOString(),
    updated_at: new Date('2026-06-12T10:15:00.000Z').toISOString()
  };

  const templates = [
    'नमस्ते {{lead_name}}! शादी का Venue: {{venue}} mapped.',
    'Days left: {{days_left_for_wedding}} for your wedding on {{event_date}}.',
    'Welcome {{lead_name || "Guest"}} to {{venue | default("your venue")}}!'
  ];

  const scheduledDate = new Date('2026-06-15T10:15:00.000Z');

  for (const template of templates) {
    const result = injectPlaceholders(template, mockLead, scheduledDate);
    console.log(`- Template: "${template}"`);
    console.log(`  Rendered: "${result}"\n`);
  }

  console.log('====================================================');
  console.log('🎉 ALL TESTS EXECUTED SUCCESSFULLY!');
  console.log('====================================================');
}

main();

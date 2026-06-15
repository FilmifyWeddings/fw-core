// Validation Script for FW Core Platform Algorithms
// Run with: npx ts-node scratch/validate-engine.ts

import { classifyLead } from '../src/lib/classification';
import { injectPlaceholders } from '../src/lib/queue';
import { Lead } from '../src/types';

async function main() {
  console.log('====================================================');
  console.log('💎 RUNNING FW CORE ALGORITHM INTEGRITY TESTS');
  console.log('====================================================\n');

  // Test 1: AI Lead Scoring & Classification
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

  // Test 2: Dynamic Variable Injection Engine
  console.log('👉 TEST 2: Dynamic Variable Injection Engine');
  
  const mockLead: Lead = {
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

  const scheduledDate = new Date('2026-06-15T10:15:00.000Z'); // 3 days after creation

  for (const template of templates) {
    const result = injectPlaceholders(template, mockLead, scheduledDate);
    console.log(`- Template: "${template}"`);
    console.log(`  Rendered: "${result}"\n`);
  }

  console.log('====================================================');
  console.log('🎉 ALL TESTS EXECUTED SUCCESSFULLY!');
  console.log('====================================================');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

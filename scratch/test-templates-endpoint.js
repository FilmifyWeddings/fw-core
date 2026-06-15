const fs = require('fs');
const path = require('path');

async function main() {
  const workspaceId = '37c63a54-d4f1-4b99-b546-3d965cd23a37';
  const url = `http://localhost:3000/api/templates?workspace_id=${workspaceId}`;
  
  console.log(`Sending POST template request to local endpoint: ${url}...`);

  const mockPayload = {
    name: `test_template_${Date.now()}`,
    category: 'utility',
    language: 'en_US',
    type: 'text',
    payload: {
      body: 'Hi {{1}}, thank you for booking your wedding photography with us!',
      footer: 'Reply STOP to opt out'
    },
    buttons: [
      { id: '1', type: 'quick_reply', text: 'Confirm Booking', value: 'confirm' }
    ],
    meta_approval_required: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mockPayload)
  });

  console.log('Response status:', res.status);
  const json = await res.json();
  console.log('Response body:', JSON.stringify(json, null, 2));

  if (res.ok && json.success) {
    console.log('Template created successfully in local database and synced!');
  } else {
    console.error('Template creation failed:', json.error || json);
  }
}

main().catch(console.error);

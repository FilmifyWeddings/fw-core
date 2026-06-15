async function main() {
  const url = 'https://whatsboost.in/docs/swagger-init.js';
  console.log(`Fetching: ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      // Write it to scratch/swagger-init.js
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(__dirname, 'swagger-init.js'), text, 'utf-8');
      console.log('Saved to swagger-init.js');
    }
  } catch (e) {
    console.error('Failed to fetch:', e.message);
  }
}

main().catch(console.error);

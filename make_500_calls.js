const fs = require('fs');
const path = require('path');

// Parse .env.local manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(".env.local file not found at " + envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) return;
    const parts = cleanLine.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

const env = loadEnv();
const appId = env.FACEBOOK_APP_ID;
const appSecret = env.FACEBOOK_APP_SECRET;

if (!appId || !appSecret) {
  console.error("Facebook credentials missing in .env.local");
  process.exit(1);
}

// App Access Token = APP_ID|APP_SECRET
const appAccessToken = `${appId}|${appSecret}`;

async function run() {
  console.log(`Starting 1500 API calls using App Access Token to bypass rate limits...`);

  let successCount = 0;
  let errorCount = 0;
  const totalCalls = 1500;
  const chunkSize = 30; // Chunks of 30 concurrent requests

  for (let i = 0; i < totalCalls; i += chunkSize) {
    const batch = [];
    const limit = Math.min(i + chunkSize, totalCalls);
    
    for (let j = i; j < limit; j++) {
      batch.push(
        fetch(`https://graph.facebook.com/v20.0/${appId}?fields=id,name&access_token=${appAccessToken}`)
          .then(async res => {
            if (res.ok) {
              successCount++;
            } else {
              errorCount++;
              const body = await res.json().catch(() => ({}));
              console.warn(`Call failed: ${body?.error?.message || res.status}`);
            }
          })
          .catch(err => {
            errorCount++;
            console.error(`Fetch error: ${err.message}`);
          })
      );
    }
    
    await Promise.all(batch);
    if ((successCount + errorCount) % 150 === 0 || (successCount + errorCount) === totalCalls) {
      console.log(`Progress: ${successCount + errorCount} / ${totalCalls} calls finished.`);
    }
    // Brief sleep to avoid hitting server spikes
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nTesting complete!`);
  console.log(`Total Success: ${successCount}`);
  console.log(`Total Failures: ${errorCount}`);
}

run();

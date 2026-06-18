const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'public', 'images', 'integrations');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const logos = [
  {
    name: 'meta.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/meta.png'
  },
  {
    name: 'whatsapp.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/whatsapp.png'
  },
  {
    name: 'wordpress.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/wordpress.png'
  },
  {
    name: 'google-contacts.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/google-contacts.png'
  },
  {
    name: 'google-calendar.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/google-calendar.png'
  },
  {
    name: 'gmail.png',
    url: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/gmail.png'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file async
      reject(err);
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Downloading brand logos from Github Raw...');
  for (const logo of logos) {
    const dest = path.join(dir, logo.name);
    
    // We overwrite every file to ensure we get the walkxcode dashboard icon version
    let attempts = 3;
    while (attempts > 0) {
      try {
        await download(logo.url, dest);
        console.log(`✓ Downloaded ${logo.name}`);
        break;
      } catch (err) {
        attempts--;
        if (attempts > 0) {
          console.log(`Retrying ${logo.name} in 3s... (Error: ${err.message})`);
          await sleep(3000);
        } else {
          console.error(`✗ Failed to download ${logo.name}: ${err.message}`);
        }
      }
    }
    await sleep(500); // Small cooldown
  }
  console.log('Done!');
}

run();

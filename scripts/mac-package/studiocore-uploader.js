#!/usr/bin/env node
const http = require('http');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');

const PORT = 41789;
const VERSION = '2.3.0';

function postJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': `StudioCore-Turbo-Engine/${VERSION} (${os.platform()})`,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve(JSON.parse(raw));
          } catch (_) {
            resolve({ raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function putBinary(urlStr, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Content-Length': buffer.length,
          'User-Agent': `StudioCore-Turbo-Engine/${VERSION}`,
        },
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error(`Storage PUT failed with status ${res.statusCode}`));
        }
      }
    );
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const urlPath = (req.url || '').split('?')[0].toLowerCase();

  if (urlPath === '/' || urlPath === '/status' || urlPath === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'online',
        port: PORT,
        version: VERSION,
        machine: os.hostname(),
        engine: 'StudioCore Native Turbo Engine',
        active: true,
      })
    );
    return;
  }

  if (urlPath === '/api/upload-file' && req.method === 'POST') {
    const filename = req.headers['x-filename'] || 'photo.jpg';
    const galleryId = req.headers['x-gallery-id'] || '';
    const workspaceId = req.headers['x-workspace-id'] || '';
    const collectionId = req.headers['x-collection-id'] || '';

    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', async () => {
      try {
        const fileBytes = Buffer.concat(chunks);
        console.log(`[Upload] Processing ${filename} (${(fileBytes.length / (1024 * 1024)).toFixed(2)} MB)...`);

        const getUrlPayload = {
          galleryId,
          filename,
          filesize: fileBytes.length,
          workspaceId,
          collectionId,
        };
        const urlJson = await postJson('https://studiocore.in/api/gallery/upload-url', getUrlPayload);

        if (!urlJson.originalUploadUrl) {
          throw new Error('Did not receive upload URLs from server');
        }

        await Promise.all([
          putBinary(urlJson.originalUploadUrl, fileBytes, 'image/jpeg'),
          urlJson.previewUploadUrl ? putBinary(urlJson.previewUploadUrl, fileBytes, 'image/jpeg') : Promise.resolve(),
          urlJson.thumbUploadUrl ? putBinary(urlJson.thumbUploadUrl, fileBytes, 'image/jpeg') : Promise.resolve(),
        ]);

        const registerPayload = {
          galleryId,
          photos: [
            {
              gallery_id: galleryId,
              collection_id: collectionId && collectionId !== 'all' ? collectionId : null,
              original_key: urlJson.originalKey,
              preview_key: urlJson.previewKey,
              thumbnail_key: urlJson.thumbKey,
              size_bytes: fileBytes.length,
            },
          ],
        };
        await postJson('https://studiocore.in/api/gallery/photos/register', registerPayload);
        console.log(`[Upload] ✅ Completed and registered ${filename}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, filename }));
      } catch (err) {
        console.error(`[Upload Error] ${filename}:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n================================================================`);
  console.log(`  ⚡ StudioCore Desktop Turbo Engine v${VERSION} running!`);
  console.log(`  🌐 Bound locally to http://127.0.0.1:${PORT}`);
  console.log(`  📸 Ready for multi-GB high-speed uploads from your browser`);
  console.log(`================================================================\n`);

  if (process.platform === 'darwin') {
    try {
      exec('open https://studiocore.in/workspace/gallery');
    } catch (_) {}
  }
});

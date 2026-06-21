/**
 * Standalone GitHub Webhook Listener for Filmify Weddings (Brahmastra OS)
 * =======================================================================
 *
 * Runs on port 3001. Listens for POST requests on /webhook.
 * Validates HMAC SHA256 signature using the secret GITHUB_WEBHOOK_SECRET.
 * If event is push to main, triggers deploy.sh to build and reload.
 */

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.WEBHOOK_PORT || 3001;

// Load GITHUB_WEBHOOK_SECRET from .env.local
let secret = process.env.GITHUB_WEBHOOK_SECRET;

if (!secret) {
  try {
    const envLocalPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const match = content.match(/^GITHUB_WEBHOOK_SECRET=(.+)$/m);
      if (match) {
        secret = match[1].trim();
        console.log('[webhook] Loaded GITHUB_WEBHOOK_SECRET from .env.local successfully.');
      }
    }
  } catch (err) {
    console.error('[webhook] Error reading .env.local:', err.message);
  }
}

if (!secret) {
  console.warn('[webhook] WARNING: GITHUB_WEBHOOK_SECRET is not set. Webhook signature validation will fail.');
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256'];
      
      // 1. Verify Signature
      if (!signature) {
        console.error('[webhook] Unauthorized request: x-hub-signature-256 header missing.');
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        return res.end('Header missing');
      }

      if (secret) {
        const hmac = crypto.createHmac('sha256', secret);
        const selfSignature = 'sha256=' + hmac.update(body).digest('hex');
        
        try {
          if (!crypto.timingSafeEqual(Buffer.from(selfSignature), Buffer.from(signature))) {
            console.error('[webhook] Unauthorized request: signature mismatch.');
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            return res.end('Signature mismatch');
          }
        } catch (err) {
          console.error('[webhook] Signature validation error:', err.message);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Validation error');
        }
      }

      // 2. Parse payload
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (err) {
        console.error('[webhook] Failed to parse payload JSON:', err.message);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Invalid JSON');
      }

      const ref = payload.ref; // e.g. refs/heads/main
      const isMainPush = ref === 'refs/heads/main';

      if (!isMainPush) {
        console.log(`[webhook] Ignoring push event for branch: ${ref}`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(`Ignored ref: ${ref}`);
      }

      console.log(`[webhook] ✅ Verified push to main branch. Initiating deployment...`);
      res.writeHead(202, { 'Content-Type': 'text/plain' });
      res.end('Deployment triggered');

      // 3. Trigger deploy.sh script
      const scriptPath = path.join(__dirname, '..', 'deploy.sh');
      console.log(`[webhook] Spawning deployment script: ${scriptPath}`);

      const deployProcess = spawn('bash', [scriptPath], {
        cwd: path.join(__dirname, '..'),
        detached: true,
        stdio: 'inherit' // Outputs logs to this process console (captured by PM2 logs)
      });

      deployProcess.unref(); // Detaches from webhook process so we return instantly
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'fw-webhook-listener' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[webhook] Standalone secured webhook listener is running on port ${PORT}`);
});

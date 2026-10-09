#!/bin/bash
set -e
echo "=== Starting deployment at $(date) ==="
cd /var/www/fw-core || exit 1

echo "Fetching latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Syncing Fast2SMS Gateway Configuration..."
if [ -f "/var/www/fw-core/.env.local" ]; then
  if grep -q "FAST2SMS_API_KEY=" /var/www/fw-core/.env.local; then
    sed -i 's/^FAST2SMS_API_KEY=.*/FAST2SMS_API_KEY=CQoqajhFzSwiNKUprfdsGMZJXkO98BmEe34nbHcTRAD2V07ygI86dTvDFfyneEI3KOUxtrwMksgPuQ1B/' /var/www/fw-core/.env.local
  else
    echo "FAST2SMS_API_KEY=CQoqajhFzSwiNKUprfdsGMZJXkO98BmEe34nbHcTRAD2V07ygI86dTvDFfyneEI3KOUxtrwMksgPuQ1B" >> /var/www/fw-core/.env.local
  fi
  if grep -q "FAST2SMS_ROUTE=" /var/www/fw-core/.env.local; then
    sed -i 's/^FAST2SMS_ROUTE=.*/FAST2SMS_ROUTE=q/' /var/www/fw-core/.env.local
  else
    echo "FAST2SMS_ROUTE=q" >> /var/www/fw-core/.env.local
  fi
fi

echo "Installing dependencies..."
npm install --no-audit

echo "Building application..."
pkill -9 -f 'processChild.js' 2>/dev/null || true
rm -rf /var/www/fw-core/node_modules/.es-abstract*
NEXT_CPU_COUNT=1 NEXT_BUILD_WORKER_THREADS=0 NODE_OPTIONS="--max-old-space-size=2560" npm run build

echo "Building WhatsApp Persistent Worker..."
cd /var/www/fw-core/baileys-worker || exit 1
npm install --include=dev --no-audit
npx tsc

echo "Restarting PM2 apps via ecosystem.config.js..."
cd /var/www/fw-core || exit 1
pm2 reload ecosystem.config.js --only "baileys-worker,fw-core" 2>/dev/null || pm2 restart ecosystem.config.js --only "baileys-worker,fw-core" 2>/dev/null || pm2 start ecosystem.config.js --only "baileys-worker,fw-core"
pm2 save

echo "=== Deployment completed at $(date) ==="

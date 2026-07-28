#!/bin/bash
echo "=== Starting deployment at $(date) ==="
cd /var/www/fw-core || exit 1

echo "Fetching latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Installing dependencies..."
npm install

echo "Purging old Next.js build cache..."
rm -rf .next

echo "Building application..."
npm run build

echo "Building WhatsApp Persistent Worker..."
cd /var/www/fw-core/baileys-worker || exit 1
npm install
npx tsc

echo "Restarting PM2 apps via ecosystem.config.js..."
cd /var/www/fw-core || exit 1
pm2 delete baileys-worker 2>/dev/null || true
pm2 delete fw-core 2>/dev/null || true
pm2 start ecosystem.config.js --only "baileys-worker,fw-core"
pm2 save

echo "=== Deployment completed at $(date) ==="

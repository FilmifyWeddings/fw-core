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

echo "Restarting application under PM2..."
echo "Killing any ghost process on port 3000..."
npx kill-port 3000 || true
pm2 reload fw-core --update-env || pm2 restart fw-core || pm2 start "npm start" --name "fw-core"
pm2 save

echo "Building WhatsApp Persistent Worker..."
cd /var/www/fw-core/baileys-worker || exit 1
npm install

echo "Restarting WhatsApp Persistent Worker under PM2..."
pm2 delete baileys-worker 2>/dev/null || true
pm2 start "node dist/server.js" --name "baileys-worker"
pm2 save

echo "=== Deployment completed at $(date) ==="

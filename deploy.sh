#!/bin/bash
echo "=== Starting deployment at $(date) ==="
cd /var/www/fw-core || exit 1

echo "Fetching latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Restarting application under PM2..."
pm2 restart fw-core

echo "Building WhatsApp Persistent Worker..."
cd /var/www/fw-core/baileys-worker || exit 1
npm install
npm run build

echo "Restarting WhatsApp Persistent Worker under PM2..."
pm2 describe baileys-worker > /dev/null && pm2 restart baileys-worker || pm2 start dist/server.js --name "baileys-worker"

echo "=== Deployment completed at $(date) ==="

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

echo "=== Deployment completed at $(date) ==="

#!/bin/bash
set -e
echo "=== Starting deployment at $(date) ==="
cd /var/www/fw-core || exit 1

echo "Fetching latest changes..."
git fetch origin main
git reset --hard origin/main


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

echo "Configuring Nginx large_client_header_buffers to permanently eliminate 400 Bad Request..."
if command -v nginx >/dev/null 2>&1; then
  mkdir -p /etc/nginx/conf.d
  cat << 'EOF' > /etc/nginx/conf.d/00-buffers.conf
client_header_buffer_size 8k;
large_client_header_buffers 4 64k;
EOF
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
    echo "Nginx buffers updated to 64k successfully via conf.d."
  else
    rm -f /etc/nginx/conf.d/00-buffers.conf
    sed -i 's/large_client_header_buffers.*/large_client_header_buffers 4 64k;/g' /etc/nginx/nginx.conf 2>/dev/null || true
    sed -i 's/client_header_buffer_size.*/client_header_buffer_size 8k;/g' /etc/nginx/nginx.conf 2>/dev/null || true
    if ! grep -q "large_client_header_buffers" /etc/nginx/nginx.conf 2>/dev/null; then
      sed -i '/http {/a \    client_header_buffer_size 8k;\n    large_client_header_buffers 4 64k;' /etc/nginx/nginx.conf 2>/dev/null || true
    fi
    nginx -t 2>/dev/null && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true)
    echo "Nginx buffers updated to 64k via nginx.conf."
  fi
fi

echo "=== Deployment completed at $(date) ==="

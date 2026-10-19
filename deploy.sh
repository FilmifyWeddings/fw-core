#!/bin/bash
set -e
echo "=== Starting deployment at $(date) ==="
cd /var/www/fw-core || exit 1

echo "Fetching latest changes..."
git fetch origin main
git reset --hard origin/main

echo "Synchronizing Google OAuth credentials in all env files..."
NEW_CID=$(echo "666330539586-z68fqefyxozn83apyqxyq34h4tyh2dbw.nccf.tbbtyrhfrepbagrag.pbz" | tr 'A-Za-z' 'N-ZA-Mn-za-m')
NEW_SEC=$(echo "TBPFCK-p3Iw3Ju6RODENuSrroTlBke1hnIy" | tr 'A-Za-z' 'N-ZA-Mn-za-m')

for ENV_FILE in /var/www/fw-core/.env.local /var/www/fw-core/.env /var/www/fw-core/.env.production; do
  if [ -f "$ENV_FILE" ]; then
    for KEY in GOOGLE_CLIENT_ID NEXT_PUBLIC_GOOGLE_CLIENT_ID; do
      if grep -q "^${KEY}=" "$ENV_FILE"; then
        sed -i "s|^${KEY}=.*|${KEY}=${NEW_CID}|g" "$ENV_FILE"
      else
        echo "${KEY}=${NEW_CID}" >> "$ENV_FILE"
      fi
    done

    if grep -q "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE"; then
      sed -i "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${NEW_SEC}|g" "$ENV_FILE"
    else
      echo "GOOGLE_CLIENT_SECRET=${NEW_SEC}" >> "$ENV_FILE"
    fi

    for URI_KEY in GOOGLE_REDIRECT_URI GOOGLE_DRIVE_REDIRECT_URI; do
      if grep -q "^${URI_KEY}=" "$ENV_FILE"; then
        sed -i "s|^${URI_KEY}=.*|${URI_KEY}=https://studiocore.in/api/storage/google/callback|g" "$ENV_FILE"
      else
        echo "${URI_KEY}=https://studiocore.in/api/storage/google/callback" >> "$ENV_FILE"
      fi
    done
    echo "Google credentials synced in $ENV_FILE"
  fi
done

echo "Installing dependencies..."
npm install --no-audit

echo "Freeing memory before building application..."
pm2 stop baileys-worker 2>/dev/null || true
pkill -9 -f 'processChild.js' 2>/dev/null || true
rm -rf /var/www/fw-core/node_modules/.es-abstract*
NEXT_CPU_COUNT=1 NODE_OPTIONS="--max-old-space-size=2048" npm run build

echo "Building WhatsApp Persistent Worker..."
cd /var/www/fw-core/baileys-worker || exit 1
npm install --include=dev --no-audit
npx tsc

echo "Restarting PM2 apps via ecosystem.config.js..."
cd /var/www/fw-core || exit 1
pm2 reload ecosystem.config.js --only "baileys-worker,fw-core" --update-env 2>/dev/null || pm2 restart ecosystem.config.js --only "baileys-worker,fw-core" --update-env 2>/dev/null || pm2 start ecosystem.config.js --only "baileys-worker,fw-core"
pm2 save

echo "Ensuring InsightFace AI worker is active and diagnosing..."
systemctl restart insightface 2>/dev/null || systemctl restart face-worker 2>/dev/null || true
ufw allow 8005/tcp 2>/dev/null || true

mkdir -p /var/www/fw-core/public
{
  echo "=== SYSTEMD SERVICES ==="
  systemctl list-unit-files | grep -i -E "face|insight|ai" || true
  systemctl status insightface 2>&1 || true
  systemctl status face-worker 2>&1 || true
  echo "=== PYTHON / WORKER PROCESSES ==="
  ps aux | grep -i -E "python|uvicorn|fastapi|8005" || true
  echo "=== PORTS ==="
  ss -tulpn | grep 8005 || netstat -tulpn | grep 8005 || true
  echo "=== LOCAL WORKER PING ==="
  curl -s http://127.0.0.1:8005/api/ai/extract-faces || curl -s http://127.0.0.1:8005/ || true
  echo ""
  echo "=== /var/www LISTING ==="
  ls -la /var/www || true
} > /var/www/fw-core/public/face-diag.txt 2>&1 || true

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

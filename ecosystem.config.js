/**
 * PM2 Ecosystem Configuration for StudioCore (FW Core)
 * ====================================================
 * Tuned for 2-vCPU / 3.9 GiB RAM VPS:
 * - fw-core:          Next.js App Router (Port 3000, 2 Cluster Workers, 1200M limit)
 * - baileys-worker:   WhatsApp Socket & Message Queue (Port 3002, 1500M limit)
 * - webhook-listener: GitHub Auto-Deploy Webhook (Port 3001, 200M limit)
 */
module.exports = {
  apps: [
    {
      name: 'fw-core',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--max-http-header-size=131072 --max-old-space-size=950',
      max_memory_restart: '1200M',
      kill_timeout: 10000,
      listen_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        NODE_OPTIONS: '--max-http-header-size=131072 --max-old-space-size=950',
      },
      error_file: 'logs/fw-core-error.log',
      out_file: 'logs/fw-core-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'baileys-worker',
      script: './baileys-worker/dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1500M',
      kill_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        WORKER_PORT: '3002',
        LOG_LEVEL: 'info',
        NODE_OPTIONS: '--max-old-space-size=1200',
      },
      error_file: 'logs/baileys-worker-error.log',
      out_file: 'logs/baileys-worker-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'webhook-listener',
      script: './scripts/github-webhook-listener.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: '3001',
      },
      error_file: 'logs/webhook-error.log',
      out_file: 'logs/webhook-out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
    },
  ],
};

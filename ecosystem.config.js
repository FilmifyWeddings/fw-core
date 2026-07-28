/**
 * PM2 Ecosystem Configuration for FW Core
 * =========================================
 * - fw-core:        Next.js app (port 3000, single instance, 800MB limit)
 * - baileys-worker:  WhatsApp persistent socket (port 3002, 500MB limit)
 * - webhook-listener: GitHub auto-deploy (port 3001, 200MB limit)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'fw-core',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '800M',
      kill_timeout: 10000,
      listen_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
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
      max_memory_restart: '500M',
      kill_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        WORKER_PORT: '3002',
        LOG_LEVEL: 'info',
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

module.exports = {
  apps: [
    {
      name: 'baileys-worker',
      script: 'dist/server.js',
      cwd: '/var/www/fw-core/baileys-worker',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        WORKER_PORT: '3002',
      },
      out_file: '/var/www/fw-core/logs/baileys-worker-out.log',
      error_file: '/var/www/fw-core/logs/baileys-worker-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};

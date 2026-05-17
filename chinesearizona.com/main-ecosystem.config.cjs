module.exports = {
  apps: [
    {
      name: 'main-chinesearizona',
      cwd: '/var/www/chinesearizona.com/app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3001',
      interpreter: 'node',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '3001',
      },
    },
  ],
};

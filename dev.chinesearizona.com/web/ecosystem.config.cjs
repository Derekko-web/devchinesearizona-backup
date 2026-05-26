module.exports = {
  apps: [
    {
      name: 'dev-chinesearizona',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3002',
      interpreter: '/usr/bin/node',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '3002',
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'chinesearizona-host-router',
      cwd: '/var/www/ops',
      script: '/var/www/ops/chinesearizona-host-router.cjs',
      interpreter: 'node',
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

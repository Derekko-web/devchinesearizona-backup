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
      min_uptime: '30s',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        BUILD_TIME: process.env.BUILD_TIME || 'unknown',
        GIT_SHA: process.env.GIT_SHA || 'unknown',
        NODE_ENV: 'production',
        NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || process.env.BUILD_TIME || 'unknown',
        NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA || process.env.GIT_SHA || 'unknown',
        HOSTNAME: '127.0.0.1',
        PORT: '3002',
      },
    },
  ],
};

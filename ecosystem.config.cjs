const path = require('path')
const fs = require('fs')

// 获取项目根目录的绝对路径
const projectRoot = path.resolve(__dirname)
// ENV_PATH 应该是目录路径，而不是 .env 文件路径
// AdonisJS 会自动在这个目录下查找 .env 文件
const envDir = projectRoot

// 检查 .env 文件是否存在
const envFilePath = path.join(envDir, '.env')
if (!fs.existsSync(envFilePath)) {
  console.error(`⚠️  .env file not found at: ${envFilePath}`)
} else {
  console.log(`✅ .env file found at: ${envFilePath}`)
  console.log(`✅ ENV_PATH will be set to: ${envDir}`)
}

module.exports = {
  apps: [
    // 主应用
    {
      name: 'ayo',
      script: './build/bin/server.js',
      cwd: projectRoot,
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'development',
        PORT: 3333,
        ENV_PATH: envDir,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3333,
        ENV_PATH: envDir,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3334,
        ENV_PATH: envDir,
      },

      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      node_args: '--max-old-space-size=1024',

      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      post_update: ['npm install', 'node ace build'],
    },
  ],
}

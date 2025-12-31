const path = require('path')

// 获取项目根目录的绝对路径
const projectRoot = path.resolve(__dirname)
const envDir = projectRoot

/**
 * PM2 Queue Workers 配置文件
 * 
 * 使用方法：
 * 
 * # 只启动 Workers（不启动主应用）
 * pm2 start ecosystem.worker.config.cjs
 * 
 * # 查看 Workers 状态
 * pm2 status
 * 
 * # 查看 Workers 日志
 * pm2 logs ayo-worker
 * 
 * # 停止 Workers
 * pm2 stop ayo-worker
 * 
 * # 重启 Workers
 * pm2 restart ayo-worker
 * 
 * # 扩展 Workers 到 4 个进程
 * pm2 scale ayo-worker 4
 */
module.exports = {
  apps: [
    // Queue Workers（独立进程）
    {
      name: 'ayo-worker',
      script: './build/bin/worker.js',
      cwd: projectRoot,
      instances: 2, // 2 个 worker 进程
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M', // Worker 内存限制

      env: {
        NODE_ENV: 'development',
        ENV_PATH: envDir,
      },
      env_production: {
        NODE_ENV: 'production',
        ENV_PATH: envDir,
      },
      env_staging: {
        NODE_ENV: 'staging',
        ENV_PATH: envDir,
      },

      // 日志配置
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 进程管理
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Node.js 参数
      node_args: '--max-old-space-size=512',

      // 其他配置
      kill_timeout: 10000, // Worker 需要更长时间优雅退出
      shutdown_with_message: true,
    },
  ],
}


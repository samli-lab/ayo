module.exports = {
  apps: [
    {
      name: 'ayo',
      script: './build/bin/server.js',
      cwd: './', // 设置工作目录为项目根目录
      env_file: './.env', // 明确指定 .env 文件路径
      instances: 'max', // 使用所有可用CPU核心，也可以设置具体数字如 2
      exec_mode: 'cluster', // 集群模式，提高性能
      autorestart: true, // 自动重启
      watch: false, // 生产环境不建议开启文件监听
      max_memory_restart: '1G', // 内存超过1G自动重启

      // 环境变量配置
      env: {
        NODE_ENV: 'development',
        PORT: 3333,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3333,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3334,
      },

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // 合并集群日志

      // 进程管理
      min_uptime: '10s', // 应用至少运行10秒才认为启动成功
      max_restarts: 10, // 最大异常重启次数
      restart_delay: 4000, // 重启延迟4秒

      // Node.js 参数
      node_args: '--max-old-space-size=1024', // 设置最大内存

      // 其他配置
      kill_timeout: 5000, // 强制终止前等待5秒
      listen_timeout: 10000, // 应用启动超时时间
      shutdown_with_message: true, // 支持优雅关闭

      // 自动化操作
      post_update: ['npm install', 'node ace build'], // 更新后执行的命令
    },
  ],
}

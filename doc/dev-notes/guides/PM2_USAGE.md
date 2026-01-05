# PM2 使用说明

## 📋 配置文件说明

项目包含两个 PM2 配置文件：

| 文件 | 用途 | 包含的进程 |
|------|------|-----------|
| `ecosystem.config.cjs` | 主应用配置 | `ayo` (HTTP 服务器) |
| `ecosystem.worker.config.cjs` | Workers 配置 | `ayo-worker` (队列消费者) |

## 🚀 快速开始

### 开发环境

```bash
# 方式 1：不使用 PM2（推荐）
npm run dev

# 方式 2：使用 PM2
npm run build
pm2 start ecosystem.config.cjs
```

### 生产环境

```bash
# 1. 构建项目
npm run build

# 2. 启动主应用
pm2 start ecosystem.config.cjs

# 3. 需要时启动 Workers
pm2 start ecosystem.worker.config.cjs

# 4. 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

## 📊 常用命令

### 启动/停止

```bash
# 启动主应用
pm2 start ecosystem.config.cjs

# 启动 Workers
pm2 start ecosystem.worker.config.cjs

# 停止主应用
pm2 stop ayo

# 停止 Workers
pm2 stop ayo-worker

# 停止所有
pm2 stop all

# 删除进程
pm2 delete ayo
pm2 delete ayo-worker
pm2 delete all
```

### 查看状态

```bash
# 查看所有进程
pm2 status

# 实时监控
pm2 monit

# 查看日志
pm2 logs              # 所有进程
pm2 logs ayo          # 主应用
pm2 logs ayo-worker   # Workers

# 实时日志
pm2 logs --lines 100
```

### 重启

```bash
# 重启主应用
pm2 restart ayo

# 重启 Workers
pm2 restart ayo-worker

# 重启所有
pm2 restart all

# 重新加载（0 秒停机）
pm2 reload ayo
```

### 扩展

```bash
# 扩展主应用到 8 个进程
pm2 scale ayo 8

# 扩展 Workers 到 4 个进程
pm2 scale ayo-worker 4
```

## 🎯 典型使用场景

### 场景 1：只运行主应用（不需要队列）

```bash
pm2 start ecosystem.config.cjs
```

### 场景 2：主应用 + Workers 都运行

```bash
pm2 start ecosystem.config.cjs
pm2 start ecosystem.worker.config.cjs
```

### 场景 3：只运行 Workers（用于测试队列）

```bash
pm2 start ecosystem.worker.config.cjs
```

### 场景 4：临时启动 Worker（开发调试）

```bash
# 不使用 PM2，直接命令行
node ace queue:worker
```

## 📝 进程管理

### 查看进程信息

```bash
# 进程列表
pm2 list

# 详细信息
pm2 show ayo
pm2 show ayo-worker

# 实时监控
pm2 monit
```

### 日志管理

```bash
# 查看实时日志
pm2 logs ayo-worker --lines 50

# 清空日志
pm2 flush

# 日志文件位置
logs/pm2-error.log         # 主应用错误日志
logs/pm2-out.log           # 主应用输出日志
logs/pm2-worker-error.log  # Worker 错误日志
logs/pm2-worker-out.log    # Worker 输出日志
```

### 配置持久化

```bash
# 保存当前进程列表
pm2 save

# 设置开机自启
pm2 startup

# 取消开机自启
pm2 unstartup

# 恢复保存的进程
pm2 resurrect
```

## 🔧 进程配置对比

### 主应用 (ayo)

```javascript
{
  instances: 'max',          // 使用所有 CPU 核心
  max_memory_restart: '1G',  // 内存限制 1GB
  kill_timeout: 5000         // 5 秒优雅退出
}
```

### Workers (ayo-worker)

```javascript
{
  instances: 2,              // 固定 2 个进程
  max_memory_restart: '512M', // 内存限制 512MB
  kill_timeout: 10000        // 10 秒优雅退出（处理队列需要更长时间）
}
```

## ⚙️ 环境切换

```bash
# 开发环境
pm2 start ecosystem.config.cjs

# 生产环境
pm2 start ecosystem.config.cjs --env production

# 预发布环境
pm2 start ecosystem.config.cjs --env staging
```

## 🐛 故障排查

### 问题 1：Worker 无法启动

```bash
# 检查构建是否完成
ls -la build/bin/worker.js

# 检查日志
pm2 logs ayo-worker --err

# 手动测试
node build/bin/worker.js
```

### 问题 2：Worker 频繁重启

```bash
# 查看错误日志
cat logs/pm2-worker-error.log

# 增加内存限制
# 编辑 ecosystem.worker.config.cjs
max_memory_restart: '1G'  # 改为 1GB
```

### 问题 3：消息处理缓慢

```bash
# 增加 Worker 进程数
pm2 scale ayo-worker 4

# 或编辑配置文件
instances: 4
```

## 📚 相关文档

- [Worker 完整指南](./doc/dev-notes/guides/QUEUE_WORKERS_GUIDE.md)
- [Worker 快速开始](./doc/dev-notes/guides/QUEUE_WORKERS_QUICKSTART.md)
- [消息队列指南](./doc/dev-notes/guides/REDIS_QUEUE_GUIDE.md)

## 💡 最佳实践

1. ✅ **开发环境**：使用 `node ace queue:worker`（灵活、易调试）
2. ✅ **生产环境**：使用 PM2（稳定、可监控）
3. ✅ **主应用和 Workers 分离**：使用两个配置文件（互不影响）
4. ✅ **按需启动 Workers**：不需要队列时不启动，节省资源
5. ✅ **监控日志**：定期检查 Worker 日志，及时发现问题


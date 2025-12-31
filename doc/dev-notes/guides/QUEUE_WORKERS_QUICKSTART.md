# Queue Workers 快速开始

## 🚀 5 分钟上手

### 第 1 步：创建 Worker

已经创建好了示例 Worker，在 `app/workers/` 目录：
- `email_worker.ts` - 邮件队列处理
- `image_worker.ts` - 图片处理

### 第 2 步：启动 Worker

```bash
# 开发环境：命令行启动
node ace queue:worker

# 生产环境：PM2 启动（需要时）
npm run build
pm2 start ecosystem.worker.config.cjs
```

### 第 3 步：推送消息

```typescript
import { QueueService } from '#services/redis/queue_service'

// 推送邮件任务
await QueueService.push('email-queue', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!'
})
```

### 第 4 步：查看日志

```bash
# PM2 日志
pm2 logs ayo-worker

# 或查看文件
tail -f logs/pm2-worker-out.log
```

## 📋 常用命令

### 开发环境

```bash
# 启动主应用
npm run dev

# 新开终端，启动 Workers
node ace queue:worker

# 启动指定的 Worker
node ace queue:worker --workers=email
```

### 生产环境

```bash
# 构建
npm run build

# 启动主应用（默认）
pm2 start ecosystem.config.cjs

# 需要时单独启动 Workers
pm2 start ecosystem.worker.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs ayo-worker

# 重启 Workers
pm2 restart ayo-worker

# 停止 Workers
pm2 stop ayo-worker

# 删除 Workers
pm2 delete ayo-worker
```

## 🎯 快速测试

### 1. 推送测试消息

```bash
# 使用 API 推送
curl -X POST http://localhost:3333/api/queue/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "body": "Hello from queue"
  }'
```

### 2. 查看 Worker 日志

```bash
pm2 logs ayo-worker
```

你应该能看到：
```
[EmailWorker] Sending email to test@example.com
[EmailWorker] Email sent to test@example.com
```

## 📚 详细文档

- [完整 Worker 指南](./QUEUE_WORKERS_GUIDE.md)
- [消息队列指南](./REDIS_QUEUE_GUIDE.md)


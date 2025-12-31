# 队列 Worker 运行指南

## 📚 概述

队列 Worker（消费者）负责从队列中获取消息并处理。本项目提供了多种运行 Worker 的方式，适应不同的部署场景。

## 📁 文件结构

```
app/workers/
├── email_worker.ts      # 邮件队列 Worker
├── image_worker.ts      # 图片处理 Worker
└── index.ts            # Worker 管理器

commands/
├── queue_worker.ts              # Worker 命令
└── process_delayed_queues.ts    # 延迟队列处理命令

bin/
└── worker.ts           # 独立 Worker 进程入口

start/
└── workers.ts          # 应用启动时的 Worker 初始化（可选）
```

## 🚀 运行方式

### 方式 1：命令行方式（推荐用于开发）

适合开发和调试，可以随时启动/停止。

```bash
# 启动所有 workers
node ace queue:worker

# 启动指定的 workers
node ace queue:worker --workers=email

# 启动多个指定的 workers
node ace queue:worker --workers=email,image
```

**优点**：
- ✅ 灵活，可以按需启动
- ✅ 日志清晰，便于调试
- ✅ 可以独立重启

**缺点**：
- ❌ 需要手动启动
- ❌ 终端关闭后进程退出

---

### 方式 2：PM2 独立进程（推荐用于生产）

使用 PM2 管理独立的 Worker 进程。

```bash
# 构建项目
npm run build

# 启动主应用（不包括 Workers）
pm2 start ecosystem.config.cjs

# 需要时单独启动 Workers
pm2 start ecosystem.worker.config.cjs

# 或者一次性启动所有（主应用 + Workers）
pm2 start ecosystem.config.cjs && pm2 start ecosystem.worker.config.cjs

# 停止 Workers
pm2 stop ayo-worker

# 重启 Workers
pm2 restart ayo-worker

# 查看 Workers 日志
pm2 logs ayo-worker

# 查看进程状态
pm2 status

# 扩展 Worker 进程数量
pm2 scale ayo-worker 4
```

**优点**：
- ✅ 自动重启
- ✅ 进程管理完善
- ✅ 独立进程，不影响主应用
- ✅ 可以独立扩展 Worker 数量
- ✅ 日志管理

**缺点**：
- ❌ 需要构建项目

**PM2 配置**：

主应用配置：`ecosystem.config.cjs`
```javascript
{
  name: 'ayo',
  script: './build/bin/server.js',
  instances: 'max'
}
```

Workers 配置（独立文件）：`ecosystem.worker.config.cjs`
```javascript
{
  name: 'ayo-worker',
  script: './build/bin/worker.js',
  instances: 2,              // 2 个 worker 进程
  exec_mode: 'cluster',
  max_memory_restart: '512M'
}
```

---

### 方式 3：和主应用一起启动（不推荐）

Workers 随主应用启动，适合小型项目。

#### 启用步骤：

**1. 添加环境变量**
```env
# .env
ENABLE_QUEUE_WORKERS=true
```

**2. 在 `adonisrc.ts` 中启用 preload**
```typescript
preloads: [
  () => import('#start/db_debug'),
  () => import('#start/growthbook'),
  () => import('#start/routes'),
  () => import('#start/kernel'),
  () => import('#start/ws'),
  () => import('#start/workers'),  // ← 取消注释这行
]
```

**3. 启动应用**
```bash
npm run dev
```

**优点**：
- ✅ 配置简单
- ✅ 一个命令启动所有服务

**缺点**：
- ❌ Workers 和主应用耦合
- ❌ Worker 崩溃会影响主应用
- ❌ 无法独立扩展
- ❌ 不推荐用于生产环境

---

### 方式 4：定时任务方式（用于延迟队列）

使用 cron 或系统定时任务处理延迟队列。

```bash
# 手动执行
node ace queue:process-delayed

# 配置 crontab（每分钟执行一次）
crontab -e

# 添加以下行
* * * * * cd /path/to/ayo && node ace queue:process-delayed >> logs/cron.log 2>&1
```

**或使用 PM2 cron 模式**：

创建 `ecosystem.cron.config.cjs`：
```javascript
module.exports = {
  apps: [
    {
      name: 'ayo-delayed-processor',
      script: 'node',
      args: 'ace queue:process-delayed',
      cron_restart: '*/1 * * * *',  // 每分钟执行
      autorestart: false,
      watch: false
    }
  ]
}
```

---

## 💡 推荐部署方案

### 开发环境

```bash
# Terminal 1: 主应用
npm run dev

# Terminal 2: Workers（按需启动）
node ace queue:worker
```

---

### 生产环境

```bash
# 1. 构建项目
npm run build

# 2. 启动主应用
pm2 start ecosystem.config.cjs

# 3. 需要时启动 Workers
pm2 start ecosystem.worker.config.cjs

# 4. 配置 crontab 处理延迟队列（如果使用延迟队列）
crontab -e
# 添加：* * * * * cd /path/to/ayo && node ace queue:process-delayed
```

**进程架构**：
```
PM2 进程管理
├─ ayo (主应用)
│  ├─ 进程 1 (端口 3333)
│  ├─ 进程 2 (端口 3333)
│  └─ 进程 N...
│
└─ ayo-worker (队列 Workers)
   ├─ Worker 进程 1
   │  ├─ EmailWorker (3 个并发)
   │  └─ ImageWorker (5 个并发)
   └─ Worker 进程 2
      ├─ EmailWorker (3 个并发)
      └─ ImageWorker (5 个并发)
```

---

## 🔧 Worker 管理命令

```bash
# 查看所有进程
pm2 status

# 查看主应用日志
pm2 logs ayo

# 查看 Worker 日志
pm2 logs ayo-worker

# 只重启 Workers（不影响主应用）
pm2 restart ayo-worker

# 扩展 Workers（增加到 4 个进程）
pm2 scale ayo-worker 4

# 停止 Workers
pm2 stop ayo-worker

# 删除 Workers
pm2 delete ayo-worker

# 监控
pm2 monit
```

---

## 📝 创建新的 Worker

### 第 1 步：创建 Worker 类

```typescript
// app/workers/notification_worker.ts
import { QueueService, QueueMessage } from '#services/redis/queue_service'
import logger from '@adonisjs/core/services/logger'

export class NotificationWorker {
  private stopCallback: (() => void) | null = null

  start() {
    logger.info('[NotificationWorker] Starting...')

    this.stopCallback = QueueService.startWorker(
      'notification-queue',
      async (message) => {
        await this.processMessage(message)
      },
      {
        concurrency: 2,
        pollInterval: 1000,
      }
    )

    logger.info('[NotificationWorker] Started')
  }

  stop() {
    if (this.stopCallback) {
      this.stopCallback()
      logger.info('[NotificationWorker] Stopped')
    }
  }

  private async processMessage(message: QueueMessage<any>) {
    // 处理逻辑
    await sendNotification(message.data)
  }
}
```

### 第 2 步：注册到 WorkerManager

```typescript
// app/workers/index.ts
import { NotificationWorker } from './notification_worker.js'

export class WorkerManager {
  static startAll() {
    const emailWorker = new EmailWorker()
    const imageWorker = new ImageWorker()
    const notificationWorker = new NotificationWorker()  // ← 添加

    emailWorker.start()
    imageWorker.start()
    notificationWorker.start()  // ← 启动

    // ...
  }
}
```

---

## ⚠️ 注意事项

### 1. 不要在控制器中启动 Worker

```typescript
// ❌ 错误：不要这样做
export default class MyController {
  async index(ctx: HttpContext) {
    QueueService.startWorker('queue', async (msg) => {
      // 这会为每个请求启动一个 Worker！
    })
  }
}

// ✅ 正确：在应用启动时或独立进程中启动
// 见上面的运行方式
```

### 2. 优雅退出

确保 Worker 在收到退出信号时能完成当前任务：

```typescript
// bin/worker.ts 中已经处理
process.on('SIGTERM', () => {
  WorkerManager.stopAll()
  // 等待当前任务完成
  setTimeout(() => process.exit(0), 5000)
})
```

### 3. 错误处理

Worker 中的错误会触发重试机制：

```typescript
private async processMessage(message: QueueMessage<any>) {
  try {
    await doSomething(message.data)
  } catch (error) {
    logger.error('Processing failed', error)
    throw error  // ← 重要：抛出错误以触发重试
  }
}
```

### 4. 监控 Worker 健康状况

```bash
# 查看 Worker 进程
pm2 list

# 查看 Worker 日志
tail -f logs/pm2-worker-out.log

# 监控内存和 CPU
pm2 monit
```

---

## 🎯 最佳实践总结

| 环境 | 推荐方式 | 命令 |
|------|---------|------|
| **开发** | 命令行 | `node ace queue:worker` |
| **测试** | 命令行 | `node ace queue:worker` |
| **生产** | PM2 独立进程 | `pm2 start ecosystem.config.cjs` |
| **延迟队列** | Crontab | `* * * * * node ace queue:process-delayed` |

---

## 📚 相关文档

- [消息队列使用指南](./REDIS_QUEUE_GUIDE.md)
- [PM2 配置](../../../ecosystem.config.cjs)
- [Worker 源码](../../../app/workers/)
- [Queue 命令](../../../commands/queue_worker.ts)


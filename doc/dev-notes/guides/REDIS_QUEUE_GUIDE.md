# Redis 队列服务使用指南

## 📚 概述

`QueueService` 是基于 Redis List 和 Sorted Set 实现的消息队列服务，支持多种队列模式。

## 🎯 核心特性

- ✅ **FIFO 队列** - 先进先出
- ✅ **优先级队列** - 基于优先级处理
- ✅ **延迟队列** - 定时执行任务
- ✅ **死信队列** - 失败消息处理
- ✅ **批量处理** - 高效处理消息
- ✅ **持久化** - 基于 Redis 持久化
- ✅ **重试机制** - 自动重试失败消息

## 🚀 快速开始

### 基础用法

```typescript
import { QueueService } from '#services/redis/queue_service'

// 生产者：推送消息
await QueueService.push('email-queue', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!'
})

// 消费者：处理消息
const message = await QueueService.pop('email-queue')
if (message) {
  await sendEmail(message.data)
}
```

## 📖 API 文档

### 1. 基础队列操作

#### `push(queue, data, options?)`

推送消息到队列尾部（FIFO）。

```typescript
const messageId = await QueueService.push('my-queue', {
  task: 'send-email',
  userId: 123
}, {
  maxAttempts: 5,  // 最大重试 5 次
  ttl: 3600        // 队列 1 小时后过期
})
```

#### `pop(queue)`

从队列头部弹出消息。

```typescript
const message = await QueueService.pop('my-queue')
if (message) {
  console.log(message.id, message.data)
}
```

#### `blockingPop(queue, timeout?)`

阻塞式弹出，如果队列为空会等待。

```typescript
// 等待最多 10 秒
const message = await QueueService.blockingPop('my-queue', 10)
```

---

### 2. 批量操作

#### `pushBatch(queue, items)`

批量推送消息。

```typescript
const ids = await QueueService.pushBatch('email-queue', [
  { to: 'user1@example.com' },
  { to: 'user2@example.com' },
  { to: 'user3@example.com' }
])
```

#### `processBatch(queue, processor, batchSize?)`

批量处理消息。

```typescript
const result = await QueueService.processBatch(
  'email-queue',
  async (message) => {
    await sendEmail(message.data)
  },
  10  // 每次处理 10 条
)

console.log(`成功: ${result.processed}, 失败: ${result.failed}`)
```

---

### 3. 优先级队列

#### `pushPriority(queue, data, priority)`

推送带优先级的消息（数字越小优先级越高）。

```typescript
await QueueService.pushPriority('task-queue', urgentTask, 1)    // 高优先级
await QueueService.pushPriority('task-queue', normalTask, 5)    // 中优先级
await QueueService.pushPriority('task-queue', lowTask, 10)      // 低优先级
```

#### `popPriority(queue)`

弹出优先级最高的消息。

```typescript
const message = await QueueService.popPriority('task-queue')
// 总是返回优先级最高的消息
```

---

### 4. 延迟队列

#### `pushDelayed(queue, data, delaySeconds)`

推送延迟消息。

```typescript
// 5 分钟后执行
await QueueService.pushDelayed('reminder-queue', {
  userId: 123,
  message: 'Your order is ready'
}, 300)
```

#### `processDelayed(queue)`

处理到期的延迟消息（需要定时调用）。

```typescript
// 在定时任务中每秒执行一次
setInterval(async () => {
  await QueueService.processDelayed('reminder-queue')
}, 1000)
```

---

### 5. 失败处理

#### `retry(queue, message)`

重试失败的消息。

```typescript
const message = await QueueService.pop('email-queue')

try {
  await sendEmail(message.data)
} catch (error) {
  // 重试（如果未超过最大重试次数）
  const retried = await QueueService.retry('email-queue', message)
  
  if (!retried) {
    console.log('消息已移入死信队列')
  }
}
```

#### `getDeadLetterQueue(queue)`

查看死信队列（失败的消息）。

```typescript
const failedMessages = await QueueService.getDeadLetterQueue('email-queue')
```

#### `clearDeadLetterQueue(queue)`

清空死信队列。

```typescript
await QueueService.clearDeadLetterQueue('email-queue')
```

---

### 6. 队列管理

#### `length(queue)`

获取队列长度。

```typescript
const length = await QueueService.length('email-queue')
```

#### `peek(queue, start?, stop?)`

查看消息（不弹出）。

```typescript
// 查看前 10 条消息
const messages = await QueueService.peek('email-queue', 0, 9)
```

#### `stats(queue)`

获取队列统计信息。

```typescript
const stats = await QueueService.stats('email-queue')
console.log(stats)
// {
//   pending: 100,      // 待处理消息数
//   failed: 5,         // 失败消息数
//   oldestMessage: 1735689600000  // 最老消息的时间戳
// }
```

#### `clear(queue)`

清空队列。

```typescript
await QueueService.clear('email-queue')
```

---

### 7. Worker 模式

#### `startWorker(queue, processor, options?)`

启动队列消费者。

```typescript
// 启动 worker
const stopWorker = QueueService.startWorker(
  'email-queue',
  async (message) => {
    await sendEmail(message.data)
  },
  {
    concurrency: 3,     // 3 个并发 worker
    pollInterval: 1000  // 轮询间隔 1 秒
  }
)

// 停止 worker
// stopWorker()
```

## 🎯 实际应用场景

### 1. 异步邮件发送

```typescript
// 控制器中
export default class UserController {
  async register(ctx: HttpContext) {
    const user = await User.create(ctx.request.body())

    // 立即返回，异步发送邮件
    await QueueService.push('email-queue', {
      to: user.email,
      template: 'welcome',
      data: { name: user.fullName }
    })

    return ctx.response.json({
      success: true,
      message: '注册成功'
    })
  }
}

// Worker（单独进程或定时任务）
QueueService.startWorker('email-queue', async (message) => {
  const { to, template, data } = message.data
  await mailer.send(to, template, data)
})
```

---

### 2. 图片处理队列

```typescript
// 上传后加入队列
export default class ImageController {
  async upload(ctx: HttpContext) {
    const file = ctx.request.file('image')
    const url = await storage.save(file)

    // 异步处理：生成缩略图、添加水印等
    await QueueService.push('image-process-queue', {
      url,
      operations: ['thumbnail', 'watermark', 'compress']
    })

    return { url }
  }
}

// Worker 处理
QueueService.startWorker('image-process-queue', async (message) => {
  const { url, operations } = message.data
  
  for (const op of operations) {
    await imageProcessor.apply(url, op)
  }
}, { concurrency: 5 })  // 5 个并发处理
```

---

### 3. 订单超时取消

```typescript
// 创建订单时
export default class OrderController {
  async create(ctx: HttpContext) {
    const order = await Order.create(ctx.request.body())

    // 30 分钟后检查订单状态
    await QueueService.pushDelayed('order-timeout-queue', {
      orderId: order.id
    }, 1800)  // 30 分钟

    return { order }
  }
}

// 定时任务：每分钟处理一次延迟消息
setInterval(async () => {
  await QueueService.processDelayed('order-timeout-queue')
}, 60000)

// Worker：处理超时订单
QueueService.startWorker('order-timeout-queue', async (message) => {
  const order = await Order.find(message.data.orderId)
  
  if (order.status === 'pending') {
    order.status = 'cancelled'
    await order.save()
  }
})
```

---

### 4. 数据同步队列

```typescript
// 用户更新时同步到其他系统
export default class UserController {
  async update(ctx: HttpContext) {
    const user = await User.find(ctx.params.id)
    user.merge(ctx.request.body())
    await user.save()

    // 异步同步到其他系统
    await QueueService.push('user-sync-queue', {
      action: 'update',
      userId: user.id,
      data: user.toJSON()
    })

    return { user }
  }
}

// Worker
QueueService.startWorker('user-sync-queue', async (message) => {
  await syncToExternalSystem(message.data)
}, { concurrency: 2 })
```

---

### 5. 任务优先级处理

```typescript
// 推送不同优先级的任务
await QueueService.pushPriority('task-queue', {
  type: 'urgent-backup',
  data: criticalData
}, 1)  // 优先级 1（最高）

await QueueService.pushPriority('task-queue', {
  type: 'regular-backup',
  data: normalData
}, 5)  // 优先级 5

// Worker 总是先处理高优先级任务
QueueService.startWorker('task-queue', async (message) => {
  await performBackup(message.data)
})
```

## 📊 Redis 存储格式

### 普通队列

```
Key: queue:email-queue
Type: List
Value: [
  '{"id":"123-abc","data":{...},"createdAt":1735689600000}',
  '{"id":"124-def","data":{...},"createdAt":1735689601000}',
  ...
]
```

### 优先级队列

```
Key: queue:task-queue:priority
Type: Sorted Set
Members: [
  '{"id":"123-abc","data":{...}}' (score: 1),
  '{"id":"124-def","data":{...}}' (score: 5),
  '{"id":"125-ghi","data":{...}}' (score: 10)
]
```

### 延迟队列

```
Key: queue:reminder-queue:delayed
Type: Sorted Set
Members: [
  '{"id":"123-abc","data":{...}}' (score: 1735689900000),  // 执行时间戳
  '{"id":"124-def","data":{...}}' (score: 1735690200000)
]
```

### 死信队列

```
Key: queue:email-queue:dlq
Type: List
Value: [
  '{"id":"123-abc","data":{...},"failedAt":1735689700000,"attempts":3}',
  ...
]
```

## 🔧 高级用法

### 定时任务处理延迟队列

创建一个定时任务来处理延迟消息：

```typescript
// commands/process_delayed_queues.ts
import { BaseCommand } from '@adonisjs/core/ace'
import { QueueService } from '#services/redis/queue_service'

export default class ProcessDelayedQueues extends BaseCommand {
  static commandName = 'queue:process-delayed'

  async run() {
    const queues = ['reminder-queue', 'order-timeout-queue']

    for (const queue of queues) {
      const processed = await QueueService.processDelayed(queue)
      this.logger.info(`Processed ${processed} delayed messages from ${queue}`)
    }
  }
}
```

然后在 crontab 或 PM2 中每分钟执行一次。

---

### 监控队列健康状况

```typescript
export default class QueueMonitorController {
  async monitor(ctx: HttpContext) {
    const queues = ['email-queue', 'image-queue', 'sync-queue']
    const health = []

    for (const queue of queues) {
      const stats = await QueueService.stats(queue)
      const messages = await QueueService.peek(queue, 0, 0)

      health.push({
        queue,
        ...stats,
        oldestMessageAge: messages[0] 
          ? Date.now() - messages[0].createdAt 
          : null
      })
    }

    return ctx.response.json({ health })
  }
}
```

---

### 优雅关闭

```typescript
// bin/server.ts
let emailWorkerStop: (() => void) | null = null

app.booting(async () => {
  // 启动 worker
  emailWorkerStop = QueueService.startWorker('email-queue', async (msg) => {
    await processEmail(msg.data)
  })
})

app.terminating(async () => {
  // 停止 worker
  if (emailWorkerStop) {
    emailWorkerStop()
    // 等待当前任务完成
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
})
```

## 🧪 测试 API

启动应用后可以测试：

```bash
# 推送消息
POST http://localhost:3333/api/queue/push
{
  "message": "Hello Queue"
}

# 弹出消息
GET http://localhost:3333/api/queue/pop

# 推送优先级消息
POST http://localhost:3333/api/queue/push
{
  "message": "Urgent task",
  "priority": 1
}

# 推送延迟消息
POST http://localhost:3333/api/queue/delayed
{
  "message": "Reminder",
  "delaySeconds": 60
}

# 处理延迟消息
POST http://localhost:3333/api/queue/process-delayed

# 查看队列统计
GET http://localhost:3333/api/queue/stats?queue=example-queue

# 查看队列消息
GET http://localhost:3333/api/queue/peek?queue=example-queue&limit=10

# 查看死信队列
GET http://localhost:3333/api/queue/dlq?queue=example-queue

# 批量处理
POST http://localhost:3333/api/queue/batch-process?batchSize=10

# 清空队列
DELETE http://localhost:3333/api/queue/clear?queue=example-queue
```

## ⚠️ 注意事项

### 1. 消息丢失风险

```typescript
// ❌ 不安全：如果处理失败，消息会丢失
const message = await QueueService.pop('queue')
await processMessage(message.data)  // 如果这里失败，消息丢了

// ✅ 安全：使用重试机制
const message = await QueueService.pop('queue')
try {
  await processMessage(message.data)
} catch (error) {
  await QueueService.retry('queue', message)
}
```

### 2. 重复消费问题

队列本身不保证消息只被消费一次，需要在业务层面处理幂等性：

```typescript
// 使用分布式锁确保幂等
import { LockService } from '#services/redis/lock_service'

const message = await QueueService.pop('order-queue')

await LockService.run(
  LockService.resourceKey('order', message.data.orderId),
  async () => {
    await processOrder(message.data.orderId)
  }
)
```

### 3. 内存占用

大量消息会占用 Redis 内存，建议：
- 定期清理已处理消息
- 设置队列 TTL
- 监控队列长度

```typescript
// 定时清理长队列
if (await QueueService.length('queue') > 10000) {
  logger.warn('Queue too long, clearing old messages')
  await QueueService.clear('queue')
}
```

### 4. 延迟队列的定时处理

延迟队列需要定时调用 `processDelayed()`：

```typescript
// 使用定时任务
setInterval(async () => {
  await QueueService.processDelayed('delayed-queue')
}, 1000)  // 每秒检查一次
```

## 📈 性能优化

### 1. 使用批量处理

```typescript
// ❌ 逐个处理，慢
for (let i = 0; i < 100; i++) {
  const msg = await QueueService.pop('queue')
  await process(msg)
}

// ✅ 批量处理，快
await QueueService.processBatch('queue', async (msg) => {
  await process(msg)
}, 100)
```

### 2. 并发 Worker

```typescript
// 启动多个并发 worker
const stop = QueueService.startWorker('queue', processor, {
  concurrency: 5  // 5 个并发处理
})
```

### 3. 使用阻塞式弹出

```typescript
// ❌ 轮询，浪费资源
while (true) {
  const msg = await QueueService.pop('queue')
  if (!msg) {
    await sleep(1000)
    continue
  }
  await process(msg)
}

// ✅ 阻塞式，高效
while (true) {
  const msg = await QueueService.blockingPop('queue', 10)
  if (msg) {
    await process(msg)
  }
}
```

## 🔍 监控和调试

### 查看所有队列

```bash
redis-cli KEYS "queue:*"
```

### 查看队列长度

```bash
redis-cli LLEN "queue:email-queue"
```

### 查看队列内容

```bash
redis-cli LRANGE "queue:email-queue" 0 9
```

### 查看延迟队列

```bash
redis-cli ZRANGE "queue:reminder-queue:delayed" 0 -1 WITHSCORES
```

## 📚 相关资源

- [Redis List 命令](https://redis.io/commands/?group=list)
- [Redis Sorted Set 命令](https://redis.io/commands/?group=sorted-set)
- [源码位置](../../../app/services/redis/queue_service.ts)


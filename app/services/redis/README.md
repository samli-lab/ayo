# Redis 服务模块

本目录包含所有基于 Redis 的服务封装。

## 📁 文件结构

```
redis/
├── lock_service.ts      # 分布式锁服务
├── cache_service.ts     # 缓存服务
├── queue_service.ts     # 消息队列服务
├── index.ts            # 统一导出
└── README.md           # 本文档
```

## 🚀 快速使用

### 统一导入

```typescript
import { LockService, CacheService, QueueService } from '#services/redis'
// 或者分别导入
import { LockService } from '#services/redis/lock_service'
import { CacheService } from '#services/redis/cache_service'
import { QueueService } from '#services/redis/queue_service'
```

## 📦 服务列表

### 1. LockService - 分布式锁

用于解决并发控制问题。

```typescript
// 基础使用
await LockService.run('my-task', async () => {
  // 同一时间只有一个进程能执行
  await someOperation()
})

// 非阻塞模式
const result = await LockService.tryRun('cleanup', async () => {
  return await cleanup()
})
```

**详细文档**: [分布式锁完整指南](../../../doc/dev-notes/guides/DISTRIBUTED_LOCK_GUIDE.md)

---

### 2. CacheService - 缓存服务

简化 Redis 缓存操作的工具类。

```typescript
// 设置缓存
await CacheService.set('user:123', userData, 3600)

// 获取缓存
const user = await CacheService.get<User>('user:123')

// 缓存穿透解决方案
const user = await CacheService.remember('user:123', async () => {
  return await User.find(123)
}, 3600)

// 删除缓存
await CacheService.delete('user:123')

// 模式匹配删除
await CacheService.deletePattern('user:*')
```

**API 列表**:
- `set(key, value, ttl)` - 设置缓存
- `get(key)` - 获取缓存
- `remember(key, factory, ttl)` - 缓存穿透解决方案
- `delete(...keys)` - 删除缓存
- `deletePattern(pattern)` - 批量删除
- `has(key)` - 检查是否存在
- `extend(key, ttl)` - 延长过期时间
- `ttl(key)` - 获取剩余时间
- `flush()` - 清空所有缓存
- `key(...parts)` - 生成缓存键

---

### 3. QueueService - 消息队列服务

基于 Redis 实现的功能完整的消息队列系统。

```typescript
// 推送消息
await QueueService.push('email-queue', {
  to: 'user@example.com',
  subject: 'Hello'
})

// 消费消息
const message = await QueueService.pop('email-queue')
if (message) {
  await sendEmail(message.data)
}

// 优先级队列
await QueueService.pushPriority('task-queue', urgentTask, 1)
const task = await QueueService.popPriority('task-queue')

// 延迟队列
await QueueService.pushDelayed('reminder-queue', data, 300)  // 5分钟后
await QueueService.processDelayed('reminder-queue')

// 启动 Worker
const stop = QueueService.startWorker('email-queue', async (msg) => {
  await processEmail(msg.data)
}, { concurrency: 3 })
```

**支持的队列类型**：
- ✅ FIFO 队列（先进先出）
- ✅ 优先级队列
- ✅ 延迟队列
- ✅ 死信队列（DLQ）

**API 列表**：
- `push(queue, data, options?)` - 推送消息
- `pushBatch(queue, items)` - 批量推送
- `pop(queue)` - 弹出消息
- `blockingPop(queue, timeout?)` - 阻塞式弹出
- `pushPriority(queue, data, priority)` - 推送优先级消息
- `popPriority(queue)` - 弹出优先级消息
- `pushDelayed(queue, data, delaySeconds)` - 推送延迟消息
- `processDelayed(queue)` - 处理延迟消息
- `retry(queue, message)` - 重试失败消息
- `length(queue)` - 队列长度
- `peek(queue, start?, stop?)` - 查看消息
- `stats(queue)` - 队列统计
- `clear(queue)` - 清空队列
- `startWorker(queue, processor, options?)` - 启动消费者
- `getDeadLetterQueue(queue)` - 查看死信队列
- `clearDeadLetterQueue(queue)` - 清空死信队列

**详细文档**: [消息队列完整指南](../../../doc/dev-notes/guides/REDIS_QUEUE_GUIDE.md)

---

## 🎯 未来计划

以下是计划添加的 Redis 服务：

- [x] **QueueService** - 消息队列服务 ✅
- [ ] **RateLimitService** - 更灵活的限流服务
- [ ] **SessionService** - 会话管理
- [ ] **PubSubService** - 发布订阅服务
- [ ] **LeaderboardService** - 排行榜服务
- [ ] **CounterService** - 计数器服务

## 📝 添加新服务

创建新的 Redis 服务时，请遵循以下规范：

1. **文件命名**: `service_name_service.ts`
2. **类命名**: `ServiceNameService`
3. **导出**: 在 `index.ts` 中添加导出
4. **文档**: 添加完整的 JSDoc 注释
5. **日志**: 使用 `logger` 记录关键操作

**示例**:

```typescript
// queue_service.ts
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

export class QueueService {
  static async push(queue: string, data: any): Promise<void> {
    await redis.rpush(queue, JSON.stringify(data))
    logger.debug(`[Queue] Pushed to ${queue}`)
  }
  
  // ... more methods
}
```

```typescript
// index.ts
export { QueueService } from './queue_service.js'
```

## 🔗 相关文档

- [分布式锁完整指南](../../../doc/dev-notes/guides/DISTRIBUTED_LOCK_GUIDE.md)
- [分布式锁快速开始](../../../doc/dev-notes/guides/DISTRIBUTED_LOCK_QUICKSTART.md)
- [Redis 配置](../../../config/redis.ts)

## 💡 最佳实践

1. ✅ **使用语义化的键名**
   ```typescript
   CacheService.key('user', 123)  // 'cache:user:123'
   LockService.resourceKey('order', 456)  // 'lock:order:456'
   ```

2. ✅ **设置合理的 TTL**
   ```typescript
   // 短期数据: 5-10 分钟
   await CacheService.set('temp', data, 300)
   
   // 中期数据: 1 小时
   await CacheService.set('user', data, 3600)
   
   // 长期数据: 1 天
   await CacheService.set('config', data, 86400)
   ```

3. ✅ **异常处理**
   ```typescript
   try {
     await LockService.run('task', async () => {
       // ...
     })
   } catch (error) {
     logger.error('Task failed', error)
   }
   ```

4. ✅ **记录日志**
   所有服务默认启用日志，便于调试和监控。


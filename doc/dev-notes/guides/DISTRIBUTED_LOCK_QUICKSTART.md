# 分布式锁 - 快速开始

## 🚀 5 分钟上手

### 第 1 步：确保 Redis 已配置

检查 `.env` 文件：

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LOCK_STORE=redis
```

### 第 2 步：基础使用

```typescript
import { LockService } from '#services/redis'

// 最简单的用法
await LockService.run('my-task', async () => {
  // 这里的代码同一时间只有一个进程能执行
  await doSomething()
})
```

### 第 3 步：常见场景

#### 防止订单重复处理

```typescript
await LockService.run(
  LockService.resourceKey('order', orderId),
  async () => {
    const order = await Order.find(orderId)
    await processPayment(order)
    order.status = 'processed'
    await order.save()
  }
)
```

#### 防止用户重复提交

```typescript
await LockService.run(
  LockService.operationKey('update-profile', userId),
  async () => {
    await updateUserProfile(userId, data)
  },
  {
    ttl: 5000 // 5 秒超时
  }
)
```

#### 定时任务防重（非阻塞）

```typescript
const result = await LockService.tryRun('daily-report', async () => {
  return await generateReport()
})

if (!result.success) {
  console.log('任务已在其他进程中执行')
}
```

## 📝 API 速查

| 方法 | 说明 | 返回 |
|------|------|------|
| `run(key, callback, options?)` | 阻塞式获取锁 | `Promise<T>` |
| `tryRun(key, callback, options?)` | 非阻塞式尝试锁 | `Promise<{success, result}>` |
| `isLocked(key)` | 检查锁是否存在 | `Promise<boolean>` |
| `forceRelease(key)` | 强制释放锁 | `Promise<void>` |
| `resourceKey(resource, id)` | 生成资源锁键 | `string` |
| `operationKey(op, id)` | 生成操作锁键 | `string` |

## 🧪 测试 API

```bash
# 基础锁测试
GET http://localhost:3333/api/distributed-lock/basic

# 订单处理
POST http://localhost:3333/api/distributed-lock/order/123

# 并发测试
GET http://localhost:3333/api/distributed-lock/concurrent-test
```

## 📚 详细文档

查看 [完整文档](./DISTRIBUTED_LOCK_GUIDE.md) 了解更多高级用法。


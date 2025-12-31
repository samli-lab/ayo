# 分布式锁使用指南

## 📚 概述

分布式锁是一种用于控制多个进程/服务器访问共享资源的机制。本项目基于 Redis 和 AdonisJS Lock 实现了一个简单易用的分布式锁服务。

## 🎯 核心特性

- ✅ **基于 Redis** - 可靠的分布式存储
- ✅ **自动释放** - TTL 防止死锁
- ✅ **超时控制** - 避免无限等待
- ✅ **易于使用** - 简洁的 API
- ✅ **类型安全** - 完整的 TypeScript 支持
- ✅ **日志记录** - 便于调试和监控

## 🚀 快速开始

### 基础用法

```typescript
import { LockService } from '#services/redis'

// 最简单的用法
await LockService.run('my-task', async () => {
  // 这里的代码在锁保护下执行
  // 同一时间只有一个进程能执行
  await doSomething()
})
```

### 自定义配置

```typescript
await LockService.run(
  'my-task',
  async () => {
    await doSomething()
  },
  {
    ttl: 60000,      // 锁有效期 60 秒
    timeout: 10000,  // 最多等待 10 秒
    logging: true,   // 启用日志
  }
)
```

## 📖 API 文档

### `run(key, callback, options?)`

执行带锁的操作（阻塞式）。

**参数：**
- `key: string` - 锁的唯一标识符
- `callback: () => Promise<T>` - 要执行的函数
- `options?: LockOptions` - 可选配置

**返回：** `Promise<T>` - callback 的返回值

**示例：**
```typescript
const result = await LockService.run('payment:123', async () => {
  return await processPayment(123)
})
```

---

### `tryRun(key, callback, options?)`

尝试获取锁（非阻塞式），如果锁已被占用立即返回。

**返回：** `Promise<{ success: boolean, result: T | null }>`

**示例：**
```typescript
const result = await LockService.tryRun('cleanup', async () => {
  await cleanup()
  return 'done'
})

if (result.success) {
  console.log('任务完成:', result.result)
} else {
  console.log('任务正在其他进程中执行')
}
```

---

### `isLocked(key)`

检查锁是否存在。

**示例：**
```typescript
const locked = await LockService.isLocked('my-task')
if (locked) {
  console.log('任务正在执行中')
}
```

---

### `forceRelease(key)`

强制释放锁（慎用！）。

**示例：**
```typescript
await LockService.forceRelease('stuck-lock')
```

---

### 辅助方法

#### `resourceKey(resource, id)`

生成资源锁键名。

```typescript
LockService.resourceKey('user', 123)
// 返回: 'lock:user:123'

LockService.resourceKey('order', 'ORD-456')
// 返回: 'lock:order:ORD-456'
```

#### `operationKey(operation, identifier)`

生成操作锁键名。

```typescript
LockService.operationKey('send-email', 'user@example.com')
// 返回: 'lock:op:send-email:user@example.com'
```

## 🎯 实际应用场景

### 1. 防止订单重复处理

```typescript
export default class OrderController {
  async processOrder(ctx: HttpContext) {
    const { orderId } = ctx.params

    try {
      const result = await LockService.run(
        LockService.resourceKey('order', orderId),
        async () => {
          // 检查订单状态
          const order = await Order.find(orderId)
          
          if (order.status === 'processed') {
            throw new Error('订单已处理')
          }

          // 处理订单
          await this.handlePayment(order)
          await this.updateInventory(order)
          await this.sendNotification(order)

          // 更新状态
          order.status = 'processed'
          await order.save()

          return order
        },
        {
          ttl: 30000,   // 订单处理最多 30 秒
          timeout: 5000 // 最多等待 5 秒
        }
      )

      return ctx.response.json({ success: true, order: result })
    } catch (error) {
      return ctx.response.status(400).json({
        success: false,
        message: error.message
      })
    }
  }
}
```

### 2. 定时任务防重

```typescript
export default class CronController {
  async dailyReport(ctx: HttpContext) {
    // 使用非阻塞锁，如果任务正在执行则跳过
    const result = await LockService.tryRun(
      'cron:daily-report',
      async () => {
        await this.generateReport()
        await this.sendEmail()
        return 'Report sent'
      },
      {
        ttl: 600000 // 报表生成最多 10 分钟
      }
    )

    if (!result.success) {
      return ctx.response.json({
        message: 'Report generation already in progress'
      })
    }

    return ctx.response.json({
      message: result.result
    })
  }
}
```

### 3. 用户操作防重复提交

```typescript
export default class UserController {
  async updateProfile(ctx: HttpContext) {
    const userId = ctx.auth.user!.id
    const data = ctx.request.body()

    try {
      const result = await LockService.run(
        LockService.operationKey('update-profile', userId),
        async () => {
          const user = await User.find(userId)
          user.merge(data)
          await user.save()
          return user
        },
        {
          ttl: 5000,    // 更新操作最多 5 秒
          timeout: 2000 // 最多等待 2 秒
        }
      )

      return ctx.response.json({ success: true, user: result })
    } catch (error) {
      return ctx.response.status(423).json({
        success: false,
        message: '请勿重复提交'
      })
    }
  }
}
```

### 4. 缓存更新

```typescript
export default class CacheService {
  async refreshCache(key: string) {
    // 防止多个进程同时刷新缓存
    return await LockService.run(
      `cache:refresh:${key}`,
      async () => {
        // 从数据库获取数据
        const data = await this.fetchFromDatabase(key)
        
        // 更新缓存
        await redis.setex(key, 3600, JSON.stringify(data))
        
        return data
      },
      {
        ttl: 10000 // 缓存刷新最多 10 秒
      }
    )
  }
}
```

### 5. 库存扣减

```typescript
export default class InventoryController {
  async deductStock(productId: string, quantity: number) {
    try {
      return await LockService.run(
        LockService.resourceKey('inventory', productId),
        async () => {
          const product = await Product.find(productId)
          
          if (product.stock < quantity) {
            throw new Error('库存不足')
          }

          product.stock -= quantity
          await product.save()

          return {
            productId,
            remainingStock: product.stock
          }
        },
        {
          ttl: 5000,    // 库存操作最多 5 秒
          timeout: 3000 // 最多等待 3 秒
        }
      )
    } catch (error) {
      throw new Error(`库存扣减失败: ${error.message}`)
    }
  }
}
```

## ⚙️ 配置选项

```typescript
interface LockOptions {
  /**
   * 锁的过期时间（毫秒）
   * 默认：30000ms (30秒)
   */
  ttl?: number

  /**
   * 获取锁的最大等待时间（毫秒）
   * 默认：5000ms (5秒)
   */
  timeout?: number

  /**
   * 获取锁失败时的重试间隔（毫秒）
   * 默认：100ms
   */
  retryInterval?: number

  /**
   * 是否记录日志
   * 默认：true
   */
  logging?: boolean
}
```

## 🔍 Redis 存储格式

分布式锁在 Redis 中的存储格式：

```
Key: lock:my-task
Value: <lock_token>
TTL: 30 (秒)
```

**示例：**
```bash
# 查看所有锁
redis-cli KEYS "lock:*"

# 查看特定锁
redis-cli GET "lock:order:123"

# 查看锁的剩余时间
redis-cli TTL "lock:order:123"

# 强制删除锁（慎用）
redis-cli DEL "lock:order:123"
```

## 🧪 测试 API

启动应用后可以访问以下测试接口：

```bash
# 基础锁测试
GET http://localhost:3333/api/distributed-lock/basic

# 订单处理测试
POST http://localhost:3333/api/distributed-lock/order/ORD-123

# 非阻塞锁测试
POST http://localhost:3333/api/distributed-lock/cleanup

# 用户操作测试
POST http://localhost:3333/api/distributed-lock/user/123/operation
{
  "action": "update-profile",
  "data": { "name": "John" }
}

# 检查锁状态
GET http://localhost:3333/api/distributed-lock/check?key=my-task

# 并发测试
GET http://localhost:3333/api/distributed-lock/concurrent-test
```

## ⚠️ 注意事项

### 1. **合理设置 TTL**
```typescript
// ❌ TTL 太短，任务可能还没完成锁就过期了
await LockService.run('long-task', async () => {
  await longRunningTask() // 需要 60 秒
}, { ttl: 5000 }) // 只有 5 秒！

// ✅ TTL 应该略长于任务预期时间
await LockService.run('long-task', async () => {
  await longRunningTask() // 需要 60 秒
}, { ttl: 90000 }) // 90 秒，留有余量
```

### 2. **避免嵌套锁**
```typescript
// ❌ 可能导致死锁
await LockService.run('lock-a', async () => {
  await LockService.run('lock-b', async () => {
    // 危险！
  })
})

// ✅ 使用单一锁或确保锁的顺序一致
await LockService.run('combined-lock', async () => {
  // 安全
})
```

### 3. **异常处理**
```typescript
// ✅ 总是处理异常
try {
  await LockService.run('my-task', async () => {
    await riskyOperation()
  })
} catch (error) {
  if (error.message.includes('Unable to acquire lock')) {
    // 无法获取锁
  } else {
    // 其他错误
  }
}
```

### 4. **不要滥用**
```typescript
// ❌ 不需要锁的场景
await LockService.run('read-data', async () => {
  return await User.find(1) // 只读操作不需要锁
})

// ✅ 只在真正需要互斥的场景使用
await LockService.run('update-data', async () => {
  const user = await User.find(1)
  user.balance += 100 // 需要保证原子性
  await user.save()
})
```

## 🔧 故障排查

### 问题 1：锁一直无法释放

**原因**：进程崩溃，锁没有正常释放

**解决**：
```bash
# 查看锁的 TTL
redis-cli TTL "lock:stuck-task"

# 如果 TTL 是 -1（永不过期），需要手动删除
redis-cli DEL "lock:stuck-task"

# 或使用 API
DELETE http://localhost:3333/api/distributed-lock/force-release?key=stuck-task
```

### 问题 2：频繁获取锁失败

**原因**：TTL 设置太长或任务执行时间过长

**解决**：
- 减少 TTL
- 优化任务执行时间
- 使用 `tryRun()` 而不是 `run()`

### 问题 3：多个进程同时执行

**原因**：Redis 连接问题或使用了 memory 存储

**解决**：
- 检查 Redis 连接
- 确保使用 Redis 存储（不是 memory）
- 检查环境变量 `LOCK_STORE=redis`

## 📚 最佳实践

1. ✅ **使用语义化的锁键名**
   ```typescript
   // 好
   LockService.resourceKey('order', orderId)
   LockService.operationKey('send-email', email)
   
   // 不好
   'lock1', 'temp', 'test'
   ```

2. ✅ **设置合理的超时时间**
   ```typescript
   {
     ttl: 30000,   // 任务最多执行 30 秒
     timeout: 5000 // 最多等待 5 秒
   }
   ```

3. ✅ **记录日志**
   ```typescript
   {
     logging: true // 便于调试和监控
   }
   ```

4. ✅ **优雅降级**
   ```typescript
   const result = await LockService.tryRun('task', async () => {
     return await heavyTask()
   })
   
   if (!result.success) {
     // 降级处理
     return await lightweightTask()
   }
   ```

## 🔗 相关资源

- [AdonisJS Lock 文档](https://docs.adonisjs.com/guides/digging-deeper/locks)
- [Redis 分布式锁原理](https://redis.io/docs/manual/patterns/distributed-locks/)
- [源码位置](../../../app/services/redis/)


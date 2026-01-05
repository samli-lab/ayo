# ✨ 分布式锁服务已集成

## 📦 新增内容

本项目已经集成了基于 Redis 的分布式锁服务，可以轻松解决并发控制问题。

## 🚀 快速使用

```typescript
import { LockService } from '#services/distributed_lock_service'

// 防止重复执行
await LockService.run('my-task', async () => {
  await someImportantTask()
})
```

## 📁 文件结构

```
app/
├── services/
│   └── redis/
│       ├── lock_service.ts              # 分布式锁服务
│       ├── cache_service.ts             # 缓存服务
│       └── index.ts                     # 统一导出
├── controllers/
│   └── distributed_lock_example_controller.ts  # 使用示例
└── routes/
    └── distributed_lock.ts              # 示例路由

doc/dev-notes/guides/
├── DISTRIBUTED_LOCK_GUIDE.md            # 完整文档
└── DISTRIBUTED_LOCK_QUICKSTART.md       # 快速开始
```

## 🎯 核心功能

- ✅ 基于 Redis 的可靠锁机制
- ✅ 自动过期防止死锁
- ✅ 阻塞式和非阻塞式两种模式
- ✅ 简洁的 API，易于使用
- ✅ 完整的 TypeScript 类型支持
- ✅ 详细的日志记录

## 📖 使用场景

1. **防止订单重复处理**
2. **库存扣减并发控制**
3. **定时任务防重复执行**
4. **用户操作防重复提交**
5. **缓存更新并发控制**

## 🧪 测试接口

启动应用后访问：

```
http://localhost:3333/api/distributed-lock/basic
http://localhost:3333/api/distributed-lock/concurrent-test
```

## 📚 文档

- [快速开始](./doc/dev-notes/guides/DISTRIBUTED_LOCK_QUICKSTART.md)
- [完整指南](./doc/dev-notes/guides/DISTRIBUTED_LOCK_GUIDE.md)

## 💡 示例代码

### 防止订单重复处理

```typescript
await LockService.run(
  LockService.resourceKey('order', orderId),
  async () => {
    // 处理订单逻辑
  }
)
```

### 定时任务（非阻塞）

```typescript
const result = await LockService.tryRun('daily-cleanup', async () => {
  await cleanup()
})

if (!result.success) {
  console.log('清理任务已在其他进程中执行')
}
```

## ⚙️ 环境变量

确保 `.env` 文件中配置了 Redis：

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LOCK_STORE=redis
```

## 🎉 开始使用

立即导入使用：

```typescript
import { LockService, CacheService } from '#services/redis'
```

Happy Coding! 🚀


# 🧪 队列快速测试 - 2 分钟上手

## ⚡ 快速开始

### 第 1 步：启动主应用

```bash
npm run dev
```

### 第 2 步：启动测试 Worker（新开终端）

```bash
node ace queue:worker --workers=test
```

你会看到：
```
[WorkerManager] Starting workers: test
[TestWorker] Starting test queue worker...
[TestWorker] Test queue worker started
```

### 第 3 步：测试队列

浏览器访问：
```
http://localhost:3333/api/test/queue
```

### 第 4 步：观察 Worker 日志

在 Terminal 2（Worker）中会看到：
```
[TestWorker] Processing message: {
  id: '1735689600000-abc123',
  type: 'test',
  content: 'Hello Queue!',
  timestamp: '2024-12-31T12:00:00.000Z'
}
[TestWorker] ✅ Message processed successfully
```

**🎉 成功！** 你已经完成了一次完整的队列推送和消费流程！

---

## 📊 完整流程图

```
浏览器访问 /api/test/queue
         ↓
TestController.queueTest()
         ↓
推送消息到 'test-queue'
         ↓
消息存储在 Redis (queue:test-queue)
         ↓
TestWorker 监听队列（自动）
         ↓
从队列弹出消息
         ↓
处理消息（打印日志）
         ↓
消息处理完成 ✅
```

---

## 🎯 其他测试

### 优先级队列

```bash
# 浏览器访问
http://localhost:3333/api/test/queue/priority
```

**期待结果**：返回的消息顺序为 高 → 中 → 低

---

### 延迟队列

```bash
# 步骤 1：推送延迟消息（5秒后执行）
http://localhost:3333/api/test/queue/delayed

# 步骤 2：等待 6 秒

# 步骤 3：处理延迟消息
curl -X POST http://localhost:3333/api/test/queue/process-delayed
```

---

### 分布式锁（并发测试）

```bash
# 在 3 个终端同时执行
curl http://localhost:3333/api/test/lock &
curl http://localhost:3333/api/test/lock &
curl http://localhost:3333/api/test/lock &
```

**期待结果**：
- 1 个返回 200（成功获取锁）
- 2 个返回 423（锁被占用）

---

### 缓存测试

```bash
http://localhost:3333/api/test/cache
```

---

## 🔧 Worker 管理

### 启动不同的 Worker

```bash
# 只启动测试 Worker
node ace queue:worker --workers=test

# 启动邮件 Worker
node ace queue:worker --workers=email

# 启动多个 Workers
node ace queue:worker --workers=test,email,image

# 启动所有 Workers
node ace queue:worker
```

---

## 🧹 清理测试数据

```bash
curl -X DELETE http://localhost:3333/api/test/cleanup
```

---

## 📝 可用的 Worker

| Worker 名称 | 监听队列 | 功能 |
|------------|---------|------|
| `test` | `test-queue` | 测试队列处理 |
| `email` | `email-queue` | 邮件发送 |
| `image` | `image-process-queue` | 图片处理 |

---

## ⚠️ 注意事项

1. **Worker 必须先启动**，否则消息会堆积在队列中不被处理
2. **停止 Worker 后**，队列中的消息会保留，重启后继续处理
3. **清理数据**，避免测试数据堆积

---

## 🎓 下一步

- 📖 查看 [完整队列指南](./doc/dev-notes/guides/REDIS_QUEUE_GUIDE.md)
- 📖 查看 [Worker 运行指南](./doc/dev-notes/guides/QUEUE_WORKERS_GUIDE.md)
- 📖 查看 [详细测试指南](./TEST_GUIDE.md)


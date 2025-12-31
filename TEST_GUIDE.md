# 🧪 快速测试指南

## 概述

已创建测试控制器 `TestController`，用于快速测试队列、锁、缓存等功能。

## 🚀 启动应用

### 方式 1：只测试 API（不启动消费者）

```bash
# Terminal 1: 启动主应用
npm run dev
```

这样可以测试消息的推送、查看等功能，但消息不会被消费。

---

### 方式 2：完整测试（推送 + 消费）⭐ 推荐

```bash
# Terminal 1: 启动主应用
npm run dev

# Terminal 2: 启动测试队列的 Worker
node ace queue:worker --workers=test
```

这样可以看到：
1. 推送消息到队列
2. Worker 自动消费并处理消息
3. 在 Terminal 2 查看处理日志

## 📝 测试 API 列表

### 1️⃣ 队列基础测试

测试消息的推送、弹出、查看等基础功能。

**前提**：确保 Worker 已启动（见上方"启动应用"部分）

```bash
GET http://localhost:3333/api/test/queue
```

**观察要点**：
- 浏览器：看到消息推送成功的响应
- Terminal 2 (Worker)：看到消费日志
  ```
  [TestWorker] Processing message: { id: '...', type: 'test', content: 'Hello Queue!' }
  [TestWorker] ✅ Message processed successfully
  ```

**功能**：
- ✅ 推送消息到队列
- ✅ 查看队列长度
- ✅ 查看队列消息（不弹出）
- ✅ 弹出消息
- ✅ 获取队列统计

**响应示例**：
```json
{
  "success": true,
  "message": "队列测试完成",
  "data": {
    "pushed": { "messageId": "1735689600000-abc123" },
    "beforePop": { 
      "length": 1, 
      "messages": [...] 
    },
    "popped": {
      "id": "1735689600000-abc123",
      "data": { "type": "test", "content": "Hello Queue!" }
    },
    "stats": {
      "pending": 0,
      "failed": 0,
      "oldestMessage": null
    }
  }
}
```

---

### 2️⃣ 优先级队列测试

测试优先级队列是否按优先级顺序处理。

```bash
GET http://localhost:3333/api/test/queue/priority
```

**功能**：
- ✅ 推送不同优先级的消息（高、中、低）
- ✅ 按优先级顺序弹出

**预期结果**：
```json
{
  "success": true,
  "order": [
    { "task": "高优先级任务" },
    { "task": "中优先级任务" },
    { "task": "低优先级任务" }
  ],
  "note": "应该按优先级顺序返回：高 -> 中 -> 低"
}
```

---

### 3️⃣ 延迟队列测试

测试延迟消息的推送和处理。

```bash
# 步骤 1: 推送延迟消息（5秒后执行）
GET http://localhost:3333/api/test/queue/delayed

# 响应：
# {
#   "messageId": "...",
#   "executeAt": "2024-12-31T12:00:05.000Z",
#   "note": "调用 /api/test/process-delayed 来处理到期的消息"
# }

# 步骤 2: 等待 5 秒后，手动触发处理
POST http://localhost:3333/api/test/queue/process-delayed

# 响应：
# {
#   "processed": 1,
#   "message": "已处理 1 条延迟消息"
# }
```

---

### 4️⃣ 分布式锁测试

测试分布式锁的互斥功能。

```bash
GET http://localhost:3333/api/test/lock
```

**测试方法**：
同时发起 2-3 个请求，观察结果：
- 第一个请求：成功执行（等待 3 秒）
- 其他请求：返回 423 错误（无法获取锁）

**成功响应**：
```json
{
  "success": true,
  "message": "锁测试完成",
  "executedAt": "2024-12-31T12:00:03.000Z",
  "duration": 3000,
  "totalTime": 3001,
  "note": "同时发起多个请求，只有一个能执行"
}
```

**失败响应（其他并发请求）**：
```json
{
  "success": false,
  "message": "无法获取锁",
  "note": "可能有其他请求正在执行"
}
```

---

### 5️⃣ 缓存测试

测试 Redis 缓存的各种操作。

```bash
GET http://localhost:3333/api/test/cache
```

**功能**：
- ✅ 设置缓存
- ✅ 获取缓存
- ✅ 检查缓存是否存在
- ✅ 获取 TTL
- ✅ 测试 `remember` 方法（缓存穿透解决方案）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "set": "✅ 缓存已设置",
    "get": { "message": "Hello Cache!", "timestamp": "..." },
    "exists": true,
    "ttl": "60 秒",
    "remember": { "value": "Generated data", "generatedAt": 1735689600000 }
  }
}
```

---

### 6️⃣ 综合测试

测试队列、锁、缓存的组合使用。

```bash
GET http://localhost:3333/api/test/all
```

**功能**：
- ✅ 缓存操作
- ✅ 队列推送和弹出
- ✅ 分布式锁
- ✅ 锁保护下的缓存更新

---

### 7️⃣ 清理测试数据

测试完成后清理所有测试数据。

```bash
DELETE http://localhost:3333/api/test/cleanup
```

**清理内容**：
- 所有测试队列
- 所有测试缓存
- 所有测试锁

---

## 📋 完整测试流程

### 使用 curl

```bash
# 1. 队列测试
curl http://localhost:3333/api/test/queue

# 2. 优先级队列测试
curl http://localhost:3333/api/test/queue/priority

# 3. 延迟队列测试（分两步）
curl http://localhost:3333/api/test/queue/delayed
sleep 6  # 等待 6 秒
curl -X POST http://localhost:3333/api/test/queue/process-delayed

# 4. 分布式锁测试（并发测试）
curl http://localhost:3333/api/test/lock &
curl http://localhost:3333/api/test/lock &
curl http://localhost:3333/api/test/lock &
wait

# 5. 缓存测试
curl http://localhost:3333/api/test/cache

# 6. 综合测试
curl http://localhost:3333/api/test/all

# 7. 清理
curl -X DELETE http://localhost:3333/api/test/cleanup
```

---

### 使用浏览器

直接在浏览器访问（除了需要 POST/DELETE 的接口）：

```
http://localhost:3333/api/test/queue
http://localhost:3333/api/test/queue/priority
http://localhost:3333/api/test/queue/delayed
http://localhost:3333/api/test/lock
http://localhost:3333/api/test/cache
http://localhost:3333/api/test/all
```

---

## 🎯 测试场景示例

### 场景 1：测试队列的 FIFO 特性

```bash
# 多次访问，观察消息顺序
curl http://localhost:3333/api/test/queue
curl http://localhost:3333/api/test/queue
curl http://localhost:3333/api/test/queue
```

每次调用都会：
1. 推送一条新消息
2. 弹出最早的消息

---

### 场景 2：测试并发锁

**在多个终端同时执行**：

```bash
# Terminal 1
curl http://localhost:3333/api/test/lock

# Terminal 2 (同时执行)
curl http://localhost:3333/api/test/lock

# Terminal 3 (同时执行)
curl http://localhost:3333/api/test/lock
```

**预期结果**：
- 只有一个请求返回 200 成功
- 其他请求返回 423 (Locked)

---

### 场景 3：测试延迟队列

```bash
# 1. 推送延迟消息
curl http://localhost:3333/api/test/queue/delayed
# 记录返回的 executeAt 时间

# 2. 立即处理（消息还未到期）
curl -X POST http://localhost:3333/api/test/queue/process-delayed
# 返回：processed: 0

# 3. 等待 6 秒后再处理
sleep 6
curl -X POST http://localhost:3333/api/test/queue/process-delayed
# 返回：processed: 1
```

---

### 场景 4：测试缓存的 remember 方法

```bash
# 第一次调用（缓存不存在，会生成数据）
curl http://localhost:3333/api/test/cache
# 记录 remember.generatedAt 的值

# 第二次调用（从缓存获取，generatedAt 应该相同）
curl http://localhost:3333/api/test/cache
# generatedAt 应该和第一次一样
```

---

## 🔍 验证 Redis 数据

可以连接到 Redis 查看实际存储的数据：

```bash
# 连接 Redis
redis-cli

# 查看所有测试相关的 key
KEYS *test*

# 查看队列
LRANGE queue:test-queue 0 -1

# 查看缓存
GET cache:test:data

# 查看锁
GET lock:test-lock

# 查看优先级队列
ZRANGE queue:priority-test:priority 0 -1 WITHSCORES

# 查看延迟队列
ZRANGE queue:delayed-test:delayed 0 -1 WITHSCORES
```

---

## 📚 相关文档

- [队列使用指南](./doc/dev-notes/guides/REDIS_QUEUE_GUIDE.md)
- [分布式锁指南](./doc/dev-notes/guides/DISTRIBUTED_LOCK_GUIDE.md)
- [Worker 运行指南](./doc/dev-notes/guides/QUEUE_WORKERS_GUIDE.md)

---

## 💡 提示

测试完成后记得清理数据：

```bash
curl -X DELETE http://localhost:3333/api/test/cleanup
```

Happy Testing! 🎉


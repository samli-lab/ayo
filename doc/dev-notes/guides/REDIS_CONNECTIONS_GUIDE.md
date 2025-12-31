# Redis 多连接配置指南

## 📋 概述

本项目为不同的 Redis 服务配置了独立的连接，以实现更好的隔离和性能优化。

## 🔌 连接配置

### 1. Main 连接（默认）

用于通用的 Redis 操作、会话、限流等。

```
Database: 0
Prefix: (无)
```

### 2. Cache 连接

专门用于缓存操作（`CacheService`）。

```
Database: 1 (默认)
Prefix: cache:
```

### 3. Lock 连接

专门用于分布式锁（`LockService`）。

```
Database: 2 (默认)
Prefix: lock:
```

## ⚙️ 环境变量配置

### 方案 1：使用同一 Redis 实例的不同 Database（推荐）

适用于单服务器部署，成本低，配置简单。

```env
# 主连接
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache 连接（使用 db 1）
REDIS_CACHE_DB=1

# Lock 连接（使用 db 2）
REDIS_LOCK_DB=2
```

**说明**：
- 不需要配置 `REDIS_CACHE_HOST`、`REDIS_CACHE_PORT` 等，会自动使用主连接的配置
- 只需指定不同的 database 编号即可
- Redis 默认支持 16 个 database (0-15)

---

### 方案 2：使用完全独立的 Redis 实例

适用于高负载环境，需要完全隔离缓存和锁操作。

```env
# 主连接
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=main_password

# Cache 连接（独立实例）
REDIS_CACHE_HOST=cache-redis.example.com
REDIS_CACHE_PORT=6380
REDIS_CACHE_PASSWORD=cache_password
REDIS_CACHE_DB=0

# Lock 连接（独立实例）
REDIS_LOCK_HOST=lock-redis.example.com
REDIS_LOCK_PORT=6381
REDIS_LOCK_PASSWORD=lock_password
REDIS_LOCK_DB=0
```

**优势**：
- ✅ 完全隔离，互不影响
- ✅ 可以针对不同用途优化 Redis 配置
- ✅ 更好的扩展性
- ✅ 锁操作不会影响缓存性能

---

### 方案 3：混合模式

缓存使用独立实例，锁使用主实例的其他 database。

```env
# 主连接
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache 连接（独立实例）
REDIS_CACHE_HOST=cache-redis.example.com
REDIS_CACHE_PORT=6380
REDIS_CACHE_DB=0

# Lock 连接（使用主实例的 db 2）
REDIS_LOCK_DB=2
```

## 📊 数据隔离说明

### 键名前缀

每个连接都有独立的 `keyPrefix`：

| 连接 | Prefix | 实际存储键名示例 |
|------|--------|------------------|
| main | (无) | `user:123` |
| cache | `cache:` | `cache:user:123` |
| lock | `lock:` | `lock:order:456` |

**注意**：服务类中的 `key()` 方法生成的键名会自动加上前缀。

```typescript
// CacheService
CacheService.key('user', 123)
// 实际存储在 Redis: cache:user:123

// LockService  
LockService.resourceKey('order', 456)
// 实际存储在 Redis: lock:order:456
```

## 🔍 查看不同连接的数据

### 方案 1（同一实例，不同 DB）

```bash
# 查看 main 连接数据 (db 0)
redis-cli -n 0 KEYS "*"

# 查看 cache 连接数据 (db 1)
redis-cli -n 1 KEYS "*"

# 查看 lock 连接数据 (db 2)
redis-cli -n 2 KEYS "*"
```

### 方案 2（独立实例）

```bash
# 查看 cache 实例数据
redis-cli -h cache-redis.example.com -p 6380 KEYS "*"

# 查看 lock 实例数据
redis-cli -h lock-redis.example.com -p 6381 KEYS "*"
```

## 💡 使用建议

### 开发环境

使用**方案 1**（同一实例，不同 DB）：

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CACHE_DB=1
REDIS_LOCK_DB=2
```

**优势**：
- 简单易配置
- 资源占用少
- 开发调试方便

---

### 生产环境

根据负载选择：

**低-中负载** → **方案 1**
```env
REDIS_HOST=production-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=strong_password
REDIS_CACHE_DB=1
REDIS_LOCK_DB=2
```

**高负载** → **方案 2**
```env
# 主连接
REDIS_HOST=main-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=main_pass

# Cache 独立实例（高内存配置）
REDIS_CACHE_HOST=cache-redis.internal
REDIS_CACHE_PORT=6379
REDIS_CACHE_PASSWORD=cache_pass

# Lock 独立实例（低延迟配置）
REDIS_LOCK_HOST=lock-redis.internal
REDIS_LOCK_PORT=6379
REDIS_LOCK_PASSWORD=lock_pass
```

## 📝 完整的 .env 配置示例

```env
# ============================================
# Redis 连接配置
# ============================================

# 主 Redis 连接
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache Redis 连接（可选，默认使用主连接）
# 如果不配置，将使用主连接的配置 + 不同的 database
REDIS_CACHE_HOST=
REDIS_CACHE_PORT=
REDIS_CACHE_PASSWORD=
REDIS_CACHE_DB=1

# Lock Redis 连接（可选，默认使用主连接）
# 如果不配置，将使用主连接的配置 + 不同的 database
REDIS_LOCK_HOST=
REDIS_LOCK_PORT=
REDIS_LOCK_PASSWORD=
REDIS_LOCK_DB=2
```

## 🔧 配置文件说明

配置定义在 `config/redis.ts`：

```typescript
connections: {
  main: {
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    db: 0,
    keyPrefix: '',
  },
  
  cache: {
    // 如果没配置 REDIS_CACHE_HOST，会 fallback 到 REDIS_HOST
    host: env.get('REDIS_CACHE_HOST', env.get('REDIS_HOST')),
    port: env.get('REDIS_CACHE_PORT', env.get('REDIS_PORT')),
    db: env.get('REDIS_CACHE_DB', 1),
    keyPrefix: 'cache:',
  },
  
  lock: {
    host: env.get('REDIS_LOCK_HOST', env.get('REDIS_HOST')),
    port: env.get('REDIS_LOCK_PORT', env.get('REDIS_PORT')),
    db: env.get('REDIS_LOCK_DB', 2),
    keyPrefix: 'lock:',
  },
}
```

## ⚠️ 注意事项

### 1. Database 数量限制

Redis 默认只有 16 个 database (0-15)，不要超出范围。

### 2. keyPrefix 的作用

- **自动添加**：所有键名都会自动加上前缀
- **隔离数据**：即使使用同一 database，也能通过前缀区分
- **方便清理**：可以用 `KEYS cache:*` 查找所有缓存键

### 3. 性能考虑

- **同一实例**：DB 切换开销很小，几乎可以忽略
- **独立实例**：需要建立多个连接，有少量开销，但可以完全隔离

### 4. Cluster 模式

如果使用 Redis Cluster，**不支持 database 选择**，必须使用独立实例方案。

## 🧪 测试连接

启动应用后，连接会自动建立。查看日志确认：

```bash
# 查看应用日志
tail -f logs/app.log | grep Redis

# 或使用 redis-cli 监控
redis-cli MONITOR
```

## 📚 相关文档

- [Redis 配置文件](../../../config/redis.ts)
- [环境变量配置](../../../start/env.ts)
- [CacheService 文档](../../../app/services/redis/cache_service.ts)
- [LockService 文档](../../../app/services/redis/lock_service.ts)


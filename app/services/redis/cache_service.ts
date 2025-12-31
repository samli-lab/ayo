import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * Redis 缓存服务
 * 封装常用的缓存操作
 * 使用独立的 'cache' 连接
 */
export class CacheService {
  /**
   * 获取 Redis 缓存连接
   */
  private static getConnection() {
    return redis.connection('cache')
  }
  /**
   * 设置缓存
   *
   * @param key - 缓存键
   * @param value - 缓存值（会自动序列化）
   * @param ttl - 过期时间（秒），默认 3600 秒（1 小时）
   *
   * @example
   * ```typescript
   * await CacheService.set('user:123', userData, 3600)
   * ```
   */
  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      const conn = this.getConnection()
      const serialized = JSON.stringify(value)
      await conn.setex(key, ttl, serialized)
      logger.debug(`[Cache] Set key: ${key}, TTL: ${ttl}s`)
    } catch (error) {
      logger.error(`[Cache] Failed to set key: ${key}`, error)
      throw error
    }
  }

  /**
   * 获取缓存
   *
   * @param key - 缓存键
   * @returns 缓存值，不存在返回 null
   *
   * @example
   * ```typescript
   * const user = await CacheService.get<User>('user:123')
   * ```
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const conn = this.getConnection()
      const value = await conn.get(key)
      if (!value) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      logger.error(`[Cache] Failed to get key: ${key}`, error)
      return null
    }
  }

  /**
   * 获取或设置缓存（缓存穿透解决方案）
   *
   * @param key - 缓存键
   * @param factory - 数据工厂函数，缓存不存在时调用
   * @param ttl - 过期时间（秒）
   *
   * @example
   * ```typescript
   * const user = await CacheService.remember('user:123', async () => {
   *   return await User.find(123)
   * }, 3600)
   * ```
   */
  static async remember<T>(key: string, factory: () => Promise<T>, ttl: number = 3600): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 缓存不存在，调用工厂函数
    const value = await factory()

    // 存入缓存
    await this.set(key, value, ttl)

    return value
  }

  /**
   * 删除缓存
   *
   * @param keys - 要删除的键（可以是单个或多个）
   *
   * @example
   * ```typescript
   * await CacheService.delete('user:123')
   * await CacheService.delete('user:123', 'user:456')
   * ```
   */
  static async delete(...keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return
      const conn = this.getConnection()
      await conn.del(...keys)
      logger.debug(`[Cache] Deleted keys: ${keys.join(', ')}`)
    } catch (error) {
      logger.error(`[Cache] Failed to delete keys`, error)
      throw error
    }
  }

  /**
   * 批量删除（支持模式匹配）
   *
   * @param pattern - Redis 模式，如 'user:*'
   *
   * @example
   * ```typescript
   * await CacheService.deletePattern('user:*')
   * ```
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      const conn = this.getConnection()
      const keys = await conn.keys(pattern)
      if (keys.length === 0) {
        return 0
      }
      await conn.del(...keys)
      logger.debug(`[Cache] Deleted ${keys.length} keys matching pattern: ${pattern}`)
      return keys.length
    } catch (error) {
      logger.error(`[Cache] Failed to delete pattern: ${pattern}`, error)
      throw error
    }
  }

  /**
   * 检查缓存是否存在
   *
   * @param key - 缓存键
   *
   * @example
   * ```typescript
   * const exists = await CacheService.has('user:123')
   * ```
   */
  static async has(key: string): Promise<boolean> {
    const conn = this.getConnection()
    const exists = await conn.exists(key)
    return exists === 1
  }

  /**
   * 延长缓存过期时间
   *
   * @param key - 缓存键
   * @param ttl - 新的过期时间（秒）
   *
   * @example
   * ```typescript
   * await CacheService.extend('user:123', 7200)
   * ```
   */
  static async extend(key: string, ttl: number): Promise<void> {
    try {
      const conn = this.getConnection()
      await conn.expire(key, ttl)
      logger.debug(`[Cache] Extended TTL for key: ${key} to ${ttl}s`)
    } catch (error) {
      logger.error(`[Cache] Failed to extend TTL for key: ${key}`, error)
      throw error
    }
  }

  /**
   * 获取缓存剩余过期时间
   *
   * @param key - 缓存键
   * @returns 剩余秒数，-1 表示永不过期，-2 表示不存在
   *
   * @example
   * ```typescript
   * const ttl = await CacheService.ttl('user:123')
   * ```
   */
  static async ttl(key: string): Promise<number> {
    const conn = this.getConnection()
    return await conn.ttl(key)
  }

  /**
   * 清空所有缓存（慎用！）
   *
   * @example
   * ```typescript
   * await CacheService.flush()
   * ```
   */
  static async flush(): Promise<void> {
    try {
      const conn = this.getConnection()
      await conn.flushdb()
      logger.warn('[Cache] Flushed all cache')
    } catch (error) {
      logger.error('[Cache] Failed to flush cache', error)
      throw error
    }
  }

  /**
   * 生成缓存键
   *
   * @example
   * ```typescript
   * CacheService.key('user', 123)  // 'cache:user:123'
   * CacheService.key('posts', 'latest')  // 'cache:posts:latest'
   * ```
   */
  static key(...parts: (string | number)[]): string {
    return parts.join(':')
  }
}

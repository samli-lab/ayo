import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * 分布式锁配置选项
 */
export interface LockOptions {
  /**
   * 锁的过期时间（毫秒）
   * 默认：30000ms (30秒)
   */
  ttl?: number

  /**
   * 是否记录日志
   * 默认：true
   */
  logging?: boolean
}

/**
 * 锁执行的回调函数
 */
export type LockCallback<T> = () => Promise<T> | T

/**
 * 分布式锁服务
 * 基于 Redis 实现的分布式锁
 * 使用独立的 'lock' 连接
 *
 * @example
 * ```typescript
 * const result = await LockService.run('my-lock', async () => {
 *   return await someOperation()
 * })
 * ```
 */
export class LockService {
  private static readonly DEFAULT_OPTIONS: Required<LockOptions> = {
    ttl: 30000, // 30 秒
    logging: true,
  }

  /**
   * 获取 Redis 锁连接
   */
  private static getConnection() {
    return redis.connection('lock')
  }

  /**
   * 执行带锁的操作
   */
  static async run<T>(
    key: string,
    callback: LockCallback<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    const lockKey = this.normalizeLockKey(key)
    const lockValue = `${Date.now()}:${Math.random()}`

    if (config.logging) {
      logger.debug(`[DistributedLock] Attempting to acquire lock: ${lockKey}`)
    }

    try {
      const conn = this.getConnection()
      // 使用 Redis SET NX (Not eXists) 获取锁
      const acquired = await conn.set(
        lockKey,
        lockValue,
        'PX', // 毫秒过期
        config.ttl,
        'NX' // 只在不存在时设置
      )

      if (!acquired) {
        throw new Error(`Unable to acquire lock: ${lockKey}`)
      }

      try {
        // 执行回调
        const result = await callback()

        if (config.logging) {
          logger.debug(`[DistributedLock] Task completed for lock: ${lockKey}`)
        }

        return result
      } finally {
        // 释放锁（使用 Lua 脚本确保原子性）
        await this.releaseLock(lockKey, lockValue)

        if (config.logging) {
          logger.debug(`[DistributedLock] Lock released: ${lockKey}`)
        }
      }
    } catch (error) {
      if (config.logging) {
        logger.error(`[DistributedLock] Failed: ${lockKey}`, error)
      }
      throw error
    }
  }

  /**
   * 尝试获取锁（非阻塞）
   */
  static async tryRun<T>(
    key: string,
    callback: LockCallback<T>,
    options: LockOptions = {}
  ): Promise<{ success: boolean; result: T | null }> {
    try {
      const result = await this.run(key, callback, options)
      return { success: true, result }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unable to acquire lock')) {
        return { success: false, result: null }
      }
      throw error
    }
  }

  /**
   * 检查锁是否存在
   */
  static async isLocked(key: string): Promise<boolean> {
    const lockKey = this.normalizeLockKey(key)
    const conn = this.getConnection()
    const exists = await conn.exists(lockKey)
    return exists === 1
  }

  /**
   * 强制释放锁
   */
  static async forceRelease(key: string): Promise<void> {
    const lockKey = this.normalizeLockKey(key)

    try {
      const conn = this.getConnection()
      await conn.del(lockKey)
      logger.warn(`[DistributedLock] Force released lock: ${lockKey}`)
    } catch (error) {
      logger.error(`[DistributedLock] Failed to force release: ${lockKey}`, error)
      throw error
    }
  }

  /**
   * 释放锁（Lua 脚本保证原子性）
   */
  private static async releaseLock(key: string, value: string): Promise<void> {
    const conn = this.getConnection()
    // Lua 脚本：只有当值匹配时才删除
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `

    await conn.eval(script, 1, key, value)
  }

  /**
   * 规范化锁键名
   */
  private static normalizeLockKey(key: string): string {
    if (key.startsWith('lock:')) {
      return key
    }
    return `lock:${key}`
  }

  /**
   * 生成资源锁键名
   */
  static resourceKey(resource: string, id: string | number): string {
    return `${resource}:${id}`
  }

  /**
   * 生成操作锁键名
   */
  static operationKey(operation: string, identifier: string): string {
    return `op:${operation}:${identifier}`
  }
}

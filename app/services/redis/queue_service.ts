import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

/**
 * 队列消息接口
 */
export interface QueueMessage<T = any> {
  /**
   * 消息 ID
   */
  id: string

  /**
   * 消息数据
   */
  data: T

  /**
   * 创建时间
   */
  createdAt: number

  /**
   * 重试次数
   */
  attempts?: number

  /**
   * 最大重试次数
   */
  maxAttempts?: number
}

/**
 * 队列配置选项
 */
export interface QueueOptions {
  /**
   * 最大重试次数
   * 默认：3
   */
  maxAttempts?: number

  /**
   * 消息过期时间（秒）
   * 0 表示永不过期
   * 默认：0
   */
  ttl?: number

  /**
   * 是否记录日志
   * 默认：true
   */
  logging?: boolean
}

/**
 * Redis 队列服务
 * 基于 Redis List 实现的消息队列
 *
 * @example
 * ```typescript
 * // 生产者
 * await QueueService.push('email-queue', {
 *   to: 'user@example.com',
 *   subject: 'Welcome'
 * })
 *
 * // 消费者
 * const message = await QueueService.pop('email-queue')
 * if (message) {
 *   await sendEmail(message.data)
 * }
 * ```
 */
export class QueueService {
  private static readonly DEFAULT_OPTIONS: Required<QueueOptions> = {
    maxAttempts: 3,
    ttl: 0,
    logging: true,
  }

  /**
   * 获取 Redis 连接
   */
  private static getConnection() {
    return redis.connection('main')
  }

  /**
   * 推送消息到队列（队尾）
   *
   * @param queue - 队列名称
   * @param data - 消息数据
   * @param options - 队列配置
   * @returns 消息 ID
   *
   * @example
   * ```typescript
   * await QueueService.push('email-queue', {
   *   to: 'user@example.com',
   *   subject: 'Hello'
   * })
   * ```
   */
  static async push<T>(queue: string, data: T, options: QueueOptions = {}): Promise<string> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    const queueKey = this.normalizeQueueKey(queue)
    const messageId = this.generateMessageId()

    const message: QueueMessage<T> = {
      id: messageId,
      data,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: config.maxAttempts,
    }

    const conn = this.getConnection()
    const serialized = JSON.stringify(message)

    // 推送到队列尾部
    await conn.rpush(queueKey, serialized)

    // 设置队列过期时间（如果配置了）
    if (config.ttl > 0) {
      await conn.expire(queueKey, config.ttl)
    }

    if (config.logging) {
      logger.debug(`[Queue] Pushed message to ${queue}, ID: ${messageId}`)
    }

    return messageId
  }

  /**
   * 批量推送消息
   *
   * @param queue - 队列名称
   * @param items - 消息数据数组
   * @returns 消息 ID 数组
   *
   * @example
   * ```typescript
   * const ids = await QueueService.pushBatch('email-queue', [
   *   { to: 'user1@example.com' },
   *   { to: 'user2@example.com' }
   * ])
   * ```
   */
  static async pushBatch<T>(
    queue: string,
    items: T[],
    options: QueueOptions = {}
  ): Promise<string[]> {
    const ids: string[] = []

    for (const item of items) {
      const id = await this.push(queue, item, options)
      ids.push(id)
    }

    return ids
  }

  /**
   * 从队列头部弹出消息（FIFO - 先进先出）
   *
   * @param queue - 队列名称
   * @returns 消息对象，队列为空返回 null
   *
   * @example
   * ```typescript
   * const message = await QueueService.pop('email-queue')
   * if (message) {
   *   await processMessage(message.data)
   * }
   * ```
   */
  static async pop<T>(queue: string): Promise<QueueMessage<T> | null> {
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()

    // 从队列头部弹出
    const value = await conn.lpop(queueKey)

    if (!value) {
      return null
    }

    try {
      const message = JSON.parse(value) as QueueMessage<T>
      logger.debug(`[Queue] Popped message from ${queue}, ID: ${message.id}`)
      return message
    } catch (error) {
      logger.error(`[Queue] Failed to parse message from ${queue}`, error)
      return null
    }
  }

  /**
   * 阻塞式弹出消息
   * 如果队列为空，会等待直到有消息或超时
   *
   * @param queue - 队列名称
   * @param timeout - 超时时间（秒），0 表示永久等待
   * @returns 消息对象，超时返回 null
   *
   * @example
   * ```typescript
   * // 等待最多 10 秒
   * const message = await QueueService.blockingPop('email-queue', 10)
   * ```
   */
  static async blockingPop<T>(
    queue: string,
    timeout: number = 10
  ): Promise<QueueMessage<T> | null> {
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()

    // BLPOP 阻塞式弹出
    const result = await conn.blpop(queueKey, timeout)

    if (!result || result.length < 2) {
      return null
    }

    try {
      const message = JSON.parse(result[1]) as QueueMessage<T>
      logger.debug(`[Queue] Blocking popped message from ${queue}, ID: ${message.id}`)
      return message
    } catch (error) {
      logger.error(`[Queue] Failed to parse message from ${queue}`, error)
      return null
    }
  }

  /**
   * 查看队列长度
   *
   * @param queue - 队列名称
   * @returns 队列中的消息数量
   *
   * @example
   * ```typescript
   * const length = await QueueService.length('email-queue')
   * console.log(`队列中有 ${length} 条消息`)
   * ```
   */
  static async length(queue: string): Promise<number> {
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()
    return await conn.llen(queueKey)
  }

  /**
   * 查看队列中的消息（不弹出）
   *
   * @param queue - 队列名称
   * @param start - 起始索引
   * @param stop - 结束索引
   * @returns 消息数组
   *
   * @example
   * ```typescript
   * // 查看前 10 条消息
   * const messages = await QueueService.peek('email-queue', 0, 9)
   * ```
   */
  static async peek<T>(
    queue: string,
    start: number = 0,
    stop: number = -1
  ): Promise<QueueMessage<T>[]> {
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()

    const values = await conn.lrange(queueKey, start, stop)

    return values
      .map((value) => {
        try {
          return JSON.parse(value) as QueueMessage<T>
        } catch {
          return null
        }
      })
      .filter((msg): msg is QueueMessage<T> => msg !== null)
  }

  /**
   * 清空队列
   *
   * @param queue - 队列名称
   *
   * @example
   * ```typescript
   * await QueueService.clear('email-queue')
   * ```
   */
  static async clear(queue: string): Promise<void> {
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()

    await conn.del(queueKey)
    logger.warn(`[Queue] Cleared queue: ${queue}`)
  }

  /**
   * 重试失败的消息
   * 将消息重新推送到队列尾部
   *
   * @param queue - 队列名称
   * @param message - 消息对象
   * @returns 是否成功重试
   *
   * @example
   * ```typescript
   * const message = await QueueService.pop('email-queue')
   * try {
   *   await processMessage(message.data)
   * } catch (error) {
   *   await QueueService.retry('email-queue', message)
   * }
   * ```
   */
  static async retry<T>(queue: string, message: QueueMessage<T>): Promise<boolean> {
    const attempts = (message.attempts || 0) + 1

    // 检查是否超过最大重试次数
    if (message.maxAttempts && attempts > message.maxAttempts) {
      logger.warn(`[Queue] Message ${message.id} exceeded max attempts, moving to DLQ`)
      await this.moveToDeadLetterQueue(queue, message)
      return false
    }

    // 更新重试次数
    message.attempts = attempts

    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()
    const serialized = JSON.stringify(message)

    // 重新推送到队列尾部
    await conn.rpush(queueKey, serialized)

    logger.debug(`[Queue] Retried message ${message.id}, attempt ${attempts}`)
    return true
  }

  /**
   * 移动到死信队列
   *
   * @param queue - 原队列名称
   * @param message - 消息对象
   *
   * @example
   * ```typescript
   * await QueueService.moveToDeadLetterQueue('email-queue', failedMessage)
   * ```
   */
  static async moveToDeadLetterQueue<T>(queue: string, message: QueueMessage<T>): Promise<void> {
    const dlqKey = this.deadLetterQueueKey(queue)
    const conn = this.getConnection()

    const dlqMessage = {
      ...message,
      failedAt: Date.now(),
      originalQueue: queue,
    }

    await conn.rpush(dlqKey, JSON.stringify(dlqMessage))
    logger.warn(`[Queue] Moved message ${message.id} to DLQ: ${dlqKey}`)
  }

  /**
   * 查看死信队列
   *
   * @param queue - 原队列名称
   * @returns 死信队列中的消息
   *
   * @example
   * ```typescript
   * const failedMessages = await QueueService.getDeadLetterQueue('email-queue')
   * ```
   */
  static async getDeadLetterQueue(queue: string): Promise<any[]> {
    const dlqKey = this.deadLetterQueueKey(queue)
    const conn = this.getConnection()

    const values = await conn.lrange(dlqKey, 0, -1)

    return values
      .map((value) => {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      })
      .filter((msg) => msg !== null)
  }

  /**
   * 清空死信队列
   *
   * @param queue - 原队列名称
   *
   * @example
   * ```typescript
   * await QueueService.clearDeadLetterQueue('email-queue')
   * ```
   */
  static async clearDeadLetterQueue(queue: string): Promise<void> {
    const dlqKey = this.deadLetterQueueKey(queue)
    const conn = this.getConnection()

    await conn.del(dlqKey)
    logger.warn(`[Queue] Cleared DLQ: ${dlqKey}`)
  }

  /**
   * 批量处理队列消息
   *
   * @param queue - 队列名称
   * @param processor - 处理函数
   * @param batchSize - 每批处理数量
   *
   * @example
   * ```typescript
   * await QueueService.processBatch('email-queue', async (message) => {
   *   await sendEmail(message.data)
   * }, 10)
   * ```
   */
  static async processBatch<T>(
    queue: string,
    processor: (message: QueueMessage<T>) => Promise<void>,
    batchSize: number = 10
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0
    let failed = 0

    for (let i = 0; i < batchSize; i++) {
      const message = await this.pop<T>(queue)

      if (!message) {
        break // 队列已空
      }

      try {
        await processor(message)
        processed++
      } catch (error) {
        failed++
        logger.error(`[Queue] Failed to process message ${message.id}`, error)

        // 尝试重试
        await this.retry(queue, message)
      }
    }

    logger.info(`[Queue] Batch processed: ${processed} succeeded, ${failed} failed`)

    return { processed, failed }
  }

  /**
   * 启动队列消费者（持续监听）
   *
   * @param queue - 队列名称
   * @param processor - 处理函数
   * @param options - 配置选项
   *
   * @example
   * ```typescript
   * QueueService.startWorker('email-queue', async (message) => {
   *   await sendEmail(message.data)
   * })
   * ```
   */
  static startWorker<T>(
    queue: string,
    processor: (message: QueueMessage<T>) => Promise<void>,
    options: { concurrency?: number; pollInterval?: number } = {}
  ): () => void {
    const { concurrency = 1, pollInterval = 1000 } = options
    let isRunning = true

    const worker = async () => {
      while (isRunning) {
        try {
          // 阻塞式获取消息（等待 5 秒）
          const message = await this.blockingPop<T>(queue, 5)

          if (message) {
            try {
              await processor(message)
              logger.debug(`[Queue] Worker processed message ${message.id}`)
            } catch (error) {
              logger.error(`[Queue] Worker failed to process message ${message.id}`, error)
              // 重试
              await this.retry(queue, message)
            }
          }
        } catch (error) {
          logger.error(`[Queue] Worker error`, error)
          // 短暂休眠后继续
          await this.sleep(pollInterval)
        }
      }
    }

    // 启动多个并发 worker
    for (let i = 0; i < concurrency; i++) {
      worker().catch((error) => {
        logger.error(`[Queue] Worker ${i} crashed`, error)
      })
    }

    logger.info(`[Queue] Started ${concurrency} worker(s) for queue: ${queue}`)

    // 返回停止函数
    return () => {
      isRunning = false
      logger.info(`[Queue] Stopping workers for queue: ${queue}`)
    }
  }

  /**
   * 获取队列统计信息
   *
   * @param queue - 队列名称
   * @returns 队列统计信息
   *
   * @example
   * ```typescript
   * const stats = await QueueService.stats('email-queue')
   * console.log(`待处理: ${stats.pending}, 失败: ${stats.failed}`)
   * ```
   */
  static async stats(queue: string): Promise<{
    pending: number
    failed: number
    oldestMessage: number | null
  }> {
    const queueKey = this.normalizeQueueKey(queue)
    const dlqKey = this.deadLetterQueueKey(queue)
    const conn = this.getConnection()

    const pending = await conn.llen(queueKey)
    const failed = await conn.llen(dlqKey)

    // 获取最老的消息时间
    let oldestMessage: number | null = null
    const first = await conn.lindex(queueKey, 0)
    if (first) {
      try {
        const message = JSON.parse(first) as QueueMessage
        oldestMessage = message.createdAt
      } catch {
        // 忽略解析错误
      }
    }

    return { pending, failed, oldestMessage }
  }

  /**
   * 延迟消息（使用 Sorted Set 实现）
   *
   * @param queue - 队列名称
   * @param data - 消息数据
   * @param delaySeconds - 延迟时间（秒）
   * @returns 消息 ID
   *
   * @example
   * ```typescript
   * // 5 分钟后发送
   * await QueueService.pushDelayed('email-queue', emailData, 300)
   * ```
   */
  static async pushDelayed<T>(queue: string, data: T, delaySeconds: number): Promise<string> {
    const delayedKey = this.delayedQueueKey(queue)
    const messageId = this.generateMessageId()

    const message: QueueMessage<T> = {
      id: messageId,
      data,
      createdAt: Date.now(),
      attempts: 0,
    }

    const conn = this.getConnection()
    const executeAt = Date.now() + delaySeconds * 1000

    // 使用 Sorted Set 存储，score 为执行时间
    await conn.zadd(delayedKey, executeAt, JSON.stringify(message))

    logger.debug(`[Queue] Pushed delayed message to ${queue}, execute at: ${new Date(executeAt)}`)

    return messageId
  }

  /**
   * 处理延迟消息
   * 将到期的延迟消息移动到正常队列
   *
   * @param queue - 队列名称
   * @returns 处理的消息数量
   *
   * @example
   * ```typescript
   * // 在定时任务中调用
   * setInterval(async () => {
   *   await QueueService.processDelayed('email-queue')
   * }, 1000)
   * ```
   */
  static async processDelayed(queue: string): Promise<number> {
    const delayedKey = this.delayedQueueKey(queue)
    const queueKey = this.normalizeQueueKey(queue)
    const conn = this.getConnection()

    const now = Date.now()

    // 获取所有到期的消息
    const messages = await conn.zrangebyscore(delayedKey, 0, now)

    if (messages.length === 0) {
      return 0
    }

    // 移动到正常队列
    for (const message of messages) {
      await conn.rpush(queueKey, message)
    }

    // 从延迟队列中移除
    await conn.zremrangebyscore(delayedKey, 0, now)

    logger.debug(`[Queue] Processed ${messages.length} delayed messages from ${queue}`)

    return messages.length
  }

  /**
   * 优先级队列：推送带优先级的消息
   *
   * @param queue - 队列名称
   * @param data - 消息数据
   * @param priority - 优先级（数字越小优先级越高）
   * @returns 消息 ID
   *
   * @example
   * ```typescript
   * await QueueService.pushPriority('task-queue', urgentTask, 1)  // 高优先级
   * await QueueService.pushPriority('task-queue', normalTask, 5)  // 低优先级
   * ```
   */
  static async pushPriority<T>(queue: string, data: T, priority: number): Promise<string> {
    const priorityKey = this.priorityQueueKey(queue)
    const messageId = this.generateMessageId()

    const message: QueueMessage<T> = {
      id: messageId,
      data,
      createdAt: Date.now(),
    }

    const conn = this.getConnection()

    // 使用 Sorted Set，score 为优先级
    await conn.zadd(priorityKey, priority, JSON.stringify(message))

    logger.debug(`[Queue] Pushed priority message to ${queue}, priority: ${priority}`)

    return messageId
  }

  /**
   * 优先级队列：弹出最高优先级的消息
   *
   * @param queue - 队列名称
   * @returns 消息对象
   *
   * @example
   * ```typescript
   * const message = await QueueService.popPriority('task-queue')
   * ```
   */
  static async popPriority<T>(queue: string): Promise<QueueMessage<T> | null> {
    const priorityKey = this.priorityQueueKey(queue)
    const conn = this.getConnection()

    // 获取优先级最高的消息（score 最小）
    const messages = await conn.zpopmin(priorityKey, 1)

    if (!messages || messages.length === 0) {
      return null
    }

    try {
      const message = JSON.parse(messages[0]) as QueueMessage<T>
      logger.debug(`[Queue] Popped priority message from ${queue}, ID: ${message.id}`)
      return message
    } catch (error) {
      logger.error(`[Queue] Failed to parse priority message`, error)
      return null
    }
  }

  /**
   * 生成消息 ID
   */
  private static generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 规范化队列键名
   */
  private static normalizeQueueKey(queue: string): string {
    return `queue:${queue}`
  }

  /**
   * 死信队列键名
   */
  private static deadLetterQueueKey(queue: string): string {
    return `queue:${queue}:dlq`
  }

  /**
   * 延迟队列键名
   */
  private static delayedQueueKey(queue: string): string {
    return `queue:${queue}:delayed`
  }

  /**
   * 优先级队列键名
   */
  private static priorityQueueKey(queue: string): string {
    return `queue:${queue}:priority`
  }

  /**
   * 辅助方法：延迟
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

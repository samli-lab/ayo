import type { HttpContext } from '@adonisjs/core/http'
import { QueueService } from '#services/redis/queue_service'
import { LockService } from '#services/redis/lock_service'
import { CacheService } from '#services/redis/cache_service'

/**
 * 测试控制器
 * 用于快速测试各种功能
 */
export default class TestController {
  /**
   * @queueTest
   * @summary 队列测试
   * @description 测试队列的推送和消费
   * @responseBody 200 - {"success": true, "message": "Queue test completed"}
   */
  async queueTest(ctx: HttpContext) {
    try {
      // 1. 推送消息到队列
      const messageId = await QueueService.push('test-queue', {
        type: 'test',
        content: 'Hello Queue!',
        timestamp: new Date().toISOString(),
      })

      // 2. 查看队列长度
      const length = await QueueService.length('test-queue')

      // 3. 查看队列消息（不弹出）
      const messages = await QueueService.peek('test-queue', 0, 4)

      // 4. 弹出一条消息
      // const popped = await QueueService.pop('test-queue')

      // 5. 获取队列统计
      const stats = await QueueService.stats('test-queue')

      return ctx.response.json({
        success: true,
        message: '队列测试完成',
        data: {
          pushed: { messageId },
          beforePop: { length, messages },
          stats,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '队列测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @priorityQueueTest
   * @summary 优先级队列测试
   * @description 测试优先级队列
   * @responseBody 200 - {"success": true, "message": "Priority queue test completed"}
   */
  async priorityQueueTest(ctx: HttpContext) {
    try {
      // 推送不同优先级的消息
      await QueueService.pushPriority('priority-test', { task: '低优先级任务' }, 10)
      await QueueService.pushPriority('priority-test', { task: '高优先级任务' }, 1)
      await QueueService.pushPriority('priority-test', { task: '中优先级任务' }, 5)

      // 弹出（应该按优先级顺序）
      const first = await QueueService.popPriority('priority-test')
      const second = await QueueService.popPriority('priority-test')
      const third = await QueueService.popPriority('priority-test')

      return ctx.response.json({
        success: true,
        message: '优先级队列测试完成',
        order: [first?.data, second?.data, third?.data],
        note: '应该按优先级顺序返回：高 -> 中 -> 低',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '优先级队列测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @delayedQueueTest
   * @summary 延迟队列测试
   * @description 测试延迟队列（推送5秒后执行的消息）
   * @responseBody 200 - {"success": true, "message": "Delayed message pushed"}
   */
  async delayedQueueTest(ctx: HttpContext) {
    try {
      // 推送延迟消息（5秒后）
      const messageId = await QueueService.pushDelayed(
        'delayed-test',
        {
          message: '这是一条延迟消息',
          createdAt: new Date().toISOString(),
        },
        5
      )

      const executeAt = new Date(Date.now() + 5000)

      return ctx.response.json({
        success: true,
        message: '延迟消息已推送',
        messageId,
        executeAt: executeAt.toISOString(),
        note: '调用 /api/test/process-delayed 来处理到期的消息',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '延迟队列测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @processDelayed
   * @summary 处理延迟消息
   * @description 手动触发处理到期的延迟消息
   * @responseBody 200 - {"success": true, "processed": 1}
   */
  async processDelayed(ctx: HttpContext) {
    try {
      const processed = await QueueService.processDelayed('delayed-test')

      return ctx.response.json({
        success: true,
        processed,
        message: `已处理 ${processed} 条延迟消息`,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '处理延迟消息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @lockTest
   * @summary 分布式锁测试
   * @description 测试分布式锁（并发请求只有一个能执行）
   * @responseBody 200 - {"success": true, "message": "Lock test completed"}
   */
  async lockTest(ctx: HttpContext) {
    const startTime = Date.now()

    try {
      const result = await LockService.run(
        'test-lock',
        async () => {
          // 模拟耗时操作
          await this.sleep(3000)
          return {
            executedAt: new Date().toISOString(),
            duration: 3000,
          }
        },
        {
          ttl: 10000, // 10 秒 TTL
        }
      )

      return ctx.response.json({
        success: true,
        message: '锁测试完成',
        ...result,
        totalTime: Date.now() - startTime,
        note: '同时发起多个请求，只有一个能执行，其他会等待或失败',
      })
    } catch (error) {
      return ctx.response.status(423).json({
        success: false,
        message: '无法获取锁',
        error: error instanceof Error ? error.message : 'Unknown error',
        note: '可能有其他请求正在执行',
      })
    }
  }

  /**
   * @cacheTest
   * @summary 缓存测试
   * @description 测试 Redis 缓存功能
   * @responseBody 200 - {"success": true, "message": "Cache test completed"}
   */
  async cacheTest(ctx: HttpContext) {
    try {
      const testKey = CacheService.key('test', 'data')

      // 1. 设置缓存
      await CacheService.set(
        testKey,
        {
          message: 'Hello Cache!',
          timestamp: new Date().toISOString(),
        },
        60
      )

      // 2. 获取缓存
      const cached = await CacheService.get(testKey)

      // 3. 检查是否存在
      const exists = await CacheService.has(testKey)

      // 4. 获取 TTL
      const ttl = await CacheService.ttl(testKey)

      // 5. 测试 remember（缓存穿透解决方案）
      const remembered = await CacheService.remember(
        CacheService.key('test', 'remember'),
        async () => {
          return { value: 'Generated data', generatedAt: Date.now() }
        },
        30
      )

      return ctx.response.json({
        success: true,
        message: '缓存测试完成',
        data: {
          set: '✅ 缓存已设置',
          get: cached,
          exists,
          ttl: `${ttl} 秒`,
          remember: remembered,
        },
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '缓存测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @allTest
   * @summary 综合测试
   * @description 测试队列、锁、缓存的组合使用
   * @responseBody 200 - {"success": true, "message": "All tests completed"}
   */
  async allTest(ctx: HttpContext) {
    try {
      const results: any = {}

      // 1. 测试缓存
      const cacheKey = CacheService.key('test', 'all')
      await CacheService.set(cacheKey, { test: 'cache' }, 10)
      results.cache = await CacheService.get(cacheKey)

      // 2. 测试队列
      const queueId = await QueueService.push('test-all', { test: 'queue' })
      const queueMsg = await QueueService.pop('test-all')
      results.queue = { pushed: queueId, popped: queueMsg }

      // 3. 测试锁
      const lockResult = await LockService.run('test-all-lock', async () => {
        await this.sleep(100)
        return { locked: true }
      })
      results.lock = lockResult

      // 4. 组合场景：使用锁保护的缓存更新
      await LockService.run('cache-update-lock', async () => {
        const data = await CacheService.remember(
          CacheService.key('protected', 'data'),
          async () => {
            return { value: Math.random(), createdAt: Date.now() }
          },
          60
        )
        results.protectedCache = data
      })

      return ctx.response.json({
        success: true,
        message: '所有测试完成',
        results,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '综合测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @cleanupTest
   * @summary 清理测试数据
   * @description 清理所有测试产生的数据
   * @responseBody 200 - {"success": true, "message": "Test data cleaned"}
   */
  async cleanupTest(ctx: HttpContext) {
    try {
      // 清理队列
      await QueueService.clear('test-queue')
      await QueueService.clear('priority-test')
      await QueueService.clear('delayed-test')
      await QueueService.clear('test-all')

      // 清理缓存
      await CacheService.deletePattern('test:*')
      await CacheService.deletePattern('protected:*')

      // 清理锁（如果存在）
      try {
        await LockService.forceRelease('test-lock')
        await LockService.forceRelease('test-all-lock')
        await LockService.forceRelease('cache-update-lock')
      } catch {
        // 锁可能不存在，忽略错误
      }

      return ctx.response.json({
        success: true,
        message: '测试数据已清理',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '清理失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * 辅助方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

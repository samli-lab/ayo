import type { HttpContext } from '@adonisjs/core/http'
import { LockService } from '#services/redis/lock_service'
import redis from '@adonisjs/redis/services/main'

/**
 * 分布式锁使用示例控制器
 * 演示各种分布式锁的使用场景
 */
export default class DistributedLockExampleController {
  /**
   * @basicLock
   * @summary 基础锁使用示例
   * @description 演示如何使用分布式锁防止并发执行
   * @responseBody 200 - {"success": true, "message": "Task completed", "executionTime": 3000}
   */
  async basicLock(ctx: HttpContext) {
    const startTime = Date.now()

    try {
      const result = await LockService.run('example:basic-task', async () => {
        // 模拟耗时操作
        await this.sleep(3000)
        return { message: 'Task completed successfully' }
      })

      return ctx.response.json({
        success: true,
        ...result,
        executionTime: Date.now() - startTime,
        note: '同一时间只有一个请求能执行这个任务',
      })
    } catch (error) {
      return ctx.response.status(423).json({
        success: false,
        message: '无法获取锁，任务可能正在被其他进程执行',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @orderProcessing
   * @summary 订单处理锁示例
   * @description 防止同一订单被重复处理
   * @paramPath orderId - 订单 ID - @type(string) @required
   * @responseBody 200 - {"success": true, "orderId": "ORD-123", "status": "processed"}
   */
  async processOrder(ctx: HttpContext) {
    const { orderId } = ctx.params

    try {
      // 使用订单 ID 创建锁
      const result = await LockService.run(
        LockService.resourceKey('order', orderId),
        async () => {
          // 检查订单状态
          const orderStatus = await redis.get(`order:${orderId}:status`)

          if (orderStatus === 'processed') {
            throw new Error('订单已经处理过了')
          }

          // 模拟订单处理
          await this.sleep(2000)

          // 更新订单状态
          await redis.set(`order:${orderId}:status`, 'processed')

          return {
            orderId,
            status: 'processed',
            processedAt: new Date().toISOString(),
          }
        },
        {
          ttl: 10000, // 订单处理最多 10 秒
        }
      )

      return ctx.response.json({
        success: true,
        ...result,
        message: '订单处理成功',
      })
    } catch (error) {
      return ctx.response.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '订单处理失败',
      })
    }
  }

  /**
   * @tryLock
   * @summary 非阻塞锁示例
   * @description 尝试获取锁，如果失败立即返回
   * @responseBody 200 - {"success": true, "result": "cleaned"}
   */
  async tryCleanup(ctx: HttpContext) {
    const result = await LockService.tryRun(
      'cleanup:daily',
      async () => {
        // 执行清理任务
        await this.sleep(1000)
        return 'cleaned'
      },
      {
        ttl: 60000, // 清理任务最多 60 秒
      }
    )

    if (result.success) {
      return ctx.response.json({
        success: true,
        message: '清理任务已完成',
        result: result.result,
      })
    } else {
      return ctx.response.json({
        success: false,
        message: '清理任务正在其他进程中执行',
      })
    }
  }

  /**
   * @userOperation
   * @summary 用户操作锁示例
   * @description 防止用户并发操作（如重复提交）
   * @paramPath userId - 用户 ID - @type(string) @required
   * @requestBody {"action": "update-profile", "data": {}}
   * @responseBody 200 - {"success": true, "message": "Operation completed"}
   */
  async userOperation(ctx: HttpContext) {
    const { userId } = ctx.params
    const { action, data } = ctx.request.body()

    try {
      const result = await LockService.run(
        LockService.operationKey(action, userId),
        async () => {
          // 模拟用户操作
          await this.sleep(1500)

          return {
            userId,
            action,
            data,
            completedAt: new Date().toISOString(),
          }
        },
        {
          ttl: 5000, // 用户操作最多 5 秒
        }
      )

      return ctx.response.json({
        success: true,
        message: '操作完成',
        ...result,
      })
    } catch (error) {
      return ctx.response.status(423).json({
        success: false,
        message: '请勿重复提交，操作正在处理中',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @checkLock
   * @summary 检查锁状态
   * @description 检查指定的锁是否存在
   * @paramQuery key - 锁的键名 - @type(string) @required
   * @responseBody 200 - {"locked": true, "key": "example:basic-task"}
   */
  async checkLock(ctx: HttpContext) {
    const { key } = ctx.request.qs()

    if (!key) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供锁的键名',
      })
    }

    const isLocked = await LockService.isLocked(key)

    return ctx.response.json({
      locked: isLocked,
      key,
      message: isLocked ? '锁正在被占用' : '锁可用',
    })
  }

  /**
   * @forceRelease
   * @summary 强制释放锁（管理员功能）
   * @description 强制释放指定的锁，慎用！
   * @paramQuery key - 锁的键名 - @type(string) @required
   * @responseBody 200 - {"success": true, "message": "Lock released"}
   */
  async forceRelease(ctx: HttpContext) {
    // 实际使用时应该添加管理员权限检查
    // if (!ctx.auth.user?.isAdmin) {
    //   return ctx.response.status(403).json({ message: 'Forbidden' })
    // }

    const { key } = ctx.request.qs()

    if (!key) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供锁的键名',
      })
    }

    try {
      await LockService.forceRelease(key)

      return ctx.response.json({
        success: true,
        message: `锁 ${key} 已被强制释放`,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '释放锁失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @concurrentTest
   * @summary 并发测试
   * @description 测试分布式锁在并发场景下的表现
   * @responseBody 200 - {"success": true, "executedCount": 1, "totalRequests": 10}
   */
  async concurrentTest(ctx: HttpContext) {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        LockService.tryRun(`test:concurrent`, async () => {
          await this.sleep(1000)
          return `Request ${i + 1} executed`
        })
      )
    )

    const executed = results.filter((r) => r.status === 'fulfilled' && r.value.success).length

    return ctx.response.json({
      success: true,
      message: '并发测试完成',
      executedCount: executed,
      totalRequests: 10,
      note: '在分布式锁保护下，10个并发请求中只有1个能成功执行',
    })
  }

  /**
   * 辅助方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

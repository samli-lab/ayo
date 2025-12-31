import type { HttpContext } from '@adonisjs/core/http'
import { QueueService } from '#services/redis/queue_service'

/**
 * 队列使用示例控制器
 */
export default class QueueExampleController {
  /**
   * @pushMessage
   * @summary 推送消息到队列
   * @description 演示如何向队列推送消息
   * @requestBody {"message": "Hello Queue", "priority": 1}
   * @responseBody 200 - {"success": true, "messageId": "123-abc", "message": "Message pushed"}
   */
  async pushMessage(ctx: HttpContext) {
    const { message, priority } = ctx.request.body()

    try {
      let messageId: string

      if (priority !== undefined) {
        // 推送优先级消息
        messageId = await QueueService.pushPriority('example-queue', message, priority)
      } else {
        // 推送普通消息
        messageId = await QueueService.push('example-queue', message)
      }

      return ctx.response.json({
        success: true,
        messageId,
        message: '消息已推送到队列',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '推送消息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @popMessage
   * @summary 从队列弹出消息
   * @description 演示如何从队列获取消息
   * @responseBody 200 - {"success": true, "message": {}, "hasMore": true}
   */
  async popMessage(ctx: HttpContext) {
    try {
      const message = await QueueService.pop('example-queue')

      if (!message) {
        return ctx.response.json({
          success: true,
          message: null,
          note: '队列为空',
        })
      }

      const length = await QueueService.length('example-queue')

      return ctx.response.json({
        success: true,
        message,
        hasMore: length > 0,
        remaining: length,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '获取消息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @emailQueue
   * @summary 邮件队列示例
   * @description 演示如何使用队列发送邮件
   * @requestBody {"to": "user@example.com", "subject": "Hello", "body": "Message"}
   * @responseBody 200 - {"success": true, "messageId": "123", "message": "Email queued"}
   */
  async queueEmail(ctx: HttpContext) {
    const { to, subject, body } = ctx.request.body()

    try {
      const messageId = await QueueService.push('email-queue', {
        to,
        subject,
        body,
        queuedAt: new Date().toISOString(),
      })

      return ctx.response.json({
        success: true,
        messageId,
        message: '邮件已加入发送队列',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '加入队列失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @delayedMessage
   * @summary 延迟消息示例
   * @description 演示如何发送延迟消息
   * @requestBody {"message": "Hello", "delaySeconds": 60}
   * @responseBody 200 - {"success": true, "messageId": "123", "executeAt": "2024-01-01T12:00:00Z"}
   */
  async pushDelayedMessage(ctx: HttpContext) {
    const { message, delaySeconds } = ctx.request.body()

    try {
      const messageId = await QueueService.pushDelayed('delayed-queue', message, delaySeconds || 60)

      const executeAt = new Date(Date.now() + (delaySeconds || 60) * 1000)

      return ctx.response.json({
        success: true,
        messageId,
        message: '延迟消息已创建',
        executeAt: executeAt.toISOString(),
        delaySeconds,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '创建延迟消息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @processDelayed
   * @summary 处理延迟消息
   * @description 手动触发延迟消息处理（通常由定时任务调用）
   * @responseBody 200 - {"success": true, "processed": 5, "message": "Processed delayed messages"}
   */
  async processDelayed(ctx: HttpContext) {
    try {
      const processed = await QueueService.processDelayed('delayed-queue')

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
   * @queueStats
   * @summary 队列统计
   * @description 获取队列的统计信息
   * @paramQuery queue - 队列名称 - @type(string) @required
   * @responseBody 200 - {"success": true, "stats": {"pending": 10, "failed": 2}}
   */
  async getStats(ctx: HttpContext) {
    const { queue } = ctx.request.qs()

    if (!queue) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供队列名称',
      })
    }

    try {
      const stats = await QueueService.stats(queue)

      return ctx.response.json({
        success: true,
        queue,
        stats,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @peekQueue
   * @summary 查看队列消息
   * @description 查看队列中的消息（不弹出）
   * @paramQuery queue - 队列名称 - @type(string) @required
   * @paramQuery limit - 查看数量 - @type(number) @optional
   * @responseBody 200 - {"success": true, "messages": [], "total": 10}
   */
  async peekQueue(ctx: HttpContext) {
    const { queue, limit = 10 } = ctx.request.qs()

    if (!queue) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供队列名称',
      })
    }

    try {
      const messages = await QueueService.peek(queue, 0, Number(limit) - 1)
      const total = await QueueService.length(queue)

      return ctx.response.json({
        success: true,
        queue,
        messages,
        showing: messages.length,
        total,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '查看队列失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @deadLetterQueue
   * @summary 查看死信队列
   * @description 查看失败的消息
   * @paramQuery queue - 队列名称 - @type(string) @required
   * @responseBody 200 - {"success": true, "failedMessages": [], "count": 5}
   */
  async getDeadLetterQueue(ctx: HttpContext) {
    const { queue } = ctx.request.qs()

    if (!queue) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供队列名称',
      })
    }

    try {
      const failedMessages = await QueueService.getDeadLetterQueue(queue)

      return ctx.response.json({
        success: true,
        queue,
        failedMessages,
        count: failedMessages.length,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '获取死信队列失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @batchProcess
   * @summary 批量处理消息
   * @description 演示批量处理队列消息
   * @paramQuery batchSize - 批处理数量 - @type(number) @optional
   * @responseBody 200 - {"success": true, "processed": 10, "failed": 2}
   */
  async batchProcess(ctx: HttpContext) {
    const { batchSize = 10 } = ctx.request.qs()

    try {
      const result = await QueueService.processBatch(
        'example-queue',
        async (message) => {
          // 模拟消息处理
          console.log('Processing message:', message.id, message.data)
          await this.sleep(100)
          // 模拟 10% 的失败率
          if (Math.random() < 0.1) {
            throw new Error('Random processing error')
          }
        },
        Number(batchSize)
      )

      return ctx.response.json({
        success: true,
        ...result,
        message: `批量处理完成：${result.processed} 成功，${result.failed} 失败`,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '批量处理失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * @clearQueue
   * @summary 清空队列
   * @description 清空指定队列的所有消息
   * @paramQuery queue - 队列名称 - @type(string) @required
   * @responseBody 200 - {"success": true, "message": "Queue cleared"}
   */
  async clearQueue(ctx: HttpContext) {
    const { queue } = ctx.request.qs()

    if (!queue) {
      return ctx.response.status(400).json({
        success: false,
        message: '请提供队列名称',
      })
    }

    try {
      await QueueService.clear(queue)

      return ctx.response.json({
        success: true,
        message: `队列 ${queue} 已清空`,
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '清空队列失败',
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


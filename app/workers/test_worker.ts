import { QueueService, QueueMessage } from '#services/redis/queue_service'
import logger from '@adonisjs/core/services/logger'

/**
 * 测试队列 Worker
 * 用于消费测试队列中的消息
 */
export class TestWorker {
  private stopCallback: (() => void) | null = null

  /**
   * 启动 Worker
   */
  start() {
    logger.info('[TestWorker] Starting test queue worker...')

    this.stopCallback = QueueService.startWorker(
      'test-queue',
      async (message) => {
        await this.processMessage(message)
      },
      {
        concurrency: 1, // 单个并发，便于观察
        pollInterval: 1000,
      }
    )

    logger.info('[TestWorker] Test queue worker started')
  }

  /**
   * 停止 Worker
   */
  stop() {
    if (this.stopCallback) {
      this.stopCallback()
      logger.info('[TestWorker] Test queue worker stopped')
    }
  }

  /**
   * 处理消息
   */
  private async processMessage(message: QueueMessage<any>) {
    const { type, content, timestamp } = message.data

    try {
      logger.info(`[TestWorker] Processing message:`, {
        id: message.id,
        type,
        content,
        timestamp,
      })
      const helloWorld = await testController.helloWorld()
      logger.info(`[TestWorker] Hello World: ${helloWorld}`)

      // 模拟处理
      await this.sleep(500)

      logger.info(`[TestWorker] ✅ Message processed successfully: ${message.id}`)
    } catch (error) {
      logger.error(`[TestWorker] ❌ Failed to process message: ${message.id}`, error)
      throw error
    }
  }

  /**
   * 辅助方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

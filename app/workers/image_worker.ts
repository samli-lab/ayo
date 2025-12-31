import { QueueService, QueueMessage } from '#services/redis/queue_service'
import logger from '@adonisjs/core/services/logger'

/**
 * 图片处理队列 Worker
 * 负责处理图片压缩、缩略图生成等任务
 */
export class ImageWorker {
  private stopCallback: (() => void) | null = null

  /**
   * 启动 Worker
   */
  start() {
    logger.info('[ImageWorker] Starting image processing worker...')

    this.stopCallback = QueueService.startWorker(
      'image-process-queue',
      async (message) => {
        await this.processMessage(message)
      },
      {
        concurrency: 5, // 5 个并发处理
        pollInterval: 1000,
      }
    )

    logger.info('[ImageWorker] Image worker started with 5 concurrent workers')
  }

  /**
   * 停止 Worker
   */
  stop() {
    if (this.stopCallback) {
      this.stopCallback()
      logger.info('[ImageWorker] Image worker stopped')
    }
  }

  /**
   * 处理图片
   */
  private async processMessage(message: QueueMessage<any>) {
    const { url, operations } = message.data

    try {
      logger.info(`[ImageWorker] Processing image: ${url}`)

      for (const operation of operations) {
        await this.applyOperation(url, operation)
      }

      logger.info(`[ImageWorker] Image processed: ${url}`)
    } catch (error) {
      logger.error(`[ImageWorker] Failed to process image: ${url}`, error)
      throw error
    }
  }

  /**
   * 应用图片操作
   */
  private async applyOperation(url: string, operation: string) {
    // TODO: 实际的图片处理逻辑
    logger.debug(`[ImageWorker] Applying ${operation} to ${url}`)
    await this.sleep(500)
  }

  /**
   * 辅助方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}


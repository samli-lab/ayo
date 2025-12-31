import { QueueService, QueueMessage } from '#services/redis/queue_service'
import logger from '@adonisjs/core/services/logger'

/**
 * 邮件队列 Worker
 * 负责处理邮件发送队列
 */
export class EmailWorker {
  private stopCallback: (() => void) | null = null

  /**
   * 启动 Worker
   */
  start() {
    logger.info('[EmailWorker] Starting email worker...')

    this.stopCallback = QueueService.startWorker(
      'email-queue',
      async (message) => {
        await this.processMessage(message)
      },
      {
        concurrency: 3, // 3 个并发处理
        pollInterval: 1000,
      }
    )

    logger.info('[EmailWorker] Email worker started with 3 concurrent workers')
  }

  /**
   * 停止 Worker
   */
  stop() {
    if (this.stopCallback) {
      this.stopCallback()
      logger.info('[EmailWorker] Email worker stopped')
    }
  }

  /**
   * 处理单个消息
   */
  private async processMessage(message: QueueMessage<any>) {
    const { to, subject, body } = message.data

    try {
      logger.info(`[EmailWorker] Sending email to ${to}`)
      logger.debug(`[EmailWorker] Subject: ${subject}, Body length: ${body?.length || 0}`)

      // TODO: 实际的邮件发送逻辑
      // await mailer.send({ to, subject, body })

      // 模拟发送
      await this.sleep(1000)

      logger.info(`[EmailWorker] Email sent to ${to}`)
    } catch (error) {
      logger.error(`[EmailWorker] Failed to send email to ${to}`, error)
      throw error // 抛出错误以触发重试机制
    }
  }

  /**
   * 辅助方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

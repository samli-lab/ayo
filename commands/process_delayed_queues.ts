import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { QueueService } from '#services/redis/queue_service'

/**
 * 处理延迟队列命令
 * 用于定时处理到期的延迟消息
 *
 * @example
 * ```bash
 * # 手动执行
 * node ace queue:process-delayed
 *
 * # 配置 crontab（每分钟执行）
 * * * * * * cd /path/to/project && node ace queue:process-delayed
 * ```
 */
export default class ProcessDelayedQueues extends BaseCommand {
  static commandName = 'queue:process-delayed'
  static description = '处理延迟队列中到期的消息'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('开始处理延迟队列...')

    try {
      // 定义所有需要处理的延迟队列
      const delayedQueues = [
        'reminder-queue',
        'order-timeout-queue',
        'delayed-notification-queue',
      ]

      let totalProcessed = 0

      for (const queue of delayedQueues) {
        const processed = await QueueService.processDelayed(queue)

        if (processed > 0) {
          this.logger.info(`处理 ${queue}: ${processed} 条消息`)
          totalProcessed += processed
        }
      }

      if (totalProcessed === 0) {
        this.logger.info('没有到期的延迟消息')
      } else {
        this.logger.success(`总共处理了 ${totalProcessed} 条延迟消息`)
      }
    } catch (error) {
      this.logger.error('处理延迟队列失败', error)
      throw error
    }
  }
}


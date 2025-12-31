import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { WorkerManager } from '#workers/index'

/**
 * 队列 Worker 命令
 * 用于启动和管理队列消费者
 *
 * @example
 * ```bash
 * # 启动所有 workers
 * node ace queue:worker
 *
 * # 启动指定的 workers
 * node ace queue:worker --workers=email,image
 *
 * # 启动单个 worker
 * node ace queue:worker --workers=email
 * ```
 */
export default class QueueWorker extends BaseCommand {
  static commandName = 'queue:worker'
  static description = '启动队列 Worker 消费者'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: true, // 保持运行，不退出
  }

  @flags.string({ description: '要启动的 workers，用逗号分隔（如：email,image）' })
  declare workers?: string

  async run() {
    this.logger.info('启动队列 Workers...')

    try {
      if (this.workers) {
        // 启动指定的 workers
        const workerNames = this.workers.split(',').map((w) => w.trim())
        this.logger.info(`启动 Workers: ${workerNames.join(', ')}`)

        WorkerManager.start(workerNames)
      } else {
        // 启动所有 workers
        this.logger.info('启动所有 Workers')
        WorkerManager.startAll()
      }

      this.logger.success('Workers 已启动，按 Ctrl+C 停止')

      // 优雅退出处理
      process.on('SIGINT', () => {
        this.logger.info('接收到停止信号，正在关闭 Workers...')
        WorkerManager.stopAll()
        process.exit(0)
      })

      process.on('SIGTERM', () => {
        this.logger.info('接收到终止信号，正在关闭 Workers...')
        WorkerManager.stopAll()
        process.exit(0)
      })

      // 保持进程运行
      await new Promise(() => {})
    } catch (error) {
      this.logger.error('启动 Workers 失败', error)
      throw error
    }
  }

  /**
   * 在命令终止时清理资源
   */
  async completed() {
    WorkerManager.stopAll()
  }
}

/**
 * Workers 统一导出和管理
 */
import { EmailWorker } from './email_worker.js'
import { ImageWorker } from './image_worker.js'
import { TestWorker } from './test_worker.js'
import logger from '@adonisjs/core/services/logger'

export { EmailWorker } from './email_worker.js'
export { ImageWorker } from './image_worker.js'
export { TestWorker } from './test_worker.js'

/**
 * Worker 管理器
 * 统一管理所有队列 Worker 的启动和停止
 */
export class WorkerManager {
  private static workers: Array<{ name: string; instance: any }> = []

  /**
   * 启动所有 Workers
   */
  static startAll() {
    logger.info('[WorkerManager] Starting all workers...')

    const emailWorker = new EmailWorker()
    const imageWorker = new ImageWorker()
    const testWorker = new TestWorker()

    emailWorker.start()
    imageWorker.start()
    testWorker.start()

    this.workers.push(
      { name: 'EmailWorker', instance: emailWorker },
      { name: 'ImageWorker', instance: imageWorker },
      { name: 'TestWorker', instance: testWorker }
    )

    logger.info(`[WorkerManager] Started ${this.workers.length} workers`)
  }

  /**
   * 停止所有 Workers
   */
  static stopAll() {
    logger.info('[WorkerManager] Stopping all workers...')

    for (const worker of this.workers) {
      try {
        worker.instance.stop()
        logger.info(`[WorkerManager] Stopped ${worker.name}`)
      } catch (error) {
        logger.error(`[WorkerManager] Failed to stop ${worker.name}`, error)
      }
    }

    this.workers = []
    logger.info('[WorkerManager] All workers stopped')
  }

  /**
   * 启动指定的 Workers
   */
  static start(workerNames: string[]) {
    logger.info(`[WorkerManager] Starting workers: ${workerNames.join(', ')}`)

    for (const name of workerNames) {
      switch (name) {
        case 'email':
          const emailWorker = new EmailWorker()
          emailWorker.start()
          this.workers.push({ name: 'EmailWorker', instance: emailWorker })
          break
        case 'image':
          const imageWorker = new ImageWorker()
          imageWorker.start()
          this.workers.push({ name: 'ImageWorker', instance: imageWorker })
          break
        case 'test':
          const testWorker = new TestWorker()
          testWorker.start()
          this.workers.push({ name: 'TestWorker', instance: testWorker })
          break
        default:
          logger.warn(`[WorkerManager] Unknown worker: ${name}`)
      }
    }
  }
}

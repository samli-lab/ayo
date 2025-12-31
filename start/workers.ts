/**
 * Workers 初始化文件（可选）
 * 如果希望 Workers 和主应用一起启动，取消注释下面的代码
 *
 * 注意：
 * 1. 只在生产环境或需要的时候启用
 * 2. 推荐使用独立进程运行 Workers（bin/worker.ts + PM2）
 * 3. 如果启用，记得在 adonisrc.ts 的 preloads 中添加此文件
 */

import env from '#start/env'
import { WorkerManager } from '#workers/index'
import logger from '@adonisjs/core/services/logger'

const ENABLE_WORKERS = env.get('ENABLE_QUEUE_WORKERS', false)

if (ENABLE_WORKERS) {
  logger.info('[Workers] Starting queue workers with main application...')

  try {
    WorkerManager.startAll()
    logger.info('[Workers] Queue workers started')
  } catch (error) {
    logger.error('[Workers] Failed to start queue workers', error)
  }
} else {
  logger.info('[Workers] Queue workers disabled (set ENABLE_QUEUE_WORKERS=true to enable)')
}

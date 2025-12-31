#!/usr/bin/env node

/**
 * 独立的 Queue Worker 进程
 * 用于 PM2 或单独运行
 *
 * 使用方法:
 * node build/bin/worker.js
 */

import { Ignitor, prettyPrintError } from '@adonisjs/core'

const APP_ROOT = new URL('../', import.meta.url)

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      // 导入并启动所有 workers
      const { WorkerManager } = await import('#workers/index')

      console.log('🚀 Starting Queue Workers...')
      WorkerManager.startAll()
      console.log('✅ Queue Workers started successfully')
    })

    app.terminating(async () => {
      // 优雅退出
      const { WorkerManager } = await import('#workers/index')

      console.log('⏳ Stopping Queue Workers...')
      WorkerManager.stopAll()
      console.log('✅ Queue Workers stopped')
    })

    // 监听退出信号
    process.on('SIGTERM', () => {
      console.log('⚠️  Received SIGTERM, shutting down...')
      app.terminate()
    })

    process.on('SIGINT', () => {
      console.log('⚠️  Received SIGINT, shutting down...')
      app.terminate()
    })
  })
  .httpServer()
  .start()
  .catch((error: any) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

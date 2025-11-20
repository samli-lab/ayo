/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
      // 初始化 SSH 隧道（如果需要）
      try {
        const { initializeProdDBTunnel } = await import('#services/ssh_tunnel')
        await initializeProdDBTunnel()
      } catch (error) {
        console.error('Failed to initialize SSH tunnel:', error)
        // 不阻止应用启动，只是警告
      }
    })
    app.listen('SIGTERM', () => {
      // 关闭所有 SSH 隧道
      import('#services/ssh_tunnel').then(({ SSHTunnelService }) => {
        SSHTunnelService.closeAllTunnels()
      })
      app.terminate()
    })
    app.listenIf(app.managedByPm2, 'SIGINT', () => {
      // 关闭所有 SSH 隧道
      import('#services/ssh_tunnel').then(({ SSHTunnelService }) => {
        SSHTunnelService.closeAllTunnels()
      })
      app.terminate()
    })
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

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
    /**
     * SSH 隧道只会在开发环境启用。这里用一个 flag 统一控制启动/关闭阶段的行为，
     * 避免在生产环境做无意义的动态 import。
     */
    let manageSshTunnels = false

    app.booting(async () => {
      const envModule = await import('#start/env')
      const env = envModule.default
      const nodeEnv = env.get('NODE_ENV', 'development')
      manageSshTunnels = nodeEnv === 'development'

      /**
       * 仅在开发环境且显式开启时，才初始化 SSH 隧道
       */
      const useTunnel = env.get('AIDB_PROD_USE_TUNNEL', false)
      if (!manageSshTunnels || !useTunnel) {
        return
      }

      try {
        const { initializeProdDBTunnel } = await import('#services/ssh/tunnel')
        await initializeProdDBTunnel()
      } catch (error) {
        console.error('Failed to initialize SSH tunnel:', error)
        // 不阻止应用启动，只是警告
      }
    })

    /**
     * 优雅退出：开发环境关闭 SSH 隧道（如果有），然后终止应用。
     * 注意：本地开发 Ctrl+C 是 SIGINT，所以需要监听 SIGINT。
     */
    const shutdown = () => {
      if (manageSshTunnels) {
        import('#services/ssh/tunnel')
          .then(({ SSHTunnelService }) => {
            SSHTunnelService.closeAllTunnels()
          })
          .finally(() => {
            app.terminate()
          })
        return
      }

      app.terminate()
    }

    app.listen('SIGTERM', shutdown)
    app.listen('SIGINT', shutdown)
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

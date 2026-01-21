import env from '#start/env'
import { defineConfig, targets } from '@adonisjs/core/logger'
import { join } from 'node:path'

const loggerConfig = defineConfig({
  default: 'app',

  /**
   * The loggers object can be used to define multiple loggers.
   * By default, we configure only one logger (named "app").
   */
  loggers: {
    app: {
      enabled: true,
      name: env.get('APP_NAME'),
      level: env.get('LOG_LEVEL'),
      transport: {
        targets: targets()
          // 开发环境输出 pretty；生产环境输出 JSON 到 stdout（避免依赖 devDependency: pino-pretty）
          .push(
            env.get('NODE_ENV') === 'production'
              ? targets.file({ destination: 1 })
              : targets.pretty()
          )
          // 如果启用文件日志，同时输出到文件
          .pushIf(env.get('LOG_TO_FILE', false), {
            target: 'pino-roll',
            level: 'info',
            options: {
              /**
               * pino-roll v3.1.0 会在文件名上追加轮转编号（例如 .1/.2/...）。
               * 配合 dateFormat 可让文件名包含日期，避免只看到纯数字后缀。
               *
               * 例：logs/app.2025-12-29.1.log
               */
              file: join(process.cwd(), 'logs', 'app'),
              frequency: 'daily',
              dateFormat: 'yyyy-MM-dd',
              extension: '.log',
              mkdir: true,
            },
          })
          .toArray(),
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}

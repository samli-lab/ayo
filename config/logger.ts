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
          .pushIf(!env.get('LOG_TO_FILE', false), targets.pretty())
          .pushIf(env.get('LOG_TO_FILE', false), {
            target: 'pino-roll',
            level: 'info',
            options: {
              file: join(process.cwd(), 'logs', 'app.log'),
              frequency: 'daily',
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

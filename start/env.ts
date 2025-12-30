/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  LOG_TO_FILE: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  // AI 数据库 - 生产环境
  AIDB_PROD_HOST: Env.schema.string({ format: 'host' }),
  AIDB_PROD_PORT: Env.schema.number(),
  AIDB_PROD_USER: Env.schema.string(),
  AIDB_PROD_PASSWORD: Env.schema.string.optional(),
  AIDB_PROD_DATABASE: Env.schema.string(),
  AIDB_PROD_USE_TUNNEL: Env.schema.boolean.optional(),

  // SSH 跳板机配置（通用配置，可被多个数据库使用）
  SSH_TUNNEL_HOST: Env.schema.string.optional(),
  SSH_TUNNEL_PORT: Env.schema.number.optional(),
  SSH_TUNNEL_USERNAME: Env.schema.string.optional(),
  SSH_TUNNEL_PRIVATE_KEY: Env.schema.string.optional(),
  SSH_TUNNEL_PASSWORD: Env.schema.string.optional(),

  // AI 数据库 - 开发环境
  AIDB_DEV_HOST: Env.schema.string({ format: 'host' }),
  AIDB_DEV_PORT: Env.schema.number(),
  AIDB_DEV_USER: Env.schema.string(),
  AIDB_DEV_PASSWORD: Env.schema.string.optional(),
  AIDB_DEV_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['redis', 'memory'] as const),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  BING_TRANSLATION_API_KEY: Env.schema.string(),
  BAIDU_TRANSLATION_APP_ID: Env.schema.string(),
  BAIDU_TRANSLATION_APP_SECRET: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the lock package
  |----------------------------------------------------------
  */
  LOCK_STORE: Env.schema.enum(['redis', 'memory'] as const),

  /**
   * AI API KEYS
   */
  OPENAI_API_KEY: Env.schema.string(),
  GEMINI_API_KEY: Env.schema.string(),
  OPENROUTER_API_KEY: Env.schema.string(),
  DEEPSEEK_API_KEY: Env.schema.string(),

  GOOGLE_VERTEX_PROJECT_ID: Env.schema.string.optional(),
  GOOGLE_VERTEX_LOCATION: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Qiniu Cloud
  |----------------------------------------------------------
  */
  QINIU_ACCESS_KEY: Env.schema.string(),
  QINIU_SECRET_KEY: Env.schema.string(),
  QINIU_BUCKET: Env.schema.string(),
  QINIU_DOMAIN: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Diagnostics
  |----------------------------------------------------------
  */
  PROFILER_API_SECRET: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | WebSocket
  |----------------------------------------------------------
  */
  ENABLE_WEBSOCKET: Env.schema.boolean.optional(),
})

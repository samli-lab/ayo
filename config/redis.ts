import env from '#start/env'
import { defineConfig } from '@adonisjs/redis'
import { InferConnections } from '@adonisjs/redis/types'

const redisConfig = defineConfig({
  connection: 'main',

  connections: {
    /*
    |--------------------------------------------------------------------------
    | The default connection
    |--------------------------------------------------------------------------
    |
    | The main connection you want to use to execute redis commands. The same
    | connection will be used by the session provider, if you rely on the
    | redis driver.
    |
    */
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: '',
      retryStrategy(times) {
        return times > 10 ? null : times * 50
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Cache connection
    |--------------------------------------------------------------------------
    |
    | 缓存专用连接，使用独立的数据库（db: 1）
    | 可以配置独立的 Redis 实例或使用相同实例的不同 database
    |
    */
    cache: {
      host: env.get('REDIS_CACHE_HOST', env.get('REDIS_HOST')),
      port: env.get('REDIS_CACHE_PORT', env.get('REDIS_PORT')),
      password: env.get('REDIS_CACHE_PASSWORD', env.get('REDIS_PASSWORD', '')),
      db: env.get('REDIS_CACHE_DB', 1), // 默认使用 database 1
      keyPrefix: 'cache:',
      retryStrategy(times) {
        return times > 10 ? null : times * 50
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Lock connection
    |--------------------------------------------------------------------------
    |
    | 分布式锁专用连接，使用独立的数据库（db: 2）
    | 建议使用独立连接以避免锁操作影响其他 Redis 操作
    |
    */
    lock: {
      host: env.get('REDIS_LOCK_HOST', env.get('REDIS_HOST')),
      port: env.get('REDIS_LOCK_PORT', env.get('REDIS_PORT')),
      password: env.get('REDIS_LOCK_PASSWORD', env.get('REDIS_PASSWORD', '')),
      db: env.get('REDIS_LOCK_DB', 2), // 默认使用 database 2
      keyPrefix: 'lock:',
      retryStrategy(times) {
        return times > 10 ? null : times * 50
      },
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}

import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import { SSHTunnelService } from '#services/ssh/tunnel'

/**
 * 获取生产数据库连接配置
 * 如果启用了 SSH 隧道，使用本地端口
 */
function getProdDBConnection() {
  const useTunnel = env.get('AIDB_PROD_USE_TUNNEL', false)
  const nodeEnv = env.get('NODE_ENV', 'development')

  // 在开发环境且启用隧道时，使用本地端口
  if (nodeEnv === 'development' && useTunnel) {
    const localPort = SSHTunnelService.getLocalPort('aidb_prod')
    if (localPort) {
      return {
        host: '127.0.0.1',
        port: localPort,
        user: env.get('AIDB_PROD_USER'),
        password: env.get('AIDB_PROD_PASSWORD'),
        database: env.get('AIDB_PROD_DATABASE'),
      }
    }
  }

  // 默认使用直接连接
  return {
    host: env.get('AIDB_PROD_HOST'),
    port: env.get('AIDB_PROD_PORT'),
    user: env.get('AIDB_PROD_USER'),
    password: env.get('AIDB_PROD_PASSWORD'),
    database: env.get('AIDB_PROD_DATABASE'),
  }
}

const dbConfig = defineConfig({
  connection: 'aidb_prod', // 默认连接为生产环境 AI 数据库
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    // 第一个 PostgreSQL 数据库连接（生产环境）
    aidb_prod: {
      client: 'pg',
      connection: getProdDBConnection(),
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    // 第二个 PostgreSQL 数据库连接
    aidb_dev: {
      client: 'pg',
      connection: {
        host: env.get('AIDB_DEV_HOST'),
        port: env.get('AIDB_DEV_PORT'),
        user: env.get('AIDB_DEV_USER'),
        password: env.get('AIDB_DEV_PASSWORD'),
        database: env.get('AIDB_DEV_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig

import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

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
    // 第一个 PostgreSQL 数据库连接
    aidb_prod: {
      client: 'pg',
      connection: {
        host: env.get('AIDB_PROD_HOST'),
        port: env.get('AIDB_PROD_PORT'),
        user: env.get('AIDB_PROD_USER'),
        password: env.get('AIDB_PROD_PASSWORD'),
        database: env.get('AIDB_PROD_DATABASE'),
      },
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

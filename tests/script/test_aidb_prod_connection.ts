#!/usr/bin/env node

/**
 * 测试 AI Database - Production (PostgreSQL) 连接脚本
 *
 * 使用方法:
 *   npm run test:aidb-prod
 *   或
 *   node --loader ts-node-maintained/esm script/test_aidb_prod_connection.ts
 */

import 'reflect-metadata'
import { Ignitor } from '@adonisjs/core'

const APP_ROOT = new URL('../', import.meta.url)

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

async function testConnection() {
  console.log('🚀 开始测试 AI Database - Production 连接...\n')

  let app: any = null

  try {
    // 初始化 AdonisJS 应用
    const ignitor = new Ignitor(APP_ROOT, { importer: IMPORTER })

    // 等待应用启动完成
    await new Promise<void>((resolve, reject) => {
      ignitor
        .tap((application) => {
          app = application
          application.booting(async () => {
            await import('#start/env')
          })
          application.booted(() => {
            resolve()
          })
        })
        .httpServer()
        .start()
        .catch(reject)
    })

    // 加载环境变量
    const env = await import('#start/env')
    const envService = env.default

    // 导入服务（在应用启动后）
    const { initializeProdDBTunnel, SSHTunnelService } = await import('#services/ssh/tunnel')
    const db = await import('@adonisjs/lucid/services/db')

    // 检查是否启用 SSH 隧道
    const useTunnel = envService.get('AIDB_PROD_USE_TUNNEL', false)
    const nodeEnv = envService.get('NODE_ENV', 'development')

    console.log('📋 连接信息:')
    console.log(`   环境: ${nodeEnv}`)
    console.log(`   数据库主机: ${envService.get('AIDB_PROD_HOST')}`)
    console.log(`   数据库端口: ${envService.get('AIDB_PROD_PORT')}`)
    console.log(`   数据库名称: ${envService.get('AIDB_PROD_DATABASE')}`)
    console.log(`   用户名: ${envService.get('AIDB_PROD_USER')}`)
    console.log(`   使用 SSH 隧道: ${useTunnel ? '是' : '否'}`)

    if (useTunnel && nodeEnv === 'development') {
      console.log('\n🔐 正在建立 SSH 隧道...')
      try {
        await initializeProdDBTunnel()
        const localPort = SSHTunnelService.getLocalPort('aidb_prod')
        if (localPort) {
          console.log(
            `✅ SSH 隧道已建立: localhost:${localPort} -> ${envService.get('SSH_TUNNEL_HOST')} -> ${envService.get('AIDB_PROD_HOST')}:${envService.get('AIDB_PROD_PORT')}`
          )
        } else {
          console.warn('⚠️  SSH 隧道配置不完整，尝试直接连接...')
        }
      } catch (error) {
        console.error('❌ SSH 隧道建立失败:', error)
        console.log('⚠️  尝试直接连接...')
      }
    }

    console.log('\n🔌 正在连接数据库...')

    // 测试数据库连接
    const connection = db.default.connection('aidb_prod')
    const result = await connection.rawQuery('SELECT version(), current_database(), current_user')

    console.log('✅ 数据库连接成功!\n')

    // 显示数据库信息
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      console.log('📊 数据库信息:')
      console.log(`   PostgreSQL 版本: ${row.version}`)
      console.log(`   当前数据库: ${row.current_database}`)
      console.log(`   当前用户: ${row.current_user}`)
    }

    // 测试查询表列表
    console.log('\n📋 查询数据库表列表...')
    const tablesResult = await connection.rawQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `)

    if (tablesResult.rows && tablesResult.rows.length > 0) {
      console.log(`   找到 ${tablesResult.rows.length} 个表:`)
      tablesResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.table_name}`)
      })
    } else {
      console.log('   (数据库中没有表)')
    }

    // 测试简单查询
    console.log('\n🧪 执行测试查询...')
    const testResult = await connection.rawQuery(
      'SELECT NOW() as current_time, 1 + 1 as test_calculation'
    )
    if (testResult.rows && testResult.rows.length > 0) {
      const row = testResult.rows[0]
      console.log(`   当前时间: ${row.current_time}`)
      console.log(`   测试计算: ${row.test_calculation}`)
    }

    console.log('\n✅ 所有测试通过!')
    console.log('🎉 数据库连接正常，可以正常使用。\n')

    // 关闭数据库连接
    await db.default.manager.closeAll()
  } catch (error: any) {
    console.error('\n❌ 连接失败!')
    console.error('错误信息:', error.message)
    if (error.code) {
      console.error('错误代码:', error.code)
    }
    if (error.stack) {
      console.error('\n堆栈跟踪:')
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    // 清理 SSH 隧道
    try {
      const { SSHTunnelService } = await import('#services/ssh/tunnel')
      SSHTunnelService.closeAllTunnels()
    } catch (error) {
      // 忽略清理错误
    }
    // 关闭应用
    if (app) {
      await app.terminate()
    }
    process.exit(0)
  }
}

// 运行测试
testConnection()

/**
 * 开发环境下打印 Lucid 生成的 SQL
 *
 * 说明：
 * - Lucid v21 只有在 connection 配置 `debug: true` 且存在 `db:query` 监听器时才会触发事件
 * - 本文件仅在开发环境启用，避免污染生产日志
 */

import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'

if (app.inDev) {
  emitter.on('db:query', (payload: any) => {
    const duration = payload?.duration
    const durationMs =
      Array.isArray(duration) && duration.length === 2
        ? duration[0] * 1e3 + duration[1] / 1e6
        : undefined

    const parts: string[] = []
    parts.push(`[db:${payload?.connection ?? 'unknown'}]`)
    if (payload?.method) parts.push(String(payload.method).toUpperCase())
    if (payload?.model) parts.push(`model=${payload.model}`)
    if (payload?.inTransaction) parts.push('trx=true')
    if (typeof durationMs === 'number') parts.push(`${durationMs.toFixed(2)}ms`)

    // 注意：payload.sql 是 Knex/Lucid 生成的 SQL；payload.bindings 是参数
    // 这里直接用 console 输出，确保你在本地开发时一定能看到
    // eslint-disable-next-line no-console
    console.log(`${parts.join(' ')} ${payload?.sql}`, payload?.bindings ?? [])

    const error = payload?.error
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[db:error]', error)
    }
  })
}

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { GrowthBookService } from '#services/growthbook/growthbook_service'
import { GrowthBook } from '@growthbook/growthbook'

/**
 * 扩展 HttpContext 类型以包含 growthbook 实例
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    growthbook: GrowthBook
  }
}

/**
 * GrowthBook 中间件
 * 为每个请求创建 GrowthBook 实例，基于用户属性进行实验分组
 *
 * 特性：
 * - 请求级别刷新：每个新的 HTTP 请求都会创建新的 GrowthBook 实例并从服务器加载最新特征
 * - 请求内缓存：同一请求中复用实例，保证一致性
 * - 自动清理：请求结束后自动销毁实例，释放资源
 */
export default class GrowthBookMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      // 收集用户属性
      const attributes: Record<string, any> = {
        // 用户 ID（如果已登录）
        id: ctx.auth.user?.id || ctx.request.ip(),

        // 用户 IP
        ip: ctx.request.ip(),

        // User Agent
        userAgent: ctx.request.header('user-agent'),

        // 请求路径
        url: ctx.request.url(),

        // 语言
        locale: ctx.i18n?.locale,

        // 自定义属性：是否已登录
        isAuthenticated: !!ctx.auth.user,

        // 如果用户已登录，添加更多属性
        ...(ctx.auth.user && {
          email: ctx.auth.user.email,
          fullName: ctx.auth.user.fullName,
        }),
      }

      // 为当前请求创建 GrowthBook 实例并加载最新特征
      ctx.growthbook = await GrowthBookService.createInstanceAsync(attributes)

      // 继续处理请求
      await next()

      // 清理资源
      ctx.growthbook.destroy()
    } catch (error) {
      // 如果 GrowthBook 出错，不影响正常请求
      console.error('GrowthBook middleware error:', error)
      await next()
    }
  }
}

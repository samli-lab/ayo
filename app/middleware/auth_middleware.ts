import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    try {
      await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
      return next()
    } catch (error) {
      // 记录详细错误信息用于调试
      console.error('Auth error:', error)

      // For API requests, return JSON response instead of redirecting
      if (ctx.request.accepts(['json'])) {
        return ctx.response.status(401).json({
          code: 401,
          message: '未授权，请先登录',
          data: null,
        })
      }
      // For web requests, redirect to login
      throw error
    }
  }
}

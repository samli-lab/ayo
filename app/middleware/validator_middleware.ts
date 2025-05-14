import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { errors } from '@vinejs/vine'

/**
 * 扩展HttpContext接口，添加validated属性
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    validated: any
  }
}

/**
 * 验证中间件 - 用于验证HTTP请求数据
 */
export default class ValidatorMiddleware {
  async handle(ctx: HttpContext, next: NextFn, [validator]: [any]) {
    try {
      // 根据请求方法获取适当的数据
      const data = ctx.request.method() === 'GET' ? ctx.request.qs() : ctx.request.body()

      // 执行验证
      const validated = await validator.validate(data)

      // 将验证后的数据添加到上下文中
      ctx.validated = validated

      return next()
    } catch (error) {
      // 处理验证错误
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return ctx.response.status(422).json({
          status: 'error',
          message: '验证失败',
          errors: error.messages,
        })
      }

      // 重新抛出其他错误
      throw error
    }
  }
}

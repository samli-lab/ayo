import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { errors } from '@vinejs/vine'
import type { SchemaTypes, Infer } from '@vinejs/vine/types'

type ValidatorConfig<T = any, U = any, V = any> = {
  queryParams?: {
    validate: (data: any) => Promise<T>
  }
  bodyParams?: {
    validate: (data: any) => Promise<U>
  }
  pathParams?: {
    validate: (data: any) => Promise<V>
  }
}

type ValidatedData<T extends ValidatorConfig> = {
  queryParams?: T['queryParams'] extends { validate: (data: any) => Promise<infer U> } ? U : never
  bodyParams?: T['bodyParams'] extends { validate: (data: any) => Promise<infer U> } ? U : never
  pathParams?: T['pathParams'] extends { validate: (data: any) => Promise<infer U> } ? U : never
} & (T['queryParams'] extends { validate: (data: any) => Promise<infer U> } ? U : {}) &
  (T['bodyParams'] extends { validate: (data: any) => Promise<infer U> } ? U : {}) &
  (T['pathParams'] extends { validate: (data: any) => Promise<infer U> } ? U : {})

/**
 * 扩展HttpContext接口，添加validated和data属性
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    validated: {
      queryParams?: SchemaTypes
      bodyParams?: SchemaTypes
      pathParams?: SchemaTypes
    }
    data: ValidatedData<any>
  }
}

/**
 * 验证中间件 - 用于验证HTTP请求数据
 */
export default class ValidatorMiddleware {
  async handle<T extends ValidatorConfig>(
    ctx: HttpContext & { data: ValidatedData<T> },
    next: NextFn,
    validator: T
  ) {
    try {
      const validated: HttpContext['validated'] = {}
      let allData: Partial<ValidatedData<T>> = {}

      // 验证查询参数
      if (validator.queryParams) {
        const queryParams = ctx.request.qs()
        validated.queryParams = await validator.queryParams.validate(queryParams)
        allData = { ...allData, ...validated.queryParams }
      }

      // 验证请求体参数
      if (validator.bodyParams) {
        const bodyParams = ctx.request.body()
        validated.bodyParams = await validator.bodyParams.validate(bodyParams)
        allData = { ...allData, ...validated.bodyParams }
      }

      // 验证路径参数
      if (validator.pathParams) {
        const params = ctx.params
        validated.pathParams = await validator.pathParams.validate(params)
        allData = { ...allData, ...validated.pathParams }
      }

      // 将验证后的数据添加到上下文中
      ctx.validated = validated
      ctx.data = allData as ValidatedData<T>

      return next()
    } catch (error) {
      // 处理验证错误
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return ctx.response.status(400).json({
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

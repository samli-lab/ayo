import { AIService } from '#services/ai/service'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#validators/user_validator'

export default class UserController {
  /**
   * @login
   * @summary 用户登录
   * @description 用户登录接口，通过邮箱和密码进行身份验证
   * @requestBody {"email": "user@example.com", "password": "password123"}
   * @responseBody 200 - {"code": 200, "message": "登录成功", "data": {"user": {}, "token": {}}}
   * @responseBody 401 - {"code": 401, "message": "邮箱或密码错误", "data": {}}
   */
  async login(ctx: HttpContext) {
    const { email, password } = await loginValidator.validate(ctx.request.body())

    try {
      // 使用 AuthFinder 的 verifyCredentials 方法验证用户凭据
      const user = await User.verifyCredentials(email, password)

      // 生成访问令牌
      const token = await User.accessTokens.create(user)

      return ctx.response.json({
        code: 200,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
          },
          token: {
            type: token.type,
            value: token.value!.release(),
            expiresAt: token.expiresAt?.toISOString() || null,
          },
        },
      })
    } catch (error: any) {
      // 记录详细错误信息用于调试
      console.error('Login error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sql: error.sql,
        stack: error.stack,
      })

      // 如果是数据库错误（如 id 字段问题），返回更具体的错误信息
      if (error.code === 'ER_NO_DEFAULT_FOR_FIELD' || error.errno === 1364) {
        return ctx.response.status(500).json({
          code: 500,
          message:
            '数据库配置错误：auth_access_token 表的 id 字段需要默认值。请运行迁移：node ace migration:run',
          data: { error: error.message },
        })
      }

      // 其他错误返回通用错误信息
      return ctx.response.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
        data: null,
      })
    }
  }

  /**
   * @index
   * @summary 获取用户信息
   * @description 获取用户信息的API，这是一个详细的描述
   * @requestBody {"name": "John", "age": 20}
   * @responseBody 200 - {"message": "验证成功", "data": {"id": 1}}
   */
  public async index(ctx: HttpContext) {
    return ctx.response.json({
      message: '验证成功',
      data: { id: 1 },
    })
  }

  /**
   * @logout
   * @summary 用户退出登录
   * @description 退出登录接口，删除当前用户的访问令牌
   * @responseBody 200 - {"code": 200, "message": "退出登录成功", "data": {}}
   * @responseBody 401 - {"code": 401, "message": "未授权，请先登录", "data": {}}
   */
  async logout(ctx: HttpContext) {
    try {
      // 获取当前认证的用户
      const user = ctx.auth.getUserOrFail()

      // 获取当前的访问令牌
      const token = ctx.auth.use('api').user?.currentAccessToken

      if (token) {
        // 删除当前的访问令牌
        await User.accessTokens.delete(user, token.identifier)
      }

      return ctx.response.json({
        code: 200,
        message: '退出登录成功',
        data: null,
      })
    } catch (error) {
      console.error('Logout error:', error)
      return ctx.response.status(401).json({
        code: 401,
        message: '退出登录失败',
        data: null,
      })
    }
  }

  /**
   * @test
   * @summary 获取用户信息
   * @description 获取用户信息的API，这是一个详细的描述
   * @paramQuery foo - Describe the query param - @type(string) @required
   * @responseBody 200 - {"message": "验证成功", "data": {"id": 1}}
   */
  public async test(ctx: HttpContext) {
    const greeting = ctx.i18n.t('messages.test', { username: 'John', age: 20 })
    const ai = new AIService('gemma')
    const response = await ai.chat('Hello, how are you?')
    return ctx.response.json({
      message: greeting,
      data: { id: 1, response },
    })
  }
}
